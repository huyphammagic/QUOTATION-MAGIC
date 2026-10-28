import { 
  LineItem, 
  QuoteData, 
  ShipmentDetails, 
  TransportMode,
  FeeCategory,
  ChargeLocation,
  ChargeBasis,
  SurchargeItem
} from '../../types/logistics';
import { 
  SmartSurchargeSuggestion, 
  SmartRouteAnalysis, 
  SmartSurchargeAnalysis,
  SurchargeConfidence 
} from '../../types/smartSurcharge';

/**
 * Phân tích địa lý cảng xuất (POL) & cảng nhập (POD)
 */
function analyzeRoute(pol: string = '', pod: string = '', mode: TransportMode): SmartRouteAnalysis {
  const polLower = pol.toLowerCase();
  const podLower = pod.toLowerCase();

  const isVnPol = polLower.includes('vietnam') || polLower.includes('vn') || polLower.includes('cat lai') || 
                  polLower.includes('hai phong') || polLower.includes('haiphong') || polLower.includes('cai mep') || 
                  polLower.includes('da nang') || polLower.includes('sgn') || polLower.includes('han') || 
                  polLower.includes('dad') || polLower.includes('hph') || polLower.includes('vnsgn') || polLower.includes('vnhph');
  
  const isVnPod = podLower.includes('vietnam') || podLower.includes('vn') || podLower.includes('cat lai') || 
                  podLower.includes('hai phong') || podLower.includes('haiphong') || podLower.includes('cai mep') || 
                  podLower.includes('da nang') || podLower.includes('sgn') || podLower.includes('han') || 
                  podLower.includes('dad') || podLower.includes('hph') || podLower.includes('vnsgn') || podLower.includes('vnhph');

  const isUsPod = podLower.includes('usa') || podLower.includes('us') || podLower.includes('los angeles') || 
                  podLower.includes('long beach') || podLower.includes('lax') || podLower.includes('lgb') || 
                  podLower.includes('new york') || podLower.includes('nyc') || podLower.includes('savannah') || 
                  podLower.includes('oakland') || podLower.includes('seattle') || podLower.includes('houston') ||
                  podLower.includes('uslax') || podLower.includes('usnyc');

  const isEuPod = podLower.includes('europe') || podLower.includes('eu') || podLower.includes('hamburg') || 
                  podLower.includes('rotterdam') || podLower.includes('antwerp') || podLower.includes('le havre') || 
                  podLower.includes('southampton') || podLower.includes('felixstowe') || podLower.includes('valencia') || 
                  podLower.includes('genoa') || podLower.includes('germany') || podLower.includes('netherlands') || 
                  podLower.includes('france') || podLower.includes('nlrtm') || podLower.includes('deham');

  const isAsiaPod = podLower.includes('china') || podLower.includes('cn') || podLower.includes('shanghai') || 
                    podLower.includes('ningbo') || podLower.includes('shenzhen') || podLower.includes('guangzhou') || 
                    podLower.includes('singapore') || podLower.includes('malaysia') || podLower.includes('thailand') || 
                    podLower.includes('bangkok') || podLower.includes('japan') || podLower.includes('tokyo') || 
                    podLower.includes('busan') || podLower.includes('korea') || podLower.includes('sgsin') || 
                    podLower.includes('cnsha') || podLower.includes('cnngb') || podLower.includes('cnszx');

  let tradeLane: SmartRouteAnalysis['tradeLane'] = 'GLOBAL';
  if (isVnPol && isVnPod) {
    tradeLane = 'DOMESTIC_VN';
  } else if ((isVnPol && isUsPod) || (polLower.includes('asia') && isUsPod)) {
    tradeLane = 'TRANSPACIFIC';
  } else if ((isVnPol && isEuPod) || (polLower.includes('asia') && isEuPod)) {
    tradeLane = 'ASIA_EUROPE';
  } else if ((isVnPol && isAsiaPod) || (!isUsPod && !isEuPod && isAsiaPod)) {
    tradeLane = 'INTRA_ASIA';
  }

  // Phân tích mùa cao điểm (Peak Season Calendar)
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let isPeakSeasonActive = false;
  let peakSeasonName = '';

  if (currentMonth >= 8 && currentMonth <= 12) {
    isPeakSeasonActive = true;
    peakSeasonName = 'Mùa Cao Điểm Cuối Năm Q3-Q4 (Black Friday, Noel & Tết Dương Lịch)';
  } else if (currentMonth === 1 || currentMonth === 2) {
    isPeakSeasonActive = true;
    peakSeasonName = 'Cao Điểm Cận Tết Nguyên Đán (Pre-Lunar New Year Peak)';
  }

  return {
    originCountry: isVnPol ? 'Vietnam' : 'International',
    originRegion: isVnPol ? 'VIETNAM' : 'ASIA',
    destinationCountry: isUsPod ? 'United States' : isEuPod ? 'European Union' : isAsiaPod ? 'Asia' : isVnPod ? 'Vietnam' : 'International',
    destinationRegion: isUsPod ? 'NORTH_AMERICA' : isEuPod ? 'EUROPE' : isAsiaPod ? 'ASIA' : isVnPod ? 'VIETNAM' : 'OTHER',
    tradeLane,
    isExportFromVietnam: isVnPol && !isVnPod,
    isImportToVietnam: !isVnPol && isVnPod,
    isPeakSeasonActive,
    peakSeasonName,
    mode,
  };
}

