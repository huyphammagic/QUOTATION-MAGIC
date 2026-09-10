import { 
  QuotationDocumentSnapshot, 
  QuotationTemplate, 
} from '../../types/quotationDocument';
import { DEFAULT_QUOTATION_TEMPLATES } from '../../data/defaultTemplates';
import { 
  formatUSD, 
  formatNumberVND, 
  formatNumber, 
  formatExchangeRate 
} from '../../utils/formatters';
import { ensureUnicodeFonts, normalizeUnicode } from '../pdf/pdfFontLoader';

export interface GeneratedPdfResult {
  doc: any;
  blob: Blob;
  fileName: string;
  pageCount: number;
  download: () => void;
}

// Convert Hex color (e.g. #164e63) to RGB [r, g, b]
function hexToRgb(hex: string, fallback: [number, number, number] = [22, 78, 99]): [number, number, number] {
  if (!hex || typeof hex !== 'string') return fallback;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return [
      parseInt(cleanHex[0] + cleanHex[0], 16),
      parseInt(cleanHex[1] + cleanHex[1], 16),
      parseInt(cleanHex[2] + cleanHex[2], 16),
    ];
  }
  if (cleanHex.length === 6) {
    return [
      parseInt(cleanHex.substring(0, 2), 16),
      parseInt(cleanHex.substring(2, 4), 16),
      parseInt(cleanHex.substring(4, 6), 16),
    ];
  }
  return fallback;
}

/**
 * Enterprise PDF Quotation Generation Engine
 * Renders approved snapshots into high-precision corporate PDF documents
 * with 100% full Vietnamese Unicode diacritics support.
 */
