import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Database, 
  Laptop, 
  Activity, 
  Cpu, 
  Radio, 
  WifiOff, 
  Clock 
} from 'lucide-react';
import { syncHealthService, SystemHealthSnapshot } from '../services/integrity/syncHealthService';

export interface CloudSyncStatusBadgeProps {
  isSyncing: boolean;
  isAutoSaving?: boolean;
  onForceSync?: () => Promise<void>;
  lastSyncedAt?: Date | null;
  lastAutoSaveTime?: string | null;
  quoteCount?: number;
  customerCount?: number;
  rateCount?: number;
  onOpenIntegrityDashboard?: () => void;
}

export const CloudSyncStatusBadge: React.FC<CloudSyncStatusBadgeProps> = ({
  isSyncing,
  isAutoSaving = false,
  onForceSync,
  lastSyncedAt = null,
  lastAutoSaveTime = null,
  quoteCount = 0,
  customerCount = 0,
  rateCount = 0,
  onOpenIntegrityDashboard,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<SystemHealthSnapshot>(syncHealthService.getSnapshot());

  useEffect(() => {
    const unsub = syncHealthService.subscribe(snap => {
      setHealthSnapshot(snap);
    });
    return () => unsub();
  }, []);

  const formatTime = (d: Date | null) => {
    if (!d) return lastAutoSaveTime || 'Vừa xong';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const listenerEntries = Object.values(healthSnapshot.listeners);
  const connectedStreams = listenerEntries.filter((l: any) => l.status === 'CONNECTED' || l.status === 'HEALTHY').length;
  const totalStreams = listenerEntries.length > 0 ? listenerEntries.length : 6;

  // Determine Sync Health states:
  // 1. Connection check: Offline if network is lost
  const isOnline = healthSnapshot.isOnline && (typeof navigator === 'undefined' || navigator.onLine);
  
  // 2. Syncing check: Manual push or auto-save push is in progress
  const isOperationInProgress = Boolean(isSyncing || isAutoSaving || healthSnapshot.isSyncing);

  // 3. Listeners active check: Firestore live listeners are active and connected
  const isListenersActive = isOnline && (connectedStreams > 0 || listenerEntries.length === 0);

  let syncHealthState: 'Real-time' | 'Syncing' | 'Offline';
  if (!isOnline) {
    syncHealthState = 'Offline';
  } else if (isOperationInProgress) {
    syncHealthState = 'Syncing';
  } else if (isListenersActive) {
    syncHealthState = 'Real-time';
  } else {
    syncHealthState = 'Offline';
  }

  return (
    <div className="relative inline-block text-left">
      {/* 'Sync Health' Visual Indicator Button */}
      <button
        id="sync-health-indicator-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 shadow-xs cursor-pointer select-none focus:outline-none ${
          syncHealthState === 'Real-time'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
            : syncHealthState === 'Syncing'
            ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 hover:bg-amber-100 hover:border-amber-400 focus:ring-2 focus:ring-amber-500/30'
            : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 hover:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
        }`}
        title={`Sync Health: ${syncHealthState} - ${
          syncHealthState === 'Syncing'
            ? 'Thao tác đẩy/kéo (push/pull) dữ liệu Firestore đang diễn ra...'
            : syncHealthState === 'Real-time'
            ? 'Các bộ lắng nghe Firestore (Real-time listeners) đang hoạt động tức thì'
            : 'Mất kết nối mạng - Chế độ ngoại tuyến an toàn'
        }`}
        aria-label={`Sync Health: ${syncHealthState}`}
      >
        {/* Animated Pulse Beacon Icon */}
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              syncHealthState === 'Real-time'
                ? 'bg-emerald-400'
                : syncHealthState === 'Syncing'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-xs ${
              syncHealthState === 'Real-time'
                ? 'bg-emerald-500'
                : syncHealthState === 'Syncing'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
        </span>

        {/* Dynamic Context Icon */}
        {syncHealthState === 'Real-time' && (
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0 hidden sm:inline" />
        )}
        {syncHealthState === 'Syncing' && (
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
        )}
        {syncHealthState === 'Offline' && (
          <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        )}

        {/* Sync Health Label & Dynamic Status */}
        <div className="flex items-center space-x-1.5 leading-none whitespace-nowrap">
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Sync Health:
          </span>
          <span
            className={`font-bold tracking-tight text-xs flex items-center gap-1 ${
              syncHealthState === 'Real-time'
                ? 'text-emerald-700'
                : syncHealthState === 'Syncing'
                ? 'text-amber-800 animate-pulse'
                : 'text-rose-700'
            }`}
          >
            {syncHealthState}
          </span>
        </div>

        {/* Stream Count Indicator (Desktop) */}
        {syncHealthState === 'Real-time' && connectedStreams > 0 && (
          <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
            {connectedStreams} streams
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            id="sync-health-popover"
            className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${
                  syncHealthState === 'Real-time'
                    ? 'bg-emerald-100 text-emerald-700'
                    : syncHealthState === 'Syncing'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {syncHealthState === 'Real-time' && <ShieldCheck className="w-4 h-4" />}
                  {syncHealthState === 'Syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {syncHealthState === 'Offline' && <WifiOff className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Sync Health Monitor</h4>
                  <p className="text-[10px] text-slate-500">Firebase Firestore Real-time Engine</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                syncHealthState === 'Real-time'
                  ? 'bg-emerald-100 text-emerald-800'
                  : syncHealthState === 'Syncing'
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {syncHealthState}
              </span>
            </div>

            {/* Status Details */}
            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>Trạng thái Sync Health:</span>
                </span>
                <span className={`font-bold flex items-center space-x-1 ${
                  syncHealthState === 'Real-time'
                    ? 'text-emerald-600'
                    : syncHealthState === 'Syncing'
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  {syncHealthState === 'Real-time' && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Real-time (Active)</span>
                    </>
                  )}
                  {syncHealthState === 'Syncing' && (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing (Push/Pull)...</span>
                    </>
                  )}
                  {syncHealthState === 'Offline' && (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Offline (Mất kết nối)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Máy chủ Firestore:</span>
                </span>
                <span className={`font-medium flex items-center space-x-1 ${
                  isOnline ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {isOnline ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kết nối trực tiếp</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Mất kết nối</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Firestore Listeners (Live):</span>
                </span>
                <span className="font-semibold text-emerald-700">
                  {connectedStreams > 0 ? connectedStreams : totalStreams} / {totalStreams} Bộ lắng nghe mở
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đồng bộ đa thiết bị:</span>
                </span>
                <span className="font-medium text-slate-900">Tức thì 100% (A ⟷ B)</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lần đồng bộ gần nhất:</span>
                </span>
                <span className="font-mono text-slate-700">{formatTime(lastSyncedAt)}</span>
              </div>

              {lastAutoSaveTime && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lần tự động lưu:</span>
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">{lastAutoSaveTime}</span>
                </div>
              )}
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

            {onOpenIntegrityDashboard && (
              <button
                id="open-integrity-center-btn"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenIntegrityDashboard();
                }}
                className="w-full mt-2.5 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 border border-indigo-200"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mở Trung Tâm Tự Chẩn Đoán Toàn Vẹn</span>
              </button>
            )}

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 italic">Dữ liệu đám mây Firestore</span>
              {onForceSync && (
                <button
                  id="force-sync-btn"
                  type="button"
                  disabled={isSyncing || isOperationInProgress}
                  onClick={async () => {
                    await onForceSync();
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing || isOperationInProgress ? 'animate-spin' : ''}`} />
                  <span>{isSyncing || isOperationInProgress ? 'Đang tải...' : 'Đồng bộ ngay'}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
