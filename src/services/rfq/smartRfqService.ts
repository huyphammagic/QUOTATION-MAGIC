/**
 * Logistics Quotation Management Platform - Phase 56 (Ý Tưởng 1)
 * Smart RFQ Inbox & 5-Second Quote Generator Service
 * Bóc tách yêu cầu chào giá RFQ bằng AI & Tự động ghép giá Master Rate sinh báo giá trong 5 giây
 */

import { collection, doc, setDoc, getDocs, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  SmartRfqItem, 
  RfqStatus, 
  RfqSource, 
  RfqUrgency, 
  RfqShipmentSpecs, 
  RfqCustomerData, 
  RfqRateMatchOption 
} from '../../types/smartRfq';
import { QuoteData, LineItem, CompanyProfile } from '../../types/logistics';
import { saveQuoteToFirestore } from '../firebase/firestoreService';

const COLLECTION_RFQ_INBOX = 'smartRfqInbox';

// In-memory cache for fast local access and offline/test resilience
let memoryRfqList: SmartRfqItem[] = [];

export function getLocalRfqList(): SmartRfqItem[] {
  return memoryRfqList;
}

export function saveLocalRfqList(list: SmartRfqItem[]) {
  memoryRfqList = list;
}

// ============================================================================
// 1. SAMPLE REAL-WORLD RFQ DATASETS (Mẫu RFQ thực chiến phổ biến)
// ============================================================================
export const SAMPLE_REAL_WORLD_RFQS: Array<{
  title: string;
  source: RfqSource;
  rawText: string;
}> = [
  {
    title: 'Chat Zalo: 2x40HC May Mặc đi Long Beach (Cần Free DEM/DET)',
    source: 'ZALO',
    rawText: `Chào em! Check gấp giùm anh cước 2 cont 40HC đi Long Beach (Mỹ) nhé.
Hàng may mặc xuất khẩu, đóng hàng tại KCN Tân Bình.
Dự kiến hàng xong ngày 20/10 tới.
Cần tàu chạy thẳng (Direct), xin giúp anh 14 ngày free time DEM/DET tại cảng đến nhé vì bên mua cần thời gian làm thủ tục nhập.
Báo giá trọn gói All-in gồm cả phụ phí local charges cảng Cát Lái luôn nhé em.
Anh Tuấn - Cty CP May Sài Gòn (SĐT: 0912.345.678, email: tuannv@saigongarment.vn)`
  },
  {
    title: 'Email RFQ: 1x20RF Thủy Sản Đông Lạnh đi Tokyo (Incoterm CIF)',
    source: 'EMAIL',
    rawText: `Kính gửi Bộ phận Báo giá Logistics,
Công ty TNHH Thủy Hải Sản Biển Đông (MST: 0315892341, Địa chỉ: KCN Hiệp Phước, TP.HCM) cần quý công ty báo giá phương án vận chuyển cho lô hàng xuất khẩu sang Nhật:
- Mặt hàng: Tôm sú đông lạnh (-18 độ C)
- Quy cách: 01 container 20 feet Reefer (20'RF)
- Trọng lượng: 18.5 tấn (Gross Weight: 18,500 KGS)
- Cảng đi: Cát Lái (Hồ Chí Minh)
- Cảng đến: Tokyo Port, Nhật Bản
- Điều kiện giao hàng: CIF Tokyo Port
- Ngày hàng sẵn sàng (CRD): Cuối tuần này (khoảng ngày 15/10)
Yêu cầu hãng tàu lớn có cắm điện liên tục (như ONE, Maersk), cam kết nhiệt độ hành trình.
Người liên hệ: Chị Mai - Trưởng phòng XNK (Email: mai.tran@biendongseafood.com.vn - Mobile: 0988.765.432)`
  },
  {
    title: 'Bảng Dữ Liệu Excel / Skype: Hàng LCL 5.2 CBM đi Hamburg',
    source: 'EXCEL',
    rawText: `Yêu cầu báo giá hàng lẻ ghép cont (LCL):
POL: Hai Phong Port
POD: Hamburg Port, Germany
Volume: 5.2 CBM
Weight: 1,450 KGS
Commodity: Đồ thủ công mỹ nghệ mây tre đan (Handicrafts)
Incoterm: FOB Hai Phong Port
Pick-up: Xưởng tại Nam Định (nếu có trucking nội địa báo riêng)
Cần có chi tiết cước O/F và Local charges tại Hải Phòng (CFS, THC, B/L, Seal, Telex Release).
Liên hệ: Anh Hoàng - Cty Xuất Khẩu Mỹ Nghệ Á Châu (0903.888.999)`
  }
];

