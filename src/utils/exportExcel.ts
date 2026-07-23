import * as XLSX from 'xlsx';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND, formatNumber } from './formatters';

export function exportQuoteToExcel(quote: QuoteData) {
  const wb = XLSX.utils.book_new();

  // 1. Prepare Header rows
  const excelRows: any[][] = [
    [quote.company.name.toUpperCase()],
    [`Địa chỉ: ${quote.company.address}`],
    [`MST: ${quote.company.taxId} | Hotline: ${quote.company.phone} | Email: ${quote.company.email}`],
    [`Website: ${quote.company.website}`],
    [],
    ['BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS & VẬN TẢI QUỐC TẾ'],
    [`Mã báo giá: ${quote.quoteNumber}`, '', `Ngày tạo: ${quote.createdDate}`, '', `Hiệu lực đến: ${quote.terms.validityDate}`],
    [`Tỷ giá quy đổi: 1 USD = ${formatNumber(quote.exchangeRate)} VND`],
    [],
    ['I. THÔNG TIN KHÁCH HÀNG & LÔ HÀNG'],
    ['Tên khách hàng:', quote.customer.customerName, 'Công ty:', quote.customer.companyName],
    ['Mã số thuế:', quote.customer.taxId, 'Điện thoại/Email:', `${quote.customer.phone} / ${quote.customer.email}`],
    ['Hình thức vận chuyển:', quote.shipment.mode, 'Loại Cont/Quy cách:', quote.shipment.containerType],
    ['Cảng đi (POL):', quote.shipment.pol, 'Cảng đến (POD):', quote.shipment.pod],
    ['Tên hàng hóa:', quote.shipment.commodity, 'Số lượng/Trọng lượng:', `${quote.shipment.quantity} cont / ${formatNumber(quote.shipment.grossWeightKg)} KGS / ${formatNumber(quote.shipment.volumeCbm)} CBM`],
    ['Thời gian vận chuyển:', quote.shipment.transitTime || 'N/A', 'Free time Dem/Det:', quote.shipment.freeTime || 'N/A'],
    [],
    ['II. CHI TIẾT CÁC HẠNG MỤC CƯỚC PHÍ (LOGISTICS BREAKDOWN)'],
    ['STT', 'Hạng mục chi phí / Phụ phí', 'Mã Phí', 'Phân loại', 'Số lượng', 'Đơn vị', 'Đơn giá', 'Loại tiền', 'VAT (%)', 'Thành tiền (USD)', 'Thành tiền (VND)', 'Ghi chú']
  ];

  // 2. Add Line Items Grouped by Location (POL, FREIGHT, POD, OTHER)
  const locations = ['POL', 'FREIGHT', 'POD', 'OTHER'] as const;
  const locTitleMap = {
    POL: `--- 1. CHI PHÍ TẠI CẢNG / SÂN BAY ĐI (POL CHARGES - ${quote.shipment.pol || 'ORIGIN'}) ---`,
    FREIGHT: `--- 2. CƯỚC VẬN CHUYỂN CHẶNG CHÍNH (MAIN FREIGHT - ${quote.shipment.mode}) ---`,
    POD: `--- 3. CHI PHÍ TẠI CẢNG / SÂN BAY ĐẾN (POD CHARGES - ${quote.shipment.pod || 'DESTINATION'}) ---`,
    OTHER: '--- 4. DỊCH VỤ CỘNG THÊM & CHI PHÍ KHÁC (OTHER SERVICES) ---'
  };

  locations.forEach((locKey) => {
    const locItems = quote.items.filter(item => (item.location || 'POL') === locKey);
    if (locItems.length === 0) return;

    const locSubtotalUsd = locItems.reduce((acc, i) => acc + i.amountUsd, 0);
    const locSubtotalVnd = locItems.reduce((acc, i) => acc + i.amountVnd, 0);

    // Group Header Row
    excelRows.push([]);
    excelRows.push(['', locTitleMap[locKey]]);

    // Group items
    locItems.forEach((item, index) => {
      excelRows.push([
        index + 1,
        item.description,
        item.code,
        item.category,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.currency,
        `${item.vatRate}%`,
        item.amountUsd,
        item.amountVnd,
        item.note || ''
      ]);
    });

    // Subtotal Row
    excelRows.push(['', `Cộng chặng (${locKey}):`, '', '', '', '', '', '', '', locSubtotalUsd, locSubtotalVnd]);
  });

  // 3. Add Totals
  excelRows.push([]);
  excelRows.push(['TỔNG CỘNG CHƯA VAT:', '', '', '', '', '', '', '', '', quote.subtotalUsd, quote.subtotalVnd]);
  excelRows.push(['TỔNG THUẾ VAT:', '', '', '', '', '', '', '', '', quote.vatTotalUsd, quote.vatTotalVnd]);
  excelRows.push(['TỔNG CỘNG THANH TOÁN (GRAND TOTAL):', '', '', '', '', '', '', '', '', quote.grandTotalUsd, quote.grandTotalVnd]);

  // 4. Add Terms & Conditions
  excelRows.push([]);
  excelRows.push(['III. ĐIỀU KHOẢN VÀ THÔNG TIN CHUYỂN KHOAN']);
  excelRows.push(['Điều kiện giao hàng (Incoterm):', quote.terms.incoterm]);
  excelRows.push(['Điều khoản thanh toán:', quote.terms.paymentTerm]);
  excelRows.push(['Ngoại trừ & Ghi chú:', quote.terms.exclusionsNotes]);
  excelRows.push(['Thông tin tài khoản ngân hàng:', quote.terms.bankAccountInfo]);
  excelRows.push(['Người lập báo giá:', `${quote.company.salesRepName} (${quote.company.salesRepTitle}) - Tel: ${quote.company.salesRepPhone}`]);

  // Create Worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 45 }, // Description
    { wch: 15 }, // Code
    { wch: 15 }, // Category
    { wch: 10 }, // Qty
    { wch: 15 }, // Unit
    { wch: 15 }, // Unit Price
    { wch: 10 }, // Currency
    { wch: 10 }, // VAT
    { wch: 18 }, // Total USD
    { wch: 20 }, // Total VND
    { wch: 30 }  // Note
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Báo Giá Logistics');

  // Save Excel file
  XLSX.writeFile(wb, `${quote.quoteNumber}_Logistics_Quotation.xlsx`);
}
