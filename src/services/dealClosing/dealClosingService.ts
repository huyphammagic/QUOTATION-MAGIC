/**
 * Logistics Quotation Management Platform - Phase 55 (Gói B)
 * Smart Deal-Closing Accelerator & Objection Handling Suite
 * Core Business Logic, Margin Safeguards, Concession Matrix & Closing Playbook
 */

import { doc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData } from '../../types/logistics';
import { 
  DealNegotiationSimulation, 
  FloorPriceStatus, 
  ValueAddConcession, 
  FlashIncentive, 
  FlashDiscountType,
  ObjectionBattlecard, 
  ObjectionType, 
  QuickClosingMessage, 
  DealOutcomeRecord 
} from '../../types/dealClosing';
import { createShipmentFromQuotation } from '../shipment/shipmentService';

const COLLECTION_DEAL_OUTCOMES = 'quotationDealOutcomes';

// In-memory cache for offline/test runner resilience
let memoryOutcomes: DealOutcomeRecord[] = [];

export function getLocalDealOutcomes(): DealOutcomeRecord[] {
  return memoryOutcomes;
}

export function saveLocalDealOutcomes(list: DealOutcomeRecord[]) {
  memoryOutcomes = list;
}

// ============================================================================
// 1. STANDARD VALUE-ADD CONCESSIONS (Vũ khí mềm thay vì cắt giảm tiền cước)
// ============================================================================
export const STANDARD_VALUE_ADD_CONCESSIONS: ValueAddConcession[] = [
  {
    id: 'conc_dem_det_14',
    code: 'FREE_DEM_DET_14',
    nameVi: 'Tặng +14 Ngày Miễn Phí Lưu Bãi / Vỏ Cont (Free DEM/DET)',
    nameEn: '14 Days Combined Free Demurrage & Detention at POD',
    category: 'DEM_DET',
    perceivedValue: 350,
    companyCost: 0, // Nhờ hợp đồng dài hạn với hãng tàu (Ocean Carrier Service Contract)
    currency: 'USD',
    descriptionVi: 'Khách hàng có thêm 14 ngày làm thủ tục nhận hàng tại cảng đến mà không sợ bị hãng tàu phạt tiền lưu cont (thông thường phạt $40-$80/cont/ngày).',
    descriptionEn: 'Grants recipient 14 calendar days to clear cargo at destination without incurring heavy line demurrage fees.',
    isSelected: true,
    logisticsBadgeVi: '⚡ Tặng 14 Ngày Free DEM/DET',
    logisticsBadgeEn: '⚡ 14 Days Free DEM/DET Included',
    termsAndConditions: 'Áp dụng cho cont thường Dry Van tại cảng đến, được cấp trực tiếp qua Master B/L.'
  },
  {
    id: 'conc_customs_free',
    code: 'FREE_CUSTOMS_EXP',
    nameVi: 'Miễn Phí Thủ Tục Khai Báo Hải Quan Xuất Khẩu',
    nameEn: 'Free Export Customs Clearance Processing',
    category: 'CUSTOMS',
    perceivedValue: 45,
    companyCost: 12,
    currency: 'USD',
    descriptionVi: 'Hỗ trợ kiểm tra bộ chứng từ (Invoice, Packing List, C/O), khai truyền tờ khai điện tử VNACCS và thông quan luồng xanh/vàng không tính phí.',
    descriptionEn: 'Full export document review and VNACCS electronic declaration at zero extra charge.',
    isSelected: false,
    logisticsBadgeVi: ' Miễn Phí Khai Hải Quan',
    logisticsBadgeEn: ' Free Customs Clearance',
    termsAndConditions: 'Áp dụng 01 tờ khai tối đa 5 dòng hàng. Phí phát sinh kiểm hóa thực tế nếu luồng đỏ do chủ hàng chịu.'
  },
  {
    id: 'conc_cargo_insurance',
    code: 'ALL_RISKS_INSURANCE',
    nameVi: 'Tặng Gói Bảo Hiểm Trách Nhiệm Vận Tải Hàng Hóa',
    nameEn: 'Complimentary Cargo Transit Protection Policy',
    category: 'INSURANCE',
    perceivedValue: 120,
    companyCost: 22,
    currency: 'USD',
    descriptionVi: 'Bảo hiểm hàng hóa vận chuyển đường biển/hàng không điều kiện A (All-Risks) từ kho đến kho, giải tỏa 100% nỗi sợ rủi ro hư hỏng của khách.',
    descriptionEn: 'All-risks cargo transit coverage safeguarding the shipper against physical loss or damage.',
    isSelected: false,
    logisticsBadgeVi: ' Bảo Hiểm Vận Tải All-Risks',
    logisticsBadgeEn: ' All-Risks Cargo Insurance',
    termsAndConditions: 'Bảo hiểm theo điều khoản ICC (A), bồi thường tối đa 110% giá trị CIF của lô hàng.'
  },
  {
    id: 'conc_rate_lock_30',
    code: 'RATE_LOCK_GUARANTEE',
    nameVi: 'Cam Kết Khóa Cố Định Cước Tàu 30 Ngày (Chống Tăng Giá GRI)',
    nameEn: '30-Day Guaranteed Ocean Freight Rate Lock',
    category: 'PRIORITY',
    perceivedValue: 200,
    companyCost: 0,
    currency: 'USD',
    descriptionVi: 'Bảo lưu mức cước ưu đãi trong suốt 30 ngày, bảo vệ doanh nghiệp khỏi các đợt tăng phụ phí bất ngờ (GRI / PSS / War Risk) của hãng tàu.',
    descriptionEn: 'Protects the shipper from general rate increases and peak surcharges for 30 days.',
    isSelected: true,
    logisticsBadgeVi: '🔒 Khóa Cố Định Cước 30 Ngày',
    logisticsBadgeEn: '🔒 30-Day Rate Lock Protected',
    termsAndConditions: 'Hiệu lực áp dụng khi khách hàng đặt chỗ booking trong thời hạn 30 ngày kể từ ngày chốt báo giá.'
  },
  {
    id: 'conc_credit_30',
    code: 'EXTENDED_CREDIT_TERM',
    nameVi: 'Chính Sách Thanh Toán Trả Chậm (Công Nợ 30 Ngày Sau Tàu Chạy)',
    nameEn: '30-Day Post-Departure Payment Terms',
    category: 'PAYMENT',
    perceivedValue: 150,
    companyCost: 15,
    currency: 'USD',
    descriptionVi: 'Cho phép doanh nghiệp thanh toán tiền cước sau khi tàu rời cảng 30 ngày, giúp tối ưu dòng tiền lưu động cho khách hàng.',
    descriptionEn: 'Allows vetted corporate clients to remit freight charges within 30 days after ocean departure.',
    isSelected: false,
    logisticsBadgeVi: ' Công Nợ 30 Ngày Linh Hoạt',
    logisticsBadgeEn: ' Flexible 30-Day Credit',
    termsAndConditions: 'Áp dụng cho doanh nghiệp có mã số thuế hợp lệ và ký hợp đồng nguyên tắc logistics.'
  },
  {
    id: 'conc_priority_trucking',
    code: 'NIGHT_PULL_PRIORITY',
    nameVi: 'Ưu Tiên Kéo Cont Đêm & Giao Cont Giờ Vàng Cảng Biển',
    nameEn: 'Priority Night Port Gate-in & Dedicated Trucking',
    category: 'PRIORITY',
    perceivedValue: 80,
    companyCost: 18,
    currency: 'USD',
    descriptionVi: 'Điều động xe đầu kéo vào cảng lấy cont ban đêm giúp tránh kẹt xe và đảm bảo cont đóng hàng kịp giờ cắt máng xuất xưởng.',
    descriptionEn: 'Dedicated night-pull equipment avoiding terminal congestion and meeting tight factory stuffing deadlines.',
    isSelected: false,
    logisticsBadgeVi: '🚚 Ưu Tiên Kéo Cont Cảng Đêm',
    logisticsBadgeEn: '🚚 Priority Night Gate-In',
    termsAndConditions: 'Áp dụng cho các tuyến vận tải nội địa bán kính 100km quanh cụm cảng Hải Phòng, Cát Lái, Cái Mép.'
  }
];

