import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineItem, FeeCategory, ChargeLocation, ChargeBasis, Currency } from '../types/logistics';
import { PricingWarningItem } from '../types/pricingIntelligence';
import { PRESET_LOCAL_CHARGES } from '../data/presets';
import { calculateLineItem, formatUSD, formatVND, formatPercent } from '../utils/formatters';
import { AddFeeModal } from './AddFeeModal';
import { 
  Plus, 
  Trash2, 
  ListChecks, 
  Receipt, 
  MapPin, 
  Ship, 
  Anchor, 
  Compass, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  ChevronDown,
  BarChart3,
  Copy,
  ArrowUp,
  ArrowDown,
  Search,
  Layers,
  HelpCircle,
  Swords,
  X,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
  Zap,
  History
} from 'lucide-react';

interface LineItemsTableProps {
  items: LineItem[];
  exchangeRate: number;
  onUpdateItems: (items: LineItem[]) => void;
  pricingWarnings?: PricingWarningItem[];
  onOpenSurchargeCatalog?: () => void;
  onOpenRateSearch?: () => void;
  onOpenSmartAssistant?: () => void;
  onOpenFreightRateBenchmarking?: () => void;
  onCheckRateUpdates?: () => void;
  outdatedRatesCount?: number;
  onResolveContractPricing?: () => void;
  onOpenContracts?: () => void;
  onOpenCompetitorRadar?: () => void;
  onOpenRoutePresets?: () => void;
  onOpenHistoricalRateAdvisor?: () => void;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({ 
  items, 
  exchangeRate, 
  onUpdateItems, 
  pricingWarnings = [],
  onOpenSurchargeCatalog,
  onOpenRateSearch,
  onOpenSmartAssistant,
  onOpenFreightRateBenchmarking,
  onCheckRateUpdates,
  outdatedRatesCount = 0,
  onResolveContractPricing,
  onOpenContracts,
  onOpenCompetitorRadar,
  onOpenRoutePresets,
  onOpenHistoricalRateAdvisor,
}) => {
  // Toggle Cost & Profit margin column
  const [showCostAndProfit, setShowCostAndProfit] = useState(true);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('flat');
  const [activeLegFilter, setActiveLegFilter] = useState<ChargeLocation | 'ALL'>('ALL');
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  // Add Fee Search & Custom Modal State
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [addFeeLocation, setAddFeeLocation] = useState<ChargeLocation>('POL');
  const [addFeeCategory, setAddFeeCategory] = useState<FeeCategory>('LOCAL_CHARGE');

  const handleOpenAddFeeModal = (category: FeeCategory = 'LOCAL_CHARGE', location: ChargeLocation = 'POL') => {
    setAddFeeCategory(category);
    setAddFeeLocation(location);
    setIsAddFeeModalOpen(true);
  };

  const handleAddLineItemFromModal = (newItem: LineItem) => {
    onUpdateItems([...items, newItem]);
  };

  // Listen to mobile bottom bar or global action to open Add Fee Modal
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const loc = e.detail?.location || (activeLegFilter !== 'ALL' ? activeLegFilter : 'POL');
      const cat = e.detail?.category || 'LOCAL_CHARGE';
      handleOpenAddFeeModal(cat, loc);
    };
    window.addEventListener('OPEN_ADD_FEE_MODAL', handleOpenEvent);
    return () => window.removeEventListener('OPEN_ADD_FEE_MODAL', handleOpenEvent);
  }, [activeLegFilter]);

  // Close preset dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    if (isPresetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPresetDropdownOpen]);

  // Rate traceability & risk stats
  const rateTraceabilityAlerts = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let expiring = 0;
    let lossCount = 0;

    items.forEach(item => {
      if (item.effectiveTo) {
        const exp = new Date(item.effectiveTo);
        if (exp < now) {
          expired++;
        } else {
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) expiring++;
        }
      }
      if (item.costPrice !== undefined && item.costPrice > 0 && item.unitPrice < item.costPrice) {
        lossCount++;
      }
    });

    return { expired, expiring, lossCount };
  }, [items]);

  // Add line item
  const handleAddItem = (category: FeeCategory = 'LOCAL_CHARGE', defaultLocation: ChargeLocation = 'POL') => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      category,
      location: defaultLocation,
      code: defaultLocation === 'FREIGHT' ? 'O/F' : 'CHARGE',
      description: defaultLocation === 'FREIGHT' ? 'Cước Vận Chuyển Quốc Tế (Ocean/Air Freight)' : 'Phí dịch vụ mới / Phụ phí',
      basis: 'PER_CONTAINER',
      quantity: 1,
      unit: defaultLocation === 'FREIGHT' ? 'Container' : 'Bill',
      unitPrice: defaultLocation === 'FREIGHT' ? 850 : 50,
      costPrice: defaultLocation === 'FREIGHT' ? 750 : 40,
      currency: 'USD',
      vatRate: defaultLocation === 'FREIGHT' ? 0 : 8,
      amountUsd: 0,
      amountVnd: 0,
      costTotalUsd: 0,
      costTotalVnd: 0,
      profitUsd: 0,
      profitVnd: 0,
      marginPercent: 0,
      note: '',
    };
    const calculated = calculateLineItem(newItem, exchangeRate);
    onUpdateItems([...items, calculated]);
  };

  // Add preset local charges
  const handleAddPreset = (preset: typeof PRESET_LOCAL_CHARGES[0]) => {
    const price = preset.currency === 'USD' ? preset.priceUsd : preset.priceVnd;
    const cost = Math.round(price * 0.8 * 100) / 100;

    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category: preset.category,
      location: preset.location || (preset.category === 'FREIGHT' ? 'FREIGHT' : 'POL'),
      code: preset.code,
      description: preset.name,
      basis: 'PER_CONTAINER',
      quantity: 1,
      unit: preset.unit,
      unitPrice: price,
      costPrice: cost,
      currency: preset.currency,
      vatRate: preset.vat,
      amountUsd: 0,
      amountVnd: 0,
      note: '',
    };
    const calculated = calculateLineItem(newItem, exchangeRate);
    onUpdateItems([...items, calculated]);
    setIsPresetDropdownOpen(false);
  };

  // Update line item
  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        let itemCopy: LineItem = { ...item, [field]: value };
        if ((field === 'unitPrice' || field === 'costPrice') && item.rateId) {
          if (!itemCopy.isOverridden) {
            itemCopy.isOverridden = true;
            itemCopy.originalUnitPrice = item.unitPrice;
            itemCopy.originalCostPrice = item.costPrice;
            itemCopy.overrideReason = 'Điều chỉnh giá trực tiếp trong Báo giá';
            itemCopy.overriddenAt = new Date().toISOString();
          }
        }
        return calculateLineItem(itemCopy, exchangeRate);
      }
      return item;
    });
    onUpdateItems(updated);
  };

  // Duplicate item
  const handleDuplicateItem = (itemToDup: LineItem) => {
    const duplicated: LineItem = {
      ...itemToDup,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: `${itemToDup.description} (Copy)`,
    };
    const calculated = calculateLineItem(duplicated, exchangeRate);
    onUpdateItems([...items, calculated]);
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    onUpdateItems(items.filter((item) => item.id !== id));
  };

  // Reorder items by ID (handles Up, Down, Top, Bottom)
  const handleMoveItemById = (itemId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const currentIndex = items.findIndex((i) => i.id === itemId);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'up') targetIndex = currentIndex - 1;
    else if (direction === 'down') targetIndex = currentIndex + 1;
    else if (direction === 'top') targetIndex = 0;
    else if (direction === 'bottom') targetIndex = items.length - 1;

    if (targetIndex < 0 || targetIndex >= items.length || targetIndex === currentIndex) return;

    const newItems = [...items];
    const [moved] = newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    onUpdateItems(newItems);
  };

  // Drag and Drop state for reordering items
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedItemId === id) return;
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';

    if (dragOverItemId !== id || dragOverPosition !== position) {
      setDragOverItemId(id);
      setDragOverPosition(position);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedItemId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDragOverPosition(null);
      return;
    }

    const sourceIndex = items.findIndex(i => i.id === sourceId);
    if (sourceIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);

    let targetIndex = newItems.findIndex(i => i.id === targetId);
    if (targetIndex === -1) {
      newItems.push(movedItem);
    } else {
      if (dragOverPosition === 'bottom') {
        targetIndex += 1;
      }
      newItems.splice(targetIndex, 0, movedItem);
    }

    onUpdateItems(newItems);
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverPosition(null);
  };

  // Grouped breakdown metrics
  const polItems = useMemo(() => items.filter(i => (i.location || 'POL') === 'POL'), [items]);
  const freightItems = useMemo(() => items.filter(i => i.location === 'FREIGHT' || (!i.location && i.category === 'FREIGHT')), [items]);
  const podItems = useMemo(() => items.filter(i => i.location === 'POD'), [items]);
  const otherItems = useMemo(() => items.filter(i => i.location === 'OTHER'), [items]);

  const sumLocationUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.amountUsd || 0), 0);
  const sumLocationVnd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.amountVnd || 0), 0);
  const sumLocationProfitUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.profitUsd || 0), 0);

  // Filtered items based on search and active leg filter
  const displayedItems = useMemo(() => {
    return items.filter(item => {
      // Leg filter
      if (activeLegFilter !== 'ALL') {
        const itemLoc = item.location || (item.category === 'FREIGHT' ? 'FREIGHT' : 'POL');
        if (itemLoc !== activeLegFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (item.description || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const note = (item.note || '').toLowerCase();
        return desc.includes(q) || code.includes(q) || note.includes(q);
      }
      return true;
    });
  }, [items, activeLegFilter, searchQuery]);

  // Helper render for single table row
  const renderRow = (item: LineItem, index: number, isGroupedView: boolean = false) => {
    const isLoss = item.costPrice !== undefined && item.costPrice > 0 && item.unitPrice < item.costPrice;
    const itemLocation = item.location || (item.category === 'FREIGHT' ? 'FREIGHT' : 'POL');
    const realIndex = items.findIndex((i) => i.id === item.id);
    const isFirst = realIndex === 0;
    const isLast = realIndex === items.length - 1;
    const isBeingDragged = draggedItemId === item.id;
    const isDragTarget = dragOverItemId === item.id;

    return (
      <tr 
        key={item.id} 
        onDragOver={(e) => handleDragOver(e, item.id)}
        onDrop={(e) => handleDrop(e, item.id)}
        className={`group transition-all border-b border-slate-100 hover:bg-slate-50/80 ${
          isLoss ? 'bg-rose-50/20' : ''
        } ${isBeingDragged ? 'opacity-30 bg-slate-100 border-dashed border-slate-400' : ''} ${
          isDragTarget && dragOverPosition === 'top' ? 'border-t-2 border-t-blue-600 bg-blue-50/30' : ''
        } ${
          isDragTarget && dragOverPosition === 'bottom' ? 'border-b-2 border-b-blue-600 bg-blue-50/30' : ''
        }`}
      >
        {/* Col 1: Thứ Tự & Kéo Thả / Di Chuyển Vị Trí */}
        <td className="py-2 px-1 text-center align-middle w-16 text-slate-400 select-none">
          <div className="flex items-center justify-center gap-0.5">
            {/* Drag Handle */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              className="p-1 text-slate-300 group-hover:text-slate-600 hover:!text-slate-900 hover:bg-slate-200/80 rounded cursor-grab active:cursor-grabbing transition-colors"
              title="Kéo & thả để đổi vị trí dòng phí này lên/xuống"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* STT & Up/Down Arrows */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleMoveItemById(item.id, 'up')}
                disabled={isFirst}
                className="p-0.5 text-slate-300 group-hover:text-slate-600 hover:!text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Di chuyển lên trên (1 dòng)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-xs font-bold text-slate-600 leading-none py-0.5" title={`Vị trí hiện tại: ${realIndex + 1}`}>
                {realIndex + 1}
              </span>

              <button
                type="button"
                onClick={() => handleMoveItemById(item.id, 'down')}
                disabled={isLast}
                className="p-0.5 text-slate-300 group-hover:text-slate-600 hover:!text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Di chuyển xuống dưới (1 dòng)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </td>

        {/* Col 2: Diễn Giải / Tên Phí & Ghi Chú (Can wrap / break lines freely) */}
        <td className="py-2.5 px-3 align-top min-w-[280px]">
          <div className="space-y-1.5 w-full">
            {/* Auto-wrapping multiline description */}
            <div className="relative">
              <textarea
                value={item.description}
                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                placeholder="Nhập tên phí dịch vụ / mô tả chi tiết..."
                rows={Math.max(1, Math.min(4, Math.ceil((item.description || '').length / 42)))}
                className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-lg border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all resize-y min-h-[32px] leading-relaxed break-words"
              />
            </div>

            {/* Sub-row: Note / Terms and Tags */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <input
                type="text"
                value={item.note || ''}
                onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                placeholder="+ Ghi chú phụ (free-time, điều kiện, tàu...)"
                className="flex-1 min-w-[140px] px-2 py-0.5 text-[11px] text-slate-600 bg-transparent hover:bg-slate-50 focus:bg-white rounded border border-transparent hover:border-slate-200 focus:border-slate-300 focus:outline-none placeholder:text-slate-400"
              />

              {/* Code Pill */}
              <input
                type="text"
                value={item.code || ''}
                onChange={(e) => handleItemChange(item.id, 'code', e.target.value.toUpperCase())}
                placeholder="MÃ"
                title="Mã phụ phí (Code)"
                className="w-16 px-1.5 py-0.5 text-[10px] font-mono font-bold text-center text-slate-700 bg-slate-100 border border-slate-200 rounded uppercase focus:outline-none focus:border-slate-400"
              />

              {item.priceSource === 'CUSTOMER_CONTRACT' && (
                <span className="shrink-0 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded" title="Giá chuẩn từ Hợp Đồng Khách Hàng">
                  HĐ KH
                </span>
              )}
              {item.isOverridden && (
                <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" title="Giá đã được chỉnh sửa thủ công">
                  Đã Sửa
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Col 3: Chặng (Location) & Cách Tính (Basis) - Stacked to save horizontal space without overlap */}
        <td className="py-2.5 px-2.5 align-top w-[145px]">
          <div className="space-y-1.5">
            {/* Chặng Selector */}
            <select
              value={itemLocation}
              onChange={(e) => handleItemChange(item.id, 'location', e.target.value as ChargeLocation)}
              className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none cursor-pointer ${
                itemLocation === 'POL' 
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : itemLocation === 'FREIGHT'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : itemLocation === 'POD'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <option value="POL">1. POL (Xuất)</option>
              <option value="FREIGHT">2. FREIGHT (Chính)</option>
              <option value="POD">3. POD (Nhập)</option>
              <option value="OTHER">4. OTHER (Khác)</option>
            </select>

            {/* Cách tính (Basis) */}
            <select
              value={item.basis || 'PER_CONTAINER'}
              onChange={(e) => handleItemChange(item.id, 'basis', e.target.value as ChargeBasis)}
              className="w-full px-2 py-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="PER_CONTAINER">Cont (Container)</option>
              <option value="PER_SHIPMENT">Set / Lô hàng</option>
              <option value="PER_CBM">CBM (Khối)</option>
              <option value="PER_KG">KGS / Tấn</option>
              <option value="PER_BL">B/L (Vận đơn)</option>
              <option value="PER_TRUCK">Chuyến xe</option>
              <option value="PERCENTAGE">% Tỷ lệ cước</option>
              <option value="FIXED">Trọn gói</option>
            </select>
          </div>
        </td>

        {/* Col 4: Số Lượng & Đơn Vị Tính (Quantity & Unit) */}
        <td className="py-2.5 px-2.5 align-top w-[110px]">
          <div className="space-y-1.5">
            <input
              type="number"
              min="0"
              step="any"
              value={item.quantity}
              onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs font-mono font-bold text-right text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-800"
            />
            <input
              type="text"
              value={item.unit || 'Cont'}
              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
              placeholder="ĐVT"
              className="w-full px-2 py-0.5 text-[10px] text-center font-medium text-slate-600 bg-white border border-slate-200 rounded focus:outline-none"
            />
          </div>
        </td>

        {/* Col 5: Đơn Giá Bán & Tiền Tệ & VAT */}
        <td className={`py-2.5 px-2.5 align-top w-[170px] ${isLoss ? 'bg-rose-50/40' : 'bg-blue-50/15'}`}>
          <div className="space-y-1.5">
            {/* Input price + currency toggle group */}
            <div className="flex items-center rounded-lg border border-blue-200 bg-white overflow-hidden shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <input
                type="number"
                min="0"
                step="any"
                value={item.unitPrice}
                onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value) || 0)}
                className={`w-full px-2 py-1 text-xs font-mono font-bold text-right focus:outline-none ${
                  isLoss ? 'text-rose-700 bg-rose-50/50' : 'text-blue-900'
                }`}
              />
              <button
                type="button"
                onClick={() => handleItemChange(item.id, 'currency', item.currency === 'USD' ? 'VND' : 'USD')}
                className={`px-2 py-1 text-[11px] font-mono font-bold border-l shrink-0 transition-colors cursor-pointer ${
                  item.currency === 'USD' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
                title="Chuyển đổi loại tiền tệ bán (USD / VND)"
              >
                {item.currency}
              </button>
            </div>

            {/* VAT selector */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
              <span className="text-[10px] font-medium text-slate-500 shrink-0">Thuế VAT:</span>
              <select
                value={item.vatRate}
                onChange={(e) => handleItemChange(item.id, 'vatRate', Number(e.target.value))}
                className="px-1.5 py-0.5 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:outline-none cursor-pointer"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={8}>8%</option>
                <option value={10}>10%</option>
              </select>
            </div>
          </div>
        </td>

        {/* Col 6: Giá Vốn & Lợi Nhuận Margin (When enabled) */}
        {showCostAndProfit && (
          <td className="py-2.5 px-2.5 align-top w-[155px] bg-amber-50/25 border-l border-r border-amber-100">
            <div className="space-y-1.5">
              {/* Cost input */}
              <div className="flex items-center rounded-lg border border-amber-200 bg-white overflow-hidden shadow-2xs focus-within:border-amber-400">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.costPrice !== undefined ? item.costPrice : ''}
                  onChange={(e) => handleItemChange(item.id, 'costPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2 py-1 text-xs font-mono font-bold text-right text-amber-950 focus:outline-none"
                />
                <span className="px-1.5 py-1 text-[10px] font-mono text-amber-800 bg-amber-50/80 border-l border-amber-200 shrink-0">
                  {item.currency}
                </span>
              </div>

              {/* Profit & Margin Subtext */}
              <div className="flex items-center justify-between text-[11px] pt-0.5 font-mono">
                <span className={`font-semibold ${
                  (item.profitUsd || 0) < 0 
                    ? 'text-rose-700 font-bold' 
                    : 'text-emerald-700'
                }`}>
                  Lãi: {formatUSD(item.profitUsd || 0)}
                </span>
                <span className={`px-1 rounded text-[10px] font-bold ${
                  (item.marginPercent || 0) >= 15
                    ? 'bg-emerald-100 text-emerald-800'
                    : (item.marginPercent || 0) > 0
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {formatPercent(item.marginPercent || 0, 1)}
                </span>
              </div>
            </div>
          </td>
        )}

        {/* Col 7: Thành Tiền (USD & VND Stacked cleanly without column clutter) */}
        <td className="py-2.5 px-3 align-top text-right w-[155px]">
          <div className="space-y-1 pt-1">
            <div className="font-mono font-bold text-slate-900 text-sm tracking-tight">
              {formatUSD(item.amountUsd)}
            </div>
            <div className="font-mono text-[11px] text-slate-500 font-normal">
              ≈ {formatVND(item.amountVnd)}
            </div>
          </div>
        </td>

        {/* Col 8: Thao tác (Di chuyển lên đầu/cuối, Duplicate & Delete) */}
        <td className="py-2.5 px-2 text-center align-top w-20">
          <div className="flex items-center justify-center gap-0.5 pt-1">
            {/* Quick Move to Top / Bottom */}
            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleMoveItemById(item.id, 'top')}
                disabled={isFirst}
                className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Chuyển lên đầu danh sách"
              >
                <ChevronsUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveItemById(item.id, 'bottom')}
                disabled={isLast}
                className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Chuyển xuống cuối danh sách"
              >
                <ChevronsDown className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDuplicateItem(item)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Nhân bản dòng phí này"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Xóa dòng phí"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 overflow-hidden">
      
      {/* 1. Header Toolbar Bar (Dual-Tier Professional Architecture) */}
      <div className="border-b border-slate-200/90">
        
        {/* Tier 1: Primary Command Bar */}
        <div className="p-3 md:px-4 md:py-3.5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Title, Counter & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                <ListChecks className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight">
                  Bảng Tính Giá Cước & Phụ Phí
                </h3>
                <span className="text-slate-300 font-normal">|</span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  {items.length} mục
                </span>
              </div>
            </div>

            {/* View mode toggle: Flat vs Grouped */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'flat' 
                    ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hiển thị danh sách cuộn liên tục (phẳng)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Danh sách phẳng</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Phân nhóm tự động 4 chặng: POL - Chặng Chính - POD - Nội Địa"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Nhóm 4 Chặng</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Search, Presets Dropdown & Primary Add Split Button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Quick Search inside Table */}
            <div className="relative min-w-[190px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã cước, tên phí..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 placeholder:text-slate-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 1-Click Route & Service Presets */}
            {onOpenRoutePresets && (
              <button
                type="button"
                onClick={onOpenRoutePresets}
                className="inline-flex items-center gap-1.5 bg-linear-to-r from-indigo-50 to-indigo-100/90 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 border border-indigo-300 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Áp dụng gói mẫu cước & trọn bộ phụ phí theo tuyến (1-Click Route & Service Presets)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Gói Tuyến 1-Click</span>
              </button>
            )}

            {/* Presets Quick Dropdown */}
            <div className="relative" ref={presetDropdownRef}>
              <button
                type="button"
                onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Chọn nhanh phụ phí xuất nhập khẩu thông dụng tại cảng Việt Nam"
              >
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Mẫu Phí Chuẩn</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPresetDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Phụ phí chuẩn Forwarder VN</span>
                    <span className="text-[10px] text-slate-400 font-normal">Click để thêm</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5">
                    {PRESET_LOCAL_CHARGES.map((preset) => (
                      <button
                        key={preset.code}
                        type="button"
                        onClick={() => {
                          handleAddPreset(preset);
                          setIsPresetDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 rounded-lg flex items-center justify-between transition cursor-pointer group"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{preset.code}</span>
                          <span className="text-slate-500 text-[11px] ml-1.5 truncate block">{preset.name}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700 shrink-0">
                          {preset.currency === 'USD' ? `$${preset.priceUsd}` : `${formatVND(preset.priceVnd)}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add Line Item Primary Split Button */}
            <div className="inline-flex items-center rounded-lg bg-slate-900 text-white overflow-hidden shadow-xs border border-slate-900">
              <button
                type="button"
                onClick={() => handleOpenAddFeeModal('LOCAL_CHARGE', activeLegFilter !== 'ALL' ? activeLegFilter : 'POL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mở hộp thoại tìm kiếm và thêm phí / Local charge mới"
                id="btn-open-add-fee-modal"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Thêm Phí</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-700" />
              <button
                type="button"
                onClick={() => handleOpenAddFeeModal('FREIGHT', 'FREIGHT')}
                className="px-2.5 py-1.5 text-xs font-semibold text-blue-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="+ Thêm Cước Biển / Cước Bay Quốc Tế (FREIGHT)"
              >
                + Cước Chặng Chính
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Intelligence & Logistics Utilities Ribbon */}
        <div className="px-3.5 py-2 md:px-4 md:py-2 bg-slate-50/80 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Left: Intelligence Tools & Master Data Lookups */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline-block mr-0.5">
              Công cụ hỗ trợ:
            </span>

            {/* AI & Market Intelligence Group */}
            {onOpenSmartAssistant && (
              <button
                type="button"
                onClick={onOpenSmartAssistant}
                className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-semibold text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Trợ lý tự động tìm & ghép giá thông minh theo tuyến"
                id="btn-open-smart-assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Smart Rates</span>
              </button>
            )}

            {onOpenFreightRateBenchmarking && (
              <button
                type="button"
                onClick={onOpenFreightRateBenchmarking}
                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-semibold text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Đối soát cước thị trường SCFI/Drewry & tối ưu tỷ lệ thắng thầu"
                id="btn-open-freight-benchmarking"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Đối Soát Cước AI</span>
              </button>
            )}

            {onOpenHistoricalRateAdvisor && (
              <button
                type="button"
                onClick={onOpenHistoricalRateAdvisor}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/90 font-bold text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Gợi ý giá cước cạnh tranh dựa trên lịch sử báo giá POL-POD trong 3 tháng qua"
                id="btn-open-historical-rate-advisor"
              >
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gợi Ý Giá Lịch Sử (3 Tháng)</span>
              </button>
            )}

            {onOpenCompetitorRadar && (
              <button
                type="button"
                onClick={onOpenCompetitorRadar}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-semibold text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Quản lý đối thủ forwarder, phân tích SWOT và kịch bản chốt đơn"
                id="btn-open-competitor-radar"
              >
                <Swords className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đối Thủ & SWOT FWD</span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="h-3.5 w-px bg-slate-300 mx-1 hidden sm:block" />

            {/* Master Data & Contracts Group */}
            {onOpenRateSearch && (
              <button
                type="button"
                onClick={onOpenRateSearch}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Tra cứu từ Biểu Cước Master"
              >
                <Ship className="w-3.5 h-3.5 text-slate-500" />
                <span>Biểu Cước Master</span>
              </button>
            )}

            {onOpenSurchargeCatalog && (
              <button
                type="button"
                onClick={onOpenSurchargeCatalog}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Mở Danh Mục Phụ Phí Đầy Đủ"
              >
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Thư Viện Phụ Phí</span>
              </button>
            )}

            {onResolveContractPricing && (
              <button
                type="button"
                onClick={onResolveContractPricing}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300/80 font-semibold text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Khớp giá ưu đãi từ hợp đồng khách hàng đã ký"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Khớp Giá HĐ</span>
              </button>
            )}
          </div>

          {/* Right: Security & Privacy View Controls */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Outdated rates alert badge */}
            {outdatedRatesCount > 0 && onCheckRateUpdates && (
              <button
                type="button"
                onClick={onCheckRateUpdates}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Có giá cước đã hết hạn hoặc thay đổi so với Master Rate"
              >
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>{outdatedRatesCount} cước đổi</span>
              </button>
            )}

            {/* Toggle Cost & Profit view */}
            <button
              type="button"
              onClick={() => setShowCostAndProfit(!showCostAndProfit)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                showCostAndProfit
                  ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
              }`}
              title={showCostAndProfit 
                ? "Đang hiển thị giá vốn & lợi nhuận. Bấm để ẩn khi gặp khách hàng" 
                : "Đã ẩn giá vốn & lợi nhuận an toàn. Bấm để hiển thị lại"}
            >
              {showCostAndProfit ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hiện Giá Vốn & Lãi</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>Đã Ẩn Giá Vốn (An Toàn)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* 2. Modern 4-Leg Interactive Summary Ribbon (No dead space, proportional grid) */}
      <div className="px-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* POL */}
        <button
          type="button"
          onClick={() => setActiveLegFilter(activeLegFilter === 'POL' ? 'ALL' : 'POL')}
          className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
            activeLegFilter === 'POL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Anchor className={`w-3.5 h-3.5 ${activeLegFilter === 'POL' ? 'text-slate-300' : 'text-slate-600'}`} />
              <span className="font-bold text-[11px]">1. Đầu Xuất (POL)</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeLegFilter === 'POL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/80 text-slate-700'
            }`}>
              {polItems.length} mục
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-mono font-bold text-xs sm:text-sm">
              {formatUSD(sumLocationUsd(polItems))}
            </div>
            {showCostAndProfit && (
              <div className={`font-mono text-[10px] ${activeLegFilter === 'POL' ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>
                Lãi: +{formatUSD(sumLocationProfitUsd(polItems))}
              </div>
            )}
          </div>
        </button>

        {/* FREIGHT */}
        <button
          type="button"
          onClick={() => setActiveLegFilter(activeLegFilter === 'FREIGHT' ? 'ALL' : 'FREIGHT')}
          className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
            activeLegFilter === 'FREIGHT'
              ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
              : 'bg-blue-50/50 hover:bg-blue-50/80 border-blue-200/90 text-blue-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Ship className={`w-3.5 h-3.5 ${activeLegFilter === 'FREIGHT' ? 'text-blue-300' : 'text-blue-600'}`} />
              <span className="font-bold text-[11px]">2. Cước Chính (FREIGHT)</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeLegFilter === 'FREIGHT' ? 'bg-blue-800 text-blue-200' : 'bg-blue-200/80 text-blue-800 font-bold'
            }`}>
              {freightItems.length} mục
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-mono font-bold text-xs sm:text-sm">
              {formatUSD(sumLocationUsd(freightItems))}
            </div>
            {showCostAndProfit && (
              <div className={`font-mono text-[10px] ${activeLegFilter === 'FREIGHT' ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>
                Lãi: +{formatUSD(sumLocationProfitUsd(freightItems))}
              </div>
            )}
          </div>
        </button>

        {/* POD */}
        <button
          type="button"
          onClick={() => setActiveLegFilter(activeLegFilter === 'POD' ? 'ALL' : 'POD')}
          className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
            activeLegFilter === 'POD'
              ? 'bg-purple-900 text-white border-purple-900 shadow-sm'
              : 'bg-purple-50/50 hover:bg-purple-50/80 border-purple-200/90 text-purple-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <MapPin className={`w-3.5 h-3.5 ${activeLegFilter === 'POD' ? 'text-purple-300' : 'text-purple-600'}`} />
              <span className="font-bold text-[11px]">3. Đầu Nhập (POD)</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeLegFilter === 'POD' ? 'bg-purple-800 text-purple-200' : 'bg-purple-200/80 text-purple-800 font-bold'
            }`}>
              {podItems.length} mục
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-mono font-bold text-xs sm:text-sm">
              {formatUSD(sumLocationUsd(podItems))}
            </div>
            {showCostAndProfit && (
              <div className={`font-mono text-[10px] ${activeLegFilter === 'POD' ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>
                Lãi: +{formatUSD(sumLocationProfitUsd(podItems))}
              </div>
            )}
          </div>
        </button>

        {/* OTHER */}
        <button
          type="button"
          onClick={() => setActiveLegFilter(activeLegFilter === 'OTHER' ? 'ALL' : 'OTHER')}
          className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
            activeLegFilter === 'OTHER'
              ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
              : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/90 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Compass className={`w-3.5 h-3.5 ${activeLegFilter === 'OTHER' ? 'text-amber-300' : 'text-amber-600'}`} />
              <span className="font-bold text-[11px]">4. Dịch Vụ Khác (OTHER)</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeLegFilter === 'OTHER' ? 'bg-amber-800 text-amber-200' : 'bg-amber-200/80 text-amber-800 font-bold'
            }`}>
              {otherItems.length} mục
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-mono font-bold text-xs sm:text-sm">
              {formatUSD(sumLocationUsd(otherItems))}
            </div>
            {showCostAndProfit && (
              <div className={`font-mono text-[10px] ${activeLegFilter === 'OTHER' ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>
                Lãi: +{formatUSD(sumLocationProfitUsd(otherItems))}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Warnings & Traceability Alert Ribbon */}
      {(rateTraceabilityAlerts.expired > 0 || rateTraceabilityAlerts.lossCount > 0 || pricingWarnings.length > 0) && (
        <div className="mx-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-slate-800 font-medium">
              <span className="font-semibold text-amber-950">Cảnh báo kiểm định cước: </span>
              {rateTraceabilityAlerts.lossCount > 0 && (
                <span className="font-bold text-rose-700 mr-2 bg-rose-100 px-1.5 py-0.5 rounded">
                  {rateTraceabilityAlerts.lossCount} dòng bán dưới giá vốn (Lỗ)
                </span>
              )}
              {rateTraceabilityAlerts.expired > 0 && (
                <span className="font-bold text-rose-700 mr-2 bg-rose-100 px-1.5 py-0.5 rounded">
                  {rateTraceabilityAlerts.expired} cước hết hạn hiệu lực
                </span>
              )}
              {rateTraceabilityAlerts.expiring > 0 && (
                <span className="font-bold text-amber-800 mr-2 bg-amber-100 px-1.5 py-0.5 rounded">
                  {rateTraceabilityAlerts.expiring} cước sắp hết hạn (trong 7 ngày)
                </span>
              )}
            </div>
          </div>

          {onCheckRateUpdates && (
            <button
              type="button"
              onClick={onCheckRateUpdates}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-[11px] hover:bg-amber-50 transition cursor-pointer"
            >
              Đối chiếu biểu cước Master
            </button>
          )}
        </div>
      )}

      {/* Mobile horizontal swipe helper */}
      <div className="md:hidden px-3.5 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <span className="text-blue-600">👉</span>
          <span>Vuốt ngang bảng để xem đủ ĐVT, giá Bán, giá Vốn & Lãi</span>
        </span>
        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
          {displayedItems.length} mục
        </span>
      </div>

      {/* 3. The Redesigned Quotation Table: No overlapping, multiline wrapping, proportional full-width distribution */}
      <div className="w-full overflow-x-auto border-t border-slate-200/80 [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              {/* STT & Kéo Thả / Di Chuyển */}
              <th className="py-3 px-1 text-center w-16 shrink-0" title="Kéo thả hoặc bấm mũi tên để đổi vị trí thứ tự các dòng phí">
                <div className="flex items-center justify-center gap-1">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                  <span>STT</span>
                </div>
              </th>
              
              {/* Diễn Giải / Tên Phí - Proportional flex-1 so there is NO blank void */}
              <th className="py-3 px-3 min-w-[280px]">
                Diễn Giải / Tên Phí Dịch Vụ
              </th>

              {/* Chặng & Cách Tính */}
              <th className="py-3 px-2.5 w-[145px]">
                Chặng & Tính (Basis)
              </th>

              {/* Số Lượng & ĐVT */}
              <th className="py-3 px-2.5 w-[110px] text-right">
                SL & ĐVT
              </th>

              {/* Giá Bán & Tiền Tệ & VAT */}
              <th className="py-3 px-2.5 w-[170px] text-right bg-blue-100/60 text-blue-950">
                Giá Bán & VAT
              </th>

              {/* Giá Vốn & Lợi Nhuận (Optional) */}
              {showCostAndProfit && (
                <th className="py-3 px-2.5 w-[155px] text-right bg-amber-100/60 text-amber-950 border-l border-r border-amber-200">
                  Giá Vốn & Lãi Margin
                </th>
              )}

              {/* Thành Tiền ($ & ₫ Stacked) */}
              <th className="py-3 px-3 w-[155px] text-right">
                Thành Tiền ($ / ₫)
              </th>

              {/* Thao Tác */}
              <th className="py-3 px-2 text-center w-20">
                Thao Tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {/* Case A: Grouped by 4 Legs */}
            {viewMode === 'grouped' ? (
              <>
                {(['POL', 'FREIGHT', 'POD', 'OTHER'] as ChargeLocation[]).map((loc) => {
                  const groupItems = displayedItems.filter(i => (i.location || (i.category === 'FREIGHT' ? 'FREIGHT' : 'POL')) === loc);
                  if (activeLegFilter !== 'ALL' && activeLegFilter !== loc) return null;

                  const locTitle = loc === 'POL' 
                    ? '1. ĐẦU XUẤT (POL - Port of Loading)' 
                    : loc === 'FREIGHT' 
                    ? '2. CƯỚC CHẶNG CHÍNH (FREIGHT - Ocean / Air / Trucking)' 
                    : loc === 'POD' 
                    ? '3. ĐẦU NHẬP (POD - Port of Discharge)' 
                    : '4. DỊCH VỤ KHÁC (OTHER - Thủ Tục, Giám Định, Kho)';

                  const locBg = loc === 'POL'
                    ? 'bg-slate-100/90 text-slate-800'
                    : loc === 'FREIGHT'
                    ? 'bg-blue-100/70 text-blue-900'
                    : loc === 'POD'
                    ? 'bg-purple-100/70 text-purple-900'
                    : 'bg-amber-100/70 text-amber-900';

                  const subtotalUsd = sumLocationUsd(groupItems);
                  const subtotalVnd = sumLocationVnd(groupItems);

                  return (
                    <React.Fragment key={loc}>
                      {/* Section Header Row */}
                      <tr className={`${locBg} font-bold border-y border-slate-200`}>
                        <td colSpan={showCostAndProfit ? 4 : 3} className="py-2 px-3 uppercase tracking-wide text-[11px]">
                          <div className="flex items-center gap-2">
                            <span>{locTitle}</span>
                            <span className="font-mono text-[10px] opacity-75">({groupItems.length} mục)</span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleOpenAddFeeModal(loc === 'FREIGHT' ? 'FREIGHT' : 'LOCAL_CHARGE', loc)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 hover:bg-white text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm vào chặng này</span>
                          </button>
                        </td>
                        <td colSpan={showCostAndProfit ? 2 : 1} className="py-2 px-3 text-right font-mono font-bold text-xs">
                          <span>{formatUSD(subtotalUsd)}</span>
                          <span className="opacity-75 font-normal ml-2">({formatVND(subtotalVnd)})</span>
                        </td>
                        <td className="py-2 px-2 text-center" />
                      </tr>

                      {/* Items inside this leg */}
                      {groupItems.map((item, idx) => renderRow(item, items.indexOf(item), true))}

                      {groupItems.length === 0 && (
                        <tr>
                          <td colSpan={showCostAndProfit ? 8 : 7} className="py-3 px-4 text-center text-slate-400 italic text-[11px] bg-slate-50/30">
                            Chưa có dòng cước nào trong chặng này. Nhấp "Thêm vào chặng này" để thêm.
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              /* Case B: Unified Flat List with responsive multiline entries */
              <>
                {displayedItems.map((item, index) => renderRow(item, index, false))}
              </>
            )}

            {/* Empty State when no items exist or search returns 0 */}
            {displayedItems.length === 0 && (
              <tr>
                <td colSpan={showCostAndProfit ? 8 : 7} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <ListChecks className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {searchQuery ? 'Không tìm thấy dòng cước phù hợp' : 'Chưa có dòng cước báo giá nào'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery 
                          ? `Thử xóa từ khóa "${searchQuery}" hoặc chọn Tất Cả chặng để xem đầy đủ.` 
                          : 'Bắt đầu thêm các chi phí vận chuyển, phụ phí cảng POL, POD hoặc cước chính cho khách hàng.'}
                      </p>
                    </div>

                    {!searchQuery && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddFeeModal('FREIGHT', 'FREIGHT')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-2xs transition cursor-pointer"
                        >
                          + Thêm Cước Biển/Air (FREIGHT)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddFeeModal('LOCAL_CHARGE', 'POL')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs transition cursor-pointer"
                        >
                          + Thêm Phí POL
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Footer with Clean Column Totals */}
          {items.length > 0 && (
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td colSpan={3} className="py-3 px-3 text-[11px] uppercase tracking-wider text-slate-600">
                  Tổng Cộng Bảng Cước ({items.length} hạng mục)
                </td>
                <td className="py-3 px-2.5 text-right font-mono text-xs">
                  {items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} ĐVT
                </td>
                <td className="py-3 px-2.5 text-right bg-blue-100/40 text-blue-950 font-mono text-xs">
                  -
                </td>
                {showCostAndProfit && (
                  <td className="py-3 px-2.5 text-right bg-amber-100/40 text-amber-950 font-mono text-xs border-l border-r border-amber-200">
                    <div className="text-[10px] text-amber-800">Tổng vốn:</div>
                    <div>{formatUSD(items.reduce((acc, i) => acc + (i.costTotalUsd || 0), 0))}</div>
                  </td>
                )}
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  <div className="text-sm">{formatUSD(items.reduce((acc, i) => acc + (i.amountUsd || 0), 0))}</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    ≈ {formatVND(items.reduce((acc, i) => acc + (i.amountVnd || 0), 0))}
                  </div>
                </td>
                <td className="py-3 px-2 text-center" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Quick Footer Helper Tips */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Mẹo: Tên phí hỗ trợ xuống dòng tự động; giá cước hỗ trợ đổi tức thì giữa USD và VND.</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Cước chính
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Phí xuất (POL)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Phí nhập (POD)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Khác (OTHER)
          </span>
        </div>
      </div>

      {/* Add Fee Modal with Search & Custom Form */}
      <AddFeeModal
        isOpen={isAddFeeModalOpen}
        onClose={() => setIsAddFeeModalOpen(false)}
        onAddItem={handleAddLineItemFromModal}
        exchangeRate={exchangeRate}
        initialLocation={addFeeLocation}
        initialCategory={addFeeCategory}
      />
    </div>
  );
};
