/**
 * Logistics Create Exception Modal - Phase 42
 * Manual exception registration against active shipments
 */

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Plus, Save } from 'lucide-react';
import { 
  ExceptionSeverity, 
  ExceptionSourceType, 
  ExceptionType, 
  ShipmentException 
} from '../../types/exception';
import { ShipmentRecord } from '../../types/shipment';
import { createException } from '../../services/exception/exceptionService';

interface CreateExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: ShipmentRecord[];
  companyId: string;
  currentUser: { uid: string; displayName?: string; email?: string };
  onCreated: (exception: ShipmentException) => void;
  defaultShipmentId?: string;
  language?: 'vi' | 'en';
}

export const CreateExceptionModal: React.FC<CreateExceptionModalProps> = ({
  isOpen,
  onClose,
  shipments,
  companyId,
  currentUser,
  onCreated,
  defaultShipmentId,
  language = 'vi',
}) => {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(defaultShipmentId || (shipments[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<ExceptionSourceType>('OPERATIONAL');
  const [exceptionType, setExceptionType] = useState<ExceptionType>('OTHER_OPERATIONAL_ISSUE');
  const [severity, setSeverity] = useState<ExceptionSeverity>('HIGH');
  const [assignedToName, setAssignedToName] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isVi = language === 'vi';
  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentId) {
      setErrorMsg(isVi ? 'Vui lòng chọn lô hàng liên quan' : 'Please select a shipment');
      return;
    }
    if (!title.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập tiêu đề bất thường' : 'Title is required');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập mô tả chi tiết' : 'Description is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const targetShipment = shipments.find(s => s.id === selectedShipmentId);
      if (!targetShipment) throw new Error('Không tìm thấy thông tin lô hàng');

      const created = await createException({
        companyId,
        shipmentId: targetShipment.id,
        shipmentNumber: targetShipment.shipmentNumber,
        quotationId: targetShipment.quotationId,
        quotationNumber: targetShipment.quotationNumber,
        customerId: targetShipment.customerId,
        customerName: targetShipment.customerName,
        sourceType,
        exceptionType,
        title: title.trim(),
        description: description.trim(),
        severity,
        assignedTo: assignedToName.trim() ? `user_${Date.now()}` : targetShipment.assignedTo,
        assignedToName: assignedToName.trim() || targetShipment.assignedToName,
        dueAt: dueAt || undefined,
      }, currentUser);

      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tạo bất thường');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isVi ? 'Ghi Nhận Bất Thường Vận Hành (Log Exception)' : 'Log Operational Exception'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi ? 'Theo dõi và kích hoạt quy trình xử lý sự cố lô hàng' : 'Track and dispatch incident resolution'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Shipment Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isVi ? 'Chọn Lô Hàng Liên Quan (*):' : 'Select Linked Shipment (*):'}
            </label>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">{isVi ? '-- Chọn lô hàng --' : '-- Select shipment --'}</option>
              {shipments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.shipmentNumber} - {s.customerName} ({s.origin} → {s.destination}) [{s.status}]
                </option>
              ))}
            </select>
            {selectedShipment && (
              <p className="text-[11px] text-slate-500 mt-1">
                {isVi ? 'Khách hàng:' : 'Customer:'} <strong>{selectedShipment.customerName}</strong> | {isVi ? 'Tuyến:' : 'Lane:'} {selectedShipment.origin} → {selectedShipment.destination}
              </p>
            )}
          </div>

          {/* Exception Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isVi ? 'Tiêu Đề Bất Thường (*):' : 'Exception Title (*):'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isVi ? 'VD: Hải quan yêu cầu kiểm hóa luồng đỏ đột xuất' : 'e.g. Customs physical inspection hold'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Source Type & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isVi ? 'Nguồn Phát Sinh:' : 'Source Type:'}
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as ExceptionSourceType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="OPERATIONAL">{isVi ? 'Vận Hành Chung (Operational)' : 'Operational'}</option>
                <option value="CUSTOMS">{isVi ? 'Thủ Tục Hải Quan (Customs)' : 'Customs'}</option>
                <option value="CARRIER">{isVi ? 'Hãng Tàu / Hãng Bay (Carrier)' : 'Carrier'}</option>
                <option value="CONTAINER">{isVi ? 'Vỏ Container / Kho Bãi' : 'Container / Depot'}</option>
                <option value="DOCUMENT">{isVi ? 'Chứng Từ (Document)' : 'Document'}</option>
                <option value="MILESTONE">{isVi ? 'Mốc Tiến Độ (Milestone)' : 'Milestone'}</option>
                <option value="CUSTOMER">{isVi ? 'Khách Hàng (Customer)' : 'Customer'}</option>
                <option value="SUPPLIER">{isVi ? 'Nhà Cung Cấp (Supplier)' : 'Supplier'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isVi ? 'Mức Độ Nghiêm Trọng (Severity):' : 'Severity Level:'}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ExceptionSeverity)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
              >
                <option value="LOW" className="text-slate-700">LOW (Thấp)</option>
                <option value="MEDIUM" className="text-blue-700">MEDIUM (Trung Bình)</option>
                <option value="HIGH" className="text-amber-700">HIGH (Cao)</option>
                <option value="CRITICAL" className="text-red-700">CRITICAL (Nguy Cấp)</option>
              </select>
            </div>
          </div>

          {/* Assigned PIC & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isVi ? 'Chỉ Định Phụ Trách (Assigned PIC):' : 'Assign to PIC:'}
              </label>
              <input
                type="text"
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                placeholder={selectedShipment?.assignedToName || (isVi ? 'Tên điều phối viên' : 'PIC name')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isVi ? 'Hạn Chót Xử Lý (Due Date):' : 'Resolution Deadline:'}
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isVi ? 'Mô Tả Chi Tiết Sự Cố (*):' : 'Incident Details (*):'}
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVi ? 'Ghi rõ nguyên nhân, hiện trạng và tác động đến lịch trình...' : 'Describe root cause and operational impact...'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isVi ? 'Hủy Bỏ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Tạo Bất Thường' : 'Create Exception')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