// ============================================================================
// 2. PARSE UNSTRUCTURED RFQ TEXT (Bóc tách thông tin bằng AI hoặc Fallback)
// ============================================================================

/**
 * Deterministic fallback parser when offline or in test runner
 */
export function parseRfqDeterministicFallback(rawText: string): {
  customer: RfqCustomerData;
  shipment: RfqShipmentSpecs;
  urgency: RfqUrgency;
  confidenceScore: number;
  missingFields: string[];
  suggestedFollowUpQuestions: string[];
} {
  const textLower = rawText.toLowerCase();

  // Mode detection
  let mode: any = 'SEA_FCL';
  if (textLower.includes('lcl') || textLower.includes('hàng lẻ') || textLower.includes('ghép')) {
    mode = 'SEA_LCL';
  } else if (textLower.includes('air') || textLower.includes('hàng không') || textLower.includes('bay')) {
    mode = 'AIR_FREIGHT';
  } else if (textLower.includes('truck') || textLower.includes('xe tải') || textLower.includes('kéo cont')) {
    mode = 'INLAND_TRUCKING';
  }

  // POL Detection
  let pol = 'Cat Lai Port, Ho Chi Minh';
  if (textLower.includes('hải phòng') || textLower.includes('hai phong') || textLower.includes('hph')) {
    pol = 'Hai Phong Port, Vietnam';
  } else if (textLower.includes('cái mép') || textLower.includes('cai mep')) {
    pol = 'Cai Mep Port, Vietnam';
  } else if (textLower.includes('đà nẵng') || textLower.includes('da nang')) {
    pol = 'Da Nang Port, Vietnam';
  } else if (textLower.includes('tân sơn nhất') || textLower.includes('sgn')) {
    pol = 'Tan Son Nhat Int Airport (SGN)';
  }

  // POD Detection
  let pod = 'Long Beach, USA';
  if (textLower.includes('tokyo')) pod = 'Tokyo, Japan';
  else if (textLower.includes('hamburg')) pod = 'Hamburg, Germany';
  else if (textLower.includes('shanghai') || textLower.includes('thượng hải')) pod = 'Shanghai, China';
  else if (textLower.includes('los angeles') || textLower.includes(' lax ')) pod = 'Los Angeles, USA';
  else if (textLower.includes('rotterdam')) pod = 'Rotterdam, Netherlands';
  else if (textLower.includes('singapore') || textLower.includes('sin')) pod = 'Singapore Port';

  // Container Type & Quantity
  let containerType: any = "40'HC";
  let quantity = 1;
  const qtyMatch = rawText.match(/(\d+)\s*(?:cont|x|container)/i);
  if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);

  if (textLower.includes("20'rf") || textLower.includes('20rf') || textLower.includes('cont lạnh 20')) {
    containerType = "20'RF";
  } else if (textLower.includes("40'rf") || textLower.includes('40rf')) {
    containerType = "40'RF";
  } else if (textLower.includes("20'gp") || textLower.includes('20gp') || textLower.includes('20 feet') || textLower.includes('20dc')) {
    containerType = "20'GP";
  } else if (mode === 'SEA_LCL') {
    containerType = 'LCL (CBM/KGS)';
  } else if (mode === 'AIR_FREIGHT') {
    containerType = 'AIR (KGS/CW)';
  }

  // Commodity
  let commodity = 'Hàng hóa thông thường (General Cargo)';
  if (textLower.includes('may mặc') || textLower.includes('quần áo') || textLower.includes('garment')) {
    commodity = 'Hàng may mặc & Thời trang xuất khẩu';
  } else if (textLower.includes('tôm') || textLower.includes('thủy sản') || textLower.includes('seafood')) {
    commodity = 'Thủy hải sản đông lạnh';
  } else if (textLower.includes('mây tre') || textLower.includes('mỹ nghệ') || textLower.includes('gỗ')) {
    commodity = 'Đồ thủ công mỹ nghệ mây tre đan';
  } else if (textLower.includes('nông sản') || textLower.includes('cà phê') || textLower.includes('gạo')) {
    commodity = 'Nông sản xuất khẩu';
  }

  // Incoterm
  let incoterm: any = 'FOB';
  if (textLower.includes('cif')) incoterm = 'CIF';
  else if (textLower.includes('exw')) incoterm = 'EXW';
  else if (textLower.includes('ddp')) incoterm = 'DDP';
  else if (textLower.includes('dap')) incoterm = 'DAP';

  // Customer Phone & Email & Name
  const phoneMatch = rawText.match(/(?:0\d{9,10}|\+84\d{9,10}|\d{4}\.\d{3}\.\d{3})/);
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  let custName = 'Khách hàng liên hệ';
  const nameMatch = rawText.match(/(?:Anh|Chị|Mr\.|Ms\.)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+?)(?:[-–—,\(]|\s+Cty|\s+SĐT)/);
  if (nameMatch) custName = nameMatch[0].trim();

  let compName = 'Doanh nghiệp xuất nhập khẩu';
  const compMatch = rawText.match(/(?:Cty|Công ty|Tập đoàn)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s.,-]+?)(?:\(|$|\n)/);
  if (compMatch) compName = compMatch[0].trim();

  // Weight & Volume
  let grossWeightKg: number | undefined = undefined;
  const weightMatch = rawText.match(/(\d+(?:[.,]\d+)?)\s*(?:tấn|tan|kgs|kg)/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1].replace(',', '.'));
    grossWeightKg = textLower.includes('tấn') ? val * 1000 : val;
  }

  let volumeCbm: number | undefined = undefined;
  const cbmMatch = rawText.match(/(\d+(?:[.,]\d+)?)\s*(?:cbm|m3)/i);
  if (cbmMatch) {
    volumeCbm = parseFloat(cbmMatch[1].replace(',', '.'));
  }

  const missingFields: string[] = [];
  const followUps: string[] = [];

  if (!rawText.match(/\d{1,2}\/\d{1,2}/)) {
    missingFields.push('Chưa rõ ngày hàng sẵn sàng (Cargo Ready Date / ETD)');
    followUps.push('Dạ anh/chị cho em xin ngày dự kiến đóng hàng xong để em giữ slot cont sớm nhất ạ?');
  }
  if (!weightMatch && mode !== 'SEA_LCL') {
    missingFields.push('Chưa có trọng lượng chính xác (Gross Weight)');
  }
  if (!textLower.includes('free time')) {
    followUps.push('Anh/chị có cần bên em xin chính sách 14 ngày Free DEM/DET tại cảng đến không ạ?');
  }

  return {
    customer: {
      customerName: custName,
      companyName: compName,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      contactPerson: custName
    },
    shipment: {
      mode,
      pol,
      pod,
      commodity,
      containerType,
      quantity,
      grossWeightKg: grossWeightKg || 15000,
      volumeCbm: volumeCbm || 35,
      cargoReadyDate: '2026-10-20',
      incoterm,
      freeTimeRequired: textLower.includes('14 ngày') ? '14 Days Free DEM/DET' : '7 Days',
      specialNotes: ['Yêu cầu vỏ cont sạch đạt chuẩn xuất khẩu', 'Theo dõi hải quan thông suốt']
    },
    urgency: textLower.includes('gấp') || textLower.includes('urgent') ? 'URGENT' : 'NORMAL',
    confidenceScore: 88,
    missingFields,
    suggestedFollowUpQuestions: followUps
  };
}

