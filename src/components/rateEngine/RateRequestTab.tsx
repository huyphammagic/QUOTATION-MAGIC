import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ArrowRight, 
  User, 
  Building,
  Flag,
  Calendar,
  X
} from 'lucide-react';
import { RateRequestItem, RateMasterItem } from '../../types/masterRate';
import { TransportMode, Currency, ContainerType } from '../../types/logistics';
import { formatUSD, formatVND } from '../../utils/formatters';

interface RateRequestTabProps {
  requests: RateRequestItem[];
  rates: RateMasterItem[];
  onSaveRequest: (request: RateRequestItem) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
}

export const RateRequestTab: React.FC<RateRequestTabProps> = ({
  requests,
  rates,
  onSaveRequest,
  onDeleteRequest,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<RateRequestItem> | null>(null);
  const [searchKw, setSearchKw] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (searchKw.trim() !== '') {
      const kw = searchKw.toLowerCase();
      const match = 
        req.requestNumber.toLowerCase().includes(kw) ||
        req.customerName.toLowerCase().includes(kw) ||
        req.origin.toLowerCase().includes(kw) ||
        req.destination.toLowerCase().includes(kw) ||
        req.salesPersonName.toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    setEditingRequest({
      id: `pr-${Date.now()}`,
      requestNumber: `PR-${Date.now().toString().slice(-6)}`,
      customerName: '',
      salesPersonId: 'sales-01',
      salesPersonName: 'Sales Executive',
      transportMode: 'SEA_FCL',
      shipmentType: 'FCL',
      origin: 'Ho Chi Minh (Cat Lai)',
      destination: 'Los Angeles (USLAX)',
      commodity: 'General Cargo',
      containerType: "40'HC",
      quantity: 1,
      currency: 'USD',
      requiredDate: due,
      priority: 'NORMAL',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest?.customerName || !editingRequest?.origin || !editingRequest?.destination) {
      alert('Vui lòng điền đủ Tên khách hàng, Cảng đi và Cảng đến.');
      return;
    }
    await onSaveRequest(editingRequest as RateRequestItem);
    setIsCreateOpen(false);
    setEditingRequest(null);
  };

  const getPriorityBadge = (p: RateRequestItem['priority']) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">HỎA TỐC</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">ƯU TIÊN CAO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">BÌNH THƯỜNG</span>;
    }
  };

  const getStatusBadge = (st: RateRequestItem['status']) => {
    switch (st) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Đã Phản Hồi</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Đang Báo Giá</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Mới Gửi</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số yêu cầu, khách hàng, tuyến đường, sales..."
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="ALL">Tất cả Trạng thái</option>
          <option value="SUBMITTED">Mới Gửi (Submitted)</option>
          <option value="IN_PROGRESS">Đang Xử Lý (In Progress)</option>
          <option value="COMPLETED">Đã Báo Giá Xong (Completed)</option>
        </select>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          id="btn-create-rate-request"
        >
          <Plus className="w-4 h-4" /> Tạo Yêu Cầu Giá Mới (Sales Request)
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Chưa có yêu cầu báo giá nào</h4>
            <p className="text-xs text-slate-500 mt-1">
              Sales có thể gửi yêu cầu hỏi giá cước mới từ các Hãng tàu/Đại lý tới bộ phận Pricing.
            </p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div 
              key={req.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-700">{req.requestNumber}</span>
                  {getPriorityBadge(req.priority)}
                  {getStatusBadge(req.status)}
                  <span className="text-xs font-semibold text-slate-800 ml-2">
                    Khách hàng: {req.customerName}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-1 font-bold">
                    <span>{req.origin}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{req.destination}</span>
                  </div>
                  <div className="text-slate-500">
                    {req.transportMode} • {req.containerType || 'Hàng lẻ/Air'} • Qty: {req.quantity || 1}
                  </div>
                  {req.commodity && (
                    <div className="text-slate-500">
                      Hàng: {req.commodity}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Sales: <span className="text-slate-700 font-medium">{req.salesPersonName}</span> • Cần trước: <span className="font-mono font-bold text-rose-600">{req.requiredDate}</span>
                </div>

                {req.responseNotes && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mt-1">
                    <span className="font-bold">Phản hồi từ Pricing:</span> {req.responseNotes}
                  </div>
                )}
              </div>

              {/* Status Update Quick Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'SUBMITTED' && (
                  <button
                    onClick={() => onSaveRequest({ ...req, status: 'IN_PROGRESS', updatedAt: new Date().toISOString() })}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold"
                  >
                    Tiếp Nhận (Take)
                  </button>
                )}
                {req.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      const notes = prompt('Nhập thông tin giá phản hồi cho Sales:');
                      if (notes) {
                        onSaveRequest({
                          ...req,
                          status: 'COMPLETED',
                          responseNotes: notes,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Hoàn Tất Báo Giá
                  </button>
                )}
                <button
                  onClick={() => onDeleteRequest(req.id)}
                  className="px-2 py-1.5 text-slate-400 hover:text-rose-600 text-xs"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create Request */}
      {isCreateOpen && editingRequest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Tạo Yêu Cầu Xin Giá (Sales Pricing Request)
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tên Khách Hàng / Dự Án <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingRequest.customerName || ''}
                  onChange={(e) => setEditingRequest(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="VD: Công ty TNHH Xuất Nhập Khẩu Nam Á"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cảng Đi / POL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRequest.origin || ''}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, origin: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cảng Đến / POD <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRequest.destination || ''}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, destination: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phương Thức
                  </label>
                  <select
                    value={editingRequest.transportMode || 'SEA_FCL'}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, transportMode: e.target.value as TransportMode }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="SEA_FCL">Sea FCL</option>
                    <option value="SEA_LCL">Sea LCL</option>
                    <option value="AIR_FREIGHT">Air Freight</option>
                    <option value="INLAND_TRUCKING">Trucking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Loại Cont / Thiết Bị
                  </label>
                  <input
                    type="text"
                    value={editingRequest.containerType || ''}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, containerType: e.target.value as ContainerType }))}
                    placeholder="VD: 40HC, 20GP, 5 CBM..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mức Độ Ưu Tiên
                  </label>
                  <select
                    value={editingRequest.priority || 'NORMAL'}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="NORMAL">Bình Thường (Normal)</option>
                    <option value="HIGH">Ưu Tiên Cao (High)</option>
                    <option value="URGENT">Hỏa Tốc (Urgent - Trong 2h)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hạn Phản Hồi (Due Date)
                  </label>
                  <input
                    type="date"
                    value={editingRequest.requiredDate || ''}
                    onChange={(e) => setEditingRequest(prev => ({ ...prev, requiredDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Gửi Yêu Cầu Đến Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
