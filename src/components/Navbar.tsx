import React from 'react';
import { Ship, RefreshCw, Menu, Plus } from 'lucide-react';
import { CompanyProfile } from '../types/logistics';
import { CloudSyncStatusBadge } from './CloudSyncStatusBadge';

interface NavbarProps {
  company: CompanyProfile;
  exchangeRate: number;
  lastAutoSaveTime: string | null;
  isAutoSaving?: boolean;
  onToggleSidebar?: () => void;
  onExchangeRateChange: (rate: number) => void;
  onNewQuote?: () => void;
  isCloudSyncing?: boolean;
  onForceCloudSync?: () => Promise<void>;
  lastCloudSyncedAt?: Date | null;
  quoteCount?: number;
  customerCount?: number;
  rateCount?: number;
  onOpenIntegrityDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  company,
  exchangeRate,
  lastAutoSaveTime,
  isAutoSaving,
  onToggleSidebar,
  onExchangeRateChange,
  onNewQuote,
  isCloudSyncing = false,
  onForceCloudSync,
  lastCloudSyncedAt = null,
  quoteCount = 0,
  customerCount = 0,
  rateCount = 0,
  onOpenIntegrityDashboard,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-xs">
      
      {/* Left section with toggle and brand */}
      <div className="flex items-center space-x-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
            title="Mở thanh thư mục điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {company.logoUrl ? (
          <div className="h-10 w-12 bg-white rounded-lg flex items-center justify-center p-1 border border-slate-200 shrink-0 shadow-xs">
            <img 
              src={company.logoUrl} 
              alt={company.name} 
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
            <Ship className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-900 tracking-tight uppercase truncate">
              LOGISTICS QUOTATION PRO
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-200">
              v2.5 Master
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {company.name}
          </p>
        </div>
      </div>

      {/* Right controls: Sync Health indicator, Exchange Rate Adjuster & Quick New Quote */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Sync Health Visual Indicator (Replaces the static Firestore status label) */}
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
        <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-x-2">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline font-semibold uppercase text-[11px] tracking-wider text-slate-500">
            Tỷ giá USD:
          </span>
          <input 
            type="number"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
            className="w-20 bg-white text-blue-900 font-mono font-bold text-right px-2 py-0.5 rounded border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Chỉnh sửa tỷ giá USD/VND áp dụng cho bảng báo giá"
          />
          <span className="text-[11px] font-medium text-slate-400">VND</span>
        </div>

        {/* New Quote Quick Action */}
        {onNewQuote && (
          <button
            type="button"
            onClick={onNewQuote}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm px-3 sm:px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors"
            title="Tạo báo giá mới"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Báo Giá Mới</span>
          </button>
        )}

      </div>
    </header>
  );
};
