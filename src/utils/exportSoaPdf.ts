import { SoaRecord } from '../types/soa';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { formatUSD, formatNumberVND } from './formatters';

/**
 * Helper to fetch image as data URL for jsPDF embed
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
 * Line-by-line renderer with exact deterministic millimeter spacing
 */
function renderTextLines(
  doc: any,
  lines: string[],
  x: number,
  startY: number,
  lineStep: number,
  options?: any
): number {
  let y = startY;
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y, options);
    if (i < lines.length - 1) {
      y += lineStep;
    }
  }
  return y;
}

/**
 * High-Precision Single or Multi-Page A4 PDF Generator for Statement of Account (SOA)
 * Compliant with International Freight Forwarding Standards and Vietnamese Accounting Regulations.
 */
export async function exportSoaPdf(soa: SoaRecord): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  await ensureUnicodeFonts(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  // 1. Top Decorative Bar
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(margin, 8, contentWidth, 1.2, 'F');

  // 2. Company Brand & Official SOA Header Box
  const headerStartY = 12.5;
  const rightBoxW = 82;
  const leftColW = contentWidth - rightBoxW - 4;
  const rightBoxX = margin + leftColW + 4;

  let currentY = headerStartY;

  // Company Name
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const companyTitle = normalizeUnicode((soa.company as any).companyName || soa.company.name || 'CÔNG TY TNHH BOGI LOGISTICS & FORWARDING');
  doc.text(companyTitle, margin, currentY);
  currentY += 4.2;

  if (soa.company.englishName) {
    doc.setFont('Roboto', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(soa.company.englishName), margin, currentY);
    currentY += 3.6;
  }

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const addrLines = doc.splitTextToSize(normalizeUnicode(`Địa chỉ / Address: ${soa.company.address || 'TP. Hồ Chí Minh, Việt Nam'}`), leftColW);
  renderTextLines(doc, addrLines, margin, currentY, 3.2);
  currentY += (addrLines.length - 1) * 3.2 + 3.4;

  const contactText = `MST: ${soa.company.taxId || '0318999888'}  |  Tel: ${soa.company.phone || '028.3888.9999'}  |  Email: ${soa.company.email || 'accounting@bogilogistics.vn'}`;
  const contactLines = doc.splitTextToSize(normalizeUnicode(contactText), leftColW);
  renderTextLines(doc, contactLines, margin, currentY, 3.2);
  currentY += (contactLines.length - 1) * 3.2 + 3.2;

  // Right Official SOA Box
  const metaBoxHeight = 25;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightBoxX, headerStartY - 0.5, rightBoxW, metaBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('STATEMENT OF ACCOUNT (SOA)', rightBoxX + rightBoxW / 2, headerStartY + 3.6, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text('BẢNG ĐỐI SOÁT CÔNG NỢ & KỲ HẠN CƯỚC', rightBoxX + rightBoxW / 2, headerStartY + 6.8, { align: 'center' });

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode('Mã SOA (No.):'), rightBoxX + 3, headerStartY + 11.2);
  doc.text(normalizeUnicode(soa.soaNumber), rightBoxX + rightBoxW - 3, headerStartY + 11.2, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Ngày lập (Date): ${soa.statementDate}`), rightBoxX + 3, headerStartY + 15.0);
  doc.text(normalizeUnicode(`Kỳ đối soát: ${soa.periodFrom} -> ${soa.periodTo}`), rightBoxX + 3, headerStartY + 18.8);

  // Status badge inside box
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(21, 128, 61); // Emerald
  doc.text(normalizeUnicode(`Trạng thái: ĐÃ XÁC NHẬN`), rightBoxX + rightBoxW - 3, headerStartY + 18.8, { align: 'right' });

  currentY = Math.max(currentY + 2, headerStartY + metaBoxHeight + 2);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 2.8;

  // 3. Customer Info Box
  const custBoxH = 17;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, currentY, contentWidth, custBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(239, 246, 255); // Blue-50 strip
  doc.roundedRect(margin, currentY, contentWidth, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(30, 58, 138);
  doc.text('I. THÔNG TIN KHÁCH HÀNG ĐỐI SOÁT (CUSTOMER / DEBTOR DETAILS)', margin + 3, currentY + 3.2);

  let custTextY = currentY + 7.8;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  const custName = normalizeUnicode(soa.customer.companyName || soa.customer.customerName || 'N/A');
  doc.text(custName, margin + 3, custTextY);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`MST / Tax ID: ${soa.customer.taxId || 'N/A'}  |  Người liên hệ: ${soa.customer.contactPerson || soa.customer.customerName || 'N/A'}`), margin + 3, custTextY + 3.6);
  doc.text(normalizeUnicode(`Điện thoại / Tel: ${soa.customer.phone || 'N/A'}  |  Email: ${soa.customer.email || 'N/A'}  |  Địa chỉ: ${soa.customer.address || 'N/A'}`), margin + 3, custTextY + 7.0);

  currentY += custBoxH + 3.0;

  // 4. Aging Schedule Box (5 Brackets)
  const agingBoxH = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, currentY, contentWidth, agingBoxH, 1.5, 1.5, 'FD');

  const agingCols = [
    { label: 'TRONG HẠN (CURRENT)', val: soa.agingVnd.currentAmount, isOverdue: false },
    { label: 'QUÁ HẠN 1-15 NGÀY', val: soa.agingVnd.days1to15, isOverdue: true },
    { label: 'QUÁ HẠN 16-30 NGÀY', val: soa.agingVnd.days16to30, isOverdue: true },
    { label: 'QUÁ HẠN 31-60 NGÀY', val: soa.agingVnd.days31to60, isOverdue: true },
    { label: 'QUÁ HẠN >60 NGÀY', val: soa.agingVnd.over60Days, isOverdue: true },
    { label: 'TỔNG NỢ QUÁ HẠN', val: soa.agingVnd.totalOverdue, isOverdue: true, isHighlight: true }
  ];

  const agingColW = contentWidth / agingCols.length; // ~31.6mm each

  agingCols.forEach((col, idx) => {
    const colX = margin + idx * agingColW;
    
    // Background for highlight
    if (col.isHighlight) {
      doc.setFillColor(254, 242, 242); // Rose-50
      doc.rect(colX, currentY, agingColW, agingBoxH, 'F');
    }

    // Divider line between columns
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(colX, currentY, colX, currentY + agingBoxH);
    }

    doc.setFont('Roboto', col.isHighlight ? 'bold' : 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(col.isHighlight ? 185 : 100, col.isHighlight ? 28 : 116, col.isHighlight ? 28 : 139);
    doc.text(col.label, colX + agingColW / 2, currentY + 4.0, { align: 'center' });

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.2);
    if (col.isHighlight || (col.isOverdue && col.val > 0)) {
      doc.setTextColor(220, 38, 38); // Red
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(`${formatNumberVND(col.val)} đ`, colX + agingColW / 2, currentY + 9.5, { align: 'center' });
  });

  currentY += agingBoxH + 3.0;

  // 5. AutoTable: Detailed Debit Note Invoices
  const tableData = soa.entries.map((entry, idx) => {
    const isUsd = entry.currency === 'USD';
    const origStr = isUsd ? formatUSD(entry.originalAmount) : `${formatNumberVND(entry.originalAmount)} đ`;
    const paidStr = isUsd ? formatUSD(entry.paidAmount) : `${formatNumberVND(entry.paidAmount)} đ`;
    const dueStr = isUsd ? formatUSD(entry.balanceDue) : `${formatNumberVND(entry.balanceDue)} đ`;

    const statusText = entry.status === 'PAID' ? 'Đã thu' :
      entry.status === 'OVERDUE' ? `Trễ ${entry.overdueDays}d` :
      entry.status === 'PARTIALLY_PAID' ? 'Thu 1 phần' : 'Chưa thu';

    return [
      idx + 1,
      entry.debitNoteNumber,
      entry.issueDate,
      entry.blNumber,
      normalizeUnicode(entry.routing),
      entry.dueDate,
      origStr,
      paidStr,
      dueStr,
      statusText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'STT\n(No.)',
      'Số Debit Note\n(D/N Number)',
      'Ngày Lập\n(Date)',
      'Số Vận Đơn\n(B/L No.)',
      'Tuyến Vận Chuyển\n(Routing POL-POD)',
      'Hạn TT\n(Due Date)',
      'Tiền Ban Đầu\n(Original Amt)',
      'Đã Thu\n(Paid Amt)',
      'Còn Nợ Phải Trả\n(Balance Due)',
      'Tình Trạng\n(Status)'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 6.2,
      cellPadding: 1.1,
      valign: 'middle',
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 6.4,
      cellPadding: 1.3
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'left', cellWidth: 33 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 21, fontStyle: 'bold', textColor: [185, 28, 28] },
      9: { halign: 'center', cellWidth: 14 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3.2;

  // 6. Section: Bank Details + Summary Box (Side by side)
  const leftW = 116;
  const rightW = contentWidth - leftW - 3; // 71mm
  const rightX = margin + leftW + 3;
  const summaryBoxH = 34;

  // Ensure bottom box doesn't overflow page
  if (currentY + summaryBoxH + 35 > pageHeight) {
    doc.addPage();
    currentY = 12;
  }

  const bottomStartY = currentY;

  // Left Bank Box
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(254, 240, 138);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, bottomStartY, leftW, summaryBoxH, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(146, 64, 14);
  doc.text('THÔNG TIN THANH TOÁN (BANK PAYMENT INSTRUCTIONS) & VIETQR:', margin + 3, bottomStartY + 4.0);

  let bY = bottomStartY + 7.8;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(30, 41, 59);

  doc.text(`Đơn vị thụ hưởng: ${soa.bankAccount.accountHolder}`, margin + 3, bY);
  bY += 3.3;
  doc.text(`Số TK (A/C No.): ${soa.bankAccount.accountNumber}  |  Ngân hàng: ${soa.bankAccount.bankName}`, margin + 3, bY);
  bY += 3.3;
  doc.setFont('Roboto', 'bold');
  doc.text(`Nội dung CK (Memo): ${soa.paymentMemo}`, margin + 3, bY);
  bY += 3.3;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text(`(Tỷ giá hạch toán: 1 USD = ${formatNumberVND(soa.exchangeRate)} VND)`, margin + 3, bY);

  // Amount in words inside left box
  const wordsBoxY = bottomStartY + summaryBoxH - 9.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 2, wordsBoxY, leftW - 4, 8.5, 1, 1, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(15, 23, 42);
  doc.text(`Số tiền bằng chữ (In words): ${soa.amountInWordsVi}`, margin + 4, wordsBoxY + 3.2);
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.0);
  doc.setTextColor(71, 85, 105);
  doc.text(`In English: ${soa.amountInWordsEn}`, margin + 4, wordsBoxY + 6.4);

  // Embed VietQR
  if (soa.vietQrUrl) {
    const qrX = margin + leftW - 25;
    const qrY = bottomStartY + 3.0;
    const qrSize = 20;
    try {
      const qrDataUrl = await fetchImageAsDataUrl(soa.vietQrUrl);
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }
    } catch {
      // Fallback
    }
  }

  // Right Totals Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightX, bottomStartY, rightW, summaryBoxH, 1.5, 1.5, 'FD');

  let rY = bottomStartY + 4.5;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);

  doc.text('Tổng cước phát sinh (Billed):', rightX + 2.5, rY);
  doc.text(`${formatNumberVND(soa.totalBilledVnd)} đ`, rightX + rightW - 2.5, rY, { align: 'right' });
  rY += 3.6;

  doc.text('Tổng tiền đã thanh toán (Paid):', rightX + 2.5, rY);
  doc.text(`${formatNumberVND(soa.totalPaidVnd)} đ`, rightX + rightW - 2.5, rY, { align: 'right' });
  rY += 3.6;

  doc.text('Tổng nợ quá hạn (Overdue):', rightX + 2.5, rY);
  doc.setTextColor(220, 38, 38);
  doc.text(`${formatNumberVND(soa.totalOverdueVnd)} đ`, rightX + rightW - 2.5, rY, { align: 'right' });
  rY += 3.2;

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(rightX + 2, rY, rightX + rightW - 2, rY);
  rY += 2.8;

  // Highlight Balance Due Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(rightX + 2, rY - 1.5, rightW - 4, 11, 1, 1, 'F');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text('TỔNG DƯ NỢ CẦN THANH TOÁN:', rightX + 3.5, rY + 2.0);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`${formatNumberVND(soa.totalBalanceDueVnd)} VND`, rightX + rightW - 3.5, rY + 6.5, { align: 'right' });

  currentY = bottomStartY + summaryBoxH + 3.0;

  // 7. Terms & Dispute Clause
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  const termsLines = doc.splitTextToSize(normalizeUnicode(`• ${soa.paymentTermsNote}  |  ${soa.disputeClause}`), contentWidth);
  renderTextLines(doc, termsLines, margin, currentY, 3.0);
  currentY += (termsLines.length - 1) * 3.0 + 4.5;

  // 8. Signatures Block
  const sigBoxW = contentWidth / 3;
  let sigStartY = Math.min(Math.max(currentY + 4, 245), pageHeight - 32);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  doc.text('NGƯỜI LẬP BIỂU', margin + sigBoxW * 0.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Prepared By)', margin + sigBoxW * 0.5, sigStartY + 3.4, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(soa.preparedBy), margin + sigBoxW * 0.5, sigStartY + 16, { align: 'center' });

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KẾ TOÁN TRƯỞNG / DUYỆT', margin + sigBoxW * 1.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Chief Accountant / Approved By)', margin + sigBoxW * 1.5, sigStartY + 3.4, { align: 'center' });
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(soa.approvedBy), margin + sigBoxW * 1.5, sigStartY + 16, { align: 'center' });

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('XÁC NHẬN CỦA KHÁCH HÀNG', margin + sigBoxW * 2.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Customer Acceptance / Stamp)', margin + sigBoxW * 2.5, sigStartY + 3.4, { align: 'center' });
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('(Ký, ghi rõ họ tên & đóng dấu)', margin + sigBoxW * 2.5, sigStartY + 16, { align: 'center' });

  // Save the PDF
  const filename = `SOA_${soa.soaNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
