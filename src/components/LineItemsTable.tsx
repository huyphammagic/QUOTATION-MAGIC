import React, { useState, useMemo } from 'react';
import { LineItem, FeeCategory, ChargeLocation, ChargeBasis, PercentageBase } from '../types/logistics';
import { PricingWarningItem } from '../types/pricingIntelligence';
import { PRESET_LOCAL_CHARGES } from '../data/presets';
import { calculateLineItem, formatUSD, formatVND, formatPercent, formatNumber } from '../utils/formatters';
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
  RefreshCw, 
  Edit3, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface LineItemsTableProps {
  items: LineItem[];
  exchangeRate: number;
  onUpdateItems: (items: LineItem[]) => void;
  pricingWarnings?: PricingWarningItem[];
  onOpenSurchargeCatalog?: () => void;
  onOpenRateSearch?: () => void;
  onOpenSmartAssistant?: () => void;
  onCheckRateUpdates?: () => void;
  outdatedRatesCount?: number;
  onResolveContractPricing?: () => void;
  onOpenContracts?: () => void;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({ 
  items, 
  exchangeRate, 
  onUpdateItems, 
  pricingWarnings = [],
  onOpenSurchargeCatalog,
  onOpenRateSearch,
  onOpenSmartAssistant,
  onCheckRateUpdates,
  outdatedRatesCount = 0,
  onResolveContractPricing,
  onOpenContracts,
}) => {
  // Toggle Cost and Margin View
  const [showCostAndProfit, setShowCostAndProfit] = useState(true);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);

  // Rate traceability alerts
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

  const handleAddItem = (category: FeeCategory = 'LOCAL_CHARGE', defaultLocation: ChargeLocation = 'POL') => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      category,
      location: defaultLocation,
      code: 'CHARGE',
      description: 'Phí dịch vụ mới / Phụ phí',
      basis: 'PER_CONTAINER',
      quantity: 1,
      unit: 'Container',
      unitPrice: 50,
      costPrice: 40,
      currency: 'USD',
      vatRate: 8,
      amountUsd: 50,
      amountVnd: Math.round(50 * exchangeRate),
      costTotalUsd: 40,
      costTotalVnd: Math.round(40 * exchangeRate),
      profitUsd: 10,
      profitVnd: Math.round(10 * exchangeRate),
      marginPercent: 20,
      note: '',
    };
    const calculated = calculateLineItem(newItem, exchangeRate);
    onUpdateItems([...items, calculated]);
  };

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

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        let itemCopy: LineItem = { ...item, [field]: value };
        if ((field === 'unitPrice' || field === 'costPrice') && item.rateId) {
          if (!item.isOverridden) {
            itemCopy.isOverridden = true;
            itemCopy.originalUnitPrice = item.unitPrice;
            itemCopy.originalCostPrice = item.costPrice;
            itemCopy.overrideReason = 'Điều chỉnh giá bán trực tiếp bởi Sales';
            itemCopy.overriddenAt = new Date().toISOString();
          }
        }
        return calculateLineItem(itemCopy, exchangeRate);
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    onUpdateItems(items.filter((item) => item.id !== id));
  };

  // Grouped Location Breakdown
  const polItems = items.filter(i => (i.location || 'POL') === 'POL');
  const freightItems = items.filter(i => i.location === 'FREIGHT' || (!i.location && i.category === 'FREIGHT'));
  const podItems = items.filter(i => i.location === 'POD');
  const otherItems = items.filter(i => i.location === 'OTHER');

  const sumLocationUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.amountUsd || 0), 0);
  const sumLocationProfitUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.profitUsd || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
      
      {/* Table Action Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <ListChecks className="w-3.5 h-3.5 text-slate-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Bảng Tính Giá Cước & Phụ Phí
              </h3>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-mono text-slate-500">
                {items.length} hạng mục
              </span>
            </div>
          </div>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Cost & Profit view */}
          <button
            type="button"
            onClick={() => setShowCostAndProfit(!showCostAndProfit)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              showCostAndProfit
                ? 'bg-slate-100 text-slate-900 border-slate-300 font-semibold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Bật/Tắt hiển thị cột Giá Vốn (Cost) & Lợi Nhuận Margin"
          >
            {showCostAndProfit ? <Eye className="w-3.5 h-3.5 text-slate-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{showCostAndProfit ? 'Ẩn Giá Vốn' : 'Hiện Giá Vốn'}</span>
          </button>

          {/* Smart Assistant */}
          {onOpenSmartAssistant && (
            <button
              type="button"
              onClick={onOpenSmartAssistant}
              className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Trợ lý tự động tìm & ghép giá thông minh theo tuyến"
              id="btn-open-smart-assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Smart Rates</span>
            </button>
          )}

          {/* Master Rate Search */}
          {onOpenRateSearch && (
            <button
              type="button"
              onClick={onOpenRateSearch}
              className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Tra cứu từ Biểu Cước Master"
              id="btn-open-rate-search-table"
            >
              <Ship className="w-3.5 h-3.5 text-slate-500" />
              <span>Biểu Cước Master</span>
            </button>
          )}

          {/* Surcharges Catalog */}
          {onOpenSurchargeCatalog && (
            <button
              type="button"
              onClick={onOpenSurchargeCatalog}
              className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Mở Danh Mục Phụ Phí"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>Phụ Phí</span>
            </button>
          )}

          {/* Contract Match Button */}
          {onResolveContractPricing && (
            <button
              type="button"
              onClick={onResolveContractPricing}
              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Khớp giá từ hợp đồng khách hàng đã ký"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khớp HĐ</span>
            </button>
          )}

          {/* Add Line Item Primary Button */}
          <button
            type="button"
            onClick={() => handleAddItem('LOCAL_CHARGE', 'POL')}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Phí</span>
          </button>
        </div>
      </div>

      {/* Modern 4-Leg Summary Ribbon */}
      <div className="mx-4 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        {/* POL */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-3.5 h-3.5 text-slate-600" />
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">1. Đầu Xuất (POL)</div>
              <div className="text-[10px] text-slate-500 font-mono">{polItems.length} mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{formatUSD(sumLocationUsd(polItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-emerald-700 font-medium">Lãi: +{formatUSD(sumLocationProfitUsd(polItems))}</div>
            )}
          </div>
        </div>

        {/* FREIGHT */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-3.5 h-3.5 text-blue-600" />
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">2. Cước Biển/Air (FREIGHT)</div>
              <div className="text-[10px] text-slate-500 font-mono">{freightItems.length} mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{formatUSD(sumLocationUsd(freightItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-emerald-700 font-medium">Lãi: +{formatUSD(sumLocationProfitUsd(freightItems))}</div>
            )}
          </div>
        </div>

        {/* POD */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">3. Đầu Nhập (POD)</div>
              <div className="text-[10px] text-slate-500 font-mono">{podItems.length} mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{formatUSD(sumLocationUsd(podItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-emerald-700 font-medium">Lãi: +{formatUSD(sumLocationProfitUsd(podItems))}</div>
            )}
          </div>
        </div>

        {/* OTHER */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">4. Dịch Vụ Khác (OTHER)</div>
              <div className="text-[10px] text-slate-500 font-mono">{otherItems.length} mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{formatUSD(sumLocationUsd(otherItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-emerald-700 font-medium">Lãi: +{formatUSD(sumLocationProfitUsd(otherItems))}</div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings & Traceability Ribbon */}
      {(rateTraceabilityAlerts.expired > 0 || rateTraceabilityAlerts.lossCount > 0 || pricingWarnings.length > 0) && (
        <div className="mx-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-slate-800 font-medium">
              <span>Cảnh báo định giá: </span>
              {rateTraceabilityAlerts.lossCount > 0 && (
                <span className="font-bold text-rose-700 mr-2">{rateTraceabilityAlerts.lossCount} dòng bán lỗ</span>
              )}
              {rateTraceabilityAlerts.expired > 0 && (
                <span className="font-bold text-rose-700 mr-2">{rateTraceabilityAlerts.expired} cước hết hạn</span>
              )}
              {rateTraceabilityAlerts.expiring > 0 && (
                <span className="font-bold text-amber-800 mr-2">{rateTraceabilityAlerts.expiring} cước sắp hết hạn</span>
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

      {/* Table Content */}
      <div className="overflow-x-auto border-t border-b border-slate-100">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <th className="px-2 py-2.5 w-7 text-center">#</th>
              <th className="px-3 py-2.5 min-w-[200px]">Diễn Giải / Tên Phí</th>
              <th className="px-2 py-2.5 min-w-[90px]">Chặng</th>
              <th className="px-2 py-2.5 min-w-[110px]">Cách Tính (Basis)</th>
              <th className="px-2 py-2.5 min-w-[65px] text-right">SL</th>
              
              {showCostAndProfit && (
                <th className="px-2 py-2.5 min-w-[95px] text-right bg-amber-50/60 text-amber-900 border-l border-r border-amber-200">
                  Giá Vốn (Cost)
                </th>
              )}

              <th className="px-2 py-2.5 min-w-[100px] text-right bg-blue-50/40 text-blue-900 font-bold">
                Giá Bán (Sell)
              </th>
              
              <th className="px-2 py-2.5 min-w-[65px] text-center">Tiền</th>
              <th className="px-2 py-2.5 min-w-[65px] text-center">VAT</th>
              <th className="px-3 py-2.5 min-w-[110px] text-right">Thành Tiền ($)</th>
              <th className="px-3 py-2.5 min-w-[120px] text-right">Thành Tiền (₫)</th>

              {showCostAndProfit && (
                <>
                  <th className="px-2 py-2.5 min-w-[90px] text-right bg-emerald-50/60 text-emerald-950 border-l border-emerald-200">
                    Lãi ($)
                  </th>
                  <th className="px-2 py-2.5 min-w-[70px] text-right bg-emerald-50/60 text-emerald-950 border-r border-emerald-200">
                    Margin %
                  </th>
                </>
              )}

              <th className="px-2 py-2.5 w-8 text-center">Xóa</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item, index) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                
                {/* STT */}
                <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>

                {/* Description */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 rounded-md border border-slate-200 font-semibold text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                      placeholder="Tên phí dịch vụ..."
                    />
                    {item.priceSource === 'CUSTOMER_CONTRACT' && (
                      <span className="shrink-0 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded" title="Từ hợp đồng khách hàng">
                        HĐ KH
                      </span>
                    )}
                    {item.isOverridden && (
                      <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded" title="Đã chỉnh sửa giá thủ công">
                        Sửa
                      </span>
                    )}
                  </div>
                </td>

                {/* Location */}
                <td className="px-2 py-2">
                  <select
                    value={item.location || 'POL'}
                    onChange={(e) => handleItemChange(item.id, 'location', e.target.value as ChargeLocation)}
                    className="w-full px-1.5 py-1 rounded-md border border-slate-200 text-slate-800 bg-slate-50/60 text-xs font-semibold focus:outline-none"
                  >
                    <option value="POL">1. POL (Xuất)</option>
                    <option value="FREIGHT">2. FREIGHT (Chính)</option>
                    <option value="POD">3. POD (Nhập)</option>
                    <option value="OTHER">4. OTHER (Khác)</option>
                  </select>
                </td>

                {/* Basis */}
                <td className="px-2 py-2">
                  <select
                    value={item.basis}
                    onChange={(e) => handleItemChange(item.id, 'basis', e.target.value as ChargeBasis)}
                    className="w-full px-1.5 py-1 rounded-md border border-slate-200 text-slate-800 bg-slate-50/60 text-xs focus:outline-none"
                  >
                    <option value="PER_CONTAINER">Per Cont</option>
                    <option value="PER_SHIPMENT">Per Set/Lô</option>
                    <option value="PER_CBM">Per CBM</option>
                    <option value="PER_TON">Per KGS/Tấn</option>
                    <option value="PER_BL">Per B/L</option>
                    <option value="PERCENTAGE">Phần trăm %</option>
                  </select>
                </td>

                {/* Quantity */}
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                    className="w-full px-1.5 py-1 rounded-md border border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none text-xs"
                  />
                </td>

                {/* Cost Price */}
                {showCostAndProfit && (
                  <td className="px-2 py-2 bg-amber-50/30 border-l border-r border-amber-200">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.costPrice !== undefined ? item.costPrice : ''}
                      onChange={(e) => handleItemChange(item.id, 'costPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-1.5 py-1 rounded-md border border-amber-300 text-right font-mono font-bold text-amber-950 bg-white focus:outline-none text-xs"
                    />
                  </td>
                )}

                {/* Unit Price (Sell) */}
                <td className={`px-2 py-2 ${item.costPrice !== undefined && item.costPrice > 0 && item.unitPrice < item.costPrice ? 'bg-rose-50/60' : 'bg-blue-50/20'}`}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value) || 0)}
                    className={`w-full px-1.5 py-1 rounded-md text-right font-mono font-bold text-xs focus:outline-none border ${
                      item.costPrice !== undefined && item.costPrice > 0 && item.unitPrice < item.costPrice
                        ? 'border-rose-400 text-rose-900 bg-rose-50'
                        : 'border-blue-300 text-blue-900 bg-white'
                    }`}
                  />
                </td>

                {/* Currency */}
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleItemChange(item.id, 'currency', item.currency === 'USD' ? 'VND' : 'USD')}
                    className={`px-2 py-1 rounded-md font-mono font-bold text-[11px] border cursor-pointer ${
                      item.currency === 'USD'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {item.currency}
                  </button>
                </td>

                {/* VAT */}
                <td className="px-2 py-2">
                  <select
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(item.id, 'vatRate', Number(e.target.value))}
                    className="w-full px-1 py-1 rounded-md border border-slate-200 text-center font-bold bg-slate-50/60 text-xs"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={8}>8%</option>
                    <option value={10}>10%</option>
                  </select>
                </td>

                {/* Amount USD */}
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                  {formatUSD(item.amountUsd)}
                </td>

                {/* Amount VND */}
                <td className="px-3 py-2 text-right font-mono text-slate-600 text-xs whitespace-nowrap">
                  {formatVND(item.amountVnd)}
                </td>

                {/* Profit & Margin */}
                {showCostAndProfit && (
                  <>
                    <td className="px-2 py-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30 border-l border-emerald-200 text-xs whitespace-nowrap">
                      {formatUSD(item.profitUsd || 0)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-bold bg-emerald-50/30 border-r border-emerald-200 text-xs whitespace-nowrap">
                      <span className={`px-1 py-0.5 rounded text-[10px] ${
                        (item.marginPercent || 0) >= 15
                          ? 'text-emerald-800 font-bold'
                          : (item.marginPercent || 0) > 0
                          ? 'text-blue-800 font-semibold'
                          : 'text-rose-700 font-bold'
                      }`}>
                        {formatPercent(item.marginPercent || 0, 1)}
                      </span>
                    </td>
                  </>
                )}

                {/* Delete */}
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                    title="Xóa dòng phí"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>

              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={showCostAndProfit ? 14 : 11} className="py-8 text-center text-slate-400 italic">
                  Chưa có dòng cước nào. Nhấp "+ Thêm Phí" để bắt đầu báo giá.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
