import React, { useState, useEffect, useMemo } from 'react';
import { QuoteData, QuoteStatus } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { exportQuoteToPdf } from '../utils/exportPdf';
import { exportQuoteToExcel } from '../utils/exportExcel';
import { 
  X, Search, FileText, Copy, Trash2, Edit3, FileDown, FileSpreadsheet, 
  ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, Sparkles, 
  CreditCard, Receipt, LayoutGrid, Table as TableIcon, Ship, Plane, 
  Truck, ArrowRight, CheckCircle2, AlertCircle, Clock, Send, TrendingUp, DollarSign
} from 'lucide-react';
import { FolderFullscreenHeader } from './tables/TableFullscreenHeader';
import { PaymentStatusBadge } from './payment/PaymentStatusBadge';

interface SavedQuotesModalProps {
  quotes: QuoteData[];
  isOpen: boolean;
  onClose: () => void;
  onSelectQuote: (quote: QuoteData) => void;
  onCloneQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
  initialStatusFilter?: string;
  onOpenDecisionWorkspace?: (quote: QuoteData) => void;
  onOpenDealCloser?: (quote: QuoteData) => void;
  onOpenQuotationPayments?: (quoteId: string) => void;
  onOpenDebitNote?: (quote: QuoteData) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onNavigateToTable?: (targetTableId: string) => void;
}

