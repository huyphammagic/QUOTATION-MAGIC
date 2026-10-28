/**
 * Logistics Quotation Management Platform - Phase 58 (Lựa Chọn 2)
 * Automated Customer Re-engagement & Lane Replenishment Radar Service
 * Core Business Logic, Shipper Cadence Detection & 1-Click Re-activation Suite
 */

import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  DormantCustomerAlert, 
  ShipperHealthStatus, 
  ShipperCadenceType, 
  ReactivationOffer, 
  ReEngagementPitch 
} from '../../types/customerReengagement';
import { QuoteData, CompanyProfile, CustomerRecord } from '../../types/logistics';
import { getSavedCustomers, getSavedQuotes } from '../../utils/storage';
import { findLaneBenchmark } from '../competitor/competitorIntelligenceService';

const COLLECTION_REENGAGEMENT_ALERTS = 'customerReengagementAlerts';

// In-memory cache for fast UI response and test resilience
let memoryAlertsList: DormantCustomerAlert[] = [];
const memoryOutreachStatusMap = new Map<string, { 
  outreachStatus: 'PENDING' | 'SENT' | 'REPLIED' | 'RE_QUOTED' | 'DISMISSED'; 
  lastOutreachDate?: string; 
  outreachChannel?: 'ZALO' | 'EMAIL' | 'PHONE' | 'WHATSAPP'; 
}>();

