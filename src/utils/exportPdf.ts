import { QuoteData, QuoteCurrency } from '../types/logistics';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { buildQuotationDocumentModel, DocumentLanguage, DocumentChargeRow } from '../services/pdf/quotationDocumentModel';

/**
 * Layout configuration dynamically computed for quotation tables.
 */
export interface DynamicTableLayout {
  columnWidths: {
    stt: number;
    description: number;
    unit: number;
    quantity: number;
    unitPrice: number;
    amountBeforeVat: number;
    vatRate: number;
    vatAmount: number;
    total: number;
  };
  fontSize: number;
  cellPadding: { top: number; right: number; bottom: number; left: number };
  headFontSize: number;
}

/**
 * Dynamically calculates optimal column widths and typography sizing based on content length.
 * When logistics descriptions are long, other columns tighten to safe bounds, expanding description width
 * up to 68mm while strictly preserving the total available printable width (182mm) with zero layout shifting.
 */
export function calculateDynamicColumnWidths(
  rows: DocumentChargeRow[],
  isVnd: boolean,
  totalAvailableWidth = 182
): DynamicTableLayout {
  if (!rows || rows.length === 0) {
    return {
      columnWidths: {
        stt: 8,
        description: 52,
        unit: 14,
        quantity: 9,
        unitPrice: 21,
        amountBeforeVat: 22,
        vatRate: 12,
        vatAmount: 18,
        total: 26,
      },
      fontSize: 7.0,
      cellPadding: { top: 1.8, right: 1.5, bottom: 1.8, left: 1.5 },
      headFontSize: 7.2,
    };
  }

  // 1. Inspect character metrics across all rows
  let maxDescLength = 0;
  let maxUnitLength = 0;
  let maxQtyLength = 0;
  let maxUnitPriceLen = 0;
  let maxBeforeVatLen = 0;
  let maxVatRateLen = 0;
  let maxVatAmountLen = 0;
  let maxTotalLen = 0;

  rows.forEach((r) => {
    const descTotal = (r.description || '').length + (r.note ? (r.note.length + 4) : 0);
    if (descTotal > maxDescLength) maxDescLength = descTotal;

    const unitLen = (r.unit || '').length;
    if (unitLen > maxUnitLength) maxUnitLength = unitLen;

    const qtyLen = String(r.quantity || '').length;
    if (qtyLen > maxQtyLength) maxQtyLength = qtyLen;

    const upLen = (r.unitPriceFormatted || '').length;
    if (upLen > maxUnitPriceLen) maxUnitPriceLen = upLen;

    const bvLen = (r.amountBeforeVatFormatted || '').length;
    if (bvLen > maxBeforeVatLen) maxBeforeVatLen = bvLen;

    const vrLen = (r.vatRateFormatted || '').length;
    if (vrLen > maxVatRateLen) maxVatRateLen = vrLen;

    const vaLen = (r.vatAmountFormatted || '').length;
    if (vaLen > maxVatAmountLen) maxVatAmountLen = vaLen;

    const totLen = (r.totalWithVatFormatted || '').length;
    if (totLen > maxTotalLen) maxTotalLen = totLen;
  });

  // 2. Base width determinations based on content length
  const isHighDensityDescription = maxDescLength >= 55;
  const isUltraLongDescription = maxDescLength >= 100;

  // STT column: 8mm (or 7.5mm if high density)
  const sttWidth = isHighDensityDescription ? 7.5 : 8.0;

  // Quantity column: 8.5mm - 10mm
  const qtyWidth = maxQtyLength > 4 ? 10.0 : (isHighDensityDescription ? 8.5 : 9.0);

  // Unit column: adapt to unit length, e.g. "Cont", "Tấn", "Bộ B/L" vs "Container 40'HC"
  let unitWidth = 13.0;
  if (maxUnitLength > 9) {
    unitWidth = 15.5;
  } else if (maxUnitLength > 5) {
    unitWidth = 13.5;
  } else if (isHighDensityDescription) {
    unitWidth = 11.5;
  }

  // VAT Rate: e.g. "8%", "10%" vs "5.26%"
  const vatRateWidth = maxVatRateLen > 3 ? 11.5 : (isHighDensityDescription ? 9.5 : 10.5);

  // Numeric columns (Đơn giá, Chưa VAT, Tiền VAT, Tổng)
  // Dynamic sizing based on currency (VND vs USD) and max digit lengths
  let unitPriceWidth = isVnd ? 20.0 : 17.0;
  let beforeVatWidth = isVnd ? 21.0 : 18.0;
  let vatAmountWidth = isVnd ? 17.0 : 14.5;
  let totalWidth = isVnd ? 25.0 : 21.0;

  if (isVnd) {
    if (maxUnitPriceLen >= 12) unitPriceWidth = 22.0;
    else if (isHighDensityDescription && maxUnitPriceLen <= 9) unitPriceWidth = 18.0;

    if (maxBeforeVatLen >= 12) beforeVatWidth = 22.5;
    else if (isHighDensityDescription && maxBeforeVatLen <= 10) beforeVatWidth = 19.0;

    if (maxVatAmountLen >= 11) vatAmountWidth = 18.0;
    else if (isHighDensityDescription && maxVatAmountLen <= 8) vatAmountWidth = 15.0;

    if (maxTotalLen >= 13) totalWidth = 26.0;
    else if (isHighDensityDescription && maxTotalLen <= 11) totalWidth = 23.0;
  } else {
    // USD
    if (maxUnitPriceLen >= 9) unitPriceWidth = 18.0;
    else if (isHighDensityDescription) unitPriceWidth = 15.0;

    if (maxBeforeVatLen >= 9) beforeVatWidth = 18.5;
    else if (isHighDensityDescription) beforeVatWidth = 16.0;

    if (maxVatAmountLen >= 8) vatAmountWidth = 15.0;
    else if (isHighDensityDescription) vatAmountWidth = 13.0;

    if (maxTotalLen >= 10) totalWidth = 21.5;
    else if (isHighDensityDescription) totalWidth = 19.0;
  }

  // Calculate sum of other columns
  const otherColsSum = sttWidth + unitWidth + qtyWidth + unitPriceWidth + beforeVatWidth + vatRateWidth + vatAmountWidth + totalWidth;

  // Remaining width dynamically allocated to Description
  let descriptionWidth = totalAvailableWidth - otherColsSum;

  // Round description width to 1 decimal place and adjust total to maintain exact invariant
  descriptionWidth = Math.round(descriptionWidth * 10) / 10;
  const currentTotal = sttWidth + descriptionWidth + unitWidth + qtyWidth + unitPriceWidth + beforeVatWidth + vatRateWidth + vatAmountWidth + totalWidth;
  const diff = Math.round((totalAvailableWidth - currentTotal) * 10) / 10;
  descriptionWidth = Math.round((descriptionWidth + diff) * 10) / 10;

  // Typography scaling for table stability with long descriptions
  let fontSize = 7.0;
  let cellPadding = { top: 1.8, right: 1.5, bottom: 1.8, left: 1.5 };
  let headFontSize = 7.2;

  if (isUltraLongDescription) {
    fontSize = 6.6;
    headFontSize = 6.8;
    cellPadding = { top: 1.3, right: 1.2, bottom: 1.3, left: 1.2 };
  } else if (isHighDensityDescription) {
    fontSize = 6.8;
    headFontSize = 7.0;
    cellPadding = { top: 1.5, right: 1.4, bottom: 1.5, left: 1.4 };
  }

  return {
    columnWidths: {
      stt: sttWidth,
      description: descriptionWidth,
      unit: unitWidth,
      quantity: qtyWidth,
      unitPrice: unitPriceWidth,
      amountBeforeVat: beforeVatWidth,
      vatRate: vatRateWidth,
      vatAmount: vatAmountWidth,
      total: totalWidth,
    },
    fontSize,
    cellPadding,
    headFontSize,
  };
}

