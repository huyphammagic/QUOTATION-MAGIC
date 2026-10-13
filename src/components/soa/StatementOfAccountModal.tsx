import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Printer, 
  FileDown, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CreditCard, 
  Building2, 
  Check, 
  Eye, 
  X,
  Send,
  Save,
  HelpCircle
} from 'lucide-react';
import { SoaRecord, SoaEntry } from '../../types/soa';
import { SoaService, buildSoaForCustomer } from '../../services/soa/soaService';
import { exportSoaPdf } from '../../utils/exportSoaPdf';
import { exportSoaExcel } from '../../utils/exportSoaExcel';
import { formatUSD, formatVND, formatNumberVND } from '../../utils/formatters';

interface StatementOfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerName?: string;
  onOpenDebitNoteForId?: (debitNoteId: string) => void;
}

export const StatementOfAccountModal: React.FC<StatementOfAccountModalProps> = ({
  isOpen,
  onClose,
  initialCustomerName,
  onOpenDebitNoteForId
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor');
  const [availableCustomers, setAvailableCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  
  // Date period
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'this_quarter' | 'all' | 'custom'>('this_month');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');

  // Status Filter for entries
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'OVERDUE'>('ALL');
  const [searchEntryQuery, setSearchEntryQuery] = useState('');

  // Active SOA Record
  const [activeSoa, setActiveSoa] = useState<SoaRecord | null>(null);
  const [savedSoaList, setSavedSoaList] = useState<SoaRecord[]>([]);

  // Export states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Quick Payment Modal
  const [quickPayEntry, setQuickPayEntry] = useState<SoaEntry | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);

  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize customers and dates
  useEffect(() => {
    if (!isOpen) return;

    const customers = SoaService.getAvailableCustomerNames();
    setAvailableCustomers(customers);

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayStr = now.toISOString().split('T')[0];

    const defFrom = `${curYear}-${curMonth}-01`;
    const defTo = todayStr;

    setPeriodFrom(defFrom);
    setPeriodTo(defTo);

    const targetCustomer = initialCustomerName && customers.includes(initialCustomerName)
      ? initialCustomerName
      : (customers[0] || 'Công ty TNHH Tiếp Vận Tân Cảng');

    setSelectedCustomer(targetCustomer);
    setSavedSoaList(SoaService.getAllSoaRecords());
  }, [isOpen, initialCustomerName]);

  // When customer or dates change, recalculate SOA
  useEffect(() => {
    if (!isOpen || !selectedCustomer) return;

    const generated = buildSoaForCustomer(selectedCustomer, periodFrom, periodTo);
    setActiveSoa(generated);
  }, [isOpen, selectedCustomer, periodFrom, periodTo]);

  // Handle Preset change
  const handlePresetChange = (preset: 'this_month' | 'last_month' | 'this_quarter' | 'all' | 'custom') => {
    setPeriodPreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if (preset === 'this_month') {
      setPeriodFrom(`${year}-${String(month + 1).padStart(2, '0')}-01`);
      setPeriodTo(now.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const lastMonthDate = new Date(year, month - 1, 1);
      const lastDayOfLastMonth = new Date(year, month, 0);
      setPeriodFrom(`${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`);
      setPeriodTo(`${lastDayOfLastMonth.getFullYear()}-${String(lastDayOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfLastMonth.getDate()).padStart(2, '0')}`);
    } else if (preset === 'this_quarter') {
      const qStartMonth = Math.floor(month / 3) * 3;
      setPeriodFrom(`${year}-${String(qStartMonth + 1).padStart(2, '0')}-01`);
      setPeriodTo(now.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setPeriodFrom('');
      setPeriodTo('');
    }
  };

  // Filtered entries for the table
  const displayedEntries = useMemo(() => {
    if (!activeSoa) return [];
    return activeSoa.entries.filter(it => {
      if (statusFilter === 'OUTSTANDING' && it.balanceDue <= 0) return false;
      if (statusFilter === 'OVERDUE' && it.overdueDays <= 0) return false;

      if (searchEntryQuery.trim()) {
        const q = searchEntryQuery.toLowerCase();
        const dn = it.debitNoteNumber.toLowerCase();
        const bl = (it.blNumber || '').toLowerCase();
        const route = it.routing.toLowerCase();
        if (!dn.includes(q) && !bl.includes(q) && !route.includes(q)) return false;
      }
      return true;
    });
  }, [activeSoa, statusFilter, searchEntryQuery]);

  // Handlers
  const handleExportPdf = async () => {
    if (!activeSoa) return;
    setIsExportingPdf(true);
    try {
      await exportSoaPdf(activeSoa);
    } catch (e) {
      console.error('Lỗi xuất PDF SOA:', e);
      alert('Có lỗi khi tạo file PDF SOA.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!activeSoa) return;
    setIsExportingExcel(true);
    try {
      await exportSoaExcel(activeSoa);
    } catch (e) {
      console.error('Lỗi xuất Excel SOA:', e);
      alert('Có lỗi khi tạo file Excel SOA.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSaveSoa = () => {
    if (!activeSoa) return;
    SoaService.saveSoa(activeSoa);
    setSavedSoaList(SoaService.getAllSoaRecords());
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Submit quick payment
  const handleConfirmQuickPayment = () => {
    if (!quickPayEntry || quickPayAmount <= 0) return;
    SoaService.recordPaymentForDebitNote(quickPayEntry.debitNoteId, quickPayAmount, quickPayAmount >= quickPayEntry.balanceDue);
    
    // Refresh SOA
    if (selectedCustomer) {
      const refreshed = buildSoaForCustomer(selectedCustomer, periodFrom, periodTo);
      setActiveSoa(refreshed);
    }
    setQuickPayEntry(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[94vh] max-h-[900px] overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                  BẢNG ĐỐI SOÁT CÔNG NỢ ĐỊNH KỲ (STATEMENT OF ACCOUNT - SOA)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  FMS STANDARD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tổng hợp công nợ, đối chiếu hóa đơn Debit Note, phân tích tuổi nợ & thanh toán VietQR gộp
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveSoa}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Lưu bảng SOA này vào hệ thống"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccessNotice ? 'Đã Lưu!' : 'Lưu Bản SOA'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB CONTROL BAR */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Đối Soát & Phân Tích Tuổi Nợ</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Xem Trước Bản In A4 & VietQR Gộp</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>3. Lịch Sử Kỳ SOA ({savedSoaList.length})</span>
            </button>
          </div>

          {activeSoa && (
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-500">
                Tổng dư nợ cần thanh toán: <strong className="text-rose-600 font-mono font-bold text-sm">{formatVND(activeSoa.totalBalanceDueVnd)}</strong> VND
              </span>
            </div>
          )}
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">

          {/* TAB 1: WORKSPACE & AGING BREAKDOWN */}
          {activeTab === 'editor' && (
            <div className="space-y-5">

              {/* FILTERS & CUSTOMER SELECTION BAR */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                  
                  {/* Select Customer */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chọn Doanh Nghiệp / Khách Hàng Đối Soát</span>
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      {availableCustomers.map((cust) => (
                        <option key={cust} value={cust}>{cust}</option>
                      ))}
                    </select>
                  </div>

                  {/* Period Preset */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kỳ Đối Soát Công Nợ</span>
                    </label>
                    <select
                      value={periodPreset}
                      onChange={(e) => handlePresetChange(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="this_month">Tháng Này (Hiện tại)</option>
                      <option value="last_month">Tháng Trước (Toàn kỳ)</option>
                      <option value="this_quarter">Quý Này (3 tháng gần nhất)</option>
                      <option value="all">Tất Cả Thời Gian (Toàn bộ)</option>
                      <option value="custom">Tùy Chọn Ngày Cụ Thể</option>
                    </select>
                  </div>

                  {/* Date Range Inputs */}
                  <div className="md:col-span-5 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Từ Ngày</label>
                      <input
                        type="date"
                        value={periodFrom}
                        onChange={(e) => { setPeriodFrom(e.target.value); setPeriodPreset('custom'); }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Đến Ngày</label>
                      <input
                        type="date"
                        value={periodTo}
                        onChange={(e) => { setPeriodTo(e.target.value); setPeriodPreset('custom'); }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {activeSoa && (
                <>
                  {/* KPI SUMMARY CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">Tổng Cước Phát Sinh (Billed)</div>
                        <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                          {formatVND(activeSoa.totalBilledVnd)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{activeSoa.entries.length} hóa đơn Debit Note</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">Đã Thu Hồi (Collected)</div>
                        <div className="text-lg font-black text-emerald-600 mt-0.5 font-mono">
                          {formatVND(activeSoa.totalPaidVnd)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          {activeSoa.totalBilledVnd > 0 ? Math.round((activeSoa.totalPaidVnd / activeSoa.totalBilledVnd) * 100) : 0}% tỷ lệ thu hồi
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Tổng Dư Nợ Đến Hạn</div>
                        <div className="text-xl font-black text-rose-600 mt-0.5 font-mono">
                          {formatVND(activeSoa.totalBalanceDueVnd)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Cần đối soát & thanh toán</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Nợ Quá Hạn (Overdue)</div>
                        <div className="text-lg font-black text-amber-700 mt-0.5 font-mono">
                          {formatVND(activeSoa.totalOverdueVnd)}
                        </div>
                        <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                          {activeSoa.entries.filter(e => e.overdueDays > 0).length} hóa đơn trễ hạn
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    </div>

                  </div>

                  {/* DEBT AGING SCHEDULE (PHÂN TÍCH TUỔI NỢ TRỰC QUAN) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Phân Tích Tuổi Nợ Khách Hàng (Debt Aging Schedule)
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Chuẩn kiểm toán quốc tế (0-15-30-60+ Days Aging)
                      </span>
                    </div>

                    {/* Aging Bar Visualization */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
                      
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase">Trong Hạn (Current)</div>
                        <div className="text-xs font-black text-emerald-950 font-mono mt-1">
                          {formatVND(activeSoa.agingVnd.currentAmount)}
                        </div>
                        <div className="text-[9.5px] text-emerald-600 mt-0.5">Trong hạn tín dụng</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="text-[10px] font-bold text-amber-800 uppercase">Trễ 1 - 15 Ngày</div>
                        <div className="text-xs font-black text-amber-950 font-mono mt-1">
                          {formatVND(activeSoa.agingVnd.days1to15)}
                        </div>
                        <div className="text-[9.5px] text-amber-600 mt-0.5">Cần nhắc thanh toán</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-[10px] font-bold text-orange-800 uppercase">Trễ 16 - 30 Ngày</div>
                        <div className="text-xs font-black text-orange-950 font-mono mt-1">
                          {formatVND(activeSoa.agingVnd.days16to30)}
                        </div>
                        <div className="text-[9.5px] text-orange-600 mt-0.5">Gửi công văn đôn đốc</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                        <div className="text-[10px] font-bold text-rose-800 uppercase">Trễ 31 - 60 Ngày</div>
                        <div className="text-xs font-black text-rose-950 font-mono mt-1">
                          {formatVND(activeSoa.agingVnd.days31to60)}
                        </div>
                        <div className="text-[9.5px] text-rose-600 mt-0.5">Tạm dừng cước mới</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-red-100 border border-red-300">
                        <div className="text-[10px] font-bold text-red-900 uppercase">Quá Hạn &gt; 60 Ngày</div>
                        <div className="text-xs font-black text-red-950 font-mono mt-1">
                          {formatVND(activeSoa.agingVnd.over60Days)}
                        </div>
                        <div className="text-[9.5px] text-red-700 font-bold mt-0.5">Rủi ro nợ khó đòi!</div>
                      </div>

                    </div>
                  </div>

                  {/* INVOICES BREAKDOWN TABLE */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    
                    {/* Table Toolbar */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800 uppercase">
                          Danh Sách Hóa Đơn Debit Note ({displayedEntries.length}/{activeSoa.entries.length})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-60">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={searchEntryQuery}
                            onChange={(e) => setSearchEntryQuery(e.target.value)}
                            placeholder="Tìm số D/N, B/L, Tuyến..."
                            className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <Filter className="w-3 h-3 text-slate-400" />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700"
                          >
                            <option value="ALL">Tất Cả ({activeSoa.entries.length})</option>
                            <option value="OUTSTANDING">Chưa Thanh Toán ({activeSoa.entries.filter(e => e.balanceDue > 0).length})</option>
                            <option value="OVERDUE">Quá Hạn ({activeSoa.entries.filter(e => e.overdueDays > 0).length})</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Invoices Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[10.5px]">
                            <th className="py-2 px-2 text-center w-10">STT</th>
                            <th className="py-2 px-2.5">Số Debit Note</th>
                            <th className="py-2 px-2">Ngày Lập</th>
                            <th className="py-2 px-2.5">Vận Đơn (B/L No.)</th>
                            <th className="py-2 px-2.5">Tuyến Vận Chuyển</th>
                            <th className="py-2 px-2 text-center">Hạn TT</th>
                            <th className="py-2 px-2.5 text-right">Phát Hành</th>
                            <th className="py-2 px-2.5 text-right">Đã Thu</th>
                            <th className="py-2 px-2.5 text-right">Còn Nợ</th>
                            <th className="py-2 px-2 text-center">Tuổi Nợ</th>
                            <th className="py-2 px-2.5 text-center">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {displayedEntries.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-10 text-center text-slate-400">
                                Không tìm thấy Debit Note nào phù hợp trong kỳ đối soát này.
                              </td>
                            </tr>
                          ) : (
                            displayedEntries.map((it, idx) => (
                              <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2 px-2 text-center text-slate-400">{idx + 1}</td>
                                
                                <td className="py-2 px-2.5 font-bold text-blue-900 font-mono">
                                  {it.debitNoteNumber}
                                </td>
                                
                                <td className="py-2 px-2 text-slate-600 text-[10.5px]">{it.issueDate}</td>
                                
                                <td className="py-2 px-2.5 font-semibold text-slate-700 font-mono text-[10.5px]">
                                  {it.blNumber}
                                </td>

                                <td className="py-2 px-2.5 text-slate-600 text-[10.5px] truncate max-w-[150px]" title={it.routing}>
                                  {it.routing}
                                </td>

                                <td className="py-2 px-2 text-center text-[10.5px]">
                                  <span className={it.overdueDays > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                                    {it.dueDate}
                                  </span>
                                </td>

                                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-800">
                                  {it.currency === 'USD' ? formatUSD(it.originalAmount) : `${formatNumberVND(it.originalAmount)} đ`}
                                </td>

                                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-600 font-medium">
                                  {it.currency === 'USD' ? formatUSD(it.paidAmount) : `${formatNumberVND(it.paidAmount)} đ`}
                                </td>

                                <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-rose-600">
                                  {it.currency === 'USD' ? formatUSD(it.balanceDue) : `${formatNumberVND(it.balanceDue)} đ`}
                                </td>

                                <td className="py-2 px-2 text-center">
                                  {it.balanceDue <= 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                                      Đã tất toán
                                    </span>
                                  ) : it.overdueDays > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800">
                                      Trễ {it.overdueDays} ngày
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-700">
                                      Trong hạn
                                    </span>
                                  )}
                                </td>

                                <td className="py-2 px-2.5 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    {it.balanceDue > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickPayEntry(it);
                                          setQuickPayAmount(it.balanceDue);
                                        }}
                                        className="px-2 py-0.8 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold cursor-pointer transition-colors"
                                        title="Ghi nhận thu tiền nhanh cho hóa đơn này"
                                      >
                                        Thu Tiền
                                      </button>
                                    )}

                                    {onOpenDebitNoteForId && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenDebitNoteForId(it.debitNoteId)}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                        title="Xem chi tiết Debit Note"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </>
              )}

            </div>
          )}

          {/* TAB 2: LIVE PRINT PREVIEW A4 & VIETQR */}
          {activeTab === 'preview' && activeSoa && (
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">Mã Đối Soát:</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono text-xs font-bold rounded border border-blue-200">
                    {activeSoa.soaNumber}
                  </span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-600">Khách Hàng: <strong>{activeSoa.customer.companyName || activeSoa.customer.customerName}</strong></span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                    <button
                      onClick={() => setPreviewZoom(Math.max(60, previewZoom - 10))}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 font-bold"
                    >
                      -
                    </button>
                    <span className="px-2 py-1 text-[11px] font-mono text-slate-700">{previewZoom}%</span>
                    <button
                      onClick={() => setPreviewZoom(Math.min(150, previewZoom + 10))}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Ngay</span>
                  </button>

                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{isExportingPdf ? 'Đang Xuất...' : 'Tải PDF Chuẩn'}</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Excel</span>
                  </button>
                </div>
              </div>

              {/* A4 Sheet Container */}
              <div className="flex justify-center pb-8 overflow-x-auto">
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div
                    ref={previewRef}
                    className="w-[794px] max-w-[794px] min-h-[1120px] bg-white p-7 sm:p-8 shadow-2xl border border-slate-300 rounded-xs text-slate-800 flex flex-col justify-between overflow-hidden"
                    style={{
                      fontFamily: "'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      boxSizing: 'border-box'
                    }}
                  >
                    <div>
                      {/* Top Brand Accent */}
                      <div className="h-1 bg-slate-900 w-full mb-3 rounded-full" />

                      {/* Section 1: Header */}
                      <div className="border-b border-slate-200 pb-3 mb-2.5 flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight uppercase">
                            {activeSoa.company.name}
                          </h1>
                          {activeSoa.company.englishName && (
                            <div className="text-[10px] font-bold text-slate-500 tracking-wide uppercase mt-0.5">
                              {activeSoa.company.englishName}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                            Địa chỉ / Address: {activeSoa.company.address}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-snug">
                            MST: <strong>{activeSoa.company.taxId}</strong> | Tel: {activeSoa.company.phone} | Email: {activeSoa.company.email}
                          </p>
                        </div>

                        {/* Right Official SOA Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs w-[265px] shrink-0 shadow-2xs">
                          <div className="text-center pb-1 mb-1 border-b border-slate-200">
                            <h2 className="text-xs font-black text-blue-950 uppercase tracking-tight">
                              STATEMENT OF ACCOUNT (SOA)
                            </h2>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              BẢNG ĐỐI SOÁT CÔNG NỢ & KỲ HẠN CƯỚC
                            </div>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Mã SOA (No.):</span>
                              <strong className="text-blue-900 font-mono font-bold">{activeSoa.soaNumber}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Ngày lập:</span>
                              <span className="text-slate-700">{activeSoa.statementDate}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Kỳ đối soát:</span>
                              <span className="text-slate-800 font-medium text-[10.5px]">{activeSoa.periodFrom} &rarr; {activeSoa.periodTo}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Customer Box */}
                      <div className="bg-slate-50/70 border border-slate-200 rounded-lg overflow-hidden mb-2.5">
                        <div className="bg-blue-50/90 text-blue-900 font-bold px-2.5 py-1 text-[10px] uppercase border-b border-blue-100 flex items-center justify-between">
                          <span>I. Thông Tin Khách Hàng Đối Soát (Customer / Debtor Details)</span>
                          <span className="text-[8.5px] text-blue-600 font-normal">DEBTOR</span>
                        </div>
                        <div className="p-2 space-y-0.5 text-[10.5px]">
                          <div className="font-bold text-slate-900 text-[11px]">
                            {activeSoa.customer.companyName || activeSoa.customer.customerName}
                          </div>
                          <p className="text-slate-600">
                            <strong>MST / Tax ID:</strong> {activeSoa.customer.taxId || 'N/A'} | <strong>Người liên hệ:</strong> {activeSoa.customer.contactPerson || activeSoa.customer.customerName || 'N/A'}
                          </p>
                          <p className="text-slate-600">
                            <strong>Điện thoại:</strong> {activeSoa.customer.phone || 'N/A'} | <strong>Email:</strong> {activeSoa.customer.email || 'N/A'} | <strong>Địa chỉ:</strong> {activeSoa.customer.address || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Section 3: Aging Schedule Box */}
                      <div className="border border-slate-200 rounded-lg p-2 bg-white mb-2.5">
                        <div className="text-[9.5px] font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>II. Phân Tích Tuổi Nợ (Debt Aging Schedule - VND)</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 text-center">
                          <div className="bg-emerald-50 border border-emerald-100 rounded p-1">
                            <div className="text-[8px] font-bold text-emerald-800 uppercase">Trong Hạn</div>
                            <div className="text-[9.5px] font-bold text-emerald-950 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.currentAmount)}</div>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded p-1">
                            <div className="text-[8px] font-bold text-amber-800 uppercase">Trễ 1-15d</div>
                            <div className="text-[9.5px] font-bold text-amber-950 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.days1to15)}</div>
                          </div>
                          <div className="bg-orange-50 border border-orange-100 rounded p-1">
                            <div className="text-[8px] font-bold text-orange-800 uppercase">Trễ 16-30d</div>
                            <div className="text-[9.5px] font-bold text-orange-950 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.days16to30)}</div>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 rounded p-1">
                            <div className="text-[8px] font-bold text-rose-800 uppercase">Trễ 31-60d</div>
                            <div className="text-[9.5px] font-bold text-rose-950 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.days31to60)}</div>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded p-1">
                            <div className="text-[8px] font-bold text-red-900 uppercase">Trễ &gt;60d</div>
                            <div className="text-[9.5px] font-bold text-red-950 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.over60Days)}</div>
                          </div>
                          <div className="bg-rose-100 border border-rose-200 rounded p-1">
                            <div className="text-[8px] font-bold text-rose-900 uppercase">Tổng Quá Hạn</div>
                            <div className="text-[10px] font-black text-rose-600 font-mono mt-0.5">{formatNumberVND(activeSoa.agingVnd.totalOverdue)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Detailed Table */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden mb-2.5">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white text-[9.5px] font-bold">
                              <th className="py-1.5 px-1 text-center">STT</th>
                              <th className="py-1.5 px-2 text-left">Số Debit Note</th>
                              <th className="py-1.5 px-1.5 text-center">Ngày Lập</th>
                              <th className="py-1.5 px-2 text-left">Vận Đơn (B/L)</th>
                              <th className="py-1.5 px-2 text-left">Tuyến Vận Chuyển</th>
                              <th className="py-1.5 px-1.5 text-center">Hạn TT</th>
                              <th className="py-1.5 px-2 text-right">Phát Hành</th>
                              <th className="py-1.5 px-2 text-right">Đã Thu</th>
                              <th className="py-1.5 px-2 text-right">Còn Nợ</th>
                              <th className="py-1.5 px-1.5 text-center">Tình Trạng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[10px]">
                            {activeSoa.entries.map((it, idx) => (
                              <tr key={it.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                <td className="py-1 px-1 text-center text-slate-400">{idx + 1}</td>
                                <td className="py-1 px-2 font-bold text-blue-900 font-mono">{it.debitNoteNumber}</td>
                                <td className="py-1 px-1.5 text-center text-slate-600">{it.issueDate}</td>
                                <td className="py-1 px-2 font-mono text-slate-700">{it.blNumber}</td>
                                <td className="py-1 px-2 text-slate-600 truncate max-w-[120px]">{it.routing}</td>
                                <td className={`py-1 px-1.5 text-center ${it.overdueDays > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{it.dueDate}</td>
                                <td className="py-1 px-2 text-right font-mono tabular-nums">{formatNumberVND(it.originalAmount)} đ</td>
                                <td className="py-1 px-2 text-right font-mono tabular-nums text-emerald-600">{formatNumberVND(it.paidAmount)} đ</td>
                                <td className="py-1 px-2 text-right font-mono tabular-nums font-bold text-rose-600">{formatNumberVND(it.balanceDue)} đ</td>
                                <td className="py-1 px-1.5 text-center">
                                  {it.balanceDue <= 0 ? (
                                    <span className="text-[8.5px] font-bold text-emerald-700">Đã thu</span>
                                  ) : it.overdueDays > 0 ? (
                                    <span className="text-[8.5px] font-bold text-rose-700">Trễ {it.overdueDays}d</span>
                                  ) : (
                                    <span className="text-[8.5px] text-slate-600">Trong hạn</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Section 5: Bottom Blocks (Side by side) */}
                      <div className="grid grid-cols-12 gap-2.5 mb-2">
                        {/* Left Bank Box */}
                        <div className="col-span-7 bg-amber-50/60 border border-amber-200/80 rounded-lg p-2.5 flex flex-col justify-between text-xs">
                          <div>
                            <div className="font-bold text-amber-900 uppercase text-[9.5px] pb-1 border-b border-amber-200/60 mb-1 flex items-center justify-between">
                              <span>Thông Tin Thanh Toán (Payment Instructions) & VietQR</span>
                              <span className="text-[8px] text-amber-700 font-bold">24/7 NAPAS</span>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <div className="flex-1 space-y-0.5 text-[10px]">
                                <p className="text-slate-800">
                                  Đơn vị thụ hưởng: <strong className="text-blue-900">{activeSoa.bankAccount.accountHolder}</strong>
                                </p>
                                <p className="text-slate-800">
                                  Số TK: <strong className="font-mono text-blue-950 font-bold">{activeSoa.bankAccount.accountNumber}</strong> ({activeSoa.bankAccount.bankId})
                                </p>
                                <p className="text-slate-700 truncate" title={activeSoa.bankAccount.bankName}>
                                  Ngân hàng: {activeSoa.bankAccount.bankName}
                                </p>
                                <p className="text-slate-700">
                                  Nội dung CK: <strong className="bg-white px-1.5 py-0.2 border border-amber-300 rounded font-mono text-blue-900">{activeSoa.paymentMemo}</strong>
                                </p>
                              </div>

                              {activeSoa.vietQrUrl && (
                                <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-amber-200 shrink-0">
                                  <img
                                    src={activeSoa.vietQrUrl}
                                    alt="VietQR Gộp Công Nợ"
                                    className="w-16 h-16 object-contain rounded"
                                    loading="lazy"
                                  />
                                  <span className="text-[7.5px] font-bold text-slate-700 mt-0.5">Quét QR Gộp</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-1 bg-white/90 border border-amber-200/60 rounded px-2 py-0.8 text-[9px] space-y-0.5">
                            <p className="text-slate-800">
                              <strong>Bằng chữ:</strong> <span className="font-bold text-blue-900 italic">{activeSoa.amountInWordsVi}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right Totals Box */}
                        <div className="col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between text-xs">
                          <div className="space-y-1 text-[10px]">
                            <div className="flex justify-between text-slate-600">
                              <span>Tổng cước phát hành:</span>
                              <span className="font-semibold text-slate-800 font-mono">{formatNumberVND(activeSoa.totalBilledVnd)} đ</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Tổng tiền đã thu:</span>
                              <span className="font-semibold text-emerald-600 font-mono">{formatNumberVND(activeSoa.totalPaidVnd)} đ</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Tổng nợ quá hạn:</span>
                              <span className="font-bold text-rose-600 font-mono">{formatNumberVND(activeSoa.totalOverdueVnd)} đ</span>
                            </div>
                          </div>

                          <div className="mt-1 pt-1 border-t border-slate-200 bg-blue-50/60 -mx-1 -mb-1 p-2 rounded-b-lg border-blue-100">
                            <div className="text-[9px] uppercase font-bold text-blue-950 tracking-wider">
                              TỔNG DƯ NỢ CẦN THANH TOÁN:
                            </div>
                            <div className="text-base font-black text-rose-600 tracking-tight mt-0.5 font-mono">
                              {formatNumberVND(activeSoa.totalBalanceDueVnd)} VND
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="text-[9px] text-slate-500 italic mb-2 leading-tight">
                        • {activeSoa.paymentTermsNote} | {activeSoa.disputeClause}
                      </div>
                    </div>

                    {/* Section 6: Signatures */}
                    <div className="border-t border-slate-200 pt-2 mt-auto">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800 text-[10px]">NGƯỜI LẬP BIỂU</div>
                          <div className="text-[8.5px] text-slate-400 italic">(Prepared By)</div>
                          <div className="h-8 flex items-end justify-center font-bold text-slate-800 text-[10px]">
                            {activeSoa.preparedBy}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-slate-800 text-[10px]">KẾ TOÁN TRƯỞNG / DUYỆT</div>
                          <div className="text-[8.5px] text-slate-400 italic">(Chief Accountant)</div>
                          <div className="h-8 flex items-end justify-center font-bold text-slate-800 text-[10px]">
                            {activeSoa.approvedBy}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-slate-800 text-[10px]">XÁC NHẬN CỦA KHÁCH HÀNG</div>
                          <div className="text-[8.5px] text-slate-400 italic">(Customer Acceptance / Stamp)</div>
                          <div className="h-8 flex items-end justify-center text-slate-400 italic text-[9px]">
                            (Ký, ghi rõ họ tên & đóng dấu)
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SAVED SOA HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    Lịch Sử Bảng Đối Soát Công Nợ Đã Phát Hành
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Theo dõi và tải lại các bảng đối soát kỳ trước đã gửi cho khách hàng
                  </p>
                </div>
              </div>

              {savedSoaList.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-700">Chưa có bản SOA nào được lưu</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Sau khi đối soát và kiểm tra số liệu ở Tab 1, bạn có thể nhấn &quot;Lưu Bản SOA&quot; để lưu trữ hồ sơ công nợ.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {savedSoaList.map((soa) => (
                    <div
                      key={soa.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-blue-900 font-mono">{soa.soaNumber}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {soa.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-1">
                            {soa.customer.companyName || soa.customer.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Kỳ: {soa.periodFrom} &rarr; {soa.periodTo} (Ngày lập: {soa.statementDate})
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase">Dư nợ còn lại</div>
                          <div className="text-base font-black text-rose-600 font-mono">
                            {formatVND(soa.totalBalanceDueVnd)} VND
                          </div>
                          <div className="text-[10px] text-slate-400">{soa.entries.length} hóa đơn</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          Quá hạn: <strong className="text-rose-600">{formatVND(soa.totalOverdueVnd)}</strong>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setActiveSoa(soa);
                              setActiveTab('preview');
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium cursor-pointer"
                          >
                            Xem Bản In
                          </button>

                          <button
                            onClick={() => exportSoaPdf(soa)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Tải PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => exportSoaExcel(soa)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Tải Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* QUICK PAYMENT MODAL DIALOG */}
        {quickPayEntry && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    Ghi Nhận Thu Tiền Debit Note
                  </h3>
                </div>
                <button
                  onClick={() => setQuickPayEntry(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Số Debit Note:</span>
                  <span className="font-bold text-blue-900 font-mono">{quickPayEntry.debitNoteNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng tiền ban đầu:</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatVND(quickPayEntry.originalAmount)} VND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số dư nợ còn lại:</span>
                  <span className="font-bold text-rose-600 font-mono">{formatVND(quickPayEntry.balanceDue)} VND</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền thực thu kỳ này (VND):
                </label>
                <input
                  type="number"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold text-emerald-700 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-slate-400">Gợi ý:</span>
                  <button
                    type="button"
                    onClick={() => setQuickPayAmount(quickPayEntry.balanceDue)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Thu đủ toàn bộ ({formatVND(quickPayEntry.balanceDue)} VND)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPayEntry(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuickPayment}
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs"
                >
                  Xác Nhận Thu Tiền
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
