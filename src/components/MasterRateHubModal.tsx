import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  History, 
  ShieldCheck, 
  Clock, 
  Building, 
  Download, 
  Upload, 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Check,
  AlertCircle,
  GitCompare,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { 
  RateMasterItem, 
  ChargeMasterItem, 
  RateHistoryItem, 
  SupplierItem, 
  CarrierItem, 
  RateApprovalRequest, 
  RateRequestItem 
} from '../types/masterRate';
import { validateChargeMaster } from '../services/masterRate/rateValidator';
import { createNewRateVersion, duplicateRateMaster } from '../services/masterRate/rateSnapshot';
import { exportRatesToCsv } from '../services/masterRate/rateImportExportService';
import { 
  loadSuppliers, 
  saveSupplier, 
  removeSupplier, 
  loadCarriers, 
  saveCarrier, 
  removeCarrier 
} from '../services/masterRate/supplierCarrierService';
import { 
  loadRateApprovals, 
  submitForApproval, 
  approveRateRequest, 
  rejectRateRequest 
} from '../services/masterRate/rateApprovalService';
import { 
  loadRateRequests, 
  saveRateRequest, 
  removeRateRequest 
} from '../services/masterRate/rateRequestService';
import { batchSaveMasterRatesToFirestore } from '../services/firebase/firestoreService';

import { RateTableTab } from './rateEngine/RateTableTab';
import { RateFormModal } from './rateEngine/RateFormModal';
import { RateApprovalTab } from './rateEngine/RateApprovalTab';
import { RateRequestTab } from './rateEngine/RateRequestTab';
import { SupplierCarrierTab } from './rateEngine/SupplierCarrierTab';
import { RateExpiringTab } from './rateEngine/RateExpiringTab';
import { RateBulkImportModal } from './rateEngine/RateBulkImportModal';
import { RateComparisonTab } from './rateEngine/RateComparisonTab';
import { RateMatchingPlayground } from './rateEngine/RateMatchingPlayground';

interface MasterRateHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: RateMasterItem[];
  chargeMasters: ChargeMasterItem[];
  rateHistories: RateHistoryItem[];
  onSaveRate: (rate: RateMasterItem) => Promise<void>;
  onDeleteRate: (id: string, softDelete?: boolean) => Promise<void>;
  onSaveCharge: (charge: ChargeMasterItem) => Promise<void>;
  onDeleteCharge: (id: string) => Promise<void>;
  onBulkImportRates: (rates: RateMasterItem[]) => Promise<void>;
}

