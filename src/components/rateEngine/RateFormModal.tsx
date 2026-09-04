import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  DollarSign, 
  Ship, 
  Plane, 
  Truck, 
  FileText, 
  Calendar, 
  Info,
  ShieldAlert
} from 'lucide-react';
import { RateMasterItem, ChargeMasterItem, SupplierItem, CarrierItem, RateType, MasterShipmentType } from '../../types/masterRate';
import { TransportMode, ContainerType, Currency, IncotermCode } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { validateRateIntegrity } from '../../services/masterRate/rateCompatibilityService';
import { calculateProfitAndMargin } from '../../services/masterRate/rateCalculationService';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';

interface RateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rate: Partial<RateMasterItem> | null;
  existingRates: RateMasterItem[];
  chargeMasters: ChargeMasterItem[];
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
  onSave: (rate: RateMasterItem) => Promise<void>;
}

export const RateFormModal: React.FC<RateFormModalProps> = ({
  isOpen,
  onClose,
  rate,
  existingRates,
  chargeMasters,
  suppliers,
  carriers,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<RateMasterItem>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rate) {
      setFormData({ ...rate });
    } else {
      const now = new Date().toISOString().slice(0, 10);
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setFormData({
        id: `rate-${Date.now()}`,
        rateCode: `RATE-OFR-${Math.floor(100 + Math.random() * 900)}`,
        rateName: 'Cước Vận Chuyển Đường Biển',
        rateType: 'SELL',
        category: 'FREIGHT',
        chargeType: 'BASE_FREIGHT',
        chargeCode: 'OFR',
        chargeName: 'Ocean Freight',
        transportMode: 'SEA_FCL',
        shipmentType: 'FCL',
        basis: 'PER_CONTAINER',
        unit: "Cont 40'HC",
        containerType: "40'HC",
        costAmount: 0,
        costCurrency: 'USD',
        sellingAmount: 0,
        sellingCurrency: 'USD',
        vatRate: 0,
        effectiveFrom: now,
        effectiveTo: nextMonth,
        status: 'DRAFT',
        priority: 50,
        version: 1,
      });
    }
  }, [rate, isOpen]);

  // Live profit & margin
  const liveProfit = useMemo(() => {
    const cost = formData.costAmount || 0;
    const sell = formData.sellingAmount || 0;
    return calculateProfitAndMargin(cost, sell, formData.sellingCurrency || 'USD');
  }, [formData.costAmount, formData.sellingAmount, formData.sellingCurrency]);

  // Handle Input Changes
  const handleChange = (field: keyof RateMasterItem, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto adjust basis & unit if mode changes
      if (field === 'transportMode') {
        if (value === 'SEA_FCL') {
          updated.basis = 'PER_CONTAINER';
          updated.unit = updated.containerType ? `Cont ${updated.containerType}` : "Cont 40'HC";
          updated.shipmentType = 'FCL';
        } else if (value === 'SEA_LCL') {
          updated.basis = 'PER_WM';
          updated.unit = 'CBM / RT';
          updated.shipmentType = 'LCL';
        } else if (value === 'AIR_FREIGHT') {
          updated.basis = 'PER_CHARGEABLE_KG';
          updated.unit = 'KG (CW)';
          updated.shipmentType = 'AIR';
        } else if (value === 'INLAND_TRUCKING') {
          updated.basis = 'PER_TRIP';
          updated.unit = 'Chuyến (Trip)';
          updated.shipmentType = 'TRUCK';
        } else if (value === 'CUSTOMS_CLEARANCE') {
          updated.basis = 'PER_SHIPMENT';
          updated.unit = 'Tờ khai (Declaration)';
          updated.shipmentType = 'CUSTOMS';
        }
      }

      // Auto update charge name if chargeCode selected from master
      if (field === 'chargeCode') {
        const found = chargeMasters.find(c => c.chargeCode === value);
        if (found) {
          updated.chargeName = found.chargeName;
          updated.category = found.category;
          updated.defaultVatRate = found.defaultVatRate;
          updated.vatRate = found.defaultVatRate;
        }
      }

      return updated;
    });
  };

  // Run integrity validation
  useEffect(() => {
    if (!isOpen) return;
    const validation = validateRateIntegrity(formData, existingRates);
    setErrors(validation.errors.map(e => e.messageVi));
    setWarnings(validation.warnings.map(w => w.messageVi));
  }, [formData, existingRates, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRateIntegrity(formData, existingRates);
    if (!validation.isValid) {
      setErrors(validation.errors.map(e => e.messageVi));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData as RateMasterItem);
      onClose();
    } catch (err: any) {
      setErrors([err.message || 'Lỗi khi lưu bảng giá']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="rate-form-modal-container"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {formData.id && formData.version && formData.version > 1 
                  ? `Chỉnh Sửa Phiên Bản Bảng Giá v${formData.version}` 
                  : rate?.id ? 'Chỉnh Sửa Bảng Giá Master' : 'Thêm Mới Bảng Giá Cước (Master Rate)'}
              </h2>
              <p className="text-xs text-blue-100">
                Thiết lập giá vốn (Buy Rate), giá bán (Sell Rate), hiệu lực và quy cách vận chuyển
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="btn-close-rate-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Warnings / Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4" /> Vui lòng kiểm tra lại thông tin bắt buộc:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4" /> Cảnh báo nghiệp vụ:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: Classification & Mode */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Phân Loại Dịch Vụ & Phương Thức Vận Tải
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rate Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Loại Bảng Giá (Rate Type) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.rateType || 'SELL'}
                  onChange={(e) => handleChange('rateType', e.target.value as RateType)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SELL">SELL RATE (Giá bán cho khách)</option>
                  <option value="BUY">BUY RATE (Giá vốn mua của Hãng/NCC)</option>
                  <option value="CONTRACT">CONTRACT RATE (Giá hợp đồng đại lý/khách)</option>
                  <option value="REFERENCE">REFERENCE RATE (Giá tham khảo)</option>
                </select>
              </div>

              {/* Transport Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phương Thức Vận Tải <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.transportMode || 'SEA_FCL'}
                  onChange={(e) => handleChange('transportMode', e.target.value as TransportMode)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SEA_FCL">Đường Biển Nguyên Cont (Sea FCL)</option>
                  <option value="SEA_LCL">Đường Biển Hàng Lẻ (Sea LCL)</option>
                  <option value="AIR_FREIGHT">Đường Hàng Không (Air Freight)</option>
                  <option value="INLAND_TRUCKING">Vận Tải Đường Bộ (Trucking)</option>
                  <option value="CUSTOMS_CLEARANCE">Thủ Tục Hải Quan (Customs)</option>
                  <option value="MULTIMODAL">Đa Phương Thức (Multimodal)</option>
                </select>
              </div>

              {/* Charge Code Master */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Khoản Phí (Charge Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.chargeCode || ''}
                  onChange={(e) => handleChange('chargeCode', e.target.value.toUpperCase())}
                  placeholder="VD: OFR, THC, BL, CFS..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mã Bảng Giá (Rate Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.rateCode || ''}
                  onChange={(e) => handleChange('rateCode', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tên Bảng Giá / Diễn Giải <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.rateName || ''}
                  onChange={(e) => handleChange('rateName', e.target.value)}
                  placeholder="VD: Cước Biển MSC Tuyến Cát Lái - Los Angeles"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Route, Carrier, Provider */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Tuyến Đường, Hãng Vận Chuyển & Nhà Cung Cấp
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Điểm Đi / POL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.origin || ''}
                  onChange={(e) => handleChange('origin', e.target.value)}
                  placeholder="VD: Ho Chi Minh (Cat Lai)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Điểm Đến / POD <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.destination || ''}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  placeholder="VD: Los Angeles (USLAX)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hãng Vận Chuyển (Carrier)
                </label>
                <input
                  type="text"
                  list="carrier-list"
                  value={formData.carrier || ''}
                  onChange={(e) => handleChange('carrier', e.target.value)}
                  placeholder="Maersk, ONE, VN Airlines..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="carrier-list">
                  {carriers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nhà Cung Cấp (Supplier)
                </label>
                <select
                  value={formData.supplierId || ''}
                  onChange={(e) => {
                    const sup = suppliers.find(s => s.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      supplierId: sup?.id,
                      supplierName: sup?.name,
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* FCL specific equipment */}
            {formData.transportMode === 'SEA_FCL' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Loại Container (Equipment)</label>
                  <select
                    value={formData.containerType || "40'HC"}
                    onChange={(e) => {
                      handleChange('containerType', e.target.value);
                      handleChange('unit', `Cont ${e.target.value}`);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg"
                  >
                    <option value="20'GP">20'GP (Tiêu chuẩn)</option>
                    <option value="40'GP">40'GP (Tiêu chuẩn)</option>
                    <option value="40'HC">40'HC (Cao)</option>
                    <option value="45'HC">45'HC</option>
                    <option value="20'RF">20'RF (Lạnh)</option>
                    <option value="40'RF">40'RF (Lạnh)</option>
                    <option value="20'OT">20'OT (Open Top)</option>
                    <option value="40'OT">40'OT (Open Top)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Thời Gian Vận Chuyển (Transit Time)</label>
                  <input
                    type="text"
                    value={formData.transitTime || ''}
                    onChange={(e) => handleChange('transitTime', e.target.value)}
                    placeholder="VD: 14 - 16 ngày"
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-900 mb-1">Miễn Phí Lưu Vỏ/Bãi (Free Time)</label>
                  <input
                    type="text"
                    value={formData.freeTime || ''}
                    onChange={(e) => handleChange('freeTime', e.target.value)}
                    placeholder="VD: 7 days Dem/Det"
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Pricing & Unit */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Cơ Cấu Giá Vốn, Giá Bán & Đơn Vị Tính
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quy Cách Tính (Basis) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.basis || 'PER_CONTAINER'}
                  onChange={(e) => handleChange('basis', e.target.value as ChargeBasis)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PER_CONTAINER">PER_CONTAINER (Theo Container)</option>
                  <option value="PER_WM">PER_WM (Weight or Measurement - CBM/Tấn)</option>
                  <option value="PER_CBM">PER_CBM (Theo Thể tích CBM)</option>
                  <option value="PER_CHARGEABLE_KG">PER_CHARGEABLE_KG (Theo KG cước)</option>
                  <option value="PER_BL">PER_BL (Theo Vận đơn B/L)</option>
                  <option value="PER_SHIPMENT">PER_SHIPMENT (Theo Lô hàng)</option>
                  <option value="PER_TRIP">PER_TRIP (Theo Chuyến xe)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tên Đơn Vị Hiển Thị (Unit)
                </label>
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  placeholder="Cont, CBM, KG, Chuyến, Bill..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Thuế Suất VAT (%)
                </label>
                <select
                  value={formData.vatRate ?? 0}
                  onChange={(e) => handleChange('vatRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>0% (Không chịu thuế / Quốc tế)</option>
                  <option value={5}>5%</option>
                  <option value={8}>8%</option>
                  <option value={10}>10%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mức Thu Tối Thiểu (Min Charge)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.minimumCharge ?? ''}
                  onChange={(e) => handleChange('minimumCharge', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Financial Grid: Buy vs Sell vs Margin */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Cost Amount */}
              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1">
                  GIÁ VỐN ĐẦU VÀO (BUY RATE) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.costAmount ?? 0}
                    onChange={(e) => handleChange('costAmount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={formData.costCurrency || 'USD'}
                    onChange={(e) => handleChange('costCurrency', e.target.value as Currency)}
                    className="w-24 px-2 py-2 text-sm font-bold bg-white border border-purple-300 rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="VND">VND</option>
                  </select>
                </div>
                <p className="text-[11px] text-purple-700 mt-1">Chi phí Forwarder trả cho NCC</p>
              </div>

              {/* Selling Amount */}
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  GIÁ BÁN ĐỀ XUẤT (SELL RATE) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.sellingAmount ?? 0}
                    onChange={(e) => handleChange('sellingAmount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={formData.sellingCurrency || 'USD'}
                    onChange={(e) => handleChange('sellingCurrency', e.target.value as Currency)}
                    className="w-24 px-2 py-2 text-sm font-bold bg-white border border-blue-300 rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="VND">VND</option>
                  </select>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">Đơn giá báo cho khách hàng</p>
              </div>

              {/* Computed Profit Margin */}
              <div className="flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-700 mb-1">LỢI NHUẬN DỰ KIẾN (GROSS PROFIT)</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-mono font-black ${liveProfit.isProfitable ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formData.sellingCurrency === 'USD' ? formatUSD(liveProfit.grossProfit) : formatVND(liveProfit.grossProfit)}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${liveProfit.isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {formatPercent(liveProfit.marginPercent)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Tỷ suất sinh lời gộp trên doanh thu</p>
              </div>
            </div>
          </div>

          {/* Section 4: Validity & Contract */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              4. Thời Hạn Hiệu Lực & Hợp Đồng
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hiệu Lực Từ Ngày (Effective From) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.effectiveFrom || ''}
                  onChange={(e) => handleChange('effectiveFrom', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hết Hạn Đến Ngày (Effective To) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.effectiveTo || ''}
                  onChange={(e) => handleChange('effectiveTo', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Trạng Thái (Status)
                </label>
                <select
                  value={formData.status || 'DRAFT'}
                  onChange={(e) => handleChange('status', e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Bản nháp (Draft)</option>
                  <option value="ACTIVE">Kích hoạt (Active)</option>
                  <option value="PENDING_APPROVAL">Chờ duyệt (Pending Approval)</option>
                  <option value="INACTIVE">Ngưng áp dụng (Inactive)</option>
                  <option value="EXPIRED">Hết hạn (Expired)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Số Hợp Đồng Đại Lý / Hãng Tàu (Contract No)
                </label>
                <input
                  type="text"
                  value={formData.contractNo || ''}
                  onChange={(e) => handleChange('contractNo', e.target.value)}
                  placeholder="VD: CONTRACT-MSC-2026-HQ01"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ghi Chú Điều Kiện Áp Dụng (Notes)
                </label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Ghi chú về phụ phí, hàng nguy hiểm, thời gian áp dụng..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {formData.previousVersionId ? (
              <span className="text-indigo-600 font-semibold">
                Đang tạo phiên bản mới v{formData.version} từ ID: {formData.previousVersionId}
              </span>
            ) : (
              'Rate Master được bảo vệ toàn vẹn lịch sử bằng Immutable Snapshot'
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy Bỏ (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || errors.length > 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
              id="btn-save-rate-form"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu Bảng Giá (Save Rate)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
