import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  User, 
  Plus, 
  CheckSquare, 
  Sparkles,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { 
  DeadlineType, 
  DeadlineEntityType, 
  DeadlinePriority,
  ActionSubtask 
} from '../../types/deadline';
import { createBusinessAction } from '../../services/deadline/deadlineService';
import { ACTION_CENTER_I18N } from '../../i18n/actionCenter';

interface CreateBusinessActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
  user: { uid: string; displayName?: string; email?: string };
  initialValues?: {
    actionType?: DeadlineType;
    sourceEntityType?: DeadlineEntityType;
    sourceEntityId?: string;
    sourceEntityNumber?: string;
    customerName?: string;
    title?: string;
    description?: string;
    actionRequired?: string;
    priority?: DeadlinePriority;
    urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'IMMEDIATE';
    dueAt?: string;
    relatedCustomerId?: string;
    relatedQuotationId?: string;
    relatedShipmentId?: string;
    relatedRateId?: string;
    relatedOpportunityId?: string;
    relatedDecisionId?: string;
    relatedScenarioId?: string;
  };
  isVi?: boolean;
}

export const CreateBusinessActionModal: React.FC<CreateBusinessActionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  companyId,
  user,
  initialValues,
  isVi = true,
}) => {
  if (!isOpen) return null;

  const t = isVi ? ACTION_CENTER_I18N.vi : ACTION_CENTER_I18N.en;

  const [actionType, setActionType] = useState<DeadlineType>(initialValues?.actionType || 'QUOTATION_FOLLOW_UP');
  const [sourceEntityType, setSourceEntityType] = useState<DeadlineEntityType>(initialValues?.sourceEntityType || 'QUOTATION');
  const [sourceEntityId, setSourceEntityId] = useState<string>(initialValues?.sourceEntityId || '');
  const [sourceEntityNumber, setSourceEntityNumber] = useState<string>(initialValues?.sourceEntityNumber || '');
  const [customerName, setCustomerName] = useState<string>(initialValues?.customerName || '');
  const [title, setTitle] = useState<string>(initialValues?.title || '');
  const [description, setDescription] = useState<string>(initialValues?.description || '');
  const [actionRequired, setActionRequired] = useState<string>(initialValues?.actionRequired || '');
  const [priority, setPriority] = useState<DeadlinePriority>(initialValues?.priority || 'HIGH');
  const [urgency, setUrgency] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'IMMEDIATE'>(initialValues?.urgency || 'HIGH');
  
  // Default dueAt: tomorrow at 17:00
  const getDefaultDueAt = () => {
    if (initialValues?.dueAt) return initialValues.dueAt.substring(0, 16);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().substring(0, 16);
  };

  const [dueAt, setDueAt] = useState<string>(getDefaultDueAt());
  const [assignedToName, setAssignedToName] = useState<string>(user.displayName || user.email || '');
  const [subtasks, setSubtasks] = useState<ActionSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: newSubtask.trim(),
        isCompleted: false,
      }
    ]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;

    setIsSubmitting(true);
    try {
      const dueAtIso = new Date(dueAt).toISOString();
      await createBusinessAction({
        companyId,
        actionType,
        sourceEntityType,
        sourceEntityId: sourceEntityId || `REF_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        actionRequired: actionRequired.trim(),
        priority,
        urgency,
        dueAt: dueAtIso,
        assignedTo: user.uid,
        assignedToName: assignedToName.trim() || user.displayName || user.email,
        subtasks,
        relatedCustomerId: initialValues?.relatedCustomerId,
        relatedCustomerName: customerName,
        relatedQuotationId: initialValues?.relatedQuotationId,
        relatedQuotationNumber: sourceEntityNumber,
        relatedShipmentId: initialValues?.relatedShipmentId,
        relatedShipmentNumber: sourceEntityNumber,
        relatedRateId: initialValues?.relatedRateId,
        relatedOpportunityId: initialValues?.relatedOpportunityId,
        relatedDecisionId: initialValues?.relatedDecisionId,
        relatedScenarioId: initialValues?.relatedScenarioId,
        source: initialValues?.relatedDecisionId ? 'DECISION_WORKSPACE' : 'MANUAL_USER',
      }, user);

      onCreated();
      onClose();
    } catch (err) {
      console.error('[CreateBusinessActionModal] Error creating action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Thiết Lập Hành Động Nghiệp Vụ Mới' : 'Create Smart Business Action'}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Khởi tạo hành động, phân công nhân sự, đặt deadline và theo dõi tiến độ' : 'Initialize action, assign PIC, set deadline and track execution'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Action Type & Source Entity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                {t.details.type} <span className="text-red-500">*</span>
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as DeadlineType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="QUOTATION_FOLLOW_UP">{t.actionTypes.QUOTATION_FOLLOW_UP}</option>
                <option value="QUOTATION_EXPIRY_REVIEW">{t.actionTypes.QUOTATION_EXPIRY_REVIEW}</option>
                <option value="PRICING_REVIEW">{t.actionTypes.PRICING_REVIEW}</option>
                <option value="MARGIN_REVIEW">{t.actionTypes.MARGIN_REVIEW}</option>
                <option value="RATE_REVIEW">{t.actionTypes.RATE_REVIEW}</option>
                <option value="RATE_EXPIRY_REVIEW">{t.actionTypes.RATE_EXPIRY_REVIEW}</option>
                <option value="RFQ_FOLLOW_UP">{t.actionTypes.RFQ_FOLLOW_UP}</option>
                <option value="CUSTOMER_FOLLOW_UP">{t.actionTypes.CUSTOMER_FOLLOW_UP}</option>
                <option value="CUSTOMER_REACTIVATION">{t.actionTypes.CUSTOMER_REACTIVATION}</option>
                <option value="OPPORTUNITY_FOLLOW_UP">{t.actionTypes.OPPORTUNITY_FOLLOW_UP}</option>
                <option value="SHIPMENT_ACTION">{t.actionTypes.SHIPMENT_ACTION}</option>
                <option value="INTERNAL_APPROVAL">{t.actionTypes.INTERNAL_APPROVAL}</option>
                <option value="CUSTOMER_RESPONSE_REQUIRED">{t.actionTypes.CUSTOMER_RESPONSE_REQUIRED}</option>
                <option value="SUPPLIER_RESPONSE_REQUIRED">{t.actionTypes.SUPPLIER_RESPONSE_REQUIRED}</option>
                <option value="CUSTOM_ACTION">{t.actionTypes.CUSTOM_ACTION}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                {t.details.sourceEntity}
              </label>
              <select
                value={sourceEntityType}
                onChange={(e) => setSourceEntityType(e.target.value as DeadlineEntityType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="QUOTATION">{t.entityTypes.QUOTATION}</option>
                <option value="SHIPMENT">{t.entityTypes.SHIPMENT}</option>
                <option value="CUSTOMER">{t.entityTypes.CUSTOMER}</option>
                <option value="RATE">{t.entityTypes.RATE}</option>
                <option value="OPPORTUNITY">{t.entityTypes.OPPORTUNITY}</option>
                <option value="RFQ">{t.entityTypes.RFQ}</option>
                <option value="CONTRACT">{t.entityTypes.CONTRACT}</option>
                <option value="DECISION">{t.entityTypes.DECISION}</option>
                <option value="SCENARIO">{t.entityTypes.SCENARIO}</option>
                <option value="CUSTOM">{t.entityTypes.CUSTOM}</option>
              </select>
            </div>
          </div>

          {/* Reference Number & Customer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Mã tham chiếu (Số báo giá / Số lô / Hợp đồng)
              </label>
              <input
                type="text"
                value={sourceEntityNumber}
                onChange={(e) => setSourceEntityNumber(e.target.value)}
                placeholder="VD: Q-2026-0042, SHP-HCM-012..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Khách hàng / Đối tác liên quan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="VD: Cty TNHH Xuất Nhập Khẩu ABC..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {t.details.title} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Follow up chốt giá cước đường biển đi Hamburg trước khi rate expire..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Description & Action Required */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {t.details.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Bối cảnh chi tiết của hành động..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {t.details.actionRequired}
            </label>
            <input
              type="text"
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="VD: Gọi điện cho anh Nam xác nhận booking hoặc check giá tàu Cosco..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Priority, Urgency & Due At */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                {t.details.priority}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DeadlinePriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="CRITICAL">{t.priorities.CRITICAL}</option>
                <option value="HIGH">{t.priorities.HIGH}</option>
                <option value="MEDIUM">{t.priorities.MEDIUM}</option>
                <option value="LOW">{t.priorities.LOW}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                {t.details.urgency}
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="IMMEDIATE">{t.urgencies.IMMEDIATE}</option>
                <option value="HIGH">{t.urgencies.HIGH}</option>
                <option value="NORMAL">{t.urgencies.NORMAL}</option>
                <option value="LOW">{t.urgencies.LOW}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                {t.details.dueAt} <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
              </input>
            </div>
          </div>

          {/* PIC Assignment */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {t.details.assignedTo}
            </label>
            <input
              type="text"
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              placeholder="Tên nhân sự phụ trách..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700 block">
              Phân rã công việc phụ (Subtasks)
            </span>
            
            <div className="space-y-1.5">
              {subtasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-medium text-slate-800">{task.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(task.id)}
                    className="text-slate-400 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Thêm bước con (vd: Xin giá đại lý, tính lại margin...)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
            >
              {t.buttons.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.buttons.save}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
