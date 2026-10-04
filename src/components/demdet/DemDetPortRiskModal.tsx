import React, { useState, useMemo } from 'react';
import {
  Anchor,
  Clock,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  X,
  Copy,
  Check,
  Calculator,
  Ship,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  MapPin,
  CheckCircle2,
  FileText
} from 'lucide-react';
import {
  CarrierFreeTimePolicy,
  DemDetSimulationInput,
  DemDetSimulationResult,
  PortCongestionIndicator,
  FreeTimeValueWeaponPitch
} from '../../types/demDetRisk';
import {
  CARRIER_FREE_TIME_POLICIES,
  PORT_CONGESTION_DATA,
  simulateDemDetCost,
  generateFreeTimeSalesWeapon,
  saveDemDetSimulation
} from '../../services/demdet/demDetRiskService';

interface DemDetPortRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerName?: string;
  defaultCarrierCode?: string;
  defaultPortCode?: string;
  defaultContainerType?: '20GP' | '40GP' | '40HC' | '20RF' | '40RF';
}

export const DemDetPortRiskModal: React.FC<DemDetPortRiskModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerName = 'Công ty Cổ phần Thủy Sản Biển Xanh',
  defaultCarrierCode = 'MAERSK',
  defaultPortCode = 'VNCLI',
  defaultContainerType = '40HC'
}) => {
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'PORT_RADAR' | 'CARRIER_MATRIX' | 'SALES_WEAPON'>('CALCULATOR');

  // Calculator Form state
  const [carrierCode, setCarrierCode] = useState<string>(defaultCarrierCode);
  const [containerType, setContainerType] = useState<'20GP' | '40GP' | '40HC' | '20RF' | '40RF'>(defaultContainerType);
  const [quantity, setQuantity] = useState<number>(2);
  const [freeDaysGranted, setFreeDaysGranted] = useState<number>(7);
  const [expectedStorageDays, setExpectedStorageDays] = useState<number>(14);
  const [portCode, setPortCode] = useState<string>(defaultPortCode);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sales pitch input
  const [pitchCustomer, setPitchCustomer] = useState<string>(defaultCustomerName);
  const [pitchRoute, setPitchRoute] = useState<string>('Cát Lái -> Long Beach (Mỹ)');
  const [pitchOfferedDays, setPitchOfferedDays] = useState<number>(14);

  // Current Simulation Calculation
  const simulationResult: DemDetSimulationResult = useMemo(() => {
    return simulateDemDetCost({
      carrierCode,
      containerType,
      quantity,
      freeDaysGranted,
      expectedStorageDays,
      portCode
    });
  }, [carrierCode, containerType, quantity, freeDaysGranted, expectedStorageDays, portCode]);

  // Current Sales Weapon Pitch
  const salesWeaponPitch: FreeTimeValueWeaponPitch = useMemo(() => {
    return generateFreeTimeSalesWeapon(
      pitchCustomer,
      pitchRoute,
      carrierCode,
      pitchOfferedDays
    );
  }, [pitchCustomer, pitchRoute, carrierCode, pitchOfferedDays]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleApplyPreset = (carrier: CarrierFreeTimePolicy) => {
    setCarrierCode(carrier.carrierCode);
    setFreeDaysGranted(carrier.standardCombinedDays);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner text-cyan-200">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">AI Container Free-Time (DEM/DET) & Port Congestion Radar</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/25 text-white rounded-full uppercase">
                  Phase 60
                </span>
              </div>
              <p className="text-xs text-cyan-100/90 mt-0.5">
                Mô Phỏng Phí Lưu Bãi Lũy Tiến, Ma Trận Hãng Tàu & Radar Kẹt Cảng Biển Toàn Cầu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'CALCULATOR'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Bộ Tính Phí DEM/DET Lũy Tiến</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PORT_RADAR')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'PORT_RADAR'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Ship className="w-4 h-4" />
            <span>Radar Kẹt Cảng Biển ({PORT_CONGESTION_DATA.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CARRIER_MATRIX')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'CARRIER_MATRIX'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ma Trận Free-Time Hãng Tàu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SALES_WEAPON')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'SALES_WEAPON'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Vũ Khí Chốt Deal Bằng Free-Time</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">

          {/* TAB 1: Progressive DEM/DET Calculator */}
          {activeTab === 'CALCULATOR' && (
            <div className="space-y-6">
              {/* Form Input Grid */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Hãng Tàu Vận Chuyển</label>
                  <select
                    value={carrierCode}
                    onChange={e => setCarrierCode(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold"
                  >
                    {CARRIER_FREE_TIME_POLICIES.map(c => (
                      <option key={c.carrierCode} value={c.carrierCode}>
                        {c.carrierName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Loại Container</label>
                  <select
                    value={containerType}
                    onChange={e => setContainerType(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold"
                  >
                    <option value="20GP">20' Dry Standard (20GP)</option>
                    <option value="40GP">40' Dry Standard (40GP)</option>
                    <option value="40HC">40' High Cube (40HC)</option>
                    <option value="20RF">20' Reefer Lạnh (20RF)</option>
                    <option value="40RF">40' Reefer Lạnh (40RF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Số Lượng Container</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Free-Time Được Cấp (Ngày)</label>
                  <input
                    type="number"
                    min={0}
                    value={freeDaysGranted}
                    onChange={e => setFreeDaysGranted(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-emerald-50 text-emerald-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Dự Kiến Lưu Trữ (Ngày)</label>
                  <input
                    type="number"
                    min={1}
                    value={expectedStorageDays}
                    onChange={e => setExpectedStorageDays(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-rose-50 text-rose-800 font-bold"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
                <span className="text-slate-500 font-medium shrink-0 text-[11px]">Nạp nhanh chuẩn hãng:</span>
                {CARRIER_FREE_TIME_POLICIES.map(c => (
                  <button
                    key={c.carrierCode}
                    type="button"
                    onClick={() => handleApplyPreset(c)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      carrierCode === c.carrierCode
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.carrierName} ({c.standardCombinedDays}d)
                  </button>
                ))}
              </div>

              {/* Simulation Result Big Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Result 1: Fee Card */}
                <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${
                  simulationResult.riskLevel === 'SAFE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : simulationResult.riskLevel === 'LOW'
                    ? 'bg-blue-50 border-blue-300 text-blue-950'
                    : simulationResult.riskLevel === 'MODERATE'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Phí Phạt DEM/DET Phát Sinh
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        simulationResult.riskLevel === 'SAFE'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}>
                        {simulationResult.riskLevel}
                      </span>
                    </div>

                    <div className="text-3xl font-extrabold mt-3">
                      ${simulationResult.totalDemDetFeeUsd.toLocaleString()} <span className="text-sm font-normal">USD</span>
                    </div>

                    <div className="text-xs mt-1 font-semibold">
                      {simulationResult.overdueDays === 0 ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> An toàn trong {simulationResult.freeDaysGranted} ngày free!
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Quá hạn {simulationResult.overdueDays} ngày cho {simulationResult.quantity} container
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] mt-4 pt-3 border-t border-current/15 leading-relaxed">
                    {simulationResult.recommendationVi}
                  </p>
                </div>

                {/* Result 2: Value of Extra 7 Days Free */}
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-4 rounded-xl border border-indigo-700 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                        Giá Trị Gói Ưu Đãi +7 Ngày Free
                      </span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="text-3xl font-extrabold mt-3 text-amber-300">
                      +${simulationResult.potentialSavingsWithExtra7DaysUsd.toLocaleString()} <span className="text-sm font-normal text-white">USD</span>
                    </div>

                    <div className="text-xs text-indigo-200 mt-1">
                      Số tiền thực tế chủ hàng tiết kiệm được nếu sales xin thành công thêm 7 ngày free-time.
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-indigo-200">Vũ khí chốt deal thuyết phục</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPitchOfferedDays(freeDaysGranted + 7);
                        setActiveTab('SALES_WEAPON');
                      }}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Dùng Chốt Khách ➔
                    </button>
                  </div>
                </div>

                {/* Result 3: Customer Advice Points */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Khuyến Nghị Vận Hành Cho Khách</span>
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      {simulationResult.customerAdviceBulletPoints.map((point, i) => (
                        <li key={i} className="text-[11px] leading-tight">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-2 text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
                    <span>Áp dụng quy tắc tính lũy tiến ngành hàng hải</span>
                    <button
                      type="button"
                      onClick={() => saveDemDetSimulation(simulationResult)}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      Lưu kịch bản
                    </button>
                  </div>
                </div>
              </div>

              {/* Progressive Tier Breakdown Table */}
              {simulationResult.costBreakdownByTier.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Chi Tiết Phân Bổ Phí Theo Từng Bậc Lũy Tiến (Progressive Fee Breakdown)</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="p-3">Thang Bậc</th>
                        <th className="p-3 text-center">Số Ngày Bị Tính</th>
                        <th className="p-3 text-right">Đơn Giá / Ngày / Cont</th>
                        <th className="p-3 text-right">Tổng Tiền ({simulationResult.quantity} cont)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {simulationResult.costBreakdownByTier.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{t.tierName}</td>
                          <td className="p-3 text-center font-bold text-slate-900">{t.billableDays} ngày</td>
                          <td className="p-3 text-right text-slate-600">${t.ratePerDayUsd} USD</td>
                          <td className="p-3 text-right font-bold text-rose-700">${t.subtotalUsd.toLocaleString()} USD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Port Congestion Radar */}
          {activeTab === 'PORT_RADAR' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-blue-700" />
                    <span>Chỉ Số Tắc Nghẽn Cảng Biển & Mật Độ Bãi Cont Thời Gian Thực</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giám sát thời gian chờ cầu bến (Berth Waiting), mật độ bãi (Yard Density) tại các cụm cảng xuất nhập khẩu chính
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PORT_CONGESTION_DATA.map(port => (
                  <div
                    key={port.portCode}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {port.portCode} • {port.country}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          port.congestionLevel === 'SMOOTH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : port.congestionLevel === 'MODERATE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {port.congestionLevel === 'SMOOTH' && 'Thông thoáng'}
                          {port.congestionLevel === 'MODERATE' && 'Bận rộn nhẹ'}
                          {port.congestionLevel === 'HEAVY' && 'Kẹt bãi cảng'}
                          {port.congestionLevel === 'SEVERE' && 'Nghiêm trọng'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2">{port.portNameVi}</h4>

                      {/* Port stats */}
                      <div className="grid grid-cols-3 gap-2 my-3 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400">Chờ cầu bến</div>
                          <div className="text-xs font-bold text-slate-800">{port.waitingTimeDays} ngày</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Mật độ bãi</div>
                          <div className={`text-xs font-bold ${port.yardDensityPercent > 80 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {port.yardDensityPercent}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Tàu chờ neo</div>
                          <div className="text-xs font-bold text-slate-800">{port.vesselQueueCount} tàu</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-700 font-semibold">Tác động lưu bãi:</strong> {port.impactOnFreeTimeRiskVi}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-indigo-900 bg-indigo-50/60 p-2 rounded-lg">
                      <strong>💡 Khuyến nghị Ops:</strong> {port.opsMitigationAdviceVi}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Carrier Free-Time Matrix */}
          {activeTab === 'CARRIER_MATRIX' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Ma Trận Chính Sách Free-Time Chuẩn Của Các Hãng Tàu Tại Việt Nam
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/60 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="p-3">Hãng Tàu</th>
                        <th className="p-3 text-center">Gói Combined</th>
                        <th className="p-3 text-center">DEM Cảng</th>
                        <th className="p-3 text-center">DET Kho</th>
                        <th className="p-3 text-center">Cont Lạnh (RF)</th>
                        <th className="p-3 text-center text-blue-700">Tối Đa Bảo Lãnh</th>
                        <th className="p-3">Tuyến Thế Mạnh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CARRIER_FREE_TIME_POLICIES.map(c => (
                        <tr key={c.carrierCode} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{c.carrierName}</div>
                            <div className="text-[10px] text-slate-400">{c.termsSummaryVi}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700 bg-emerald-50/50">
                            {c.standardCombinedDays} ngày
                          </td>
                          <td className="p-3 text-center text-slate-700">{c.standardDemurrageDays} ngày</td>
                          <td className="p-3 text-center text-slate-700">{c.standardDetentionDays} ngày</td>
                          <td className="p-3 text-center text-slate-600">{c.reeferFreeDays} ngày</td>
                          <td className="p-3 text-center font-extrabold text-blue-800 bg-blue-50/60">
                            {c.specialTierNegotiableDays} ngày
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{c.favorableLanesVi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Sales Value Weapon Generator */}
          {activeTab === 'SALES_WEAPON' && (
            <div className="space-y-5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Khách Hàng Mục Tiêu</label>
                  <input
                    type="text"
                    value={pitchCustomer}
                    onChange={e => setPitchCustomer(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tuyến Vận Chuyển</label>
                  <input
                    type="text"
                    value={pitchRoute}
                    onChange={e => setPitchRoute(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Số Ngày Free Cam Kết Cấp</label>
                  <select
                    value={pitchOfferedDays}
                    onChange={e => setPitchOfferedDays(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-indigo-50 text-indigo-900 font-bold"
                  >
                    <option value={10}>10 Ngày Free Combined</option>
                    <option value={14}>14 Ngày Free Combined (Chuẩn VIP)</option>
                    <option value={18}>18 Ngày Free Combined</option>
                    <option value={21}>21 Ngày Free Combined (Hạng Kim Cương)</option>
                  </select>
                </div>
              </div>

              {/* Pitch Output Cards */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">
                      Bản Đề Xuất Giá Trị Đính Kèm Báo Giá
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {salesWeaponPitch.pitchTitleVi}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(salesWeaponPitch.salesPitchParagraphVi, 'pitch')}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'pitch' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'pitch' ? 'Đã Sao Chép' : 'Sao Chép Gửi Khách'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                  {salesWeaponPitch.salesPitchParagraphVi}
                </div>

                <div className="bg-white/10 p-3 rounded-lg border border-white/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-indigo-200">
                      📄 Điều Khoản Phụ Lục Hợp Đồng (Contract Addendum)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(salesWeaponPitch.contractClauseSnippetVi, 'clause')}
                      className="text-[10px] text-amber-300 font-bold hover:underline cursor-pointer"
                    >
                      {copiedKey === 'clause' ? 'Đã chép điều khoản!' : 'Chép điều khoản'}
                    </button>
                  </div>
                  <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono">
                    {salesWeaponPitch.contractClauseSnippetVi}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            <span>Tích hợp biểu phí lũy tiến thực tế của Maersk, ONE, COSCO, Evergreen, MSC, SITC</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng Bộ Tối Ưu
          </button>
        </div>
      </div>
    </div>
  );
};