export async function generateQuotationPdf(
  snapshot: QuotationDocumentSnapshot,
  template: QuotationTemplate
): Promise<GeneratedPdfResult> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const isVnd = snapshot.currency === 'VND';
  const isInternal = snapshot.documentType === 'INTERNAL_QUOTATION';
  const isConfirmation = snapshot.documentType === 'CONFIRMATION_NOTICE';
  const language = snapshot.language;

  // Initialize jsPDF document (A4, portrait, millimeters)
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  // Embed and activate Unicode TrueType font (Roboto)
  await ensureUnicodeFonts(doc);

  const primaryRgb = hexToRgb(template.styles.primaryColor, [22, 78, 99]);
  const secondaryRgb = hexToRgb(template.styles.secondaryColor, [71, 85, 105]);
  const lightBgRgb = hexToRgb(template.styles.lightBgColor, [248, 250, 252]);

  // Use 'Roboto' as default Unicode font
  const fontFamily = template.styles.fontFamily === 'helvetica' || !template.styles.fontFamily ? 'Roboto' : template.styles.fontFamily;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // 2. Company Header (Full Vietnamese diacritics)
  const company = snapshot.company;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(normalizeUnicode(company.name || 'LOGISTICS & FREIGHT FORWARDING'), 14, 16);

  let currentHeaderY = 20.5;
  if (template.sections.header.showEnglishName && company.englishName) {
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(company.englishName), 14, currentHeaderY);
    currentHeaderY += 4.2;
  }

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);

  if (company.address) {
    doc.text(`Địa chỉ / Address: ${normalizeUnicode(company.address)}`, 14, currentHeaderY, { maxWidth: 182 });
    currentHeaderY += 4.2;
  }

  if (template.sections.header.showContact) {
    const contactParts = [
      (template.sections.header.showTaxId && company.taxId) ? `MST / Tax ID: ${company.taxId}` : '',
      company.phone ? `Hotline / Tel: ${company.phone}` : '',
      company.email ? `Email: ${company.email}` : '',
    ].filter(Boolean).join(' | ');

    if (contactParts) {
      doc.text(contactParts, 14, currentHeaderY);
      currentHeaderY += 4.2;
    }
  }

  if (company.website) {
    doc.text(`Website: ${company.website}`, 14, currentHeaderY);
    currentHeaderY += 4.2;
  }

  // Header Divider
  currentHeaderY += 1;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, currentHeaderY, 196, currentHeaderY);

  // 3. Document Title & Metadata
  const titleY = currentHeaderY + 7;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);

  let docTitle = template.sections.header.titleEn || 'FREIGHT QUOTATION';
  if (language === 'vi') {
    docTitle = template.sections.header.titleVi || 'BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS';
  } else if (language === 'bilingual') {
    docTitle = `${template.sections.header.titleVi} / ${template.sections.header.titleEn}`;
  }
  if (isInternal) {
    docTitle += ' (NỘI BỘ - INTERNAL CONFIDENTIAL)';
  } else if (isConfirmation) {
    docTitle = 'XÁC NHẬN ĐẶT CHỖ / BOOKING CONFIRMATION & RATE NOTICE';
  }

  doc.text(normalizeUnicode(docTitle), 14, titleY);

  // Quote Metadata Line
  doc.setFontSize(8);
  doc.setFont(fontFamily, 'normal');
  doc.setTextColor(100, 116, 139);
  const revStr = snapshot.revision > 0 ? `Rev ${String(snapshot.revision).padStart(2, '0')}` : 'Rev 01';
  doc.text(`Mã báo giá / Quote Ref: ${snapshot.quoteNumber} (${revStr})`, 14, titleY + 5.5);
  doc.text(`Ngày / Date: ${snapshot.createdDate}`, 82, titleY + 5.5);
  doc.text(`Hiệu lực / Valid: ${snapshot.terms.validityDate || '15 ngày'}`, 128, titleY + 5.5);

  doc.setFont(fontFamily, 'bold');
  doc.setTextColor(isVnd ? 16 : primaryRgb[0], isVnd ? 117 : primaryRgb[1], isVnd ? 76 : primaryRgb[2]);
  doc.text(`Đồng tiền / Curr: ${snapshot.currency}`, 174, titleY + 5.5);

  // 4. Two-column Customer & Shipment Summary Boxes
  const boxY = titleY + 9;
  const boxHeight = 36;

  // Left Box: Customer Info
  doc.setFillColor(lightBgRgb[0], lightBgRgb[1], lightBgRgb[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, 88, boxHeight, 2, 2, 'FD');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(language === 'en' ? 'CUSTOMER INFORMATION' : 'THÔNG TIN KHÁCH HÀNG / CUSTOMER', 18, boxY + 6);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Công ty: ${normalizeUnicode(snapshot.customer.companyName || snapshot.customer.customerName || 'N/A')}`, 18, boxY + 11.5, { maxWidth: 80 });

  if (template.sections.customer.showContactPerson) {
    doc.text(`Người liên hệ: ${normalizeUnicode(snapshot.customer.contactPerson || snapshot.customer.customerName || 'N/A')}`, 18, boxY + 18);
  }
  if (template.sections.customer.showTaxId) {
    doc.text(`Mã số thuế: ${snapshot.customer.taxId || 'N/A'}`, 18, boxY + 23);
  }
  if (template.sections.customer.showPhoneEmail) {
    doc.text(`Điện thoại: ${snapshot.customer.phone || 'N/A'} | Email: ${snapshot.customer.email || 'N/A'}`, 18, boxY + 28, { maxWidth: 80 });
  }
  if (template.sections.customer.showAddress && snapshot.customer.address) {
    doc.text(`Địa chỉ: ${normalizeUnicode(snapshot.customer.address)}`, 18, boxY + 33, { maxWidth: 80 });
  }

  // Right Box: Shipment Details
  doc.setFillColor(lightBgRgb[0], lightBgRgb[1], lightBgRgb[2]);
  doc.roundedRect(108, boxY, 88, boxHeight, 2, 2, 'FD');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(language === 'en' ? 'SHIPMENT ROUTING & DETAILS' : 'THÔNG TIN LÔ HÀNG / SHIPMENT DETAILS', 112, boxY + 6);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Phương thức: ${snapshot.shipment.mode} (${snapshot.shipment.containerType || 'Standard'})`, 112, boxY + 11.5);
  doc.text(`Cảng đi (POL): ${normalizeUnicode(snapshot.shipment.pol || 'N/A')}`, 112, boxY + 16.5, { maxWidth: 80 });
  doc.text(`Cảng đến (POD): ${normalizeUnicode(snapshot.shipment.pod || 'N/A')}`, 112, boxY + 21.5, { maxWidth: 80 });
  doc.text(`Tên hàng: ${normalizeUnicode(snapshot.shipment.commodity || 'General Cargo')}`, 112, boxY + 26.5, { maxWidth: 80 });

  const qtyDetails = [
    `${snapshot.shipment.quantity} cont`,
    template.sections.shipment.showGrossWeight ? `${formatNumber(snapshot.shipment.grossWeightKg)} KGS` : '',
    template.sections.shipment.showVolumeCbm ? `${formatNumber(snapshot.shipment.volumeCbm)} CBM` : '',
  ].filter(Boolean).join(' | ');

  doc.text(`Quy cách: ${qtyDetails}`, 112, boxY + 31.5);

  // 5. Line Items Table Rendering with Full Vietnamese Diacritics
  const groupBy = template.sections.charges.groupBy || 'LOCATION';
  const tableBody: any[] = [];
  let itemCounter = 1;

  if (isInternal) {
    // Internal Costing View
    snapshot.items.forEach((item) => {
      const unitCostFormatted = item.currency === 'USD' 
        ? formatUSD(item.costPrice || 0) 
        : `${formatNumberVND(item.costPrice || 0)} VND`;

      const unitSellFormatted = item.currency === 'USD'
        ? formatUSD(item.unitPrice)
        : `${formatNumberVND(item.unitPrice)} VND`;

      const totalCostFormatted = isVnd
        ? `${formatNumberVND(item.costTotalVnd || 0)} VND`
        : formatUSD(item.costTotalUsd || 0);

      const totalSellFormatted = isVnd
        ? `${formatNumberVND(item.amountVnd)} VND`
        : formatUSD(item.amountUsd);

      const profitFormatted = isVnd
        ? `${formatNumberVND(item.profitVnd || 0)} VND`
        : formatUSD(item.profitUsd || 0);

      const descriptionText = item.note 
        ? `${normalizeUnicode(item.description)}\n(${normalizeUnicode(item.note)})`
        : normalizeUnicode(item.description);

      tableBody.push([
        itemCounter++,
        descriptionText,
        item.quantity,
        normalizeUnicode(item.unit),
        unitCostFormatted,
        unitSellFormatted,
        totalCostFormatted,
        totalSellFormatted,
        profitFormatted,
        `${(item.marginPercent || 0).toFixed(1)}%`,
      ]);
    });

    autoTable(doc, {
      startY: boxY + boxHeight + 5,
      head: [['STT', 'Hạng Mục Chi Phí', 'SL', 'ĐVT', 'Giá Vốn', 'Giá Bán', 'Tổng Vốn', 'Doanh Thu', 'Lợi Nhuận', 'Margin']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: fontFamily,
        fontStyle: 'normal',
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        font: fontFamily,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        font: fontFamily,
        fontStyle: 'normal',
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 10 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'center', cellWidth: 14 },
      },
      margin: { left: 14, right: 14 },
    });

  } else {
    // Customer-Facing Official Quotation Table
    if (groupBy === 'LOCATION') {
      const locations = ['POL', 'FREIGHT', 'POD', 'OTHER'] as const;
      const locTitleMap = {
        POL: `1. CHI PHÍ ĐẦU XUẤT / CẢNG ĐI (${normalizeUnicode(snapshot.shipment.pol || 'POL')})`,
        FREIGHT: `2. CƯỚC VẬN CHUYỂN CHẶNG CHÍNH (${normalizeUnicode(snapshot.shipment.mode)})`,
        POD: `3. CHI PHÍ ĐẦU NHẬP / CẢNG ĐÍCH (${normalizeUnicode(snapshot.shipment.pod || 'POD')})`,
        OTHER: '4. DỊCH VỤ CỘNG THÊM & THỦ TỤC KHÁC'
      };

      locations.forEach((locKey) => {
        const locItems = snapshot.items.filter(item => (item.location || 'POL') === locKey);
        if (locItems.length === 0) return;

        const locSubtotalUsd = locItems.reduce((acc, i) => acc + i.amountUsd, 0);
        const locSubtotalVnd = locItems.reduce((acc, i) => acc + i.amountVnd, 0);
        const groupSubtotalText = isVnd
          ? `${formatNumberVND(locSubtotalVnd)} VND`
          : formatUSD(locSubtotalUsd);

        // Sub-Header Row
        tableBody.push([
          {
            content: `${locTitleMap[locKey]} — Tổng nhóm: ${groupSubtotalText}`,
            colSpan: 8,
            styles: {
              fillColor: lightBgRgb,
              textColor: primaryRgb,
              font: fontFamily,
              fontStyle: 'bold',
              fontSize: 8,
            }
          }
        ]);

        locItems.forEach((item) => {
          const unitPriceFormatted = item.currency === 'USD' 
            ? formatUSD(item.unitPrice) 
            : formatNumberVND(item.unitPrice);

          const amountFormatted = isVnd
            ? formatNumberVND(item.amountVnd)
            : formatUSD(item.amountUsd);

          const descriptionText = item.note 
            ? `${normalizeUnicode(item.description)}\n(${normalizeUnicode(item.note)})`
            : normalizeUnicode(item.description);

          tableBody.push([
            itemCounter++,
            descriptionText,
            item.quantity,
            normalizeUnicode(item.unit),
            unitPriceFormatted,
            item.currency,
            `${item.vatRate}%`,
            amountFormatted
          ]);
        });
      });

    } else {
      // Flat or Category Table
      snapshot.items.forEach((item) => {
        const unitPriceFormatted = item.currency === 'USD' 
          ? formatUSD(item.unitPrice) 
          : formatNumberVND(item.unitPrice);

        const amountFormatted = isVnd
          ? formatNumberVND(item.amountVnd)
          : formatUSD(item.amountUsd);

        const descriptionText = item.note 
          ? `${normalizeUnicode(item.description)}\n(${normalizeUnicode(item.note)})`
          : normalizeUnicode(item.description);

        tableBody.push([
          itemCounter++,
          descriptionText,
          item.quantity,
          normalizeUnicode(item.unit),
          unitPriceFormatted,
          item.currency,
          `${item.vatRate}%`,
          amountFormatted
        ]);
      });
    }

    const amountColHeader = isVnd ? 'Thành tiền (VND)' : 'Thành tiền (USD)';

    autoTable(doc, {
      startY: boxY + boxHeight + 5,
      head: [['STT', 'Hạng Mục Chi Phí / Description', 'SL', 'ĐVT', 'Đơn Giá', 'Loại Tiền', 'VAT', amountColHeader]],
      body: tableBody,
      theme: template.styles.tableTheme || 'grid',
      styles: {
        font: fontFamily,
        fontStyle: 'normal',
        cellPadding: 2,
      },
      headStyles: {
        fillColor: primaryRgb,
        textColor: [255, 255, 255],
        fontSize: 8,
        font: fontFamily,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        font: fontFamily,
        fontStyle: 'normal',
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 12 },
        3: { halign: 'center', cellWidth: isVnd ? 16 : 18 },
        4: { halign: 'right', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'right', cellWidth: isVnd ? 30 : 26 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Get final Y position of table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Check if we need to add a new page for Totals + Terms + Signatures
  let blockStartY = finalY;
  if (blockStartY > 215) {
    doc.addPage();
    blockStartY = 16;
  }

  // 6. Totals Box
  doc.setFillColor(lightBgRgb[0], lightBgRgb[1], lightBgRgb[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(106, blockStartY, 90, 26, 2, 2, 'FD');

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);

  doc.text(`Cộng tiền hàng / Subtotal:`, 110, blockStartY + 6);
  doc.text(
    isVnd ? `${formatNumberVND(snapshot.subtotalVnd)} VND` : formatUSD(snapshot.subtotalUsd),
    192,
    blockStartY + 6,
    { align: 'right' }
  );

  doc.text(`Thuế GTGT / VAT:`, 110, blockStartY + 12);
  doc.text(
    isVnd ? `${formatNumberVND(snapshot.vatTotalVnd)} VND` : formatUSD(snapshot.vatTotalUsd),
    192,
    blockStartY + 12,
    { align: 'right' }
  );

  doc.setDrawColor(203, 213, 225);
  doc.line(110, blockStartY + 16, 192, blockStartY + 16);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`TỔNG CỘNG / GRAND TOTAL (${snapshot.currency}):`, 110, blockStartY + 22);
  doc.text(
    isVnd ? `${formatNumberVND(snapshot.grandTotalVnd)} VND` : formatUSD(snapshot.grandTotalUsd),
    192,
    blockStartY + 22,
    { align: 'right' }
  );

  // Left Note: Exchange Rate & Equivalent Conversion
  doc.setFont(fontFamily, 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Tỷ giá quy đổi (Ex.Rate): 1 USD = ${formatExchangeRate(snapshot.exchangeRate)} VND`, 14, blockStartY + 6);
  if (isVnd) {
    doc.text(`* Quy đổi tương đương USD: ~ ${formatUSD(snapshot.grandTotalUsd)}`, 14, blockStartY + 11);
  } else if (snapshot.grandTotalVnd) {
    doc.text(`* Tổng thanh toán quy đổi: ~ ${formatNumberVND(snapshot.grandTotalVnd)} VND`, 14, blockStartY + 11);
  }

  // If internal quotation, display summary profit
  if (isInternal && snapshot.totalProfitUsd !== undefined) {
    doc.setFont(fontFamily, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`[NỘI BỘ] Lợi nhuận gộp: ${isVnd ? `${formatNumberVND(snapshot.totalProfitVnd || 0)} VND` : formatUSD(snapshot.totalProfitUsd)} (Margin: ${(snapshot.overallMarginPercent || 0).toFixed(1)}%)`, 14, blockStartY + 18);
  }

  // 7. Terms & Conditions Block
  let termsY = blockStartY + 31;
  if (termsY > 225) {
    doc.addPage();
    termsY = 16;
  }

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text('ĐIỀU KHOẢN VÀ QUY ĐỊNH BÁO GIÁ / TERMS & CONDITIONS', 14, termsY);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Incoterm: ${snapshot.terms.incoterm}`, 14, termsY + 4.5);
  doc.text(`Điều khoản thanh toán: ${normalizeUnicode(snapshot.terms.paymentTerm)}`, 14, termsY + 8.5, { maxWidth: 180 });

  const splitNotes = doc.splitTextToSize(`Ghi chú & Miễn trừ trách nhiệm: ${normalizeUnicode(snapshot.terms.exclusionsNotes)}`, 180);
  doc.text(splitNotes, 14, termsY + 13);

  let nextY = termsY + 13 + splitNotes.length * 3.5;

  // Bank Info
  if (template.sections.terms.showBankInfo && snapshot.terms.bankAccountInfo) {
    doc.setFont(fontFamily, 'bold');
    doc.text('THÔNG TIN CHUYỂN KHOẢN / BANK INFORMATION:', 14, nextY);
    doc.setFont(fontFamily, 'normal');
    const splitBank = doc.splitTextToSize(normalizeUnicode(snapshot.terms.bankAccountInfo), 180);
    doc.text(splitBank, 14, nextY + 4);
    nextY += 4 + splitBank.length * 3.5;
  }

  // 8. Dual Signature Block
  let signY = nextY + 4;
  if (signY > 245) {
    doc.addPage();
    signY = 18;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, signY, 196, signY);
  signY += 5;

  if (template.sections.signature.showCustomerSignature) {
    // Left Sign: Customer Acceptance
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('XÁC NHẬN KHÁCH HÀNG / CUSTOMER ACCEPTANCE', 14, signY);
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Ký tên & đóng dấu / Sign & Stamp)', 14, signY + 4);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(normalizeUnicode(snapshot.customer.contactPerson || snapshot.customer.customerName || 'Đại diện được ủy quyền'), 14, signY + 20);
  }

  if (template.sections.signature.showCompanySignature) {
    // Right Sign: Logistics Company & Sales Rep
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.text('ĐẠI DIỆN ĐƠN VỊ BÁO GIÁ / FOR AND ON BEHALF OF', 114, signY);
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(normalizeUnicode(company.shortName || company.name || 'LOGISTICS COMPANY'), 114, signY + 4);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(normalizeUnicode(company.salesRepName || 'ĐẠI DIỆN KINH DOANH'), 114, signY + 18);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const repContact = [
      company.salesRepTitle ? normalizeUnicode(company.salesRepTitle) : '',
      company.salesRepPhone ? `Tel: ${company.salesRepPhone}` : ''
    ].filter(Boolean).join(' | ');
    if (repContact) {
      doc.text(repContact, 114, signY + 22);
    }
  }

  // 9. Running Footers on ALL Pages (Trang X / Y)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(148, 163, 184);

    // Left: Custom footer or template note
    const footerLeftText = template.sections.footer.customFooterText || 
      `Hệ thống Báo giá LogiQuote - Số: ${snapshot.quoteNumber} (Bản ${snapshot.revision}) - Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`;
    doc.text(normalizeUnicode(footerLeftText), 14, 290, { maxWidth: 140 });

    // Right: Page number
    if (template.sections.footer.showPageNumbers) {
      doc.text(`Trang / Page ${i} / ${totalPages}`, 196, 290, { align: 'right' });
    }
  }

  // Build File Name
  const cleanQuoteNum = snapshot.quoteNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const typeTag = isInternal ? 'INTERNAL' : (isConfirmation ? 'CONFIRM' : 'QUOTE');
  const fileName = `${cleanQuoteNum}_Rev${snapshot.revision}_${typeTag}_${snapshot.currency}.pdf`;

  // Output as Blob
  const blob = doc.output('blob');

  return {
    doc,
    blob,
    fileName,
    pageCount: totalPages,
    download: () => {
      doc.save(fileName);
    },
  };
}

/**
 * Downloads or renders and downloads a PDF for a given document record or snapshot
 */
export async function exportQuotationDocumentToPdf(docRecord: { 
  snapshot?: QuotationDocumentSnapshot; 
  downloadUrl?: string; 
  fileName?: string;
}): Promise<void> {
  if (docRecord.downloadUrl) {
    const link = document.createElement('a');
    link.href = docRecord.downloadUrl;
    link.download = docRecord.fileName || 'Customer_Quotation.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  if (docRecord.snapshot) {
    const result = await generateQuotationPdf(docRecord.snapshot, DEFAULT_QUOTATION_TEMPLATES[0]);
    result.download();
  }
}
