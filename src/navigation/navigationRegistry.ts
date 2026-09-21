import { AppRouteId, RouteDefinition } from './routeTypes';
import { UserRole, ROLE_PERMISSIONS } from '../types/analytics';

export const APP_ROUTES: Record<AppRouteId, RouteDefinition> = {
  // Main
  main_dashboard: {
    id: 'main_dashboard',
    path: '/dashboard',
    hash: '#dashboard',
    titleVi: 'Dashboard & BI Tổng Quan',
    titleEn: 'Analytics Dashboard & BI',
    group: 'main',
    descriptionVi: 'Chỉ số KPI, doanh thu, lợi nhuận và hiệu suất tổng thể',
    descriptionEn: 'KPI metrics, revenue, profit and overall performance',
  },

  // Quotation
  smart_quotation_workspace: {
    id: 'smart_quotation_workspace',
    path: '/smart-workspace',
    hash: '#smart-workspace',
    titleVi: 'Workspace Báo Giá Thông Minh',
    titleEn: 'Smart Quotation Workspace',
    group: 'quotation',
    descriptionVi: 'Môi trường làm việc báo giá tối ưu hóa UX/UI',
    descriptionEn: 'Enhanced quotation workspace',
  },
  quotation_new: {
    id: 'quotation_new',
    path: '/quotations/new',
    hash: '#quotations/new',
    titleVi: 'Tạo Báo Giá Mới',
    titleEn: 'Create Quotation',
    group: 'quotation',
    descriptionVi: 'Khởi tạo báo giá mới với số báo giá tự động',
    descriptionEn: 'Initialize new quotation with auto-increment number',
  },
  quotations_all: {
    id: 'quotations_all',
    path: '/quotations',
    hash: '#quotations',
    titleVi: 'Tất Cả Báo Giá',
    titleEn: 'All Quotations',
    group: 'quotation',
    descriptionVi: 'Quản lý toàn bộ danh sách báo giá trên hệ thống',
    descriptionEn: 'Manage all quotations in the system',
  },
  quotations_draft: {
    id: 'quotations_draft',
    path: '/quotations/draft',
    hash: '#quotations/draft',
    titleVi: 'Báo Giá Bản Nháp',
    titleEn: 'Draft Quotations',
    group: 'quotation',
    descriptionVi: 'Các báo giá đang trong quá trình soạn thảo',
    descriptionEn: 'Quotations currently in draft mode',
  },
  quotations_pending: {
    id: 'quotations_pending',
    path: '/quotations/pending',
    hash: '#quotations/pending',
    titleVi: 'Báo Giá Chờ Duyệt',
    titleEn: 'Pending Approval',
    group: 'quotation',
    descriptionVi: 'Các báo giá cần cấp quản lý phê duyệt điều khoản',
    descriptionEn: 'Quotations waiting for manager approval',
  },
  quotations_sent: {
    id: 'quotations_sent',
    path: '/quotations/sent',
    hash: '#quotations/sent',
    titleVi: 'Báo Giá Đã Gửi',
    titleEn: 'Sent Quotations',
    group: 'quotation',
    descriptionVi: 'Báo giá đã phát hành và gửi tới khách hàng',
    descriptionEn: 'Quotations issued and dispatched to clients',
  },
  quotation_preview: {
    id: 'quotation_preview',
    path: '/quotations/preview',
    hash: '#quotations/preview',
    titleVi: 'Xem Trước Bản In (A4)',
    titleEn: 'Print Preview (A4)',
    group: 'quotation',
    descriptionVi: 'Xem trước bố cục chuẩn A4 trước khi in hoặc xuất',
    descriptionEn: 'Preview standard A4 layout before printing or exporting',
  },
  quotation_snapshots: {
    id: 'quotation_snapshots',
    path: '/quotations/snapshots',
    hash: '#quotations/snapshots',
    titleVi: 'Lịch Sử & Bản Ghi Snapshot',
    titleEn: 'Quote Snapshots & Versions',
    group: 'quotation',
    descriptionVi: 'Xem lại các phiên bản snapshot và PDF đã phát hành',
    descriptionEn: 'Review immutable snapshots and published PDFs',
  },
  quotation_templates: {
    id: 'quotation_templates',
    path: '/quotations/templates',
    hash: '#quotations/templates',
    titleVi: 'Mẫu Báo Giá Tùy Chỉnh',
    titleEn: 'Quotation Templates',
    group: 'quotation',
    descriptionVi: 'Thiết kế và cấu hình các mẫu in báo giá',
    descriptionEn: 'Design and configure print templates',
  },
  quotation_send: {
    id: 'quotation_send',
    path: '/quotations/send',
    hash: '#quotations/send',
    titleVi: 'Gửi Email Báo Giá',
    titleEn: 'Send Quotation Email',
    group: 'quotation',
    descriptionVi: 'Gửi báo giá qua email kèm link tra cứu bảo mật',
    descriptionEn: 'Send quote via email with secure tracking link',
  },
  quotation_communication: {
    id: 'quotation_communication',
    path: '/quotations/communication',
    hash: '#quotations/communication',
    titleVi: 'Trung Tâm Giao Tiếp & Phản Hồi',
    titleEn: 'Communication & Response Center',
    group: 'quotation',
    descriptionVi: 'Lịch sử tương tác, email và phản hồi trực tiếp từ khách hàng',
    descriptionEn: 'Interaction timeline, email logs and customer responses',
  },
  quotation_document_center: {
    id: 'quotation_document_center',
    path: '/quotations/document-center',
    hash: '#quotations/document-center',
    titleVi: 'Trung Tâm Tài Liệu & Giao Tiếp',
    titleEn: 'Document & Communication Control Center',
    group: 'quotation',
    descriptionVi: 'Quản lý tập trung tài liệu, PDF, phụ lục, email và lịch sử tương tác khách hàng (Phase 40)',
    descriptionEn: 'Unified management for quotations, PDFs, attachments, emails, and customer delivery',
  },
  quotation_email_templates: {
    id: 'quotation_email_templates',
    path: '/quotations/email-templates',
    hash: '#quotations/email-templates',
    titleVi: 'Mẫu Email Gửi Khách',
    titleEn: 'Email Templates',
    group: 'quotation',
    descriptionVi: 'Quản lý các mẫu thư chào giá chuyên nghiệp',
    descriptionEn: 'Manage standardized quotation email templates',
  },
  quotation_followup: {
    id: 'quotation_followup',
    path: '/quotations/follow-up',
    hash: '#quotations/follow-up',
    titleVi: 'Lịch Nhắc Chăm Sóc Khách',
    titleEn: 'Follow-Up Schedule',
    group: 'quotation',
    descriptionVi: 'Quản lý lịch hẹn và tác vụ theo dõi báo giá',
    descriptionEn: 'Schedule and manage customer follow-up actions',
  },

  // Pricing
  pricing_rates: {
    id: 'pricing_rates',
    path: '/rates',
    hash: '#rates',
    titleVi: 'Bảng Giá & Quản Lý Cước',
    titleEn: 'Rate Master Hub',
    group: 'pricing',
    descriptionVi: 'Quản lý biểu cước chuẩn, cước mua, cước bán',
    descriptionEn: 'Manage buy and sell master freight rates',
  },
  pricing_contracts: {
    id: 'pricing_contracts',
    path: '/contracts',
    hash: '#contracts',
    titleVi: 'Quản Lý Hợp Đồng Giá',
    titleEn: 'Contracts Hub',
    group: 'pricing',
    descriptionVi: 'Theo dõi hợp đồng khách hàng, cam kết sản lượng và hạn mức',
    descriptionEn: 'Track customer contracts, volume commitments and credit limits',
  },
  pricing_policies: {
    id: 'pricing_policies',
    path: '/pricing/policies',
    hash: '#pricing/policies',
    titleVi: 'Chính Sách Giá & Margin',
    titleEn: 'Pricing Policies & Margins',
    group: 'pricing',
    requiredPermission: 'admin_manager',
    allowedRoles: ['ADMIN', 'SALES_MANAGER'],
    descriptionVi: 'Cấu hình biên lợi nhuận tối thiểu và chính sách chiết khấu',
    descriptionEn: 'Configure minimum margins and discount policies',
  },
  pricing_profit: {
    id: 'pricing_profit',
    path: '/pricing/profit',
    hash: '#pricing/profit',
    titleVi: 'Phân Tích Lợi Nhuận & What-If',
    titleEn: 'Profit Intelligence & Simulation',
    group: 'pricing',
    requiredPermission: 'profitability.view',
    descriptionVi: 'Mô phỏng doanh thu, chi phí và biên lợi nhuận chi tiết',
    descriptionEn: 'Simulate revenue, cost and profit margin scenarios',
  },
  pricing_smart: {
    id: 'pricing_smart',
    path: '/pricing/assistant',
    hash: '#pricing/assistant',
    titleVi: 'Trợ Lý Tìm Cước Thông Minh',
    titleEn: 'Smart Rate Assistant',
    group: 'pricing',
    descriptionVi: 'Tự động gợi ý cước tối ưu theo tuyến đường và loại hàng',
    descriptionEn: 'Auto-suggest optimal rates by route and commodity',
  },
  pricing_search: {
    id: 'pricing_search',
    path: '/pricing/search',
    hash: '#pricing/search',
    titleVi: 'Tra Cứu Nhanh Bảng Giá',
    titleEn: 'Quick Rate Search',
    group: 'pricing',
    descriptionVi: 'Tìm kiếm nhanh cước theo POL, POD và Carrier',
    descriptionEn: 'Fast search rates by POL, POD and Carrier',
  },

  // Master Data
  master_customers: {
    id: 'master_customers',
    path: '/customers',
    hash: '#customers',
    titleVi: 'Danh Sách Khách Hàng (CRM)',
    titleEn: 'Customer Management (CRM)',
    group: 'masterData',
    descriptionVi: 'Quản lý thông tin doanh nghiệp, mã số thuế và người liên hệ',
    descriptionEn: 'Manage customer companies, tax IDs and contact persons',
  },
  master_suppliers: {
    id: 'master_suppliers',
    path: '/master/suppliers',
    hash: '#master/suppliers',
    titleVi: 'Nhà Cung Cấp & Hãng Tàu',
    titleEn: 'Suppliers & Carriers',
    group: 'masterData',
    descriptionVi: 'Danh bạ hãng tàu, hãng hàng không, nhà xe vận tải',
    descriptionEn: 'Directory of shipping lines, airlines and trucking vendors',
  },
  master_charges: {
    id: 'master_charges',
    path: '/master/charges',
    hash: '#master/charges',
    titleVi: 'Danh Mục Mã Phí Chuẩn',
    titleEn: 'Charge Master Codes',
    group: 'masterData',
    descriptionVi: 'Quản lý mã phí chuẩn hóa cho báo giá Logistics',
    descriptionEn: 'Standard charge code catalog for logistics billing',
  },
  master_surcharges: {
    id: 'master_surcharges',
    path: '/master/surcharges',
    hash: '#master/surcharges',
    titleVi: 'Danh Mục Phụ Phí Local Charge',
    titleEn: 'Local Charges Catalog',
    group: 'masterData',
    descriptionVi: 'Biểu phí Local Charges, THC, D/O, Seal, B/L',
    descriptionEn: 'Local charges catalog, THC, D/O, Seal, B/L fees',
  },
  master_ports: {
    id: 'master_ports',
    path: '/master/ports',
    hash: '#master/ports',
    titleVi: 'Cảng Biển & Sân Bay',
    titleEn: 'Ports & Airports Directory',
    group: 'masterData',
    descriptionVi: 'Hệ thống cảng biển, sân bay và mã UN/LOCODE',
    descriptionEn: 'Sea ports, airports and UN/LOCODE dictionary',
  },
  master_containers: {
    id: 'master_containers',
    path: '/master/containers',
    hash: '#master/containers',
    titleVi: 'Quy Cách & Loại Container',
    titleEn: 'Container & Equipment Types',
    group: 'masterData',
    descriptionVi: 'Danh mục 20GP, 40GP, 40HC, Reefer, Flat Rack...',
    descriptionEn: 'Container types specifications 20GP, 40GP, 40HC, Reefer...',
  },
  master_incoterms: {
    id: 'master_incoterms',
    path: '/master/incoterms',
    hash: '#master/incoterms',
    titleVi: 'Điều Kiện Incoterms 2020',
    titleEn: 'Incoterms 2020 Rules',
    group: 'masterData',
    descriptionVi: 'Quy định trách nhiệm phân bổ chi phí FOB, CIF, EXW, DDP...',
    descriptionEn: 'Cost and risk allocation rules FOB, CIF, EXW, DDP...',
  },
  master_payment_terms: {
    id: 'master_payment_terms',
    path: '/master/payment-terms',
    hash: '#master/payment-terms',
    titleVi: 'Điều Khoản Thanh Toán',
    titleEn: 'Payment Terms Catalog',
    group: 'masterData',
    descriptionVi: 'Các phương thức và kỳ hạn thanh toán chuẩn',
    descriptionEn: 'Standard payment methods and credit periods',
  },

  // Operations
  ops_ocean: {
    id: 'ops_ocean',
    path: '/operations/ocean',
    hash: '#operations/ocean',
    titleVi: 'Vận Tải Đường Biển (FCL/LCL)',
    titleEn: 'Ocean Freight (FCL/LCL)',
    group: 'operations',
    descriptionVi: 'Tập trung tính cước và nghiệp vụ hàng nguyên và lẻ đường biển',
    descriptionEn: 'Focus on sea freight full container and consolidation',
  },
  ops_air: {
    id: 'ops_air',
    path: '/operations/air',
    hash: '#operations/air',
    titleVi: 'Vận Tải Hàng Không (Air Freight)',
    titleEn: 'Air Cargo Operations',
    group: 'operations',
    descriptionVi: 'Tập trung cước hàng không theo thể tích và trọng lượng Chargeable Weight',
    descriptionEn: 'Air freight operations with chargeable weight calculation',
  },
  ops_trucking: {
    id: 'ops_trucking',
    path: '/operations/trucking',
    hash: '#operations/trucking',
    titleVi: 'Vận Tải Đường Bộ & Kéo Cont',
    titleEn: 'Inland Trucking & Drayage',
    group: 'operations',
    descriptionVi: 'Vận chuyển nội địa, xe tải, rơ-moóc kéo container cảng - kho',
    descriptionEn: 'Domestic trucking, inland container drayage',
  },
  ops_customs: {
    id: 'ops_customs',
    path: '/operations/customs',
    hash: '#operations/customs',
    titleVi: 'Thủ Tục Hải Quan & Kiểm Tra',
    titleEn: 'Customs Clearance & Inspection',
    group: 'operations',
    descriptionVi: 'Khai báo hải quan điện tử, kiểm hóa, cấp phép chuyên ngành',
    descriptionEn: 'Customs declaration, cargo physical inspection and licensing',
  },

  // Analytics
  analytics_overview: {
    id: 'analytics_overview',
    path: '/analytics/overview',
    hash: '#analytics/overview',
    titleVi: 'Tổng Quan Hiệu Suất (KPIs)',
    titleEn: 'Executive Performance KPIs',
    group: 'analytics',
    descriptionVi: 'Biểu đồ doanh thu, số lượng báo giá chốt và tỷ lệ thành công',
    descriptionEn: 'Executive dashboard for quotation win-rate and volume',
  },
  analytics_funnel: {
    id: 'analytics_funnel',
    path: '/analytics/funnel',
    hash: '#analytics/funnel',
    titleVi: 'Phễu Chuyển Đổi Báo Giá',
    titleEn: 'Quotation Conversion Funnel',
    group: 'analytics',
    descriptionVi: 'Tỷ lệ rơi rụng qua từng giai đoạn từ Nháp đến Đã Chốt',
    descriptionEn: 'Stage-by-stage dropoff analysis from Draft to Won',
  },
  analytics_sales: {
    id: 'analytics_sales',
    path: '/analytics/sales',
    hash: '#analytics/sales',
    titleVi: 'Hiệu Suất Nhân Viên Sales',
    titleEn: 'Sales Rep Performance Leaderboard',
    group: 'analytics',
    descriptionVi: 'Thống kê doanh số, số lượng báo giá theo từng nhân viên',
    descriptionEn: 'Revenue and win-rate breakdown by sales representative',
  },
  analytics_profit: {
    id: 'analytics_profit',
    path: '/analytics/profit',
    hash: '#analytics/profit',
    titleVi: 'Phân Tích Lợi Nhuận Thực Tế',
    titleEn: 'Profitability Analysis (RBAC)',
    group: 'analytics',
    requiredPermission: 'profitability.view',
    descriptionVi: 'Phân tích chênh lệch cước mua - cước bán và tỷ suất lợi nhuận',
    descriptionEn: 'Analyze buy/sell margin spread and gross profit ratio',
  },
  analytics_lanes: {
    id: 'analytics_lanes',
    path: '/analytics/lanes',
    hash: '#analytics/lanes',
    titleVi: 'Phân Tích Tuyến Đường & Dịch Vụ',
    titleEn: 'Lanes & Services Analytics',
    group: 'analytics',
    descriptionVi: 'Top các tuyến đường biển/hàng không có doanh số cao nhất',
    descriptionEn: 'Top revenue-generating shipping corridors and services',
  },

  // System
  sys_profile: {
    id: 'sys_profile',
    path: '/settings/profile',
    hash: '#settings/profile',
    titleVi: 'Hồ Sơ Doanh Nghiệp & Logo',
    titleEn: 'Company Profile & Branding',
    group: 'system',
    descriptionVi: 'Thông tin công ty, logo, địa chỉ và tài khoản ngân hàng',
    descriptionEn: 'Company credentials, logo, office address and bank accounts',
  },
  sys_financial: {
    id: 'sys_financial',
    path: '/settings/financial',
    hash: '#settings/financial',
    titleVi: 'Cấu Hình Tài Chính & Thuế (P38)',
    titleEn: 'Financial & Tax Engine (P38)',
    group: 'system',
    descriptionVi: 'Thiết lập tiền tệ, quy tắc làm tròn, VAT và điều khoản thanh toán theo pháp nhân',
    descriptionEn: 'Configure multi-company currencies, rounding rules, VAT policies, and bank accounts',
  },
  sys_financial_config: {
    id: 'sys_financial_config',
    path: '/settings/financial-config',
    hash: '#settings/financial-config',
    titleVi: 'Cấu Hình Thương Mại & Ngân Hàng (P38)',
    titleEn: 'Commercial & Banking Configuration (P38)',
    group: 'system',
    descriptionVi: 'Tài khoản ngân hàng thụ hưởng, điều khoản loại trừ và biên lợi nhuận sàn',
    descriptionEn: 'Beneficiary bank accounts, exclusions, and minimum floor margins',
  },
  sys_sales_bank: {
    id: 'sys_sales_bank',
    path: '/settings/sales-bank',
    hash: '#settings/sales-bank',
    titleVi: 'Thông Tin Sales & Chữ Ký',
    titleEn: 'Sales Rep & Signature',
    group: 'system',
    descriptionVi: 'Cấu hình nhân viên phụ trách mặc định và chữ ký báo giá',
    descriptionEn: 'Configure default sales rep and quotation sign-off',
  },
  sys_audit: {
    id: 'sys_audit',
    path: '/settings/audit',
    hash: '#settings/audit',
    titleVi: 'Nhật Ký Hệ Thống & Audit Log',
    titleEn: 'Audit Trails & System Logs',
    group: 'system',
    descriptionVi: 'Theo dõi lịch sử cập nhật giá và thay đổi dữ liệu',
    descriptionEn: 'Track rate modifications and data changes history',
  },
  sys_backup: {
    id: 'sys_backup',
    path: '/settings/backup',
    hash: '#settings/backup',
    titleVi: 'Sao Lưu & Phục Hồi Dữ Liệu',
    titleEn: 'Data Backup & Restore',
    group: 'system',
    descriptionVi: 'Xuất file JSON sao lưu và khôi phục dữ liệu toàn diện',
    descriptionEn: 'Export JSON backup archives and restore system records',
  },
  sys_integrity: {
    id: 'sys_integrity',
    path: '/system/integrity',
    hash: '#system/integrity',
    titleVi: 'Sức Khỏe & Toàn Vẹn Dữ Liệu',
    titleEn: 'Data Health & Integrity Hub',
    group: 'system',
    descriptionVi: 'Kiểm tra tính nhất quán dữ liệu Firebase Cloud và sửa lỗi tự động',
    descriptionEn: 'Verify Firebase Cloud data consistency and run auto-healing',
  },

  // Portal
  secure_quote_portal: {
    id: 'secure_quote_portal',
    path: '/q',
    hash: '#q',
    titleVi: 'Cổng Tra Cứu Báo Giá Bảo Mật',
    titleEn: 'Customer Secure Quote Portal',
    group: 'portal',
    descriptionVi: 'Trang công khai dành riêng cho khách hàng phản hồi báo giá',
    descriptionEn: 'Public portal for customer viewing and approval',
  },
};

