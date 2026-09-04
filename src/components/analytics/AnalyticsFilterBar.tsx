import React from 'react';
import { 
  AnalyticsFilterState, 
  DateRangePreset, 
  AnalyticsLanguage 
} from '../../types/analytics';
import { 
  Filter, 
  Calendar, 
  RotateCcw, 
  User, 
  Ship, 
  DollarSign, 
  Activity,
  Layers
} from 'lucide-react';

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  onFilterChange: (updated: AnalyticsFilterState) => void;
  onResetFilters: () => void;
  salesReps: string[];
  transportModes: string[];
  language: AnalyticsLanguage;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  salesReps,
  transportModes,
  language,
}) => {
  const isVi = language === 'vi';

  const datePresets: { id: DateRangePreset; labelVi: string; labelEn: string }[] = [
    { id: 'all', labelVi: 'Tất Cả Thời Gian', labelEn: 'All Time' },
    { id: 'today', labelVi: 'Hôm Nay', labelEn: 'Today' },
    { id: 'this_week', labelVi: 'Tuần Này', labelEn: 'This Week' },
    { id: 'this_month', labelVi: 'Tháng Này', labelEn: 'This Month' },
    { id: 'last_month', labelVi: 'Tháng Trước', labelEn: 'Last Month' },
    { id: 'this_quarter', labelVi: 'Quý Này', labelEn: 'This Quarter' },
    { id: 'this_year', labelVi: 'Năm Nay', labelEn: 'This Year' },
    { id: 'custom', labelVi: 'Tùy Chỉnh...', labelEn: 'Custom...' },
  ];

  const hasActiveFilters = 
    filters.dateRange !== 'all' ||
    (filters.salesRep && filters.salesRep !== 'ALL') ||
    (filters.transportMode && filters.transportMode !== 'ALL') ||
    (filters.currency && filters.currency !== 'ALL') ||
    (filters.status && filters.status !== 'ALL') ||
    !!filters.customerName;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 sm:p-4 space-y-3">
      
      {/* Top row: Date range quick presets & Filter summary */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        
        {/* Preset pill buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            {isVi ? 'Khoảng thời gian:' : 'Timeframe:'}
          </span>
          {datePresets.map(preset => {
            const isActive = filters.dateRange === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onFilterChange({ ...filters, dateRange: preset.id })}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? preset.labelVi : preset.labelEn}
              </button>
            );
          })}
        </div>

        {/* Reset button if filtered */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
            title={isVi ? 'Xóa toàn bộ bộ lọc' : 'Reset all filters'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Đặt lại bộ lọc' : 'Reset Filters'}</span>
          </button>
        )}
      </div>

      {/* Bottom row: Multi-dimension dropdown filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        
        {/* Custom Date Range Pickers (only if custom is selected) */}
        {filters.dateRange === 'custom' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {isVi ? 'Từ ngày' : 'From Date'}
              </label>
              <input
                type="date"
                value={filters.customStartDate || ''}
                onChange={(e) => onFilterChange({ ...filters, customStartDate: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {isVi ? 'Đến ngày' : 'To Date'}
              </label>
              <input
                type="date"
                value={filters.customEndDate || ''}
                onChange={(e) => onFilterChange({ ...filters, customEndDate: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Filter: Sales Rep */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            {isVi ? 'Nhân viên (Sales)' : 'Sales Rep'}
          </label>
          <select
            value={filters.salesRep || 'ALL'}
            onChange={(e) => onFilterChange({ ...filters, salesRep: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">{isVi ? 'Tất cả nhân viên' : 'All Sales Reps'}</option>
            {salesReps.map(rep => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </select>
        </div>

        {/* Filter: Transport Mode */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Ship className="w-3 h-3 text-slate-400" />
            {isVi ? 'Phương thức (Mode)' : 'Transport Mode'}
          </label>
          <select
            value={filters.transportMode || 'ALL'}
            onChange={(e) => onFilterChange({ ...filters, transportMode: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">{isVi ? 'Tất cả phương thức' : 'All Transport Modes'}</option>
            <option value="SEA_FCL">Đường Biển Nguyên Cont (FCL)</option>
            <option value="SEA_LCL">Đường Biển Hàng Lẻ (LCL)</option>
            <option value="AIR">Đường Hàng Không (AIR)</option>
            <option value="TRUCKING">Vận Tải Đường Bộ (TRUCK)</option>
            <option value="CUSTOMS">Khai Thuê Hải Quan</option>
          </select>
        </div>

        {/* Filter: Currency */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" />
            {isVi ? 'Loại tiền tệ' : 'Currency'}
          </label>
          <select
            value={filters.currency || 'ALL'}
            onChange={(e) => onFilterChange({ ...filters, currency: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
          >
            <option value="ALL">{isVi ? 'Tất cả (Đa tiền tệ)' : 'All Currencies'}</option>
            <option value="USD">USD ($)</option>
            <option value="VND">VND (₫)</option>
          </select>
        </div>

        {/* Filter: Quotation Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400" />
            {isVi ? 'Trạng thái báo giá' : 'Quote Status'}
          </label>
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="ALL">{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
            <option value="WON" className="text-emerald-700 font-bold">{isVi ? '✓ Thắng thầu (Won / Accepted)' : '✓ Won (Accepted)'}</option>
            <option value="LOST" className="text-rose-700 font-bold">{isVi ? '✗ Từ chối (Lost / Rejected)' : '✗ Lost (Rejected)'}</option>
            <option value="PENDING">{isVi ? '⏳ Đang chào giá (Pending / Open)' : '⏳ Pending / Open'}</option>
            <option value="EXPIRED">{isVi ? '⚠ Đã hết hạn (Expired)' : '⚠ Expired'}</option>
            <option value="DRAFT">{isVi ? 'Bản nháp (Draft)' : 'Draft'}</option>
          </select>
        </div>

        {/* Filter: Customer Search */}
        <div className="space-y-1 sm:col-span-2 md:col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            {isVi ? 'Tên khách hàng' : 'Customer Name'}
          </label>
          <input
            type="text"
            placeholder={isVi ? 'Tìm theo khách hàng...' : 'Filter customer...'}
            value={filters.customerName || ''}
            onChange={(e) => onFilterChange({ ...filters, customerName: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

      </div>

    </div>
  );
};
