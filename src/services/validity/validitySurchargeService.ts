/**
 * Logistics Quotation Management Platform - Phase 59 (Lựa Chọn 3)
 * Validity & Surcharge Volatility Alert Engine Service
 * Quản lý cảnh báo GRI/PSS/ETS, giám sát hạn báo giá & gia hạn/cập nhật giá hàng loạt
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
  SurchargeMarketAlert,
  QuotationValidityAudit,
  RateValidityStatus,
  BulkValidityExtensionPayload,
  BulkRepriceResult
} from '../../types/validitySurcharge';
import { QuoteData } from '../../types/logistics';

// Danh sách các thông báo biến động phụ phí thị trường chuẩn thực tế từ các hãng tàu
export const STANDARD_SURCHARGE_ALERTS: SurchargeMarketAlert[] = [
  {
    id: 'sca-gri-uswc-2026',
    carrierCode: 'ONE_LINE',
    carrierName: 'Ocean Network Express (ONE)',
    lanePol: 'Cát Lái (VNCLI)',
    lanePod: 'Long Beach / Los Angeles (USLGB/USLAX)',
    surchargeType: 'GRI',
    surchargeNameVi: 'Tăng Cước Chung Tuyến Bờ Tây Bắc Mỹ (General Rate Increase)',
    amountUsd: 450,
    containerUnit: '40HC',
    effectiveDate: '2026-10-15',
    announcementDate: '2026-10-01',
    severity: 'HIGH',
    impactMarginEstimateUsd: 450,
    affectedActiveQuotesCount: 5,
    summaryVi: 'Hãng tàu ONE thông báo tăng cước GRI $450/40HC và $360/20GP do thiếu hụt vỏ container rỗng tại khu vực Đông Nam Á.',
    urgencyPitchTemplateVi: 'Hãng tàu ONE đã ban hành công văn GRI tăng $450/40HC từ ngày 15/10. Quý khách vui lòng xác nhận booking trước 17h00 ngày 14/10 để khóa biểu cước ưu đãi hiện tại!',
    officialCircularRef: 'ONE-CIR-2026-GRI10'
  },
  {
    id: 'sca-ets-eu-2026',
    carrierCode: 'MAERSK',
    carrierName: 'Maersk Line',
    lanePol: 'Cát Lái / Cái Mép',
    lanePod: 'Rotterdam / Hamburg (NLRTM/DEHAM)',
    surchargeType: 'ETS',
    surchargeNameVi: 'Phụ Phí Hạn Ngạch Khí Thải Carbon Châu Âu (EU ETS Mandate)',
    amountUsd: 65,
    containerUnit: 'TEU',
    effectiveDate: '2026-10-20',
    announcementDate: '2026-09-28',
    severity: 'MEDIUM',
    impactMarginEstimateUsd: 130,
    affectedActiveQuotesCount: 4,
    summaryVi: 'Cập nhật phụ phí phát thải EU ETS bắt buộc cho toàn bộ tàu cập cảng liên minh châu Âu, tăng thêm $65/20GP và $130/40HC.',
    urgencyPitchTemplateVi: 'Biểu phí khí thải EU ETS mới có hiệu lực từ 20/10 (+130 USD/40HC). Chốt booking tuần này giúp doanh nghiệp tiết kiệm ngay khoản phụ thu này.',
    officialCircularRef: 'MSK-EU-ETS-OCT26'
  },
  {
    id: 'sca-pss-transpacific-2026',
    carrierCode: 'COSCO',
    carrierName: 'COSCO Shipping Lines',
    lanePol: 'Hải Phòng (VNHPH)',
    lanePod: 'New York / Savannah (USNYC/USSAV)',
    surchargeType: 'PSS',
    surchargeNameVi: 'Phụ Phí Mùa Cao Điểm Tuyến Bờ Đông Mỹ (Peak Season Surcharge)',
    amountUsd: 600,
    containerUnit: '40HC',
    effectiveDate: '2026-10-18',
    announcementDate: '2026-10-02',
    severity: 'CRITICAL',
    impactMarginEstimateUsd: 600,
    affectedActiveQuotesCount: 3,
    summaryVi: 'Áp dụng phụ phí cao điểm PSS $600/40HC cho hàng dệt may và đồ gỗ xuất khẩu sang Bờ Đông Mỹ trước kỳ lễ Black Friday / Noel.',
    urgencyPitchTemplateVi: 'COSCO áp dụng phụ phí cao điểm $600/40HC từ ngày 18/10. Khách hàng cấp bách duyệt booking sớm để chúng tôi giữ chỗ (space guarantee) và giữ giá gốc!',
    officialCircularRef: 'COSCO-TP-PSS-2026-Q4'
  },
  {
    id: 'sca-wrs-suez-2026',
    carrierCode: 'CMA_CGM',
    carrierName: 'CMA CGM',
    lanePol: 'Cát Lái (VNCLI)',
    lanePod: 'Southampton / Le Havre (GBSOU/FRLEH)',
    surchargeType: 'WRS',
    surchargeNameVi: 'Phụ Phí Định Tuyến Đi Vòng Châu Phi (Cape of Good Hope Surcharge)',
    amountUsd: 350,
    containerUnit: 'CONTAINER',
    effectiveDate: '2026-10-25',
    announcementDate: '2026-10-03',
    severity: 'HIGH',
    impactMarginEstimateUsd: 350,
    affectedActiveQuotesCount: 2,
    summaryVi: 'CMA CGM duy trì hải trình vòng qua Mũi Hảo Vọng do an ninh Biển Đỏ, điều chỉnh phụ phí phát sinh thêm $350/cont từ cuối tháng 10.',
    urgencyPitchTemplateVi: 'Phụ phí điều chỉnh hải trình Biển Đỏ sẽ tăng vào ngày 25/10. Xin mời Quý công ty phát hành PO để giữ chỗ tàu chạy sớm nhất trong tuần.',
    officialCircularRef: 'CMA-SUR-WRS-OCT26'
  },
  {
    id: 'sca-baf-intra-asia-2026',
    carrierCode: 'EVERGREEN',
    carrierName: 'Evergreen Marine Corp',
    lanePol: 'Cát Lái (VNCLI)',
    lanePod: 'Tokyo / Yokohama (JPTYO/JPYOK)',
    surchargeType: 'BAF_LSS',
    surchargeNameVi: 'Phụ Phí Nhiên Liệu Xanh Tuyến Nội Á (Low Sulphur Surcharge)',
    amountUsd: 40,
    containerUnit: 'TEU',
    effectiveDate: '2026-11-01',
    announcementDate: '2026-10-01',
    severity: 'LOW',
    impactMarginEstimateUsd: 80,
    affectedActiveQuotesCount: 6,
    summaryVi: 'Biến động giá dầu Brent tại Singapore làm tăng nhẹ phụ phí nhiên liệu LSS tuyến Nhật Bản / Hàn Quốc từ đầu tháng 11.',
    urgencyPitchTemplateVi: 'Phụ phí nhiên liệu tuyến Nhật Bản sẽ điều chỉnh từ 01/11. Báo giá của anh/chị vẫn đang giữ mức cước tốt nhất tháng 10.',
    officialCircularRef: 'EMC-LSS-IA-1126'
  }
];

// Danh sách mẫu các báo giá đang theo dõi hiệu lực
export const SAMPLE_AUDIT_QUOTES: QuotationValidityAudit[] = [
  {
    quotationId: 'quote-2026-001',
    quoteNumber: 'QUO-2026-1008-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    customerEmail: 'sales@xanhseafood.vn',
    customerPhone: '0903123456',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Long Beach (USLGB)',
    carrier: 'ONE (Ocean Network Express)',
    validTo: '2026-10-05',
    daysRemaining: 1,
    status: 'CRITICAL_48H',
    currentFreightSellUsd: 3850,
    currentFreightCostUsd: 3450,
    currentProfitMarginPercent: 10.39,
    projectedGRIImpactUsd: 450,
    marginAtRiskPercent: 11.68,
    recommendedActionVi: 'Hối thúc khách chốt trong hôm nay hoặc cập nhật giá mới ngay vì hãng tàu ONE áp dụng GRI +$450/40HC từ ngày 15/10.',
    isRepriceEligible: true
  },
  {
    quotationId: 'quote-2026-002',
    quoteNumber: 'QUO-2026-1009-02',
    customerName: 'Tập đoàn Dệt May Hòa Thọ Express',
    customerEmail: 'logistics@hoatho.com.vn',
    customerPhone: '0912445566',
    pol: 'Hải Phòng (VNHPH)',
    pod: 'New York (USNYC)',
    carrier: 'COSCO Shipping',
    validTo: '2026-10-04',
    daysRemaining: 0,
    status: 'EXPIRED',
    currentFreightSellUsd: 4800,
    currentFreightCostUsd: 4300,
    currentProfitMarginPercent: 10.42,
    projectedGRIImpactUsd: 600,
    marginAtRiskPercent: 12.5,
    recommendedActionVi: 'Báo giá đã hết hạn! Khẩn cấp gia hạn hiệu lực thêm 14 ngày và cộng đệm cước $200 để tránh bị âm lợi nhuận khi hãng COSCO áp dụng PSS.',
    isRepriceEligible: true
  },
  {
    quotationId: 'quote-2026-003',
    quoteNumber: 'QUO-2026-1010-03',
    customerName: 'Công ty Gỗ & Nội Thất Tân Uyên',
    customerEmail: 'import-export@tanuyenwood.vn',
    customerPhone: '0988776655',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Rotterdam (NLRTM)',
    carrier: 'Maersk Line',
    validTo: '2026-10-08',
    daysRemaining: 4,
    status: 'EXPIRING_SOON',
    currentFreightSellUsd: 3100,
    currentFreightCostUsd: 2800,
    currentProfitMarginPercent: 9.68,
    projectedGRIImpactUsd: 130,
    marginAtRiskPercent: 4.19,
    recommendedActionVi: 'Còn 4 ngày hiệu lực. Thông báo khách hàng về phụ phí phát thải EU ETS (+130 USD/40HC) để tạo áp lực chốt sớm.',
    isRepriceEligible: true
  },
  {
    quotationId: 'quote-2026-004',
    quoteNumber: 'QUO-2026-1011-04',
    customerName: 'Công ty TNHH Cơ Khí Chính Xác Sakura VN',
    customerEmail: 'supplychain@sakura-vn.com',
    customerPhone: '0933221144',
    pol: 'Cát Lái (VNCLI)',
    pod: 'Tokyo (JPTYO)',
    carrier: 'Evergreen Marine',
    validTo: '2026-10-22',
    daysRemaining: 18,
    status: 'HEALTHY',
    currentFreightSellUsd: 750,
    currentFreightCostUsd: 650,
    currentProfitMarginPercent: 13.33,
    projectedGRIImpactUsd: 40,
    marginAtRiskPercent: 5.33,
    recommendedActionVi: 'Báo giá vẫn ở trạng thái an toàn, cước ổn định. Định kỳ theo dõi tỷ giá và gửi thông tin lịch tàu cập nhật cho khách.',
    isRepriceEligible: false
  }
];

let memoryAuditList: QuotationValidityAudit[] = [...SAMPLE_AUDIT_QUOTES];
let memorySurchargeAlerts: SurchargeMarketAlert[] = [...STANDARD_SURCHARGE_ALERTS];

/**
 * Tính toán trạng thái hiệu lực theo ngày còn lại
 */
