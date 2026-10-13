import { SoaRecord } from '../types/soa';
import { formatUSD, formatVND } from './formatters';

export async function exportSoaExcel(soa: SoaRecord): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [
    [soa.company.name.toUpperCase()],
    [soa.company.englishName ? soa.company.englishName.toUpperCase() : ''],
    [`Địa chỉ / Address: ${soa.company.address}`],
    [`MST / Tax ID: ${soa.company.taxId} | Hotline: ${soa.company.phone} | Email: ${soa.company.email}`],
    [],
    ['STATEMENT OF ACCOUNT (SOA) / BẢNG ĐỐI SOÁT CÔNG NỢ ĐỊNH KỲ'],
    [`Số SOA (Reference No.): ${soa.soaNumber}`, '', `Ngày lập (Date): ${soa.statementDate}`, '', `Kỳ đối soát (Period): ${soa.periodFrom} -> ${soa.periodTo}`],
    [`Tỷ giá hạch toán (Ex. Rate): 1 USD = ${formatVND(soa.exchangeRate)} VND`],
    [],
    ['I. THÔNG TIN KHÁCH HÀNG ĐỐI SOÁT (CUSTOMER / DEBTOR)'],
    ['Công ty / Khách hàng (Customer):', soa.customer.companyName || soa.customer.customerName],
    ['Mã số thuế (Tax ID):', soa.customer.taxId || 'N/A', 'Người liên hệ (Contact):', soa.customer.contactPerson || soa.customer.customerName || 'N/A'],
    ['Địa chỉ (Address):', soa.customer.address || 'N/A', 'Điện thoại / Email:', `${soa.customer.phone || 'N/A'} - ${soa.customer.email || 'N/A'}`],
    [],
    ['II. PHÂN TÍCH TUỔI NỢ (DEBT AGING SCHEDULE - VND)'],
    [
      'Trong hạn (Current)',
      'Quá hạn 1 - 15 ngày',
      'Quá hạn 16 - 30 ngày',
      'Quá hạn 31 - 60 ngày',
      'Quá hạn > 60 ngày',
      'TỔNG NỢ QUÁ HẠN'
    ],
    [
      soa.agingVnd.currentAmount,
      soa.agingVnd.days1to15,
      soa.agingVnd.days16to30,
      soa.agingVnd.days31to60,
      soa.agingVnd.over60Days,
      soa.agingVnd.totalOverdue
    ],
    [],
    ['III. CHI TIẾT CÁC HÓA ĐƠN DEBIT NOTE ĐẾN HẠN (OUTSTANDING INVOICES)'],
    [
      'STT (No.)',
      'Số Debit Note (D/N No.)',
      'Ngày Lập (Date)',
      'Số Vận Đơn (B/L No.)',
      'Tuyến Vận Chuyển (Routing)',
      'Hạn Thanh Toán (Due Date)',
      'Loại Tiền',
      'Số Tiền Ban Đầu (Original)',
      'Đã Thanh Toán (Paid)',
      'Còn Nợ Phải Trả (Balance Due)',
      'Số Ngày Quá Hạn (Days)',
      'Tình Trạng (Status)'
    ]
  ];

  soa.entries.forEach((it, idx) => {
    excelRows.push([
      idx + 1,
      it.debitNoteNumber,
      it.issueDate,
      it.blNumber,
      it.routing,
      it.dueDate,
      it.currency,
      it.originalAmount,
      it.paidAmount,
      it.balanceDue,
      it.overdueDays > 0 ? it.overdueDays : 0,
      it.status === 'PAID' ? 'Đã tất toán' : (it.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa thanh toán')
    ]);
  });

  excelRows.push([]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG CƯỚC ĐÃ PHÁT HÀNH (VND):', soa.totalBilledVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN ĐÃ THANH TOÁN (VND):', soa.totalPaidVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG NỢ QUÁ HẠN (VND):', soa.totalOverdueVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG DƯ NỢ CẦN THANH TOÁN (VND):', soa.totalBalanceDueVnd]);
  excelRows.push([]);
  excelRows.push(['Số tiền bằng chữ (In words - VND):', soa.amountInWordsVi]);
  excelRows.push(['In English:', soa.amountInWordsEn]);
  excelRows.push([]);
  excelRows.push(['IV. THÔNG TIN THANH TOÁN NGÂN HÀNG (BANK PAYMENT INSTRUCTIONS)']);
  excelRows.push(['Đơn vị thụ hưởng (Beneficiary):', soa.bankAccount.accountHolder]);
  excelRows.push(['Số tài khoản VND (A/C No.):', soa.bankAccount.accountNumber, 'Ngân hàng (Bank):', soa.bankAccount.bankName]);
  excelRows.push(['Nội dung chuyển khoản (Memo):', soa.paymentMemo]);
  excelRows.push(['Điều khoản đối soát & thanh toán:', soa.paymentTermsNote]);
  excelRows.push([]);
  excelRows.push([
    'NGƯỜI LẬP BIỂU (PREPARED BY)',
    '',
    '',
    'KẾ TOÁN TRƯỞNG / DUYỆT (CHIEF ACCOUNTANT)',
    '',
    '',
    'XÁC NHẬN CỦA KHÁCH HÀNG (CUSTOMER ACCEPTANCE)'
  ]);
  excelRows.push([
    soa.preparedBy,
    '',
    '',
    soa.approvedBy,
    '',
    '',
    '(Ký & Đóng dấu / Sign & Stamp)'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  ws['!cols'] = [
    { wch: 8 },  // STT
    { wch: 24 }, // DN Number
    { wch: 14 }, // Date
    { wch: 20 }, // BL
    { wch: 32 }, // Route
    { wch: 14 }, // Due Date
    { wch: 10 }, // Curr
    { wch: 18 }, // Orig
    { wch: 16 }, // Paid
    { wch: 20 }, // Due
    { wch: 12 }, // Days
    { wch: 16 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'SOA Statement');

  const filename = `SOA_${soa.soaNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
