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
  ShieldAlert,
  Zap,
  Copy,
  CreditCard,
  Calculator,
  BarChart3,
  Receipt,
  History
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
  onOpenDocumentParser?: () => void;
  onOpenHsCodeTariff?: () => void;
  onOpenFreightRateBenchmarking?: () => void;
  onOpenDebitNote?: () => void;
  onOpenStatementOfAccount?: () => void;
  onOpenMultiOptionQuote?: () => void;
  onOpenRoutePresets?: () => void;
  onOpenHistoricalRateAdvisor?: () => void;
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
  onOpenDocumentParser,
  onOpenHsCodeTariff,
  onOpenFreightRateBenchmarking,
  onOpenDebitNote,
  onOpenStatementOfAccount,
  onOpenMultiOptionQuote,
  onOpenRoutePresets,
  onOpenHistoricalRateAdvisor,
  isSaving = false,
  lastSavedAt,
}) => {
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [copiedQuoteNumber, setCopiedQuoteNumber] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    if (isToolsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsDropdownOpen]);

  const handleCopyQuoteNumber = () => {
    if (quote.quoteNumber) {
      navigator.clipboard.writeText(quote.quoteNumber);
      setCopiedQuoteNumber(true);
      setTimeout(() => setCopiedQuoteNumber(false), 2000);
    }
  };

  const getStatusText = (status: QuoteStatus) => {
    switch (status) {
      case 'APPROVED': return { label: 'Đã duyệt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'SENT': return { label: 'Đã gửi', color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'ACCEPTED': return { label: 'Chấp thuận', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      case 'REJECTED': return { label: 'Từ chối', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'EXPIRED': return { label: 'Hết hạn', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'PENDING_APPROVAL': return { label: 'Chờ duyệt', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      default: return { label: 'Bản nháp', color: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  const statusInfo = getStatusText(quote.status);
  const customerName = quote.customer.companyName || quote.customer.customerName || 'Khách hàng mới';
  const pol = quote.shipment.pol || 'POL';
  const pod = quote.shipment.pod || 'POD';
  const modeText = quote.shipment.mode || 'SEA_FCL';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
      
      {/* Top Row: Identity & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
        
        {/* Left: Executive Identity */}
        <div className="flex items-center flex-wrap gap-2 text-xs min-w-0">
          
          {/* Quote Number with copy trigger */}
          <button
            type="button"
            onClick={handleCopyQuoteNumber}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-100 text-slate-900 font-mono font-bold border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer group shrink-0"
            title="Click để sao chép mã báo giá"
          >
            <span>{quote.quoteNumber || 'LOG-DRAFT'}</span>
            {copiedQuoteNumber ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
            )}
          </button>

          {/* Clean status badge */}
          <span className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold border shrink-0 ${statusInfo.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{statusInfo.label}</span>
          </span>

          {/* Payment Status Badge */}
          {quote.paymentStatus && quote.paymentStatus !== 'UNPAID' && (
            <div className="shrink-0 flex items-center h-8">
              <PaymentStatusBadge
                status={quote.paymentStatus}
                outstandingBalanceUsd={quote.outstandingBalanceUsd}
                showAmount={Boolean(quote.outstandingBalanceUsd && quote.outstandingBalanceUsd > 0)}
                size="sm"
                onClick={onOpenQuotationPayments}
              />
            </div>
          )}

          {/* Route & Customer Breadcrumb Card */}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 min-w-0 max-w-[280px] sm:max-w-[380px] shrink">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-[180px]" title={customerName}>
              {customerName}
            </span>
            <span className="text-slate-300 shrink-0">·</span>
            <span className="font-mono text-slate-700 shrink-0 text-[11px] whitespace-nowrap">
              {pol} &rarr; {pod}
            </span>
            <span className="text-slate-300 hidden md:inline shrink-0">·</span>
            <span className="text-slate-500 hidden md:inline text-[11px] font-medium shrink-0">{modeText}</span>
          </div>

          {/* Auto-save status */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 ml-0.5 shrink-0">
            {isSaving ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin text-indigo-600" />
                <span className="text-indigo-600 font-medium">Đang lưu...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">{lastSavedAt ? `Đã lưu ${lastSavedAt.split('T')[1]?.slice(0, 5) || 'gần đây'}` : 'Đã đồng bộ Cloud'}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Modern Streamlined Actions with Compact Clusters */}
        <div className="flex items-center gap-2 justify-start lg:justify-end shrink-0 flex-wrap sm:flex-nowrap">
          
          {/* Categorized Tools & Radar AI Popover */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Mở toàn bộ công cụ Radar & Phân tích chuyên sâu"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Công Cụ & Radar AI</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2.5rem)] max-w-sm sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-[75vh] overflow-y-auto">
                
                {/* Section 1: Customer Intelligence */}
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thấu Hiểu Khách Hàng (KYS 360°)
                  </div>

                  {onOpenCustomerDna && (
                    <button
                      type="button"
                      onClick={() => { onOpenCustomerDna(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Dna className="w-3.5 h-3.5 text-sky-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Customer DNA & Power Map</div>
                          <div className="text-[10px] text-slate-400">Bóc tách gen logistics & sơ đồ quyền lực</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenGoldenHourRadar && (
                    <button
                      type="button"
                      onClick={() => { onOpenGoldenHourRadar(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <div>
                          <div className="font-semibold text-slate-900">Giờ Vàng Chốt Đơn 🔥</div>
                          <div className="text-[10px] text-slate-400">Bắt nhịp khách đang xem báo giá</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenCustomerReengagement && (
                    <button
                      type="button"
                      onClick={() => { onOpenCustomerReengagement(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Đánh Thức Khách Cũ</div>
                          <div className="text-[10px] text-slate-400">Khách trễ chu kỳ xuất khẩu</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Section 2: Deals, Negotiation & Payments */}
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Đàm Phán, Thầu & Thu Nợ
                  </div>

                  {onOpenQuotationPayments && (
                    <button
                      type="button"
                      onClick={() => { onOpenQuotationPayments(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Thu Nợ & Thanh Toán</div>
                          <div className="text-[10px] text-slate-400">Quản lý thu hồi công nợ lô hàng</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenEnterpriseTender && (
                    <button
                      type="button"
                      onClick={() => { onOpenEnterpriseTender(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Đấu Thầu Nhà Máy (Tender)</div>
                          <div className="text-[10px] text-slate-400">Ma trận nhiều tuyến quy mô lớn</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenConcessionGuard && (
                    <button
                      type="button"
                      onClick={() => { onOpenConcessionGuard(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Đổi Trác & Sàn Lợi Nhuận</div>
                          <div className="text-[10px] text-slate-400">Đổi điều khoản khi khách ép giá</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenCompetitorRadar && (
                    <button
                      type="button"
                      onClick={() => { onOpenCompetitorRadar(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Swords className="w-3.5 h-3.5 text-amber-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Radar Giá Đối Thủ (P50)</div>
                          <div className="text-[10px] text-slate-400">Điểm ngọt chốt đơn Win-Rate</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenDealCloser && (
                    <button
                      type="button"
                      onClick={() => { onOpenDealCloser(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <div>
                          <div className="font-semibold text-slate-900">Chốt Deal Tốc Độ</div>
                          <div className="text-[10px] text-slate-400">Kịch bản bám đuổi & chốt hạ</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Section 3: Cost Audit & Operational Risks */}
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Rủi Ro, Đối Soát & Mô Phỏng
                  </div>

                  {onOpenCarrierInvoiceAudit && (
                    <button
                      type="button"
                      onClick={() => { onOpenCarrierInvoiceAudit(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Đối Soát Cước Hãng Tàu</div>
                          <div className="text-[10px] text-slate-400">Bắt lỗi hóa đơn hãng tàu đòi lại tiền</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenDemDetPort && (
                    <button
                      type="button"
                      onClick={() => { onOpenDemDetPort(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Anchor className="w-3.5 h-3.5 text-sky-600" />
                        <div>
                          <div className="font-semibold text-slate-900">DEM/DET & Cảng</div>
                          <div className="text-[10px] text-slate-400">Phí phạt lưu cont & kẹt cảng</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenValiditySurcharge && (
                    <button
                      type="button"
                      onClick={() => { onOpenValiditySurcharge(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <div>
                          <div className="font-semibold text-slate-900">Hiệu Lực & Phụ Phí GRI</div>
                          <div className="text-[10px] text-slate-400">Cảnh báo hết hạn & biến động phụ phí</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenRfqInbox && (
                    <button
                      type="button"
                      onClick={() => { onOpenRfqInbox(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Hộp Thư RFQ (5s)</div>
                          <div className="text-[10px] text-slate-400">Bóc tách yêu cầu chào giá tự động</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenDocumentParser && (
                    <button
                      type="button"
                      onClick={() => { onOpenDocumentParser(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Trích Xuất Chứng Từ (OCR AI)</div>
                          <div className="text-[10px] text-slate-400">Bóc tách B/L, Booking, Invoice & Tờ khai</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenHsCodeTariff && (
                    <button
                      type="button"
                      onClick={() => { onOpenHsCodeTariff(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Calculator className="w-3.5 h-3.5 text-amber-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Tra Cứu Mã HS & Thuế XNK AI</div>
                          <div className="text-[10px] text-slate-400">Biểu thuế, ưu đãi FTA & tính thuế trọn gói</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenFreightRateBenchmarking && (
                    <button
                      type="button"
                      onClick={() => { onOpenFreightRateBenchmarking(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer bg-blue-50/50"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Đối Soát Cước & Biên Lãi (P.72)</span>
                            <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-bold">HOT</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Benchmark SCFI/Drewry & Tối ưu Win-Rate</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenDebitNote && (
                    <button
                      type="button"
                      onClick={() => { onOpenDebitNote(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Tạo & Quản Lý Debit Note</span>
                            <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">HOT</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Giấy báo nợ, phí phát sinh & mã VietQR</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenRoutePresets && (
                    <button
                      type="button"
                      onClick={() => { onOpenRoutePresets(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer bg-amber-50/40"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Bộ Mẫu Tuyến Trọn Gói (1-Click)</span>
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">1-CHẠM</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Tự động điền cước & trọn bộ phụ phí cảng POL/POD</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenHistoricalRateAdvisor && (
                    <button
                      type="button"
                      onClick={() => { onOpenHistoricalRateAdvisor(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer bg-emerald-50/30"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Gợi Ý Giá Cước Lịch Sử</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Dữ liệu các báo giá cùng cặp cảng 3 tháng gần nhất</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenMultiOptionQuote && (
                    <button
                      type="button"
                      onClick={() => { onOpenMultiOptionQuote(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Báo Giá Đa Phương Án (Good - Better - Best)</span>
                            <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-bold">HOT</span>
                          </div>
                          <div className="text-[10px] text-slate-500">So sánh 3 gói cước, tăng tỷ lệ chốt đơn sales x2.4</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  {onOpenStatementOfAccount && (
                    <button
                      type="button"
                      onClick={() => { onOpenStatementOfAccount(); setIsToolsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>Bảng Đối Soát Công Nợ (SOA)</span>
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">MỚI</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Statement of Account, phân tích tuổi nợ & QR gộp</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { onOpenDecisionWorkspace(); setIsToolsDropdownOpen(false); }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                      <div>
                        <div className="font-semibold text-slate-900">Phòng Quyết Định (What-If)</div>
                        <div className="text-[10px] text-slate-400">Mô phỏng kịch bản cước & rủi ro</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </button>
                </div>

              </div>
            )}
          </div>


          {/* Unified Preview & Export PDF Button */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Xem trước bản in A4 & Xuất file PDF / Excel"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Xem & Xuất PDF</span>
          </button>

          {/* Send Quote */}
          <button
            type="button"
            onClick={onOpenSendModal}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Gửi báo giá qua email & tạo link khách hàng"
          >
            <Send className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Gửi Khách</span>
          </button>

          {/* Primary Action: Save to Cloud */}
          <button
            type="button"
            onClick={onSaveQuote}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Lưu báo giá lên Firestore Cloud"
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Lưu Báo Giá</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Bottom Row: Clean Segmented Tabs & Context Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
        
        {/* Sleek Cosmic Segmented Control with Laser Track Physics */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={() => onTabChange('DETAILS')}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 press-physics-subtle focus-ring-physics-light overflow-hidden ${
              activeTab === 'DETAILS'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chi Tiết Bảng Cước</span>
            {activeTab === 'DETAILS' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 cosmic-laser-rail rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('TERMS')}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 press-physics-subtle focus-ring-physics-light overflow-hidden ${
              activeTab === 'TERMS'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Điều Khoản & Ngân Hàng</span>
            {activeTab === 'TERMS' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 cosmic-laser-rail rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('COMMUNICATION')}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 press-physics-subtle focus-ring-physics-light overflow-hidden ${
              activeTab === 'COMMUNICATION'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Giao Tiếp & Lịch Sử</span>
            {activeTab === 'COMMUNICATION' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 cosmic-laser-rail rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ALL')}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 press-physics-subtle focus-ring-physics-light overflow-hidden ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Toàn Bộ Trang</span>
            {activeTab === 'ALL' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 cosmic-laser-rail rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
          </button>
        </div>

        {/* Clean Context Figures */}
        <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
          <span className="font-medium text-slate-700">
            {quote.items.length} hạng mục cước
          </span>
          <span className="text-slate-300">·</span>
          <span>Đơn vị: <strong className="text-slate-900">{quote.quoteCurrency || 'USD'}</strong></span>
          {quote.terms.validityDate && (
            <>
              <span className="text-slate-300">·</span>
              <span className="hidden sm:inline">Hạn: {quote.terms.validityDate}</span>
            </>
          )}
        </div>

      </div>

    </div>
  );
};