export const MasterRateHubModal: React.FC<MasterRateHubModalProps> = ({
  isOpen,
  onClose,
  rates,
  chargeMasters,
  rateHistories,
  onSaveRate,
  onDeleteRate,
  onSaveCharge,
  onDeleteCharge,
  onBulkImportRates,
}) => {
  const [activeTab, setActiveTab] = useState<
    'RATES' | 'COMPARISON' | 'MATCHING' | 'EXPIRING' | 'APPROVALS' | 'REQUESTS' | 'ENTITIES' | 'CHARGES' | 'AUDIT'
  >('RATES');

  // Rate Form state
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Partial<RateMasterItem> | null>(null);

  // Bulk Excel/CSV Import Modal state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Charge Form Modal state
  const [isChargeFormOpen, setIsChargeFormOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Partial<ChargeMasterItem> | null>(null);
  const [chargeFormErrors, setChargeFormErrors] = useState<string[]>([]);

  // Phase 10 entities
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [carriers, setCarriers] = useState<CarrierItem[]>([]);
  const [approvals, setApprovals] = useState<RateApprovalRequest[]>([]);
  const [requests, setRequests] = useState<RateRequestItem[]>([]);

  // Load Phase 10 data on open
  useEffect(() => {
    if (isOpen) {
      loadSuppliers().then(setSuppliers);
      loadCarriers().then(setCarriers);
      loadRateApprovals().then(setApprovals);
      loadRateRequests().then(setRequests);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Rate Actions
  const handleOpenCreateRate = () => {
    setEditingRate(null);
    setIsRateFormOpen(true);
  };

  const handleEditRate = (rate: RateMasterItem) => {
    setEditingRate(rate);
    setIsRateFormOpen(true);
  };

  const handleDuplicateRate = async (rate: RateMasterItem) => {
    const dup = duplicateRateMaster(rate);
    await onSaveRate(dup);
  };

  const handleNewVersion = (rate: RateMasterItem) => {
    const newVer = createNewRateVersion(rate, {
      status: 'DRAFT',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setEditingRate(newVer);
    setIsRateFormOpen(true);
  };

  const handleSubmitForApproval = async (rate: RateMasterItem) => {
    const approvalReq = await submitForApproval(rate, 'Pricing Specialist');
    setApprovals(prev => [approvalReq, ...prev]);
    await onSaveRate({ ...rate, status: 'PENDING_APPROVAL' });
    alert(`Đã gửi bảng giá [${rate.rateCode}] vào hàng chờ phê duyệt.`);
  };

  const handleApproveRate = async (rate: RateMasterItem, approvalId: string, remarks?: string) => {
    const approvedRate = await approveRateRequest(rate, approvalId, 'Pricing Manager', remarks);
    await onSaveRate(approvedRate);
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'APPROVED', reviewedBy: 'Pricing Manager', reviewedAt: new Date().toISOString() } : a));
  };

  const handleRejectRate = async (rate: RateMasterItem, approvalId: string, reason: string) => {
    const rejectedRate = await rejectRateRequest(rate, approvalId, reason, 'Pricing Manager');
    await onSaveRate(rejectedRate);
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'REJECTED', rejectionReason: reason, reviewedBy: 'Pricing Manager', reviewedAt: new Date().toISOString() } : a));
  };

  const handleCompareRate = (rate: RateMasterItem) => {
    setActiveTab('COMPARISON');
  };

  // Supplier & Carrier Actions
  const handleSaveSupplierItem = async (sup: SupplierItem) => {
    await saveSupplier(sup);
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === sup.id);
      return idx >= 0 ? prev.map((s, i) => i === idx ? sup : s) : [sup, ...prev];
    });
  };

  const handleDeleteSupplierItem = async (id: string) => {
    await removeSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveCarrierItem = async (car: CarrierItem) => {
    await saveCarrier(car);
    setCarriers(prev => {
      const idx = prev.findIndex(c => c.id === car.id);
      return idx >= 0 ? prev.map((c, i) => i === idx ? car : c) : [car, ...prev];
    });
  };

  const handleDeleteCarrierItem = async (id: string) => {
    await removeCarrier(id);
    setCarriers(prev => prev.filter(c => c.id !== id));
  };

  // Request Actions
  const handleSaveRateRequestItem = async (req: RateRequestItem) => {
    await saveRateRequest(req);
    setRequests(prev => {
      const idx = prev.findIndex(r => r.id === req.id);
      return idx >= 0 ? prev.map((r, i) => i === idx ? req : r) : [req, ...prev];
    });
  };

  const handleDeleteRateRequestItem = async (id: string) => {
    await removeRateRequest(id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = exportRatesToCsv(rates);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LOGIQUOTE_Rates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Charge Actions
  const handleOpenChargeForm = (charge?: ChargeMasterItem) => {
    const nowStr = new Date().toISOString().slice(0, 10);
    if (charge) {
      setEditingCharge({ ...charge });
    } else {
      setEditingCharge({
        id: `chg-${Date.now()}`,
        chargeCode: '',
        chargeName: '',
        chargeNameEn: '',
        category: 'LOCAL_CHARGE',
        transportMode: 'ALL',
        location: 'POL',
        defaultBasis: 'PER_CONTAINER',
        defaultUnit: 'Container',
        defaultCurrency: 'USD',
        taxable: true,
        defaultVatRate: 5.26,
        description: '',
        status: 'ACTIVE',
        createdAt: nowStr,
        updatedAt: nowStr,
      });
    }
    setChargeFormErrors([]);
    setIsChargeFormOpen(true);
  };

  const handleSaveChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCharge) return;

    const validation = validateChargeMaster(editingCharge);
    if (!validation.isValid) {
      setChargeFormErrors(validation.errors.map(err => err.messageVi));
      return;
    }

    const fullCharge: ChargeMasterItem = {
      id: editingCharge.id || `chg-${Date.now()}`,
      chargeCode: (editingCharge.chargeCode || '').toUpperCase().trim(),
      chargeName: editingCharge.chargeName || '',
      chargeNameEn: editingCharge.chargeNameEn || editingCharge.chargeName || '',
      category: editingCharge.category || 'LOCAL_CHARGE',
      transportMode: editingCharge.transportMode || 'ALL',
      location: editingCharge.location || 'POL',
      defaultBasis: editingCharge.defaultBasis || 'PER_CONTAINER',
      defaultUnit: editingCharge.defaultUnit || 'Container',
      defaultCurrency: editingCharge.defaultCurrency || 'USD',
      taxable: editingCharge.taxable !== undefined ? editingCharge.taxable : true,
      defaultVatRate: Number(editingCharge.defaultVatRate) || 0,
      description: editingCharge.description || '',
      status: editingCharge.status || 'ACTIVE',
      createdAt: editingCharge.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    await onSaveCharge(fullCharge);
    setIsChargeFormOpen(false);
  };

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs overflow-hidden">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        id="master-rate-hub-container"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Rate Intelligence & Advanced Cost Hub
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                  Firebase Source of Truth
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-400/30">
                  Phase 13 Performance-First
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Định vị giá cước đa tầng, bộ lọc thông minh, streaming bulk import và bảo toàn dữ liệu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              title="Xuất bảng giá ra file CSV chuẩn UTF-8"
              id="btn-header-export-csv"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Xuất Excel CSV
            </button>
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              title="Nạp bảng giá hàng loạt từ Excel hoặc CSV (Streaming)"
              id="btn-header-import-csv"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Nạp Excel/CSV Hàng Loạt
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
              id="btn-close-master-hub"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 bg-slate-900 border-b border-slate-700 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('RATES')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'RATES'
                  ? 'border-blue-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-rates"
            >
              <Database className="w-4 h-4 text-blue-400" />
              Bảng Giá Master ({rates.length})
            </button>

            <button
              onClick={() => setActiveTab('COMPARISON')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'COMPARISON'
                  ? 'border-indigo-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-comparison"
            >
              <GitCompare className="w-4 h-4 text-indigo-400" />
              So Sánh & Phân Tích
            </button>

            <button
              onClick={() => setActiveTab('MATCHING')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'MATCHING'
                  ? 'border-purple-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-matching"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              Rate Matching Engine
            </button>

            <button
              onClick={() => setActiveTab('EXPIRING')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'EXPIRING'
                  ? 'border-amber-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-expiring"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Cảnh Báo Hết Hạn
            </button>

            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 relative ${
                activeTab === 'APPROVALS'
                  ? 'border-emerald-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-approvals"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Phê Duyệt Giá
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'REQUESTS'
                  ? 'border-sky-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-requests"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              Yêu Cầu Giá (Sales) ({requests.length})
            </button>

            <button
              onClick={() => setActiveTab('ENTITIES')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'ENTITIES'
                  ? 'border-purple-400 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-entities"
            >
              <Building className="w-4 h-4 text-purple-400" />
              Hãng Vận Chuyển & NCC
            </button>

            <button
              onClick={() => setActiveTab('CHARGES')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'CHARGES'
                  ? 'border-teal-500 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-charges"
            >
              <Layers className="w-4 h-4 text-teal-400" />
              Danh Mục Phí ({chargeMasters.length})
            </button>

            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                activeTab === 'AUDIT'
                  ? 'border-slate-400 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-btn-audit"
            >
              <History className="w-4 h-4 text-slate-400" />
              Nhật Ký Audit ({rateHistories.length})
            </button>
          </div>

          <div className="py-2 shrink-0">
            {activeTab === 'CHARGES' && (
              <button
                onClick={() => handleOpenChargeForm()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                id="btn-add-charge-master"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Phí Chuẩn
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {/* TAB 1: RATES */}
          {activeTab === 'RATES' && (
            <RateTableTab
              rates={rates}
              onOpenCreate={handleOpenCreateRate}
              onEditRate={handleEditRate}
              onDuplicateRate={handleDuplicateRate}
              onNewVersion={handleNewVersion}
              onDeleteRate={onDeleteRate}
              onSubmitApproval={handleSubmitForApproval}
              onCompareRate={handleCompareRate}
            />
          )}

          {/* TAB 2: COMPARISON MATRIX */}
          {activeTab === 'COMPARISON' && (
            <RateComparisonTab
              rates={rates}
              onEditRate={handleEditRate}
            />
          )}

          {/* TAB 3: RATE MATCHING ENGINE PLAYGROUND */}
          {activeTab === 'MATCHING' && (
            <RateMatchingPlayground
              rates={rates}
              onSelectRate={handleEditRate}
            />
          )}

          {/* TAB 4: EXPIRING & COVERAGE */}
          {activeTab === 'EXPIRING' && (
            <RateExpiringTab
              rates={rates}
              onRenewRate={handleNewVersion}
              onEditRate={handleEditRate}
            />
          )}

          {/* TAB 5: APPROVALS */}
          {activeTab === 'APPROVALS' && (
            <RateApprovalTab
              approvals={approvals}
              rates={rates}
              onApprove={handleApproveRate}
              onReject={handleRejectRate}
            />
          )}

          {/* TAB 6: REQUESTS */}
          {activeTab === 'REQUESTS' && (
            <RateRequestTab
              requests={requests}
              rates={rates}
              onSaveRequest={handleSaveRateRequestItem}
              onDeleteRequest={handleDeleteRateRequestItem}
            />
          )}

          {/* TAB 7: ENTITIES (CARRIERS & SUPPLIERS) */}
          {activeTab === 'ENTITIES' && (
            <SupplierCarrierTab
              suppliers={suppliers}
              carriers={carriers}
              onSaveSupplier={handleSaveSupplierItem}
              onDeleteSupplier={handleDeleteSupplierItem}
              onSaveCarrier={handleSaveCarrierItem}
              onDeleteCarrier={handleDeleteCarrierItem}
            />
          )}

          {/* TAB 8: CHARGE MASTERS */}
          {activeTab === 'CHARGES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Mã Phí</th>
                    <th className="py-3 px-3">Tên Phí (Tiếng Việt)</th>
                    <th className="py-3 px-3">Tên Tiếng Anh</th>
                    <th className="py-3 px-3">Phân Loại</th>
                    <th className="py-3 px-3">Phương Thức</th>
                    <th className="py-3 px-3">Vị Trí</th>
                    <th className="py-3 px-3">Quy Cách (Basis)</th>
                    <th className="py-3 px-3">VAT %</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chargeMasters.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Chưa có danh mục phí chuẩn nào.
                      </td>
                    </tr>
                  ) : (
                    chargeMasters.map((charge) => (
                      <tr key={charge.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{charge.chargeCode}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{charge.chargeName}</td>
                        <td className="py-3 px-3 text-slate-500 italic">{charge.chargeNameEn || '-'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {charge.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{charge.transportMode}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{charge.location}</td>
                        <td className="py-3 px-3 text-slate-600">{charge.defaultBasis}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{charge.defaultVatRate}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {charge.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenChargeForm(charge)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteCharge(charge.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: AUDIT HISTORIES */}
          {activeTab === 'AUDIT' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-3">Hành Động</th>
                    <th className="py-3 px-3">Mã Bảng Giá</th>
                    <th className="py-3 px-3">Người Thực Hiện</th>
                    <th className="py-3 px-4">Chi Tiết Thay Đổi / Audit Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rateHistories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Chưa có lịch sử thay đổi nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    rateHistories.map((hist) => (
                      <tr key={hist.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(hist.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            hist.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                            hist.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            hist.action === 'NEW_VERSION' ? 'bg-purple-100 text-purple-800' :
                            hist.action === 'APPROVE' ? 'bg-amber-100 text-amber-800' : 
                            hist.action === 'RATE_IMPORTED' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {hist.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{hist.rateCode}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{hist.performedBy || hist.actor}</td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{hist.details || hist.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: RATE FORM */}
        <RateFormModal
          isOpen={isRateFormOpen}
          onClose={() => setIsRateFormOpen(false)}
          rate={editingRate}
          existingRates={rates}
          chargeMasters={chargeMasters}
          suppliers={suppliers}
          carriers={carriers}
          onSave={async (savedRate) => {
            await onSaveRate(savedRate);
            setIsRateFormOpen(false);
          }}
        />

        {/* MODAL: BULK EXCEL & CSV STREAMING IMPORT */}
        <RateBulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          existingRates={rates}
          onConfirmImport={async (importedRates, jobId) => {
            await batchSaveMasterRatesToFirestore(importedRates, jobId, 'PRICING_USER');
            await onBulkImportRates(importedRates);
          }}
        />

        {/* MODAL: CHARGE MASTER FORM */}
        {isChargeFormOpen && editingCharge && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-base font-bold text-slate-800">
                  {editingCharge.chargeName ? 'Chỉnh Sửa Khoản Phí Chuẩn' : 'Thêm Mới Khoản Phí Chuẩn'}
                </h3>
                <button onClick={() => setIsChargeFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {chargeFormErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-4">
                  {chargeFormErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSaveChargeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mã Phí (Charge Code) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCharge.chargeCode || ''}
                      onChange={(e) => setEditingCharge(prev => ({ ...prev, chargeCode: e.target.value.toUpperCase() }))}
                      placeholder="VD: OFR, THC, BL..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phân Loại (Category)
                    </label>
                    <select
                      value={editingCharge.category || 'LOCAL_CHARGE'}
                      onChange={(e) => setEditingCharge(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    >
                      <option value="FREIGHT">Cước Chính (Freight)</option>
                      <option value="LOCAL_CHARGE">Phụ Phí Cảng (Local Charge)</option>
                      <option value="TRUCKING">Vận Chuyển Bộ (Trucking)</option>
                      <option value="CUSTOMS">Hải Quan (Customs)</option>
                      <option value="OTHER">Chi Phí Khác (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tên Phí (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCharge.chargeName || ''}
                    onChange={(e) => setEditingCharge(prev => ({ ...prev, chargeName: e.target.value }))}
                    placeholder="VD: Phí Xếp Dỡ Tại Cảng (THC)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tên Phí (Tiếng Anh)
                  </label>
                  <input
                    type="text"
                    value={editingCharge.chargeNameEn || ''}
                    onChange={(e) => setEditingCharge(prev => ({ ...prev, chargeNameEn: e.target.value }))}
                    placeholder="VD: Terminal Handling Charge"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Vị Trí Áp Dụng</label>
                    <select
                      value={editingCharge.location || 'POL'}
                      onChange={(e) => setEditingCharge(prev => ({ ...prev, location: e.target.value as any }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    >
                      <option value="POL">Đầu Đi (POL)</option>
                      <option value="POD">Đầu Đến (POD)</option>
                      <option value="FREIGHT">Dọc Tuyến (Freight)</option>
                      <option value="INLAND">Nội Địa (Inland)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Thuế Suất VAT (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingCharge.defaultVatRate ?? 0}
                      onChange={(e) => setEditingCharge(prev => ({ ...prev, defaultVatRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsChargeFormOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  >
                    Lưu Khoản Phí
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
