import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MessageSquare, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  DeadlineEntity, 
  FollowUpChannel, 
  CustomerSentiment 
} from '../../types/deadline';
import { logBusinessActionTouchpoint } from '../../services/deadline/deadlineService';
import { FOLLOW_UP_CONTROL_I18N } from '../../i18n/followUpControl';

interface LogFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: DeadlineEntity | null;
  companyId: string;
  user: { uid: string; displayName?: string; email?: string };
  onSuccess: () => void;
  isVi?: boolean;
}

export const LogFollowUpModal: React.FC<LogFollowUpModalProps> = ({
  isOpen,
  onClose,
  action,
  companyId,
  user,
  onSuccess,
  isVi = true,
}) => {
  if (!isOpen || !action) return null;

  const t = isVi ? FOLLOW_UP_CONTROL_I18N.vi : FOLLOW_UP_CONTROL_I18N.en;

  const [channel, setChannel] = useState<FollowUpChannel>('CALL');
  const [sentiment, setSentiment] = useState<CustomerSentiment>(
    action.customerSentiment || 'INTERESTED'
  );
  const [contactPerson, setContactPerson] = useState<string>(
    action.customerName || ''
  );
  const [contactPhone, setContactPhone] = useState<string>('');
  const [discussionSummary, setDiscussionSummary] = useState<string>('');
  const [nextStepAction, setNextStepAction] = useState<string>('');
  const [nextFollowUpDue, setNextFollowUpDue] = useState<string>(() => {
    // Default +2 days at 10:00 AM
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [syncToCrm, setSyncToCrm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (action) {
      setSentiment(action.customerSentiment || 'INTERESTED');
      setContactPerson(action.customerName || '');
      setDiscussionSummary('');
      setNextStepAction('');
      setErrorMsg(null);
    }
  }, [action]);

  // Quick Cadence setter
  const setQuickCadence = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    setNextFollowUpDue(d.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionSummary.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập nội dung trao đổi' : 'Please provide discussion summary');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const nextDueIso = nextFollowUpDue ? new Date(nextFollowUpDue).toISOString() : undefined;

      await logBusinessActionTouchpoint({
        actionId: action.id,
        companyId,
        channel,
        sentiment,
        discussionSummary: discussionSummary.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        nextStepAction: nextStepAction.trim() || undefined,
        nextFollowUpDue: nextDueIso,
        user,
        syncToCrm,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error logging follow-up:', err);
      setErrorMsg(err.message || 'Lỗi khi ghi nhận follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const channelIcons: Record<FollowUpChannel, React.ReactNode> = {
    CALL: <Phone className="w-4 h-4" />,
    EMAIL: <Mail className="w-4 h-4" />,
    MEETING: <Users className="w-4 h-4" />,
    CHAT_ZALO: <MessageSquare className="w-4 h-4" />,
    WHATSAPP: <MessageSquare className="w-4 h-4" />,
    SYSTEM_NOTE: <FileText className="w-4 h-4" />,
    SMS: <MessageSquare className="w-4 h-4" />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {t.modal.logTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {action.entityNumber && <span className="font-bold text-slate-700 mr-2">[{action.entityNumber}]</span>}
              {action.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Channel Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.modal.channelLabel}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(['CALL', 'EMAIL', 'CHAT_ZALO', 'MEETING', 'SYSTEM_NOTE'] as FollowUpChannel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === c
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {channelIcons[c]}
                  <span>{t.channels[c]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Customer Sentiment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.modal.sentimentLabel}
            </label>
            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as CustomerSentiment)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="VERY_INTERESTED">🔥 {t.sentiments.VERY_INTERESTED}</option>
              <option value="INTERESTED">👍 {t.sentiments.INTERESTED}</option>
              <option value="PRICE_SENSITIVE">⚠️ {t.sentiments.PRICE_SENSITIVE}</option>
              <option value="COMPARING_COMPETITORS">🔍 {t.sentiments.COMPARING_COMPETITORS}</option>
              <option value="NEED_REVISION">✏️ {t.sentiments.NEED_REVISION}</option>
              <option value="WAITING_MANAGEMENT">⏳ {t.sentiments.WAITING_MANAGEMENT}</option>
              <option value="READY_TO_BOOK">✅ {t.sentiments.READY_TO_BOOK}</option>
              <option value="POSTPONED">⏸️ {t.sentiments.POSTPONED}</option>
              <option value="LOST">❌ {t.sentiments.LOST}</option>
              <option value="UNRESPONSIVE">📵 {t.sentiments.UNRESPONSIVE}</option>
            </select>
          </div>

          {/* 3. Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.modal.contactPersonLabel}
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Tên khách hàng / người liên hệ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.modal.phoneLabel}
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Số ĐT liên hệ (nếu có)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 4. Discussion Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.modal.summaryLabel} <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={discussionSummary}
              onChange={(e) => setDiscussionSummary(e.target.value)}
              placeholder={t.modal.summaryPlaceholder}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 5. Next Step Action */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.modal.nextActionLabel}
            </label>
            <input
              type="text"
              value={nextStepAction}
              onChange={(e) => setNextStepAction(e.target.value)}
              placeholder={t.modal.nextActionPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 6. Next Follow-Up Cadence */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {t.modal.nextDueDateLabel}
              </label>
              <div className="flex gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuickCadence(1)}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold"
                >
                  +1 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCadence(2)}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold"
                >
                  +2 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCadence(3)}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold"
                >
                  +3 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCadence(7)}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold"
                >
                  +1 Tuần
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={nextFollowUpDue}
              onChange={(e) => setNextFollowUpDue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 7. Auto Sync Options */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={syncToCrm}
                onChange={(e) => setSyncToCrm(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{t.modal.autoSyncCrm}</span>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              {t.modal.cancelButton}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.modal.saveButton}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
