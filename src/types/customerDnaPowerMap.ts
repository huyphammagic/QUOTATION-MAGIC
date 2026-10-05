/**
 * Phase 63: Customer Logistics DNA & Buying Center Power Map Types
 * Trung Tâm Giải Mã Khách Hàng 360° - Hồ Sơ Gen Logistics & Sơ Đồ Quyền Lực Bộ Sậu Nhà Máy
 */

// 1. Phân loại Khẩu vị / Tâm lý mua hàng của Chủ Hàng (Shipper/Consignee Persona)
export type ShipperPersonaType = 
  | 'PRICE_HUNTER'          // Thợ săn giá rẻ: Nhạy cảm cước cựu độ, chỉ quan tâm giá thấp nhất
  | 'RELIABILITY_FIRST'      // Ưu tiên lịch trình: Sợ rớt cont, cần cam kết slot mùa cao điểm
  | 'CASH_FLOW_SENSITIVE'   // Khát công nợ: Cần payment terms 30-60 ngày, bảo lãnh thanh toán
  | 'SERVICE_PERFECTIONIST'  // Đòi hỏi dịch vụ tinh tế: Cần chăm sóc 24/7, ghét phụ phí phát sinh
  | 'HYBRID_TACTICAL';       // Thực dụng linh hoạt: Mùa thấp điểm ép giá, mùa cao điểm mua slot

export interface ShipperSensitivityScores {
  priceSensitivity: number;          // 1 - 10 (1: Không màng giá, 10: Ép từng đồng)
  transitTimeSensitivity: number;    // 1 - 10 (Đòi hỏi tàu nhanh, ít chuyển tải)
  freeTimeDemDetSensitivity: number; // 1 - 10 (Rất cần nhiều ngày DEM/DET bãi)
  creditTermSensitivity: number;     // 1 - 10 (Cần công nợ gối đầu dài hạn)
  customsReliabilitySensitivity: number; // 1 - 10 (Sợ kiểm hóa / chậm thông quan)
}

// 2. Vết sẹo tâm lý / Điểm đau trong quá khứ (Past Logistics Scars & Pain Points)
export type LogisticsScarType = 
  | 'ROLLED_CARGO'           // Từng bị bỏ rơi / rớt cont mùa cao điểm
  | 'DEM_DET_PENALTY'        // Từng bị phạt phí lưu bãi / cont hàng nghìn USD
  | 'CUSTOMS_INSPECTION_DELAY' // Bị giữ hàng kiểm hóa, trễ hợp đồng gia công
  | 'SURCHARGE_EXPLOSION'    // Bị forwarder cũ tính thêm phụ phí bất ngờ (GRI/PSS/Local)
  | 'DAMAGED_CARGO_DISPUTE'  // Hàng ẩm mốc / vỡ hỏng tranh chấp bảo hiểm không đền
  | 'POOR_SALES_COMMUNICATION'; // Sales trước mất hút khi có sự cố

export interface LogisticsScar {
  id: string;
  type: LogisticsScarType;
  title: string;
  incidentYear: number;
  perpetrator: string;        // Hãng tàu hoặc Forwarder gây ra vết sẹo này
  financialLossVnd?: string;  // Thiệt hại ước tính
  psychologicalImpact: string;// Khách sợ điều gì nhất từ vết sẹo này
  healingPrescription: string;// "Đơn thuốc" xoa dịu độc quyền của công ty mình
}

// 3. Khẩu vị hàng hóa & Tuyến vận tải cốt lõi (Shipment DNA Profile)
export interface ShipmentDnaProfile {
  primaryCommodity: string;         // e.g., Thủy hải sản đông lạnh, Dệt may, Gỗ xuất khẩu
  packagingType: string;            // e.g., 40'RF (-20°C), 40'HC treo Garment, Pallet kiện gỗ
  monthlyVolumeTeu: number;         // e.g., 45 TEU/tháng
  annualLogisticsBudgetUsd: number; // e.g., 250,000 USD/năm
  peakSeasonMonths: number[];       // e.g., [8, 9, 10, 11] (Mùa cao điểm Giáng sinh/Tết)
  coreTradeLanes: {
    origin: string;
    destination: string;
    incotermDefault: string;
    preferredCarriers: string[];
    currentRateBenchmarkUsd: number;
  }[];
  criticalRequirements: string[];   // e.g., "Cần cắm điện cont lạnh liên tục", "Cần hun trùng AFAS"
}

