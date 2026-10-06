/**
 * Phase 66: Quotation Payment & Receivable Hub Types
 * Trung Tâm Kiểm Soát Thanh Toán & Thu Hồi Công Nợ Báo Giá
 */

export type PaymentStatus = 
  | 'UNPAID'          // Chưa thanh toán
  | 'PARTIALLY_PAID'   // Đã thanh toán 1 phần / Đặt cọc
  | 'PAID'            // Đã thanh toán đủ 100%
  | 'OVERDUE'         // Quá hạn công nợ
  | 'REFUNDED';       // Đã hoàn tiền

export type PaymentMethod = 
  | 'BANK_TRANSFER'    // Chuyển khoản ngân hàng (UNC)
  | 'CASH'             // Tiền mặt
  | 'LETTER_OF_CREDIT' // Thư tín dụng (L/C)
  | 'CREDIT_CARD'      // Thẻ tín dụng
  | 'CHECK'            // Séc / Hối phiếu
  | 'OTHER';           // Khác

// 1. Chi tiết một đợt thu tiền (Payment Tranche / Receipt)
export interface PaymentTrancheReceipt {
  id: string;
  quotationId: string;
  quoteNumber: string;
  amount: number;
  currency: 'USD' | 'VND';
  exchangeRate: number;
  amountVndEquivalent: number;
  amountUsdEquivalent: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankTransactionRef?: string;   // Mã giao dịch / Số ủy nhiệm chi (UNC)
  bankAccountName?: string;      // Tên ngân hàng thụ hưởng
  recordedBy: string;            // Người ghi nhận kế toán / sales
  notes?: string;
  attachmentName?: string;       // File ảnh chụp UNC hoặc chứng từ chuyển khoản
  createdAt: string;
}

// 2. Hồ sơ theo dõi công nợ của 1 Báo giá (Quotation Payment Record)
export interface QuotationPaymentRecord {
  id: string;
  companyId: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  customerTaxCode?: string;
  customerContactPerson?: string;
  customerContactPhone?: string;
  customerContactEmail?: string;
  
  // Tổng giá trị phải thu
  totalReceivableUsd: number;
  totalReceivableVnd: number;
  
  // Đã thu
  totalPaidUsd: number;
  totalPaidVnd: number;
  
  // Còn nợ
  outstandingBalanceUsd: number;
  outstandingBalanceVnd: number;
  
  // Trạng thái & Hạn công nợ
  paymentStatus: PaymentStatus;
  creditTermDays: number;         // 0: Thanh toán ngay (Prepaid), 15, 30, 45, 60 ngày
  invoiceOrQuoteDate: string;     // Ngày tính hạn công nợ
  creditDueDate: string;          // Ngày đến hạn thanh toán
  isOverdue: boolean;
  daysOverdue: number;            // Số ngày trễ nợ (> 0 nếu quá hạn)
  
  lastPaymentDate?: string;
  receipts: PaymentTrancheReceipt[];
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 3. Chỉ số tổng hợp dòng tiền công nợ (Receivables & Cashflow Metrics)
export interface PaymentHubMetrics {
  totalReceivableUsd: number;
  totalPaidUsd: number;
  totalOutstandingUsd: number;
  totalOverdueUsd: number;
  collectionRatePercent: number;
  
  totalInvoicesCount: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  overdueCount: number;
}
