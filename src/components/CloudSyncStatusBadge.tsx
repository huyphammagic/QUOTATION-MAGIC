import React, { useState, useEffect, useTransition } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  WifiOff, 
  Wifi, 
  FileText, 
  Users, 
  Layers, 
  Cpu, 
  Clock, 
  Activity, 
  ArrowRight,
  Database
} from 'lucide-react';
import { 
  moduleSyncMonitor, 
  SystemSyncSnapshot, 
  ModuleSyncStatus 
} from '../services/integrity/moduleSyncMonitorService';
import { fetchQuotations } from '../services/repository/quotationRepository';
import { fetchCustomers } from '../services/repository/customerRepository';
import { getRateMastersFromFirestore } from '../services/firebase/firestoreService';

export interface CloudSyncStatusBadgeProps {
  isSyncing?: boolean;
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
  isSyncing = false,
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
  const [syncSnapshot, setSyncSnapshot] = useState<SystemSyncSnapshot>(moduleSyncMonitor.getSnapshot());
  const [syncingModules, setSyncingModules] = useState<{ [key: string]: boolean }>({});
  const [, startTransition] = useTransition();

  // Sync snapshot subscription
  useEffect(() => {
    // Seed counts if provided from parent props
    moduleSyncMonitor.setModuleCounts({
      quotes: quoteCount,
      customers: customerCount,
      rates: rateCount,
    });

    const unsub = moduleSyncMonitor.subscribe(snap => {
      startTransition(() => {
        setSyncSnapshot(snap);
      });
    });

    return () => unsub();
  }, [quoteCount, customerCount, rateCount]);

  // Overall effective status factoring in external isSyncing / isAutoSaving
  const isGlobalSyncing = isSyncing || isAutoSaving || syncSnapshot.overallStatus === 'Syncing';
  const effectiveOverallStatus: ModuleSyncStatus = !syncSnapshot.isOnline 
    ? 'Error' 
    : isGlobalSyncing 
      ? 'Syncing' 
      : syncSnapshot.overallStatus;

