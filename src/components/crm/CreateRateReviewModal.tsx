import React, { useState } from 'react';
import { X, Calendar, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { ShipmentServiceMode } from '../../types/shipment';
import { RateReviewFrequency } from '../../types/crm';
import { createRateReviewSchedule, calculateNextReviewDate } from '../../services/crm/rateReviewService';

interface CreateRateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  companyId?: string;
  user?: { email?: string; name?: string };
  onSuccess?: () => void;
}

export const CreateRateReviewModal: React.FC<CreateRateReviewModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  companyId = 'default-company',
  user,
  onSuccess,
}) => {
  const [origin, setOrigin] = useState('Hai Phong (VNHPH)');
  const [destination, setDestination] = useState('Los Angeles (USLAX)');
  const [serviceMode, setServiceMode] = useState<ShipmentServiceMode>('SEA_FCL');
  const [frequency, setFrequency] = useState<RateReviewFrequency>('MONTHLY');
  const [incoterm, setIncoterm] = useState('FOB');
  const [notes, setNotes] = useState('Định kỳ cập nhật giá mua từ hãng tàu và đề xuất mức cước mới cho khách.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      setError('Vui lòng nhập cảng đi và cảng đến.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const lane = `${origin.trim()} ➔ ${destination.trim()}`;
      const nextDate = calculateNextReviewDate(new Date(), frequency);

      await createRateReviewSchedule({
        companyId,
        customerId,
        customerName,
        serviceMode,
        origin: origin.trim(),
        destination: destination.trim(),
        lane,
        incoterm,
        rateType: 'CUSTOMER_SPECIFIC',
        frequency,
        nextReviewDate: nextDate,
        ownerId: user?.email || 'pricing@company.com',
        ownerName: user?.name || 'Pricing Lead',
        active: true,
        notes: notes.trim() || undefined,
      }, user);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create rate review schedule:', err);
      setError(err?.message || 'Lỗi khi thiết lập lịch review giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Thiết lập chu kỳ Review Giá cước</h2>
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
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chu kỳ Review / Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as RateReviewFrequency)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="WEEKLY">Hàng tuần / Weekly (7 ngày)</option>
                <option value="BIWEEKLY">2 tuần 1 lần / Bi-weekly (14 ngày)</option>
                <option value="MONTHLY">Hàng tháng / Monthly (30 ngày)</option>
                <option value="QUARTERLY">Hàng quý / Quarterly (90 ngày)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú mục tiêu / Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VD: Khách hàng yêu cầu cập nhật giá trước ngày 25 hàng tháng để chốt kế hoạch xuất hàng..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
            <p className="font-semibold mb-0.5">Quy trình Review Giá chuẩn</p>
            <p className="text-indigo-700 leading-relaxed">
              Hệ thống sẽ tạo nhiệm vụ vào Hàng đợi Giá (Price Review Queue) và Action Center khi đến hạn, hiển thị chênh lệch giá mua - giá bán và margin.
            </p>
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-lg shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang kích hoạt...' : 'Kích hoạt lịch Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
