/**
 * Logistics Quotation Management Platform - Phase 63 (Chức Năng 1)
 * Enterprise Multi-Lane RFQ & Portfolio Tender Engine Service
 * Xử lý thầu ma trận tuyến nhà máy, tối ưu danh mục lãi và chuyển đổi báo giá master
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  EnterpriseTenderProject,
  TenderLaneItem,
  PortfolioOptimizationParams,
  LaneTenderStrategy
} from '../../types/enterpriseTender';
import { QuoteData, LineItem } from '../../types/logistics';

// Danh sách các gói thầu nhà máy mẫu thực tế
export const SAMPLE_ENTERPRISE_TENDERS: EnterpriseTenderProject[] = [
  {
    id: 'tnd-phongphu-2026',
    tenderCode: 'TND-2026-PHONGPHU',
    titleVi: 'Gói Thầu Vận Tải Logistics Thường Niên 2026 - Tập Đoàn May Mặc Phong Phú Sài Gòn',
    customerName: 'Tập đoàn Dệt May Phong Phú Sài Gòn',
    contactPerson: 'Chị Nguyễn Thị Bích Ngọc (Phó Giám Đốc Supply Chain)',
    contactPhone: '0918765432',
    contactEmail: 'ngoc.ntb@phongphu.com.vn',
    industrySector: 'Dệt May & Thời Trang',
    contractPeriodMonths: 12,
    submissionDeadline: '2026-10-25',
    status: 'OPTIMIZING',
    totalLanesCount: 6,
    totalAnnualVolumeTeu: 1250,
    totalTenderRevenueUsd: 4680200,
    totalTenderCostUsd: 4321500,
    totalAnnualGrossProfitUsd: 358700,
    blendedMarginPercent: 7.66,
    estimatedWinProbabilityPercent: 88,
    lanes: [
      {
        id: 'lane-pp-01',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Long Beach (USLGB)',
        factoryPlantOrigin: 'Nhà máy May 1 - KCN Tân Tạo, TP.HCM',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 450,
        carrierSuggested: 'ONE Line (Ocean Network Express)',
        transitTimeDays: 16,
        freeTimeDays: 14,
        baseCostUsd: 3400,
        clientTargetPriceUsd: 3550,
        proposedSellPriceUsd: 3530,
        strategy: 'VOLUME_DRIVER',
        unitProfitUsd: 130,
        totalAnnualProfitUsd: 58500,
        marginPercent: 3.68,
        winProbabilityPercent: 94,
        notesVi: 'Tuyến cờ đầu chiếm 36% sản lượng. Để lãi mỏng $130/cont để đè bẹp đối thủ giành trọn thầu.'
      },
      {
        id: 'lane-pp-02',
        pol: 'Hải Phòng (VNHPH)',
        pod: 'Los Angeles (USLAX)',
        factoryPlantOrigin: 'Nhà máy Sợi & Dệt - KCN Phố Nối A, Hưng Yên',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 320,
        carrierSuggested: 'COSCO Shipping Lines',
        transitTimeDays: 18,
        freeTimeDays: 14,
        baseCostUsd: 3350,
        clientTargetPriceUsd: 3500,
        proposedSellPriceUsd: 3480,
        strategy: 'VOLUME_DRIVER',
        unitProfitUsd: 130,
        totalAnnualProfitUsd: 41600,
        marginPercent: 3.74,
        winProbabilityPercent: 92,
        notesVi: 'Tuyến sản lượng lớn miền Bắc. Đảm bảo chỗ ổn định với COSCO Lạch Huyện.'
      },
      {
        id: 'lane-pp-03',
        pol: 'Cát Lái (VNCLI)',
        pod: 'New York (USNYC)',
        factoryPlantOrigin: 'Nhà máy May 2 - KCN Amata, Đồng Nai',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 220,
        carrierSuggested: 'Evergreen Marine (EMC)',
        transitTimeDays: 28,
        freeTimeDays: 14,
        baseCostUsd: 4300,
        clientTargetPriceUsd: 4750,
        proposedSellPriceUsd: 4680,
        strategy: 'BALANCED',
        unitProfitUsd: 380,
        totalAnnualProfitUsd: 83600,
        marginPercent: 8.12,
        winProbabilityPercent: 85,
        notesVi: 'Tuyến Bờ Đông qua kênh đào Panama. Biên lãi tốt $380/cont.'
      },
      {
        id: 'lane-pp-04',
        pol: 'Hải Phòng (VNHPH)',
        pod: 'Savannah (USSAV)',
        factoryPlantOrigin: 'Nhà máy May Hải Dương',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 140,
        carrierSuggested: 'CMA CGM',
        transitTimeDays: 30,
        freeTimeDays: 14,
        baseCostUsd: 4400,
        clientTargetPriceUsd: 4850,
        proposedSellPriceUsd: 4790,
        strategy: 'BALANCED',
        unitProfitUsd: 390,
        totalAnnualProfitUsd: 54600,
        marginPercent: 8.14,
        winProbabilityPercent: 82,
        notesVi: 'Tuyến phục vụ trung tâm phân phối dệt may Bờ Đông.'
      },
      {
        id: 'lane-pp-05',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Rotterdam (NLRTM)',
        factoryPlantOrigin: 'Nhà máy May Xuất Khẩu Châu Âu - KCN VSIP 1, Bình Dương',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 70,
        carrierSuggested: 'Maersk Line',
        transitTimeDays: 26,
        freeTimeDays: 21,
        baseCostUsd: 2700,
        clientTargetPriceUsd: 3250,
        proposedSellPriceUsd: 3150,
        strategy: 'PROFIT_DRIVER',
        unitProfitUsd: 450,
        totalAnnualProfitUsd: 31500,
        marginPercent: 14.29,
        winProbabilityPercent: 88,
        notesVi: 'Tuyến Châu Âu đòi hỏi chứng chỉ xanh ETS. Lãi đậm $450/cont bù đắp các tuyến Bờ Tây.'
      },
      {
        id: 'lane-pp-06',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Hamburg (DEHAM)',
        factoryPlantOrigin: 'Nhà máy May Xuất Khẩu Châu Âu - KCN VSIP 1, Bình Dương',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 50,
        carrierSuggested: 'Hapag-Lloyd',
        transitTimeDays: 27,
        freeTimeDays: 21,
        baseCostUsd: 2750,
        clientTargetPriceUsd: 3300,
        proposedSellPriceUsd: 3200,
        strategy: 'PROFIT_DRIVER',
        unitProfitUsd: 450,
        totalAnnualProfitUsd: 22500,
        marginPercent: 14.06,
        winProbabilityPercent: 86,
        notesVi: 'Tuyến xuất khẩu Đức. Cấp trọn gói 21 ngày Free DEM/DET làm vũ khí cạnh tranh.'
      }
    ],
    executiveSummaryVi: 'Chiến lược thầu toàn diện cho Tập đoàn Phong Phú: Giảm giá sâu các tuyến Bờ Tây Mỹ (Long Beach, Los Angeles) để đè bẹp các forwarder khác và đạt điểm tối đa ở phần chấm thầu sản lượng lớn. Bù đắp biên lợi nhuận bằng các tuyến Bờ Đông và Châu Âu. Tổng thể mang lại $358,700 USD lợi nhuận gộp cả năm với xác suất thắng thầu ước tính đạt 88%.',
    slaCommitmentsVi: [
      'Cam kết tỷ lệ giao hàng đúng hẹn (On-Time Performance): >= 98.5%',
      'Cấp xác nhận Booking Request trong vòng tối đa 60 phút',
      'Đội ngũ chuyên trách (Dedicated KAM Team) hỗ trợ nhà máy 24/7',
      'Cam kết bồi thường 100 USD/ngày/cont nếu rớt tàu do lỗi hãng tàu đối tác',
      'Hỗ trợ công văn xin miễn phí 14 - 21 ngày Free Combined DEM/DET tại tất cả các cảng đến'
    ],
    createdDate: '2026-10-01',
    updatedDate: '2026-10-04'
  },
  {
    id: 'tnd-sakura-2026',
    tenderCode: 'TND-2026-SAKURA',
    titleVi: 'Tender Logistics Chuỗi Cung Ứng Linh Kiện Điện Tử & Cơ Khí Sakura VN',
    customerName: 'Công ty TNHH Cơ Khí Chính Xác Sakura VN',
    contactPerson: 'Chị Lê Thu Trang (Logistics Specialist)',
    contactPhone: '0933221144',
    contactEmail: 'trang.lt@sakura-vn.com',
    industrySector: 'Cơ Khí Chính Xác',
    contractPeriodMonths: 12,
    submissionDeadline: '2026-10-30',
    status: 'DRAFT',
    totalLanesCount: 4,
    totalAnnualVolumeTeu: 720,
    totalTenderRevenueUsd: 1845000,
    totalTenderCostUsd: 1630000,
    totalAnnualGrossProfitUsd: 215000,
    blendedMarginPercent: 11.65,
    estimatedWinProbabilityPercent: 85,
    lanes: [
      {
        id: 'lane-sk-01',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Tokyo (JPTYO)',
        factoryPlantOrigin: 'Nhà máy Sakura - KCN Nhơn Trạch 3, Đồng Nai',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 300,
        carrierSuggested: 'Evergreen Marine (EMC)',
        transitTimeDays: 7,
        freeTimeDays: 14,
        baseCostUsd: 750,
        clientTargetPriceUsd: 900,
        proposedSellPriceUsd: 870,
        strategy: 'VOLUME_DRIVER',
        unitProfitUsd: 120,
        totalAnnualProfitUsd: 36000,
        marginPercent: 13.79,
        winProbabilityPercent: 90,
        notesVi: 'Cam kết vỏ container Grade A khô sạch tuyệt đối.'
      },
      {
        id: 'lane-sk-02',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Yokohama (JPYOK)',
        factoryPlantOrigin: 'Nhà máy Sakura - KCN Nhơn Trạch 3, Đồng Nai',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 200,
        carrierSuggested: 'ONE Line',
        transitTimeDays: 8,
        freeTimeDays: 14,
        baseCostUsd: 760,
        clientTargetPriceUsd: 920,
        proposedSellPriceUsd: 880,
        strategy: 'VOLUME_DRIVER',
        unitProfitUsd: 120,
        totalAnnualProfitUsd: 24000,
        marginPercent: 13.64,
        winProbabilityPercent: 88,
        notesVi: 'Tàu chạy thẳng direct không ghé cảng trung gian.'
      },
      {
        id: 'lane-sk-03',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Busan (KRPUS)',
        factoryPlantOrigin: 'Nhà máy Sakura - KCN Nhơn Trạch 3, Đồng Nai',
        transportMode: 'SEA_FCL',
        containerType: "20'GP",
        annualVolumeTeu: 120,
        carrierSuggested: 'SITC',
        transitTimeDays: 6,
        freeTimeDays: 10,
        baseCostUsd: 550,
        clientTargetPriceUsd: 700,
        proposedSellPriceUsd: 670,
        strategy: 'BALANCED',
        unitProfitUsd: 120,
        totalAnnualProfitUsd: 14400,
        marginPercent: 17.91,
        winProbabilityPercent: 82,
        notesVi: 'Tần suất 3 chuyến/tuần.'
      },
      {
        id: 'lane-sk-04',
        pol: 'Cát Lái (VNCLI)',
        pod: 'Long Beach (USLGB)',
        factoryPlantOrigin: 'Nhà máy Sakura - KCN Nhơn Trạch 3, Đồng Nai',
        transportMode: 'SEA_FCL',
        containerType: "40'HC",
        annualVolumeTeu: 100,
        carrierSuggested: 'ONE Line',
        transitTimeDays: 16,
        freeTimeDays: 14,
        baseCostUsd: 3450,
        clientTargetPriceUsd: 4100,
        proposedSellPriceUsd: 3950,
        strategy: 'PROFIT_DRIVER',
        unitProfitUsd: 500,
        totalAnnualProfitUsd: 50000,
        marginPercent: 12.66,
        winProbabilityPercent: 80,
        notesVi: 'Tuyến Bắc Mỹ tạo ra 23% tổng lợi nhuận thầu.'
      }
    ],
    executiveSummaryVi: 'Đề xuất chuỗi logistics khép kín cho linh kiện cơ khí chính xác: Ưu tiên bảo vệ hàng hóa bằng vỏ cont đạt chuẩn Grade A và tốc độ chạy tàu nhanh nhất tuyến Nhật Bản, Hàn Quốc.',
    slaCommitmentsVi: [
      'Cam kết 100% vỏ container được kiểm định Grade A trước khi kéo về nhà máy',
      'Đúng giờ giao hàng tại cảng Tokyo/Yokohama đạt 99%',
      'Cung cấp hệ thống theo dõi GPS thời gian thực cho từng container'
    ],
    createdDate: '2026-10-02',
    updatedDate: '2026-10-04'
  }
];

let memoryTenders: EnterpriseTenderProject[] = [...SAMPLE_ENTERPRISE_TENDERS];

/**
 * Lấy toàn bộ danh sách gói thầu nhà máy
 */
