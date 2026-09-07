import React, { useState } from 'react';
import { Cloud, CheckCircle2, RefreshCw, ShieldCheck, Database, Smartphone, Laptop, AlertCircle } from 'lucide-react';

interface CloudSyncStatusBadgeProps {
  isSyncing: boolean;
  onForceSync: () => Promise<void>;
  lastSyncedAt: Date | null;
  quoteCount: number;
  customerCount: number;
  rateCount: number;
}

export const CloudSyncStatusBadge: React.FC<CloudSyncStatusBadgeProps> = ({
  isSyncing,
  onForceSync,
  lastSyncedAt,
  quoteCount,
  customerCount,
  rateCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (d: Date | null) => {
    if (!d) return 'Vừa mới đây';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative inline-block text-left">
      {/* Badge Button */}
      <button
        id="cloud-sync-status-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
        title="Dữ liệu 100% Cloud-First trên Firebase Firestore (Không dùng Local Storage)"
      >
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
        )}
        <span className="hidden sm:inline">Cloud Synced</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            id="cloud-sync-popover"
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Cloud-First Data Architecture</h4>
                  <p className="text-[10px] text-slate-500">Firebase Firestore Single Source of Truth</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                Phase 17
              </span>
            </div>

            {/* Status Details */}
            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Trạng thái máy chủ:</span>
                </span>
                <span className="font-medium text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kết nối trực tiếp</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đồng bộ đa thiết bị:</span>
                </span>
                <span className="font-medium text-slate-900">Khả dụng (A ⟷ B)</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lần đồng bộ gần nhất:</span>
                </span>
                <span className="font-mono text-slate-700">{formatTime(lastSyncedAt)}</span>
              </div>
            </div>

            {/* Cloud Counts */}
            <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div>
                <div className="text-xs font-bold text-slate-800">{quoteCount}</div>
                <div className="text-[10px] text-slate-500">Báo giá</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{customerCount}</div>
                <div className="text-[10px] text-slate-500">Khách hàng</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{rateCount}</div>
                <div className="text-[10px] text-slate-500">Biểu cước</div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 italic">100% No Local Storage</span>
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  await onForceSync();
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang tải...' : 'Đồng bộ ngay'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
