import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle, Save, Check } from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { QuotationFollowUp, FollowUpPriority } from '../../types/quotationCommunication';
import { createFollowUp } from '../../services/quotation/quotationCommunicationService';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  onSuccess?: () => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  quote,
  onSuccess
}) => {
  // Tomorrow's date default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  const [followUpDate, setFollowUpDate] = useState<string>(defaultDate);
  const [priority, setPriority] = useState<FollowUpPriority>('MEDIUM');
  const [note, setNote] = useState<string>('Gọi điện thoại kiểm tra phản hồi của khách hàng về mức cước và hỗ trợ giữ chỗ (booking slot).');
  const [assignedToName, setAssignedToName] = useState<string>(quote.company.salesRepName || 'Sales Representative');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate || !note.trim()) return;

    setIsSubmitting(true);
    try {
      const newFollowUp: QuotationFollowUp = {
        id: `fu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        companyId: 'default-company',
        quotationId: quote.id,
        quotationNumber: quote.quoteNumber,
        customerName: quote.customer.companyName || quote.customer.customerName,
        customerEmail: quote.customer.email,
        followUpDate,
        priority,
        note,
        assignedTo: quote.company.salesRepEmail || 'sales@company.com',
        assignedToName,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createFollowUp(newFollowUp);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating follow-up:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 text-xs">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-sm">LÊN LỊCH CHĂM SÓC BÁO GIÁ</h3>
              <p className="text-[11px] text-blue-200">Báo giá: {quote.quoteNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Khách Hàng:
            </label>
            <input
              type="text"
              readOnly
              value={quote.customer.companyName || quote.customer.customerName}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Ngày Hạn Follow-Up *:
              </label>
              <input
                type="date"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Mức Độ Ưu Tiên:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="LOW">Thấp (Low)</option>
                <option value="MEDIUM">Trung Bình (Medium)</option>
                <option value="HIGH">Cao (High)</option>
                <option value="URGENT">Khẩn Cấp (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Chuyên Viên Phụ Trách:
            </label>
            <input
              type="text"
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900"
              placeholder="Tên nhân viên Sales/Pricing..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Nội Dung / Kế Hoạch Chăm Sóc *:
            </label>
            <textarea
              rows={3}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ghi chú công việc cần làm..."
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Lịch Hẹn'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
