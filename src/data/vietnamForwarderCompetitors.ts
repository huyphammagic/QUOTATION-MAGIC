import { CompetitorProfile } from '../types/competitorIntelligence';

/**
 * Cơ sở dữ liệu trí tuệ thị trường các công ty Freight Forwarder hàng đầu tại Việt Nam.
 * Cập nhật thông tin thực chiến: Thị phần, Tuyến thế mạnh, Phân tích SWOT, 
 * và Kịch bản hạ gục (Kill Pitch & Battlecards) phục vụ Sales BOGI Logistics chốt đơn.
 */
export const VIETNAM_FORWARDER_COMPETITORS: CompetitorProfile[] = [
  // =========================================================================
  // NHÓM 1: TOP GLOBAL MNC FORWARDERS TẠI VIỆT NAM (Đa Quốc Gia Hạng 1)
  // =========================================================================
  {
    id: 'comp_kn_vietnam',
    name: 'Kuehne + Nagel (K+N Vietnam)',
    legalName: 'Công ty TNHH Kuehne + Nagel Việt Nam',
    brandName: 'Kuehne+Nagel',
    code: 'KN_GLOBAL',
    tier: 'TIER_1_GLOBAL',
    headquarters: 'TP. Hồ Chí Minh & Chi nhánh Hải Phòng, Hà Nội, Đà Nẵng',
    establishedYear: 1994,
    employeeCount: '800+ nhân sự tại VN',
    website: 'kuehne-nagel.com',
    marketShareEstimate: 'Top 1-2 sản lượng xuất khẩu đường biển & hàng không từ VN',
    strongLanes: [
      'Hồ Chí Minh/Hải Phòng -> Châu Âu (Rotterdam, Hamburg, Antwerp)',
      'Hồ Chí Minh/Hải Phòng -> Bắc Mỹ (USWC, USEC, Canada)',
      'Đường Hàng Không (Air Freight) hàng Dệt may & Điện tử cao cấp'
    ],
    typicalDiscountPercent: 8, // Giá cao hơn thị trường 5% - 10%
    pricePositioning: 'PREMIUM',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Mạng lưới toàn cầu 100+ quốc gia, hệ thống myKN theo dõi trực tuyến hiện đại bậc nhất thế giới',
      'Hợp đồng khối lượng (Service Contract) khổng lồ với các hãng tàu 2M, Ocean Alliance',
      'Độ uy tín thương hiệu rất cao, được các tập đoàn FDI đa quốc gia chỉ định mặc định'
    ],
    weaknesses: [
      'Phí dịch vụ địa phương (Local Charges) và phí chứng từ (Documentation Fee) rất đắt đỏ',
      'Quy trình phê duyệt nội bộ cồng kềnh, mất 2-3 ngày mới có giá cho tuyến đặc thù hoặc hàng non-standard',
      'Thờ ơ với các doanh nghiệp vừa và nhỏ (SME); không có nhân sự hỗ trợ sát sườn khi gặp sự cố tại cảng'
    ],
    swotAnalysis: {
      strengths: [
        'Hợp đồng khung hãng tàu cấp bậc Global tier 1',
        'Nền tảng IT myKN mạnh mẽ, định vị lô hàng theo thời gian thực',
        'Năng lực tài chính dồi dào, hỗ trợ công nợ lớn cho tập đoàn'
      ],
      weaknesses: [
        'Bộ máy cồng kềnh, phân cấp duyệt giá phức tạp',
        'Phụ phí phát sinh cao gấp 1.5 - 2 lần forwarder nội địa',
        'Thiếu linh hoạt xử lý hải quan khó hoặc giấy phép chuyên ngành'
      ],
      opportunities: [
        'Doanh nghiệp SME muốn tìm kiếm đối tác tận tâm và chi phí minh bạch',
        'Khách hàng phàn nàn vì không gọi được nhân viên phụ trách khi tàu trễ'
      ],
      threats: [
        'Khách hàng bị ràng buộc bởi hợp đồng toàn cầu từ phía người mua (Nominated Cargo)'
      ]
    },
    carrierAlliances: ['Maersk', 'MSC', 'Hapag-Lloyd', 'CMA CGM', 'Vietnam Airlines'],
    winningCounterTactics: [
      'Chứng minh tổng chi phí All-in của BOGI Logistics tiết kiệm hơn $200 - $350/cont nhờ biểu phí Local Charges minh bạch',
      'Cam kết phản hồi báo giá trong vòng 15-30 phút thay vì phải chờ 48 giờ như K+N',
      'Chỉ định chuyên viên Logistics 1-1 chăm sóc qua Zalo/Hotline 24/7, xử lý trực tiếp tại bãi cảng Cát Lái/Hải Phòng'
    ],
    killPitchVi: 'K+N có giá cước biển thương hiệu tốt, nhưng anh/chị lưu ý phụ phí Local Charges tại Việt Nam của họ thường chênh cao hơn thị trường $150-$250/lô, kèm phí sửa vận đơn rất đắt. Với BOGI Logistics, chúng em cam kết báo giá All-in trọn gói không phát sinh 1 đồng, và có nhân sự trực tại cảng 24/7 để thông quan ngay trong ngày.',
    zaloScriptVi: 'Dạ chào Anh/Chị, em gửi bảng so sánh chi phí thực tế. Tuy K+N báo cước nhìn qua tương đương nhưng phí chứng từ và handling của họ cao hơn. BOGI Logistics xin giữ nguyên cam kết giá trọn gói tiết kiệm hơn $180/cont kèm 14 ngày Free DEM/DET tại cảng đích ạ.',
    trapQuestionsVi: [
      'Anh/chị đã yêu cầu K+N gửi bảng chi tiết biểu phí Local Charges đầu Việt Nam và phí D/O đầu đến chưa ạ?',
      'Khi hàng gặp trục trặc kiểm hóa hoặc cần sửa B/L gấp ngoài giờ hành chính, nhân viên K+N có hỗ trợ xử lý ngay trong 1 giờ không ạ?'
    ]
  },
  {
    id: 'comp_dhl_vietnam',
    name: 'DHL Global Forwarding Vietnam',
    legalName: 'Công ty TNHH Giao nhận Vận tải DHL Global Forwarding Việt Nam',
    brandName: 'DHL Global Forwarding',
    code: 'DHL_GLOBAL',
    tier: 'TIER_1_GLOBAL',
    headquarters: 'TP. Hồ Chí Minh & Chi nhánh Hà Nội, Bắc Ninh, Đà Nẵng, Hải Phòng',
    establishedYear: 1993,
    employeeCount: '600+ nhân sự tại VN',
    website: 'dhl.com/vn-vi',
    marketShareEstimate: 'Top 1 vận chuyển hàng không (Air Freight) và Dược phẩm/Y tế tại VN',
    strongLanes: [
      'Hàng không Quốc tế (Air Freight SGN/HAN đi Mỹ, Châu Âu, Nhật Bản)',
      'Vận chuyển hàng dự án công nghiệp & Dược phẩm lạnh (Cold Chain)',
      'Đường biển LCL Consol đi toàn cầu'
    ],
    typicalDiscountPercent: 10,
    pricePositioning: 'PREMIUM',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Thương hiệu nhận diện toàn cầu mạnh mẽ, chuỗi dịch vụ Air Freight số 1',
      'Cơ sở kho bãi ngoại quan chuẩn quốc tế tại sân bay Tân Sơn Nhất và Nội Bài',
      'Hệ thống quản lý nhiệt độ LifeConEx hàng đầu cho vắc xin và dược phẩm'
    ],
    weaknesses: [
      'Cước vận chuyển đường biển FCL không phải là trọng tâm cạnh tranh về giá',
      'Phí xử lý hồ sơ, thủ tục và phụ phí xăng dầu hàng không (FSC) áp mức cao',
      'Khó đàm phán điều chỉnh hợp đồng cho khách hàng vừa và nhỏ'
    ],
    swotAnalysis: {
      strengths: ['Dịch vụ Air Freight số 1', 'Độ tin cậy hàng nhạy cảm thời gian', 'Mạng lưới hub sân bay'],
      weaknesses: ['Giá cước đường biển FCL cao', 'Chính sách thanh toán nghiêm ngặt', 'Hỗ trợ khách hàng nhỏ chậm'],
      opportunities: ['Khách hàng muốn chuyển từ đường hàng không giá đắt sang Air-Sea kết hợp tiết kiệm 40% chi phí'],
      threats: ['Khách hàng có nguồn ngân sách dồi dào chuộng thương hiệu DHL']
    },
    carrierAlliances: ['Singapore Airlines Cargo', 'Cathay Cargo', 'Korean Air', 'Lufthansa Cargo'],
    winningCounterTactics: [
      'Đề xuất giải pháp Sea-Air kết hợp hoặc Air Economy giúp khách tiết kiệm 30% - 45% chi phí so với dịch vụ DHL Priority',
      'Linh hoạt trong thời hạn công nợ 30 ngày (DHL thường yêu cầu bảo lãnh ngân hàng hoặc thanh toán nhanh 7 ngày)'
    ],
    killPitchVi: 'DHL là tên tuổi số 1 cho hàng mẫu chuyển phát và hàng Air khẩn, nhưng với lô hàng thương mại đường biển FCL hoặc Air phổ thông, chi phí của họ bị đội lên rất nhiều vì thương hiệu. BOGI Logistics sử dụng cùng hãng bay/hãng tàu với giá gốc tiết kiệm 25% mà chất lượng theo dõi không khác biệt.',
    zaloScriptVi: 'Em chào Anh/Chị, với lô hàng này nếu đi DHL cước bay sẽ rất cao do phụ phí FSC/SSC. Em đề xuất line bay Vietnam Airlines/Eva Air qua BOGI Logistics với lịch bay cố định, tiết kiệm được hơn 15 triệu/tấn hàng ạ.',
    trapQuestionsVi: [
      'Lô hàng của bên mình có bắt buộc phải dùng nhãn DHL không, hay ưu tiên tối ưu chi phí vận chuyển thương mại?'
    ]
  },
  {
    id: 'comp_db_schenker',
    name: 'DB Schenker Vietnam',
    legalName: 'Công ty TNHH Schenker Việt Nam',
    brandName: 'DB Schenker',
    code: 'DB_SCHENKER',
    tier: 'TIER_1_GLOBAL',
    headquarters: 'TP. Hồ Chí Minh & Hệ thống kho Logistics tại Bình Dương, Bắc Ninh',
    establishedYear: 1991,
    employeeCount: '1,000+ nhân sự',
    website: 'dbschenker.com/vn-en',
    marketShareEstimate: 'Top 3 FWD đa quốc gia tại VN, rất mạnh mảng kho vận Contract Logistics',
    strongLanes: [
      'Tuyến Châu Âu (Đức, Ý, Pháp, Đông Âu) bằng đường biển & đường sắt Á-Âu',
      'Logistics ngành Bán lẻ, Hàng tiêu dùng nhanh FMCG, Điện tử gia dụng'
    ],
    typicalDiscountPercent: 6,
    pricePositioning: 'PREMIUM',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Hệ thống tổng kho phân phối và trung tâm kho bãi hiện đại tại Bình Dương, Bắc Ninh',
      'Thế mạnh vượt trội trên các tuyến đi Trung Âu và Đức'
    ],
    weaknesses: [
      'Thời gian giải quyết khiếu nại (Claim) hư hỏng kéo dài qua nhiều phòng ban',
      'Đội ngũ Sales chịu áp lực KPI cao, thay đổi nhân sự phụ trách thường xuyên làm gián đoạn liên lạc'
    ],
    swotAnalysis: {
      strengths: ['Hạ tầng kho bãi quy mô lớn', 'Tuyến Châu Âu chuyên sâu'],
      weaknesses: ['Nhân sự sales luân chuyển nhanh', 'Quy trình đền bù phức tạp'],
      opportunities: ['Tận dụng việc khách hàng bị bỏ rơi khi nhân viên Schenker cũ nghỉ việc'],
      threats: ['Quan hệ sâu sắc với các tập đoàn công nghiệp châu Âu']
    },
    carrierAlliances: ['Hapag-Lloyd', 'ONE', 'MSC', 'CMA CGM'],
    winningCounterTactics: [
      'Cam kết nhân sự Account Manager cố định đồng hành xuyên suốt không bị đứt gãy',
      'Chính sách cam kết bồi thường rõ ràng, bảo hiểm trọn gói bảo vệ quyền lợi hàng hóa 100%'
    ],
    killPitchVi: 'Nhiều khách hàng từng làm việc với DB Schenker phản ánh tình trạng nhân viên phụ trách thay đổi liên tục, khi có phát sinh trễ tàu thì rất khó tìm người chịu trách nhiệm. Tại BOGI Logistics, Ban Giám Đốc trực tiếp giám sát từng hợp đồng và cam kết 1 đầu mối phụ trách từ A-Z.',
    zaloScriptVi: 'Dạ thưa Anh/Chị, BOGI Logistics cam kết một chuyên viên quản lý tài khoản xuyên suốt cùng anh/chị, giải quyết mọi phát sinh trong 15 phút không cần trình duyệt qua nhiều cấp ạ.',
    trapQuestionsVi: [
      'Anh/chị có bao giờ gặp cảnh nhân viên FWD bàn giao qua lại mà không ai nhận trách nhiệm khi tàu trễ chưa ạ?'
    ]
  },
  {
    id: 'comp_expeditors',
    name: 'Expeditors International Vietnam',
    legalName: 'Chi nhánh Expeditors International (Vietnam) Co., Ltd',
    brandName: 'Expeditors',
    code: 'EXPEDITORS',
    tier: 'TIER_1_GLOBAL',
    headquarters: 'TP. Hồ Chí Minh & Chi nhánh Hà Nội, Hải Phòng, Đà Nẵng',
    establishedYear: 1996,
    employeeCount: '500+ nhân sự',
    website: 'expeditors.com',
    marketShareEstimate: 'Top 1 tuyến Bắc Mỹ (Trans-Pacific) chiều xuất khẩu từ VN',
    strongLanes: [
      'Tuyến Việt Nam -> Bờ Tây Mỹ (Long Beach, Los Angeles, Oakland)',
      'Tuyến Việt Nam -> Bờ Đông Mỹ (New York, Savannah, Norfolk)',
      'Thông quan Hải quan Hoa Kỳ (US Customs Brokerage) chuyên nghiệp'
    ],
    typicalDiscountPercent: 7,
    pricePositioning: 'PREMIUM',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Service Contract cực khủng với các hãng tàu xuyên Thái Bình Dương (Trans-Pacific)',
      'Hệ thống phần mềm theo dõi xuất sắc và am hiểu tường tận luật Hải quan Mỹ (ISF, AMS, CBP)'
    ],
    weaknesses: [
      'Chỉ ưu tiên phục vụ khách hàng Nominated Cargo (hàng chỉ định từ các chuỗi bán lẻ Walmart, Target, Nike...)',
      'Với khách hàng Freehand tại Việt Nam, giá cước và sự quan tâm kém hơn hẳn'
    ],
    swotAnalysis: {
      strengths: ['Hợp đồng tuyến Mỹ vô địch', 'Năng lực thông quan US'],
      weaknesses: ['Không mặn mà với hàng Freehand tự mua tự bán', 'Giá cước cho SME rất cao'],
      opportunities: ['Thuyết phục các chủ hàng xuất khẩu chuyển đổi điều kiện từ FOB sang CIF/DAP để nắm quyền chọn FWD'],
      threats: ['Người mua Mỹ ép buộc dùng Expeditors để kiểm soát chuỗi cung ứng']
    },
    carrierAlliances: ['Cosco', 'ONE', 'Evergreen', 'OOCL', 'Yang Ming'],
    winningCounterTactics: [
      'Tư vấn cho chủ hàng Việt Nam chuyển từ bán FOB sang bán CIF/CFR bằng cách chứng minh BOGI Logistics có giá cước Mỹ tương đương nhưng cước do đầu VN kiểm soát, giữ được thế chủ động',
      'Hỗ trợ toàn bộ thủ tục khai ISF 10+2, AMS và khai báo FDA/USDA tận tình'
    ],
    killPitchVi: 'Expeditors chủ yếu làm hàng chỉ định cho các Buyer lớn ở Mỹ. Đối với doanh nghiệp Việt Nam tự tìm FWD, họ thường báo giá rất cao và hỗ trợ thụ động. BOGI Logistics có hợp đồng trực tiếp với Evergreen và Cosco tuyến Mỹ, giá cước cạnh tranh ngang ngửa mà hỗ trợ xin 14-21 ngày Demurrage/Detention tại cảng Los Angeles.',
    zaloScriptVi: 'Em chào Anh/Chị, BOGI Logistics vừa cập nhật giá tuyến Long Beach/Los Angeles cực tốt cho hợp đồng dài hạn, đã bao gồm xin trước 14 ngày Free DEM/DET giúp khách mua tại Mỹ không lo kẹt cảng ạ.',
    trapQuestionsVi: [
      'Bên phía đối tác Mỹ của anh/chị có cho phép tự chọn FWD nếu giá cước và free-time của mình tốt hơn không ạ?'
    ]
  },

  // =========================================================================
  // NHÓM 2: TOP VIETNAMESE LOGISTICS GIANTS (Các Tập Đoàn FWD Lớn Nhất VN)
  // =========================================================================
  {
    id: 'comp_bee_logistics',
    name: 'Bee Logistics Corp (Con Ong Logistics)',
    legalName: 'Công ty Cổ phần Giao nhận Vận tải Con Ong',
    brandName: 'Bee Logistics',
    code: 'BEE_LOGISTICS',
    tier: 'TOP_LOCAL_FORWARDER',
    headquarters: 'TP. Hồ Chí Minh & Mạng lưới 30+ văn phòng trên toàn quốc',
    establishedYear: 2004,
    employeeCount: '1,200+ nhân sự',
    website: 'beelogistics.com',
    marketShareEstimate: 'Top 3 Forwarder nội địa Việt Nam, mạng lưới phủ khắp các tỉnh thành',
    strongLanes: [
      'Tuyến Châu Á (Trung Quốc, Hàn Quốc, Nhật Bản, Đài Loan, ASEAN)',
      'Tuyến Ấn Độ & Trung Đông',
      'Vận chuyển đường sắt liên vận quốc tế & Vận tải xuyên biên giới Việt - Lào - Campuchia'
    ],
    typicalDiscountPercent: -2, // Thấp hơn thị trường 2% - 4% trên các tuyến sở trường
    pricePositioning: 'STANDARD',
    localChargesRating: 'COMPETITIVE',
    strengths: [
      'Mạng lưới chi nhánh dày đặc từ Bắc vào Nam, linh hoạt và gần gũi với doanh nghiệp nội địa',
      'Đa dạng phương thức vận chuyển: Đường biển, Air, Đường sắt, Cross-border trucking',
      'Khả năng xử lý thủ tục Hải quan tại các cửa khẩu đường bộ rất linh hoạt'
    ],
    weaknesses: [
      'Đại lý đầu nước ngoài (đặc biệt là Bắc Mỹ và Châu Âu) không đồng đều, phụ thuộc vào agent thứ 3',
      'Hệ thống công nghệ phần mềm theo dõi tracking và portal khách hàng còn hạn chế, chủ yếu báo cáo thủ công qua email/Excel'
    ],
    swotAnalysis: {
      strengths: ['Mạng lưới chi nhánh nội địa phủ kín', 'Giá cước tuyến Châu Á sát sườn', 'Vận tải xuyên biên giới mạnh'],
      weaknesses: ['Hạ tầng công nghệ thông tin chưa hiện đại', 'Chất lượng đại lý đầu xa (Mỹ/Âu) chưa đồng nhất'],
      opportunities: ['Khách hàng cần cổng Portal số hóa tự động hóa việc theo dõi lô hàng và phê duyệt báo giá online'],
      threats: ['Quan hệ bạn bè thân thiết giữa sales Bee Logistics và các kế toán/thu mua lâu năm']
    },
    carrierAlliances: ['SITC', 'KMTC', 'Sinokor', 'Heung-A', 'Wan Hai', 'RCL'],
    winningCounterTactics: [
      'Trình diễn Cổng Thông Tin Số Hóa BOGI Client Portal (Báo giá e-Sign 1 chạm, tra cứu định vị lô hàng tự động, lưu trữ hóa đơn điện tử)',
      'Chứng minh năng lực đại lý độc quyền có văn phòng bản địa tại Mỹ và Châu Âu, cam kết giải quyết thủ tục thông quan trong 24 giờ'
    ],
    killPitchVi: 'Bee Logistics rất mạnh tuyến Châu Á và đường bộ, nhưng trên các tuyến xa như Mỹ và EU, đại lý của họ chủ yếu là hợp tác rời rạc, khi phát sinh vướng mắc đầu đến thường xử lý rất chậm. BOGI Logistics sở hữu mạng lưới đại lý đối tác chiến lược có kho bãi riêng tại cảng đến, đảm bảo thông quan và giao hàng Door-to-Door mượt mà.',
    zaloScriptVi: 'Dạ em chào Anh/Chị, BOGI Logistics bên em trang bị hệ thống Portal theo dõi live 24/7 và ký báo giá điện tử ngay trên điện thoại, không cần in ấn ký tay mất thời gian như các bên truyền thống ạ.',
    trapQuestionsVi: [
      'Anh/chị có mất nhiều thời gian kiểm tra file Excel cập nhật lịch tàu của FWD mỗi sáng không ạ?'
    ]
  },
  {
    id: 'comp_itl_corp',
    name: 'ITL Corp (Indo-Trans Logistics)',
    legalName: 'Công ty Cổ phần Giao nhận Kho vận Ngoại thương (ITL)',
    brandName: 'ITL Corp',
    code: 'ITL_CORP',
    tier: 'TOP_LOCAL_FORWARDER',
    headquarters: 'TP. Hồ Chí Minh & Hệ thống phân phối Đông Dương',
    establishedYear: 1999,
    employeeCount: '2,500+ nhân sự',
    website: 'itlvn.com',
    marketShareEstimate: 'Top 1 doanh nghiệp Logistics tư nhân lớn nhất Việt Nam (VNR500)',
    strongLanes: [
      'Đại lý tổng đại lý hàng không (GSA) cho hơn 20 hãng hàng không quốc tế',
      'Vận tải đường thủy nội địa sà lan (Barge) kết nối Cát Lái - Cái Mép - Đồng bằng sông Cửu Long',
      'Chuỗi cung ứng lạnh và Kho thương mại điện tử E-logistics'
    ],
    typicalDiscountPercent: 2,
    pricePositioning: 'STANDARD',
    localChargesRating: 'MODERATE',
    strengths: [
      'Hệ sinh thái Logistics khổng lồ: Sở hữu cổ phần lớn tại Sotrans, Cảng cạn ICD, đội sà lan sông',
      'Đại lý hàng không (GSA) lớn nhất Việt Nam, nắm giữ slot tải bay của nhiều hãng lớn',
      'Năng lực tài chính và quy mô tài sản hàng đầu'
    ],
    weaknesses: [
      'Tập trung nguồn lực vào các khách hàng lớn và hợp đồng chuỗi (Contract Logistics) triệu USD',
      'Khách hàng vừa và nhỏ thường bị phân công cho các nhân viên mới vào nghề chăm sóc, chất lượng tư vấn không đều'
    ],
    swotAnalysis: {
      strengths: ['Hệ sinh thái tích hợp từ Cảng, Kho, Sà lan đến Máy bay', 'Tổng đại lý hàng không GSA số 1'],
      weaknesses: ['Dịch vụ khách hàng cho SME kém ưu tiên', 'Quy trình nội bộ nhiều phòng ban liên đới'],
      opportunities: ['Tập trung vào khách hàng SME cần tư vấn chiến lược chuyên sâu và chăm sóc đặc biệt'],
      threats: ['Tiềm lực tài chính và khả năng cho nợ gối đầu dài hạn của ITL']
    },
    carrierAlliances: ['Thai Airways Cargo', 'Qatar Airways Cargo', 'Etihad Cargo', 'Vietnam Airlines'],
    winningCounterTactics: [
      'Nhấn mạnh vào cam kết "Khách hàng là ưu tiên số 1" của BOGI Logistics: Được chăm sóc bởi đội ngũ chuyên gia giàu kinh nghiệm trên 8 năm',
      'Báo giá cạnh tranh trực tiếp nhờ không phải chịu chi phí vận hành bộ máy khổng lồ như các tập đoàn lớn'
    ],
    killPitchVi: 'ITL là tập đoàn rất lớn nên họ ưu tiên toàn bộ nguồn lực cho các hợp đồng FDI hàng chục triệu đô. Khách hàng xuất nhập khẩu quy mô vừa và nhỏ thường không nhận được sự hỗ trợ kịp thời. Tại BOGI Logistics, mỗi lô hàng của anh/chị đều được chăm chút kỹ lưỡng và hỗ trợ tối đa 24/7.',
    zaloScriptVi: 'Em chào Anh/Chị, BOGI Logistics xin gửi mức giá tối ưu cho tuyến hàng này. Bên em cam kết tư vấn kỹ thuật đóng gói và thủ tục CO form E/AK/D trọn gói, giải đáp thắc mắc ngay lập tức không để anh/chị phải chờ đợi ạ.',
    trapQuestionsVi: [
      'Hiện tại khi cần tư vấn các vướng mắc về mã HS Code hoặc chứng nhận xuất xứ, FWD hiện tại có cử chuyên viên giải đáp ngay cho bên mình không ạ?'
    ]
  },
  {
    id: 'comp_sotrans',
    name: 'Sotrans (South Logistics JSC)',
    legalName: 'Công ty Cổ phần Kho vận Miền Nam',
    brandName: 'Sotrans',
    code: 'SOTRANS',
    tier: 'TOP_LOCAL_FORWARDER',
    headquarters: 'TP. Hồ Chí Minh & Hệ thống Cảng ICD Sotrans Thủ Đức',
    establishedYear: 1975,
    employeeCount: '1,500+ nhân sự',
    website: 'sotrans.com.vn',
    marketShareEstimate: 'Top đầu mảng Cảng cạn ICD, kho ngoại quan và đại lý hải quan tại Miền Nam',
    strongLanes: [
      'Dịch vụ Cảng cạn ICD, bãi nâng hạ vỏ container tại TP.HCM & Bình Dương',
      'Khai thuê hải quan chuyên nghiệp và vận tải hàng siêu trường siêu trọng (Heavy Lift)',
      'Vận chuyển nội địa Bắc - Nam bằng đường biển và đường bộ'
    ],
    typicalDiscountPercent: 1,
    pricePositioning: 'STANDARD',
    localChargesRating: 'COMPETITIVE',
    strengths: [
      'Lịch sử 50 năm ngành kho vận, có hạ tầng cảng cạn ICD riêng giúp giảm chi phí lưu bãi hạ bãi',
      'Mối quan hệ chặt chẽ với cơ quan Hải quan và các đơn vị cảng biển truyền thống'
    ],
    weaknesses: [
      'Mảng Forwarding cước biển quốc tế đường dài (Deep Sea đi Mỹ/Âu) chưa phải là mũi nhọn xuất sắc nhất',
      'Phong cách làm việc mang tính truyền thống, quy trình số hóa chứng từ còn chậm'
    ],
    swotAnalysis: {
      strengths: ['Hạ tầng bãi ICD Thủ Đức', 'Quan hệ hải quan lâu năm', 'Vận tải nội địa mạnh'],
      weaknesses: ['Cước biển quốc tế tuyến xa không nổi bật', 'Chuyển đổi số chậm'],
      opportunities: ['Chào giá cước biển quốc tế tốt hơn và công cụ số hóa hiện đại'],
      threats: ['Khách hàng có thói quen hạ bãi tại ICD Sotrans']
    },
    carrierAlliances: ['MSC', 'CMA CGM', 'Cosco', 'Hải An Line'],
    winningCounterTactics: [
      'Kết hợp linh hoạt: Vẫn có thể tận dụng hạ bãi tại Sotrans nhưng phần cước biển và thủ tục quốc tế do BOGI Logistics đảm nhiệm với mức giá cước tốt hơn 10%-15%',
      'Cung cấp hóa đơn và chứng từ điện tử đồng bộ tức thì'
    ],
    killPitchVi: 'Sotrans rất mạnh về kho bãi và bãi ICD nội địa, nhưng về cước biển quốc tế tuyến xa, họ thường phải mua lại từ các đại lý cấp 1. BOGI Logistics làm việc trực tiếp với hãng tàu nên giá cước biển luôn rẻ hơn từ $50-$100/cont và hỗ trợ theo dõi hành trình trực tuyến.',
    zaloScriptVi: 'Dạ chào Anh/Chị, BOGI Logistics gửi báo giá cước biển quốc tế tuyến này. Bên em kết nối trực tiếp booking hãng tàu, giá cước tiết kiệm hơn $80/cont so với các đơn vị truyền thống ạ.',
    trapQuestionsVi: [
      'Bên mình có so sánh giá cước biển quốc tế của các bên chuyên tuyến biển với đơn vị thuần kho bãi chưa ạ?'
    ]
  },
  {
    id: 'comp_gemadept',
    name: 'Gemadept Logistics',
    legalName: 'Công ty Cổ phần Gemadept',
    brandName: 'Gemadept',
    code: 'GEMADEPT',
    tier: 'TOP_LOCAL_FORWARDER',
    headquarters: 'TP. Hồ Chí Minh & Hệ thống Cảng Gemalink Cái Mép, Nam Đình Vũ Hải Phòng',
    establishedYear: 1990,
    employeeCount: '2,000+ nhân sự',
    website: 'gemadept.com.vn',
    marketShareEstimate: 'Ông lớn cảng biển và Logistics hàng đầu Việt Nam',
    strongLanes: [
      'Khai thác Cảng nước sâu Gemalink (Cái Mép) và cụm cảng Nam Đình Vũ (Hải Phòng)',
      'Vận tải feeder đường sông kết nối các cảng biển và khu công nghiệp lớn',
      'Dịch vụ kho lạnh công nghiệp quy mô lớn tại KCN Sóng Thần'
    ],
    typicalDiscountPercent: 3,
    pricePositioning: 'STANDARD',
    localChargesRating: 'MODERATE',
    strengths: [
      'Sở hữu cảng nước sâu đón được siêu tàu mẹ đi thẳng Mỹ/Âu không cần trung chuyển',
      'Đội tàu feeder sông biển hùng hậu, chủ động tuyệt đối về lịch trình hạ bãi và bốc dỡ'
    ],
    weaknesses: [
      'Chi nhánh Forwarding thuần túy đôi khi bị bó buộc vào các dịch vụ nội bộ của hệ sinh thái Gemadept',
      'Ít linh hoạt khi khách hàng muốn đi các hãng tàu không ghé cảng của Gemadept'
    ],
    swotAnalysis: {
      strengths: ['Sở hữu cảng nước sâu Gemalink và Nam Đình Vũ', 'Hạ tầng khép kín'],
      weaknesses: ['Tính trung lập bị hạn chế do ưu tiên cảng nhà'],
      opportunities: ['Cung cấp cho khách hàng sự linh hoạt lựa chọn tất cả các hãng tàu và cụm cảng Cát Lái/SP-PSA/TCIT'],
      threats: ['Lợi thế vượt trội của Gemadept khi tàu ghé trực tiếp Gemalink']
    },
    carrierAlliances: ['CMA CGM', 'Cosco', 'OOCL', 'Evergreen'],
    winningCounterTactics: [
      'Định vị BOGI Logistics là đối tác tư vấn trung lập (Neutral Forwarder): Không bị ràng buộc vào bất kỳ cảng nào, luôn chọn hãng tàu có giờ cắt máng (Closing Time) và lịch trình phù hợp nhất với tiến độ đóng hàng của khách'
    ],
    killPitchVi: 'Gemadept thường ưu tiên xếp hàng vào các hãng tàu ghé cảng của họ để tối ưu hạ tầng nội bộ. BOGI Logistics hoàn toàn độc lập, chúng em lựa chọn giữa Maersk, ONE, Evergreen tùy theo tàu nào có thời gian chạy nhanh nhất và chi phí tốt nhất cho anh/chị.',
    zaloScriptVi: 'Dạ em chào Anh/Chị, BOGI Logistics xin gửi lịch tàu so sánh giữa 3 hãng tàu khác nhau để anh/chị tự do lựa chọn khung giờ đóng hàng thuận tiện nhất ạ.',
    trapQuestionsVi: [
      'Lô hàng của bên mình có yêu cầu giờ cắt máng muộn để kịp tiến độ sản xuất của xưởng không ạ?'
    ]
  },
  {
    id: 'comp_dolphin',
    name: 'Dolphin Sea Air Services',
    legalName: 'Công ty Cổ phần Dịch vụ Hàng hải Dolphin (Dolphin Sea Air)',
    brandName: 'Dolphin Sea Air',
    code: 'DOLPHIN_SEA_AIR',
    tier: 'TOP_LOCAL_FORWARDER',
    headquarters: 'Hà Nội & Chi nhánh Hải Phòng, TP. Hồ Chí Minh, Đà Nẵng',
    establishedYear: 2008,
    employeeCount: '400+ nhân sự',
    website: 'dolphinseaair.com',
    marketShareEstimate: 'Rất mạnh tại thị trường Miền Bắc (Hải Phòng - Hà Nội)',
    strongLanes: [
      'Tuyến xuất khẩu từ Hải Phòng đi Mỹ & Châu Âu',
      'Hàng LCL ghép cont đường biển và vận chuyển Air từ sân bay Nội Bài (HAN)',
      'Hàng linh kiện điện tử và phụ tùng ô tô khu vực phía Bắc'
    ],
    typicalDiscountPercent: -3,
    pricePositioning: 'STANDARD',
    localChargesRating: 'COMPETITIVE',
    strengths: [
      'Rất năng động tại khu vực Miền Bắc, chính sách giá cạnh tranh',
      'Đội ngũ sales trẻ, nhiệt huyết, chăm sóc khách hàng nhiệt tình'
    ],
    weaknesses: [
      'Tại thị trường Miền Nam (TP.HCM, Đồng Nai, Bình Dương), độ nhận diện thương hiệu và hạ tầng kho bãi chưa mạnh bằng Miền Bắc',
      'Công nghệ tra cứu đơn hàng chưa tự động hóa hoàn toàn'
    ],
    swotAnalysis: {
      strengths: ['Thế mạnh vượt trội tại cụm Hải Phòng - Hà Nội', 'Giá cước năng động'],
      weaknesses: ['Độ phủ thị trường Miền Nam chưa sâu'],
      opportunities: ['Khai thác các doanh nghiệp có hàng xuất từ cảng Cát Lái/Cái Mép với dịch vụ vượt trội của BOGI'],
      threats: ['Cạnh tranh giá rất gắt tại khu công nghiệp Bắc Ninh, Hải Dương, Hải Phòng']
    },
    carrierAlliances: ['ONE', 'Cosco', 'Yang Ming', 'Evergreen', 'Korean Air'],
    winningCounterTactics: [
      'Tại Miền Nam: Chứng minh BOGI Logistics có hạ tầng xe đầu kéo và nhân sự hiện diện trực tiếp tại Cát Lái và Cái Mép 24/7',
      'Cung cấp giải pháp số hóa toàn diện từ báo giá đến theo dõi trạng thái container'
    ],
    killPitchVi: 'Dolphin Sea Air rất mạnh tại Hải Phòng, nhưng với các lô hàng xuất từ Cát Lái hay Cái Mép, BOGI Logistics có đội xe đầu kéo và hiện trường túc trực xử lý ngay trong 10 phút, cam kết không bao giờ trễ giờ hạ bãi.',
    zaloScriptVi: 'Dạ em chào Anh/Chị, BOGI Logistics có đội xe vận chuyển nội địa tại TP.HCM/Bình Dương sẵn sàng điều xe trong 2 giờ, giá trọn gói cước biển + trucking rất ưu đãi ạ.',
    trapQuestionsVi: [
      'Lô hàng của mình đóng tại kho Bình Dương/Đồng Nai hay ở đâu ạ? Bên em có sẵn xe hỗ trợ ngay trong ngày ạ.'
    ]
  },

  // =========================================================================
  // NHÓM 3: HÃNG TÀU BÁN TRỰC TIẾP (Direct Shipping Lines & Spot Web)
  // =========================================================================
  {
    id: 'comp_maersk_spot',
    name: 'Maersk Spot Direct',
    legalName: 'Hãng tàu A.P. Moller - Maersk (Bán trực tiếp qua Website / App)',
    brandName: 'Maersk Spot',
    code: 'MAERSK_SPOT',
    tier: 'DIRECT_CARRIER',
    headquarters: 'Copenhagen, Đan Mạch & Chi nhánh Maersk Việt Nam',
    establishedYear: 1904,
    employeeCount: '100,000+ nhân sự toàn cầu',
    website: 'maersk.com',
    marketShareEstimate: 'Hãng tàu biển hàng đầu thế giới, tiên phong bán cước trực tuyến',
    strongLanes: [
      'Tuyến xuyên Thái Bình Dương đi Mỹ & Canada',
      'Tuyến Châu Âu và Nam Mỹ',
      'Tuyến Nội Á Intra-Asia (Sealand / MCC cũ)'
    ],
    typicalDiscountPercent: -4, // Thường rẻ hơn 3-5% nếu tự đặt trên web không qua forwarder
    pricePositioning: 'STANDARD',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Đặt chỗ (Booking) tự động 24/7 trên website với giá cố định tại thời điểm đặt',
      'Cam kết xếp hàng lên tàu (Loading Guarantee) nếu chọn gói phí cao'
    ],
    weaknesses: [
      'Phạt hủy booking cực kỳ nặng: Huỷ hoặc đổi ngày bị phạt $300 - $500/cont',
      'Không hỗ trợ khai báo hải quan, kiểm hóa hay trucking nội địa trọn gói',
      'Free Time DEM/DET rất ngắn (chỉ 5-7 ngày), tiền phạt lưu bãi cảng đến lên đến $150-$200/ngày/cont',
      'Không có người hỗ trợ trực tiếp khi có sự cố, mọi giao tiếp đều qua chatbot hoặc ticket hỗ trợ chậm chạp'
    ],
    swotAnalysis: {
      strengths: ['Hệ thống đặt chỗ tự động', 'Thương hiệu hãng tàu uy tín toàn cầu'],
      weaknesses: ['Phạt huỷ cọc nặng nề', 'Free-time ngắn', 'Thiếu hỗ trợ con người 1-1', 'Không làm thủ tục hải quan'],
      opportunities: ['Nhiều khách hàng từng bị Maersk phạt hàng ngàn USD tiền lưu bãi hoặc phạt hủy cont'],
      threats: ['Khách hàng muốn tự bấm web lấy cước vì thấy giá biển hiển thị rẻ']
    },
    carrierAlliances: ['2M Alliance (Maersk + MSC)'],
    winningCounterTactics: [
      'Tặng 14 - 21 ngày Free Time DEM/DET tại cảng đích (Maersk chỉ cho 5-7 ngày, chỉ cần kẹt cảng 3 ngày là tiền phạt quá cước)',
      'Miễn phí hoặc hỗ trợ đổi chuyến tàu linh hoạt khi xưởng đóng hàng chưa kịp mà không bị phạt tiền cọc',
      'Cung cấp dịch vụ Door-to-Door trọn gói từ khâu bốc hàng, kiểm tra hun trùng, làm C/O đến giao tận kho nước ngoài'
    ],
    killPitchVi: 'Mua cước Maersk Spot trên web nhìn qua rẻ hơn $50, nhưng anh/chị phải chịu 3 rủi ro chí mạng: Thứ nhất, nếu hàng đóng trễ 1 ngày bị phạt huỷ cọc $300-$500/cont. Thứ hai, họ chỉ cho 5 ngày free time, nếu kẹt thủ tục bên Mỹ tiền phạt lưu cont lên tới $180/ngày. BOGI Logistics bao trọn gói, tặng 14 ngày free-time và hỗ trợ dời tàu miễn phí.',
    zaloScriptVi: 'Dạ em chào Anh/Chị, đặt Maersk Spot tuy cước biển thấp nhưng rủi ro phạt hủy và tiền lưu cont DEM/DET rất cao. BOGI Logistics xin tặng kèm 14 ngày Free DEM/DET và cam kết hỗ trợ đổi tàu linh hoạt không mất phí phạt ạ.',
    trapQuestionsVi: [
      'Nếu xưởng mình lỡ bị trễ tiến độ đóng hàng 1-2 ngày, bên Maersk có phạt tiền hủy booking của anh/chị không ạ?',
      'Khách mua đầu bên kia có yêu cầu tối thiểu 14 ngày free time tại cảng để thông quan không ạ?'
    ]
  },
  {
    id: 'comp_cma_spoton',
    name: 'CMA CGM SpotOn / MSC Direct',
    legalName: 'Hãng tàu CMA CGM / Mediterranean Shipping Company',
    brandName: 'CMA CGM / MSC',
    code: 'CMA_MSC_DIRECT',
    tier: 'DIRECT_CARRIER',
    headquarters: 'Marseille, Pháp & Geneva, Thụy Sĩ',
    establishedYear: 1978,
    employeeCount: '50,000+ nhân sự',
    website: 'cma-cgm.com',
    marketShareEstimate: 'Top 1 và Top 3 hãng tàu lớn nhất thế giới',
    strongLanes: [
      'Tuyến Châu Âu, Địa Trung Hải, Châu Phi, Nam Mỹ và Bờ Đông Mỹ',
      'Vận chuyển container lạnh hoa quả, thủy sản'
    ],
    typicalDiscountPercent: -3,
    pricePositioning: 'STANDARD',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Mạng lưới tuyến đường biển phủ sóng rộng nhất hành tinh',
      'Nhiều dịch vụ kết nối cảng nhánh và các tuyến ngách Châu Phi/Mỹ Latinh'
    ],
    weaknesses: [
      'Dịch vụ khách hàng trực tiếp rất khó liên lạc qua điện thoại',
      'Tình trạng dời lịch tàu (Blank sailing) hoặc trễ lịch (Delay) diễn ra thường xuyên mà không có thông báo trước kịp thời',
      'Phụ phí phát sinh tại cảng đến cao bất ngờ'
    ],
    swotAnalysis: {
      strengths: ['Tuyến Châu Phi, Địa Trung Hải vô địch', 'Sức chở cont khổng lồ'],
      weaknesses: ['Lịch tàu hay bị delay', 'CSKH hãng tàu phản hồi rất chậm'],
      opportunities: ['Khách hàng bức xúc vì hàng bị trễ tàu mà không biết liên hệ ai để kiểm tra'],
      threats: ['Hãng tàu tự giảm cước biển số lượng lớn để lấp đầy tàu']
    },
    carrierAlliances: ['Ocean Alliance (CMA CGM, Cosco, Evergreen, OOCL)'],
    winningCounterTactics: [
      'Cung cấp thông tin giám sát chủ động: Thông báo trước tình hình delay 48 giờ và đề xuất giải pháp thay thế',
      'Cam kết xử lý nhanh chứng từ B/L điện tử và Surrendered B/L trong vòng 2 giờ sau khi tàu chạy'
    ],
    killPitchVi: 'Làm việc trực tiếp với hãng tàu CMA CGM hay MSC thường gặp cảnh gọi điện thoại không ai bắt máy, email hỏi vị trí tàu thì 2 ngày sau mới trả lời. BOGI Logistics làm việc qua kênh đại lý VIP của hãng, có nhân sự riêng giải quyết sự cố ngay lập tức cho anh/chị.',
    zaloScriptVi: 'Em chào Anh/Chị, BOGI Logistics gửi cập nhật lịch trình tuyến này. Bên em có đường dây nóng ưu tiên với hãng tàu, đảm bảo cấp B/L nháp trong 2 giờ sau khi gửi SI ạ.',
    trapQuestionsVi: [
      'Mỗi lần cần sửa vận đơn hoặc hỏi vị trí tàu từ hãng, bên mình có phải chờ đợi lâu không ạ?'
    ]
  },

  // =========================================================================
  // NHÓM 4: CÁC FORWARDER NGÁCH & CHUYÊN TUYẾN (Niche Specialists)
  // =========================================================================
  {
    id: 'comp_vantage_logistics',
    name: 'Vantage Logistics Corp',
    legalName: 'Công ty Cổ phần Vantage Logistics',
    brandName: 'Vantage Logistics',
    code: 'VANTAGE_LOG',
    tier: 'NICHE_SPECIALIST',
    headquarters: 'TP. Hồ Chí Minh & Chi nhánh Hải Phòng, Hà Nội, Đà Nẵng, Quy Nhơn',
    establishedYear: 2007,
    employeeCount: '300+ nhân sự',
    website: 'vantage-logistics.com.vn',
    marketShareEstimate: 'Chuyên gia hàng đầu mảng Hàng Dự Án (Project Cargo) và Nông sản lạnh',
    strongLanes: [
      'Hàng siêu trường siêu trọng, thiết bị điện gió, công trình công nghiệp',
      'Hàng nông sản xuất khẩu (Thanh long, xoài, chuối, thủy sản đông lạnh)',
      'Tuyến Châu Á và Trung Đông'
    ],
    typicalDiscountPercent: 0,
    pricePositioning: 'STANDARD',
    localChargesRating: 'MODERATE',
    strengths: [
      'Kinh nghiệm kỹ thuật xuất sắc về khảo sát tuyến đường và chằng buộc (Lashing) hàng quá khổ quá tải',
      'Am hiểu kỹ thuật bảo quản container lạnh'
    ],
    weaknesses: [
      'Cước hàng bách hóa thông thường (General Cargo FCL tiêu chuẩn) không có ưu thế đặc biệt về giá',
      'Mạng lưới đại lý tại Bắc Mỹ phổ thông không nhiều bằng các FWD chuyên tuyến Mỹ'
    ],
    swotAnalysis: {
      strengths: ['Hàng dự án điện gió & máy móc nặng', 'Hàng nông sản cont lạnh'],
      weaknesses: ['Hàng cont khô tiêu chuẩn không có giá đột phá'],
      opportunities: ['Tập trung chào giá các lô hàng FCL bách hóa và hàng dệt may, gỗ nội thất'],
      threats: ['Năng lực kỹ thuật của Vantage khi đấu thầu các dự án nhà xưởng']
    },
    carrierAlliances: ['AAL Shipping', 'Cosco Specialized', 'Evergreen', 'ONE'],
    winningCounterTactics: [
      'Với hàng bách hóa (Dry Cargo), nội thất, dệt may: Chào giá BOGI Logistics thấp hơn 5%-8% và tốc độ cấp vỏ cont nhanh hơn'
    ],
    killPitchVi: 'Vantage rất mạnh về cẩu hàng dự án và máy móc quá khổ, nhưng với hàng container bách hóa thông thường, chi phí của họ không tối ưu. BOGI Logistics chuyên biệt cho hàng xuất khẩu FCL với biểu cước cạnh tranh nhất thị trường.',
    zaloScriptVi: 'Dạ em chào Anh/Chị, với mặt hàng container thông thường này, BOGI Logistics có giá cước hợp đồng tốt hơn $60/cont và hỗ trợ cấp vỏ cont sạch đạt tiêu chuẩn xuất khẩu ạ.',
    trapQuestionsVi: [
      'Lô hàng của bên mình là hàng container tiêu chuẩn hay hàng máy móc quá khổ cần xe cẩu đặc biệt ạ?'
    ]
  },
  {
    id: 'comp_real_logistics',
    name: 'Real Logistics Vietnam',
    legalName: 'Công ty TNHH Tiếp Vận Thực (Real Logistics)',
    brandName: 'Real Logistics',
    code: 'REAL_LOGISTICS',
    tier: 'NICHE_SPECIALIST',
    headquarters: 'Hà Nội & Chi nhánh TP. Hồ Chí Minh, Hải Phòng, Quảng Ninh',
    establishedYear: 2012,
    employeeCount: '250+ nhân sự',
    website: 'reallogistics.vn',
    marketShareEstimate: 'Chuyên gia dịch vụ Thủ tục Hải quan và Giấy phép chuyên ngành tại VN',
    strongLanes: [
      'Thủ tục Hải quan hàng nhập khẩu khó: Hóa chất, máy móc cũ, mỹ phẩm, thực phẩm',
      'Tuyến nhập khẩu từ Trung Quốc về Việt Nam (Đường bộ, Đường biển, Air)',
      'Hàng kiểm tra chất lượng nhà nước và xin giấy phép Bộ Công Thương, Bộ Y Tế'
    ],
    typicalDiscountPercent: 2,
    pricePositioning: 'STANDARD',
    localChargesRating: 'MODERATE',
    strengths: [
      'Đội ngũ chuyên viên tư vấn thủ tục Hải quan rất sắc bén, nắm vững biểu thuế và chính sách mặt hàng',
      'Nhiều nội dung chia sẻ kiến thức hữu ích trên cộng đồng Logistics'
    ],
    weaknesses: [
      'Quy mô sản lượng cước đường biển xuất khẩu đi Mỹ và Châu Âu chưa lớn, giá cước freight biển còn phụ thuộc vào co-loader'
    ],
    swotAnalysis: {
      strengths: ['Thủ tục hải quan nhập khẩu chuyên sâu', 'Giấy phép chuyên ngành'],
      weaknesses: ['Sản lượng cước xuất khẩu tuyến xa còn hạn chế'],
      opportunities: ['Tấn công vào mảng cước biển xuất khẩu FCL chiều đi Mỹ/Âu nơi BOGI Logistics chiếm ưu thế lớn'],
      threats: ['Khách hàng cần xử lý các thủ tục hải quan phức tạp']
    },
    carrierAlliances: ['SITC', 'Sinokor', 'Wanhai', 'Cosco'],
    winningCounterTactics: [
      'Chứng minh BOGI Logistics cũng có đội ngũ chuyên gia Hải quan trên 10 năm kinh nghiệm nhưng có thêm ưu thế vượt trội về giá cước vận tải đường biển quốc tế'
    ],
    killPitchVi: 'Real Logistics rất giỏi về thủ tục thông quan hàng nhập, nhưng về giá cước biển xuất khẩu đi các thị trường lớn thì họ không có hợp đồng trực tiếp lớn với hãng tàu. BOGI Logistics kết hợp cả hai: Giá cước biển cạnh tranh trực tiếp và đội ngũ hải quan hỗ trợ tận nơi.',
    zaloScriptVi: 'Em chào Anh/Chị, BOGI Logistics gửi phương án trọn gói: vừa tối ưu giá cước biển $100/cont, vừa hỗ trợ kiểm tra mã HS Code và hồ sơ kiểm định an toàn trước khi tàu cập cảng ạ.',
    trapQuestionsVi: [
      'Lô hàng này của bên mình chỉ cần làm hải quan hay cần ghép chung với cước tàu quốc tế để có giá trọn gói tốt nhất ạ?'
    ]
  },

  // =========================================================================
  // NHÓM 5: NHÓM FORWARDER GIÁ RẺ & PHÁ GIÁ (Budget / Price Fighters)
  // =========================================================================
  {
    id: 'comp_budget_price_fighter',
    name: 'Nhóm Forwarder Phá Giá (Local Budget / Price Fighters)',
    legalName: 'Các công ty FWD nhỏ lẻ cạnh tranh bằng cắt máu giảm giá cước',
    brandName: 'Budget Forwarders',
    code: 'BUDGET_FWD',
    tier: 'BUDGET_FORWARDER',
    headquarters: 'Các văn phòng nhỏ tại TP.HCM, Hải Phòng',
    establishedYear: 2020,
    employeeCount: 'Dưới 20 nhân sự',
    website: 'N/A',
    marketShareEstimate: 'Phân khúc khách hàng siêu nhạy cảm về giá',
    strongLanes: [
      'Tất cả các tuyến phổ thông hàng khô FCL'
    ],
    typicalDiscountPercent: -8, // Chào rẻ hơn thị trường $50 - $100/cont để giật khách
    pricePositioning: 'BUDGET_AGGRESSIVE',
    localChargesRating: 'EXPENSIVE',
    strengths: [
      'Sẵn sàng cắt giảm toàn bộ lợi nhuận cước biển (Ocean Freight) để lấy hợp đồng bước đầu'
    ],
    weaknesses: [
      'Bẫy phụ phí ẩn (Hidden fees): Bù lại giá cước rẻ bằng cách chèn hàng loạt phụ phí địa phương vô lý (Handling fee, Agency fee, Telex fee cắt cổ)',
      'Phụ phí đầu đích cắt cổ khách mua: Khách mua nước ngoài phản ánh gay gắt vì bị thu tiền D/O đầu đến cao gấp 3 lần thị trường',
      'Dễ bị rớt cont (Roll container) vào mùa cao điểm vì không có hợp đồng cam kết chỗ với hãng tàu',
      'Năng lực tài chính yếu, không thể bồi thường khi hàng hóa phát sinh sự cố hư hỏng hoặc mất mát'
    ],
    swotAnalysis: {
      strengths: ['Giá cước biển câu khách cực thấp'],
      weaknesses: ['Phụ phí ẩn dày đặc', 'Dịch vụ kém', 'Dễ bị rớt tàu cao điểm', 'Không có bảo hiểm trách nhiệm'],
      opportunities: ['Cảnh báo khách hàng về "Bẫy cước rẻ - Phụ phí đắt" và rủi ro mất khách hàng quốc tế'],
      threats: ['Khách hàng chỉ nhìn vào con số cước biển ban đầu mà bỏ qua tổng chi phí All-in']
    },
    carrierAlliances: ['Không có hợp đồng trực tiếp, mua lại qua trung gian'],
    winningCounterTactics: [
      'Cảnh báo khách hàng về "Bẫy cước rẻ nhưng phụ phí ẩn ở cảng đến": Yêu cầu khách hàng đối chiếu biểu phí D/O và Local Charges tại cảng đích của đối thủ',
      'Cam kết bằng văn bản: "Báo giá All-in trọn gói 100% không phát sinh bất kỳ khoản phí ngoài nào"',
      'Cam kết giữ chỗ bảo đảm (Space Guarantee) vào mùa cao điểm'
    ],
    killPitchVi: 'Các bên phá giá thường chào cước biển rẻ hơn $50-$70 để câu khách, nhưng khi hàng đến cảng đích, họ thu phí D/O và phí chứng từ của đối tác mua hàng ở nước ngoài lên đến $400-$500/cont. Khách mua nước ngoài sẽ rất tức giận và có thể hủy luôn hợp đồng mua hàng với anh/chị. BOGI Logistics cam kết biểu phí chuẩn quốc tế minh bạch, bảo vệ uy tín cho anh/chị với đối tác.',
    zaloScriptVi: 'Dạ Anh/Chị lưu ý giúp em: cước biển thấp bất thường thường đi kèm bẫy phụ phí thu thêm ở cảng đến. BOGI Logistics cam kết văn bản All-in không phát sinh, đảm bảo đối tác nước ngoài của anh/chị nhận hàng êm đẹp không bị phụ thu vô lý ạ.',
    trapQuestionsVi: [
      'Đối thủ báo cước rẻ có cam kết bằng văn bản là đối tác mua hàng ở đầu bên kia không bị thu thêm phụ phí Handling/Agency bất thường không ạ?',
      'Vào đợt cao điểm thiếu vỏ cont, bên họ có cam kết giữ chỗ 100% không bị rớt tàu không ạ?'
    ]
  }
];
