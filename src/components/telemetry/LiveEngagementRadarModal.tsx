import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  Flame, 
  Eye, 
  Download, 
  PenTool, 
  Phone, 
  MessageSquare, 
  Clock, 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  Laptop, 
  TrendingUp, 
  Filter, 
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  RotateCw
} from 'lucide-react';
import { QuotationEngagementSession, LeadTier } from '../../types/customerEngagement';

interface LiveEngagementRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: QuotationEngagementSession[];
  onOpenQuotation?: (quotationId: string) => void;
  onOpenDealCloser?: (quotationId: string) => void;
  initialSelectedSession?: QuotationEngagementSession | null;
}

export const LiveEngagementRadarModal: React.FC<LiveEngagementRadarModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onOpenQuotation,
  onOpenDealCloser,
  initialSelectedSession = null,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE_NOW' | 'HOT' | 'PDF_DOWNLOADED' | 'SIGNATURE_OPENED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<QuotationEngagementSession | null>(
    initialSelectedSession || sessions[0] || null
  );
  const [copiedType, setCopiedType] = useState<'SCRIPT' | 'ZALO' | null>(null);

  // Sync initialSelectedSession when provided
  React.useEffect(() => {
    if (initialSelectedSession) {
      setSelectedSession(initialSelectedSession);
    } else if (!selectedSession && sessions.length > 0) {
      setSelectedSession(sessions[0]);
    }
  }, [initialSelectedSession, sessions]);

  // Aggregate Metrics
  const activeNowCount = useMemo(() => sessions.filter(s => s.isCurrentlyActive).length, [sessions]);
  const hotCount = useMemo(() => sessions.filter(s => s.hotScore >= 75).length, [sessions]);
  const pdfDownloadCount = useMemo(() => sessions.filter(s => s.downloadedPdf).length, [sessions]);
  const signatureOpenedCount = useMemo(() => sessions.filter(s => s.openedSignature).length, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // Tab filter
      if (filterTab === 'ACTIVE_NOW' && !s.isCurrentlyActive) return false;
      if (filterTab === 'HOT' && s.hotScore < 75) return false;
      if (filterTab === 'PDF_DOWNLOADED' && !s.downloadedPdf) return false;
      if (filterTab === 'SIGNATURE_OPENED' && !s.openedSignature) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          s.customerName.toLowerCase().includes(q) ||
          s.quotationNumber.toLowerCase().includes(q) ||
          (s.routePol && s.routePol.toLowerCase().includes(q)) ||
          (s.routePod && s.routePod.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [sessions, filterTab, searchQuery]);

  if (!isOpen) return null;

  const handleCopyText = (text: string, type: 'SCRIPT' | 'ZALO') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Generate Zalo message snippet
  const generateZaloMessage = (s: QuotationEngagementSession) => {
    return `Dạ chào anh/chị bên ${s.customerName}, em bên bộ phận Logistics phụ trách bảng báo giá ${s.quotationNumber} tuyến ${s.routePol || 'cảng đi'} - ${s.routePod || 'cảng đến'}. Em gửi bổ sung lịch tàu và hỗ trợ giữ chỗ cont sớm nhất cho bên mình, anh/chị cần check thêm thông tin gì cứ báo em ngay nhé ạ!`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 text-slate-200 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base text-white tracking-tight">
                  Radar Tương Tác Khách Hàng Thời Gian Thực (Live Engagement Radar)
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activeNowCount} khách đang xem live</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Theo dõi chính xác thời điểm khách mở xem báo giá & gợi ý kịch bản cuộc gọi chốt đơn tức thì
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0 text-xs">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đang Xem Live:</span>
              <strong className="text-emerald-400 text-base font-mono">{activeNowCount}</strong>
            </div>
            <Eye className="w-4 h-4 text-emerald-400 opacity-80" />
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hot Leads (Score ≥ 75):</span>
              <strong className="text-amber-400 text-base font-mono">{hotCount}</strong>
            </div>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 opacity-80" />
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đã Tải Bản In PDF:</span>
              <strong className="text-blue-400 text-base font-mono">{pdfDownloadCount}</strong>
            </div>
            <Download className="w-4 h-4 text-blue-400 opacity-80" />
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đã Mở Bảng Ký Số:</span>
              <strong className="text-purple-400 text-base font-mono">{signatureOpenedCount}</strong>
            </div>
            <PenTool className="w-4 h-4 text-purple-400 opacity-80" />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3.5 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Tất cả ({sessions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('ACTIVE_NOW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'ACTIVE_NOW'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Đang xem Live ({activeNowCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('HOT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'HOT'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Hot Leads ({hotCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('PDF_DOWNLOADED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'PDF_DOWNLOADED'
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-800 font-semibold'
                  : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              Đã tải PDF ({pdfDownloadCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('SIGNATURE_OPENED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'SIGNATURE_OPENED'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800 font-semibold'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              Mở Ký Số ({signatureOpenedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khách hàng / báo giá..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>
        </div>

        {/* Main 2-Column Split: Session List (Left) & Smart Call Script (Right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Left Session Stream (7 cols) */}
          <div className="lg:col-span-7 overflow-y-auto p-3.5 space-y-2 border-r border-slate-800 custom-scrollbar">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Không tìm thấy phiên tương tác nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                const isHot = s.hotScore >= 75;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500/80 shadow-md'
                        : 'bg-slate-950/60 hover:bg-slate-800/40 border-slate-800'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        {s.isCurrentlyActive ? (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                        )}

                        <span className="font-bold text-xs text-white truncate max-w-[200px]">
                          {s.customerName}
                        </span>

                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                          {s.quotationNumber}
                        </span>
                      </div>

                      {/* Hot Lead Score Badge */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${
                          isHot
                            ? 'bg-amber-950/60 border-amber-700/80 text-amber-300'
                            : s.hotScore >= 50
                            ? 'bg-blue-950/60 border-blue-700/80 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {isHot && <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />}
                          <span>{s.hotScore}/100</span>
                        </span>
                      </div>
                    </div>

                    {/* Route & Key Indicators */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-2">
                        {s.routePol && s.routePod && (
                          <span className="text-slate-300 font-medium">
                            {s.routePol} &rarr; {s.routePod}
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>Đã xem: {Math.round(s.durationSeconds)}s</span>
                        <span>&bull;</span>
                        <span>Lần xem: {s.viewCount}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {s.downloadedPdf && (
                          <span title="Đã tải PDF" className="p-0.5 text-blue-400 bg-blue-950/40 rounded">
                            <Download className="w-3 h-3" />
                          </span>
                        )}
                        {s.openedSignature && (
                          <span title="Đã mở ký số" className="p-0.5 text-purple-400 bg-purple-950/40 rounded">
                            <PenTool className="w-3 h-3" />
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(s.lastActiveAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Time Spent Section Mini-Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>Cước ({s.sectionDurations.RATES_TABLE}s)</span>
                        <span>Điều khoản ({s.sectionDurations.TERMS_PAYMENT}s)</span>
                        <span>Ký số ({s.sectionDurations.SIGNATURE_AREA}s)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                        <div 
                          style={{ width: `${Math.min(100, (s.sectionDurations.RATES_TABLE / (s.durationSeconds || 1)) * 100)}%` }} 
                          className="bg-blue-500 h-full"
                          title="Bảng cước"
                        />
                        <div 
                          style={{ width: `${Math.min(100, (s.sectionDurations.TERMS_PAYMENT / (s.durationSeconds || 1)) * 100)}%` }} 
                          className="bg-amber-500 h-full"
                          title="Điều khoản"
                        />
                        <div 
                          style={{ width: `${Math.min(100, (s.sectionDurations.SIGNATURE_AREA / (s.durationSeconds || 1)) * 100)}%` }} 
                          className="bg-purple-500 h-full"
                          title="Ký số"
                        />
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Right Smart Call Script & Action Drawer (5 cols) */}
          <div className="lg:col-span-5 overflow-y-auto p-4 space-y-4 bg-slate-950 custom-scrollbar">
            {selectedSession ? (
              <div className="space-y-4 text-xs">
                
                {/* Selected Lead Overview */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Chi Tiết Khách Hàng
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedSession.hotScore >= 75
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {selectedSession.leadTier} LEAD
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{selectedSession.customerName}</h3>
                  <p className="text-slate-400 text-xs">
                    Mã Báo Giá: <strong className="text-slate-200">{selectedSession.quotationNumber}</strong>
                  </p>

                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                    {selectedSession.deviceType === 'MOBILE' ? (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Điện thoại di động</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Laptop className="w-3.5 h-3.5" />
                        <span>Máy tính văn phòng</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Breakdown Reasons */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Tín Hiệu Hành Vi Nhận Diện (Behavior Signals)
                  </span>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {selectedSession.scoreReasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">&bull;</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Immediate Action */}
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-1.5 text-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                    Hành Động Khuyến Nghị Cho Sales:
                  </span>
                  <p className="text-xs font-semibold leading-relaxed">
                    {selectedSession.recommendedAction}
                  </p>
                </div>

                {/* Suggested Speech Call Script */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Kịch Bản Cuộc Gọi Gợi Ý (Call Script)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedSession.callScript, 'SCRIPT')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedType === 'SCRIPT' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'SCRIPT' ? 'Đã copy' : 'Copy kịch bản'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed italic">
                    "{selectedSession.callScript}"
                  </div>
                </div>

                {/* Quick Zalo Copy Message */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                      <span>Tin Nhắn Mẫu Gửi Zalo / Viber</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(generateZaloMessage(selectedSession), 'ZALO')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedType === 'ZALO' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'ZALO' ? 'Đã copy' : 'Copy tin nhắn'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                    {generateZaloMessage(selectedSession)}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-col space-y-2 pt-2">
                  {onOpenDealCloser && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDealCloser(selectedSession.quotationId);
                        onClose();
                      }}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Mở Trợ Lý Chốt Deal & Đàm Phán (Gói B)</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-2">
                    {onOpenQuotation && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenQuotation(selectedSession.quotationId);
                          onClose();
                        }}
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                      >
                        Mở Báo Giá
                      </button>
                    )}

                    {selectedSession.customerPhone && (
                      <a
                        href={`tel:${selectedSession.customerPhone}`}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Gọi Ngay ({selectedSession.customerPhone})</span>
                      </a>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Chọn một phiên xem báo giá bên trái để xem phân tích hành vi và kịch bản chốt đơn.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footbar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry được mã hóa an toàn 2 chiều giữa Cổng khách hàng và Bàn làm việc Sales.</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
