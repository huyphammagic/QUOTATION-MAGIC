import { DebitNoteRecord } from '../types/debitNote';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { formatUSD, formatVND } from './formatters';

export async function exportDebitNotePdf(dn: DebitNoteRecord): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Embed Unicode Roboto fonts
  await ensureUnicodeFonts(doc);

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 6;

  // 2. Company Header & Logo Info
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(normalizeUnicode(dn.company.name.toUpperCase()), margin, currentY);

  if (dn.company.englishName) {
    currentY += 4.5;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(normalizeUnicode(dn.company.englishName.toUpperCase()), margin, currentY);
  }

  currentY += 4.5;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode(`Địa chỉ: ${dn.company.address}`), margin, currentY);

  currentY += 3.8;
  doc.text(normalizeUnicode(`MST: ${dn.company.taxId}  |  Hotline: ${dn.company.phone}  |  Email: ${dn.company.email}`), margin, currentY);

  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  // 3. Document Title & Metadata Badges
  currentY += 7;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('DEBIT NOTE / GIẤY BÁO NỢ', margin, currentY);

  doc.setFont('Roboto', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('FREIGHT & LOGISTICS CHARGES DEMAND NOTE', margin, currentY + 4.5);

  // Metadata Table (Right side / Card)
  const metaBoxX = margin + contentWidth - 75;
  const metaBoxY = currentY - 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(metaBoxX, metaBoxY, 75, 22, 2, 2, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(`Số D/N: ${dn.debitNoteNumber}`), metaBoxX + 3, metaBoxY + 5);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Ngày lập: ${dn.issueDate}`), metaBoxX + 3, metaBoxY + 9.5);
  doc.text(normalizeUnicode(`Hạn thanh toán: ${dn.dueDate}`), metaBoxX + 3, metaBoxY + 14);
  doc.text(normalizeUnicode(`Số Báo Giá: ${dn.quotationNumber}`), metaBoxX + 3, metaBoxY + 18.5);

  currentY += 16;

  // 4. Two-Column Box: Customer (Bill To) & Shipment Details
  const colW = (contentWidth - 4) / 2;
  const boxH = 34;

  // Box 1: Bill To
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colW, boxH, 2, 2, 'FD');

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, currentY, colW, 6, 2, 2, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('I. THÔNG TIN KHÁCH HÀNG / BILL TO', margin + 3, currentY + 4.2);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(dn.customer.companyName || dn.customer.customerName), margin + 3, currentY + 10);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`MST: ${dn.customer.taxId || 'N/A'}`), margin + 3, currentY + 14.5);
  doc.text(normalizeUnicode(`Người liên hệ: ${dn.customer.contactPerson || dn.customer.customerName || 'N/A'}`), margin + 3, currentY + 19);
  doc.text(normalizeUnicode(`Điện thoại / Email: ${dn.customer.phone || 'N/A'} - ${dn.customer.email || 'N/A'}`), margin + 3, currentY + 23.5);
  doc.text(normalizeUnicode(`Địa chỉ: ${(dn.customer.address || 'N/A').slice(0, 48)}`), margin + 3, currentY + 28);

  // Box 2: Shipment Details
  const shptX = margin + colW + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(shptX, currentY, colW, boxH, 2, 2, 'FD');

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(shptX, currentY, colW, 6, 2, 2, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('II. CHI TIẾT LÔ HÀNG / SHIPMENT DETAILS', shptX + 3, currentY + 4.2);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Phương thức: ${dn.shipment.mode || 'SEA'} | Tuyến: ${dn.shipment.pol} -> ${dn.shipment.pod}`), shptX + 3, currentY + 10);
  doc.text(normalizeUnicode(`Số B/L: ${dn.shipment.blNumber || 'N/A'} | Booking: ${dn.shipment.bookingNumber || 'N/A'}`), shptX + 3, currentY + 14.5);
  doc.text(normalizeUnicode(`Tàu/Chuyến: ${dn.shipment.vesselVoyage || 'N/A'}`), shptX + 3, currentY + 19);
  doc.text(normalizeUnicode(`Số Cont/Seal: ${dn.shipment.containerSealNo || 'N/A'}`), shptX + 3, currentY + 23.5);
  doc.text(normalizeUnicode(`Hàng hóa: ${dn.shipment.cargoDescription || 'N/A'} | GW: ${dn.shipment.grossWeightKg || 0} kg | Vol: ${dn.shipment.volumeCbm || 0} CBM`), shptX + 3, currentY + 28);

  currentY += boxH + 5;

  // 5. Line Items Table with AutoTable
  const tableData = dn.items.map((item, idx) => {
    const isUsd = item.currency === 'USD';
    const priceStr = isUsd ? formatUSD(item.unitPrice) : formatVND(item.unitPrice);
    const amtStr = isUsd ? formatUSD(item.amount) : formatVND(item.amount);
    const vatAmtStr = isUsd ? formatUSD(item.vatAmount) : formatVND(item.vatAmount);
    const totalStr = isUsd ? formatUSD(item.totalAmount) : formatVND(item.totalAmount);

    return [
      idx + 1,
      normalizeUnicode(item.description),
      item.code || '',
      item.quantity,
      normalizeUnicode(item.unit),
      priceStr,
      item.currency,
      amtStr,
      `${item.vatRate}%`,
      vatAmtStr,
      totalStr
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'STT',
      'Hạng Mục Chi Phí (Description)',
      'Mã Phí',
      'SL',
      'ĐVT',
      'Đơn Giá',
      'Tiền Tệ',
      'Thành Tiền',
      'VAT',
      'Tiền Thuế',
      'Tổng Tiền'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center', cellWidth: 11 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: 19 },
      8: { halign: 'center', cellWidth: 10 },
      9: { halign: 'right', cellWidth: 17 },
      10: { halign: 'right', cellWidth: 21, fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;
  currentY = finalY;

  // 6. Summary Totals Box
  const summaryBoxW = 85;
  const summaryBoxX = margin + contentWidth - summaryBoxW;
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryBoxX, currentY, summaryBoxW, 26, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let sumLineY = currentY + 4.5;
  doc.text('Tổng tiền chưa thuế USD:', summaryBoxX + 3, sumLineY);
  doc.text(formatUSD(dn.subtotalUsd), summaryBoxX + summaryBoxW - 3, sumLineY, { align: 'right' });

  sumLineY += 4;
  doc.text('Tổng tiền chưa thuế VND:', summaryBoxX + 3, sumLineY);
  doc.text(formatVND(dn.subtotalVnd), summaryBoxX + summaryBoxW - 3, sumLineY, { align: 'right' });

  sumLineY += 4;
  doc.text('Tiền thuế VAT (USD / VND):', summaryBoxX + 3, sumLineY);
  doc.text(`${formatUSD(dn.vatTotalUsd)} / ${formatVND(dn.vatTotalVnd)}`, summaryBoxX + summaryBoxW - 3, sumLineY, { align: 'right' });

  sumLineY += 4.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX + 2, sumLineY - 1, summaryBoxX + summaryBoxW - 2, sumLineY - 1);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(normalizeUnicode(`TỔNG CẦN THANH TOÁN (${dn.finalCurrency}):`), summaryBoxX + 3, sumLineY + 2.5);
  const finalStr = dn.finalCurrency === 'USD' ? formatUSD(dn.finalAmountToPay) : formatVND(dn.finalAmountToPay);
  doc.text(finalStr, summaryBoxX + summaryBoxW - 3, sumLineY + 2.5, { align: 'right' });

  // Tỷ giá quy đổi ghi chú
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode(`(Tỷ giá quy đổi: 1 USD = ${formatVND(dn.exchangeRate)} - ${dn.exchangeRateSource || 'VCB'})`), margin, currentY + 5);

  // Amount in words
  currentY += 28;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 11, 1.5, 1.5, 'F');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(`Số tiền bằng chữ (VNĐ): ${dn.amountInWordsVi}`), margin + 3, currentY + 4.5);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`In English: ${dn.amountInWordsEn}`), margin + 3, currentY + 8.5);

  currentY += 14;

  // 7. Payment Instructions & Banking Info
  doc.setFillColor(254, 252, 232); // Yellow-50
  doc.setDrawColor(254, 240, 138); // Yellow-200
  doc.roundedRect(margin, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // Yellow-800
  doc.text('THÔNG TIN TÀI KHOẢN THỤ HƯỞNG & HƯỚNG DẪN THANH TOÁN / BANK PAYMENT DETAILS:', margin + 3, currentY + 4.5);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(normalizeUnicode(`Tên tài khoản: ${dn.bankAccountVnd.accountHolder}`), margin + 3, currentY + 9);
  doc.text(normalizeUnicode(`Số tài khoản VND: ${dn.bankAccountVnd.accountNumber}  |  Ngân hàng: ${dn.bankAccountVnd.bankName}`), margin + 3, currentY + 13);
  doc.text(normalizeUnicode(`Nội dung chuyển khoản: "${dn.debitNoteNumber} ${dn.customer.companyName || ''}"  |  ${dn.bankChargeClause}`), margin + 3, currentY + 17);

  currentY += 24;

  // 8. Signatures Block
  const sigW = contentWidth / 3;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  
  // Column 1
  doc.text('NGƯỜI LẬP PHIẾU', margin + sigW * 0.5, currentY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('(Prepared By)', margin + sigW * 0.5, currentY + 3.5, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(dn.preparedBy), margin + sigW * 0.5, currentY + 16, { align: 'center' });

  // Column 2
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('KẾ TOÁN TRƯỞNG / PHỤ TRÁCH', margin + sigW * 1.5, currentY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('(Chief Accountant / Approved By)', margin + sigW * 1.5, currentY + 3.5, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(dn.approvedBy), margin + sigW * 1.5, currentY + 16, { align: 'center' });

  // Column 3
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('XÁC NHẬN KHÁCH HÀNG', margin + sigW * 2.5, currentY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('(Customer Acceptance)', margin + sigW * 2.5, currentY + 3.5, { align: 'center' });
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('(Ký, ghi rõ họ tên & đóng dấu)', margin + sigW * 2.5, currentY + 16, { align: 'center' });

  // Save the PDF
  const filename = `DebitNote_${dn.debitNoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
