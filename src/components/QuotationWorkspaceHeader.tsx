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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Executive Identity */}
        <div className="flex items-center flex-wrap gap-2 text-xs min-w-0">
          
          {/* Quote Number with copy trigger */}
          <button
            type="button"
            onClick={handleCopyQuoteNumber}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-mono font-bold border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer group"
            title="Click để sao chép mã báo giá"
          >
            <span>{quote.quoteNumber || 'LOG-DRAFT'}</span>
            {copiedQuoteNumber ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
            )}
          </button>

          <span className="text-slate-300">·</span>

          {/* Clean status badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${statusInfo.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{statusInfo.label}</span>
          </span>

          {/* Payment Status Badge */}
          {quote.paymentStatus && quote.paymentStatus !== 'UNPAID' && (
            <PaymentStatusBadge
              status={quote.paymentStatus}
              outstandingBalanceUsd={quote.outstandingBalanceUsd}
              showAmount={Boolean(quote.outstandingBalanceUsd && quote.outstandingBalanceUsd > 0)}
              size="sm"
              onClick={onOpenQuotationPayments}
            />
          )}

          <span className="text-slate-300 hidden sm:inline">·</span>

          {/* Route & Customer Breadcrumb */}
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0 truncate max-w-[340px] sm:max-w-[420px]">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 truncate" title={customerName}>
              {customerName}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-700 shrink-0">
              {pol} &rarr; {pod}
            </span>
            <span className="text-slate-300 hidden md:inline">·</span>
            <span className="text-slate-500 hidden md:inline">{modeText}</span>
          </div>

          {/* Auto-save status */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 ml-1">
            {isSaving ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin text-indigo-600" />
                <span className="text-indigo-600 font-medium">Đang lưu...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{lastSavedAt ? `Đã lưu ${lastSavedAt.split('T')[1]?.slice(0, 5) || 'gần đây'}` : 'Đã đồng bộ Cloud'}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Modern Streamlined Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          
          {/* Categorized Tools & Radar AI Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Mở toàn bộ công cụ Radar & Phân tích chuyên sâu"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Công Cụ & Radar AI</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-2">
                
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

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Export & Preview Group */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Xem trước bản in A4"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xem Trước</span>
          </button>

          <button
            type="button"
            onClick={onOpenGeneratePdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Xuất file PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>

          {/* Send Quote */}
          <button
            type="button"
            onClick={onOpenSendModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            title="Gửi báo giá qua email & tạo link khách hàng"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Gửi Khách</span>
          </button>

          {/* Primary Action: Save to Cloud */}
          <button
            type="button"
            onClick={onSaveQuote}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
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

      {/* Bottom Row: Clean Segmented Tabs & Context Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
        
        {/* Sleek Segmented Control */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange('DETAILS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'DETAILS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chi Tiết Bảng Cước</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('TERMS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'TERMS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Điều Khoản & Ngân Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('COMMUNICATION')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'COMMUNICATION'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Giao Tiếp & Lịch Sử</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Toàn Bộ Trang</span>
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
