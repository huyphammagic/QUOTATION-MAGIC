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
  Database,
  QrCode,
  FileSignature,
  Ship
} from 'lucide-react';
import { 
  moduleSyncMonitor, 
  SystemSyncSnapshot, 
  ModuleSyncStatus 
} from '../services/integrity/moduleSyncMonitorService';
import { fetchQuotations } from '../services/repository/quotationRepository';
import { fetchCustomers } from '../services/repository/customerRepository';
import { fetchRateMasters } from '../services/repository/rateRepository';
import { getCloudVaultStatus } from '../services/firebase/cloudStorageVaultService';

export interface CloudSyncStatusBadgeProps {
  isSyncing?: boolean;
  isAutoSaving?: boolean;
  onForceSync?: () => Promise<void>;
  lastSyncedAt?: Date | null;
  lastAutoSaveTime?: string | null;
  quoteCount?: number;
  customerCount?: number;
  rateCount?: number;
  contractsCount?: number;
  shipmentsCount?: number;
  workspaceId?: string;
  onOpenIntegrityDashboard?: () => void;
  onOpenCrossDeviceModal?: () => void;
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
  contractsCount = 0,
  shipmentsCount = 0,
  workspaceId = 'company_profile',
  onOpenIntegrityDashboard,
  onOpenCrossDeviceModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncSnapshot, setSyncSnapshot] = useState<SystemSyncSnapshot>(moduleSyncMonitor.getSnapshot());
  const [syncingModules, setSyncingModules] = useState<{ [key: string]: boolean }>({});
  const [, startTransition] = useTransition();

  // Sync snapshot subscription
  useEffect(() => {
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

  // Overall effective status factoring in external isSyncing & moduleSyncMonitor
  const isGlobalSyncing = isSyncing || syncSnapshot.overallStatus === 'Syncing';
  const effectiveOverallStatus: ModuleSyncStatus = !syncSnapshot.isOnline 
    ? 'Error' 
    : isGlobalSyncing || isAutoSaving
      ? 'Syncing' 
      : syncSnapshot.overallStatus;

  const formatTime = (d: Date | null) => {
    if (!d) return lastAutoSaveTime || 'Vừa xong';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusDotClasses = (status: ModuleSyncStatus) => {
    switch (status) {
      case 'Syncing':
        return {
          dot: 'bg-amber-500',
          text: 'text-amber-700',
          bg: 'bg-amber-50 border-amber-200',
          badgeText: 'Syncing',
        };
      case 'Error':
        return {
          dot: 'bg-rose-500',
          text: 'text-rose-700',
          bg: 'bg-rose-50 border-rose-200',
          badgeText: 'Error',
        };
      case 'Synced':
      default:
        return {
          dot: 'bg-emerald-500',
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
        const data = await fetchRateMasters(true);
        moduleSyncMonitor.setModuleSynced('rates', data.length);
      }
    } catch (err: any) {
      moduleSyncMonitor.setModuleError(moduleId, err);
    } finally {
      setSyncingModules(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  // Sync All Modules handler (always clickable unless explicit manual full sync is in flight)
  const handleSyncAll = async () => {
    if (isSyncing) return;
    setSyncingModules({ quotes: true, customers: true, rates: true });

    try {
      if (onForceSync) {
        await onForceSync();
      } else {
        const [quotesRes, custRes, ratesRes] = await Promise.allSettled([
          fetchQuotations({ forceRefresh: true }),
          fetchCustomers(true),
          fetchRateMasters(true),
        ]);
        if (quotesRes.status === 'fulfilled') moduleSyncMonitor.setModuleSynced('quotes', quotesRes.value.length);
        if (custRes.status === 'fulfilled') moduleSyncMonitor.setModuleSynced('customers', custRes.value.length);
        if (ratesRes.status === 'fulfilled') moduleSyncMonitor.setModuleSynced('rates', ratesRes.value.length);
      }
    } finally {
      // Guarantee no module remains stranded in Syncing after a forced full sync
      const current = moduleSyncMonitor.getSnapshot().modules;
      if (current.quotes.status === 'Syncing') moduleSyncMonitor.setModuleSynced('quotes', current.quotes.count);
      if (current.customers.status === 'Syncing') moduleSyncMonitor.setModuleSynced('customers', current.customers.count);
      if (current.rates.status === 'Syncing') moduleSyncMonitor.setModuleSynced('rates', current.rates.count);
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

  const vaultModules = getCloudVaultStatus(workspaceId);
  const hydratedVaultCount = vaultModules.filter((m) => m.isHydrated).length;

  return (
    <div className="relative inline-block text-left select-none shrink-0">
      <button
        id="sync-health-monitor-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
          effectiveOverallStatus === 'Synced'
            ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            : effectiveOverallStatus === 'Syncing'
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
        }`}
        title={`Cloud Sync: Quotes (${syncSnapshot.modules.quotes.count || quoteCount}), Customers (${syncSnapshot.modules.customers.count || customerCount}), Rates (${syncSnapshot.modules.rates.count || rateCount})`}
        aria-label="Cloud Sync Status Monitor"
      >
        <div className="flex items-center space-x-1.5">
          {effectiveOverallStatus === 'Syncing' ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
          ) : effectiveOverallStatus === 'Error' ? (
            <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden sm:inline" />
          )}

          <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">
            Cloud Sync:
          </span>
        </div>

        <div className="flex items-center space-x-1.5 pl-0.5">
          {modulesList.map(mod => {
            const modStatus: ModuleSyncStatus = syncingModules[mod.id] ? 'Syncing' : mod.data.status;
            const dotStyle = getStatusDotClasses(modStatus);
            const countVal = mod.data.count > 0 ? mod.data.count : mod.fallbackCount;

            return (
              <div 
                key={mod.id} 
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white border border-slate-200/80 text-[10px] font-medium"
                title={`${mod.nameVi} (${mod.nameEn}): ${modStatus} · ${countVal} bản ghi`}
              >
                <span className={`inline-flex rounded-full h-1.5 w-1.5 shrink-0 ${dotStyle.dot}`} />
                <span className="font-semibold text-slate-700 hidden lg:inline">
                  {mod.id === 'quotes' ? 'Quotes' : mod.id === 'customers' ? 'Cust' : 'Rates'}
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-900 hidden xl:inline">
                  {countVal}
                </span>
              </div>
            );
          })}
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            id="sync-health-popover-menu"
            className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg border ${
                  effectiveOverallStatus === 'Synced'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : effectiveOverallStatus === 'Syncing'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Đồng Bộ Dữ Liệu Đa Thiết Bị</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">Workspace: {workspaceId}</p>
                </div>
              </div>

              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded border ${
                syncSnapshot.isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {syncSnapshot.isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                <span>{syncSnapshot.isOnline ? 'Online' : 'Offline'}</span>
              </span>
            </div>

            {/* Overall Snapshot Row */}
            <div className="mt-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center space-x-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Đồng bộ gần nhất:</span>
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
                {formatTime(lastSyncedAt || syncSnapshot.lastGlobalSyncAt)}
              </span>
            </div>

            {/* Core Collections Breakdown */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                <span>Phân hệ cốt lõi</span>
                <span>Tải lại từ server</span>
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
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {mod.nameVi}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums font-bold text-slate-700">
                            ({count})
                          </span>
                        </div>
                        {modStatus === 'Error' && mod.data.errorMessage && (
                          <p className="text-[10px] text-rose-600 font-medium mt-0.5 truncate max-w-[190px]" title={mod.data.errorMessage}>
                            Lỗi: {mod.data.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border ${dotStyle.bg} ${dotStyle.text}`}>
                        {modStatus === 'Syncing' ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : modStatus === 'Error' ? (
                          <AlertCircle className="w-2.5 h-2.5" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        <span>{dotStyle.badgeText}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleResyncModule(mod.id, e)}
                        disabled={isModSyncing || !syncSnapshot.isOnline}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                        title={`Tải lại phân hệ ${mod.nameVi} từ Cloud Server`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isModSyncing ? 'animate-spin text-amber-600' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Operations + 14-Module Storage Vault Summary Strip */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <FileSignature className="w-3 h-3" />
                    <span>HĐ</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{contractsCount}</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Ship className="w-3 h-3" />
                    <span>Lô hàng</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{shipmentsCount}</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-slate-500">Vault</span>
                  <span className="font-mono font-bold tabular-nums text-emerald-700">{hydratedVaultCount}/{vaultModules.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-3 space-y-1.5">
              {onOpenCrossDeviceModal && (
                <button
                  id="open-cross-device-qr-btn"
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCrossDeviceModal();
                  }}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-between border border-blue-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mở Trên Thiết Bị Khác (QR & Link)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                </button>
              )}

              {onOpenIntegrityDashboard && (
                <button
                  id="open-integrity-center-btn"
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenIntegrityDashboard();
                  }}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-between border border-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                    <span>Trung Tâm Bảo Vệ & Dữ Liệu Cloud Vault</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>

            {/* Popover Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                Firestore + Storage Live
              </span>

              <button
                id="force-sync-all-btn"
                type="button"
                disabled={isGlobalSyncing || !syncSnapshot.isOnline}
                onClick={handleSyncAll}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title="Tải mới 100% dữ liệu từ Cloud Server bỏ qua bộ nhớ đệm"
              >
                <RefreshCw className={`w-3 h-3 ${isGlobalSyncing ? 'animate-spin' : ''}`} />
                <span>{isGlobalSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Từ Cloud Ngay'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

