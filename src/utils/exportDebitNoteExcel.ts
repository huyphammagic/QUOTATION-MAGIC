import { DebitNoteRecord } from '../types/debitNote';
import { formatUSD, formatVND } from './formatters';

export async function exportDebitNoteExcel(dn: DebitNoteRecord): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [
    [dn.company.name.toUpperCase()],
    [dn.company.englishName ? dn.company.englishName.toUpperCase() : ''],
    [`Địa chỉ / Address: ${dn.company.address}`],
    [`MST / Tax ID: ${dn.company.taxId} | Hotline: ${dn.company.phone} | Email: ${dn.company.email}`],
    [],
    ['DEBIT NOTE / GIẤY BÁO NỢ & QUYẾT TOÁN CƯỚC DỊCH VỤ LOGISTICS'],
    [`Số Debit Note (No.): ${dn.debitNoteNumber}`, '', `Ngày lập (Issue Date): ${dn.issueDate}`, '', `Hạn thanh toán (Due Date): ${dn.dueDate}`],
    [`Số Báo Giá Gốc (Quote No.): ${dn.quotationNumber}`, '', `Tỷ giá hạch toán (Ex. Rate): 1 USD = ${formatVND(dn.exchangeRate)} VND`],
    [],
    ['I. THÔNG TIN KHÁCH HÀNG (BILL TO / PAYER)'],
    ['Công ty / Khách hàng (Customer):', dn.customer.companyName || dn.customer.customerName],
    ['Mã số thuế (Tax ID):', dn.customer.taxId || 'N/A', 'Người liên hệ (Contact):', dn.customer.contactPerson || dn.customer.customerName || 'N/A'],
    ['Địa chỉ (Address):', dn.customer.address || 'N/A', 'Điện thoại / Email:', `${dn.customer.phone || 'N/A'} - ${dn.customer.email || 'N/A'}`],
    [],
    ['II. THÔNG TIN LÔ HÀNG VẬN TẢI (SHIPMENT PARTICULARS)'],
    ['Tuyến vận chuyển (Routing):', `${dn.shipment.pol} -> ${dn.shipment.pod}`, 'Phương thức (Mode):', dn.shipment.mode, 'Hãng VC (Carrier):', dn.shipment.carrier || 'N/A'],
    ['Vận đơn (B/L No.):', dn.shipment.blNumber || 'N/A', 'Số Booking:', dn.shipment.bookingNumber || 'N/A', 'Tàu / Chuyến (Vsl/Voy):', dn.shipment.vesselVoyage || 'N/A'],
    ['Số Cont / Chì (Seal):', dn.shipment.containerSealNo || 'N/A', 'Mặt hàng (Commodity):', dn.shipment.cargoDescription || 'N/A'],
    ['Trọng lượng gộp (G.W):', `${dn.shipment.grossWeightKg || 0} KGS`, 'Thể tích (Volume):', `${dn.shipment.volumeCbm || 0} CBM`, 'Quy cách kiện (Packages):', dn.shipment.packages || 'N/A'],
    [],
    ['III. CHI TIẾT CÁC KHOẢN CƯỚC & PHÍ (CHARGES BREAKDOWN)'],
    [
      'STT (No.)',
      'Nội Dung Chi Phí (Description of Charges)',
      'Mã Phí (Charge Code)',
      'Số Lượng (Qty)',
      'Đơn Vị Tính (Unit)',
      'Đơn Giá (Unit Price)',
      'Loại Tiền (Curr)',
      'Thành Tiền (Amount)',
      'Thuế Suất (VAT %)',
      'Tiền Thuế VAT (VAT Amt)',
      'Tổng Cộng (Total Amount)',
      'Ghi Chú (Remarks)'
    ]
  ];

  // Add line items
  dn.items.forEach((it, idx) => {
    excelRows.push([
      idx + 1,
      it.descriptionEn ? `${it.description} / ${it.descriptionEn}` : it.description,
      it.code,
      it.quantity,
      it.unit,
      it.unitPrice,
      it.currency,
      it.amount,
      `${it.vatRate}%`,
      it.vatAmount,
      it.totalAmount,
      it.notes || (it.isCustomCharge ? 'Phí phát sinh ngoài báo giá gốc' : '')
    ]);
  });

  // Summary rows
  excelRows.push([]);
  excelRows.push(['', '', '', '', '', '', 'CỘNG TIỀN TRƯỚC THUẾ (SUBTOTAL USD):', dn.subtotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'CỘNG TIỀN TRƯỚC THUẾ (SUBTOTAL VND):', dn.subtotalVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN THUẾ GTGT (VAT TOTAL USD):', dn.vatTotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN THUẾ GTGT (VAT TOTAL VND):', dn.vatTotalVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG SỐ TIỀN THANH TOÁN (TOTAL PAYABLE USD):', dn.grandTotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG SỐ TIỀN THANH TOÁN (TOTAL PAYABLE VND):', dn.grandTotalVnd]);
  excelRows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    `SỐ TIỀN THỰC THU (${dn.finalCurrency}):`,
    dn.finalAmountToPay
  ]);
  excelRows.push([]);
  excelRows.push(['Số tiền bằng chữ (In words - VND):', dn.amountInWordsVi]);
  excelRows.push(['In English:', dn.amountInWordsEn]);
  excelRows.push([]);
  excelRows.push(['IV. THÔNG TIN THANH TOÁN NGÂN HÀNG (BANK PAYMENT INSTRUCTIONS)']);
  excelRows.push(['Đơn vị thụ hưởng (Beneficiary):', dn.bankAccountVnd.accountHolder]);
  excelRows.push(['Số tài khoản VND (A/C No.):', dn.bankAccountVnd.accountNumber, 'Ngân hàng (Bank):', dn.bankAccountVnd.bankName]);
  excelRows.push(['Nội dung chuyển khoản (Memo):', `"${dn.debitNoteNumber} ${dn.customer.companyName || ''}"`]);
  excelRows.push(['Điều khoản phí ngân hàng (Banking Clause):', dn.bankChargeClause]);
  excelRows.push([]);
  excelRows.push([
    'NGƯỜI LẬP BIỂU (PREPARED BY)',
    '',
    '',
    'KẾ TOÁN TRƯỞNG / DUYỆT (CHIEF ACCOUNTANT / APPROVED BY)',
    '',
    '',
    'ĐẠI DIỆN KHÁCH HÀNG (CUSTOMER ACCEPTANCE)'
  ]);
  excelRows.push([
    dn.preparedBy,
    '',
    '',
    dn.approvedBy,
    '',
    '',
    '(Ký & Đóng dấu / Stamp & Sign)'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // STT
    { wch: 42 }, // Description
    { wch: 14 }, // Code
    { wch: 10 }, // Qty
    { wch: 12 }, // Unit
    { wch: 16 }, // Unit Price
    { wch: 10 }, // Currency
    { wch: 18 }, // Amount
    { wch: 12 }, // VAT %
    { wch: 16 }, // VAT Amount
    { wch: 20 }, // Total Amount
    { wch: 28 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Debit Note');

  const filename = `DebitNote_${dn.debitNoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