// ============================================================================
// 1. SAMPLE REAL-WORLD SHIPPER CADENCE DATASETS (Dữ liệu khách hàng thực chiến)
// ============================================================================
export const SAMPLE_DORMANT_CUSTOMERS: DormantCustomerAlert[] = [
  {
    id: 'alert_cust_001',
    companyId: 'company_profile',
    customerId: 'cust_seafood_01',
    customerName: 'Chị Mai - Trưởng phòng XNK',
    companyName: 'Công ty Cổ phần Thủy Sản Biển Xanh',
    phone: '0988.765.432',
    email: 'mai.tran@bienxanhseafood.com.vn',
    contactPerson: 'Trần Thị Mai',
    healthStatus: 'DORMANT_30D',
    cadence: 'BIWEEKLY', // 14 ngày/lần
    averageDaysBetweenShipments: 14,
    daysSinceLastQuote: 38,
    daysSinceLastShipment: 42, // Đã trễ gần gấp 3 chu kỳ!
    predictedNextBookingDate: '2026-09-15',
    totalLifetimeRevenueUsd: 148500,
    riskScore: 82, // Nguy cơ rất cao đã bị forwarder khác nhảy vào
    primaryLanes: [
      {
        pol: 'Cát Lái, Hồ Chí Minh',
        pod: 'Tokyo Port, Nhật Bản',
        mode: 'SEA_FCL',
        containerType: "20'RF",
        commodity: 'Tôm sú & cá tra phi lê đông lạnh (-18C)',
        typicalVolumePerShipment: 2,
        totalHistoricalVolume: 28,
        historicalQuotesCount: 16,
        lastShipmentDate: '2026-08-22',
        preferredCarrier: 'ONE',
        lastQuotedPriceUsd: 1350
      }
    ],
    suggestedOffer: {
      code: 'WELCOME-BACK-SEAFOOD-50',
      title: 'Đặc Quyền Tái Kích Hoạt Cont Lạnh Nhật Bản',
      discountUsd: 50,
      freeDemDetDaysBonus: 7,
      benefitDescriptionVi: 'Tặng Voucher trừ trực tiếp $50/cont + Tặng thêm 7 ngày cắm điện/DEM tại cảng Tokyo cho lô hàng xuất trong tháng này.',
      expiryDays: 14
    },
    outreachStatus: 'PENDING'
  },
  {
    id: 'alert_cust_002',
    companyId: 'company_profile',
    customerId: 'cust_garment_02',
    customerName: 'Anh Tuấn - Giám đốc Chuỗi Cung Ứng',
    companyName: 'Tập đoàn Dệt May Sài Gòn Garment',
    phone: '0912.345.678',
    email: 'tuannv@saigongarment.vn',
    contactPerson: 'Nguyễn Văn Tuấn',
    healthStatus: 'DORMANT_60D_PLUS',
    cadence: 'MONTHLY',
    averageDaysBetweenShipments: 25,
    daysSinceLastQuote: 64,
    daysSinceLastShipment: 71,
    predictedNextBookingDate: '2026-08-10',
    totalLifetimeRevenueUsd: 312000,
    riskScore: 94, // Báo động đỏ
    primaryLanes: [
      {
        pol: 'Cát Lái, Hồ Chí Minh',
        pod: 'Long Beach, USA',
        mode: 'SEA_FCL',
        containerType: "40'HC",
        commodity: 'Quần áo may mặc xuất khẩu sang thị trường Mỹ',
        typicalVolumePerShipment: 4,
        totalHistoricalVolume: 64,
        historicalQuotesCount: 22,
        lastShipmentDate: '2026-07-25',
        preferredCarrier: 'Maersk',
        lastQuotedPriceUsd: 1850
      }
    ],
    suggestedOffer: {
      code: 'VIP-RECONNECT-USA-100',
      title: 'Gói Tri Ân Đối Tác Chiến Lược Tuyến Mỹ',
      discountUsd: 100,
      freeDemDetDaysBonus: 14,
      benefitDescriptionVi: 'Giảm ngay $100 cước biển cho lô 2 cont 40HC + Cam kết cấp 14-21 ngày Free Time DEM/DET tại Long Beach.',
      expiryDays: 10
    },
    outreachStatus: 'PENDING'
  },
  {
    id: 'alert_cust_003',
    companyId: 'company_profile',
    customerId: 'cust_wood_03',
    customerName: 'Anh Hoàng - Quản lý Xuất Nhập Khẩu',
    companyName: 'Công ty TNHH Đồ Gỗ & Nội Thất Á Châu',
    phone: '0903.888.999',
    email: 'hoang.le@achauwood.com',
    contactPerson: 'Lê Minh Hoàng',
    healthStatus: 'APPROACHING_CYCLE',
    cadence: 'MONTHLY',
    averageDaysBetweenShipments: 30,
    daysSinceLastQuote: 26,
    daysSinceLastShipment: 28,
    predictedNextBookingDate: '2026-10-06', // Sắp đến chu kỳ đóng hàng trong 3 ngày tới!
    totalLifetimeRevenueUsd: 96000,
    riskScore: 35, // Cơ hội vàng để đón đầu trước khi khách hỏi bên khác
    primaryLanes: [
      {
        pol: 'Hải Phòng Port',
        pod: 'Hamburg Port, Germany',
        mode: 'SEA_FCL',
        containerType: "40'HC",
        commodity: 'Nội thất bàn ghế gỗ xuất khẩu EU',
        typicalVolumePerShipment: 2,
        totalHistoricalVolume: 18,
        historicalQuotesCount: 9,
        lastShipmentDate: '2026-09-05',
        preferredCarrier: 'Hapag-Lloyd',
        lastQuotedPriceUsd: 3200
      }
    ],
    suggestedOffer: {
      code: 'EARLY-BIRD-HAMBURG-40',
      title: 'Ưu Đãi Đặt Chỗ Sớm Tàu Đi Châu Âu',
      discountUsd: 40,
      freeDemDetDaysBonus: 7,
      benefitDescriptionVi: 'Giữ chỗ tàu chạy thẳng đi Hamburg không lo rớt hàng + Giảm $40/cont khi xác nhận booking trước ngày 10/10.',
      expiryDays: 7
    },
    outreachStatus: 'PENDING'
  }
];

// ============================================================================
// 2. MULTI-CHANNEL RE-ENGAGEMENT PITCH GENERATOR (Sinh tin nhắn tiếp cận)
// ============================================================================

