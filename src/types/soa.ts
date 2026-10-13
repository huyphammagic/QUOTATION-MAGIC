import { CustomerInfo, CompanyProfile } from './logistics';
import { DebitNoteBankAccount } from './debitNote';

export type SoaAgingBracket = 
  | 'CURRENT'     // Còn trong hạn
  | '1_15'        // Quá hạn 1 - 15 ngày
  | '16_30'       // Quá hạn 16 - 30 ngày
  | '31_60'       // Quá hạn 31 - 60 ngày
  | 'OVER_60';    // Quá hạn trên 60 ngày

export type SoaEntryStatus = 
  | 'OPEN'            // Chưa thanh toán
  | 'PARTIALLY_PAID'  // Đã thanh toán 1 phần
  | 'PAID'            // Đã tất toán
  | 'OVERDUE';        // Quá hạn

export interface SoaEntry {
  id: string;
  debitNoteId: string;
  debitNoteNumber: string;
  quotationNumber: string;
  issueDate: string;
  dueDate: string;
  blNumber: string;
  bookingNumber?: string;
  vesselVoyage?: string;
  routing: string;                  // POL -> POD
  cargoDescription?: string;
  currency: 'VND' | 'USD';
  originalAmount: number;           // Số tiền Debit Note ban đầu
  paidAmount: number;               // Số tiền đã thanh toán
  balanceDue: number;               // Còn nợ = originalAmount - paidAmount
  overdueDays: number;              // Số ngày quá hạn (> 0: quá hạn, <= 0: trong hạn)
  agingBracket: SoaAgingBracket;
  status: SoaEntryStatus;
  notes?: string;
}

export type SoaStatus = 'DRAFT' | 'CONFIRMED' | 'SENT' | 'RECONCILED' | 'CANCELLED';

export interface SoaAgingSummary {
  currentAmount: number;     // Trong hạn
  days1to15: number;         // Quá hạn 1-15 ngày
  days16to30: number;        // Quá hạn 16-30 ngày
  days31to60: number;        // Quá hạn 31-60 ngày
  over60Days: number;        // Quá hạn >60 ngày
  totalOverdue: number;      // Tổng quá hạn
}

export interface SoaRecord {
  id: string;
  soaNumber: string;                // e.g. SOA-202610-CUST01
  statementDate: string;            // Ngày lập bảng kê (YYYY-MM-DD)
  periodFrom: string;               // Kỳ đối soát: Từ ngày
  periodTo: string;                 // Kỳ đối soát: Đến ngày
  status: SoaStatus;

  // Khách hàng & Forwarder
  customer: CustomerInfo;
  company: CompanyProfile;

  // Tiền tệ & Tỷ giá
  currency: 'VND' | 'USD' | 'DUAL';
  exchangeRate: number;

  // Danh sách các dòng Debit Note trong kỳ
  entries: SoaEntry[];

  // Tổng cộng VND
  totalBilledVnd: number;
  totalPaidVnd: number;
  totalBalanceDueVnd: number;
  totalOverdueVnd: number;

  // Tổng cộng USD (nếu có hóa đơn ngoại tệ)
  totalBilledUsd: number;
  totalPaidUsd: number;
  totalBalanceDueUsd: number;
  totalOverdueUsd: number;

  // Phân tích tuổi nợ (Aging Schedule)
  agingVnd: SoaAgingSummary;

  // Đọc tiền bằng chữ
  amountInWordsVi: string;
  amountInWordsEn: string;

  // Tài khoản thanh toán & VietQR gộp tổng công nợ
  bankAccount: DebitNoteBankAccount;
  vietQrUrl?: string;
  paymentMemo: string;

  // Điều khoản & Ghi chú pháp lý
  paymentTermsNote: string;
  disputeClause: string;

  // Ký tên phê duyệt
  preparedBy: string;               // Kế toán công nợ (AR Accountant)
  approvedBy: string;               // Kế toán trưởng (Chief Accountant)
  customerConfirmation?: string;    // Người đại diện khách hàng ký nhận & đóng dấu

  createdAt: string;
  updatedAt: string;
}
