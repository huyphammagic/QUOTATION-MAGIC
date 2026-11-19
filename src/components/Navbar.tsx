import React from 'react';
import { Menu, Plus, Search, Keyboard, QrCode } from 'lucide-react';
import { CompanyProfile } from '../types/logistics';
import { ExchangeRateDetail } from '../types/exchangeRate';
import { ExchangeRateBadge } from './exchangeRate/ExchangeRateBadge';
import { CloudSyncStatusBadge } from './CloudSyncStatusBadge';
import { CompanySwitcher } from './company/CompanySwitcher';

interface NavbarProps {
  company: CompanyProfile;
  exchangeRate: number;
  lastAutoSaveTime: string | null;
  isAutoSaving?: boolean;
  onToggleSidebar?: () => void;
  onExchangeRateChange: (rate: number) => void;
  onNewQuote?: () => void;
  onOpenDashboard?: (tab?: string) => void;
  isCloudSyncing?: boolean;
  onForceCloudSync?: () => Promise<void>;
  lastCloudSyncedAt?: Date | null;
  quoteCount?: number;
  customerCount?: number;
  rateCount?: number;
  contractsCount?: number;
  shipmentsCount?: number;
  workspaceId?: string;
  onOpenIntegrityDashboard?: () => void;
  onOpenCrossDeviceModal?: () => void;
  onOpenCompanyProfile?: (tab?: 'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial') => void;
  onOpenCreateCompany?: () => void;
  onOpenAuthModal?: () => void;
  onOpenSavedQuotes?: () => void;
  onOpenShipments?: () => void;
  onOpenControlTower?: () => void;
  onOpenEngagementRadar?: () => void;
  activeEngagementsCount?: number;
  liveRateDetail?: ExchangeRateDetail;
  isRefreshingLiveRate?: boolean;
  onRefreshLiveRate?: () => Promise<void>;
  onOpenExchangeRateModal?: () => void;
  onOpenRoutePresets?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  company,
  exchangeRate,
  lastAutoSaveTime,
  isAutoSaving,
  onToggleSidebar,
  onExchangeRateChange,
  onNewQuote,
  onOpenDashboard,
  isCloudSyncing = false,
  onForceCloudSync,
  lastCloudSyncedAt = null,
  quoteCount = 0,
  customerCount = 0,
  rateCount = 0,
  contractsCount = 0,
  shipmentsCount = 0,
  workspaceId = 'company_profile',
  onOpenIntegrityDashboard,
  onOpenCrossDeviceModal,
  onOpenCompanyProfile,
  onOpenCreateCompany,
  onOpenAuthModal,
  onOpenSavedQuotes,
  onOpenShipments,
  onOpenControlTower,
  onOpenEngagementRadar,
  activeEngagementsCount = 0,
  liveRateDetail,
  isRefreshingLiveRate,
  onRefreshLiveRate,
  onOpenExchangeRateModal,
  onOpenRoutePresets,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
}) => {

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8">
      
      {/* Zone 1: Brand Wordmark + Company Switcher */}
      <div className="flex items-center space-x-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
            title="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-2xs border border-slate-200/90 bg-white">
            <img 
              src="/logo.png" 
              alt="LogiQuote Logo" 
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            LogiQuote
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80">TMS</span>
          </span>
        </div>

        {/* Multi-Company Entity Switcher */}
        {onOpenCompanyProfile && (
          <div className="ml-1 pl-2 border-l border-slate-200">
            <CompanySwitcher
              onOpenManageCompany={onOpenCompanyProfile}
              onOpenCreateCompany={onOpenCreateCompany}
            />
          </div>
        )}
      </div>

      {/* Zone 2: Navigation is cleanly handled via Sidebar */}

      {/* Zone 3: Command Palette, Exchange Rate, Sync Health, and Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Command Palette Quick Search Button */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center space-x-2 bg-slate-50 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200/90 transition-all cursor-pointer shadow-2xs group press-physics-subtle focus-ring-physics-light"
            title="Mở Command Palette (Ctrl + K / Cmd + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            <span className="hidden xl:inline text-slate-500">Tra cứu nhanh cảng, phụ phí...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-600 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Keyboard Shortcuts Cheatsheet Button */}
        {onOpenShortcutsHelp && (
          <button
            type="button"
            onClick={onOpenShortcutsHelp}
            className="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Bảng phím tắt thao tác nhanh (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Sync Health Badge */}
        <CloudSyncStatusBadge
          isSyncing={Boolean(isCloudSyncing)}
          isAutoSaving={Boolean(isAutoSaving)}
          onForceSync={onForceCloudSync}
          lastSyncedAt={lastCloudSyncedAt}
          lastAutoSaveTime={lastAutoSaveTime}
          quoteCount={quoteCount}
          customerCount={customerCount}
          rateCount={rateCount}
          contractsCount={contractsCount}
          shipmentsCount={shipmentsCount}
          workspaceId={workspaceId}
          onOpenIntegrityDashboard={onOpenIntegrityDashboard}
          onOpenCrossDeviceModal={onOpenCrossDeviceModal}
        />

        {/* Cross-Device Pairing Quick Button */}
        {onOpenCrossDeviceModal && (
          <button
            id="cross-device-pairing-trigger"
            type="button"
            onClick={onOpenCrossDeviceModal}
            className="hidden md:flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Mở & Đồng Bộ Trên Thiết Bị Khác (QR Code, Link & Google)"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden xl:inline">Đa Thiết Bị</span>
          </button>
        )}

        {/* Real-time USD Exchange Rate Live Badge */}
        {liveRateDetail ? (
          <ExchangeRateBadge
            rateDetail={liveRateDetail}
            isUpdating={isRefreshingLiveRate}
            onRefresh={onRefreshLiveRate}
            onClick={onOpenExchangeRateModal}
            className="hidden sm:flex press-physics-subtle focus-ring-physics-light"
          />
        ) : (
          <div 
            onClick={onOpenExchangeRateModal}
            className="hidden sm:flex items-center bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 space-x-1.5 cursor-pointer hover:border-blue-400 hover:bg-white transition-all whitespace-nowrap shrink-0"
            title="Bấm để mở Trung tâm Tỷ giá USD Realtime Vietcombank"
          >
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">USD:</span>
            <span className="font-mono font-bold tabular-nums text-slate-900">{exchangeRate.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">₫</span>
          </div>
        )}

        {/* New Quote Quick Action */}
        {onNewQuote && (
          <button
            type="button"
            onClick={onNewQuote}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer press-physics focus-ring-physics-light whitespace-nowrap shrink-0"
            title="Tạo báo giá mới sạch"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo Báo Giá</span>
          </button>
        )}

      </div>
    </header>
  );
};
