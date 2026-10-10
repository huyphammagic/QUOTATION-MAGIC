import { Currency, LineItem } from './logistics';

export interface FtaTariffRate {
  agreementCode: string;       // e.g. 'EVFTA', 'CPTPP', 'ACFTA', 'VKFTA', 'ATIGA', 'RCEP', 'VJEPA', 'AJCEP'
  agreementName: string;       // e.g. 'Hiệp định Việt Nam - EU (EVFTA)'
  rate: number;                // e.g. 0, 5, 8 (%)
  coForm: string;              // e.g. 'Form EUR.1 / REX', 'Form E', 'Form D', 'Form CPTPP'
  qualifyingRule?: string;     // e.g. 'RVC 40%', 'CTSH', 'WO'
  conditionNotes?: string;     // e.g. 'Cần vận chuyển trực tiếp, C/O hợp lệ'
}

export interface SpecializedInspectionInfo {
  isRequired: boolean;
  agency?: string;             // e.g. 'Bộ Công Thương (MOIT)', 'Bộ KH&CN', 'Bộ NN&PTNT'
  inspectionType?: string;     // e.g. 'Kiểm tra chất lượng nhà nước', 'Kiểm dịch thực vật', 'Kiểm tra Hiệu suất Năng lượng'
  procedureName?: string;      // e.g. 'Đăng ký kiểm tra chất lượng trên Cổng thông tin một cửa quốc gia NSW'
  estimatedCostVnd?: number;   // e.g. 2,500,000 VND
  estimatedDays?: number;      // e.g. 3-5 ngày làm việc
  warningNotes?: string[];
}

export interface HsCodeTariffItem {
  id: string;
  hsCode: string;              // e.g. '8507.60.90', '6109.10.00'
  chapter: string;             // 2 số đầu - Chương
  heading: string;             // 4 số đầu - Nhóm
  descriptionVi: string;       // Mô tả tiếng Việt
  descriptionEn: string;       // English description
  unit: string;                // e.g. 'Chiếc', 'Cái', 'KG', 'Bộ', 'Mét vuông'
  confidenceScore: number;     // 0 - 100 (%)
  classificationReason: string;// Căn cứ phân loại theo 6 quy tắc tổng quát GIR
  
  // Base Tariffs (%)
  exportTariff: number;        // Thuế xuất khẩu (%)
  importNormalTariff: number;  // Thuế NK thông thường (%)
  importPreferentialTariff: number; // Thuế NK ưu đãi MFN (%)
  vatTariff: number;           // Thuế GTGT VAT (%) - 0, 5, 8, 10
  specialConsumptionTariff?: number; // Thuế Tiêu thụ đặc biệt (%)
  environmentalTaxVnd?: number;// Thuế Bảo vệ môi trường (VND/đơn vị)

  // FTA Special Preferential Rates
  ftaTariffs: FtaTariffRate[];

  // Specialized Inspection (Kiểm tra chuyên ngành)
  specializedInspection: SpecializedInspectionInfo;

  // Practical Logistics & Customs Warnings
  warnings: string[];
  recommendations: string[];
}

export interface CustomsTaxCalculationRequest {
  cifValueUsd: number;
  exchangeRate: number;
  quantity: number;
  appliedAgreementCode: string; // 'MFN' | 'EVFTA' | 'CPTPP' | 'ACFTA' | 'VKFTA' | 'ATIGA' | 'RCEP'
  hsItem: HsCodeTariffItem;
}

export interface CustomsTaxCalculationResult {
  cifValueVnd: number;
  cifValueUsd: number;
  appliedDutyRate: number;
  appliedDutyName: string;
  coFormRequired?: string;
  
  // Tax breakdowns
  importDutyVnd: number;
  importDutyUsd: number;
  specialConsumptionTaxVnd: number;
  specialConsumptionTaxUsd: number;
  environmentalTaxVnd: number;
  environmentalTaxUsd: number;
  vatTaxVnd: number;
  vatTaxUsd: number;

  // Totals
  totalCustomsTaxVnd: number;
  totalCustomsTaxUsd: number;
  effectiveTaxRatePercent: number; // (Tổng thuế / Trị giá CIF) * 100

  // Suggested quotation line items
  suggestedLineItems: LineItem[];
}
