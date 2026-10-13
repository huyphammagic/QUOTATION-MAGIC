import { QuoteData, LineItem } from '../../types/logistics';
import { 
  MultiOptionItem, 
  MultiOptionQuotationPackage, 
  MultiOptionTier, 
  MultiOptionPitchDecks 
} from '../../types/multiOptionQuote';

const LOCAL_STORAGE_KEY = 'bogi_multi_option_quotation_packages';

export class MultiOptionService {

  /**
   * Tính toán lại tổng chi phí và biên lợi nhuận cho một option
   */
  public static calculateOptionFinancials(
    items: LineItem[], 
    exchangeRate: number
  ): {
    oceanAirFreightUsd: number;
    localChargesVnd: number;
    totalConvertedUsd: number;
    totalConvertedVnd: number;
    estimatedCostUsd: number;
    estimatedProfitUsd: number;
    estimatedMarginPercent: number;
  } {
    let oceanAirFreightUsd = 0;
    let localChargesVnd = 0;
    let estimatedCostUsd = 0;

    items.forEach(item => {
      const sellTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const costTotal = (item.costPrice || (item.unitPrice ? item.unitPrice * 0.82 : 0)) * (item.quantity || 1);

      if (item.currency === 'USD') {
        if (item.category === 'FREIGHT' || item.name.toLowerCase().includes('freight') || item.name.toLowerCase().includes('cước')) {
          oceanAirFreightUsd += sellTotal;
        } else {
          oceanAirFreightUsd += sellTotal;
        }
        estimatedCostUsd += costTotal;
      } else {
        localChargesVnd += sellTotal;
        estimatedCostUsd += costTotal / (exchangeRate || 25400);
      }
    });

    const localChargesUsd = localChargesVnd / (exchangeRate || 25400);
    const totalConvertedUsd = oceanAirFreightUsd + localChargesUsd;
    const totalConvertedVnd = (oceanAirFreightUsd * (exchangeRate || 25400)) + localChargesVnd;

    const estimatedProfitUsd = Math.max(0, totalConvertedUsd - estimatedCostUsd);
    const estimatedMarginPercent = totalConvertedUsd > 0 
      ? Math.round((estimatedProfitUsd / totalConvertedUsd) * 100 * 10) / 10 
      : 15;

    return {
      oceanAirFreightUsd: Math.round(oceanAirFreightUsd * 100) / 100,
      localChargesVnd: Math.round(localChargesVnd),
      totalConvertedUsd: Math.round(totalConvertedUsd * 100) / 100,
      totalConvertedVnd: Math.round(totalConvertedVnd),
      estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
      estimatedProfitUsd: Math.round(estimatedProfitUsd * 100) / 100,
      estimatedMarginPercent
    };
  }

