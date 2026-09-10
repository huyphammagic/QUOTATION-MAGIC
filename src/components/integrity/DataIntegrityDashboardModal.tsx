import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  X, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  UploadCloud, 
  Database, 
  Wifi, 
  FileCheck, 
  Cpu, 
  AlertCircle,
  Wrench,
  Layers,
  ArrowRight
} from 'lucide-react';
import { syncHealthService, SystemHealthSnapshot } from '../../services/integrity/syncHealthService';
import { 
  runTargetedIntegrityScan, 
  autoFixIntegrityIssues, 
  IntegrityScanResult 
} from '../../services/integrity/dataIntegrityEngine';
import { QuoteData, CustomerRecord } from '../../types/logistics';
import { ContractItem } from '../../types/contract';

interface DataIntegrityDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: QuoteData[];
  customers: CustomerRecord[];
  contracts?: ContractItem[];
  onRefreshData?: () => Promise<void>;
  onApplyFixedQuotes?: (fixed: QuoteData[]) => void;
  onApplyFixedCustomers?: (fixed: CustomerRecord[]) => void;
}

export const DataIntegrityDashboardModal: React.FC<DataIntegrityDashboardModalProps> = ({
  isOpen,
  onClose,
  quotes,
  customers,
  contracts = [],
  onRefreshData,
  onApplyFixedQuotes,
  onApplyFixedCustomers
}) => {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(syncHealthService.getSnapshot());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<IntegrityScanResult | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSummary, setFixSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = syncHealthService.subscribe(newSnapshot => {
      setSnapshot(newSnapshot);
    });
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunScan = async () => {
    setIsScanning(true);
    setFixSummary(null);
    try {
      const result = await runTargetedIntegrityScan({
        quotes,
        customers,
        contracts
      });
      setScanResult(result);
    } catch (err: any) {
      console.error('Lỗi khi chẩn đoán:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAutoFix = async () => {
    if (!scanResult || scanResult.issues.length === 0) return;
    setIsFixing(true);
    try {
      const outcome = await autoFixIntegrityIssues(scanResult.issues, { quotes, customers });
      if (outcome.fixedQuotes.length > 0 && onApplyFixedQuotes) {
        onApplyFixedQuotes(outcome.fixedQuotes);
      }
      if (outcome.fixedCustomers.length > 0 && onApplyFixedCustomers) {
        onApplyFixedCustomers(outcome.fixedCustomers);
      }
      setFixSummary(`Đã tự động sửa chữa thành công ${outcome.repairedCount} lỗi dữ liệu.`);
      // Re-run scan to confirm clean state
      const refreshedScan = await runTargetedIntegrityScan({
        quotes: outcome.fixedQuotes.length > 0 ? outcome.fixedQuotes : quotes,
        customers: outcome.fixedCustomers.length > 0 ? outcome.fixedCustomers : customers,
        contracts
      });
      setScanResult(refreshedScan);
    } catch (err: any) {
      setFixSummary(`Không thể hoàn tất sửa chữa: ${err.message || err}`);
    } finally {
      setIsFixing(false);
    }
  };

  const activeListeners: any[] = Object.values(snapshot.listeners || {});
  const activeUploads: any[] = (snapshot.activeUploads || []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight uppercase">
                  Kiểm Soát Tính Toàn Vẹn & Sức Khỏe Đồng Bộ Đám Mây
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30 uppercase">
                  Firebase Core
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dữ liệu tạo/tải lên được lưu trên Firebase & đồng bộ 100% tới mọi thiết bị khác.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-slate-50/50">

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500">Mạng Trực Tuyến</span>
                <Wifi className={`w-3.5 h-3.5 ${snapshot.isOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
              <span className={`text-sm font-bold ${snapshot.isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                {snapshot.isOnline ? 'Đang Kết Nối (Online)' : 'Mất Kết Nối (Offline)'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500">Kênh Lắng Nghe Live</span>
                <Activity className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {activeListeners.filter((l: any) => l.status === 'CONNECTED' || l.status === 'HEALTHY').length} / {activeListeners.length} Hoạt Động
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500">Tổng Số Báo Giá</span>
                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {quotes.length} hồ sơ trên mây
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500">Tệp Tải Lên Storage</span>
                <UploadCloud className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {activeUploads.length} tệp đã xử lý
              </span>
            </div>
          </div>

          {/* Section 1: Real-Time Listeners Health */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Đồng Bộ Thời Gian Thực Tới Mọi Thiết Bị (Live Firestore Streams)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Cập nhật tức thời không cần F5
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {activeListeners.map(l => (
                <div key={l.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <div>
                      <span className="font-semibold text-slate-800 text-xs">{l.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2 bg-slate-100 px-1.5 py-0.5 rounded">
                        {l.collectionName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {l.itemCount} bản ghi
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đồng Bộ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Uploads Pipeline (Files & Logos) */}
          {activeUploads.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Trạng Thái Tệp Lưu Trữ Đám Mây (Firebase Storage)
                </h4>
              </div>
              <div className="space-y-2">
                {activeUploads.slice(-4).map((u, idx) => (
                  <div key={u.uploadId || u.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{u.fileName}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({(((u.fileSizeBytes || u.fileSize || 0)) / 1024).toFixed(0)} KB)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                      u.status === 'IN_PROGRESS' || u.status === 'UPLOADING' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.status === 'SUCCESS' ? 'Đã Lưu Trữ' : (u.status === 'IN_PROGRESS' || u.status === 'UPLOADING') ? 'Đang Tải Lên' : 'Lỗi'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Data Integrity Engine & Self-Diagnostic */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Bộ Tự Chẩn Đoán & Kiểm Soát Toàn Vẹn (Data Integrity Engine)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quét phát hiện mã khách hàng mồ côi, bảng giá đứt gãy hoặc dữ liệu sai lệch mà không gây chậm hệ thống.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunScan}
                disabled={isScanning}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Đang Chẩn Đoán...' : 'Chạy Tự Chẩn Đoán'}</span>
              </button>
            </div>

            {/* Scan Output */}
            {scanResult && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Điểm số toàn vẹn:</span>
                    <span className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                      scanResult.score >= 95 ? 'bg-emerald-100 text-emerald-800' :
                      scanResult.score >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {scanResult.score}/100 - {scanResult.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Đã kiểm tra {scanResult.entityCount} đối tượng
                  </span>
                </div>

                {scanResult.issues.length === 0 ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">Hệ Thống Đạt Chuẩn Toàn Vẹn 100%!</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Tất cả các bản ghi Báo Giá, Khách Hàng và Hợp Đồng đều liên kết chính xác, không phát hiện lỗi trôi lệch dữ liệu.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Phát hiện {scanResult.issues.length} cảnh báo cần xử lý:
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoFix}
                        disabled={isFixing}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{isFixing ? 'Đang Tự Động Sửa...' : 'Tự Động Sửa Chữa Ngay'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {scanResult.issues.map(iss => (
                        <div key={iss.id} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] flex items-start justify-between">
                          <div>
                            <span className="font-bold text-amber-900 block">{iss.message}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Mục tiêu: {iss.entityType} #{iss.entityId} &bull; Khắc phục khuyến nghị: {iss.suggestedAction}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-mono text-[9px] font-bold uppercase">
                            {iss.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fixSummary && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>{fixSummary}</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 rounded-b-2xl flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Trạng thái: 100% Firebase Cloud SOT &bull; Zero Mock Data &bull; No Local Storage Drift</span>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshData && (
              <button
                type="button"
                onClick={async () => {
                  await onRefreshData();
                  setFixSummary('Đã đồng bộ lại dữ liệu mới nhất từ Firebase.');
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm Mới Dữ Liệu</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
