/**
 * Phase 43: Correct / Cancel Shipment Event Modal
 * Provides append-only correction & cancellation mechanism with mandatory audit justifications
 */

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  FileText, 
  Check, 
  AlertCircle,
  RotateCcw,
  Ban
} from 'lucide-react';
import { ShipmentEventRecord } from '../../../types/shipmentEvent';
import { correctShipmentEvent, cancelShipmentEvent } from '../../../services/shipment/eventIntelligenceService';

interface CorrectShipmentEventModalProps {
  event: ShipmentEventRecord;
  isOpen: boolean;
  mode: 'CORRECT' | 'CANCEL';
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { uid: string; displayName?: string; email?: string };
  language?: 'vi' | 'en';
}

export const CorrectShipmentEventModal: React.FC<CorrectShipmentEventModalProps> = ({
  event,
  isOpen,
  mode,
  onClose,
  onSuccess,
  currentUser,
  language = 'vi',
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';
  const isCancel = mode === 'CANCEL';

  const [reason, setReason] = useState('');
  const [newEventTime, setNewEventTime] = useState(
    event.eventTime ? new Date(event.eventTime).toISOString().slice(0, 16) : ''
  );
  const [newLocation, setNewLocation] = useState(event.location || '');
  const [newNotes, setNewNotes] = useState(event.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage(
        isVi 
          ? 'Vui lòng nhập lý do điều chỉnh / hủy bỏ để ghi nhận vào Audit Log' 
          : 'Please provide reason for this action'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isCancel) {
        await cancelShipmentEvent(event.id, { reason: reason.trim() }, currentUser);
      } else {
        await correctShipmentEvent(event.id, {
          reason: reason.trim(),
          eventTime: new Date(newEventTime).toISOString(),
          location: newLocation.trim(),
          notes: newNotes.trim(),
        }, currentUser);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CorrectShipmentEventModal] Error:', err);
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${
          isCancel ? 'bg-rose-50/70 dark:bg-rose-950/30' : 'bg-amber-50/70 dark:bg-amber-950/30'
        }`}>
          <div className="flex items-center gap-2.5">
            {isCancel ? (
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                <Ban className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <RotateCcw className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isCancel 
                  ? (isVi ? 'Hủy bỏ sự kiện tác nghiệp' : 'Cancel Operational Event')
                  : (isVi ? 'Đính chính / Sửa sự kiện' : 'Correct Operational Event')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi ? event.titleVi : event.titleEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Original Event Snapshot Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <p className="text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? 'Thời gian gốc:' : 'Original Time:'}
              </span>{' '}
              {new Date(event.eventTime).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? 'Địa điểm:' : 'Location:'}
              </span>{' '}
              {event.location}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? 'Ghi nhận bởi:' : 'Recorded by:'}
              </span>{' '}
              {event.createdBy} ({event.eventSource})
            </p>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Lý do thực hiện thay đổi * (Bắt buộc lưu Audit Log)' : 'Reason for modification * (Required for Audit Trail)'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder={isVi ? 'Ví dụ: Hãng tàu thông báo dời giờ cập cảng, tài xế nhập nhầm...' : 'e.g. Carrier updated arrival time...'}
              className="w-full text-xs rounded-lg p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* If Mode is CORRECT, allow editing fields */}
          {!isCancel && (
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Thời gian chính xác mới *' : 'Corrected Event Time *'}
                </label>
                <input
                  type="datetime-local"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Địa điểm chính xác mới *' : 'Corrected Location *'}
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Ghi chú đính chính' : 'Correction Notes'}
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs rounded-lg p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isVi ? 'Bỏ qua' : 'Dismiss'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs disabled:opacity-50 ${
                isCancel 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting 
                ? (isVi ? 'Đang xử lý...' : 'Processing...') 
                : isCancel 
                  ? (isVi ? 'Xác nhận hủy sự kiện' : 'Confirm Cancel')
                  : (isVi ? 'Lưu đính chính' : 'Save Correction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
