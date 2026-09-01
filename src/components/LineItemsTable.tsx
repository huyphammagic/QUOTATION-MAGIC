import React, { useState } from 'react';
import { LineItem, FeeCategory, ChargeLocation, ChargeBasis, PercentageBase } from '../types/logistics';
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
  TrendingUp, 
  Eye, 
  EyeOff, 
  Percent, 
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Edit3
} from 'lucide-react';

interface LineItemsTableProps {
  items: LineItem[];
  exchangeRate: number;
  onUpdateItems: (items: LineItem[]) => void;
  onOpenSurchargeCatalog?: () => void;
  onOpenRateSearch?: () => void;
  onOpenSmartAssistant?: () => void;
  onCheckRateUpdates?: () => void;
  outdatedRatesCount?: number;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({ 
  items, 
  exchangeRate, 
  onUpdateItems, 
  onOpenSurchargeCatalog,
  onOpenRateSearch,
  onOpenSmartAssistant,
  onCheckRateUpdates,
  outdatedRatesCount = 0
}) => {
  // Toggle between Compact Customer View and Full Cost/Profit Pricing Engine View
  const [showCostAndProfit, setShowCostAndProfit] = useState(true);

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
    const cost = Math.round(price * 0.8 * 100) / 100; // default estimated 80% cost

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
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        let itemCopy: LineItem = { ...item, [field]: value };

        // If manual price change on a Master Rate item, record override audit trail
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

  const getCategoryBadgeClass = (category: FeeCategory) => {
    switch (category) {
      case 'FREIGHT': return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'LOCAL_CHARGE': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'SURCHARGE': return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'CUSTOMS': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'TRUCKING': return 'bg-amber-100 text-amber-900 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getLocationBadgeClass = (location?: ChargeLocation) => {
    switch (location) {
      case 'POL': return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'FREIGHT': return 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
      case 'POD': return 'bg-purple-50 text-purple-800 border-purple-300 font-bold';
      case 'OTHER': return 'bg-slate-50 text-slate-700 border-slate-300 font-semibold';
      default: return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    }
  };

  // Calculate totals by Leg/Location
  const polItems = items.filter(i => (i.location || 'POL') === 'POL');
  const freightItems = items.filter(i => i.location === 'FREIGHT' || (!i.location && i.category === 'FREIGHT'));
  const podItems = items.filter(i => i.location === 'POD');
  const otherItems = items.filter(i => i.location === 'OTHER');

  const sumLocationUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.amountUsd || 0), 0);
  const sumLocationVnd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.amountVnd || 0), 0);
  const sumLocationProfitUsd = (list: LineItem[]) => list.reduce((acc, i) => acc + (i.profitUsd || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
      
      {/* Header & Control Actions */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ListChecks className="w-5 h-5 text-blue-700" />
          <div>
            <span className="font-bold text-xs text-slate-800 uppercase tracking-widest block">
              BẢNG TÍNH GIÁ VẬN TẢI & PHỤ PHÍ (PRICING ENGINE)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Tự động tính toán theo Basis, Giá Vốn (Cost), Giá Bán (Sell), Tỷ Suất Lợi Nhuận (Margin) & Thuế VAT
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Toggle Cost & Profit view */}
          <button
            type="button"
            onClick={() => setShowCostAndProfit(!showCostAndProfit)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showCostAndProfit
                ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Bật/Tắt hiển thị cột Giá Vốn & Lợi Nhuận Margin"
          >
            {showCostAndProfit ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{showCostAndProfit ? 'Ẩn Giá Vốn/Margin' : 'Hiện Giá Vốn/Margin'}</span>
          </button>

          {onOpenSmartAssistant && (
            <button
              type="button"
              onClick={onOpenSmartAssistant}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
              title="Trợ lý tự động tìm & ghép giá thông minh theo tuyến đường và loại cont"
              id="btn-open-smart-assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span>Smart Rate Assistant</span>
            </button>
          )}

          {onCheckRateUpdates && (
            <button
              type="button"
              onClick={onCheckRateUpdates}
              className={`flex items-center space-x-1.5 border text-xs px-3 py-1.5 rounded-lg transition-colors font-bold ${
                outdatedRatesCount > 0
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-bounce shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Kiểm tra bảng giá có thay đổi so với Master Rate mới nhất hay không"
              id="btn-check-rate-updates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${outdatedRatesCount > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
              <span>Kiểm Tra Giá Mới</span>
              {outdatedRatesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-extrabold">
                  {outdatedRatesCount}
                </span>
              )}
            </button>
          )}

          {onOpenRateSearch && (
            <button
              type="button"
              onClick={onOpenRateSearch}
              className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
              title="Tra cứu & Áp dụng từ Hệ thống Bảng Giá Master"
              id="btn-open-rate-search-table"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bảng Giá Master</span>
            </button>
          )}

          {onOpenSurchargeCatalog && (
            <button
              type="button"
              onClick={onOpenSurchargeCatalog}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
              title="Quản lý & Chọn từ Danh Mục Phụ Phí Master"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>Danh Mục Phụ Phí</span>
            </button>
          )}

          <button
            onClick={() => handleAddItem('LOCAL_CHARGE', 'POL')}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Dòng Phí</span>
          </button>
        </div>
      </div>

      {/* Leg Breakdown Summary Bar */}
      <div className="mx-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* POL */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-900 uppercase">1. Đầu Xuất (POL)</div>
              <div className="text-[11px] text-emerald-700 font-medium">{polItems.length} hạng mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-emerald-950 text-xs sm:text-sm">{formatUSD(sumLocationUsd(polItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-emerald-700">Lãi: +{formatUSD(sumLocationProfitUsd(polItems))}</div>
            )}
          </div>
        </div>

        {/* FREIGHT */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-900 uppercase">2. Cước Chính (FREIGHT)</div>
              <div className="text-[11px] text-blue-700 font-medium">{freightItems.length} hạng mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-blue-950 text-xs sm:text-sm">{formatUSD(sumLocationUsd(freightItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-blue-700">Lãi: +{formatUSD(sumLocationProfitUsd(freightItems))}</div>
            )}
          </div>
        </div>

        {/* POD */}
        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-800">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-purple-900 uppercase">3. Đầu Nhập (POD)</div>
              <div className="text-[11px] text-purple-700 font-medium">{podItems.length} hạng mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-purple-950 text-xs sm:text-sm">{formatUSD(sumLocationUsd(podItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-purple-700">Lãi: +{formatUSD(sumLocationProfitUsd(podItems))}</div>
            )}
          </div>
        </div>

        {/* OTHER */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-800 uppercase">4. Dịch Vụ Khác (OTHER)</div>
              <div className="text-[11px] text-slate-500 font-medium">{otherItems.length} hạng mục</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{formatUSD(sumLocationUsd(otherItems))}</div>
            {showCostAndProfit && (
              <div className="font-mono text-[10px] text-slate-600">Lãi: +{formatUSD(sumLocationProfitUsd(otherItems))}</div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table Grid */}
      <div className="overflow-x-auto border-t border-b border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <th className="px-2.5 py-3 w-8 text-center">#</th>
              <th className="px-3 py-3 min-w-[220px]">Diễn Giải / Tên Hạng Mục</th>
              <th className="px-2.5 py-3 min-w-[100px]">Mã Phí</th>
              <th className="px-2.5 py-3 min-w-[130px]">Chặng / Vị Trí</th>
              <th className="px-2.5 py-3 min-w-[130px]">Phân Loại</th>
              <th className="px-2.5 py-3 min-w-[125px]">Cách Tính (Basis)</th>
              <th className="px-2.5 py-3 min-w-[70px] text-right">SL</th>
              <th className="px-2.5 py-3 min-w-[90px]">Đơn Vị</th>
              
              {/* Cost Price Column */}
              {showCostAndProfit && (
                <th className="px-2.5 py-3 min-w-[105px] text-right bg-amber-50/70 text-amber-950 border-l border-r border-amber-200">
                  Giá Vốn (Cost)
                </th>
              )}

              <th className="px-2.5 py-3 min-w-[110px] text-right bg-blue-50/50 text-blue-950 font-extrabold">
                Giá Bán (Sell)
              </th>
              
              <th className="px-2.5 py-3 min-w-[80px] text-center">Loại Tiền</th>
              <th className="px-2.5 py-3 min-w-[75px] text-center">VAT</th>
              <th className="px-3 py-3 min-w-[125px] text-right">Thành Tiền (USD)</th>
              <th className="px-3 py-3 min-w-[140px] text-right">Thành Tiền (VND)</th>

              {/* Profit & Margin Columns */}
              {showCostAndProfit && (
                <>
                  <th className="px-2.5 py-3 min-w-[100px] text-right bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">
                    Lợi Nhuận
                  </th>
                  <th className="px-2.5 py-3 min-w-[75px] text-right bg-emerald-50/70 text-emerald-950 border-r border-emerald-200">
                    Margin %
                  </th>
                </>
              )}

              <th className="px-2 py-3 w-10 text-center">Xóa</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.map((item, index) => (
              <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                
                {/* STT */}
                <td className="px-2.5 py-2.5 text-center text-slate-400 font-mono text-xs">{index + 1}</td>

                {/* Description & Note */}
                <td className="px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="Tên phí..."
                    />
                    {item.rateId && (
                      <span 
                        className="shrink-0 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1"
                        title={`Master Snapshot: ${item.rateCode || item.rateId} (v${item.rateVersion || 1}) - Bất biến`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                        {item.rateCode || 'Master'}
                      </span>
                    )}
                    {item.isOverridden && (
                      <span 
                        className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs"
                        title={`Giá đã điều chỉnh thủ công bởi Sales.\nGiá gốc Master: ${item.currency === 'USD' ? '$' + item.originalUnitPrice : item.originalUnitPrice + ' ₫'}\nLý do: ${item.overrideReason || 'N/A'}`}
                      >
                        <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                        Đã Sửa Giá
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                    className="w-full px-2.5 py-0.5 rounded text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:outline-none"
                    placeholder="+ Ghi chú phụ phí..."
                  />
                </td>

                {/* Code */}
                <td className="px-2.5 py-2.5">
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => handleItemChange(item.id, 'code', e.target.value.toUpperCase())}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 font-mono uppercase text-blue-900 font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </td>

                {/* Location (Leg) Selector */}
                <td className="px-2.5 py-2.5">
                  <select
                    value={item.location || 'POL'}
                    onChange={(e) => handleItemChange(item.id, 'location', e.target.value as ChargeLocation)}
                    className={`w-full px-2 py-1.5 rounded border text-xs font-semibold uppercase focus:outline-none ${getLocationBadgeClass(item.location || 'POL')}`}
                  >
                    <option value="POL">POL (Đầu Xuất)</option>
                    <option value="FREIGHT">FREIGHT (Chính)</option>
                    <option value="POD">POD (Đầu Nhập)</option>
                    <option value="OTHER">KHÁC</option>
                  </select>
                </td>

                {/* Category Selector */}
                <td className="px-2.5 py-2.5">
                  <select
                    value={item.category}
                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value as FeeCategory)}
                    className={`w-full px-2 py-1.5 rounded border text-xs font-bold uppercase focus:outline-none ${getCategoryBadgeClass(item.category)}`}
                  >
                    <option value="FREIGHT">FREIGHT (Cước)</option>
                    <option value="LOCAL_CHARGE">LOCAL CHARGE</option>
                    <option value="SURCHARGE">SURCHARGE</option>
                    <option value="CUSTOMS">HẢI QUAN</option>
                    <option value="TRUCKING">TRUCKING</option>
                    <option value="HANDLING">HANDLING</option>
                    <option value="OTHER">KHÁC</option>
                  </select>
                </td>

                {/* Basis Selector (Pricing Engine Unit/Base Rule) */}
                <td className="px-2.5 py-2.5">
                  <select
                    value={item.basis || 'PER_CONTAINER'}
                    onChange={(e) => handleItemChange(item.id, 'basis', e.target.value as ChargeBasis)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PER_CONTAINER">Per Container</option>
                    <option value="PER_BL">Per B/L</option>
                    <option value="PER_SHIPMENT">Per Shipment</option>
                    <option value="PER_WM">Per W/M (LCL)</option>
                    <option value="PER_CHARGEABLE_KG">Per CW (Air/Kg)</option>
                    <option value="PER_KG">Per Gross KG</option>
                    <option value="PER_CBM">Per CBM</option>
                    <option value="PER_TRUCK">Per Truck</option>
                    <option value="PER_TRIP">Per Trip</option>
                    <option value="PER_DOCUMENT">Per Document</option>
                    <option value="PER_PALLET">Per Pallet</option>
                    <option value="PER_PACKAGE">Per Package</option>
                    <option value="PER_UNIT">Per Unit</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>

                  {item.basis === 'PERCENTAGE' && (
                    <div className="mt-1">
                      <select
                        value={item.percentageBase || 'FREIGHT'}
                        onChange={(e) => handleItemChange(item.id, 'percentageBase', e.target.value as PercentageBase)}
                        className="w-full px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-[10px] text-purple-900 font-bold"
                        title="Phần trăm tính trên cơ sở nào"
                      >
                        <option value="FREIGHT">% của Freight</option>
                        <option value="SUBTOTAL">% của Subtotal</option>
                        <option value="TOTAL_ORIGIN">% của Phí POL</option>
                        <option value="TOTAL_DESTINATION">% của Phí POD</option>
                        <option value="CUSTOMS">% của Hải Quan</option>
                        <option value="TRUCKING">% của Trucking</option>
                      </select>
                    </div>
                  )}
                </td>

                {/* Quantity */}
                <td className="px-2.5 py-2.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-right font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </td>

                {/* Unit */}
                <td className="px-2.5 py-2.5">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-slate-900 font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="Cont / Bill..."
                  />
                </td>

                {/* Cost Price (Giá vốn) */}
                {showCostAndProfit && (
                  <td className="px-2.5 py-2.5 bg-amber-50/40 border-l border-r border-amber-200">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.costPrice !== undefined ? item.costPrice : ''}
                      onChange={(e) => handleItemChange(item.id, 'costPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded border border-amber-300 text-right font-bold text-amber-950 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                      title="Giá vốn đầu vào của công ty Forwarding"
                    />
                  </td>
                )}

                {/* Selling Unit Price (Giá bán) */}
                <td className="px-2.5 py-2.5 bg-blue-50/30">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded border border-blue-300 text-right font-bold text-blue-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </td>

                {/* Currency */}
                <td className="px-2.5 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleItemChange(item.id, 'currency', item.currency === 'USD' ? 'VND' : 'USD')}
                    className={`w-full px-2 py-1.5 rounded font-bold text-xs border transition-colors ${
                      item.currency === 'USD'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {item.currency}
                  </button>
                </td>

                {/* VAT % */}
                <td className="px-2.5 py-2.5">
                  <select
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(item.id, 'vatRate', Number(e.target.value))}
                    className="w-full px-1.5 py-1.5 rounded border border-slate-200 text-center font-bold bg-slate-50 focus:bg-white focus:outline-none text-xs"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={8}>8%</option>
                    <option value={10}>10%</option>
                  </select>
                </td>

                {/* Calculated USD Total */}
                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                  {formatUSD(item.amountUsd)}
                </td>

                {/* Calculated VND Total */}
                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700 text-xs whitespace-nowrap">
                  {formatVND(item.amountVnd)}
                </td>

                {/* Profit & Margin Display */}
                {showCostAndProfit && (
                  <>
                    <td className="px-2.5 py-2.5 text-right font-mono font-bold text-emerald-900 bg-emerald-50/40 border-l border-emerald-200 text-xs whitespace-nowrap">
                      {formatUSD(item.profitUsd || 0)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-extrabold text-emerald-950 bg-emerald-50/40 border-r border-emerald-200 text-xs whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                        (item.marginPercent || 0) >= 15
                          ? 'bg-emerald-100 text-emerald-800'
                          : (item.marginPercent || 0) > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {formatPercent(item.marginPercent || 0, 1)}
                      </span>
                    </td>
                  </>
                )}

                {/* Remove Button */}
                <td className="px-2 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Xóa hạng mục"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>

              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={showCostAndProfit ? 17 : 14} className="p-8 text-center text-slate-400 italic">
                  Chưa có hạng mục phí nào. Bấm "Thêm Dòng Phí" hoặc chọn nhanh từ danh mục phụ phí.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

    </div>
  );
};
