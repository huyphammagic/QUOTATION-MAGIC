import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CustomerInfo, QuoteStatus, CustomerRecord } from '../types/logistics';
import { User, Building, Hash, Calendar, Mail, Phone, MapPin, Tag, Users, UserPlus, Cloud, Search } from 'lucide-react';

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
  const [suggestionField, setSuggestionField] = useState<'company' | 'tax' | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter matching customers based on current input
  const matchingCustomers = useMemo(() => {
    if (!suggestionField || customers.length === 0) return [];
    const query = suggestionField === 'company' 
      ? (customer.companyName || '').toLowerCase().trim()
      : (customer.taxId || '').toLowerCase().trim();

    if (!query) {
      return customers.slice(0, 8);
    }

    return customers.filter(c => {
      const matchComp = (c.companyName || '').toLowerCase().includes(query);
      const matchName = (c.customerName || '').toLowerCase().includes(query);
      const matchTax = (c.taxId || '').toLowerCase().includes(query);
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchContact = (c.contactPerson || '').toLowerCase().includes(query);
      return matchComp || matchName || matchTax || matchCode || matchContact;
    }).slice(0, 10);
  }, [customers, customer.companyName, customer.taxId, suggestionField]);

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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 relative">
      
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <Building className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
            Thông tin khách hàng & Báo giá
          </h2>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {customers.length} KH Cloud
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end">
          {/* Direct Quick Customer Dropdown Selector */}
          {customers.length > 0 && (
            <div className="relative">
              <select
                value={customer.id || ''}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const found = customers.find(c => c.id === targetId || c.code === targetId);
                  if (found) handleSelectSuggestion(found);
                }}
                className="text-xs font-medium pl-2.5 pr-6 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer max-w-[200px] truncate"
                title="Chọn nhanh từ danh sách khách hàng đã lưu trên Cloud"
              >
                <option value="">Chọn từ CRM ({customers.length})...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.companyName} {c.taxId ? `(${c.taxId})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onOpenCustomerManager && (
            <button
              type="button"
              onClick={onOpenCustomerManager}
              className="flex items-center space-x-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Mở quản lý khách hàng CRM"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>CRM</span>
            </button>
          )}

          {onSaveToCrm && (
            <button
              type="button"
              onClick={onSaveToCrm}
              disabled={isSavingToCrm || (!customer.companyName && !customer.taxId)}
              className="flex items-center space-x-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Lưu thông tin khách hàng này vào CRM"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSavingToCrm ? 'Đang lưu...' : '+ Lưu CRM'}</span>
            </button>
          )}

          {/* Status Selector */}
          <div className="flex items-center space-x-1.5">
            <select
              value={status}
              onChange={(e) => onChangeQuoteMeta('status', e.target.value)}
              className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="PENDING_APPROVAL">Chờ duyệt (Pending)</option>
              <option value="APPROVED">Đã duyệt (Approved)</option>
              <option value="SENT">Đã gửi (Sent)</option>
              <option value="ACCEPTED">Chấp thuận (Accepted)</option>
              <option value="REJECTED">Từ chối (Rejected)</option>
              <option value="EXPIRED">Hết hạn (Expired)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Inputs */}
      <div className="p-4 pt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs" ref={suggestionsRef}>
        
        {/* Quote Ref Number */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Mã báo giá *
          </label>
          <input
            type="text"
            value={quoteNumber}
            onChange={(e) => onChangeQuoteMeta('quoteNumber', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-medium text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="LOG-2026-001"
          />
        </div>

        {/* Company Name with Autocomplete */}
        <div className="md:col-span-2 relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-slate-600">
              Tên công ty / Khách hàng *
            </label>
            {customers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSuggestionField('company');
                  setShowSuggestions(prev => !prev);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>Tìm gợi ý ({customers.length})</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={customer.companyName}
            onFocus={() => {
              setSuggestionField('company');
              setShowSuggestions(true);
            }}
            onChange={(e) => {
              onChangeCustomer('companyName', e.target.value);
              setSuggestionField('company');
              setShowSuggestions(true);
            }}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-semibold"
            placeholder="Nhập tên doanh nghiệp hoặc tìm kiếm..."
          />

          {/* Autocomplete Suggestions Popup */}
          {showSuggestions && matchingCustomers.length > 0 && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-medium text-slate-600 flex justify-between items-center sticky top-0 border-b border-slate-100">
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
                    <span className="font-medium text-xs text-slate-900">
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

        {/* Customer Contact Person */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Người liên hệ
          </label>
          <input
            type="text"
            value={customer.contactPerson}
            onChange={(e) => onChangeCustomer('contactPerson', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="Người đại diện / phụ trách XNK"
          />
        </div>

        {/* Tax Code */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Mã số thuế (MST)
          </label>
          <input
            type="text"
            value={customer.taxId}
            onFocus={() => {
              setSuggestionField('tax');
              setShowSuggestions(true);
            }}
            onChange={(e) => {
              onChangeCustomer('taxId', e.target.value);
              setSuggestionField('tax');
              setShowSuggestions(true);
            }}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="0312345678"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Số điện thoại
          </label>
          <input
            type="text"
            value={customer.phone}
            onChange={(e) => onChangeCustomer('phone', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="0901 234 567"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Email nhận báo giá
          </label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChangeCustomer('email', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="contact@company.com"
          />
        </div>

        {/* Created Date */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Ngày lập báo giá
          </label>
          <input
            type="date"
            value={createdDate}
            onChange={(e) => onChangeQuoteMeta('createdDate', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
          />
        </div>

        {/* Expiration Validity Date */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Hiệu lực đến ngày *
          </label>
          <input
            type="date"
            value={validityDate}
            onChange={(e) => onChangeQuoteMeta('validityDate', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Địa chỉ doanh nghiệp
          </label>
          <input
            type="text"
            value={customer.address}
            onChange={(e) => onChangeCustomer('address', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
          />
        </div>

      </div>

    </div>
  );
};
