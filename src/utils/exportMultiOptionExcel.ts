import { MultiOptionQuotationPackage } from '../types/multiOptionQuote';
import { formatUSD, formatVND } from './formatters';

export async function exportMultiOptionExcel(pkg: MultiOptionQuotationPackage): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const opt1 = pkg.options[0];
  const opt2 = pkg.options[1];
  const opt3 = pkg.options[2];

  const headers = [
    ['CÔNG TY TNHH BOGI LOGISTICS & FORWARDING'],
    ['BẢNG SO SÁNH ĐA PHƯƠNG ÁN BÁO GIÁ CƯỚC (GOOD - BETTER - BEST COMPARATIVE QUOTATION)'],
    [`Mã gói: ${pkg.packageCode}`, `Báo giá gốc: ${pkg.quoteNumber}`, `Ngày lập: ${pkg.createdDate}`, `Hiệu lực đến: ${pkg.validUntil}`],
    [`Khách hàng: ${pkg.customer?.companyName || (pkg.customer as any)?.customerName || 'Quý Doanh Nghiệp'}`, `Mã số thuế: ${pkg.customer?.taxId || 'N/A'}`],
    [`Tuyến vận chuyển: ${pkg.shipment?.pol || 'N/A'} -> ${pkg.shipment?.pod || 'N/A'}`, `Phương thức: ${pkg.shipment?.mode || 'N/A'}`, `Hàng hóa: ${pkg.cargoSummary}`],
    [`Tỷ giá áp dụng: 1 USD = ${pkg.exchangeRate.toLocaleString()} VND`],
    []
  ];

  const comparisonRows = [
    [
      'TIÊU CHÍ SO SÁNH / SPECIFICATIONS',
      `PHƯƠNG ÁN 1: ${opt1 ? opt1.tierNameVi : 'TIẾT KIỆM'}`,
      `PHƯƠNG ÁN 2: ${opt2 ? opt2.tierNameVi : 'CÂN BẰNG / KHUYÊN DÙNG'} (★ BEST VALUE)`,
      `PHƯƠNG ÁN 3: ${opt3 ? opt3.tierNameVi : 'HỎA TỐC VIP'}`
    ],
    [
      'Định vị & Phân khúc (Tier)',
      opt1?.tierNameEn || '',
      opt1?.tierNameEn || '',
      opt3?.tierNameEn || ''
    ],
    [
      'Hãng vận chuyển (Carrier)',
      opt1?.carrier || '',
      opt2?.carrier || '',
      opt3?.carrier || ''
    ],
    [
      'Dịch vụ & Tuyến đường (Service & Routing)',
      opt1?.serviceType || '',
      opt2?.serviceType || '',
      opt3?.serviceType || ''
    ],
    [
      'Thời gian vận chuyển (Transit Time)',
      opt1 ? `${opt1.transitTimeText} (${opt1.transitDays} ngày)` : '',
      opt2 ? `${opt2.transitTimeText} (${opt2.transitDays} ngày)` : '',
      opt3 ? `${opt3.transitTimeText} (${opt3.transitDays} ngày)` : ''
    ],
    [
      'Lịch khởi hành (Schedule)',
      opt1?.departureSchedule || '',
      opt2?.departureSchedule || '',
      opt3?.departureSchedule || ''
    ],
    [
      'Giờ cắt máng (CY/SI Cut-off)',
      opt1?.closingCutoff || '',
      opt2?.closingCutoff || '',
      opt3?.closingCutoff || ''
    ],
    [
      'Miễn phí lưu cont/bãi (Free Time Dem/Det)',
      opt1?.freeTimeDemDet || '',
      opt2?.freeTimeDemDet || '',
      opt3?.freeTimeDemDet || ''
    ],
    [
      'Cam kết chỗ (Space Guarantee)',
      opt1?.spaceGuarantee || '',
      opt2?.spaceGuarantee || '',
      opt3?.spaceGuarantee || ''
    ],
    [
      'Cước chính quốc tế (Freight USD)',
      opt1 ? `$${formatUSD(opt1.oceanAirFreightUsd)}` : '',
      opt2 ? `$${formatUSD(opt2.oceanAirFreightUsd)}` : '',
      opt3 ? `$${formatUSD(opt3.oceanAirFreightUsd)}` : ''
    ],
    [
      'Phí địa phương (Local Charges VND)',
      opt1 ? formatVND(opt1.localChargesVnd) : '',
      opt2 ? formatVND(opt2.localChargesVnd) : '',
      opt3 ? formatVND(opt3.localChargesVnd) : ''
    ],
    [
      '>>> TỔNG CỘNG QUY ĐỔI (USD) <<<',
      opt1 ? `$${formatUSD(opt1.totalConvertedUsd)}` : '',
      opt2 ? `$${formatUSD(opt2.totalConvertedUsd)}` : '',
      opt3 ? `$${formatUSD(opt3.totalConvertedUsd)}` : ''
    ],
    [
      '>>> TỔNG CỘNG QUY ĐỔI (VND) <<<',
      opt1 ? formatVND(opt1.totalConvertedVnd) : '',
      opt2 ? formatVND(opt2.totalConvertedVnd) : '',
      opt3 ? formatVND(opt3.totalConvertedVnd) : ''
    ],
    [
      'Ưu điểm vượt trội (Key Highlights)',
      opt1?.valueAddHighlights.join('; ') || '',
      opt2?.valueAddHighlights.join('; ') || '',
      opt3?.valueAddHighlights.join('; ') || ''
    ],
    [
      'Dịch vụ đi kèm (Included Services)',
      opt1?.includedServices.join('; ') || '',
      opt2?.includedServices.join('; ') || '',
      opt3?.includedServices.join('; ') || ''
    ],
    [
      'Đối tượng phù hợp nhất (Best Suited For)',
      opt1?.bestSuitedFor || '',
      opt2?.bestSuitedFor || '',
      opt3?.bestSuitedFor || ''
    ],
    [
      'Khuyến nghị từ Chuyên viên Logistics',
      'Thích hợp tối ưu giá vốn',
      '★ ĐỀ XUẤT CHÍNH (Tối ưu 14 ngày Free Time & Tàu đi thẳng)',
      'Thích hợp đơn hàng gấp mùa cao điểm'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...comparisonRows]);

  // Adjust column widths
  ws['!cols'] = [
    { wch: 35 },
    { wch: 35 },
    { wch: 42 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'SoSanhDaPhuongAn');
  XLSX.writeFile(wb, `${pkg.packageCode}_Multi_Option_Comparative_Quotation.xlsx`);
}
