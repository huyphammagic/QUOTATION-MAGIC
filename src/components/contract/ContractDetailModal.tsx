import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  History, 
  Paperclip, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  Download,
  UploadCloud,
  Search,
  ChevronRight,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { 
  ContractItem, 
  ContractRateItem, 
  ContractVersionItem, 
  ContractDocumentItem, 
  ContractAuditLogItem,
  ContractStatus 
} from '../../types/contract';
import { 
  fetchContractRates, 
  saveContractRate, 
  deleteContractRate,
  updateContractStatus,
  createNewContractVersion,
  fetchContractVersions,
  fetchContractDocuments,
  saveContractDocument,
  deleteContractDocument,
  fetchContractAudits
} from '../../services/contract/contractRepository';
import { analyzeContractExpiry } from '../../services/contract/contractExpiryService';
import { ContractRateFormModal } from './ContractRateFormModal';

interface ContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractItem;
  onContractUpdated: (updated: ContractItem) => void;
  onOpenEditContractModal: () => void;
}

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  isOpen,
  onClose,
  contract,
  onContractUpdated,
  onOpenEditContractModal,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RATES' | 'VERSIONS' | 'DOCUMENTS' | 'AUDIT'>('OVERVIEW');
  const [rates, setRates] = useState<ContractRateItem[]>([]);
  const [versions, setVersions] = useState<ContractVersionItem[]>([]);
  const [documents, setDocuments] = useState<ContractDocumentItem[]>([]);
  const [audits, setAudits] = useState<ContractAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Rate filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');

  // Modals inside detail
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ContractRateItem | null>(null);

  // New Version Modal state
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionEffective, setNewVersionEffective] = useState('');
  const [newVersionExpiry, setNewVersionExpiry] = useState('');
  const [newVersionReason, setNewVersionReason] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Document upload state
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docFileName, setDocFileName] = useState('');
  const [docType, setDocType] = useState<any>('SIGNED_CONTRACT');
  const [docNotes, setDocNotes] = useState('');

  const expiryAnalysis = analyzeContractExpiry(contract.expiryDate);

  // Load data according to active tab
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'RATES') {
      loadRates();
    } else if (activeTab === 'VERSIONS') {
      loadVersions();
    } else if (activeTab === 'DOCUMENTS') {
      loadDocuments();
    } else if (activeTab === 'AUDIT') {
      loadAudits();
    }
  }, [activeTab, contract.id, isOpen]);

  const loadRates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchContractRates(contract.id);
      setRates(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchContractVersions(contract.id);
      setVersions(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchContractDocuments(contract.id);
      setDocuments(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudits = async () => {
    setIsLoading(true);
    try {
      const data = await fetchContractAudits(contract.id);
      setAudits(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Status Lifecycle Actions
  const handleTransitionStatus = async (targetStatus: ContractStatus) => {
    const res = await updateContractStatus(contract, targetStatus, 'Pricing Manager');
    if (res.success) {
      const updated: ContractItem = {
        ...contract,
        status: targetStatus,
        updatedAt: new Date().toISOString(),
      };
      onContractUpdated(updated);
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  // Save Rate
  const handleSaveRate = async (rate: ContractRateItem) => {
    await saveContractRate(rate);
    await loadRates();
    onContractUpdated({
      ...contract,
      totalRatesCount: (contract.totalRatesCount || 0) + 1,
    });
  };

  // Delete Rate
  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa biểu cước này?')) return;
    await deleteContractRate(rateId, contract.id);
    setRates(prev => prev.filter(r => r.id !== rateId));
    onContractUpdated({
      ...contract,
      totalRatesCount: Math.max(0, (contract.totalRatesCount || 1) - 1),
    });
  };

  // Handle Create New Version
  const handleCreateVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionEffective || !newVersionExpiry) {
      alert('Vui lòng chọn ngày hiệu lực mới.');
      return;
    }
    setIsCreatingVersion(true);
    try {
      const updated = await createNewContractVersion(
        contract,
        newVersionEffective,
        newVersionExpiry,
        newVersionReason || 'Cập nhật điều khoản hoặc gia hạn hợp đồng',
        'Pricing Manager'
      );
      onContractUpdated(updated);
      setIsNewVersionModalOpen(false);
      alert(`Đã tạo thành công phiên bản mới V${updated.currentVersion}! Bản cũ V${contract.currentVersion} đã được lưu trữ lịch sử.`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo phiên bản mới');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Handle Save Document
  const handleSaveDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileName.trim()) return;

    const docItem: ContractDocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      contractId: contract.id,
      contractVersion: contract.currentVersion,
      fileName: docFileName.trim(),
      fileSize: 1024 * 150, // simulated size
      mimeType: 'application/pdf',
      storagePath: `contracts/${contract.id}/${docFileName}`,
      documentType: docType,
      uploadedBy: 'Pricing Specialist',
      uploadedAt: new Date().toISOString(),
      notes: docNotes,
    };

    await saveContractDocument(docItem, 'Pricing Specialist');
    setIsUploadDocModalOpen(false);
    setDocFileName('');
    setDocNotes('');
    await loadDocuments();
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Xác nhận xóa tài liệu này?')) return;
    await deleteContractDocument(docId, contract.id, 'Pricing Specialist');
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Filtered Rates
  const filteredRates = rates.filter(r => {
    const matchMode = modeFilter === 'ALL' || r.serviceMode === modeFilter;
    const matchSearch = !searchQuery.trim() || 
      r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.originCode && r.originCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.destinationCode && r.destinationCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.carrier && r.carrier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.rateCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMode && matchSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        id="contract-detail-modal"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-black tracking-wide text-indigo-300">
                  {contract.contractNumber}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-extrabold bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/30">
                  Version {contract.currentVersion}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                  contract.contractType === 'CUSTOMER' 
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                }`}>
                  {contract.contractType === 'CUSTOMER' ? 'Khách Hàng (SELL)' : 'Nhà Cung Cấp (BUY)'}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                  contract.status === 'ACTIVE' ? 'bg-emerald-500 text-white' :
                  contract.status === 'APPROVED' ? 'bg-blue-500 text-white' :
                  contract.status === 'IN_REVIEW' ? 'bg-amber-500 text-white' :
                  contract.status === 'SUSPENDED' ? 'bg-orange-500 text-white' :
                  contract.status === 'EXPIRED' ? 'bg-rose-500 text-white' :
                  contract.status === 'CANCELLED' ? 'bg-slate-600 text-white' :
                  'bg-slate-400 text-white'
                }`}>
                  {contract.status}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {contract.contractName} &bull; <span className="text-indigo-200">{contract.partyName}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEditContractModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Sửa Thông Tin
            </button>
            <button
              onClick={() => {
                setNewVersionEffective(new Date().toISOString().slice(0, 10));
                setNewVersionExpiry(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
                setIsNewVersionModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-indigo-200 hover:text-white bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5" /> Tạo Phiên Bản Mới
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action / Workflow Sub-bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Thời hạn:</span>
            <span className="font-mono font-bold text-slate-800">
              {contract.effectiveDate} &rarr; {contract.expiryDate}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${expiryAnalysis.badgeColor}`}>
              {expiryAnalysis.labelVi}
            </span>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 mr-1 font-semibold">Quy trình:</span>
            {contract.status === 'DRAFT' && (
              <button
                onClick={() => handleTransitionStatus('IN_REVIEW')}
                className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
              >
                Gửi Duyệt (In Review)
              </button>
            )}
            {contract.status === 'IN_REVIEW' && (
              <>
                <button
                  onClick={() => handleTransitionStatus('APPROVED')}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 rounded hover:bg-blue-100"
                >
                  Phê Duyệt (Approve)
                </button>
                <button
                  onClick={() => handleTransitionStatus('DRAFT')}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded"
                >
                  Yêu cầu sửa
                </button>
              </>
            )}
            {contract.status === 'APPROVED' && (
              <button
                onClick={() => handleTransitionStatus('ACTIVE')}
                className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-xs"
              >
                Kích Hoạt (Activate)
              </button>
            )}
            {contract.status === 'ACTIVE' && (
              <button
                onClick={() => handleTransitionStatus('SUSPENDED')}
                className="px-2.5 py-1 text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-300 rounded hover:bg-orange-100"
              >
                Tạm Dừng (Suspend)
              </button>
            )}
            {contract.status === 'SUSPENDED' && (
              <button
                onClick={() => handleTransitionStatus('ACTIVE')}
                className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Tái Kích Hoạt (Reactivate)
              </button>
            )}
            {contract.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  if (confirm('Xác nhận hủy hợp đồng này? Thao tác này không thể hoàn tác.')) {
                    handleTransitionStatus('CANCELLED');
                  }
                }}
                className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded"
              >
                Hủy HĐ
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 shrink-0">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'OVERVIEW' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Tổng Quan & Điều Khoản
          </button>
          <button
            onClick={() => setActiveTab('RATES')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'RATES' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Biểu Cước Hợp Đồng ({contract.totalRatesCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('VERSIONS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'VERSIONS' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" /> Lịch Sử Phiên Bản (V{contract.currentVersion})
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'DOCUMENTS' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" /> Tài Liệu Đính Kèm
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'AUDIT' 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" /> Nhật Ký Kiểm Toán (Audit)
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Partner & General Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Đối Tác Hợp Đồng
                  </span>
                  <div className="font-bold text-sm text-slate-900">{contract.partyName}</div>
                  <div className="text-xs text-slate-500">
                    Mã đối tác: <span className="font-mono font-bold text-slate-700">{contract.partyCode || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Loại: <span className="font-semibold text-slate-800">{contract.contractType === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp / Hãng tàu'}</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Hiệu Lực & Thời Gian
                  </span>
                  <div className="text-xs text-slate-700">
                    Bắt đầu: <span className="font-mono font-bold">{contract.effectiveDate}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Hết hạn: <span className="font-mono font-bold">{contract.expiryDate}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Trạng thái: <span className="font-bold text-slate-800">{contract.status}</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tổng Biểu Cước & Tiền Tệ
                  </span>
                  <div className="text-lg font-black text-slate-900">
                    {contract.totalRatesCount || 0} <span className="text-xs font-normal text-slate-500">tuyến cước</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Đồng tiền cơ sở: <span className="font-bold text-indigo-700">{contract.currency}</span>
                  </div>
                </div>
              </div>

              {/* Commercial Terms */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Thỏa Thuận Thương Mại & Tín Dụng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Miễn phí lưu bãi (Free Time):</span>
                    <span className="font-bold text-slate-800 text-sm">{contract.commercialTerms.freeTimeDays ?? 14} ngày</span>
                    <p className="text-[11px] text-slate-500 mt-1">{contract.commercialTerms.freeTimeDetails || 'Dem/Det kết hợp'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Thời hạn nợ (Credit Days):</span>
                    <span className="font-bold text-slate-800 text-sm">{contract.commercialTerms.creditDays ?? 30} ngày</span>
                    <p className="text-[11px] text-slate-500 mt-1">{contract.commercialTerms.paymentTerms || 'Net 30 days'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Hạn mức công nợ (Credit Limit):</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">
                      {contract.commercialTerms.creditLimit?.toLocaleString() || '50,000'} {contract.currency}
                    </span>
                  </div>
                </div>

                {contract.commercialTerms.validityConditions && (
                  <div className="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                    <span className="font-bold text-amber-900 block mb-0.5">Điều kiện áp dụng giá:</span>
                    {contract.commercialTerms.validityConditions}
                  </div>
                )}
              </div>

              {/* Volume Commitment */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> Cam Kết Sản Lượng (Volume Commitment)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Chu kỳ:</span>
                    <span className="font-bold text-slate-800 capitalize">{contract.volumeCommitment.period}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Mục tiêu (Target):</span>
                    <span className="font-bold text-slate-800">{contract.volumeCommitment.targetTeu ?? 'N/A'} TEU</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Sản lượng tối thiểu:</span>
                    <span className="font-bold text-slate-800">{contract.volumeCommitment.minVolume ?? 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Sản lượng tối đa:</span>
                    <span className="font-bold text-slate-800">{contract.volumeCommitment.maxVolume ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RATES */}
          {activeTab === 'RATES' && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm cảng đi, cảng đến, mã tuyến, carrier..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <select
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="ALL">Tất cả phương thức</option>
                    <option value="SEA">Đường Biển (Sea)</option>
                    <option value="AIR">Đường Hàng Không (Air)</option>
                    <option value="TRUCKING">Nội Địa (Trucking)</option>
                    <option value="CUSTOMS">Hải Quan (Customs)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRate(null);
                      setIsRateModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm Biểu Cước Mới
                  </button>
                </div>
              </div>

              {/* Rates Table */}
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-500">Đang tải biểu cước...</div>
              ) : filteredRates.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Chưa có biểu cước nào trong hợp đồng này</p>
                  <p className="text-[11px] text-slate-400 mt-1">Bấm "Thêm Biểu Cước Mới" để thiết lập cước cho các tuyến</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Mã Cước / Mode</th>
                        <th className="py-2.5 px-3">Cảng Đi &rarr; Cảng Đến</th>
                        <th className="py-2.5 px-3">Thiết Bị / Unit</th>
                        <th className="py-2.5 px-3">Hãng Tàu/Bay</th>
                        <th className="py-2.5 px-3 text-right">
                          {contract.contractType === 'CUSTOMER' ? 'Giá Bán (SELL)' : 'Giá Vốn (BUY)'}
                        </th>
                        <th className="py-2.5 px-3">Hiệu Lực</th>
                        <th className="py-2.5 px-3 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRates.map(rate => (
                        <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-800 block text-[11px]">{rate.rateCode}</span>
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {rate.serviceMode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">
                              {rate.origin} &rarr; {rate.destination}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {rate.originCode || 'POL'} &rarr; {rate.destinationCode || 'POD'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {rate.equipmentType || rate.unit}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rate.carrier || 'Đa dạng'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 text-sm">
                            {rate.baseRate.toLocaleString()} {rate.currency}
                            <span className="block text-[10px] font-normal text-slate-400">/{rate.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600">
                            {rate.validFrom} &bull; {rate.validTo}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingRate(rate);
                                  setIsRateModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                title="Chỉnh sửa cước"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRate(rate.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Xóa cước"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VERSIONS */}
          {activeTab === 'VERSIONS' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Lịch Sử Các Phiên Bản Của Hợp Đồng Này
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Mỗi khi tạo phiên bản mới, hệ thống sẽ lưu vết phiên bản cũ (V1, V2...) bất biến để các báo giá trong quá khứ tham chiếu chính xác.
                </p>

                {versions.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center">
                    Hợp đồng đang ở phiên bản đầu tiên (V{contract.currentVersion}). Chưa có phiên bản lưu trữ trước đó.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                            Version {v.versionNumber}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800">{v.changeSummary}</span>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Hiệu lực: {v.effectiveDate} &rarr; {v.expiryDate} &bull; Tạo ngày: {v.createdAt.slice(0, 10)} bởi {v.createdBy}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded">
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  Tài Liệu Đính Kèm ({documents.length})
                </span>
                <button
                  onClick={() => setIsUploadDocModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Đính Kèm Tài Liệu
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Chưa có tài liệu đính kèm nào</p>
                  <p className="text-[11px] text-slate-400 mt-1">Đính kèm file scan hợp đồng đã ký, phụ lục hoặc bảng giá gốc</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between text-xs">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg mt-0.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{doc.fileName}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{doc.documentType} &bull; V{doc.contractVersion}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Tải lên: {doc.uploadedAt.slice(0, 10)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Nhật Ký Thao Tác Kiểm Toán (Audit Trail)
                </h4>
                {audits.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center">Chưa có nhật ký ghi nhận</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {audits.map(a => (
                      <div key={a.id} className="py-2.5 flex items-start justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{a.details}</span>
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{a.action}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Thực hiện bởi: <span className="font-medium text-slate-600">{a.performedBy}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                          {new Date(a.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Version Sub-modal */}
        {isNewVersionModalOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Tạo Phiên Bản Mới (Version {contract.currentVersion + 1})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Phiên bản V{contract.currentVersion} sẽ được lưu trữ bất biến. Phiên bản mới sẽ bắt đầu ở trạng thái DRAFT để duyệt cước mới.
              </p>
              <form onSubmit={handleCreateVersionSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày Hiệu Lực Mới *</label>
                  <input
                    type="date"
                    required
                    value={newVersionEffective}
                    onChange={(e) => setNewVersionEffective(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày Hết Hạn Mới *</label>
                  <input
                    type="date"
                    required
                    value={newVersionExpiry}
                    onChange={(e) => setNewVersionExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý Do Tạo Bản Mới</label>
                  <input
                    type="text"
                    value={newVersionReason}
                    onChange={(e) => setNewVersionReason(e.target.value)}
                    placeholder="VD: Điều chỉnh giá Q3/2026, gia hạn 1 năm"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewVersionModalOpen(false)}
                    className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingVersion}
                    className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                  >
                    {isCreatingVersion ? 'Đang tạo...' : 'Tạo Phiên Bản Mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Document Sub-modal */}
        {isUploadDocModalOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Đính Kèm Tài Liệu Hợp Đồng</h3>
              <p className="text-xs text-slate-500 mb-4">Lưu trữ file hợp đồng đã ký hoặc bảng phụ lục giá</p>
              <form onSubmit={handleSaveDocSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Tệp / File Name *</label>
                  <input
                    type="text"
                    required
                    value={docFileName}
                    onChange={(e) => setDocFileName(e.target.value)}
                    placeholder="VD: Hop-dong-ky-ket-2026.pdf"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại Tài Liệu</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="SIGNED_CONTRACT">Hợp Đồng Đã Ký (Signed Contract)</option>
                    <option value="RATE_AGREEMENT">Thỏa Thuận Cước (Rate Agreement)</option>
                    <option value="ADDENDUM">Phụ Lục Hợp Đồng (Addendum)</option>
                    <option value="RATE_SHEET">Bảng Cước Chi Tiết (Rate Sheet)</option>
                    <option value="OTHER">Tài Liệu Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi Chú</label>
                  <input
                    type="text"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="Ghi chú thêm về văn bản"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadDocModalOpen(false)}
                    className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Lưu Tài Liệu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rate Form Modal */}
        {isRateModalOpen && (
          <ContractRateFormModal
            isOpen={isRateModalOpen}
            onClose={() => setIsRateModalOpen(false)}
            onSave={handleSaveRate}
            contract={contract}
            editingRate={editingRate}
            existingRates={rates}
          />
        )}
      </div>
    </div>
  );
};
