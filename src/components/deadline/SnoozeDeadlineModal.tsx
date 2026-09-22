import React, { useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { snoozeDeadline } from '../../services/deadline/deadlineService';
import { DeadlineEntity } from '../../types/deadline';

interface SnoozeDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnoozed: () => void;
  deadline: DeadlineEntity | null;
  user: { uid: string; displayName?: string; email?: string };
}

function formatLocalDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export const SnoozeDeadlineModal: React.FC<SnoozeDeadlineModalProps> = ({
  isOpen,
  onClose,
  onSnoozed,
  deadline,
  user,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'1h' | '4h' | 'tomorrow' | 'custom'>('1h');
  const [customDateTime, setCustomDateTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return formatLocalDateTime(d);
  });
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !deadline) return null;

  const handleSnooze = async () => {
    setLoading(true);
    setError(null);

    try {
      let targetIso = '';
      const now = new Date();

      if (selectedPreset === '1h') {
        const d = new Date(now.getTime() + 60 * 60 * 1000);
        targetIso = d.toISOString();
      } else if (selectedPreset === '4h') {
        const d = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        targetIso = d.toISOString();
      } else if (selectedPreset === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(8, 30, 0, 0);
        targetIso = d.toISOString();
      } else {
        if (!customDateTime) {
          setError('Vui lòng chọn thời gian tạm hoãn');
          setLoading(false);
          return;
        }
        targetIso = new Date(customDateTime).toISOString();
      }

      await snoozeDeadline(deadline.id, targetIso, user, reason.trim() || undefined);
      onSnoozed();
      onClose();
    } catch (err: any) {
      console.error('[SnoozeDeadlineModal] Error:', err);
      setError(err?.message || 'Có lỗi khi tạm hoãn deadline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tạm Hoãn Nhắc Việc (Snooze)</h3>
              <p className="text-[11px] text-slate-500">Chuyển sang theo dõi ở mốc thời gian sau</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Deadline Info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
            <div className="font-bold text-slate-800 line-clamp-1">{deadline.title}</div>
            {deadline.entityNumber && (
              <div className="text-[11px] text-slate-500">Hồ sơ: <span className="font-semibold text-slate-700">{deadline.entityNumber}</span></div>
            )}
            <div className="text-[11px] text-slate-500">
              Hạn gốc: <span className="font-semibold text-slate-700">{new Date(deadline.dueAt).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Khoảng Thời Gian Tạm Hoãn
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPreset('1h')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all ${
                  selectedPreset === '1h'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                1 Giờ nữa (+1h)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreset('4h')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all ${
                  selectedPreset === '4h'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                4 Giờ nữa (+4h)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreset('tomorrow')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all ${
                  selectedPreset === 'tomorrow'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sáng mai (08:30)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all ${
                  selectedPreset === 'custom'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tùy chọn mốc giờ...
              </button>
            </div>
          </div>

          {/* Custom Date Input */}
          {selectedPreset === 'custom' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn Ngày & Giờ Mới
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý Do Tạm Hoãn (Tùy chọn)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Đang chờ khách phản hồi thông tin đóng gói..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSnooze}
            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-xs"
          >
            {loading ? 'Đang cập nhật...' : 'Xác Nhận Tạm Hoãn'}
          </button>
        </div>
      </div>
    </div>
  );
};