// 4. Sơ đồ quyền lực Bộ Sậu Nhà Máy (Buying Center & Org Power Map)
export type DealOrgRole = 
  | 'DECISION_MAKER'    // Người quyết định tối cao (Ký hợp đồng & duyệt tiền)
  | 'CHAMPION'          // Đồng minh nội bộ (Ủng hộ mình, ngầm báo giá đối thủ)
  | 'BLOCKER'           // Kẻ ngáng đường (Thân thiết với forwarder hiện tại)
  | 'INFLUENCER'        // Người có tiếng nói chuyên môn (Trưởng kho, chuyên viên XNK)
  | 'GATEKEEPER';       // Người gác cổng (Lọc email, xếp lịch hẹn)

export type DiscPersonality = 
  | 'DOMINANT'          // D - Quyết đoán, thực dụng, chỉ nhìn kết quả & số liệu
  | 'INFLUENTIAL'       // I - Cởi mở, thích giao lưu, coi trọng mối quan hệ & sự nhiệt tình
  | 'STEADY'            // S - Kiên định, ngại rủi ro, trung thành, khó đổi nhà cung cấp mới
  | 'CONSCIENTIOUS';    // C - Cẩn trọng, soi xét chi tiết từng điều khoản hợp đồng & hóa đơn

export interface OrgPowerContact {
  id: string;
  name: string;
  title: string;                 // Chức danh: Trưởng phòng Thu Mua, Giám đốc Logistics, Kế toán trưởng...
  department: 'PURCHASING' | 'LOGISTICS' | 'FINANCE_ACCOUNTING' | 'BOARD_OF_DIRECTORS' | 'FACTORY_OPS';
  roleInDeal: DealOrgRole;
  influenceLevel: number;        // 1 - 10 (Mức độ chi phối quyết định)
  personalityStyle: DiscPersonality;
  stanceTowardUs: 'STRONGLY_IN_FAVOR' | 'LEANING_POSITIVE' | 'NEUTRAL' | 'SKEPTICAL' | 'HOSTILE';
  personalPainPoint: string;     // Điều người này sợ nhất nếu chọn sai forwarder
  hiddenAgenda: string;          // Lợi ích cá nhân mong muốn (Khen thưởng, an toàn ca làm việc, giảm thủ tục)
  preferredChannel: 'ZALO' | 'CALL' | 'EMAIL' | 'FACE_TO_FACE' | 'COFFEE_DINNER';
  notes: string;
  phone?: string;
  email?: string;
}

// 5. Chiến lược tiếp cận đa điểm (Multi-Threading Attack Strategy)
export interface MultiThreadingPlan {
  contactId: string;
  contactName: string;
  contactTitle: string;
  roleInDeal: DealOrgRole;
  actionGoal: string;            // Mục tiêu cuộc gặp/tin nhắn
  tailoredHook: string;          // Điểm chạm tâm lý đánh trúng nỗi đau
  suggestedScriptVi: string;     // Lời thoại thực chiến gợi ý cho Sales
  suggestedOfferValue: string;   // Quân bài giá trị đề xuất tặng vị trí này
}

// 6. Hồ sơ hoàn chỉnh Customer Logistics DNA & Power Map Document
export interface CustomerDnaPowerMapProfile {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  industry: string;
  personaType: ShipperPersonaType;
  compatibilityScore: number;     // 0 - 100% (Mức độ phù hợp với năng lực công ty mình)
  sensitivityScores: ShipperSensitivityScores;
  scars: LogisticsScar[];
  shipmentDna: ShipmentDnaProfile;
  powerMapContacts: OrgPowerContact[];
  salesPlaybook: {
    openingHook: string;
    tabooWords: string[];        // Những từ cấm kỵ khi nói chuyện với khách này
    powerValueProps: string[];   // Các điểm mạnh độc quyền cần nhấn mạnh
    closingTactic: string;       // Chiêu bài chốt deal phù hợp nhất
  };
  multiThreadingPlans: MultiThreadingPlan[];
  createdAt: string;
  updatedAt: string;
}
