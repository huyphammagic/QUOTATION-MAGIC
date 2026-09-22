/**
 * Logistics Exception Detail Drawer - Phase 42
 * Full Exception Inspector, Lifecycle Actions, Append-Only Timeline, Cross-Module Linking
 */

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight, 
  ShieldAlert, 
  RotateCcw, 
  Send,
  ExternalLink,
  Package,
  Calendar,
  Tag,
  MessageSquare,
  FileText
} from 'lucide-react';
import { 
  ShipmentException, 
  ExceptionStatus, 
  ExceptionSeverity, 
  isValidExceptionTransition 
} from '../../types/exception';
import { 
  updateExceptionStatus, 
  assignException, 
  updateExceptionSeverity,
  resolveException, 
  reopenException, 
  dismissException 
} from '../../services/exception/exceptionService';

interface ExceptionDetailDrawerProps {
  exception: ShipmentException | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: ShipmentException) => void;
  onOpenShipmentDetail?: (shipmentId: string) => void;
  currentUser: { uid: string; displayName?: string; email?: string };
  language?: 'vi' | 'en';
}

export const ExceptionDetailDrawer: React.FC<ExceptionDetailDrawerProps> = ({
  exception,
  isOpen,
  onClose,
  onUpdated,
  onOpenShipmentDetail,
  currentUser,
  language = 'vi',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dialog state for Resolve / Reopen / Dismiss / Assign
  const [actionDialog, setActionDialog] = useState<'RESOLVE' | 'REOPEN' | 'DISMISS' | 'ASSIGN' | null>(null);
  const [dialogInput, setDialogInput] = useState('');
  const [assigneeName, setAssigneeName] = useState('');

  if (!isOpen || !exception) return null;

  const isVi = language === 'vi';

  const getSeverityBadge = (severity: ExceptionSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: ExceptionStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ACKNOWLEDGED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const handleStatusChange = async (newStatus: ExceptionStatus, note?: string) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const updated = await updateExceptionStatus(exception.id, newStatus, currentUser, note);
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật trạng thái');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmActionDialog = async () => {
    if (!actionDialog) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);

      let updated: ShipmentException;
      if (actionDialog === 'RESOLVE') {
        updated = await resolveException(exception.id, dialogInput, currentUser);
      } else if (actionDialog === 'REOPEN') {
        updated = await reopenException(exception.id, dialogInput, currentUser);
      } else if (actionDialog === 'DISMISS') {
        updated = await dismissException(exception.id, dialogInput, currentUser);
      } else if (actionDialog === 'ASSIGN') {
        if (!assigneeName.trim()) {
          throw new Error('Vui lòng nhập tên người phụ trách');
        }
        updated = await assignException(exception.id, `user_${Date.now()}`, assigneeName.trim(), currentUser);
      } else {
        return;
      }

      onUpdated(updated);
      setActionDialog(null);
      setDialogInput('');
      setAssigneeName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi thực thi thao tác');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div 
        id="exception-detail-drawer"
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">{exception.id}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getSeverityBadge(exception.severity)}`}>
                  {exception.severity}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(exception.status)}`}>
                  {exception.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-1">{exception.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Quick Action Bar based on Lifecycle */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600 mr-1">
              {isVi ? 'Thao tác điều hành:' : 'Workflow Action:'}
            </span>

            {exception.status === 'OPEN' && (
              <>
                <button
                  disabled={isProcessing}
                  onClick={() => handleStatusChange('ACKNOWLEDGED', 'Tiếp nhận xử lý bất thường')}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isVi ? 'Tiếp Nhận' : 'Acknowledge'}
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleStatusChange('IN_PROGRESS', 'Bắt đầu xử lý bất thường')}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isVi ? 'Bắt Đầu Xử Lý' : 'Start Handling'}
                </button>
              </>
            )}

            {exception.status === 'ACKNOWLEDGED' && (
              <>
                <button
                  disabled={isProcessing}
                  onClick={() => handleStatusChange('IN_PROGRESS', 'Bắt đầu xử lý bất thường')}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isVi ? 'Bắt Đầu Xử Lý' : 'Start Handling'}
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => {
                    setActionDialog('RESOLVE');
                    setDialogInput('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isVi ? 'Đóng Bất Thường (Resolve)' : 'Resolve'}
                </button>
              </>
            )}

            {exception.status === 'IN_PROGRESS' && (
              <button
                disabled={isProcessing}
                onClick={() => {
                  setActionDialog('RESOLVE');
                  setDialogInput('');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isVi ? 'Đóng Bất Thường (Resolve)' : 'Resolve'}
              </button>
            )}

            {(exception.status === 'RESOLVED' || exception.status === 'DISMISSED') && (
              <button
                disabled={isProcessing}
                onClick={() => {
                  setActionDialog('REOPEN');
                  setDialogInput('');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isVi ? 'Mở Lại Bất Thường' : 'Reopen'}
              </button>
            )}

            {/* Assign Button */}
            {exception.status !== 'RESOLVED' && exception.status !== 'DISMISSED' && (
              <button
                disabled={isProcessing}
                onClick={() => {
                  setActionDialog('ASSIGN');
                  setAssigneeName(exception.assignedToName || '');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                {exception.assignedToName ? (isVi ? 'Đổi PIC' : 'Reassign') : (isVi ? 'Phân Công PIC' : 'Assign PIC')}
              </button>
            )}

            {/* Dismiss Button */}
            {exception.status !== 'RESOLVED' && exception.status !== 'DISMISSED' && (
              <button
                disabled={isProcessing}
                onClick={() => {
                  setActionDialog('DISMISS');
                  setDialogInput('');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors ml-auto"
              >
                {isVi ? 'Bỏ qua (Dismiss)' : 'Dismiss'}
              </button>
            )}
          </div>

          {/* Shipment & Customer Context */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                {isVi ? 'Lô Hàng Liên Quan (Linked Shipment)' : 'Linked Shipment'}
              </span>
              {onOpenShipmentDetail && (
                <button
                  onClick={() => onOpenShipmentDetail(exception.shipmentId)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                >
                  <span>{isVi ? 'Xem chi tiết lô hàng' : 'Open Shipment'}</span>
                  <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-100">
              <div>
                <span className="text-slate-400 block">{isVi ? 'Mã Lô Hàng' : 'Shipment No.'}</span>
                <span className="font-semibold text-slate-800">{exception.shipmentNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isVi ? 'Khách Hàng' : 'Customer'}</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {exception.customerName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isVi ? 'Người Phụ Trách' : 'Assigned PIC'}</span>
                <span className="font-semibold text-slate-800">
                  {exception.assignedToName || (isVi ? 'Chưa chỉ định' : 'Unassigned')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isVi ? 'Nguồn Phát Sinh' : 'Source Type'}</span>
                <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                  {exception.sourceType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isVi ? 'Hạn Xử Lý' : 'Due At'}</span>
                <span className="font-medium text-slate-700">
                  {exception.dueAt ? exception.dueAt.substring(0, 16).replace('T', ' ') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isVi ? 'Thời Gian Tạo' : 'Logged At'}</span>
                <span className="font-medium text-slate-700">
                  {exception.createdAt.substring(0, 16).replace('T', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Description & Impact */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              {isVi ? 'Mô Tả Chi Tiết Vấn Đề' : 'Problem Description'}
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
              {exception.description}
            </div>
          </div>

          {/* Resolution Note if resolved */}
          {exception.resolutionNote && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {isVi ? 'Biện Pháp Khắc Phục / Đóng Bất Thường' : 'Resolution Note'}
              </h4>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed">
                <p>{exception.resolutionNote}</p>
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-700 flex items-center justify-between">
                  <span>{isVi ? 'Đóng bởi:' : 'Resolved by:'} <strong>{exception.resolvedBy || 'Operator'}</strong></span>
                  <span>{exception.resolvedAt?.substring(0, 16).replace('T', ' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Append-Only Audit Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              {isVi ? 'Nhật Ký Tiến Trình Xử Lý (Audit Timeline)' : 'Activity & Audit Timeline'}
            </h4>
            
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {exception.timeline && exception.timeline.length > 0 ? (
                exception.timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                    <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs hover:border-indigo-200 transition-colors">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-indigo-700 uppercase">{event.action}</span>
                        <span>{event.timestamp.substring(0, 16).replace('T', ' ')}</span>
                      </div>
                      <p className="text-xs text-slate-800 mt-1 font-medium">
                        {event.note || `Thao tác ${event.action}`}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {isVi ? 'Thực hiện bởi:' : 'By:'} <span className="text-slate-600">{event.performedByName || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic">
                  {isVi ? 'Chưa có lịch sử thao tác bổ sung' : 'No additional timeline events'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Dialog Overlay (Resolve, Reopen, Dismiss, Assign) */}
        {actionDialog && (
          <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {actionDialog === 'RESOLVE' && (isVi ? 'Đóng Bất Thường (Resolve)' : 'Resolve Exception')}
                  {actionDialog === 'REOPEN' && (isVi ? 'Mở Lại Bất Thường (Reopen)' : 'Reopen Exception')}
                  {actionDialog === 'DISMISS' && (isVi ? 'Bỏ Qua Bất Thường (Dismiss)' : 'Dismiss Exception')}
                  {actionDialog === 'ASSIGN' && (isVi ? 'Chỉ Định Người Phụ Trách (Assign PIC)' : 'Assign Operator')}
                </h3>
                <button 
                  onClick={() => setActionDialog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionDialog === 'ASSIGN' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    {isVi ? 'Tên Nhân Viên Điều Hành (PIC):' : 'Operator PIC Name:'}
                  </label>
                  <input
                    type="text"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    placeholder={isVi ? 'VD: Nguyễn Văn A (Customs PIC)' : 'e.g. John Doe'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    {actionDialog === 'RESOLVE' && (isVi ? 'Ghi chú biện pháp xử lý đã hoàn thành (*bắt buộc):' : 'Resolution notes (*required):')}
                    {actionDialog === 'REOPEN' && (isVi ? 'Lý do mở lại bất thường (*bắt buộc):' : 'Reason for reopening (*required):')}
                    {actionDialog === 'DISMISS' && (isVi ? 'Lý do hủy / bỏ qua bất thường (*bắt buộc):' : 'Reason for dismissing (*required):')}
                  </label>
                  <textarea
                    rows={3}
                    value={dialogInput}
                    onChange={(e) => setDialogInput(e.target.value)}
                    placeholder={isVi ? 'Nhập chi tiết biện pháp hoặc căn cứ điều hành...' : 'Provide operational justification...'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActionDialog(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  disabled={isProcessing || (actionDialog === 'ASSIGN' ? !assigneeName.trim() : !dialogInput.trim())}
                  onClick={handleConfirmActionDialog}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isVi ? 'Xác Nhận' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
