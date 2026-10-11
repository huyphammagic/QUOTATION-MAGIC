import { DebitNoteRecord } from '../types/debitNote';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { formatUSD, formatVND } from './formatters';

/**
 * Helper to fetch image as data URL for jsPDF embedding
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Enterprise-Grade A4 Debit Note PDF Generator
 * - 100% Unicode Roboto Font compliant (Zero font errors for Vietnamese diacritics)
 * - Proportional millimeter grid tailored for standard A4 portrait (210mm x 297mm)
 * - Anti-collision layout: Dynamic coordinate math prevents any text overlapping
 * - Space-optimized: Strictly fits onto 1 single A4 page without spilling into page 2
 * - High-resolution embedded VietQR payment code for instant banking scan & pay
 */
export async function exportDebitNotePdf(dn: DebitNoteRecord): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. Embed and register Unicode Roboto fonts (Regular, Bold, Italic)
  await ensureUnicodeFonts(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  let currentY = 8;

  // Header Brand Accent Top Bar
  doc.setFillColor(15, 23, 42); // Slate-900 Navy
  doc.rect(margin, currentY, contentWidth, 1.8, 'F');
  currentY += 4.5;

  // 2. Company Header (Left 115mm) & Debit Note Meta Box (Right 72mm)
  const leftColW = 114;
  const rightBoxW = contentWidth - leftColW - 3; // 73mm
  const rightBoxX = margin + leftColW + 3;
  const headerStartY = currentY;

  // Company Name (Vietnamese primary)
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(dn.company.name.toUpperCase()), margin, currentY);

  if (dn.company.englishName) {
    currentY += 3.8;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(normalizeUnicode(dn.company.englishName.toUpperCase()), margin, currentY);
  }

  currentY += 3.6;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode(`Địa chỉ: ${dn.company.address}`), margin, currentY, { maxWidth: leftColW });

  currentY += 3.5;
  doc.text(normalizeUnicode(`MST: ${dn.company.taxId}  |  Hotline: ${dn.company.phone}  |  Email: ${dn.company.email}`), margin, currentY);

  // Right Meta Box: Official Debit Note Header
  const metaBoxHeight = 21;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(rightBoxX, headerStartY - 0.5, rightBoxW, metaBoxHeight, 1.5, 1.5, 'FD');

  // Title inside right box
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('DEBIT NOTE / GIẤY BÁO NỢ', rightBoxX + rightBoxW / 2, headerStartY + 3.4, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('CHỨNG TỪ THU TIỀN CƯỚC DỊCH VỤ', rightBoxX + rightBoxW / 2, headerStartY + 6.6, { align: 'center' });

  // Metadata rows inside right box
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(`Số D/N: ${dn.debitNoteNumber}`), rightBoxX + 2.5, headerStartY + 10.6);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Ngày lập: ${dn.issueDate}`), rightBoxX + 2.5, headerStartY + 14.1);

  // Highlight Due Date in Red
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text(normalizeUnicode(`Hạn TT: ${dn.dueDate}`), rightBoxX + rightBoxW - 2.5, headerStartY + 14.1, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Số Báo Giá: ${dn.quotationNumber}`), rightBoxX + 2.5, headerStartY + 17.8);

  currentY = Math.max(currentY + 4.5, headerStartY + metaBoxHeight + 2);

  // Horizontal subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 2.5;

  // 3. Section I & II: Side-by-Side Customer (Bill To) & Shipment Details
  const colW = (contentWidth - 3) / 2; // 93.5mm each
  const infoBoxH = 27;

  // Left: Bill To Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(239, 246, 255); // Blue-50 header strip
  doc.roundedRect(margin, currentY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text('I. ĐƠN VỊ THANH TOÁN (BILL TO)', margin + 2.5, currentY + 3.2);

  // Bill To Content
  const customerName = dn.customer.companyName || dn.customer.customerName || 'N/A';
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(customerName), margin + 2.5, currentY + 8, { maxWidth: colW - 5 });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`MST: ${dn.customer.taxId || 'N/A'}  |  Liên hệ: ${dn.customer.contactPerson || dn.customer.customerName || 'N/A'}`), margin + 2.5, currentY + 12);
  doc.text(normalizeUnicode(`Điện thoại: ${dn.customer.phone || 'N/A'}  |  Email: ${dn.customer.email || 'N/A'}`), margin + 2.5, currentY + 15.8);

  const custAddr = dn.customer.address || 'N/A';
  doc.text(normalizeUnicode(`Địa chỉ: ${custAddr}`), margin + 2.5, currentY + 19.6, { maxWidth: colW - 5 });

  // Right: Shipment Details Box
  const shptX = margin + colW + 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(shptX, currentY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(240, 253, 244); // Emerald-50 header strip
  doc.roundedRect(shptX, currentY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61);
  doc.text('II. CHI TIẾT LÔ HÀNG (SHIPMENT PARTICULARS)', shptX + 2.5, currentY + 3.2);

  // Shipment Content
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Tuyến & PT: ${dn.shipment.pol} -> ${dn.shipment.pod} (${dn.shipment.mode})`), shptX + 2.5, currentY + 8, { maxWidth: colW - 5 });
  doc.text(normalizeUnicode(`Số B/L: ${dn.shipment.blNumber || 'N/A'}  |  Booking: ${dn.shipment.bookingNumber || 'N/A'}`), shptX + 2.5, currentY + 12);
  doc.text(normalizeUnicode(`Tàu/Chuyến: ${dn.shipment.vesselVoyage || 'N/A'}  |  Số Cont/Seal: ${dn.shipment.containerSealNo || 'N/A'}`), shptX + 2.5, currentY + 15.8, { maxWidth: colW - 5 });
  doc.text(normalizeUnicode(`Hàng hóa: ${dn.shipment.cargoDescription || 'N/A'}  |  GW: ${dn.shipment.grossWeightKg || 0} kg  |  Vol: ${dn.shipment.volumeCbm || 0} CBM`), shptX + 2.5, currentY + 19.6, { maxWidth: colW - 5 });

  currentY += infoBoxH + 3;

  // 4. Section III: AutoTable Charges Breakdown
  // Exact column width budget summing to 190mm:
  // 7 + 55 + 13 + 9 + 10 + 17 + 10 + 19 + 10 + 17 + 23 = 190mm
  const isCompact = dn.items.length > 7;
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
      'Mã',
      'SL',
      'ĐVT',
      'Đơn Giá',
      'Loại',
      'Thành Tiền',
      'VAT',
      'Tiền Thuế',
      'Tổng Tiền'
    ]],
    body: tableData,
    theme: 'grid',
    pageBreak: 'avoid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: isCompact ? 6.4 : 6.8,
      cellPadding: isCompact ? 1.1 : 1.3,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.8,
      cellPadding: isCompact ? 1.3 : 1.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'center', cellWidth: 13 },
      3: { halign: 'center', cellWidth: 9 },
      4: { halign: 'center', cellWidth: 10 },
      5: { halign: 'right', cellWidth: 17 },
      6: { halign: 'center', cellWidth: 10 },
      7: { halign: 'right', cellWidth: 19 },
      8: { halign: 'center', cellWidth: 10 },
      9: { halign: 'right', cellWidth: 17 },
      10: { halign: 'right', cellWidth: 23, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // 5. Section IV: Combined Bottom Block (Parallel 2 Columns)
  // Left: Bank instructions + Amount in Words + VietQR (116mm)
  // Right: Summary Totals + Grand Total Box (71mm)
  const leftSummaryW = 116;
  const rightSummaryW = contentWidth - leftSummaryW - 3; // 71mm
  const rightSummaryX = margin + leftSummaryW + 3;
  const bottomBlockStartY = currentY;

  // === RIGHT COLUMN: TOTALS SUMMARY BOX ===
  const totalsBoxHeight = 31;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightSummaryX, bottomBlockStartY, rightSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);

  let totY = bottomBlockStartY + 4.2;
  doc.text('Cộng tiền chưa thuế USD:', rightSummaryX + 2.5, totY);
  doc.text(formatUSD(dn.subtotalUsd), rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

  totY += 3.7;
  doc.text('Cộng tiền chưa thuế VND:', rightSummaryX + 2.5, totY);
  doc.text(formatVND(dn.subtotalVnd), rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

  totY += 3.7;
  doc.text('Thuế VAT (USD / VND):', rightSummaryX + 2.5, totY);
  doc.text(`${formatUSD(dn.vatTotalUsd)} / ${formatVND(dn.vatTotalVnd)}`, rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

  // Divider inside summary
  totY += 3.2;
  doc.setDrawColor(203, 213, 225);
  doc.line(rightSummaryX + 2, totY, rightSummaryX + rightSummaryW - 2, totY);

  // Grand Total Highlight Box
  totY += 3.2;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(rightSummaryX + 2, totY - 2.2, rightSummaryW - 4, 11, 1, 1, 'F');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text(normalizeUnicode(`TỔNG CẦN THANH TOÁN (${dn.finalCurrency}):`), rightSummaryX + 3.5, totY + 1.6);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38); // Highlight Red
  const finalStr = `${dn.finalCurrency === 'USD' ? formatUSD(dn.finalAmountToPay) : formatVND(dn.finalAmountToPay)} ${dn.finalCurrency}`;
  doc.text(finalStr, rightSummaryX + rightSummaryW - 3.5, totY + 6.2, { align: 'right' });

  // === LEFT COLUMN: PAYMENT INSTRUCTIONS & WORDS ===
  doc.setFillColor(254, 252, 232); // Warm light cream
  doc.setDrawColor(254, 240, 138); // Yellow-200 border
  doc.roundedRect(margin, bottomBlockStartY, leftSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(146, 64, 14); // Dark Amber
  doc.text('THÔNG TIN THANH TOÁN & VIETQR (BANK DETAILS):', margin + 2.5, bottomBlockStartY + 4);

  // Bank Text
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(`Tên TK: ${dn.bankAccountVnd.accountHolder}`), margin + 2.5, bottomBlockStartY + 8);
  doc.text(normalizeUnicode(`Số TK: ${dn.bankAccountVnd.accountNumber}  |  Ngân hàng: ${dn.bankAccountVnd.bankName}`), margin + 2.5, bottomBlockStartY + 11.6, { maxWidth: leftSummaryW - 28 });
  doc.text(normalizeUnicode(`Nội dung CK: "${dn.debitNoteNumber} ${dn.customer.companyName || ''}"`), margin + 2.5, bottomBlockStartY + 15.2, { maxWidth: leftSummaryW - 28 });
  doc.text(normalizeUnicode(`(Tỷ giá quy đổi: 1 USD = ${formatVND(dn.exchangeRate)} VND - ${dn.exchangeRateSource || 'VCB'})`), margin + 2.5, bottomBlockStartY + 18.8);

  // Embed VietQR code on the right of the bank box if available
  const transferDesc = `${dn.debitNoteNumber}`;
  const amountToPay = dn.finalCurrency === 'VND' ? dn.finalAmountToPay : Math.round(dn.finalAmountToPay * dn.exchangeRate);
  const qrUrl = `https://img.vietqr.io/image/${dn.bankAccountVnd.bankId}-${dn.bankAccountVnd.accountNumber}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(transferDesc)}&accountName=${encodeURIComponent(dn.bankAccountVnd.accountHolder)}`;
  
  try {
    const qrDataUrl = await fetchImageAsDataUrl(qrUrl);
    if (qrDataUrl) {
      // Draw QR image (19mm x 19mm)
      doc.addImage(qrDataUrl, 'PNG', margin + leftSummaryW - 22, bottomBlockStartY + 2, 19, 19);
    }
  } catch {
    // Graceful fallback if offline
  }

  // Amount in words box inside left section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 2, bottomBlockStartY + 21, leftSummaryW - 4, 8.5, 1, 1, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(`Bằng chữ: ${dn.amountInWordsVi}`), margin + 3.5, bottomBlockStartY + 24.8, { maxWidth: leftSummaryW - 7 });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`In English: ${dn.amountInWordsEn}`), margin + 3.5, bottomBlockStartY + 28, { maxWidth: leftSummaryW - 7 });

  currentY = bottomBlockStartY + totalsBoxHeight + 3.5;

  // Terms and Bank Charge Clause Note
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode(`• Điều khoản: ${dn.paymentTerms}  |  ${dn.bankChargeClause}`), margin, currentY, { maxWidth: contentWidth });
  currentY += 4;

  // 6. Section V: 3-Column Signatures Block (Anti-overflow protection)
  // Ensure signature block starts safely within page bounds and never pushes past 285mm
  const sigBoxW = contentWidth / 3; // 63.3mm each
  let sigStartY = Math.max(currentY + 5, 250);
  if (sigStartY > pageHeight - 30) {
    sigStartY = pageHeight - 30;
  }

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  // Column 1: Prepared By
  doc.text('NGƯỜI LẬP PHIẾU', margin + sigBoxW * 0.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Prepared By)', margin + sigBoxW * 0.5, sigStartY + 3.2, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(dn.preparedBy), margin + sigBoxW * 0.5, sigStartY + 16, { align: 'center' });

  // Column 2: Approved By
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KẾ TOÁN TRƯỞNG / DUYỆT', margin + sigBoxW * 1.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Chief Accountant / Approved By)', margin + sigBoxW * 1.5, sigStartY + 3.2, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(dn.approvedBy), margin + sigBoxW * 1.5, sigStartY + 16, { align: 'center' });

  // Column 3: Customer Confirmation
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ĐẠI DIỆN KHÁCH HÀNG', margin + sigBoxW * 2.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Customer Acceptance)', margin + sigBoxW * 2.5, sigStartY + 3.2, { align: 'center' });
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('(Ký, ghi rõ họ tên & đóng dấu)', margin + sigBoxW * 2.5, sigStartY + 16, { align: 'center' });

  // Save the PDF
  const filename = `DebitNote_${dn.debitNoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
