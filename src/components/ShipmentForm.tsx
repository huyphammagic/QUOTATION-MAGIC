import React, { useState } from 'react';
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
  Info
} from 'lucide-react';

interface ShipmentFormProps {
  shipment: ShipmentDetails;
  onChangeShipment: (updated: Partial<ShipmentDetails>) => void;
}

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ shipment, onChangeShipment }) => {
  const [showTransitDetails, setShowTransitDetails] = useState(false);

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
    <div id="shipment-form-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      
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

        {/* Live Weight Pulse */}
        <div className="text-right shrink-0">
          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
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
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cảng đi / Nơi gửi (POL) *
            </label>
            <input
              type="text"
              list="ports-list"
              value={shipment.pol}
              onChange={(e) => onChangeShipment({ pol: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
              placeholder="Cát Lái, Hải Phòng..."
            />
          </div>

          {/* Swap Button (1 col or inline) */}
          <div className="sm:col-span-1 flex justify-center pb-1">
            <button
              type="button"
              onClick={handleSwapPorts}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Đảo chiều cảng đi và cảng đến"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* POD */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cảng đến / Nơi nhận (POD) *
            </label>
            <input
              type="text"
              list="ports-list"
              value={shipment.pod}
              onChange={(e) => onChangeShipment({ pod: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs transition-colors"
              placeholder="Los Angeles, Hamburg..."
            />
          </div>

          {/* Commodity */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tên hàng (Commodity) *
            </label>
            <input
              type="text"
              value={shipment.commodity}
              onChange={(e) => onChangeShipment({ commodity: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              placeholder="May mặc, thủy sản..."
            />
          </div>

        </div>

        {/* Ports Auto-complete datalist */}
        <datalist id="ports-list">
          {COMMON_PORTS.map((port) => (
            <option key={port.code} value={port.name} />
          ))}
        </datalist>

        {/* Row 2: Equipment / Container Type (3/12) | Quantity (2/12) | Gross Weight (2/12) | Volume (2/12) | Chargeable Weight (3/12) */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
          
          <div className="col-span-2 sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Loại thiết bị / Quy cách *
            </label>
            <select
              value={shipment.containerType}
              onChange={(e) => onChangeShipment({ containerType: e.target.value as ContainerType })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs cursor-pointer font-medium"
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

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Số lượng *
            </label>
            <input
              type="number"
              min="1"
              value={shipment.quantity}
              onChange={(e) => onChangeShipment({ quantity: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono font-bold bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-center"
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

        {/* Row 3: Progressive Disclosure Trigger for Operational details (T/T & Free Time) */}
        <div>
          <button
            type="button"
            onClick={() => setShowTransitDetails(!showTransitDetails)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {shipment.transitTime || shipment.freeTime 
                  ? `Vận hành: ${shipment.transitTime || ''} ${shipment.freeTime ? `· FreeTime: ${shipment.freeTime}` : ''}`
                  : 'Thêm thời gian hành trình (T/T) & Free Time lưu cont/bãi'}
              </span>
            </div>
            {showTransitDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>

        {/* Collapsible Operational details */}
        {showTransitDetails && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Thời gian hành trình (T/T)
              </label>
              <input
                type="text"
                value={shipment.transitTime || ''}
                onChange={(e) => onChangeShipment({ transitTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                placeholder="Ví dụ: 18 - 22 ngày"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Thời gian miễn phí lưu cont / bãi (Free Time Dem/Det)
              </label>
              <input
                type="text"
                value={shipment.freeTime || ''}
                onChange={(e) => onChangeShipment({ freeTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                placeholder="Ví dụ: 14 ngày kết hợp tại POD"
              />
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
