import React, { useState } from 'react';
import { SurchargeItem, FeeCategory, SurchargeTransportMode, ChargeLocation } from '../types/logistics';
import { 
  Receipt, Plus, Search, Edit2, Trash2, Tag, Check, X, 
  Ship, Plane, Truck, FileCheck, Layers, MapPin, Anchor, Compass
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
  const [selectedTransportMode, setSelectedTransportMode] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SurchargeItem>>({});

  if (!isOpen) return null;

  const transportModes: { label: string; value: string }[] = [
    { label: 'Tất Cả Hình Thức Vận Chuyển', value: 'ALL' },
    { label: 'Đường biển FCL (Sea FCL)', value: 'SEA_FCL' },
    { label: 'Đường biển LCL (Sea LCL)', value: 'SEA_LCL' },
    { label: 'Đường hàng không (Air Freight)', value: 'AIR' },
    { label: 'Vận tải đường bộ (Trucking)', value: 'ROAD' },
    { label: 'Thủ tục Hải quan (Customs)', value: 'CUSTOMS' },
  ];

  const categories: { label: string; value: string }[] = [
    { label: 'Tất Cả Phân Loại', value: 'ALL' },
    { label: 'Phí Địa Phương (LOCAL_CHARGE)', value: 'LOCAL_CHARGE' },
    { label: 'Phụ Phí Vận Tải (SURCHARGE)', value: 'SURCHARGE' },
    { label: 'Cước Vận Chuyển (FREIGHT)', value: 'FREIGHT' },
    { label: 'Thủ Tục Hải Quan (CUSTOMS)', value: 'CUSTOMS' },
    { label: 'Vận Chuyển Bộ (TRUCKING)', value: 'TRUCKING' },
  ];

  const locations: { label: string; value: string }[] = [
    { label: 'Tất Cả Vị Trí / Chặng', value: 'ALL' },
    { label: 'Cảng / Sân bay đi (POL - Phí đầu xuất)', value: 'POL' },
    { label: 'Cước Chặng Chính (FREIGHT)', value: 'FREIGHT' },
    { label: 'Cảng / Sân bay đến (POD - Phí đầu nhập)', value: 'POD' },
    { label: 'Vị trí khác (OTHER)', value: 'OTHER' },
  ];

  const filteredItems = surcharges.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesMode = selectedTransportMode === 'ALL' || item.transportMode === selectedTransportMode || item.transportMode === 'ALL';
    const matchesLoc = selectedLocation === 'ALL' || item.location === selectedLocation || (!item.location && selectedLocation === 'POL');

    return matchesSearch && matchesCategory && matchesMode && matchesLoc;
  });

  const handleAddNew = () => {
    setEditingItem({
      id: `sur-${Date.now()}`,
      code: '',
      name: '',
      category: 'LOCAL_CHARGE',
      location: 'POL',
      transportMode: 'SEA_FCL',
      unit: 'Container',
      priceUsd: 0,
      priceVnd: 0,
      vatRate: 8,
      currency: 'USD'
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

    onSaveSurcharge({
      id: editingItem.id || `sur-${Date.now()}`,
      code: editingItem.code.toUpperCase().trim(),
      name: editingItem.name.trim(),
      category: editingItem.category || 'LOCAL_CHARGE',
      location: editingItem.location || 'POL',
      transportMode: editingItem.transportMode || 'SEA_FCL',
      unit: editingItem.unit || 'Container',
      priceUsd: Number(editingItem.priceUsd) || 0,
      priceVnd: Number(editingItem.priceVnd) || 0,
      vatRate: Number(editingItem.vatRate) ?? 8,
      currency: editingItem.currency || 'USD',
    });
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

  const getLocationBadgeClass = (loc?: ChargeLocation) => {
    switch (loc) {
      case 'POL': return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 'FREIGHT': return 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
      case 'POD': return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'OTHER': return 'bg-slate-100 text-slate-800 border-slate-300 font-semibold';
      default: return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    }
  };

  const getTransportModeBadge = (mode: SurchargeTransportMode) => {
    switch (mode) {
      case 'SEA_FCL':
        return { label: 'Đường biển FCL', icon: Ship, className: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'SEA_LCL':
        return { label: 'Đường biển LCL', icon: Ship, className: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      case 'AIR':
        return { label: 'Hàng không (Air)', icon: Plane, className: 'bg-cyan-100 text-cyan-900 border-cyan-200' };
      case 'ROAD':
        return { label: 'Đường bộ (Trucking)', icon: Truck, className: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'CUSTOMS':
        return { label: 'Hải quan & C/O', icon: FileCheck, className: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'ALL':
      default:
        return { label: 'Dùng Chung', icon: Layers, className: 'bg-slate-100 text-slate-800 border-slate-200' };
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
                DANH MỤC PHỤ PHÍ MASTER THEO POL / FREIGHT / POD
              </h2>
              <p className="text-xs text-slate-400">
                Phân loại phụ phí theo Vị trí (Cảng đi POL, Chặng chính FREIGHT, Cảng đến POD) & Hình thức vận chuyển
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
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã phí, tên..."
                className="w-full pl-9 pr-3 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Filter Location (POL / FREIGHT / POD) */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-1.5 bg-white rounded border border-emerald-300 text-xs text-emerald-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {locations.map(loc => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>

            {/* Filter Transport Mode */}
            <select
              value={selectedTransportMode}
              onChange={(e) => setSelectedTransportMode(e.target.value)}
              className="px-3 py-1.5 bg-white rounded border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {transportModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>

            {/* Category Filter Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-slate-500 font-bold mb-1">Diễn Giải Hạng Mục Phí *</label>
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
                  <label className="block text-slate-500 font-bold mb-1">Vị Trí Phí (POL / FREIGHT / POD) *</label>
                  <select
                    value={editingItem.location || 'POL'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, location: e.target.value as ChargeLocation }))}
                    className="w-full px-2.5 py-1.5 rounded border border-emerald-300 font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="POL">POL (Phí tại Cảng đi / Sân bay đi)</option>
                    <option value="FREIGHT">FREIGHT (Cước Vận Chuyển Chặng Chính)</option>
                    <option value="POD">POD (Phí tại Cảng đến / Sân bay đến)</option>
                    <option value="OTHER">OTHER (Chi Phí Khác)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Hình Thức Vận Chuyển *</label>
                  <select
                    value={editingItem.transportMode || 'SEA_FCL'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, transportMode: e.target.value as SurchargeTransportMode }))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SEA_FCL">Đường biển FCL (Container)</option>
                    <option value="SEA_LCL">Đường biển LCL (Hàng lẻ)</option>
                    <option value="AIR">Đường hàng không (Air)</option>
                    <option value="ROAD">Vận tải đường bộ (Trucking)</option>
                    <option value="CUSTOMS">Thủ tục Hải quan (Customs)</option>
                    <option value="ALL">Dùng chung (Tất cả)</option>
                  </select>
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

          {/* Surcharge Catalog Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3 w-16">Mã Phí</th>
                  <th className="p-3">Tên Hạng Mục Phí</th>
                  <th className="p-3">Vị Trí (Leg)</th>
                  <th className="p-3">Hình Thức Vận Chuyển</th>
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
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      Chưa tìm thấy phụ phí nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const modeBadge = getTransportModeBadge(item.transportMode || 'ALL');
                    const ModeIcon = modeBadge.icon;

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-900">
                          {item.code}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getLocationBadgeClass(item.location || 'POL')}`}>
                            {item.location || 'POL'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${modeBadge.className}`}>
                            <ModeIcon className="w-3 h-3" />
                            <span>{modeBadge.label}</span>
                          </span>
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
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
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
                    );
                  })
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
