import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  MapPin, 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Check
} from 'lucide-react';
import { 
  ContractRateItem, 
  ContractItem, 
  ContractWeightBreak, 
  ContractSurchargeItem 
} from '../../types/contract';
import { ContainerType, IncotermCode, Currency } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { detectContractRateOverlap } from '../../services/contract/contractOverlapDetector';

interface ContractRateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rate: ContractRateItem) => Promise<void>;
  contract: ContractItem;
  editingRate?: ContractRateItem | null;
  existingRates: ContractRateItem[];
}

export const ContractRateFormModal: React.FC<ContractRateFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contract,
  editingRate,
  existingRates,
}) => {
  const [serviceMode, setServiceMode] = useState<'SEA' | 'AIR' | 'TRUCKING' | 'CUSTOMS' | 'OTHER'>('SEA');
  const [shipmentType, setShipmentType] = useState<'FCL' | 'LCL' | 'AIR' | 'TRUCK' | 'CUSTOMS' | 'OTHER'>('FCL');
  const [carrier, setCarrier] = useState('');
  const [origin, setOrigin] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [equipmentType, setEquipmentType] = useState("40'HC");
  const [incoterm, setIncoterm] = useState<IncotermCode | ''>('FOB');
  const [basis, setBasis] = useState<ChargeBasis>('PER_CONTAINER');
  const [unit, setUnit] = useState("Cont 40'HC");
  const [baseRate, setBaseRate] = useState(1200);
  const [currency, setCurrency] = useState<Currency>(contract.currency || 'USD');
  const [vatRate, setVatRate] = useState(0);
  const [validFrom, setValidFrom] = useState(contract.effectiveDate);
  const [validTo, setValidTo] = useState(contract.expiryDate);
  const [priority, setPriority] = useState(100);
  const [notes, setNotes] = useState('');

  // Air Weight Breaks
  const [weightBreaks, setWeightBreaks] = useState<ContractWeightBreak[]>([
    { label: '-45KG', minWeightKg: 0, maxWeightKg: 45, ratePerKg: 4.5 },
    { label: '+45KG', minWeightKg: 45, maxWeightKg: 100, ratePerKg: 3.8 },
    { label: '+100KG', minWeightKg: 100, maxWeightKg: 300, ratePerKg: 3.2 },
    { label: '+300KG', minWeightKg: 300, maxWeightKg: 500, ratePerKg: 2.8 },
    { label: '+500KG', minWeightKg: 500, ratePerKg: 2.5 },
  ]);

  // Surcharges
  const [surcharges, setSurcharges] = useState<ContractSurchargeItem[]>([]);

  // Overlap warning state
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRate) {
      setServiceMode(editingRate.serviceMode);
      setShipmentType(editingRate.shipmentType || 'FCL');
      setCarrier(editingRate.carrier || '');
      setOrigin(editingRate.origin);
      setOriginCode(editingRate.originCode || '');
      setDestination(editingRate.destination);
      setDestinationCode(editingRate.destinationCode || '');
      setEquipmentType(editingRate.equipmentType || "40'HC");
      setIncoterm(editingRate.incoterm || '');
      setBasis(editingRate.basis);
      setUnit(editingRate.unit);
      setBaseRate(editingRate.baseRate);
      setCurrency(editingRate.currency);
      setVatRate(editingRate.vatRate ?? 0);
      setValidFrom(editingRate.validFrom);
      setValidTo(editingRate.validTo);
      setPriority(editingRate.priority ?? 100);
      setNotes(editingRate.notes || '');
      if (editingRate.weightBreaks && editingRate.weightBreaks.length > 0) {
        setWeightBreaks(editingRate.weightBreaks);
      }
      setSurcharges(editingRate.surcharges || []);
    } else {
      setServiceMode('SEA');
      setShipmentType('FCL');
      setCarrier('');
      setOrigin('Cát Lái, Hồ Chí Minh');
      setOriginCode('VNSGN');
      setDestination('Los Angeles, CA');
      setDestinationCode('USLAX');
      setEquipmentType("40'HC");
      setIncoterm('FOB');
      setBasis('PER_CONTAINER');
      setUnit("Cont 40'HC");
      setBaseRate(1200);
      setCurrency(contract.currency || 'USD');
      setVatRate(0);
      setValidFrom(contract.effectiveDate);
      setValidTo(contract.expiryDate);
      setPriority(100);
      setNotes('');
      setSurcharges([
        { code: 'THC', name: 'Terminal Handling Charge', amount: 150, currency: 'USD', basis: 'PER_CONTAINER', unit: 'Cont' },
        { code: 'DOC', name: 'Documentation Fee', amount: 40, currency: 'USD', basis: 'PER_BL', unit: 'Bill' },
      ]);
    }
    setOverlapWarning(null);
  }, [editingRate, contract, isOpen]);

  // Real-time Overlap check
  useEffect(() => {
    if (!isOpen) return;

    const candidate: Partial<ContractRateItem> = {
      id: editingRate?.id,
      contractId: contract.id,
      serviceMode,
      equipmentType,
      origin,
      originCode,
      destination,
      destinationCode,
      incoterm: incoterm || undefined,
      validFrom,
      validTo,
      weightBreaks: serviceMode === 'AIR' ? weightBreaks : undefined,
    };

    const overlap = detectContractRateOverlap(candidate, existingRates);
    if (overlap.hasOverlap) {
      setOverlapWarning(overlap.messageVi);
    } else {
      setOverlapWarning(null);
    }
  }, [serviceMode, equipmentType, origin, originCode, destination, destinationCode, incoterm, validFrom, validTo, weightBreaks, existingRates, isOpen]);

  const handleAddSurcharge = () => {
    setSurcharges(prev => [
      ...prev,
      { code: 'SEAL', name: 'Seal Fee', amount: 10, currency: 'USD', basis: 'PER_CONTAINER', unit: 'Cont' }
    ]);
  };

  const handleRemoveSurcharge = (idx: number) => {
    setSurcharges(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      alert('Vui lòng nhập Cảng/Điểm đi và Cảng/Điểm đến.');
      return;
    }

    setIsSubmitting(true);
    try {
      const rateCode = editingRate?.rateCode || `CRATE-${contract.contractNumber}-${serviceMode}-${originCode || 'POL'}-${destinationCode || 'POD'}-${Math.floor(100 + Math.random() * 900)}`;

      const rateItem: ContractRateItem = {
        id: editingRate?.id || `crate-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        companyId: contract.companyId,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        contractVersion: contract.currentVersion,
        contractType: contract.contractType,
        rateType: contract.contractType === 'CUSTOMER' ? 'SELL' : 'BUY',
        rateCode,
        rateName: `${serviceMode} - ${origin} đến ${destination} (${equipmentType})`,
        serviceMode,
        shipmentType,
        carrier,
        origin,
        originCode,
        destination,
        destinationCode,
        pol: origin,
        pod: destination,
        equipmentType,
        incoterm: (incoterm as IncotermCode) || undefined,
        basis,
        unit,
        baseRate: Number(baseRate) || 0,
        currency,
        vatRate: Number(vatRate) || 0,
        validFrom,
        validTo,
        status: 'ACTIVE',
        priority: Number(priority) || 100,
        weightBreaks: serviceMode === 'AIR' ? weightBreaks : undefined,
        surcharges,
        notes,
        createdAt: editingRate?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(rateItem);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu biểu cước.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8"
        id="contract-rate-form-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {editingRate ? 'Chỉnh Sửa Biểu Cước Hợp Đồng' : 'Thêm Biểu Cước Vào Hợp Đồng'}
              </h3>
              <p className="text-xs text-slate-400">
                Hợp đồng: <span className="font-mono text-white font-bold">{contract.contractNumber}</span> (V{contract.currentVersion}) - Đối tác: {contract.partyName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overlap Warning Banner */}
        {overlapWarning && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Phát hiện trùng lặp biểu cước (Overlap Detection):</p>
              <p>{overlapWarning}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode & Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phương Thức (Mode) *</label>
              <select
                value={serviceMode}
                onChange={(e) => {
                  const m = e.target.value as any;
                  setServiceMode(m);
                  if (m === 'AIR') {
                    setBasis('PER_CHARGEABLE_KG');
                    setUnit('KG');
                    setEquipmentType('Hàng Air Cargo');
                  } else if (m === 'SEA') {
                    setBasis('PER_CONTAINER');
                    setUnit("Cont 40'HC");
                    setEquipmentType("40'HC");
                  } else if (m === 'TRUCKING') {
                    setBasis('PER_TRIP');
                    setUnit('Chuyến');
                    setEquipmentType('Xe Tải 5 Tấn');
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
              >
                <option value="SEA">Đường Biển (Ocean Freight)</option>
                <option value="AIR">Đường Hàng Không (Air Freight)</option>
                <option value="TRUCKING">Vận Tải Đường Bộ (Inland Trucking)</option>
                <option value="CUSTOMS">Thủ Tục Hải Quan (Customs)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thiết Bị / Loại Cont / Xe *</label>
              <input
                type="text"
                required
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                placeholder="VD: 20'GP, 40'HC, Xe 8 Tấn..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hãng Tàu / Hãng Bay</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="VD: Maersk, ONE, VN Airlines..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Route: Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Cảng Đi / Điểm Xuất Phát (POL / Origin) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Tên cảng/thành phố"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={originCode}
                    onChange={(e) => setOriginCode(e.target.value.toUpperCase())}
                    placeholder="Mã (VNSGN)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Cảng Đến / Điểm Đích (POD / Destination) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Tên cảng/thành phố đích"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={destinationCode}
                    onChange={(e) => setDestinationCode(e.target.value.toUpperCase())}
                    placeholder="Mã (USLAX)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cơ Sở Tính (Basis)</label>
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              >
                <option value="PER_CONTAINER">Per Container</option>
                <option value="PER_WM">Per W/M (CBM/Ton)</option>
                <option value="PER_CHARGEABLE_KG">Per Chargeable KG</option>
                <option value="PER_TRIP">Per Trip / Chuyến</option>
                <option value="PER_BL">Per B/L</option>
                <option value="PER_SHIPMENT">Per Shipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đơn Vị (Unit)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="VD: Cont 40'HC"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">
                {contract.contractType === 'CUSTOMER' ? 'Giá Bán (SELL RATE) *' : 'Giá Vốn (BUY RATE) *'}
              </label>
              <input
                type="number"
                step="any"
                required
                value={baseRate}
                onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs border border-blue-300 bg-blue-50/50 rounded-lg font-mono font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đồng Tiền</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Incoterm</label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              >
                <option value="">Tất cả (All)</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="CFR">CFR</option>
                <option value="EXW">EXW</option>
                <option value="DAP">DAP</option>
                <option value="DDP">DDP</option>
              </select>
            </div>
          </div>

          {/* Dates & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hiệu Lực Từ *</label>
              <input
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đến Ngày *</label>
              <input
                type="date"
                required
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Độ Ưu Tiên Khớp (Priority)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-bold text-indigo-700"
              >
                <option value={100}>100 - Khớp chính xác POL & POD</option>
                <option value={90}>90 - Khớp cấp Quốc Gia / Khu Vực</option>
                <option value={80}>80 - Tuyến chung (General Lane)</option>
              </select>
            </div>
          </div>

          {/* Air Weight Breaks (if Air) */}
          {serviceMode === 'AIR' && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-indigo-600" /> Bảng Cước Nấc Tải Trọng (Air Weight Breaks)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {weightBreaks.map((wb, idx) => (
                  <div key={idx} className="bg-white p-2 border border-indigo-200 rounded-lg">
                    <span className="block text-[11px] font-bold text-indigo-700">{wb.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={wb.ratePerKg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setWeightBreaks(prev => prev.map((item, i) => i === idx ? { ...item, ratePerKg: val } : item));
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-1 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">$/kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Surcharges Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Phụ Phí & Local Charges Cố Định ({surcharges.length})
              </span>
              <button
                type="button"
                onClick={handleAddSurcharge}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm Phụ Phí
              </button>
            </div>

            {surcharges.map((sur, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                <input
                  type="text"
                  value={sur.code}
                  onChange={(e) => {
                    const c = e.target.value.toUpperCase();
                    setSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, code: c } : s));
                  }}
                  placeholder="Mã (THC)"
                  className="w-16 px-2 py-1 border border-slate-300 rounded font-mono font-bold uppercase"
                />
                <input
                  type="text"
                  value={sur.name}
                  onChange={(e) => {
                    const n = e.target.value;
                    setSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, name: n } : s));
                  }}
                  placeholder="Tên phí"
                  className="flex-1 px-2 py-1 border border-slate-300 rounded"
                />
                <input
                  type="number"
                  value={sur.amount}
                  onChange={(e) => {
                    const a = parseFloat(e.target.value) || 0;
                    setSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, amount: a } : s));
                  }}
                  className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                />
                <span className="text-[11px] font-bold text-slate-500">{sur.currency}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSurcharge(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Không áp dụng hàng nguy hiểm (DG)"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Đang Lưu...' : editingRate ? 'Lưu Biểu Cước' : 'Thêm Vào Hợp Đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