// ============================================================================
// 2. OBJECTION BATTLECARDS & CLOSING SCRIPTS (Bộ kịch bản đánh bại rào cản)
// ============================================================================
export const OBJECTION_BATTLECARDS_CATALOG: ObjectionBattlecard[] = [
  {
    id: 'card_competitor_lower',
    type: 'COMPETITOR_LOWER',
    titleVi: 'Khách Chê Giá: "Đối thủ khác chào rẻ hơn bên em $30-$50/cont"',
    titleEn: 'Competitor Quoted Cheaper by $30-$50/cont',
    customerVoice: 'Forwarder bên kia họ chào anh giá cước đi Los Angeles/Hamburg rẻ hơn bên em $40/cont, em xem bớt được không chứ giá này cao quá?',
    rootConcern: 'Khách hàng có tâm lý sợ bị "hớ" giá, nhưng thực chất chưa tính đến các phụ phí Local Charges ngầm (bị kê khống lúc lấy lệnh) và nguy cơ bị rớt tàu (Rolled Cargo).',
    winningStrategy: 'Không vội vàng giảm giá cước! Hãy phân tích "Tổng chi phí thực tế (Total Landed Logistics Cost)", vạch rõ các bẫy phụ phí ẩn của đối thủ, và đưa ra cam kết Space + Free Time.',
    battlePoints: [
      'Nhiều forwarder chào Ocean Freight rẻ nhưng cộng thêm phí D/O, Handling, Phí cấp vỏ sạch cao gấp đôi tại cảng đến.',
      'Bên em cam kết hợp đồng Master Contract trực tiếp với Hãng tàu, cam kết 100% không rớt cont (No Rolled Booking) trong mùa cao điểm.',
      'Tặng kèm 14 ngày Free DEM/DET tại cảng đến (giúp khách tiết kiệm tới $500 tiền phạt nếu kẹt hải quan POD).'
    ],
    suggestedConcessions: ['conc_dem_det_14', 'conc_rate_lock_30'],
    callScriptVi: 'Dạ em hiểu anh đang cân nhắc rất kỹ về chi phí. Thực ra trên thị trường cước biển có nhiều bên hạ giá cước nhưng đến khi tàu chạy sẽ cộng thêm 2-3 phụ phí phụ ngoài báo giá. Bên em báo giá là trọn gói All-in minh bạch 100%. Đặc biệt lô này em xin sếp giữ riêng cho anh 14 ngày Free DEM/DET tại cảng đến - chỉ riêng khoản này đã tiết kiệm cho công ty anh hơn $350 rồi. Nếu anh duyệt sớm trước 17:00 hôm nay, em khóa ngay vỏ cont đẹp cho lô hàng của anh luôn ạ!',
    closingQuestion: 'Nếu em giữ trọn gói ưu đãi 14 ngày Free DEM/DET và cam kết slot cont không rớt, anh em mình chốt booking chuyến này luôn để kịp làm tờ khai nhé anh?'
  },
  {
    id: 'card_price_too_high',
    type: 'PRICE_TOO_HIGH',
    titleVi: 'Khách Chê Giá: "Vượt ngân sách dự kiến của công ty"',
    titleEn: 'Exceeds Customer Internal Budget',
    customerVoice: 'Báo giá này hơi căng em ơi, ngân sách lô hàng này sếp anh duyệt chỉ tối đa khoảng chừng này tiền thôi...',
    rootConcern: 'Khách bị áp lực kiểm soát chi phí từ ban giám đốc, đang tìm kiếm một lý do chính đáng để chứng minh họ đã đàm phán thành công.',
    winningStrategy: 'Tặng một ưu đãi chốt nhanh có thời hạn (Flash Closing Discount $20/cont) kết hợp miễn phí 01 dịch vụ gia tăng (như Hải quan xuất khẩu) để khách có chiến thắng báo cáo sếp.',
    battlePoints: [
      'Cho khách thấy sự chênh lệch chỉ bằng 1-2% tổng giá trị lô hàng, nhưng đổi lại tiến độ giao hàng chuẩn xác 100%.',
      'Đề xuất gói chiết khấu chốt nhanh "Flash Deal" trong 24 giờ để tạo động lực quyết định ngay.'
    ],
    suggestedConcessions: ['conc_customs_free', 'conc_dem_det_14'],
    callScriptVi: 'Dạ em rất chia sẻ với áp lực ngân sách của công ty mình. Để hỗ trợ anh kịp tiến độ xuất xưởng, em vừa xin ý kiến của Giám đốc kinh doanh: Bên em sẽ hỗ trợ chiết khấu ưu đãi $25/cont và miễn phí toàn bộ thủ tục khai báo hải quan xuất khẩu cho lô hàng này. Đây là chính sách đặc biệt áp dụng nếu công ty mình xác nhận trước 17h chiều nay. Như vậy vừa khớp với ngân sách của anh mà chứng từ lại được xử lý chuẩn chỉ nhất ạ!',
    closingQuestion: 'Em đã chuẩn bị sẵn phiếu xác nhận điều chỉnh, anh duyệt phương án này để em xuất Booking Note ngay chiều nay nhé anh?'
  },
  {
    id: 'card_awaiting_boss',
    type: 'AWAITING_BOSS',
    titleVi: 'Khách Trì Hoãn: "Anh phải chờ Sếp / Ban Giám Đốc duyệt đã"',
    titleEn: 'Awaiting Executive / Director Sign-off',
    customerVoice: 'Anh thấy phương án bên em rất tốt rồi, nhưng phải gửi sếp anh xem qua và ký duyệt đã, chưa chốt ngay được...',
    rootConcern: 'Người liên hệ không muốn chịu rủi ro trách nhiệm một mình, hoặc chưa biết cách trình bày giá trị báo giá cho lãnh đạo cấp trên.',
    winningStrategy: 'Trang bị "vũ khí" cho người liên hệ bằng cách gửi bản Tóm Tắt Trình Lãnh Đạo (1-Page Executive Summary) với bảng so sánh rủi ro: Nếu không chốt hôm nay, tàu tuần sau sẽ hết chỗ và giá cước sẽ tăng.',
    battlePoints: [
      'Lịch tàu đang bước vào chu kỳ cắt máng (Closing Cut-off), chậm 1 ngày là phải chờ sang chuyến tuần sau.',
      'Cung cấp văn bản cam kết bảo lưu giá và slot để người mua hàng tự tin trình sếp.'
    ],
    suggestedConcessions: ['conc_rate_lock_30'],
    callScriptVi: 'Dạ em hiểu quy trình phê duyệt nội bộ của công ty mình. Để anh đỡ mất công giải thích nhiều với Sếp, em vừa tạo sẵn một bản Tóm tắt đề xuất phương án tối ưu (Executive Summary) rất ngắn gọn gửi qua Zalo/Email cho anh. Trong đó nêu rõ cam kết lịch tàu chạy thẳng, không chuyển tải, và giữ chỗ trước khi hãng tàu đóng cổng cut-off vào ngày mai. Anh chỉ cần chuyển tiếp cho Sếp là Sếp an tâm ký duyệt ngay ạ!',
    closingQuestion: 'Anh gửi Sếp xem ngay bây giờ nhé, em đang giữ chỗ cont trên hệ thống để chờ phản hồi của Sếp mình trong chiều nay ạ!'
  },
  {
    id: 'card_payment_terms',
    type: 'PAYMENT_TERMS',
    titleVi: 'Khách Đòi Nợ Cước: "Bên anh chỉ làm với bên nào cho nợ 45-60 ngày"',
    titleEn: 'Strict Payment Terms (Demand 45-60 Days Credit)',
    customerVoice: 'Quy chế tài chính bên anh là thanh toán công nợ 45 ngày sau khi tàu chạy hoặc có vận đơn gốc, bên em thanh toán ngay thì khó làm việc quá...',
    rootConcern: 'Doanh nghiệp muốn tối ưu dòng tiền lưu động, sợ forwarder giữ lệnh giao hàng khi có tranh chấp.',
    winningStrategy: 'Đưa ra lộ trình tín dụng bậc thang: Chuyến đầu tiên thanh toán linh hoạt 15-30 ngày khi có Sea Waybill, các chuyến tiếp theo nâng lên 45 ngày khi ký hợp đồng dịch vụ dài hạn.',
    battlePoints: [
      'Linh hoạt hỗ trợ phát hành Surrendered B/L hoặc Telex Release để khách giải phóng hàng sớm.',
      'Ký phụ lục hạn mức công nợ theo sản lượng cont hàng tháng.'
    ],
    suggestedConcessions: ['conc_credit_30'],
    callScriptVi: 'Dạ bên em hoàn toàn thấu hiểu nhu cầu tối ưu dòng tiền của doanh nghiệp lớn như bên mình. Với khách hàng tiềm năng đồng hành lâu dài, bên em có gói tài trợ công nợ 30-45 ngày. Để tiện cho cả hai bên trong lô hàng đầu tiên, em xin cấp hạn mức công nợ 30 ngày kể từ ngày tàu chạy. Em sẽ làm thủ tục bảo lãnh thanh toán nội bộ để phát hành giải phóng hàng cho anh đúng hạn ạ!',
    closingQuestion: 'Em gửi hợp đồng nguyên tắc kèm điều khoản công nợ 30 ngày này, anh ký trước bản scan để em tiến hành lấy lệnh luôn nhé?'
  },
  {
    id: 'card_cargo_not_ready',
    type: 'CARGO_NOT_READY',
    titleVi: 'Hàng Chưa Sẵn Sàng: "Xưởng anh hàng chưa xong, chưa biết ngày nào xuất"',
    titleEn: 'Cargo Not Ready (Factory Delay)',
    customerVoice: 'Bên anh tiến độ sản xuất đang bị chậm, chưa chắc chắn ngày xong hàng nên chưa dám chốt lịch tàu...',
    rootConcern: 'Khách sợ book tàu sớm nếu hàng trễ sẽ bị phạt tiền hủy booking (Cancellation Fee / Dead Freight).',
    winningStrategy: 'Cam kết miễn phí dời lịch tàu (Free Booking Rollover) 01 lần và khóa giữ giá cước 30 ngày để khách an tâm book trước.',
    battlePoints: [
      'Cho phép linh hoạt dời sang chuyến tàu kế tiếp mà không phạt phí.',
      'Khóa giá cước không lo bị áp dụng đợt tăng giá GRI mới.'
    ],
    suggestedConcessions: ['conc_rate_lock_30'],
    callScriptVi: 'Dạ anh yên tâm hoàn toàn ạ! Với dịch vụ của bên em, em sẽ hỗ trợ chính sách "Bảo hiểm tiến độ": Anh cứ chốt booking chuyến dự kiến trước để giữ vỏ và slot giá tốt. Nếu xưởng mình có chậm 2-3 ngày, bên em sẽ linh hoạt đổi sang chuyến tàu tiếp theo hoàn toàn MIỄN PHÍ, không tính phí dead freight. Như vậy xưởng xong lúc nào là mình chủ động xuất lúc đó không sợ bị động ạ!',
    closingQuestion: 'Em book trước chuyến ngày thứ Sáu để giữ slot, có gì phát sinh em trực tiếp điều chỉnh theo tiến độ xưởng của anh nhé?'
  },
  {
    id: 'card_peak_space',
    type: 'PEAK_SEASON_SPACE',
    titleVi: 'Mùa Cao Điểm: "Lo ngại kẹt cảng, rớt tàu hoặc thiếu vỏ cont"',
    titleEn: 'Peak Season Equipment Crunch & Port Congestion Concern',
    customerVoice: 'Dạo này nghe nói ngoài cảng đang khan hiếm vỏ cont và tàu hay bị delay, book bên em có chắc chắn đi đúng lịch không?',
    rootConcern: 'Khách hàng sợ trễ hạn giao hàng với người mua nước ngoài, bị phạt hợp đồng ngoại thương.',
    winningStrategy: 'Nhấn mạnh năng lực cấp vỏ cont ưu tiên (Container Yard Priority Agreement) và dịch vụ kéo cont đêm tránh tắc cảng.',
    battlePoints: [
      'Bên em có bãi cấp cont riêng và ký thỏa thuận ưu tiên với các depot lớn.',
      'Cung cấp hệ thống GPS Tracking lô hàng thời gian thực để khách theo dõi 24/7.'
    ],
    suggestedConcessions: ['conc_priority_trucking', 'conc_cargo_insurance'],
    callScriptVi: 'Dạ lo lắng của anh rất xác đáng vì hiện tại lượng hàng đổ về cảng rất đông. Nhưng bên em là đại lý cấp 1 của hãng tàu nên luôn được giữ quota vỏ cont sạch loại A chuyên đóng hàng xuất khẩu. Bên em có đội xe kéo đêm chuyên trách để hạ bãi trước giờ cao điểm. Anh chốt với em chuyến này là em điều xe bốc vỏ cont về xưởng mình ngay sáng mai, đảm bảo an toàn tuyệt đối cho hợp đồng xuất khẩu của công ty anh!',
    closingQuestion: 'Em xin thông tin kho đóng hàng của xưởng mình để cho xe vào lấy vỏ ngay trong đêm nay nhé anh?'
  }
];

