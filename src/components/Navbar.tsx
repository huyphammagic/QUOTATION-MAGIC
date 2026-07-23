import React from 'react';
import { Ship, FileText, Settings, PlusCircle, RefreshCw, Building2, Receipt } from 'lucide-react';
import { CompanyProfile } from '../types/logistics';

interface NavbarProps {
  company: CompanyProfile;
  savedCount: number;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  onNewQuote: () => void;
  onOpenSavedQuotes: () => void;
  onOpenCompanyProfile: () => void;
  onOpenCustomers: () => void;
  onOpenSurchargeCatalog: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  company,
  savedCount,
  exchangeRate,
  onExchangeRateChange,
  onNewQuote,
  onOpenSavedQuotes,
  onOpenCompanyProfile,
  onOpenCustomers,
  onOpenSurchargeCatalog,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 shadow-xs">
      
      {/* Brand Title & Badge */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
          <Ship className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight uppercase">LOGISTICS QUOTATION PRO</h1>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-bold rounded uppercase tracking-wider border border-blue-200">
              v2.5 Master
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs sm:max-w-md">{company.name}</p>
        </div>
      </div>

      {/* Exchange Rate Quick Adjuster */}
      <div className="hidden lg:flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-x-2">
        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
        <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-500">Tỷ giá USD/VND:</span>
        <input 
          type="number"
          value={exchangeRate}
          onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
          className="w-20 bg-white text-blue-900 font-mono font-bold text-right px-2 py-0.5 rounded border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Action Menu Buttons */}
      <div className="flex items-center space-x-2">
        
        {/* Customers CRM Button */}
        <button
          onClick={onOpenCustomers}
          className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          title="Quản lý Data Khách Hàng (CRM)"
        >
          <Building2 className="w-4 h-4 text-blue-700" />
          <span className="hidden md:inline">Khách Hàng (CRM)</span>
        </button>

        {/* Surcharge Catalog Button */}
        <button
          onClick={onOpenSurchargeCatalog}
          className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          title="Danh Mục Phụ Phí & Local Charges"
        >
          <Receipt className="w-4 h-4 text-amber-600" />
          <span className="hidden md:inline">Danh Mục Phụ Phí</span>
        </button>

        {/* Saved Quotes List */}
        <button
          onClick={onOpenSavedQuotes}
          className="relative flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="hidden lg:inline">Báo Giá Đã Lưu</span>
          {savedCount > 0 && (
            <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
              {savedCount}
            </span>
          )}
        </button>

        {/* Company Settings */}
        <button
          onClick={onOpenCompanyProfile}
          className="p-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 transition-colors"
          title="Cấu hình Công ty Forwarding"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* New Quote */}
        <button
          onClick={onNewQuote}
          className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-2xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo Báo Giá Mới</span>
        </button>

      </div>

    </header>
  );
};


