import { QuoteData } from '../types/logistics';
import { formatNumber } from './formatters';

// Initialize OAuth token client or check stored token
export async function exportToGoogleSheets(quote: QuoteData, accessToken: string): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> {
  try {
    // 1. Create a new Google Spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `[Báo Giá Logistics] ${quote.quoteNumber} - ${quote.customer.companyName || quote.customer.customerName}`,
        },
        sheets: [
          {
            properties: {
              title: 'Báo Giá Chi Tiết',
            },
          },
        ],
      }),
    });

    if (!createResponse.ok) {
      const errJson = await createResponse.json();
      throw new Error(errJson.error?.message || 'Không thể tạo mới file Google Sheets');
    }

    const sheetData = await createResponse.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // 2. Format matrix data for Google Sheets
    const values: any[][] = [
      [quote.company.name.toUpperCase()],
      [`Địa chỉ: ${quote.company.address}`],
      [`MST: ${quote.company.taxId} | Hotlines: ${quote.company.phone} | Email: ${quote.company.email}`],
      [],
      ['BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS (FREIGHT FORWARDING QUOTATION)'],
      [`Mã Báo Giá: ${quote.quoteNumber}`, '', `Ngày tạo: ${quote.createdDate}`, '', `Hiệu lực đến: ${quote.terms.validityDate}`],
      [`Tỷ giá quy đổi: 1 USD = ${formatNumber(quote.exchangeRate)} VND`],
      [],
      ['1. THÔNG TIN KHÁCH HÀNG & LÔ HÀNG'],
      ['Tên khách hàng:', quote.customer.customerName, 'Công ty:', quote.customer.companyName],
      ['MST:', quote.customer.taxId, 'Liên hệ:', `${quote.customer.phone} / ${quote.customer.email}`],
      ['Phương thức vận chuyển:', quote.shipment.mode, 'Quy cách container:', quote.shipment.containerType],
      ['Cảng đi (POL):', quote.shipment.pol, 'Cảng đến (POD):', quote.shipment.pod],
      ['Tên hàng hóa:', quote.shipment.commodity, 'Số lượng/GW/CBM:', `${quote.shipment.quantity} cont / ${formatNumber(quote.shipment.grossWeightKg)} KGS / ${formatNumber(quote.shipment.volumeCbm)} CBM`],
      [],
      ['2. BẢNG CHI TIẾT CƯỚC PHÍ VÀ PHỤ PHÍ'],
      ['STT', 'Tên Hạng Mục / Phụ Phí', 'Mã Phí', 'Loại Phí', 'Số Lượng', 'Đơn Vị', 'Đơn Giá', 'Loại Tiền', 'VAT (%)', 'Thành Tiền (USD)', 'Thành Tiền (VND)', 'Ghi Chú']
    ];

    quote.items.forEach((item, idx) => {
      values.push([
        idx + 1,
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

    values.push([]);
    values.push(['TỔNG CỘNG CHƯA VAT:', '', '', '', '', '', '', '', '', quote.subtotalUsd, quote.subtotalVnd]);
    values.push(['TỔNG THUẾ VAT:', '', '', '', '', '', '', '', '', quote.vatTotalUsd, quote.vatTotalVnd]);
    values.push(['TỔNG CỘNG THANH TOÁN (GRAND TOTAL):', '', '', '', '', '', '', '', '', quote.grandTotalUsd, quote.grandTotalVnd]);
    values.push([]);
    values.push(['3. ĐIỀU KHOẢN & BẢO HÀNH'], [quote.terms.exclusionsNotes]);

    // 3. Update values into the spreadsheet
    const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:L${values.length}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `A1:L${values.length}`,
        majorDimension: 'ROWS',
        values: values,
      }),
    });

    if (!updateResponse.ok) {
      const errJson = await updateResponse.json();
      throw new Error(errJson.error?.message || 'Lỗi khi ghi dữ liệu vào Google Sheet');
    }

    return { success: true, spreadsheetUrl };
  } catch (error: any) {
    console.error('Google Sheets Export Error:', error);
    return { success: false, error: error.message || 'Lỗi kết nối Google Sheets API' };
  }
}