// ============================================================================
// 3. MARGIN SAFEGUARD & NEGOTIATION SIMULATOR
// ============================================================================

/**
 * Calculates deal negotiation figures with strict margin safeguard
 */
export function simulateDealMargin(params: {
  originalTotal: number;
  originalCost: number;
  proposedCustomerTotal: number;
  currency?: string;
  minMarginPercent?: number; // Minimum acceptable margin (default: 8%)
  targetMarginPercent?: number; // Healthy target margin (default: 15%)
  quotationId?: string;
  quotationNumber?: string;
  customerName?: string;
}): DealNegotiationSimulation {
  const originalTotal = Math.max(0, params.originalTotal);
  const originalCost = Math.max(0, params.originalCost);
  const originalProfit = originalTotal - originalCost;
  const originalMarginPercent = originalTotal > 0 ? (originalProfit / originalTotal) * 100 : 0;
  
  const proposedTotal = Math.max(0, params.proposedCustomerTotal);
  const discountAmount = Math.max(0, originalTotal - proposedTotal);
  const discountPercent = originalTotal > 0 ? (discountAmount / originalTotal) * 100 : 0;
  
  const simulatedNetProfit = proposedTotal - originalCost;
  const simulatedMarginPercent = proposedTotal > 0 ? (simulatedNetProfit / proposedTotal) * 100 : 0;
  
  const minMargin = params.minMarginPercent ?? 8; // 8% minimum floor
  const targetMargin = params.targetMarginPercent ?? 15; // 15% target
  
  // Floor Price Threshold (The lowest revenue price that satisfies minMargin)
  // Revenue * (1 - minMargin/100) = Cost => Floor = Cost / (1 - minMargin/100)
  const floorPriceThreshold = minMargin < 100 ? originalCost / (1 - minMargin / 100) : originalCost * 1.1;
  
  let floorStatus: FloorPriceStatus = 'SAFE';
  let requiresManagerApproval = false;
  let approvalReason = '';
  
  if (simulatedNetProfit <= 0 || simulatedMarginPercent < minMargin || proposedTotal < floorPriceThreshold) {
    floorStatus = 'BREACH';
    requiresManagerApproval = true;
    approvalReason = `Giá đàm phán (${proposedTotal.toLocaleString()} ${params.currency || 'USD'}) dưới mức giá sàn cho phép (${floorPriceThreshold.toLocaleString()} ${params.currency || 'USD'}). Biên lợi nhuận chỉ đạt ${simulatedMarginPercent.toFixed(1)}% (tối thiểu yêu cầu ${minMargin}%). Cần Giám Đốc Kinh Doanh (Sales Manager) phê duyệt ngoại lệ.`;
  } else if (simulatedMarginPercent < targetMargin) {
    floorStatus = 'WARNING';
    requiresManagerApproval = false;
    approvalReason = `Biên lợi nhuận ở mức cảnh báo (${simulatedMarginPercent.toFixed(1)}% so với mục tiêu ${targetMargin}%). Khuyến khích sử dụng Vũ Khí Giá Trị Gia Tăng (Concessions) thay vì giảm thêm tiền cước.`;
  }
  
  // Recommended Counter-Offer: Target middle-ground that preserves at least targetMargin or at least saves face
  let recommendedCounterPrice = proposedTotal;
  let recommendedCounterReason = '';
  
  if (floorStatus === 'BREACH') {
    // Recommend the safe floor price with slight buffer
    recommendedCounterPrice = Math.round(floorPriceThreshold * 1.02);
    recommendedCounterReason = `Đề xuất phản hồi giá ${recommendedCounterPrice.toLocaleString()} ${params.currency || 'USD'} (vẫn giảm ${(originalTotal - recommendedCounterPrice).toLocaleString()} cho khách) kết hợp tặng thêm 14 ngày Free DEM/DET để chốt hợp đồng an toàn.`;
  } else if (floorStatus === 'WARNING') {
    recommendedCounterPrice = Math.round((originalTotal + proposedTotal) / 2);
    recommendedCounterReason = `Đề xuất mức giá chia đôi chênh lệch ${recommendedCounterPrice.toLocaleString()} ${params.currency || 'USD'}, vừa thể hiện thiện chí vừa bảo vệ biên lãi công ty.`;
  } else {
    recommendedCounterPrice = proposedTotal;
    recommendedCounterReason = `Mức giá đàm phán hợp lệ, biên lợi nhuận đạt chuẩn (${simulatedMarginPercent.toFixed(1)}%). Có thể chốt ngay!`;
  }
  
  return {
    quotationId: params.quotationId || '',
    quotationNumber: params.quotationNumber || '',
    customerName: params.customerName || 'Khách hàng',
    originalTotal,
    originalCost,
    originalProfit,
    originalMarginPercent,
    currency: params.currency || 'USD',
    proposedCustomerTotal: proposedTotal,
    proposedDiscountAmount: discountAmount,
    proposedDiscountPercent: discountPercent,
    simulatedNetProfit,
    simulatedMarginPercent,
    floorPriceThreshold,
    floorStatus,
    requiresManagerApproval,
    approvalReason,
    recommendedCounterPrice,
    recommendedCounterReason
  };
}