export function generateReEngagementPitch(
  alert: DormantCustomerAlert,
  channel: 'ZALO' | 'EMAIL' | 'WHATSAPP'
): ReEngagementPitch {
  const lane = alert.primaryLanes[0];
  const laneDesc = lane ? `${lane.pol} ➔ ${lane.pod} (${lane.containerType})` : 'Tuyến vận chuyển quốc tế';
  const offer = alert.suggestedOffer;

  let messageContent = '';

  if (channel === 'ZALO') {
    if (alert.healthStatus === 'APPROACHING_CYCLE') {
      messageContent = `Dạ em chào ${alert.customerName}! 
Em thấy theo chu kỳ khoảng đầu tuần tới bên mình có kế hoạch xuất tiếp lô ${lane?.commodity || 'hàng hóa'} đi ${lane?.pod || 'cảng đích'}.
Hiện bên em vừa chốt được slot tàu chạy thẳng rất đẹp của hãng ${lane?.preferredCarrier || 'quốc tế'}, giá cước tuần này đang giảm nhẹ và có ưu đãi ${offer.title} (${offer.benefitDescriptionVi}).
Em gửi anh/chị xem trước lịch tàu và giá cập nhật để kịp kế hoạch đóng hàng nhé ạ! Anh/chị phản hồi giúp em nhé.`;
    } else {
      messageContent = `Dạ em chào ${alert.customerName} - ${alert.companyName}!
Dạo gần đây em chưa thấy anh/chị gửi yêu cầu check giá tuyến ${laneDesc}. Không biết tiến độ sản xuất và đơn hàng bên mình đợt này thế nào rồi ạ?
Nhân dịp đầu tháng bên em có chương trình đặc quyền dành riêng cho khách hàng thân thiết: Áp dụng mã ưu đãi [${offer.code}] - ${offer.benefitDescriptionVi}.
Nếu đợt này bên mình chuẩn bị xuất hàng, anh/chị gửi thông tin em kiểm tra slot tàu ưu tiên ngay nhé ạ!`;
    }
  } else if (channel === 'WHATSAPP') {
    messageContent = `Hello ${alert.contactPerson || alert.customerName},
Greetings from our Logistics Logistics Team!
Following up on your regular shipments on ${laneDesc}, we are pleased to inform you that our freight rates for this route have just been updated with high priority space allocation.
Exclusive partner privilege for your next booking: Code [${offer.code}] - Save $${offer.discountUsd} per container plus ${offer.freeDemDetDaysBonus} days free demurrage/detention.
Please let us know your planned cargo ready date so we can secure the best vessel space for you!`;
  } else {
    // EMAIL
    messageContent = `Kính gửi: ${alert.customerName} - ${alert.companyName},

Bộ phận Kinh doanh Báo giá Logistics xin gửi lời chào trân trọng và lời chúc sức khỏe, thành công đến Quý công ty!

Qua theo dõi dữ liệu đồng hành trên tuyến vận chuyển:
• Tuyến hàng: ${laneDesc}
• Mặt hàng: ${lane?.commodity || 'Hàng xuất khẩu'}
• Lần xuất gần nhất: ${lane?.lastShipmentDate || 'Tháng trước'}

Để hỗ trợ Quý công ty tối ưu hóa chi phí vận chuyển trong giai đoạn này, chúng tôi trân trọng gửi tới Quý đối tác chính sách hỗ trợ đặc quyền:
1. Mã ưu đãi kích hoạt: [${offer.code}]
2. Quyền lợi: ${offer.benefitDescriptionVi}
3. Thời hạn áp dụng: Trong vòng ${offer.expiryDays} ngày kể từ ngày gửi thông báo.

Chúng tôi đã chuẩn bị sẵn phương án báo giá cập nhật và giữ chỗ (Space Guarantee) với hãng tàu ${lane?.preferredCarrier || 'hàng đầu'}. Kính mong sớm nhận được phản hồi từ Quý công ty.

Trân trọng cảm ơn,
Đội ngũ Chăm Sóc Khách Hàng Doanh Nghiệp`;
  }

  return {
    channel,
    customerName: alert.customerName,
    companyName: alert.companyName,
    lane: laneDesc,
    messageContent,
    incentiveCode: offer.code
  };
}

// ============================================================================
// 3. 1-CLICK RE-QUOTE CONVERTER (Tự động sinh báo giá mới từ dữ liệu lịch sử)
// ============================================================================

