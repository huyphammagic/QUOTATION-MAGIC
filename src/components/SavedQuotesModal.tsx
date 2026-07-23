import React, { useState } from 'react';
import { QuoteData, QuoteStatus } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { exportQuoteToPdf } from '../utils/exportPdf';
import { exportQuoteToExcel } from '../utils/exportExcel';
import { X, Search, FileText, Copy, Trash2, Edit3, FileDown, FileSpreadsheet } from 'lucide-react';

interface SavedQuotesModalProps {
  quotes: QuoteData[];
  isOpen: boolean;
  onClose: () => void;
  onSelectQuote: (quote: QuoteData) => void;
  onCloneQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
}

export const SavedQuotesModal: React.FC<SavedQuotesModalProps> = ({
  quotes,
  isOpen,
  onClose,
  onSelectQuote,
  onCloneQuote,
  onDeleteQuote,
  onUpdateStatus
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = quotes.filter((q) => {
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.shipment.pol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.shipment.pod.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'DRAFT': return <span className="bg-slate-100 text-slate-800 border-slate-300 border px-2 py-0.5 rounded-full text-[10px] font-bold">DRAFT</span>;
      case 'SENT': return <span className="bg-blue-100 text-blue-800 border-blue-300 border px-2 py-0.5 rounded-full text-[10px] font-bold">SENT</span>;
      case 'ACCEPTED': return <span className="bg-emerald-100 text-emerald-800 border-emerald-300 border px-2 py-0.5 rounded-full text-[10px] font-bold">ACCEPTED</span>;
      case 'REJECTED': return <span className="bg-rose-100 text-rose-800 border-rose-300 border px-2 py-0.5 rounded-full text-[10px] font-bold">REJECTED</span>;
      case 'EXPIRED': return <span className="bg-amber-100 text-amber-800 border-amber-300 border px-2 py-0.5 rounded-full text-[10px] font-bold">EXPIRED</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-700" />
            <h3 className="font-bold text-slate-900 text-base">Danh Sách Báo Giá Đã Lưu ({quotes.length})</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã báo giá, Tên công ty, Cảng..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 text-xs overflow-x-auto w-full sm:w-auto">
            {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'TẤT CẢ' : st}
              </button>
            ))}
          </div>

        </div>

        {/* Quotes Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                <th className="p-2.5">Mã Báo Giá</th>
                <th className="p-2.5">Khách Hàng / Doanh Nghiệp</th>
                <th className="p-2.5">Tuyến Đường & Hình Thức</th>
                <th className="p-2.5 text-right">Tổng Tiền (USD)</th>
                <th className="p-2.5 text-right">Tổng Tiền (VND)</th>
                <th className="p-2.5 text-center">Trạng Thái</th>
                <th className="p-2.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* Quote Number & Date */}
                  <td className="p-2.5 font-mono font-bold text-cyan-900">
                    <div>{quote.quoteNumber}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{quote.createdDate}</div>
                  </td>

                  {/* Customer */}
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900 truncate max-w-[200px]">{quote.customer.companyName || 'N/A'}</div>
                    <div className="text-[11px] text-slate-500">{quote.customer.contactPerson || quote.customer.customerName}</div>
                  </td>

                  {/* Route */}
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-800 text-[11px]">{quote.shipment.mode} ({quote.shipment.containerType})</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                      {quote.shipment.pol} ➔ {quote.shipment.pod}
                    </div>
                  </td>

                  {/* Amount USD */}
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {formatUSD(quote.grandTotalUsd)}
                  </td>

                  {/* Amount VND */}
                  <td className="p-2.5 text-right font-mono font-semibold text-slate-700">
                    {formatVND(quote.grandTotalVnd)}
                  </td>

                  {/* Status Badge */}
                  <td className="p-2.5 text-center">
                    <select
                      value={quote.status}
                      onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)}
                      className="text-[10px] font-bold rounded-lg border border-slate-300 p-1 bg-white focus:outline-none"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="SENT">SENT</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      
                      {/* Load / Edit */}
                      <button
                        onClick={() => { onSelectQuote(quote); onClose(); }}
                        className="p-1.5 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Mở Báo Giá Để Sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Clone */}
                      <button
                        onClick={() => onCloneQuote(quote.id)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Nhân Bản Báo Giá"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Export PDF */}
                      <button
                        onClick={() => exportQuoteToPdf(quote)}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Tải PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      {/* Export Excel */}
                      <button
                        onClick={() => exportQuoteToExcel(quote)}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Tải Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa báo giá ${quote.quoteNumber}?`)) {
                            onDeleteQuote(quote.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa Báo Giá"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  </td>

                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy báo giá nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
