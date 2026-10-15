import { AppRouteId } from './routeTypes';

export interface SystemFolderDefinition {
  id: string;
  routeId: AppRouteId;
  nameVi: string;
  nameEn: string;
  categoryVi: 'Báo Giá & CRM' | 'Biểu Cước & Phí' | 'Vận Hành & Lô Hàng' | 'Kế Toán & Thu Tiền' | 'Điều Hành & Chiến Lược' | 'Dữ Liệu Danh Mục';
  categoryEn: 'Quotes & CRM' | 'Tariffs & Surcharges' | 'Operations & Shipments' | 'Accounting & Billing' | 'Executive & BI' | 'Master Directories';
  path: string;
  hash: string;
  directHash: string;
  fullUrlHash: string;
  icon: string;
  descriptionVi: string;
  descriptionEn: string;
  badgeTone: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'purple' | 'cyan' | 'teal';
  recommendedColumns: string[];
}

export type SystemTableDefinition = SystemFolderDefinition;

export const SYSTEM_FOLDERS: SystemFolderDefinition[] = [
  {
    id: 'quotations',
    routeId: 'quotations_all',
    nameVi: 'Thư Mục Báo Giá Khách Hàng',
    nameEn: 'Customer Quotations Master Folder',
    categoryVi: 'Báo Giá & CRM',
    categoryEn: 'Quotes & CRM',
    path: '/quotations',
    hash: '#quotations',
    directHash: '#quotations',
    fullUrlHash: '#quotations?fullscreen=true',
    icon: 'FileText',
    descriptionVi: 'Quản lý toàn bộ danh sách báo giá, bản nháp, duyệt giá, phát hành và tình trạng đơn hàng với giao diện thẻ trực quan hoặc bảng chi tiết.',
    descriptionEn: 'Manage all customer quotation documents, approval workflows, and pricing lifecycle with visual card or detailed table view.',
    badgeTone: 'blue',
    recommendedColumns: ['Mã Báo Giá', 'Khách Hàng', 'Tuyến Cảng (POL-POD)', 'Hình Thức', 'Tổng Cước (USD/VND)', 'Trạng Thái', 'Hạn Hiệu Lực', 'Thao Tác'],
  },
  {
    id: 'rates',
    routeId: 'pricing_rates',
    nameVi: 'Thư Mục Biểu Cước Vận Tải & Phí',
    nameEn: 'Master Freight Tariffs & Local Charges',
    categoryVi: 'Biểu Cước & Phí',
    categoryEn: 'Tariffs & Surcharges',
    path: '/rates',
    hash: '#rates',
    directHash: '#rates',
    fullUrlHash: '#rates?fullscreen=true',
    icon: 'Database',
    descriptionVi: 'Tra cứu đa chiều biểu cước đường biển FCL/LCL, hàng không, đường bộ, so sánh biến động giá và import Excel.',
    descriptionEn: 'Unified freight rate catalog across Sea, Air, Trucking, rate comparison matrix, and bulk import.',
    badgeTone: 'cyan',
    recommendedColumns: ['Mã Cước', 'Hãng Tàu / Airline', 'POL', 'POD', 'Giá Mua (Buy)', 'Giá Bán (Sell)', 'Biên LN', 'Hiệu Lực', 'Thao Tác'],
  },
  {
    id: 'customers',
    routeId: 'master_customers',
    nameVi: 'Thư Mục Khách Hàng & CRM 360°',
    nameEn: 'Customer 360° Directory & CRM',
    categoryVi: 'Báo Giá & CRM',
    categoryEn: 'Quotes & CRM',
    path: '/customers',
    hash: '#customers',
    directHash: '#customers',
    fullUrlHash: '#customers?fullscreen=true',
    icon: 'Users',
    descriptionVi: 'Hồ sơ 360 độ khách hàng, lịch sử báo giá, hạn mức công nợ, người liên hệ và kế hoạch chăm sóc.',
    descriptionEn: 'Complete customer CRM profile, quotation histories, credit limits, contacts, and follow-ups.',
    badgeTone: 'indigo',
    recommendedColumns: ['Tên Công Ty', 'Mã Số Thuế', 'Người Liên Hệ', 'Số Điện Thoại', 'Email', 'Nhóm Khách', 'Doanh Thu', 'Thao Tác'],
  },
  {
    id: 'surcharges',
    routeId: 'master_surcharges',
    nameVi: 'Thư Mục Danh Mục Phụ Phí',
    nameEn: 'Standard Surcharges & Local Catalog',
    categoryVi: 'Biểu Cước & Phí',
    categoryEn: 'Tariffs & Surcharges',
    path: '/surcharges',
    hash: '#surcharges',
    directHash: '#surcharges',
    fullUrlHash: '#surcharges?fullscreen=true',
    icon: 'Receipt',
    descriptionVi: 'Biểu phí chuẩn hóa phụ phí địa phương POL/POD (THC, CIC, D/O, Seal, CFS) và phụ phí nhiên liệu/mùa vụ.',
    descriptionEn: 'Standardized local charges catalog (THC, CIC, D/O, Seal, CFS, EBS, BAF) by location and mode.',
    badgeTone: 'purple',
    recommendedColumns: ['Mã Phụ Phí', 'Tên Phí', 'Vị Trí (POL/POD)', 'Hình Thức', 'Đơn Giá Chuẩn', 'Loại Tiền', 'Thuế VAT', 'Thao Tác'],
  },
  {
    id: 'contracts',
    routeId: 'pricing_contracts',
    nameVi: 'Thư Mục Hợp Đồng Dịch Vụ Logistics',
    nameEn: 'Service Contracts & Carrier Tariffs',
    categoryVi: 'Biểu Cước & Phí',
    categoryEn: 'Tariffs & Surcharges',
    path: '/contracts',
    hash: '#contracts',
    directHash: '#contracts',
    fullUrlHash: '#contracts?fullscreen=true',
    icon: 'FileCheck2',
    descriptionVi: 'Hợp đồng nguyên tắc, hợp đồng dịch vụ logistics, biểu cước cam kết sản lượng (MQC) và cảnh báo sắp hết hạn.',
    descriptionEn: 'Master service agreements, carrier service contracts with MQC commitments, and expiry alerts.',
    badgeTone: 'emerald',
    recommendedColumns: ['Số Hợp Đồng', 'Đối Tác / Khách Hàng', 'Loại Hợp Đồng', 'Ngày Ký', 'Ngày Hết Hạn', 'Sản Lượng Cam Kết', 'Trạng Thái', 'Thao Tác'],
  },
  {
    id: 'shipments',
    routeId: 'ops_shipments',
    nameVi: 'Thư Mục Điều Hành Lô Hàng',
    nameEn: 'Shipments & Logistics Operations Grid',
    categoryVi: 'Vận Hành & Lô Hàng',
    categoryEn: 'Operations & Shipments',
    path: '/shipments',
    hash: '#shipments',
    directHash: '#shipments',
    fullUrlHash: '#shipments?fullscreen=true',
    icon: 'Ship',
    descriptionVi: 'Theo dõi tiến độ vận tải đa phương thức, số vận đơn B/L, container, mốc thời gian ETD/ETA và trạng thái thông quan.',
    descriptionEn: 'Real-time multi-modal shipment tracking, B/L numbers, containers, ETD/ETA milestones, and customs status.',
    badgeTone: 'teal',
    recommendedColumns: ['Mã Lô Hàng', 'Số Vận Đơn (B/L)', 'Khách Hàng', 'Hãng Tàu / Bay', 'ETD', 'ETA', 'Trạng Thái Vận Hành', 'Thao Tác'],
  },
  {
    id: 'control_tower',
    routeId: 'ops_control_tower',
    nameVi: 'Thư Mục Tháp Giám Sát & Ngoại Lệ',
    nameEn: 'Logistics Control Tower & Exception Radar',
    categoryVi: 'Vận Hành & Lô Hàng',
    categoryEn: 'Operations & Shipments',
    path: '/control-tower',
    hash: '#control-tower',
    directHash: '#control-tower',
    fullUrlHash: '#control-tower?fullscreen=true',
    icon: 'Radio',
    descriptionVi: 'Bảng radar phát hiện trễ chuyến, lưu bãi cảng vượt định mức (DEM/DET), phát sinh chi phí và báo động đỏ.',
    descriptionEn: 'Surveillance radar detecting transit delays, port demurrage/detention risks, and unexpected operational costs.',
    badgeTone: 'rose',
    recommendedColumns: ['Mức Độ Rủi Ro', 'Lô Hàng', 'Loại Ngoại Lệ', 'Cảng Phát Sinh', 'Thiệt Hại Ước Tính', 'Người Phụ Trách', 'Hành Động Khắc Phục'],
  },
  {
    id: 'payments',
    routeId: 'quotation_payments',
    nameVi: 'Thư Mục Thu Tiền & Thanh Toán Báo Giá',
    nameEn: 'Quotation Payments & Receivable Ledger',
    categoryVi: 'Kế Toán & Thu Tiền',
    categoryEn: 'Accounting & Billing',
    path: '/payments',
    hash: '#payments',
    directHash: '#payments',
    fullUrlHash: '#payments?fullscreen=true',
    icon: 'CreditCard',
    descriptionVi: 'Theo dõi thanh toán từng đơn báo giá, tình trạng cọc, đối chiếu chuyển khoản, quét mã QR VietQR và xuất biên nhận.',
    descriptionEn: 'Payment receipts ledger per quote, deposit status, VietQR reconciliation, and payment proof documents.',
    badgeTone: 'emerald',
    recommendedColumns: ['Mã Báo Giá', 'Khách Hàng', 'Tổng Tiền Báo Giá', 'Đã Thanh Toán', 'Còn Lại', 'Trạng Thái Thu', 'Ngày Cập Nhật', 'Thao Tác'],
  },
  {
    id: 'debit_notes',
    routeId: 'debit_note_management',
    nameVi: 'Thư Mục Quản Lý Giấy Báo Nợ (Debit Notes)',
    nameEn: 'Debit Notes & Billing Statement Registry',
    categoryVi: 'Kế Toán & Thu Tiền',
    categoryEn: 'Accounting & Billing',
    path: '/debit-notes',
    hash: '#debit-notes',
    directHash: '#debit-notes',
    fullUrlHash: '#debit-notes?fullscreen=true',
    icon: 'Receipt',
    descriptionVi: 'Quản lý bảng kê thanh toán Debit Note phát hành cho khách hàng, sao kê công nợ (SOA) và tình trạng thu hộ chi hộ.',
    descriptionEn: 'Central debit note management issued to clients, statement of account reconciliation, and disbursement tracking.',
    badgeTone: 'amber',
    recommendedColumns: ['Số Debit Note', 'Báo Giá Liên Quan', 'Khách Hàng', 'Tổng Tiền (USD/VND)', 'Hạn Thanh Toán', 'Trạng Thái Thu Nợ', 'Thao Tác'],
  },
  {
    id: 'carrier_invoices',
    routeId: 'carrier_invoice_audit',
    nameVi: 'Thư Mục Kiểm Toán Hóa Đơn Hãng Tàu',
    nameEn: 'Carrier Invoice Audit & Profit Leakage Guard',
    categoryVi: 'Kế Toán & Thu Tiền',
    categoryEn: 'Accounting & Billing',
    path: '/carrier-invoices',
    hash: '#carrier-invoices',
    directHash: '#carrier-invoices',
    fullUrlHash: '#carrier-invoices?fullscreen=true',
    icon: 'ShieldCheck',
    descriptionVi: 'Đối chiếu tự động hóa đơn hãng tàu/nhà xe với báo giá gốc, phát hiện chênh lệch phí, ngăn rò rỉ lợi nhuận.',
    descriptionEn: 'Automated 3-way matching between carrier bill, quoted rates, and purchase orders to eliminate profit leaks.',
    badgeTone: 'rose',
    recommendedColumns: ['Số Hóa Đơn Hãng Tàu', 'Hãng Vận Chuyển', 'Lô Hàng Liên Quan', 'Cước Dự Toán', 'Cước Thực Tế', 'Chênh Lệch (Diff)', 'Trạng Thái Đối Soát'],
  },
  {
    id: 'tenders',
    routeId: 'enterprise_tender_engine',
    nameVi: 'Thư Mục Đấu Thầu Doanh Nghiệp',
    nameEn: 'Enterprise Multi-Lane RFQ & Tender Matrix',
    categoryVi: 'Điều Hành & Chiến Lược',
    categoryEn: 'Executive & BI',
    path: '/tenders',
    hash: '#tenders',
    directHash: '#tenders',
    fullUrlHash: '#tenders?fullscreen=true',
    icon: 'Layers',
    descriptionVi: 'Quản trị hồ sơ thầu đa tuyến, ma trận chào giá 100+ tuyến vận chuyển đồng thời, tính toán tỷ lệ trúng thầu.',
    descriptionEn: 'Enterprise tender bids management across hundreds of global freight lanes simultaneously.',
    badgeTone: 'indigo',
    recommendedColumns: ['Mã Gói Thầu', 'Tên Tập Đoàn / Khách Hàng', 'Số Lượng Tuyến', 'Tổng Volume (TEU/Tấn)', 'Doanh Thu Tiềm Năng', 'Hạn Nộp Hồ Sơ', 'Thao Tác'],
  },
  {
    id: 'cockpit',
    routeId: 'executive_cockpit',
    nameVi: 'Thư Mục Điều Hành Cockpit Ban Lãnh Đạo',
    nameEn: 'Executive Leadership Cockpit & Sales KPI',
    categoryVi: 'Điều Hành & Chiến Lược',
    categoryEn: 'Executive & BI',
    path: '/cockpit',
    hash: '#cockpit',
    directHash: '#cockpit',
    fullUrlHash: '#cockpit?fullscreen=true',
    icon: 'Compass',
    descriptionVi: 'Trung tâm chỉ huy cấp C-Level: Tốc độ doanh số Sales Velocity, biên lợi nhuận thực tế, dự báo chốt đơn và bảo vệ deal.',
    descriptionEn: 'C-Level operational cockpit: Sales velocity, true margin yields, forecast radar, and high-stakes deal protection.',
    badgeTone: 'cyan',
    recommendedColumns: ['Sales Rep', 'Chỉ Tiêu Doanh Thu', 'Thực Đạt (Won)', 'Tỷ Lệ Đạt %', 'Tốc Độ Bán Hàng', 'Deal Nguy Cơ Cao', 'Xếp Hạng'],
  },
  {
    id: 'ports',
    routeId: 'master_ports',
    nameVi: 'Thư Mục Cảng Biển & Sân Bay Quốc Tế',
    nameEn: 'Global Seaports, Airports & Master Directory',
    categoryVi: 'Dữ Liệu Danh Mục',
    categoryEn: 'Master Directories',
    path: '/ports',
    hash: '#ports',
    directHash: '#ports',
    fullUrlHash: '#ports?fullscreen=true',
    icon: 'Anchor',
    descriptionVi: 'Từ điển mã cảng quốc tế UN/LOCODE, tên cảng đi POL, cảng đến POD, sân bay IATA và container chuẩn ISO.',
    descriptionEn: 'International UN/LOCODE seaport directory, IATA airport hubs, incoterms, and ISO container specs.',
    badgeTone: 'blue',
    recommendedColumns: ['Mã Cảng (UN/LOCODE)', 'Tên Cảng Biển / Sân Bay', 'Quốc Gia', 'Khu Vực', 'Loại Hình', 'Trạng Thái Hoạt Động'],
  },
  {
    id: 'audit',
    routeId: 'sys_audit',
    nameVi: 'Thư Mục Nhật Ký Kiểm Toán Hệ Thống',
    nameEn: 'Rate Revision History & Audit Trail Ledger',
    categoryVi: 'Dữ Liệu Danh Mục',
    categoryEn: 'Master Directories',
    path: '/audit',
    hash: '#audit',
    directHash: '#audit',
    fullUrlHash: '#audit?fullscreen=true',
    icon: 'ShieldCheck',
    descriptionVi: 'Lưu vết toàn bộ thao tác thêm mới, điều chỉnh giá, thay đổi phụ phí, người thực hiện và mốc thời gian ISO.',
    descriptionEn: 'Comprehensive immutable audit log recording who altered which rates, prior values, and timestamps.',
    badgeTone: 'purple',
    recommendedColumns: ['Mã Biểu Cước', 'Hành Động', 'Giá Cũ', 'Giá Mới', 'Người Thay Đổi', 'Lý Do Điều Chỉnh', 'Thời Gian Ghi Nhận'],
  },
];

