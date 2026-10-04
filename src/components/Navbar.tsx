import React from 'react';
import { Ship, RefreshCw, Menu, Plus, LayoutDashboard, ShieldCheck, LogIn, FileText, Anchor, Radio } from 'lucide-react';
import { CompanyProfile } from '../types/logistics';
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
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <Ship className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">
            LogiQuote
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
            onClick={() => onOpenDashboard('OVERVIEW')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Báo Cáo & BI
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

      {/* Zone 3: Exchange Rate, Sync Health, Auth, and Primary Action */}
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

        {/* Exchange Rate Quick Adjuster */}
        <div className="hidden sm:flex items-center bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 space-x-1.5">
          <span className="text-[11px] font-medium text-slate-500">
            USD:
          </span>
          <input 
            type="number"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
            className="w-16 bg-white text-slate-900 font-mono font-semibold text-right px-1.5 py-0.5 rounded border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            title="Chỉnh sửa tỷ giá USD/VND"
          />
          <span className="text-[10px] text-slate-400">₫</span>
        </div>

        {/* User Authentication Status */}
        {onOpenAuthModal && (
          <button
            type="button"
            id="btn-navbar-auth"
            onClick={onOpenAuthModal}
            className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              isAuthenticated
                ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={isAuthenticated ? `Đang đăng nhập: ${user?.email}` : 'Đăng nhập'}
          >
            {isAuthenticated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline truncate max-w-[100px]">
                  {user?.displayName || user?.email?.split('@')[0]}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Đăng Nhập</span>
              </>
            )}
          </button>
        )}

        {/* New Quote Quick Action */}
        {onNewQuote && (
          <button
            type="button"
            onClick={onNewQuote}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Tạo báo giá mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo Báo Giá</span>
          </button>
        )}

      </div>
    </header>
  );
};
