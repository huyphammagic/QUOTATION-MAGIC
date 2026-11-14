import React, { useState, useEffect, useCallback } from 'react';
import {
  ArchiveRestore,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Database,
  HardDriveUpload,
  History,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import {
  STRICT_REAL_DATA_ONLY,
  ImmutableSnapshotRecord,
  OfflineOutboxItem,
  RecycleBinEntry,
  fetchDocumentSnapshots,
  fetchRecycleBinItems,
  flushOfflineOutboxQueue,
  getOfflineOutboxQueue,
  getSyncEpochStatus,
  removeOfflineOutboxItem,
  restoreDocumentSnapshot,
  restoreFromRecycleBin,
} from '../../services/firebase/dataVaultService';
import {
  CloudVaultModuleStatus,
  LegacyScanReport,
  getCloudVaultStatus,
  getVaultActiveCompanyId,
  hydrateCloudVault,
  migrateLegacyLocalStorageToCloudVault,
  scanLegacyLocalStorageForCloudVault,
} from '../../services/firebase/cloudStorageVaultService';
import { formatUSD } from '../../utils/formatters';

interface DataVaultPanelProps {
  quotes: QuoteData[];
  activeQuote?: QuoteData | null;
  onRefreshData?: () => Promise<void>;
  onRestoreQuote?: (restored: QuoteData) => void;
}

type VaultSubTab = 'RECYCLE_BIN' | 'TIME_TRAVEL' | 'OUTBOX_SHIELD' | 'CLOUD_VAULT';

const REASON_LABELS: Record<ImmutableSnapshotRecord['reason'], string> = {
  CREATE: 'Khởi tạo',
  UPDATE: 'Cập nhật',
  PRE_OVERWRITE: 'Trước ghi đè',
  PRE_RESTORE: 'Trước khôi phục',
  SOFT_DELETE: 'Trước khi xóa',
  MANUAL_BACKUP: 'Sao lưu tay',
};

const COLLECTION_LABELS: Record<string, string> = {
  quotes: 'Báo Giá',
  customers: 'Khách Hàng CRM',
  rateMasters: 'Biểu Cước Master',
  surcharges: 'Phụ Phí',
  settings: 'Cấu Hình Công Ty',
  chargeMasters: 'Danh Mục Phí',
  rateRequests: 'Yêu Cầu Báo Giá',
};

export const DataVaultPanel: React.FC<DataVaultPanelProps> = ({
  quotes,
  activeQuote = null,
  onRefreshData,
  onRestoreQuote,
}) => {
  const [subTab, setSubTab] = useState<VaultSubTab>('RECYCLE_BIN');
  const [recycleItems, setRecycleItems] = useState<RecycleBinEntry[]>([]);
  const [isLoadingRecycle, setIsLoadingRecycle] = useState(false);
  const [restoringRecycleId, setRestoringRecycleId] = useState<string | null>(null);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    activeQuote?.id || quotes[0]?.id || ''
  );
  const [snapshots, setSnapshots] = useState<ImmutableSnapshotRecord[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [restoringSnapId, setRestoringSnapId] = useState<string | null>(null);

  const [outboxItems, setOutboxItems] = useState<OfflineOutboxItem[]>(() => getOfflineOutboxQueue());
  const [isFlushingOutbox, setIsFlushingOutbox] = useState(false);
  const [cloudModules, setCloudModules] = useState<CloudVaultModuleStatus[]>(() => getCloudVaultStatus());
  const [legacyReport, setLegacyReport] = useState<LegacyScanReport>(() => scanLegacyLocalStorageForCloudVault());
  const [isHydratingCloudVault, setIsHydratingCloudVault] = useState(false);
  const [isMigratingLegacy, setIsMigratingLegacy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const syncEpoch = getSyncEpochStatus();

  useEffect(() => {
    if (!selectedQuoteId && (activeQuote?.id || quotes[0]?.id)) {
      setSelectedQuoteId(activeQuote?.id || quotes[0]?.id || '');
    }
  }, [activeQuote?.id, quotes, selectedQuoteId]);

  const loadRecycleBin = useCallback(async () => {
    setIsLoadingRecycle(true);
    try {
      const items = await fetchRecycleBinItems();
      setRecycleItems(items);
    } finally {
      setIsLoadingRecycle(false);
    }
  }, []);

  const loadSnapshots = useCallback(async (quoteId: string) => {
    if (!quoteId) {
      setSnapshots([]);
      return;
    }
    setIsLoadingSnapshots(true);
    try {
      const items = await fetchDocumentSnapshots('quotes', quoteId, 30);
      setSnapshots(items);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, []);

  useEffect(() => {
    loadRecycleBin();
  }, [loadRecycleBin]);

  useEffect(() => {
    if (subTab === 'TIME_TRAVEL' && selectedQuoteId) {
      loadSnapshots(selectedQuoteId);
    }
  }, [subTab, selectedQuoteId, loadSnapshots]);

  useEffect(() => {
    const handleOutboxChange = (e: Event) => {
      const custom = e as CustomEvent<OfflineOutboxItem[]>;
      if (Array.isArray(custom.detail)) {
        setOutboxItems(custom.detail);
      } else {
        setOutboxItems(getOfflineOutboxQueue());
      }
    };
    const refreshCloudVaultInfo = () => {
      setCloudModules(getCloudVaultStatus());
      setLegacyReport(scanLegacyLocalStorageForCloudVault());
    };

    window.addEventListener('data-vault-outbox-changed', handleOutboxChange);
    window.addEventListener('cloud-vault-module-updated', refreshCloudVaultInfo);
    window.addEventListener('cloud-vault-hydrated', refreshCloudVaultInfo);
    return () => {
      window.removeEventListener('data-vault-outbox-changed', handleOutboxChange);
      window.removeEventListener('cloud-vault-module-updated', refreshCloudVaultInfo);
      window.removeEventListener('cloud-vault-hydrated', refreshCloudVaultInfo);
    };
  }, []);

  const handleRestoreRecycleEntry = async (entry: RecycleBinEntry) => {
    setRestoringRecycleId(entry.id);
    setStatusMessage(null);
    try {
      const res = await restoreFromRecycleBin(entry);
      if (res.success) {
        setRecycleItems((prev) => prev.filter((item) => item.id !== entry.id));
        setStatusMessage({ type: 'ok', text: res.message });
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setStatusMessage({ type: 'err', text: res.message });
      }
    } finally {
      setRestoringRecycleId(null);
    }
  };

  const handleRestoreSnapshot = async (snap: ImmutableSnapshotRecord) => {
    if (!selectedQuoteId) return;
    setRestoringSnapId(snap.id);
    setStatusMessage(null);
    try {
      const res = await restoreDocumentSnapshot('quotes', selectedQuoteId, snap);
      if (res.success) {
        setStatusMessage({ type: 'ok', text: res.message });
        if (res.restoredData && onRestoreQuote) {
          onRestoreQuote(res.restoredData as QuoteData);
        }
        await loadSnapshots(selectedQuoteId);
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setStatusMessage({ type: 'err', text: res.message });
      }
    } finally {
      setRestoringSnapId(null);
    }
  };

  const handleFlushOutbox = async () => {
    setIsFlushingOutbox(true);
    setStatusMessage(null);
    try {
      const res = await flushOfflineOutboxQueue();
      setOutboxItems(getOfflineOutboxQueue());
      if (res.flushedCount > 0) {
        setStatusMessage({
          type: 'ok',
          text: `Đã đẩy đồng bộ thành công ${res.flushedCount} thay đổi lên Cloud (Còn lại: ${res.remainingCount}).`,
        });
        if (onRefreshData) {
          await onRefreshData();
        }
      } else if (res.conflictsCount > 0) {
        setStatusMessage({
          type: 'err',
          text: `Phát hiện ${res.conflictsCount} bản ghi xung đột phiên bản trên Cloud cần xem lại.`,
        });
      } else {
        setStatusMessage({
          type: 'ok',
          text: 'Hàng đợi hiện tại đã trống hoặc thiết bị đang ngoại tuyến.',
        });
      }
    } finally {
      setIsFlushingOutbox(false);
    }
  };

  const handleForceHydrateCloudVault = async () => {
    setIsHydratingCloudVault(true);
    setStatusMessage(null);
    try {
      const wsId = getVaultActiveCompanyId();
      const updated = await hydrateCloudVault(wsId, true);
      setCloudModules(getCloudVaultStatus(wsId));
      setStatusMessage({
        type: 'ok',
        text:
          updated.length > 0
            ? `Đã kéo mới ${updated.length} phân hệ từ Firebase Storage về máy này.`
            : 'Toàn bộ 14 phân hệ trên Firebase Storage đã ở trạng thái đồng bộ mới nhất.',
      });
    } finally {
      setIsHydratingCloudVault(false);
    }
  };

  const handleMigrateLegacyStorage = async () => {
    setIsMigratingLegacy(true);
    setStatusMessage(null);
    try {
      const wsId = getVaultActiveCompanyId();
      const res = await migrateLegacyLocalStorageToCloudVault(wsId);
      setCloudModules(getCloudVaultStatus(wsId));
      setLegacyReport(scanLegacyLocalStorageForCloudVault());
      setStatusMessage({
        type: res.success ? 'ok' : 'err',
        text: res.message,
      });
      if (res.success && onRefreshData) {
        await onRefreshData();
      }
    } finally {
      setIsMigratingLegacy(false);
    }
  };

  const computeDaysRemaining = (restoreBeforeIso: string): number => {
    const diff = new Date(restoreBeforeIso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Sub-navigation bar */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('RECYCLE_BIN')}
          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
            subTab === 'RECYCLE_BIN'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Thùng Rác 90 Ngày</span>
          <span className="font-mono text-[11px] tabular-nums opacity-80">
            ({recycleItems.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('TIME_TRAVEL')}
          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
            subTab === 'TIME_TRAVEL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Hộp Đen Time-Travel (_snapshots)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('OUTBOX_SHIELD')}
          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
            subTab === 'OUTBOX_SHIELD'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Hàng Đợi Offline & Lá Chắn</span>
          {outboxItems.length > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-amber-300">
              ({outboxItems.length})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('CLOUD_VAULT')}
          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
            subTab === 'CLOUD_VAULT'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Kho Firebase Storage (14 Phân Hệ)</span>
          {legacyReport.totalLegacyKeysFound > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-amber-400">
              ({legacyReport.totalLegacyKeysFound} cũ)
            </span>
          )}
        </button>
      </div>

      {statusMessage && (
        <div
          className={`px-3.5 py-2.5 rounded-xl border font-semibold ${
            statusMessage.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* SUB-TAB 1: 90-DAY RECYCLE BIN */}
      {subTab === 'RECYCLE_BIN' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                <span>Thùng Rác Khôi Phục An Toàn (Mandatory Soft-Delete)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mọi thao tác xóa Báo giá, Khách hàng, Biểu cước, Phụ phí đều được chuyển vào đây và giữ nguyên vẹn 90 ngày.
              </p>
            </div>
            <button
              type="button"
              onClick={loadRecycleBin}
              disabled={isLoadingRecycle}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecycle ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {isLoadingRecycle && recycleItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Đang tải danh sách Thùng Rác Cloud...</div>
          ) : recycleItems.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-slate-800">Thùng rác trống</p>
              <p className="text-slate-500 text-[11px]">
                Chưa có bản ghi nào bị xóa mềm. Khi người dùng xóa dữ liệu, bản gốc sẽ tự động lưu tại đây để khôi phục 1-click.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {recycleItems.map((entry) => {
                const daysLeft = computeDaysRemaining(entry.restoreBefore);
                return (
                  <div
                    key={entry.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{entry.displayName}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-[10px] font-semibold">
                          {COLLECTION_LABELS[entry.collectionName] || entry.collectionName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                          v{entry.rev}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {entry.secondaryLabel && <span>{entry.secondaryLabel}</span>}
                        <span>Xóa bởi: {entry.deletedBy}</span>
                        <span className="font-mono tabular-nums">
                          {new Date(entry.deletedAt).toLocaleString('vi-VN')}
                        </span>
                        <span className="text-amber-700 font-semibold tabular-nums">
                          Còn {daysLeft} ngày bảo lưu
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreRecycleEntry(entry)}
                      disabled={restoringRecycleId === entry.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {restoringRecycleId === entry.id ? 'Đang khôi phục...' : 'Khôi Phục 1-Click'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: IMMUTABLE SNAPSHOT VAULT (TIME TRAVEL) */}
      {subTab === 'TIME_TRAVEL' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Hộp Đen Lịch Sử Phiên Bản Bất Biến (_snapshots)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mỗi lần lưu/cập nhật/ghi đè đều tự động chụp 1 bản Snapshot chỉ-thêm (append-only) không thể bị xóa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 max-w-[260px]"
              >
                {activeQuote && !quotes.some((q) => q.id === activeQuote.id) && (
                  <option value={activeQuote.id}>
                    {activeQuote.quoteNumber || activeQuote.id} (Đang mở)
                  </option>
                )}
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quoteNumber} — {q.customer?.companyName || q.customer?.customerName || 'Khách lẻ'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => selectedQuoteId && loadSnapshots(selectedQuoteId)}
                disabled={isLoadingSnapshots || !selectedQuoteId}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                <span>Tải</span>
              </button>
            </div>
          </div>

          {!selectedQuoteId ? (
            <div className="p-8 text-center text-slate-500">
              Chưa có báo giá nào được chọn để xem lịch sử Snapshot.
            </div>
          ) : isLoadingSnapshots && snapshots.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Đang đọc Hộp Đen từ Firestore...</div>
          ) : snapshots.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <Database className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">Chưa có Snapshot cho báo giá này</p>
              <p className="text-slate-500 text-[11px]">
                Hãy nhấn Lưu Báo Giá để hệ thống tự động ghi nhận điểm mốc Time-Travel đầu tiên.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {snapshots.map((snap) => {
                const snapTotalUsd = Number(snap.data?.grandTotalUsd || 0);
                const snapItemsCount = Array.isArray(snap.data?.items) ? snap.data.items.length : 0;
                return (
                  <div
                    key={snap.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          v{snap.rev}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            snap.reason === 'PRE_OVERWRITE' || snap.reason === 'SOFT_DELETE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {REASON_LABELS[snap.reason] || snap.reason}
                        </span>
                        {snap.summaryLabel && (
                          <span className="font-semibold text-slate-800">{snap.summaryLabel}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="font-mono tabular-nums">
                          {new Date(snap.snapshotAt).toLocaleString('vi-VN')}
                        </span>
                        <span>Người tạo: {snap.actor}</span>
                        <span className="font-mono tabular-nums text-slate-700 font-semibold">
                          {formatUSD(snapTotalUsd)} &bull; {snapItemsCount} dòng cước
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      disabled={restoringSnapId === snap.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {restoringSnapId === snap.id ? 'Đang khôi phục...' : 'Quay Về Mốc Này'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: OFFLINE OUTBOX QUEUE & STRICT SHIELD STATUS */}
      {subTab === 'OUTBOX_SHIELD' && (
        <div className="space-y-4">
          {/* Active Guards Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Strict Real-Data Shield</span>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] font-bold text-emerald-700">
                {STRICT_REAL_DATA_ONLY ? 'ĐANG BẬT (100% Dữ liệu thật)' : 'Tắt'}
              </p>
              <p className="text-[11px] text-slate-500">
                Chặn hoàn toàn auto-seed dữ liệu giả lập và từ chối ghi bản ghi mẫu lên Cloud.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Sync Epoch Guard</span>
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <p
                className={`text-[11px] font-bold ${
                  syncEpoch.hasCompletedInitialCloudPull ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {syncEpoch.hasCompletedInitialCloudPull
                  ? 'Đã đồng bộ xong từ Cloud'
                  : 'Đang khóa đẩy Storage'}
              </p>
              <p className="text-[11px] text-slate-500">
                Ngăn thiết bị cũ hoặc rỗng ghi đè bản sao lưu Firebase Storage trước khi kéo Cloud xong.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Hard-Delete Shield</span>
                <Database className="w-4 h-4 text-slate-700" />
              </div>
              <p className="text-[11px] font-bold text-emerald-700">
                Bất khả xóa cứng trên Cloud
              </p>
              <p className="text-[11px] text-slate-500">
                Firestore Rules khóa delete vĩnh viễn; mọi lệnh xóa chỉ chuyển vào Thùng Rác 90 ngày.
              </p>
            </div>
          </div>

          {/* Offline Outbox Queue */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <CloudOff className="w-4 h-4 text-amber-600" />
                  <span>Hàng Đợi Đồng Bộ Offline An Toàn ({outboxItems.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi mất mạng, thao tác lưu được xếp vào đây và tự động đẩy lên Cloud theo thứ tự ngay khi có mạng trở lại.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFlushOutbox}
                disabled={isFlushingOutbox || outboxItems.length === 0}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingOutbox ? 'animate-spin' : ''}`} />
                <span>{isFlushingOutbox ? 'Đang đẩy...' : 'Đồng Bộ Ngay'}</span>
              </button>
            </div>

            {outboxItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                Hàng đợi trống — toàn bộ thay đổi đã được xác nhận trên Cloud.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
                {outboxItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.label || item.docId}</span>
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.collectionName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span className="font-mono tabular-nums">
                          {new Date(item.queuedAt).toLocaleString('vi-VN')}
                        </span>
                        {item.lastError && (
                          <span className="text-rose-600 font-semibold">{item.lastError}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOutboxItems(removeOfflineOutboxItem(item.id))}
                      className="px-2.5 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-semibold"
                    >
                      Bỏ khỏi hàng đợi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MODULAR FIREBASE STORAGE CLOUD VAULT & 1-CLICK LEGACY MIGRATOR */}
      {subTab === 'CLOUD_VAULT' && (
        <div className="space-y-4">
          {/* Legacy LocalStorage Scanner & 1-Click Migrator */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <HardDriveUpload className="w-4 h-4 text-indigo-600" />
                  <span>Di Cư Dữ Liệu LocalStorage Cũ Lên Firebase Storage</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quét toàn bộ dữ liệu cũ còn sót lại trên trình duyệt máy này, hợp nhất lên Firebase Storage và dọn sạch LocalStorage chỉ với 1 bấm.
                </p>
              </div>
              <button
                type="button"
                onClick={handleMigrateLegacyStorage}
                disabled={isMigratingLegacy || legacyReport.totalLegacyKeysFound === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-45"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isMigratingLegacy ? 'animate-spin' : ''}`} />
                <span>
                  {isMigratingLegacy
                    ? 'Đang di cư...'
                    : legacyReport.totalLegacyKeysFound > 0
                    ? `Đẩy Lên Cloud & Xóa LocalStorage (${legacyReport.totalLegacyKeysFound})`
                    : 'Đã Sạch LocalStorage'}
                </span>
              </button>
            </div>

            {legacyReport.totalLegacyKeysFound === 0 ? (
              <div className="p-4 flex items-center gap-2.5 text-emerald-800 bg-emerald-50/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[11px]">
                  Trình duyệt này đã sạch 100% LocalStorage. Mọi phân hệ đang đồng bộ trực tiếp trên Firebase Storage Cloud Vault.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {legacyReport.items.map((item) => (
                  <div key={item.moduleKey} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900">{item.labelVi}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-500">
                        {item.legacyKeys.join(', ')}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {item.recordCount} mục
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 14-Module Cloud Vault Status */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>Trạng Thái 14 Phân Hệ Trên Firebase Storage (Multi-Device)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đọc 0ms từ RAM Cache, tự động đẩy lên Firebase Storage theo từng module độc lập và báo đồng bộ tức thì qua _vault_manifest.
                </p>
              </div>
              <button
                type="button"
                onClick={handleForceHydrateCloudVault}
                disabled={isHydratingCloudVault}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isHydratingCloudVault ? 'animate-spin' : ''}`} />
                <span>Tải Lại Tất Cả</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {cloudModules.map((mod) => (
                <div
                  key={mod.key}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{mod.labelVi}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {mod.key}.json
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="font-mono tabular-nums">rev {mod.rev}</span>
                      {mod.updatedAt ? (
                        <span className="font-mono tabular-nums">
                          {new Date(mod.updatedAt).toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <span>Chưa có dữ liệu trên Storage</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {mod.count} mục
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        mod.isDirty
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : mod.rev > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {mod.isDirty ? 'Đang đẩy...' : mod.rev > 0 ? 'Đã đồng bộ' : 'Sẵn sàng'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DataVaultModalProps extends DataVaultPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataVaultModal: React.FC<DataVaultModalProps> = ({
  isOpen,
  onClose,
  quotes,
  activeQuote,
  onRefreshData,
  onRestoreQuote,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-50 text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base tracking-tight">
                KÉT SẮT BẢO TOÀN DỮ LIỆU &amp; TIME-TRAVEL (DATA VAULT)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Khôi phục bản ghi đã xóa 90 ngày, quay ngược phiên bản bất biến và quản lý hàng đợi Offline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <DataVaultPanel
            quotes={quotes}
            activeQuote={activeQuote}
            onRefreshData={onRefreshData}
            onRestoreQuote={onRestoreQuote}
          />
        </div>
      </div>
    </div>
  );
};
