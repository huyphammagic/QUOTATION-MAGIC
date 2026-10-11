import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  FileText,
  Plus,
  Trash2,
  FileDown,
  FileSpreadsheet,
  Eye,
  CreditCard,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { DebitNoteRecord, DebitNoteStatus } from '../../types/debitNote';
import { DebitNoteService } from '../../services/debitNote/debitNoteService';
import { exportDebitNotePdf } from '../../utils/exportDebitNotePdf';
import { exportDebitNoteExcel } from '../../utils/exportDebitNoteExcel';
import { formatUSD, formatVND } from '../../utils/formatters';

interface DebitNoteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: QuoteData[];
  onOpenDebitNoteForQuote: (quote: QuoteData) => void;
  onOpenPaymentHub?: (quoteId: string) => void;
}

export const DebitNoteManagementModal: React.FC<DebitNoteManagementModalProps> = ({
  isOpen,
  onClose,
  quotes,
  onOpenDebitNoteForQuote,
  onOpenPaymentHub
}) => {
  const [allDebitNotes, setAllDebitNotes] = useState<DebitNoteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DebitNoteStatus>('ALL');

  useEffect(() => {
    if (isOpen) {
      setAllDebitNotes(DebitNoteService.getAllDebitNotes());
    }
  }, [isOpen]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allDebitNotes.filter(dn => {
      const matchSearch = !q ||
        dn.debitNoteNumber.toLowerCase().includes(q) ||
        dn.quotationNumber.toLowerCase().includes(q) ||
        (dn.customer.companyName || '').toLowerCase().includes(q) ||
        (dn.customer.customerName || '').toLowerCase().includes(q) ||
        (dn.shipment.blNumber || '').toLowerCase().includes(q) ||
        (dn.shipment.pol || '').toLowerCase().includes(q) ||
        (dn.shipment.pod || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || dn.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allDebitNotes, searchQuery, statusFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa Debit Note này?')) {
      DebitNoteService.deleteDebitNote(id);
      setAllDebitNotes(DebitNoteService.getAllDebitNotes());
    }
  };

  const handleOpenForQuoteId = (quotationId: string) => {
    const matchedQuote = quotes.find(q => q.id === quotationId || q.quoteNumber === quotationId);
    if (matchedQuote) {
      onOpenDebitNoteForQuote(matchedQuote);
      onClose();
    } else {
      alert(`Không tìm thấy dữ liệu gốc của báo giá ${quotationId}.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                TRUNG TÂM QUẢN LÝ DEBIT NOTE (GIẤY BÁO NỢ)
              </h2>
              <p className="text-xs text-slate-400">
                Theo dõi tất cả Debit Note phát hành theo từng báo giá khách hàng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo số D/N, Báo giá, Khách hàng, B/L..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái ({allDebitNotes.length})</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="ISSUED">Đã phát hành (Issued)</option>
              <option value="SENT">Đã gửi khách (Sent)</option>
              <option value="PAID">Đã thanh toán (Paid)</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredList.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">Chưa có Debit Note nào phù hợp</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Bạn có thể tạo Debit Note trực tiếp từ từng Báo giá trong Danh sách Báo Giá hoặc trong Bảng Cước.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((dn) => (
                <div
                  key={dn.id}
                  onClick={() => handleOpenForQuoteId(dn.quotationId)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-blue-950">{dn.debitNoteNumber}</span>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs font-semibold text-slate-700">Báo giá: {dn.quotationNumber}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        dn.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        dn.status === 'SENT' ? 'bg-cyan-100 text-cyan-800' :
                        dn.status === 'ISSUED' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {dn.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800">
                      {dn.customer.companyName || dn.customer.customerName}
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Tuyến: <strong>{dn.shipment.pol} &rarr; {dn.shipment.pod}</strong></span>
                      {dn.shipment.blNumber && <span>B/L: <strong>{dn.shipment.blNumber}</strong></span>}
                      <span>Ngày lập: {dn.issueDate}</span>
                      <span>Hạn: <strong className="text-rose-600">{dn.dueDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Tổng tiền thanh toán</div>
                      <div className="text-base font-black text-rose-600">
                        {dn.finalCurrency === 'USD' ? formatUSD(dn.finalAmountToPay) : formatVND(dn.finalAmountToPay)} {dn.finalCurrency}
                      </div>
                      <div className="text-[10px] text-slate-400">{dn.items.length} hạng mục phí</div>
                    </div>

                    <div className="flex items-center space-x-1 pl-3 border-l border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportDebitNotePdf(dn); }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Tải PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); exportDebitNoteExcel(dn); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Tải Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(dn.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa Debit Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Tổng số: <strong>{filteredList.length}</strong> Debit Note</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
