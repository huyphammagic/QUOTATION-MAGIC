import { CompanyProfile, IncotermCode, FeeCategory, TransportMode, CustomerRecord, SurchargeItem, SurchargeTransportMode, ChargeLocation, QuoteData } from '../types/logistics';

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  name: '',
  englishName: '',
  shortName: '',
  taxId: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  bankName: '',
  bankAccountNo: '',
  bankAccountHolder: '',
  bankSwiftCode: '',
  salesRepName: '',
  salesRepTitle: '',
  salesRepPhone: '',
  salesRepEmail: '',
};

// Aliased to EMPTY_COMPANY_PROFILE - ZERO hardcoded business entities allowed
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = EMPTY_COMPANY_PROFILE;

// Zero fake customers: Real business customers come from Firestore /customers
export const INITIAL_CUSTOMERS: CustomerRecord[] = [];

// Zero fake surcharges catalog: Surcharges come from Firestore /surcharges
export const INITIAL_SURCHARGE_CATALOG: SurchargeItem[] = [];

export const DEFAULT_EXCHANGE_RATE = 25400; // 1 USD = 25,400 VND

export const COMMON_PORTS = [
  { code: 'VNSGN', name: 'Cat Lai Port, Ho Chi Minh, Vietnam (VN)' },
  { code: 'VNHPH', name: 'Haiphong Port, Haiphong, Vietnam (VN)' },
  { code: 'VNDAN', name: 'Da Nang Port, Da Nang, Vietnam (VN)' },
  { code: 'VNCMP', name: 'Cai Mep Deepwater Port, Ba Ria Vung Tau, Vietnam (VN)' },
  { code: 'VNSGN-AIR', name: 'Tan Son Nhat Int\'l Airport (SGN), Vietnam' },
  { code: 'VNHAN-AIR', name: 'Noi Bai Int\'l Airport (HAN), Vietnam' },
  { code: 'CNSHA', name: 'Shanghai Port, China (CN)' },
  { code: 'CNNGB', name: 'Ningbo Port, China (CN)' },
  { code: 'CNSZX', name: 'Shenzhen Port (Yantian/Shekou), China (CN)' },
  { code: 'CNCAN', name: 'Guangzhou / Nansha, China (CN)' },
  { code: 'SGSIN', name: 'Singapore Port, Singapore (SG)' },
  { code: 'MYPKG', name: 'Port Klang, Malaysia (MY)' },
  { code: 'THBKK', name: 'Bangkok / Laem Chabang, Thailand (TH)' },
  { code: 'JPTYO', name: 'Tokyo Port, Japan (JP)' },
  { code: 'KRPUS', name: 'Busan Port, South Korea (KR)' },
  { code: 'USLAX', name: 'Los Angeles / Long Beach Port, CA, USA' },
  { code: 'USNYC', name: 'New York / New Jersey Port, NY, USA' },
  { code: 'DEHAM', name: 'Hamburg Port, Germany (DE)' },
  { code: 'NLRTM', name: 'Rotterdam Port, Netherlands (NL)' }
];