// Backwards-compatible alias
export const SYSTEM_TABLES = SYSTEM_FOLDERS;

export function getFolderById(id: string): SystemFolderDefinition | undefined {
  const clean = id.toLowerCase().trim().replace(/^tables\//, '').replace(/^folders\//, '');
  return SYSTEM_FOLDERS.find(t => t.id === clean || t.hash.toLowerCase() === `#${clean}`);
}

export function getTableById(id: string): SystemFolderDefinition | undefined {
  return getFolderById(id);
}

export function getFolderByRouteId(routeId: AppRouteId): SystemFolderDefinition | undefined {
  return SYSTEM_FOLDERS.find(t => t.routeId === routeId);
}

export function getTableByRouteId(routeId: AppRouteId): SystemFolderDefinition | undefined {
  return getFolderByRouteId(routeId);
}

export function buildFolderDirectUrl(folderIdOrRouteId: string, fullscreen: boolean = true): string {
  const folder = SYSTEM_FOLDERS.find(t => t.id === folderIdOrRouteId || t.routeId === folderIdOrRouteId);
  const baseHash = folder ? folder.directHash : `#${folderIdOrRouteId.replace(/^tables\//, '')}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const fullHash = fullscreen ? `${baseHash}?fullscreen=true` : baseHash;
  return `${origin}${pathname}${fullHash}`;
}

export function buildTableDirectUrl(tableIdOrRouteId: string, fullscreen: boolean = true): string {
  return buildFolderDirectUrl(tableIdOrRouteId, fullscreen);
}

export async function copyFolderUrlToClipboard(folderIdOrRouteId: string, fullscreen: boolean = true): Promise<string> {
  const directUrl = buildFolderDirectUrl(folderIdOrRouteId, fullscreen);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(directUrl);
  }
  return directUrl;
}

export async function copyTableUrlToClipboard(tableIdOrRouteId: string, fullscreen: boolean = true): Promise<string> {
  return copyFolderUrlToClipboard(tableIdOrRouteId, fullscreen);
}
