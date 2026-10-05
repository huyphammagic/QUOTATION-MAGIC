/**
 * Phase 63: Customer Logistics DNA & Buying Center Power Map Service
 * Xử lý dữ liệu Hồ Sơ Gen Logistics, Phân tích Tính Cách Mua Hàng & Sơ Đồ Quyền Lực Bộ Sậu Nhà Máy
 */

import {
  CustomerDnaPowerMapProfile,
  ShipperPersonaType,
  OrgPowerContact,
  MultiThreadingPlan,
  ShipperSensitivityScores,
  LogisticsScar
} from '../../types/customerDnaPowerMap';

const STORAGE_KEY = 'bogi_customer_dna_profiles_v1';

// Dữ liệu mẫu thực chiến cho các tập đoàn / nhà máy xuất khẩu tiêu biểu tại Việt Nam
export const PRESEEDED_CUSTOMER_DNA_PROFILES: CustomerDnaPowerMapProfile[] = [
  {
    id: 'dna-seafood-biendong',
    companyId: 'company-default-01',
    customerId: 'cust-seafood-01',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Đông',
    industry: 'Chế biến & Xuất khẩu Thủy hải sản đông lạnh (Tôm, Cá tra)',
    personaType: 'RELIABILITY_FIRST',
    compatibilityScore: 94,
    sensitivityScores: {
      priceSensitivity: 5,
      transitTimeSensitivity: 9,
      freeTimeDemDetSensitivity: 8,
      creditTermSensitivity: 6,
      customsReliabilitySensitivity: 10
    },
    scars: [
      {
        id: 'scar-01',
        type: 'ROLLED_CARGO',
        title: 'Bị rớt 6 cont tôm đông lạnh tại Cát Lái mùa Giáng sinh 2024',
        incidentYear: 2024,
        perpetrator: 'Hãng tàu OOCL qua Forwarder giá rẻ A',
        financialLossVnd: '1.2 Tỷ VNĐ (Bị phạt hợp đồng giao trễ & hỏng 1 cont)',
        psychologicalImpact: 'Cực kỳ ám ảnh việc rớt tàu. Thà trả thêm $50-$100/cont chứ không bao giờ tin các bên hứa miệng không có cam kết slot bằng văn bản.',
        healingPrescription: 'Cam kết bằng văn bản "Priority Slot Guaranteed", nếu rớt cont công ty mình bồi thường 150% cước ocean và đài thọ toàn bộ phí cắm điện phát sinh.'
      },
      {
        id: 'scar-02',
        type: 'CUSTOMS_INSPECTION_DELAY',
        title: 'Chậm trễ C/O Form E xuất sang Trung Quốc bị bác quyền ưu đãi thuế',
        incidentYear: 2025,
        perpetrator: 'Đại lý Hải quan cũ thiếu kinh nghiệm kiểm dịch',
        financialLossVnd: '450 Triệu VNĐ',
        psychologicalImpact: 'Sợ hãi các forwarder không có đội ngũ OPS hiện trường mạnh tại cảng Cát Lái / Cái Mép.',
        healingPrescription: 'Bộ phận Customs House Brokerage của công ty trực 24/7, phát hành C/O và thông quan luồng vàng/đỏ trong vòng tối đa 4 giờ làm việc.'
      }
    ],
    shipmentDna: {
      primaryCommodity: 'Cá tra phi-lê đông lạnh (-20°C) & Tôm thẻ chân trắng',
      packagingType: '40\'RF (Reefer Container bảo quản nhiệt độ âm sâu)',
      monthlyVolumeTeu: 35,
      annualLogisticsBudgetUsd: 280000,
      peakSeasonMonths: [8, 9, 10, 11, 12],
      coreTradeLanes: [
        {
          origin: 'Cát Lái (VNSGN)',
          destination: 'Rotterdam (NLRTM)',
          incotermDefault: 'CIF',
          preferredCarriers: ['Maersk', 'CMA CGM', 'Hapag-Lloyd'],
          currentRateBenchmarkUsd: 3850
        },
        {
          origin: 'Cái Mép (VNTCB)',
          destination: 'Los Angeles (USLAX)',
          incotermDefault: 'CNF',
          preferredCarriers: ['ONE', 'MSC'],
          currentRateBenchmarkUsd: 4100
        }
      ],
      criticalRequirements: [
        'Cắm điện Reefer liên tục tại bãi CY không quá 1 giờ gián đoạn',
        'Bộ cài nhiệt độ PTI và Data Logger theo dõi nhiệt độ hành trình',
        'Free-time DEM/DET tối thiểu 14 ngày tại cảng đích Châu Âu'
      ]
    },
    powerMapContacts: [
      {
        id: 'contact-lan',
        name: 'Bà Nguyễn Thị Hoàng Lan',
        title: 'Giám Đốc Xuất Nhập Khẩu & Logistics',
        department: 'BOARD_OF_DIRECTORS',
        roleInDeal: 'DECISION_MAKER',
        influenceLevel: 10,
        personalityStyle: 'DOMINANT',
        stanceTowardUs: 'LEANING_POSITIVE',
        personalPainPoint: 'Chịu trách nhiệm trực tiếp trước Hội đồng Quản trị về cam kết tiến độ giao hàng cho các chuỗi siêu thị Châu Âu. Rớt 1 cont là bị hạ lương thưởng cả năm.',
        hiddenAgenda: 'Cần tìm 1 đối tác Logistics uy tín làm chỗ dựa vững chắc, có quy trình báo cáo tracking chuyên nghiệp để báo cáo HĐQT.',
        preferredChannel: 'FACE_TO_FACE',
        notes: 'Thích phong cách làm việc dứt khoát, chứng minh bằng số liệu và cam kết hợp đồng rõ ràng. Rất dị ứng với sales hứa suông.',
        phone: '0903 881 2xx',
        email: 'lan.nguyen@biendongseafood.com.vn'
      },
      {
        id: 'contact-duc',
        name: 'Ông Trần Hữu Đức',
        title: 'Trưởng Kho Lạnh & Điều Vận Container',
        department: 'FACTORY_OPS',
        roleInDeal: 'CHAMPION',
        influenceLevel: 8,
        personalityStyle: 'INFLUENTIAL',
        stanceTowardUs: 'STRONGLY_IN_FAVOR',
        personalPainPoint: 'Cont hạ bãi trễ giờ cắt máng (Closing time), vỏ cont bẩn hoặc máy lạnh hỏng khiến công nhân kho phải bốc dỡ lại lúc nửa đêm.',
        hiddenAgenda: 'Muốn forwarder cung cấp xe kéo đúng giờ ca làm việc và tài xế nhiệt tình hỗ trợ kẹp chì, tránh phiền hà cho đội kho.',
        preferredChannel: 'ZALO',
        notes: 'Là đồng minh ruột! Đã làm việc với nhiều bên và đánh giá cao sự hỗ trợ trực tiếp tại bãi của công ty mình.',
        phone: '0918 334 1xx',
        email: 'duc.tran@biendongseafood.com.vn'
      },
      {
        id: 'contact-thu',
        name: 'Bà Phạm Minh Thư',
        title: 'Kế Toán Trưởng & Trưởng Ban Kiểm Soát',
        department: 'FINANCE_ACCOUNTING',
        roleInDeal: 'BLOCKER',
        influenceLevel: 7,
        personalityStyle: 'CONSCIENTIOUS',
        stanceTowardUs: 'SKEPTICAL',
        personalPainPoint: 'Hóa đơn phát sinh các loại phụ phí local charges vô lý, tỷ giá USD quy đổi mập mờ, công nợ dưới 30 ngày.',
        hiddenAgenda: 'Bảo vệ dòng tiền mặt của nhà máy; đang có quan hệ quen biết với Kế toán bên Forwarder A cũ.',
        preferredChannel: 'EMAIL',
        notes: 'Cần gửi bảng kê chi phí trọn gói (All-in) không phụ phí ẩn kèm đề xuất chính sách công nợ 30 ngày từ ngày tàu chạy.',
        phone: '0982 119 5xx',
        email: 'thu.pham@biendongseafood.com.vn'
      }
    ],
    salesPlaybook: {
      openingHook: 'Chào chị Lan, bên em vừa kiểm tra lượng slot lạnh cho tuyến Rotterdam mùa cao điểm tháng tới, hiện bên em đã ký thỏa thuận block slot cứng với Maersk và CMA CGM, cam kết không bị roll cont 100% kèm văn bản đền bù nếu trễ hàng.',
      tabooWords: ['Giá rẻ nhất thị trường', 'Tùy tình hình hãng tàu xếp chỗ', 'Phụ phí phát sinh sau', 'Chắc là kịp'],
      powerValueProps: [
        'Hợp đồng Slot Guarantee cam kết đền bù 150% nếu rớt tàu',
        'Tặng Data Logger cảm biến nhiệt độ & GPS miễn phí từng container',
        'Bảo lãnh 14 ngày Free DEM/DET tại cảng Rotterdam & Hamburg'
      ],
      closingTactic: 'Đề xuất thử nghiệm trước 2 container mẫu cho lô hàng đi Rotterdam đầu tháng. Nếu đạt chuẩn đúng cam kết thời gian và bảo quản nhiệt độ, chị Lan sẽ ký hợp đồng năm cho toàn bộ 35 TEU/tháng.'
    },
    multiThreadingPlans: [
      {
        contactId: 'contact-lan',
        contactName: 'Bà Nguyễn Thị Hoàng Lan',
        contactTitle: 'Giám Đốc Xuất Nhập Khẩu',
        roleInDeal: 'DECISION_MAKER',
        actionGoal: 'Thuyết phục ký hợp đồng nguyên tắc bảo lãnh Slot lạnh cho quý 4',
        tailoredHook: 'Đập tan nỗi sợ rớt tàu trong mùa cao điểm bằng chính sách Slot Guarantee có đền bù bằng tiền mặt',
        suggestedScriptVi: 'Em chào chị Lan. Em hiểu với 35 cont tôm xuất sang siêu thị Hà Lan tháng tới, chỉ cần 1 cont trễ hạn là rủi ro phạt hợp đồng rất lớn. Bên em xin gửi chị hợp đồng nguyên tắc: Cam kết 100% lên tàu đúng ETA kèm điều khoản bồi thường phạt 150% cước nếu trễ. Chị duyệt giúp em để bên em giữ chỗ trước ngày 15 này nhé ạ!',
        suggestedOfferValue: 'Cam kết Slot cứng bằng văn bản + Hỗ trợ tracking nhiệt độ IoT 24/7'
      },
      {
        contactId: 'contact-duc',
        contactName: 'Ông Trần Hữu Đức',
        contactTitle: 'Trưởng Kho Lạnh & Vận Hành',
        roleInDeal: 'CHAMPION',
        actionGoal: 'Biến anh Đức thành người tiến cử mạnh nhất trước mặt chị Lan',
        tailoredHook: 'Giải phóng áp lực kho bãi, xe kéo cont đến trước 30 phút, vỏ cont lạnh đã qua kiểm tra PTI hoàn hảo',
        suggestedScriptVi: 'Anh Đức ơi, lô hàng tới bên em điều xe đến trước 30 phút ca sáng, vỏ cont đã test lạnh đạt -20°C sạch sẽ sẵn tại depot Tân Cảng. Anh yên tâm anh em kho bốc xếp êm ru. Có gì anh hỗ trợ nhắc chị Lan duyệt sớm để bên em chốt vỏ cont đẹp nhất cho anh nhé!',
        suggestedOfferValue: 'Vỏ cont tuyển chọn PTI A+, tài xế chuyên tuyến nhiệt tình, hỗ trợ kẹp chì kiểm tra'
      },
      {
        contactId: 'contact-thu',
        contactName: 'Bà Phạm Minh Thư',
        contactTitle: 'Kế Toán Trưởng',
        roleInDeal: 'BLOCKER',
        actionGoal: 'Xóa bỏ nghi ngại về phụ phí ẩn và chuyển hóa từ Blocker sang Neutral',
        tailoredHook: 'Bảng giá All-in cố định 100%, tỷ giá VCB bán ra ngày tàu chạy, hạn thanh toán 30 ngày',
        suggestedScriptVi: 'Kính gửi chị Thư, bên em đã lập bảng báo giá All-in cố định, cam kết không phát sinh bất kỳ một đồng phụ phí nào ngoài bảng kê. Đồng thời bên em đã thông qua hạn mức công nợ 30 ngày cho Biển Đông để hỗ trợ dòng tiền cuối năm của nhà máy chị.',
        suggestedOfferValue: 'Công nợ 30 ngày + Bảng kê chi phí minh bạch không Local Charge phát sinh'
      }
    ],
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z'
  },
  {
    id: 'dna-textile-namdinh',
    companyId: 'company-default-01',
    customerId: 'cust-textile-02',
    customerName: 'Tập Đoàn Dệt May Quốc Tế Nam Định',
    industry: 'Gia công & Xuất khẩu Hàng may mặc (Garments, Jackets, Denim)',
    personaType: 'CASH_FLOW_SENSITIVE',
    compatibilityScore: 91,
    sensitivityScores: {
      priceSensitivity: 8,
      transitTimeSensitivity: 6,
      freeTimeDemDetSensitivity: 7,
      creditTermSensitivity: 10,
      customsReliabilitySensitivity: 7
    },
    scars: [
      {
        id: 'scar-03',
        type: 'DEM_DET_PENALTY',
        title: 'Bị hãng tàu phạt 8,400 USD tiền DEM/DET tại Cảng New York vì trễ chứng từ',
        incidentYear: 2024,
        perpetrator: 'Hãng tàu Evergreen do forwarder cũ cấp chỉ có 4 ngày free-time',
        financialLossVnd: '210 Triệu VNĐ',
        psychologicalImpact: 'Ám ảnh về số ngày Free DEM/DET tại bờ Đông nước Mỹ.',
        healingPrescription: 'Cấp trọn gói 21 ngày Free DEM/DET kết hợp bờ Đông, hỗ trợ Telex Release miễn phí.'
      }
    ],
    shipmentDna: {
      primaryCommodity: 'Áo khoác xuất khẩu & Quần jeans treo móc (GOH)',
      packagingType: '40\'HC Garment On Hanger (Cont treo) & Thùng carton',
      monthlyVolumeTeu: 60,
      annualLogisticsBudgetUsd: 450000,
      peakSeasonMonths: [6, 7, 8, 9],
      coreTradeLanes: [
        {
          origin: 'Hải Phòng (VNHPH)',
          destination: 'New York (USNYC)',
          incotermDefault: 'FOB / CIF',
          preferredCarriers: ['ONE', 'Cosco', 'HMM'],
          currentRateBenchmarkUsd: 4900
        }
      ],
      criticalRequirements: [
        'Vỏ cont 40\'HC phải tuyệt đối khô ráo, không mùi, có gói hút ẩm chống mốc',
        'Điều khoản thanh toán Net 45 ngày'
      ]
    },
    powerMapContacts: [
      {
        id: 'contact-thang',
        name: 'Ông Vũ Đình Thắng',
        title: 'Trưởng Phòng Thu Mua & Quản Lý Chuỗi Cung Ứng',
        department: 'PURCHASING',
        roleInDeal: 'DECISION_MAKER',
        influenceLevel: 9,
        personalityStyle: 'DOMINANT',
        stanceTowardUs: 'NEUTRAL',
        personalPainPoint: 'Bị áp lực cắt giảm 5% chi phí logistics hàng năm từ Tổng Giám Đốc.',
        hiddenAgenda: 'Muốn thể hiện thành tích đàm phán được giá cước và công nợ tốt nhất.',
        preferredChannel: 'CALL',
        notes: 'Luôn đòi chiết khấu hoặc đòi nợ 45 ngày mới chịu nói chuyện tiếp.',
        phone: '0908 442 3xx',
        email: 'thang.vu@namdinhgarment.vn'
      },
      {
        id: 'contact-hang',
        name: 'Chị Lê Thu Hằng',
        title: 'Chuyên Viên Cao Cấp Xuất Nhập Khẩu',
        department: 'LOGISTICS',
        roleInDeal: 'CHAMPION',
        influenceLevel: 7,
        personalityStyle: 'RELATIONSHIP_WARM' as any,
        stanceTowardUs: 'STRONGLY_IN_FAVOR',
        personalPainPoint: 'Mệt mỏi vì phải theo dõi từng cont và sợ vướng thủ tục hải quan tại Đình Vũ.',
        hiddenAgenda: 'Thích sales nhiệt tình, cập nhật qua Zalo nhanh để chị không phải tự tra cứu website hãng tàu.',
        preferredChannel: 'ZALO',
        notes: 'Chị Hằng là nguồn tin tức tuyệt vời, hay chia sẻ giá của các đối thủ khác đang chào.',
        phone: '0936 122 8xx',
        email: 'hang.le@namdinhgarment.vn'
      }
    ],
    salesPlaybook: {
      openingHook: 'Chào anh Thắng, bên em đã cấu trúc gói tài trợ công nợ Net 45 ngày kèm 21 ngày Free DEM/DET tuyến New York cho đợt hàng may mặc tới của Nam Định.',
      tabooWords: ['Thanh toán ngay khi có Bill', 'Chỉ nợ được 7 ngày', 'Phạt trả chậm'],
      powerValueProps: [
        'Hạn mức công nợ Net 45 ngày linh hoạt dòng vốn',
        'Gói 21 ngày Free Combined DEM/DET bờ Đông Mỹ',
        'Cam kết cont khô sạch tiêu chuẩn xuất khẩu may mặc Nhật/Mỹ'
      ],
      closingTactic: 'Đáp ứng đúng yêu cầu công nợ 45 ngày nhưng đề nghị cam kết volume tối thiểu 30 TEU/tháng để giữ đơn giá ưu đãi.'
    },
    multiThreadingPlans: [
      {
        contactId: 'contact-thang',
        contactName: 'Ông Vũ Đình Thắng',
        contactTitle: 'Trưởng Phòng Thu Mua',
        roleInDeal: 'DECISION_MAKER',
        actionGoal: 'Thuyết phục ký hợp đồng 6 tháng với điều kiện cam kết sản lượng',
        tailoredHook: 'Gói công nợ 45 ngày + 21 ngày Free-time tiết kiệm cho công ty hàng ngàn USD chi phí tài chính',
        suggestedScriptVi: 'Em chào anh Thắng. Bên em đã trình duyệt thành công hạn mức công nợ 45 ngày cho Nam Định. Đây là chính sách đặc biệt bên em dành riêng cho các đối tác chiến lược có volume trên 30 TEU. Anh xem hợp đồng nguyên tắc em gửi qua Zalo rồi duyệt giúp em nhé!',
        suggestedOfferValue: 'Credit Term 45 ngày + Giữ giá cố định 30 ngày không tăng GRI'
      }
    ],
    createdAt: '2026-09-18T09:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z'
  },
  {
    id: 'dna-furniture-ancuong',
    companyId: 'company-default-01',
    customerId: 'cust-furniture-03',
    customerName: 'Công Ty TNHH Chế Biến Gỗ & Nội Thất An Cường Vina',
    industry: 'Sản xuất & Xuất khẩu Đồ gỗ nội thất, ván ép công nghiệp',
    personaType: 'PRICE_HUNTER',
    compatibilityScore: 82,
    sensitivityScores: {
      priceSensitivity: 10,
      transitTimeSensitivity: 4,
      freeTimeDemDetSensitivity: 7,
      creditTermSensitivity: 5,
      customsReliabilitySensitivity: 6
    },
    scars: [
      {
        id: 'scar-04',
        type: 'SURCHARGE_EXPLOSION',
        title: 'Bị forwarder cũ cộng dồn phụ phí kẹt cảng PSS lên đến $600/cont mà không báo trước',
        incidentYear: 2024,
        perpetrator: 'Forwarder Z',
        financialLossVnd: '180 Triệu VNĐ',
        psychologicalImpact: 'Cực kỳ cảnh giác với báo giá giá rẻ ban đầu rồi cộng phụ phí sau.',
        healingPrescription: 'Cam kết Báo Giá Trọn Gói (Lump Sum All-in) có đóng dấu niêm yết, cam kết không thu thêm bất kỳ phụ phí nào dù hãng tàu tăng cước.'
      }
    ],
    shipmentDna: {
      primaryCommodity: 'Bàn ghế gỗ xuất khẩu & Tủ bếp gỗ công nghiệp',
      packagingType: '40\'HC đóng pallet kiện gỗ (Kiểm dịch AFAS)',
      monthlyVolumeTeu: 50,
      annualLogisticsBudgetUsd: 320000,
      peakSeasonMonths: [9, 10, 11, 12, 1],
      coreTradeLanes: [
        {
          origin: 'Cát Lái (VNSGN)',
          destination: 'Long Beach (USLGB)',
          incotermDefault: 'FOB Cát Lái / CIF Long Beach',
          preferredCarriers: ['WHL', 'HMM', 'ZIM'],
          currentRateBenchmarkUsd: 2850
        }
      ],
      criticalRequirements: [
        'Chứng thư hun trùng kiểm dịch gỗ AFAS xuất khẩu đi Mỹ/Úc',
        'Giá cước cạnh tranh từng USD'
      ]
    },
    powerMapContacts: [
      {
        id: 'contact-hoang',
        name: 'Ông Nguyễn Văn Hoàng',
        title: 'Giám Đốc Chuỗi Cung Ứng & Logistics',
        department: 'LOGISTICS',
        roleInDeal: 'DECISION_MAKER',
        influenceLevel: 9,
        personalityStyle: 'DOMINANT',
        stanceTowardUs: 'LEANING_POSITIVE',
        personalPainPoint: 'Biên lợi nhuận ngành gỗ đang mỏng, bị ép giảm giá cước từng đồng.',
        hiddenAgenda: 'Cần con số chi phí rẻ nhất để báo cáo Giám đốc Nhà máy.',
        preferredChannel: 'CALL',
        notes: 'Chỉ quan tâm giá All-in và uy tín hun trùng kiểm dịch.',
        phone: '0909 778 9xx',
        email: 'hoang.nguyen@ancuongwood.vn'
      }
    ],
    salesPlaybook: {
      openingHook: 'Chào anh Hoàng, bên em vừa có deal giá cước tàu WHL và HMM cho tuyến Long Beach chỉ $2,780 All-in trọn gói đã bao gồm chứng thư hun trùng AFAS.',
      tabooWords: ['Dịch vụ cao cấp', 'Phí phát sinh tại cảng đến', 'Ước tính'],
      powerValueProps: [
        'Giá cước cựu độ cạnh tranh nhờ hợp đồng volume lớn với WHL/ZIM',
        'Tặng miễn phí chứng thư hun trùng AFAS cho 5 container đầu tiên',
        'Bảo lãnh giá All-in không phát sinh PSS/GRI trong 30 ngày'
      ],
      closingTactic: 'Chào giá thấp hơn đối thủ $30/cont nhưng cam kết thời hạn thanh toán 15 ngày.'
    },
    multiThreadingPlans: [
      {
        contactId: 'contact-hoang',
        contactName: 'Ông Nguyễn Văn Hoàng',
        contactTitle: 'Giám Đốc Chuỗi Cung Ứng',
        roleInDeal: 'DECISION_MAKER',
        actionGoal: 'Chốt đơn hàng 10 cont gỗ đầu tiên đi Long Beach trong tuần',
        tailoredHook: 'Đơn giá All-in rẻ nhất thị trường $2,780 bao gồm trọn gói chứng thư kiểm dịch',
        suggestedScriptVi: 'Em chào anh Hoàng, em giữ đúng lời hứa đã xin được Giám đốc bên em mức cước $2,780 All-in cho tuyến Long Beach, đã bao gồm cả phí hun trùng AFAS. Giá này đang rẻ hơn bên forwarder cũ của anh $40/cont mà cam kết bằng văn bản không phụ phí ẩn. Anh chốt booking trước thứ 5 để em kịp lock giá cho đợt đóng hàng tuần tới nhé!',
        suggestedOfferValue: 'Giá cước chạm đáy + Free phí hun trùng AFAS trị giá 1.5tr/cont'
      }
    ],
    createdAt: '2026-09-22T08:30:00Z',
    updatedAt: '2026-10-04T11:30:00Z'
  }
];

