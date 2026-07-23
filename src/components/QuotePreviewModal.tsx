import React from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND, formatNumber } from '../utils/formatters';
import { exportQuoteToPdf } from '../utils/exportPdf';
import { exportQuoteToExcel } from '../utils/exportExcel';
import { X, Printer, FileDown, FileSpreadsheet, Ship } from 'lucide-react';

interface QuotePreviewModalProps {
  quote: QuoteData;
  isOpen: boolean;
  onClose: () => void;
}

export const QuotePreviewModal: React.FC<QuotePreviewModalProps> = ({ quote, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Modal Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <Ship className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-sm">Xem Trước Bản Báo Giá Formal (A4 Corporate View)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Ngay</span>
            </button>

            <button
              onClick={() => exportQuoteToPdf(quote)}
              className="flex items-center space-x-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => exportQuoteToExcel(quote)}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto font-sans text-slate-800 space-y-6 text-xs print:p-0 print:overflow-visible">
          
          {/* 1. Corporate Header */}
          <div className="border-b-2 border-cyan-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight text-cyan-900">
                {quote.company.name}
              </h1>
              <p className="text-slate-500 font-medium text-[11px]">{quote.company.englishName}</p>
              <p className="text-slate-600 mt-1">ĐC: {quote.company.address}</p>
              <p className="text-slate-600">
                MST: <span className="font-mono font-semibold">{quote.company.taxId}</span> | Tel: {quote.company.phone} | Email: {quote.company.email}
              </p>
              <p className="text-slate-600">Website: {quote.company.website}</p>
            </div>

            <div className="text-left sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200 min-w-[200px]">
              <div className="font-bold text-slate-900 text-sm">{quote.quoteNumber}</div>
              <div className="text-slate-500 text-[11px]">Ngày tạo: {quote.createdDate}</div>
              <div className="text-amber-700 font-semibold text-[11px]">Hiệu lực: {quote.terms.validityDate}</div>
              <div className="text-slate-500 text-[10px] mt-1">Ex.Rate: 1 USD = {formatNumber(quote.exchangeRate)} VND</div>
            </div>
          </div>

          {/* 2. Document Title */}
          <div className="text-center py-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-wide uppercase">
              BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS & CƯỚC VẬN TẢI
            </h2>
            <p className="text-slate-500 text-xs italic">FREIGHT FORWARDING & LOCAL CHARGES QUOTATION</p>
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

          {/* 4. Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px]">
                  <th className="p-2 border border-slate-300 text-center w-8">#</th>
                  <th className="p-2 border border-slate-300">Diễn giải hạng mục / Phụ phí</th>
                  <th className="p-2 border border-slate-300 text-center">Mã</th>
                  <th className="p-2 border border-slate-300 text-right">SL</th>
                  <th className="p-2 border border-slate-300 text-center">Đơn vị</th>
                  <th className="p-2 border border-slate-300 text-right">Đơn giá</th>
                  <th className="p-2 border border-slate-300 text-center">Loại tiền</th>
                  <th className="p-2 border border-slate-300 text-center">VAT</th>
                  <th className="p-2 border border-slate-300 text-right">Thành tiền (USD)</th>
                  <th className="p-2 border border-slate-300 text-right">Thành tiền (VND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quote.items.map((item, index) => (
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
                    <td className="p-2 border border-slate-200 text-right font-mono font-semibold">{formatUSD(item.amountUsd)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-semibold">{formatVND(item.amountVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Totals Block */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Cộng tiền hàng (Subtotal):</span>
                <span className="font-semibold">{formatUSD(quote.subtotalUsd)} / {formatVND(quote.subtotalVnd)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tiền thuế VAT:</span>
                <span className="font-semibold">{formatUSD(quote.vatTotalUsd)} / {formatVND(quote.vatTotalVnd)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>TỔNG CỘNG THANH TOÁN:</span>
                <span className="text-cyan-900">{formatUSD(quote.grandTotalUsd)}</span>
              </div>
              <div className="text-right text-emerald-700 font-extrabold text-xs">
                ({formatVND(quote.grandTotalVnd)})
              </div>
            </div>
          </div>

          {/* 6. Terms & Conditions */}
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

          {/* 7. Signatures & Stamp */}
          <div className="pt-8 grid grid-cols-2 text-center gap-8">
            <div className="space-y-16">
              <div>
                <p className="font-bold text-slate-900 uppercase">ĐẠI DIỆN KHÁCH HÀNG</p>
                <p className="text-slate-500 text-[10px]">(Ký, ghi rõ họ tên & đóng dấu)</p>
              </div>
              <div className="text-slate-400 italic">________________________</div>
            </div>

            <div className="space-y-12">
              <div>
                <p className="font-bold text-slate-900 uppercase">CÔNG TY LOGISTICS & VẬN TẢI QUỐC TẾ</p>
                <p className="text-slate-500 text-[10px]">(Đại diện Phòng Kinh Doanh / Pricing)</p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-sm">{quote.company.salesRepName}</div>
                <div className="text-slate-500 text-xs">{quote.company.salesRepTitle}</div>
                <div className="text-cyan-800 text-xs font-mono">{quote.company.salesRepPhone}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
