import { CompanyProfile, IncotermCode, FeeCategory, LineItem, TransportMode, CustomerRecord, SurchargeItem, SurchargeTransportMode } from '../types/logistics';

export const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-01',
    code: 'KH-001',
    companyName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU PHÁT TRUYỂN TẬP ĐOÀN',
    customerName: 'Trần Thị Minh Tâm',
    contactPerson: 'Ms. Minh Tâm - Phòng XNK',
    taxId: '0108923481',
    address: 'Số 142 Khu Công Nghiệp Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh',
    email: 'tam.tran@phattruyengroup.vn',
    phone: '0912 888 999',
    group: 'Xuất Khẩu Gỗ',
    notes: 'Khách hàng đi tuyến US/EU hàng tháng, điều kiện FOB / CIF',
    createdDate: '2026-01-15'
  },
  {
    id: 'cust-02',
    code: 'KH-002',
    companyName: 'CÔNG TY CỔ PHẦN DỆT MAY PHONG PHÚ SEAWAYS',
    customerName: 'Nguyễn Quốc Bảo',
    contactPerson: 'Mr. Bảo - Trưởng phòng Purchasing',
    taxId: '0301982736',
    address: '48 Tăng Nhơn Phú, P. Tăng Nhơn Phú B, TP. Thủ Đức, TP. Hồ Chí Minh',
    email: 'bao.nguyen@phongphu-textile.com',
    phone: '0903 555 777',
    group: 'Dệt May & Phụ Liệu',
    notes: 'Nhập khẩu nguyên liệu vải từ China / Korea / Taiwan',
    createdDate: '2026-02-10'
  },
  {
    id: 'cust-03',
    code: 'KH-003',
    companyName: 'CÔNG TY TNHH CÔNG NGHỆ THIẾT BỊ ĐIỆN TỬ VINA',
    customerName: 'Lê Hoàng Nam',
    contactPerson: 'Mr. Nam - Phòng Logistics',
    taxId: '0315829301',
    address: 'Đường D1, Khu Công Nghệ Cao, P. Tân Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    email: 'nam.le@vinaelegroup.com',
    phone: '0988 222 333',
    group: 'Điện Tử & Linh Kiện',
    notes: 'Chuyên xuất nhập Air Freight & LCL chính ngạch',
    createdDate: '2026-03-20'
  },
  {
    id: 'cust-04',
    code: 'KH-004',
    companyName: 'CÔNG TY CỔ PHẦN NÔNG SẢN THỰC PHẨM AN GIANG',
    customerName: 'Phạm Thị Ngọc Anh',
    contactPerson: 'Ms. Ngọc Anh - Trưởng Nhóm XNK',
    taxId: '1600283912',
    address: 'Số 88 Khuu 1, P. Mỹ Thới, TP. Long Xuyên, Tỉnh An Giang',
    email: 'ngocanh@angiangfood.com.vn',
    phone: '0939 111 222',
    group: 'Nông Sản & Gạo',
    notes: 'Xuất khẩu Gạo & Hạt điều sang Trung Đông / Châu Phi',
    createdDate: '2026-04-05'
  }
];

