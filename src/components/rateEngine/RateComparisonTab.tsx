import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  Search, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Sparkles,
  Ship,
  Plane,
  Truck,
  Box,
  Layers
} from 'lucide-react';
import { RateMasterItem, RateComparisonMatrixItem } from '../../types/masterRate';
import { TransportMode } from '../../types/logistics';

interface RateComparisonTabProps {
  rates: RateMasterItem[];
  onSelectRate?: (rate: RateMasterItem) => void;
  onEditRate?: (rate: RateMasterItem) => void;
}

export const RateComparisonTab: React.FC<RateComparisonTabProps> = ({
  rates,
  onSelectRate,
  onEditRate,
}) => {
  const [selectedMode, setSelectedMode] = useState<TransportMode | 'ALL'>('ALL');
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [sortBy, setSortBy] = useState<'COST' | 'SELL' | 'MARGIN'>('MARGIN');

  // Filter only active rates for realistic operational comparison
  const activeRates = useMemo(() => {
    return rates.filter(r => r.status === 'ACTIVE' || r.status === 'APPROVED');
  }, [rates]);

  // Unique list of origins and destinations for datalists / suggestions
  const originSuggestions = useMemo(() => {
    const set = new Set<string>();
    activeRates.forEach(r => { if (r.origin) set.add(r.origin); });
    return Array.from(set).slice(0, 20);
  }, [activeRates]);

  const destinationSuggestions = useMemo(() => {
    const set = new Set<string>();
    activeRates.forEach(r => { if (r.destination) set.add(r.destination); });
    return Array.from(set).slice(0, 20);
  }, [activeRates]);

  // Comparison Matrix calculation
  const comparisonItems: RateComparisonMatrixItem[] = useMemo(() => {
    let filtered = activeRates.filter(r => {
      if (selectedMode !== 'ALL' && r.transportMode !== selectedMode) return false;

      if (originQuery.trim()) {
        const oQ = originQuery.toLowerCase().trim();
        const oMatch = r.origin.toLowerCase().includes(oQ) || (r.originCode && r.originCode.toLowerCase().includes(oQ));
        if (!oMatch) return false;
      }

      if (destinationQuery.trim()) {
        const dQ = destinationQuery.toLowerCase().trim();
        const dMatch = r.destination.toLowerCase().includes(dQ) || (r.destinationCode && r.destinationCode.toLowerCase().includes(dQ));
        if (!dMatch) return false;
      }

      if (carrierFilter.trim()) {
        const cQ = carrierFilter.toLowerCase().trim();
        const cMatch = (r.carrier || '').toLowerCase().includes(cQ) || (r.supplierName || '').toLowerCase().includes(cQ);
        if (!cMatch) return false;
      }

      if (equipmentFilter.trim()) {
        if (r.containerType && !r.containerType.toLowerCase().includes(equipmentFilter.toLowerCase().trim())) {
          return false;
        }
      }

      return true;
    });

    if (filtered.length === 0) return [];

    // Calculate profit and surcharges
    const matrix: RateComparisonMatrixItem[] = filtered.map(r => {
      const grossProfit = r.sellingAmount - r.costAmount;
      const marginPercent = r.sellingAmount > 0 ? (grossProfit / r.sellingAmount) * 100 : 0;
      const surchargesTotal = (r.surcharges || []).reduce((acc, s) => acc + (s.amount || 0), 0);

      return {
        id: r.id,
        rateCode: r.rateCode,
        carrier: r.carrier || r.carrierCode || 'General',
        supplierName: r.supplierName,
        serviceType: r.serviceType,
        origin: r.origin,
        destination: r.destination,
        equipment: r.containerType || r.unit,
        costAmount: r.costAmount,
        costCurrency: r.costCurrency,
        sellingAmount: r.sellingAmount,
        sellingCurrency: r.sellingCurrency,
        grossProfit,
        marginPercent,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        transitTime: r.transitTime,
        freeTime: r.freeTime,
        surchargesTotal,
        status: r.status,
        rateType: r.rateType,
        priority: r.priority,
      };
    });

    // Detect Best Cost, Best Sell, and Highest Margin
    let minCost = Infinity;
    let minSell = Infinity;
    let maxMargin = -Infinity;

    matrix.forEach(m => {
      if (m.costAmount < minCost && m.costAmount > 0) minCost = m.costAmount;
      if (m.sellingAmount < minSell && m.sellingAmount > 0) minSell = m.sellingAmount;
      if (m.marginPercent > maxMargin) maxMargin = m.marginPercent;
    });

    matrix.forEach(m => {
      if (m.costAmount === minCost && minCost !== Infinity) m.isBestCost = true;
      if (m.sellingAmount === minSell && minSell !== Infinity) m.isBestSell = true;
      if (m.marginPercent === maxMargin && maxMargin > 0) m.isHighestMargin = true;
    });

    // Sort
    matrix.sort((a, b) => {
      if (sortBy === 'COST') return a.costAmount - b.costAmount;
      if (sortBy === 'SELL') return a.sellingAmount - b.sellingAmount;
      return b.marginPercent - a.marginPercent;
    });

    return matrix;
  }, [activeRates, selectedMode, originQuery, destinationQuery, carrierFilter, equipmentFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Ma Trận So Sánh Giá Đa Chiều (Rate Comparison Matrix)</h3>
              <p className="text-xs text-slate-500">
                Đối chiếu giá vốn (Buy), giá bán (Sell), lợi nhuận gộp và dịch vụ giữa các hãng vận chuyển
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSelectedMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedMode === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Tất cả ({activeRates.length})
            </button>
            <button
              onClick={() => setSelectedMode('SEA_FCL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'SEA_FCL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              Đường Biển FCL
            </button>
            <button
              onClick={() => setSelectedMode('AIR_FREIGHT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'AIR_FREIGHT' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              Hàng Không (Air)
            </button>
            <button
              onClick={() => setSelectedMode('INLAND_TRUCKING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedMode === 'INLAND_TRUCKING' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Xe Tải (Truck)
            </button>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Điểm đi / POL</label>
            <input
              type="text"
              list="origin-list"
              value={originQuery}
              onChange={(e) => setOriginQuery(e.target.value)}
              placeholder="VD: Cat Lai, VNSGN..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
            />
            <datalist id="origin-list">
              {originSuggestions.map((o, idx) => (
                <option key={idx} value={o} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Điểm đến / POD</label>
            <input
              type="text"
              list="dest-list"
              value={destinationQuery}
              onChange={(e) => setDestinationQuery(e.target.value)}
              placeholder="VD: Los Angeles, USLAX..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
            />
            <datalist id="dest-list">
              {destinationSuggestions.map((d, idx) => (
                <option key={idx} value={d} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Hãng vận chuyển</label>
            <input
              type="text"
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              placeholder="MSC, ONE, Maersk..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Loại thiết bị</label>
            <input
              type="text"
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              placeholder="40'HC, 20'GP..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Ưu tiên sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-medium text-slate-700"
            >
              <option value="MARGIN">Biên lợi nhuận cao nhất (Margin %)</option>
              <option value="COST">Giá vốn thấp nhất (Lowest Cost)</option>
              <option value="SELL">Giá bán cạnh tranh nhất (Lowest Sell)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonItems.length === 0 ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <GitCompare className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Chưa tìm thấy bảng giá nào khớp điều kiện</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Thử thay đổi tuyến đường, chọn phương thức vận chuyển khác hoặc nạp thêm giá cước vào hệ thống.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Tìm thấy <b>{comparisonItems.length}</b> lựa chọn giá cước có thể so sánh:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ⭐ Giá vốn tối ưu
              </span>
              <span className="flex items-center gap-1 text-blue-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 🚀 Giá bán cạnh tranh
              </span>
              <span className="flex items-center gap-1 text-purple-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> 💎 Lợi nhuận cao nhất
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonItems.map((item) => {
              const fullRate = rates.find(r => r.id === item.id);

              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-2xl border transition hover:shadow-md p-5 flex flex-col justify-between ${
                    item.isHighestMargin 
                      ? 'border-purple-300 ring-1 ring-purple-100' 
                      : item.isBestCost 
                      ? 'border-emerald-300 ring-1 ring-emerald-100' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{item.carrier}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {item.rateType}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {item.rateCode}
                        </div>
                      </div>

                      {/* Highlight badges */}
                      <div className="flex flex-col items-end gap-1">
                        {item.isBestCost && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            ⭐ Best Cost
                          </span>
                        )}
                        {item.isBestSell && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                            🚀 Best Sell
                          </span>
                        )}
                        {item.isHighestMargin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            💎 Max Margin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lane info */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-700 font-medium">
                        <span className="truncate max-w-[120px]">{item.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{item.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span>Thiết bị: <b>{item.equipment || '—'}</b></span>
                        <span>Transit: <b>{item.transitTime || 'N/A'}</b></span>
                      </div>
                    </div>

                    {/* Financial comparison */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-medium">Giá vốn đầu vào (Buy)</div>
                        <div className="text-base font-bold font-mono text-slate-700">
                          {item.costAmount.toLocaleString()} <span className="text-xs font-normal">{item.costCurrency}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <div className="text-[10px] text-emerald-700 font-medium">Giá bán đề xuất (Sell)</div>
                        <div className="text-base font-bold font-mono text-emerald-700">
                          {item.sellingAmount.toLocaleString()} <span className="text-xs font-normal">{item.sellingCurrency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Margin & Profit Bar */}
                    <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 text-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-purple-700 font-medium">Lợi nhuận gộp (Profit)</div>
                        <div className="font-bold font-mono text-purple-900">
                          +{item.grossProfit.toLocaleString()} {item.sellingCurrency}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-purple-700 font-medium">Biên lợi nhuận (Margin)</div>
                        <div className="font-bold text-sm text-purple-900">
                          {item.marginPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Hết hạn: {item.effectiveTo}
                    </div>

                    <div className="flex items-center gap-2">
                      {onEditRate && fullRate && (
                        <button
                          type="button"
                          onClick={() => onEditRate(fullRate)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          Chi tiết
                        </button>
                      )}
                      {onSelectRate && fullRate && (
                        <button
                          type="button"
                          onClick={() => onSelectRate(fullRate)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition"
                        >
                          Chọn giá này
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