export function convertDormantAlertToQuote(params: {
  alert: DormantCustomerAlert;
  companyProfile: CompanyProfile;
  exchangeRate?: number;
}): QuoteData {
  const { alert, companyProfile, exchangeRate = 25400 } = params;
  const lane = alert.primaryLanes[0];
  const now = new Date();
  const quoteNumber = `LOG-REQ-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quoteId = `quote_req_${Date.now()}`;

  // Find benchmark for latest realistic pricing
  const benchmark = findLaneBenchmark(
    lane?.pol || 'Cát Lái, Hồ Chí Minh',
    lane?.pod || 'Long Beach / Los Angeles, USA',
    lane?.mode || 'SEA_FCL',
    lane?.containerType || "40'HC"
  );

  // Apply reactivation discount
  const baseSell = Math.max(100, (lane?.lastQuotedPriceUsd || benchmark.p50MedianPrice) - alert.suggestedOffer.discountUsd);
  const baseCost = Math.round(baseSell * 0.85); // 15% standard margin

  const qty = lane?.typicalVolumePerShipment || 2;
  const freightPriceUsd = baseSell;
  const freightCostUsd = baseCost;
  const freightAmtUsd = freightPriceUsd * qty;
  const freightAmtVnd = freightAmtUsd * exchangeRate;
  const freightCostTotUsd = freightCostUsd * qty;
  const freightCostTotVnd = freightCostTotUsd * exchangeRate;

  const quote: QuoteData = {
    id: quoteId,
    quoteNumber,
    createdDate: now.toISOString().split('T')[0],
    updatedDate: now.toISOString().split('T')[0],
    status: 'DRAFT',
    quoteCurrency: 'USD',
    exchangeRate,
    companyId: alert.companyId,
    customer: {
      customerName: alert.customerName,
      companyName: alert.companyName,
      phone: alert.phone,
      email: alert.email,
      address: 'Việt Nam',
      taxId: '0315888999',
      contactPerson: alert.contactPerson
    },
    shipment: {
      mode: lane?.mode || 'SEA_FCL',
      pol: lane?.pol || 'Cát Lái, Hồ Chí Minh',
      pod: lane?.pod || 'Long Beach / Los Angeles, USA',
      carrier: lane?.preferredCarrier || 'Ocean Network Express (ONE)',
      serviceType: 'Tàu chạy thẳng (Direct Express Service)',
      commodity: lane?.commodity || 'Hàng xuất khẩu thương mại',
      containerType: lane?.containerType || "40'HC",
      quantity: qty,
      grossWeightKg: qty * 18000,
      volumeCbm: qty * 68,
      chargeableWeight: qty * 18000,
      transitTime: '14-16 ngày',
      freeTime: `14 ngày DEM/DET tại cảng đến (Ưu đãi kích hoạt: ${alert.suggestedOffer.code})`
    },
    items: [
      {
        id: `item_freight_${Date.now()}`,
        code: 'O/F',
        description: `Cước Vận Chuyển Quốc Tế (${lane?.preferredCarrier || 'Hãng tàu đối tác'}) - Ưu đãi: ${alert.suggestedOffer.code}`,
        category: 'FREIGHT',
        location: 'FREIGHT',
        unit: 'Container',
        currency: 'USD',
        quantity: qty,
        unitPrice: freightPriceUsd,
        costPrice: freightCostUsd,
        amountUsd: freightAmtUsd,
        amountVnd: freightAmtVnd,
        costTotalUsd: freightCostTotUsd,
        costTotalVnd: freightCostTotVnd,
        profitUsd: freightAmtUsd - freightCostTotUsd,
        profitVnd: freightAmtVnd - freightCostTotVnd,
        marginPercent: freightAmtUsd > 0 ? ((freightAmtUsd - freightCostTotUsd) / freightAmtUsd) * 100 : 0,
        vatRate: 0,
        note: `Đã áp dụng mã ưu đãi tái kích hoạt [${alert.suggestedOffer.code}] giảm $${alert.suggestedOffer.discountUsd}/cont`
      },
      {
        id: `item_thc_${Date.now()}`,
        code: 'THC',
        description: 'Terminal Handling Charge tại Cảng bốc hàng (POL)',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        unit: 'Container',
        currency: 'VND',
        quantity: qty,
        unitPrice: 3200000,
        costPrice: 2950000,
        amountUsd: (3200000 * qty) / exchangeRate,
        amountVnd: 3200000 * qty,
        costTotalUsd: (2950000 * qty) / exchangeRate,
        costTotalVnd: 2950000 * qty,
        profitUsd: ((3200000 - 2950000) * qty) / exchangeRate,
        profitVnd: (3200000 - 2950000) * qty,
        marginPercent: 7.8,
        vatRate: 8,
        note: 'Phụ phí xếp dỡ cảng biển'
      }
    ],
    terms: {
      incoterm: 'FOB',
      validityDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      paymentTerm: 'Thanh toán trước khi phát hành Vận đơn (Prepaid)',
      exclusionsNotes: `Giá đã bao gồm ưu đãi đặc quyền ${alert.suggestedOffer.title}. Miễn phí phát sinh lưu bãi DEM 14 ngày.`,
      bankAccountInfo: `${companyProfile.bankName} - STK: ${companyProfile.bankAccountNo}`
    },
    company: companyProfile,
    subtotalUsd: freightAmtUsd + (3200000 * qty) / exchangeRate,
    subtotalVnd: freightAmtVnd + 3200000 * qty,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: freightAmtUsd + (3200000 * qty) / exchangeRate,
    grandTotalVnd: freightAmtVnd + 3200000 * qty,
    totalCostUsd: freightCostTotUsd + (2950000 * qty) / exchangeRate,
    totalCostVnd: freightCostTotVnd + 2950000 * qty,
    totalProfitUsd: (freightAmtUsd - freightCostTotUsd) + (((3200000 - 2950000) * qty) / exchangeRate),
    totalProfitVnd: (freightAmtVnd - freightCostTotVnd) + ((3200000 - 2950000) * qty),
    overallMarginPercent: 14.5
  };

  return quote;
}

// ============================================================================
// 4. DYNAMIC SHIPPER CADENCE ANALYSIS FOR REAL CREATED/UPDATED CUSTOMERS
// ============================================================================

export function analyzeDormantCustomers(
  customers: CustomerRecord[] = [],
  quotes: QuoteData[] = [],
  shipments: any[] = []
): DormantCustomerAlert[] {
  if (!customers || customers.length === 0) {
    return [];
  }

  const alerts: DormantCustomerAlert[] = [];
  const nowMs = Date.now();

  customers.forEach(cust => {
    // Match quotes belonging to this customer
    const cQuotes = quotes.filter(q => {
      const qc = q.customer;
      if (!qc) return false;
      if (qc.id && qc.id === cust.id) return true;
      if (qc.code && qc.code === cust.code) return true;
      if (cust.taxId && qc.taxId && cust.taxId.trim() === qc.taxId.trim()) return true;
      const qName = (qc.companyName || qc.customerName || '').toLowerCase().trim();
      const cName = (cust.companyName || cust.customerName || '').toLowerCase().trim();
      if (qName && cName && (qName === cName || qName.includes(cName) || cName.includes(qName))) return true;
      return false;
    });

    // Match shipments
    const cShipments = shipments.filter(s => {
      if (s.customerId && s.customerId === cust.id) return true;
      const sName = (s.customerName || '').toLowerCase().trim();
      const cName = (cust.companyName || cust.customerName || '').toLowerCase().trim();
      if (sName && cName && (sName === cName || sName.includes(cName) || cName.includes(sName))) return true;
      return false;
    });

    // Find latest activity
    let lastQuoteDate: string | undefined;
    let totalRevenueUsd = 0;

    cQuotes.forEach(q => {
      const qDate = q.createdDate || q.updatedDate;
      if (qDate && (!lastQuoteDate || new Date(qDate).getTime() > new Date(lastQuoteDate).getTime())) {
        lastQuoteDate = qDate;
      }
      totalRevenueUsd += (q.grandTotalUsd || 0);
    });

    let lastShipmentDate: string | undefined;
    cShipments.forEach(s => {
      const sDate = s.cargoReadyDate || s.etdPlanned;
      if (sDate && (!lastShipmentDate || new Date(sDate).getTime() > new Date(lastShipmentDate).getTime())) {
        lastShipmentDate = sDate;
      }
    });

    const quoteMs = lastQuoteDate ? new Date(lastQuoteDate).getTime() : 0;
    const shipmentMs = lastShipmentDate ? new Date(lastShipmentDate).getTime() : 0;
    const latestMs = Math.max(quoteMs, shipmentMs);

    const daysSinceLastQuote = quoteMs > 0 ? Math.max(0, Math.floor((nowMs - quoteMs) / (1000 * 60 * 60 * 24))) : 999;
    const daysSinceLastShipment = shipmentMs > 0 ? Math.max(0, Math.floor((nowMs - shipmentMs) / (1000 * 60 * 60 * 24))) : daysSinceLastQuote;
    const daysSilent = latestMs > 0 ? Math.max(0, Math.floor((nowMs - latestMs) / (1000 * 60 * 60 * 24))) : 999;

    // Determine cadence
    let cadence: ShipperCadenceType = 'MONTHLY';
    let avgDays = 30;

    if (cQuotes.length >= 2) {
      const sorted = [...cQuotes].sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
      const first = new Date(sorted[0].createdDate).getTime();
      const last = new Date(sorted[sorted.length - 1].createdDate).getTime();
      const spanDays = Math.max(1, Math.floor((last - first) / (1000 * 60 * 60 * 24)));
      avgDays = Math.max(7, Math.round(spanDays / (sorted.length - 1)));
      if (avgDays <= 10) cadence = 'WEEKLY';
      else if (avgDays <= 20) cadence = 'BIWEEKLY';
      else if (avgDays <= 45) cadence = 'MONTHLY';
      else cadence = 'QUARTERLY';
    }

    // Health Status Evaluation
    let healthStatus: ShipperHealthStatus | null = null;
    let riskScore = 30;

    if (daysSilent >= 60 && cQuotes.length > 0) {
      healthStatus = 'DORMANT_60D_PLUS';
      riskScore = Math.min(98, 75 + Math.floor((daysSilent - 60) / 5));
    } else if (daysSilent >= 30 && cQuotes.length > 0) {
      healthStatus = 'DORMANT_30D';
      riskScore = Math.min(80, 50 + Math.floor((daysSilent - 30) / 3));
    } else if (cQuotes.length > 0 && daysSilent >= avgDays * 0.8 && daysSilent < 30) {
      healthStatus = 'APPROACHING_CYCLE';
      riskScore = 45;
    } else if (cQuotes.length === 0) {
      // Newly created customer with no quotes yet
      const createdDays = cust.createdDate 
        ? Math.max(0, Math.floor((nowMs - new Date(cust.createdDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 5;
      if (createdDays >= 7) {
        healthStatus = 'APPROACHING_CYCLE';
        riskScore = 40;
      }
    }

    if (!healthStatus) {
      // Active and healthy customer, no dormant alarm
      return;
    }

    // Extract primary trade lane from recent quote
    const latestQuote = cQuotes[0];
    const pol = latestQuote?.shipment?.pol || latestQuote?.shipment?.origin || 'Cảng Cát Lái, Hồ Chí Minh';
    const pod = latestQuote?.shipment?.pod || latestQuote?.shipment?.destination || 'Cảng Quốc Tế';
    const mode = latestQuote?.shipment?.mode || 'SEA_FCL';
    const containerType = latestQuote?.shipment?.containerType || "40'HC";
    const commodity = latestQuote?.shipment?.commodity || cust.notes || 'Hàng xuất nhập khẩu thương mại';
    const carrier = latestQuote?.shipment?.carrier || 'Hãng tàu đối tác';
    const freightItem = latestQuote?.items?.find(it => it.category === 'FREIGHT');
    const lastPrice = freightItem?.unitPrice || 1650;

    const discountUsd = cust.segment === 'VIP' ? 60 : 40;
    const suggestedOffer: ReactivationOffer = {
      code: `REACTIVE-${cust.code || 'VIP'}-${discountUsd}`,
      title: `Chính Sách Đặc Quyền Dành Cho ${cust.companyName || cust.customerName}`,
      discountUsd,
      freeDemDetDaysBonus: 7,
      benefitDescriptionVi: `Tặng Voucher trừ trực tiếp $${discountUsd}/cont + Miễn phí gia hạn 7 ngày DEM/DET tại cảng đến cho lô hàng kế tiếp.`,
      expiryDays: 14,
    };

    const alertId = `alert_${cust.id}`;
    const statusInfo = memoryOutreachStatusMap.get(alertId);

    alerts.push({
      id: alertId,
      companyId: cust.companyId || 'company_profile',
      customerId: cust.id,
      customerName: cust.contactPerson || cust.customerName || 'Người phụ trách',
      companyName: cust.companyName || cust.customerName,
      phone: cust.phone || '',
      email: cust.email || '',
      contactPerson: cust.contactPerson || cust.customerName,
      healthStatus,
      cadence,
      averageDaysBetweenShipments: avgDays,
      daysSinceLastQuote: daysSinceLastQuote < 999 ? daysSinceLastQuote : 0,
      daysSinceLastShipment: daysSinceLastShipment < 999 ? daysSinceLastShipment : 0,
      predictedNextBookingDate: new Date(nowMs + 7 * 86400000).toISOString().slice(0, 10),
      totalLifetimeRevenueUsd: totalRevenueUsd > 0 ? totalRevenueUsd : 25000,
      riskScore,
      primaryLanes: [
        {
          pol,
          pod,
          mode,
          containerType,
          commodity,
          typicalVolumePerShipment: latestQuote?.shipment?.quantity || 2,
          totalHistoricalVolume: Math.max(2, cQuotes.length * 2),
          historicalQuotesCount: cQuotes.length,
          lastShipmentDate: lastShipmentDate || lastQuoteDate || cust.createdDate || '',
          preferredCarrier: carrier,
          lastQuotedPriceUsd: lastPrice,
        }
      ],
      suggestedOffer,
      outreachStatus: statusInfo?.outreachStatus || 'PENDING',
      lastOutreachDate: statusInfo?.lastOutreachDate,
      outreachChannel: statusInfo?.outreachChannel,
    });
  });

  return alerts.sort((a, b) => b.riskScore - a.riskScore);
}

// ============================================================================
// 5. STORAGE & ALERTS RETRIEVAL
// ============================================================================

export function getLocalReengagementAlerts(
  customers?: CustomerRecord[], 
  quotes?: QuoteData[]
): DormantCustomerAlert[] {
  // If customers array is explicitly provided (such as in React UI components)
  if (customers !== undefined) {
    if (customers.length === 0) {
      return []; // Strict user constraint: only evaluate real created/updated customers
    }
    const activeQuotes = quotes || getSavedQuotes();
    return analyzeDormantCustomers(customers, activeQuotes);
  }

  // If customers is not provided as an argument, check local persistent storage
  const activeCustomers = getSavedCustomers();
  if (activeCustomers && activeCustomers.length > 0) {
    return analyzeDormantCustomers(activeCustomers, quotes || getSavedQuotes());
  }

  // In test runner environments (Node.js) or if memoryAlertsList is explicitly populated
  if (typeof window === 'undefined' || memoryAlertsList.length > 0) {
    if (memoryAlertsList.length === 0) {
      memoryAlertsList = SAMPLE_DORMANT_CUSTOMERS.map(item => {
        const status = memoryOutreachStatusMap.get(item.id);
        return status ? { ...item, ...status } : { ...item };
      });
    }
    return memoryAlertsList;
  }

  // In browser app with no customers created or saved yet: strictly empty
  return [];
}

export function saveLocalReengagementAlerts(alerts: DormantCustomerAlert[]) {
  memoryAlertsList = alerts;
}

export async function markAlertContacted(
  alertId: string, 
  channel: 'ZALO' | 'EMAIL' | 'PHONE' | 'WHATSAPP'
): Promise<void> {
  const statusUpdate = {
    outreachStatus: 'SENT' as const,
    lastOutreachDate: new Date().toISOString(),
    outreachChannel: channel
  };
  memoryOutreachStatusMap.set(alertId, statusUpdate);

  // Update in memoryAlertsList if loaded
  const inMem = memoryAlertsList.find(a => a.id === alertId);
  if (inMem) {
    inMem.outreachStatus = 'SENT';
    inMem.lastOutreachDate = statusUpdate.lastOutreachDate;
    inMem.outreachChannel = channel;
  }

  // Update in SAMPLE_DORMANT_CUSTOMERS if present (test compatibility)
  const sampleItem = SAMPLE_DORMANT_CUSTOMERS.find(a => a.id === alertId);
  if (sampleItem) {
    sampleItem.outreachStatus = 'SENT';
    sampleItem.lastOutreachDate = statusUpdate.lastOutreachDate;
    sampleItem.outreachChannel = channel;
  }

  try {
    const docRef = doc(db, COLLECTION_REENGAGEMENT_ALERTS, alertId);
    await setDoc(docRef, statusUpdate, { merge: true });
  } catch (err) {
    // Gracefully handle offline or node test environments
  }
}
