import { QuoteData, QuoteCurrency } from '../types/logistics';
import { ensureUnicodeFonts, normalizeUnicode } from '../services/pdf/pdfFontLoader';
import { buildQuotationDocumentModel, DocumentLanguage } from '../services/pdf/quotationDocumentModel';

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
    doc.text(contactParts, 14, currentHeaderY);
    currentHeaderY += 4.5;
  }

  if (model.company.website) {
    doc.text(`Website: ${model.company.website}`, 14, currentHeaderY);
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
  doc.text(model.meta.documentTitle, 14, titleY);

  doc.setFontSize(8.5);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Mã báo giá / Quote Ref: ${model.meta.quoteNumber}`, 14, titleY + 5.5);
  doc.text(`Ngày / Date: ${model.meta.createdDate}`, 82, titleY + 5.5);
  doc.text(`Hiệu lực / Valid Until: ${model.meta.validityDate || '15 ngày kể từ ngày báo giá'}`, 128, titleY + 5.5);

  doc.setFont('Roboto', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Đồng tiền / Currency: ${model.meta.currency}`, 174, titleY + 5.5);

  // 5. Customer & Shipment Boxes (Two-column layout)
  const y = titleY + 9;

  // Customer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 88, 38, 2, 2, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(language === 'en' ? 'CUSTOMER INFORMATION' : 'THÔNG TIN KHÁCH HÀNG / CUSTOMER', 18, y + 6);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Công ty: ${model.customer.companyName || 'Khách hàng vãng lai'}`, 18, y + 12, { maxWidth: 80 });
  doc.text(`Người liên hệ: ${model.customer.contactPerson || model.customer.name || 'N/A'}`, 18, y + 20);
  doc.text(`Mã số thuế: ${model.customer.taxId || 'N/A'}`, 18, y + 25);
  doc.text(`Điện thoại: ${model.customer.phone || 'N/A'} | Email: ${model.customer.email || 'N/A'}`, 18, y + 30, { maxWidth: 80 });

  // Shipment Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(108, y, 88, 38, 2, 2, 'FD');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(language === 'en' ? 'SHIPMENT DETAILS' : 'THÔNG TIN LÔ HÀNG / SHIPMENT', 112, y + 6);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Phương thức: ${model.shipment.mode} (${model.shipment.containerType || 'Standard'})`, 112, y + 12);
  doc.text(`Cảng đi (POL): ${model.shipment.pol || 'N/A'}`, 112, y + 17, { maxWidth: 80 });
  doc.text(`Cảng đến (POD): ${model.shipment.pod || 'N/A'}`, 112, y + 22, { maxWidth: 80 });
  doc.text(`Hàng hóa: ${model.shipment.commodity || 'General Cargo'}`, 112, y + 27, { maxWidth: 80 });
  doc.text(`Quy cách: ${model.shipment.quantitySummary}`, 112, y + 32, { maxWidth: 80 });

  // 6. Line Items Table with Grouping & Full Vietnamese Diacritics
  const tableBody: any[] = [];

  model.charges.groups.forEach((group) => {
    // Group Header Row
    tableBody.push([
      {
        content: `${group.groupTitle} — Tổng nhóm: ${group.subtotalText}`,
        colSpan: 8,
        styles: {
          fillColor: [241, 245, 249],
          textColor: primaryColor,
          font: 'Roboto',
          fontStyle: 'bold',
          fontSize: 8,
        }
      }
    ]);

    // Group Items
    group.rows.forEach((row) => {
      const descriptionText = row.note ? `${row.description}\n(${row.note})` : row.description;

      tableBody.push([
        row.index,
        descriptionText,
        row.quantity,
        row.unit,
        row.unitPriceFormatted,
        row.currency,
        row.vatRateFormatted,
        row.amountFormatted
      ]);
    });
  });

  const amountColHeader = isVnd ? 'Thành tiền (VND)' : 'Thành tiền (USD)';

  autoTable(doc, {
    startY: y + 43,
    head: [['STT', 'Hạng Mục Chi Phí / Description', 'SL', 'ĐVT', 'Đơn Giá', 'Loại Tiền', 'VAT', amountColHeader]],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      cellPadding: 2,
    },
    headStyles: {
      fillColor: primaryColor as [number, number, number],
      textColor: [255, 255, 255],
      fontSize: 8,
      font: 'Roboto',
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      font: 'Roboto',
      fontStyle: 'normal',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: isVnd ? 30 : 26 },
    },
    margin: { left: 14, right: 14 },
  });

  // Get final Y position of table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // 7. Totals & Exchange Rate Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(106, finalY, 90, 26, 2, 2, 'FD');

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cộng tiền cước & phí / Subtotal:`, 110, finalY + 6);
  doc.text(model.charges.subtotalFormatted, 192, finalY + 6, { align: 'right' });

  doc.text(`Thuế GTGT / VAT:`, 110, finalY + 12);
  doc.text(model.charges.vatTotalFormatted, 192, finalY + 12, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(110, finalY + 16, 192, finalY + 16);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`TỔNG CỘNG / GRAND TOTAL (${model.meta.currency}):`, 110, finalY + 22);
  doc.text(model.charges.grandTotalFormatted, 192, finalY + 22, { align: 'right' });

  // Rate Notes on Left Side of Totals
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Tỷ giá quy đổi (Ex.Rate): ${model.meta.exchangeRateText}`, 14, finalY + 6);
  if (model.charges.equivalentUsdFormatted) {
    doc.text(`* Quy đổi tương đương USD: ~ ${model.charges.equivalentUsdFormatted}`, 14, finalY + 11);
  } else if (model.charges.equivalentVndFormatted) {
    doc.text(`* Tổng thanh toán quy đổi VND: ~ ${model.charges.equivalentVndFormatted}`, 14, finalY + 11);
  }

  // 8. Terms & Conditions Block
  let termsY = finalY + 32;
  if (termsY > 220) {
    doc.addPage();
    termsY = 16;
  }

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ĐIỀU KHOẢN VÀ QUY ĐỊNH BÁO GIÁ / TERMS & CONDITIONS', 14, termsY);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Incoterm: ${model.terms.incoterm}`, 14, termsY + 4.5);
  
  if (model.terms.paymentTerm) {
    doc.text(`Điều khoản thanh toán / Payment: ${model.terms.paymentTerm}`, 14, termsY + 9, { maxWidth: 180 });
  }

  let nextY = termsY + 14;
  if (model.terms.exclusionsNotes) {
    const splitNotes = doc.splitTextToSize(`Ghi chú & Miễn trừ / Exclusions: ${model.terms.exclusionsNotes}`, 180);
    doc.text(splitNotes, 14, nextY);
    nextY += splitNotes.length * 3.8;
  }

  // Bank Information Block
  if (model.terms.bankAccountInfo || model.company.bankName) {
    doc.setFont('Roboto', 'bold');
    doc.text('THÔNG TIN CHUYỂN KHOẢN / BANK INFORMATION:', 14, nextY);
    doc.setFont('Roboto', 'normal');

    let bankText = model.terms.bankAccountInfo;
    if (!bankText && model.company.bankName) {
      bankText = `Ngân hàng: ${model.company.bankName} | Số TK: ${model.company.bankAccountNo} | Chủ TK: ${model.company.bankAccountHolder}`;
    }

    const splitBank = doc.splitTextToSize(bankText, 180);
    doc.text(splitBank, 14, nextY + 4.2);
    nextY += 4.2 + splitBank.length * 3.8;
  }

  // Check page overflow for Signatures
  let signY = nextY + 4;
  if (signY > 245) {
    doc.addPage();
    signY = 20;
  }

  // 9. Dual Signature Box
  doc.setDrawColor(226, 232, 240);
  doc.line(14, signY, 196, signY);
  signY += 6;

  // Left Sign: Customer Acceptance
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(model.signatures.customerTitle, 14, signY);
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(model.signatures.customerSub, 14, signY + 4);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(model.signatures.customerSigner, 14, signY + 22);

  // Right Sign: Forwarder Company & Sales Rep
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(model.signatures.companyTitle, 114, signY);
  doc.setFont('Roboto', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(model.signatures.companySub, 114, signY + 4);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(model.signatures.companySigner, 114, signY + 20);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (model.signatures.companyContact) {
    doc.text(model.signatures.companyContact, 114, signY + 24.5);
  }

  // 10. Save and trigger browser download
  const safeFileName = `${model.meta.quoteNumber}_Logistics_Quotation_${model.meta.currency}.pdf`;
  doc.save(safeFileName);
}
