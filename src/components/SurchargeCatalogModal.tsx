import React, { useState } from 'react';
import { SurchargeItem, FeeCategory, LineItem } from '../types/logistics';
import { 
  Receipt, Plus, Search, Edit2, Trash2, Tag, Check, X, 
  Zap, DollarSign, RefreshCw 
} from 'lucide-react';

interface SurchargeCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  surcharges: SurchargeItem[];
  exchangeRate: number;
  onSaveSurcharge: (item: SurchargeItem) => void;
  onDeleteSurcharge: (id: string) => void;
  onAddSurchargeToQuote?: (surcharge: SurchargeItem) => void;
}

export const SurchargeCatalogModal: React.FC<SurchargeCatalogModalProps> = ({
  isOpen,
  onClose,
  surcharges,
  exchangeRate,
  onSaveSurcharge,
  onDeleteSurcharge,
  onAddSurchargeToQuote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SurchargeItem>>({});

  if (!isOpen) return null;

  const categories: { label: string; value: string }[] = [
    { label: 'Tất Cả Phụ Phí', value: 'ALL' },
    { label: 'Phí Địa Phương (Local Charge)', value: 'LOCAL_CHARGE' },
    { label: 'Phụ Phí Vận Tải (Surcharge)', value: 'SURCHARGE' },
    { label: 'Cước Vận Chuyển (Freight)', value: 'FREIGHT' },
    { label: 'Thủ Tục Hải Quan (Customs)', value: 'CUSTOMS' },
    { label: 'Vận Chuyển Bộ (Trucking)', value: 'TRUCKING' },
  ];

  const filteredItems = surcharges.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddNew = () => {
    setEditingItem({
      id: `sur-${Date.now()}`,
      code: '',
      name: '',
      category: 'LOCAL_CHARGE',
      unit: 'Container',
      priceUsd: 0,
      priceVnd: 0,
      vatRate: 8,
      currency: 'USD',
      description: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (item: SurchargeItem) => {
    setEditingItem({ ...item });
    setIsEditing(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.code || !editingItem.name) return;

    onSaveSurcharge(editingItem as SurchargeItem);
    setIsEditing(false);
    setEditingItem({});
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-700 rounded-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                DANH MỤC PHỤ PHÍ & LOCAL CHARGES MASTER
              </h2>
              <p className="text-xs text-slate-400">
                Bảng phí chuẩn ngành Logistics, đơn giá niêm yết & cấu trúc thuế VAT
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã phí, tên phụ phí..."
                className="w-full pl-9 pr-3 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Category Filter Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-500 font-mono">
              Tổng: {filteredItems.length} Phụ Phí
            </span>
            <button
              onClick={handleAddNew}
              className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mã Phí Mới</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Form Create/Edit */}
          {isEditing && (
            <form onSubmit={handleSubmitForm} className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-700" />
                  {editingItem.id ? 'Hiệu Chỉnh Hạng Mục Phí' : 'Tạo Mã Phí Mới'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Mã Phí Viết Tắt *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.code || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="THC, BAF, BL..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-500 font-bold mb-1">Diễn Giải / Tên Tiếng Anh & Tiếng Việt *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Terminal Handling Charge (THC)..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Phân Loại Phí *</label>
                  <select
                    value={editingItem.category || 'LOCAL_CHARGE'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, category: e.target.value as FeeCategory }))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOCAL_CHARGE">LOCAL_CHARGE (Phí địa phương)</option>
                    <option value="SURCHARGE">SURCHARGE (Phụ phí)</option>
                    <option value="FREIGHT">FREIGHT (Cước vận chuyển)</option>
                    <option value="CUSTOMS">CUSTOMS (Hải quan)</option>
                    <option value="TRUCKING">TRUCKING (Vận tải bộ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Đơn Vị Tính *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Container / Bill / CBM / KGS..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Đơn Giá Niêm Yết USD</label>
                  <input
                    type="number"
                    step="any"
                    value={editingItem.priceUsd || 0}
                    onChange={(e) => {
                      const usd = Number(e.target.value) || 0;
                      setEditingItem(prev => ({ 
                        ...prev, 
                        priceUsd: usd,
                        priceVnd: prev.currency === 'VND' ? prev.priceVnd : Math.round(usd * exchangeRate)
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Đơn Giá Niêm Yết VND</label>
                  <input
                    type="number"
                    step="1000"
                    value={editingItem.priceVnd || 0}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, priceVnd: Number(e.target.value) || 0 }))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Loại Tiền Tệ & VAT Rate</label>
                  <div className="flex gap-2">
                    <select
                      value={editingItem.currency || 'USD'}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, currency: e.target.value as 'USD' | 'VND' }))}
                      className="w-1/2 px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                    >
                      <option value="USD">USD</option>
                      <option value="VND">VND</option>
                    </select>
                    <select
                      value={editingItem.vatRate ?? 8}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, vatRate: Number(e.target.value) }))}
                      className="w-1/2 px-2 py-1.5 rounded border border-slate-300 font-bold text-slate-900"
                    >
                      <option value={0}>VAT 0%</option>
                      <option value={5}>VAT 5%</option>
                      <option value={8}>VAT 8%</option>
                      <option value={10}>VAT 10%</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-slate-500 font-bold mb-1">Ghi Chú Phạm Vi Áp Dụng (Description)</label>
                  <input
                    type="text"
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Áp dụng cho container 20/40ft tại các cảng TP.HCM..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded shadow-2xs flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Mã Phí Vào Danh Mục</span>
                </button>
              </div>
            </form>
          )}

          {/* Surcharge Catalog Grid */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3 w-16">Mã Phí</th>
                  <th className="p-3">Diễn Giải Hạng Mục Phí</th>
                  <th className="p-3">Phân Loại</th>
                  <th className="p-3">Đơn Vị</th>
                  <th className="p-3 text-right">Giá USD</th>
                  <th className="p-3 text-right">Giá VND</th>
                  <th className="p-3 text-center">VAT</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      Chưa tìm thấy phụ phí nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-900">
                        {item.code}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {item.unit}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ${item.priceUsd.toLocaleString('en-US', { minimumFractionDigits: item.priceUsd % 1 === 0 ? 0 : 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {item.priceVnd.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {item.vatRate}%
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {onAddSurchargeToQuote && (
                          <button
                            onClick={() => {
                              onAddSurchargeToQuote(item);
                            }}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Thêm phụ phí này vào Báo Giá đang lập"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm Vào Báo Giá</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Xóa mã phí ${item.code} - ${item.name} khỏi danh mục?`)) {
                              onDeleteSurcharge(item.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>Tỷ giá quy đổi quy định: 1 USD = {exchangeRate.toLocaleString()} VND</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
