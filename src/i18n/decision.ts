/**
 * Phase 47: Logistics Business Decision & Scenario Workspace i18n Dictionary
 */

export type DecisionLanguage = 'vi' | 'en';

export interface DecisionTranslations {
  workspaceTitle: string;
  workspaceSubtitle: string;
  tabOverview: string;
  tabScenario: string;
  tabRisks: string;
  tabActions: string;
  tabSavedScenarios: string;
  
  // Completeness & Status
  readinessTitle: string;
  completenessScore: string;
  statusReady: string;
  statusPartiallyReady: string;
  statusNotReady: string;
  missingDataNotice: string;
  
  // Scenario terms
  scenariosTitle: string;
  baselineScenario: string;
  createScenario: string;
  compareScenarios: string;
  saveScenario: string;
  saveSnapshot: string;
  createDraftQuote: string;
  
  // Commercial terms
  buyCost: string;
  sellingPrice: string;
  surcharges: string;
  grossProfit: string;
  marginPercent: string;
  discount: string;
  currency: string;
  validity: string;
  transitTime: string;
  freeTime: string;
  
  // Concurrency & Warnings
  sourceVersionChanged: string;
  sourceVersionWarning: string;
  refreshSource: string;
  continueOldVersion: string;
  
  // Risk terms
  riskEvaluation: string;
  noRisksDetected: string;
  riskCritical: string;
  riskHigh: string;
  riskWarning: string;
  riskInfo: string;
  
  // Actions
  actionRequired: string;
  executeAction: string;
  openCustomer360: string;
  openRateHub: string;
  openFollowUp: string;
  
  // Empty states
  noCandidateRates: string;
  noHistoricalQuotes: string;
  noSavedScenarios: string;
}

