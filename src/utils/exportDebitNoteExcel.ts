import { DebitNoteRecord } from '../types/debitNote';
import { formatUSD, formatVND } from './formatters';

export async function exportDebitNoteExcel(dn: DebitNoteRecord): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [
    [dn.company.name.toUpperCase()],
    [dn.company.englishName ? dn.company.englishName.toUpperCase() : ''],
    [`Địa chỉ: ${dn.company.address}`],
    [`MST: ${dn.company.taxId} | Hotline: ${dn.company.phone} | Email: ${dn.company.email}`],
    [],
    ['DEBIT NOTE / GIẤY BÁO NỢ & YÊU CẦU THANH TOÁN CƯỚC DỊCH VỤ'],
    [`Số Debit Note: ${dn.debitNoteNumber}`, '', `Ngày phát hành: ${dn.issueDate}`, '', `Hạn thanh toán: ${dn.dueDate}`],
    [`Số Báo Giá Gốc: ${dn.quotationNumber}`, '', `Tỷ giá hạch toán: 1 USD = ${formatVND(dn.exchangeRate)} VND`],
    [],
    ['I. THÔNG TIN KHÁCH HÀNG (BILL TO)'],
    ['Công ty / Khách hàng:', dn.customer.companyName || dn.customer.customerName],
    ['Mã số thuế:', dn.customer.taxId || 'N/A', 'Người liên hệ:', dn.customer.contactPerson || dn.customer.customerName || 'N/A'],
    ['Địa chỉ:', dn.customer.address || 'N/A', 'Điện thoại / Email:', `${dn.customer.phone || 'N/A'} - ${dn.customer.email || 'N/A'}`],
    [],
    ['II. THÔNG TIN LÔ HÀNG VẬN TẢI (SHIPMENT PARTICULARS)'],
    ['Phương thức:', dn.shipment.mode, 'Cảng đi (POL):', dn.shipment.pol, 'Cảng đến (POD):', dn.shipment.pod],
    ['Số B/L:', dn.shipment.blNumber || 'N/A', 'Số Booking:', dn.shipment.bookingNumber || 'N/A', 'Tàu/Chuyến:', dn.shipment.vesselVoyage || 'N/A'],
    ['Số Cont/Seal:', dn.shipment.containerSealNo || 'N/A', 'Tên hàng:', dn.shipment.cargoDescription || 'N/A'],
    ['Trọng lượng (GW):', `${dn.shipment.grossWeightKg || 0} KGS`, 'Thể tích:', `${dn.shipment.volumeCbm || 0} CBM`, 'Quy cách:', dn.shipment.packages || 'N/A'],
    [],
    ['III. CHI TIẾT CÁC KHOẢN CƯỚC & PHÍ (CHARGES BREAKDOWN)'],
    [
      'STT',
      'Hạng Mục Chi Phí (Description)',
      'Mã Phí',
      'Số Lượng',
      'Đơn Vị',
      'Đơn Giá',
      'Tiền Tệ',
      'Thành Tiền',
      'Thuế VAT (%)',
      'Tiền Thuế VAT',
      'Tổng Tiền (Gồm VAT)',
      'Ghi Chú'
    ]
  ];

  // Add line items
  dn.items.forEach((it, idx) => {
    excelRows.push([
      idx + 1,
      it.description,
      it.code,
      it.quantity,
      it.unit,
      it.unitPrice,
      it.currency,
      it.amount,
      `${it.vatRate}%`,
      it.vatAmount,
      it.totalAmount,
      it.notes || (it.isCustomCharge ? 'Phí phát sinh ngoài báo giá' : '')
    ]);
  });

  // Summary rows
  excelRows.push([]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN CHƯA THUẾ (USD):', dn.subtotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN CHƯA THUẾ (VND):', dn.subtotalVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN THUẾ VAT (USD):', dn.vatTotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG TIỀN THUẾ VAT (VND):', dn.vatTotalVnd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG CỘNG THANH TOÁN (USD):', dn.grandTotalUsd]);
  excelRows.push(['', '', '', '', '', '', 'TỔNG CỘNG THANH TOÁN (VND):', dn.grandTotalVnd]);
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
  excelRows.push(['Số tiền bằng chữ (VNĐ):', dn.amountInWordsVi]);
  excelRows.push(['In English:', dn.amountInWordsEn]);
  excelRows.push([]);
  excelRows.push(['IV. THÔNG TIN THANH TOÁN NGÂN HÀNG (BANK PAYMENT INSTRUCTIONS)']);
  excelRows.push(['Tên tài khoản:', dn.bankAccountVnd.accountHolder]);
  excelRows.push(['Số tài khoản VND:', dn.bankAccountVnd.accountNumber, 'Ngân hàng:', dn.bankAccountVnd.bankName]);
  excelRows.push(['Nội dung chuyển khoản:', `"${dn.debitNoteNumber} ${dn.customer.companyName || ''}"`]);
  excelRows.push(['Điều khoản phí ngân hàng:', dn.bankChargeClause]);
  excelRows.push([]);
  excelRows.push([
    'NGƯỜI LẬP PHIẾU',
    '',
    '',
    'KẾ TOÁN TRƯỞNG / PHỤ TRÁCH',
    '',
    '',
    'XÁC NHẬN KHÁCH HÀNG'
  ]);
  excelRows.push([
    dn.preparedBy,
    '',
    '',
    dn.approvedBy,
    '',
    '',
    '(Ký & Đóng dấu)'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 38 }, // Description
    { wch: 12 }, // Code
    { wch: 10 }, // Qty
    { wch: 10 }, // Unit
    { wch: 14 }, // Unit Price
    { wch: 10 }, // Currency
    { wch: 16 }, // Amount
    { wch: 12 }, // VAT %
    { wch: 16 }, // VAT Amount
    { wch: 18 }, // Total Amount
    { wch: 25 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Debit Note');

  const filename = `DebitNote_${dn.debitNoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
