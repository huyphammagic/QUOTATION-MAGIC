import React from 'react';
import { QuoteData, QuoteStatus } from '../types/logistics';
import { 
  Save, 
  Eye, 
  FileDown, 
  Send, 
  SlidersHorizontal, 
  Sparkles, 
  Check, 
  Layers, 
  FileText, 
  MessageSquare, 
  Building,
  Navigation,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

export type WorkspaceTab = 'DETAILS' | 'TERMS' | 'COMMUNICATION' | 'ALL';

interface QuotationWorkspaceHeaderProps {
  quote: QuoteData;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onSaveQuote: () => void;
  onOpenPreview: () => void;
  onOpenGeneratePdf: () => void;
  onOpenSendModal: () => void;
  onOpenDecisionWorkspace: () => void;
  onOpenSmartAssistant?: () => void;
  isSaving?: boolean;
  lastSavedAt?: string | null;
}

export const QuotationWorkspaceHeader: React.FC<QuotationWorkspaceHeaderProps> = ({
  quote,
  activeTab,
  onTabChange,
  onSaveQuote,
  onOpenPreview,
  onOpenGeneratePdf,
  onOpenSendModal,
  onOpenDecisionWorkspace,
  onOpenSmartAssistant,
  isSaving = false,
  lastSavedAt,
}) => {
  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã duyệt (Approved)
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3 text-blue-600" />
            Đã gửi (Sent)
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Check className="w-3 h-3 text-indigo-600" />
            Chấp thuận (Accepted)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Từ chối (Rejected)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Hết hạn (Expired)
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Chờ duyệt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Bản nháp (Draft)
          </span>
        );
    }
  };

  const customerName = quote.customer.companyName || quote.customer.customerName || 'Khách hàng mới';
  const pol = quote.shipment.pol || quote.shipment.origin || 'POL';
  const pod = quote.shipment.pod || quote.shipment.destination || 'POD';
  const modeText = quote.shipment.mode || 'SEA_FCL';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
      {/* Top summary row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Quote identification */}
        <div className="flex items-center flex-wrap gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mã báo giá:</span>
            <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200">
              {quote.quoteNumber || 'LOG-DRAFT'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {getStatusBadge(quote.status)}

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Quick Context Summary */}
          <div className="flex items-center gap-2 text-xs text-slate-600 truncate max-w-[420px]">
            <span className="font-semibold text-slate-900 truncate" title={customerName}>
              {customerName}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-700 shrink-0">
              {pol} &rarr; {pod}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 shrink-0">{modeText}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 justify-end shrink-0">
          {/* Decision / What-If */}
          <button
            type="button"
            onClick={onOpenDecisionWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Mở Decision Hub & Phân tích kịch bản What-If"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Decision Hub</span>
          </button>

          {/* Preview */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Xem trước mẫu in báo giá"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Xem Trước</span>
          </button>

          {/* Generate PDF */}
          <button
            type="button"
            onClick={onOpenGeneratePdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Xuất file PDF chuyên nghiệp"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={onOpenSendModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Gửi báo giá qua email & tạo link trực tuyến"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Gửi Khách</span>
          </button>

          {/* Primary Save to Cloud button */}
          <button
            type="button"
            onClick={onSaveQuote}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Lưu báo giá lên Firestore Cloud"
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lưu Báo Giá</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segmented View Mode Tabs */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onTabChange('DETAILS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Chi Tiết & Bảng Cước</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('TERMS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'TERMS'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Điều Khoản & Ngân Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('COMMUNICATION')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'COMMUNICATION'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Giao Tiếp & Lịch Sử</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Toàn Bộ Trang</span>
          </button>
        </div>

        {/* Currency and Items count indicators */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{quote.items.length} hạng mục cước</span>
          <span className="text-slate-300">·</span>
          <span>Đơn vị: <strong className="text-slate-800">{quote.quoteCurrency || 'USD'}</strong></span>
          {quote.terms.validityDate && (
            <>
              <span className="text-slate-300">·</span>
              <span>Hiệu lực: {quote.terms.validityDate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