  const formatTime = (d: Date | null) => {
    if (!d) return lastAutoSaveTime || 'Vừa xong';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Helper for color indicator styling per status
  const getStatusDotClasses = (status: ModuleSyncStatus) => {
    switch (status) {
      case 'Syncing':
        return {
          ping: 'bg-amber-400',
          dot: 'bg-amber-500 shadow-amber-500/50',
          text: 'text-amber-700',
          bg: 'bg-amber-50 border-amber-200',
          badgeText: 'Syncing',
        };
      case 'Error':
        return {
          ping: 'bg-rose-400',
          dot: 'bg-rose-500 shadow-rose-500/50',
          text: 'text-rose-700',
          bg: 'bg-rose-50 border-rose-200',
          badgeText: 'Error',
        };
      case 'Synced':
      default:
        return {
          ping: 'bg-emerald-400',
          dot: 'bg-emerald-500 shadow-emerald-500/50',
          text: 'text-emerald-700',
          bg: 'bg-emerald-50 border-emerald-200',
          badgeText: 'Synced',
        };
    }
  };

  // Individual Module Re-sync handler
  const handleResyncModule = async (moduleId: 'quotes' | 'customers' | 'rates', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (syncingModules[moduleId]) return;

    setSyncingModules(prev => ({ ...prev, [moduleId]: true }));
    moduleSyncMonitor.setModuleSyncing(moduleId);

    try {
      if (moduleId === 'quotes') {
        const data = await fetchQuotations({ forceRefresh: true });
        moduleSyncMonitor.setModuleSynced('quotes', data.length);
      } else if (moduleId === 'customers') {
        const data = await fetchCustomers(true);
        moduleSyncMonitor.setModuleSynced('customers', data.length);
      } else if (moduleId === 'rates') {
        const data = await getRateMastersFromFirestore();
        moduleSyncMonitor.setModuleSynced('rates', data.length);
      }
    } catch (err: any) {
      moduleSyncMonitor.setModuleError(moduleId, err);
    } finally {
      setSyncingModules(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  // Sync All Modules handler
  const handleSyncAll = async () => {
    if (isGlobalSyncing) return;
    setSyncingModules({ quotes: true, customers: true, rates: true });

    try {
      if (onForceSync) {
        await onForceSync();
      }
      await Promise.allSettled([
        fetchQuotations({ forceRefresh: true }),
        fetchCustomers(true),
        getRateMastersFromFirestore(),
      ]);
    } finally {
      setSyncingModules({ quotes: false, customers: false, rates: false });
    }
  };

  const modulesList = [
    {
      id: 'quotes' as const,
      nameVi: 'Báo Giá',
      nameEn: 'Quotes',
      icon: FileText,
      data: syncSnapshot.modules.quotes,
      fallbackCount: quoteCount,
    },
    {
      id: 'customers' as const,
      nameVi: 'Khách Hàng',
      nameEn: 'Customers',
      icon: Users,
      data: syncSnapshot.modules.customers,
      fallbackCount: customerCount,
    },
    {
      id: 'rates' as const,
      nameVi: 'Biểu Cước',
      nameEn: 'Rates',
      icon: Layers,
      data: syncSnapshot.modules.rates,
      fallbackCount: rateCount,
    },
  ];

  return (
    <div className="relative inline-block text-left select-none">
      {/* 
        ========================================================================
        NAVBAR REAL-TIME SYSTEM SYNC HEALTH TRIGGER
        Color-coded status indicators per module (Quotes, Customers, Rates)
        ========================================================================
      */}
      <button
        id="sync-health-monitor-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 shadow-2xs cursor-pointer press-physics-subtle focus-ring-physics-light ${
          effectiveOverallStatus === 'Synced'
            ? 'bg-slate-50/90 text-slate-800 border-slate-200/90 hover:bg-slate-100/90 hover:border-slate-300'
            : effectiveOverallStatus === 'Syncing'
            ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 hover:bg-amber-100'
            : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
        }`}
        title={`System Sync Health: Quotes (${syncSnapshot.modules.quotes.status}), Customers (${syncSnapshot.modules.customers.status}), Rates (${syncSnapshot.modules.rates.status})`}
        aria-label="System Sync Health Monitor"
      >
        {/* Overall Status Icon or Activity Indicator */}
        <div className="flex items-center space-x-1.5">
          {effectiveOverallStatus === 'Syncing' ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
          ) : effectiveOverallStatus === 'Error' ? (
            <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden sm:inline" />
          )}

          <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">
            Sync Health:
          </span>
        </div>

        {/* 
          Color-coded status indicators per individual module:
          Quotes, Customers, Rates
        */}
        <div className="flex items-center space-x-1.5 pl-0.5">
          {modulesList.map(mod => {
            const modStatus: ModuleSyncStatus = syncingModules[mod.id] ? 'Syncing' : mod.data.status;
            const dotStyle = getStatusDotClasses(modStatus);

            return (
              <div 
                key={mod.id} 
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-white/70 border border-slate-200/60 shadow-2xs text-[10px] font-medium transition-colors"
                title={`${mod.nameVi} (${mod.nameEn}): ${modStatus} • ${mod.data.count || mod.fallbackCount} bản ghi`}
              >
                {/* Color-Coded Micro Dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                  {modStatus === 'Syncing' && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotStyle.ping}`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dotStyle.dot}`} />
                </span>

                {/* Module Short Label */}
                <span className="font-semibold text-slate-700 hidden lg:inline">
                  {mod.id === 'quotes' ? 'Quotes' : mod.id === 'customers' ? 'Cust' : 'Rates'}
                </span>
              </div>
            );
          })}
        </div>
      </button>

      {/* 
        ========================================================================
        INTERACTIVE SYSTEM SYNC HEALTH POPOVER
        Detailed per-module breakdown, live counts, error hints & manual resync
        ========================================================================
      */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            id="sync-health-popover-menu"
            className="absolute right-0 mt-2 w-92 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl ${
                  effectiveOverallStatus === 'Synced'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : effectiveOverallStatus === 'Syncing'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    System Sync Health
                    <span className="text-[10px] font-medium text-slate-400 font-mono">Firebase</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Giám sát đồng bộ từng phân hệ thời gian thực</p>
                </div>
              </div>

              {/* Network Connectivity Pill */}
              <div className="flex items-center space-x-1.5">
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  syncSnapshot.isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {syncSnapshot.isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  <span>{syncSnapshot.isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
            </div>

            {/* Overall Snapshot Banner */}
            <div className="mt-2.5 px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center space-x-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Lần đồng bộ gần nhất:</span>
              </span>
              <span className="font-mono text-xs font-semibold text-slate-800">
                {formatTime(lastSyncedAt || syncSnapshot.lastGlobalSyncAt)}
              </span>
            </div>

            {/* 
              Per-Module Real-time Sync Cards:
              1. Customers (Khách Hàng)
              2. Quotes (Báo Giá)
              3. Rates (Biểu Cước Master & Local Charges)
            */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                <span>Trạng thái từng phân hệ</span>
                <span>Hành động</span>
              </div>

              {modulesList.map(mod => {
                const isModSyncing = syncingModules[mod.id] || mod.data.status === 'Syncing';
                const modStatus: ModuleSyncStatus = isModSyncing ? 'Syncing' : mod.data.status;
                const dotStyle = getStatusDotClasses(modStatus);
                const IconComponent = mod.icon;
                const count = mod.data.count > 0 ? mod.data.count : mod.fallbackCount;

                return (
                  <div 
                    key={mod.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {mod.nameVi}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({mod.nameEn})
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700 font-mono">
                            {count} bản ghi
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">
                            {formatTime(mod.data.lastSyncedAt)}
                          </span>
                        </div>

                        {/* Error message tooltip/inline display if Error */}
                        {modStatus === 'Error' && mod.data.errorMessage && (
                          <p className="text-[10px] text-rose-600 font-medium mt-1 truncate max-w-[200px]" title={mod.data.errorMessage}>
                            Lỗi: {mod.data.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge + Re-sync Button */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Color-coded Status Indicator Pill */}
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${dotStyle.bg} ${dotStyle.text}`}>
                        {modStatus === 'Syncing' ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : modStatus === 'Error' ? (
                          <AlertCircle className="w-2.5 h-2.5" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        <span>{dotStyle.badgeText}</span>
                      </span>

                      {/* Manual Re-sync Button for this module */}
                      <button
                        type="button"
                        onClick={(e) => handleResyncModule(mod.id, e)}
                        disabled={isModSyncing || !syncSnapshot.isOnline}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                        title={`Đồng bộ lại phân hệ ${mod.nameVi}`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isModSyncing ? 'animate-spin text-amber-600' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Link to Integrity Dashboard if available */}
            {onOpenIntegrityDashboard && (
              <button
                id="open-integrity-center-btn"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenIntegrityDashboard();
                }}
                className="w-full mt-3 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-between border border-indigo-200/80 cursor-pointer press-physics-subtle"
              >
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Trung Tâm Tự Chẩn Đoán Toàn Vẹn</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            )}

            {/* Popover Footer: Sync All Actions */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                Firebase Firestore Multi-Device
              </span>

              <button
                id="force-sync-all-btn"
                type="button"
                disabled={isGlobalSyncing || !syncSnapshot.isOnline}
                onClick={handleSyncAll}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-xs press-physics-subtle"
                title="Đồng bộ tất cả phân hệ (Khách Hàng, Báo Giá, Biểu Cước)"
              >
                <RefreshCw className={`w-3 h-3 ${isGlobalSyncing ? 'animate-spin' : ''}`} />
                <span>{isGlobalSyncing ? 'Đang đồng bộ...' : 'Đồng bộ tất cả'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