export function getEnterpriseTenders(): EnterpriseTenderProject[] {
  return memoryTenders;
}

/**
 * Lấy thông tin chi tiết một gói thầu
 */
export function getTenderById(id: string): EnterpriseTenderProject | undefined {
  return memoryTenders.find(t => t.id === id);
}

/**
 * Tính toán lại toàn bộ metrics tài chính của gói thầu
 */
export function recalculateTenderTotals(lanes: TenderLaneItem[]): {
  totalAnnualVolumeTeu: number;
  totalTenderRevenueUsd: number;
  totalTenderCostUsd: number;
  totalAnnualGrossProfitUsd: number;
  blendedMarginPercent: number;
  estimatedWinProbabilityPercent: number;
} {
  let totalVol = 0;
  let totalRev = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let weightedWinProb = 0;

  for (const lane of lanes) {
    const vol = lane.annualVolumeTeu;
    const rev = lane.proposedSellPriceUsd * vol;
    const cst = lane.baseCostUsd * vol;
    const profit = rev - cst;

    totalVol += vol;
    totalRev += rev;
    totalCost += cst;
    totalProfit += profit;
    weightedWinProb += lane.winProbabilityPercent * vol;
  }

  const blendedMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
  const avgWinProb = totalVol > 0 ? Math.round(weightedWinProb / totalVol) : 0;

  return {
    totalAnnualVolumeTeu: totalVol,
    totalTenderRevenueUsd: totalRev,
    totalTenderCostUsd: totalCost,
    totalAnnualGrossProfitUsd: totalProfit,
    blendedMarginPercent: Math.round(blendedMargin * 100) / 100,
    estimatedWinProbabilityPercent: avgWinProb
  };
}

