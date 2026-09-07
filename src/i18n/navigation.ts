/**
 * Logistics Quotation Management Platform - Phase 18 Navigation i18n
 * Enterprise Information Architecture Translations
 */

export type NavigationLanguage = 'vi' | 'en';

export interface NavigationTranslations {
  // Brand & App
  appName: string;
  appSubtitle: string;
  searchPlaceholder: string;
  quickActions: string;
  collapseSidebar: string;
  expandSidebar: string;
  favorites: string;
  noFavorites: string;
  pinToFavorites: string;
  unpinFromFavorites: string;

  // Groups
  groupMain: string;
  groupQuotation: string;
  groupPricing: string;
  groupMasterData: string;
  groupOperations: string;
  groupAnalytics: string;
  groupSystem: string;

  // Quotation Module
  createQuotation: string;
  createQuotationShort: string;
  allQuotations: string;
  drafts: string;
  pendingApproval: string;
  sentQuotations: string;
  quoteSnapshots: string;
  quoteTemplates: string;
  emailTemplates: string;
  communicationCenter: string;
  followUpSchedule: string;

  // Pricing Module
  rateManagement: string;
  contractsHub: string;
  pricingPolicies: string;
  profitIntelligence: string;
  smartAssistant: string;
  rateSearch: string;
  rateComparison: string;

  // Master Data Module
  customersCrm: string;
  suppliersCarriers: string;
  chargeCodes: string;
  surchargesCatalog: string;
  portsLocations: string;
  containerTypes: string;
  incotermsTerms: string;
  paymentTerms: string;
  referenceData: string;

  // Operations Module
  oceanFreight: string;
  oceanFclLcl: string;
  airFreight: string;
  truckingInland: string;
  customsClearance: string;

  // Analytics Module
  analyticsDashboard: string;
  quotationFunnel: string;
  salesPerformance: string;
  profitabilityRbac: string;
  laneServiceAnalytics: string;

  // System Module
  companyProfile: string;
  salesRepBank: string;
  auditLogs: string;
  dataBackup: string;
  cloudSyncStatus: string;
  userRolesPermissions: string;

  // Footer & Status
  autoSaving: string;
  autoSaved: string;
  enterpriseVersion: string;
  roleAdmin: string;
  roleSalesManager: string;
  roleSalesRep: string;
  rolePricingSpecialist: string;
  roleViewer: string;
  switchRole: string;
  permissionRestricted: string;
}

