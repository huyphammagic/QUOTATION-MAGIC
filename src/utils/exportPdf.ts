import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND, formatNumberVND, formatNumber, formatExchangeRate } from './formatters';

// Helper to remove Vietnamese diacritics and non-ASCII characters for clean PDF rendering
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str.toString();

  // Replace non-breaking spaces and special unicode spaces with standard ASCII space
  result = result.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");

  // Replace currency symbols & special characters
  result = result.replace(/₫/g, " VND").replace(/đ/g, "d").replace(/Đ/g, "D");

  // Remove diacritics
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

  // Keep standard printable ASCII characters (32 to 126) plus newline
  result = result.replace(/[^\x20-\x7E\n]/g, "");

  return result;
}

export function exportQuoteToPdf(quote: QuoteData, targetCurrency?: 'USD' | 'VND') {
  const currency: 'USD' | 'VND' = targetCurrency || quote.quoteCurrency || 'USD';
  const isVnd = currency === 'VND';

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [22, 78, 99]; // Corporate Dark Cyan / Blue #164e63
  const secondaryColor = [71, 85, 105]; // Slate
  const lightBg = [241, 245, 249];

  // 1. Top Decorative Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // Company Header
  const companyName = quote.company?.name || 'LOGISTICS & FREIGHT FORWARDING';
  const companyAddress = quote.company?.address || '';
  const companyTaxId = quote.company?.taxId || '';
  const companyPhone = quote.company?.phone || '';
  const companyEmail = quote.company?.email || '';
  const companyWebsite = quote.company?.website || '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 78, 99);
  doc.text(removeVietnameseTones(companyName), 14, 16);

  let currentHeaderY = 20;
  if (quote.company?.englishName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(removeVietnameseTones(quote.company.englishName), 14, currentHeaderY);
    currentHeaderY += 4;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (companyAddress) {
    doc.text(`Address: ${removeVietnameseTones(companyAddress)}`, 14, currentHeaderY, { maxWidth: 182 });
    currentHeaderY += 4;
  }
  const contactParts = [
    companyTaxId ? `Tax ID: ${companyTaxId}` : '',
    companyPhone ? `Tel: ${companyPhone}` : '',
    companyEmail ? `Email: ${companyEmail}` : ''
  ].filter(Boolean).join(' | ');
  if (contactParts) {
    doc.text(contactParts, 14, currentHeaderY);
  }
  if (companyWebsite) {
    currentHeaderY += 4;
    doc.text(`Website: ${companyWebsite}`, 14, currentHeaderY);
  }

  currentHeaderY += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, currentHeaderY, 196, currentHeaderY);

  // 2. Title & Quote Metadata
  const titleY = currentHeaderY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('FREIGHT QUOTATION / BANG BAO GIA LOGISTICS', 14, titleY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Quote Ref: ${quote.quoteNumber}`, 14, titleY + 5);
  doc.text(`Date: ${quote.createdDate}`, 72, titleY + 5);
  doc.text(`Valid Until: ${quote.terms.validityDate}`, 118, titleY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isVnd ? 16 : 14, isVnd ? 117 : 116, isVnd ? 76 : 144);
  doc.text(`Currency: ${isVnd ? 'VND' : 'USD'}`, 170, titleY + 5);

  // 3. Customer & Shipment Boxes (Two-column layout)
  const y = titleY + 9;

  // Customer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, y, 88, 38, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 78, 99);
  doc.text('CUSTOMER / KHACH HANG', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Company: ${removeVietnameseTones(quote.customer.companyName)}`, 18, y + 12, { maxWidth: 80 });
  doc.text(`Contact: ${removeVietnameseTones(quote.customer.contactPerson || quote.customer.customerName)}`, 18, y + 20);
  doc.text(`Tax ID: ${quote.customer.taxId || 'N/A'}`, 18, y + 25);
  doc.text(`Phone: ${quote.customer.phone} | Email: ${quote.customer.email}`, 18, y + 30, { maxWidth: 80 });

  // Shipment Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(108, y, 88, 38, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 78, 99);
  doc.text('SHIPMENT DETAILS / THONG TIN LO HANG', 112, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Mode: ${quote.shipment.mode} (${quote.shipment.containerType})`, 112, y + 12);
  doc.text(`POL: ${removeVietnameseTones(quote.shipment.pol)}`, 112, y + 17, { maxWidth: 80 });
  doc.text(`POD: ${removeVietnameseTones(quote.shipment.pod)}`, 112, y + 23, { maxWidth: 80 });
  doc.text(`Commodity: ${removeVietnameseTones(quote.shipment.commodity)}`, 112, y + 29, { maxWidth: 80 });
  doc.text(`Qty/Weight: ${quote.shipment.quantity} cont / ${formatNumber(quote.shipment.grossWeightKg)} KGS / ${formatNumber(quote.shipment.volumeCbm)} CBM`, 112, y + 34);

  // 4. Line Items Table Grouped by Location
  const locations = ['POL', 'FREIGHT', 'POD', 'OTHER'] as const;
  const locTitleMap = {
    POL: `1. POL CHARGES (CHI PHI DAU XUAT - ${removeVietnameseTones(quote.shipment.pol || 'POL')})`,
    FREIGHT: `2. MAIN FREIGHT (CUOC VAN CHUYEN CHINH - ${quote.shipment.mode})`,
    POD: `3. POD CHARGES (CHI PHI DAU NHAP - ${removeVietnameseTones(quote.shipment.pod || 'POD')})`,
    OTHER: '4. OTHER CHARGES & SERVICES (DICH VU CONG THEM)'
  };

  const tableBody: any[] = [];
  let itemCounter = 1;

  locations.forEach((locKey) => {
    const locItems = quote.items.filter(item => (item.location || 'POL') === locKey);
    if (locItems.length === 0) return;

    const locSubtotalUsd = locItems.reduce((acc, i) => acc + i.amountUsd, 0);
    const locSubtotalVnd = locItems.reduce((acc, i) => acc + i.amountVnd, 0);

    const groupSubtotalText = isVnd
      ? `${formatNumberVND(locSubtotalVnd)} VND`
      : formatUSD(locSubtotalUsd);

    // Group Header Row
    tableBody.push([
      {
        content: `${locTitleMap[locKey]} - Subtotal: ${groupSubtotalText}`,
        colSpan: 8,
        styles: {
          fillColor: [241, 245, 249],
          textColor: [22, 78, 99],
          fontStyle: 'bold',
          fontSize: 8,
        }
      }
    ]);

    // Line item rows
    locItems.forEach((item) => {
      // Unit Price: format as pure ASCII string. For USD: $50.00; for VND: 1.500.000 (no ₫ symbol to prevent PDF font corruption)
      const unitPriceFormatted = item.currency === 'USD' 
        ? formatUSD(item.unitPrice) 
        : formatNumberVND(item.unitPrice);

      const amountFormatted = isVnd
        ? formatNumberVND(item.amountVnd)
        : formatUSD(item.amountUsd);

      tableBody.push([
        itemCounter++,
        removeVietnameseTones(`${item.description}${item.note ? `\n(${item.note})` : ''}`),
        item.quantity,
        removeVietnameseTones(item.unit),
        unitPriceFormatted,
        item.currency,
        `${item.vatRate}%`,
        amountFormatted
      ]);
    });
  });

  const amountColHeader = isVnd ? 'Amount (VND)' : 'Amount (USD)';

  autoTable(doc, {
    startY: y + 43,
    head: [['No', 'Description / Hang Muc Chi Phi', 'Qty', 'Unit', 'Unit Price', 'Curr', 'VAT', amountColHeader]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: isVnd ? [6, 95, 70] : [22, 78, 99], // Emerald for VND, Cyan for USD
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'center', cellWidth: isVnd ? 16 : 18 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: isVnd ? 28 : 26 },
    },
    margin: { left: 14, right: 14 },
  });

  // Get final Y position of table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // 5. Totals & Exchange Rate Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(106, finalY, 90, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal / Cong tien hang:`, 110, finalY + 6);
  doc.text(
    isVnd ? `${formatNumberVND(quote.subtotalVnd)} VND` : formatUSD(quote.subtotalUsd),
    192,
    finalY + 6,
    { align: 'right' }
  );

  doc.text(`VAT / Thue VAT:`, 110, finalY + 12);
  doc.text(
    isVnd ? `${formatNumberVND(quote.vatTotalVnd)} VND` : formatUSD(quote.vatTotalUsd),
    192,
    finalY + 12,
    { align: 'right' }
  );

  doc.setDrawColor(203, 213, 225);
  doc.line(110, finalY + 16, 192, finalY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isVnd ? 6 : 22, isVnd ? 95 : 78, isVnd ? 70 : 99);
  doc.text(`GRAND TOTAL (${isVnd ? 'VND' : 'USD'}):`, 110, finalY + 22);
  doc.text(
    isVnd ? `${formatNumberVND(quote.grandTotalVnd)} VND` : formatUSD(quote.grandTotalUsd),
    192,
    finalY + 22,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Ty gia quy doi (Ex.Rate): 1 USD = ${formatExchangeRate(quote.exchangeRate)} VND`, 14, finalY + 6);
  if (isVnd) {
    doc.text(`* Quy doi tuong duong USD: ~ ${formatUSD(quote.grandTotalUsd)}`, 14, finalY + 11);
  } else if (quote.grandTotalVnd) {
    doc.text(`* Tong thanh toan quy doi: ~ ${formatNumberVND(quote.grandTotalVnd)} VND`, 14, finalY + 11);
  }

  // 6. Terms & Conditions Block
  let termsY = finalY + 32;
  if (termsY > 220) {
    doc.addPage();
    termsY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 78, 99);
  doc.text('TERMS & CONDITIONS / DIEU KHOAN BAO GIA', 14, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Incoterm: ${quote.terms.incoterm}`, 14, termsY + 4.5);
  doc.text(`Payment Term: ${removeVietnameseTones(quote.terms.paymentTerm)}`, 14, termsY + 8.5, { maxWidth: 180 });
  
  const splitNotes = doc.splitTextToSize(`Exclusions & Notes: ${removeVietnameseTones(quote.terms.exclusionsNotes)}`, 180);
  doc.text(splitNotes, 14, termsY + 13);

  let nextY = termsY + 13 + splitNotes.length * 3.5;

  // Bank Info
  doc.setFont('helvetica', 'bold');
  doc.text('BANK INFORMATION / THONG TIN CHUYEN KHOAN:', 14, nextY);
  doc.setFont('helvetica', 'normal');
  const splitBank = doc.splitTextToSize(removeVietnameseTones(quote.terms.bankAccountInfo), 180);
  doc.text(splitBank, 14, nextY + 4);

  let signY = nextY + 6 + splitBank.length * 3.5;
  if (signY > 245) {
    doc.addPage();
    signY = 20;
  }

  // 7. Dual Signature Box
  doc.setDrawColor(226, 232, 240);
  doc.line(14, signY, 196, signY);
  signY += 6;

  // Left Sign: Customer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('CUSTOMER ACCEPTANCE / XAC NHAN KHACH HANG', 14, signY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('(Sign & Stamp / Ky ten va dong dau)', 14, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(removeVietnameseTones(quote.customer.contactPerson || quote.customer.customerName || 'Authorized Representative'), 14, signY + 22);

  // Right Sign: Forwarder Company & Sales Rep
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 78, 99);
  doc.text('FOR AND ON BEHALF OF / DAI DIEN BEN BAO GIA', 114, signY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(removeVietnameseTones(quote.company?.shortName || quote.company?.name || 'LOGISTICS COMPANY'), 114, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(removeVietnameseTones(quote.company?.salesRepName || 'SALES REPRESENTATIVE'), 114, signY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const repContact = [
    quote.company?.salesRepTitle ? removeVietnameseTones(quote.company.salesRepTitle) : '',
    quote.company?.salesRepPhone ? `Tel: ${quote.company.salesRepPhone}` : ''
  ].filter(Boolean).join(' | ');
  if (repContact) {
    doc.text(repContact, 114, signY + 24);
  }

  // Save PDF
  doc.save(`${quote.quoteNumber}_Logistics_Quotation_${currency}.pdf`);
}
