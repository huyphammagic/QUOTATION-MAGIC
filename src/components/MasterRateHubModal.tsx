import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Layers, 
  History, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Download, 
  X, 
  ArrowRight, 
  Clock, 
  Tag, 
  RefreshCw,
  Eye,
  AlertCircle,
  FileSpreadsheet,
  Check,
  ShieldCheck
} from 'lucide-react';
import { 
  RateMasterItem, 
  ChargeMasterItem, 
  RateHistoryItem, 
  MasterRateStatus, 
  BulkImportSummary 
} from '../types/masterRate';
import { TransportMode, FeeCategory, Currency, ContainerType } from '../types/logistics';
import { validateRateMaster, validateChargeMaster, parseAndValidateBulkRateImport } from '../services/masterRate/rateValidator';
import { duplicateRateMaster } from '../services/masterRate/rateSnapshot';
import { formatUSD, formatVND, formatPercent } from '../utils/formatters';

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
  const [activeTab, setActiveTab] = useState<'RATES' | 'CHARGES' | 'AUDIT'>('RATES');
  
  // Rate Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');

  // Rate Form Modal state
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Partial<RateMasterItem> | null>(null);
  const [rateFormErrors, setRateFormErrors] = useState<string[]>([]);
  const [rateFormWarnings, setRateFormWarnings] = useState<string[]>([]);

  // Charge Form Modal state
  const [isChargeFormOpen, setIsChargeFormOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Partial<ChargeMasterItem> | null>(null);
  const [chargeFormErrors, setChargeFormErrors] = useState<string[]>([]);

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);

  // Filtered Rates
  const filteredRates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rates.filter((rate) => {
      // Status filter
      if (statusFilter === 'EXPIRED') {
        const isExp = today > rate.effectiveTo || rate.status === 'EXPIRED';
        if (!isExp) return false;
      } else if (statusFilter !== 'ALL' && rate.status !== statusFilter) {
        return false;
      }

      // Mode filter
      if (modeFilter !== 'ALL' && rate.transportMode !== modeFilter) {
        return false;
      }

      // Carrier filter
      if (carrierFilter !== 'ALL' && (rate.carrier || 'Other') !== carrierFilter) {
        return false;
      }

      // Keyword
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const matches = 
          (rate.rateCode || '').toLowerCase().includes(kw) ||
          (rate.rateName || '').toLowerCase().includes(kw) ||
          (rate.chargeCode || '').toLowerCase().includes(kw) ||
          (rate.carrier || '').toLowerCase().includes(kw) ||
          (rate.origin || '').toLowerCase().includes(kw) ||
          (rate.destination || '').toLowerCase().includes(kw);
        if (!matches) return false;
      }

      return true;
    });
  }, [rates, statusFilter, modeFilter, carrierFilter, searchKeyword]);

  // Unique Carriers for filter
  const uniqueCarriers = useMemo(() => {
    const set = new Set<string>();
    rates.forEach(r => {
      if (r.carrier && r.carrier.trim() !== '') set.add(r.carrier.trim());
    });
    return Array.from(set);
  }, [rates]);

  if (!isOpen) return null;

  // Handler to open Rate Create / Edit
  const handleOpenRateForm = (rate?: RateMasterItem) => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    if (rate) {
      setEditingRate({ ...rate });
    } else {
      const defaultCharge = chargeMasters[0] || { chargeCode: 'OFR', chargeName: 'Ocean Freight', category: 'FREIGHT' };
      setEditingRate({
        id: `rate-${Date.now()}`,
        rateCode: `RATE-${defaultCharge.chargeCode}-${Math.floor(100 + Math.random() * 900)}`,
        rateName: `${defaultCharge.chargeName}`,
        chargeCode: defaultCharge.chargeCode,
        chargeName: defaultCharge.chargeName,
        category: defaultCharge.category || 'FREIGHT',
        chargeType: 'BASE_FREIGHT',
        transportMode: 'SEA_FCL',
        shipmentType: 'FCL',
        carrier: 'Maersk Line',
        origin: 'Cat Lai (VNSGN)',
        destination: 'Los Angeles (USLAX)',
        containerType: "40'HC",
        basis: 'PER_CONTAINER',
        unit: "Cont 40'HC",
        costAmount: 1200,
        costCurrency: 'USD',
        sellingAmount: 1450,
        sellingCurrency: 'USD',
        vatRate: 0,
        minimumCharge: 0,
        effectiveFrom: nowStr,
        effectiveTo: thirtyDaysLater,
        status: 'ACTIVE',
        priority: 10,
        version: 1,
        transitTime: '18-21 days',
        freeTime: '14 days combined',
        notes: '',
        createdAt: nowStr,
        updatedAt: nowStr,
      });
    }
    setRateFormErrors([]);
    setRateFormWarnings([]);
    setIsRateFormOpen(true);
  };

  // Handler to save Rate
  const handleSaveRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    const validation = validateRateMaster(editingRate, rates);
    if (!validation.isValid) {
      setRateFormErrors(validation.errors.map(err => `${err.field}: ${err.messageVi}`));
      return;
    }

    if (validation.warnings.length > 0) {
      setRateFormWarnings(validation.warnings.map(w => w.messageVi));
    }

    const fullRate: RateMasterItem = {
      id: editingRate.id || `rate-${Date.now()}`,
      rateCode: editingRate.rateCode || `RATE-${Date.now()}`,
      rateName: editingRate.rateName || `${editingRate.chargeName || editingRate.chargeCode}`,
      chargeCode: editingRate.chargeCode || 'OFR',
      chargeName: editingRate.chargeName || editingRate.chargeCode || 'Freight',
      category: (editingRate.category || 'FREIGHT') as FeeCategory,
      chargeType: editingRate.chargeType || 'BASE_FREIGHT',
      transportMode: editingRate.transportMode || 'SEA_FCL',
      shipmentType: editingRate.shipmentType || 'FCL',
      carrier: editingRate.carrier || '',
      origin: editingRate.origin || '',
      destination: editingRate.destination || '',
      containerType: editingRate.containerType,
      basis: editingRate.basis || 'PER_CONTAINER',
      unit: editingRate.unit || 'Lô',
      costAmount: Number(editingRate.costAmount) || 0,
      costCurrency: editingRate.costCurrency || 'USD',
      sellingAmount: Number(editingRate.sellingAmount) || 0,
      sellingCurrency: editingRate.sellingCurrency || 'USD',
      vatRate: Number(editingRate.vatRate) || 0,
      minimumCharge: Number(editingRate.minimumCharge) || 0,
      maximumCharge: Number(editingRate.maximumCharge) || undefined,
      effectiveFrom: editingRate.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: editingRate.effectiveTo || new Date().toISOString().slice(0, 10),
      status: (editingRate.status || 'ACTIVE') as MasterRateStatus,
      priority: Number(editingRate.priority) || 10,
      version: (editingRate.version || 1),
      transitTime: editingRate.transitTime,
      freeTime: editingRate.freeTime,
      notes: editingRate.notes,
      createdAt: editingRate.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    await onSaveRate(fullRate);
    setIsRateFormOpen(false);
  };

  // Handler to duplicate Rate
  const handleDuplicateRate = async (rate: RateMasterItem) => {
    const dup = duplicateRateMaster(rate);
    await onSaveRate(dup);
  };

  // Handler to open Charge Create / Edit
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

  // Handler to save Charge
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

  // Handler for Bulk Import Validation & Execution
  const handleValidateImportText = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const rows = Array.isArray(parsed) ? parsed : (parsed.rateMasters || parsed.rates || []);
      const summary = parseAndValidateBulkRateImport(rows, rates);
      setImportSummary(summary);
    } catch (err: any) {
      alert('Định dạng JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc mảng JSON.');
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!importSummary || importSummary.itemsToImport.length === 0) return;
    await onBulkImportRates(importSummary.itemsToImport);
    setIsImportModalOpen(false);
    setImportSummary(null);
    setImportJsonText('');
  };

  // Export Rates to JSON
  const handleExportRatesJson = () => {
    const exportData = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      totalRates: rates.length,
      rates,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master_rates_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        id="master-rate-hub-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Hệ Thống Quản Lý Bảng Giá Master (Master Rate & Cost System)
                <span className="text-[11px] font-normal px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                  Firebase Source of Truth
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kho dữ liệu giá cước chuẩn, giá vốn (Cost Rate), giá bán (Selling Rate) và quy tắc hiệu lực
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            id="btn-close-master-hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('RATES')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'RATES'
                  ? 'border-blue-500 text-white bg-slate-700/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="hub-tab-rates"
            >
              <Database className="w-4 h-4 text-blue-400" />
              Bảng Giá Master ({rates.length})
            </button>

            <button
              onClick={() => setActiveTab('CHARGES')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'CHARGES'
                  ? 'border-blue-500 text-white bg-slate-700/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="hub-tab-charges"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              Danh Mục Phí Chuẩn ({chargeMasters.length})
            </button>

            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'AUDIT'
                  ? 'border-blue-500 text-white bg-slate-700/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="hub-tab-audit"
            >
              <History className="w-4 h-4 text-amber-400" />
              Lịch Sử & Audit ({rateHistories.length})
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {activeTab === 'RATES' && (
              <>
                <button
                  onClick={handleExportRatesJson}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  id="btn-export-rates"
                >
                  <Download className="w-3.5 h-3.5" />
                  Xuất JSON
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  id="btn-import-rates"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Nhập File
                </button>

                <button
                  onClick={() => handleOpenRateForm()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                  id="btn-add-rate-master"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm Bảng Giá Mới
                </button>
              </>
            )}

            {activeTab === 'CHARGES' && (
              <button
                onClick={() => handleOpenChargeForm()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                id="btn-add-charge-master"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Phí Chuẩn Mới
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {/* TAB 1: RATE MASTER TABLE */}
          {activeTab === 'RATES' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm theo Mã giá, Tên phí, Hãng tàu, Cảng đi, Cảng đến..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-blue-500 text-xs"
                    id="filter-keyword-rates"
                  />
                </div>

                <div>
                  <select
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                    id="filter-mode-rates"
                  >
                    <option value="ALL">Tất cả phương thức</option>
                    <option value="SEA_FCL">Đường Biển FCL</option>
                    <option value="SEA_LCL">Đường Biển LCL</option>
                    <option value="AIR_FREIGHT">Hàng Không Air</option>
                    <option value="INLAND_TRUCKING">Trucking Nội Địa</option>
                    <option value="CUSTOMS_CLEARANCE">Hải Quan</option>
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                    id="filter-status-rates"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang hiệu lực (ACTIVE)</option>
                    <option value="EXPIRED">Hết hạn (EXPIRED)</option>
                    <option value="INACTIVE">Ngừng áp dụng (INACTIVE)</option>
                    <option value="DRAFT">Bản nháp (DRAFT)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Mã Bảng Giá</th>
                      <th className="py-3 px-3">Khoản Phí / Tuyến</th>
                      <th className="py-3 px-3">Hãng Tàu / Mode</th>
                      <th className="py-3 px-3">Đơn Vị / Cont</th>
                      <th className="py-3 px-3 text-right">Giá Vốn (Cost)</th>
                      <th className="py-3 px-3 text-right">Giá Bán (Sell)</th>
                      <th className="py-3 px-3 text-right">Margin %</th>
                      <th className="py-3 px-3">Hiệu Lực</th>
                      <th className="py-3 px-3 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRates.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                          <p className="font-semibold text-slate-600">Chưa có dữ liệu bảng giá nào phù hợp.</p>
                          <p className="text-xs text-slate-400">Nhấn "Thêm Bảng Giá Mới" để tạo dữ liệu thực tế.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRates.map((rate) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const isExpired = today > rate.effectiveTo || rate.status === 'EXPIRED';
                        const margin = rate.sellingAmount > 0
                          ? ((rate.sellingAmount - rate.costAmount) / rate.sellingAmount) * 100
                          : 0;

                        return (
                          <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {rate.rateCode}
                              <div className="text-[10px] text-slate-400 font-normal">v{rate.version || 1}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{rate.chargeName || rate.rateName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span>{rate.origin || '-'}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                <span>{rate.destination || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-blue-700">{rate.carrier || 'N/A'}</span>
                              <div className="text-[10px] text-slate-400">{rate.transportMode}</div>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-700">
                              {rate.containerType ? `Cont ${rate.containerType}` : rate.unit || rate.basis}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {rate.costCurrency === 'USD' ? formatUSD(rate.costAmount) : formatVND(rate.costAmount)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                              {rate.sellingCurrency === 'USD' ? formatUSD(rate.sellingAmount) : formatVND(rate.sellingAmount)}
                            </td>
                            <td className={`py-3 px-3 text-right font-bold ${margin >= 15 ? 'text-emerald-600' : margin > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {formatPercent(margin)}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                              <div>{rate.effectiveFrom}</div>
                              <div className={isExpired ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                → {rate.effectiveTo}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Hết hạn
                                </span>
                              ) : rate.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  {rate.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenRateForm(rate)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                  title="Chỉnh sửa bảng giá"
                                  id={`btn-edit-rate-${rate.id}`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDuplicateRate(rate)}
                                  className="p-1 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded"
                                  title="Nhân bản (Duplicate) tạo ID mới"
                                  id={`btn-dup-rate-${rate.id}`}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(`Ngừng kích hoạt (Soft Delete) bảng giá ${rate.rateCode}?`)) {
                                      onDeleteRate(rate.id, true);
                                    }
                                  }}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                                  title="Ngừng kích hoạt"
                                  id={`btn-delete-rate-${rate.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CHARGE MASTER TABLE */}
          {activeTab === 'CHARGES' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Mã Phí (Code)</th>
                      <th className="py-3 px-3">Tên Phí (Tiếng Việt)</th>
                      <th className="py-3 px-3">Tên Tiếng Anh (English)</th>
                      <th className="py-3 px-3">Phân Loại (Category)</th>
                      <th className="py-3 px-3">Vị Trí / Chặng</th>
                      <th className="py-3 px-3">Basis Mặc Định</th>
                      <th className="py-3 px-3">VAT %</th>
                      <th className="py-3 px-3 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chargeMasters.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                          <p className="font-semibold text-slate-600">Chưa có danh mục phí chuẩn nào.</p>
                        </td>
                      </tr>
                    ) : (
                      chargeMasters.map((charge) => (
                        <tr key={charge.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {charge.chargeCode}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {charge.chargeName}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {charge.chargeNameEn || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {charge.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600">
                            {charge.location}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600">
                            {charge.defaultBasis} ({charge.defaultUnit})
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">
                            {charge.taxable ? `${charge.defaultVatRate}%` : 'Miễn VAT'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {charge.status === 'ACTIVE' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenChargeForm(charge)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                id={`btn-edit-charge-${charge.id}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Ngừng áp dụng phí ${charge.chargeCode}?`)) {
                                    onDeleteCharge(charge.id);
                                  }
                                }}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                                id={`btn-delete-charge-${charge.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL / HISTORY */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Thời Gian</th>
                      <th className="py-3 px-3">Người Thực Hiện</th>
                      <th className="py-3 px-3">Hành Động (Action)</th>
                      <th className="py-3 px-3">Mã Bảng Giá</th>
                      <th className="py-3 px-4">Ghi Chú & Chi Tiết Bản Chụp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rateHistories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                          <p className="font-semibold text-slate-600">Chưa có nhật ký thay đổi nào.</p>
                        </td>
                      </tr>
                    ) : (
                      rateHistories.map((hist) => (
                        <tr key={hist.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(hist.timestamp).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {hist.actor || 'System Admin'}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              hist.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              hist.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              hist.action === 'DUPLICATE' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {hist.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            {hist.rateCode}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {hist.note || 'Audit record snapshot logged'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Master Cost Database is protected with immutable snapshot preservation.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            id="btn-close-master-footer"
          >
            Đóng Hub
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: CREATE / EDIT RATE MODAL */}
      {isRateFormOpen && editingRate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95"
            id="modal-rate-editor"
          >
            <div className="px-6 py-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingRate.id && rates.some(r => r.id === editingRate.id) ? 'Chỉnh Sửa Bảng Giá Master' : 'Tạo Bảng Giá Master Mới'}
              </h3>
              <button onClick={() => setIsRateFormOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {rateFormErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Lỗi nhập liệu bảng giá:
                  </div>
                  <ul className="list-disc list-inside text-[11px]">
                    {rateFormErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {rateFormWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Cảnh báo:
                  </div>
                  <ul className="list-disc list-inside text-[11px]">
                    {rateFormWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Bảng Giá (Rate Code) *</label>
                  <input
                    type="text"
                    required
                    value={editingRate.rateCode || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, rateCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold uppercase"
                    id="rate-form-code"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Khoản Phí (Charge Code) *</label>
                  <input
                    type="text"
                    required
                    value={editingRate.chargeCode || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, chargeCode: e.target.value.toUpperCase() })}
                    placeholder="VD: OFR, THC, BL..."
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                    id="rate-form-charge-code"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Bảng Giá / Phí *</label>
                  <input
                    type="text"
                    required
                    value={editingRate.rateName || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, rateName: e.target.value })}
                    placeholder="VD: Cước biển MSC Cát Lái - Los Angeles"
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                    id="rate-form-name"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phương thức vận tải *</label>
                  <select
                    value={editingRate.transportMode || 'SEA_FCL'}
                    onChange={(e) => setEditingRate({ ...editingRate, transportMode: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    id="rate-form-mode"
                  >
                    <option value="SEA_FCL">Đường Biển FCL</option>
                    <option value="SEA_LCL">Đường Biển LCL</option>
                    <option value="AIR_FREIGHT">Đường Hàng Không</option>
                    <option value="INLAND_TRUCKING">Vận Tải Nội Địa</option>
                    <option value="CUSTOMS_CLEARANCE">Thủ Tục Hải Quan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hãng Tàu / Carrier</label>
                  <input
                    type="text"
                    value={editingRate.carrier || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, carrier: e.target.value })}
                    placeholder="VD: Maersk, ONE, SITC, VN Airlines..."
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    id="rate-form-carrier"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại Container (cho FCL)</label>
                  <select
                    value={editingRate.containerType || "40'HC"}
                    onChange={(e) => setEditingRate({ ...editingRate, containerType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    id="rate-form-cont-type"
                  >
                    <option value="20'GP">20'GP (Tiêu Chuẩn)</option>
                    <option value="40'GP">40'GP (Tiêu Chuẩn)</option>
                    <option value="40'HC">40'HC (Cao)</option>
                    <option value="45'HC">45'HC</option>
                    <option value="20'RF">20'RF (Lạnh)</option>
                    <option value="40'RF">40'RF (Lạnh)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cảng Đi / Origin</label>
                  <input
                    type="text"
                    value={editingRate.origin || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, origin: e.target.value })}
                    placeholder="VD: Cat Lai (VNSGN)"
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="rate-form-origin"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cảng Đến / Destination</label>
                  <input
                    type="text"
                    value={editingRate.destination || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, destination: e.target.value })}
                    placeholder="VD: Los Angeles (USLAX)"
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="rate-form-dest"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cách Tính Cước (Basis) *</label>
                  <select
                    value={editingRate.basis || 'PER_CONTAINER'}
                    onChange={(e) => setEditingRate({ ...editingRate, basis: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    id="rate-form-basis"
                  >
                    <option value="PER_CONTAINER">Per Container (Theo Container)</option>
                    <option value="PER_WM">Per W/M (Revenue Ton LCL)</option>
                    <option value="PER_CHARGEABLE_KG">Per Chargeable KG (Air Freight)</option>
                    <option value="PER_BL">Per B/L (Theo Vận Đơn)</option>
                    <option value="PER_SHIPMENT">Per Shipment (Theo Lô)</option>
                    <option value="PER_TRIP">Per Trip (Theo Chuyến Xe)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
              </div>

              {/* Financials Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Định Mức Tài Chính (Cost & Selling Price)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giá Vốn (Cost Amount) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={editingRate.costAmount ?? 0}
                      onChange={(e) => setEditingRate({ ...editingRate, costAmount: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                      id="rate-form-cost"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Loại Tiền Vốn</label>
                    <select
                      value={editingRate.costCurrency || 'USD'}
                      onChange={(e) => setEditingRate({ ...editingRate, costCurrency: e.target.value as any })}
                      className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                      id="rate-form-cost-curr"
                    >
                      <option value="USD">USD</option>
                      <option value="VND">VND</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giá Bán Đề Xuất (Sell Amount) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={editingRate.sellingAmount ?? 0}
                      onChange={(e) => setEditingRate({ ...editingRate, sellingAmount: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-700"
                      id="rate-form-sell"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Loại Tiền Bán</label>
                    <select
                      value={editingRate.sellingCurrency || 'USD'}
                      onChange={(e) => setEditingRate({ ...editingRate, sellingCurrency: e.target.value as any })}
                      className="w-full border border-slate-300 rounded-lg p-2 font-bold text-blue-700"
                      id="rate-form-sell-curr"
                    >
                      <option value="USD">USD</option>
                      <option value="VND">VND</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mức Thu Tối Thiểu (Min Charge)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editingRate.minimumCharge ?? 0}
                      onChange={(e) => setEditingRate({ ...editingRate, minimumCharge: Number(e.target.value) })}
                      placeholder="VD: 100 USD..."
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                      id="rate-form-min-charge"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Thuế Suất VAT (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editingRate.vatRate ?? 0}
                      onChange={(e) => setEditingRate({ ...editingRate, vatRate: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2"
                      id="rate-form-vat"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hiệu Lực Từ (Effective From) *</label>
                    <input
                      type="date"
                      required
                      value={editingRate.effectiveFrom || ''}
                      onChange={(e) => setEditingRate({ ...editingRate, effectiveFrom: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2"
                      id="rate-form-eff-from"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hiệu Lực Đến (Effective To) *</label>
                    <input
                      type="date"
                      required
                      value={editingRate.effectiveTo || ''}
                      onChange={(e) => setEditingRate({ ...editingRate, effectiveTo: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2"
                      id="rate-form-eff-to"
                    />
                  </div>
                </div>
              </div>

              {/* Operational details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời Gian Vận Chuyển (Transit Time)</label>
                  <input
                    type="text"
                    value={editingRate.transitTime || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, transitTime: e.target.value })}
                    placeholder="VD: 14-16 ngày"
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="rate-form-transit"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Miễn Phí Lưu Cont (Free Time)</label>
                  <input
                    type="text"
                    value={editingRate.freeTime || ''}
                    onChange={(e) => setEditingRate({ ...editingRate, freeTime: e.target.value })}
                    placeholder="VD: 14 days combined Dem/Det"
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="rate-form-freetime"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái Bảng Giá</label>
                  <select
                    value={editingRate.status || 'ACTIVE'}
                    onChange={(e) => setEditingRate({ ...editingRate, status: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                    id="rate-form-status"
                  >
                    <option value="ACTIVE">ACTIVE (Đang Hiệu Lực)</option>
                    <option value="DRAFT">DRAFT (Bản Nháp)</option>
                    <option value="INACTIVE">INACTIVE (Ngừng Áp Dụng)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRateFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                  id="btn-cancel-rate-form"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                  id="btn-save-rate-submit"
                >
                  <Check className="w-4 h-4" /> Lưu Bảng Giá Vào Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: CREATE / EDIT CHARGE MASTER MODAL */}
      {isChargeFormOpen && editingCharge && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95"
            id="modal-charge-editor"
          >
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCharge.id && chargeMasters.some(c => c.id === editingCharge.id) ? 'Chỉnh Sửa Phí Chuẩn' : 'Tạo Phí Chuẩn Mới'}
              </h3>
              <button onClick={() => setIsChargeFormOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChargeSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {chargeFormErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px]">
                  {chargeFormErrors.join(', ')}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Phí (Charge Code) *</label>
                  <input
                    type="text"
                    required
                    value={editingCharge.chargeCode || ''}
                    onChange={(e) => setEditingCharge({ ...editingCharge, chargeCode: e.target.value.toUpperCase() })}
                    placeholder="VD: THC, SEAL, CFS, DOC..."
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold uppercase"
                    id="charge-form-code"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân Nhóm (Category) *</label>
                  <select
                    value={editingCharge.category || 'LOCAL_CHARGE'}
                    onChange={(e) => setEditingCharge({ ...editingCharge, category: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    id="charge-form-cat"
                  >
                    <option value="FREIGHT">Cước Vận Chuyển (FREIGHT)</option>
                    <option value="LOCAL_CHARGE">Phí Địa Phương (LOCAL CHARGE)</option>
                    <option value="SURCHARGE">Phụ Phí Biến Động (SURCHARGE)</option>
                    <option value="CUSTOMS">Hải Quan (CUSTOMS)</option>
                    <option value="TRUCKING">Vận Tải Nội Địa (TRUCKING)</option>
                    <option value="HANDLING">Xử Lý Hàng (HANDLING)</option>
                    <option value="OTHER">Chi Phí Khác (OTHER)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Phí (Tiếng Việt) *</label>
                  <input
                    type="text"
                    required
                    value={editingCharge.chargeName || ''}
                    onChange={(e) => setEditingCharge({ ...editingCharge, chargeName: e.target.value })}
                    placeholder="VD: Phí Nâng Hạ Cảng (THC)"
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                    id="charge-form-name-vi"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Phí (Tiếng Anh)</label>
                  <input
                    type="text"
                    value={editingCharge.chargeNameEn || ''}
                    onChange={(e) => setEditingCharge({ ...editingCharge, chargeNameEn: e.target.value })}
                    placeholder="VD: Terminal Handling Charge"
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="charge-form-name-en"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn Vị Tính Mặc Định (Basis) *</label>
                  <select
                    value={editingCharge.defaultBasis || 'PER_CONTAINER'}
                    onChange={(e) => setEditingCharge({ ...editingCharge, defaultBasis: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="charge-form-basis"
                  >
                    <option value="PER_CONTAINER">Per Container</option>
                    <option value="PER_BL">Per B/L (Bill)</option>
                    <option value="PER_WM">Per W/M</option>
                    <option value="PER_CHARGEABLE_KG">Per Chargeable KG</option>
                    <option value="PER_SHIPMENT">Per Shipment</option>
                    <option value="PER_TRIP">Per Trip</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vị Trí / Chặng Phí</label>
                  <select
                    value={editingCharge.location || 'POL'}
                    onChange={(e) => setEditingCharge({ ...editingCharge, location: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    id="charge-form-loc"
                  >
                    <option value="POL">Phí Đầu Xuất (POL)</option>
                    <option value="FREIGHT">Chặng Chính (FREIGHT)</option>
                    <option value="POD">Phí Đầu Nhập (POD)</option>
                    <option value="OTHER">Dịch Vụ Khác (OTHER)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsChargeFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                  id="btn-save-charge-submit"
                >
                  <Check className="w-4 h-4" /> Lưu Phí Chuẩn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: BULK IMPORT WITH VALIDATION PREVIEW */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                Nhập Dữ Liệu Bảng Giá Thực Tế (Bulk Rate Import & Validation)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Dán dữ liệu JSON hoặc danh sách bảng giá thực tế của doanh nghiệp. Hệ thống sẽ thẩm định cú pháp, tính logic của giá vốn/giá bán, loại container và ngày hiệu lực trước khi ghi vào Firestore.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dữ liệu JSON:</label>
                <textarea
                  rows={8}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "rateCode": "RATE-SITC-HPH-LAX-40HC",\n    "chargeCode": "OFR",\n    "rateName": "Cước SITC Hải Phòng - Los Angeles",\n    "transportMode": "SEA_FCL",\n    "carrier": "SITC",\n    "origin": "Hai Phong",\n    "destination": "Los Angeles",\n    "containerType": "40'HC",\n    "basis": "PER_CONTAINER",\n    "costAmount": 1400,\n    "sellingAmount": 1650,\n    "costCurrency": "USD",\n    "sellingCurrency": "USD",\n    "effectiveFrom": "2026-09-01",\n    "effectiveTo": "2026-09-30"\n  }\n]`}
                  className="w-full border border-slate-300 rounded-xl p-3 font-mono text-[11px]"
                  id="textarea-import-rates"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleValidateImportText}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                  id="btn-validate-import"
                >
                  <ShieldCheck className="w-4 h-4" /> Kiểm Tra Hợp Lệ Dữ Liệu (Validate)
                </button>
              </div>

              {/* Validation Summary Report */}
              {importSummary && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-700 font-bold">Tổng số dòng: {importSummary.totalRows}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Hợp lệ: {importSummary.validRows}
                    </span>
                    {importSummary.invalidRows > 0 && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Không hợp lệ: {importSummary.invalidRows}
                      </span>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2">Dòng</th>
                          <th className="p-2">Mã Giá</th>
                          <th className="p-2">Tuyến / Hãng</th>
                          <th className="p-2">Trạng Thái</th>
                          <th className="p-2">Lý Do</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importSummary.rowDetails.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="p-2 font-mono">{row.rowNumber}</td>
                            <td className="p-2 font-mono font-bold">{row.parsedRate?.rateCode || '-'}</td>
                            <td className="p-2">{row.parsedRate?.origin} → {row.parsedRate?.destination}</td>
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-bold">OK</span>
                              ) : (
                                <span className="text-rose-600 font-bold">LỖI</span>
                              )}
                            </td>
                            <td className="p-2 text-rose-600">{row.errors.join('; ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!importSummary || importSummary.validRows === 0}
                  onClick={handleConfirmBulkImport}
                  className={`px-5 py-2 rounded-xl font-bold text-white shadow-xs flex items-center gap-1.5 ${
                    importSummary && importSummary.validRows > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-300 cursor-not-allowed text-slate-500'
                  }`}
                  id="btn-confirm-import"
                >
                  <Check className="w-4 h-4" /> Xác Nhận Ghi {importSummary?.validRows || 0} Dòng Vào Firebase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
