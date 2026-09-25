import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  User, 
  Building2, 
  FileText, 
  Ship, 
  Plus, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Send, 
  PauseCircle, 
  Calendar, 
  History, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  DeadlineEntity, 
  DeadlineStatus, 
  DeadlinePriority, 
  ActionWaitingReason, 
  ActionSubtask,
  DeadlineAuditLog 
} from '../../types/deadline';
import { 
  calculateTimeRemaining, 
  updateBusinessActionStatus, 
  updateBusinessActionSubtasks, 
  reassignBusinessAction, 
  getBusinessActionAuditTrail,
  snoozeDeadline
} from '../../services/deadline/deadlineService';
import { ACTION_CENTER_I18N } from '../../i18n/actionCenter';

interface ActionExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: DeadlineEntity | null;
  companyId: string;
  user: { uid: string; displayName?: string; email?: string };
  onActionUpdated: () => void;
  onOpenQuotation?: (quotationId: string) => void;
  onOpenShipment?: (shipmentId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenRateHub?: () => void;
  onOpenOpportunity?: (opportunityId: string) => void;
  onOpenDecisionWorkspace?: (decisionId?: string) => void;
  isVi?: boolean;
}

export const ActionExecutionModal: React.FC<ActionExecutionModalProps> = ({
  isOpen,
  onClose,
  action,
  companyId,
  user,
  onActionUpdated,
  onOpenQuotation,
  onOpenShipment,
  onOpenCustomer,
  onOpenRateHub,
  onOpenOpportunity,
  onOpenDecisionWorkspace,
  isVi = true,
}) => {
  if (!isOpen || !action) return null;

  const t = isVi ? ACTION_CENTER_I18N.vi : ACTION_CENTER_I18N.en;

  // Local state for interactive operations
  const [currentStatus, setCurrentStatus] = useState<DeadlineStatus>(action.status);
  const [waitingReason, setWaitingReason] = useState<ActionWaitingReason>(action.waitingReason || 'NONE');
  const [waitingNote, setWaitingNote] = useState<string>(action.waitingReasonNote || '');
  const [completionNote, setCompletionNote] = useState<string>('');
  const [subtasks, setSubtasks] = useState<ActionSubtask[]>(action.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');
  const [assignedToName, setAssignedToName] = useState<string>(action.assignedToName || '');
  const [assignedToUid, setAssignedToUid] = useState<string>(action.assignedTo || '');
  const [activeSubTab, setActiveSubTab] = useState<'EXECUTE' | 'SUBTASKS' | 'AUDIT'>('EXECUTE');
  const [auditLogs, setAuditLogs] = useState<DeadlineAuditLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaitingForm, setShowWaitingForm] = useState(action.status === 'WAITING');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [showReassignForm, setShowReassignForm] = useState(false);

  // Time remaining calculation
  const timeInfo = calculateTimeRemaining(action.dueAt, action.snoozedUntil);

  useEffect(() => {
    if (action) {
      setCurrentStatus(action.status);
      setWaitingReason(action.waitingReason || 'NONE');
      setWaitingNote(action.waitingReasonNote || '');
      setSubtasks(action.subtasks || []);
      setAssignedToName(action.assignedToName || '');
      setAssignedToUid(action.assignedTo || '');
      setShowWaitingForm(action.status === 'WAITING');
      setShowCompletionForm(false);
      setShowSnoozeOptions(false);
      setShowReassignForm(false);
    }
  }, [action]);

  // Load audit trail on tab switch
  useEffect(() => {
    if (activeSubTab === 'AUDIT' && action?.id) {
      getBusinessActionAuditTrail(action.id, companyId).then(setAuditLogs);
    }
  }, [activeSubTab, action?.id, companyId]);

  // Subtask progress
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Handler: Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string) => {
    const updated = subtasks.map(s => {
      if (s.id === subtaskId) {
        const nextDone = !s.isCompleted;
        return {
          ...s,
          isCompleted: nextDone,
          completedAt: nextDone ? new Date().toISOString() : undefined,
          completedBy: nextDone ? (user.displayName || user.email || 'User') : undefined,
        };
      }
      return s;
    });
    setSubtasks(updated);
    await updateBusinessActionSubtasks(action.id, companyId, updated, user);
    onActionUpdated();
  };

  // Handler: Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: ActionSubtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      isCompleted: false,
    };

    const updated = [...subtasks, newSubtask];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    await updateBusinessActionSubtasks(action.id, companyId, updated, user);
    onActionUpdated();
  };

  // Handler: Change Status to IN_PROGRESS
  const handleSetInProgress = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessActionStatus(action.id, companyId, 'IN_PROGRESS', user, {
        reason: 'Bắt đầu tiếp nhận và xử lý hành động',
      });
      setCurrentStatus('IN_PROGRESS');
      setShowWaitingForm(false);
      setShowCompletionForm(false);
      onActionUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Change Status to WAITING
  const handleConfirmWaiting = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessActionStatus(action.id, companyId, 'WAITING', user, {
        waitingReason,
        waitingReasonNote: waitingNote,
        reason: `Chuyển sang hàng đợi chờ: ${waitingReason} - ${waitingNote}`,
      });
      setCurrentStatus('WAITING');
      setShowWaitingForm(false);
      onActionUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Change Status to BLOCKED
  const handleSetBlocked = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessActionStatus(action.id, companyId, 'BLOCKED', user, {
        reason: 'Tạm dừng hành động do gặp trở ngại vận hành',
      });
      setCurrentStatus('BLOCKED');
      setShowWaitingForm(false);
      onActionUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Confirm Completion
  const handleConfirmCompletion = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessActionStatus(action.id, companyId, 'COMPLETED', user, {
        completionNote: completionNote || 'Hoàn tất xử lý hành động nghiệp vụ',
        reason: 'Xác nhận hoàn tất mục tiêu hành động',
      });
      setCurrentStatus('COMPLETED');
      setShowCompletionForm(false);
      onActionUpdated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Quick Snooze
  const handleQuickSnooze = async (hours: number, label: string) => {
    setIsSubmitting(true);
    try {
      const now = new Date();
      const snoozedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      await snoozeDeadline(action.id, snoozedUntil, user, `Tạm hoãn nhanh ${label}`);
      setCurrentStatus('SNOOZED');
      setShowSnoozeOptions(false);
      onActionUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Reassign
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedToName.trim()) return;

    setIsSubmitting(true);
    try {
      await reassignBusinessAction(
        action.id,
        companyId,
        assignedToUid || user.uid,
        assignedToName.trim(),
        action.teamId,
        user,
        `Giao trách nhiệm hành động cho ${assignedToName.trim()}`
      );
      setShowReassignForm(false);
      onActionUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action title & type translation
  const actionTypeKey = action.actionType || action.deadlineType;
  const actionTypeLabel = (t.actionTypes as any)[actionTypeKey] || actionTypeKey;
  const sourceEntityKey = action.sourceEntityType || action.entityType;
  const sourceEntityLabel = (t.entityTypes as any)[sourceEntityKey] || sourceEntityKey;
  const statusLabel = (t.statuses as any)[currentStatus] || currentStatus;
  const priorityLabel = (t.priorities as any)[action.priority] || action.priority;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${timeInfo.badgeColorClass}`}>
                {isVi ? timeInfo.formattedTextVi : timeInfo.formattedTextEn}
              </span>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {sourceEntityLabel}
              </span>

              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {actionTypeLabel}
              </span>

              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                action.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                action.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                action.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {priorityLabel}
              </span>

              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                {statusLabel}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {action.title}
            </h3>

            {action.entityNumber && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>Mã tham chiếu:</span>
                <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {action.entityNumber}
                </span>
                {action.customerName && (
                  <span>• Khách hàng: <strong className="text-slate-700">{action.customerName}</strong></span>
                )}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center border-b border-slate-100 px-5 bg-white text-xs">
          <button
            onClick={() => setActiveSubTab('EXECUTE')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'EXECUTE'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.tabs.execute}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SUBTASKS')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'SUBTASKS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{t.tabs.subtasks}</span>
            {totalSubtasks > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('AUDIT')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'AUDIT'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.tabs.audit}</span>
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">

          {/* TAB 1: EXECUTE & DETAILS */}
          {activeSubTab === 'EXECUTE' && (
            <div className="space-y-4">
              {/* Description & Action Required */}
              {action.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800 mr-1.5">{t.details.description}:</span>
                  {action.description}
                </div>
              )}

              {action.actionRequired && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{t.details.actionRequired}: </span>
                    <span>{action.actionRequired}</span>
                  </div>
                </div>
              )}

              {/* Waiting Status Alert */}
              {currentStatus === 'WAITING' && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      {t.details.waitingReason}: {(t.waitingReasons as any)[waitingReason] || waitingReason}
                    </span>
                    {action.waitingReasonNote && (
                      <p className="text-xs text-purple-800">{action.waitingReasonNote}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowWaitingForm(true)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-100"
                  >
                    Đổi lý do chờ
                  </button>
                </div>
              )}

              {/* Source Entity Direct Link CTAs */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    {t.details.crossLinks}
                  </span>
                  <span className="text-[11px] text-slate-400">Điều hướng trực tiếp không tải lại trang</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {action.relatedQuotationId && onOpenQuotation && (
                    <button
                      onClick={() => { onClose(); onOpenQuotation(action.relatedQuotationId!); }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t.buttons.openQuotation}</span>
                    </button>
                  )}

                  {action.relatedShipmentId && onOpenShipment && (
                    <button
                      onClick={() => { onClose(); onOpenShipment(action.relatedShipmentId!); }}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Ship className="w-3.5 h-3.5" />
                      <span>{t.buttons.openShipment}</span>
                    </button>
                  )}

                  {action.relatedCustomerId && onOpenCustomer && (
                    <button
                      onClick={() => { onClose(); onOpenCustomer(action.relatedCustomerId!); }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{t.buttons.openCustomer}</span>
                    </button>
                  )}

                  {onOpenRateHub && (
                    <button
                      onClick={() => { onClose(); onOpenRateHub(); }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{t.buttons.openRate}</span>
                    </button>
                  )}

                  {action.relatedOpportunityId && onOpenOpportunity && (
                    <button
                      onClick={() => { onClose(); onOpenOpportunity(action.relatedOpportunityId!); }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t.buttons.openOpportunity}</span>
                    </button>
                  )}

                  {onOpenDecisionWorkspace && (
                    <button
                      onClick={() => { onClose(); onOpenDecisionWorkspace(action.relatedDecisionId); }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{t.buttons.openDecision}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Assignee & Timing Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{t.details.assignedTo}</span>
                    <p className="font-bold text-slate-800 text-xs">
                      {assignedToName ? `👤 ${assignedToName}` : '⚠️ Chưa phân công PIC'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReassignForm(!showReassignForm)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {t.buttons.reassign}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t.details.dueAt}</span>
                  <p className="font-bold text-slate-800 text-xs">
                    📅 {new Date(action.dueAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Form: Reassign */}
              {showReassignForm && (
                <form onSubmit={handleConfirmReassign} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
                  <span className="font-bold text-indigo-900 block">{t.buttons.reassign}</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignedToName}
                      onChange={(e) => setAssignedToName(e.target.value)}
                      placeholder="Tên nhân sự phụ trách mới..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    >
                      {t.buttons.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReassignForm(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium"
                    >
                      {t.buttons.cancel}
                    </button>
                  </div>
                </form>
              )}

              {/* Form: Waiting Reason Selector */}
              {showWaitingForm && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
                  <span className="font-bold text-purple-900 block">{t.details.waitingReason}</span>
                  <select
                    value={waitingReason}
                    onChange={(e) => setWaitingReason(e.target.value as ActionWaitingReason)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    <option value="CUSTOMER">{t.waitingReasons.CUSTOMER}</option>
                    <option value="SUPPLIER">{t.waitingReasons.SUPPLIER}</option>
                    <option value="INTERNAL_APPROVAL">{t.waitingReasons.INTERNAL_APPROVAL}</option>
                    <option value="RATE">{t.waitingReasons.RATE}</option>
                    <option value="DOCUMENTS">{t.waitingReasons.DOCUMENTS}</option>
                    <option value="FOLLOW_UP">{t.waitingReasons.FOLLOW_UP}</option>
                    <option value="DECISION">{t.waitingReasons.DECISION}</option>
                    <option value="SCHEDULE">{t.waitingReasons.SCHEDULE}</option>
                    <option value="OTHER">{t.waitingReasons.OTHER}</option>
                  </select>

                  <textarea
                    value={waitingNote}
                    onChange={(e) => setWaitingNote(e.target.value)}
                    placeholder="Ghi chú chi tiết lý do đang chờ (ví dụ: Chờ hãng tàu Evergreen xác nhận lại phụ phí THC...)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWaitingForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                    >
                      {t.buttons.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmWaiting}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700"
                    >
                      Xác nhận hàng chờ
                    </button>
                  </div>
                </div>
              )}

              {/* Form: Completion Notes */}
              {showCompletionForm && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                  <span className="font-bold text-emerald-900 block">{t.buttons.markCompleted}</span>
                  <textarea
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Ghi chú kết quả thực hiện hành động (ví dụ: Khách hàng đã đồng ý gia hạn giá và chốt booking)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCompletionForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                    >
                      {t.buttons.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCompletion}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận hoàn thành</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Snooze Presets Popover */}
              {showSnoozeOptions && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2.5">
                  <span className="font-bold text-purple-900 block">{t.buttons.snooze}</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleQuickSnooze(24, '+1 ngày')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-100"
                    >
                      +1 Ngày
                    </button>
                    <button
                      onClick={() => handleQuickSnooze(48, '+2 ngày')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-100"
                    >
                      +2 Ngày
                    </button>
                    <button
                      onClick={() => handleQuickSnooze(168, '+1 tuần')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-100"
                    >
                      +1 Tuần
                    </button>
                    <button
                      onClick={() => setShowSnoozeOptions(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBTASKS CHECKLIST */}
          {activeSubTab === 'SUBTASKS' && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700">Tiến độ công việc phụ</span>
                  <span className="text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Subtasks List */}
              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Chưa có bước thực hiện cụ thể nào. Thêm bước để phân rã hành động.</p>
                  </div>
                ) : (
                  subtasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleSubtask(task.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        task.isCompleted 
                          ? 'bg-slate-50/80 border-slate-200/60 text-slate-400 line-through' 
                          : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold text-xs">{task.title}</span>
                      </div>

                      {task.completedAt && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ✓ {new Date(task.completedAt).toLocaleTimeString('vi-VN')}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Subtask Input */}
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Thêm bước thực hiện mới (ví dụ: Check giá đại lý...)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.subtasks.add}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeSubTab === 'AUDIT' && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có lịch sử thay đổi bổ sung nào.</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        {log.performedByName || 'Operator'}
                      </span>
                      <span className="text-slate-400">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{log.note || log.action}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* BOTTOM EXECUTION STRIP */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {currentStatus !== 'IN_PROGRESS' && currentStatus !== 'COMPLETED' && (
              <button
                onClick={handleSetInProgress}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{t.buttons.startProgress}</span>
              </button>
            )}

            {currentStatus !== 'WAITING' && currentStatus !== 'COMPLETED' && (
              <button
                onClick={() => setShowWaitingForm(true)}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.buttons.markWaiting}</span>
              </button>
            )}

            {currentStatus !== 'BLOCKED' && currentStatus !== 'COMPLETED' && (
              <button
                onClick={handleSetBlocked}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                {t.buttons.markBlocked}
              </button>
            )}

            {currentStatus !== 'COMPLETED' && (
              <button
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                {t.buttons.snooze}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStatus !== 'COMPLETED' ? (
              <button
                onClick={() => setShowCompletionForm(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.buttons.markCompleted}</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Đã hoàn tất lúc {action.completedAt ? new Date(action.completedAt).toLocaleString('vi-VN') : ''}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
