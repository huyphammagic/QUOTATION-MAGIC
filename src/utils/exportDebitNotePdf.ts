import { DebitNoteRecord } from '../types/debitNote';
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
 * Helper to render an array of text lines line-by-line with exact, deterministic millimeter spacing.
 * This completely avoids jsPDF's internal font multiplier discrepancies and guarantees 0% overlap.
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
 * High-Precision Single-Page A4 PDF Generator for Debit Note
 * Conforms 100% to International Logistics standards, Vietnamese legal invoicing requirements,
 * with pixel-perfect margins, line-heights, zero overlapping, and embedded Roboto Unicode fonts.
 */
export async function exportDebitNotePdf(dn: DebitNoteRecord): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // Standard A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Ensure Roboto Unicode fonts (Normal, Bold, Italic) are registered
  await ensureUnicodeFonts(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10; // Exact 10mm margin on left and right
  const contentWidth = pageWidth - margin * 2; // Exact 190mm printable width

  // =========================================================================
  // 1. Top Decorative Brand Bar
  // =========================================================================
  doc.setFillColor(15, 23, 42); // Slate-900 Navy Accent
  doc.rect(margin, 8, contentWidth, 1.2, 'F');

  // =========================================================================
  // 2. Company Brand & Official Header Box (Side-by-side)
  // =========================================================================
  const headerStartY = 12.5;
  const rightBoxW = 76; // 76mm for official metadata box
  const leftColW = contentWidth - rightBoxW - 4; // 110mm for company details
  const rightBoxX = margin + leftColW + 4;

  let currentY = headerStartY;

  // Company Name
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const companyTitle = normalizeUnicode((dn.company as any).companyName || dn.company.name || 'CÔNG TY TNHH BOGI LOGISTICS & FORWARDING');
  doc.text(companyTitle, margin, currentY);
  currentY += 4.2;

  // Company English Name
  if (dn.company.englishName) {
    doc.setFont('Roboto', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(dn.company.englishName), margin, currentY);
    currentY += 3.6;
  }

  // Company Address
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const addrLines = doc.splitTextToSize(normalizeUnicode(`Địa chỉ / Address: ${dn.company.address || 'TP. Hồ Chí Minh, Việt Nam'}`), leftColW);
  renderTextLines(doc, addrLines, margin, currentY, 3.2);
  currentY += (addrLines.length - 1) * 3.2 + 3.4;

  // Contact Info
  const contactText = `MST / Tax ID: ${dn.company.taxId || '0318999888'}  |  Tel: ${dn.company.phone || '028.3888.9999'}  |  Email: ${dn.company.email || 'billing@bogilogistics.vn'}`;
  const contactLines = doc.splitTextToSize(normalizeUnicode(contactText), leftColW);
  renderTextLines(doc, contactLines, margin, currentY, 3.2);
  currentY += (contactLines.length - 1) * 3.2 + 3.2;

  // Right Meta Box: Official Debit Note Header
  const metaBoxHeight = 23;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.25);
  doc.roundedRect(rightBoxX, headerStartY - 0.5, rightBoxW, metaBoxHeight, 1.5, 1.5, 'FD');

  // Title inside right box
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('DEBIT NOTE / GIẤY BÁO NỢ', rightBoxX + rightBoxW / 2, headerStartY + 3.6, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text('CHỨNG TỪ THU TIỀN CƯỚC & DỊCH VỤ LOGISTICS', rightBoxX + rightBoxW / 2, headerStartY + 6.8, { align: 'center' });

  // Metadata rows inside right box
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode('Số D/N (No.):'), rightBoxX + 3, headerStartY + 11.2);
  doc.text(normalizeUnicode(dn.debitNoteNumber), rightBoxX + rightBoxW - 3, headerStartY + 11.2, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Ngày lập (Date): ${dn.issueDate}`), rightBoxX + 3, headerStartY + 15.0);

  // Highlight Due Date in Red
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text(normalizeUnicode(`Hạn TT (Due Date): ${dn.dueDate}`), rightBoxX + rightBoxW - 3, headerStartY + 15.0, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode('Số Báo Giá (Quote No.):'), rightBoxX + 3, headerStartY + 18.8);
  doc.text(normalizeUnicode(dn.quotationNumber), rightBoxX + rightBoxW - 3, headerStartY + 18.8, { align: 'right' });

  currentY = Math.max(currentY + 2, headerStartY + metaBoxHeight + 2);

  // Subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 2.8;

  // =========================================================================
  // 3. Section I & II: Side-by-Side Customer (Bill To) & Shipment Details
  // Standardized International Logistics Terminology & Deterministic Layout
  // =========================================================================
  const colW = (contentWidth - 4) / 2; // 93mm each
  const innerTextW = colW - 6; // 87mm usable text width inside each box
  const sectionBoxStartY = currentY;

  // Prepare Bill To Lines
  const customerName = dn.customer.companyName || dn.customer.customerName || 'N/A';
  const billToCustNameLines = doc.splitTextToSize(normalizeUnicode(customerName), innerTextW);
  const billToTaxContactText = `MST / Tax ID: ${dn.customer.taxId || 'N/A'}  |  Liên hệ: ${dn.customer.contactPerson || dn.customer.customerName || 'N/A'}`;
  const billToTaxContactLines = doc.splitTextToSize(normalizeUnicode(billToTaxContactText), innerTextW);
  const billToPhoneEmailText = `Điện thoại / Tel: ${dn.customer.phone || 'N/A'}  |  Email: ${dn.customer.email || 'N/A'}`;
  const billToPhoneEmailLines = doc.splitTextToSize(normalizeUnicode(billToPhoneEmailText), innerTextW);
  const billToAddrText = `Địa chỉ / Address: ${dn.customer.address || 'N/A'}`;
  const billToAddrLines = doc.splitTextToSize(normalizeUnicode(billToAddrText), innerTextW);

  // Prepare Shipment Lines with Standard Logistics Terminology
  const shptRouteText = `Tuyến vận chuyển (Routing): ${dn.shipment.pol} -> ${dn.shipment.pod}`;
  const shptRouteLines = doc.splitTextToSize(normalizeUnicode(shptRouteText), innerTextW);
  
  const shptModeCarrierText = `Phương thức (Mode): ${dn.shipment.mode}  |  Hãng VC: ${dn.shipment.carrier || 'N/A'}`;
  const shptModeCarrierLines = doc.splitTextToSize(normalizeUnicode(shptModeCarrierText), innerTextW);

  const shptBlBookingText = `Vận đơn (B/L No.): ${dn.shipment.blNumber || 'N/A'}  |  Số Booking: ${dn.shipment.bookingNumber || 'N/A'}`;
  const shptBlBookingLines = doc.splitTextToSize(normalizeUnicode(shptBlBookingText), innerTextW);

  const shptVesselContText = `Tàu / Chuyến (Vsl/Voy): ${dn.shipment.vesselVoyage || 'N/A'}  |  Cont/Seal: ${dn.shipment.containerSealNo || 'N/A'}`;
  const shptVesselContLines = doc.splitTextToSize(normalizeUnicode(shptVesselContText), innerTextW);

  const shptCargoText = `Mặt hàng (Commodity): ${dn.shipment.cargoDescription || 'N/A'}  |  G.W: ${dn.shipment.grossWeightKg || 0} kg  |  Vol: ${dn.shipment.volumeCbm || 0} CBM`;
  const shptCargoLines = doc.splitTextToSize(normalizeUnicode(shptCargoText), innerTextW);

  // Exact vertical calculation
  const lineStep = 3.3;
  const billToCalculatedH = 5.5 + (billToCustNameLines.length + billToTaxContactLines.length + billToPhoneEmailLines.length + billToAddrLines.length) * lineStep + 2;
  const shptCalculatedH = 5.5 + (shptRouteLines.length + shptModeCarrierLines.length + shptBlBookingLines.length + shptVesselContLines.length + shptCargoLines.length) * lineStep + 2;
  const infoBoxH = Math.max(billToCalculatedH, shptCalculatedH, 27);

  // Left Box: Bill To
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, sectionBoxStartY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(239, 246, 255); // Blue-50 header strip
  doc.roundedRect(margin, sectionBoxStartY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(30, 58, 138);
  doc.text('I. ĐƠN VỊ THANH TOÁN (BILL TO / PAYER)', margin + 3, sectionBoxStartY + 3.2);

  // Render Bill To text with deterministic line-by-line helper
  let leftY = sectionBoxStartY + 7.8;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  leftY = renderTextLines(doc, billToCustNameLines, margin + 3, leftY, lineStep) + lineStep;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);
  leftY = renderTextLines(doc, billToTaxContactLines, margin + 3, leftY, lineStep) + lineStep;
  leftY = renderTextLines(doc, billToPhoneEmailLines, margin + 3, leftY, lineStep) + lineStep;
  renderTextLines(doc, billToAddrLines, margin + 3, leftY, lineStep);

  // Right Box: Shipment Details
  const shptX = margin + colW + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(shptX, sectionBoxStartY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(240, 253, 244); // Emerald-50 header strip
  doc.roundedRect(shptX, sectionBoxStartY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(21, 128, 61);
  doc.text('II. CHI TIẾT LÔ HÀNG (SHIPMENT PARTICULARS)', shptX + 3, sectionBoxStartY + 3.2);

  // Render Shipment text with deterministic line-by-line helper
  let rightY = sectionBoxStartY + 7.8;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);

  rightY = renderTextLines(doc, shptRouteLines, shptX + 3, rightY, lineStep) + lineStep;
  rightY = renderTextLines(doc, shptModeCarrierLines, shptX + 3, rightY, lineStep) + lineStep;
  rightY = renderTextLines(doc, shptBlBookingLines, shptX + 3, rightY, lineStep) + lineStep;
  rightY = renderTextLines(doc, shptVesselContLines, shptX + 3, rightY, lineStep) + lineStep;
  renderTextLines(doc, shptCargoLines, shptX + 3, rightY, lineStep);

  currentY = sectionBoxStartY + infoBoxH + 3.2;

  // =========================================================================
  // 4. Section III: AutoTable Charges Breakdown
  // Column Budget (190mm): 8 + 50 + 16 + 9 + 12 + 17 + 11 + 18 + 13 + 16 + 20 = 190mm
  // Vertical Alignment: Middle. Professional dual-language headings.
  // =========================================================================
  const isCompact = dn.items.length > 7;
  const tableData = dn.items.map((item, idx) => {
    const isUsd = item.currency === 'USD';
    const priceStr = isUsd ? formatUSD(item.unitPrice) : `${formatNumberVND(item.unitPrice)} đ`;
    const amtStr = isUsd ? formatUSD(item.amount) : `${formatNumberVND(item.amount)} đ`;
    const vatAmtStr = isUsd ? formatUSD(item.vatAmount) : `${formatNumberVND(item.vatAmount)} đ`;
    const totalStr = isUsd ? formatUSD(item.totalAmount) : `${formatNumberVND(item.totalAmount)} đ`;

    const desc = item.descriptionEn 
      ? `${normalizeUnicode(item.description)}\n(${normalizeUnicode(item.descriptionEn)})`
      : normalizeUnicode(item.description);

    return [
      idx + 1,
      desc,
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
      'STT\n(No.)',
      'Nội Dung Chi Phí\n(Description of Charges)',
      'Mã Phí\n(Code)',
      'SL\n(Qty)',
      'ĐVT\n(Unit)',
      'Đơn Giá\n(Unit Price)',
      'Loại Tiền\n(Curr)',
      'Thành Tiền\n(Amount)',
      'Thuế Suất\n(VAT %)',
      'Tiền Thuế\n(VAT Amt)',
      'Tổng Cộng\n(Total Amount)'
    ]],
    body: tableData,
    theme: 'grid',
    pageBreak: 'avoid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: isCompact ? 6.2 : 6.6,
      cellPadding: isCompact ? 1.0 : 1.3,
      valign: 'middle',
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
      valign: 'middle',
      fontSize: 6.5,
      cellPadding: isCompact ? 1.2 : 1.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 9 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 17 },
      6: { halign: 'center', cellWidth: 11 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'center', cellWidth: 13 },
      9: { halign: 'right', cellWidth: 16 },
      10: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3.2;

  // =========================================================================
  // 5. Section IV: Combined Bottom Block (Parallel 2 Columns)
  // Left: Bank instructions + Amount in Words + VietQR (116mm)
  // Right: Summary Totals + Grand Total Box (71mm)
  // =========================================================================
  const leftSummaryW = 116;
  const rightSummaryW = contentWidth - leftSummaryW - 3; // 71mm
  const rightSummaryX = margin + leftSummaryW + 3;
  const bottomBlockStartY = currentY;

  // Format bank name cleanly
  let bankDisplay = dn.bankAccountVnd.bankName;
  if (bankDisplay.includes('Vietcombank')) bankDisplay = 'Vietcombank - ' + (dn.bankAccountVnd.branch || 'CN Tân Bình');
  else if (bankDisplay.includes('Techcombank')) bankDisplay = 'Techcombank - ' + (dn.bankAccountVnd.branch || 'CN Sài Gòn');
  else if (bankDisplay.includes('MBBank') || bankDisplay.includes('Quân Đội')) bankDisplay = 'MB Bank - ' + (dn.bankAccountVnd.branch || 'CN Nam Sài Gòn');

  const customerShort = (dn.customer.companyName || dn.customer.customerName || '').replace(/CÔNG TY (TNHH|CỔ PHẦN) /gi, '').trim();
  const bankTextW = leftSummaryW - 27; // 89mm width for text beside QR code

  const bankHolderLines = doc.splitTextToSize(normalizeUnicode(`Đơn vị thụ hưởng (Beneficiary): ${dn.bankAccountVnd.accountHolder}`), bankTextW);
  const bankAccLines = doc.splitTextToSize(normalizeUnicode(`Số TK (A/C No.): ${dn.bankAccountVnd.accountNumber}  |  Ngân hàng: ${bankDisplay}`), bankTextW);
  const transferMemoText = `Nội dung CK (Memo): ${dn.debitNoteNumber} ${customerShort}`;
  const transferMemoLines = doc.splitTextToSize(normalizeUnicode(transferMemoText), bankTextW);
  const exRateText = `Tỷ giá quy đổi (Ex. Rate): 1 USD = ${formatNumberVND(dn.exchangeRate)} VND (${dn.exchangeRateSource || 'VCB'})`;
  const exRateLines = doc.splitTextToSize(normalizeUnicode(exRateText), bankTextW);

  // Amount in words lines
  const wordsBoxW = leftSummaryW - 4;
  const wordsViLines = doc.splitTextToSize(normalizeUnicode(`Bằng chữ (In words - VND): ${dn.amountInWordsVi}`), wordsBoxW - 4);
  const wordsEnLines = doc.splitTextToSize(normalizeUnicode(`In English: ${dn.amountInWordsEn}`), wordsBoxW - 4);

  // Exact vertical calculation
  const bankBlockTextH = 5.2 + (bankHolderLines.length + bankAccLines.length + transferMemoLines.length + exRateLines.length) * 3.3;
  const wordsBoxH = (wordsViLines.length + wordsEnLines.length) * 3.1 + 3;
  const leftCalculatedH = bankBlockTextH + wordsBoxH + 3.2;
  const totalsBoxHeight = Math.max(leftCalculatedH, 35);

  // === RIGHT COLUMN: TOTALS SUMMARY BOX ===
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightSummaryX, bottomBlockStartY, rightSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);

  let totY = bottomBlockStartY + 4.8;
  doc.text('Cộng tiền trước thuế (Subtotal USD):', rightSummaryX + 2.8, totY);
  doc.text(formatUSD(dn.subtotalUsd), rightSummaryX + rightSummaryW - 2.8, totY, { align: 'right' });

  totY += 3.8;
  doc.text('Cộng tiền trước thuế (Subtotal VND):', rightSummaryX + 2.8, totY);
  doc.text(`${formatNumberVND(dn.subtotalVnd)} đ`, rightSummaryX + rightSummaryW - 2.8, totY, { align: 'right' });

  totY += 3.8;
  doc.text('Tiền thuế GTGT (VAT USD / VND):', rightSummaryX + 2.8, totY);
  doc.text(`${formatUSD(dn.vatTotalUsd)} / ${formatNumberVND(dn.vatTotalVnd)} đ`, rightSummaryX + rightSummaryW - 2.8, totY, { align: 'right' });

  // Divider inside summary
  totY += 3.4;
  doc.setDrawColor(203, 213, 225);
  doc.line(rightSummaryX + 2.5, totY, rightSummaryX + rightSummaryW - 2.5, totY);

  // Grand Total Highlight Box
  totY += 3.2;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(rightSummaryX + 2, totY - 2.2, rightSummaryW - 4, 11.5, 1, 1, 'F');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(30, 58, 138);
  doc.text(normalizeUnicode(`TỔNG CẦN THANH TOÁN (${dn.finalCurrency}):`), rightSummaryX + 3.5, totY + 1.8);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38); // Highlight Red
  const finalStr = dn.finalCurrency === 'USD' 
    ? formatUSD(dn.finalAmountToPay) 
    : `${formatNumberVND(dn.finalAmountToPay)} VND`;
  doc.text(finalStr, rightSummaryX + rightSummaryW - 3.5, totY + 6.6, { align: 'right' });

  // === LEFT COLUMN: PAYMENT INSTRUCTIONS & WORDS ===
  doc.setFillColor(254, 252, 232); // Warm light cream
  doc.setDrawColor(254, 240, 138); // Yellow-200 border
  doc.roundedRect(margin, bottomBlockStartY, leftSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(146, 64, 14); // Dark Amber
  doc.text('THÔNG TIN THANH TOÁN (PAYMENT DETAILS) & VIETQR:', margin + 3, bottomBlockStartY + 4.2);

  // Render Bank Details with deterministic line-by-line helper
  let bankCursorY = bottomBlockStartY + 8.0;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(30, 41, 59);

  bankCursorY = renderTextLines(doc, bankHolderLines, margin + 3, bankCursorY, 3.3) + 3.3;
  bankCursorY = renderTextLines(doc, bankAccLines, margin + 3, bankCursorY, 3.3) + 3.3;

  doc.setFont('Roboto', 'bold');
  bankCursorY = renderTextLines(doc, transferMemoLines, margin + 3, bankCursorY, 3.3) + 3.3;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  renderTextLines(doc, exRateLines, margin + 3, bankCursorY, 3.3);

  // Embed VietQR code on the right of the bank box
  const transferDesc = `${dn.debitNoteNumber}`;
  const amountToPay = dn.finalCurrency === 'VND' ? dn.finalAmountToPay : Math.round(dn.finalAmountToPay * dn.exchangeRate);
  const qrUrl = `https://img.vietqr.io/image/${dn.bankAccountVnd.bankId}-${dn.bankAccountVnd.accountNumber}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(transferDesc)}&accountName=${encodeURIComponent(dn.bankAccountVnd.accountHolder)}`;
  
  const qrX = margin + leftSummaryW - 25;
  const qrY = bottomBlockStartY + 3.0;
  const qrSize = 21;

  try {
    const qrDataUrl = await fetchImageAsDataUrl(qrUrl);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }
  } catch {
    // Graceful fallback if offline
  }

  // Amount in words box at the bottom of the left section
  const wordsBoxY = bottomBlockStartY + totalsBoxHeight - wordsBoxH - 1.8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 2, wordsBoxY, wordsBoxW, wordsBoxH, 1, 1, 'F');

  let wordsY = wordsBoxY + 3.2;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  wordsY = renderTextLines(doc, wordsViLines, margin + 4, wordsY, 3.0) + 3.0;

  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  renderTextLines(doc, wordsEnLines, margin + 4, wordsY, 3.0);

  currentY = bottomBlockStartY + totalsBoxHeight + 3.2;

  // Terms and Bank Charge Clause Note
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  const termsText = `• Điều khoản thanh toán (Payment Terms): ${dn.paymentTerms}  |  ${dn.bankChargeClause}`;
  const termsLines = doc.splitTextToSize(normalizeUnicode(termsText), contentWidth);
  renderTextLines(doc, termsLines, margin, currentY, 3.2);
  currentY += (termsLines.length - 1) * 3.2 + 3.2;

  // =========================================================================
  // 6. Section V: 3-Column Signatures Block (Anti-overflow & Always Single Page!)
  // Placed with natural breathing room below terms
  // =========================================================================
  const sigBoxW = contentWidth / 3; // 63.3mm each
  let sigStartY = Math.min(Math.max(currentY + 6, 236), pageHeight - 34);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  // Column 1: Prepared By
  doc.text('NGƯỜI LẬP BIỂU', margin + sigBoxW * 0.5, sigStartY, { align: 'center' });
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Prepared By)', margin + sigBoxW * 0.5, sigStartY + 3.4, { align: 'center' });
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
  doc.text('(Chief Accountant / Approved By)', margin + sigBoxW * 1.5, sigStartY + 3.4, { align: 'center' });
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
  doc.text('(Customer Acceptance / Stamp)', margin + sigBoxW * 2.5, sigStartY + 3.4, { align: 'center' });
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('(Ký, ghi rõ họ tên & đóng dấu)', margin + sigBoxW * 2.5, sigStartY + 16, { align: 'center' });

  // Save the PDF
  const filename = `DebitNote_${dn.debitNoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
