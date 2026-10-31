import React, { useState, useEffect } from 'react';
import { ShipmentDetails, TransportMode, ContainerType } from '../types/logistics';
import { COMMON_PORTS } from '../data/presets';
import { computeChargeableWeight, formatNumber } from '../utils/formatters';
import { 
  Anchor, 
  Plane, 
  Truck, 
  ShieldCheck, 
  Box, 
  Navigation, 
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Sparkles,
  BarChart3,
  AlertCircle,
  Ship
} from 'lucide-react';

import { QuoteData } from '../types/logistics';
import { HistoricalRateBadge } from './pricing/HistoricalRateBadge';

export interface ShipmentFormErrors {
  pol?: string;
  pod?: string;
  commodity?: string;
  containerType?: string;
  quantity?: string;
}

interface ShipmentFormProps {
  shipment: ShipmentDetails;
  onChangeShipment: (updated: Partial<ShipmentDetails>) => void;
  onOpenHsCodeTariff?: () => void;
  onOpenFreightRateBenchmarking?: () => void;
  savedQuotes?: QuoteData[];
  currentQuoteId?: string;
  onOpenHistoricalRateAdvisor?: () => void;
  onOpenSmartSurcharges?: () => void;
  smartSurchargesCount?: number;
  errors?: ShipmentFormErrors;
  shakeTrigger?: number;
}

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ 
  shipment, 
  onChangeShipment,
  onOpenHsCodeTariff,
  onOpenFreightRateBenchmarking,
  savedQuotes = [],
  currentQuoteId,
  onOpenHistoricalRateAdvisor,
  onOpenSmartSurcharges,
  smartSurchargesCount = 0,
  errors,
  shakeTrigger = 0,
}) => {
  const [showTransitDetails, setShowTransitDetails] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Trigger subtle shake animation when shakeTrigger updates and errors exist
  useEffect(() => {
    if (shakeTrigger > 0 && errors && (errors.pol || errors.pod || errors.commodity || errors.containerType || errors.quantity)) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 450);
      return () => clearTimeout(timer);
    }
  }, [shakeTrigger, errors]);

  const handleModeChange = (mode: TransportMode) => {
    let defaultContainer: ContainerType = "40'HC";
    if (mode === 'SEA_LCL') defaultContainer = "LCL (CBM/KGS)";
    if (mode === 'AIR_FREIGHT') defaultContainer = "AIR (KGS/CW)";
    if (mode === 'INLAND_TRUCKING') defaultContainer = "Xe Tải 5 Tấn";

    const updated = { ...shipment, mode, containerType: defaultContainer };
    updated.chargeableWeight = computeChargeableWeight(updated);
    onChangeShipment(updated);
  };

  const handleSwapPorts = () => {
    onChangeShipment({
      pol: shipment.pod,
      pod: shipment.pol,
    });
  };

  const handleWeightOrCbmChange = (field: 'grossWeightKg' | 'volumeCbm', val: number) => {
    const updated = { ...shipment, [field]: val };
    updated.chargeableWeight = computeChargeableWeight(updated);
    onChangeShipment(updated);
  };

  const transportModes: { mode: TransportMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'SEA_FCL', label: 'Biển (FCL)', icon: <Anchor className="w-3.5 h-3.5" /> },
    { mode: 'SEA_LCL', label: 'Lẻ (LCL)', icon: <Box className="w-3.5 h-3.5" /> },
    { mode: 'AIR_FREIGHT', label: 'Air Freight', icon: <Plane className="w-3.5 h-3.5" /> },
    { mode: 'INLAND_TRUCKING', label: 'Trucking', icon: <Truck className="w-3.5 h-3.5" /> },
    { mode: 'CUSTOMS_CLEARANCE', label: 'Hải Quan', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { mode: 'MULTIMODAL', label: 'Đa Phương Thức', icon: <Navigation className="w-3.5 h-3.5" /> },
  ];

  return (
    <div id="shipment-form-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between card-specular-glow card-hover-lift">
      
      {/* Title Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Navigation className="w-3.5 h-3.5 text-slate-800" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 tracking-tight truncate">
                Tuyến Đường & Quy Cách
              </h2>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-500 font-mono truncate">
                {shipment.containerType} ({shipment.quantity} {shipment.mode === 'SEA_FCL' ? 'cont' : 'kiện'})
              </span>
            </div>
          </div>
        </div>

        {/* Live Weight Pulse & Smart Surcharges */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSmartSurcharges && (
            <button
              type="button"
              onClick={onOpenSmartSurcharges}
              className="press-physics-subtle inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Phân tích và gợi ý phụ phí thông minh cho tuyến này"
            >
              <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
              <span>Gợi ý phụ phí</span>
              {smartSurchargesCount > 0 && (
                <span className="font-mono text-indigo-900 bg-indigo-200/70 px-1 rounded text-[10px]">
                  {smartSurchargesCount}
                </span>
              )}
            </button>
          )}

          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
            CW: {formatNumber(shipment.chargeableWeight)} {shipment.mode === 'AIR_FREIGHT' ? 'KG' : 'RT'}
          </span>
        </div>
      </div>

      {/* Mode Selection Segmented Control */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-slate-100/80 rounded-xl">
          {transportModes.map(({ mode, label, icon }) => {
            const isActive = shipment.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {icon}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Essential Inputs */}
      <div className="p-4 space-y-3">
        
        {/* Row 1: Routing with Swap Button (POL & POD) + Commodity */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          
          {/* POL */}
          <div className={`sm:col-span-4 ${errors?.pol ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-[11px] font-semibold transition-colors ${
                errors?.pol ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}>
                Cảng đi / Nơi gửi (POL) *
              </label>
              {errors?.pol ? (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.pol}
                </span>
              ) : onOpenFreightRateBenchmarking ? (
                <button
                  type="button"
                  onClick={onOpenFreightRateBenchmarking}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
                  title="Đối soát cước thị trường tuyến này bằng AI"
                >
                  <BarChart3 className="w-2.5 h-2.5 text-blue-600" />
                  <span>Đối Soát Cước AI</span>
                </button>
              ) : null}
            </div>
            <input
              type="text"
              list="ports-list"
              value={shipment.pol}
              onChange={(e) => onChangeShipment({ pol: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all ${
                errors?.pol
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
              placeholder="Cát Lái, Hải Phòng..."
            />
          </div>

          {/* Swap Button (1 col or inline) */}
          <div className="sm:col-span-1 flex justify-center pb-1">
            <button
              type="button"
              onClick={handleSwapPorts}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer press-physics active:rotate-180 duration-300"
              title="Đảo chiều cảng đi và cảng đến"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* POD */}
          <div className={`sm:col-span-4 ${errors?.pod ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[11px] font-semibold transition-colors ${
                errors?.pod ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}>
                Cảng đến / Nơi nhận (POD) *
              </label>
              {errors?.pod && (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.pod}
                </span>
              )}
            </div>
            <input
              type="text"
              list="ports-list"
              value={shipment.pod}
              onChange={(e) => onChangeShipment({ pod: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all ${
                errors?.pod
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
              placeholder="Los Angeles, Hamburg..."
            />
          </div>

          {/* Commodity */}
          <div className={`sm:col-span-3 ${errors?.commodity ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-[11px] font-semibold transition-colors ${
                errors?.commodity ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}>
                Tên hàng (Commodity) *
              </label>
              {errors?.commodity ? (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.commodity}
                </span>
              ) : onOpenHsCodeTariff ? (
                <button
                  type="button"
                  onClick={onOpenHsCodeTariff}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 transition flex items-center gap-1 cursor-pointer"
                  title="Tra cứu mã HS và tính thuế bằng AI"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span>Mã HS AI</span>
                </button>
              ) : null}
            </div>
            <input
              type="text"
              value={shipment.commodity}
              onChange={(e) => onChangeShipment({ commodity: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-all ${
                errors?.commodity
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
              placeholder="May mặc, thủy sản..."
            />
          </div>

        </div>

        {/* Gói 3: Hải Trình Động POL ➔ POD (Dynamic Maritime Route Laser Beam & Radar Track) */}
        {shipment.pol && shipment.pod && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 text-white border border-cyan-500/30 shadow-xs">
            {/* Ambient cyber grid effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
              {/* Origin Point */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Xuất phát (POL)</span>
                  <span className="font-bold text-white text-xs truncate block max-w-[110px] sm:max-w-[160px]">{shipment.pol}</span>
                </div>
              </div>

              {/* Dynamic Laser Route Track */}
              <div className="flex-1 px-2 relative flex flex-col items-center">
                <div className="w-full relative py-1">
                  {/* Laser track beam */}
                  <div className="h-[2px] w-full rounded-full laser-route-rail opacity-80" />
                  {/* Running photon particle */}
                  <div className="photon-pulse-node top-1/2 -translate-y-1/2" />
                  {/* Floating vessel icon */}
                  <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 maritime-ship-float flex items-center gap-1 bg-slate-900/90 border border-cyan-400/40 px-1.5 py-0.5 rounded-full shadow-xs">
                    <Ship className="w-3 h-3 text-cyan-400" />
                    <span className="text-[9px] font-mono text-cyan-300 font-semibold hidden sm:inline">
                      {shipment.transitTime ? `${shipment.transitTime}d` : 'Maritime Track'}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] text-cyan-300/80 font-mono tracking-tight mt-1 flex items-center gap-1">
                  <span>Hải trình động</span>
                  {shipment.transitTime && <span className="text-slate-400">• Dự kiến {shipment.transitTime} ngày</span>}
                </div>
              </div>

              {/* Destination Point */}
              <div className="flex items-center gap-1.5 min-w-0 text-right">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Cập cảng (POD)</span>
                  <span className="font-bold text-cyan-300 text-xs truncate block max-w-[110px] sm:max-w-[160px]">{shipment.pod}</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* 3-Month Historical Rate Suggestion Ribbon */}
        {shipment.pol && shipment.pod && onOpenHistoricalRateAdvisor && (
          <HistoricalRateBadge
            pol={shipment.pol}
            pod={shipment.pod}
            savedQuotes={savedQuotes}
            currentQuoteId={currentQuoteId}
            onOpenAdvisor={onOpenHistoricalRateAdvisor}
            className="w-full"
          />
        )}

        {/* Ports Auto-complete datalist */}
        <datalist id="ports-list">
          {COMMON_PORTS.map((port) => (
            <option key={port.code} value={port.name} />
          ))}
        </datalist>

        {/* Row 2: Equipment / Container Type (3/12) | Quantity (2/12) | Gross Weight (2/12) | Volume (2/12) | Chargeable Weight (3/12) */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
          
          <div className={`col-span-2 sm:col-span-4 ${errors?.containerType ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[11px] font-semibold transition-colors ${
                errors?.containerType ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}>
                Loại thiết bị / Quy cách *
              </label>
              {errors?.containerType && (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.containerType}
                </span>
              )}
            </div>
            <select
              value={shipment.containerType}
              onChange={(e) => onChangeShipment({ containerType: e.target.value as ContainerType })}
              className={`w-full px-2.5 py-1.5 rounded-lg border font-medium text-xs cursor-pointer transition-all ${
                errors?.containerType
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
            >
              <option value="20'GP">Cont 20'GP (Tiêu chuẩn)</option>
              <option value="40'GP">Cont 40'GP (Tiêu chuẩn)</option>
              <option value="40'HC">Cont 40'HC (High Cube)</option>
              <option value="45'HC">Cont 45'HC</option>
              <option value="20'RF">Cont 20' Lạnh (Reefer)</option>
              <option value="40'RF">Cont 40' Lạnh (Reefer)</option>
              <option value="20'OT">Cont 20' Open Top</option>
              <option value="40'OT">Cont 40' Open Top</option>
              <option value="LCL (CBM/KGS)">LCL - Hàng lẻ gom cont</option>
              <option value="AIR (KGS/CW)">AIR - Hàng không (CW/KGS)</option>
              <option value="Xe Tải 1.25 Tấn">Xe Tải 1.25 Tấn</option>
              <option value="Xe Tải 2.5 Tấn">Xe Tải 2.5 Tấn</option>
              <option value="Xe Tải 5 Tấn">Xe Tải 5 Tấn</option>
              <option value="Xe Tải 8 Tấn">Xe Tải 8 Tấn</option>
              <option value="Xe Tải 15 Tấn">Xe Tải 15 Tấn</option>
              <option value="Xe Đầu Kéo / Moóc">Xe Đầu Kéo / Moóc</option>
            </select>
          </div>

          <div className={`col-span-1 sm:col-span-2 ${errors?.quantity ? 'field-invalid' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[11px] font-semibold transition-colors ${
                errors?.quantity ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}>
                Số lượng *
              </label>
              {errors?.quantity && (
                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  {errors.quantity}
                </span>
              )}
            </div>
            <input
              type="number"
              min="1"
              value={shipment.quantity}
              onChange={(e) => onChangeShipment({ quantity: Math.max(0, Number(e.target.value) || 0) })}
              className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-center transition-all ${
                errors?.quantity
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus:border-rose-500 focus:ring-rose-400 ' + (isShaking ? 'animate-field-shake' : '')
                  : 'border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900'
              }`}
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Gross Wt (KG)
            </label>
            <input
              type="number"
              value={shipment.grossWeightKg || ''}
              onChange={(e) => handleWeightOrCbmChange('grossWeightKg', Number(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-right"
              placeholder="24500"
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Thể tích (CBM)
            </label>
            <input
              type="number"
              step="0.01"
              value={shipment.volumeCbm || ''}
              onChange={(e) => handleWeightOrCbmChange('volumeCbm', Number(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-right"
              placeholder="68.5"
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cước CW
            </label>
            <div className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-900 text-xs text-right truncate">
              {formatNumber(shipment.chargeableWeight)}
            </div>
          </div>

        </div>

        {/* Row 3: Progressive Disclosure Trigger for Operational details */}
        <div>
          <button
            type="button"
            onClick={() => setShowTransitDetails(!showTransitDetails)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {shipment.carrier || shipment.transitTime || shipment.freeTime || shipment.etd
                  ? `Vận hành: ${shipment.carrier ? `${shipment.carrier} · ` : ''}${shipment.transitTime ? `T/T ${shipment.transitTime} · ` : ''}${shipment.freeTime ? `FreeTime ${shipment.freeTime}` : ''}`
                  : 'Mở rộng (Hãng tàu, Tàu/Chuyến, ETD/ETA, Free Time)'}
              </span>
            </div>
            {showTransitDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
            )}
          </button>
        </div>

        {/* Collapsible Operational details */}
        {showTransitDetails && (
          <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            {/* Sub-row 1: Carrier & Vessel/Voyage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hãng vận chuyển (Carrier / Hãng tàu)
                </label>
                <input
                  type="text"
                  value={shipment.carrier || ''}
                  onChange={(e) => onChangeShipment({ carrier: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                  placeholder="Maersk, ONE, Cosco, Vietnam Airlines..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên tàu & Số chuyến (Vessel / Voyage)
                </label>
                <input
                  type="text"
                  value={(shipment as any).vesselVoyage || ''}
                  onChange={(e) => onChangeShipment({ ...shipment, vesselVoyage: e.target.value } as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                  placeholder="Ví dụ: CMA CGM RACINE / 012E"
                />
              </div>
            </div>

            {/* Sub-row 2: ETD & ETA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngày khởi hành (ETD)
                </label>
                <input
                  type="date"
                  value={shipment.etd || ''}
                  onChange={(e) => onChangeShipment({ etd: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngày đến dự kiến (ETA)
                </label>
                <input
                  type="date"
                  value={shipment.eta || ''}
                  onChange={(e) => onChangeShipment({ eta: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono transition-colors"
                />
              </div>
            </div>

            {/* Sub-row 3: Transit Time & Free Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Thời gian hành trình (T/T)
                </label>
                <input
                  type="text"
                  value={shipment.transitTime || ''}
                  onChange={(e) => onChangeShipment({ transitTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                  placeholder="Ví dụ: 18 - 22 ngày"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Miễn phí lưu cont / bãi (Free Time Dem/Det)
                </label>
                <input
                  type="text"
                  value={shipment.freeTime || ''}
                  onChange={(e) => onChangeShipment({ freeTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
                  placeholder="Ví dụ: 14 ngày kết hợp tại POD"
                />
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
