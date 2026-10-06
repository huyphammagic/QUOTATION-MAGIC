import React, { useState, useRef, useEffect } from 'react';
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
  CheckCircle2,
  Clock,
  RotateCcw,
  Inbox,
  Swords,
  UserCheck,
  Flame,
  Anchor,
  Scale,
  Building2,
  Dna,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Zap,
  Copy,
  CreditCard
} from 'lucide-react';
import { PaymentStatusBadge } from './payment/PaymentStatusBadge';

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
  onOpenDealCloser?: () => void;
  onOpenRfqInbox?: () => void;
  onOpenCompetitorRadar?: () => void;
  onOpenCustomerReengagement?: () => void;
  onOpenValiditySurcharge?: () => void;
  onOpenDemDetPort?: () => void;
  onOpenGoldenHourRadar?: () => void;
  onOpenConcessionGuard?: () => void;
  onOpenEnterpriseTender?: () => void;
  onOpenCustomerDna?: () => void;
  onOpenCarrierInvoiceAudit?: () => void;
  onOpenQuotationPayments?: () => void;
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
  onOpenDealCloser,
  onOpenRfqInbox,
  onOpenCompetitorRadar,
  onOpenCustomerReengagement,
  onOpenValiditySurcharge,
  onOpenDemDetPort,
  onOpenGoldenHourRadar,
  onOpenConcessionGuard,
  onOpenEnterpriseTender,
  onOpenCustomerDna,
  onOpenCarrierInvoiceAudit,
  onOpenQuotationPayments,
  isSaving = false,
  lastSavedAt,
}) => {
  const [isRadarDropdownOpen, setIsRadarDropdownOpen] = useState(false);
  const [copiedQuoteNumber, setCopiedQuoteNumber] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRadarDropdownOpen(false);
      }
    };
    if (isRadarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRadarDropdownOpen]);

  const handleCopyQuoteNumber = () => {
    if (quote.quoteNumber) {
      navigator.clipboard.writeText(quote.quoteNumber);
      setCopiedQuoteNumber(true);
      setTimeout(() => setCopiedQuoteNumber(false), 2000);
    }
  };

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã duyệt (Approved)
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Đã gửi (Sent)
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Chấp thuận (Accepted)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Từ chối (Rejected)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Hết hạn (Expired)
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Chờ duyệt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3 transition-colors">
      
      {/* Top Header Row: Identity & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Metadata & Quote Identity */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          
          {/* Quote Number with 1-click copy */}
          <button
            type="button"
            onClick={handleCopyQuoteNumber}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer group"
            title="Click để sao chép mã báo giá"
          >
            <span>{quote.quoteNumber || 'LOG-DRAFT'}</span>
            {copiedQuoteNumber ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            )}
          </button>

          <span className="text-slate-300 dark:text-slate-700">·</span>

          {getStatusBadge(quote.status)}

          {/* Phase 66: Quotation Payment & Receivable Status Badge */}
          <PaymentStatusBadge
            status={quote.paymentStatus || 'UNPAID'}
            outstandingBalanceUsd={quote.outstandingBalanceUsd}
            showAmount={quote.outstandingBalanceUsd !== undefined && quote.outstandingBalanceUsd > 0}
            size="sm"
            onClick={onOpenQuotationPayments}
          />

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>

          {/* Customer & Route Indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[360px]">
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1" title={customerName}>
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {customerName}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 shrink-0">
              {pol} &rarr; {pod}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">·</span>
            <span className="text-slate-500 dark:text-slate-400 hidden md:inline">{modeText}</span>
          </div>

          {/* Auto-save status */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 ml-1">
            {isSaving ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin text-indigo-500" />
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Đang lưu...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{lastSavedAt ? `Đã lưu ${lastSavedAt.split('T')[1]?.slice(0, 5) || 'gần đây'}` : 'Đã lưu trên mây'}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Streamlined Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          
          {/* Quick Highlight 1: DNA & Power Map Quick Access */}
          {onOpenCustomerDna && (
            <button
              type="button"
              onClick={onOpenCustomerDna}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 rounded-xl shadow-2xs btn-tactile cursor-pointer transition"
              title="Trung Tâm Giải Mã Khách Hàng 360° (Customer Logistics DNA & Power Map)"
            >
              <Dna className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>DNA & Power Map</span>
            </button>
          )}

          {/* Quick Highlight 2: Golden Hour Quick Access */}
          {onOpenGoldenHourRadar && (
            <button
              type="button"
              onClick={onOpenGoldenHourRadar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl shadow-2xs btn-tactile cursor-pointer transition"
              title="Bắt Nhịp Giờ Vàng Chốt Đơn & Gọi Điện Khách Đang Đọc Giá"
            >
              <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
              <span>Giờ Vàng 🔥</span>
            </button>
          )}

          {/* Quick Highlight 3: Payment & Receivable Hub */}
          {onOpenQuotationPayments && (
            <button
              type="button"
              onClick={onOpenQuotationPayments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs btn-tactile cursor-pointer transition"
              title="Trung Tâm Kiểm Soát Thanh Toán & Thu Hồi Công Nợ Báo Giá"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Thu Nợ & Thanh Toán</span>
            </button>
          )}

          {/* UNIFIED SALES INTELLIGENCE & RADAR DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsRadarDropdownOpen(!isRadarDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-2xs btn-tactile cursor-pointer transition"
              title="Mở toàn bộ công cụ Radar & Trợ Lý Bán Hàng AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Trợ Lý & Radar AI</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isRadarDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isRadarDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2.5 dropdown-popover space-y-2">
                
                {/* Section 1: Customer Insight */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thấu Hiểu Khách Hàng (KYS 360°)
                  </div>

                  {onOpenCustomerDna && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCustomerDna();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                          <Dna className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Customer DNA & Power Map</div>
                          <div className="text-[10px] text-slate-400">Bóc tách gen logistics & sơ đồ quyền lực</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenGoldenHourRadar && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGoldenHourRadar();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                          <Flame className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Giờ Vàng Chốt Đơn</div>
                          <div className="text-[10px] text-slate-400">Bắt nhịp khách đang xem báo giá</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenCustomerReengagement && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCustomerReengagement();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Đánh Thức Khách Cũ</div>
                          <div className="text-[10px] text-slate-400">Khách trễ chu kỳ xuất khẩu</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* Section 2: Deals & Negotiation */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Đàm Phán & Đấu Thầu (Negotiation)
                  </div>

                  {onOpenEnterpriseTender && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenEnterpriseTender();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Đấu Thầu Nhà Máy (Tender)</div>
                          <div className="text-[10px] text-slate-400">Ma trận nhiều tuyến quy mô lớn</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenConcessionGuard && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenConcessionGuard();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                          <Scale className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Đổi Trác & Sàn Lợi Nhuận</div>
                          <div className="text-[10px] text-slate-400">Đổi điều khoản khi khách ép giảm giá</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenCompetitorRadar && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCompetitorRadar();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                          <Swords className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Radar Giá Đối Thủ (P50)</div>
                          <div className="text-[10px] text-slate-400">Dự báo điểm ngọt chốt đơn Win-Rate</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenDealCloser && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDealCloser();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Chốt Deal Tốc Độ (Gói B)</div>
                          <div className="text-[10px] text-slate-400">Kịch bản bám đuổi & chốt hạ</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* Section 3: Market & Operation Risks */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thị Trường & Rủi Ro (Market Risks)
                  </div>

                  {onOpenValiditySurcharge && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenValiditySurcharge();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                          <Flame className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Hiệu Lực & Phụ Phí GRI</div>
                          <div className="text-[10px] text-slate-400">Cảnh báo hết hạn & biến động phụ phí</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenDemDetPort && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDemDetPort();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                          <Anchor className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Bộ Tính DEM/DET & Cảng</div>
                          <div className="text-[10px] text-slate-400">Phí phạt lưu bãi & kẹt cảng</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenCarrierInvoiceAudit && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCarrierInvoiceAudit();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Đối Soát Cước & Chặn Rò Rỉ</div>
                          <div className="text-[10px] text-slate-400">Bắt lỗi hóa đơn hãng tàu & đòi tiền (Phase 65)</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  {onOpenRfqInbox && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRfqInbox();
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                          <Inbox className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Hộp Thư RFQ (5s)</div>
                          <div className="text-[10px] text-slate-400">Bóc tách yêu cầu chào giá tự động</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenDecisionWorkspace();
                      setIsRadarDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Phòng Quyết Định (What-If)</div>
                        <div className="text-[10px] text-slate-400">Mô phỏng kịch bản cước & rủi ro</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                </div>

              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Quick Print & Export Buttons */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs btn-tactile transition cursor-pointer"
            title="Xem trước mẫu in bản A4"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xem Trước</span>
          </button>

          <button
            type="button"
            onClick={onOpenGeneratePdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs btn-tactile transition cursor-pointer"
            title="Xuất file PDF chuyên nghiệp"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>

          {/* Send Quote Modal */}
          <button
            type="button"
            onClick={onOpenSendModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl shadow-2xs btn-tactile transition cursor-pointer"
            title="Gửi báo giá qua email & tạo link khách hàng"
          >
            <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Gửi Khách</span>
          </button>

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={onSaveQuote}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-sm hover:shadow-indigo-500/20 btn-tactile transition cursor-pointer"
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

      {/* Bottom Bar: Modern Segmented Tabs & Context Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        
        {/* Sleek Segmented Control */}
        <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange('DETAILS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-tactile cursor-pointer shrink-0 ${
              activeTab === 'DETAILS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Chi Tiết Bảng Cước</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('TERMS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-tactile cursor-pointer shrink-0 ${
              activeTab === 'TERMS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Điều Khoản & Ngân Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('COMMUNICATION')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-tactile cursor-pointer shrink-0 ${
              activeTab === 'COMMUNICATION'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Giao Tiếp & Lịch Sử</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-tactile cursor-pointer shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>Toàn Bộ Trang</span>
          </button>
        </div>

        {/* Clean Context Figures */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {quote.items.length} hạng mục cước
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Đơn vị: <strong className="text-slate-800 dark:text-slate-200">{quote.quoteCurrency || 'USD'}</strong></span>
          {quote.terms.validityDate && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="hidden sm:inline">Hiệu lực: {quote.terms.validityDate}</span>
            </>
          )}
        </div>

      </div>

    </div>
  );
};
