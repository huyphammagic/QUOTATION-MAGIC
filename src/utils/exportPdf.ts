import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND, formatNumber, formatExchangeRate } from './formatters';

// Helper to remove Vietnamese diacritics and non-ASCII characters for clean PDF rendering
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str.toString();

  // Replace non-breaking spaces and special unicode spaces with standard ASCII space
  result = result.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");

  // Replace currency symbols & special characters
  result = result.replace(/₫/g, "VND").replace(/đ/g, "d").replace(/Đ/g, "D");

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

export function exportQuoteToPdf(quote: QuoteData) {
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 78, 99);
  doc.text(removeVietnameseTones(quote.company.name), 14, 16);

  let currentHeaderY = 20;
  if (quote.company.englishName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(removeVietnameseTones(quote.company.englishName), 14, currentHeaderY);
    currentHeaderY += 4;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Address: ${removeVietnameseTones(quote.company.address)}`, 14, currentHeaderY, { maxWidth: 182 });
  currentHeaderY += 4;
  doc.text(`Tax ID: ${quote.company.taxId} | Tel: ${quote.company.phone} | Email: ${quote.company.email}`, 14, currentHeaderY);
  if (quote.company.website) {
    currentHeaderY += 4;
    doc.text(`Website: ${quote.company.website}`, 14, currentHeaderY);
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
  doc.text(`Date: ${quote.createdDate}`, 80, titleY + 5);
  doc.text(`Valid Until: ${quote.terms.validityDate}`, 135, titleY + 5);

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

    // Group Header Row
    tableBody.push([
      {
        content: `${locTitleMap[locKey]} - Subtotal: ${formatUSD(locSubtotalUsd)}`,
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
      tableBody.push([
        itemCounter++,
        `${removeVietnameseTones(item.description)}${item.note ? `\n(${removeVietnameseTones(item.note)})` : ''}`,
        item.quantity,
        removeVietnameseTones(item.unit),
        item.currency === 'USD' ? formatUSD(item.unitPrice) : formatVND(item.unitPrice),
        item.currency,
        `${item.vatRate}%`,
        formatUSD(item.amountUsd)
      ]);
    });
  });

  autoTable(doc, {
    startY: y + 43,
    head: [['No', 'Description / Hang Muc Chi Phi', 'Qty', 'Unit', 'Unit Price', 'Curr', 'VAT', 'Amount (USD)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [22, 78, 99],
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
      1: { cellWidth: 68 },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // Get final Y position of table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // 5. Totals & Exchange Rate Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, finalY, 86, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal / Cong tien hang:`, 114, finalY + 6);
  doc.text(`${formatUSD(quote.subtotalUsd)}`, 192, finalY + 6, { align: 'right' });

  doc.text(`VAT / Thue VAT:`, 114, finalY + 12);
  doc.text(`${formatUSD(quote.vatTotalUsd)}`, 192, finalY + 12, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(114, finalY + 16, 192, finalY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 78, 99);
  doc.text(`GRAND TOTAL / TONG CONG:`, 114, finalY + 22);
  doc.text(`${formatUSD(quote.grandTotalUsd)}`, 192, finalY + 22, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Ty gia quy doi (Ex.Rate): 1 USD = ${formatExchangeRate(quote.exchangeRate)} VND`, 14, finalY + 6);

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
  doc.text(removeVietnameseTones(quote.company.shortName || quote.company.name), 114, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(removeVietnameseTones(quote.company.salesRepName), 114, signY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`${removeVietnameseTones(quote.company.salesRepTitle)} | Tel: ${quote.company.salesRepPhone}`, 114, signY + 24);

  // Save PDF
  doc.save(`${quote.quoteNumber}_Logistics_Quotation.pdf`);
}