/**
 * Thuật toán tối ưu hóa cước toàn danh mục (Portfolio Margin Balancing Algorithm)
 */
export function optimizePortfolioPricing(
  tender: EnterpriseTenderProject,
  params: PortfolioOptimizationParams
): EnterpriseTenderProject {
  const updatedLanes = tender.lanes.map(lane => {
    let strategy: LaneTenderStrategy = lane.strategy;
    let proposedPrice = lane.proposedSellPriceUsd;
    let winProb = lane.winProbabilityPercent;

    if (strategy === 'VOLUME_DRIVER') {
      // Tuyến sản lượng lớn: Giá bán = Giá vốn + (Giá vốn * marginMax)
      // Thấp hơn mục tiêu khách để chắc thắng
      const targetMargin = (params.volumeDriverMarginMax || 4.5) / 100;
      proposedPrice = Math.round(lane.baseCostUsd / (1 - targetMargin));
      // Nếu giá tính ra cao hơn giá trần của khách, bắt buộc ép bằng hoặc dưới giá trần $20
      if (proposedPrice > lane.clientTargetPriceUsd) {
        proposedPrice = lane.clientTargetPriceUsd - 20;
      }
      winProb = 93;
    } else if (strategy === 'PROFIT_DRIVER') {
      // Tuyến ngách/phức tạp: Nâng biên lãi lên để bù đắp
      const targetMargin = (params.profitDriverMarginMin || 14.5) / 100;
      proposedPrice = Math.round(lane.baseCostUsd / (1 - targetMargin));
      winProb = 85;
    } else {
      // BALANCED
      const targetMargin = (params.targetBlendedMarginPercent || 8.5) / 100;
      proposedPrice = Math.round(lane.baseCostUsd / (1 - targetMargin));
      winProb = 87;
    }

    const unitProfit = proposedPrice - lane.baseCostUsd;
    const totalProfit = unitProfit * lane.annualVolumeTeu;
    const margin = proposedPrice > 0 ? (unitProfit / proposedPrice) * 100 : 0;

    return {
      ...lane,
      proposedSellPriceUsd: proposedPrice,
      unitProfitUsd: unitProfit,
      totalAnnualProfitUsd: totalProfit,
      marginPercent: Math.round(margin * 100) / 100,
      winProbabilityPercent: winProb
    };
  });

  const totals = recalculateTenderTotals(updatedLanes);

  const updatedTender: EnterpriseTenderProject = {
    ...tender,
    lanes: updatedLanes,
    ...totals,
    status: 'OPTIMIZING',
    updatedDate: new Date().toISOString().split('T')[0]
  };

  // Cập nhật memory
  const idx = memoryTenders.findIndex(t => t.id === tender.id);
  if (idx >= 0) memoryTenders[idx] = updatedTender;

  return updatedTender;
}