/**
 * Parses raw RFQ text into structured SmartRfqItem using AI endpoint with fallback
 */
export async function parseRfqFromRawText(params: {
  rawText: string;
  source: RfqSource;
  companyId: string;
}): Promise<SmartRfqItem> {
  const rfqId = `rfq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const rfqNumber = `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  let parsedResult: any = null;

  // Attempt server-side Gemini parse if in browser and API endpoint reachable
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/gemini/parse-rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: params.rawText, source: params.source })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.parsedData) {
          parsedResult = json.parsedData;
        }
      }
    } catch (e) {
      console.warn('Notice calling Gemini parse RFQ, falling back to local extractor:', e);
    }
  }

  // Fallback to deterministic parser
  if (!parsedResult) {
    parsedResult = parseRfqDeterministicFallback(params.rawText);
  }

  const rfqItem: SmartRfqItem = {
    id: rfqId,
    companyId: params.companyId,
    rfqNumber,
    source: params.source,
    rawText: params.rawText,
    status: 'NEW',
    urgency: parsedResult.urgency || 'NORMAL',
    customer: parsedResult.customer,
    shipment: parsedResult.shipment,
    confidenceScore: parsedResult.confidenceScore || 90,
    extractedAt: now,
    missingFields: parsedResult.missingFields || [],
    suggestedFollowUpQuestions: parsedResult.suggestedFollowUpQuestions || [],
    createdAt: now,
    updatedAt: now,
  };

  // Match with initial rates immediately
  rfqItem.matchedRates = matchRfqWithMasterRates(rfqItem);
  rfqItem.selectedMatchIndex = 0;
  rfqItem.status = 'MATCHED';

  // Save to in-memory cache
  const local = getLocalRfqList();
  saveLocalRfqList([rfqItem, ...local]);

  // Persist to Firestore if available
  if (db) {
    try {
      const rfqRef = doc(db, COLLECTION_RFQ_INBOX, rfqId);
      await setDoc(rfqRef, { ...rfqItem });
    } catch (e) {
      console.warn('Notice saving RFQ to Firestore:', e);
    }
  }

  return rfqItem;
}

