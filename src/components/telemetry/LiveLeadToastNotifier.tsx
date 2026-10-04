import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Eye, 
  Download, 
  PenTool, 
  Phone, 
  X, 
  ArrowRight, 
  Zap,
  Smartphone,
  Laptop
} from 'lucide-react';
import { QuotationEngagementSession } from '../../types/customerEngagement';

interface LiveLeadToastNotifierProps {
  sessions: QuotationEngagementSession[];
  onOpenRadar: () => void;
  onOpenCallScript: (session: QuotationEngagementSession) => void;
}

export const LiveLeadToastNotifier: React.FC<LiveLeadToastNotifierProps> = ({
  sessions,
  onOpenRadar,
  onOpenCallScript,
}) => {
  const [activeToast, setActiveToast] = useState<QuotationEngagementSession | null>(null);
  const [dismissedSessionIds, setDismissedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    // Find the most recent active hot lead that hasn't been dismissed
    const nowMs = Date.now();
    const candidate = sessions.find(s => {
      if (dismissedSessionIds.includes(s.id)) return false;
      const lastMs = new Date(s.lastActiveAt).getTime();
      const isFresh = (nowMs - lastMs) <= 45000; // active within last 45s
      return isFresh && (s.hotScore >= 45 || s.openedSignature || s.downloadedPdf);
    });

    if (candidate) {
      setActiveToast(candidate);
    } else {
      // Auto-hide if no fresh active sessions
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessions, dismissedSessionIds]);

  if (!activeToast) return null;

  const handleDismiss = () => {
    if (activeToast) {
      setDismissedSessionIds(prev => [...prev, activeToast.id]);
      setActiveToast(null);
    }
  };

  const isHot = activeToast.hotScore >= 75 || activeToast.openedSignature;

  return (
    <aside 
      aria-label="Thông báo khách hàng tương tác thời gian thực"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 animate-in slide-in-from-bottom-5 duration-300 select-none"
    >
      
      {/* Toast Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 tracking-tight flex items-center gap-1">
            {isHot ? <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isHot ? 'HOT LEAD ĐANG XEM' : 'KHÁCH HÀNG ĐANG XEM BÁO GIÁ'}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body Info */}
      <div className="py-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs text-white truncate max-w-[240px]">
            {activeToast.customerName}
          </h4>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {activeToast.quotationNumber}
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-snug">
          {activeToast.openedSignature ? (
            <span className="text-amber-300 font-semibold flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span>Khách vừa mở bảng Ký Số Điện Tử!</span>
            </span>
          ) : activeToast.downloadedPdf ? (
            <span className="text-blue-300 font-semibold flex items-center gap-1">
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Khách vừa tải bản in PDF về máy</span>
            </span>
          ) : (
            <span>Đang đọc kỹ bảng cước ({activeToast.durationSeconds}s trên trang)</span>
          )}
        </p>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            {activeToast.deviceType === 'MOBILE' ? (
              <Smartphone className="w-3 h-3 text-slate-400" />
            ) : (
              <Laptop className="w-3 h-3 text-slate-400" />
            )}
            <span>{activeToast.deviceType}</span>
            <span>&bull;</span>
            <span>Lượt xem: {activeToast.viewCount}</span>
          </span>

          <span className="font-mono font-bold text-amber-400">
            Hot Score: {activeToast.hotScore}/100
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={() => {
            onOpenRadar();
            handleDismiss();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
        >
          Mở Radar
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenCallScript(activeToast);
            handleDismiss();
          }}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Kịch Bản Gọi Ngay</span>
        </button>
      </div>

    </aside>
  );
};