/**
 * Parses current browser URL (both path and hash) to determine intended route and parameters.
 */
export function parseRouteFromUrl(pathname: string, hash: string): { 
  routeId: AppRouteId | null; 
  param?: string; 
  isNotFound?: boolean;
} {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const cleanHash = hash.toLowerCase().replace(/\/$/, '');

  // 1. Check for Customer Secure Quote Link (/q/:token, #/q/:token, /portal/:token, #/portal/:token)
  if (cleanPath.startsWith('/q/')) {
    const token = pathname.replace(/^\/q\//i, '').split(/[?#]/)[0].trim();
    if (token) return { routeId: 'secure_quote_portal', param: token };
  }
  if (cleanHash.startsWith('#/q/') || cleanHash.startsWith('#q/')) {
    const token = hash.replace(/^#(?:|\/)q\//i, '').split(/[?#]/)[0].trim();
    if (token) return { routeId: 'secure_quote_portal', param: token };
  }
  if (cleanPath.startsWith('/portal/')) {
    const token = pathname.replace(/^\/portal\//i, '').split(/[?#]/)[0].trim();
    if (token) return { routeId: 'secure_quote_portal', param: token };
  }
  if (cleanHash.startsWith('#/portal/') || cleanHash.startsWith('#portal/')) {
    const token = hash.replace(/^#(?:|\/)portal\//i, '').split(/[?#]/)[0].trim();
    if (token) return { routeId: 'secure_quote_portal', param: token };
  }

  // 2. Exact match on path or hash
  const routes = Object.values(APP_ROUTES);
  for (const route of routes) {
    if (cleanPath === route.path.toLowerCase()) {
      return { routeId: route.id };
    }
    if (cleanHash === route.hash.toLowerCase() || cleanHash === `#/${route.path.replace(/^\//, '').toLowerCase()}`) {
      return { routeId: route.id };
    }
  }

  // 3. Fallback aliases
  if (cleanHash === '#dashboard' || cleanPath === '/dashboard' || cleanHash === '#analytics' || cleanPath === '/analytics') {
    return { routeId: 'main_dashboard' };
  }
  if (cleanHash === '#customers' || cleanPath === '/customers') {
    return { routeId: 'master_customers' };
  }
  if (cleanHash === '#rates' || cleanPath === '/rates') {
    return { routeId: 'pricing_rates' };
  }
  if (cleanHash === '#contracts' || cleanPath === '/contracts') {
    return { routeId: 'pricing_contracts' };
  }
  if (cleanHash === '#backup' || cleanPath === '/backup') {
    return { routeId: 'sys_backup' };
  }
  if (cleanHash === '#integrity' || cleanPath === '/integrity') {
    return { routeId: 'sys_integrity' };
  }
  if (cleanHash === '#smart-workspace' || cleanPath === '/smart-workspace') {
    return { routeId: 'smart_quotation_workspace' };
  }

  // 4. If root '/' or '/index.html' and empty hash -> Main Quotation Workbench
  if ((cleanPath === '/' || cleanPath === '/index.html' || !cleanPath) && (!cleanHash || cleanHash === '#' || cleanHash === '#/')) {
    return { routeId: null };
  }

  // 5. If no explicit hash is provided, default to main workbench instead of false-positive 404
  if (!cleanHash || cleanHash === '#' || cleanHash === '#/') {
    return { routeId: null };
  }

  // 6. Unknown hash or unknown deep route requested directly
  return { routeId: null, isNotFound: true };
}

/**
 * Checks role permission for a given route.
 */
export function checkRoutePermission(routeId: AppRouteId, role: UserRole): { 
  hasAccess: boolean; 
  requiredDesc: string;
} {
  const route = APP_ROUTES[routeId];
  if (!route) return { hasAccess: true, requiredDesc: '' };

  if (route.requiredPermission === 'admin_manager') {
    const ok = role === 'ADMIN' || role === 'SALES_MANAGER';
    return {
      hasAccess: ok,
      requiredDesc: 'Cần vai trò Quản Trị Viên (Admin) hoặc Trưởng Phòng Kinh Doanh (Sales Manager)',
    };
  }

  if (route.requiredPermission === 'profitability.view') {
    const perms = ROLE_PERMISSIONS[role] || [];
    const ok = perms.includes('profitability.view');
    return {
      hasAccess: ok,
      requiredDesc: 'Cần quyền xem phân tích biên lợi nhuận (Admin, Sales Manager, Pricing Specialist)',
    };
  }

  if (route.allowedRoles && route.allowedRoles.length > 0) {
    const ok = route.allowedRoles.includes(role);
    return {
      hasAccess: ok,
      requiredDesc: `Yêu cầu vai trò: ${route.allowedRoles.join(', ')}`,
    };
  }

  return { hasAccess: true, requiredDesc: '' };
}
