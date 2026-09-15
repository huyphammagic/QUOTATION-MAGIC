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
  Search,
  Filter,
  Check,
  EyeOff,
  History,
  HardDrive,
  Clock,
  ExternalLink,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
  Terminal,
  Play
} from 'lucide-react';
import { 
  runAutomatedRegressionSuite, 
  RegressionSuiteReport 
} from '../../services/integrity/regressionProtectionEngine';
import { syncHealthService, SystemHealthSnapshot } from '../../services/integrity/syncHealthService';
import { 
  runTargetedIntegrityScan, 
  fetchPersistedIssues,
  updateIssueStatus,
  executeSafeAutoRecovery,
  IntegrityScanReport 
} from '../../services/integrity/dataIntegrityEngine';
import { fetchHealthAudits } from '../../services/audit/systemHealthAuditService';
import { 
  IntegrityIssueRecord, 
  IssueStatus, 
  IssueSeverity, 
  IntegrityModuleType, 
  SystemHealthAuditEntry,
  StorageHealthItem,
  ListenerHealthRecord
} from '../../types/systemHealth';
import { QuoteData, CustomerRecord, CompanyProfile } from '../../types/logistics';
import { ContractItem } from '../../types/contract';
import { INTEGRITY_I18N, IntegrityLanguage } from '../../i18n/integrity';

interface DataIntegrityDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: QuoteData[];
  customers: CustomerRecord[];
  company?: CompanyProfile | null;
  contracts?: ContractItem[];
  onRefreshData?: () => Promise<void>;
  onApplyFixedQuotes?: (fixed: QuoteData[]) => void;
  onApplyFixedCustomers?: (fixed: CustomerRecord[]) => void;
  lang?: IntegrityLanguage;
}

type ActiveTab = 'HEALTH' | 'ISSUES' | 'SCAN' | 'STORAGE' | 'AUDIT' | 'REGRESSION';

