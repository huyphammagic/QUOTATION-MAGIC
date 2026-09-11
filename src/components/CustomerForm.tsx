import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CustomerInfo, QuoteStatus, CustomerRecord } from '../types/logistics';
import { User, Building, Hash, Calendar, Mail, Phone, MapPin, Tag, Users, UserPlus, Cloud, CheckCircle2, Search, ArrowRight } from 'lucide-react';

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
      // If empty query, show up to 8 recent customers
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 relative">
      
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">THÔNG TIN KHÁCH HÀNG & MÃ BÁO GIÁ</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800"
            title="Đồng bộ thời gian thực với Cloud Firestore giữa tất cả các máy tính"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cloud CRM: {customers.length} KH</span>
          </div>
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
                className="text-xs font-semibold pl-2 pr-6 py-1 rounded-md border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer max-w-[220px] truncate"
                title="Chọn nhanh từ danh sách khách hàng đã lưu trên Cloud"
              >
                <option value="">⚡ Chọn nhanh khách ({customers.length})...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.companyName} {c.taxId ? `(${c.taxId})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onOpenCustomerManager && (
            <button
              type="button"
              onClick={onOpenCustomerManager}
              className="flex items-center space-x-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors"
              title="Mở bảng Quản Lý Danh Bạ Khách Hàng CRM Đám Mây"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Quản Lý CRM</span>
            </button>
          )}

          {onSaveToCrm && (
            <button
              type="button"
              onClick={onSaveToCrm}
              disabled={isSavingToCrm || (!customer.companyName && !customer.taxId)}
              className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none border border-emerald-200 px-2.5 py-1 rounded transition-colors"
              title="Lưu thông tin khách hàng này vào Danh Bạ CRM và đồng bộ lên Firebase Cloud"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSavingToCrm ? 'Đang lưu...' : '+ Lưu Vào CRM'}</span>
            </button>
          )}

          {/* Status Selector Badge */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Trạng thái:</label>
            <select
              value={status}
              onChange={(e) => onChangeQuoteMeta('status', e.target.value)}
              className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DRAFT">📝 DRAFT</option>
              <option value="SENT">📩 SENT</option>
              <option value="ACCEPTED">✅ ACCEPTED</option>
              <option value="REJECTED">❌ REJECTED</option>
              <option value="EXPIRED">⏳ EXPIRED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Inputs */}
      <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs" ref={suggestionsRef}>
        
        {/* Quote Ref Number */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span>Mã Báo Giá (Quote Ref) *</span>
          </label>
          <input
            type="text"
            value={quoteNumber}
            onChange={(e) => onChangeQuoteMeta('quoteNumber', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 font-mono font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="LOG-2026-001"
          />
        </div>

        {/* Company Name with Autocomplete */}
        <div className="md:col-span-2 relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Tên Công Ty / Khách Hàng *</span>
            </label>
            {customers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSuggestionField('company');
                  setShowSuggestions(prev => !prev);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>Gợi ý từ Cloud ({customers.length})</span>
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
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
            placeholder="Gõ để tìm nhanh hoặc nhập: CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU..."
          />

          {/* Autocomplete Suggestions Popup */}
          {showSuggestions && matchingCustomers.length > 0 && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 bg-blue-50/80 text-[10px] font-bold text-blue-800 uppercase tracking-wider flex justify-between items-center sticky top-0 border-b border-blue-100">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-blue-600" />
                  Gợi ý khách hàng từ Cloud ({matchingCustomers.length})
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowSuggestions(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-1"
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
                  className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                      {c.companyName}
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-800 px-1.5 py-0.5 rounded shrink-0">
                      {c.code}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                    {c.taxId && <span>MST: <strong className="text-slate-700">{c.taxId}</strong></span>}
                    {c.contactPerson && <span>LH: {c.contactPerson}</span>}
                    {c.phone && <span>SĐT: {c.phone}</span>}
                    {c.address && <span className="truncate max-w-[280px]">Đ/C: {c.address}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Contact Person */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Người Liên Hệ (Contact Person)</span>
          </label>
          <input
            type="text"
            value={customer.contactPerson}
            onChange={(e) => onChangeCustomer('contactPerson', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Mr./Ms. Nguyễn Văn A (Phòng XNK)"
          />
        </div>

        {/* Tax Code */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Mã Số Thuế (MST)</span>
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
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0312345678"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Số Điện Thoại</span>
          </label>
          <input
            type="text"
            value={customer.phone}
            onChange={(e) => onChangeCustomer('phone', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0909 123 456"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Email Nhận Báo Giá</span>
          </label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChangeCustomer('email', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="khachhang@company.com"
          />
        </div>

        {/* Created Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Ngày Báo Giá</span>
          </label>
          <input
            type="date"
            value={createdDate}
            onChange={(e) => onChangeQuoteMeta('createdDate', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
        </div>

        {/* Expiration Validity Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Hiệu Lực Đến Ngày *</span>
          </label>
          <input
            type="date"
            value={validityDate}
            onChange={(e) => onChangeQuoteMeta('validityDate', e.target.value)}
            className="w-full px-3 py-2 rounded border border-blue-200 bg-blue-50/40 text-blue-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Địa Chỉ Doanh Nghiệp</span>
          </label>
          <input
            type="text"
            value={customer.address}
            onChange={(e) => onChangeCustomer('address', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. HCM"
          />
        </div>

      </div>

    </div>
  );
};

