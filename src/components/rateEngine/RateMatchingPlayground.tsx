import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Ship, 
  Plane, 
  Truck, 
  ListFilter,
  Flame,
  Info
} from 'lucide-react';
import { 
  RateMasterItem, 
  RateMatchQueryCriteria, 
  RateMatchOutcome, 
  MissingRateEvent 
} from '../../types/masterRate';
import { TransportMode, ContainerType } from '../../types/logistics';
import { executeRateMatching, getMissingRateEvents } from '../../services/masterRate/rateMatchingEngine';

interface RateMatchingPlaygroundProps {
  rates: RateMasterItem[];
  onSelectRate?: (rate: RateMasterItem) => void;
}

export const RateMatchingPlayground: React.FC<RateMatchingPlaygroundProps> = ({
  rates,
  onSelectRate,
}) => {
  // Search Criteria State
  const [transportMode, setTransportMode] = useState<TransportMode>('SEA_FCL');
  const [origin, setOrigin] = useState('Cat Lai, Ho Chi Minh');
  const [destination, setDestination] = useState('Los Angeles Port');
  const [carrier, setCarrier] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [equipment, setEquipment] = useState<ContainerType | string>("40'HC");
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Match Outcome
  const [outcome, setOutcome] = useState<RateMatchOutcome | null>(null);
  const [missingEvents, setMissingEvents] = useState<MissingRateEvent[]>(getMissingRateEvents());

  const handleExecuteMatch = () => {
    const criteria: RateMatchQueryCriteria = {
      transportMode,
      origin: origin.trim(),
      destination: destination.trim(),
      carrier: carrier.trim() || undefined,
      customerCode: customerCode.trim() || undefined,
      equipment: equipment || undefined,
      effectiveDate,
    };

    const result = executeRateMatching(rates, criteria, true);
    setOutcome(result);
    setMissingEvents(getMissingRateEvents());
  };

  return (
    <div className="space-y-6">
      {/* Criteria Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Bộ Định Tuyến & Khớp Giá Cước Thông Minh (Rate Matching Engine)</h3>
              <p className="text-xs text-slate-500">
                Thực thi phân cấp ưu tiên: Hợp đồng khách hàng (Tier 1) → Hợp đồng hãng tàu (Tier 2) → NCC (Tier 3) → Spot (Tier 4) → General (Tier 5)
              </p>
            </div>
          </div>

          <button
            onClick={handleExecuteMatch}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Khớp Giá Cước Ngay
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Phương thức vận chuyển</label>
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as TransportMode)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 font-medium"
            >
              <option value="SEA_FCL">Đường Biển FCL (Sea FCL)</option>
              <option value="SEA_LCL">Đường Biển LCL (Sea LCL)</option>
              <option value="AIR_FREIGHT">Hàng Không (Air Freight)</option>
              <option value="INLAND_TRUCKING">Vận Tải Đường Bộ (Trucking)</option>
              <option value="CUSTOMS_CLEARANCE">Thủ Tục Hải Quan</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Điểm đi / POL (Origin) *</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="VD: Cat Lai, VNSGN..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Điểm đến / POD (Destination) *</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="VD: Los Angeles, USLAX..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Thiết bị / Cont / Đơn vị</label>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="40'HC, 20'GP, Kgs..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Hãng tàu / Hàng không (Tùy chọn)</label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="MSC, ONE, Maersk..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Mã khách hàng (Tier 1 Contract)</label>
            <input
              type="text"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              placeholder="VD: CUST-SAMSUNG, VIP-01..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Ngày áp dụng (As-of Date)</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExecuteMatch}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
            >
              Chạy thuật toán khớp giá
            </button>
          </div>
        </div>
      </div>

      {/* Outcome Section */}
      {outcome && (
        <div className="space-y-4">
          {/* Status Header Alert */}
          {outcome.status === 'MATCH_FOUND' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Đã tìm thấy bảng giá tối ưu nhất (Best Match Found)</div>
                  <div className="text-emerald-700 mt-0.5">
                    Khớp theo chuẩn ưu tiên: {outcome.bestMatch?.matchReasonVi}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs">
                Độ khớp: {outcome.bestMatch?.matchScore}%
              </span>
            </div>
          )}

          {outcome.status === 'RATE_CONFLICT' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Xung Đột Giá (Rate Conflict Detected)
              </div>
              <p>{outcome.conflictReason}</p>
            </div>
          )}

          {outcome.status === 'RATE_OVERLAP_CONFLICT' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Trùng Lặp Hiệu Lực Thời Gian (Rate Overlap Conflict)
              </div>
              <p>{outcome.conflictReason}</p>
            </div>
          )}

          {outcome.status === 'NO_APPLICABLE_RATE_FOUND' && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">KHÔNG TÌM THẤY BẢNG GIÁ HỢP LỆ (NO APPLICABLE RATE FOUND)</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hệ thống tuân thủ nguyên tắc <b>"Không giả lập, không tự suy đoán giá cước"</b>. 
                  Yêu cầu giá này đã được tự động lưu vào sự kiện Missing Rate để bộ phận Pricing bổ sung cước thực tế.
                </p>
              </div>
              {outcome.missingRateEventLogged && (
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                  ✓ Đã ghi nhận tuyến thiếu cước vào danh mục chờ xử lý
                </span>
              )}
            </div>
          )}

          {/* Best Match Showcase Card */}
          {outcome.bestMatch && (
            <div className="bg-white rounded-2xl border-2 border-blue-500/80 shadow-md p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                    Lựa chọn số 1 (Priority Tier {outcome.bestMatch.priorityLevel})
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {outcome.bestMatch.rate.rateCode}
                  </span>
                </div>

                <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Hiệu lực: {outcome.bestMatch.rate.effectiveFrom} ~ {outcome.bestMatch.rate.effectiveTo}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Hãng vận chuyển</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {outcome.bestMatch.rate.carrier || 'Chung'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {outcome.bestMatch.rate.rateName}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Tuyến đường & Thiết bị</div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <span>{outcome.bestMatch.rate.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{outcome.bestMatch.rate.destination}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Thiết bị: {outcome.bestMatch.rate.containerType || outcome.bestMatch.rate.unit}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Giá vốn đầu vào</div>
                    <div className="font-bold font-mono text-slate-700 text-sm">
                      {outcome.bestMatch.rate.costAmount.toLocaleString()} {outcome.bestMatch.rate.costCurrency}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-700 font-bold">Giá bán đề xuất</div>
                    <div className="font-bold font-mono text-emerald-700 text-base">
                      {outcome.bestMatch.rate.sellingAmount.toLocaleString()} {outcome.bestMatch.rate.sellingCurrency}
                    </div>
                  </div>
                </div>
              </div>

              {onSelectRate && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onSelectRate(outcome.bestMatch!.rate)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Sử dụng giá này cho Báo giá
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Alternative Matches Table */}
          {outcome.matchingCandidates.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-slate-500" />
                  Các lựa chọn thay thế khả thi ({outcome.matchingCandidates.length - 1}):
                </span>
                <span className="text-slate-400">Sắp xếp theo độ khớp và mức ưu tiên</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {outcome.matchingCandidates.slice(1).map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 flex items-center justify-between transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{item.rate.carrier || 'General'}</span>
                        <span className="font-mono text-[11px] text-slate-400">{item.rate.rateCode}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Tier {item.priorityLevel}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {item.matchReasonVi} • Hết hạn: {item.rate.effectiveTo}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-slate-400">Giá bán</div>
                        <div className="font-bold text-slate-800">
                          {item.rate.sellingAmount.toLocaleString()} {item.rate.sellingCurrency}
                        </div>
                      </div>

                      {onSelectRate && (
                        <button
                          onClick={() => onSelectRate(item.rate)}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition"
                        >
                          Chọn
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Missing Rate Events Section */}
      {missingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Tuyến Thiếu Bảng Giá Được Ghi Nhận ({missingEvents.length}):
            </h4>
            <span className="text-[11px] text-slate-400">Tổng hợp để bộ phận Pricing bổ sung</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {missingEvents.slice(0, 6).map((ev) => (
              <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{ev.origin} → {ev.destination}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    {ev.hitCount} lượt hỏi
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Mode: <b>{ev.transportMode}</b> • Thiết bị: {ev.equipment || 'All'}
                </div>
                <div className="text-[10px] text-slate-400 pt-1">
                  Yêu cầu gần nhất: {new Date(ev.lastRequestedAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
