import React from 'react';
import { CustomerInfo, QuoteStatus } from '../types/logistics';
import { User, Building, Hash, Calendar, Mail, Phone, MapPin, Tag, Users } from 'lucide-react';

interface CustomerFormProps {
  customer: CustomerInfo;
  quoteNumber: string;
  createdDate: string;
  validityDate: string;
  status: QuoteStatus;
  salesRepName: string;
  onChangeCustomer: (field: keyof CustomerInfo, val: string) => void;
  onChangeQuoteMeta: (field: 'quoteNumber' | 'createdDate' | 'validityDate' | 'status', val: string) => void;
  onOpenCustomerManager?: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  quoteNumber,
  createdDate,
  validityDate,
  status,
  salesRepName,
  onChangeCustomer,
  onChangeQuoteMeta,
  onOpenCustomerManager
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
      
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-blue-700" />
          <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">THÔNG TIN KHÁCH HÀNG & MÃ BÁO GIÁ</span>
        </div>

        <div className="flex items-center space-x-2 justify-between sm:justify-end">
          {onOpenCustomerManager && (
            <button
              type="button"
              onClick={onOpenCustomerManager}
              className="flex items-center space-x-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors"
              title="Chọn nhanh từ Danh Bạ Khách Hàng CRM"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Chọn Từ Danh Bạ CRM</span>
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
      <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        
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

        {/* Company Name */}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Tên Công Ty / Khách Hàng *</span>
          </label>
          <input
            type="text"
            value={customer.companyName}
            onChange={(e) => onChangeCustomer('companyName', e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
            placeholder="CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU..."
          />
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
            onChange={(e) => onChangeCustomer('taxId', e.target.value)}
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

