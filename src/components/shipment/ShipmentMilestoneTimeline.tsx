import React, { useState } from 'react';
import { 
  ShipmentMilestone, 
  MilestoneStatus 
} from '../../types/shipment';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  SkipForward, 
  Calendar, 
  MapPin, 
  User, 
  Edit3, 
  Check, 
  X,
  ArrowRight
} from 'lucide-react';

interface ShipmentMilestoneTimelineProps {
  milestones: ShipmentMilestone[];
  onUpdateMilestone: (milestoneId: string, updates: Partial<ShipmentMilestone>) => Promise<void>;
  readOnly?: boolean;
  activeLanguage?: 'vi' | 'en';
}

export const ShipmentMilestoneTimeline: React.FC<ShipmentMilestoneTimelineProps> = ({
  milestones,
  onUpdateMilestone,
  readOnly = false,
  activeLanguage = 'vi',
}) => {
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<MilestoneStatus>('PENDING');
  const [editActualDate, setEditActualDate] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedMilestones = [...milestones].sort((a, b) => a.sequence - b.sequence);

  const handleStartEdit = (ms: ShipmentMilestone) => {
    if (readOnly) return;
    setEditingMilestoneId(ms.id);
    setEditStatus(ms.status);
    setEditActualDate(ms.actualDate || new Date().toISOString().slice(0, 16));
    setEditLocation(ms.location || '');
    setEditNotes(ms.notes || '');
  };

  const handleSave = async (milestoneId: string) => {
    try {
      setIsSaving(true);
      await onUpdateMilestone(milestoneId, {
        status: editStatus,
        actualDate: editStatus === 'COMPLETED' ? editActualDate : undefined,
        occurredAt: editStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
        location: editLocation.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setEditingMilestoneId(null);
    } catch (err) {
      console.error('Failed to update milestone:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {activeLanguage === 'vi' ? 'Hoàn thành' : 'Completed'}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800/50">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
            {activeLanguage === 'vi' ? 'Đang thực hiện' : 'In Progress'}
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/50">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            {activeLanguage === 'vi' ? 'Trễ hạn / Báo động' : 'Delayed'}
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <SkipForward className="w-3.5 h-3.5" />
            {activeLanguage === 'vi' ? 'Bỏ qua' : 'Skipped'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {activeLanguage === 'vi' ? 'Chưa diễn ra' : 'Pending'}
          </span>
        );
    }
  };

  const completedCount = sortedMilestones.filter(m => m.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / (sortedMilestones.length || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activeLanguage === 'vi' ? 'Tiến độ thực hiện dịch vụ' : 'Service Execution Progress'}
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {completedCount} / {sortedMilestones.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Milestones Vertical Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sortedMilestones.map((ms, index) => {
          const isCompleted = ms.status === 'COMPLETED';
          const isCurrent = ms.status === 'IN_PROGRESS';
          const isDelayed = ms.status === 'DELAYED';
          const isEditing = editingMilestoneId === ms.id;

          let dotClass = 'border-slate-300 bg-white text-slate-500 dark:bg-slate-900 dark:border-slate-700';
          if (isCompleted) {
            dotClass = 'border-emerald-500 bg-emerald-500 text-white';
          } else if (isCurrent) {
            dotClass = 'border-blue-500 bg-white text-blue-600 dark:bg-slate-900 animate-pulse';
          } else if (isDelayed) {
            dotClass = 'border-rose-500 bg-rose-500 text-white';
          }

          return (
            <div key={ms.id} className="relative group">
              {/* Timeline marker */}
              <div 
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${dotClass}`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>

              {/* Milestone Box */}
              <div className={`p-4 rounded-xl border transition-all ${
                isCurrent 
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                {isEditing ? (
                  /* Edit form */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        {activeLanguage === 'vi' ? ms.titleVi : ms.titleEn}
                      </span>
                      <button
                        onClick={() => setEditingMilestoneId(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {activeLanguage === 'vi' ? 'Trạng thái mốc' : 'Milestone Status'}
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as MilestoneStatus)}
                          className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="PENDING">{activeLanguage === 'vi' ? 'Chưa diễn ra (Pending)' : 'Pending'}</option>
                          <option value="IN_PROGRESS">{activeLanguage === 'vi' ? 'Đang thực hiện (In Progress)' : 'In Progress'}</option>
                          <option value="COMPLETED">{activeLanguage === 'vi' ? 'Đã hoàn thành (Completed)' : 'Completed'}</option>
                          <option value="DELAYED">{activeLanguage === 'vi' ? 'Trễ hạn (Delayed)' : 'Delayed'}</option>
                          <option value="SKIPPED">{activeLanguage === 'vi' ? 'Bỏ qua (Skipped)' : 'Skipped'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {activeLanguage === 'vi' ? 'Thời điểm thực tế' : 'Actual Date/Time'}
                        </label>
                        <input
                          type="datetime-local"
                          value={editActualDate}
                          onChange={(e) => setEditActualDate(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {activeLanguage === 'vi' ? 'Địa điểm ghi nhận' : 'Location'}
                        </label>
                        <input
                          type="text"
                          value={editLocation}
                          placeholder="e.g., Cảng Cát Lái, Tân Sơn Nhất"
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {activeLanguage === 'vi' ? 'Ghi chú / Chi tiết thực tế' : 'Operational Notes'}
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        placeholder={activeLanguage === 'vi' ? 'Số niêm phong, tài xế, lý do hoãn...' : 'Seal #, driver info, delay reason...'}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingMilestoneId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {activeLanguage === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSave(ms.id)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSaving ? (
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        {activeLanguage === 'vi' ? 'Lưu cập nhật' : 'Save Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {activeLanguage === 'vi' ? ms.titleVi : ms.titleEn}
                        </h4>
                        {getStatusBadge(ms.status)}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {ms.plannedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {activeLanguage === 'vi' ? 'Kế hoạch:' : 'Plan:'} {ms.plannedDate}
                          </span>
                        )}
                        {ms.actualDate && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {activeLanguage === 'vi' ? 'Thực tế:' : 'Actual:'} {ms.actualDate}
                          </span>
                        )}
                        {ms.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {ms.location}
                          </span>
                        )}
                        {ms.updatedBy && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <User className="w-3.5 h-3.5" />
                            {ms.updatedBy}
                          </span>
                        )}
                      </div>

                      {ms.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                          "{ms.notes}"
                        </p>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {ms.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateMilestone(ms.id, {
                                status: 'COMPLETED',
                                actualDate: new Date().toISOString().slice(0, 16),
                                occurredAt: new Date().toISOString(),
                              });
                            }}
                            title={activeLanguage === 'vi' ? 'Đánh dấu hoàn thành ngay' : 'Mark completed now'}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {activeLanguage === 'vi' ? 'Xong' : 'Done'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(ms)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {activeLanguage === 'vi' ? 'Sửa' : 'Edit'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