export const INITIAL_SURCHARGE_CATALOG: SurchargeItem[] = [
  // --- ĐƯỜNG BIỂN FCL (SEA FCL) ---
  { id: 'sur-1', code: 'THC', name: 'Terminal Handling Charge (THC)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 140, priceVnd: 3550000, vatRate: 8, currency: 'USD' },
  { id: 'sur-2', code: 'BL', name: 'Bill of Lading Fee (B/L)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Bill', priceUsd: 40, priceVnd: 1000000, vatRate: 8, currency: 'USD' },
  { id: 'sur-3', code: 'SEAL', name: 'Container Seal Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 10, priceVnd: 250000, vatRate: 8, currency: 'USD' },
  { id: 'sur-4', code: 'DO', name: 'Delivery Order Fee (D/O)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Set', priceUsd: 45, priceVnd: 1150000, vatRate: 8, currency: 'USD' },
  { id: 'sur-5', code: 'TELEX', name: 'Telex Release / Surrender Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Bill', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },
  { id: 'sur-6', code: 'BAF', name: 'Bunker Adjustment Factor (BAF)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 120, priceVnd: 3040000, vatRate: 0, currency: 'USD' },
  { id: 'sur-7', code: 'LSS', name: 'Low Sulphur Surcharge (LSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 40, priceVnd: 1016000, vatRate: 0, currency: 'USD' },
  { id: 'sur-8', code: 'CIC', name: 'Container Imbalance Charge (CIC)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 80, priceVnd: 2032000, vatRate: 0, currency: 'USD' },
  { id: 'sur-9', code: 'PSS', name: 'Peak Season Surcharge (PSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 150, priceVnd: 3810000, vatRate: 0, currency: 'USD' },
  { id: 'sur-10', code: 'AMS', name: 'Automated Manifest System (AMS/AFR)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Bill', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-11', code: 'DEM_DET', name: 'Demurrage & Detention Fee', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container/Ngày', priceUsd: 50, priceVnd: 1270000, vatRate: 8, currency: 'USD' },
  { id: 'sur-12', code: 'CLEANING', name: 'Container Cleaning Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 20, priceVnd: 500000, vatRate: 8, currency: 'USD' },

  // --- ĐƯỜNG BIỂN LCL (SEA LCL) ---
  { id: 'sur-13', code: 'CFS', name: 'Container Freight Station (CFS)', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', unit: 'CBM', priceUsd: 15, priceVnd: 380000, vatRate: 8, currency: 'USD' },
  { id: 'sur-14', code: 'LCL_BL', name: 'LCL Bill of Lading Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', unit: 'Bill', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-15', code: 'LCL_DO', name: 'LCL Delivery Order Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', unit: 'Set', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-16', code: 'LCL_HDL', name: 'LCL Handling Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', unit: 'Shipment', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },

  // --- ĐƯỜNG HÀNG KHÔNG (AIR) ---
  { id: 'sur-17', code: 'AWB', name: 'Air Waybill Fee (AWB)', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'Bill', priceUsd: 25, priceVnd: 635000, vatRate: 8, currency: 'USD' },
  { id: 'sur-18', code: 'AIR_THC', name: 'Terminal Handling & Storage (Air THC)', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.12, priceVnd: 3000, vatRate: 8, currency: 'USD' },
  { id: 'sur-19', code: 'XRAY', name: 'X-Ray & Security Screening', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.05, priceVnd: 1250, vatRate: 8, currency: 'USD' },
  { id: 'sur-20', code: 'FSC', name: 'Fuel Surcharge Air (FSC)', category: 'SURCHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.45, priceVnd: 11400, vatRate: 0, currency: 'USD' },
  { id: 'sur-21', code: 'SSC', name: 'Security Surcharge Air (SSC)', category: 'SURCHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.15, priceVnd: 3800, vatRate: 0, currency: 'USD' },
  { id: 'sur-22', code: 'AIR_DO', name: 'Air Delivery Order (Air D/O)', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'Set', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },

  // --- VẬN TẢI ĐƯỜNG BỘ / TRUCKING (ROAD) ---
  { id: 'sur-23', code: 'TRUCKING', name: 'Vận chuyển nội địa (Inland Trucking)', category: 'TRUCKING', transportMode: 'ROAD', unit: 'Chuyến', priceUsd: 160, priceVnd: 4000000, vatRate: 8, currency: 'VND' },
  { id: 'sur-24', code: 'LIFT', name: 'Phí nâng hạ Container (Lift On/Off)', category: 'TRUCKING', transportMode: 'ROAD', unit: 'Container', priceUsd: 35, priceVnd: 850000, vatRate: 8, currency: 'VND' },
  { id: 'sur-25', code: 'TOLL', name: 'Phí cầu đường & Đồ gánh', category: 'TRUCKING', transportMode: 'ROAD', unit: 'Chuyến', priceUsd: 12, priceVnd: 300000, vatRate: 8, currency: 'VND' },
  { id: 'sur-26', code: 'OVERTIME', name: 'Phí lưu xe chờ bốc xếp', category: 'TRUCKING', transportMode: 'ROAD', unit: 'Ngày', priceUsd: 48, priceVnd: 1200000, vatRate: 8, currency: 'VND' },

  // --- THỦ TỤC HẢI QUAN (CUSTOMS) ---
  { id: 'sur-27', code: 'CUSTOMS', name: 'Khai báo thủ tục Hải quan (Customs Clearance)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Tờ khai', priceUsd: 45, priceVnd: 1200000, vatRate: 8, currency: 'VND' },
  { id: 'sur-28', code: 'INSPECTION', name: 'Kiểm tra thực tế hàng hóa (Customs Inspection)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Lô', priceUsd: 60, priceVnd: 1500000, vatRate: 8, currency: 'VND' },
  { id: 'sur-29', code: 'CO', name: 'Giấy chứng nhận xuất xứ (C/O Fee)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Bộ', priceUsd: 20, priceVnd: 500000, vatRate: 8, currency: 'VND' },
  { id: 'sur-30', code: 'QUARANTINE', name: 'Phí kiểm dịch & Khử trùng (Fumigation)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Lô', priceUsd: 32, priceVnd: 800000, vatRate: 8, currency: 'VND' },

  // --- DÙNG CHUNG / TẤT CẢ (ALL) ---
  { id: 'sur-31', code: 'HANDLING', name: 'Phí dịch vụ đại lý (Handling Service Fee)', category: 'LOCAL_CHARGE', transportMode: 'ALL', unit: 'Shipment', priceUsd: 35, priceVnd: 900000, vatRate: 8, currency: 'USD' }
];

export const DEFAULT_EXCHANGE_RATE = 25400; // 1 USD = 25,400 VND

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "CÔNG TY CỔ PHẦN LOGISTICS & VẬN TẢI QUỐC TẾ GLOBAL SEAWAYS",
  englishName: "GLOBAL SEAWAYS LOGISTICS JOINT STOCK COMPANY",
  taxId: "0312984712",
  address: "Tầng 8, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Q. Bình Thạnh, TP. Hồ Chí Minh",
  phone: "(+84) 28 3840 9988",
  email: "pricing@globalseaways.com.vn",
  website: "www.globalseaways.com.vn",
  bankName: "Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN TP.HCM",
  bankAccountNo: "0071001289388 (VND) / 0071001289399 (USD)",
  bankAccountHolder: "CONG TY CP LOGISTICS & VAN TAI QUOC TE GLOBAL SEAWAYS",
  bankSwiftCode: "BFTVVNVX007",
  salesRepName: "Nguyễn Văn Hùng",
  salesRepTitle: "Senior Pricing & Sales Executive",
  salesRepPhone: "(+84) 909 123 456",
  salesRepEmail: "hung.nguyen@globalseaways.com.vn"
};

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

export const PRESET_LOCAL_CHARGES: { code: string; name: string; category: FeeCategory; transportMode: SurchargeTransportMode; unit: string; priceUsd: number; priceVnd: number; vat: number; currency: 'USD' | 'VND' }[] = [
  // Sea FCL Charges
  { code: 'THC', name: 'Terminal Handling Charge (THC)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 140, priceVnd: 3550000, vat: 8, currency: 'USD' },
  { code: 'BL', name: 'Bill of Lading Fee (B/L)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Bill', priceUsd: 40, priceVnd: 1000000, vat: 8, currency: 'USD' },
  { code: 'SEAL', name: 'Container Seal Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 10, priceVnd: 250000, vat: 8, currency: 'USD' },
  { code: 'DO', name: 'Delivery Order Fee (D/O)', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Set', priceUsd: 45, priceVnd: 1150000, vat: 8, currency: 'USD' },
  { code: 'HANDLING', name: 'Handling Fee', category: 'LOCAL_CHARGE', transportMode: 'ALL', unit: 'Shipment', priceUsd: 35, priceVnd: 900000, vat: 8, currency: 'USD' },
  { code: 'TELEX', name: 'Telex Release / Surrender Fee', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', unit: 'Bill', priceUsd: 30, priceVnd: 760000, vat: 8, currency: 'USD' },
  
  // Sea LCL Charges
  { code: 'CFS', name: 'Container Freight Station (CFS)', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', unit: 'CBM', priceUsd: 15, priceVnd: 380000, vat: 8, currency: 'USD' },
  
  // Air Freight Local Charges
  { code: 'AWB', name: 'Air Waybill Fee (AWB)', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'Bill', priceUsd: 25, priceVnd: 635000, vat: 8, currency: 'USD' },
  { code: 'AIR_THC', name: 'Terminal Handling & Storage (Air)', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.12, priceVnd: 3000, vat: 8, currency: 'USD' },
  { code: 'XRAY', name: 'X-Ray & Screening Fee', category: 'LOCAL_CHARGE', transportMode: 'AIR', unit: 'KGS', priceUsd: 0.05, priceVnd: 1250, vat: 8, currency: 'USD' },

  // Surcharges
  { code: 'BAF', name: 'Bunker Adjustment Factor (BAF)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 120, priceVnd: 3040000, vat: 0, currency: 'USD' },
  { code: 'LSS', name: 'Low Sulphur Surcharge (LSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 40, priceVnd: 1016000, vat: 0, currency: 'USD' },
  { code: 'CIC', name: 'Container Imbalance Charge (CIC)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 80, priceVnd: 2032000, vat: 0, currency: 'USD' },
  { code: 'PSS', name: 'Peak Season Surcharge (PSS)', category: 'SURCHARGE', transportMode: 'SEA_FCL', unit: 'Container', priceUsd: 150, priceVnd: 3810000, vat: 0, currency: 'USD' },

  // Customs & Trucking
  { code: 'CUSTOMS', name: 'Khai báo thủ tục Hải quan (Customs Clearance)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Tờ khai', priceUsd: 45, priceVnd: 1200000, vat: 8, currency: 'VND' },
  { code: 'INSPECTION', name: 'Kiểm tra thực tế hàng hóa (Customs Inspection)', category: 'CUSTOMS', transportMode: 'CUSTOMS', unit: 'Lô', priceUsd: 60, priceVnd: 1500000, vat: 8, currency: 'VND' },
  { code: 'TRUCKING', name: 'Vận chuyển nội địa (Inland Trucking)', category: 'TRUCKING', transportMode: 'ROAD', unit: 'Trip', priceUsd: 160, priceVnd: 4000000, vat: 8, currency: 'VND' }
];

export const INCOTERMS_LIST: { code: IncotermCode; title: string; description: string }[] = [
  { code: 'FOB', title: 'Free On Board (Giao lên tàu)', description: 'Người bán chịu chi phí & rủi ro đến khi hàng xếp lên tàu tại port đi (POL). Người mua trả ocean/air freight & chi phí tại port đến.' },
  { code: 'CIF', title: 'Cost, Insurance & Freight (Tiền hàng, Bảo hiểm & Cước phí)', description: 'Người bán trả tiền cước & mua bảo hiểm hàng hóa đến port đến (POD). Khách hàng làm thông quan nhập khẩu.' },
  { code: 'EXW', title: 'Ex Works (Giao tại xưởng)', description: 'Người mua chịu toàn bộ chi phí & rủi ro từ kho người bán đến kho người mua (Trucking, Customs, Freight, Local Charges).' },
  { code: 'DDP', title: 'Delivered Duty Paid (Giao đã nộp thuế)', description: 'Người bán chịu toàn bộ chi phí & rủi ro bao gồm cả vận chuyển, thông quan nhập khẩu và thuế nhập khẩu/VAT.' },
  { code: 'DAP', title: 'Delivered At Place (Giao tại nơi đến)', description: 'Người bán giao hàng đến địa điểm chỉ định tại nước nhập khẩu, không bao gồm thuế nhập khẩu.' },
  { code: 'CFR', title: 'Cost and Freight (Tiền hàng & Cước phí)', description: 'Tương tự CIF nhưng người bán không bắt buộc mua bảo hiểm hàng hóa.' },
  { code: 'FCA', title: 'Free Carrier (Giao cho người vận tải)', description: 'Người bán giao hàng cho người vận tải do người mua chỉ định tại địa điểm thỏa thuận.' }
];

export const INITIAL_SAMPLE_QUOTE = {
  id: "quote-sample-01",
  quoteNumber: "LOG-2026-0789",
  createdDate: "2026-07-23",
  updatedDate: "2026-07-23",
  status: "SENT" as const,
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  customer: {
    customerName: "Trần Thị Minh Tâm",
    companyName: "CÔNG TY TNHH XUẤT NHẬP KHẨU PHÁT TRUYỂN TẬP ĐOÀN",
    taxId: "0108923481",
    address: "Số 142 Khu Công Nghiệp Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh",
    email: "tam.tran@phattruyengroup.vn",
    phone: "0912 888 999",
    contactPerson: "Ms. Minh Tâm - Phòng XNK"
  },
  shipment: {
    mode: "SEA_FCL" as TransportMode,
    pol: "Cat Lai Port, Ho Chi Minh, Vietnam (VN)",
    pod: "Los Angeles / Long Beach Port, CA, USA",
    commodity: "Gỗ nội thất & Đồ mỹ nghệ xuất khẩu",
    containerType: "40'HC" as const,
    quantity: 2,
    grossWeightKg: 24500,
    volumeCbm: 130,
    chargeableWeight: 130,
    etd: "2026-08-05",
    eta: "2026-08-22",
    transitTime: "17 - 19 ngày",
    freeTime: "14 days Free Dem/Det at POD"
  },
  items: [
    {
      id: "item-1",
      category: "FREIGHT" as const,
      code: "OCEAN_FREIGHT",
      description: "Cước vận chuyển đường biển (Ocean Freight) HCM - Los Angeles",
      quantity: 2,
      unit: "Container 40HC",
      unitPrice: 2850,
      currency: "USD" as const,
      vatRate: 0,
      amountUsd: 5700,
      amountVnd: 144780000,
      note: "Hãng tàu COSCO / ONE, đi thẳng Direct service"
    },
    {
      id: "item-2",
      category: "LOCAL_CHARGE" as const,
      code: "THC",
      description: "Phí xếp dỡ tại cảng (Terminal Handling Charge - THC)",
      quantity: 2,
      unit: "Container",
      unitPrice: 210,
      currency: "USD" as const,
      vatRate: 8,
      amountUsd: 420,
      amountVnd: 106680000,
      note: "Cảng Cát Lái"
    },
    {
      id: "item-3",
      category: "LOCAL_CHARGE" as const,
      code: "BL",
      description: "Phí chứng từ đường biển (Bill of Lading - B/L)",
      quantity: 1,
      unit: "Set",
      unitPrice: 45,
      currency: "USD" as const,
      vatRate: 8,
      amountUsd: 45,
      amountVnd: 1143000,
      note: "Phát hành Master B/L"
    },
    {
      id: "item-4",
      category: "LOCAL_CHARGE" as const,
      code: "SEAL",
      description: "Phí niêm chì (Container Seal Fee)",
      quantity: 2,
      unit: "Container",
      unitPrice: 10,
      currency: "USD" as const,
      vatRate: 8,
      amountUsd: 20,
      amountVnd: 508000,
      note: "Chì niêm phong chuẩn hải quan"
    },
    {
      id: "item-5",
      category: "SURCHARGE" as const,
      code: "LSS",
      description: "Phụ phí nhiên liệu thấp lưu huỳnh (Low Sulphur Surcharge)",
      quantity: 2,
      unit: "Container",
      unitPrice: 40,
      currency: "USD" as const,
      vatRate: 0,
      amountUsd: 80,
      amountVnd: 2032000,
      note: "Áp dụng tuyến Mỹ"
    },
    {
      id: "item-6",
      category: "CUSTOMS" as const,
      code: "CUSTOMS_FEE",
      description: "Phí dịch vụ làm thủ tục thông quan Hải quan xuất khẩu",
      quantity: 1,
      unit: "Tờ khai",
      unitPrice: 1200000,
      currency: "VND" as const,
      vatRate: 8,
      amountUsd: 47.24,
      amountVnd: 1200000,
      note: "Hàng gia công / xuất khẩu sản xuất"
    },
    {
      id: "item-7",
      category: "TRUCKING" as const,
      code: "INLAND_TRUCKING",
      description: "Vận chuyển đường bộ (Xe kéo vỏ cont từ kho Bình Dương về Cát Lái)",
      quantity: 2,
      unit: "Chuyến",
      unitPrice: 3800000,
      currency: "VND" as const,
      vatRate: 8,
      amountUsd: 299.21,
      amountVnd: 7600000,
      note: "Xe kẹp chì & định vị GPS"
    }
  ],
  terms: {
    incoterm: "FOB" as IncotermCode,
    validityDate: "2026-08-15",
    paymentTerm: "Thanh toán 100% trong vòng 07 ngày làm việc sau khi phát hành B/L copy.",
    exclusionsNotes: "• Báo giá chưa bao gồm Thuế nhập khẩu, Thuế VAT nhập khẩu tại thị trường Mỹ (POD).\n• Báo giá dựa trên thông số hàng hóa tiêu chuẩn, chưa bao gồm phí phát sinh nếu kiểm hóa luồng đỏ hoặc lưu bãi quá hạn free time.\n• Phí cước đường biển có thể thay đổi theo thông báo biến động thị trường của Hãng tàu.",
    bankAccountInfo: "Tên TK: CÔNG TY CP LOGISTICS & VẬN TẢI QUỐC TẾ GLOBAL SEAWAYS\nSố TK (VND): 0071001289388 tại Vietcombank - CN TP.HCM\nSố TK (USD): 0071001289399 tại Vietcombank - CN TP.HCM (Swift: BFTVVNVX007)"
  },
  company: DEFAULT_COMPANY_PROFILE,
  subtotalUsd: 6331.45,
  subtotalVnd: 160821000,
  vatTotalUsd: 43.55,
  vatTotalVnd: 1106240,
  grandTotalUsd: 6375,
  grandTotalVnd: 161927240
};