export function calculateValidityStatus(validToDateStr: string): { daysRemaining: number; status: RateValidityStatus } {
  const today = new Date('2026-10-03T19:58:00'); // Tham chiếu mốc thời gian hệ thống
  const validTo = new Date(validToDateStr);
  
  const diffTime = validTo.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { daysRemaining: 0, status: 'EXPIRED' };
  } else if (daysRemaining <= 2) {
    return { daysRemaining, status: 'CRITICAL_48H' };
  } else if (daysRemaining <= 7) {
    return { daysRemaining, status: 'EXPIRING_SOON' };
  } else {
    return { daysRemaining, status: 'HEALTHY' };
  }
}

/**
 * Lấy danh sách cảnh báo phụ phí thị trường
 */
export function getMarketSurchargeAlerts(): SurchargeMarketAlert[] {
  return memorySurchargeAlerts;
}

/**
 * Lấy danh sách kiểm tra hiệu lực báo giá
 */
export function getQuotationValidityAudits(): QuotationValidityAudit[] {
  return memoryAuditList;
}

/**
 * Kiểm tra và chuyển đổi một QuoteData đang soạn thảo sang bản kiểm tra hiệu lực
 */
export function auditSingleQuote(quote: Partial<QuoteData>): QuotationValidityAudit {
  const validToStr = quote.terms?.validityDate || '2026-10-15';
  const { daysRemaining, status } = calculateValidityStatus(validToStr);
  
  const freightSell = quote.items?.reduce((sum, it) => sum + (it.amountUsd || 0), 0) || quote.grandTotalUsd || 3000;
  const freightCost = quote.items?.reduce((sum, it) => sum + (it.costTotalUsd || 0), 0) || 2700;
  const profit = freightSell - freightCost;
  const marginPercent = freightSell > 0 ? (profit / freightSell) * 100 : 0;

  // Đối chiếu với các cảnh báo hãng tàu
  const carrierName = quote.shipment?.carrier || '';
  const polName = quote.shipment?.pol || '';
  const matchedAlert = memorySurchargeAlerts.find(a => 
    (carrierName && a.carrierName.toLowerCase().includes(carrierName.toLowerCase())) ||
    (polName && a.lanePol.toLowerCase().includes(polName.toLowerCase()))
  );

  const projectedGRI = matchedAlert ? matchedAlert.amountUsd : 0;
  const marginAtRisk = freightSell > 0 ? (projectedGRI / freightSell) * 100 : 0;

  return {
    quotationId: quote.id || 'current-quote',
    quoteNumber: quote.quoteNumber || 'QUO-ACTIVE',
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng hiện tại',
    customerEmail: quote.customer?.email,
    customerPhone: quote.customer?.phone,
    pol: quote.shipment?.pol || 'Cát Lái',
    pod: quote.shipment?.pod || 'Destination Port',
    carrier: quote.shipment?.carrier || 'Ocean Carrier',
    validTo: validToStr,
    daysRemaining,
    status,
    currentFreightSellUsd: freightSell,
    currentFreightCostUsd: freightCost,
    currentProfitMarginPercent: Math.round(marginPercent * 100) / 100,
    projectedGRIImpactUsd: projectedGRI,
    marginAtRiskPercent: Math.round(marginAtRisk * 100) / 100,
    recommendedActionVi: status === 'EXPIRED' 
      ? 'Cước đã quá hạn! Cần cập nhật biểu giá mới ngay.'
      : daysRemaining <= 2
        ? `Cần chốt khẩn cấp trong ${daysRemaining} ngày để tránh phụ phí ${matchedAlert?.surchargeType || 'GRI'}`
        : 'Theo dõi chu kỳ biến động cước và giữ liên lạc với khách.',
    isRepriceEligible: daysRemaining <= 7
  };
}

