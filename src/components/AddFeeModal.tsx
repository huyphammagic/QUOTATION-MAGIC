import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineItem, 
  FeeCategory, 
  ChargeLocation, 
  ChargeBasis, 
  Currency,
  SurchargeItem 
} from '../types/logistics';
import { PRESET_LOCAL_CHARGES } from '../data/presets';
import { getSavedSurcharges, getSavedChargeMasters, saveSurchargeItem } from '../utils/storage';
import { calculateLineItem, formatUSD, formatVND, formatPercent } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  X, 
  Receipt, 
  Sparkles, 
  Check, 
  ChevronDown,
  RotateCcw, 
  CheckCircle2, 
  Coins,
  ChevronUp,
  Tag,
  Layers,
  HelpCircle,
  FileEdit
} from 'lucide-react';

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: LineItem) => void;
  exchangeRate: number;
  initialLocation?: ChargeLocation;
  initialCategory?: FeeCategory;
}

export interface UnifiedSurchargeOption {
  id: string;
  code: string;
  nameVi: string;
  nameEn?: string;
  category: FeeCategory;
  location: ChargeLocation;
  basis: ChargeBasis;
  unit: string;
  priceUsd: number;
  priceVnd: number;
  costUsd?: number;
  costVnd?: number;
  vatRate: number;
  currency: Currency;
  source: 'PRESET' | 'SAVED' | 'MASTER';
}

const COMMON_UNITS = [
  'Container',
  'Bill',
  'Set',
  'CBM',
  'KGS',
  'Tờ khai',
  'Trip',
  'Shipment',
  'Pallet',
  'Gói'
];

const BASIS_OPTIONS: { value: ChargeBasis; label: string }[] = [
  { value: 'PER_CONTAINER', label: 'Theo Container (/Container)' },
  { value: 'PER_BL', label: 'Theo Vận Đơn (/B/L - Bill)' },
  { value: 'PER_WM', label: 'Theo Cước W/M (/CBM hoặc Tấn)' },
  { value: 'PER_KG', label: 'Theo Trọng Lượng (/KG)' },
  { value: 'PER_CHARGEABLE_KG', label: 'Theo Chargeable Weight (/CW)' },
  { value: 'PER_CBM', label: 'Theo Thể Tích (/CBM)' },
  { value: 'PER_SHIPMENT', label: 'Trọn Gói Theo Lô (/Shipment)' },
  { value: 'PER_TRIP', label: 'Theo Chuyến Xe (/Trip)' },
  { value: 'PER_DOCUMENT', label: 'Theo Bộ Chứng Từ (/Set)' },
  { value: 'FIXED', label: 'Cố Định (Lump-sum)' }
];