  /**
   * Tạo tự động bộ 3 phương án Good - Better - Best từ 1 Báo giá hiện tại
   */
  public static generateMultiOptionPackageFromQuote(quote: QuoteData): MultiOptionQuotationPackage {
    const rate = quote.exchangeRate || 25400;
    const pol = quote.shipment?.pol || 'Cảng Cát Lái, TP.HCM (VNCLI)';
    const pod = quote.shipment?.pod || 'Singapore Port (SGSIN)';
    const mode = quote.shipment?.mode || 'Đường biển (Sea Freight FCL)';
    const isAir = mode.toLowerCase().includes('air') || mode.toLowerCase().includes('hàng không');

    const customerName = quote.customer?.companyName || quote.customer?.name || 'Quý Khách Hàng';
    const cargoDesc = `${quote.shipment?.commodity || 'Hàng hóa thông thường'} (${quote.shipment?.weight || '1,500'} kg / ${quote.shipment?.volume || '5.5'} CBM)`;

    // Tách items gốc
    const baseItems = quote.items && quote.items.length > 0 ? quote.items : [
      {
        id: 'item-freight-default',
        name: isAir ? 'Air Freight Priority (Cước hàng không)' : 'Ocean Freight FCL (Cước biển quốc tế)',
        description: `${pol} -> ${pod}`,
        unitPrice: isAir ? 3.5 : 850,
        currency: 'USD',
        unit: isAir ? 'KG' : 'CONT',
        quantity: isAir ? 500 : 1,
        vatRate: 0,
        category: 'FREIGHT',
        costPrice: isAir ? 2.9 : 720
      },
      {
        id: 'item-thc-default',
        name: 'Terminal Handling Charge (Phí THC cảng đi)',
        description: 'Phí xếp dỡ tại cảng đầu xuất',
        unitPrice: 2800000,
        currency: 'VND',
        unit: 'LÔ',
        quantity: 1,
        vatRate: 5.26,
        category: 'LOCAL_PORT',
        costPrice: 2600000
      },
      {
        id: 'item-doc-default',
        name: 'Documentation & Bill of Lading Fee (Phí chứng từ & Vận đơn)',
        description: 'Phí phát hành B/L và truyền manifest',
        unitPrice: 1100000,
        currency: 'VND',
        unit: 'SET',
        quantity: 1,
        vatRate: 8,
        category: 'DOCUMENTATION',
        costPrice: 850000
      }
    ];

    // ==========================================
    // 1. OPTION 1: TIẾT KIỆM (ECONOMY)
    // Giảm ~7% cước chính, thời gian transit +3~5 ngày, 7 ngày free time
    // ==========================================
    const economyItems: LineItem[] = baseItems.map(item => {
      const copy = { ...item, id: `eco-${item.id}` };
      if (copy.category === 'FREIGHT' || copy.currency === 'USD') {
        copy.unitPrice = Math.round((copy.unitPrice * 0.93) * 100) / 100;
        copy.costPrice = copy.costPrice ? Math.round((copy.costPrice * 0.93) * 100) / 100 : copy.unitPrice * 0.85;
      }
      return copy;
    });
    const ecoFin = this.calculateOptionFinancials(economyItems, rate);

    const optionEconomy: MultiOptionItem = {
      id: 'opt-economy',
      tier: 'ECONOMY',
      tierNameVi: 'TIẾT KIỆM (ECONOMY)',
      tierNameEn: 'Economy Budget Option',
      tagline: 'Cước phí tối ưu nhất thị trường - Phù hợp hàng hóa kế hoạch không gấp',
      carrier: isAir ? 'China Southern / AirAsia Cargo (Chuyển tải 1 trạm)' : 'Wan Hai Lines / SITC / Co-Loader Feeder',
      serviceType: 'Transshipment 1 Hub (Chuyển tải 1 cảng trung chuyển)',
      vesselFlight: isAir ? 'CZ-3069 / AK-522' : 'WAN HAI 312 / SITC HOCHIMINH',
      routing: `${pol} → Singapore / Klang (Hub) → ${pod}`,
      transitDays: isAir ? 4 : 18,
      transitTimeText: isAir ? '3 - 5 Ngày' : '18 - 21 Ngày',
      departureSchedule: 'Thứ 6 hàng tuần (ETD Fri)',
      closingCutoff: 'Thứ 4, 12:00 CY Cut-off',
      freeTimeDemDet: '7 Ngày Dem/Det riêng rẽ',
      freeTimeDays: 7,
      spaceGuarantee: 'Tiêu chuẩn (Subject to Space Availability)',
      items: economyItems,
      ...ecoFin,
      includedServices: [
        'Vận chuyển chặng quốc tế tiêu chuẩn',
        'Phát hành Vận đơn điện tử (Sea Waybill / Surrendered B/L)',
        'Cập nhật tiến độ hành trình theo mốc cảng (Port Milestone)',
        'Hỗ trợ khai báo manifest tiêu chuẩn'
      ],
      valueAddHighlights: [
        'Chi phí cước thấp nhất giúp doanh nghiệp tối ưu giá vốn',
        'Lịch tàu cố định cuối tuần thuận tiện xuất xưởng thứ 5',
        'Thích hợp các mặt hàng thông thường không phụ thuộc thời gian'
      ],
      caveats: [
        'Có 1 điểm chuyển tải, transit time có thể dao động 2-3 ngày tùy mật độ cảng hub',
        'Hạn lưu bãi/cont tiêu chuẩn 7 ngày, cần hoàn tất thủ tục thông quan nhanh'
      ],
      bestSuitedFor: 'Doanh nghiệp sản xuất gia công theo kế hoạch sẵn, ngân sách chi phí vận chuyển nghiêm ngặt, có kho bãi tiếp nhận hàng linh hoạt.',
      isRecommended: false,
      rating: {
        costScore: 9.8,
        speedScore: 6.5,
        reliabilityScore: 7.5,
        serviceScore: 7.0
      }
    };

    // ==========================================
    // 2. OPTION 2: CÂN BẰNG / KHUYÊN DÙNG (BALANCED / RECOMMENDED) - SWEET SPOT
    // Dựa trên báo giá gốc, tàu đi thẳng hoặc hãng top tier, 14 ngày free time combined
    // ==========================================
    const balancedItems: LineItem[] = baseItems.map(item => ({ ...item, id: `bal-${item.id}` }));
    const balFin = this.calculateOptionFinancials(balancedItems, rate);

    const optionBalanced: MultiOptionItem = {
      id: 'opt-balanced',
      tier: 'BALANCED',
      tierNameVi: 'CÂN BẰNG / KHUYÊN DÙNG (BEST VALUE)',
      tierNameEn: 'Balanced Optimum (Recommended)',
      tagline: 'Tỷ lệ chốt đơn cao nhất - Lịch trình trực tiếp, 14 ngày Free Time, an tâm trọn vẹn',
      carrier: isAir ? 'Singapore Airlines / Vietnam Airlines (Bay Thẳng)' : 'ONE (Ocean Network Express) / Maersk Line Direct',
      serviceType: 'Direct Service (Tuyến đi thẳng không chuyển tải)',
      vesselFlight: isAir ? 'VN-651 / SQ-178 (Daily Direct)' : 'ONE OLYMPUS V.2602E / MAERSK V.045',
      routing: `${pol} → ${pod} (Direct Express)`,
      transitDays: isAir ? 2 : 13,
      transitTimeText: isAir ? '1 - 2 Ngày' : '12 - 14 Ngày',
      departureSchedule: '2 Chuyến / Tuần (Thứ 3 & Thứ 7 hàng tuần)',
      closingCutoff: 'Thứ 5, 17:00 CY Cut-off',
      freeTimeDemDet: '14 Ngày kết hợp (Combined Dem/Det)',
      freeTimeDays: 14,
      spaceGuarantee: 'Ưu tiên chỗ & Vỏ container sạch đẹp (Preferred Booking)',
      items: balancedItems,
      ...balFin,
      includedServices: [
        'Tuyến vận chuyển đi thẳng (Direct Service) không ghé cảng trung gian',
        'Tặng thêm 7 ngày hạn lưu bãi/cont (Tổng cộng 14 ngày Free Time combined)',
        'Hệ thống Tracking GPS theo dõi vị trí lô hàng trực tuyến 24/7',
        'Miễn phí dịch vụ chỉnh sửa B/L và hỗ trợ truyền chứng từ hải quan khẩn cấp',
        'Bảo hiểm trách nhiệm giao nhận Forwarder an tâm 100%'
      ],
      valueAddHighlights: [
        '★ 84% khách hàng doanh nghiệp tin tưởng lựa chọn phương án này',
        'Hạn lưu cont 14 ngày giúp chủ hàng thảnh thơi thông quan không lo phát sinh phạt Dem/Det',
        'Độ tin cậy lịch tàu đạt 96.5%, giảm thiểu tối đa rủi ro chậm giao hàng cho đối tác nước ngoài'
      ],
      caveats: [
        'Cần duyệt và gửi SI (Shipping Instruction) trước giờ cut-off 24 tiếng'
      ],
      bestSuitedFor: 'Các doanh nghiệp xuất nhập khẩu định kỳ, cần đảm bảo thời gian giao hàng đúng cam kết hợp đồng mua bán quốc tế mà vẫn tối ưu chi phí hiệu quả.',
      isRecommended: true,
      rating: {
        costScore: 8.5,
        speedScore: 9.0,
        reliabilityScore: 9.5,
        serviceScore: 9.2
      }
    };

    // ==========================================
    // 3. OPTION 3: HỎA TỐC / CAO CẤP (PREMIUM EXPRESS)
    // Tăng ~12% cước chính, slot cam kết 100% không rớt, 21 ngày free time, bảo hiểm hàng hóa
    // ==========================================
    const premiumItems: LineItem[] = baseItems.map(item => {
      const copy = { ...item, id: `prem-${item.id}` };
      if (copy.category === 'FREIGHT' || copy.currency === 'USD') {
        copy.unitPrice = Math.round((copy.unitPrice * 1.14) * 100) / 100;
        copy.costPrice = copy.costPrice ? Math.round((copy.costPrice * 1.08) * 100) / 100 : copy.unitPrice * 0.78;
      }
      return copy;
    });
    // Thêm dịch vụ bảo hiểm & ưu tiên thông quan VIP
    premiumItems.push({
      id: 'prem-vip-insurance',
      name: 'Bảo hiểm hàng hóa vận tải quốc tế (All-Risk ICC A) & Dedicated VIP Desk',
      description: 'Bảo hiểm toàn diện 110% giá trị CIF + Quản lý đơn hàng 24/7',
      unitPrice: 50,
      currency: 'USD',
      unit: 'LÔ',
      quantity: 1,
      vatRate: 0,
      category: 'INSURANCE',
      costPrice: 30
    });
    const premFin = this.calculateOptionFinancials(premiumItems, rate);

    const optionPremium: MultiOptionItem = {
      id: 'opt-premium',
      tier: 'PREMIUM',
      tierNameVi: 'HỎA TỐC / CAO CẤP (PREMIUM EXPRESS)',
      tierNameEn: 'Guaranteed Priority Express',
      tagline: 'Cam kết chỗ 100% không rớt hàng mùa cao điểm - Tốc độ nhanh nhất & 21 ngày Free Time',
      carrier: isAir ? 'Cathay Cargo / Emirates SkyCargo / FedEx Express' : 'ZIM eCommerce Express / Matson Express (Dedicated Priority)',
      serviceType: 'Dedicated Priority Express (Đặc quyền bốc dỡ ưu tiên tại cảng đích)',
      vesselFlight: isAir ? 'EK-9921 / CX-004 (Priority Flight)' : 'ZIM FALCON V.010E (Express Slot)',
      routing: `${pol} → ${pod} (Express Direct Route)`,
      transitDays: isAir ? 1 : 9,
      transitTimeText: isAir ? 'Trong ngày - 24 Giờ' : '9 - 11 Ngày',
      departureSchedule: '3 Chuyến / Tuần hoặc Khởi hành hàng ngày',
      closingCutoff: 'Linh hoạt hỗ trợ muộn (Late CY Cut-off hỗ trợ trước 4 tiếng)',
      freeTimeDemDet: '21 Ngày kết hợp VIP (Maximum Free Time)',
      freeTimeDays: 21,
      spaceGuarantee: '100% Cam kết Slot & Vỏ cont loại A sạch đẹp (No-Roll Guarantee)',
      items: premiumItems,
      ...premFin,
      includedServices: [
        'CAM KẾT CHỖ 100% - Không bao giờ lo rớt tàu (No Roll-over Guarantee)',
        'Đặc quyền bốc dỡ và giải phóng hàng ưu tiên số 1 tại cảng đích',
        '21 ngày miễn phí lưu bãi và container (21 Days Combined Dem/Det)',
        'Tích hợp Bảo hiểm hàng hóa mọi rủi ro (All-Risk ICC A) đền bù 110%',
        'Cung cấp vỏ container loại A tuyển chọn (Grade A Food/Garment Quality)',
        'Chuyên viên phục vụ riêng Dedicated VIP Account Manager túc trực 24/7'
      ],
      valueAddHighlights: [
        'Tốc độ hành trình kỷ lục, tiết kiệm thêm 3-5 ngày so với hãng tàu thông thường',
        'Giải pháp hoàn hảo cho mùa cao điểm thiếu vỏ cont hoặc đơn hàng giao gấp theo thư tín dụng L/C',
        'Bảo chứng an toàn tuyệt đối với chính sách bồi thường chậm trễ bằng văn bản'
      ],
      caveats: [
        'Chi phí cước cao hơn ~12-14% so với mức trung bình thị trường'
      ],
      bestSuitedFor: 'Các đơn hàng linh kiện điện tử giá trị cao, hàng mẫu hội chợ, hàng theo hợp đồng phạt chậm giao nghiêm ngặt, hoặc các chuyến hàng gấp mùa cao điểm.',
      isRecommended: false,
      rating: {
        costScore: 7.0,
        speedScore: 9.9,
        reliabilityScore: 10.0,
        serviceScore: 10.0
      }
    };

    const pkgId = `moq-${Date.now()}`;
    const pkgCode = `MOQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const options = [optionEconomy, optionBalanced, optionPremium];

    const pitchDecks = this.generatePitchDecks({
      customerName,
      cargoDesc,
      pol,
      pod,
      options,
      rate
    });

    return {
      id: pkgId,
      packageCode: pkgCode,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      createdDate: new Date().toISOString().split('T')[0],
      validUntil: quote.terms?.validityDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      customer: quote.customer,
      shipment: quote.shipment,
      cargoSummary: cargoDesc,
      exchangeRate: rate,
      quoteCurrency: quote.quoteCurrency || 'USD',
      options,
      selectedOptionId: 'opt-balanced', // Mặc định chọn phương án Sweet Spot
      status: 'READY',
      salesRepName: quote.company?.contactPerson || 'BOGI Logistics Sales Specialist',
      salesRepPhone: quote.company?.phone || '0909 123 456',
      salesRepEmail: quote.company?.email || 'sales@bogilogistics.vn',
      notesAndTerms: 'Giá cước chưa bao gồm thuế GTGT nếu có theo quy định hiện hành. Phụ phí bến bãi có thể điều chỉnh theo biểu phí thực tế của hãng tàu tại thời điểm cập cảng.',
      pitchDecks,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Tạo kịch bản chốt đơn đa phương án (Phone, Zalo, Email, Objection Handling)
   */
  public static generatePitchDecks(params: {
    customerName: string;
    cargoDesc: string;
    pol: string;
    pod: string;
    options: MultiOptionItem[];
    rate: number;
  }): MultiOptionPitchDecks {
    const { customerName, cargoDesc, pol, pod, options } = params;
    const eco = options.find(o => o.tier === 'ECONOMY') || options[0];
    const bal = options.find(o => o.tier === 'BALANCED') || options[1] || options[0];
    const prem = options.find(o => o.tier === 'PREMIUM') || options[2] || options[0];

    const phoneScript = `Dạ em chào Anh/Chị bên ${customerName}, em là đại diện từ BOGI Logistics ạ!\n\nVề lô hàng ${cargoDesc} từ ${pol} đi ${pod}, thay vì chỉ gửi 1 giá cước cố định khiến Anh/Chị khó so sánh, bên em đã thiết kế sẵn Bảng So Sánh 3 Phương Án Tối Ưu cho mình:\n\n1. Phương Án 1 (Tiết Kiệm - $${eco.totalConvertedUsd}): Cước siêu tốt qua ${eco.carrier}, transit ${eco.transitTimeText}, phù hợp nếu mình muốn tối ưu chi phí kho vận tuyệt đối.\n\n2. Phương Án 2 (Khuyên Dùng / Best Value - $${bal.totalConvertedUsd}): Đi tàu thẳng ${bal.carrier}, transit chỉ ${bal.transitTimeText}, bên em tặng thêm 14 ngày Free Time Dem/Det kết hợp. Phương án này đang được hơn 84% khách hàng của bên em lựa chọn vì vừa an toàn vừa tiết kiệm.\n\n3. Phương Án 3 (Hỏa Tốc Express - $${prem.totalConvertedUsd}): Tàu ${prem.carrier} nhanh nhất chỉ ${prem.transitTimeText}, cam kết 100% không rớt cont mùa cao điểm, kèm 21 ngày Free Time và bảo hiểm mọi rủi ro.\n\nTheo kinh nghiệm của em với lô hàng này của Anh/Chị, em rất khuyến khích mình chọn Phương Án 2 (Cân Bằng) để vừa đảm bảo tiến độ giao hàng cho đối tác mà chi phí vẫn cực kỳ cạnh tranh. Anh/Chị xem qua và cho em xin xác nhận để em giữ chỗ đẹp cho mình nhé ạ!`;

    const zaloMessage = `[BOGI LOGISTICS] BẢNG SO SÁNH 3 PHƯƠNG ÁN CƯỚC LÔ HÀNG ${cargoDesc.toUpperCase()}\n` +
      `Kính gửi: ${customerName}\n` +
      `Tuyến: ${pol} ➔ ${pod}\n\n` +
      `Em gửi Anh/Chị bảng tóm tắt 3 phương án để lựa chọn linh hoạt theo nhu cầu:\n\n` +
      `1️⃣ GÓI TIẾT KIỆM (${eco.carrier}):\n` +
      `• Tổng chi phí: $${eco.totalConvertedUsd.toLocaleString()} USD\n` +
      `• Thời gian transit: ${eco.transitTimeText} | Free Time: ${eco.freeTimeDemDet}\n` +
      `• Điểm mạnh: Cước rẻ nhất thị trường.\n\n` +
      `2️⃣ GÓI CÂN BẰNG / KHUYÊN DÙNG (${bal.carrier}) - ★ BEST VALUE:\n` +
      `• Tổng chi phí: $${bal.totalConvertedUsd.toLocaleString()} USD\n` +
      `• Thời gian transit: ${bal.transitTimeText} (Đi thẳng) | Free Time: ${bal.freeTimeDemDet}\n` +
      `• Điểm mạnh: Tối ưu chi phí & thời gian, tặng thêm 7 ngày lưu cont, tracking 24/7.\n\n` +
      `3️⃣ GÓI HỎA TỐC VIP (${prem.carrier}):\n` +
      `• Tổng chi phí: $${prem.totalConvertedUsd.toLocaleString()} USD\n` +
      `• Thời gian transit: ${prem.transitTimeText} | Free Time: ${prem.freeTimeDemDet}\n` +
      `• Điểm mạnh: Cam kết chỗ 100% không rớt hàng, bảo hiểm trọn gói, bốc dỡ ưu tiên số 1.\n\n` +
      `👉 Anh/Chị chỉ cần phản hồi số 1, 2 hoặc 3, em sẽ tiến hành làm Booking Note và gửi lệnh cấp cont ngay trong 15 phút ạ!`;

    const formalEmail = `Kính gửi: Ban Giám Đốc & Bộ Phận Mua Hàng / Logistics - ${customerName},\n\n` +
      `Lời đầu tiên, BOGI Logistics xin gửi lời chào trân trọng và lời chúc sức khỏe, thành công đến Quý Công Ty!\n\n` +
      `Căn cứ vào yêu cầu chào giá cho lô hàng ${cargoDesc} (Tuyến: ${pol} đi ${pod}), BOGI Logistics xin trân trọng đệ trình BẢNG MA TRẬN SO SÁNH ĐA PHƯƠNG ÁN VẬN CHUYỂN (Good - Better - Best Matrix) nhằm hỗ trợ Quý Doanh nghiệp đưa ra quyết định tối ưu nhất:\n\n` +
      `--------------------------------------------------------------------------\n` +
      `THÔNG SỐ SO SÁNH | PHƯƠNG ÁN 1 (TIẾT KIỆM) | PHƯƠNG ÁN 2 (KHUYÊN DÙNG) | PHƯƠNG ÁN 3 (HỎA TỐC)\n` +
      `--------------------------------------------------------------------------\n` +
      `Hãng vận chuyển:  ${eco.carrier} | ${bal.carrier} | ${prem.carrier}\n` +
      `Dịch vụ:          ${eco.serviceType} | ${bal.serviceType} | ${prem.serviceType}\n` +
      `Transit Time:     ${eco.transitTimeText} | ${bal.transitTimeText} | ${prem.transitTimeText}\n` +
      `Free Time Dem/Det: ${eco.freeTimeDemDet} | ${bal.freeTimeDemDet} | ${prem.freeTimeDemDet}\n` +
      `Cam kết chỗ:      ${eco.spaceGuarantee} | ${bal.spaceGuarantee} | ${prem.spaceGuarantee}\n` +
      `TỔNG CHI PHÍ:     $${eco.totalConvertedUsd.toLocaleString()} USD | $${bal.totalConvertedUsd.toLocaleString()} USD | $${prem.totalConvertedUsd.toLocaleString()} USD\n` +
      `--------------------------------------------------------------------------\n\n` +
      `ĐÁNH GIÁ CHUYÊN MÔN:\n` +
      `- Nếu Quý Công ty cần cân bằng hài hòa giữa tiến độ giao hàng và ngân sách chi phí, PHƯƠNG ÁN 2 (CÂN BẰNG) là lựa chọn tối ưu nhất với 14 ngày Free Time và hành trình tàu đi thẳng tin cậy.\n` +
      `- Chi tiết báo giá từng hạng mục phí Local Charges và phụ phí đã được đính kèm trong file PDF & Excel đính kèm.\n\n` +
      `Rất mong nhận được sự chấp thuận của Quý Công ty. Kính chúc Quý Công ty ngày càng phát triển thịnh vượng!\n\n` +
      `Trân trọng,\nBOGI Logistics Team`;

    const objectionKiller = `KỊCH BẢN XỬ LÝ TỪ CHỐI / SO SÁNH VỚI ĐỐI THỦ:\n` +
      `- Khách chê: "Bên Forwarder X báo rẻ hơn bạn $30 - $50":\n` +
      `  -> "Dạ vâng thưa Anh/Chị, em hoàn toàn hiểu ạ. Bên đối thủ thường báo giá theo Option 1 (Chuyển tải và chỉ có 7 ngày Free time, tàu hay bị delay 3-5 ngày). Bên em cũng có Option 1 tương đương với giá chỉ $${eco.totalConvertedUsd}. Tuy nhiên, nếu cont về cảng đến bị vướng thủ tục kiểm hóa 1-2 ngày là tiền phạt Dem/Det đã lên tới $100-$150, cao hơn rất nhiều so với khoản chênh lệch. Đó là lý do em tha thiết đề xuất Anh/Chị chọn Option 2 bên em, được tặng trọn vẹn 14 ngày Free Time và tàu đi thẳng, giúp mình tiết kiệm chi phí rủi ro thực tế cao hơn rất nhiều ạ!"`;

    return {
      phoneScript,
      zaloMessage,
      formalEmail,
      objectionKiller
    };
  }

  /**
   * Áp dụng phương án được chọn vào lại Báo giá chính thức của hệ thống
   */
  public static applyOptionToQuote(quote: QuoteData, option: MultiOptionItem): QuoteData {
    const rate = quote.exchangeRate || 25400;
    const updatedItems = option.items.map(item => ({
      ...item,
      id: item.id.replace(/^(eco-|bal-|prem-)/, '') || `item-${Date.now()}-${Math.random()}`
    }));

    let subtotalUsd = 0;
    let subtotalVnd = 0;
    updatedItems.forEach(i => {
      const lineTotal = (i.unitPrice || 0) * (i.quantity || 1);
      if (i.currency === 'USD') subtotalUsd += lineTotal;
      else subtotalVnd += lineTotal;
    });

    const grandTotalUsd = subtotalUsd + (subtotalVnd / rate);
    const grandTotalVnd = (subtotalUsd * rate) + subtotalVnd;

    return {
      ...quote,
      items: updatedItems,
      shipment: {
        ...quote.shipment,
        carrier: option.carrier,
        vesselVoyage: option.vesselFlight || quote.shipment?.vesselVoyage,
        transitTime: option.transitTimeText,
        demurrageDetention: option.freeTimeDemDet
      },
      terms: {
        ...quote.terms,
        paymentTerms: quote.terms?.paymentTerms || 'Thanh toán trước khi phát hành House B/L hoặc thả hàng telex',
        notes: `${quote.terms?.notes || ''}\n[Đã chốt theo Phương Án: ${option.tierNameVi} - Hãng vận chuyển: ${option.carrier} - Free Time: ${option.freeTimeDemDet}]`.trim()
      },
      subtotalUsd: Math.round(subtotalUsd * 100) / 100,
      subtotalVnd: Math.round(subtotalVnd),
      grandTotalUsd: Math.round(grandTotalUsd * 100) / 100,
      grandTotalVnd: Math.round(grandTotalVnd),
      totalProfitUsd: option.estimatedProfitUsd,
      overallMarginPercent: option.estimatedMarginPercent,
      updatedDate: new Date().toISOString()
    };
  }

  /**
   * Lưu trữ cục bộ các gói đa phương án
   */
  public static savePackage(pkg: MultiOptionQuotationPackage): void {
    try {
      const existing = this.getAllPackages();
      const idx = existing.findIndex(p => p.id === pkg.id);
      if (idx >= 0) {
        existing[idx] = pkg;
      } else {
        existing.unshift(pkg);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to save multi-option package to local storage', e);
    }
  }

  public static getAllPackages(): MultiOptionQuotationPackage[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static getPackageByQuoteId(quoteId: string): MultiOptionQuotationPackage | null {
    const all = this.getAllPackages();
    return all.find(p => p.quoteId === quoteId) || null;
  }

  public static deletePackage(id: string): void {
    try {
      const all = this.getAllPackages().filter(p => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to delete package', e);
    }
  }
}