export const SavedQuotesModal: React.FC<SavedQuotesModalProps> = ({
  quotes,
  isOpen,
  onClose,
  onSelectQuote,
  onCloneQuote,
  onDeleteQuote,
  onUpdateStatus,
  initialStatusFilter = 'ALL',
  onOpenDecisionWorkspace,
  onOpenDealCloser,
  onOpenQuotationPayments,
  onOpenDebitNote,
  isFullscreen,
  onToggleFullscreen,
  onNavigateToTable,
}) => {
  const [localFullscreen, setLocalFullscreen] = useState(true);
  const effectiveFullscreen = isFullscreen !== undefined ? isFullscreen : localFullscreen;
  const handleToggleFs = onToggleFullscreen || (() => setLocalFullscreen(!localFullscreen));

  // View Mode: 'CARDS' (Visual Folder View) by default as requested ("chứ không phải dạng bảng"), toggleable to 'TABLE'
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);

  const handleExportPdf = async (quote: QuoteData) => {
    setExportingPdfId(quote.id);
    try {
      await exportQuoteToPdf(quote);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      alert('Không thể tạo file PDF. Vui lòng thử lại.');
    } finally {
      setExportingPdfId(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setStatusFilter(initialStatusFilter || 'ALL');
      setCurrentPage(1);
    }
  }, [isOpen, initialStatusFilter]);

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

  // Overall Statistics for the folder overview
  const stats = useMemo(() => {
    const total = quotes.length;
    let totalUsd = 0;
    let totalVnd = 0;
    let accepted = 0;
    let pending = 0;
    let drafts = 0;

    for (const q of quotes) {
      totalUsd += q.grandTotalUsd || 0;
      totalVnd += q.grandTotalVnd || 0;
      if (q.status === 'ACCEPTED') accepted++;
      else if (q.status === 'PENDING_APPROVAL') pending++;
      else if (q.status === 'DRAFT') drafts++;
    }

    const winRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return { total, totalUsd, totalVnd, accepted, pending, drafts, winRate };
  }, [quotes]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    return quotes.filter((q) => {
      const matchesSearch = !term ||
        q.quoteNumber.toLowerCase().includes(term) ||
        (q.customer?.companyName || '').toLowerCase().includes(term) ||
        (q.customer?.customerName || '').toLowerCase().includes(term) ||
        (q.shipment?.pol || '').toLowerCase().includes(term) ||
        (q.shipment?.pod || '').toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
      const matchesMode = modeFilter === 'ALL' || q.shipment?.mode === modeFilter;
      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [quotes, debouncedSearch, statusFilter, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'DRAFT': return <span className="bg-slate-100 text-slate-800 border-slate-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">BẢN NHÁP</span>;
      case 'PENDING_APPROVAL': return <span className="bg-amber-100 text-amber-800 border-amber-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">CHỜ DUYỆT</span>;
      case 'SENT': return <span className="bg-blue-100 text-blue-800 border-blue-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">ĐÃ GỬI KH</span>;
      case 'ACCEPTED': return <span className="bg-emerald-100 text-emerald-800 border-emerald-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">ĐÃ CHẤP NHẬN</span>;
      case 'REJECTED': return <span className="bg-rose-100 text-rose-800 border-rose-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">TỪ CHỐI</span>;
      case 'EXPIRED': return <span className="bg-amber-100 text-amber-800 border-amber-300 border px-2.5 py-0.5 rounded-full text-[10px] font-bold">HẾT HẠN</span>;
      default: return null;
    }
  };

  const getModeIcon = (mode?: string) => {
    if (!mode) return <Ship className="w-3.5 h-3.5 text-blue-500" />;
    if (mode.includes('AIR')) return <Plane className="w-3.5 h-3.5 text-sky-500" />;
    if (mode.includes('TRUCK') || mode.includes('INLAND')) return <Truck className="w-3.5 h-3.5 text-amber-500" />;
    return <Ship className="w-3.5 h-3.5 text-blue-500" />;
  };

  if (!isOpen) return null;

  return (
    <div 
      className={effectiveFullscreen 
        ? "fixed inset-0 z-50 bg-slate-950 flex flex-col p-0 m-0 w-screen h-screen overflow-hidden"
        : "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      }
      onClick={(e) => {
        if (!effectiveFullscreen && e.target === e.currentTarget) {
          onClose();
        }
      }}
      id="modal-saved-quotes-backdrop"
    >
      <div 
        className={effectiveFullscreen
          ? "bg-slate-50 text-slate-900 w-screen h-screen max-w-none max-h-none rounded-none flex flex-col border-0 overflow-hidden"
          : "bg-slate-50 text-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
        id="modal-saved-quotes-container"
      >
        {/* Fullscreen Folder Navigation & Dedicated URL Header */}
        <FolderFullscreenHeader
          folderName="Thư Mục Báo Giá Khách Hàng"
          folderCategory="Báo Giá & CRM"
          recordCount={quotes.length}
          folderId="quotations"
          routeId="quotations_all"
          isFullscreen={effectiveFullscreen}
          onToggleFullscreen={handleToggleFs}
          onClose={onClose}
          onNavigateToFolder={onNavigateToTable}
          actions={
            <div className="flex items-center gap-1.5 mr-2">
              {/* View Switcher: Dạng Thẻ Thư Mục vs Dạng Bảng */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('CARDS')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    viewMode === 'CARDS'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Xem ở chế độ Thẻ hồ sơ trực quan (Mặc định)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dạng Thẻ Thư Mục</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Chuyển sang chế độ xem Bảng dữ liệu chi tiết"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dạng Bảng</span>
                </button>
              </div>
            </div>
          }
        />

        {/* Top Folder KPI Overview Banner */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Tổng Hồ Sơ Báo Giá</span>
                <FileText className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-slate-900">{stats.total}</span>
                <span className="text-[10px] text-slate-500">đơn</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Tổng Doanh Thu Báo Giá</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-emerald-600 font-mono">{formatUSD(stats.totalUsd)}</span>
                <span className="text-[10px] text-slate-400 hidden xl:inline">({formatVND(stats.totalVnd)})</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Đã Chốt & Tỷ Lệ Thắng</span>
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-indigo-600">{stats.accepted}</span>
                <span className="text-[11px] font-semibold text-emerald-600">({stats.winRate}%)</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Chờ Duyệt & Nháp</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-amber-600">{stats.pending}</span>
                <span className="text-[11px] text-slate-500">chờ duyệt · {stats.drafts} nháp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between shrink-0">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã báo giá, Doanh nghiệp, Cảng đi/đến..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Status & Mode Filter Chips */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs w-full md:w-auto">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Lọc:</span>
            {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'TẤT CẢ' : st === 'PENDING_APPROVAL' ? 'CHỜ DUYỆT' : st}
              </button>
            ))}
          </div>

        </div>

        {/* MAIN CONTENT AREA: Visual Cards or Detailed Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {paginatedQuotes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <div className="font-semibold text-slate-700">Không tìm thấy báo giá phù hợp</div>
              <div className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</div>
            </div>
          ) : viewMode === 'CARDS' ? (
            /* VISUAL FOLDER VIEW (Dạng Thẻ Hồ Sơ Trực Quan) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedQuotes.map((quote) => (
                <div 
                  key={quote.id} 
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-indigo-400/60 transition-all flex flex-col justify-between group"
                >
                  {/* Card Header: Quote Number, Date & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono font-bold text-indigo-900 text-sm tracking-tight block">
                          {quote.quoteNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {quote.createdDate}
                        </span>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-1.5">
                        <select
                          value={quote.status}
                          onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)}
                          className="text-[10px] font-bold rounded-lg border border-slate-200 p-1 bg-slate-50 text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="DRAFT">Bản nháp</option>
                          <option value="PENDING_APPROVAL">Chờ duyệt</option>
                          <option value="SENT">Đã gửi KH</option>
                          <option value="ACCEPTED">Đã chấp nhận</option>
                          <option value="REJECTED">Từ chối</option>
                          <option value="EXPIRED">Hết hạn</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="pt-3 pb-2">
                      <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Khách Hàng</div>
                      <div className="font-bold text-slate-900 text-sm truncate mt-0.5" title={quote.customer?.companyName || ''}>
                        {quote.customer?.companyName || 'Khách hàng chưa định danh'}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {quote.customer?.contactPerson || quote.customer?.customerName || 'Chưa có người liên hệ'}
                        {quote.customer?.phone ? ` · ${quote.customer.phone}` : ''}
                      </div>
                    </div>

                    {/* Route Info with transport icon */}
                    <div className="bg-slate-50 rounded-xl p-2.5 my-2 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          {getModeIcon(quote.shipment?.mode)}
                          <span>{quote.shipment?.mode || 'Vận tải'}</span>
                        </div>
                        {quote.shipment?.containerType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                            {quote.shipment.containerType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1.5">
                        <span className="truncate max-w-[120px]" title={quote.shipment?.pol}>{quote.shipment?.pol || 'Cảng đi'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]" title={quote.shipment?.pod}>{quote.shipment?.pod || 'Cảng đến'}</span>
                      </div>
                    </div>

                    {/* Financial Total */}
                    <div className="pt-1 pb-3 flex items-baseline justify-between border-b border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Tổng cước:</span>
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-indigo-700">
                          {formatUSD(quote.grandTotalUsd)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {formatVND(quote.grandTotalVnd)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectQuote(quote)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Xem & Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCloneQuote(quote.id)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Nhân bản báo giá"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={exportingPdfId === quote.id}
                      onClick={() => handleExportPdf(quote)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                      title="In / Xuất PDF"
                    >
                      {exportingPdfId === quote.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {onOpenQuotationPayments && (
                      <button
                        type="button"
                        onClick={() => onOpenQuotationPayments(quote.id)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-emerald-600 transition-colors cursor-pointer"
                        title="Thu nợ & Đối chiếu thanh toán"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onOpenDebitNote && (
                      <button
                        type="button"
                        onClick={() => onOpenDebitNote(quote)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-amber-600 transition-colors cursor-pointer"
                        title="Tạo Giấy Báo Nợ (Debit Note)"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa báo giá ${quote.quoteNumber}?`)) {
                          onDeleteQuote(quote.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                      title="Xóa báo giá"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DETAILED SPREADSHEET TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                    <th className="p-3">Mã Báo Giá</th>
                    <th className="p-3">Khách Hàng / Doanh Nghiệp</th>
                    <th className="p-3">Tuyến Đường & Hình Thức</th>
                    <th className="p-3 text-right">Tổng Tiền (USD)</th>
                    <th className="p-3 text-right">Tổng Tiền (VND)</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-900">
                        <div>{quote.quoteNumber}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{quote.createdDate}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">{quote.customer?.companyName || 'N/A'}</div>
                        <div className="text-[11px] text-slate-500">{quote.customer?.contactPerson || quote.customer?.customerName}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                          {getModeIcon(quote.shipment?.mode)}
                          <span>{quote.shipment?.mode} ({quote.shipment?.containerType})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                          {quote.shipment?.pol} ➔ {quote.shipment?.pod}
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatUSD(quote.grandTotalUsd)}
                      </td>

                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {formatVND(quote.grandTotalVnd)}
                      </td>

                      <td className="p-3 text-center">
                        <select
                          value={quote.status}
                          onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)}
                          className="text-[10px] font-bold rounded-lg border border-slate-300 p-1 bg-white focus:outline-none mb-1 cursor-pointer"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="PENDING_APPROVAL">PENDING</option>
                          <option value="SENT">SENT</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="EXPIRED">EXPIRED</option>
                        </select>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => onSelectQuote(quote)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Xem chi tiết báo giá"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCloneQuote(quote.id)}
                            className="p-1 rounded text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Nhân bản"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={exportingPdfId === quote.id}
                            onClick={() => handleExportPdf(quote)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                            title="Xuất file PDF"
                          >
                            {exportingPdfId === quote.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa báo giá ${quote.quoteNumber}?`)) {
                                onDeleteQuote(quote.id);
                              }
                            }}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa báo giá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          {filtered.length > 0 ? (
            <>
              <div className="flex items-center space-x-3">
                <span>Hiển thị <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> trong tổng số <strong>{filtered.length}</strong> báo giá</span>
                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
                  <span>Số mục/trang:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 font-medium"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500">Trang {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 cursor-pointer"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-3 px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-slate-400 italic">Tổng cộng 0 báo giá</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