/**
 * Legacy utility for backwards compatibility.
 * @deprecated Use native Unicode Roboto rendering instead of stripping Vietnamese diacritics.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str.toString();
  result = result.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");
  result = result.replace(/₫/g, " VND").replace(/đ/g, "d").replace(/Đ/g, "D");
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  result = result.replace(/[^\x20-\x7E\n]/g, "");
  return result;
}

/**
 * Exports quotation directly to a high-precision, Unicode-compliant PDF.
 * Preserves 100% of Vietnamese diacritics, embeds TrueType fonts,
 * and maintains searchability and selectability.
 */
export async function exportQuoteToPdf(
  quote: QuoteData, 
  targetCurrency?: 'USD' | 'VND',
  language: DocumentLanguage = 'bilingual'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const model = buildQuotationDocumentModel(quote, targetCurrency, language);
  const isVnd = model.meta.isVnd;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  // 1. Embed and register Roboto Unicode fonts
  await ensureUnicodeFonts(doc);

  const primaryColor = isVnd ? [6, 95, 70] : [22, 78, 99]; // Emerald for VND, Cyan for USD
  const secondaryColor = [71, 85, 105]; // Slate
  const lightBg = [241, 245, 249];

  // 2. Top Decorative Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // 3. Company Header (100% Vietnamese diacritics preserved)
  const companyName = model.company.name || 'LOGISTICS & FREIGHT FORWARDING';
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(companyName, 14, 16);

  let currentHeaderY = 21;
  if (model.company.englishName) {
    doc.setFont('Roboto', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(model.company.englishName, 14, currentHeaderY);
    currentHeaderY += 4.5;
  }

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (model.company.address) {
    doc.text(`Địa chỉ / Address: ${model.company.address}`, 14, currentHeaderY, { maxWidth: 182 });
    currentHeaderY += 4.5;
  }

  const contactParts = [
    model.company.taxId ? `MST / Tax ID: ${model.company.taxId}` : '',
    model.company.phone ? `Hotline / Tel: ${model.company.phone}` : '',
    model.company.email ? `Email: ${model.company.email}` : '',
  ].filter(Boolean).join(' | ');

  if (contactParts) {
    doc.text(contactParts, 14, currentHeaderY, { maxWidth: 182 });
    currentHeaderY += 4.5;
  }

  if (model.company.website) {
    doc.text(`Website: ${model.company.website}`, 14, currentHeaderY, { maxWidth: 182 });
    currentHeaderY += 4.5;
  }

  currentHeaderY += 1;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, currentHeaderY, 196, currentHeaderY);

  // 4. Title & Quote Metadata
  const titleY = currentHeaderY + 7;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(model.meta.documentTitle, 14, titleY, { maxWidth: 182 });

  doc.setFontSize(8.5);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Mã báo giá / Quote Ref: ${model.meta.quoteNumber}`, 14, titleY + 5.5);
  doc.text(`Ngày / Date: ${model.meta.createdDate}`, 78, titleY + 5.5);
  doc.text(`Hiệu lực: ${model.meta.validityDate || '15 ngày'}`, 122, titleY + 5.5, { maxWidth: 36 });

  doc.setFont('Roboto', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Đồng tiền / Currency: ${model.meta.currency}`, 196, titleY + 5.5, { align: 'right' });

  // 5. Customer & Shipment Boxes (Two-column layout strictly within 14mm - 196mm)
  const y = titleY + 9;
  const boxWidth = 89;
  const rightBoxX = 107;

  // Customer Box (Left: 14 to 103mm)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, boxWidth, 38, 2, 2, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(language === 'en' ? 'CUSTOMER INFORMATION' : 'THÔNG TIN KHÁCH HÀNG / CUSTOMER', 18, y + 6);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Công ty: ${model.customer.companyName || 'Khách hàng vãng lai'}`, 18, y + 12, { maxWidth: 81 });
  doc.text(`Người liên hệ: ${model.customer.contactPerson || model.customer.name || 'N/A'}`, 18, y + 20, { maxWidth: 81 });
  doc.text(`Mã số thuế: ${model.customer.taxId || 'N/A'}`, 18, y + 25, { maxWidth: 81 });
  doc.text(`Điện thoại: ${model.customer.phone || 'N/A'} | Email: ${model.customer.email || 'N/A'}`, 18, y + 30, { maxWidth: 81 });

  // Shipment Details Box (Right: 107 to 196mm)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(rightBoxX, y, boxWidth, 38, 2, 2, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(language === 'en' ? 'SHIPMENT DETAILS' : 'THÔNG TIN LÔ HÀNG / SHIPMENT', rightBoxX + 4, y + 6);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Phương thức: ${model.shipment.mode} (${model.shipment.containerType || 'Standard'})`, rightBoxX + 4, y + 12, { maxWidth: 81 });
  doc.text(`Cảng đi (POL): ${model.shipment.pol || 'N/A'}`, rightBoxX + 4, y + 17, { maxWidth: 81 });
  doc.text(`Cảng đến (POD): ${model.shipment.pod || 'N/A'}`, rightBoxX + 4, y + 22, { maxWidth: 81 });
  doc.text(`Hàng hóa: ${model.shipment.commodity || 'General Cargo'}`, rightBoxX + 4, y + 27, { maxWidth: 81 });
  doc.text(`Quy cách: ${model.shipment.quantitySummary}`, rightBoxX + 4, y + 32, { maxWidth: 81 });

  // 6. Section III Title & Exchange Rate Info (Above table)
  const sectionTitleY = y + 42;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('III. BẢNG PHÂN RÃ CHI TIẾT CƯỚC, LOCAL CHARGES & THUẾ VAT TỪNG PHÍ', 14, sectionTitleY);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text(model.meta.exchangeRateText, 196, sectionTitleY, { align: 'right' });

  // Safe wrapping helper to ensure unbroken strings wrap properly
  const formatSafeWrappingText = (text: string, maxChunkLen = 30): string => {
    if (!text) return '';
    return text
      .split('\n')
      .map(line => {
        const words = line.split(' ');
        return words
          .map(w => {
            if (w.length > maxChunkLen) {
              const chunks: string[] = [];
              for (let i = 0; i < w.length; i += maxChunkLen) {
                chunks.push(w.slice(i, i + maxChunkLen));
              }
              return chunks.join(' ');
            }
            return w;
          })
          .join(' ');
      })
      .join('\n');
  };

  // 7. Calculate Dynamic Layout (expands description width for long text, contracts safe columns)
  const layout = calculateDynamicColumnWidths(model.charges.allRows, isVnd, 182);

  // 8. Line Items Table with 9 Columns & Guaranteed Multi-Line Wrapping (Zero Overlap)
  const tableBody: any[] = [];

  const groupConfig: Record<string, { bannerTitle: string; subtotalLabel: string; bg: [number, number, number]; text: [number, number, number] }> = {
    FREIGHT: {
      bannerTitle: `1. CƯỚC VẬN CHUYỂN CHẶNG CHÍNH (MAIN FREIGHT - ${model.shipment.mode})`,
      subtotalLabel: 'Tiểu kế Cước Vận Chuyển:',
      bg: [239, 246, 255],
      text: [29, 78, 216],
    },
    POL: {
      bannerTitle: `2. LOCAL CHARGE ĐẦU XUẤT (ORIGIN / POL CHARGES - ${model.shipment.pol || 'POL'})`,
      subtotalLabel: 'Tiểu kế Local Charge Đầu Xuất:',
      bg: [240, 253, 250],
      text: [13, 148, 136],
    },
    POD: {
      bannerTitle: `3. LOCAL CHARGE ĐẦU NHẬP (DESTINATION / POD CHARGES - ${model.shipment.pod || 'POD'})`,
      subtotalLabel: 'Tiểu kế Local Charge Đầu Nhập:',
      bg: [254, 243, 199],
      text: [180, 83, 9],
    },
    OTHER: {
      bannerTitle: '4. CÁC CHI PHÍ DỊCH VỤ KHÁC (OTHER SERVICES)',
      subtotalLabel: 'Tiểu kế Chi Phí Dịch Vụ Khác:',
      bg: [240, 253, 244],
      text: [21, 128, 61],
    },
  };

  model.charges.groups.forEach((group) => {
    const cfg = groupConfig[group.locationKey] || {
      bannerTitle: group.groupTitle,
      subtotalLabel: `Tiểu kế ${group.groupTitle}:`,
      bg: [241, 245, 249],
      text: primaryColor as [number, number, number],
    };

    // Category Header Banner Row
    tableBody.push([
      {
        content: cfg.bannerTitle,
        colSpan: 9,
        styles: {
          fillColor: cfg.bg,
          textColor: cfg.text,
          font: 'Roboto',
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
        }
      }
    ]);

    // Items Rows
    group.rows.forEach((row) => {
      const descriptionSafe = formatSafeWrappingText(row.description);
      const noteSafe = row.note ? `\n(${formatSafeWrappingText(row.note)})` : '';
      const descriptionFull = `${descriptionSafe}${noteSafe}`;

      tableBody.push([
        row.index,
        descriptionFull,
        row.unit,
        row.quantity,
        row.unitPriceFormatted,
        row.amountBeforeVatFormatted,
        row.vatRateFormatted,
        row.vatAmountFormatted,
        row.totalWithVatFormatted,
      ]);
    });

    // Subtotal Row for this Category
    tableBody.push([
      {
        content: cfg.subtotalLabel,
        colSpan: 5,
        styles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          font: 'Roboto',
          fontStyle: 'bold',
          halign: 'right',
          fontSize: layout.fontSize + 0.2,
          cellPadding: { top: layout.cellPadding.top, right: 3, bottom: layout.cellPadding.bottom, left: 2 },
        }
      },
      {
        content: group.subtotalBeforeVatFormatted,
        styles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          font: 'Roboto',
          fontStyle: 'bold',
          halign: 'right',
          fontSize: layout.fontSize + 0.2,
        }
      },
      {
        content: '',
        styles: {
          fillColor: [248, 250, 252],
          halign: 'center',
        }
      },
      {
        content: group.subtotalVatAmountFormatted,
        styles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          font: 'Roboto',
          fontStyle: 'bold',
          halign: 'right',
          fontSize: layout.fontSize + 0.2,
        }
      },
      {
        content: group.subtotalTotalWithVatFormatted,
        styles: {
          fillColor: [248, 250, 252],
          textColor: cfg.text,
          font: 'Roboto',
          fontStyle: 'bold',
          halign: 'right',
          fontSize: layout.fontSize + 0.2,
        }
      }
    ]);
  });

  const totalColHeader = isVnd ? 'TỔNG (VND)' : 'TỔNG (USD)';

  autoTable(doc, {
    startY: sectionTitleY + 3.5,
    head: [[
      'STT', 
      'HẠNG MỤC CHI PHÍ (DESCRIPTION)', 
      'ĐVT', 
      'SL', 
      'ĐƠN GIÁ', 
      'CHƯA VAT', 
      'VAT%', 
      'TIỀN VAT', 
      totalColHeader
    ]],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: layout.fontSize,
      cellPadding: layout.cellPadding,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: layout.headFontSize,
      font: 'Roboto',
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: {
        top: layout.cellPadding.top + 0.4,
        right: layout.cellPadding.right,
        bottom: layout.cellPadding.bottom + 0.4,
        left: layout.cellPadding.left,
      },
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: layout.columnWidths.stt },
      1: { halign: 'left', cellWidth: layout.columnWidths.description, overflow: 'linebreak' },
      2: { halign: 'center', cellWidth: layout.columnWidths.unit, overflow: 'linebreak' },
      3: { halign: 'center', cellWidth: layout.columnWidths.quantity },
      4: { halign: 'right', cellWidth: layout.columnWidths.unitPrice },
      5: { halign: 'right', cellWidth: layout.columnWidths.amountBeforeVat },
      6: { halign: 'center', cellWidth: layout.columnWidths.vatRate },
      7: { halign: 'right', cellWidth: layout.columnWidths.vatAmount },
      8: { halign: 'right', cellWidth: layout.columnWidths.total, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14, top: 16, bottom: 20 },
    pageBreak: 'auto',
  });

  // Get final Y position of table
  const tableFinalY = (doc as any).lastAutoTable.finalY + 5;

  // Safe page boundary check for Totals block
  let totalsY = tableFinalY;
  if (totalsY + 30 > 260) {
    doc.addPage();
    totalsY = 16;
  }

  // 7. Totals & Exchange Rate Box (106mm to 196mm)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(106, totalsY, 90, 26, 2, 2, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cộng tiền cước & phí / Subtotal:`, 110, totalsY + 6);
  doc.text(model.charges.subtotalFormatted, 192, totalsY + 6, { align: 'right' });

  doc.text(`Thuế GTGT / VAT:`, 110, totalsY + 12);
  doc.text(model.charges.vatTotalFormatted, 192, totalsY + 12, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(110, totalsY + 16, 192, totalsY + 16);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`TỔNG CỘNG / GRAND TOTAL (${model.meta.currency}):`, 110, totalsY + 22);
  doc.text(model.charges.grandTotalFormatted, 192, totalsY + 22, { align: 'right' });

  // Rate Notes on Left Side of Totals (14mm to 102mm)
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Tỷ giá quy đổi (Ex.Rate): ${model.meta.exchangeRateText}`, 14, totalsY + 6, { maxWidth: 88 });
  if (model.charges.equivalentUsdFormatted) {
    doc.text(`* Quy đổi tương đương USD: ~ ${model.charges.equivalentUsdFormatted}`, 14, totalsY + 11, { maxWidth: 88 });
  } else if (model.charges.equivalentVndFormatted) {
    doc.text(`* Tổng thanh toán quy đổi VND: ~ ${model.charges.equivalentVndFormatted}`, 14, totalsY + 11, { maxWidth: 88 });
  }

  // 8. Terms & Conditions Block
  let termsY = totalsY + 31;
  if (termsY > 215) {
    doc.addPage();
    termsY = 16;
  }

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ĐIỀU KHOẢN VÀ QUY ĐỊNH BÁO GIÁ / TERMS & CONDITIONS', 14, termsY, { maxWidth: 182 });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Incoterm: ${model.terms.incoterm}`, 14, termsY + 4.5, { maxWidth: 182 });
  
  if (model.terms.paymentTerm) {
    doc.text(`Điều khoản thanh toán / Payment: ${model.terms.paymentTerm}`, 14, termsY + 9, { maxWidth: 182 });
  }

  let nextY = termsY + 14;
  if (model.terms.exclusionsNotes) {
    const splitNotes = doc.splitTextToSize(`Ghi chú & Miễn trừ / Exclusions: ${model.terms.exclusionsNotes}`, 182);
    doc.text(splitNotes, 14, nextY);
    nextY += splitNotes.length * 3.8;
  }

  // Bank Information Block
  if (model.terms.bankAccountInfo || model.company.bankName) {
    if (nextY > 238) {
      doc.addPage();
      nextY = 16;
    }

    doc.setFont('Roboto', 'bold');
    doc.text('THÔNG TIN CHUYỂN KHOẢN / BANK INFORMATION:', 14, nextY, { maxWidth: 182 });
    doc.setFont('Roboto', 'normal');

    let bankText = model.terms.bankAccountInfo;
    if (!bankText && model.company.bankName) {
      bankText = `Ngân hàng: ${model.company.bankName} | Số TK: ${model.company.bankAccountNo} | Chủ TK: ${model.company.bankAccountHolder}`;
    }

    const splitBank = doc.splitTextToSize(bankText, 182);
    doc.text(splitBank, 14, nextY + 4.2);
    nextY += 4.2 + splitBank.length * 3.8;
  }

  // Check page overflow for Signatures
  let signY = nextY + 5;
  if (signY > 225) {
    doc.addPage();
    signY = 16;
  }

  // 9. Dual Signature Box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, signY, 196, signY);
  signY += 5;

  const colWidth = 82;
  const leftX = 14;
  const rightX = 114;

  // Left Sign: Customer Acceptance
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(model.signatures.customerTitle, leftX, signY, { maxWidth: colWidth });

  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(model.signatures.customerSub, leftX, signY + 4, { maxWidth: colWidth });

  // Right Sign: Forwarder Company & Sales Rep
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(model.signatures.companyTitle, rightX, signY, { maxWidth: colWidth });

  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(model.signatures.companySub, rightX, signY + 4, { maxWidth: colWidth });

  // Signature line position (after signature space)
  const signerY = signY + 22;

  // Left Signer
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(model.signatures.customerSigner, leftX, signerY, { maxWidth: colWidth });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Ngày / Date: ...... / ...... / 202...', leftX, signerY + 4.2);

  // Right Signer Name
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(model.signatures.companySigner, rightX, signerY, { maxWidth: colWidth });

  let curRightY = signerY;

  // Right Signer Role / Title (xuống hàng trang nhã)
  if (model.signatures.companyRole) {
    curRightY += 4.2;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(model.signatures.companyRole, rightX, curRightY, { maxWidth: colWidth });
  }

  // Right Signer Phone (xuống hàng riêng biệt)
  if (model.signatures.companyPhone) {
    curRightY += 3.8;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tel/Zalo: ${model.signatures.companyPhone}`, rightX, curRightY, { maxWidth: colWidth });
  }

  // Right Signer Email (xuống hàng riêng biệt, tự động giới hạn độ rộng A4)
  if (model.signatures.companyEmail) {
    curRightY += 3.8;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Email: ${model.signatures.companyEmail}`, rightX, curRightY, { maxWidth: colWidth });
  }

  // 10. Running Page Footers (Trang X / Y)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(148, 163, 184);

    const footerLeft = `Hệ thống Báo giá LogiQuote - Số: ${model.meta.quoteNumber} - Ngày: ${model.meta.createdDate}`;
    doc.text(footerLeft, 14, 290, { maxWidth: 140 });
    doc.text(`Trang / Page ${i} / ${totalPages}`, 196, 290, { align: 'right' });
  }

  // 11. Save and trigger browser download
  const safeFileName = `${model.meta.quoteNumber}_Logistics_Quotation_${model.meta.currency}.pdf`;
  doc.save(safeFileName);
}
