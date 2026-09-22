import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  Edit3, 
  Check, 
  Save, 
  Flame,
  ShieldAlert,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ShipmentRecord } from '../../types/shipment';
import { DeadlineEntity } from '../../types/deadline';
import { 
  getDeadlines, 
  completeDeadline, 
  calculateTimeRemaining,
  syncShipmentDeadlines
} from '../../services/deadline/deadlineService';
import { updateShipment } from '../../services/shipment/shipmentService';
import { CreateCustomDeadlineModal } from '../deadline/CreateCustomDeadlineModal';
import { SnoozeDeadlineModal } from '../deadline/SnoozeDeadlineModal';

interface ShipmentDeadlinesTabProps {
  shipment: ShipmentRecord;
  currentUser?: { uid: string; displayName?: string; email?: string };
  activeLanguage?: 'vi' | 'en';
  onShipmentUpdated: (updated: ShipmentRecord) => void;
}

export const ShipmentDeadlinesTab: React.FC<ShipmentDeadlinesTabProps> = ({
  shipment,
  currentUser,
  activeLanguage = 'vi',
  onShipmentUpdated,
}) => {
  const isVi = activeLanguage === 'vi';
  const [deadlines, setDeadlines] = useState<DeadlineEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [snoozeModalTarget, setSnoozeModalTarget] = useState<DeadlineEntity | null>(null);

  // Editable Cutoffs Form State
  const [isEditingCutoffs, setIsEditingCutoffs] = useState(false);
  const [cargoReadyDate, setCargoReadyDate] = useState(shipment.cargoReadyDate || '');
  const [siCutoff, setSiCutoff] = useState(shipment.siCutoff || '');
  const [cyCutoff, setCyCutoff] = useState(shipment.cyCutoff || '');
  const [vgmCutoff, setVgmCutoff] = useState(shipment.vgmCutoff || '');
  const [docCutoff, setDocCutoff] = useState(shipment.docCutoff || '');
  const [savingCutoffs, setSavingCutoffs] = useState(false);

  const effectiveUser = currentUser || { uid: 'operator', displayName: 'Operator' };

  const loadDeadlines = async () => {
    setLoading(true);
    try {
      // First ensure shipment cutoffs are synced
      await syncShipmentDeadlines(shipment, effectiveUser);
      const all = await getDeadlines(shipment.companyId, {
        status: 'ALL',
        pageLimit: 100,
      });
      const filtered = all.filter(d => d.entityId === shipment.id || d.entityNumber === shipment.shipmentNumber);
      setDeadlines(filtered);
    } catch (err) {
      console.error('[ShipmentDeadlinesTab] Error loading deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeadlines();
  }, [shipment.id, shipment.companyId]);

  useEffect(() => {
    setCargoReadyDate(shipment.cargoReadyDate || '');
    setSiCutoff(shipment.siCutoff || '');
    setCyCutoff(shipment.cyCutoff || '');
    setVgmCutoff(shipment.vgmCutoff || '');
    setDocCutoff(shipment.docCutoff || '');
  }, [
    shipment.cargoReadyDate,
    shipment.siCutoff,
    shipment.cyCutoff,
    shipment.vgmCutoff,
    shipment.docCutoff,
  ]);

  const handleSaveCutoffs = async () => {
    setSavingCutoffs(true);
    try {
      const updated = await updateShipment(
        shipment.id,
        {
          cargoReadyDate: cargoReadyDate || undefined,
          siCutoff: siCutoff || undefined,
          cyCutoff: cyCutoff || undefined,
          vgmCutoff: vgmCutoff || undefined,
          docCutoff: docCutoff || undefined,
        },
        effectiveUser
      );
      onShipmentUpdated(updated);
      setIsEditingCutoffs(false);
      await loadDeadlines();
    } catch (err) {
      console.error('Error updating cutoffs:', err);
    } finally {
      setSavingCutoffs(false);
    }
  };

  const handleComplete = async (deadlineId: string) => {
    try {
      await completeDeadline(deadlineId, effectiveUser, 'Hoàn thành từ Shipment Workspace');
      loadDeadlines();
    } catch (err) {
      console.error('Error completing deadline:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Cutoff Config Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
              PHASE 44 DEADLINE ENGINE
            </span>
            <span className="text-xs text-slate-500">Mốc Nghiệp Vụ Cắt Máng & Cam Kết</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {isVi ? 'Hạn Chót Cut-off & Hành Động Cần Làm' : 'Cut-off Deadlines & Action Tracking'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Theo dõi chính xác thời hạn đóng hàng bãi cảng (CY), khai báo SI, phiếu cân VGM và ngày hàng sẵn sàng'
              : 'Surveillance of CY gate-in, SI submission, VGM weighing, and cargo readiness'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditingCutoffs ? (
            <button
              onClick={() => setIsEditingCutoffs(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isVi ? 'Chỉnh Sửa Cut-off' : 'Edit Cutoffs'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingCutoffs(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveCutoffs}
                disabled={savingCutoffs}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCutoffs ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu Cut-off' : 'Save')}</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isVi ? 'Thêm Hạn Chót Riêng' : 'Add Custom'}</span>
          </button>
        </div>
      </div>

      {/* 2. Cutoff Quick Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Cargo Ready Date */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Cargo Ready
          </span>
          {isEditingCutoffs ? (
            <input
              type="date"
              value={cargoReadyDate}
              onChange={(e) => setCargoReadyDate(e.target.value)}
              className="w-full text-xs mt-1 p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ) : (
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {shipment.cargoReadyDate ? new Date(shipment.cargoReadyDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : '—'}
            </div>
          )}
          <span className="text-[10px] text-slate-400">Hàng sẵn sàng</span>
        </div>

        {/* SI Cutoff */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            SI Cut-off
          </span>
          {isEditingCutoffs ? (
            <input
              type="datetime-local"
              value={siCutoff}
              onChange={(e) => setSiCutoff(e.target.value)}
              className="w-full text-xs mt-1 p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ) : (
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {shipment.siCutoff ? new Date(shipment.siCutoff).toLocaleString(isVi ? 'vi-VN' : 'en-US') : '—'}
            </div>
          )}
          <span className="text-[10px] text-slate-400">Hạn gửi SI hãng tàu</span>
        </div>

        {/* CY Cutoff */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            CY Cut-off
          </span>
          {isEditingCutoffs ? (
            <input
              type="datetime-local"
              value={cyCutoff}
              onChange={(e) => setCyCutoff(e.target.value)}
              className="w-full text-xs mt-1 p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ) : (
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
              {shipment.cyCutoff ? new Date(shipment.cyCutoff).toLocaleString(isVi ? 'vi-VN' : 'en-US') : '—'}
            </div>
          )}
          <span className="text-[10px] text-slate-400">Hạ bãi / Cắt máng</span>
        </div>

        {/* VGM Cutoff */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            VGM Cut-off
          </span>
          {isEditingCutoffs ? (
            <input
              type="datetime-local"
              value={vgmCutoff}
              onChange={(e) => setVgmCutoff(e.target.value)}
              className="w-full text-xs mt-1 p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ) : (
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {shipment.vgmCutoff ? new Date(shipment.vgmCutoff).toLocaleString(isVi ? 'vi-VN' : 'en-US') : '—'}
            </div>
          )}
          <span className="text-[10px] text-slate-400">Nộp phiếu cân</span>
        </div>

        {/* Doc Cutoff */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Doc Cut-off
          </span>
          {isEditingCutoffs ? (
            <input
              type="datetime-local"
              value={docCutoff}
              onChange={(e) => setDocCutoff(e.target.value)}
              className="w-full text-xs mt-1 p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          ) : (
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {shipment.docCutoff ? new Date(shipment.docCutoff).toLocaleString(isVi ? 'vi-VN' : 'en-US') : '—'}
            </div>
          )}
          <span className="text-[10px] text-slate-400">Hạn nộp chứng từ</span>
        </div>
      </div>

      {/* 3. Deadlines List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {isVi ? `Danh Sách Hạn Chót Theo Dõi (${deadlines.length})` : `Monitored Deadlines (${deadlines.length})`}
          </h4>
          <button
            onClick={loadDeadlines}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs text-slate-500">Đang cập nhật hạn chót lô hàng...</p>
          </div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isVi ? 'Chưa có hạn chót nào cho lô hàng này' : 'No deadlines recorded yet'}
            </div>
            <p className="text-[11px] text-slate-500">
              {isVi 
                ? 'Nhập các mốc SI Cut-off, CY Cut-off hoặc bấm "Thêm Hạn Chót Riêng" để kích hoạt cơ chế giám sát.'
                : 'Configure cutoffs or add custom deadlines to activate automated tracking.'}
            </p>
          </div>
        ) : (
          deadlines.map((item) => {
            const timeInfo = calculateTimeRemaining(item.dueAt, item.snoozedUntil);
            const isDone = item.status === 'COMPLETED';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all shadow-2xs space-y-2.5 ${
                  isDone 
                    ? 'border-slate-200 dark:border-slate-800 opacity-60' 
                    : item.status === 'OVERDUE'
                    ? 'border-red-300 dark:border-red-900/60 bg-red-50/10'
                    : item.priority === 'CRITICAL'
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${timeInfo.badgeColorClass}`}>
                      {isVi ? timeInfo.formattedTextVi : timeInfo.formattedTextEn}
                    </span>

                    {item.priority === 'CRITICAL' && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
                        CRITICAL
                      </span>
                    )}

                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {item.deadlineType}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Hạn: <strong className="text-slate-800 dark:text-slate-200">{new Date(item.dueAt).toLocaleString('vi-VN')}</strong>
                  </div>
                </div>

                <div>
                  <h5 className={`text-xs font-bold text-slate-900 dark:text-white ${isDone ? 'line-through text-slate-400' : ''}`}>
                    {item.title}
                  </h5>
                  {item.actionRequired && (
                    <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Hành động: </span>
                      {item.actionRequired}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-500">
                    {item.assignedToName ? `👤 ${item.assignedToName}` : <span className="text-amber-600 font-medium">⚠️ Chưa có PIC</span>}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!isDone && (
                      <button
                        onClick={() => setSnoozeModalTarget(item)}
                        className="px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
                      >
                        {isVi ? 'Tạm hoãn' : 'Snooze'}
                      </button>
                    )}

                    {!isDone && (
                      <button
                        onClick={() => handleComplete(item.id)}
                        className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-all shadow-2xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isVi ? 'Xác nhận hoàn thành' : 'Done'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateCustomDeadlineModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => loadDeadlines()}
        companyId={shipment.companyId}
        user={effectiveUser}
        initialShipmentId={shipment.id}
        initialShipmentNumber={shipment.shipmentNumber}
      />

      <SnoozeDeadlineModal
        isOpen={Boolean(snoozeModalTarget)}
        onClose={() => setSnoozeModalTarget(null)}
        onSnoozed={() => loadDeadlines()}
        deadline={snoozeModalTarget}
        user={effectiveUser}
      />
    </div>
  );
};
