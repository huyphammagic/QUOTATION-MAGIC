/**
 * Phase 66: Quotation Payment & Receivable Service
 * Quản lý Thanh toán, Theo dõi Công nợ Báo giá & Tự động Tạo Thư Nhắc Nợ
 */

import {
  QuotationPaymentRecord,
  PaymentTrancheReceipt,
  PaymentStatus,
  PaymentHubMetrics
} from '../../types/quotationPayment';
import { QuoteData } from '../../types/logistics';

const STORAGE_KEY = 'bogi_quotation_payments_v1';

// Dữ liệu mẫu chuẩn nghiệp vụ Logistics Việt Nam
export const PRESEEDED_PAYMENT_RECORDS: QuotationPaymentRecord[] = [
  {
    id: 'pay_rec_001',
    companyId: 'company_default',
    quotationId: 'quote_sf_001',
    quoteNumber: 'Q-2026-0881',
    customerName: 'Công ty CP Thủy Hải Sản Biển Đông (East Sea Seafood Corp)',
    customerTaxCode: '0312456789',
    customerContactPerson: 'Chị Nguyễn Thị Mai (Trưởng Phòng Thu Mua)',
    customerContactPhone: '0912 345 678',
    customerContactEmail: 'mai.nguyen@eastseaseafood.vn',
    totalReceivableUsd: 14600,
    totalReceivableVnd: 365000000,
    totalPaidUsd: 5000,
    totalPaidVnd: 125000000,
    outstandingBalanceUsd: 9600,
    outstandingBalanceVnd: 240000000,
    paymentStatus: 'PARTIALLY_PAID',
    creditTermDays: 15,
    invoiceOrQuoteDate: '2026-09-25',
    creditDueDate: '2026-10-10',
    isOverdue: false,
    daysOverdue: 0,
    lastPaymentDate: '2026-09-28',
    receipts: [
      {
        id: 'rec_001_1',
        quotationId: 'quote_sf_001',
        quoteNumber: 'Q-2026-0881',
        amount: 5000,
        currency: 'USD',
        exchangeRate: 25000,
        amountVndEquivalent: 125000000,
        amountUsdEquivalent: 5000,
        paymentDate: '2026-09-28',
        paymentMethod: 'BANK_TRANSFER',
        bankTransactionRef: 'FT2627198273618',
        bankAccountName: 'Vietcombank - CN Tân Bình',
        recordedBy: 'Kế toán Thu (Thùy Linh)',
        notes: 'Đặt cọc 34% booking 4 cont 40RF đi Los Angeles',
        attachmentName: 'UNC_BienDong_5000USD.pdf',
        createdAt: '2026-09-28T09:30:00Z',
      }
    ],
    notes: 'Khách cam kết thanh toán nốt 9,600 USD ngay khi nhận Surrendered B/L',
    createdAt: '2026-09-25T08:00:00Z',
    updatedAt: '2026-09-28T09:30:00Z'
  },
  {
    id: 'pay_rec_002',
    companyId: 'company_default',
    quotationId: 'quote_garment_002',
    quoteNumber: 'Q-2026-0842',
    customerName: 'Tập Đoàn May Mặc & Dệt Kim Việt Thắng Garment',
    customerTaxCode: '0101998877',
    customerContactPerson: 'Anh Trần Hùng (Logistics Manager)',
    customerContactPhone: '0908 889 999',
    customerContactEmail: 'hung.tran@vietthanggarment.com',
    totalReceivableUsd: 8400,
    totalReceivableVnd: 210000000,
    totalPaidUsd: 0,
    totalPaidVnd: 0,
    outstandingBalanceUsd: 8400,
    outstandingBalanceVnd: 210000000,
    paymentStatus: 'OVERDUE',
    creditTermDays: 14,
    invoiceOrQuoteDate: '2026-09-10',
    creditDueDate: '2026-09-24',
    isOverdue: true,
    daysOverdue: 11,
    receipts: [],
    notes: 'Đã trễ hạn thanh toán 11 ngày. Cần kế toán & sales gửi công văn nhắc nợ khẩn trước khi tàu cập Hamburg.',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-10-05T06:00:00Z'
  },
  {
    id: 'pay_rec_003',
    companyId: 'company_default',
    quotationId: 'quote_elec_003',
    quoteNumber: 'Q-2026-0799',
    customerName: 'Samsung Electronics Vendor Logistics Vietnam',
    customerTaxCode: '0309991122',
    customerContactPerson: 'Ms. Clara Park (Finance & SCM)',
    customerContactPhone: '0938 112 233',
    customerContactEmail: 'clara.park@partner-samsung.vn',
    totalReceivableUsd: 22500,
    totalReceivableVnd: 562500000,
    totalPaidUsd: 22500,
    totalPaidVnd: 562500000,
    outstandingBalanceUsd: 0,
    outstandingBalanceVnd: 0,
    paymentStatus: 'PAID',
    creditTermDays: 30,
    invoiceOrQuoteDate: '2026-08-20',
    creditDueDate: '2026-09-20',
    isOverdue: false,
    daysOverdue: 0,
    lastPaymentDate: '2026-09-18',
    receipts: [
      {
        id: 'rec_003_1',
        quotationId: 'quote_elec_003',
        quoteNumber: 'Q-2026-0799',
        amount: 22500,
        currency: 'USD',
        exchangeRate: 25000,
        amountVndEquivalent: 562500000,
        amountUsdEquivalent: 22500,
        paymentDate: '2026-09-18',
        paymentMethod: 'BANK_TRANSFER',
        bankTransactionRef: 'CITI-VN-20260918-0992',
        bankAccountName: 'Citibank Vietnam',
        recordedBy: 'Kế toán Trưởng (Minh Hòa)',
        notes: 'Thanh toán đúng hạn 100% qua điện chuyển tiền Citibank',
        attachmentName: 'Swift_Receipt_22500USD.pdf',
        createdAt: '2026-09-18T14:15:00Z',
      }
    ],
    notes: 'Khách VIP độ tín nhiệm thanh toán AAA (Flawless Credit)',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-09-18T14:15:00Z'
  },
  {
    id: 'pay_rec_004',
    companyId: 'company_default',
    quotationId: 'quote_wood_004',
    quoteNumber: 'Q-2026-0895',
    customerName: 'Công Ty Sản Xuất Đồ Gỗ Mỹ Nghệ Hoàng Gia',
    customerTaxCode: '3701239988',
    customerContactPerson: 'Anh Hoàng Văn Tuấn (Giám Đốc)',
    customerContactPhone: '0979 123 456',
    customerContactEmail: 'tuan.hoang@hoanggiawood.vn',
    totalReceivableUsd: 6200,
    totalReceivableVnd: 155000000,
    totalPaidUsd: 0,
    totalPaidVnd: 0,
    outstandingBalanceUsd: 6200,
    outstandingBalanceVnd: 155000000,
    paymentStatus: 'UNPAID',
    creditTermDays: 0, // Prepaid
    invoiceOrQuoteDate: '2026-10-02',
    creditDueDate: '2026-10-06',
    isOverdue: false,
    daysOverdue: 0,
    receipts: [],
    notes: 'Điều khoản: Thanh toán 100% trước khi phát hành Master B/L',
    createdAt: '2026-10-02T11:00:00Z',
    updatedAt: '2026-10-02T11:00:00Z'
  }
];