export const PRESET_LOCAL_CHARGES: { code: string; name: string; category: FeeCategory; transportMode: SurchargeTransportMode; location: ChargeLocation; unit: string; priceUsd: number; priceVnd: number; vat: number; currency: 'USD' | 'VND' }[] = [
  // Sea FCL Charges
  { code: 'THC', name: 'Terminal Handling Charge (THC)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container', priceUsd: 140, priceVnd: 3550000, vat: 8, currency: 'USD' },
  { code: 'BL', name: 'Bill of Lading Fee (B/L)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 40, priceVnd: 1000000, vat: 8, currency: 'USD' },
  { code: 'SEAL', name: 'Container Seal Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container', priceUsd: 10, priceVnd: 250000, vat: 8, currency: 'USD' },
  { code: 'DO', name: 'Delivery Order Fee (D/O)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POD', unit: 'Set', priceUsd: 45, priceVnd: 1150000, vat: 8, currency: 'USD' },
  { code: 'HANDLING', name: 'Handling Fee', category: 'LOCAL_CHARGE', transportMode: 'ALL', location: 'POL', unit: 'Shipment', priceUsd: 35, priceVnd: 900000, vat: 8, currency: 'USD' },
  { code: 'TELEX', name: 'Telex Release / Surrender Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 30, priceVnd: 760000, vat: 8, currency: 'USD' },
  
  // Sea LCL Charges
  { code: 'CFS', name: 'Container Freight Station (CFS)', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'CBM', priceUsd: 15, priceVnd: 380000, vat: 8, currency: 'USD' },
  
  // Air Freight Local Charges
  { code: 'AWB', name: 'Air Waybill Fee (AWB)', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'Bill', priceUsd: 25, priceVnd: 635000, vat: 8, currency: 'USD' },
  { code: 'AIR_THC', name: 'Terminal Handling & Storage (Air)', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'KGS', priceUsd: 0.12, priceVnd: 3000, vat: 8, currency: 'USD' },
  { code: 'XRAY', name: 'X-Ray & Screening Fee', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'KGS', priceUsd: 0.05, priceVnd: 1250, vat: 8, currency: 'USD' },

  // Surcharges
  { code: 'BAF', name: 'Bunker Adjustment Factor (BAF)', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 120, priceVnd: 3040000, vat: 0, currency: 'USD' },
  { code: 'LSS', name: 'Low Sulphur Surcharge (LSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 40, priceVnd: 1016000, vat: 0, currency: 'USD' },
  { code: 'CIC', name: 'Container Imbalance Charge (CIC)', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 80, priceVnd: 2032000, vat: 0, currency: 'USD' },
  { code: 'PSS', name: 'Peak Season Surcharge (PSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 150, priceVnd: 3810000, vat: 0, currency: 'USD' },

  // Customs & Trucking
  { code: 'CUSTOMS', name: 'Khai báo thủ tục Hải quan (Customs Clearance)', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Tờ khai', priceUsd: 45, priceVnd: 1200000, vat: 8, currency: 'VND' },
  { code: 'INSPECTION', name: 'Kiểm tra thực tế hàng hóa (Customs Inspection)', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Lô', priceUsd: 60, priceVnd: 1500000, vat: 8, currency: 'VND' },
  { code: 'TRUCKING', name: 'Vận chuyển nội địa (Inland Trucking)', category: 'TRUCKING', transportMode: 'ROAD', location: 'POL', unit: 'Trip', priceUsd: 160, priceVnd: 4000000, vat: 8, currency: 'VND' }
];

export const INCOTERMS_LIST: { 
  code: IncotermCode; 
  title: string; 
  description: string;
  polPaidBy: 'SELLER' | 'BUYER';
  freightPaidBy: 'SELLER' | 'BUYER';
  podPaidBy: 'SELLER' | 'BUYER';
  dutyPaidBy?: 'SELLER' | 'BUYER';
}[] = [
  { 
    code: 'FOB', 
    title: 'Free On Board (Giao lên tàu)', 
    description: 'Người BÁN trả Phí Local Charges tại POL. Người MUA trả Cước Vận Chuyển (Freight) & Local Charges tại POD.',
    polPaidBy: 'SELLER',
    freightPaidBy: 'BUYER',
    podPaidBy: 'BUYER'
  },
  { 
    code: 'CIF', 
    title: 'Cost, Insurance & Freight (Tiền hàng, Bảo hiểm & Cước phí)', 
    description: 'Người BÁN trả Phí Local Charges tại POL, Cước Vận Chuyển (Freight) & Bảo hiểm. Người MUA trả Local Charges tại POD & Thuế nhập khẩu.',
    polPaidBy: 'SELLER',
    freightPaidBy: 'SELLER',
    podPaidBy: 'BUYER'
  },
  { 
    code: 'EXW', 
    title: 'Ex Works (Giao tại xưởng)', 
    description: 'Người MUA chịu TOÀN BỘ chi phí từ xưởng (Trucking POL, Local Charges POL, Main Freight, Local Charges POD & Hải quan).',
    polPaidBy: 'BUYER',
    freightPaidBy: 'BUYER',
    podPaidBy: 'BUYER'
  },
  { 
    code: 'DDP', 
    title: 'Delivered Duty Paid (Giao đã nộp thuế)', 
    description: 'Người BÁN chịu TOÀN BỘ chi phí (Local Charges POL, Freight, Local Charges POD, Thông quan & Thuế nhập khẩu).',
    polPaidBy: 'SELLER',
    freightPaidBy: 'SELLER',
    podPaidBy: 'SELLER',
    dutyPaidBy: 'SELLER'
  },
  { 
    code: 'DAP', 
    title: 'Delivered At Place (Giao tại nơi đến)', 
    description: 'Người BÁN trả Local Charges POL, Main Freight & Local Charges POD. Người MUA tự làm thông quan & nộp thuế nhập khẩu.',
    polPaidBy: 'SELLER',
    freightPaidBy: 'SELLER',
    podPaidBy: 'SELLER',
    dutyPaidBy: 'BUYER'
  },
  { 
    code: 'CFR', 
    title: 'Cost and Freight (Tiền hàng & Cước phí)', 
    description: 'Người BÁN trả Local Charges POL & Cước Vận Chuyển (Freight). Người MUA trả Local Charges POD.',
    polPaidBy: 'SELLER',
    freightPaidBy: 'SELLER',
    podPaidBy: 'BUYER'
  },
  { 
    code: 'FCA', 
    title: 'Free Carrier (Giao cho người vận tải)', 
    description: 'Người BÁN giao hàng & chịu Local Charges POL. Người MUA trả Cước Vận Chuyển (Freight) & Local Charges POD.',
    polPaidBy: 'SELLER',
    freightPaidBy: 'BUYER',
    podPaidBy: 'BUYER'
  }
];

export function createEmptyQuote(company?: CompanyProfile): QuoteData {
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  
  const activeCompany = (company && company.name) ? company : EMPTY_COMPANY_PROFILE;
  
  let formattedBank = '';
  if (activeCompany.bankName || activeCompany.bankAccountNo) {
    const parts: string[] = [];
    if (activeCompany.bankName) parts.push(`Ngân hàng: ${activeCompany.bankName}`);
    if (activeCompany.bankAccountNo) parts.push(`Số TK: ${activeCompany.bankAccountNo}`);
    if (activeCompany.bankAccountHolder) parts.push(`Chủ TK: ${activeCompany.bankAccountHolder}`);
    if (activeCompany.bankSwiftCode) parts.push(`SWIFT Code: ${activeCompany.bankSwiftCode}`);
    formattedBank = parts.join('\n');
  }

  return {
    id: `quote-${Date.now()}`,
    quoteNumber: `LOG-${currentYear}-${randomSuffix}`,
    createdDate: new Date().toISOString().slice(0, 10),
    updatedDate: new Date().toISOString().slice(0, 10),
    status: "DRAFT",
    quoteCurrency: "USD",
    exchangeRate: DEFAULT_EXCHANGE_RATE,
    company: activeCompany,
    customer: {
      customerName: "",
      companyName: "",
      taxId: "",
      address: "",
      email: "",
      phone: "",
      contactPerson: "",
    },
    shipment: {
      mode: "SEA_FCL",
      pol: "",
      pod: "",
      commodity: "",
      containerType: "40'HC",
      quantity: 1,
      grossWeightKg: 0,
      volumeCbm: 0,
      chargeableWeight: 0,
      etd: "",
      eta: "",
      transitTime: "",
      freeTime: "",
    },
    items: [],
    terms: {
      incoterm: "FOB",
      validityDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      paymentTerm: "Thanh toán 100% trước khi phát hành B/L hoặc thả hàng.",
      exclusionsNotes: "",
      bankAccountInfo: formattedBank,
    },
    subtotalUsd: 0,
    subtotalVnd: 0,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: 0,
    grandTotalVnd: 0,
    totalCostUsd: 0,
    totalCostVnd: 0,
    totalProfitUsd: 0,
    totalProfitVnd: 0,
    overallMarginPercent: 0,
    version: 1,
  };
}

export const INITIAL_SAMPLE_QUOTE: QuoteData = createEmptyQuote(EMPTY_COMPANY_PROFILE);