/**
 * Chuyển đổi gói thầu nhà máy thành Báo Giá Master (QuoteData) cho Quotation Workspace
 */
export function convertTenderToQuoteData(tender: EnterpriseTenderProject): QuoteData {
  const primaryLane = tender.lanes[0] || {
    pol: 'Cát Lái',
    pod: 'Long Beach',
    carrierSuggested: 'ONE Line',
    containerType: "40'HC"
  };

  const lineItems: LineItem[] = tender.lanes.map((lane, index) => {
    const qty = Math.max(1, Math.round(lane.annualVolumeTeu / 12)); // Số cont trung bình mỗi tháng
    const unitPrice = lane.proposedSellPriceUsd;
    const amountUsd = unitPrice * qty;
    const costPrice = lane.baseCostUsd;
    const costTotalUsd = costPrice * qty;
    const profitUsd = amountUsd - costTotalUsd;
    const margin = amountUsd > 0 ? (profitUsd / amountUsd) * 100 : 0;

    return {
      id: `tender-item-${index + 1}`,
      code: `TND-LANE-${index + 1}`,
      description: `[${lane.strategy}] Cước FCL: ${lane.pol} ➔ ${lane.pod} (${lane.factoryPlantOrigin})`,
      category: 'FREIGHT',
      location: 'FREIGHT',
      unit: 'CONTAINER',
      quantity: qty,
      unitPrice,
      amountUsd,
      amountVnd: amountUsd * 25400,
      costPrice,
      costTotalUsd,
      costTotalVnd: costTotalUsd * 25400,
      currency: 'USD',
      vatRate: 0,
      profitUsd,
      profitVnd: profitUsd * 25400,
      marginPercent: Math.round(margin * 100) / 100
    };
  });

  const grandTotalUsd = lineItems.reduce((s, i) => s + i.amountUsd, 0);
  const totalCostUsd = lineItems.reduce((s, i) => s + (i.costTotalUsd || 0), 0);
  const totalProfitUsd = grandTotalUsd - totalCostUsd;
  const overallMarginPercent = grandTotalUsd > 0 ? (totalProfitUsd / grandTotalUsd) * 100 : 0;
  const exRate = 25400;

  const defaultCompany: any = {
    companyId: 'company_profile',
    name: 'CÔNG TY TNHH BOGI LOGISTICS & SUPPLY CHAIN VIỆT NAM',
    englishName: 'BOGI LOGISTICS & SUPPLY CHAIN VIETNAM CO., LTD',
    shortName: 'BOGI LOGISTICS',
    taxId: '0316888999',
    address: 'Tầng 12, Tòa Nhà Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
    phone: '028 3888 9999',
    email: 'pricing@bogilogistics.vn',
    website: 'https://bogilogistics.vn',
    bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
    bankAccountNo: '0071001234567',
    bankAccountHolder: 'CONG TY TNHH BOGI LOGISTICS VIET NAM',
    bankSwiftCode: 'BFTVVNVX',
    salesRepName: 'Trưởng Phòng Đấu Thầu Doanh Nghiệp',
    salesRepTitle: 'Key Account Manager (Enterprise KAM)',
    salesRepPhone: '0909 123 456',
    salesRepEmail: 'tender-desk@bogilogistics.vn'
  };

  return {
    id: `quote-${tender.tenderCode.toLowerCase()}`,
    quoteNumber: `QUO-TENDER-${tender.tenderCode.replace('TND-', '')}`,
    createdDate: new Date().toISOString().split('T')[0],
    updatedDate: new Date().toISOString().split('T')[0],
    status: 'ISSUED',
    quoteCurrency: 'USD',
    exchangeRate: exRate,
    customer: {
      customerName: tender.customerName,
      companyName: tender.customerName,
      contactPerson: tender.contactPerson,
      phone: tender.contactPhone,
      email: tender.contactEmail,
      taxId: '0301987654',
      address: 'Khu Công Nghiệp Trọng Điểm, Việt Nam'
    },
    shipment: {
      mode: 'SEA_FCL',
      pol: primaryLane.pol,
      pod: primaryLane.pod,
      carrier: primaryLane.carrierSuggested,
      commodity: `Hàng dự án nhà máy (${tender.industrySector})`,
      containerType: primaryLane.containerType,
      quantity: tender.lanes.reduce((s, l) => s + Math.max(1, Math.round(l.annualVolumeTeu / 12)), 0),
      grossWeightKg: 250000,
      volumeCbm: 800,
      chargeableWeight: 250000
    },
    terms: {
      incoterm: 'FOB',
      validityDate: tender.submissionDeadline,
      paymentTerm: 'Thanh toán công nợ 30 ngày theo hợp đồng thầu',
      exclusionsNotes: `HỒ SƠ ĐẤU THẦU TOÀN DIỆN ${tender.tenderCode}:\n- Tổng sản lượng cam kết: ${tender.totalAnnualVolumeTeu} TEU/năm\n- Thời hạn hợp đồng: ${tender.contractPeriodMonths} tháng\n- Cam kết KPI On-time delivery >= 98.5%\n- Miễn phí 14 - 21 ngày Free DEM/DET`,
      bankAccountInfo: 'Tài khoản công ty tại Vietcombank - Chi nhánh TP.HCM'
    },
    company: defaultCompany,
    items: lineItems,
    subtotalUsd: grandTotalUsd,
    subtotalVnd: grandTotalUsd * exRate,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd,
    grandTotalVnd: grandTotalUsd * exRate,
    totalCostUsd,
    totalCostVnd: totalCostUsd * exRate,
    totalProfitUsd,
    totalProfitVnd: totalProfitUsd * exRate,
    overallMarginPercent: Math.round(overallMarginPercent * 100) / 100
  };
}

