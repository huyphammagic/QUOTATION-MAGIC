/**
 * Phase 37: CompanySwitcher Component
 * Fast, elegant switcher allowing operators to switch enterprise company contexts,
 * view company branding, status, and initiate company profile management.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Settings, 
  Check, 
  ShieldCheck,
  Globe,
  Loader2,
  Receipt
} from 'lucide-react';
import { useMultiCompany } from '../../context/MultiCompanyContext';

interface CompanySwitcherProps {
  onOpenManageCompany: (tab?: any) => void;
  onOpenCreateCompany?: () => void;
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  onOpenManageCompany,
  onOpenCreateCompany
}) => {
  const { 
    activeCompanyId, 
    activeCompanyRecord, 
    companyMetadataList, 
    switchCompany,
    isLoadingCompanies 
  } = useMultiCompany();

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelectCompany = async (targetId: string) => {
    if (targetId === activeCompanyId) {
      setIsOpen(false);
      return;
    }
    setIsSwitching(true);
    try {
      await switchCompany(targetId);
      setIsOpen(false);
    } finally {
      setIsSwitching(false);
    }
  };

  const activeName = activeCompanyRecord?.displayName || activeCompanyRecord?.legalName || 'Doanh nghiệp';
  const activeCode = activeCompanyRecord?.companyCode || 'DEFAULT';
  const activeLogo = activeCompanyRecord?.branding?.logoUrl;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        id="company-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || isLoadingCompanies}
        aria-label="Chọn công ty hoạt động"
        aria-expanded={isOpen}
        className="flex items-center space-x-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[220px] sm:max-w-[260px]"
      >
        {/* Company Avatar / Logo */}
        <div className="w-7 h-7 bg-white rounded-md border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          {activeLogo ? (
            <img 
              src={activeLogo} 
              alt={activeName} 
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
          )}
        </div>

        {/* Company Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold font-mono tracking-wider text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200/60 uppercase">
              {activeCode}
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Entity</span>
          </div>
          <p className="text-xs font-semibold text-slate-800 truncate leading-tight mt-0.5">
            {activeName}
          </p>
        </div>

        {/* Chevron Icon */}
        <div className="shrink-0 text-slate-400">
          {isSwitching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          id="company-switcher-dropdown"
          className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                Multi-Entity Logistics
              </span>
              <h3 className="text-xs font-bold text-white">
                Chọn Pháp Nhân Báo Giá
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
              {companyMetadataList.length} Công ty
            </span>
          </div>

          {/* Companies List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {companyMetadataList.map((comp) => {
              const isSelected = comp.companyId === activeCompanyId;
              return (
                <button
                  key={comp.companyId}
                  id={`company-select-${comp.companyId}`}
                  type="button"
                  onClick={() => handleSelectCompany(comp.companyId)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs ${
                    isSelected 
                      ? 'bg-blue-50/80 text-blue-900 font-semibold' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    {/* Logo/Icon */}
                    <div className="w-8 h-8 bg-white rounded border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {comp.logoUrl ? (
                        <img 
                          src={comp.logoUrl} 
                          alt={comp.displayName} 
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-slate-500" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase text-slate-500">
                          {comp.companyCode}
                        </span>
                        {comp.taxCode && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            MST: {comp.taxCode}
                          </span>
                        )}
                      </div>
                      <div className="truncate font-medium text-slate-900 mt-0.5">
                        {comp.displayName || comp.legalName}
                      </div>
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="p-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-1.5">
            <button
              type="button"
              id="company-action-manage"
              onClick={() => {
                setIsOpen(false);
                onOpenManageCompany('profile');
              }}
              className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-medium transition-colors"
              title="Cấu hình thông tin pháp nhân & thương hiệu"
            >
              <Settings className="w-3 h-3 text-slate-500" />
              <span>Hồ Sơ</span>
            </button>

            <button
              type="button"
              id="company-action-financial"
              onClick={() => {
                setIsOpen(false);
                onOpenManageCompany('financial');
              }}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold transition-colors"
              title="Cấu hình tài chính, tiền tệ, VAT và ngân hàng theo pháp nhân (P38)"
            >
              <Receipt className="w-3 h-3 text-emerald-600" />
              <span>Tài Chính (P38)</span>
            </button>

            {onOpenCreateCompany && (
              <button
                type="button"
                id="company-action-create-new"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateCompany();
                }}
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                title="Tạo thêm công ty logistics mới"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