export const NAVIGATION_I18N: Record<NavigationLanguage, NavigationTranslations> = {
  vi: {
    appName: 'LOGIQUOTE',
    appSubtitle: 'Enterprise TMS & Quotation',
    searchPlaceholder: 'Tìm menu hoặc chức năng (Ctrl+K)...',
    quickActions: 'Tác vụ nhanh',
    collapseSidebar: 'Thu gọn thanh điều hướng',
    expandSidebar: 'Mở rộng thanh điều hướng',
    favorites: 'Mục Yêu Thích',
    noFavorites: 'Chưa có mục nào được ghim',
    pinToFavorites: 'Ghim vào yêu thích',
    unpinFromFavorites: 'Bỏ ghim',

    groupMain: 'TỔNG QUAN',
    groupQuotation: 'BÁO GIÁ',
    groupPricing: 'GIÁ & CƯỚC',
    groupMasterData: 'DANH MỤC NỀN TẢNG',
    groupOperations: 'NGHIỆP VỤ VẬN TẢI',
    groupAnalytics: 'PHÂN TÍCH & BÁO CÁO',
    groupSystem: 'HỆ THỐNG & CÀI ĐẶT',

    createQuotation: 'Tạo Báo Giá Mới',
    createQuotationShort: 'Tạo Mới',
    allQuotations: 'Tất Cả Báo Giá',
    drafts: 'Báo Giá Nháp',
    pendingApproval: 'Chờ Phê Duyệt',
    sentQuotations: 'Đã Gửi Khách Hàng',
    quoteSnapshots: 'Kho PDF & Bản In Snapshot',
    quoteTemplates: 'Mẫu Báo Giá (Templates)',
    emailTemplates: 'Mẫu Email Gửi Báo Giá',
    communicationCenter: 'Tiến Trình & Lịch Sử Gửi',
    followUpSchedule: 'Lịch Chăm Sóc Khách Hàng',

    rateManagement: 'Bảng Giá Master (Rates)',
    contractsHub: 'Hợp Đồng KH & Nhà Cung Cấp',
    pricingPolicies: 'Chính Sách Biên Lãi',
    profitIntelligence: 'Biên Lãi & Phân Tích What-If',
    smartAssistant: 'Trợ Lý Tìm Cước AI',
    rateSearch: 'Tra Cứu Nhanh Bảng Giá',
    rateComparison: 'So Sánh Bảng Cước',

    customersCrm: 'Khách Hàng (CRM)',
    suppliersCarriers: 'Nhà Cung Cấp & Hãng Tàu',
    chargeCodes: 'Danh Mục Phí Chuẩn (Master)',
    surchargesCatalog: 'Catalog Phụ Phí Đã Lưu',
    portsLocations: 'Cảng Biển & Sân Bay',
    containerTypes: 'Quy Cách Container & Xe Tải',
    incotermsTerms: 'Điều Kiện Incoterms',
    paymentTerms: 'Điều Khoản Thanh Toán',
    referenceData: 'Bảng Dữ Liệu Danh Mục',

    oceanFreight: 'Vận Tải Đường Biển (Sea)',
    oceanFclLcl: 'Đường Biển (FCL / LCL)',
    airFreight: 'Cước Hàng Không (Air)',
    truckingInland: 'Vận Tải Nội Địa (Trucking)',
    customsClearance: 'Thủ Tục Hải Quan (Customs)',

    analyticsDashboard: 'Dashboard & BI Tổng Quan',
    quotationFunnel: 'Phễu Chuyển Đổi Báo Giá',
    salesPerformance: 'Hiệu Suất Đội Ngũ Sales',
    profitabilityRbac: 'Lợi Nhuận & Giá Vốn (RBAC)',
    laneServiceAnalytics: 'Tuyến Vận Tải & Dịch Vụ',

    companyProfile: 'Thông Tin Doanh Nghiệp',
    salesRepBank: 'Người Lập & Tài Khoản NH',
    auditLogs: 'Nhật Ký & Lịch Sử Audit',
    dataBackup: 'Sao Lưu & Phục Hồi Dữ Liệu',
    cloudSyncStatus: 'Đồng Bộ Đám Mây Firestore',
    userRolesPermissions: 'Phân Quyền Vai Trò (RBAC)',

    autoSaving: 'Đang tự động lưu...',
    autoSaved: 'Đã lưu',
    enterpriseVersion: 'Phiên bản Enterprise v2.5',
    roleAdmin: 'Quản Trị Viên (Admin)',
    roleSalesManager: 'Trưởng Phòng Sales (Manager)',
    roleSalesRep: 'Nhân Viên Sales (Rep)',
    rolePricingSpecialist: 'Chuyên Viên Cước (Pricing)',
    roleViewer: 'Chỉ Xem (Viewer)',
    switchRole: 'Chuyển vai trò',
    permissionRestricted: 'Chức năng giới hạn quyền truy cập',
  },
  en: {
    appName: 'LOGIQUOTE',
    appSubtitle: 'Enterprise TMS & Quotation',
    searchPlaceholder: 'Search navigation (Ctrl+K)...',
    quickActions: 'Quick Actions',
    collapseSidebar: 'Collapse Sidebar',
    expandSidebar: 'Expand Sidebar',
    favorites: 'FAVORITES',
    noFavorites: 'No pinned items yet',
    pinToFavorites: 'Pin to favorites',
    unpinFromFavorites: 'Unpin item',

    groupMain: 'MAIN',
    groupQuotation: 'QUOTATION',
    groupPricing: 'PRICING',
    groupMasterData: 'MASTER DATA',
    groupOperations: 'OPERATIONS',
    groupAnalytics: 'ANALYTICS',
    groupSystem: 'SYSTEM & SETTINGS',

    createQuotation: 'Create Quotation',
    createQuotationShort: 'New Quote',
    allQuotations: 'All Quotations',
    drafts: 'Draft Quotations',
    pendingApproval: 'Pending Approval',
    sentQuotations: 'Sent to Customer',
    quoteSnapshots: 'PDF & Snapshot Archive',
    quoteTemplates: 'Quotation Templates',
    emailTemplates: 'Email Templates',
    communicationCenter: 'Communication & Tracking',
    followUpSchedule: 'Follow-Up Schedule',

    rateManagement: 'Master Rates Hub',
    contractsHub: 'Contracts (Customer & Vendor)',
    pricingPolicies: 'Pricing & Margin Policies',
    profitIntelligence: 'Profit & What-If Intelligence',
    smartAssistant: 'AI Rate Assistant',
    rateSearch: 'Quick Rate Lookup',
    rateComparison: 'Rate Comparison',

    customersCrm: 'Customers (CRM)',
    suppliersCarriers: 'Suppliers & Shipping Lines',
    chargeCodes: 'Standard Charge Master',
    surchargesCatalog: 'Saved Surcharges Catalog',
    portsLocations: 'Ports & Locations',
    containerTypes: 'Container Types & Trucks',
    incotermsTerms: 'Incoterms Rules',
    paymentTerms: 'Payment Terms',
    referenceData: 'Master Reference Data',

    oceanFreight: 'Ocean Freight (Sea)',
    oceanFclLcl: 'Ocean Freight (FCL / LCL)',
    airFreight: 'Air Freight',
    truckingInland: 'Inland Trucking',
    customsClearance: 'Customs Clearance',

    analyticsDashboard: 'Dashboard & BI Overview',
    quotationFunnel: 'Quotation Funnel',
    salesPerformance: 'Sales Performance',
    profitabilityRbac: 'Profitability & Costs (RBAC)',
    laneServiceAnalytics: 'Lane & Service Analytics',

    companyProfile: 'Company & Legal Profile',
    salesRepBank: 'Sales Rep & Bank Info',
    auditLogs: 'Audit Logs & History',
    dataBackup: 'Backup & Disaster Recovery',
    cloudSyncStatus: 'Cloud Firestore Sync',
    userRolesPermissions: 'Roles & Permissions (RBAC)',

    autoSaving: 'Auto-saving...',
    autoSaved: 'Saved',
    enterpriseVersion: 'Enterprise Suite v2.5',
    roleAdmin: 'Administrator (Admin)',
    roleSalesManager: 'Sales Manager',
    roleSalesRep: 'Sales Representative',
    rolePricingSpecialist: 'Pricing Specialist',
    roleViewer: 'Viewer (Read-Only)',
    switchRole: 'Switch Role',
    permissionRestricted: 'Restricted by RBAC Policy',
  },
};