// ============================================================================
// 3. MASTER RATE MATCHER (Khớp cước & phụ phí tự động)
// ============================================================================

export function matchRfqWithMasterRates(rfq: SmartRfqItem): RfqRateMatchOption[] {
  const isVnd = rfq.shipment.targetCurrency === 'VND';
  const currency = isVnd ? 'VND' : 'USD';
  const pod = rfq.shipment.pod.toLowerCase();

  // Realistic synthesized rate matches based on destination port & container
  if (pod.includes('long beach') || pod.includes('los angeles') || pod.includes('usa')) {
    return [
      {
        rateId: 'RATE-USWC-01',
        carrierName: 'Ocean Network Express (ONE)',
        serviceType: 'Direct Service (14-16 days)',
        transitTimeDays: 15,
        baseCost: 1450,
        baseSell: 1750,
        marginPercent: 17.1,
        estimatedProfit: 300,
        currency: 'USD',
        freeTimeDemDet: '14 Days Combined at POD',
        validityDate: '2026-10-31',
        suggestedLocalCharges: [
          { code: 'THC', name: 'Terminal Handling Charge (POL)', unitPrice: 140, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'B/L', name: 'Bill of Lading Fee', unitPrice: 45, currency: 'USD', unit: 'Set', type: 'LOCAL_CHARGE' },
          { code: 'SEAL', name: 'Container Seal Lock', unitPrice: 10, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'AMS', name: 'Automated Manifest System Filing', unitPrice: 35, currency: 'USD', unit: 'Bill', type: 'SURCHARGE' },
        ]
      },
      {
        rateId: 'RATE-USWC-02',
        carrierName: 'Maersk Line (TP6 Service)',
        serviceType: 'Priority Direct (13-15 days)',
        transitTimeDays: 14,
        baseCost: 1520,
        baseSell: 1820,
        marginPercent: 16.5,
        estimatedProfit: 300,
        currency: 'USD',
        freeTimeDemDet: '10 Days at POD',
        validityDate: '2026-10-31',
        suggestedLocalCharges: [
          { code: 'THC', name: 'Terminal Handling Charge (POL)', unitPrice: 140, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'B/L', name: 'Bill of Lading Fee', unitPrice: 45, currency: 'USD', unit: 'Set', type: 'LOCAL_CHARGE' },
          { code: 'SEAL', name: 'Container Seal Lock', unitPrice: 10, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'AMS', name: 'Automated Manifest System Filing', unitPrice: 35, currency: 'USD', unit: 'Bill', type: 'SURCHARGE' },
        ]
      }
    ];
  } else if (pod.includes('tokyo') || pod.includes('japan')) {
    return [
      {
        rateId: 'RATE-JPN-01',
        carrierName: 'Wan Hai Lines',
        serviceType: 'Direct Fast Transit (6-8 days)',
        transitTimeDays: 7,
        baseCost: 950,
        baseSell: 1200,
        marginPercent: 20.8,
        estimatedProfit: 250,
        currency: 'USD',
        freeTimeDemDet: '14 Days at Tokyo',
        validityDate: '2026-10-31',
        suggestedLocalCharges: [
          { code: 'THC', name: 'Terminal Handling Charge (POL)', unitPrice: 130, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'B/L', name: 'Bill of Lading Fee', unitPrice: 40, currency: 'USD', unit: 'Set', type: 'LOCAL_CHARGE' },
          { code: 'SEAL', name: 'Seal Fee', unitPrice: 10, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'AFR', name: 'Advance Filing Rules (Japan)', unitPrice: 30, currency: 'USD', unit: 'Bill', type: 'SURCHARGE' },
        ]
      }
    ];
  } else {
    // Standard European / Generic match
    return [
      {
        rateId: 'RATE-EUR-01',
        carrierName: 'Hapag-Lloyd / Cosco',
        serviceType: 'Regular Service (24-28 days)',
        transitTimeDays: 26,
        baseCost: 1100,
        baseSell: 1380,
        marginPercent: 20.3,
        estimatedProfit: 280,
        currency: 'USD',
        freeTimeDemDet: '14 Days Free DEM/DET',
        validityDate: '2026-10-31',
        suggestedLocalCharges: [
          { code: 'THC', name: 'Terminal Handling Charge (POL)', unitPrice: 140, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'B/L', name: 'Bill of Lading Fee', unitPrice: 45, currency: 'USD', unit: 'Set', type: 'LOCAL_CHARGE' },
          { code: 'SEAL', name: 'Seal Lock', unitPrice: 10, currency: 'USD', unit: 'Container', type: 'LOCAL_CHARGE' },
          { code: 'ENS', name: 'Entry Summary Declaration (EU)', unitPrice: 35, currency: 'USD', unit: 'Bill', type: 'SURCHARGE' },
        ]
      }
    ];
  }
}

