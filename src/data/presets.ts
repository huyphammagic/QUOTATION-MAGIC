import { CompanyProfile, IncotermCode, FeeCategory, LineItem, TransportMode, CustomerRecord, SurchargeItem, SurchargeTransportMode, ChargeLocation } from '../types/logistics';

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
  { id: 'sur-1', code: 'THC', name: 'Terminal Handling Charge (THC) - Phí xếp dỡ cảng FCL', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container', priceUsd: 140, priceVnd: 3550000, vatRate: 8, currency: 'USD' },
  { id: 'sur-2', code: 'BL', name: 'Bill of Lading Fee (B/L) - Phí phát hành vận đơn FCL', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 40, priceVnd: 1000000, vatRate: 8, currency: 'USD' },
  { id: 'sur-3', code: 'SEAL', name: 'Container Seal Fee - Phí kẹp chì niêm phong', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container', priceUsd: 10, priceVnd: 250000, vatRate: 8, currency: 'USD' },
  { id: 'sur-4', code: 'DO', name: 'Delivery Order Fee (D/O) - Phí lệnh giao hàng nhập FCL tại POD', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POD', unit: 'Set', priceUsd: 45, priceVnd: 1150000, vatRate: 8, currency: 'USD' },
  { id: 'sur-5', code: 'TELEX', name: 'Telex Release / Surrender Fee - Phí điện giải phóng B/L', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },
  { id: 'sur-6', code: 'BAF', name: 'Bunker Adjustment Factor (BAF) - Phụ phí nhiên liệu', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 120, priceVnd: 3040000, vatRate: 0, currency: 'USD' },
  { id: 'sur-7', code: 'LSS', name: 'Low Sulphur Surcharge (LSS) - Phụ phí nhiên liệu sạch', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 40, priceVnd: 1016000, vatRate: 0, currency: 'USD' },
  { id: 'sur-8', code: 'EBS', name: 'Emergency Bunker Surcharge (EBS) - Phụ phí xăng dầu khẩn cấp', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 50, priceVnd: 1270000, vatRate: 0, currency: 'USD' },
  { id: 'sur-9', code: 'CIC', name: 'Container Imbalance Charge (CIC) - Phụ phí mất cân bằng vỏ', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 80, priceVnd: 2032000, vatRate: 0, currency: 'USD' },
  { id: 'sur-10', code: 'PSS', name: 'Peak Season Surcharge (PSS) - Phụ phí mùa cao điểm FCL', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 150, priceVnd: 3810000, vatRate: 0, currency: 'USD' },
  { id: 'sur-11', code: 'GRI', name: 'General Rate Increase (GRI) - Phụ phí tăng cước mùa cao điểm', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Container', priceUsd: 100, priceVnd: 2540000, vatRate: 0, currency: 'USD' },
  { id: 'sur-12', code: 'AMS', name: 'Automated Manifest System (AMS/AFR) - Phí truyền AMS đi Mỹ/Nhật', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-13', code: 'ENS', name: 'Entry Summary Declaration (ENS) - Phí truyền dữ liệu Hải quan EU', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Bill', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-14', code: 'DEM_DET', name: 'Demurrage & Detention Fee - Phí lưu container bãi/kho tại POD', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'POD', unit: 'Container/Ngày', priceUsd: 50, priceVnd: 1270000, vatRate: 8, currency: 'USD' },
  { id: 'sur-15', code: 'CLEANING', name: 'Container Cleaning Fee - Phí vệ sinh vỏ container tại POD', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POD', unit: 'Container', priceUsd: 20, priceVnd: 500000, vatRate: 8, currency: 'USD' },
  { id: 'sur-16', code: 'ISPS', name: 'International Port Security Fee (ISPS) - Phí an ninh cảng biển', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container', priceUsd: 15, priceVnd: 380000, vatRate: 8, currency: 'USD' },
  { id: 'sur-17', code: 'STWF', name: 'Storage & Wharfage Fee - Phí lưu bãi & cầu cảng FCL', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container/Ngày', priceUsd: 25, priceVnd: 635000, vatRate: 8, currency: 'USD' },
  { id: 'sur-18', code: 'PLUG_IN', name: 'Reefer Container Plug-in Fee - Phí cắm điện container lạnh', category: 'LOCAL_CHARGE', transportMode: 'SEA_FCL', location: 'POL', unit: 'Container/Ngày', priceUsd: 45, priceVnd: 1140000, vatRate: 8, currency: 'USD' },
  { id: 'sur-19', code: 'COD', name: 'Change of Destination Fee (COD) - Phí thay đổi cảng đích', category: 'SURCHARGE', transportMode: 'SEA_FCL', location: 'FREIGHT', unit: 'Shipment', priceUsd: 100, priceVnd: 2540000, vatRate: 8, currency: 'USD' },

  // --- ĐƯỜNG BIỂN LCL (SEA LCL) ---
  { id: 'sur-20', code: 'CFS', name: 'Container Freight Station (CFS) - Phí kho bãi hàng lẻ tại POL', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'CBM', priceUsd: 15, priceVnd: 380000, vatRate: 8, currency: 'USD' },
  { id: 'sur-21', code: 'LCL_BL', name: 'LCL Bill of Lading Fee (HBL) - Phí phát hành vận đơn hàng lẻ tại POL', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'Bill', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-22', code: 'LCL_DO', name: 'LCL Delivery Order Fee (D/O) - Phí lệnh giao hàng lẻ tại POD', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POD', unit: 'Set', priceUsd: 35, priceVnd: 890000, vatRate: 8, currency: 'USD' },
  { id: 'sur-23', code: 'LCL_HDL', name: 'LCL Handling Fee - Phí dịch vụ & làm hàng lẻ tại POL', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'Shipment', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },
  { id: 'sur-24', code: 'DECON_STRIP', name: 'De-consolidation & Stripping Fee - Phí dỡ hàng kho CFS tại POD', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POD', unit: 'CBM', priceUsd: 12, priceVnd: 300000, vatRate: 8, currency: 'USD' },
  { id: 'sur-25', code: 'CFS_STORAGE', name: 'CFS Warehousing Storage Fee - Phí lưu kho CFS quá hạn tại POD', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POD', unit: 'CBM/Ngày', priceUsd: 5, priceVnd: 127000, vatRate: 8, currency: 'USD' },
  { id: 'sur-26', code: 'LCL_PSS', name: 'LCL Peak Season Surcharge (PSS) - Phụ phí mùa cao điểm hàng lẻ', category: 'SURCHARGE', transportMode: 'SEA_LCL', location: 'FREIGHT', unit: 'CBM', priceUsd: 10, priceVnd: 254000, vatRate: 0, currency: 'USD' },
  { id: 'sur-27', code: 'LCL_LSS', name: 'LCL Low Sulphur Surcharge (LSS) - Phụ phí nhiên liệu sạch hàng lẻ', category: 'SURCHARGE', transportMode: 'SEA_LCL', location: 'FREIGHT', unit: 'CBM', priceUsd: 6, priceVnd: 152000, vatRate: 0, currency: 'USD' },
  { id: 'sur-28', code: 'LCL_AMS', name: 'LCL AMS / AFR Filing Fee - Phí truyền AMS/AFR cho hàng lẻ', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'Bill', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },
  { id: 'sur-29', code: 'DOC_FEE', name: 'Documentation Fee - Phí chứng từ & phân tách lô hàng LCL', category: 'LOCAL_CHARGE', transportMode: 'SEA_LCL', location: 'POL', unit: 'Bill', priceUsd: 25, priceVnd: 635000, vatRate: 8, currency: 'USD' },

  // --- ĐƯỜNG HÀNG KHÔNG (AIR) ---
  { id: 'sur-30', code: 'AWB', name: 'Air Waybill Fee (AWB) - Phí phát hành vận đơn hàng không tại POL', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'Bill', priceUsd: 25, priceVnd: 635000, vatRate: 8, currency: 'USD' },
  { id: 'sur-31', code: 'AIR_THC', name: 'Terminal Handling & Storage (Air THC) - Phí xếp dỡ kho bãi sân bay POL', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'KGS', priceUsd: 0.12, priceVnd: 3000, vatRate: 8, currency: 'USD' },
  { id: 'sur-32', code: 'XRAY', name: 'X-Ray & Security Screening - Phí soi chiếu an ninh hàng không tại POL', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POL', unit: 'KGS', priceUsd: 0.05, priceVnd: 1250, vatRate: 8, currency: 'USD' },
  { id: 'sur-33', code: 'FSC', name: 'Fuel Surcharge Air (FSC) - Phụ phí nhiên liệu máy bay', category: 'SURCHARGE', transportMode: 'AIR', location: 'FREIGHT', unit: 'KGS', priceUsd: 0.45, priceVnd: 11400, vatRate: 0, currency: 'USD' },
  { id: 'sur-34', code: 'SSC', name: 'Security Surcharge Air (SSC) - Phụ phí an ninh hàng không', category: 'SURCHARGE', transportMode: 'AIR', location: 'FREIGHT', unit: 'KGS', priceUsd: 0.15, priceVnd: 3800, vatRate: 0, currency: 'USD' },
  { id: 'sur-35', code: 'AIR_DO', name: 'Air Delivery Order (Air D/O) - Phí lệnh giao hàng không tại POD', category: 'LOCAL_CHARGE', transportMode: 'AIR', location: 'POD', unit: 'Set', priceUsd: 30, priceVnd: 760000, vatRate: 8, currency: 'USD' },

  // --- VẬN TẢI ĐƯỜNG BỘ / TRUCKING (ROAD) ---
  { id: 'sur-36', code: 'TRUCKING', name: 'Vận chuyển nội địa (Inland Trucking) - Cước xe container đầu xuất POL', category: 'TRUCKING', transportMode: 'ROAD', location: 'POL', unit: 'Chuyến', priceUsd: 160, priceVnd: 4000000, vatRate: 8, currency: 'VND' },
  { id: 'sur-37', code: 'LIFT', name: 'Phí nâng hạ Container (Lift On/Off) - Phí cẩu nâng hạ bãi POL', category: 'TRUCKING', transportMode: 'ROAD', location: 'POL', unit: 'Container', priceUsd: 35, priceVnd: 850000, vatRate: 8, currency: 'VND' },
  { id: 'sur-38', code: 'TOLL', name: 'Phí cầu đường & Vé trạm thu phí (Toll Fee)', category: 'TRUCKING', transportMode: 'ROAD', location: 'POL', unit: 'Chuyến', priceUsd: 12, priceVnd: 300000, vatRate: 8, currency: 'VND' },
  { id: 'sur-39', code: 'OVERTIME', name: 'Phí lưu xe chờ bốc xếp (Truck Detention/Waiting Fee)', category: 'TRUCKING', transportMode: 'ROAD', location: 'POL', unit: 'Ngày', priceUsd: 48, priceVnd: 1200000, vatRate: 8, currency: 'VND' },

  // --- THỦ TỤC HẢI QUAN (CUSTOMS) ---
  { id: 'sur-40', code: 'CUSTOMS', name: 'Khai báo thủ tục Hải quan xuất khẩu (Customs Export POL)', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Tờ khai', priceUsd: 45, priceVnd: 1200000, vatRate: 8, currency: 'VND' },
  { id: 'sur-41', code: 'INSPECTION', name: 'Kiểm tra thực tế hàng hóa (Customs Inspection) - Phí luồng đỏ', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Lô', priceUsd: 60, priceVnd: 1500000, vatRate: 8, currency: 'VND' },
  { id: 'sur-42', code: 'CO', name: 'Giấy chứng nhận xuất xứ (C/O Fee) - Phí xin C/O Form A, B, E, AK, D', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Bộ', priceUsd: 20, priceVnd: 500000, vatRate: 8, currency: 'VND' },
  { id: 'sur-43', code: 'QUARANTINE', name: 'Phí kiểm dịch & Khử trùng (Fumigation & Phytosanitary)', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POL', unit: 'Lô', priceUsd: 32, priceVnd: 800000, vatRate: 8, currency: 'VND' },

  // --- DÙNG CHUNG / TẤT CẢ (ALL) ---
  { id: 'sur-44', code: 'HANDLING', name: 'Phí dịch vụ đại lý (Handling Service Fee POL)', category: 'LOCAL_CHARGE', transportMode: 'ALL', location: 'POL', unit: 'Shipment', priceUsd: 35, priceVnd: 900000, vatRate: 8, currency: 'USD' },
  { id: 'sur-45', code: 'CUSTOMS_POD', name: 'Khai báo thủ tục Hải quan nhập khẩu (Customs Import POD)', category: 'CUSTOMS', transportMode: 'CUSTOMS', location: 'POD', unit: 'Tờ khai', priceUsd: 65, priceVnd: 1650000, vatRate: 8, currency: 'VND' },
  { id: 'sur-46', code: 'TRUCKING_POD', name: 'Vận chuyển nội địa đầu dỡ (Inland Trucking POD) - Cảng về kho', category: 'TRUCKING', transportMode: 'ROAD', location: 'POD', unit: 'Chuyến', priceUsd: 220, priceVnd: 5500000, vatRate: 8, currency: 'VND' }
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
      location: "FREIGHT" as ChargeLocation,
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
      location: "POL" as ChargeLocation,
      code: "THC",
      description: "Phí xếp dỡ tại cảng xuất (Terminal Handling Charge - THC POL)",
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
      location: "POL" as ChargeLocation,
      code: "BL",
      description: "Phí chứng từ đường biển (Bill of Lading - B/L POL)",
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
      location: "POL" as ChargeLocation,
      code: "SEAL",
      description: "Phí niêm chì (Container Seal Fee POL)",
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
      location: "FREIGHT" as ChargeLocation,
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
      location: "POL" as ChargeLocation,
      code: "CUSTOMS_FEE",
      description: "Phí dịch vụ làm thủ tục thông quan Hải quan xuất khẩu (POL)",
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
      location: "POL" as ChargeLocation,
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
    },
    {
      id: "item-8",
      category: "LOCAL_CHARGE" as const,
      location: "POD" as ChargeLocation,
      code: "DO",
      description: "Phí lệnh giao hàng tại cảng dỡ (Delivery Order - D/O POD)",
      quantity: 1,
      unit: "Set",
      unitPrice: 45,
      currency: "USD" as const,
      vatRate: 8,
      amountUsd: 45,
      amountVnd: 1143000,
      note: "Cảng Los Angeles (POD)"
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
  subtotalUsd: 6376.45,
  subtotalVnd: 161964000,
  vatTotalUsd: 47.15,
  vatTotalVnd: 1197640,
  grandTotalUsd: 6423.60,
  grandTotalVnd: 163161640
};
