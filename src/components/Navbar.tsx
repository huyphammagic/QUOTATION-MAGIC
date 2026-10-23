import React from 'react';
import { Ship, RefreshCw, Menu, Plus, LayoutDashboard, ShieldCheck, LogIn, FileText, Anchor, Radio, Compass, LayoutGrid, Zap } from 'lucide-react';
import { CompanyProfile } from '../types/logistics';
import { ExchangeRateDetail } from '../types/exchangeRate';
import { ExchangeRateBadge } from './exchangeRate/ExchangeRateBadge';
import { CloudSyncStatusBadge } from './CloudSyncStatusBadge';
import { CompanySwitcher } from './company/CompanySwitcher';
import { useAuth } from '../context/AuthContext';

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
  onOpenIntegrityDashboard?: () => void;
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
  onOpenIntegrityDashboard,
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
}) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8">
      
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
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">TMS</span>
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

      {/* Zone 2: Fast Navigation Links (Single-line, quiet hover) */}
      <nav className="hidden xl:flex items-center space-x-6 text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => {}}
          className="text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5 cursor-pointer"
        >
          Báo Giá Hiện Tại
        </button>

        {onOpenSavedQuotes && (
          <button
            type="button"
            onClick={onOpenSavedQuotes}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Danh Sách Báo Giá ({quoteCount})
          </button>
        )}

        {onOpenShipments && (
          <button
            type="button"
            onClick={onOpenShipments}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Điều Hành Lô Hàng
          </button>
        )}

        {onOpenControlTower && (
          <button
            type="button"
            onClick={onOpenControlTower}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Tháp Điều Hành
          </button>
        )}



        {onOpenDashboard && (
          <button
            type="button"
            onClick={() => onOpenDashboard('COCKPIT')}
            className="flex items-center space-x-1.5 hover:text-slate-900 transition-colors cursor-pointer"
            title="Mở Bảng Điều Hành Cockpit & Báo Cáo Phân Tích BI"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cockpit & Báo Cáo BI</span>
          </button>
        )}

        {onOpenEngagementRadar && (
          <button
            type="button"
            onClick={onOpenEngagementRadar}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              activeEngagementsCount > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
            title="Radar khách hàng đang xem báo giá thời gian thực"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeEngagementsCount > 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            <span>Radar Live</span>
            {activeEngagementsCount > 0 && (
              <span className="font-mono text-[10px] px-1 bg-emerald-600 text-white rounded-full">
                {activeEngagementsCount}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Zone 3: Exchange Rate, Sync Health, and Primary Action */}
      <div className="flex items-center space-x-2 sm:space-x-3">
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
          onOpenIntegrityDashboard={onOpenIntegrityDashboard}
        />

        {/* Real-time USD Exchange Rate Live Badge */}
        {liveRateDetail ? (
          <ExchangeRateBadge
            rateDetail={liveRateDetail}
            isUpdating={isRefreshingLiveRate}
            onRefresh={onRefreshLiveRate}
            onClick={onOpenExchangeRateModal}
            className="hidden sm:flex"
          />
        ) : (
          <div 
            onClick={onOpenExchangeRateModal}
            className="hidden sm:flex items-center bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 space-x-1.5 cursor-pointer hover:border-blue-400 hover:bg-white transition-colors"
            title="Bấm để mở Trung tâm Tỷ giá USD Realtime Vietcombank"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">USD:</span>
            <span className="font-mono font-bold text-slate-900">{exchangeRate.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">₫</span>
          </div>
        )}

        {/* New Quote Quick Action */}
        {onNewQuote && (
          <button
            type="button"
            onClick={onNewQuote}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
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