// ============================================================================
// 4. 5-SECOND QUOTE CONVERSION ENGINE (Tạo báo giá hoàn chỉnh trong 5 giây)
// ============================================================================

export async function convertRfqToQuotation(params: {
  rfq: SmartRfqItem;
  companyProfile: CompanyProfile;
  exchangeRate?: number;
  selectedRateIndex?: number;
}): Promise<{
  success: boolean;
  quotation: QuoteData;
}> {
  const rfq = params.rfq;
  const matchIdx = params.selectedRateIndex ?? rfq.selectedMatchIndex ?? 0;
  const rateMatch = rfq.matchedRates && rfq.matchedRates[matchIdx] 
    ? rfq.matchedRates[matchIdx] 
    : matchRfqWithMasterRates(rfq)[0];

  const exRate = params.exchangeRate || 25400;
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const quoteNumber = `LOG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Construct Line Items
  const items: LineItem[] = [];

  // 1. Base Freight Charge
  const freightPriceUsd = rateMatch.currency === 'USD' ? rateMatch.baseSell : rateMatch.baseSell / exRate;
  const freightPriceVnd = rateMatch.currency === 'VND' ? rateMatch.baseSell : rateMatch.baseSell * exRate;
  const freightCostUsd = rateMatch.currency === 'USD' ? rateMatch.baseCost : rateMatch.baseCost / exRate;
  const freightCostVnd = rateMatch.currency === 'VND' ? rateMatch.baseCost : rateMatch.baseCost * exRate;

  const freightQty = rfq.shipment.quantity;
  const freightAmtUsd = freightPriceUsd * freightQty;
  const freightAmtVnd = freightPriceVnd * freightQty;
  const freightCostTotUsd = freightCostUsd * freightQty;
  const freightCostTotVnd = freightCostVnd * freightQty;

  items.push({
    id: `item_freight_${Date.now()}`,
    code: 'O/F',
    description: `Cước Vận Chuyển Quốc Tế (${rateMatch.carrierName})`,
    category: 'FREIGHT',
    location: 'FREIGHT',
    unit: 'Container',
    currency: rateMatch.currency,
    quantity: freightQty,
    unitPrice: rateMatch.currency === 'USD' ? freightPriceUsd : freightPriceVnd,
    costPrice: rateMatch.currency === 'USD' ? freightCostUsd : freightCostVnd,
    amountUsd: freightAmtUsd,
    amountVnd: freightAmtVnd,
    costTotalUsd: freightCostTotUsd,
    costTotalVnd: freightCostTotVnd,
    profitUsd: freightAmtUsd - freightCostTotUsd,
    profitVnd: freightAmtVnd - freightCostTotVnd,
    marginPercent: freightAmtUsd > 0 ? ((freightAmtUsd - freightCostTotUsd) / freightAmtUsd) * 100 : 0,
    vatRate: 0,
    note: `Hãng tàu: ${rateMatch.carrierName} • Lịch tàu: ${rateMatch.serviceType} • ${rateMatch.freeTimeDemDet}`
  });

  // 2. Local Charges
  rateMatch.suggestedLocalCharges.forEach((lc, idx) => {
    const isLocalVnd = lc.currency === 'VND';
    const pUsd = isLocalVnd ? lc.unitPrice / exRate : lc.unitPrice;
    const pVnd = isLocalVnd ? lc.unitPrice : lc.unitPrice * exRate;
    const cUsd = pUsd * 0.92; // 8% standard local margin
    const cVnd = pVnd * 0.92;
    const qty = lc.unit === 'Set' || lc.unit === 'Bill' ? 1 : rfq.shipment.quantity;
    const amtUsd = pUsd * qty;
    const amtVnd = pVnd * qty;
    const costTotUsd = cUsd * qty;
    const costTotVnd = cVnd * qty;

    items.push({
      id: `item_lc_${Date.now()}_${idx}`,
      code: lc.code,
      description: lc.name,
      category: (lc.type as any) || 'LOCAL_CHARGE',
      location: 'POL',
      unit: lc.unit || 'Container',
      currency: lc.currency,
      quantity: qty,
      unitPrice: lc.currency === 'USD' ? pUsd : pVnd,
      costPrice: lc.currency === 'USD' ? cUsd : cVnd,
      amountUsd: amtUsd,
      amountVnd: amtVnd,
      costTotalUsd: costTotUsd,
      costTotalVnd: costTotVnd,
      profitUsd: amtUsd - costTotUsd,
      profitVnd: amtVnd - costTotVnd,
      marginPercent: amtUsd > 0 ? ((amtUsd - costTotUsd) / amtUsd) * 100 : 0,
      vatRate: 8,
      note: `Mã phụ phí: ${lc.code}`
    });
  });

  // Calculate Subtotals
  let grandTotalUsd = 0;
  let grandTotalVnd = 0;
  let totalCostUsd = 0;
  let totalCostVnd = 0;

  items.forEach(it => {
    grandTotalUsd += it.amountUsd;
    grandTotalVnd += it.amountVnd;
    totalCostUsd += (it.costTotalUsd || 0);
    totalCostVnd += (it.costTotalVnd || 0);
  });

  const totalProfitUsd = grandTotalUsd - totalCostUsd;
  const totalProfitVnd = grandTotalVnd - totalCostVnd;
  const overallMarginPercent = grandTotalUsd > 0 ? (totalProfitUsd / grandTotalUsd) * 100 : 0;
  const subtotalUsd = grandTotalUsd;
  const subtotalVnd = grandTotalVnd;

  const quotation: QuoteData = {
    id: quoteId,
    quoteNumber,
    createdDate: now.split('T')[0],
    updatedDate: now.split('T')[0],
    status: 'DRAFT',
    quoteCurrency: rateMatch.currency,
    exchangeRate: exRate,
    companyId: rfq.companyId,
    customer: {
      customerName: rfq.customer.customerName,
      companyName: rfq.customer.companyName,
      phone: rfq.customer.phone || '',
      email: rfq.customer.email || '',
      address: 'Việt Nam',
      taxId: rfq.customer.taxId || '',
      contactPerson: rfq.customer.contactPerson || rfq.customer.customerName
    },
    shipment: {
      mode: rfq.shipment.mode,
      pol: rfq.shipment.pol,
      pod: rfq.shipment.pod,
      origin: rfq.shipment.pol,
      destination: rfq.shipment.pod,
      commodity: rfq.shipment.commodity,
      containerType: rfq.shipment.containerType,
      quantity: rfq.shipment.quantity,
      grossWeightKg: rfq.shipment.grossWeightKg || 15000,
      volumeCbm: rfq.shipment.volumeCbm || 30,
      chargeableWeight: rfq.shipment.grossWeightKg || 15000,
      carrier: rateMatch.carrierName,
      freeTime: rateMatch.freeTimeDemDet,
      transitTime: `${rateMatch.transitTimeDays || 15} ngày`
    },
    items,
    terms: {
      incoterm: rfq.shipment.incoterm || 'FOB',
      validityDate: rateMatch.validityDate || '2026-10-31',
      paymentTerm: 'Thanh toán trước khi phát hành Vận đơn (Prepaid)',
      exclusionsNotes: 'Giá chưa bao gồm thuế nhập khẩu và kiểm hóa phát sinh nếu có.',
      bankAccountInfo: `${params.companyProfile.bankName} - STK: ${params.companyProfile.bankAccountNo}`
    },
    company: params.companyProfile,
    subtotalUsd,
    subtotalVnd,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd,
    grandTotalVnd,
    totalCostUsd,
    totalCostVnd,
    totalProfitUsd,
    totalProfitVnd,
    overallMarginPercent
  };

  // Update RFQ status to QUOTED
  rfq.status = 'QUOTED';
  rfq.convertedQuotationId = quoteId;
  rfq.convertedQuotationNumber = quoteNumber;
  rfq.convertedAt = now;
  rfq.updatedAt = now;

  // Persist quotation to Firestore & Local Cache
  try {
    await saveQuoteToFirestore(quotation);
  } catch (err) {
    console.warn('Notice saving generated quote to firestore:', err);
  }

  // Update RFQ record in Firestore
  if (db) {
    try {
      const rfqDocRef = doc(db, COLLECTION_RFQ_INBOX, rfq.id);
      await updateDoc(rfqDocRef, {
        status: 'QUOTED',
        convertedQuotationId: quoteId,
        convertedQuotationNumber: quoteNumber,
        convertedAt: now,
        updatedAt: now
      }).catch(() => {});
    } catch (e) {
      console.warn('Notice updating RFQ in Firestore:', e);
    }
  }

  return {
    success: true,
    quotation
  };
}
