/**
 * Phase 65: Carrier Invoice Audit & Profit Leakage Guard Service
 * Cỗ Máy Tự Động Đối Soát Chi Phí Hãng Tàu & Chặn Rò Rỉ Lợi Nhuận Logistics
 */

import {
  CarrierInvoiceAuditRecord,
  CarrierBillingScorecard,
  ProfitLeakageGuardMetrics,
  DisputeResolutionStatus
} from '../../types/carrierInvoiceAudit';

const STORAGE_KEY = 'bogi_carrier_invoice_audits_v1';

export const PRESEEDED_CARRIER_INVOICE_AUDITS: CarrierInvoiceAuditRecord[] = [
  {
    id: 'audit-maersk-rotterdam-01',
    companyId: 'company-default-01',
    shipmentId: 'ship-seafood-001',
    bookingNumber: 'MSK-92819203',
    quoteNumber: 'QUO-2026-081',
    customerName: 'Công ty Cổ phần Thủy Sản Biển Đông',
    carrierName: 'Maersk Line',
    carrierInvoiceNumber: 'INV-MSK-VN-882191',
    invoiceDate: '2026-09-28',
    pol: 'Cát Lái (VNSGN)',
    pod: 'Rotterdam (NLRTM)',
    containerInfo: '2 x 40\'RF (Reefer đông lạnh -20°C)',
    expectedTotalBuyUsd: 7700,
    actualInvoicedTotalBuyUsd: 8880,
    customerTotalSellUsd: 8500,
    expectedGrossProfitUsd: 800,
    actualGrossProfitIfPaidUsd: -380, // Biến lãi $800 thành LỖ -$380!
    totalProfitLeakageUsd: 1180,
    profitMarginDropPercent: 147.5,
    status: 'DISCREPANCY_DETECTED',
    severity: 'CRITICAL',
    carrierContactEmail: 'vietnam.disputes@maersk.com',
    carrierPICName: 'Phòng Kế Toán Cước Maersk Việt Nam',
    lineItems: [
      {
        id: 'li-01',
        chargeCode: 'OFR',
        chargeNameVi: 'Cước Biển Ocean Freight (40\'RF)',
        agreedBuyRateUsd: 7200,
        actualInvoicedBuyUsd: 7200,
        customerSellRateUsd: 7900,
        discrepancyUsd: 0,
        isFlagged: false
      },
      {
        id: 'li-02',
        chargeCode: 'PSS',
        chargeNameVi: 'Phụ Phí Mùa Cao Điểm (Peak Season Surcharge)',
        agreedBuyRateUsd: 0,
        actualInvoicedBuyUsd: 700, // $350/cont x 2 cont phát sinh bất ngờ!
        customerSellRateUsd: 0,
        discrepancyUsd: 700,
        discrepancyType: 'UNEXPECTED_SURCHARGE',
        isFlagged: true,
        violationReason: 'Booking xác nhận giá ngày 10/09 cam kết No GRI/No PSS trong suốt tháng 9. Maersk tự ý tính thêm $350/cont.'
      },
      {
        id: 'li-03',
        chargeCode: 'DEM',
        chargeNameVi: 'Phí Phạt Lưu Bãi DEM tại Cảng Rotterdam',
        agreedBuyRateUsd: 0,
        actualInvoicedBuyUsd: 480, // Tính phạt 4 ngày
        customerSellRateUsd: 0,
        discrepancyUsd: 480,
        discrepancyType: 'DEM_DET_OVERBILLING',
        isFlagged: true,
        violationReason: 'Hợp đồng thỏa thuận cấp 14 ngày Combined Free-time DEM/DET. Khách lấy cont ngày thứ 11 nhưng Maersk vẫn tính phạt quá 7 ngày tiêu chuẩn.'
      },
      {
        id: 'li-04',
        chargeCode: 'THC',
        chargeNameVi: 'Phí Xếp Dỡ Tại Cảng Cát Lái (THC)',
        agreedBuyRateUsd: 500,
        actualInvoicedBuyUsd: 500,
        customerSellRateUsd: 600,
        discrepancyUsd: 0,
        isFlagged: false
      }
    ],
    disputeNotes: 'Đã tổng hợp chứng thư Booking Confirmation có điều khoản 14 ngày Free-time và cam kết Fixed Rate để gửi công văn khiếu nại.',
    createdAt: '2026-09-29T08:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z'
  },
  {
    id: 'audit-one-newyork-02',
    companyId: 'company-default-01',
    shipmentId: 'ship-textile-002',
    bookingNumber: 'ONE-77182910',
    quoteNumber: 'QUO-2026-092',
    customerName: 'Tập Đoàn Dệt May Quốc Tế Nam Định',
    carrierName: 'ONE (Ocean Network Express)',
    carrierInvoiceNumber: 'INV-ONE-HPH-99214',
    invoiceDate: '2026-09-25',
    pol: 'Hải Phòng (VNHPH)',
    pod: 'New York (USNYC)',
    containerInfo: '1 x 40\'HC Garment',
    expectedTotalBuyUsd: 4450,
    actualInvoicedTotalBuyUsd: 4620,
    customerTotalSellUsd: 4900,
    expectedGrossProfitUsd: 450,
    actualGrossProfitIfPaidUsd: 280,
    totalProfitLeakageUsd: 170,
    profitMarginDropPercent: 37.8,
    status: 'CREDIT_NOTE_ISSUED',
    severity: 'MEDIUM',
    carrierContactEmail: 'haiphong.finance@one-line.com',
    carrierPICName: 'Nguyễn Văn Đạt - Kế toán cước ONE HP',
    disputeFiledDate: '2026-09-26T09:00:00Z',
    resolvedDate: '2026-09-28T14:30:00Z',
    recoveredAmountUsd: 170, // Đã đòi lại thành công 100%
    lineItems: [
      {
        id: 'li-11',
        chargeCode: 'OFR',
        chargeNameVi: 'Cước Biển Ocean Freight (40\'HC)',
        agreedBuyRateUsd: 4200,
        actualInvoicedBuyUsd: 4200,
        customerSellRateUsd: 4600,
        discrepancyUsd: 0,
        isFlagged: false
      },
      {
        id: 'li-12',
        chargeCode: 'BLF',
        chargeNameVi: 'Phí Phát Hành Vận Đơn (Bill of Lading Fee)',
        agreedBuyRateUsd: 40,
        actualInvoicedBuyUsd: 80, // Tính 2 lần!
        customerSellRateUsd: 50,
        discrepancyUsd: 40,
        discrepancyType: 'DUPLICATE_LINE_ITEM',
        isFlagged: true,
        violationReason: 'Hãng tàu ONE tính trùng 2 lần phí Bill: 1 lần phát hành Original và 1 lần Surrender telex trong khi chỉ phát hành 1 bộ.'
      },
      {
        id: 'li-13',
        chargeCode: 'SEAL',
        chargeNameVi: 'Phí Kẹp Chì Niêm Phong Container',
        agreedBuyRateUsd: 10,
        actualInvoicedBuyUsd: 140, // Tính lố $130
        customerSellRateUsd: 15,
        discrepancyUsd: 130,
        discrepancyType: 'LOCAL_CHARGE_INFLATION',
        isFlagged: true,
        violationReason: 'Tự ý áp biểu phí Seal điện tử Smart Seal trong khi khách sử dụng chì cơ khí tiêu chuẩn.'
      }
    ],
    disputeNotes: 'Hãng tàu ONE đã xác nhận sai sót nghiệp vụ và đã phát hành Credit Note CN-ONE-2026-4401 hoàn trả $170.',
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-28T14:30:00Z'
  },
  {
    id: 'audit-cmacgm-longbeach-03',
    companyId: 'company-default-01',
    shipmentId: 'ship-wood-003',
    bookingNumber: 'CMA-88419201',
    quoteNumber: 'QUO-2026-104',
    customerName: 'Công Ty TNHH Chế Biến Gỗ An Cường',
    carrierName: 'CMA CGM',
    carrierInvoiceNumber: 'INV-CMA-HCM-104921',
    invoiceDate: '2026-10-01',
    pol: 'Cát Lái (VNSGN)',
    pod: 'Long Beach (USLGB)',
    containerInfo: '2 x 40\'HC',
    expectedTotalBuyUsd: 5400,
    actualInvoicedTotalBuyUsd: 5850,
    customerTotalSellUsd: 6100,
    expectedGrossProfitUsd: 700,
    actualGrossProfitIfPaidUsd: 250,
    totalProfitLeakageUsd: 450,
    profitMarginDropPercent: 64.3,
    status: 'DISPUTE_FILED',
    severity: 'HIGH',
    carrierContactEmail: 'sgn.disputes@cma-cgm.com',
    carrierPICName: 'Trần Minh Tuấn - Senior Billing Executive',
    disputeFiledDate: '2026-10-02T15:00:00Z',
    lineItems: [
      {
        id: 'li-21',
        chargeCode: 'OFR',
        chargeNameVi: 'Cước Biển Ocean Freight (2 x 40\'HC)',
        agreedBuyRateUsd: 4900,
        actualInvoicedBuyUsd: 4900,
        customerSellRateUsd: 5500,
        discrepancyUsd: 0,
        isFlagged: false
      },
      {
        id: 'li-22',
        chargeCode: 'CIC',
        chargeNameVi: 'Phí Mất Cân Bằng Vỏ Cont (Container Imbalance Charge)',
        agreedBuyRateUsd: 0,
        actualInvoicedBuyUsd: 300,
        customerSellRateUsd: 0,
        discrepancyUsd: 300,
        discrepancyType: 'UNEXPECTED_SURCHARGE',
        isFlagged: true,
        violationReason: 'Hợp đồng biểu phí năm của CMA CGM đã bao gồm trọn gói CIC vào cước chính, không được phép thu rời.'
      },
      {
        id: 'li-23',
        chargeCode: 'CLN',
        chargeNameVi: 'Phí Vệ Sinh Container Hàng Gỗ',
        agreedBuyRateUsd: 50,
        actualInvoicedBuyUsd: 200,
        customerSellRateUsd: 60,
        discrepancyUsd: 150,
        discrepancyType: 'LOCAL_CHARGE_INFLATION',
        isFlagged: true,
        violationReason: 'Áp biểu phí tẩy rửa hóa chất độc hại trong khi hàng gỗ khô chỉ chịu phí quét dọn cơ bản $25/cont.'
      }
    ],
    disputeNotes: 'Đã gửi công văn khiếu nại kèm hình ảnh chụp vỏ cont bàn giao tại depot không dính hóa chất.',
    createdAt: '2026-10-01T14:00:00Z',
    updatedAt: '2026-10-04T09:00:00Z'
  },
  {
    id: 'audit-msc-singapore-04',
    companyId: 'company-default-01',
    shipmentId: 'ship-coffee-004',
    bookingNumber: 'MSC-55192801',
    quoteNumber: 'QUO-2026-118',
    customerName: 'Tổng Công Ty Nông Sản & Cà Phê Tây Nguyên',
    carrierName: 'MSC (Mediterranean Shipping Co)',
    carrierInvoiceNumber: 'INV-MSC-VN-77123',
    invoiceDate: '2026-10-03',
    pol: 'Cái Mép (VNTCB)',
    pod: 'Singapore (SGSIN)',
    containerInfo: '3 x 20\'GP',
    expectedTotalBuyUsd: 2250,
    actualInvoicedTotalBuyUsd: 2250,
    customerTotalSellUsd: 2700,
    expectedGrossProfitUsd: 450,
    actualGrossProfitIfPaidUsd: 450,
    totalProfitLeakageUsd: 0,
    profitMarginDropPercent: 0,
    status: 'MATCHED_CLEAN',
    severity: 'LOW',
    lineItems: [
      {
        id: 'li-31',
        chargeCode: 'OFR',
        chargeNameVi: 'Cước Biển Ocean Freight (3 x 20\'GP)',
        agreedBuyRateUsd: 1800,
        actualInvoicedBuyUsd: 1800,
        customerSellRateUsd: 2160,
        discrepancyUsd: 0,
        isFlagged: false
      },
      {
        id: 'li-32',
        chargeCode: 'THC',
        chargeNameVi: 'Phí Xếp Dỡ Cảng Cái Mép',
        agreedBuyRateUsd: 450,
        actualInvoicedBuyUsd: 450,
        customerSellRateUsd: 540,
        discrepancyUsd: 0,
        isFlagged: false
      }
    ],
    disputeNotes: 'Hóa đơn đối soát khớp 100% không có sai lệch. Đã phê duyệt ủy nhiệm chi thanh toán cho MSC.',
    createdAt: '2026-10-03T09:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z'
  }
];

