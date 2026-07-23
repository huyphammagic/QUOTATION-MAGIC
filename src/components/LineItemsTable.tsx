import React from 'react';
import { LineItem, FeeCategory } from '../types/logistics';
import { PRESET_LOCAL_CHARGES } from '../data/presets';
import { calculateLineItem, formatUSD, formatVND } from '../utils/formatters';
import { Plus, Trash2, ListChecks, Zap, Receipt } from 'lucide-react';

interface LineItemsTableProps {
  items: LineItem[];
  exchangeRate: number;
  onUpdateItems: (items: LineItem[]) => void;
  onOpenSurchargeCatalog?: () => void;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({ items, exchangeRate, onUpdateItems, onOpenSurchargeCatalog }) => {

  const handleAddItem = (category: FeeCategory = 'LOCAL_CHARGE') => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      category,
      code: 'CHARGE',
      description: 'Phí dịch vụ mới / Phụ phí',
      quantity: 1,
      unit: 'Container',
      unitPrice: 50,
      currency: 'USD',
      vatRate: 8,
      amountUsd: 50,
      amountVnd: Math.round(50 * exchangeRate),
      note: '',
    };
    onUpdateItems([...items, newItem]);
  };

  const handleAddPreset = (preset: typeof PRESET_LOCAL_CHARGES[0]) => {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category: preset.category,
      code: preset.code,
      description: preset.name,
      quantity: 1,
      unit: preset.unit,
      unitPrice: preset.currency === 'USD' ? preset.priceUsd : preset.priceVnd,
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
        const itemCopy = { ...item, [field]: value };
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
      
      {/* Header & Actions */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ListChecks className="w-4 h-4 text-blue-700" />
          <span className="font-bold text-xs text-slate-500 uppercase tracking-widest">CHI TIẾT BẢNG GIÁ & PHỤ PHÍ (FREIGHT & LOCAL CHARGES)</span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenSurchargeCatalog && (
            <button
              type="button"
              onClick={onOpenSurchargeCatalog}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
              title="Quản lý & Chọn từ Danh Mục Phụ Phí Master"
            >
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Danh Mục Phụ Phí Master</span>
            </button>
          )}

          <button
            onClick={() => handleAddItem()}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Dòng Phí Mới</span>
          </button>
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="mx-5 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Thêm nhanh phụ phí chuẩn ngành (Quick Presets):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_LOCAL_CHARGES.map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-200 shadow-2xs transition-colors flex items-center space-x-1"
            >
              <span className="font-bold text-blue-700">+{preset.code}</span>
              <span className="text-slate-400 font-mono">({preset.currency === 'USD' ? `$${preset.priceUsd}` : `${preset.priceVnd / 1000}k`})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Items Table Grid */}
      <div className="overflow-x-auto border-t border-b border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              <th className="p-2.5 w-8 text-center">#</th>
              <th className="p-2.5 min-w-[200px]">Diễn Giải / Tên Hạng Mục</th>
              <th className="p-2.5 w-28">Mã Phí</th>
              <th className="p-2.5 w-28">Phân Loại</th>
              <th className="p-2.5 w-16 text-right">SL</th>
              <th className="p-2.5 w-24">Đơn Vị</th>
              <th className="p-2.5 w-28 text-right">Đơn Giá</th>
              <th className="p-2.5 w-20 text-center">Loại Tiền</th>
              <th className="p-2.5 w-16 text-center">VAT</th>
              <th className="p-2.5 w-28 text-right">Thành Tiền (USD)</th>
              <th className="p-2.5 w-32 text-right">Thành Tiền (VND)</th>
              <th className="p-2.5 w-10 text-center">Xóa</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.map((item, index) => (
              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                
                {/* STT */}
                <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>

                {/* Description & Note */}
                <td className="p-2 space-y-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-200 font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="Tên phí..."
                  />
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => handleItemChange(item.id, 'note', e.target.value)}
                    className="w-full px-2 py-0.5 rounded text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:outline-none"
                    placeholder="+ Ghi chú phụ phí..."
                  />
                </td>

                {/* Code */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => handleItemChange(item.id, 'code', e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 rounded border border-slate-200 font-mono uppercase text-blue-900 font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </td>

                {/* Category Selector */}
                <td className="p-2">
                  <select
                    value={item.category}
                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value as FeeCategory)}
                    className={`w-full px-1.5 py-1 rounded border text-[10px] font-bold uppercase focus:outline-none ${getCategoryBadgeClass(item.category)}`}
                  >
                    <option value="FREIGHT">FREIGHT (Cước Chặng)</option>
                    <option value="LOCAL_CHARGE">LOCAL CHARGE</option>
                    <option value="SURCHARGE">SURCHARGE (Phụ Phí)</option>
                    <option value="CUSTOMS">HẢI QUAN</option>
                    <option value="TRUCKING">TRUCKING</option>
                    <option value="HANDLING">HANDLING</option>
                    <option value="OTHER">KHÁC</option>
                  </select>
                </td>

                {/* Quantity */}
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                    className="w-full px-1.5 py-1 rounded border border-slate-200 text-right font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </td>

                {/* Unit */}
                <td className="p-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="Cont / Bill..."
                  />
                </td>

                {/* Unit Price */}
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded border border-slate-200 text-right font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </td>

                {/* Currency */}
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleItemChange(item.id, 'currency', item.currency === 'USD' ? 'VND' : 'USD')}
                    className={`px-2 py-1 rounded font-bold text-[10px] border transition-colors ${
                      item.currency === 'USD'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {item.currency}
                  </button>
                </td>

                {/* VAT % */}
                <td className="p-2">
                  <select
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(item.id, 'vatRate', Number(e.target.value))}
                    className="w-full px-1 py-1 rounded border border-slate-200 text-center font-bold bg-slate-50 focus:bg-white focus:outline-none text-xs"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={8}>8%</option>
                    <option value={10}>10%</option>
                  </select>
                </td>

                {/* Calculated USD Total */}
                <td className="p-2 text-right font-mono font-bold text-slate-900 text-xs">
                  {formatUSD(item.amountUsd)}
                </td>

                {/* Calculated VND Total */}
                <td className="p-2 text-right font-mono font-bold text-slate-700 text-xs">
                  {formatVND(item.amountVnd)}
                </td>

                {/* Remove Button */}
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Xóa hạng mục"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>

              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                  Chưa có hạng mục phí nào. Bấm "Thêm Hạng Mục Phí" hoặc chọn nhanh từ danh sách phụ phí ở trên.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

    </div>
  );
};

