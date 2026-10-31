import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CustomerInfo, QuoteStatus, CustomerRecord } from '../types/logistics';
import { formatNumberVND } from '../utils/formatters';
import { 
  Building, 
  Users, 
  UserPlus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  CreditCard,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export interface CustomerFormErrors {
  quoteNumber?: string;
  companyName?: string;
  validityDate?: string;
}

export interface FieldInfoTooltipProps {
  title: string;
  description: string;
  example?: string;
  badge?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom';
}

/**
 * Reusable accessible Tooltip component with Info icon for quick field guidance
 */
export const FieldInfoTooltip: React.FC<FieldInfoTooltipProps> = ({
  title,
  description,
  example,
  badge,
  align = 'center',
  side = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0 translate-x-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 translate-x-0',
  };

  const arrowAlignClasses = {
    left: 'left-3.5',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-3.5',
  };

  const positionClass = side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';
  const arrowPositionClass = side === 'bottom' 
    ? 'bottom-full -mb-1 border-b-slate-900 border-t-transparent' 
    : 'top-full -mt-1 border-t-slate-900 border-b-transparent';

  return (
    <span ref={containerRef} className="relative inline-flex items-center ml-1 align-baseline z-30">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-indigo-600 focus:text-indigo-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-help focus:outline-none"
        title={title}
        aria-label={`Trợ giúp: ${title}`}
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && (
        <span
          role="tooltip"
          className={`absolute ${positionClass} ${alignClasses[align]} pointer-events-none w-64 sm:w-72 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 z-50`}
        >
          <span className="flex items-center justify-between gap-1.5 mb-1 pb-1 border-b border-slate-800">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{title}</span>
            </span>
            {badge && (
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shrink-0">
                {badge}
              </span>
            )}
          </span>
          <span className="block text-slate-200 text-[10.5px] leading-snug">
            {description}
          </span>
          {example && (
            <span className="block mt-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span className="text-slate-500 font-medium">Gợi ý:</span>{' '}
              <span className="text-emerald-300 font-mono font-semibold">{example}</span>
            </span>
          )}
          {/* Triangular Arrow Pointer */}
          <span
            className={`absolute ${arrowPositionClass} ${arrowAlignClasses[align]} border-4 border-transparent`}
          />
        </span>
      )}
    </span>
  );
};