export class CarrierInvoiceAuditService {
  /**
   * Lấy danh sách toàn bộ hồ sơ đối soát hóa đơn hãng tàu
   */
  static getAuditRecords(): CarrierInvoiceAuditRecord[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESEEDED_CARRIER_INVOICE_AUDITS));
      }
    } catch {
      // fallback
    }
    return PRESEEDED_CARRIER_INVOICE_AUDITS;
  }

  static getAuditRecordById(id: string): CarrierInvoiceAuditRecord | undefined {
    return this.getAuditRecords().find(r => r.id === id);
  }

  /**
   * Lưu hoặc cập nhật hồ sơ đối soát
   */
  static saveAuditRecord(record: CarrierInvoiceAuditRecord): CarrierInvoiceAuditRecord {
    const records = this.getAuditRecords();
    const existingIndex = records.findIndex(r => r.id === record.id);
    record.updatedAt = new Date().toISOString();

    let updatedRecords: CarrierInvoiceAuditRecord[];
    if (existingIndex >= 0) {
      updatedRecords = [...records];
      updatedRecords[existingIndex] = record;
    } else {
      updatedRecords = [record, ...records];
    }

    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
      }
    } catch {
      // ignore storage quota
    }
    return record;
  }

  /**
   * Cập nhật trạng thái tranh chấp / giải quyết bồi hoàn
   */
  static updateDisputeStatus(
    recordId: string,
    newStatus: DisputeResolutionStatus,
    recoveredAmountUsd?: number,
    notes?: string
  ): CarrierInvoiceAuditRecord | undefined {
    const record = this.getAuditRecordById(recordId);
    if (!record) return undefined;

    const updated: CarrierInvoiceAuditRecord = {
      ...record,
      status: newStatus,
      disputeNotes: notes || record.disputeNotes,
      recoveredAmountUsd: recoveredAmountUsd !== undefined ? recoveredAmountUsd : record.recoveredAmountUsd,
      resolvedDate: (newStatus === 'CREDIT_NOTE_ISSUED' || newStatus === 'RESOLVED_REJECTED') ? new Date().toISOString() : record.resolvedDate,
      disputeFiledDate: newStatus === 'DISPUTE_FILED' ? new Date().toISOString() : record.disputeFiledDate,
      updatedAt: new Date().toISOString()
    };

    return this.saveAuditRecord(updated);
  }

  /**
   * Tự động sinh Công Văn Khiếu Nại Hãng Tàu (Official Carrier Dispute Letter)
   */
  static generateCarrierDisputeLetter(record: CarrierInvoiceAuditRecord): {
    subjectVi: string;
    subjectEn: string;
    letterBodyVi: string;
    letterBodyEn: string;
    totalDisputedAmountUsd: number;
  } {
    const flaggedItems = record.lineItems.filter(li => li.isFlagged);
    const totalDisputedAmountUsd = record.totalProfitLeakageUsd;

    const subjectVi = `[KHIẾU NẠI SAI LỆCH HÓA ĐƠN] B/L: ${record.bookingNumber} - Hóa đơn: ${record.carrierInvoiceNumber} (${record.carrierName})`;
    const subjectEn = `[FORMAL BILLING DISPUTE] B/L: ${record.bookingNumber} - Invoice: ${record.carrierInvoiceNumber} (${record.carrierName})`;

    const lineBreakdownVi = flaggedItems.map((item, idx) => 
      `${idx + 1}. Phụ phí: ${item.chargeNameVi} (${item.chargeCode})
   - Giá cam kết Booking: $${item.agreedBuyRateUsd.toLocaleString()} USD
   - Hãng tàu thực tính: $${item.actualInvoicedBuyUsd.toLocaleString()} USD
   - Chênh lệch tính lố: $${item.discrepancyUsd.toLocaleString()} USD
   - Căn cứ vi phạm: ${item.violationReason || 'Không có trong hợp đồng thỏa thuận ban đầu'}`
    ).join('\n\n');

    const lineBreakdownEn = flaggedItems.map((item, idx) => 
      `${idx + 1}. Charge: ${item.chargeCode} (${item.chargeNameVi})
   - Agreed Booking Rate: $${item.agreedBuyRateUsd.toLocaleString()} USD
   - Invoiced Amount: $${item.actualInvoicedBuyUsd.toLocaleString()} USD
   - Overcharge Discrepancy: $${item.discrepancyUsd.toLocaleString()} USD
   - Audit Finding: ${item.violationReason || 'Unauthorized surcharge not present in agreed Booking Confirmation'}`
    ).join('\n\n');

    const letterBodyVi = `Kính gửi: Bộ Phận Kế Toán & Đối Soát Cước - Hãng Tàu ${record.carrierName},
Đồng kính gửi: Ông/Bà Phụ Trách Kinh Doanh (Sales Rep) ${record.carrierName} Việt Nam,

Chúng tôi là bộ phận Tài Chính & Đối Soát Vận Tải của Bogi Logistics.

Qua công tác kiểm tra đối soát 3 chiều cho lô hàng:
- Mã Booking / B/L: ${record.bookingNumber}
- Hóa đơn hãng tàu: ${record.carrierInvoiceNumber} ngày ${record.invoiceDate}
- Tuyến vận chuyển: ${record.pol} đi ${record.pod} (${record.containerInfo})

Hệ thống kiểm toán tự động phát hiện số tiền chênh lệch tính lố là $${totalDisputedAmountUsd.toLocaleString()} USD với chi tiết như sau:

${lineBreakdownVi}

CĂN CỨ PHÁP LÝ & HỢP ĐỒNG:
Toàn bộ phụ phí trên đi ngược lại cam kết văn bản trong Booking Confirmation ngày phát hành. Việc tính thêm các khoản phụ phí bất ngờ này làm suy giảm nghiêm trọng biên lợi nhuận của chuyến hàng.

YÊU CẦU GIẢI QUYẾT:
1. Hãng tàu ${record.carrierName} vui lòng tạm dừng yêu cầu thanh toán đối với khoản chênh lệch $${totalDisputedAmountUsd.toLocaleString()} USD.
2. Phát hành Credit Note hoặc xuất lại Hóa đơn điều chỉnh về đúng tổng số tiền $${record.expectedTotalBuyUsd.toLocaleString()} USD trong vòng 48 giờ làm việc.

Rất mong nhận được phản hồi và sự hợp tác thiện chí từ Quý Hãng tàu.

Trân trọng kính thư,
Phòng Kế Toán Đối Soát & Kiểm Soát Rò Rỉ Lợi Nhuận - Bogi Logistics`;

    const letterBodyEn = `Dear Billing & Dispute Department - ${record.carrierName},
Cc: Commercial Account Representative,

We are writing from the Financial Audit & Logistics Operations team of Bogi Logistics.

Following our automated 3-way invoice reconciliation audit for:
- Booking / Bill of Lading Ref: ${record.bookingNumber}
- Carrier Invoice Ref: ${record.carrierInvoiceNumber} dated ${record.invoiceDate}
- Routing: ${record.pol} to ${record.pod} (${record.containerInfo})

Our audit engine has identified an unjustified overcharge totaling $${totalDisputedAmountUsd.toLocaleString()} USD. Detailed discrepancy line items:

${lineBreakdownEn}

CONTRACTUAL BASIS:
These surcharges are unauthorized and directly violate the confirmed terms stipulated in our Booking Confirmation. 

REQUESTED ACTION:
1. Please place a formal hold on the disputed discrepancy amount of $${totalDisputedAmountUsd.toLocaleString()} USD.
2. Issue a revised invoice or a Credit Note adjusting the total payable amount to the agreed $${record.expectedTotalBuyUsd.toLocaleString()} USD within 48 business hours.

We appreciate your swift resolution to maintain our strong commercial partnership.

Sincerely,
Carrier Audit & Margin Defense Department - Bogi Logistics`;

    return {
      subjectVi,
      subjectEn,
      letterBodyVi,
      letterBodyEn,
      totalDisputedAmountUsd
    };
  }

  /**
   * Tính toán Bảng Điểm Uy Tín Hóa Đơn Hãng Tàu (Billing Scorecard)
   */
  static getCarrierScorecards(): CarrierBillingScorecard[] {
    const records = this.getAuditRecords();
    const carrierMap = new Map<string, CarrierInvoiceAuditRecord[]>();

    records.forEach(r => {
      const list = carrierMap.get(r.carrierName) || [];
      list.push(r);
      carrierMap.set(r.carrierName, list);
    });

    const scorecards: CarrierBillingScorecard[] = [];

    carrierMap.forEach((carrierRecords, carrierName) => {
      const totalInvoices = carrierRecords.length;
      const cleanCount = carrierRecords.filter(r => r.status === 'MATCHED_CLEAN').length;
      const errorCount = totalInvoices - cleanCount;
      const errorRate = totalInvoices > 0 ? (errorCount / totalInvoices) * 100 : 0;
      
      const totalOverbilled = carrierRecords.reduce((sum, r) => sum + r.totalProfitLeakageUsd, 0);
      const totalRecovered = carrierRecords.reduce((sum, r) => sum + (r.recoveredAmountUsd || 0), 0);

      // Collect common discrepancy types
      const typesSet = new Set<any>();
      carrierRecords.forEach(r => {
        r.lineItems.forEach(li => {
          if (li.discrepancyType) typesSet.add(li.discrepancyType);
        });
      });

      let grade: CarrierBillingScorecard['reliabilityGrade'] = 'A';
      if (errorRate === 0) grade = 'A+';
      else if (errorRate <= 25) grade = 'A';
      else if (errorRate <= 50) grade = 'B';
      else if (errorRate <= 75) grade = 'C';
      else grade = 'F';

      scorecards.push({
        carrierName,
        totalInvoicesAudited: totalInvoices,
        flawlessInvoicesCount: cleanCount,
        erroneousInvoicesCount: errorCount,
        errorRatePercent: Math.round(errorRate),
        totalOverbilledAmountUsd: totalOverbilled,
        totalRecoveredAmountUsd: totalRecovered,
        avgResolutionDays: 3.5,
        commonOverchargeTypes: Array.from(typesSet),
        reliabilityGrade: grade
      });
    });

    return scorecards.sort((a, b) => b.totalOverbilledAmountUsd - a.totalOverbilledAmountUsd);
  }

  /**
   * Tổng hợp chỉ số rò rỉ lợi nhuận toàn hệ thống
   */
  static getLeakageMetrics(): ProfitLeakageGuardMetrics {
    const records = this.getAuditRecords();
    const totalOverbilled = records.reduce((sum, r) => sum + r.totalProfitLeakageUsd, 0);
    const activeDisputes = records.filter(r => r.status === 'DISCREPANCY_DETECTED' || r.status === 'DISPUTE_FILED');
    const activeAmount = activeDisputes.reduce((sum, r) => sum + r.totalProfitLeakageUsd, 0);
    const recoveredAmount = records.reduce((sum, r) => sum + (r.recoveredAmountUsd || 0), 0);

    const recoveryRate = totalOverbilled > 0 ? (recoveredAmount / totalOverbilled) * 100 : 0;
    const scorecards = this.getCarrierScorecards();
    const highRiskCarriers = scorecards.filter(s => s.errorRatePercent >= 50).length;

    return {
      totalInvoicesAudited: records.length,
      totalPreventedLeakageUsd: totalOverbilled,
      totalPreventedLeakageVnd: `${((totalOverbilled * 25450) / 1000000).toFixed(1)} Triệu VNĐ`,
      activeDisputesCount: activeDisputes.length,
      activeDisputedAmountUsd: activeAmount,
      successfulRecoveryRatePercent: Math.round(recoveryRate),
      highRiskCarriersCount: highRiskCarriers
    };
  }
}
