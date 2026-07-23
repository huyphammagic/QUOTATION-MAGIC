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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
      
      {/* Title Header */}
      <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
        <Navigation className="w-4 h-4 text-blue-700" />
        <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">TUYẾN ĐƯỜNG & QUY CÁCH LÔ HÀNG</span>
      </div>

      {/* Mode Selection Pills */}
      <div className="px-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        
        <button
          type="button"
          onClick={() => handleModeChange('SEA_FCL')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'SEA_FCL'
              ? 'bg-blue-50/80 border-blue-600 text-blue-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Anchor className="w-4 h-4 text-blue-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Biển (FCL)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('SEA_LCL')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'SEA_LCL'
              ? 'bg-blue-50/80 border-blue-600 text-blue-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Box className="w-4 h-4 text-blue-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Hàng Lẻ (LCL)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('AIR_FREIGHT')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'AIR_FREIGHT'
              ? 'bg-purple-50/80 border-purple-600 text-purple-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plane className="w-4 h-4 text-purple-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Air Freight</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('INLAND_TRUCKING')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'INLAND_TRUCKING'
              ? 'bg-amber-50/80 border-amber-600 text-amber-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Trucking</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('CUSTOMS_CLEARANCE')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'CUSTOMS_CLEARANCE'
              ? 'bg-emerald-50/80 border-emerald-600 text-emerald-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Hải Quan</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('MULTIMODAL')}
          className={`p-2.5 rounded border text-xs font-semibold flex flex-col items-center space-y-1 transition-colors ${
            shipment.mode === 'MULTIMODAL'
              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-4 h-4 text-indigo-700" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Đa Phương Thức</span>
        </button>

      </div>

      {/* Grid Inputs */}
      <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        
        {/* POL (Port of Loading) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Từ (POL / Origin) *</label>
          <input
            type="text"
            list="ports-list"
            value={shipment.pol}
            onChange={(e) => onChangeShipment({ pol: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Cat Lai (VNVN)..."
          />
        </div>

        {/* POD (Port of Discharge) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Đến (POD / Destination) *</label>
          <input
            type="text"
            list="ports-list"
            value={shipment.pod}
            onChange={(e) => onChangeShipment({ pod: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Hamburg (DEHAM)..."
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
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Hàng Hóa (Commodity) *</label>
          <input
            type="text"
            value={shipment.commodity}
            onChange={(e) => onChangeShipment({ commodity: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Gỗ nội thất, Hàng may mặc..."
          />
        </div>

        {/* Container / Spec Type */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Loại Container / Quy Cách *</label>
          <select
            value={shipment.containerType}
            onChange={(e) => onChangeShipment({ containerType: e.target.value as ContainerType })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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
            <option value="AIR (KGS/CW)">AIR - Hàng không tính KGS</option>
            <option value="Xe Tải 1.25 Tấn">Xe Tải 1.25 Tấn</option>
            <option value="Xe Tải 2.5 Tấn">Xe Tải 2.5 Tấn</option>
            <option value="Xe Tải 5 Tấn">Xe Tải 5 Tấn</option>
            <option value="Xe Tải 8 Tấn">Xe Tải 8 Tấn</option>
            <option value="Xe Tải 15 Tấn">Xe Tải 15 Tấn</option>
            <option value="Xe Đầu Kéo / Moóc">Xe Đầu Kéo / Moóc Container</option>
          </select>
        </div>

        {/* Quantity (Number of Conts/Trips) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Số Lượng (Quantity) *</label>
          <input
            type="number"
            min="1"
            value={shipment.quantity}
            onChange={(e) => onChangeShipment({ quantity: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
        </div>

        {/* Gross Weight (KG) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Gross Weight (KGS)</label>
          <input
            type="number"
            value={shipment.grossWeightKg}
            onChange={(e) => handleWeightOrCbmChange('grossWeightKg', Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            placeholder="24500"
          />
        </div>

        {/* Volume (CBM) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Volume (CBM)</label>
          <input
            type="number"
            step="0.01"
            value={shipment.volumeCbm}
            onChange={(e) => handleWeightOrCbmChange('volumeCbm', Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            placeholder="68.5"
          />
        </div>

        {/* Chargeable Weight Indicator */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            <span>Trọng Lượng Tính Cước (CW)</span>
          </label>
          <div className="w-full px-3 py-2 rounded border border-blue-200 bg-blue-50/50 font-bold text-blue-900 font-mono text-sm flex justify-between items-center">
            <span>{formatNumber(shipment.chargeableWeight)}</span>
            <span className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">
              {shipment.mode === 'AIR_FREIGHT' ? 'KGS (1 CBM=167KG)' : shipment.mode === 'SEA_LCL' ? 'RT / CBM' : 'Unit'}
            </span>
          </div>
        </div>

        {/* Transit Time */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Thời Gian Vận Chuyển (T/T)</span>
          </label>
          <input
            type="text"
            value={shipment.transitTime || ''}
            onChange={(e) => onChangeShipment({ transitTime: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="14 - 16 ngày (Direct)"
          />
        </div>

        {/* Free Time Demurrage / Detention */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Free Time (Dem/Det)</span>
          </label>
          <input
            type="text"
            value={shipment.freeTime || ''}
            onChange={(e) => onChangeShipment({ freeTime: e.target.value })}
            className="w-full px-3 py-2 rounded border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="14 days Combined Dem/Det"
          />
        </div>

      </div>

    </div>
  );
};