export class QuotationPaymentService {
  /**
   * Lấy danh sách toàn bộ hồ sơ thanh toán công nợ báo giá
   */
  static getPaymentRecords(companyId?: string): QuotationPaymentRecord[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as QuotationPaymentRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Cập nhật lại trạng thái quá hạn động theo thời gian thực
            return parsed.map(r => this.refreshOverdueStatus(r));
          }
        }
      }
    } catch (e) {
      console.warn('Error reading quotation payments from storage, falling back to preseeded:', e);
    }

    return PRESEEDED_PAYMENT_RECORDS.map(r => this.refreshOverdueStatus(r));
  }

  /**
   * Lấy hồ sơ thanh toán theo Quotation ID hoặc Quote Number
   */
  static getPaymentRecordByQuoteId(quoteIdOrNumber: string): QuotationPaymentRecord | undefined {
    const all = this.getPaymentRecords();
    return all.find(r => r.quotationId === quoteIdOrNumber || r.quoteNumber === quoteIdOrNumber);
  }

  /**
   * Lưu hồ sơ thanh toán
   */
  static savePaymentRecord(record: QuotationPaymentRecord): QuotationPaymentRecord {
    const all = this.getPaymentRecords();
    const index = all.findIndex(r => r.id === record.id || r.quotationId === record.quotationId);
    
    const refreshed = this.refreshOverdueStatus({
      ...record,
      updatedAt: new Date().toISOString()
    });

    let updated: QuotationPaymentRecord[];
    if (index >= 0) {
      updated = [...all];
      updated[index] = refreshed;
    } else {
      updated = [refreshed, ...all];
    }

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving quotation payment record:', e);
      }
    }

    return refreshed;
  }

  /**
   * Ghi nhận một đợt thanh toán mới (Add Payment Tranche)
   */
  static recordPaymentTranche(
    quoteIdOrNumber: string,
    trancheData: Omit<PaymentTrancheReceipt, 'id' | 'createdAt'>
  ): QuotationPaymentRecord {
    let record = this.getPaymentRecordByQuoteId(quoteIdOrNumber);

    if (!record) {
      // Tự động khởi tạo hồ sơ nếu chưa có
      record = {
        id: `pay_${Date.now()}`,
        companyId: 'company_default',
        quotationId: quoteIdOrNumber,
        quoteNumber: trancheData.quoteNumber || quoteIdOrNumber,
        customerName: 'Khách hàng',
        totalReceivableUsd: trancheData.amountUsdEquivalent || trancheData.amount,
        totalReceivableVnd: trancheData.amountVndEquivalent || (trancheData.amount * (trancheData.exchangeRate || 25000)),
        totalPaidUsd: 0,
        totalPaidVnd: 0,
        outstandingBalanceUsd: trancheData.amountUsdEquivalent || trancheData.amount,
        outstandingBalanceVnd: trancheData.amountVndEquivalent || (trancheData.amount * (trancheData.exchangeRate || 25000)),
        paymentStatus: 'UNPAID',
        creditTermDays: 0,
        invoiceOrQuoteDate: new Date().toISOString().split('T')[0],
        creditDueDate: new Date().toISOString().split('T')[0],
        isOverdue: false,
        daysOverdue: 0,
        receipts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const newReceipt: PaymentTrancheReceipt = {
      ...trancheData,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };

    const newReceipts = [newReceipt, ...record.receipts];

    // Tính tổng số tiền đã thu
    let totalPaidUsd = 0;
    let totalPaidVnd = 0;

    newReceipts.forEach(r => {
      if (r.currency === 'USD') {
        totalPaidUsd += r.amount;
        totalPaidVnd += r.amountVndEquivalent || (r.amount * r.exchangeRate);
      } else {
        totalPaidVnd += r.amount;
        totalPaidUsd += r.amountUsdEquivalent || (r.amount / (r.exchangeRate || 25000));
      }
    });

    const outstandingUsd = Math.max(0, record.totalReceivableUsd - totalPaidUsd);
    const outstandingVnd = Math.max(0, record.totalReceivableVnd - totalPaidVnd);

    const updatedRecord: QuotationPaymentRecord = {
      ...record,
      totalPaidUsd: Math.round(totalPaidUsd * 100) / 100,
      totalPaidVnd: Math.round(totalPaidVnd),
      outstandingBalanceUsd: Math.round(outstandingUsd * 100) / 100,
      outstandingBalanceVnd: Math.round(outstandingVnd),
      lastPaymentDate: trancheData.paymentDate,
      receipts: newReceipts,
      updatedAt: new Date().toISOString()
    };

    return this.savePaymentRecord(updatedRecord);
  }

  /**
   * Xóa một đợt thanh toán (hoàn tác)
   */
  static deletePaymentTranche(quoteIdOrNumber: string, receiptId: string): QuotationPaymentRecord | undefined {
    const record = this.getPaymentRecordByQuoteId(quoteIdOrNumber);
    if (!record) return undefined;

    const filteredReceipts = record.receipts.filter(r => r.id !== receiptId);

    let totalPaidUsd = 0;
    let totalPaidVnd = 0;
    let lastDate: string | undefined = undefined;

    filteredReceipts.forEach(r => {
      if (r.currency === 'USD') {
        totalPaidUsd += r.amount;
        totalPaidVnd += r.amountVndEquivalent || (r.amount * r.exchangeRate);
      } else {
        totalPaidVnd += r.amount;
        totalPaidUsd += r.amountUsdEquivalent || (r.amount / (r.exchangeRate || 25000));
      }
      if (!lastDate || r.paymentDate > lastDate) {
        lastDate = r.paymentDate;
      }
    });

    const outstandingUsd = Math.max(0, record.totalReceivableUsd - totalPaidUsd);
    const outstandingVnd = Math.max(0, record.totalReceivableVnd - totalPaidVnd);

    const updatedRecord: QuotationPaymentRecord = {
      ...record,
      totalPaidUsd: Math.round(totalPaidUsd * 100) / 100,
      totalPaidVnd: Math.round(totalPaidVnd),
      outstandingBalanceUsd: Math.round(outstandingUsd * 100) / 100,
      outstandingBalanceVnd: Math.round(outstandingVnd),
      lastPaymentDate: lastDate,
      receipts: filteredReceipts,
      updatedAt: new Date().toISOString()
    };

    return this.savePaymentRecord(updatedRecord);
  }

  /**
   * Tự động đồng bộ từ Báo giá (QuoteData) vào sổ theo dõi công nợ
   */
  static syncFromQuote(quote: QuoteData, defaultCreditTermDays = 15): QuotationPaymentRecord {
    const existing = this.getPaymentRecordByQuoteId(quote.id || quote.quoteNumber);
    const rate = quote.exchangeRate || 25000;
    const totalUsd = quote.grandTotalUsd || (quote as any).totalAmountUsd || 0;
    const totalVnd = quote.grandTotalVnd || (quote as any).totalAmountVnd || (totalUsd * rate);

    const quoteDate = quote.createdDate || new Date().toISOString().split('T')[0];
    
    // Tính ngày đến hạn công nợ
    const creditDays = existing ? existing.creditTermDays : defaultCreditTermDays;
    const dueDateObj = new Date(quoteDate);
    dueDateObj.setDate(dueDateObj.getDate() + creditDays);
    const creditDueDate = dueDateObj.toISOString().split('T')[0];

    const customerName = quote.customer?.companyName || (quote as any).customerName || 'Khách Hàng Chưa Đặt Tên';
    const customerPhone = quote.customer?.phone || (quote.customer as any)?.contactPhone || '';
    const customerEmail = quote.customer?.email || (quote.customer as any)?.contactEmail || '';
    const customerPerson = quote.customer?.contactPerson || '';
    const customerTax = quote.customer?.taxId || (quote.customer as any)?.taxCode || '';

    if (existing) {
      const outstandingUsd = Math.max(0, totalUsd - existing.totalPaidUsd);
      const outstandingVnd = Math.max(0, totalVnd - existing.totalPaidVnd);

      const updated: QuotationPaymentRecord = {
        ...existing,
        quoteNumber: quote.quoteNumber,
        customerName,
        customerTaxCode: customerTax || existing.customerTaxCode,
        customerContactPerson: customerPerson || existing.customerContactPerson,
        customerContactPhone: customerPhone || existing.customerContactPhone,
        customerContactEmail: customerEmail || existing.customerContactEmail,
        totalReceivableUsd: totalUsd,
        totalReceivableVnd: totalVnd,
        outstandingBalanceUsd: Math.round(outstandingUsd * 100) / 100,
        outstandingBalanceVnd: Math.round(outstandingVnd),
        creditDueDate: existing.creditDueDate || creditDueDate,
        updatedAt: new Date().toISOString()
      };
      return this.savePaymentRecord(updated);
    }

    const newRecord: QuotationPaymentRecord = {
      id: `pay_${Date.now()}`,
      companyId: quote.companyId || 'company_default',
      quotationId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName,
      customerTaxCode: customerTax,
      customerContactPerson: customerPerson,
      customerContactPhone: customerPhone,
      customerContactEmail: customerEmail,
      totalReceivableUsd: totalUsd,
      totalReceivableVnd: totalVnd,
      totalPaidUsd: 0,
      totalPaidVnd: 0,
      outstandingBalanceUsd: totalUsd,
      outstandingBalanceVnd: totalVnd,
      paymentStatus: 'UNPAID',
      creditTermDays: creditDays,
      invoiceOrQuoteDate: quoteDate,
      creditDueDate,
      isOverdue: false,
      daysOverdue: 0,
      receipts: [],
      notes: quote.terms?.paymentTerm || 'Thanh toán theo điều khoản hợp đồng',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.savePaymentRecord(newRecord);
  }

  /**
   * Cập nhật trạng thái quá hạn và tính toán lại status
   */
  private static refreshOverdueStatus(record: QuotationPaymentRecord): QuotationPaymentRecord {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const dueDate = new Date(record.creditDueDate || record.invoiceOrQuoteDate);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const isOverdue = diffDays > 0 && record.outstandingBalanceUsd > 0.01;
    const daysOverdue = isOverdue ? diffDays : 0;

    let paymentStatus: PaymentStatus = record.paymentStatus;

    if (record.outstandingBalanceUsd <= 0.01 && record.totalPaidUsd > 0) {
      paymentStatus = 'PAID';
    } else if (isOverdue) {
      paymentStatus = 'OVERDUE';
    } else if (record.totalPaidUsd > 0.01 && record.outstandingBalanceUsd > 0.01) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (record.totalPaidUsd <= 0.01) {
      paymentStatus = 'UNPAID';
    }

    return {
      ...record,
      isOverdue,
      daysOverdue,
      paymentStatus
    };
  }

  /**
   * Tạo Mẫu Thư Nhắc Nợ Tự Động (Payment Reminder Letter) Song Ngữ
   */
  static generatePaymentReminder(
    record: QuotationPaymentRecord,
    companyBankInfo?: string,
    companyName = 'BOGI LOGISTICS & FORWARDING'
  ): {
    vi: { subject: string; body: string };
    en: { subject: string; body: string };
  } {
    const bankDetails = companyBankInfo || 'VIETCOMBANK - STK: 0071001234567 - CTK: CTY TNHH LOGISTICS';
    const contactPerson = record.customerContactPerson || 'Quý Khách Hàng';
    const overdueTextVi = record.daysOverdue > 0 
      ? `(Đã quá hạn ${record.daysOverdue} ngày kể từ ngày ${record.creditDueDate})`
      : `(Hạn thanh toán: ${record.creditDueDate})`;
    const overdueTextEn = record.daysOverdue > 0
      ? `(Overdue by ${record.daysOverdue} days since ${record.creditDueDate})`
      : `(Due date: ${record.creditDueDate})`;

    const viSubject = `[NHẮC THANH TOÁN] - Báo Giá & Cước Vận Chuyển ${record.quoteNumber} - ${record.customerName}`;
    const viBody = `Kính gửi: ${contactPerson} / Ban Kế Toán - ${record.customerName},

Lời đầu tiên, ${companyName} xin gửi lời chào trân trọng và cảm ơn Quý công ty đã tin tưởng sử dụng dịch vụ giao nhận vận tải của chúng tôi trong thời gian qua.

Hệ thống kế toán chúng tôi xin phép gửi thông tin đối soát công nợ chi tiết cho Báo giá / Lô hàng số ${record.quoteNumber}:

1. THÔNG TIN BÁO GIÁ & CÔNG NỢ:
• Số Báo Giá: ${record.quoteNumber}
• Khách Hàng: ${record.customerName}
• Tổng giá trị thanh toán: $${record.totalReceivableUsd.toLocaleString()} USD (~ ${record.totalReceivableVnd.toLocaleString()} VNĐ)
• Số tiền đã thanh toán: $${record.totalPaidUsd.toLocaleString()} USD (~ ${record.totalPaidVnd.toLocaleString()} VNĐ)
• SỐ DƯ CÒN NỢ CẦN THANH TOÁN: $${record.outstandingBalanceUsd.toLocaleString()} USD (~ ${record.outstandingBalanceVnd.toLocaleString()} VNĐ)
• Tình trạng: ${record.isOverdue ? '⚠️ ĐÃ QUÁ HẠN CÔNG NỢ' : '⏳ Trong hạn mức công nợ'} ${overdueTextVi}

2. THÔNG TIN TÀI KHOẢN THỤ HƯỞNG:
${bankDetails}
• Nội dung chuyển khoản: Thanh toan cuoc ${record.quoteNumber} - ${record.customerName}

Kính mong Quý công ty thu xếp thanh toán số dư còn lại sớm nhất để chúng tôi tiến hành phát hành Vận Đơn (Surrendered B/L / Seaway Bill) và lệnh giao hàng D/O kịp thời cho lô hàng.

Nếu Quý công ty đã thực hiện lệnh chuyển khoản, xin vui lòng gửi lại hình ảnh Ủy Nhiệm Chi (UNC) để kế toán chúng tôi kiểm tra và cập nhật tức thì.

Trân trọng cảm ơn sự hợp tác của Quý công ty!
--------------------------------------------------
PHÒNG TÀI CHÍNH & KẾ TOÁN CÔNG NỢ
${companyName}`;

    const enSubject = `[PAYMENT REMINDER] - Freight Quotation & Invoice ${record.quoteNumber} - ${record.customerName}`;
    const enBody = `Dear ${contactPerson} / Accounting Dept - ${record.customerName},

Greetings from ${companyName}. We truly appreciate your valued business and continuous partnership.

This is a friendly statement regarding the outstanding balance for Quotation / Shipment Ref: ${record.quoteNumber}:

1. STATEMENT SUMMARY:
• Quotation / Invoice Ref: ${record.quoteNumber}
• Customer: ${record.customerName}
• Total Amount: $${record.totalReceivableUsd.toLocaleString()} USD (~ ${record.totalReceivableVnd.toLocaleString()} VND)
• Amount Received: $${record.totalPaidUsd.toLocaleString()} USD (~ ${record.totalPaidVnd.toLocaleString()} VND)
• OUTSTANDING BALANCE DUE: $${record.outstandingBalanceUsd.toLocaleString()} USD (~ ${record.outstandingBalanceVnd.toLocaleString()} VND)
• Status: ${record.isOverdue ? '⚠️ OVERDUE' : '⏳ Pending Payment'} ${overdueTextEn}

2. REMITTANCE BANK DETAILS:
${bankDetails}
• Payment Reference: Payment for ${record.quoteNumber} - ${record.customerName}

Please arrange the wire transfer at your earliest convenience to ensure smooth cargo delivery and prompt release of the Original/Surrendered Bill of Lading.

Kindly disregard this notice if payment has already been remitted, and please forward us a copy of the bank transfer slip.

Best regards,
FINANCE & RECEIVABLES DEPARTMENT
${companyName}`;

    return {
      vi: { subject: viSubject, body: viBody },
      en: { subject: enSubject, body: enBody }
    };
  }

  /**
   * Tính toán các chỉ số tổng hợp dòng tiền công nợ
   */
  static getPaymentMetrics(): PaymentHubMetrics {
    const records = this.getPaymentRecords();

    let totalReceivableUsd = 0;
    let totalPaidUsd = 0;
    let totalOutstandingUsd = 0;
    let totalOverdueUsd = 0;

    let paidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    records.forEach(r => {
      totalReceivableUsd += r.totalReceivableUsd;
      totalPaidUsd += r.totalPaidUsd;
      totalOutstandingUsd += r.outstandingBalanceUsd;

      if (r.isOverdue) {
        totalOverdueUsd += r.outstandingBalanceUsd;
        overdueCount++;
      }

      if (r.paymentStatus === 'PAID') paidCount++;
      else if (r.paymentStatus === 'PARTIALLY_PAID') partiallyPaidCount++;
      else if (r.paymentStatus === 'UNPAID') unpaidCount++;
    });

    const collectionRatePercent = totalReceivableUsd > 0 
      ? Math.round((totalPaidUsd / totalReceivableUsd) * 1000) / 10
      : 100;

    return {
      totalReceivableUsd: Math.round(totalReceivableUsd),
      totalPaidUsd: Math.round(totalPaidUsd),
      totalOutstandingUsd: Math.round(totalOutstandingUsd),
      totalOverdueUsd: Math.round(totalOverdueUsd),
      collectionRatePercent,
      totalInvoicesCount: records.length,
      paidCount,
      partiallyPaidCount,
      unpaidCount,
      overdueCount
    };
  }
}