export const AddFeeModal: React.FC<AddFeeModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  exchangeRate,
  initialLocation = 'POL',
  initialCategory = 'LOCAL_CHARGE'
}) => {
  // Dropdown open/close & search inside dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [dropdownLocationFilter, setDropdownLocationFilter] = useState<ChargeLocation | 'ALL'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Success indicator when a preset fee is picked
  const [selectedPresetNotice, setSelectedPresetNotice] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<{
    code: string;
    description: string;
    category: FeeCategory;
    location: ChargeLocation;
    basis: ChargeBasis;
    unit: string;
    quantity: number;
    currency: Currency;
    unitPrice: number;
    costPrice: number;
    vatRate: number;
    note: string;
    saveToCatalog: boolean;
  }>({
    code: '',
    description: '',
    category: initialCategory,
    location: initialLocation,
    basis: initialLocation === 'FREIGHT' ? 'PER_CONTAINER' : 'PER_BL',
    unit: initialLocation === 'FREIGHT' ? 'Container' : 'Bill',
    quantity: 1,
    currency: 'USD',
    unitPrice: initialLocation === 'FREIGHT' ? 850 : 50,
    costPrice: initialLocation === 'FREIGHT' ? 700 : 35,
    vatRate: initialLocation === 'FREIGHT' ? 0 : 8,
    note: '',
    saveToCatalog: false
  });

  // Re-initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDropdownOpen(false);
      setDropdownSearch('');
      setDropdownLocationFilter(initialLocation || 'ALL');
      setSelectedPresetNotice(null);
      setFormData({
        code: '',
        description: '',
        category: initialCategory,
        location: initialLocation,
        basis: initialLocation === 'FREIGHT' ? 'PER_CONTAINER' : 'PER_BL',
        unit: initialLocation === 'FREIGHT' ? 'Container' : 'Bill',
        quantity: 1,
        currency: 'USD',
        unitPrice: initialLocation === 'FREIGHT' ? 850 : 50,
        costPrice: initialLocation === 'FREIGHT' ? 700 : 35,
        vatRate: initialLocation === 'FREIGHT' ? 0 : 8,
        note: '',
        saveToCatalog: false
      });
    }
  }, [isOpen, initialLocation, initialCategory]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Aggregate all known surcharges from storage and presets
  const allSurcharges = useMemo<UnifiedSurchargeOption[]>(() => {
    const list: UnifiedSurchargeOption[] = [];
    const seenCodes = new Set<string>();

    // 1. Saved Surcharges from Storage (custom fees added by user previously)
    const saved = getSavedSurcharges() || [];
    saved.forEach((s) => {
      const codeUpper = (s.code || '').trim().toUpperCase();
      if (!codeUpper || seenCodes.has(codeUpper)) return;
      seenCodes.add(codeUpper);

      list.push({
        id: s.id || `saved-${codeUpper}`,
        code: codeUpper,
        nameVi: s.name,
        category: s.category || 'LOCAL_CHARGE',
        location: s.location || 'POL',
        basis: 'PER_CONTAINER',
        unit: s.unit || 'Container',
        priceUsd: Number(s.priceUsd) || 0,
        priceVnd: Number(s.priceVnd) || 0,
        vatRate: Number(s.vatRate) ?? 8,
        currency: s.currency || 'USD',
        source: 'SAVED'
      });
    });

    // 2. Charge Masters (Enterprise Master Catalog)
    const masters = getSavedChargeMasters() || [];
    masters.forEach((m) => {
      if (m.status === 'INACTIVE') return;
      const codeUpper = (m.chargeCode || '').trim().toUpperCase();
      if (!codeUpper || seenCodes.has(codeUpper)) return;
      seenCodes.add(codeUpper);

      list.push({
        id: m.id || `master-${codeUpper}`,
        code: codeUpper,
        nameVi: m.chargeName,
        nameEn: m.chargeNameEn,
        category: m.category || 'LOCAL_CHARGE',
        location: m.location || 'POL',
        basis: m.defaultBasis || 'PER_CONTAINER',
        unit: m.defaultUnit || 'Container',
        priceUsd: m.defaultCurrency === 'USD' ? 50 : 0,
        priceVnd: m.defaultCurrency === 'VND' ? 1250000 : 0,
        vatRate: m.taxable ? (m.defaultVatRate ?? 8) : 0,
        currency: m.defaultCurrency || 'USD',
        source: 'MASTER'
      });
    });

    // 3. Preset Local Charges & Standard Surcharges
    PRESET_LOCAL_CHARGES.forEach((preset, idx) => {
      const codeUpper = (preset.code || '').trim().toUpperCase();
      if (!codeUpper || seenCodes.has(codeUpper)) return;
      seenCodes.add(codeUpper);

      list.push({
        id: `preset-${codeUpper}-${idx}`,
        code: codeUpper,
        nameVi: preset.name,
        category: preset.category,
        location: preset.location || 'POL',
        basis: preset.category === 'FREIGHT' ? 'PER_CONTAINER' : 'PER_BL',
        unit: preset.unit,
        priceUsd: preset.priceUsd,
        priceVnd: preset.priceVnd,
        vatRate: preset.vat,
        currency: preset.currency,
        source: 'PRESET'
      });
    });

    return list;
  }, [isOpen]);

  // Filtered dropdown options
  const filteredDropdownOptions = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase();

    return allSurcharges.filter((item) => {
      if (dropdownLocationFilter !== 'ALL' && item.location !== dropdownLocationFilter) {
        return false;
      }
      if (!q) return true;

      const matchCode = item.code.toLowerCase().includes(q);
      const matchNameVi = item.nameVi.toLowerCase().includes(q);
      const matchNameEn = item.nameEn?.toLowerCase().includes(q);
      const matchUnit = item.unit.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);

      return matchCode || matchNameVi || matchNameEn || matchUnit || matchCategory;
    });
  }, [allSurcharges, dropdownSearch, dropdownLocationFilter]);

  // When user picks an item from the dropdown, auto-fill the form fields
  const handleSelectFromDropdown = (item: UnifiedSurchargeOption) => {
    const isUsd = item.currency === 'USD';
    const unitPrice = isUsd ? item.priceUsd : item.priceVnd;
    const costPrice = item.costUsd !== undefined 
      ? (isUsd ? item.costUsd : item.costVnd || 0)
      : Math.round(unitPrice * 0.8 * 100) / 100;

    setFormData({
      code: item.code,
      description: item.nameVi,
      category: item.category,
      location: item.location,
      basis: item.basis,
      unit: item.unit,
      quantity: 1,
      currency: item.currency,
      unitPrice: unitPrice,
      costPrice: costPrice,
      vatRate: item.vatRate,
      note: item.nameEn ? `English: ${item.nameEn}` : '',
      saveToCatalog: false
    });

    setIsDropdownOpen(false);
    setSelectedPresetNotice(`Đã điền tự động thông tin phí "${item.code} - ${item.nameVi}"`);
    setTimeout(() => setSelectedPresetNotice(null), 3500);
  };

  // Reset form to blank for entering a custom fee manually
  const handleResetToManual = () => {
    setFormData({
      code: '',
      description: '',
      category: initialCategory,
      location: initialLocation,
      basis: 'PER_CONTAINER',
      unit: 'Container',
      quantity: 1,
      currency: 'USD',
      unitPrice: 50,
      costPrice: 40,
      vatRate: 8,
      note: '',
      saveToCatalog: false
    });
    setSelectedPresetNotice('Đã làm mới form - Bạn có thể điền thủ công chi phí tùy chỉnh bên dưới.');
    setTimeout(() => setSelectedPresetNotice(null), 3000);
  };

  // Submit and add fee to quotation table
  const handleSubmit = (keepOpen = false) => {
    const finalDescription = (formData.description || '').trim() || 'Phí dịch vụ mới';
    const finalCode = (formData.code || '').trim().toUpperCase() || 'CHARGE';

    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: finalCode,
      description: finalDescription,
      category: formData.category,
      location: formData.location,
      basis: formData.basis,
      unit: formData.unit || 'Container',
      quantity: Number(formData.quantity) > 0 ? Number(formData.quantity) : 1,
      currency: formData.currency,
      unitPrice: Number(formData.unitPrice) || 0,
      costPrice: Number(formData.costPrice) || 0,
      vatRate: Number(formData.vatRate) || 0,
      amountUsd: 0,
      amountVnd: 0,
      note: formData.note.trim()
    };

    const calculated = calculateLineItem(newItem, exchangeRate);
    onAddItem(calculated);

    // If checked, save custom fee to Surcharges catalog for reuse
    if (formData.saveToCatalog) {
      try {
        const catalogItem: SurchargeItem = {
          id: `surcharge-${Date.now()}`,
          code: finalCode,
          name: finalDescription,
          category: formData.category,
          transportMode: 'ALL',
          location: formData.location,
          unit: formData.unit,
          priceUsd: formData.currency === 'USD' ? Number(formData.unitPrice) : Math.round((Number(formData.unitPrice) / exchangeRate) * 100) / 100,
          priceVnd: formData.currency === 'VND' ? Number(formData.unitPrice) : Math.round(Number(formData.unitPrice) * exchangeRate),
          vatRate: Number(formData.vatRate) || 0,
          currency: formData.currency
        };
        saveSurchargeItem(catalogItem);
      } catch (err) {
        console.warn('Could not auto-save to surcharge catalog:', err);
      }
    }

    if (keepOpen) {
      setFormData((prev) => ({
        ...prev,
        code: '',
        description: '',
        unitPrice: prev.currency === 'USD' ? 50 : 1250000,
        costPrice: prev.currency === 'USD' ? 40 : 1000000,
        note: '',
        saveToCatalog: false
      }));
      setSelectedPresetNotice(`Đã thêm thành công phí "${finalCode}" vào báo giá! Hãy tiếp tục điền phí tiếp theo.`);
      setTimeout(() => setSelectedPresetNotice(null), 3000);
    } else {
      onClose();
    }
  };

  // Live financial preview calculation
  const previewCalculation = useMemo(() => {
    const qty = Number(formData.quantity) || 1;
    const sellUnit = Number(formData.unitPrice) || 0;
    const costUnit = Number(formData.costPrice) || 0;
    const vat = Number(formData.vatRate) || 0;
    const isUsd = formData.currency === 'USD';

    const subtotalSelling = qty * sellUnit;
    const subtotalCost = qty * costUnit;
    const vatAmount = subtotalSelling * (vat / 100);
    const totalWithVat = subtotalSelling + vatAmount;
    const profit = subtotalSelling - subtotalCost;
    const marginPercent = subtotalSelling > 0 ? (profit / subtotalSelling) * 100 : 0;

    const amountUsd = isUsd ? subtotalSelling : subtotalSelling / exchangeRate;
    const amountVnd = isUsd ? subtotalSelling * exchangeRate : subtotalSelling;
    const costUsd = isUsd ? subtotalCost : subtotalCost / exchangeRate;
    const costVnd = isUsd ? subtotalCost * exchangeRate : subtotalCost;
    const profitUsd = amountUsd - costUsd;
    const profitVnd = amountVnd - costVnd;

    return {
      subtotalSelling,
      subtotalCost,
      vatAmount,
      totalWithVat,
      profit,
      marginPercent,
      amountUsd,
      amountVnd,
      profitUsd,
      profitVnd
    };
  }, [formData, exchangeRate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-fee-title"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-linear-to-r from-slate-900 via-slate-850 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <Receipt className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="modal-add-fee-title" className="text-base font-bold text-white tracking-tight">
                  Điền Thông Tin Chi Phí Báo Giá
                </h3>
                <span className="text-[11px] font-semibold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Thả xuống chọn nhanh hoặc điền thủ công
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Chọn phụ phí có sẵn từ danh mục hoặc trực tiếp nhập thông tin chi phí mới tùy chỉnh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice / Feedback Banner */}
        {selectedPresetNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{selectedPresetNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPresetNotice(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Content: Form + Dropdown Quick Picker */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          
          {/* SECTION 1: CHỨC NĂNG THẢ XUỐNG CHỌN NHANH PHÍ CÓ SẴN */}
          <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-xs space-y-2.5" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Chọn Nhanh Bằng Thả Xuống (Dropdown)</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({allSurcharges.length} phụ phí chuẩn trên hệ thống)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Bấm để mở danh sách, nhấp chọn phí để hệ thống tự động điền toàn bộ bảng bên dưới
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToManual}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer"
                  title="Xóa trắng để điền thủ công phí tùy chỉnh"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Xóa Form / Nhập Thủ Công</span>
                </button>
              </div>
            </div>

            {/* Dropdown Trigger Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-xl text-left text-xs transition cursor-pointer ${
                  isDropdownOpen 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white' 
                    : formData.code 
                    ? 'border-blue-300 bg-blue-50/30' 
                    : 'border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Tag className="w-4 h-4 text-blue-600 shrink-0" />
                  {formData.code ? (
                    <div className="truncate">
                      <span className="font-mono font-bold text-slate-900">{formData.code}</span>
                      <span className="text-slate-600 ml-1.5"> - {formData.description}</span>
                      <span className="text-slate-400 text-[11px] ml-2 font-mono">
                        ({formData.currency === 'USD' ? `$${formData.unitPrice}` : formatVND(formData.unitPrice)}/{formData.unit})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      ▼ Nhấp vào đây để thả xuống danh sách phụ phí chuẩn (THC, B/L, Hải Quan, CFS, D/O...)...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <span className="text-[11px] font-semibold text-blue-600 hidden sm:inline">
                    {isDropdownOpen ? 'Đóng danh sách' : 'Thả xuống'}
                  </span>
                  {isDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Dropdown Floating Panel */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search and filters inside dropdown */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Gõ tìm nhanh theo mã hoặc tên phí (VD: THC, B/L, SEAL, Hải Quan...)..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                        autoFocus
                      />
                      {dropdownSearch && (
                        <button
                          type="button"
                          onClick={() => setDropdownSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Filter tabs inside dropdown */}
                    <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                        Chặng:
                      </span>
                      {(['ALL', 'POL', 'FREIGHT', 'POD', 'OTHER'] as const).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setDropdownLocationFilter(loc)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                            dropdownLocationFilter === loc
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {loc === 'ALL' ? 'Tất cả' : loc}
                        </button>
                      ))}
                      <span className="ml-auto text-[10px] text-slate-400">
                        {filteredDropdownOptions.length} kết quả
                      </span>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100">
                    {filteredDropdownOptions.length > 0 ? (
                      filteredDropdownOptions.map((opt) => {
                        const isUsd = opt.currency === 'USD';
                        const displayPrice = isUsd ? `$${opt.priceUsd}` : formatVND(opt.priceVnd);

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectFromDropdown(opt)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50/70 rounded-lg flex items-center justify-between transition cursor-pointer group"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {opt.code}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  opt.location === 'POL' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : opt.location === 'FREIGHT'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : opt.location === 'POD'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {opt.location}
                                </span>
                                <span className="text-slate-700 font-semibold truncate">
                                  {opt.nameVi}
                                </span>
                              </div>
                              {opt.nameEn && (
                                <p className="text-[10px] text-slate-400 truncate italic mt-0.5">
                                  {opt.nameEn}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-emerald-700 text-xs">
                                {displayPrice}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                /{opt.unit} • VAT {opt.vatRate}%
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Không tìm thấy phụ phí nào khớp với "{dropdownSearch}".
                        <div className="mt-1 text-slate-400 text-[11px]">
                          Bạn hãy điền thủ công tên và chi phí vào bảng bên dưới.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: BẢNG ĐIỀN THÔNG TIN CHI PHÍ (MANUAL ENTRY / FINE-TUNE) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Form Column (2 Cols) */}
            <div className="md:col-span-2 space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Bảng Điền Chi Tiết Thông Tin Phí
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      (Có thể tự gõ thủ công nếu phí chưa có sẵn trên hệ thống)
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-slate-400">
                  * Các trường có dấu hoa thị là bắt buộc
                </span>
              </div>

              {/* Row 1: Tên Chi Phí & Mã Chi Phí */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên chi phí / Diễn giải <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="VD: Phí xếp dỡ cảng, Phí niêm phong chì, Phí hun trùng..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã chi phí (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: THC, SEAL, CUSTOMS"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Chặng, Phân loại, Cách tính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chặng tính phí
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value as ChargeLocation })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="POL">POL - Cảng/Nơi Đi (Xuất khẩu)</option>
                    <option value="FREIGHT">FREIGHT - Cước Vận Chuyển Chính</option>
                    <option value="POD">POD - Cảng/Nơi Đến (Nhập khẩu)</option>
                    <option value="OTHER">OTHER - Khác / Nội Địa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại chi phí
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as FeeCategory })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="LOCAL_CHARGE">LOCAL_CHARGE (Phụ phí địa phương/cảng)</option>
                    <option value="FREIGHT">FREIGHT (Cước vận chuyển quốc tế)</option>
                    <option value="SURCHARGE">SURCHARGE (Phụ phí theo tuyến/mùa)</option>
                    <option value="CUSTOMS">CUSTOMS (Thủ tục hải quan)</option>
                    <option value="TRUCKING">TRUCKING (Kéo container/xe tải)</option>
                    <option value="HANDLING">HANDLING (Phí dịch vụ xử lý)</option>
                    <option value="OTHER">OTHER (Chi phí khác)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cách tính cước
                  </label>
                  <select
                    value={formData.basis}
                    onChange={(e) => setFormData({ ...formData, basis: e.target.value as ChargeBasis })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold cursor-pointer"
                  >
                    {BASIS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: ĐVT, Số lượng, Loại tiền tệ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn vị tính (ĐVT)
                  </label>
                  <input
                    list="add-fee-units"
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Container, Bill, Set, CBM..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                  <datalist id="add-fee-units">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại tiền tệ
                  </label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, currency: 'USD' })}
                      className={`flex-1 py-1.5 text-xs font-bold transition cursor-pointer ${
                        formData.currency === 'USD'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, currency: 'VND' })}
                      className={`flex-1 py-1.5 text-xs font-bold transition cursor-pointer ${
                        formData.currency === 'VND'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      VND (₫)
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Đơn giá Bán, Đơn giá Vốn, Thuế suất VAT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn giá BÁN ({formData.currency}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-blue-900"
                      required
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      {formData.currency === 'USD' ? '$' : '₫'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn giá VỐN ({formData.currency})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-amber-900"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      {formData.currency === 'USD' ? '$' : '₫'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuế suất VAT (%)
                  </label>
                  <select
                    value={formData.vatRate}
                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="0">0% (Không chịu thuế / Cước Quốc tế)</option>
                    <option value="5">5% (Thuế suất 5%)</option>
                    <option value="8">8% (Thuế chuẩn phụ phí logistics VN)</option>
                    <option value="10">10% (Thuế suất 10%)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú điều kiện / Diễn giải thêm
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="VD: Phí áp dụng trong giờ hành chính, chưa bao gồm bốc xếp tại kho..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Checkbox: Lưu vào hệ thống để dùng lại */}
              <div className="pt-1 border-t border-slate-100">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.saveToCatalog}
                    onChange={(e) => setFormData({ ...formData, saveToCatalog: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Lưu chi phí này vào <strong>Danh Mục Phụ Phí Hệ Thống</strong> để có thể chọn nhanh từ dropdown cho các báo giá sau
                  </span>
                </label>
              </div>
            </div>

            {/* Financial Preview Summary (1 Col) */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    Dự toán dòng phí
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Tỷ giá: {formatVND(exchangeRate)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Thành tiền Bán (chưa VAT):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formData.currency === 'USD'
                        ? formatUSD(previewCalculation.subtotalSelling)
                        : formatVND(previewCalculation.subtotalSelling)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Tiền thuế VAT ({formData.vatRate}%):</span>
                    <span className="font-mono text-slate-700">
                      {formData.currency === 'USD'
                        ? formatUSD(previewCalculation.vatAmount)
                        : formatVND(previewCalculation.vatAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 font-bold text-slate-900">
                    <span>Tổng tiền gồm VAT:</span>
                    <span className="font-mono text-blue-600 text-sm">
                      {formData.currency === 'USD'
                        ? formatUSD(previewCalculation.totalWithVat)
                        : formatVND(previewCalculation.totalWithVat)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tổng chi phí vốn (Cost):</span>
                      <span className="font-mono text-amber-700 font-semibold">
                        {formData.currency === 'USD'
                          ? formatUSD(previewCalculation.subtotalCost)
                          : formatVND(previewCalculation.subtotalCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 mt-1">
                      <span>Lợi nhuận gộp (Profit):</span>
                      <span className={`font-mono font-bold ${previewCalculation.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formData.currency === 'USD'
                          ? formatUSD(previewCalculation.profit)
                          : formatVND(previewCalculation.profit)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-slate-600">Tỷ suất biên lãi (Margin):</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        previewCalculation.marginPercent >= 20
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : previewCalculation.marginPercent >= 10
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : previewCalculation.marginPercent >= 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {formatPercent(previewCalculation.marginPercent)}
                      </span>
                    </div>
                  </div>

                  {/* Dual currency converted values */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-1 text-slate-500">
                    <div className="flex justify-between">
                      <span>Giá trị USD:</span>
                      <span className="font-mono font-semibold text-slate-700">{formatUSD(previewCalculation.amountUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giá trị VND:</span>
                      <span className="font-mono font-semibold text-slate-700">{formatVND(previewCalculation.amountVnd)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick tip box */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mẹo sử dụng nhanh:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Nhấp chọn từ mục thả xuống ở trên để tự động điền các loại phí chuẩn. Nếu là phí mới (như phí nâng hạ riêng, phí khử trùng...), bạn chỉ cần gõ trực tiếp vào các ô bên trái.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-3 py-3 sm:px-5 sm:py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Có thể chọn "Thêm & Tiếp Tục" để nhập liên tiếp nhiều phụ phí mà không cần mở lại modal.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
            >
              Hủy / Đóng
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              title="Thêm chi phí này vào báo giá và giữ modal để nhập tiếp phí khác"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Tiếp Tục</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
              title="Thêm chi phí này vào báo giá và đóng modal"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Thêm Báo Giá</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
