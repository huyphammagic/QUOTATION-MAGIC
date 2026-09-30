import React from 'react';
import { ShipmentDetails, TransportMode, ContainerType } from '../types/logistics';
import { COMMON_PORTS } from '../data/presets';
import { computeChargeableWeight, formatNumber } from '../utils/formatters';
import { Anchor, Plane, Truck, ShieldCheck, Box, Navigation, Clock, Calculator } from 'lucide-react';

interface ShipmentFormProps {
  shipment: ShipmentDetails;
  onChangeShipment: (updated: Partial<ShipmentDetails>) => void;
}

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ shipment, onChangeShipment }) => {

  const handleModeChange = (mode: TransportMode) => {
    let defaultContainer: ContainerType = "40'HC";
    if (mode === 'SEA_LCL') defaultContainer = "LCL (CBM/KGS)";
    if (mode === 'AIR_FREIGHT') defaultContainer = "AIR (KGS/CW)";
    if (mode === 'INLAND_TRUCKING') defaultContainer = "Xe Tải 5 Tấn";

    const updated = { ...shipment, mode, containerType: defaultContainer };
    updated.chargeableWeight = computeChargeableWeight(updated);
    onChangeShipment(updated);
  };

  const handleWeightOrCbmChange = (field: 'grossWeightKg' | 'volumeCbm', val: number) => {
    const updated = { ...shipment, [field]: val };
    updated.chargeableWeight = computeChargeableWeight(updated);
    onChangeShipment(updated);
  };

  const transportModes: { mode: TransportMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'SEA_FCL', label: 'Biển (FCL)', icon: <Anchor className="w-3.5 h-3.5" /> },
    { mode: 'SEA_LCL', label: 'Hàng Lẻ (LCL)', icon: <Box className="w-3.5 h-3.5" /> },
    { mode: 'AIR_FREIGHT', label: 'Air Freight', icon: <Plane className="w-3.5 h-3.5" /> },
    { mode: 'INLAND_TRUCKING', label: 'Trucking', icon: <Truck className="w-3.5 h-3.5" /> },
    { mode: 'CUSTOMS_CLEARANCE', label: 'Hải Quan', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { mode: 'MULTIMODAL', label: 'Đa Phương Thức', icon: <Navigation className="w-3.5 h-3.5" /> },
  ];

  return (
    <div id="shipment-form-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
      
      {/* Title Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
            Tuyến đường & Quy cách lô hàng
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {shipment.containerType} · {shipment.quantity} {shipment.mode === 'SEA_FCL' ? 'cont' : 'kiện'}
        </span>
      </div>

      {/* Mode Selection Segmented Control */}
      <div className="px-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          {transportModes.map(({ mode, label, icon }) => {
            const isActive = shipment.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
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

      {/* Grid Inputs */}
      <div className="p-4 pt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
        
        {/* POL (Port of Loading) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Cảng đi / Nơi gửi (POL) *
          </label>
          <input
            type="text"
            list="ports-list"
            value={shipment.pol}
            onChange={(e) => onChangeShipment({ pol: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="Cát Lái, Hải Phòng, Tân Sơn Nhất..."
          />
        </div>

        {/* POD (Port of Discharge) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Cảng đến / Nơi nhận (POD) *
          </label>
          <input
            type="text"
            list="ports-list"
            value={shipment.pod}
            onChange={(e) => onChangeShipment({ pod: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="Los Angeles, Hamburg, Singapore..."
          />
        </div>

        {/* Ports Auto-complete datalist */}
        <datalist id="ports-list">
          {COMMON_PORTS.map((port) => (
            <option key={port.code} value={port.name} />
          ))}
        </datalist>

        {/* Commodity */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Tên hàng hoá (Commodity) *
          </label>
          <input
            type="text"
            value={shipment.commodity}
            onChange={(e) => onChangeShipment({ commodity: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="May mặc, thuỷ sản, đồ gỗ, máy móc..."
          />
        </div>

        {/* Container / Spec Type */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Loại thiết bị / Quy cách *
          </label>
          <select
            value={shipment.containerType}
            onChange={(e) => onChangeShipment({ containerType: e.target.value as ContainerType })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs cursor-pointer"
          >
            <option value="20'GP">Container 20'GP (Tiêu chuẩn)</option>
            <option value="40'GP">Container 40'GP (Tiêu chuẩn)</option>
            <option value="40'HC">Container 40'HC (High Cube)</option>
            <option value="45'HC">Container 45'HC</option>
            <option value="20'RF">Container 20' Lạnh (Reefer)</option>
            <option value="40'RF">Container 40' Lạnh (Reefer)</option>
            <option value="20'OT">Container 20' Open Top</option>
            <option value="40'OT">Container 40' Open Top</option>
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

        {/* Quantity */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Số lượng (Quantity) *
          </label>
          <input
            type="number"
            min="1"
            value={shipment.quantity}
            onChange={(e) => onChangeShipment({ quantity: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-medium bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
          />
        </div>

        {/* Gross Weight */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Trọng lượng Gross (KGS)
          </label>
          <input
            type="number"
            value={shipment.grossWeightKg}
            onChange={(e) => handleWeightOrCbmChange('grossWeightKg', Number(e.target.value) || 0)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
            placeholder="24500"
          />
        </div>

        {/* Volume */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Thể tích (CBM)
          </label>
          <input
            type="number"
            step="0.01"
            value={shipment.volumeCbm}
            onChange={(e) => handleWeightOrCbmChange('volumeCbm', Number(e.target.value) || 0)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
            placeholder="68.5"
          />
        </div>

        {/* Chargeable Weight */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Trọng lượng tính cước (CW)
          </label>
          <div className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 font-medium text-slate-900 font-mono text-xs flex justify-between items-center">
            <span>{formatNumber(shipment.chargeableWeight)}</span>
            <span className="text-[10px] text-slate-500 font-sans">
              {shipment.mode === 'AIR_FREIGHT' ? 'CW KGS (1:6000)' : shipment.mode === 'SEA_LCL' ? 'RT / CBM' : 'Unit'}
            </span>
          </div>
        </div>

        {/* Transit Time */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Thời gian hành trình (T/T)
          </label>
          <input
            type="text"
            value={shipment.transitTime || ''}
            onChange={(e) => onChangeShipment({ transitTime: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="18 - 22 ngày"
          />
        </div>

        {/* Free Time */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Thời gian miễn phí lưu cont / bãi (Free Time Dem/Det)
          </label>
          <input
            type="text"
            value={shipment.freeTime || ''}
            onChange={(e) => onChangeShipment({ freeTime: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
            placeholder="14 ngày Demurrage & Detention kết hợp tại POD"
          />
        </div>

      </div>

    </div>
  );
};
