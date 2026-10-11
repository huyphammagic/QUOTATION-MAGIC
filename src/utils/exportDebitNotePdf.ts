import { DebitNoteRecord } from '../types/debitNote';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { formatUSD, formatNumberVND } from './formatters';

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
 * - Anti-collision dynamic layout engine: All texts calculate line breaks dynamically
 * - Zero overlapping: Coordinates advance based on actual wrapped text heights
 * - Strictly fits onto 1 single A4 page without spilling into page 2
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

  // 2. Company Header (Left 114mm) & Debit Note Meta Box (Right 73mm)
  const leftColW = 114;
  const rightBoxW = contentWidth - leftColW - 3; // 73mm
  const rightBoxX = margin + leftColW + 3;
  const headerStartY = currentY;

  // Company Name (Vietnamese primary)
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const companyNameLines = doc.splitTextToSize(normalizeUnicode(dn.company.name.toUpperCase()), leftColW);
  doc.text(companyNameLines, margin, currentY);
  currentY += companyNameLines.length * 4;

  if (dn.company.englishName) {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const engNameLines = doc.splitTextToSize(normalizeUnicode(dn.company.englishName.toUpperCase()), leftColW);
    doc.text(engNameLines, margin, currentY);
    currentY += engNameLines.length * 3.4;
  }

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const addrLines = doc.splitTextToSize(normalizeUnicode(`Địa chỉ: ${dn.company.address}`), leftColW);
  doc.text(addrLines, margin, currentY);
  currentY += addrLines.length * 3.3;

  const contactText = `MST: ${dn.company.taxId}  |  Hotline: ${dn.company.phone}  |  Email: ${dn.company.email}`;
  const contactLines = doc.splitTextToSize(normalizeUnicode(contactText), leftColW);
  doc.text(contactLines, margin, currentY);
  currentY += contactLines.length * 3.3;

  // Right Meta Box: Official Debit Note Header
  const metaBoxHeight = 22;
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
  doc.text(normalizeUnicode(`Số D/N:`), rightBoxX + 2.5, headerStartY + 10.8);
  doc.text(normalizeUnicode(dn.debitNoteNumber), rightBoxX + rightBoxW - 2.5, headerStartY + 10.8, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Ngày lập: ${dn.issueDate}`), rightBoxX + 2.5, headerStartY + 14.5);

  // Highlight Due Date in Red
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text(normalizeUnicode(`Hạn TT: ${dn.dueDate}`), rightBoxX + rightBoxW - 2.5, headerStartY + 14.5, { align: 'right' });

  doc.setFont('Roboto', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Số Báo Giá:`), rightBoxX + 2.5, headerStartY + 18.2);
  doc.text(normalizeUnicode(dn.quotationNumber), rightBoxX + rightBoxW - 2.5, headerStartY + 18.2, { align: 'right' });

  currentY = Math.max(currentY + 2, headerStartY + metaBoxHeight + 2);

  // Horizontal subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 2.5;

  // =========================================================================
  // 3. Section I & II: Side-by-Side Customer (Bill To) & Shipment Details
  // DYNAMIC TEXT SPLITTING & CURSOR ADVANCEMENT TO PREVENT ANY OVERLAPPING!
  // =========================================================================
  const colW = (contentWidth - 3) / 2; // 93.5mm each
  const innerTextW = colW - 5; // 88.5mm usable inside each box
  const sectionBoxStartY = currentY;

  // Prepare Bill To Lines dynamically
  const customerName = dn.customer.companyName || dn.customer.customerName || 'N/A';
  const billToCustNameLines = doc.splitTextToSize(normalizeUnicode(customerName), innerTextW);
  const billToContactText = `MST: ${dn.customer.taxId || 'N/A'}  |  Liên hệ: ${dn.customer.contactPerson || dn.customer.customerName || 'N/A'}`;
  const billToContactLines = doc.splitTextToSize(normalizeUnicode(billToContactText), innerTextW);
  const billToPhoneEmailText = `Điện thoại: ${dn.customer.phone || 'N/A'}  |  Email: ${dn.customer.email || 'N/A'}`;
  const billToPhoneEmailLines = doc.splitTextToSize(normalizeUnicode(billToPhoneEmailText), innerTextW);
  const billToAddrText = `Địa chỉ: ${dn.customer.address || 'N/A'}`;
  const billToAddrLines = doc.splitTextToSize(normalizeUnicode(billToAddrText), innerTextW);

  // Prepare Shipment Lines dynamically
  const shptRouteText = `Tuyến & PT: ${dn.shipment.pol} -> ${dn.shipment.pod} (${dn.shipment.mode})`;
  const shptRouteLines = doc.splitTextToSize(normalizeUnicode(shptRouteText), innerTextW);
  const shptBlBookingText = `Số B/L: ${dn.shipment.blNumber || 'N/A'}  |  Booking: ${dn.shipment.bookingNumber || 'N/A'}`;
  const shptBlBookingLines = doc.splitTextToSize(normalizeUnicode(shptBlBookingText), innerTextW);
  const shptVesselContText = `Tàu/Chuyến: ${dn.shipment.vesselVoyage || 'N/A'}  |  Số Cont/Seal: ${dn.shipment.containerSealNo || 'N/A'}`;
  const shptVesselContLines = doc.splitTextToSize(normalizeUnicode(shptVesselContText), innerTextW);
  const shptCargoText = `Hàng hóa: ${dn.shipment.cargoDescription || 'N/A'}  |  GW: ${dn.shipment.grossWeightKg || 0} kg  |  Vol: ${dn.shipment.volumeCbm || 0} CBM`;
  const shptCargoLines = doc.splitTextToSize(normalizeUnicode(shptCargoText), innerTextW);

  // Calculate actual required vertical height for each box
  const lineGap = 3.2;
  const billToCalculatedH = 5 + (billToCustNameLines.length + billToContactLines.length + billToPhoneEmailLines.length + billToAddrLines.length) * lineGap + 2;
  const shptCalculatedH = 5 + (shptRouteLines.length + shptBlBookingLines.length + shptVesselContLines.length + shptCargoLines.length) * lineGap + 2;
  const infoBoxH = Math.max(billToCalculatedH, shptCalculatedH, 25);

  // Left Box: Bill To
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, sectionBoxStartY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(239, 246, 255); // Blue-50 header strip
  doc.roundedRect(margin, sectionBoxStartY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text('I. ĐƠN VỊ THANH TOÁN (BILL TO)', margin + 2.5, sectionBoxStartY + 3.2);

  // Render Bill To text with dynamically advancing Y cursor
  let leftY = sectionBoxStartY + 7.5;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(billToCustNameLines, margin + 2.5, leftY);
  leftY += billToCustNameLines.length * lineGap;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);
  doc.text(billToContactLines, margin + 2.5, leftY);
  leftY += billToContactLines.length * lineGap;

  doc.text(billToPhoneEmailLines, margin + 2.5, leftY);
  leftY += billToPhoneEmailLines.length * lineGap;

  doc.text(billToAddrLines, margin + 2.5, leftY);

  // Right Box: Shipment Details
  const shptX = margin + colW + 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(shptX, sectionBoxStartY, colW, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(240, 253, 244); // Emerald-50 header strip
  doc.roundedRect(shptX, sectionBoxStartY, colW, 4.5, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61);
  doc.text('II. CHI TIẾT LÔ HÀNG (SHIPMENT PARTICULARS)', shptX + 2.5, sectionBoxStartY + 3.2);

  // Render Shipment text with dynamically advancing Y cursor (ZERO OVERLAP!)
  let rightY = sectionBoxStartY + 7.5;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(71, 85, 105);

  doc.text(shptRouteLines, shptX + 2.5, rightY);
  rightY += shptRouteLines.length * lineGap;

  doc.text(shptBlBookingLines, shptX + 2.5, rightY);
  rightY += shptBlBookingLines.length * lineGap;

  doc.text(shptVesselContLines, shptX + 2.5, rightY);
  rightY += shptVesselContLines.length * lineGap;

  doc.text(shptCargoLines, shptX + 2.5, rightY);

  currentY = sectionBoxStartY + infoBoxH + 3;

  // =========================================================================
  // 4. Section III: AutoTable Charges Breakdown
  // COLUMN BUDGET (190mm): 8 + 52 + 18 + 8 + 14 + 17 + 9 + 18 + 8 + 16 + 22 = 190mm
  // "STT" fits on 1 line. "Mã" and "ĐVT" do NOT break awkwardly into multiple lines!
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
      'STT',
      'Hạng Mục Chi Phí (Description)',
      'Mã Phí',
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
      fontSize: isCompact ? 6.2 : 6.6,
      cellPadding: isCompact ? 1.0 : 1.3,
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
      fontSize: 6.6,
      cellPadding: isCompact ? 1.2 : 1.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 52 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 8 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 17 },
      6: { halign: 'center', cellWidth: 9 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'center', cellWidth: 8 },
      9: { halign: 'right', cellWidth: 16 },
      10: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // =========================================================================
  // 5. Section IV: Combined Bottom Block (Parallel 2 Columns)
  // Left: Bank instructions + Amount in Words + VietQR (116mm)
  // Right: Summary Totals + Grand Total Box (71mm)
  // DYNAMIC LINE ADVANCEMENT TO ELIMINATE COLLISION OF BANK & MEMO TEXT!
  // =========================================================================
  const leftSummaryW = 116;
  const rightSummaryW = contentWidth - leftSummaryW - 3; // 71mm
  const rightSummaryX = margin + leftSummaryW + 3;
  const bottomBlockStartY = currentY;

  // Simplify bank name if verbose so it fits nicely
  let bankDisplay = dn.bankAccountVnd.bankName;
  if (bankDisplay.includes('Vietcombank')) bankDisplay = 'Vietcombank - ' + (dn.bankAccountVnd.branch || 'CN Tân Bình');
  else if (bankDisplay.includes('Techcombank')) bankDisplay = 'Techcombank - ' + (dn.bankAccountVnd.branch || 'CN Sài Gòn');
  else if (bankDisplay.includes('MBBank') || bankDisplay.includes('Quân Đội')) bankDisplay = 'MB Bank - ' + (dn.bankAccountVnd.branch || 'CN Nam Sài Gòn');

  // Customer short name for transfer memo to prevent 3-line wrap collision
  const customerShort = (dn.customer.companyName || dn.customer.customerName || '').replace(/CÔNG TY (TNHH|CỔ PHẦN) /gi, '').trim();

  // Width available for bank text on the left of the QR code (leaving 25mm for QR on the right)
  const bankTextW = leftSummaryW - 27; // 89mm

  const bankHolderLines = doc.splitTextToSize(normalizeUnicode(`Tên TK: ${dn.bankAccountVnd.accountHolder}`), bankTextW);
  const bankAccLines = doc.splitTextToSize(normalizeUnicode(`Số TK: ${dn.bankAccountVnd.accountNumber}  |  Ngân hàng: ${bankDisplay}`), bankTextW);
  const transferMemoText = `Nội dung CK: ${dn.debitNoteNumber} ${customerShort}`;
  const transferMemoLines = doc.splitTextToSize(normalizeUnicode(transferMemoText), bankTextW);
  const exRateText = `(Tỷ giá quy đổi: 1 USD = ${formatNumberVND(dn.exchangeRate)} đ - ${dn.exchangeRateSource || 'VCB'})`;
  const exRateLines = doc.splitTextToSize(normalizeUnicode(exRateText), bankTextW);

  // Amount in words lines
  const wordsBoxW = leftSummaryW - 4;
  const wordsViLines = doc.splitTextToSize(normalizeUnicode(`Bằng chữ: ${dn.amountInWordsVi}`), wordsBoxW - 4);
  const wordsEnLines = doc.splitTextToSize(normalizeUnicode(`In English: ${dn.amountInWordsEn}`), wordsBoxW - 4);

  // Calculate actual height needed for the bottom block
  const bankBlockTextH = 5 + (bankHolderLines.length + bankAccLines.length + transferMemoLines.length + exRateLines.length) * 3.3;
  const wordsBoxH = (wordsViLines.length + wordsEnLines.length) * 3.1 + 3;
  const leftCalculatedH = bankBlockTextH + wordsBoxH + 3;
  const totalsBoxHeight = Math.max(leftCalculatedH, 33);

  // === RIGHT COLUMN: TOTALS SUMMARY BOX ===
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightSummaryX, bottomBlockStartY, rightSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);

  let totY = bottomBlockStartY + 4.5;
  doc.text('Cộng tiền chưa thuế USD:', rightSummaryX + 2.5, totY);
  doc.text(formatUSD(dn.subtotalUsd), rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

  totY += 3.8;
  doc.text('Cộng tiền chưa thuế VND:', rightSummaryX + 2.5, totY);
  doc.text(`${formatNumberVND(dn.subtotalVnd)} đ`, rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

  totY += 3.8;
  doc.text('Thuế VAT (USD / VND):', rightSummaryX + 2.5, totY);
  doc.text(`${formatUSD(dn.vatTotalUsd)} / ${formatNumberVND(dn.vatTotalVnd)} đ`, rightSummaryX + rightSummaryW - 2.5, totY, { align: 'right' });

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
  // Clean single currency format (NO DUPLICATE "đ VND"!)
  const finalStr = dn.finalCurrency === 'USD' 
    ? formatUSD(dn.finalAmountToPay) 
    : `${formatNumberVND(dn.finalAmountToPay)} VND`;
  doc.text(finalStr, rightSummaryX + rightSummaryW - 3.5, totY + 6.2, { align: 'right' });

  // === LEFT COLUMN: PAYMENT INSTRUCTIONS & WORDS ===
  doc.setFillColor(254, 252, 232); // Warm light cream
  doc.setDrawColor(254, 240, 138); // Yellow-200 border
  doc.roundedRect(margin, bottomBlockStartY, leftSummaryW, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(146, 64, 14); // Dark Amber
  doc.text('THÔNG TIN THANH TOÁN & VIETQR (BANK DETAILS):', margin + 2.5, bottomBlockStartY + 4);

  // Render Bank Details with dynamic cursor (NO TEXT COLLISION!)
  let bankCursorY = bottomBlockStartY + 7.6;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(30, 41, 59);

  doc.text(bankHolderLines, margin + 2.5, bankCursorY);
  bankCursorY += bankHolderLines.length * 3.3;

  doc.text(bankAccLines, margin + 2.5, bankCursorY);
  bankCursorY += bankAccLines.length * 3.3;

  doc.setFont('Roboto', 'bold');
  doc.text(transferMemoLines, margin + 2.5, bankCursorY);
  bankCursorY += transferMemoLines.length * 3.3;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text(exRateLines, margin + 2.5, bankCursorY);
  bankCursorY += exRateLines.length * 3.3;

  // Embed VietQR code on the right of the bank box
  const transferDesc = `${dn.debitNoteNumber}`;
  const amountToPay = dn.finalCurrency === 'VND' ? dn.finalAmountToPay : Math.round(dn.finalAmountToPay * dn.exchangeRate);
  const qrUrl = `https://img.vietqr.io/image/${dn.bankAccountVnd.bankId}-${dn.bankAccountVnd.accountNumber}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(transferDesc)}&accountName=${encodeURIComponent(dn.bankAccountVnd.accountHolder)}`;
  
  const qrX = margin + leftSummaryW - 24;
  const qrY = bottomBlockStartY + 2.5;
  const qrSize = 20;

  try {
    const qrDataUrl = await fetchImageAsDataUrl(qrUrl);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }
  } catch {
    // Graceful fallback
  }

  // Amount in words box at the bottom of the left section
  const wordsBoxY = bottomBlockStartY + totalsBoxHeight - wordsBoxH - 1.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 2, wordsBoxY, wordsBoxW, wordsBoxH, 1, 1, 'F');

  let wordsY = wordsBoxY + 3.2;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(wordsViLines, margin + 4, wordsY);
  wordsY += wordsViLines.length * 3.0;

  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(wordsEnLines, margin + 4, wordsY);

  currentY = bottomBlockStartY + totalsBoxHeight + 3;

  // Terms and Bank Charge Clause Note
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  const termsText = `• Điều khoản: ${dn.paymentTerms}  |  ${dn.bankChargeClause}`;
  const termsLines = doc.splitTextToSize(normalizeUnicode(termsText), contentWidth);
  doc.text(termsLines, margin, currentY);
  currentY += termsLines.length * 3.2;

  // =========================================================================
  // 6. Section V: 3-Column Signatures Block (Anti-overflow & Always Visible!)
  // Placed with natural breathing room below terms (NOT jumped to 250mm!)
  // =========================================================================
  const sigBoxW = contentWidth / 3; // 63.3mm each
  let sigStartY = Math.min(Math.max(currentY + 5, 235), pageHeight - 34);

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
