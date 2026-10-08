import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CustomerInfo, QuoteStatus, CustomerRecord } from '../types/logistics';
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
  AlertCircle
} from 'lucide-react';

interface CustomerFormProps {
  customer: CustomerInfo;
  quoteNumber: string;
  createdDate: string;
  validityDate: string;
  status: QuoteStatus;
  salesRepName: string;
  customers?: CustomerRecord[];
  onChangeCustomer: (field: keyof CustomerInfo, val: string) => void;
  onChangeQuoteMeta: (field: 'quoteNumber' | 'createdDate' | 'validityDate' | 'status', val: string) => void;
  onOpenCustomerManager?: () => void;
  onSaveToCrm?: () => void;
  onSelectCustomer?: (customer: CustomerRecord) => void;
  isSavingToCrm?: boolean;
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
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
    }
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
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
                {customers.length} KH Cloud
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick CRM Dropdown */}
          {customers.length > 0 && (
            <select
              value={customer.id || ''}
              onChange={(e) => {
                const targetId = e.target.value;
                const found = customers.find(c => c.id === targetId || c.code === targetId);
                if (found) handleSelectSuggestion(found);
              }}
              className="text-xs font-medium pl-2 pr-6 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer max-w-[150px] sm:max-w-[180px] truncate"
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

          {onOpenCustomerManager && (
            <button
              type="button"
              onClick={onOpenCustomerManager}
              className="flex items-center space-x-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Mở quản lý khách hàng CRM"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CRM</span>
            </button>
          )}

          {onSaveToCrm && (
            <button
              type="button"
              onClick={onSaveToCrm}
              disabled={isSavingToCrm || (!customer.companyName && !customer.taxId)}
              className="flex items-center space-x-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Lưu thông tin khách hàng này vào CRM"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isSavingToCrm ? 'Lưu...' : '+ CRM'}</span>
            </button>
          )}

          {/* Status Selector */}
          <select
            value={status}
            onChange={(e) => onChangeQuoteMeta('status', e.target.value)}
            className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
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

      {/* Primary Essential Inputs (High-priority grid) */}
      <div className="p-4 space-y-3" ref={suggestionsRef}>
        
        {/* Row 1: Quote Number (1/3) & Company Name with Autocomplete (2/3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Mã báo giá *
            </label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => onChangeQuoteMeta('quoteNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
              placeholder="LOG-2026-001"
            />
          </div>

          <div className="sm:col-span-2 relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Tên công ty / Khách hàng *
              </label>
              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSuggestions(prev => !prev)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
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
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Row 2: Contact Person (1/3), Phone (1/3), Email (1/3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Người liên hệ
            </label>
            <input
              type="text"
              value={customer.contactPerson}
              onChange={(e) => onChangeCustomer('contactPerson', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              placeholder="Anh / Chị phụ trách XNK"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              value={customer.phone}
              onChange={(e) => onChangeCustomer('phone', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
              placeholder="0901 234 567"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Email nhận báo giá
            </label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => onChangeCustomer('email', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              placeholder="contact@company.com"
            />
          </div>

        </div>

        {/* Row 3: Validity Date with Quick Increments */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Hiệu lực đến ngày *
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => setQuickValidity(7)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +7 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickValidity(14)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +14 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickValidity(30)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +30 ngày
                </button>
              </div>
            </div>
            <input
              type="date"
              value={validityDate}
              onChange={(e) => onChangeQuoteMeta('validityDate', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            />
          </div>

          {/* Collapsible Trigger */}
          <div className="pt-4 sm:pt-4">
            <button
              type="button"
              onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>{showAdditionalDetails ? 'Thu gọn chi tiết' : 'Thêm MST & Địa chỉ'}</span>
              {showAdditionalDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>

        </div>

        {/* Collapsible Progressive Disclosure: Secondary details (Tax ID, Created Date, Full Address) */}
        {showAdditionalDetails && (
          <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mã số thuế (MST)
                </label>
                <input
                  type="text"
                  value={customer.taxId}
                  onChange={(e) => onChangeCustomer('taxId', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                  placeholder="0312345678"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngày lập báo giá
                </label>
                <input
                  type="date"
                  value={createdDate}
                  onChange={(e) => onChangeQuoteMeta('createdDate', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Địa chỉ doanh nghiệp / Xuất hóa đơn
              </label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => onChangeCustomer('address', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
              />
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