/**
 * Xuất ma trận thầu ra định dạng CSV chuẩn Excel
 */
export function exportTenderToCsv(tender: EnterpriseTenderProject): string {
  const headers = [
    'Mã Tuyến',
    'Nhà Máy Xuất Phát',
    'Cảng Đi (POL)',
    'Cảng Đến (POD)',
    'Loại Cont',
    'Sản Lượng (TEU/Năm)',
    'Hãng Tàu Chỉ Định',
    'Giá Trần Nhà Máy ($)',
    'Giá Chào Thầu ($)',
    'Giá Vốn ($)',
    'Lãi / Cont ($)',
    'Tổng Lợi Nhuận Năm ($)',
    'Biên Lãi (%)',
    'Chiến Lược',
    'Xác Suất Thắng (%)'
  ];

  const rows = tender.lanes.map(l => [
    l.id,
    `"${l.factoryPlantOrigin}"`,
    `"${l.pol}"`,
    `"${l.pod}"`,
    l.containerType,
    l.annualVolumeTeu,
    `"${l.carrierSuggested}"`,
    l.clientTargetPriceUsd,
    l.proposedSellPriceUsd,
    l.baseCostUsd,
    l.unitProfitUsd,
    l.totalAnnualProfitUsd,
    `${l.marginPercent}%`,
    l.strategy,
    `${l.winProbabilityPercent}%`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Lưu gói thầu vào Firestore
 */
export async function saveEnterpriseTender(tender: EnterpriseTenderProject): Promise<void> {
  try {
    if (db) {
      const ref = doc(db, 'enterpriseTenders', tender.id);
      await setDoc(ref, {
        ...tender,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch {
    // In-memory fallback
  }
}
