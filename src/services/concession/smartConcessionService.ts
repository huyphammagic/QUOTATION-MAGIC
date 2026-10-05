/**
 * Logistics Quotation Management Platform - Phase 62 (Gợi Ý 5)
 * Smart Concession & Margin Floor Guard Service
 * Trợ lý đổi trác điều khoản thông minh, mô phỏng phản đòn & bảo vệ biên lợi nhuận sàn
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  ConcessionSimulationInput,
  ConcessionSimulationResult,
  SmartConcessionOption
} from '../../types/smartConcession';

/**
 * Mô phỏng và sinh các phương án đổi trác điều khoản thông minh (Smart Concessions)
 */
export function simulateSmartConcessions(
  input: ConcessionSimulationInput
): ConcessionSimulationResult {
  const sell = input.currentFreightSellUsd;
  const cost = input.currentFreightCostUsd;
  const qty = Math.max(1, input.containerQuantity);
  const floorPct = input.minMarginFloorPercent || 7.0;
  const discountReq = input.requestedDiscountUsd;

  const currentProfit = sell - cost;
  const currentMargin = sell > 0 ? (currentProfit / sell) * 100 : 0;

  // Tính kịch bản nếu giảm trực tiếp theo yêu cầu của khách
  const sellDirect = sell - discountReq;
  const profitDirect = sellDirect - cost;
  const marginDirect = sellDirect > 0 ? (profitDirect / sellDirect) * 100 : 0;

  // Mức giảm tối đa được phép trước khi chạm sàn biên lợi nhuận
  // Formula: (sell - maxDiscount - cost) / (sell - maxDiscount) = floorPct / 100
  // (sell - maxDiscount) * (1 - floorPct/100) = cost
  // (sell - maxDiscount) = cost / (1 - floorPct/100)
  // maxDiscount = sell - [cost / (1 - floorPct/100)]
  const floorDenominator = 1 - floorPct / 100;
  const minAllowedSell = floorDenominator > 0 ? cost / floorDenominator : cost;
  const allowedMaxDirectDiscount = Math.max(0, Math.floor(sell - minAllowedSell));

  const isBreachingFloor = marginDirect < floorPct;
  const floorWarningVi = isBreachingFloor
    ? `Cảnh báo vi phạm sàn lợi nhuận! Mức giảm $${discountReq}/cont làm biên lợi nhuận giảm xuống còn ${marginDirect.toFixed(2)}% (Dưới mức sàn quy định ${floorPct}%). Không được giảm giá thẳng tay!`
    : undefined;

  // 1. Phương án Đổi Sản Lượng (Volume Trade-off)
  const optionVolume: SmartConcessionOption = {
    strategyType: 'VOLUME_TRADEOFF',
    titleVi: 'Đổi Lấy Cam Kết Sản Lượng Hoặc Hợp Đồng Dài Hạn',
    badgeVi: 'Khuyên Dùng Nhất 🌟',
    tradeOffConditionVi: `Khách hàng cam kết ký hợp đồng vận chuyển tối thiểu ${qty >= 3 ? qty * 2 : 5} container/tháng hoặc ký hợp đồng nguyên tắc 6 tháng.`,
    concessionOfferedVi: `Đồng ý giảm $${Math.min(discountReq, allowedMaxDirectDiscount || discountReq)}/cont cho toàn bộ lô hàng theo cam kết sản lượng.`,
    newFreightSellUsd: sell - Math.min(discountReq, allowedMaxDirectDiscount || discountReq),
    newMarginPercent: Math.max(floorPct, Math.round(marginDirect * 100) / 100),
    customerPerceivedValueUsd: discountReq * qty,
    companyActualCostUsd: discountReq * qty,
    marginImpactPercent: Math.round((currentMargin - Math.max(floorPct, marginDirect)) * 100) / 100,
    feasibility: 'HIGH_RECOMMENDED',
    salesPitchScriptVi: `Dạ anh/chị, mức giá $${sell} bên em tính toán là mức giá tốt nhất cho đơn hàng lẻ đợt này. Tuy nhiên, nếu bên mình chốt kế hoạch xuất khẩu ổn định tối thiểu ${qty * 2} cont/tháng hoặc ký hợp đồng khung 6 tháng, em sẵn sàng xin sếp duyệt chính sách khách hàng thân thiết giảm ngay $${Math.min(discountReq, allowedMaxDirectDiscount || discountReq)}/cont cho công ty mình luôn ạ!`,
    contractClauseSnippetVi: `PHỤ LỤC CAM KẾT SẢN LƯỢNG (VOLUME COMMITMENT):
- Giá cước ưu đãi $${sell - Math.min(discountReq, allowedMaxDirectDiscount || discountReq)} USD/cont được áp dụng với điều kiện Chủ Hàng duy trì sản lượng tối thiểu ${qty * 2} TEU/tháng.
- Trường hợp sản lượng thực tế trong quý không đạt 80% cam kết, hai bên sẽ điều chỉnh lại biểu giá theo mức thông thường tại thời điểm thực tế.`
  };

  // 2. Phương án Đổi Lấy Dòng Tiền & Thanh Toán Ngay (Cashflow Acceleration)
  const discountCash = Math.min(Math.floor(discountReq * 0.6), allowedMaxDirectDiscount || 30);
  const sellCash = sell - discountCash;
  const profitCash = sellCash - cost;
  const marginCash = sellCash > 0 ? (profitCash / sellCash) * 100 : 0;

  const optionCashflow: SmartConcessionOption = {
    strategyType: 'CASHFLOW_ACCELERATION',
    titleVi: 'Đổi Lấy Thanh Toán Tức Thì (Không Công Nợ)',
    badgeVi: 'Tối Ưu Dòng Tiền 💵',
    tradeOffConditionVi: 'Khách hàng đồng ý thanh toán cước ngay khi phát hành vận đơn B/L (0 ngày công nợ) thay vì điều khoản công nợ 30 ngày.',
    concessionOfferedVi: `Chiết khấu thanh toán nhanh $${discountCash} USD/cont (tiết kiệm chi phí tài chính cho công ty).`,
    newFreightSellUsd: sellCash,
    newMarginPercent: Math.round(marginCash * 100) / 100,
    customerPerceivedValueUsd: discountCash * qty,
    companyActualCostUsd: discountCash * qty,
    marginImpactPercent: Math.round((currentMargin - marginCash) * 100) / 100,
    feasibility: 'HIGH_RECOMMENDED',
    salesPitchScriptVi: `Dạ anh/chị, chính sách giá hiện tại bên em đã bao gồm chi phí hỗ trợ công nợ. Nếu bên mình có thể hỗ trợ thanh toán cước ngay khi nhận được B/L copy, em xin phép cắt giảm toàn bộ chi phí tài chính đó và chiết khấu thẳng $${discountCash}/cont cho bên mình luôn ạ.`,
    contractClauseSnippetVi: `ĐIỀU KHOẢN THANH TOÁN NHANH (CASH ACCELERATION DISCOUNT):
- Áp dụng mức chiết khấu $${discountCash} USD/cont cho điều khoản thanh toán chuyển khoản trong vòng 24 giờ kể từ khi Bên Vận Chuyển gửi B/L copy.
- Nếu thanh toán trễ quá 3 ngày, mức cước sẽ quay trở về giá niêm yết gốc $${sell} USD/cont.`
  };

  // 3. Phương án Bù Đắp Phi Tiền Mặt (Non-Cash Perks - Bảo vệ 100% biên cước)
  const optionNonCash: SmartConcessionOption = {
    strategyType: 'NON_CASH_PERKS',
    titleVi: 'Giữ Nguyên Giá Cước – Tặng Gói Dịch Vụ Giá Trị Cao',
    badgeVi: 'Bảo Vệ Biên Lợi Nhuận Tuyệt Đối 🛡️',
    tradeOffConditionVi: 'Khách hàng đồng ý giữ nguyên đơn giá cước biển $${sell} USD/cont.',
    concessionOfferedVi: 'Tặng MIỄN PHÍ phí khai báo VGM/SI ($35) + Miễn phí cấp Seal hãng tàu ($10) + Ưu tiên thông quan hàng hóa 24/7.',
    newFreightSellUsd: sell,
    newMarginPercent: Math.round(currentMargin * 100) / 100,
    customerPerceivedValueUsd: 45 * qty,
    companyActualCostUsd: 5 * qty, // Chi phí thực tế của forwarder chỉ khoảng $5
    marginImpactPercent: 0.1,
    feasibility: 'HIGH_RECOMMENDED',
    salesPitchScriptVi: `Dạ anh/chị ơi, giá cước $${sell} bên em đi kèm cam kết dịch vụ cao cấp và giữ chỗ chắc chắn 100%. Em xin phép giữ nguyên giá cước này để đảm bảo chất lượng, nhưng để hỗ trợ chi phí cho anh/chị, em sẽ TẶNG MIỄN PHÍ toàn bộ phí khai VGM, phí truyền SI và phí Seal cho lô hàng này (trị giá hơn $${45 * qty} USD). Anh/chị xem như tiết kiệm được khoản này vào chi phí địa phương ạ!`,
    contractClauseSnippetVi: `ĐIỀU KHOẢN ƯU ĐÃI PHỤ PHÍ ĐỊA PHƯƠNG (PERKS ADDENDUM):
- Bên Vận Chuyển tài trợ 100% phí phát hành VGM & truyền SI điện tử cho lô hàng.
- Miễn phí cung cấp chì niêm phong (Container Bolt Seal) đạt chuẩn ISO 17712.`
  };

  // 4. Phương án Đổi Bằng Ngày Lưu Bãi (Free-Time Add-on)
  const optionFreeTime: SmartConcessionOption = {
    strategyType: 'EXCLUSIVE_FREE_TIME',
    titleVi: 'Tặng Thêm 7-14 Ngày Free DEM/DET Thay Vì Giảm Tiền',
    badgeVi: 'Giá Trị Bảo Hiểm Rủi Ro Khổng Lồ ⚓',
    tradeOffConditionVi: 'Khách hàng giữ nguyên mức cước hiện tại.',
    concessionOfferedVi: 'Cấp trọn gói 14 đến 21 ngày Free Combined DEM/DET tại cảng đến (tiết kiệm rủi ro phạt lên tới $650 - $1,200 USD/cont nếu kẹt bãi).',
    newFreightSellUsd: sell,
    newMarginPercent: Math.round(currentMargin * 100) / 100,
    customerPerceivedValueUsd: 650 * qty,
    companyActualCostUsd: 0, // Do forwarder xin bảo lãnh từ Shipping Line
    marginImpactPercent: 0,
    feasibility: 'HIGH_RECOMMENDED',
    salesPitchScriptVi: `Anh/chị ơi, giảm $${discountReq} cước thật ra chỉ tiết kiệm được một ít, nhưng nếu hàng qua đến cảng bên kia mà bị kẹt bãi chỉ 3-4 ngày là tiền phạt DEM/DET đã tốn cả ngàn USD rồi. Bên em giữ giá cước chuẩn nhưng sẽ cam kết xin hãng tàu cấp ĐẶC QUYỀN 14-21 NGÀY FREE DEM/DET cho bên mình. Đây là lá chắn an toàn nhất cho chi phí của bên anh/chị!`,
    contractClauseSnippetVi: `ĐIỀU KHOẢN MIỄN PHÍ LƯU BÃI MỞ RỘNG:
- Cấp chính sách 14-21 ngày Combined Demurrage & Detention tại cảng đến.
- Miễn phí toàn bộ phí phạt lưu vỏ trong thời gian được bảo lãnh.`
  };

  // 5. Phương án Cưa Đôi 50/50 (Counter-Offer Split)
  const halfDiscount = Math.floor(discountReq / 2);
  const sellSplit = sell - halfDiscount;
  const profitSplit = sellSplit - cost;
  const marginSplit = sellSplit > 0 ? (profitSplit / sellSplit) * 100 : 0;

  const optionSplit: SmartConcessionOption = {
    strategyType: 'SPLIT_DIFFERENCE_5050',
    titleVi: 'Đàm Phán Cưa Đôi Khoảng Chênh Lệch (Counter-Offer 50/50)',
    badgeVi: 'Nhanh Gọn & Khép Deal 🤝',
    tradeOffConditionVi: 'Khách hàng đồng ý xác nhận đặt chỗ ngay trong hôm nay.',
    concessionOfferedVi: `Mỗi bên nhượng bộ một nửa: Giảm $${halfDiscount} USD/cont thay vì $${discountReq}.`,
    newFreightSellUsd: sellSplit,
    newMarginPercent: Math.round(marginSplit * 100) / 100,
    customerPerceivedValueUsd: halfDiscount * qty,
    companyActualCostUsd: halfDiscount * qty,
    marginImpactPercent: Math.round((currentMargin - marginSplit) * 100) / 100,
    feasibility: marginSplit >= floorPct ? 'FEASIBLE' : 'REQUIRES_MANAGER_APPROVAL',
    salesPitchScriptVi: `Dạ em rất hiểu bài toán chi phí của công ty mình. Mức giảm $${discountReq} thực sự vượt quá thẩm quyền của em. Tuy nhiên vì rất thiện chí hợp tác lâu dài với bên anh/chị, em xin phép đề xuất giải pháp "cưa đôi": bên em hỗ trợ giảm $${halfDiscount}/cont, anh em mình cùng chia sẻ và chốt booking luôn trong ngày hôm nay nhé anh!`,
    contractClauseSnippetVi: `ĐIỀU KHOẢN GIÁ ĐẶC BIỆT CHỐT NHANH:
- Đơn giá cước điều chỉnh thành $${sellSplit} USD/cont áp dụng cho booking phát hành trước 17h00 ngày hôm nay.`
  };

  const options: SmartConcessionOption[] = [
    optionVolume,
    optionNonCash,
    optionFreeTime,
    optionCashflow,
    optionSplit
  ];

  let strategicAdviceVi = 'Ưu tiên sử dụng phương án Phi Tiền Mặt (Quà tặng phụ phí) hoặc Tặng Free-Time để bảo vệ 100% biên lợi nhuận của công ty!';
  if (isBreachingFloor) {
    strategicAdviceVi = `TUYỆT ĐỐI KHÔNG giảm thẳng $${discountReq} USD vì biên lãi sẽ bị tụt xuống ${marginDirect.toFixed(1)}% (Dưới sàn an toàn ${floorPct}%). Hãy dùng phương án Đổi Sản Lượng hoặc Bù Đắp Phi Tiền Mặt!`;
  }

  return {
    currentProfitUsd: currentProfit,
    currentMarginPercent: Math.round(currentMargin * 100) / 100,
    requestedDiscountUsd: discountReq,
    projectedProfitIfDirectDiscountUsd: profitDirect,
    projectedMarginIfDirectDiscountPercent: Math.round(marginDirect * 100) / 100,
    isBreachingFloor,
    floorWarningVi,
    allowedMaxDirectDiscountUsd: allowedMaxDirectDiscount,
    options,
    strategicAdviceVi
  };
}

/**
 * Lưu mô phỏng đổi trác vào Firestore nếu có
 */
export async function saveConcessionSimulation(
  result: ConcessionSimulationResult,
  customerName: string,
  quoteNumber?: string
): Promise<void> {
  try {
    if (db) {
      const docId = `concession-${Date.now()}`;
      const ref = doc(db, 'concessionSimulations', docId);
      await setDoc(ref, {
        ...result,
        customerName,
        quoteNumber: quoteNumber || 'QUO-ACTIVE',
        createdAt: serverTimestamp()
      });
    }
  } catch {
    // In-memory fallback
  }
}