export const DataIntegrityDashboardModal: React.FC<DataIntegrityDashboardModalProps> = ({
  isOpen,
  onClose,
  quotes,
  customers,
  company = null,
  contracts = [],
  onRefreshData,
  onApplyFixedQuotes,
  onApplyFixedCustomers,
  lang = 'vi',
}) => {
  const t = INTEGRITY_I18N[lang] || INTEGRITY_I18N.vi;

  const [activeTab, setActiveTab] = useState<ActiveTab>('HEALTH');
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(syncHealthService.getSnapshot());
  const [isScanning, setIsScanning] = useState(false);
  const [scanReport, setScanReport] = useState<IntegrityScanReport | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  // Automated Regression Test Suite state (Phase 32)
  const [isRunningRegression, setIsRunningRegression] = useState(false);
  const [regressionReport, setRegressionReport] = useState<RegressionSuiteReport | null>(null);

  // Issues Center state
  const [issuesList, setIssuesList] = useState<IntegrityIssueRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Storage and Audit logs state
  const [auditLogs, setAuditLogs] = useState<SystemHealthAuditEntry[]>([]);
  const [storageItems, setStorageItems] = useState<StorageHealthItem[]>([]);

  // Subscriptions & initial data fetch
  useEffect(() => {
    if (!isOpen) return;

    const unsub = syncHealthService.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    // Load persisted issues & audit logs
    fetchPersistedIssues('company_profile', 50).then((items) => {
      setIssuesList(items);
    });

    fetchHealthAudits('company_profile', 40).then((logs) => {
      setAuditLogs(logs);
    });

    return () => unsub();
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Run targeted scan
  const handleRunScan = async () => {
    setIsScanning(true);
    setRecoveryMessage(null);
    try {
      const report = await runTargetedIntegrityScan({
        companyId: 'company_profile',
        quotes,
        customers,
        company,
        contracts,
      });
      setScanReport(report);
      setStorageItems(report.storageAudits);
      
      // Update issue list with new issues found
      const refreshed = await fetchPersistedIssues('company_profile', 50);
      setIssuesList(refreshed);
    } catch (err: any) {
      console.error('[DataIntegrityDashboardModal] Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Safe Auto-Recovery action
  const handleSafeRecovery = async () => {
    const openIssues = issuesList.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING');
    if (openIssues.length === 0 && (!scanReport || scanReport.issues.length === 0)) return;

    setIsRecovering(true);
    try {
      const issuesToFix = scanReport?.issues || openIssues;
      const outcome = await executeSafeAutoRecovery(issuesToFix, { quotes, customers });
      
      if (outcome.fixedQuotes.length > 0 && onApplyFixedQuotes) {
        onApplyFixedQuotes(outcome.fixedQuotes);
      }

      setRecoveryMessage(`Đã tái liên kết an toàn thành công ${outcome.repairedCount} mục.`);
      
      // Refresh scan
      const refreshedScan = await runTargetedIntegrityScan({
        companyId: 'company_profile',
        quotes: outcome.fixedQuotes.length > 0 ? outcome.fixedQuotes : quotes,
        customers,
        company,
        contracts,
      });
      setScanReport(refreshedScan);

      const refreshedIssues = await fetchPersistedIssues('company_profile', 50);
      setIssuesList(refreshedIssues);

      const refreshedLogs = await fetchHealthAudits('company_profile', 40);
      setAuditLogs(refreshedLogs);
    } catch (err: any) {
      setRecoveryMessage(`Lỗi phục hồi: ${err.message || err}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // Issue status transition
  const handleUpdateIssueStatus = async (issueId: string, status: IssueStatus) => {
    await updateIssueStatus(issueId, status, `Chuyển trạng thái sang ${status} từ Dashboard`);
    const refreshed = await fetchPersistedIssues('company_profile', 50);
    setIssuesList(refreshed);
    const refreshedLogs = await fetchHealthAudits('company_profile', 40);
    setAuditLogs(refreshedLogs);
  };

  // Filter issues
  const filteredIssues = issuesList.filter((iss) => {
    if (statusFilter !== 'ALL' && iss.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
    if (moduleFilter !== 'ALL' && iss.module !== moduleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = iss.title.toLowerCase().includes(q);
      const matchDesc = iss.description.toLowerCase().includes(q);
      const matchId = iss.entityId.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId) return false;
    }
    return true;
  });

  const activeListeners = Object.values(snapshot.listeners || {}) as ListenerHealthRecord[];
  const activeUploads = snapshot.activeUploads || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight uppercase">
                  {t.integrityDashboardTitle}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full border border-emerald-400/30 uppercase">
                  PHASE 27 CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.integrityDashboardSubtitle}
              </p>
            </div>
          </div>
          <button
            id="close-integrity-dashboard-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t.actionClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs font-semibold gap-1 shrink-0">
          <button
            id="tab-system-health"
            type="button"
            onClick={() => setActiveTab('HEALTH')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'HEALTH'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.tabSystemHealth}</span>
            <span className={`w-2 h-2 rounded-full ${snapshot.globalStatus === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>

          <button
            id="tab-issue-center"
            type="button"
            onClick={() => setActiveTab('ISSUES')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'ISSUES'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.tabIssueCenter}</span>
            {issuesList.filter(i => i.status === 'OPEN').length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                {issuesList.filter(i => i.status === 'OPEN').length}
              </span>
            )}
          </button>

          <button
            id="tab-targeted-scan"
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'SCAN'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.tabTargetedScan}</span>
          </button>

          <button
            id="tab-storage-audit"
            type="button"
            onClick={() => setActiveTab('STORAGE')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'STORAGE'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.tabStorageAudit}</span>
          </button>

          <button
            id="tab-audit-logs"
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'AUDIT'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.tabAuditLogs}</span>
            <span className="text-[10px] font-mono text-slate-400">({auditLogs.length})</span>
          </button>

          <button
            id="tab-regression-suite"
            type="button"
            onClick={() => setActiveTab('REGRESSION')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'REGRESSION'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-violet-600" />
            <span>Kiểm thử hồi quy (Regression)</span>
            <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">
              PHASE 32
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs bg-slate-50/50">

          {/* TAB 1: SYSTEM HEALTH OVERVIEW */}
          {activeTab === 'HEALTH' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-ping ${
                    snapshot.globalStatus === 'HEALTHY' ? 'bg-emerald-500' :
                    snapshot.globalStatus === 'CONFLICT' ? 'bg-rose-600' :
                    snapshot.globalStatus === 'SYNC_PENDING' ? 'bg-amber-400' : 'bg-blue-500'
                  }`} />
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Trạng thái kỹ thuật hệ thống
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {snapshot.globalStatus === 'HEALTHY' ? t.statusHealthy :
                       snapshot.globalStatus === 'CONFLICT' ? t.statusConflict :
                       snapshot.globalStatus === 'SYNC_PENDING' ? t.statusSyncPending :
                       snapshot.globalStatus === 'SYNC_FAILED' ? t.statusSyncFailed :
                       snapshot.globalStatus === 'NETWORK_ERROR' ? t.statusNetworkError : snapshot.globalStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500">Trạng thái lưu:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    {snapshot.saveState === 'SAVED' ? t.saveSaved :
                     snapshot.saveState === 'SAVING' ? t.saveSaving :
                     snapshot.saveState === 'SAVE_FAILED' ? t.saveSaveFailed :
                     snapshot.saveState === 'CONFLICT' ? t.saveConflict :
                     snapshot.saveState === 'RETRYING' ? t.saveRetrying : t.saveUnsaved}
                  </span>
                </div>
              </div>

              {/* Guarantees Callout */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Nguyên Tắc Bất Biến Về Tính Toàn Vẹn & Nguồn Sự Thật
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  &bull; {t.cloudConfirmationNotice}<br />
                  &bull; {t.crossDeviceNotice}<br />
                  &bull; {t.safeRecoveryNotice}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block mb-1">Mạng & Kết Nối</span>
                  <span className={`font-bold text-xs ${snapshot.isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {snapshot.isOnline ? 'Online (Trực Tuyến)' : 'Offline (Mất Mạng)'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block mb-1">Kênh Lắng Nghe Firestore</span>
                  <span className="font-bold text-xs text-slate-900">
                    {activeListeners.filter((l: any) => l.status === 'CONNECTED').length} / {activeListeners.length} Kết Nối
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block mb-1">Hồ Sơ Báo Giá Cloud</span>
                  <span className="font-bold text-xs text-slate-900">{quotes.length} bản ghi</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block mb-1">Khách Hàng Cloud</span>
                  <span className="font-bold text-xs text-slate-900">{customers.length} bản ghi</span>
                </div>
              </div>

              {/* Realtime Streams Table */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Kênh Lắng Nghe Thời Gian Thực (Live Firestore Streams)
                  </h4>
                  <span className="text-[11px] text-slate-400">Tự động cập nhật hai chiều</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {activeListeners.map((l) => (
                    <div key={l.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="font-semibold text-slate-800 text-xs">{l.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {l.collectionName}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt Động
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ISSUE CENTER */}
          {activeTab === 'ISSUES' && (
            <div className="space-y-4">
              {/* Filter Controls */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm sự cố theo mã, mô tả, hoặc entity ID..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="OPEN">Đang mở (OPEN)</option>
                    <option value="INVESTIGATING">Đang kiểm tra</option>
                    <option value="RESOLVED">Đã xử lý</option>
                    <option value="IGNORED">Đã bỏ qua</option>
                  </select>

                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Tất cả mức độ</option>
                    <option value="CRITICAL">Nghiêm trọng</option>
                    <option value="ERROR">Lỗi</option>
                    <option value="WARNING">Cảnh báo</option>
                    <option value="INFO">Thông tin</option>
                  </select>

                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="ALL">Tất cả phân hệ</option>
                    <option value="QUOTATION">Báo Giá</option>
                    <option value="CUSTOMER">Khách Hàng</option>
                    <option value="RATE">Biểu Cước</option>
                    <option value="CONTRACT">Hợp Đồng</option>
                    <option value="STORAGE">Storage</option>
                  </select>
                </div>
              </div>

              {/* Issues List */}
              {filteredIssues.length === 0 ? (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">{t.noIssuesFound}</p>
                  <p className="text-slate-500 text-xs">Mọi đối tượng dữ liệu đều đồng bộ và đạt chuẩn toàn vẹn.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredIssues.map((iss) => (
                    <div
                      key={iss.id}
                      className={`p-3.5 bg-white rounded-xl border transition-all ${
                        iss.severity === 'CRITICAL' ? 'border-rose-300 bg-rose-50/20' :
                        iss.severity === 'ERROR' ? 'border-amber-300 bg-amber-50/20' :
                        'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              iss.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              iss.severity === 'ERROR' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              iss.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {iss.severity}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{iss.title}</span>
                            <span className="text-[10px] font-mono text-slate-400">[{iss.module} &bull; #{iss.entityId}]</span>
                          </div>

                          <p className="text-[11px] text-slate-600">{iss.description}</p>
                          <p className="text-[10px] text-slate-400">
                            Khuyến nghị: <span className="text-slate-700 font-medium">{iss.recommendation}</span>
                          </p>
                        </div>

                        {/* Status Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {iss.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(iss.id, 'RESOLVED')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title={t.actionResolve}
                            >
                              <Check className="w-3 h-3" />
                              <span>Xử Lý</span>
                            </button>
                          )}

                          {iss.status !== 'IGNORED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(iss.id, 'IGNORED')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                              title={t.actionIgnore}
                            >
                              <EyeOff className="w-3 h-3" />
                              <span>Bỏ Qua</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TARGETED SCAN */}
          {activeTab === 'SCAN' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                      {t.tabTargetedScan}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Quét theo phạm vi Báo Giá, Khách Hàng, Biểu Cước và Hồ Sơ Doanh Nghiệp mà không quét mù Firestore.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="run-targeted-scan-btn"
                      type="button"
                      onClick={handleRunScan}
                      disabled={isScanning}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? t.scanInProgress : t.actionRunScan}</span>
                    </button>
                  </div>
                </div>

                {/* Scan Results */}
                {scanReport && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{t.metricsIntegrityScore}:</span>
                        <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded ${
                          scanReport.score >= 95 ? 'bg-emerald-100 text-emerald-800' :
                          scanReport.score >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {scanReport.score}/100 - {scanReport.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Kiểm tra {scanReport.totalEntitiesChecked} đối tượng
                      </span>
                    </div>

                    {scanReport.issues.length === 0 ? (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-xs">Hệ Thống Đạt Chuẩn Toàn Vẹn 100%!</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Không phát hiện liên kết gãy, trùng lặp mã hoặc sai lệch công thức giá.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Phát hiện {scanReport.issues.length} sự cố cần can thiệp:
                          </span>
                          <button
                            type="button"
                            onClick={handleSafeRecovery}
                            disabled={isRecovering}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>{isRecovering ? 'Đang Tự Động Sửa...' : 'Tự Động Sửa Chữa An Toàn'}</span>
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {scanReport.issues.map((iss) => (
                            <div key={iss.id} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] flex items-start justify-between">
                              <div>
                                <span className="font-bold text-amber-900 block">{iss.title}</span>
                                <span className="text-[10px] text-slate-500 mt-0.5 block">{iss.description}</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-mono text-[9px] font-bold uppercase">
                                {iss.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {recoveryMessage && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>{recoveryMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE & DOCUMENTS AUDIT */}
          {activeTab === 'STORAGE' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    Kiểm Toán Tệp & Lưu Trữ Đám Mây (Firebase Storage)
                  </h4>
                  <span className="text-[11px] text-slate-400">Kiểm tra tính hợp lệ và đường dẫn vĩnh viễn</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {storageItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Chưa có dữ liệu kiểm toán tệp. Nhấn &quot;Quét Toàn Vẹn Ngay&quot; ở tab Quét để phân tích tài liệu lưu trữ.
                    </div>
                  ) : (
                    storageItems.map((item) => (
                      <div key={item.fileId} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-xs">{item.fileName}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.entityType}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Đường dẫn: {item.storagePath || 'Không có'}</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'HEALTHY' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          item.status === 'SUSPICIOUS' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & CONCURRENCY */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-600" />
                    Nhật Ký Đồng Bộ, Thử Lại & Xung Đột (System Health Audits)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Tự động ghi nhận lên Firestore</span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Chưa có nhật ký lỗi hoặc xung đột nào được ghi nhận.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              log.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                              log.result === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.action}
                            </span>
                            <span className="font-bold text-slate-800">{log.entityType} #{log.entityId}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-[11px] text-slate-600 mt-1">{log.details}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">By {log.userId}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUTOMATED REGRESSION SUITE (PHASE 32) */}
          {activeTab === 'REGRESSION' && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-violet-600" />
                    <span>Bộ Kiểm Thử Hồi Quy Toàn Diện (Automated Regression Engine)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kiểm định 10 kịch bản nghiệp vụ: Air CW, LCL W/M, Money Safety, Rounding Rules, Immutability & Concurrency.
                  </p>
                </div>
                <button
                  id="run-regression-suite-btn"
                  type="button"
                  disabled={isRunningRegression}
                  onClick={async () => {
                    setIsRunningRegression(true);
                    try {
                      const report = await runAutomatedRegressionSuite();
                      setRegressionReport(report);
                    } finally {
                      setIsRunningRegression(false);
                    }
                  }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
                >
                  {isRunningRegression ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{isRunningRegression ? 'Đang chạy kiểm định...' : 'Chạy kiểm thử ngay'}</span>
                </button>
              </div>

              {regressionReport ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    regressionReport.allPassed 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      {regressionReport.allPassed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-rose-600" />
                      )}
                      <div>
                        <div className="font-extrabold text-sm">
                          {regressionReport.allPassed ? '100% KIỂM THỬ THÀNH CÔNG (PASSED)' : 'CÓ BÀI KIỂM THỬ KHÔNG ĐẠT'}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Đã vượt qua {regressionReport.passedCount}/{regressionReport.totalTests} bài test trong {regressionReport.totalDurationMs}ms &bull; Zero Write to Firestore
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      regressionReport.allPassed ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                    }`}>
                      {regressionReport.passedCount} / {regressionReport.totalTests} ĐẠT
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {regressionReport.results.map((test) => (
                      <div
                        key={test.id}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          test.passed 
                            ? 'bg-white border-slate-200 hover:border-emerald-300' 
                            : 'bg-rose-50 border-rose-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border">
                              {test.id}
                            </span>
                            <span className="font-bold text-slate-800">{test.nameVi}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({test.category})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{test.nameEn}</div>
                          {test.error && (
                            <div className="text-[11px] font-bold text-rose-600 mt-1 font-mono">
                              Lỗi: {test.error}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            {test.executionTimeMs}ms
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            test.passed 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {test.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Sẵn sàng chạy bộ kiểm thử hồi quy Phase 32</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Bộ kiểm định tự động chạy hoàn toàn trong bộ nhớ RAM, kiểm chứng độ chính xác của các công thức tính giá, làm tròn tiền tệ và bảo vệ tính bất biến của dữ liệu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRunningRegression(true);
                      try {
                        const report = await runAutomatedRegressionSuite();
                        setRegressionReport(report);
                      } finally {
                        setIsRunningRegression(false);
                      }
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Kích hoạt Kiểm thử ngay</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Single Source of Truth: Firebase Cloud Firestore & Storage &bull; Concurrency Safe</span>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshData && (
              <button
                type="button"
                onClick={async () => {
                  await onRefreshData();
                  setRecoveryMessage('Đã đồng bộ lại dữ liệu mới nhất từ Firebase.');
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.actionForceSync}</span>
              </button>
            )}
            <button
              id="close-integrity-modal-bottom-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
            >
              {t.actionClose}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