interface CustomerFormProps {
  customer: CustomerInfo;
  quoteNumber: string;
  createdDate: string;
  validityDate: string;
  status: QuoteStatus;
  salesRepName: string;
  customers?: CustomerRecord[];
  onChangeCustomer: (field: keyof CustomerInfo, val: any) => void;
  onChangeQuoteMeta: (field: 'quoteNumber' | 'createdDate' | 'validityDate' | 'status', val: string) => void;
  onOpenCustomerManager?: () => void;
  onSaveToCrm?: () => void;
  onSelectCustomer?: (customer: CustomerRecord) => void;
  isSavingToCrm?: boolean;
  onOpenCustomer360?: () => void;
  errors?: CustomerFormErrors;
  shakeTrigger?: number;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  quoteNumber,
  createdDate,
  validityDate,
  status,
  salesRepName,
  customers = [],
  onChangeCustomer,
  onChangeQuoteMeta,
  onOpenCustomerManager,
  onSaveToCrm,
  onSelectCustomer,
  isSavingToCrm = false,
  onOpenCustomer360,
  errors,
  shakeTrigger = 0,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Trigger subtle shake animation when shakeTrigger updates and errors exist
  useEffect(() => {
    if (shakeTrigger > 0 && errors && (errors.quoteNumber || errors.companyName || errors.validityDate)) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 450);
      return () => clearTimeout(timer);
    }
  }, [shakeTrigger, errors]);

  // Auto-fill or calculate quick validity dates (+7, +15, +30 days)
  const setQuickValidity = (days: number) => {
    const base = createdDate ? new Date(createdDate) : new Date();
    base.setDate(base.getDate() + days);
    const dateStr = base.toISOString().split('T')[0];
    onChangeQuoteMeta('validityDate', dateStr);
  };

  // Filter matching customers based on current input
  const matchingCustomers = useMemo(() => {
    if (customers.length === 0) return [];
    const query = (customer.companyName || '').toLowerCase().trim();
    if (!query) return customers.slice(0, 6);

    return customers.filter(c => {
      const matchComp = (c.companyName || '').toLowerCase().includes(query);
      const matchName = (c.customerName || '').toLowerCase().includes(query);
      const matchTax = (c.taxId || '').toLowerCase().includes(query);
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchContact = (c.contactPerson || '').toLowerCase().includes(query);
      return matchComp || matchName || matchTax || matchCode || matchContact;
    }).slice(0, 8);
  }, [customers, customer.companyName]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (cust: CustomerRecord) => {
    if (onSelectCustomer) {
      onSelectCustomer(cust);
    } else {
      onChangeCustomer('companyName', cust.companyName);
      onChangeCustomer('customerName', cust.customerName || cust.companyName);
      onChangeCustomer('contactPerson', cust.contactPerson || '');
      onChangeCustomer('taxId', cust.taxId || '');
      onChangeCustomer('phone', cust.phone || '');
      onChangeCustomer('email', cust.email || '');
      onChangeCustomer('address', cust.address || '');
      if (cust.creditLimitVnd !== undefined) onChangeCustomer('creditLimitVnd', cust.creditLimitVnd);
      if (cust.creditTermDays !== undefined) onChangeCustomer('creditTermDays', cust.creditTermDays);
      if (cust.creditStatus) onChangeCustomer('creditStatus', cust.creditStatus);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Building className="w-3.5 h-3.5 text-slate-800" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 tracking-tight truncate">
                Khách Hàng & Báo Giá
              </h2>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-500 font-mono truncate">
                {customers.length} KH CRM
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Quick CRM Dropdown */}
          {customers.length > 0 && (
            <select
              value={customer.id || ''}
              onChange={(e) => {
                const targetId = e.target.value;
                const found = customers.find(c => c.id === targetId || c.code === targetId);
                if (found) handleSelectSuggestion(found);
              }}
              className="text-xs font-medium pl-2 pr-6 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
              title="Chọn nhanh từ danh sách khách hàng Cloud CRM"
            >
              <option value="">Chọn từ CRM ({customers.length})...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.companyName}
                </option>
              ))}
            </select>
          )}

          {onOpenCustomer360 && (
            <button
              type="button"
              onClick={onOpenCustomer360}
              className="press-physics-subtle inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Mở hồ sơ khách hàng 360°"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>360°</span>
            </button>
          )}

          {onOpenCustomerManager && (
            <button
              type="button"
              onClick={onOpenCustomerManager}
              className="press-physics-subtle inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Mở quản lý khách hàng CRM"
            >
              <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">CRM</span>
            </button>
          )}

          {onSaveToCrm && (
            <button
              type="button"
              onClick={onSaveToCrm}
              disabled={isSavingToCrm || (!customer.companyName && !customer.taxId)}
              className="press-physics-subtle inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Lưu thông tin khách hàng này vào CRM"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">{isSavingToCrm ? 'Lưu...' : '+ CRM'}</span>
            </button>
          )}

          {/* Status Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <FieldInfoTooltip
              title="Trạng Thái Báo Giá"
              description="Vòng đời hồ sơ báo giá: DRAFT (Bản nháp), PENDING_APPROVAL (Chờ duyệt), APPROVED (Đã duyệt), SENT (Đã gửi), ACCEPTED (Chốt deal), REJECTED (Từ chối) hoặc EXPIRED (Hết hạn)."
              badge="Workflow"
              align="right"
              side="bottom"
            />
            <select
              value={status}
              onChange={(e) => onChangeQuoteMeta('status', e.target.value)}
              className={`text-xs font-bold px-2 py-1 rounded-lg border focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shrink-0 transition-colors ${
                status === 'APPROVED' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : status === 'SENT'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : status === 'ACCEPTED'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                  : status === 'PENDING_APPROVAL'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : status === 'EXPIRED'
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
              title="Trạng thái quy trình báo giá"
            >
              <option value="DRAFT">Bản nháp</option>
              <option value="PENDING_APPROVAL">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="SENT">Đã gửi</option>
              <option value="ACCEPTED">Chấp thuận</option>
              <option value="REJECTED">Từ chối</option>
              <option value="EXPIRED">Hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Essential Inputs (High-priority grid) */}
      <div className="p-4 space-y-3" ref={suggestionsRef}>
        
        {/* Row 1: Quote Number (1/3) & Company Name with Autocomplete (2/3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className={errors?.quoteNumber ? 'field-invalid' : ''}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center min-w-0">
                <label className={`block text-[11px] font-semibold transition-colors ${
                  errors?.quoteNumber ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}>
                  Mã báo giá *
                </label>
                <FieldInfoTooltip
                  title="Mã Báo Giá (Quote ID)"
                  description="Mã số định danh duy nhất của báo giá trong hệ thống. Dùng xuyên suốt để quản lý chứng từ, hợp đồng dịch vụ vận tải và hóa đơn thanh toán."
                  example="LOG-2026-001 hoặc Q-2026-SG01"
                  badge="Bắt buộc"
                  align="left"
                />
              </div>
              {errors?.quoteNumber && (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.quoteNumber}
                </span>
              )}
            </div>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => onChangeQuoteMeta('quoteNumber', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border font-mono font-bold text-xs transition-all ${
                errors?.quoteNumber
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
              placeholder="LOG-2026-001"
            />
          </div>

          <div className={`sm:col-span-2 relative ${errors?.companyName ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 min-w-0">
                <label className={`block text-[11px] font-semibold truncate transition-colors ${
                  errors?.companyName ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}>
                  Tên công ty / Khách hàng *
                </label>
                <FieldInfoTooltip
                  title="Tên Doanh Nghiệp / Pháp Nhân"
                  description="Tên pháp nhân công ty hoặc chủ hàng đầy đủ theo ĐKKD. Gõ để tìm kiếm nhanh và tự động điền MST, địa chỉ, người liên hệ từ danh bạ Cloud CRM."
                  example="CÔNG TY TNHH XNK TOÀN THỊNH PHÁT"
                  badge="Bắt buộc"
                  align="left"
                />
                {errors?.companyName && (
                  <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 truncate animate-in fade-in">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    {errors.companyName}
                  </span>
                )}
              </div>
              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSuggestions(prev => !prev)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
                >
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Tìm trong CRM</span>
                </button>
              )}
            </div>
            
            <input
              type="text"
              value={customer.companyName}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                onChangeCustomer('companyName', e.target.value);
                setShowSuggestions(true);
              }}
              className={`w-full px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all ${
                errors?.companyName
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
              placeholder="Nhập tên doanh nghiệp hoặc tìm kiếm..."
            />

            {/* Autocomplete Suggestions Popup */}
            {showSuggestions && matchingCustomers.length > 0 && (
              <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-600 flex justify-between items-center sticky top-0 border-b border-slate-100">
                  <span>Gợi ý khách hàng ({matchingCustomers.length})</span>
                  <button 
                    type="button" 
                    onClick={() => setShowSuggestions(false)}
                    className="text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {matchingCustomers.map((c) => (
                  <div
                    key={c.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(c);
                    }}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {c.companyName}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-2 text-[11px] text-slate-500 mt-0.5">
                      {c.taxId && <span>MST: {c.taxId}</span>}
                      {c.contactPerson && <span>· LH: {c.contactPerson}</span>}
                      {c.phone && <span>· {c.phone}</span>}
                      {c.creditLimitVnd ? <span>· Hạn mức: {formatNumberVND(c.creditLimitVnd)} ₫</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Row 2: Tax ID (1/3), Contact Person (1/3), Phone Number (1/3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center min-w-0">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Mã số thuế (MST)
                </label>
                <FieldInfoTooltip
                  title="Mã Số Thuế Doanh Nghiệp (Tax ID)"
                  description="Mã số thuế doanh nghiệp (10 số đối với công ty độc lập hoặc 13 số đối với chi nhánh/đơn vị trực thuộc). Bắt buộc để xuất hóa đơn điện tử GTGT và đồng bộ danh bạ CRM."
                  example="0312345678 (10 số) hoặc 0101234567-001 (13 số)"
                  badge="10-13 số"
                  align="left"
                />
              </div>
            </div>
            <input
              type="text"
              value={customer.taxId}
              onChange={(e) => onChangeCustomer('taxId', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
              placeholder="0312345678"
            />
          </div>

          <div>
            <div className="flex items-center mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Người liên hệ
              </label>
              <FieldInfoTooltip
                title="Người Đại Diện / Đầu Mối Tiếp Nhận"
                description="Họ tên chuyên viên phụ trách logistics, xuất nhập khẩu hoặc mua hàng phía khách hàng, người trực tiếp nhận và duyệt báo giá này."
                example="Anh Nam (Trưởng phòng XNK)"
                align="center"
              />
            </div>
            <input
              type="text"
              value={customer.contactPerson}
              onChange={(e) => onChangeCustomer('contactPerson', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
              placeholder="Anh / Chị phụ trách XNK"
            />
          </div>

          <div>
            <div className="flex items-center mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Số điện thoại
              </label>
              <FieldInfoTooltip
                title="Số Điện Thoại Liên Lạc"
                description="Số điện thoại di động hoặc hotline của đầu mối khách hàng để gọi điện xác nhận điều khoản cước, gửi thông báo hoặc kết nối Zalo."
                example="0901 234 567"
                align="right"
              />
            </div>
            <input
              type="text"
              value={customer.phone}
              onChange={(e) => onChangeCustomer('phone', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono transition-colors"
              placeholder="0901 234 567"
            />
          </div>

        </div>

        {/* Row 3: Validity Date with Quick Increments + Progressive Disclosure Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          
          <div className={`sm:col-span-2 ${errors?.validityDate ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <div className="flex items-center gap-1 min-w-0">
                <label className={`block text-[11px] font-semibold transition-colors ${
                  errors?.validityDate ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}>
                  Hiệu lực báo giá *
                </label>
                <FieldInfoTooltip
                  title="Thời Hạn Hiệu Lực Báo Giá (Validity)"
                  description="Thời hạn khách hàng cần chấp thuận bảng giá. Sau thời gian này giá cước biển, phụ phí hãng tàu (BAF, LSS) hoặc tỷ giá ngoại tệ có thể biến động theo thị trường."
                  example="Khuyên dùng 7 - 14 ngày cho cước spot"
                  badge="Bắt buộc"
                  align="left"
                />
                {errors?.validityDate && (
                  <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 truncate animate-in fade-in">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    {errors.validityDate}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <span className="text-[10px] text-slate-400">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => setQuickValidity(7)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +7 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickValidity(14)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +14 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickValidity(30)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +30 ngày
                </button>
              </div>
            </div>
            <input
              type="date"
              value={validityDate}
              onChange={(e) => onChangeQuoteMeta('validityDate', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border font-mono font-medium text-xs transition-all ${
                errors?.validityDate
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
            />
          </div>

          {/* Collapsible Trigger */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>{showAdditionalDetails ? 'Thu gọn chi tiết' : 'Mở rộng (Hạn mức, Email, Địa chỉ)'}</span>
              {showAdditionalDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
              )}
            </button>
          </div>

        </div>

        {/* Collapsible Progressive Disclosure: Secondary details (Credit Limit, Email, Created Date, Full Address) */}
        {showAdditionalDetails && (
          <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            {/* Credit Limit & Terms Guidance Card */}
            <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl border border-indigo-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Hạn Mức & Chính Sách Tín Dụng Khách Hàng</span>
                  <FieldInfoTooltip
                    title="Chính Sách Tín Dụng & Công Nợ"
                    description="Hạn mức nợ tối đa và số ngày công nợ cho phép cấp cho doanh nghiệp này. Giúp nhân viên kinh doanh kiểm soát rủi ro thanh toán trước khi phát hành hóa đơn hoặc booking."
                    badge="Kiểm soát rủi ro"
                    example="Hạn mức: 100.000.000 ₫ · Kỳ hạn: 30 ngày"
                    align="left"
                  />
                </div>
                {customer.creditStatus && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    customer.creditStatus === 'SAFE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : customer.creditStatus === 'WARNING'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {customer.creditStatus === 'SAFE' && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                    {customer.creditStatus === 'WARNING' && <ShieldAlert className="w-3 h-3 text-amber-600" />}
                    {customer.creditStatus === 'LOCKED' && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                    <span>{customer.creditStatus === 'SAFE' ? 'Tín Dụng Tốt' : customer.creditStatus === 'WARNING' ? 'Gần Hạn Mức' : 'Khóa Nợ'}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Hạn mức công nợ (Credit Limit)
                    </label>
                    <FieldInfoTooltip
                      title="Hạn Mức Công Nợ (Credit Limit)"
                      description="Số tiền công nợ tối đa cho phép khách hàng chưa thanh toán. Đạt ngưỡng này sẽ cần ban giám đốc duyệt mới cho xuất vận đơn gốc."
                      example="200,000,000 VND (Nhập 0 nếu thu tiền ngay)"
                      badge="VND"
                      align="left"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={customer.creditLimitVnd ?? ''}
                      onChange={(e) => onChangeCustomer('creditLimitVnd', Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                      placeholder="0 (Trả ngay)"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-slate-400 pointer-events-none">
                      VND
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Thời hạn nợ (Credit Term Days)
                    </label>
                    <FieldInfoTooltip
                      title="Thời Hạn Công Nợ (Credit Term)"
                      description="Số ngày cho phép thanh toán sau khi phát hành hóa đơn hoặc tàu rời cảng (ATD). Sau khoảng thời gian này sẽ tính vào nợ quá hạn."
                      example="15, 30 hoặc 45 ngày"
                      badge="Số ngày"
                      align="right"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={customer.creditTermDays ?? ''}
                      onChange={(e) => onChangeCustomer('creditTermDays', Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                      placeholder="30 (ngày)"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                      ngày
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Email nhận báo giá
                  </label>
                  <FieldInfoTooltip
                    title="Email Nhận Báo Giá Chính Thức"
                    description="Địa chỉ hòm thư điện tử chính thức để gửi file báo giá PDF, đường dẫn bảo mật xem báo giá trực tuyến và theo dõi lịch trình đơn hàng."
                    example="xnk@congty.com hoặc logistic@client.vn"
                    align="left"
                  />
                </div>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => onChangeCustomer('email', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Ngày lập báo giá
                  </label>
                  <FieldInfoTooltip
                    title="Ngày Khởi Tạo Báo Giá"
                    description="Ngày chính thức phát hành báo giá cho khách hàng, dùng làm mốc tính thời hạn công nợ và chu kỳ theo dõi đơn."
                    align="right"
                  />
                </div>
                <input
                  type="date"
                  value={createdDate}
                  onChange={(e) => onChangeQuoteMeta('createdDate', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Địa chỉ doanh nghiệp / Xuất hóa đơn
                </label>
                <FieldInfoTooltip
                  title="Địa Chỉ Doanh Nghiệp & Giao Hàng"
                  description="Địa chỉ đăng ký kinh doanh chính xác theo giấy phép để lập hợp đồng vận chuyển, xuất hóa đơn VAT và giao nhận chứng từ gốc."
                  example="Tòa nhà Landmark 81, 720A Điện Biên Phủ, P.22, Q. Bình Thạnh, TP.HCM"
                  align="left"
                />
              </div>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => onChangeCustomer('address', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
              />
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
