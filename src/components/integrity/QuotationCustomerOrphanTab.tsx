import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldAlert, 
  Users, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  Database,
  Building2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { QuoteData, CustomerRecord } from '../../types/logistics';
import { 
  generateQuotationCustomerValidationReport, 
  executeOneClickRepair, 
  exportValidationReportAsText, 
  exportValidationReportAsCsv,
  QuotationCustomerValidationReport,
  OrphanedQuotationItem,
  OrphanRootCause
} from '../../services/integrity/quotationCustomerValidationService';

interface QuotationCustomerOrphanTabProps {
  quotes: QuoteData[];
  customers: CustomerRecord[];
  onApplyFixedQuotes?: (fixed: QuoteData[]) => void;
  onApplyFixedCustomers?: (fixed: CustomerRecord[]) => void;
  onRefreshData?: () => Promise<void>;
  isVi?: boolean;
}

export const QuotationCustomerOrphanTab: React.FC<QuotationCustomerOrphanTabProps> = ({
  quotes,
  customers,
  onApplyFixedQuotes,
  onApplyFixedCustomers,
  onRefreshData,
  isVi = true,
}) => {
  const [report, setReport] = useState<QuotationCustomerValidationReport>(() =>
    generateQuotationCustomerValidationReport(quotes, customers)
  );
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSuccessMessage, setRepairSuccessMessage] = useState<string | null>(null);
  const [repairErrorMessage, setRepairErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [copiedReport, setCopiedReport] = useState(false);

  // Selected item for previewing repair details
  const [selectedOrphanForPreview, setSelectedOrphanForPreview] = useState<OrphanedQuotationItem | null>(null);

  // Re-run validation whenever source quotes or customers array changes
  useEffect(() => {
    const freshReport = generateQuotationCustomerValidationReport(quotes, customers);
    setReport(freshReport);
  }, [quotes, customers]);

  // Handle re-validating manually
  const handleRunValidation = async () => {
    setIsValidating(true);
    setRepairSuccessMessage(null);
    setRepairErrorMessage(null);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      const fresh = generateQuotationCustomerValidationReport(quotes, customers);
      setReport(fresh);
    } catch (err: any) {
      console.error('[QuotationCustomerOrphanTab] Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle 1-Click Repair for ALL orphaned records
  const handleRepairAll = async () => {
    if (report.orphanedCount === 0 || report.repairableCount === 0) return;

    setIsRepairing(true);
    setRepairSuccessMessage(null);
    setRepairErrorMessage(null);

    try {
      const outcome = await executeOneClickRepair(
        report.orphanedRecords,
        quotes,
        customers,
        { userId: 'Admin (1-Click Repair Tool)' }
      );

      if (outcome.newCustomersCreated.length > 0 && onApplyFixedCustomers) {
        onApplyFixedCustomers([...customers, ...outcome.newCustomersCreated]);
      }

      if (outcome.repairedCount > 0 && onApplyFixedQuotes) {
        onApplyFixedQuotes(outcome.fixedQuotes);
      }

      setRepairSuccessMessage(outcome.message);

      // Refresh report
      const freshCustomers = outcome.newCustomersCreated.length > 0 
        ? [...customers, ...outcome.newCustomersCreated] 
        : customers;
      const freshReport = generateQuotationCustomerValidationReport(outcome.fixedQuotes, freshCustomers);
      setReport(freshReport);
    } catch (err: any) {
      console.error('[QuotationCustomerOrphanTab] Repair error:', err);
      setRepairErrorMessage(err.message || 'Lỗi trong quá trình sửa chữa dữ liệu.');
    } finally {
      setIsRepairing(false);
    }
  };

  // Handle 1-Click Repair for a SINGLE orphaned record
  const handleRepairSingle = async (orphanItem: OrphanedQuotationItem) => {
    setIsRepairing(true);
    setRepairSuccessMessage(null);
    setRepairErrorMessage(null);

    try {
      const outcome = await executeOneClickRepair(
        [orphanItem],
        quotes,
        customers,
        {
          userId: 'Admin (1-Click Single Repair)',
          targetSingleQuoteId: orphanItem.quoteId,
        }
      );

      if (outcome.newCustomersCreated.length > 0 && onApplyFixedCustomers) {
        onApplyFixedCustomers([...customers, ...outcome.newCustomersCreated]);
      }

      if (outcome.repairedCount > 0 && onApplyFixedQuotes) {
        onApplyFixedQuotes(outcome.fixedQuotes);
      }

      setRepairSuccessMessage(`Đã sửa thành công báo giá ${orphanItem.quoteNumber}!`);

      // Refresh report
      const freshCustomers = outcome.newCustomersCreated.length > 0 
        ? [...customers, ...outcome.newCustomersCreated] 
        : customers;
      const freshReport = generateQuotationCustomerValidationReport(outcome.fixedQuotes, freshCustomers);
      setReport(freshReport);
      setSelectedOrphanForPreview(null);
    } catch (err: any) {
      console.error('[QuotationCustomerOrphanTab] Single repair error:', err);
      setRepairErrorMessage(err.message || 'Lỗi khi sửa chữa báo giá.');
    } finally {
      setIsRepairing(false);
    }
  };

  // Download Text Report
  const handleDownloadTextReport = () => {
    const content = exportValidationReportAsText(report);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Doi_Soat_Orphan_Records_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download CSV Report
  const handleDownloadCsvReport = () => {
    const content = exportValidationReportAsCsv(report);
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Doi_Soat_Khach_Hang_CRM_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = async () => {
    try {
      const content = exportValidationReportAsText(report);
      await navigator.clipboard.writeText(content);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  // Filtered orphaned records
  const filteredRecords = useMemo(() => {
    return report.orphanedRecords.filter(item => {
      if (filterReason !== 'ALL' && item.orphanReason !== filterReason) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = item.quoteNumber.toLowerCase().includes(q);
        const matchName = item.quotedCompanyName.toLowerCase().includes(q);
        const matchTax = (item.quotedTaxId || '').toLowerCase().includes(q);
        const matchId = (item.quotedCustomerId || '').toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchTax && !matchId) return false;
      }
      return true;
    });
  }, [report.orphanedRecords, filterReason, searchQuery]);

  return (
    <div className="space-y-5">
      
      {/* Banner / Header Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/40 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-emerald-400" />
                AUTOMATED REPORT GENERATOR
              </span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold rounded-full border border-indigo-400/30 uppercase">
                1-CLICK REPAIR READY
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
              {isVi 
                ? 'Bộ Đối Soát Khách Hàng Báo Giá <-> Danh Mục CRM' 
                : 'Quotations Customer ID <-> CRM Customers Orphan Validator'}
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isVi
                ? 'Tự động kiểm tra từng Customer ID trong toàn bộ Báo giá (\'Quotations\') đối chiếu với Bộ sưu tập Khách hàng CRM (\'Customers\') để phát hiện các bản ghi mồ côi (orphaned records), sai lệch ID và cung cấp công cụ sửa chữa 1-chạm.'
                : 'Validates every customer ID in the Quotations collection against the Customers CRM collection to identify orphaned records and offer a 1-click repair tool.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-run-orphan-validation"
              type="button"
              onClick={handleRunValidation}
              disabled={isValidating || isRepairing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isValidating ? (isVi ? 'Đang đối soát...' : 'Validating...') : (isVi ? 'Đối soát lại' : 'Re-Validate')}</span>
            </button>

            {report.orphanedCount > 0 && (
              <button
                id="btn-one-click-repair-all"
                type="button"
                onClick={handleRepairAll}
                disabled={isRepairing || isValidating}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
                <span>
                  {isRepairing 
                    ? (isVi ? 'Đang sửa chữa 1-Chạm...' : 'Repairing...') 
                    : (isVi ? `Sửa Chữa 1-Chạm Toàn Bộ (${report.repairableCount})` : `1-Click Repair All (${report.repairableCount})`)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {repairSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{repairSuccessMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRepairSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {repairErrorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{repairErrorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRepairErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Báo giá đã quét' : 'Quotes Checked'}
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {report.totalQuotationsChecked}
          </p>
          <span className="text-[10px] text-slate-400">Bộ sưu tập \'Quotations\'</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Khách hàng CRM' : 'CRM Customers'}
            </span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {report.totalCustomersInCrm}
          </p>
          <span className="text-[10px] text-slate-400">Danh mục \'Customers\'</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Khớp Chuẩn 100%' : 'Valid Linked'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {report.validLinkedCount}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Khớp chính xác Customer ID</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Bản ghi mồ côi' : 'Orphaned Records'}
            </span>
            <AlertTriangle className={`w-4 h-4 ${report.orphanedCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-extrabold mt-1 ${report.orphanedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {report.orphanedCount}
          </p>
          <span className={`text-[10px] font-medium ${report.orphanedCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {report.orphanedCount > 0 ? (isVi ? 'Cần sửa chữa' : 'Action needed') : (isVi ? 'Không phát hiện' : 'None detected')}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Độ toàn vẹn' : 'Integrity Score'}
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {report.integrityScore}%
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              report.status === 'HEALTHY' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                : report.status === 'WARNING'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {report.status}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                report.integrityScore >= 95 
                  ? 'bg-emerald-500' 
                  : report.integrityScore >= 75 
                  ? 'bg-amber-500' 
                  : 'bg-rose-500'
              }`}
              style={{ width: `${report.integrityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Breakdown by Orphan Root Cause */}
      {report.orphanedCount > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px]">
              {isVi ? 'Phân loại nguyên nhân mồ côi:' : 'Root Cause Breakdown:'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.summaryByReason.nonExistentCustomerId > 0 && (
              <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-[11px] font-medium">
                ID không tồn tại trong CRM: <strong>{report.summaryByReason.nonExistentCustomerId}</strong>
              </span>
            )}
            {report.summaryByReason.mismatchedNameOrTax > 0 && (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg text-[11px] font-medium">
                Lệch ID nhưng khớp MST/Tên: <strong>{report.summaryByReason.mismatchedNameOrTax}</strong>
              </span>
            )}
            {report.summaryByReason.unregisteredCustomerInfo > 0 && (
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-lg text-[11px] font-medium">
                Khách chưa đăng ký mã CRM: <strong>{report.summaryByReason.unregisteredCustomerInfo}</strong>
              </span>
            )}
            {report.summaryByReason.missingCustomerId > 0 && (
              <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium">
                Thiếu hoàn toàn ID: <strong>{report.summaryByReason.missingCustomerId}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table Filter & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm theo số báo giá, công ty, MST...' : 'Search by quote#, company, tax...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">{isVi ? 'Tất cả nguyên nhân' : 'All Root Causes'}</option>
              <option value="NON_EXISTENT_CUSTOMER_ID">{isVi ? 'ID không tồn tại trong CRM' : 'Non-existent Customer ID'}</option>
              <option value="MISMATCHED_NAME_OR_TAX">{isVi ? 'Lệch ID nhưng khớp MST/Tên' : 'ID Mismatch with Tax/Name'}</option>
              <option value="UNREGISTERED_CUSTOMER_INFO">{isVi ? 'Khách chưa đăng ký mã CRM' : 'Unregistered Customer'}</option>
              <option value="MISSING_CUSTOMER_ID">{isVi ? 'Thiếu hoàn toàn Customer ID' : 'Missing Customer ID'}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsvReport}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
            title="Xuất bảng đối soát ra định dạng CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV (Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTextReport}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
            title="Tải văn bản báo cáo kiểm toán đầy đủ"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit Text</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
            title="Sao chép nội dung báo cáo vào clipboard"
          >
            {copiedReport ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 font-bold">Đã chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Validation Report Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5">Báo Giá</th>
                <th className="py-3 px-3">Customer ID trong Báo Giá</th>
                <th className="py-3 px-3">Doanh Nghiệp & MST</th>
                <th className="py-3 px-3">Chẩn Đoán Sự Cố Mồ Côi</th>
                <th className="py-3 px-3">Đề Xuất Khắc Phục 1-Chạm</th>
                <th className="py-3 px-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {report.orphanedCount === 0 
                          ? (isVi ? 'Không phát hiện bất kỳ bản ghi mồ côi nào!' : 'Zero orphaned records detected!')
                          : (isVi ? 'Không có bản ghi phù hợp với bộ lọc tìm kiếm.' : 'No records match search filter.')}
                      </p>
                      <p className="text-xs text-slate-500 max-w-md">
                        {report.orphanedCount === 0
                          ? (isVi 
                              ? `Tất cả Customer ID trong ${report.totalQuotationsChecked} báo giá đều liên kết 100% chính xác với danh bạ khách hàng CRM.` 
                              : 'All quotation customer IDs are 100% matched with the CRM Customers collection.')
                          : (isVi ? 'Thử xóa bộ lọc hoặc tìm kiếm theo từ khóa khác.' : 'Try clearing filters or search terms.')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  return (
                    <tr 
                      key={item.quoteId} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        item.isRepaired ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Quote Info */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.quoteNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded">
                            {item.quoteStatus}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600">
                            ${item.grandTotalUsd.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.createdDate}
                        </span>
                      </td>

                      {/* Quoted Customer ID */}
                      <td className="py-3 px-3 align-top">
                        {item.quotedCustomerId ? (
                          <div className="space-y-1">
                            <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 block w-fit">
                              {item.quotedCustomerId}
                            </span>
                            <span className="text-[10px] text-rose-500 font-medium block">
                              ✕ Không tồn tại trong CRM
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded border border-dashed border-slate-300 dark:border-slate-700">
                            (Thiếu Customer ID)
                          </span>
                        )}
                      </td>

                      {/* Quoted Company & Tax ID */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1" title={item.quotedCompanyName}>
                          {item.quotedCompanyName}
                        </div>
                        {item.quotedTaxId ? (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MST: <strong className="text-slate-700 dark:text-slate-300">{item.quotedTaxId}</strong>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa có MST</span>
                        )}
                        {item.quotedContactPerson && (
                          <span className="text-[10px] text-slate-500 block">
                            LH: {item.quotedContactPerson}
                          </span>
                        )}
                      </td>

                      {/* Diagnostic Root Cause */}
                      <td className="py-3 px-3 align-top max-w-[220px]">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full inline-block ${
                            item.orphanReason === 'MISMATCHED_NAME_OR_TAX'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : item.orphanReason === 'UNREGISTERED_CUSTOMER_INFO'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {item.orphanReason}
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                            {item.orphanReasonLabelVi}
                          </p>
                        </div>
                      </td>

                      {/* Suggested Action */}
                      <td className="py-3 px-3 align-top max-w-[240px]">
                        <div className="space-y-1">
                          {item.isRepaired ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ĐÃ KHẮC PHỤC XONG</span>
                            </div>
                          ) : (
                            <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-start gap-1">
                              <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-500 mt-0.5" />
                              <span>{item.suggestedActionLabelVi}</span>
                            </div>
                          )}
                          {item.matchCandidate && (
                            <div className="p-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded border border-indigo-200/50 text-[10px] text-indigo-900 dark:text-indigo-300">
                              Khách CRM tìm thấy: <strong>{item.matchCandidate.companyName}</strong> ({item.matchCandidate.code})
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3.5 align-top text-right">
                        {item.isRepaired ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg">
                            ✓ Hoàn tất
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRepairSingle(item)}
                              disabled={isRepairing}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                              title="Sửa chữa 1-chạm cho bản ghi này"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Sửa 1-Chạm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrphanForPreview(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
                              title="Xem chi tiết đối chiếu"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Preview & In-Depth Repair Modal */}
      {selectedOrphanForPreview && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">Chi Tiết Sửa Chữa 1-Chạm Báo Giá</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrphanForPreview(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Số Báo Giá:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedOrphanForPreview.quoteNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Doanh nghiệp trong báo giá:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrphanForPreview.quotedCompanyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Mã số thuế:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedOrphanForPreview.quotedTaxId || '(Chưa có)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Customer ID hiện hành (Lỗi):</span>
                  <span className="font-mono text-rose-600 font-bold">{selectedOrphanForPreview.quotedCustomerId || '(Trống)'}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">
                  Phương Án Khắc Phục Khuyến Nghị:
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedOrphanForPreview.suggestedActionLabelVi}
                </p>
                {selectedOrphanForPreview.matchCandidate && (
                  <p className="text-indigo-700 dark:text-indigo-400 font-semibold mt-1">
                    ➔ Khách hàng CRM được chỉ định: {selectedOrphanForPreview.matchCandidate.companyName} (MST: {selectedOrphanForPreview.matchCandidate.taxId || 'N/A'})
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrphanForPreview(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleRepairSingle(selectedOrphanForPreview)}
                  disabled={isRepairing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Xác Nhận Sửa 1-Chạm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