/**
 * Động Cơ Gợi Ý Phụ Phí Thông Minh (Smart Surcharge Suggestion Engine)
 */
export class SmartSurchargeEngine {
  /**
   * Phân tích tuyến đường, phương thức vận tải và danh sách phụ phí hiện tại
   */
  public static analyzeQuote(
    quote: Partial<QuoteData>,
    customSurcharges: SurchargeItem[] = []
  ): SmartSurchargeAnalysis {
    const shipment: ShipmentDetails = quote.shipment || {
      mode: 'SEA_FCL',
      pol: 'Cat Lai Port, Ho Chi Minh, Vietnam (VN)',
      pod: 'Los Angeles / Long Beach Port, CA, USA',
      commodity: 'General Cargo',
      containerType: "40'HC",
      quantity: 1,
      grossWeightKg: 15000,
      volumeCbm: 40,
      chargeableWeight: 40,
    };

    const exchangeRate = quote.exchangeRate || 25400;
    const existingItems = quote.items || [];
    const routeAnalysis = analyzeRoute(shipment.pol, shipment.pod, shipment.mode);

    const suggestions: SmartSurchargeSuggestion[] = [];

    // 1. Phân tích cho SEA_FCL (Đường biển container nguyên cont)
    if (shipment.mode === 'SEA_FCL') {
      // 1.1 BAF / LSS - Bắt buộc cho đường biển
      suggestions.push({
        id: 'sug-baf-fcl',
        code: 'BAF',
        nameVi: 'Phụ Phí Biến Động Giá Nhiên Liệu (Bunker Adjustment Factor - BAF)',
        nameEn: 'Bunker Adjustment Factor',
        category: 'SURCHARGE',
        location: 'FREIGHT',
        transportMode: 'SEA_FCL',
        basis: 'PER_CONTAINER',
        unit: 'Container',
        suggestedUnitPrice: routeAnalysis.tradeLane === 'TRANSPACIFIC' || routeAnalysis.tradeLane === 'ASIA_EUROPE' ? 180 : 120,
        suggestedCostPrice: routeAnalysis.tradeLane === 'TRANSPACIFIC' || routeAnalysis.tradeLane === 'ASIA_EUROPE' ? 150 : 95,
        currency: 'USD',
        vatRate: 0,
        confidence: 'MANDATORY',
        categoryTag: 'FUEL',
        reasonVi: `Quy định bù đắp biến động giá dầu hàng hải chuẩn IMO theo tuyến ${routeAnalysis.tradeLane}.`,
        marketNoteVi: 'Hầu hết các hãng tàu (Maersk, ONE, CMA CGM) áp dụng định kỳ hàng tháng.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      suggestions.push({
        id: 'sug-lss-fcl',
        code: 'LSS',
        nameVi: 'Phụ Phí Nhiên Liệu Lưu Huỳnh Thấp (Low Sulphur Surcharge - LSS)',
        nameEn: 'Low Sulphur Surcharge',
        category: 'SURCHARGE',
        location: 'FREIGHT',
        transportMode: 'SEA_FCL',
        basis: 'PER_CONTAINER',
        unit: 'Container',
        suggestedUnitPrice: 50,
        suggestedCostPrice: 35,
        currency: 'USD',
        vatRate: 0,
        confidence: 'HIGH',
        categoryTag: 'FUEL',
        reasonVi: 'Bắt buộc tuân thủ công ước môi trường biển quốc tế MARPOL 2020.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 1.2 Peak Season Surcharge (PSS)
      if (routeAnalysis.isPeakSeasonActive || routeAnalysis.tradeLane === 'TRANSPACIFIC' || routeAnalysis.tradeLane === 'ASIA_EUROPE') {
        const pssRate = routeAnalysis.tradeLane === 'TRANSPACIFIC' ? 450 : routeAnalysis.tradeLane === 'ASIA_EUROPE' ? 350 : 150;
        suggestions.push({
          id: 'sug-pss-fcl',
          code: 'PSS',
          nameVi: 'Phụ Phí Mùa Cao Điểm (Peak Season Surcharge - PSS)',
          nameEn: 'Peak Season Surcharge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'SEA_FCL',
          basis: 'PER_CONTAINER',
          unit: 'Container',
          suggestedUnitPrice: pssRate,
          suggestedCostPrice: pssRate - 50,
          currency: 'USD',
          vatRate: 0,
          confidence: 'HIGH',
          categoryTag: 'PEAK_SEASON',
          reasonVi: routeAnalysis.peakSeasonName 
            ? `Áp dụng trong giai đoạn: ${routeAnalysis.peakSeasonName}. Cầu tải trọng vượt cung.` 
            : 'Mùa cao điểm xuất nhập khẩu, các hãng tàu áp dụng phụ phí PSS giữ chỗ.',
          marketNoteVi: 'Áp dụng cho các booking xuất đi Bắc Mỹ & Châu Âu để đảm bảo có chỗ (space guarantee).',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }

      // 1.3 Tuyến đi Mỹ (Transpacific): Bắt buộc AMS & PierPass
      if (routeAnalysis.tradeLane === 'TRANSPACIFIC' || routeAnalysis.destinationRegion === 'NORTH_AMERICA') {
        suggestions.push({
          id: 'sug-ams-fcl',
          code: 'AMS',
          nameVi: 'Phí Khai Báo Hải Quan Mỹ Tự Động (Automated Manifest System - AMS)',
          nameEn: 'Automated Manifest System Fee',
          category: 'SURCHARGE',
          location: 'POL',
          transportMode: 'SEA_FCL',
          basis: 'PER_BL',
          unit: 'Bill',
          suggestedUnitPrice: 35,
          suggestedCostPrice: 25,
          currency: 'USD',
          vatRate: 8,
          confidence: 'MANDATORY',
          categoryTag: 'REGULATORY',
          reasonVi: 'Bắt buộc theo luật an ninh biên giới Hải Quan Mỹ (US Customs 24-Hour Advance Manifest Rule).',
          regulatoryRef: 'US CBP 19 CFR § 4.7',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }

      // 1.4 Tuyến đi Châu Âu (Asia - Europe): Bắt buộc EU ETS & Suez/War Risk Surcharge
      if (routeAnalysis.tradeLane === 'ASIA_EUROPE' || routeAnalysis.destinationRegion === 'EUROPE') {
        suggestions.push({
          id: 'sug-ets-fcl',
          code: 'ETS',
          nameVi: 'Phụ Phí Hạn Ngạch Khí Thải Carbon Châu Âu (EU ETS Mandate)',
          nameEn: 'EU Emissions Trading System Surcharge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'SEA_FCL',
          basis: 'PER_CONTAINER',
          unit: 'Container',
          suggestedUnitPrice: 110,
          suggestedCostPrice: 85,
          currency: 'USD',
          vatRate: 0,
          confidence: 'MANDATORY',
          categoryTag: 'REGULATORY',
          reasonVi: 'Chỉ thị bảo vệ môi trường EU Directive 2023/959 đánh thuế carbon vào tàu cập cảng liên minh châu Âu.',
          regulatoryRef: 'EU ETS Directive 2023/959',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });

        suggestions.push({
          id: 'sug-wrs-fcl',
          code: 'WRS',
          nameVi: 'Phụ Phí Vùng Rủi Ro Chiến Tranh & Định Tuyến Vòng Mũi Hảo Vọng (WRS)',
          nameEn: 'War Risk & Cape of Good Hope Transit Surcharge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'SEA_FCL',
          basis: 'PER_CONTAINER',
          unit: 'Container',
          suggestedUnitPrice: 350,
          suggestedCostPrice: 300,
          currency: 'USD',
          vatRate: 0,
          confidence: 'HIGH',
          categoryTag: 'WAR_RISK',
          reasonVi: 'Tàu hàng phải chuyển hướng đi vòng qua châu Phi né tránh xung đột an ninh Biển Đỏ / Kênh Suez.',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }

      // 1.5 Tuyến Nội Á (Intra-Asia): Container Imbalance Charge (CIC)
      if (routeAnalysis.tradeLane === 'INTRA_ASIA') {
        suggestions.push({
          id: 'sug-cic-fcl',
          code: 'CIC',
          nameVi: 'Phụ Phí Mất Cân Bằng Vỏ Container (Container Imbalance Charge - CIC)',
          nameEn: 'Container Imbalance Charge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'SEA_FCL',
          basis: 'PER_CONTAINER',
          unit: 'Container',
          suggestedUnitPrice: 80,
          suggestedCostPrice: 60,
          currency: 'USD',
          vatRate: 0,
          confidence: 'HIGH',
          categoryTag: 'EQUIPMENT',
          reasonVi: 'Bù đắp chi phí điều chuyển vỏ rỗng giữa các cảng khu vực Châu Á (Trung Quốc, Việt Nam, Nhật, Hàn).',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }

      // 1.6 Phí Seal Chì Container
      suggestions.push({
        id: 'sug-seal-fcl',
        code: 'SEAL',
        nameVi: 'Phí Kẹp Chì An Ninh Niêm Phong (Container Seal Fee)',
        nameEn: 'Container Seal Fee',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'SEA_FCL',
        basis: 'PER_CONTAINER',
        unit: 'Container',
        suggestedUnitPrice: 10,
        suggestedCostPrice: 7,
        currency: 'USD',
        vatRate: 8,
        confidence: 'RECOMMENDED',
        categoryTag: 'SECURITY',
        reasonVi: 'Phí kẹp chì bảo mật container bắt buộc tại cảng xuất.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });
    }

    // 2. Phân tích cho SEA_LCL (Hàng lẻ đóng ghép)
    else if (shipment.mode === 'SEA_LCL') {
      suggestions.push({
        id: 'sug-cfs-lcl',
        code: 'CFS',
        nameVi: 'Phí Khai Thác Kho Hàng Lẻ (Container Freight Station - CFS)',
        nameEn: 'CFS Charge',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'SEA_LCL',
        basis: 'PER_WM',
        unit: 'CBM',
        suggestedUnitPrice: 15,
        suggestedCostPrice: 10,
        currency: 'USD',
        vatRate: 8,
        confidence: 'MANDATORY',
        categoryTag: 'TERMINAL',
        reasonVi: 'Phí bốc xếp dỡ, lưu kho và gom hàng lẻ vào container tại kho CFS.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      suggestions.push({
        id: 'sug-baf-lcl',
        code: 'BAF',
        nameVi: 'Phụ Phí Nhiên Liệu Hàng Lẻ (LCL Fuel Surcharge / BAF)',
        nameEn: 'LCL Bunker Surcharge',
        category: 'SURCHARGE',
        location: 'FREIGHT',
        transportMode: 'SEA_LCL',
        basis: 'PER_WM',
        unit: 'CBM',
        suggestedUnitPrice: 10,
        suggestedCostPrice: 7,
        currency: 'USD',
        vatRate: 0,
        confidence: 'HIGH',
        categoryTag: 'FUEL',
        reasonVi: 'Phụ phí biến động nhiên liệu tính theo thể tích/trọng lượng CBM hàng lẻ.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      if (routeAnalysis.isPeakSeasonActive) {
        suggestions.push({
          id: 'sug-pss-lcl',
          code: 'PSS',
          nameVi: 'Phụ Phí Mùa Cao Điểm Hàng Lẻ (LCL Peak Season Surcharge)',
          nameEn: 'LCL Peak Season Surcharge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'SEA_LCL',
          basis: 'PER_WM',
          unit: 'CBM',
          suggestedUnitPrice: 12,
          suggestedCostPrice: 8,
          currency: 'USD',
          vatRate: 0,
          confidence: 'HIGH',
          categoryTag: 'PEAK_SEASON',
          reasonVi: 'Áp dụng cho mùa cao điểm ghép cont LCL tại các kho cảng xuất nhập.',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }
    }

    // 3. Phân tích cho AIR_FREIGHT (Đường hàng không)
    else if (shipment.mode === 'AIR_FREIGHT') {
      // 3.1 FSC (Fuel Surcharge Air)
      suggestions.push({
        id: 'sug-fsc-air',
        code: 'FSC',
        nameVi: 'Phụ Phí Nhiên Liệu Hàng Không (Fuel Surcharge - FSC)',
        nameEn: 'Air Fuel Surcharge',
        category: 'SURCHARGE',
        location: 'FREIGHT',
        transportMode: 'AIR_FREIGHT',
        basis: 'PER_CHARGEABLE_KG',
        unit: 'KGS',
        suggestedUnitPrice: 0.85,
        suggestedCostPrice: 0.70,
        currency: 'USD',
        vatRate: 0,
        confidence: 'MANDATORY',
        categoryTag: 'FUEL',
        reasonVi: 'Bắt buộc áp dụng theo chỉ số giá xăng máy bay IATA Jet Fuel Index.',
        regulatoryRef: 'IATA Cargo Tariff',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 3.2 SSC (Security Surcharge Air)
      suggestions.push({
        id: 'sug-ssc-air',
        code: 'SSC',
        nameVi: 'Phụ Phí An Ninh Hàng Không (Security Surcharge - SSC/SEC)',
        nameEn: 'Security Surcharge',
        category: 'SURCHARGE',
        location: 'FREIGHT',
        transportMode: 'AIR_FREIGHT',
        basis: 'PER_CHARGEABLE_KG',
        unit: 'KGS',
        suggestedUnitPrice: 0.15,
        suggestedCostPrice: 0.10,
        currency: 'USD',
        vatRate: 0,
        confidence: 'MANDATORY',
        categoryTag: 'SECURITY',
        reasonVi: 'Chi phí soi chiếu an ninh và giám sát chống khủng bố hàng không quốc tế.',
        regulatoryRef: 'ICAO Annex 17',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 3.3 XRAY Screening Fee
      suggestions.push({
        id: 'sug-xray-air',
        code: 'XRAY',
        nameVi: 'Phí Soi Chiếu Tia X (X-Ray & Screening Fee)',
        nameEn: 'X-Ray Screening Fee',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'AIR_FREIGHT',
        basis: 'PER_CHARGEABLE_KG',
        unit: 'KGS',
        suggestedUnitPrice: 0.05,
        suggestedCostPrice: 0.03,
        currency: 'USD',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'SECURITY',
        reasonVi: 'Bắt buộc tại sân bay đi (SGN / HAN) trước khi bốc hàng lên máy bay.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 3.4 Air Terminal Handling (AIR THC)
      suggestions.push({
        id: 'sug-thc-air',
        code: 'AIR_THC',
        nameVi: 'Phí Phục Vụ Hàng Hóa Sân Bay (Terminal Handling Charge - Air THC)',
        nameEn: 'Air Cargo Terminal Handling',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'AIR_FREIGHT',
        basis: 'PER_CHARGEABLE_KG',
        unit: 'KGS',
        suggestedUnitPrice: 0.12,
        suggestedCostPrice: 0.09,
        currency: 'USD',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'TERMINAL',
        reasonVi: 'Phí nâng hạ, cân đo và bảo quản kho TCS / NCTS sân bay.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 3.5 Air Waybill Fee (AWB)
      suggestions.push({
        id: 'sug-awb-air',
        code: 'AWB',
        nameVi: 'Phí Phát Hành Vận Đơn Hàng Không (Air Waybill Fee - AWB)',
        nameEn: 'Air Waybill Issuance Fee',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'AIR_FREIGHT',
        basis: 'PER_BL',
        unit: 'Bill',
        suggestedUnitPrice: 25,
        suggestedCostPrice: 18,
        currency: 'USD',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'REGULATORY',
        reasonVi: 'Phí phát hành MAWB / HAWB chuẩn IATA.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      // 3.6 PSS Air nếu mùa cao điểm
      if (routeAnalysis.isPeakSeasonActive) {
        suggestions.push({
          id: 'sug-pss-air',
          code: 'PSS_AIR',
          nameVi: 'Phụ Phí Cao Điểm Tải Trọng Hàng Không (Air Peak Season Surcharge)',
          nameEn: 'Air Cargo Peak Surcharge',
          category: 'SURCHARGE',
          location: 'FREIGHT',
          transportMode: 'AIR_FREIGHT',
          basis: 'PER_CHARGEABLE_KG',
          unit: 'KGS',
          suggestedUnitPrice: 0.40,
          suggestedCostPrice: 0.30,
          currency: 'USD',
          vatRate: 0,
          confidence: 'RECOMMENDED',
          categoryTag: 'PEAK_SEASON',
          reasonVi: 'Cao điểm chuyển phát nhanh, các hãng bay tăng phụ thu để ưu tiên tải (priority uplift).',
          estimatedTotalUsd: 0,
          estimatedTotalVnd: 0,
          isAlreadyAdded: false,
        });
      }
    }

    // 4. Phân tích cho INLAND_TRUCKING (Vận chuyển đường bộ)
    else if (shipment.mode === 'INLAND_TRUCKING') {
      suggestions.push({
        id: 'sug-truck-fuel',
        code: 'FUEL_TRUCK',
        nameVi: 'Phụ Phí Biến Động Xăng Dầu Đường Bộ (Trucking Fuel Surcharge)',
        nameEn: 'Inland Fuel Surcharge',
        category: 'SURCHARGE',
        location: 'POL',
        transportMode: 'INLAND_TRUCKING',
        basis: 'PER_TRIP',
        unit: 'Trip',
        suggestedUnitPrice: 450000,
        suggestedCostPrice: 350000,
        currency: 'VND',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'FUEL',
        reasonVi: 'Bù đắp trượt giá xăng dầu diesel đường bộ theo kỳ điều chỉnh giá của Bộ Công Thương.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      suggestions.push({
        id: 'sug-bot-toll',
        code: 'BOT_TOLL',
        nameVi: 'Phí Trạm Thu Phí BOT & Đường Cao Tốc (Highway Toll Surcharge)',
        nameEn: 'BOT Toll Fee',
        category: 'TRUCKING',
        location: 'POL',
        transportMode: 'INLAND_TRUCKING',
        basis: 'PER_TRIP',
        unit: 'Trip',
        suggestedUnitPrice: 650000,
        suggestedCostPrice: 650000,
        currency: 'VND',
        vatRate: 8,
        confidence: 'RECOMMENDED',
        categoryTag: 'INLAND',
        reasonVi: 'Chi phí qua trạm BOT đường bộ kết nối cảng biển và khu công nghiệp.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      suggestions.push({
        id: 'sug-lolo-depot',
        code: 'LOLO_DEPOT',
        nameVi: 'Phí Nâng Hạ Vỏ Rỗng Tại Bãi Depot / ICD (Lift On / Lift Off Fee)',
        nameEn: 'Depot LoLo Fee',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        transportMode: 'INLAND_TRUCKING',
        basis: 'PER_CONTAINER',
        unit: 'Container',
        suggestedUnitPrice: 380000,
        suggestedCostPrice: 300000,
        currency: 'VND',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'EQUIPMENT',
        reasonVi: 'Chi phí nâng hạ cont tại bãi rỗng ICD trước khi giao về kho nhà máy.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });
    }

    // 5. Phân tích cho CUSTOMS_CLEARANCE (Khai báo Hải quan)
    else if (shipment.mode === 'CUSTOMS_CLEARANCE') {
      suggestions.push({
        id: 'sug-customs-insp',
        code: 'INSPECTION',
        nameVi: 'Phí Hỗ Trợ Kiểm Hóa Thực Tế Luồng Đỏ (Customs Physical Inspection)',
        nameEn: 'Customs Inspection Support Fee',
        category: 'CUSTOMS',
        location: 'POL',
        transportMode: 'CUSTOMS_CLEARANCE',
        basis: 'PER_SHIPMENT',
        unit: 'Lô',
        suggestedUnitPrice: 1500000,
        suggestedCostPrice: 1000000,
        currency: 'VND',
        vatRate: 8,
        confidence: 'RECOMMENDED',
        categoryTag: 'REGULATORY',
        reasonVi: 'Chi phí công nhân mở kiểm, xe nâng phục vụ cán bộ Hải quan kiểm hóa thực tế tại bãi.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });

      suggestions.push({
        id: 'sug-customs-transmit',
        code: 'TRANSMIT_FEE',
        nameVi: 'Phí Truyền Dữ Liệu Hải Quan Điện Tử (VNACCS/VCIS Transmission)',
        nameEn: 'Electronic Customs Transmission',
        category: 'CUSTOMS',
        location: 'POL',
        transportMode: 'CUSTOMS_CLEARANCE',
        basis: 'PER_DOCUMENT',
        unit: 'Tờ khai',
        suggestedUnitPrice: 200000,
        suggestedCostPrice: 100000,
        currency: 'VND',
        vatRate: 8,
        confidence: 'HIGH',
        categoryTag: 'REGULATORY',
        reasonVi: 'Phí truyền cổng thông tin một cửa quốc gia NSW & hệ thống VNACCS.',
        estimatedTotalUsd: 0,
        estimatedTotalVnd: 0,
        isAlreadyAdded: false,
      });
    }

    // 6. Kiểm tra xem phụ phí nào ĐÃ CÓ trong existingItems để tránh đề xuất trùng lặp
    suggestions.forEach(sug => {
      const alreadyPresent = existingItems.some(item => {
        const matchCode = item.code && item.code.trim().toUpperCase() === sug.code.toUpperCase();
        const matchDesc = item.description && item.description.toLowerCase().includes(sug.code.toLowerCase());
        return matchCode || matchDesc;
      });
      sug.isAlreadyAdded = alreadyPresent;

      // Tính toán ước tính doanh thu
      let qty = 1;
      if (sug.basis === 'PER_CONTAINER') {
        qty = shipment.quantity || 1;
      } else if (sug.basis === 'PER_CHARGEABLE_KG') {
        qty = shipment.chargeableWeight || (shipment.grossWeightKg || 1);
      } else if (sug.basis === 'PER_WM' || sug.basis === 'PER_CBM') {
        qty = shipment.volumeCbm || 1;
      } else if (sug.basis === 'PER_TRIP' || sug.basis === 'PER_SHIPMENT' || sug.basis === 'PER_BL' || sug.basis === 'PER_DOCUMENT') {
        qty = 1;
      }

      const totalRaw = sug.suggestedUnitPrice * qty;
      if (sug.currency === 'USD') {
        sug.estimatedTotalUsd = totalRaw;
        sug.estimatedTotalVnd = totalRaw * exchangeRate;
      } else {
        sug.estimatedTotalVnd = totalRaw;
        sug.estimatedTotalUsd = totalRaw / exchangeRate;
      }
    });

    const unappliedSuggestions = suggestions.filter(s => !s.isAlreadyAdded);
    const totalPotentialUsd = unappliedSuggestions.reduce((sum, s) => sum + s.estimatedTotalUsd, 0);
    const totalPotentialVnd = unappliedSuggestions.reduce((sum, s) => sum + s.estimatedTotalVnd, 0);
    const mandatoryCount = unappliedSuggestions.filter(s => s.confidence === 'MANDATORY').length;

    let summaryPitchVi = '';
    if (unappliedSuggestions.length === 0) {
      summaryPitchVi = `Hồ sơ báo giá đã tối ưu và đầy đủ toàn bộ phụ phí tiêu chuẩn cho tuyến ${routeAnalysis.tradeLane}.`;
    } else {
      summaryPitchVi = `Phát hiện ${unappliedSuggestions.length} phụ phí khuyến nghị cho tuyến ${routeAnalysis.tradeLane} (${mandatoryCount} khoản bắt buộc theo luật hàng hải/hàng không). Áp dụng giúp tăng thêm $${Math.round(totalPotentialUsd).toLocaleString()} doanh thu.`;
    }

    return {
      routeAnalysis,
      suggestions,
      totalPotentialRevenueUsd: totalPotentialUsd,
      totalPotentialRevenueVnd: totalPotentialVnd,
      unappliedCount: unappliedSuggestions.length,
      mandatoryCount,
      summaryPitchVi,
    };
  }

  /**
   * Chuyển đổi một SmartSurchargeSuggestion thành LineItem để thêm vào báo giá
   */
  public static createLineItemFromSuggestion(
    suggestion: SmartSurchargeSuggestion,
    shipment: ShipmentDetails,
    exchangeRate: number
  ): LineItem {
    let quantity = 1;
    if (suggestion.basis === 'PER_CONTAINER') {
      quantity = shipment.quantity || 1;
    } else if (suggestion.basis === 'PER_CHARGEABLE_KG') {
      quantity = shipment.chargeableWeight || shipment.grossWeightKg || 1;
    } else if (suggestion.basis === 'PER_WM' || suggestion.basis === 'PER_CBM') {
      quantity = shipment.volumeCbm || 1;
    } else if (suggestion.basis === 'PER_TRIP' || suggestion.basis === 'PER_SHIPMENT' || suggestion.basis === 'PER_BL') {
      quantity = 1;
    }

    const unitPrice = suggestion.suggestedUnitPrice;
    const costPrice = suggestion.suggestedCostPrice;
    const isVnd = suggestion.currency === 'VND';

    const amountUsd = isVnd ? (unitPrice * quantity) / exchangeRate : unitPrice * quantity;
    const amountVnd = isVnd ? unitPrice * quantity : unitPrice * quantity * exchangeRate;

    const costTotalUsd = isVnd ? (costPrice * quantity) / exchangeRate : costPrice * quantity;
    const costTotalVnd = isVnd ? costPrice * quantity : costPrice * quantity * exchangeRate;

    const profitUsd = amountUsd - costTotalUsd;
    const profitVnd = amountVnd - costTotalVnd;
    const marginPercent = amountUsd > 0 ? (profitUsd / amountUsd) * 100 : 0;

    return {
      id: `sug-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: suggestion.category,
      location: suggestion.location,
      code: suggestion.code,
      description: suggestion.nameVi,
      basis: suggestion.basis,
      quantity,
      unit: suggestion.unit,
      unitPrice,
      costPrice,
      currency: suggestion.currency,
      vatRate: suggestion.vatRate,
      amountUsd,
      amountVnd,
      costTotalUsd,
      costTotalVnd,
      profitUsd,
      profitVnd,
      marginPercent,
      note: `Gợi ý tự động bởi Smart Surcharge Engine (${suggestion.reasonVi})`,
    };
  }
}
