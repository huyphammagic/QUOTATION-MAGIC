import React, { useState } from 'react';
import { X, Phone, Mail, Users, MessageSquare, FileText, Calendar, Check, Clock } from 'lucide-react';
import { CustomerActivityType } from '../../types/crm';
import { logCustomerActivity } from '../../services/crm/customerActivityService';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  companyId?: string;
  user?: { email?: string; name?: string };
  onSuccess?: () => void;
  relatedEntityType?: 'QUOTATION' | 'SHIPMENT' | 'RATE' | 'CONTRACT' | 'CUSTOMER' | 'OPPORTUNITY';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
}

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  companyId = 'default-company',
  user,
  onSuccess,
  relatedEntityType = 'CUSTOMER',
  relatedEntityId,
  relatedEntityNumber
}) => {
  const [activityType, setActivityType] = useState<CustomerActivityType>('CALL');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [nextAction, setNextAction] = useState('');
  const [nextActionDue, setNextActionDue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Vui lòng nhập tóm tắt nội dung cuộc trao đổi / Please enter a summary');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await logCustomerActivity({
        companyId,
        customerId,
        customerName,
        activityType,
        occurredAt: new Date(occurredAt).toISOString(),
        createdBy: user?.email || 'user',
        createdByName: user?.name || 'User',
        relatedEntityType,
        relatedEntityId: relatedEntityId || customerId,
        relatedEntityNumber,
        summary: summary.trim(),
        details: details.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextActionDue: nextActionDue ? new Date(nextActionDue).toISOString() : undefined,
        visibility: 'INTERNAL',
      }, user);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to log activity:', err);
      setError(err?.message || 'Lỗi khi lưu hoạt động');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityOptions: { type: CustomerActivityType; label: string; icon: any }[] = [
    { type: 'CALL', label: 'Gọi điện / Call', icon: Phone },
    { type: 'MEETING', label: 'Gặp mặt / Meeting', icon: Users },
    { type: 'EMAIL', label: 'Email trao đổi', icon: Mail },
    { type: 'CHAT_NOTE', label: 'Zalo / Chat / WhatsApp', icon: MessageSquare },
    { type: 'NOTE_ADDED', label: 'Ghi chú nội bộ', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Ghi nhận tương tác khách hàng</h2>
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
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hình thức tương tác / Interaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activityOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = activityType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setActivityType(opt.type)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời gian diễn ra / Date & Time
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={e => setOccurredAt(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Liên quan đến / Related to
              </label>
              <input
                type="text"
                disabled
                value={relatedEntityNumber ? `${relatedEntityType}: ${relatedEntityNumber}` : 'Khách hàng / Customer'}
                className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tóm tắt nội dung <span className="text-rose-500">*</span> / Summary
            </label>
            <input
              type="text"
              required
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="VD: Trao đổi về mức cước tuyến Hải Phòng - Los Angeles và free time DEM/DET..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chi tiết cuộc trao đổi / Details
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Ghi chú ý kiến khách hàng, yêu cầu giảm cước, điều kiện thanh toán hoặc thời gian đóng hàng..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hành động tiếp theo / Next Action
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                placeholder="VD: Check lại hãng tàu OOCL giá tháng tới..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn hoàn thành / Due Date
              </label>
              <input
                type="date"
                value={nextActionDue}
                onChange={e => setNextActionDue(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu hoạt động'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
