import React, { useState } from 'react';
import { X, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { ShipmentServiceMode } from '../../types/shipment';
import { OpportunityStage, CustomerOpportunity } from '../../types/crm';
import { createCustomerOpportunity } from '../../services/crm/customerOpportunityService';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  companyId?: string;
  user?: { email?: string; name?: string };
  onSuccess?: (opp: CustomerOpportunity) => void;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  companyId = 'default-company',
  user,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [origin, setOrigin] = useState('Hai Phong Port (VNHPH)');
  const [destination, setDestination] = useState('Los Angeles Port (USLAX)');
  const [serviceMode, setServiceMode] = useState<ShipmentServiceMode>('SEA_FCL');
  const [incoterm, setIncoterm] = useState('FOB');
  const [estimatedFrequency, setEstimatedFrequency] = useState('4 x 40HC / tháng');
  const [estimatedVolume, setEstimatedVolume] = useState('4 containers');
  const [estimatedValue, setEstimatedValue] = useState<number>(12000);
  const [stage, setStage] = useState<OpportunityStage>('NEW');
  const [probability, setProbability] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('Khảo sát lịch đóng hàng và xin báo giá từ hãng tàu');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề cơ hội, cảng đi và cảng đến.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const lane = `${origin} ➔ ${destination}`;
      const created = await createCustomerOpportunity({
        companyId,
        customerId,
        customerName,
        title: title.trim(),
        lane,
        origin: origin.trim(),
        destination: destination.trim(),
        serviceMode,
        incoterm,
        estimatedFrequency,
        estimatedVolume,
        estimatedValue,
        currency: 'USD',
        ownerId: user?.email || 'sales@company.com',
        ownerName: user?.name || 'Sales Rep',
        stage,
        probability,
        notes: notes.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
      }, user);

      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create opportunity:', err);
      setError(err?.message || 'Lỗi khi tạo cơ hội bán hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Tạo cơ hội kinh doanh mới (Sales Opportunity)</h2>
            <p className="text-xs text-slate-500 font-medium">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên cơ hội kinh doanh <span className="text-rose-500">*</span> / Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Dự án xuất khẩu hàng may mặc đi Mỹ Q3/2026..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cảng / Điểm đi <span className="text-rose-500">*</span> / Origin
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="VD: Hai Phong / Cat Lai..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cảng / Điểm đến <span className="text-rose-500">*</span> / Destination
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="VD: Los Angeles / Hamburg..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phương thức / Mode</label>
              <select
                value={serviceMode}
                onChange={e => setServiceMode(e.target.value as ShipmentServiceMode)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="SEA_FCL">Đường biển nguyên cont (FCL)</option>
                <option value="SEA_LCL">Đường biển hàng lẻ (LCL)</option>
                <option value="AIR">Đường hàng không (AIR)</option>
                <option value="TRUCKING">Vận tải bộ (Trucking)</option>
                <option value="CUSTOMS">Khai báo hải quan (Customs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incoterm</label>
              <select
                value={incoterm}
                onChange={e => setIncoterm(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="CFR">CFR</option>
                <option value="EXW">EXW</option>
                <option value="DDP">DDP</option>
                <option value="DAP">DAP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giai đoạn / Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as OpportunityStage)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="NEW">Mới nhận / New</option>
                <option value="QUALIFICATION">Khảo sát / Qualification</option>
                <option value="QUOTATION">Chào giá / Quotation</option>
                <option value="FOLLOW_UP">Chăm sóc / Follow-up</option>
                <option value="NEGOTIATION">Thương lượng / Negotiation</option>
                <option value="WON">Thành công / Won</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sản lượng dự kiến / Volume</label>
              <input
                type="text"
                value={estimatedVolume}
                onChange={e => setEstimatedVolume(e.target.value)}
                placeholder="VD: 4 cont 40HC"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trị giá ước tính (USD)</label>
              <input
                type="number"
                value={estimatedValue}
                onChange={e => setEstimatedValue(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ lệ thành công: {probability}%</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={e => setProbability(Number(e.target.value))}
                className="w-full h-2 mt-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động tiếp theo / Next Action</label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="VD: Lập báo giá chi tiết và gửi khách hàng qua portal..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú yêu cầu đặc biệt / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Yêu cầu free time 14 ngày, cần hun trùng hoặc chứng thư xuất xứ C/O..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Hủy bỏ / Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu cơ hội'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