export const decisionTranslations: Record<DecisionLanguage, DecisionTranslations> = {
  vi: {
    workspaceTitle: 'Khu Vực Ra Quyết Định Kinh Doanh & Kịch Bản Cước',
    workspaceSubtitle: 'Phân tích đa chiều dữ liệu khách hàng, chặng tuyến và mô phỏng kịch bản What-If',
    tabOverview: 'Tổng Quan & Dữ Liệu',
    tabScenario: 'Mô Phỏng Kịch Bản (What-If)',
    tabRisks: 'Rà Soát Rủi Ro & Điều Kiện',
    tabActions: 'Đề Xuất Hành Động',
    tabSavedScenarios: 'Kịch Bản Đã Lưu',
    
    readinessTitle: 'Độ Sẵn Sàng Ra Quyết Định',
    completenessScore: 'Điểm hoàn thiện',
    statusReady: 'ĐỦ ĐIỀU KIỆN BAN HÀNH',
    statusPartiallyReady: 'CẦN BỔ SUNG THÔNG TIN',
    statusNotReady: 'CHƯA ĐỦ ĐIỀU KIỆN',
    missingDataNotice: 'Dữ liệu trọng yếu cần bổ sung trước khi báo giá',
    
    scenariosTitle: 'Các Kịch Bản Phương Án Cước',
    baselineScenario: 'Kịch bản cơ sở',
    createScenario: 'Thêm Kịch Bản Mới',
    compareScenarios: 'So Sánh Kịch Bản',
    saveScenario: 'Lưu Kịch Bản',
    saveSnapshot: 'Lưu Bản Chụp Quyết Định (Snapshot)',
    createDraftQuote: 'Tạo Bản Nháp Báo Giá',
    
    buyCost: 'Giá vốn (Buy Cost)',
    sellingPrice: 'Giá bán (Selling Price)',
    surcharges: 'Phụ phí & Local Charges',
    grossProfit: 'Lợi nhuận gộp',
    marginPercent: 'Biên lợi nhuận',
    discount: 'Chiết khấu',
    currency: 'Đơn vị tiền tệ',
    validity: 'Thời hạn hiệu lực',
    transitTime: 'Thời gian vận chuyển',
    freeTime: 'Thời gian miễn phí cont (Free time)',
    
    sourceVersionChanged: 'Phát hiện nguồn dữ liệu đã cập nhật phiên bản mới',
    sourceVersionWarning: 'Báo giá hoặc cước gốc đã có thay đổi kể từ khi kịch bản được tạo. Bạn có muốn làm mới dữ liệu nguồn?',
    refreshSource: 'Làm mới nguồn dữ liệu',
    continueOldVersion: 'Tiếp tục với phiên bản cũ',
    
    riskEvaluation: 'Đánh Giá Rủi Ro Thương Mại & Pháp Lý',
    noRisksDetected: 'Không phát hiện rủi ro nào. Dữ liệu thương mại an toàn.',
    riskCritical: 'Nghiêm trọng',
    riskHigh: 'Cao',
    riskWarning: 'Cảnh báo',
    riskInfo: 'Thông tin',
    
    actionRequired: 'Hành động đề xuất cho nhân viên',
    executeAction: 'Thực hiện',
    openCustomer360: 'Mở Customer 360',
    openRateHub: 'Tra cứu Master Rate',
    openFollowUp: 'Lên lịch theo dõi',
    
    noCandidateRates: 'Không tìm thấy bảng cước phù hợp trực tiếp cho chặng này trong Master Rate.',
    noHistoricalQuotes: 'Chưa có lịch sử báo giá nào cho tuyến này.',
    noSavedScenarios: 'Chưa có kịch bản nào được lưu trên hệ thống.'
  },
  en: {
    workspaceTitle: 'Business Decision & Scenario Workspace',
    workspaceSubtitle: 'Multi-dimensional analysis of customer, lane data and What-If scenario simulations',
    tabOverview: 'Overview & Context',
    tabScenario: 'What-If Scenarios',
    tabRisks: 'Risk & Rule Review',
    tabActions: 'Recommended Actions',
    tabSavedScenarios: 'Saved Scenarios',
    
    readinessTitle: 'Decision Readiness',
    completenessScore: 'Completeness Score',
    statusReady: 'READY FOR ISSUANCE',
    statusPartiallyReady: 'INFORMATION REQUIRED',
    statusNotReady: 'NOT READY',
    missingDataNotice: 'Critical fields required before quoting',
    
    scenariosTitle: 'Freight Rate Scenarios',
    baselineScenario: 'Baseline Scenario',
    createScenario: 'Add New Scenario',
    compareScenarios: 'Compare Scenarios',
    saveScenario: 'Save Scenario',
    saveSnapshot: 'Save Decision Snapshot',
    createDraftQuote: 'Create Draft Quotation',
    
    buyCost: 'Buy Cost',
    sellingPrice: 'Selling Price',
    surcharges: 'Surcharges & Local Charges',
    grossProfit: 'Gross Profit',
    marginPercent: 'Profit Margin',
    discount: 'Discount',
    currency: 'Currency',
    validity: 'Rate Validity',
    transitTime: 'Transit Time',
    freeTime: 'Container Free Time',
    
    sourceVersionChanged: 'Source Entity Version Changed',
    sourceVersionWarning: 'The source quotation or rate has been updated since this scenario was created. Would you like to refresh?',
    refreshSource: 'Refresh Source',
    continueOldVersion: 'Continue with Old Version',
    
    riskEvaluation: 'Commercial & Legal Risk Review',
    noRisksDetected: 'No risks detected. Commercial terms are aligned.',
    riskCritical: 'Critical',
    riskHigh: 'High',
    riskWarning: 'Warning',
    riskInfo: 'Info',
    
    actionRequired: 'Recommended Next Actions',
    executeAction: 'Execute',
    openCustomer360: 'Open Customer 360',
    openRateHub: 'Search Master Rates',
    openFollowUp: 'Schedule Follow-up',
    
    noCandidateRates: 'No directly matching rates found in Master Rate Hub for this lane.',
    noHistoricalQuotes: 'No historical quotations found for this lane.',
    noSavedScenarios: 'No saved scenarios found on cloud.'
  }
};
