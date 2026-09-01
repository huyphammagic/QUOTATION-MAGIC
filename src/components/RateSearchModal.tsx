import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Ship, 
  Plane, 
  Truck, 
  FileText, 
  ArrowRight, 
  Plus, 
  X,
  Layers,
  Sparkles,
  Calendar
} from 'lucide-react';
import { RateMasterItem, RateSearchContext, RateSearchResult } from '../types/masterRate';
import { ShipmentDetails, TransportMode, ContainerType } from '../types/logistics';
import { searchSmartRates } from '../services/masterRate/rateSearchService';
import { formatUSD, formatVND, formatPercent } from '../utils/formatters';

interface RateSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: ShipmentDetails;
  rates: RateMasterItem[];
  exchangeRate: number;
  onSelectRate: (rate: RateMasterItem) => void;
}

export const RateSearchModal: React.FC<RateSearchModalProps> = ({
  isOpen,
  onClose,
  shipment,
  rates,
  exchangeRate,
  onSelectRate,
}) => {
  const [searchParams, setSearchParams] = useState<RateSearchContext>({
    transportMode: shipment.mode,
    origin: shipment.pol || '',
    destination: shipment.pod || '',
    containerType: shipment.containerType || '',
    quotationDate: new Date().toISOString().slice(0, 10),
    keyword: '',
    status: 'ACTIVE',
  });

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'EXPIRED' | 'ALL'>('ACTIVE');

  // Search Results computed dynamically using unified rateSearchService
  const { activeMatches, expiredMatches, allFound, totalMatches } = useMemo(() => {
    return searchSmartRates(rates, searchParams);
  }, [rates, searchParams]);

  if (!isOpen) return null;

  const currentDisplayList = activeTab === 'ACTIVE' 
    ? activeMatches 
    : activeTab === 'EXPIRED' 
      ? expiredMatches 
      : allFound;

  const handleApply = (result: RateSearchResult) => {
    if (result.isExpired) {
      const confirmUse = window.confirm(
        'CẢNH BÁO: Bảng giá này ĐÃ HẾT HẠN HIỆU LỰC (Expired Rate).\nBạn có chắc chắn muốn áp dụng bảng giá cũ này vào báo giá không?'
      );
      if (!confirmUse) return;
    }
    onSelectRate(result.rate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        id="rate-search-modal-container"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tra Cứu & Áp Dụng Bảng Giá Master (Rate Search Engine)</h2>
              <p className="text-xs text-blue-100">
                Tìm kiếm giá cước và phụ phí chuẩn từ Master Rate Database dựa trên tuyến đường và lô hàng
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="btn-close-rate-search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Criteria Filter Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phương thức vận tải</label>
            <select
              value={searchParams.transportMode || 'ALL'}
              onChange={(e) => setSearchParams({ ...searchParams, transportMode: e.target.value as any })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
              id="search-mode-select"
            >
              <option value="ALL">Tất cả phương thức (ALL)</option>
              <option value="SEA_FCL">Đường Biển FCL (SEA FCL)</option>
              <option value="SEA_LCL">Đường Biển LCL (SEA LCL)</option>
              <option value="AIR_FREIGHT">Đường Hàng Không (AIR FREIGHT)</option>
              <option value="INLAND_TRUCKING">Vận Tải Nội Địa (TRUCKING)</option>
              <option value="CUSTOMS_CLEARANCE">Khai Báo Hải Quan (CUSTOMS)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Điểm Đi / Cảng Đi (Origin / POL)</label>
            <input
              type="text"
              value={searchParams.origin || ''}
              onChange={(e) => setSearchParams({ ...searchParams, origin: e.target.value })}
              placeholder="VD: Cat Lai, Hai Phong, VNSGN..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              id="search-origin-input"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Điểm Đến / Cảng Đến (POD)</label>
            <input
              type="text"
              value={searchParams.destination || ''}
              onChange={(e) => setSearchParams({ ...searchParams, destination: e.target.value })}
              placeholder="VD: Los Angeles, Singapore, USLAX..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              id="search-dest-input"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Loại Container / Thiết Bị</label>
            <input
              type="text"
              value={searchParams.containerType || ''}
              onChange={(e) => setSearchParams({ ...searchParams, containerType: e.target.value })}
              placeholder="VD: 20'GP, 40'HC, Xe 5 Tấn..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              id="search-container-input"
            />
          </div>

          <div className="md:col-span-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchParams.keyword || ''}
                onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
                placeholder="Tìm nhanh theo Mã giá, Hãng tàu/vận chuyển, Tên phí (VD: Maersk, THC, OFR, SITC)..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                id="search-keyword-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 text-blue-800">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px]">Ngày kiểm tra: </span>
              <input
                type="date"
                value={searchParams.quotationDate || ''}
                onChange={(e) => setSearchParams({ ...searchParams, quotationDate: e.target.value })}
                className="bg-transparent text-xs font-semibold text-blue-900 border-none p-0 focus:outline-none"
                id="search-date-input"
              />
            </div>
          </div>
        </div>

        {/* Tab Selection Filter */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              id="tab-active-rates"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đang Hiệu Lực ({activeMatches.length})
            </button>

            <button
              onClick={() => setActiveTab('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'EXPIRED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              id="tab-expired-rates"
            >
              <Clock className="w-3.5 h-3.5" />
              Hết Hạn / Expired ({expiredMatches.length})
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              id="tab-all-rates"
            >
              <Layers className="w-3.5 h-3.5" />
              Tất Cả ({totalMatches})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Tỷ giá áp dụng: <strong>{exchangeRate.toLocaleString()} VND/USD</strong>
          </span>
        </div>

        {/* Rates Results List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 space-y-3">
          {currentDisplayList.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-base font-bold text-slate-700 mb-1">
                Không tìm thấy bảng giá đang hiệu lực phù hợp.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No matching active rate found. Bạn có thể mở rộng tiêu chí tìm kiếm hoặc tạo bảng giá mới trong module Master Rate Management.
              </p>
            </div>
          ) : (
            currentDisplayList.map((result) => {
              const { rate, matchScore, matchReasonVi, isExpired, isValidForDate } = result;
              const margin = rate.sellingAmount > 0 
                ? ((rate.sellingAmount - rate.costAmount) / rate.sellingAmount) * 100 
                : 0;

              return (
                <div 
                  key={rate.id}
                  className={`bg-white rounded-xl p-4 border transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isValidForDate 
                      ? 'border-slate-200 hover:border-blue-400' 
                      : 'border-amber-200 bg-amber-50/40 opacity-90'
                  }`}
                  id={`rate-search-item-${rate.id}`}
                >
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {rate.rateCode}
                      </span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {rate.carrier || 'General Carrier'}
                      </span>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rate.transportMode}
                      </span>
                      {rate.containerType && (
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Cont {rate.containerType}
                        </span>
                      )}
                      
                      {isValidForDate ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đang hiệu lực
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Tỷ giá đã hết hiệu lực (Expired)
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium ml-auto">
                        Độ khớp: <strong className="text-blue-600">{matchScore}%</strong>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">
                      {rate.rateName || rate.chargeName} ({rate.chargeCode})
                    </h4>

                    {/* Routing Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Tuyến:</span>
                        <strong className="text-slate-800">{rate.origin || 'N/A'}</strong>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <strong className="text-slate-800">{rate.destination || 'N/A'}</strong>
                      </div>

                      {rate.transitTime && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>Transit:</span>
                          <strong>{rate.transitTime}</strong>
                        </div>
                      )}

                      {rate.freeTime && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>Free Time:</span>
                          <strong>{rate.freeTime}</strong>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-slate-500">
                        <span>Hiệu lực:</span>
                        <strong className={isExpired ? 'text-rose-600' : 'text-slate-700'}>
                          {rate.effectiveFrom} → {rate.effectiveTo}
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-600/90 italic">
                      Lý do khớp: {matchReasonVi}
                    </p>
                  </div>

                  {/* Right Financials & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                    <div className="text-right space-y-0.5">
                      <div className="text-xs text-slate-500">
                        Giá vốn: <span className="font-mono font-medium text-slate-700">
                          {rate.costCurrency === 'USD' ? formatUSD(rate.costAmount) : formatVND(rate.costAmount)}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-blue-700">
                        Giá bán: <span className="font-mono">
                          {rate.sellingCurrency === 'USD' ? formatUSD(rate.sellingAmount) : formatVND(rate.sellingAmount)}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500 ml-1">/{rate.unit || rate.basis}</span>
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600">
                        Margin: {formatPercent(margin)}
                        {rate.minimumCharge && Number(rate.minimumCharge) > 0 ? ` (Min $${rate.minimumCharge})` : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApply(result)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                        isValidForDate
                          ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                      id={`btn-apply-rate-${rate.id}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Áp Dụng
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>Master Rate Snapshot Guarantee: Giá áp dụng sẽ được lưu bản chụp bất biến vào báo giá.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-200 font-medium text-slate-700"
            id="btn-close-bottom-search"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
