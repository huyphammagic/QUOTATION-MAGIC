import React, { useState, useEffect } from 'react';
import { QuoteData, QuoteCurrency } from '../types/logistics';
import { formatUSD, formatVND, formatNumber, formatExchangeRate } from '../utils/formatters';
import { exportQuoteToPdf } from '../utils/exportPdf';
import { exportQuoteToExcel } from '../utils/exportExcel';
import { X, Printer, FileDown, FileSpreadsheet, Ship, Building2, Coins, Loader2 } from 'lucide-react';

interface QuotePreviewModalProps {
  quote: QuoteData;
  isOpen: boolean;
  onClose: () => void;
  onCurrencyChange?: (currency: QuoteCurrency) => void;
}

export const QuotePreviewModal: React.FC<QuotePreviewModalProps> = ({
  quote,
  isOpen,
  onClose,
  onCurrencyChange,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<QuoteCurrency>(quote.quoteCurrency || 'USD');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportQuoteToPdf(quote, selectedCurrency);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      alert('Không thể tạo file PDF. Vui lòng kiểm tra lại kết nối hoặc font chữ.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    if (quote.quoteCurrency) {
      setSelectedCurrency(quote.quoteCurrency);
    }
  }, [quote.quoteCurrency, isOpen]);

  const handleSelectCurrency = (curr: QuoteCurrency) => {
    setSelectedCurrency(curr);
    onCurrencyChange?.(curr);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isVnd = selectedCurrency === 'VND';

  const locations = ['POL', 'FREIGHT', 'POD', 'OTHER'] as const;
  const locTitleMap = {
    POL: `1. CHI PHÍ ĐẦU XUẤT / CẢNG ĐI (POL CHARGES - ${quote.shipment.pol || 'ORIGIN'})`,
    FREIGHT: `2. CƯỚC VẬN CHUYỂN CHẶNG CHÍNH (MAIN FREIGHT - ${quote.shipment.mode})`,
    POD: `3. CHI PHÍ ĐẦU NHẬP / CẢNG ĐÍCH (POD CHARGES - ${quote.shipment.pod || 'DESTINATION'})`,
    OTHER: '4. DỊCH VỤ CỘNG THÊM & THỦ TỤC KHÁC (OTHER SERVICES)'
  };

  const locBgMap = {
    POL: 'bg-blue-50/70 text-blue-900 border-blue-200',
    FREIGHT: 'bg-cyan-50/70 text-cyan-900 border-cyan-200',
    POD: 'bg-indigo-50/70 text-indigo-900 border-indigo-200',
    OTHER: 'bg-slate-100 text-slate-800 border-slate-300'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Modal Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <Ship className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="font-bold text-sm truncate">Xem Trước Bản Báo Giá Formal (A4 Corporate View)</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Currency Selector */}
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <Coins className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
              <span className="text-[11px] font-medium text-slate-400 px-1">Tiền tệ file:</span>
              <button
                type="button"
                onClick={() => handleSelectCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCurrency === 'USD'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => handleSelectCurrency('VND')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCurrency === 'VND'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ₫ VNĐ
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Ngay</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center space-x-1.5 bg-rose-700 hover:bg-rose-600 disabled:bg-rose-900 disabled:opacity-75 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              title={`Xuất PDF chuẩn Unicode (${selectedCurrency})`}
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPdf ? 'Đang tạo PDF...' : `PDF (${selectedCurrency})`}</span>
            </button>

            <button
              onClick={() => exportQuoteToExcel(quote, selectedCurrency)}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-xs"
              title={`Xuất Excel theo tiền tệ ${selectedCurrency}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel ({selectedCurrency})</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto font-sans text-slate-800 space-y-6 text-xs print:p-0 print:overflow-visible">
          
          {/* 1. Corporate Header */}
          <div className="border-b-2 border-cyan-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-extrabold text-slate-900 text-base sm:text-lg uppercase tracking-tight text-cyan-950 leading-tight">
                    {quote.company.name}
                  </h1>
                  {quote.company.englishName && (
                    <p className="text-slate-500 font-medium text-[11px] italic">{quote.company.englishName}</p>
                  )}
                </div>
              </div>
              <p className="text-slate-600 mt-2"><strong>Trụ sở:</strong> {quote.company.address}</p>
              <p className="text-slate-600">
                <strong>MST:</strong> <span className="font-mono font-bold text-slate-900">{quote.company.taxId}</span> | <strong>Tel:</strong> {quote.company.phone} | <strong>Email:</strong> {quote.company.email}
              </p>
              {quote.company.website && (
                <p className="text-slate-600"><strong>Website:</strong> {quote.company.website}</p>
              )}
            </div>

            <div className="text-left sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200 min-w-[210px]">
              <div className="font-bold text-slate-900 text-sm font-mono">{quote.quoteNumber}</div>
              <div className="text-slate-500 text-[11px]">Ngày tạo: {quote.createdDate}</div>
              <div className="text-amber-700 font-semibold text-[11px]">Hiệu lực đến: {quote.terms.validityDate}</div>
              <div className="text-slate-600 text-[10px] mt-1 pt-1 border-t border-slate-200">
                Tỷ giá: 1 USD = <strong className="font-mono">{formatExchangeRate(quote.exchangeRate)}</strong> VND
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                  isVnd ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                }`}>
                  Đồng tiền: {isVnd ? 'VNĐ (Việt Nam Đồng)' : 'USD (Đô la Mỹ)'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Document Title */}
          <div className="text-center py-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-wide uppercase text-cyan-950">
              BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS & CƯỚC VẬN TẢI
            </h2>
            <p className="text-slate-500 text-xs italic">
              FREIGHT FORWARDING & LOCAL CHARGES QUOTATION ({isVnd ? 'CURRENCY: VND' : 'CURRENCY: USD'})
            </p>
          </div>

          {/* 3. Customer & Shipment 2-Column Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Customer Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-cyan-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                KÍNH GỬI / CUSTOMER
              </div>
              <p className="font-bold text-slate-900">{quote.customer.companyName}</p>
              <p>Người nhận: <span className="font-semibold">{quote.customer.contactPerson || quote.customer.customerName}</span></p>
              <p>MST: <span className="font-mono">{quote.customer.taxId || 'N/A'}</span></p>
              <p>SĐT/Email: {quote.customer.phone} / {quote.customer.email}</p>
              <p>Địa chỉ: {quote.customer.address}</p>
            </div>

            {/* Shipment Route Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-cyan-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                THÔNG TIN LÔ HÀNG / SHIPMENT ROUTE
              </div>
              <p>Hình thức: <span className="font-bold text-slate-900">{quote.shipment.mode} ({quote.shipment.containerType})</span></p>
              <p>POL (Điểm đi): <span className="font-semibold">{quote.shipment.pol}</span></p>
              <p>POD (Điểm đến): <span className="font-semibold">{quote.shipment.pod}</span></p>
              <p>Tên hàng: {quote.shipment.commodity}</p>
              <p>Quy cách: {quote.shipment.quantity} cont / {formatNumber(quote.shipment.grossWeightKg)} KGS / {formatNumber(quote.shipment.volumeCbm)} CBM</p>
            </div>

          </div>

          {/* 4. Line Items Table Grouped By Location */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-800 text-white font-bold text-[11px]">
                  <th className="p-2 border border-slate-600 text-center w-8">STT</th>
                  <th className="p-2 border border-slate-600">Hạng Mục Chi Phí (Description)</th>
                  <th className="p-2 border border-slate-600 text-center w-16">Mã Phí</th>
                  <th className="p-2 border border-slate-600 text-right w-12">SL</th>
                  <th className="p-2 border border-slate-600 text-center w-16">ĐVT</th>
                  <th className="p-2 border border-slate-600 text-right w-24">Đơn Giá Gốc</th>
                  <th className="p-2 border border-slate-600 text-center w-12">Loại</th>
                  <th className="p-2 border border-slate-600 text-center w-12">VAT</th>
                  {isVnd ? (
                    <>
                      <th className="p-2 border border-slate-600 text-right w-28 bg-emerald-900 text-emerald-100">
                        Thành Tiền (VND)
                      </th>
                      <th className="p-2 border border-slate-600 text-right w-24 text-slate-300 font-normal">
                        Quy đổi (USD)
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 border border-slate-600 text-right w-24 bg-cyan-900 text-cyan-100">
                        Thành Tiền (USD)
                      </th>
                      <th className="p-2 border border-slate-600 text-right w-28 text-slate-300 font-normal">
                        Quy đổi (VND)
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {locations.map((locationKey) => {
                  const locItems = quote.items.filter(item => (item.location || 'POL') === locationKey);
                  if (locItems.length === 0) return null;

                  const locSubtotalUsd = locItems.reduce((acc, i) => acc + i.amountUsd, 0);
                  const locSubtotalVnd = locItems.reduce((acc, i) => acc + i.amountVnd, 0);

                  return (
                    <React.Fragment key={locationKey}>
                      {/* Section Header Row */}
                      <tr className={`${locBgMap[locationKey]} font-bold border-y-2`}>
                        <td colSpan={8} className="p-2 border border-slate-300 uppercase tracking-wide">
                          {locTitleMap[locationKey]}
                        </td>
                        {isVnd ? (
                          <>
                            <td className="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-900">
                              {formatVND(locSubtotalVnd)}
                            </td>
                            <td className="p-2 border border-slate-300 text-right font-mono text-slate-500 font-normal">
                              {formatUSD(locSubtotalUsd)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border border-slate-300 text-right font-mono font-bold text-cyan-900">
                              {formatUSD(locSubtotalUsd)}
                            </td>
                            <td className="p-2 border border-slate-300 text-right font-mono text-slate-500 font-normal">
                              {formatVND(locSubtotalVnd)}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Line Items Rows */}
                      {locItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 text-center font-mono">{index + 1}</td>
                          <td className="p-2 border border-slate-200">
                            <div className="font-semibold text-slate-900">{item.description}</div>
                            {item.note && <div className="text-[10px] text-slate-500 italic">{item.note}</div>}
                          </td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold text-cyan-800">{item.code}</td>
                          <td className="p-2 border border-slate-200 text-right font-bold">{item.quantity}</td>
                          <td className="p-2 border border-slate-200 text-center">{item.unit}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">
                            {item.currency === 'USD' ? formatUSD(item.unitPrice) : formatVND(item.unitPrice)}
                          </td>
                          <td className="p-2 border border-slate-200 text-center font-bold">{item.currency}</td>
                          <td className="p-2 border border-slate-200 text-center">{item.vatRate}%</td>
                          {isVnd ? (
                            <>
                              <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900 bg-emerald-50/40">
                                {formatVND(item.amountVnd)}
                              </td>
                              <td className="p-2 border border-slate-200 text-right font-mono text-slate-500">
                                {formatUSD(item.amountUsd)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900 bg-cyan-50/40">
                                {formatUSD(item.amountUsd)}
                              </td>
                              <td className="p-2 border border-slate-200 text-right font-mono text-slate-500">
                                {formatVND(item.amountVnd)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Totals Block */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Cộng tiền hàng (Subtotal):</span>
                <span className="font-semibold font-mono">
                  {isVnd ? `${formatVND(quote.subtotalVnd)} (~${formatUSD(quote.subtotalUsd)})` : `${formatUSD(quote.subtotalUsd)} (~${formatVND(quote.subtotalVnd)})`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tiền thuế VAT:</span>
                <span className="font-semibold font-mono">
                  {isVnd ? `${formatVND(quote.vatTotalVnd)} (~${formatUSD(quote.vatTotalUsd)})` : `${formatUSD(quote.vatTotalUsd)} (~${formatVND(quote.vatTotalVnd)})`}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>TỔNG CỘNG ({isVnd ? 'VNĐ' : 'USD'}):</span>
                <span className={isVnd ? 'text-emerald-800 text-base font-mono' : 'text-cyan-900 text-base font-mono'}>
                  {isVnd ? formatVND(quote.grandTotalVnd) : formatUSD(quote.grandTotalUsd)}
                </span>
              </div>
              <div className="text-right text-slate-500 font-medium text-xs font-mono">
                (Quy đổi tương đương: {isVnd ? formatUSD(quote.grandTotalUsd) : formatVND(quote.grandTotalVnd)})
              </div>
            </div>
          </div>

          {/* 6. Terms & Conditions & Banking */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-slate-700 text-[11px]">
            <p className="font-bold text-slate-900 uppercase">ĐIỀU KHOẢN VÀ QUY ĐỊNH BÁO GIÁ (TERMS & CONDITIONS):</p>
            <p>• Điều kiện giao hàng (Incoterm): <span className="font-bold">{quote.terms.incoterm}</span></p>
            <p>• Điều khoản thanh toán: {quote.terms.paymentTerm}</p>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans text-slate-600">
              {quote.terms.exclusionsNotes}
            </div>
            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200 font-mono text-[10px] text-blue-950">
              <strong>THÔNG TIN TÀI KHOẢN NGÂN HÀNG:</strong><br />
              {quote.terms.bankAccountInfo}
            </div>
          </div>

          {/* 7. Corporate Dual Signature Block */}
          <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs text-center">
            
            {/* Left: Customer Acceptance */}
            <div className="space-y-1">
              <p className="font-bold text-slate-900 uppercase tracking-wide">
                ĐẠI DIỆN KHÁCH HÀNG (CUSTOMER ACCEPTANCE)
              </p>
              <p className="text-slate-400 italic text-[11px]">(Ký tên, đóng dấu & ghi rõ họ tên)</p>
              <div className="h-20 flex items-center justify-center text-slate-300 italic text-[10px]">
                [Chữ ký & Dấu tròn khách hàng]
              </div>
              <p className="font-semibold text-slate-700">
                {quote.customer.contactPerson || quote.customer.customerName || 'Đại diện có thẩm quyền'}
              </p>
              <p className="text-slate-400 text-[10px]">Ngày: ...... / ...... / 202...</p>
            </div>

            {/* Right: Forwarding Company Sign-off */}
            <div className="space-y-1">
              <p className="font-bold text-cyan-950 uppercase tracking-wide">
                ĐẠI DIỆN CÔNG TY BÁO GIÁ (FOR AND ON BEHALF OF)
              </p>
              <p className="text-slate-500 font-medium text-[11px] truncate">
                {quote.company.shortName || quote.company.name}
              </p>
              <div className="h-20 flex items-center justify-center text-blue-300 italic text-[10px]">
                [Chữ ký & Xác nhận của Sales Executive]
              </div>
              <p className="font-bold text-slate-900 text-sm">{quote.company.salesRepName}</p>
              <p className="text-slate-600 text-[11px]">{quote.company.salesRepTitle}</p>
              <p className="text-slate-500 text-[10px]">
                Hotline/Zalo: {quote.company.salesRepPhone} | Email: {quote.company.salesRepEmail}
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
