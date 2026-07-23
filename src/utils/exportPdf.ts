import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND, formatNumber } from './formatters';

// Helper to remove Vietnamese diacritics if PDF font doesn't support full unicode font face
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str;
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  result = result.replace(/đ/g, "d");
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  result = result.replace(/Đ/g, "D");
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

  // 1. Header - Company Info
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 78, 99);
  doc.text(removeVietnameseTones(quote.company.name), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Address: ${removeVietnameseTones(quote.company.address)}`, 14, 23);
  doc.text(`Tax ID: ${quote.company.taxId} | Tel: ${quote.company.phone} | Email: ${quote.company.email}`, 14, 27);
  doc.text(`Website: ${quote.company.website}`, 14, 31);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 34, 196, 34);

  // 2. Title & Quote Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('FREIGHT QUOTATION / BANG BAP GIA LOGISTICS', 14, 43);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Quote Ref: ${quote.quoteNumber}`, 14, 48);
  doc.text(`Date: ${quote.createdDate}`, 80, 48);
  doc.text(`Valid Until: ${quote.terms.validityDate}`, 135, 48);

  // 3. Customer & Shipment Boxes (Two-column layout)
  let y = 53;

  // Customer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, y, 88, 38, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 78, 99);
  doc.text('CUSTOMER / KHAC HANG', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Company: ${removeVietnameseTones(quote.customer.companyName)}`, 18, y + 12, { maxWidth: 80 });
  doc.text(`Contact: ${removeVietnameseTones(quote.customer.contactPerson || quote.customer.customerName)}`, 18, y + 20);
  doc.text(`Tax ID: ${quote.customer.taxId || 'N/A'}`, 18, y + 25);
  doc.text(`Phone: ${quote.customer.phone} | Email: ${quote.customer.email}`, 18, y + 30, { maxWidth: 80 });

  // Shipment Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(108, y, 88, 38, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 78, 99);
  doc.text('SHIPMENT ROUTE & SPECIFICATIONS', 112, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Mode: ${quote.shipment.mode} (${quote.shipment.containerType})`, 112, y + 12);
  doc.text(`POL (Origin): ${removeVietnameseTones(quote.shipment.pol)}`, 112, y + 17, { maxWidth: 80 });
  doc.text(`POD (Dest): ${removeVietnameseTones(quote.shipment.pod)}`, 112, y + 22, { maxWidth: 80 });
  doc.text(`Commodity: ${removeVietnameseTones(quote.shipment.commodity)}`, 112, y + 27, { maxWidth: 80 });
  doc.text(`GW/Volume: ${formatNumber(quote.shipment.grossWeightKg)} KGS / ${formatNumber(quote.shipment.volumeCbm)} CBM`, 112, y + 32);

  y += 43;

  // 4. Line Items Table
  const tableData = quote.items.map((item, idx) => [
    (idx + 1).toString(),
    `${removeVietnameseTones(item.description)}\n(${item.code})`,
    formatNumber(item.quantity),
    removeVietnameseTones(item.unit),
    item.currency === 'USD' ? formatUSD(item.unitPrice) : formatVND(item.unitPrice),
    item.currency,
    `${item.vatRate}%`,
    formatUSD(item.amountUsd),
    formatVND(item.amountVnd),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description / Hang Muc', 'Qty', 'Unit', 'Unit Price', 'Curr', 'VAT', 'Total (USD)', 'Total (VND)']],
    body: tableData,
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
      1: { cellWidth: 55 },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 23 },
    },
    margin: { left: 14, right: 14 },
  });

  // Get final Y position of table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Totals & Exchange Rate Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, finalY, 86, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal / Cong tien hàng:`, 114, finalY + 6);
  doc.text(`${formatUSD(quote.subtotalUsd)} / ${formatVND(quote.subtotalVnd)}`, 192, finalY + 6, { align: 'right' });

  doc.text(`VAT / Thue VAT:`, 114, finalY + 12);
  doc.text(`${formatUSD(quote.vatTotalUsd)} / ${formatVND(quote.vatTotalVnd)}`, 192, finalY + 12, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(114, finalY + 16, 192, finalY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 78, 99);
  doc.text(`GRAND TOTAL / TONG CONG:`, 114, finalY + 22);
  doc.text(`${formatUSD(quote.grandTotalUsd)}`, 192, finalY + 21, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`(${formatVND(quote.grandTotalVnd)})`, 192, finalY + 27, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Ty gia quy doi (Ex.Rate): 1 USD = ${formatNumber(quote.exchangeRate)} VND`, 14, finalY + 6);

  // 6. Terms & Conditions Block
  let termsY = finalY + 36;
  if (termsY > 240) {
    doc.addPage();
    termsY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 78, 99);
  doc.text('TERMS & CONDITIONS / DIEU KHOAN BAP GIA', 14, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Incoterm: ${quote.terms.incoterm}`, 14, termsY + 5);
  doc.text(`Payment Term: ${removeVietnameseTones(quote.terms.paymentTerm)}`, 14, termsY + 9, { maxWidth: 180 });
  
  const splitNotes = doc.splitTextToSize(`Exclusions & Notes: ${removeVietnameseTones(quote.terms.exclusionsNotes)}`, 180);
  doc.text(splitNotes, 14, termsY + 14);

  let nextY = termsY + 14 + splitNotes.length * 3.5;

  // Bank Info
  doc.setFont('helvetica', 'bold');
  doc.text('BANK INFORMATION / THONG TIN CHUYEN KHOAN:', 14, nextY);
  doc.setFont('helvetica', 'normal');
  const splitBank = doc.splitTextToSize(removeVietnameseTones(quote.terms.bankAccountInfo), 180);
  doc.text(splitBank, 14, nextY + 4);

  // 7. Signatures & Footer Block
  let sigY = nextY + 10 + splitBank.length * 3.5;
  if (sigY > 250) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text('CUSTOMER ACCEPTANCE', 30, sigY);
  doc.text('(Xac nhan dong y bao gia)', 28, sigY + 4);

  doc.text('PREPARED BY (SALES EXECUTIVE)', 125, sigY);
  doc.text(`(Nhan vien bao gia)`, 138, sigY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(removeVietnameseTones(quote.company.salesRepName), 130, sigY + 22);
  doc.text(quote.company.salesRepTitle, 130, sigY + 26);

  // Save PDF
  doc.save(`${quote.quoteNumber}_Logistics_Quotation.pdf`);
}
