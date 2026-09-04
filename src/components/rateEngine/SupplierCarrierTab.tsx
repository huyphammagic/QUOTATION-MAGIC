import React, { useState } from 'react';
import { 
  Building, 
  Ship, 
  Plane, 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Phone, 
  Mail, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import { SupplierItem, CarrierItem } from '../../types/masterRate';
import { TransportMode } from '../../types/logistics';

interface SupplierCarrierTabProps {
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
  onSaveSupplier: (supplier: SupplierItem) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onSaveCarrier: (carrier: CarrierItem) => Promise<void>;
  onDeleteCarrier: (id: string) => Promise<void>;
}

export const SupplierCarrierTab: React.FC<SupplierCarrierTabProps> = ({
  suppliers,
  carriers,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveCarrier,
  onDeleteCarrier,
}) => {
  const [subTab, setSubTab] = useState<'CARRIERS' | 'SUPPLIERS'>('CARRIERS');

  // Carrier Form state
  const [isCarrierModalOpen, setIsCarrierModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Partial<CarrierItem> | null>(null);

  // Supplier Form state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<SupplierItem> | null>(null);

  const handleOpenCreateCarrier = () => {
    setEditingCarrier({
      id: `carrier-${Date.now()}`,
      code: '',
      name: '',
      mode: 'SEA_FCL',
      rating: 5,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsCarrierModalOpen(true);
  };

  const handleOpenCreateSupplier = () => {
    setEditingSupplier({
      id: `sup-${Date.now()}`,
      code: `SUP-${Date.now().toString().slice(-4)}`,
      name: '',
      type: 'CO_LOADER',
      paymentTerms: 'Credit 30 days',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarrier?.name) return;
    await onSaveCarrier(editingCarrier as CarrierItem);
    setIsCarrierModalOpen(false);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name) return;
    await onSaveSupplier(editingSupplier as SupplierItem);
    setIsSupplierModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Switch Sub-tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('CARRIERS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'CARRIERS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ship className="w-4 h-4" /> Hãng Vận Chuyển / Lines ({carriers.length})
          </button>
          <button
            onClick={() => setSubTab('SUPPLIERS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'SUPPLIERS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" /> Nhà Cung Cấp / Vendors ({suppliers.length})
          </button>
        </div>

        <div>
          {subTab === 'CARRIERS' ? (
            <button
              onClick={handleOpenCreateCarrier}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Hãng Mới
            </button>
          ) : (
            <button
              onClick={handleOpenCreateSupplier}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Nhà Cung Cấp
            </button>
          )}
        </div>
      </div>

      {/* View: Carriers */}
      {subTab === 'CARRIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carriers.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {c.code || 'CARRIER'}
                  </span>
                  <div className="flex items-center text-amber-500 text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="ml-1 font-bold">{c.rating || 5}</span>
                  </div>
                </div>

                <h4 className="font-bold text-slate-800 text-sm mb-1">{c.name}</h4>
                <div className="text-xs text-slate-500 mb-2">
                  Phương thức: <span className="font-medium text-slate-700">{c.mode}</span>
                </div>

                {c.contactPerson && (
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {c.contactPerson} {c.contactPhone ? `(${c.contactPhone})` : ''}
                  </div>
                )}
                {c.contactEmail && (
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" /> {c.contactEmail}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setEditingCarrier(c);
                    setIsCarrierModalOpen(true);
                  }}
                  className="p-1 text-slate-500 hover:text-blue-600 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteCarrier(c.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View: Suppliers */}
      {subTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    {s.code || 'VENDOR'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {s.type}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-sm mb-1">{s.name}</h4>
                <div className="text-xs text-slate-500 mb-2">
                  Thanh toán: <span className="font-medium text-slate-700">{s.paymentTerms || '30 days'}</span>
                </div>

                {s.contactPerson && (
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {s.contactPerson} {s.contactPhone ? `(${s.contactPhone})` : ''}
                  </div>
                )}
                {s.contactEmail && (
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" /> {s.contactEmail}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setEditingSupplier(s);
                    setIsSupplierModalOpen(true);
                  }}
                  className="p-1 text-slate-500 hover:text-purple-600 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSupplier(s.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Carrier */}
      {isCarrierModalOpen && editingCarrier && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-3">
              {editingCarrier.name ? 'Cập Nhật Hãng Vận Chuyển' : 'Thêm Hãng Vận Chuyển Mới'}
            </h3>
            <form onSubmit={handleSaveCarrier} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã Viết Tắt (SCAC / IATA Code)</label>
                <input
                  type="text"
                  value={editingCarrier.code || ''}
                  onChange={(e) => setEditingCarrier(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="VD: MAEU, ONEY, VN..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên Hãng (Carrier Name) *</label>
                <input
                  type="text"
                  required
                  value={editingCarrier.name || ''}
                  onChange={(e) => setEditingCarrier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Maersk Line, Ocean Network Express..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phương Thức</label>
                  <select
                    value={editingCarrier.mode || 'SEA_FCL'}
                    onChange={(e) => setEditingCarrier(prev => ({ ...prev, mode: e.target.value as TransportMode }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="SEA_FCL">Sea Freight</option>
                    <option value="AIR_FREIGHT">Air Freight</option>
                    <option value="INLAND_TRUCKING">Trucking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Đánh Giá (1-5 Sao)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingCarrier.rating || 5}
                    onChange={(e) => setEditingCarrier(prev => ({ ...prev, rating: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Người Liên Hệ</label>
                  <input
                    type="text"
                    value={editingCarrier.contactPerson || ''}
                    onChange={(e) => setEditingCarrier(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={editingCarrier.contactPhone || ''}
                    onChange={(e) => setEditingCarrier(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingCarrier.contactEmail || ''}
                  onChange={(e) => setEditingCarrier(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCarrierModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Lưu Hãng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Supplier */}
      {isSupplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-3">
              {editingSupplier.name ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã NCC (Supplier Code)</label>
                <input
                  type="text"
                  value={editingSupplier.code || ''}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên Nhà Cung Cấp *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Cty CP Vận Tải Biển Đông, Kho Ngoại Quan..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phân Loại Đối Tác</label>
                  <select
                    value={editingSupplier.type || 'CO_LOADER'}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="SHIPPING_LINE">Hãng Tàu (Shipping Line)</option>
                    <option value="AIRLINE">Hãng Hàng Không (Airline)</option>
                    <option value="CO_LOADER">Tổng Đại Lý Gom Hàng (Co-Loader)</option>
                    <option value="TRUCKING_VENDOR">Nhà Xe Nội Địa (Trucking)</option>
                    <option value="CUSTOMS_BROKER">Đại Lý Hải Quan (Broker)</option>
                    <option value="OVERSEAS_AGENT">Đại Lý Quốc Tế (Agent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Điều Khoản Thanh Toán</label>
                  <input
                    type="text"
                    value={editingSupplier.paymentTerms || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="VD: 30 days, Net 15, Cash..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Người Phụ Trách</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPerson || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Điện Thoại</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPhone || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Lưu Nhà Cung Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
