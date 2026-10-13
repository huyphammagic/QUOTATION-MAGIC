import { MultiOptionQuotationPackage } from '../types/multiOptionQuote';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { formatUSD, formatNumberVND } from './formatters';

/**
 * Helper to render an array of text lines line-by-line with exact spacing.
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
 * High-Precision A4 Landscape PDF Generator for Multi-Option Quotation (Good - Better - Best)
 * Conforms to International Freight Forwarding Standards with Unicode Support
 */
export async function exportMultiOptionPdf(pkg: MultiOptionQuotationPackage): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // Standard A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  await ensureUnicodeFonts(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277mm

  // Top Accent Bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 4, 'F');

  let curY = 10;

  // Header Left: Company info
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode('CÔNG TY TNHH BOGI LOGISTICS & FORWARDING'), margin, curY);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode('Địa chỉ: Tầng 6, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, Q. Bình Thạnh, TP. Hồ Chí Minh'), margin, curY + 4);
  doc.text(normalizeUnicode(`Hotline: ${pkg.salesRepPhone || '0909 123 456'} | Email: ${pkg.salesRepEmail || 'sales@bogilogistics.vn'} | Web: bogilogistics.vn`), margin, curY + 7.5);

  // Header Right: Document Meta
  const rightX = pageWidth - margin;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text(normalizeUnicode('BẢNG SO SÁNH ĐA PHƯƠNG ÁN BÁO GIÁ'), rightX, curY, { align: 'right' });
  
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode('MULTI-OPTION COMPARATIVE QUOTATION (GOOD - BETTER - BEST)'), rightX, curY + 3.8, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(`Mã Gói: ${pkg.packageCode} | Báo Giá Gốc: ${pkg.quoteNumber}`), rightX, curY + 7.5, { align: 'right' });
  doc.text(normalizeUnicode(`Ngày Lập: ${pkg.createdDate} | Hiệu Lực Đến: ${pkg.validUntil}`), rightX, curY + 11, { align: 'right' });

  // Divider line
  curY = 23;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, curY, pageWidth - margin, curY);

  // Customer & Shipment Context Strip
  curY = 25;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, curY, contentWidth, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, curY, contentWidth, 14, 1.5, 1.5, 'S');

  // Customer column
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(`Khách Hàng (Customer): ${pkg.customer?.companyName || (pkg.customer as any)?.customerName || 'Quý Doanh Nghiệp'}`), margin + 3, curY + 4.5);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Người liên hệ: ${pkg.customer?.contactPerson || 'Bộ phận Xuất Nhập Khẩu'} - ĐT: ${pkg.customer?.phone || 'N/A'}`), margin + 3, curY + 8.5);
  doc.text(normalizeUnicode(`Mã số thuế: ${pkg.customer?.taxId || 'N/A'} - Địa chỉ: ${pkg.customer?.address || 'TP. Hồ Chí Minh'}`), margin + 3, curY + 12);

  // Shipment column
  const midX = margin + 140;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode(`Tuyến Vận Chuyển: ${pkg.shipment?.pol || 'Cảng Cát Lái (VNCLI)'} ➔ ${pkg.shipment?.pod || 'Cảng Đích (POD)'}`), midX, curY + 4.5);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(normalizeUnicode(`Phương thức: ${pkg.shipment?.mode || 'Đường biển (Sea Freight)'} | Hàng: ${pkg.cargoSummary || 'Hàng tiêu chuẩn'}`), midX, curY + 8.5);
  doc.text(normalizeUnicode(`Tỷ giá áp dụng: 1 USD = ${formatNumberVND(pkg.exchangeRate)} VND`), midX, curY + 12);

  // =========================================================================
  // 3 COMPARISON CARDS / COLUMNS
  // =========================================================================
  curY = 42;
  const colGap = 4;
  const numOptions = Math.min(pkg.options.length, 3);
  const colWidth = (contentWidth - (colGap * (numOptions - 1))) / numOptions; // ~89.6mm each
  const cardHeight = 120; // 120mm height for cards

  pkg.options.slice(0, 3).forEach((opt, idx) => {
    const colX = margin + (idx * (colWidth + colGap));
    const isRecommended = opt.isRecommended || opt.tier === 'BALANCED';

    // Background Card
    if (isRecommended) {
      // Highlighted card for Option 2
      doc.setFillColor(240, 249, 255); // Sky-50
      doc.roundedRect(colX, curY, colWidth, cardHeight, 2, 2, 'F');
      doc.setDrawColor(2, 132, 199); // Sky-600
      doc.setLineWidth(0.7);
      doc.roundedRect(colX, curY, colWidth, cardHeight, 2, 2, 'S');

      // Recommended Ribbon Header
      doc.setFillColor(2, 132, 199);
      doc.roundedRect(colX, curY, colWidth, 7, 2, 2, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(normalizeUnicode('★ KHUYÊN DÙNG (BEST VALUE / 84% KHÁCH HÀNG CHỌN)'), colX + colWidth / 2, curY + 4.8, { align: 'center' });
    } else {
      // Standard card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(colX, curY, colWidth, cardHeight, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(colX, curY, colWidth, cardHeight, 2, 2, 'S');

      // Top bar color
      if (opt.tier === 'ECONOMY') {
        doc.setFillColor(100, 116, 139); // Slate-500
      } else {
        doc.setFillColor(180, 83, 9); // Amber-700
      }
      doc.roundedRect(colX, curY, colWidth, 5, 2, 2, 'F');
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      const tierTag = opt.tier === 'ECONOMY' ? 'LỰA CHỌN TIẾT KIỆM (BUDGET SAVER)' : 'LỰA CHỌN HỎA TỐC VIP (PRIORITY EXPRESS)';
      doc.text(normalizeUnicode(tierTag), colX + colWidth / 2, curY + 3.6, { align: 'center' });
    }

    let cY = curY + (isRecommended ? 11 : 8);

    // Option Title & Tagline
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9.5);
    if (isRecommended) {
      doc.setTextColor(3, 105, 161);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(normalizeUnicode(opt.tierNameVi), colX + 3, cY);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(opt.tierNameEn), colX + 3, cY + 3.5);

    // Pricing Highlight Box
    cY += 7;
    doc.setFillColor(isRecommended ? 224 : 248, isRecommended ? 242 : 250, isRecommended ? 254 : 252);
    doc.roundedRect(colX + 2, cY, colWidth - 4, 15, 1.5, 1.5, 'F');
    doc.setDrawColor(isRecommended ? 186 : 226, isRecommended ? 230 : 232, isRecommended ? 253 : 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(colX + 2, cY, colWidth - 4, 15, 1.5, 1.5, 'S');

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(normalizeUnicode('TỔNG CHI PHÍ QUY ĐỔI (TRỌN GÓI):'), colX + 4, cY + 4);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(12);
    if (isRecommended) {
      doc.setTextColor(2, 132, 199);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(`$${formatUSD(opt.totalConvertedUsd)}`, colX + 4, cY + 9.5);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(`≈ ${formatNumberVND(opt.totalConvertedVnd)} VND`), colX + 4, cY + 13.2);

    // Mini Breakdown (Freight vs Local)
    cY += 18;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(normalizeUnicode(`• Cước chính: $${formatUSD(opt.oceanAirFreightUsd)}`), colX + 3, cY);
    doc.text(normalizeUnicode(`• Phí địa phương (Local): ${formatNumberVND(opt.localChargesVnd)} đ`), colX + 3, cY + 3.2);

    // Specifications Matrix Table
    cY += 6.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(colX + 3, cY, colX + colWidth - 3, cY);

    const specs = [
      { label: 'Hãng vận chuyển:', val: opt.carrier },
      { label: 'Dịch vụ & Tuyến:', val: opt.serviceType },
      { label: 'Thời gian Transit:', val: `${opt.transitTimeText} (${opt.transitDays} ngày)` },
      { label: 'Lịch khởi hành:', val: opt.departureSchedule },
      { label: 'Giờ cắt máng (Cut-off):', val: opt.closingCutoff },
      { label: 'Free Time Dem/Det:', val: opt.freeTimeDemDet },
      { label: 'Cam kết chỗ (Slot):', val: opt.spaceGuarantee }
    ];

    cY += 2;
    specs.forEach((s) => {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(normalizeUnicode(s.label), colX + 3, cY + 2);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      const cleanVal = normalizeUnicode(s.val);
      // Truncate if too long
      const maxLen = 32;
      const displayVal = cleanVal.length > maxLen ? cleanVal.substring(0, maxLen) + '...' : cleanVal;
      doc.text(displayVal, colX + 3, cY + 5);

      cY += 6;
    });

    // Included Value-Adds Checklist
    cY += 1;
    doc.setDrawColor(226, 232, 240);
    doc.line(colX + 3, cY, colX + colWidth - 3, cY);
    cY += 3;

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(normalizeUnicode('GIÁ TRỊ & DỊCH VỤ BAO GỒM:'), colX + 3, cY);

    cY += 3;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);

    const servicesToShow = opt.includedServices.slice(0, 3);
    servicesToShow.forEach((svc) => {
      const line = `✔ ${normalizeUnicode(svc)}`;
      const truncated = line.length > 48 ? line.substring(0, 48) + '...' : line;
      doc.text(truncated, colX + 3, cY);
      cY += 3.2;
    });

    // Best Suited For box
    cY += 1;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(colX + 2, cY, colWidth - 4, 11, 1, 1, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(51, 65, 85);
    doc.text(normalizeUnicode('PHÙ HỢP NHẤT VỚI:'), colX + 3.5, cY + 3);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    const suitText = normalizeUnicode(opt.bestSuitedFor);
    const splitSuit = doc.splitTextToSize(suitText, colWidth - 7);
    renderTextLines(doc, splitSuit.slice(0, 2), colX + 3.5, cY + 6, 2.8);
  });

  // =========================================================================
  // BOTTOM SIGNATURES & TERMS STRIP
  // =========================================================================
  const bottomY = 166;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, bottomY, pageWidth - margin, bottomY);

  // Terms and Notes (Left)
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode('ĐIỀU KHOẢN & LƯU Ý THƯƠNG MẠI:'), margin, bottomY + 4);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  const termsText = normalizeUnicode(
    `1. Báo giá áp dụng theo tỷ giá thực tế ngân hàng VCB tại ngày phát hành và có hiệu lực đến ngày ${pkg.validUntil}.\n` +
    `2. Phí Local Charges tại cảng đích và phụ phí phát sinh (nếu có) tuân theo biểu phí chính thức của hãng tàu.\n` +
    `3. Khi Quý Khách Hàng xác nhận chọn phương án nào, vui lòng phản hồi số thứ tự hoặc ký xác nhận vào ô bên phải.`
  );
  renderTextLines(doc, termsText.split('\n'), margin, bottomY + 7.5, 3.2);

  // Signature Block (Right)
  const signCol1X = pageWidth - margin - 85;
  const signCol2X = pageWidth - margin - 35;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(normalizeUnicode('ĐẠI DIỆN BOGI LOGISTICS'), signCol1X, bottomY + 4, { align: 'center' });
  doc.text(normalizeUnicode('XÁC NHẬN CHỌN PHƯƠNG ÁN'), signCol2X, bottomY + 4, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(normalizeUnicode('(Ký, ghi rõ họ tên & đóng dấu)'), signCol1X, bottomY + 7, { align: 'center' });
  doc.text(normalizeUnicode('(Ký tên hoặc ghi số Phương Án đã chọn)'), signCol2X, bottomY + 7, { align: 'center' });

  // Signature lines
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(normalizeUnicode(pkg.salesRepName || 'BOGI Logistics Sales Specialist'), signCol1X, bottomY + 28, { align: 'center' });
  doc.text(normalizeUnicode('ĐẠI DIỆN KHÁCH HÀNG / CUSTOMER'), signCol2X, bottomY + 28, { align: 'center' });

  // Save the PDF
  const filename = `${pkg.packageCode}_Multi_Option_Comparative_Quotation.pdf`;
  doc.save(filename);
}
