import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle, Save, Check, User, Phone, Mail } from 'lucide-react';
import { CRMFollowUpPriority, CRMFollowUpType, CustomerFollowUp } from '../../types/crm';
import { createCustomerFollowUp } from '../../services/crm/customerFollowUpService';

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyId?: string;
  user?: { email?: string; name?: string };
  onSuccess?: (followUp: CustomerFollowUp) => void;
  relatedEntityType?: 'QUOTATION' | 'SHIPMENT' | 'RATE' | 'CONTRACT' | 'CUSTOMER' | 'OPPORTUNITY';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  initialType?: CRMFollowUpType;
  initialPriority?: CRMFollowUpPriority;
  initialNotes?: string;
}

export const CreateFollowUpModal: React.FC<CreateFollowUpModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  contactPerson = '',
  contactEmail = '',
  contactPhone = '',
  companyId = 'default-company',
  user,
  onSuccess,
  relatedEntityType = 'CUSTOMER',
  relatedEntityId,
  relatedEntityNumber,
  initialType = 'CALL',
  initialPriority = 'MEDIUM',
  initialNotes = ''
}) => {
  // Tomorrow's date default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const defaultDateTime = tomorrow.toISOString().slice(0, 16);

  const [followUpType, setFollowUpType] = useState<CRMFollowUpType>(initialType);
  const [priority, setPriority] = useState<CRMFollowUpPriority>(initialPriority);
  const [dueDate, setDueDate] = useState<string>(defaultDateTime);
  const [notes, setNotes] = useState<string>(initialNotes || 'Gọi điện thoại kiểm tra phản hồi và nhu cầu vận chuyển của khách hàng.');
  const [nextAction, setNextAction] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>(user?.name || 'Sales Rep');
  const [ownerId, setOwnerId] = useState<string>(user?.email || 'sales@company.com');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || !notes.trim()) {
      setError('Vui lòng điền ngày hẹn và nội dung cần follow-up.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createCustomerFollowUp({
        companyId,
        customerId,
        customerName,
        contactPerson: contactPerson || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        relatedEntityType,
        relatedEntityId: relatedEntityId || customerId,
        relatedEntityNumber,
        ownerId,
        ownerName,
        followUpType,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        status: 'OPEN',
        notes: notes.trim(),
        nextAction: nextAction.trim() || undefined,
      }, user);

      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create follow-up:', err);
      setError(err?.message || 'Lỗi khi tạo lịch follow-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Lên lịch chăm sóc khách hàng</h2>
            <p className="text-xs text-slate-500 font-medium">{customerName} {relatedEntityNumber ? `(${relatedEntityNumber})` : ''}</p>
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
                Hình thức chăm sóc / Type
              </label>
              <select
                value={followUpType}
                onChange={e => setFollowUpType(e.target.value as CRMFollowUpType)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="CALL">Cuộc gọi điện / Phone Call</option>
                <option value="EMAIL">Email follow-up</option>
                <option value="MEETING">Gặp mặt trực tiếp / Meeting</option>
                <option value="RATE_CHECK">Rà soát cước / Rate Check</option>
                <option value="QUOTATION_FOLLOWUP">Theo dõi báo giá / Quote follow-up</option>
                <option value="SHIPMENT_CARE">Hỗ trợ lô hàng / Shipment Care</option>
                <option value="CONTRACT_RENEWAL">Tái ký hợp đồng / Renewal</option>
                <option value="GENERAL">Chung / General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức độ ưu tiên / Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as CRMFollowUpPriority)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="LOW">Thấp / Low</option>
                <option value="MEDIUM">Trung bình / Medium</option>
                <option value="HIGH">Cao / High</option>
                <option value="URGENT">Khẩn cấp / Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn chót chăm sóc <span className="text-rose-500">*</span> / Due Date
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Người phụ trách / Assigned To
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung công việc <span className="text-rose-500">*</span> / Notes
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VD: Gọi kiểm tra xem khách đã chốt booking lô 3x40HC đi LAX chưa, giải thích lịch tàu cập bến..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dự kiến hành động tiếp sau / Next Action
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="VD: Nếu đồng ý thì tạo Shipment và gửi booking confirmation..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <p className="font-semibold mb-0.5">Tích hợp Action Center tự động</p>
            <p className="text-blue-600 leading-relaxed">
              Lịch theo dõi này sẽ tự động xuất hiện trong Action Center (Phase 44) và nhắc việc khi đến hạn chót.
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang tạo...' : 'Lên lịch chăm sóc'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
