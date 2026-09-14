/**
 * Phase 27: System Health, Data Integrity & Sync Recovery Engine i18n
 * Bilingual support: Vietnamese (vi) and English (en)
 */

export type IntegrityLanguage = 'vi' | 'en';

export interface IntegrityTranslations {
  // Modal & Tabs
  integrityDashboardTitle: string;
  integrityDashboardSubtitle: string;
  tabSystemHealth: string;
  tabIssueCenter: string;
  tabTargetedScan: string;
  tabStorageAudit: string;
  tabAuditLogs: string;

  // Technical System Statuses
  statusHealthy: string;
  statusDegraded: string;
  statusSyncPending: string;
  statusSyncFailed: string;
  statusStoragePending: string;
  statusStorageFailed: string;
  statusConflict: string;
  statusDataIntegrityWarning: string;
  statusDataIntegrityError: string;
  statusAuthError: string;
  statusPermissionError: string;
  statusNetworkError: string;

  // Save States
  saveUnsaved: string;
  saveSaving: string;
  saveSaved: string;
  saveSaveFailed: string;
  saveConflict: string;
  saveRetrying: string;

  // Issue Center
  issueStatusOpen: string;
  issueStatusInvestigating: string;
  issueStatusResolved: string;
  issueStatusIgnored: string;
  severityCritical: string;
  severityError: string;
  severityWarning: string;
  severityInfo: string;

  // Actions
  actionInvestigate: string;
  actionResolve: string;
  actionIgnore: string;
  actionSafeRetry: string;
  actionRunScan: string;
  actionForceSync: string;
  actionClose: string;
  actionExportReport: string;

  // Modules & Labels
  moduleQuotation: string;
  moduleCustomer: string;
  moduleMasterData: string;
  moduleRate: string;
  moduleContract: string;
  moduleStorage: string;
  modulePricing: string;
  moduleAuth: string;
  moduleSystem: string;

  // Summaries
  metricsIntegrityScore: string;
  metricsOpenIssues: string;
  metricsStorageStatus: string;
  metricsActiveStreams: string;
  cloudConfirmationNotice: string;
  crossDeviceNotice: string;
  safeRecoveryNotice: string;
  noIssuesFound: string;
  scanInProgress: string;
}

