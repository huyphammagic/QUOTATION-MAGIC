import React from 'react';
import { CompanyProfile } from '../types/logistics';
import { Building2, Settings, Phone, Mail, Globe, CreditCard, UserCheck, ShieldCheck, MapPin, AlertCircle } from 'lucide-react';

interface CompanyCardProps {
  company: CompanyProfile;
  onOpenCompanyProfile: () => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onOpenCompanyProfile }) => {
  const isConfigured = Boolean(company && company.name && company.name.trim().length > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          {company.logoUrl ? (
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 shadow-xs border border-slate-700">
              <img 
                src={company.logoUrl} 
                alt={company.name} 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                Đơn Vị Báo Giá (Forwarder)
              </span>
              {company.taxId && (
                <span className="text-xs text-slate-400 font-mono hidden md:inline">MST: {company.taxId}</span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
              {isConfigured ? company.name : 'Chưa cấu hình thông tin doanh nghiệp'}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCompanyProfile}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs self-start sm:self-auto shrink-0"
          title="Mở bảng cấu hình thông tin doanh nghiệp"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{isConfigured ? 'Quản Lý Thông Tin Công Ty' : 'Thiết Lập Hồ Sơ Công Ty'}</span>
        </button>
      </div>

      {/* Details Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/50">
        
        {/* Col 1: Legal & Address */}
        <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Pháp Lý & Trụ Sở</span>
          </div>
          {company.englishName ? (
            <p className="text-slate-600 italic text-[11px] truncate" title={company.englishName}>
              {company.englishName}
            </p>
          ) : null}
          {company.address ? (
            <p className="text-slate-700 flex items-start space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2" title={company.address}>{company.address}</span>
            </p>
          ) : (
            <p className="text-slate-400 italic flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Chưa cấu hình địa chỉ trụ sở</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 pt-1">
            {company.phone && (
              <span className="flex items-center space-x-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{company.phone}</span>
              </span>
            )}
            {company.email && (
              <span className="flex items-center space-x-1">
                <Mail className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[150px]">{company.email}</span>
              </span>
            )}
            {company.website && (
              <span className="flex items-center space-x-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[150px]">{company.website}</span>
              </span>
            )}
          </div>
        </div>

        {/* Col 2: Sales Executive */}
        <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Người Lập Báo Giá (Sales Rep)</span>
          </div>
          {company.salesRepName ? (
            <>
              <p className="font-bold text-slate-900 text-sm">{company.salesRepName}</p>
              <p className="text-slate-600 text-[11px]">{company.salesRepTitle || 'Chuyên viên Báo giá & Cước'}</p>
              <div className="space-y-0.5 text-slate-600 pt-0.5">
                {company.salesRepPhone && (
                  <p className="flex items-center space-x-1.5">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>SĐT/Zalo: <strong>{company.salesRepPhone}</strong></span>
                  </p>
                )}
                {company.salesRepEmail && (
                  <p className="flex items-center space-x-1.5">
                    <Mail className="w-3 h-3 text-emerald-600" />
                    <span className="truncate">{company.salesRepEmail}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-400 italic flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Chưa thiết lập người phụ trách báo giá</span>
            </p>
          )}
        </div>

        {/* Col 3: Banking Details */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tài Khoản Thanh Toán</span>
          </div>
          {company.bankName || company.bankAccountNo ? (
            <>
              <p className="font-semibold text-slate-800 text-[11px] truncate" title={company.bankName}>
                {company.bankName}
              </p>
              <p className="text-slate-700 font-mono text-[11px]">
                Số TK: <strong className="text-slate-900">{company.bankAccountNo}</strong>
              </p>
              {company.bankAccountHolder && (
                <p className="text-slate-600 text-[11px] truncate" title={company.bankAccountHolder}>
                  Chủ TK: {company.bankAccountHolder}
                </p>
              )}
              {company.bankSwiftCode && (
                <p className="text-slate-500 font-mono text-[10px]">
                  SWIFT: {company.bankSwiftCode}
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-400 italic flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Chưa cấu hình tài khoản ngân hàng</span>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