/**
 * 1-Click Thực hiện gia hạn hiệu lực và cập nhật giá hàng loạt (Bulk Re-price & Extend)
 */
export async function executeBulkValidityExtension(
  payload: BulkValidityExtensionPayload
): Promise<BulkRepriceResult[]> {
  const results: BulkRepriceResult[] = [];
  const buffer = payload.applySurchargeBufferUsd || 0;

  for (const quoteId of payload.quoteIds) {
    const quote = memoryAuditList.find(q => q.quotationId === quoteId);
    if (!quote) continue;

    const oldValidTo = quote.validTo;
    const oldSell = quote.currentFreightSellUsd;
    const oldCost = quote.currentFreightCostUsd;
    const oldMargin = quote.currentProfitMarginPercent;

    // Tính toán giá mới
    const newSell = oldSell + buffer;
    const newProfit = newSell - oldCost;
    const newMargin = newSell > 0 ? (newProfit / newSell) * 100 : 0;

    quote.validTo = payload.newValidToDate;
    quote.currentFreightSellUsd = newSell;
    quote.currentProfitMarginPercent = Math.round(newMargin * 100) / 100;
    
    // Cập nhật lại trạng thái
    const check = calculateValidityStatus(payload.newValidToDate);
    quote.daysRemaining = check.daysRemaining;
    quote.status = check.status;
    quote.recommendedActionVi = `Đã gia hạn thành công đến ${payload.newValidToDate}. Biên lợi nhuận an toàn ${quote.currentProfitMarginPercent}%.`;

    results.push({
      quotationId: quote.quotationId,
      quoteNumber: quote.quoteNumber,
      oldValidTo,
      newValidTo: payload.newValidToDate,
      oldFreightSellUsd: oldSell,
      newFreightSellUsd: newSell,
      oldMarginPercent: oldMargin,
      newMarginPercent: quote.currentProfitMarginPercent,
      status: 'SUCCESS'
    });

    // Thử đồng bộ Firestore nếu có kết nối
    try {
      if (db) {
        const ref = doc(db, 'rateValiditySurchargeAlerts', quote.quotationId);
        await setDoc(ref, {
          quotationId: quote.quotationId,
          quoteNumber: quote.quoteNumber,
          validTo: payload.newValidToDate,
          freightSellUsd: newSell,
          profitMarginPercent: quote.currentProfitMarginPercent,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch {
      // Fallback in-memory
    }
  }

  return results;
}

/**
 * Sinh thông điệp giục khách chốt đơn khẩn cấp (Zalo / Email Copy)
 */
export function generateUrgentClosingMessage(
  quote: QuotationValidityAudit,
  alert?: SurchargeMarketAlert
): { subject: string; messageZalo: string; messageEmail: string } {
  const carrier = quote.carrier || 'hãng tàu đối tác';
  const days = quote.daysRemaining;
  const surchargeName = alert ? alert.surchargeNameVi : 'phụ phí thị trường và điều chỉnh cước mới';
  const increaseAmount = alert ? `+$${alert.amountUsd}/${alert.containerUnit}` : 'tăng từ 10-15%';

  const subject = `[CẤP BÁCH] Thông báo hiệu lực giá cước lô hàng ${quote.pol} - ${quote.pod} (${quote.quoteNumber})`;

  const messageZalo = `Dạ em chào anh/chị bên ${quote.customerName}! 🚢

Em kiểm tra hệ thống thấy báo giá cước ${quote.quoteNumber} (Tuyến ${quote.pol} - ${quote.pod}, hãng ${carrier}) chỉ còn ${days > 0 ? `${days} ngày hiệu lực (hết hạn ngày ${quote.validTo})` : 'hết hạn hôm nay'}.

Đặc biệt, bên em vừa nhận công văn ${surchargeName} sẽ áp dụng điều chỉnh ${increaseAmount} từ chu kỳ tới.
👉 Để khóa mức cước ưu đãi $${quote.currentFreightSellUsd.toLocaleString()} và giữ chỗ space tốt nhất, anh/chị xác nhận booking giúp em trước 17h00 ngày mai nhé! Em đã sẵn sàng hỗ trợ làm booking request ngay cho công ty mình ạ.`;

  const messageEmail = `Kính gửi: Quý Ban Giám Đốc & Phòng Xuất Nhập Khẩu - ${quote.customerName},

Công ty chúng tôi xin gửi lời chào trân trọng nhất.

Liên quan đến Báo giá số ${quote.quoteNumber} cho tuyến vận chuyển ${quote.pol} đi ${quote.pod} với giá cước $${quote.currentFreightSellUsd.toLocaleString()} USD:

Chúng tôi xin thông báo thời hạn hiệu lực của mức cước trên sẽ kết thúc vào ngày ${quote.validTo}. Hiện tại, hãng tàu ${carrier} đã công bố quyết định điều chỉnh ${surchargeName} (mức tăng dự kiến ${increaseAmount}) có hiệu lực trong đợt tàu kế tiếp.

Để hỗ trợ Quý khách hàng tối ưu hóa chi phí logistics và tránh các khoản phụ thu phát sinh không đáng có, chúng tôi khuyến nghị Quý công ty phát hành Giấy Đặt Chỗ (Booking Request) hoặc phản hồi xác nhận trước 17h00 ngày ${quote.validTo}.

Đội ngũ chuyên viên của chúng tôi luôn túc trực để hỗ trợ cấp booking ngay trong 15 phút.

Trân trọng cảm ơn sự tin tưởng và hợp tác của Quý khách!`;

  return { subject, messageZalo, messageEmail };
}