export const INTEGRITY_I18N: Record<IntegrityLanguage, IntegrityTranslations> = {
  vi: {
    integrityDashboardTitle: 'Trung Tâm Sức Khỏe Hệ Thống & Toàn Vẹn Dữ Liệu',
    integrityDashboardSubtitle: 'Giám sát Firestore Cloud, phát hiện xung đột đa thiết bị, kiểm toán tệp và phục hồi an toàn',
    tabSystemHealth: 'Sức Khỏe Hệ Thống',
    tabIssueCenter: 'Trung Tâm Sự Cố',
    tabTargetedScan: 'Quét Toàn Vẹn Theo Phạm Vi',
    tabStorageAudit: 'Kiểm Toán Storage & Tệp',
    tabAuditLogs: 'Nhật Ký Đồng Bộ & Xung Đột',

    statusHealthy: 'Khỏe mạnh (Real-time)',
    statusDegraded: 'Hiệu năng giảm',
    statusSyncPending: 'Đang đồng bộ...',
    statusSyncFailed: 'Đồng bộ thất bại',
    statusStoragePending: 'Đang tải tệp...',
    statusStorageFailed: 'Lỗi bộ lưu trữ Storage',
    statusConflict: 'Xung đột đa thiết bị',
    statusDataIntegrityWarning: 'Cảnh báo tính toàn vẹn',
    statusDataIntegrityError: 'Lỗi tính toàn vẹn',
    statusAuthError: 'Lỗi xác thực người dùng',
    statusPermissionError: 'Lỗi phân quyền truy cập',
    statusNetworkError: 'Mất kết nối mạng (Offline)',

    saveUnsaved: 'Chưa lưu',
    saveSaving: 'Đang lưu lên Firebase...',
    saveSaved: 'Đã lưu trên Cloud',
    saveSaveFailed: 'Lưu thất bại',
    saveConflict: 'Xung đột dữ liệu',
    saveRetrying: 'Đang tự động thử lại...',

    issueStatusOpen: 'Đang mở',
    issueStatusInvestigating: 'Đang kiểm tra',
    issueStatusResolved: 'Đã xử lý',
    issueStatusIgnored: 'Đã bỏ qua',
    severityCritical: 'Nghiêm trọng',
    severityError: 'Lỗi',
    severityWarning: 'Cảnh báo',
    severityInfo: 'Thông tin',

    actionInvestigate: 'Kiểm tra',
    actionResolve: 'Đánh dấu Đã Xử Lý',
    actionIgnore: 'Bỏ qua cảnh báo',
    actionSafeRetry: 'Thử lại an toàn',
    actionRunScan: 'Quét toàn vẹn ngay',
    actionForceSync: 'Làm mới từ Firestore Cloud',
    actionClose: 'Đóng',
    actionExportReport: 'Xuất báo cáo',

    moduleQuotation: 'Báo Giá',
    moduleCustomer: 'Khách Hàng',
    moduleMasterData: 'Danh Mục Master',
    moduleRate: 'Biểu Cước Master',
    moduleContract: 'Hợp Đồng Logistics',
    moduleStorage: 'Lưu Trữ Tệp (Storage)',
    modulePricing: 'Chính Sách Giá',
    moduleAuth: 'Tài Khoản & Quyền',
    moduleSystem: 'Hệ Thống',

    metricsIntegrityScore: 'Điểm Toàn Vẹn Dữ Liệu',
    metricsOpenIssues: 'Sự Cố Cần Xử Lý',
    metricsStorageStatus: 'Trạng Thái Tệp Đính Kèm',
    metricsActiveStreams: 'Luồng Lắng Nghe Realtime',
    cloudConfirmationNotice: 'Chỉ hiển thị "Đã lưu" khi Firebase Firestore xác nhận thành công.',
    crossDeviceNotice: 'Mọi thay đổi từ thiết bị khác được đồng bộ tức thì và ngăn chặn ghi đè ngầm.',
    safeRecoveryNotice: 'Tính năng phục hồi tự động chỉ tái liên kết dữ liệu an toàn, không bao giờ tự ý xóa hoặc thay đổi giá cước lịch sử.',
    noIssuesFound: 'Tuyệt vời! Không phát hiện bất kỳ sự cố dữ liệu hoặc xung đột nào.',
    scanInProgress: 'Đang tiến hành kiểm tra tính toàn vẹn dữ liệu theo phạm vi...',
  },
  en: {
    integrityDashboardTitle: 'System Health & Data Integrity Hub',
    integrityDashboardSubtitle: 'Monitor Firestore Cloud, detect cross-device conflicts, audit files, and safe recovery',
    tabSystemHealth: 'System Health',
    tabIssueCenter: 'Issue Center',
    tabTargetedScan: 'Targeted Integrity Scan',
    tabStorageAudit: 'Storage & Document Audit',
    tabAuditLogs: 'Sync & Conflict Logs',

    statusHealthy: 'Healthy (Real-time)',
    statusDegraded: 'Degraded',
    statusSyncPending: 'Sync Pending...',
    statusSyncFailed: 'Sync Failed',
    statusStoragePending: 'Storage Uploading...',
    statusStorageFailed: 'Storage Error',
    statusConflict: 'Version Conflict',
    statusDataIntegrityWarning: 'Data Integrity Warning',
    statusDataIntegrityError: 'Data Integrity Error',
    statusAuthError: 'Authentication Error',
    statusPermissionError: 'Permission Error',
    statusNetworkError: 'Network Disconnected (Offline)',

    saveUnsaved: 'Unsaved',
    saveSaving: 'Saving to Firebase...',
    saveSaved: 'Saved to Cloud',
    saveSaveFailed: 'Save Failed',
    saveConflict: 'Version Conflict',
    saveRetrying: 'Retrying connection...',

    issueStatusOpen: 'Open',
    issueStatusInvestigating: 'Investigating',
    issueStatusResolved: 'Resolved',
    issueStatusIgnored: 'Ignored',
    severityCritical: 'Critical',
    severityError: 'Error',
    severityWarning: 'Warning',
    severityInfo: 'Info',

    actionInvestigate: 'Investigate',
    actionResolve: 'Mark Resolved',
    actionIgnore: 'Ignore Warning',
    actionSafeRetry: 'Safe Retry',
    actionRunScan: 'Run Targeted Scan',
    actionForceSync: 'Refresh from Firestore Cloud',
    actionClose: 'Close',
    actionExportReport: 'Export Report',

    moduleQuotation: 'Quotation',
    moduleCustomer: 'Customer',
    moduleMasterData: 'Master Data',
    moduleRate: 'Rate Master',
    moduleContract: 'Contract Hub',
    moduleStorage: 'File Storage',
    modulePricing: 'Pricing Policies',
    moduleAuth: 'Auth & Roles',
    moduleSystem: 'System',

    metricsIntegrityScore: 'Data Integrity Score',
    metricsOpenIssues: 'Active Issues',
    metricsStorageStatus: 'Storage Documents',
    metricsActiveStreams: 'Active Realtime Streams',
    cloudConfirmationNotice: 'Only displays "Saved" upon successful confirmation from Firebase Firestore.',
    crossDeviceNotice: 'Cross-device changes are synchronized in real-time with silent overwrite protection.',
    safeRecoveryNotice: 'Safe recovery only re-links safe transient references, never deleting or altering historical locked rates.',
    noIssuesFound: 'Excellent! No data integrity issues or conflicts detected.',
    scanInProgress: 'Running targeted data integrity scan...',
  },
};