// ============================================================================
// 4. FLASH INCENTIVE GENERATOR (Ưu đãi chốt nhanh kèm đếm ngược)
// ============================================================================

export function generateFlashIncentive(params: {
  quotationNumber: string;
  discountType: FlashDiscountType;
  discountAmount: number;
  currency: string;
  durationHours: number;
  urgentReasonVi?: string;
  urgentReasonEn?: string;
}): FlashIncentive {
  const expiresAt = new Date(Date.now() + params.durationHours * 3600 * 1000).toISOString();
  const code = `FLASH-${params.quotationNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4)}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  
  const discountLabel = params.discountType === 'PERCENTAGE' 
    ? `${params.discountAmount}%` 
    : `${params.discountAmount.toLocaleString()} ${params.currency}`;
    
  return {
    id: `flash_${Date.now()}`,
    code,
    titleVi: `Ưu đãi chốt sớm: Giảm ngay ${discountLabel}`,
    titleEn: `Early Confirmation Special: Save ${discountLabel}`,
    discountType: params.discountType,
    discountAmount: params.discountAmount,
    currency: params.currency,
    expiresAt,
    durationHours: params.durationHours,
    urgentReasonVi: params.urgentReasonVi || `Áp dụng khi xác nhận đặt chỗ trước ${new Date(expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay (Giữ chỗ tàu ưu tiên mùa cao điểm).`,
    urgentReasonEn: params.urgentReasonEn || `Valid for confirmation before ${new Date(expiresAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (Secures carrier priority allocation).`,
    isActive: true,
    badgeVi: `⚡ ƯU ĐÃI CHỐT TRONG ${params.durationHours}H: -${discountLabel}`
  };
}

// ============================================================================
// 5. 1-CLICK MULTI-CHANNEL CLOSING PITCH (Tin nhắn chốt deal đa kênh)
// ============================================================================

export function generateMultiChannelClosingPitch(params: {
  customerName: string;
  quotationNumber: string;
  routePol?: string;
  routePod?: string;
  finalPrice: number;
  currency: string;
  concessions: ValueAddConcession[];
  flashIncentive?: FlashIncentive;
  actionPortalUrl: string;
  salesName?: string;
  salesPhone?: string;
}): {
  zalo: QuickClosingMessage;
  whatsapp: QuickClosingMessage;
  email: QuickClosingMessage;
} {
  const cust = params.customerName || 'Quý khách';
  const qNum = params.quotationNumber;
  const route = params.routePol && params.routePod ? `tuyến ${params.routePol} - ${params.routePod}` : '';
  const priceFormatted = `${params.finalPrice.toLocaleString()} ${params.currency}`;
  const sales = params.salesName || 'Chuyên viên Báo giá';
  const phone = params.salesPhone ? `(Hotline/Zalo: ${params.salesPhone})` : '';
  
  const concessionsList = params.concessions.length > 0
    ? params.concessions.map(c => `🎁 ${c.nameVi}`).join('\n')
    : '🎁 Tặng kèm cam kết vỏ sạch & không rớt tàu';
    
  const flashNote = params.flashIncentive 
    ? `\n⚡ Ưu đãi chốt nhanh: ${params.flashIncentive.urgentReasonVi}` 
    : '';

  // 1. Zalo Pitch: Ngắn gọn, thân thiện, kích hoạt hành động
  const zaloText = `Dạ chào anh/chị bên ${cust} ạ!

Em gửi anh/chị phương án chốt cước ưu đãi nhất cho báo giá *${qNum}* ${route}:
💰 *Tổng chi phí trọn gói All-in:* ${priceFormatted}

Đặc quyền dành riêng cho lô hàng này:
${concessionsList}${flashNote}

Anh/chị chỉ cần bấm vào liên kết bảo mật bên dưới để xem chi tiết và ký xác nhận điện tử trong 10 giây để em kịp giữ chỗ cont cho công ty mình nhé:
👉 ${params.actionPortalUrl}

Em cảm ơn anh/chị nhiều ạ! ${sales} ${phone}`;

  // 2. WhatsApp Pitch: Chuyên nghiệp, chuẩn quốc tế
  const waText = `Dear ${cust} Team,

Following our discussion regarding quotation *${qNum}* ${route ? `(${params.routePol} to ${params.routePod})` : ''}, we are pleased to confirm our final rate and closing concessions:

📌 *All-In Net Freight Rate:* ${priceFormatted}
📌 *Included Value-Add Privileges:*
${params.concessions.map(c => `• ${c.nameEn}`).join('\n') || '• Guaranteed space allocation & equipment prioritization'}
${params.flashIncentive ? `\n⏳ *Early Booking Notice:* ${params.flashIncentive.urgentReasonEn}` : ''}

You can review the finalized agreement and electronically sign your booking order via our verified secure link below:
🔗 ${params.actionPortalUrl}

Looking forward to servicing this shipment smoothly.
Best regards,
${sales}`;

  // 3. Email Subject & Body
  const emailSubject = `[XÁC NHẬN CHỐT GIÁ ƯU ĐÃI] Báo giá ${qNum} ${route ? `- Tuyến ${params.routePol}/${params.routePod}` : ''} - ${cust}`;
  const emailText = `Kính gửi Ban Giám Đốc và Bộ phận Xuất Nhập Khẩu ${cust},

Lời đầu tiên, xin chân thành cảm ơn Quý công ty đã tin tưởng trao đổi cùng chúng tôi về phương án vận chuyển cho báo giá số ${qNum}.

Nhằm hỗ trợ tốt nhất cho kế hoạch xuất hàng của Quý công ty, chúng tôi trân trọng gửi bảng xác nhận phương án cước và các đặc quyền gia tăng đặc biệt:
- Số Báo Giá: ${qNum}
${route ? `- Tuyến Vận Tải: ${params.routePol} ➔ ${params.routePod}\n` : ''}- Mức Giá Đàm Phán Trọn Gói: ${priceFormatted}

CÁC ĐẶC QUYỀN GIA TĂNG KÈM THEO:
${params.concessions.map(c => `+ ${c.nameVi}: ${c.descriptionVi}`).join('\n')}
${params.flashIncentive ? `\nLƯU Ý HIỆU LỰC ƯU ĐÃI: ${params.flashIncentive.urgentReasonVi}\n` : ''}
Để hoàn tất đặt chỗ booking và cố định lịch tàu, Quý công ty vui lòng truy cập đường dẫn ký duyệt điện tử trực tuyến:
${params.actionPortalUrl}

Trân trọng hợp tác,
${sales} ${phone}`;

  return {
    zalo: {
      channel: 'ZALO',
      title: 'Tin Nhắn Zalo Chốt Nhanh',
      messageText: zaloText,
      actionLink: params.actionPortalUrl
    },
    whatsapp: {
      channel: 'WHATSAPP',
      title: 'WhatsApp Professional Pitch',
      messageText: waText,
      actionLink: params.actionPortalUrl
    },
    email: {
      channel: 'EMAIL',
      title: emailSubject,
      messageText: emailText,
      actionLink: params.actionPortalUrl
    }
  };
}

// ============================================================================
// 6. RECORD DEAL CLOSING OUTCOME (Chốt đơn thắng/thua & Tự động tạo Booking)
// ============================================================================

export async function recordDealClosingOutcome(params: {
  quotation: QuoteData;
  companyId: string;
  outcome: 'WON' | 'LOST' | 'NEGOTIATING';
  closedPrice: number;
  selectedConcessions: ValueAddConcession[];
  flashIncentive?: FlashIncentive;
  winLossReason: string;
  notes?: string;
  closedBy: string;
  autoCreateShipment?: boolean;
}): Promise<{
  success: boolean;
  outcomeRecord: DealOutcomeRecord;
  createdShipmentId?: string;
}> {
  const quote = params.quotation;
  const quoteId = quote.id || `quote_${Date.now()}`;
  const quoteNum = quote.quoteNumber || 'QUOTE';
  const customerName = quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng';
  const isVnd = quote.quoteCurrency === 'VND';
  const originalPrice = isVnd ? (quote.grandTotalVnd || 0) : (quote.grandTotalUsd || 0);
  const discountGiven = Math.max(0, originalPrice - params.closedPrice);
  const cost = isVnd ? (quote.totalCostVnd || 0) : (quote.totalCostUsd || 0);
  const netProfit = params.closedPrice - cost;
  const marginPercent = params.closedPrice > 0 ? (netProfit / params.closedPrice) * 100 : 0;
  const currency = quote.quoteCurrency || 'USD';
  
  const outcomeId = `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  
  let autoCreatedShipmentId: string | undefined = undefined;

  // If Deal WON and autoCreateShipment requested, automatically spawn the Shipment Booking
  if (params.outcome === 'WON' && params.autoCreateShipment !== false) {
    try {
      const quoteWithCompany: QuoteData = {
        ...quote,
        companyId: quote.companyId || params.companyId,
        status: quote.status === 'DRAFT' ? 'APPROVED' : quote.status
      };
      const shipment = await createShipmentFromQuotation(
        quoteWithCompany, 
        { uid: params.closedBy || 'sales_rep', displayName: params.closedBy || 'Sales Representative' }
      );
      if (shipment && shipment.id) {
        autoCreatedShipmentId = shipment.id;
      }
    } catch (err) {
      console.warn('Notice creating shipment from won deal:', err);
    }
  }

  const outcomeRecord: DealOutcomeRecord = {
    id: outcomeId,
    quotationId: quoteId,
    quotationNumber: quoteNum,
    customerName,
    companyId: params.companyId,
    outcome: params.outcome,
    closedPrice: params.closedPrice,
    originalPrice,
    discountGiven,
    currency,
    netProfit,
    marginPercent,
    selectedConcessions: params.selectedConcessions,
    flashIncentive: params.flashIncentive,
    winLossReason: params.winLossReason,
    notes: params.notes,
    closedBy: params.closedBy,
    closedAt: now,
    autoCreatedShipmentId
  };

  // Cache locally
  const local = getLocalDealOutcomes();
  saveLocalDealOutcomes([outcomeRecord, ...local]);

  // Persist to Firestore if available
  if (db) {
    try {
      const outcomeRef = doc(db, COLLECTION_DEAL_OUTCOMES, outcomeId);
      await setDoc(outcomeRef, {
        ...outcomeRecord,
        updatedAt: now
      });

      // Update Quotation document status in Firestore if WON or LOST
      const quoteDocRef = doc(db, 'quotations', quoteId);
      const quoteUpdates: Record<string, any> = {
        updatedAt: now,
        dealOutcomeStatus: params.outcome,
        dealClosedAt: now,
        dealClosedBy: params.closedBy,
        negotiatedPrice: params.closedPrice,
        dealConcessions: params.selectedConcessions.map(c => c.id),
      };

      if (params.outcome === 'WON') {
        quoteUpdates.status = 'ACCEPTED';
        if (autoCreatedShipmentId) {
          quoteUpdates.convertedShipmentId = autoCreatedShipmentId;
        }
      } else if (params.outcome === 'LOST') {
        quoteUpdates.status = 'REJECTED';
        quoteUpdates.rejectionReason = params.winLossReason;
      }

      await updateDoc(quoteDocRef, quoteUpdates).catch((err) => {
        console.warn('Notice updating quote status in firestore:', err);
      });
    } catch (e) {
      console.warn('Notice saving deal outcome to firestore:', e);
    }
  }

  return {
    success: true,
    outcomeRecord,
    createdShipmentId: autoCreatedShipmentId
  };
}