// Helper Service
export class CustomerDnaPowerMapService {
  /**
   * Lấy danh sách toàn bộ hồ sơ Customer DNA & Power Map
   */
  static getProfiles(): CustomerDnaPowerMapProfile[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESEEDED_CUSTOMER_DNA_PROFILES));
      }
    } catch {
      // fallback to preseeded
    }
    return PRESEEDED_CUSTOMER_DNA_PROFILES;
  }

  /**
   * Lấy hồ sơ theo ID hoặc Customer Name
   */
  static getProfileById(id: string): CustomerDnaPowerMapProfile | undefined {
    const profiles = this.getProfiles();
    return profiles.find(p => p.id === id);
  }

  static getProfileByCustomerName(name: string): CustomerDnaPowerMapProfile | undefined {
    const profiles = this.getProfiles();
    if (!name) return profiles[0];
    const normalized = name.toLowerCase().trim();
    return (
      profiles.find(p => p.customerName.toLowerCase().includes(normalized)) ||
      profiles.find(p => normalized.includes(p.customerName.toLowerCase())) ||
      profiles[0]
    );
  }

  /**
   * Lưu hoặc cập nhật hồ sơ Customer DNA
   */
  static saveProfile(profile: CustomerDnaPowerMapProfile): CustomerDnaPowerMapProfile {
    const profiles = this.getProfiles();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    profile.updatedAt = new Date().toISOString();

    let updatedProfiles: CustomerDnaPowerMapProfile[];
    if (existingIndex >= 0) {
      updatedProfiles = [...profiles];
      updatedProfiles[existingIndex] = profile;
    } else {
      updatedProfiles = [profile, ...profiles];
    }

    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
      }
    } catch {
      // storage quota error ignore
    }
    return profile;
  }

  /**
   * Thêm nhân sự mới vào Org Power Map
   */
  static addPowerMapContact(profileId: string, contact: OrgPowerContact): CustomerDnaPowerMapProfile | undefined {
    const profile = this.getProfileById(profileId);
    if (!profile) return undefined;

    const updatedContacts = [...profile.powerMapContacts, contact];
    const updatedProfile = {
      ...profile,
      powerMapContacts: updatedContacts
    };
    return this.saveProfile(updatedProfile);
  }

  /**
   * Cập nhật kịch bản Multi-Threading cho một nhân sự
   */
  static updateMultiThreadingPlan(profileId: string, plan: MultiThreadingPlan): CustomerDnaPowerMapProfile | undefined {
    const profile = this.getProfileById(profileId);
    if (!profile) return undefined;

    const existingIndex = profile.multiThreadingPlans.findIndex(p => p.contactId === plan.contactId);
    let updatedPlans = [...profile.multiThreadingPlans];
    if (existingIndex >= 0) {
      updatedPlans[existingIndex] = plan;
    } else {
      updatedPlans.push(plan);
    }

    const updatedProfile = {
      ...profile,
      multiThreadingPlans: updatedPlans
    };
    return this.saveProfile(updatedProfile);
  }

  /**
   * Phân tích tự động Persona từ điểm nhạy cảm
   */
  static autoAnalyzePersona(scores: ShipperSensitivityScores): {
    personaType: ShipperPersonaType;
    labelVi: string;
    descriptionVi: string;
    strategicBadgeColor: string;
  } {
    if (scores.creditTermSensitivity >= 8 && scores.creditTermSensitivity > scores.priceSensitivity) {
      return {
        personaType: 'CASH_FLOW_SENSITIVE',
        labelVi: 'Khát Công Nợ (Cash-Flow Sensitive)',
        descriptionVi: 'Chủ hàng phụ thuộc mạnh vào chu kỳ quay vòng vốn, sẵn sàng chấp nhận cước cao hơn một chút nếu được bảo lãnh công nợ 30-60 ngày.',
        strategicBadgeColor: 'purple'
      };
    }
    if (scores.transitTimeSensitivity >= 8 || scores.customsReliabilitySensitivity >= 9) {
      return {
        personaType: 'RELIABILITY_FIRST',
        labelVi: 'Ưu Tiên Tiến Độ & Slot (Reliability First)',
        descriptionVi: 'Hàng xuất khẩu có cam kết hợp đồng phạt nặng (thủy sản, thực phẩm tươi, hàng dự án), tuyệt đối không chấp nhận rớt cont.',
        strategicBadgeColor: 'emerald'
      };
    }
    if (scores.priceSensitivity >= 8) {
      return {
        personaType: 'PRICE_HUNTER',
        labelVi: 'Thợ Săn Giá Rẻ (Price Hunter)',
        descriptionVi: 'Biên lợi nhuận hàng hóa mỏng (gỗ thô, nông sản, vật liệu), luôn so sánh giá cước giữa ít nhất 3-4 forwarder và đổi bên nếu chênh $15-$20.',
        strategicBadgeColor: 'amber'
      };
    }
    if (scores.customsReliabilitySensitivity >= 7 && scores.transitTimeSensitivity >= 7) {
      return {
        personaType: 'SERVICE_PERFECTIONIST',
        labelVi: 'Cầu Toàn Dịch Vụ (Service Perfectionist)',
        descriptionVi: 'Đòi hỏi sự hỗ trợ chu đáo 24/7, tracking minh bạch, ghét mọi phụ phí phát sinh và tác phong sales cẩu thả.',
        strategicBadgeColor: 'blue'
      };
    }

    return {
      personaType: 'HYBRID_TACTICAL',
      labelVi: 'Thực Dụng Linh Hoạt (Hybrid Tactical)',
      descriptionVi: 'Linh hoạt biến thiên theo mùa: Mùa thấp điểm ép giá tối đa, mùa cao điểm sẵn sàng chi đậm để giữ slot tàu.',
      strategicBadgeColor: 'indigo'
    };
  }

  /**
   * Tạo kịch bản Zalo / Gọi điện tức thì cho 1 nhân sự cụ thể
   */
  static generateInstantScript(
    profile: CustomerDnaPowerMapProfile,
    contact: OrgPowerContact,
    channel: 'ZALO' | 'CALL' | 'EMAIL'
  ): { title: string; content: string; keyBulletPoints: string[] } {
    const personaLabel = this.autoAnalyzePersona(profile.sensitivityScores).labelVi;

    if (channel === 'ZALO') {
      return {
        title: `Tin Nhắn Zalo 1-Chạm Gửi ${contact.title} - ${contact.name}`,
        content: `Em chào ${contact.name.includes('Bà') || contact.name.includes('Chị') ? 'chị' : 'anh'} ${contact.name.split(' ').pop()} ạ!
Em là Sales phụ trách mảng vận tải quốc tế tại Bogi Logistics. 

Biết nhà máy mình đang chuẩn bị xuất các lô ${profile.shipmentDna.primaryCommodity}, bên em vừa chuẩn bị riêng cho ${contact.name.includes('Bà') || contact.name.includes('Chị') ? 'chị' : 'anh'} giải pháp:
✅ ${contact.personalPainPoint ? `Giải quyết triệt để: ${contact.personalPainPoint}` : 'Bảo đảm slot cố định 100% không rớt hàng'}
✅ Cam kết chính sách: ${profile.salesPlaybook.powerValueProps[0] || 'Giá trọn gói All-in minh bạch'}

Em xin phép gửi bảng chào phương án chi tiết qua Zalo để ${contact.name.includes('Bà') || contact.name.includes('Chị') ? 'chị' : 'anh'} tham khảo trước nhé ạ. Em cảm ơn ${contact.name.includes('Bà') || contact.name.includes('Chị') ? 'chị' : 'anh'} nhiều!`,
        keyBulletPoints: [
          'Ngắn gọn, chuyên nghiệp, chạm đúng nỗi bận tâm của chức danh',
          'Không spam hay thúc ép báo giá ngay',
          'Tạo cớ mở cuộc hội thoại tự nhiên'
        ]
      };
    }

    if (channel === 'CALL') {
      return {
        title: `Kịch Bản Gọi Điện Thuyết Phục 60 Giây - ${contact.title}`,
        content: `[MỞ ĐẦU THU HÚT - 10 Giây]:
"Dạ em chào ${contact.name.includes('Bà') || contact.name.includes('Chị') ? 'chị' : 'anh'} ${contact.name.split(' ').pop()}, em gọi từ bộ phận Logistics tàu biển Bogi. Em biết ${contact.title} rất bận nên em xin phép nói đúng 1 phút về giải pháp slot và cước cho tuyến đi ${profile.shipmentDna.coreTradeLanes[0]?.destination || 'Châu Âu/Mỹ'} của công ty mình ạ."

[ĐÁNH TRÚNG NỖI ĐAU - 20 Giây]:
"${profile.salesPlaybook.openingHook}"

[ĐÒN BẨY GIÁ TRỊ - 20 Giây]:
"Bên em cam kết: ${profile.salesPlaybook.powerValueProps.slice(0, 2).join('; ')}. Điều này giúp ${contact.title} hoàn toàn yên tâm về chi phí và tiến độ."

[CHỐT HÀNH ĐỘNG TIẾP THEO - 10 Giây]:
"Dạ sáng mai tầm 9h em gửi chị bảng so sánh chi tiết phương án qua Zalo, sau đó em xin phép gọi lại 3 phút để hỗ trợ chị nhé ạ!"`,
        keyBulletPoints: [
          'Kiểm soát thời lượng dưới 60 giây',
          'Khẳng định năng lực đền bù và cam kết slot',
          'Thiết lập cuộc hẹn tiếp theo rõ ràng'
        ]
      };
    }

    // EMAIL
    return {
      title: `Email Chào Phương Án May Đo Gửi ${contact.name}`,
      content: `Kính gửi ${contact.title} - ${contact.name},
Đồng kính gửi: Ban Điều Hành ${profile.customerName},

Lời đầu tiên, Bogi Logistics xin gửi lời chào trân trọng nhất đến Quý Công ty.

Thấu hiểu tính chất đặc thù của mặt hàng ${profile.shipmentDna.primaryCommodity} đòi hỏi tiêu chuẩn khắt khe về thời gian vận chuyển cũng như sự ổn định của chuỗi cung ứng, chúng tôi đã xây dựng riêng gói giải pháp logistics tối ưu:

1. Cam kết chất lượng vận chuyển:
- Tuyến thế mạnh: ${profile.shipmentDna.coreTradeLanes.map(l => `${l.origin} -> ${l.destination}`).join(' | ')}
- ${profile.salesPlaybook.powerValueProps.map(p => `+ ${p}`).join('\n')}

2. Chính sách bảo lãnh đặc quyền:
- ${profile.scars[0]?.healingPrescription || 'Bảo hiểm và cam kết slot bằng văn bản ký kết'}
- Thời hạn thanh toán và hỗ trợ Free-time DEM/DET tối đa tại cảng đích.

Chúng tôi rất mong có cơ hội được gửi hồ sơ năng lực chi tiết và lắng nghe thêm các yêu cầu đặc biệt từ Quý Công ty.

Trân trọng kính thư,
Đội Ngũ Quản Trị Khách Hàng Doanh Nghiệp - Bogi Logistics`,
      keyBulletPoints: [
        'Trang trọng, chuẩn mực B2B Corporate',
        'Nêu bật các cam kết đền bù và quyền lợi cụ thể',
        'Phù hợp gửi cho Decision Maker hoặc Finance Lead'
      ]
    };
  }
}
