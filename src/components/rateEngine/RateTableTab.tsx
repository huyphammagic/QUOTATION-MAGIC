import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Tag, 
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Building,
  Plane,
  Ship,
  Truck,
  FileText,
  DollarSign,
  Layers
} from 'lucide-react';
import { RateMasterItem, MasterRateStatus, RateType, MasterShipmentType } from '../../types/masterRate';
import { TransportMode, Currency } from '../../types/logistics';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';

interface RateTableTabProps {
  rates: RateMasterItem[];
  onOpenCreate: () => void;
  onEditRate: (rate: RateMasterItem) => void;
  onDuplicateRate: (rate: RateMasterItem) => void;
  onNewVersion: (rate: RateMasterItem) => void;
  onDeleteRate: (id: string) => void;
  onSubmitApproval?: (rate: RateMasterItem) => void;
}

export const RateTableTab: React.FC<RateTableTabProps> = ({
  rates,
  onOpenCreate,
  onEditRate,
  onDuplicateRate,
  onNewVersion,
  onDeleteRate,
  onSubmitApproval,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rateTypeFilter, setRateTypeFilter] = useState<string>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'RATE_CODE' | 'VALIDITY' | 'SELLING'>('UPDATED');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Carriers set
  const uniqueCarriers = useMemo(() => {
    const set = new Set<string>();
    rates.forEach(r => {
      if (r.carrier && r.carrier.trim() !== '') set.add(r.carrier.trim());
    });
    return Array.from(set).sort();
  }, [rates]);

  // Filtered and sorted rates
  const displayRates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rates.filter(rate => {
      // Status filter
      if (statusFilter === 'EXPIRED') {
        const isExp = today > rate.effectiveTo || rate.status === 'EXPIRED';
        if (!isExp) return false;
      } else if (statusFilter !== 'ALL' && rate.status !== statusFilter) {
        return false;
      }

      // Mode filter
      if (modeFilter !== 'ALL' && rate.transportMode !== modeFilter) {
        return false;
      }

      // Rate Type filter
      if (rateTypeFilter !== 'ALL' && rate.rateType !== rateTypeFilter) {
        return false;
      }

      // Carrier filter
      if (carrierFilter !== 'ALL' && rate.carrier !== carrierFilter) {
        return false;
      }

      // Keyword filter
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const match = 
          (rate.rateCode || '').toLowerCase().includes(kw) ||
          (rate.rateName || '').toLowerCase().includes(kw) ||
          (rate.chargeCode || '').toLowerCase().includes(kw) ||
          (rate.carrier || '').toLowerCase().includes(kw) ||
          (rate.supplierName || '').toLowerCase().includes(kw) ||
          (rate.origin || '').toLowerCase().includes(kw) ||
          (rate.destination || '').toLowerCase().includes(kw) ||
          (rate.contractNo || '').toLowerCase().includes(kw);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'RATE_CODE') {
        comparison = (a.rateCode || '').localeCompare(b.rateCode || '');
      } else if (sortBy === 'VALIDITY') {
        comparison = (a.effectiveTo || '').localeCompare(b.effectiveTo || '');
      } else if (sortBy === 'SELLING') {
        comparison = (a.sellingAmount || 0) - (b.sellingAmount || 0);
      } else {
        // UPDATED
        comparison = (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      }
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }, [rates, searchKeyword, modeFilter, statusFilter, rateTypeFilter, carrierFilter, sortBy, sortOrder]);

  const getStatusBadge = (rate: RateMasterItem) => {
    const today = new Date().toISOString().slice(0, 10);
    const isExpired = today > rate.effectiveTo || rate.status === 'EXPIRED';

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Clock className="w-3 h-3" /> Hết hạn (Expired)
        </span>
      );
    }
    if (rate.status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" /> Chờ duyệt (Pending)
        </span>
      );
    }
    if (rate.status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Bản nháp (Draft)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Hiệu lực (Active)
      </span>
    );
  };

  const getRateTypeBadge = (type: RateType) => {
    switch (type) {
      case 'BUY':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">BUY (Giá mua)</span>;
      case 'SELL':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">SELL (Giá bán)</span>;
      case 'CONTRACT':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">CONTRACT (Hợp đồng)</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">REF (Tham khảo)</span>;
    }
  };

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'SEA_FCL':
      case 'SEA_LCL':
        return <Ship className="w-4 h-4 text-blue-600" />;
      case 'AIR_FREIGHT':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'INLAND_TRUCKING':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'CUSTOMS_CLEARANCE':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã cước, cảng đi/đến, hãng tàu, nhà cung cấp..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            id="rate-search-input"
          />
        </div>

        {/* Filter Mode */}
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="filter-mode"
        >
          <option value="ALL">Tất cả Phương thức (All Modes)</option>
          <option value="SEA_FCL">Đường Biển FCL (Sea FCL)</option>
          <option value="SEA_LCL">Đường Biển LCL (Sea LCL)</option>
          <option value="AIR_FREIGHT">Đường Hàng Không (Air)</option>
          <option value="INLAND_TRUCKING">Vận Tải Nội Địa (Trucking)</option>
          <option value="CUSTOMS_CLEARANCE">Hải Quan (Customs)</option>
        </select>

        {/* Filter Rate Type */}
        <select
          value={rateTypeFilter}
          onChange={(e) => setRateTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="filter-rate-type"
        >
          <option value="ALL">Tất cả Loại giá (All Rate Types)</option>
          <option value="BUY">BUY RATE (Giá vốn mua vào)</option>
          <option value="SELL">SELL RATE (Giá bán cho khách)</option>
          <option value="CONTRACT">CONTRACT (Giá theo hợp đồng)</option>
          <option value="REFERENCE">REFERENCE (Giá tham khảo)</option>
        </select>

        {/* Filter Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="filter-status"
        >
          <option value="ALL">Tất cả Trạng thái</option>
          <option value="ACTIVE">Hiệu lực (Active)</option>
          <option value="PENDING_APPROVAL">Chờ duyệt (Pending)</option>
          <option value="DRAFT">Bản nháp (Draft)</option>
          <option value="EXPIRED">Hết hạn (Expired)</option>
        </select>

        {/* Action Button: Create */}
        <button
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors shrink-0"
          id="btn-create-new-rate"
        >
          <Plus className="w-4 h-4" /> Thêm Bảng Giá Mới
        </button>
      </div>

      {/* Stats Quick Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Hiển thị <span className="font-bold text-slate-800">{displayRates.length}</span> / {rates.length} bảng giá
        </div>
        <div className="flex items-center gap-2">
          <span>Sắp xếp theo:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-transparent border-b border-slate-300 focus:outline-none"
          >
            <option value="UPDATED">Mới cập nhật</option>
            <option value="RATE_CODE">Mã bảng giá</option>
            <option value="VALIDITY">Hạn hiệu lực</option>
            <option value="SELLING">Giá bán</option>
          </select>
          <button 
            onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
            className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            {sortOrder === 'ASC' ? '↑ Tăng' : '↓ Giảm'}
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3">Mã & Tên Bảng Giá</th>
                <th className="p-3">Phương Thức & Tuyến</th>
                <th className="p-3">Hãng / Nhà Cung Cấp</th>
                <th className="p-3 text-right">Giá Vốn (Buy)</th>
                <th className="p-3 text-right">Giá Bán (Sell)</th>
                <th className="p-3 text-right">Lợi Nhuận (GP / Margin)</th>
                <th className="p-3 text-center">Thời Hạn Hiệu Lực</th>
                <th className="p-3 text-center">Trạng Thái</th>
                <th className="p-3 text-center w-36">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy bảng giá cước nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayRates.map((rate, index) => {
                  const profit = (rate.sellingAmount || 0) - (rate.costAmount || 0);
                  const marginPct = rate.sellingAmount > 0 ? (profit / rate.sellingAmount) * 100 : 0;
                  const isProfitPositive = profit >= 0;

                  return (
                    <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* Code & Name */}
                      <td className="p-3 max-w-[260px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{rate.rateCode}</span>
                          {getRateTypeBadge(rate.rateType || 'SELL')}
                          {rate.version > 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              v{rate.version}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 truncate" title={rate.rateName}>
                          {rate.rateName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {rate.chargeCode} • {rate.basis} • {rate.unit}
                        </div>
                      </td>

                      {/* Mode & Route */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          {getModeIcon(rate.transportMode)}
                          <span className="font-medium text-slate-800">{rate.transportMode}</span>
                          {rate.containerType && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px]">
                              {rate.containerType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800">{rate.origin || 'Bất kỳ'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-800">{rate.destination || 'Bất kỳ'}</span>
                        </div>
                      </td>

                      {/* Carrier & Supplier */}
                      <td className="p-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {rate.carrier || 'N/A'}
                        </div>
                        {rate.supplierName && (
                          <div className="text-[11px] text-slate-500">
                            NCC: {rate.supplierName}
                          </div>
                        )}
                        {rate.contractNo && (
                          <div className="text-[10px] text-indigo-600 font-mono">
                            HĐ: {rate.contractNo}
                          </div>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="p-3 text-right">
                        <div className="font-mono font-semibold text-purple-700">
                          {rate.costCurrency === 'USD' ? formatUSD(rate.costAmount || 0) : formatVND(rate.costAmount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">/{rate.unit}</div>
                      </td>

                      {/* Sell */}
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-blue-700">
                          {rate.sellingCurrency === 'USD' ? formatUSD(rate.sellingAmount || 0) : formatVND(rate.sellingAmount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">VAT: {rate.vatRate}%</div>
                      </td>

                      {/* Margin */}
                      <td className="p-3 text-right">
                        <div className={`font-mono font-semibold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {rate.sellingCurrency === 'USD' ? formatUSD(profit) : formatVND(profit)}
                        </div>
                        <div className={`text-[10px] font-bold ${isProfitPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {formatPercent(marginPct)}
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="p-3 text-center font-mono text-[11px]">
                        <div className="text-slate-600">{rate.effectiveFrom}</div>
                        <div className="text-slate-400 text-[10px]">đến</div>
                        <div className="font-semibold text-slate-800">{rate.effectiveTo}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {getStatusBadge(rate)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {rate.status === 'DRAFT' && onSubmitApproval && (
                            <button
                              onClick={() => onSubmitApproval(rate)}
                              className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                              title="Gửi phê duyệt (Submit for Approval)"
                              id={`btn-submit-${rate.id}`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditRate(rate)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="Chỉnh sửa (Edit Rate)"
                            id={`btn-edit-${rate.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNewVersion(rate)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            title="Tạo phiên bản mới (New Version)"
                            id={`btn-version-${rate.id}`}
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDuplicateRate(rate)}
                            className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="Sao chép (Duplicate)"
                            id={`btn-dup-${rate.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteRate(rate.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Xóa mềm (Deactivate)"
                            id={`btn-del-${rate.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
