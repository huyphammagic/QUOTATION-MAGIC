import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, User, FileText, CheckCircle2 } from 'lucide-react';
import { createCustomDeadline } from '../../services/deadline/deadlineService';
import { DeadlinePriority } from '../../types/deadline';

interface CreateCustomDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
  user: { uid: string; displayName?: string; email?: string };
  initialShipmentId?: string;
  initialShipmentNumber?: string;
  initialQuotationId?: string;
  initialQuotationNumber?: string;
}

export const CreateCustomDeadlineModal: React.FC<CreateCustomDeadlineModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  companyId,
  user,
  initialShipmentId,
  initialShipmentNumber,
  initialQuotationId,
  initialQuotationNumber,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<DeadlinePriority>('HIGH');
  const [actionRequired, setActionRequired] = useState('');
  const [assignedToName, setAssignedToName] = useState(user.displayName || user.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề hạn chót (Title)');
      return;
    }

    const parsedDate = new Date(`${dueDate}T${dueTime || '17:00'}:00`);
    if (isNaN(parsedDate.getTime())) {
      setError('Ngày giờ hạn chót không hợp lệ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dueAtIso = parsedDate.toISOString();

      let entityType: 'CUSTOM' | 'SHIPMENT' | 'QUOTATION' = 'CUSTOM';
      let entityId = undefined;
      let entityNumber = undefined;

      if (initialShipmentId) {
        entityType = 'SHIPMENT';
        entityId = initialShipmentId;
        entityNumber = initialShipmentNumber;
      } else if (initialQuotationId) {
        entityType = 'QUOTATION';
        entityId = initialQuotationId;
        entityNumber = initialQuotationNumber;
      }

      await createCustomDeadline({
        companyId,
        title: title.trim(),
        description: description.trim(),
        dueAt: dueAtIso,
        timezone: 'Asia/Ho_Chi_Minh',
        priority,
        actionRequired: actionRequired.trim() || undefined,
        assignedTo: user.uid,
        assignedToName: assignedToName.trim() || user.displayName || 'Operator',
        entityType,
        entityId,
        entityNumber,
      }, user);

      onCreated();
      onClose();
    } catch (err: any) {
      console.error('[CreateCustomDeadlineModal] Error:', err);
      setError(err?.message || 'Có lỗi xảy ra khi tạo hạn chót');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thiết Lập Hạn Chót Vận Hành (Custom Deadline)</h3>
              <p className="text-xs text-slate-500">Ghi nhận mốc kiểm soát nghiệp vụ vào Trung Tâm Deadline</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Linked Record Info if applicable */}
          {(initialShipmentNumber || initialQuotationNumber) && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-800 flex items-center justify-between">
              <span className="font-medium">Liên kết hồ sơ:</span>
              <span className="font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200">
                {initialShipmentNumber ? `Lô hàng ${initialShipmentNumber}` : `Báo giá ${initialQuotationNumber}`}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tiêu Đề Hạn Chót <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Khách xác nhận draft B/L, Kiểm tra phí Demurrage, Thu hồi vỏ..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Hạn Ngày (Due Date) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hạn Giờ (Time)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mức Độ Ưu Tiên (Priority)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as DeadlinePriority[]).map((p) => {
                const isSelected = priority === p;
                const labels: Record<DeadlinePriority, { vi: string; color: string }> = {
                  LOW: { vi: 'Thấp', color: 'border-slate-200 text-slate-600 bg-slate-50' },
                  MEDIUM: { vi: 'Vừa', color: 'border-blue-200 text-blue-700 bg-blue-50' },
                  HIGH: { vi: 'Cao', color: 'border-amber-200 text-amber-700 bg-amber-50' },
                  CRITICAL: { vi: 'Khẩn Cấp', color: 'border-red-200 text-red-700 bg-red-50' },
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                      isSelected 
                        ? `${labels[p].color} ring-2 ring-indigo-500/50 shadow-2xs` 
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {labels[p].vi}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Required */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Hành Động Cần Thực Hiện (Action Required)
            </label>
            <input
              type="text"
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="VD: Gọi điện cho khách hàng, gửi email hãng tàu, kiểm tra hệ thống cảng..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Người Phụ Trách (Owner)
            </label>
            <input
              type="text"
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              placeholder="Tên người nhận việc..."
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Ghi Chú Chi Tiết
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm thông tin hoặc lưu ý nghiệp vụ..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-xs"
            >
              {loading ? 'Đang lưu...' : 'Lưu Hạn Chót'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
