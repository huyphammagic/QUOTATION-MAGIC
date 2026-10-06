import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Mail,
  Send,
  MessageSquare,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  Receipt,
  Building2,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Phone
} from 'lucide-react';
import {
  QuotationPaymentRecord,
  PaymentTrancheReceipt,
  PaymentStatus,
  PaymentMethod
} from '../../types/quotationPayment';
import { QuotationPaymentService } from '../../services/payment/quotationPaymentService';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { QuoteData } from '../../types/logistics';

interface QuotationPaymentHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuoteId?: string;
  currentQuote?: QuoteData | null;
  onPaymentUpdated?: (updatedRecord: QuotationPaymentRecord) => void;
  companyName?: string;
  companyBankInfo?: string;
}

export const QuotationPaymentHubModal: React.FC<QuotationPaymentHubModalProps> = ({
  isOpen,
  onClose,
  initialQuoteId,
  currentQuote,
  onPaymentUpdated,
  companyName = 'BOGI LOGISTICS & FORWARDING',
  companyBankInfo = 'VIETCOMBANK - STK: 0071001234567 - CTK: CTY TNHH LOGISTICS & FORWARDING'
}) => {
  const [records, setRecords] = useState<QuotationPaymentRecord[]>(() => {
    const list = QuotationPaymentService.getPaymentRecords();
    // Đồng bộ báo giá hiện tại nếu có
    if (currentQuote && currentQuote.quoteNumber) {
      QuotationPaymentService.syncFromQuote(currentQuote);
      return QuotationPaymentService.getPaymentRecords();
    }
    return list;
  });

  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    if (initialQuoteId) {
      const match = records.find(r => r.quotationId === initialQuoteId || r.quoteNumber === initialQuoteId);
      if (match) return match.id;
    }
    return records[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'ledger' | 'tranches' | 'reminder'>('ledger');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form thêm đợt thu tiền mới (Tranche)
  const [showAddTrancheForm, setShowAddTrancheForm] = useState(false);
  const [trancheAmount, setTrancheAmount] = useState<number>(0);
  const [trancheCurrency, setTrancheCurrency] = useState<'USD' | 'VND'>('USD');
  const [trancheExchangeRate, setTrancheExchangeRate] = useState<number>(25000);
  const [trancheDate, setTrancheDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [trancheMethod, setTrancheMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [trancheRef, setTrancheRef] = useState('');
  const [trancheBank, setTrancheBank] = useState('Vietcombank');
  const [trancheRecordedBy, setTrancheRecordedBy] = useState('Kế toán thu');
  const [trancheNotes, setTrancheNotes] = useState('');

  // Ngôn ngữ thư nhắc nợ
  const [reminderLang, setReminderLang] = useState<'vi' | 'en'>('vi');

  if (!isOpen) return null;

  // Selected Record
  const selectedRecord = records.find(r => r.id === selectedRecordId) || records[0];

  // Metrics
  const metrics = QuotationPaymentService.getPaymentMetrics();

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesStatus = statusFilter === 'ALL' || r.paymentStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        r.quoteNumber.toLowerCase().includes(q) || 
        r.customerName.toLowerCase().includes(q) ||
        (r.customerTaxCode && r.customerTaxCode.includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [records, statusFilter, searchQuery]);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRecordNewTranche = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || trancheAmount <= 0) return;

    const amountUsdEquiv = trancheCurrency === 'USD' 
      ? trancheAmount 
      : trancheAmount / trancheExchangeRate;
    const amountVndEquiv = trancheCurrency === 'VND'
      ? trancheAmount
      : trancheAmount * trancheExchangeRate;

    const updated = QuotationPaymentService.recordPaymentTranche(selectedRecord.quoteNumber, {
      quotationId: selectedRecord.quotationId,
      quoteNumber: selectedRecord.quoteNumber,
      amount: trancheAmount,
      currency: trancheCurrency,
      exchangeRate: trancheExchangeRate,
      amountVndEquivalent: amountVndEquiv,
      amountUsdEquivalent: amountUsdEquiv,
      paymentDate: trancheDate,
      paymentMethod: trancheMethod,
      bankTransactionRef: trancheRef || `UNC-${Date.now().toString().slice(-6)}`,
      bankAccountName: trancheBank,
      recordedBy: trancheRecordedBy,
      notes: trancheNotes
    });

    setRecords(QuotationPaymentService.getPaymentRecords());
    setShowAddTrancheForm(false);
    setTrancheAmount(0);
    setTrancheNotes('');
    setTrancheRef('');
    if (onPaymentUpdated) onPaymentUpdated(updated);
  };

  const handleDeleteTranche = (receiptId: string) => {
    if (!selectedRecord) return;
    if (confirm('Bạn có chắc chắn muốn xóa đợt thu tiền này? Số dư nợ sẽ được tính toán lại tự động.')) {
      const updated = QuotationPaymentService.deletePaymentTranche(selectedRecord.quoteNumber, receiptId);
      setRecords(QuotationPaymentService.getPaymentRecords());
      if (updated && onPaymentUpdated) onPaymentUpdated(updated);
    }
  };

  // Reminder Letter
  const reminderLetter = selectedRecord 
    ? QuotationPaymentService.generatePaymentReminder(selectedRecord, companyBankInfo, companyName)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Trung Tâm Kiểm Soát Thanh Toán & Thu Hồi Công Nợ Báo Giá
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40">
                  Phase 66 • Receivable Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi thanh toán nhiều đợt, tự động phát hiện nợ quá hạn và xuất thư nhắc nợ 1-click
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRICS KPI SUMMARY BANNER */}
        <div className="px-6 py-3.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">Tổng Phải Thu (Receivable)</span>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
              ${metrics.totalReceivableUsd.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Từ {metrics.totalInvoicesCount} báo giá đã chốt</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 block mb-0.5 text-[11px] font-medium">Đã Thu Thực Tế (Collected)</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ${metrics.totalPaidUsd.toLocaleString()}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, metrics.collectionRatePercent)}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-amber-600 dark:text-amber-400 block mb-0.5 text-[11px] font-medium">Dư Nợ Còn Lại (Balance)</span>
            <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
              ${metrics.totalOutstandingUsd.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600/80">
              {metrics.unpaidCount + metrics.partiallyPaidCount} báo giá chưa thu đủ
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
            <span className="text-rose-600 dark:text-rose-400 block mb-0.5 text-[11px] font-bold">Nợ Quá Hạn (Overdue)</span>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
              ${metrics.totalOverdueUsd.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-600 font-semibold">
              ⚠️ {metrics.overdueCount} đơn trễ hạn công nợ
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">Tỷ Lệ Thu Hồi (Cashflow)</span>
            <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {metrics.collectionRatePercent}%
            </div>
            <span className="text-[10px] text-slate-400">{metrics.paidCount} đơn đã thanh toán 100%</span>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Sổ Theo Dõi Công Nợ & Báo Giá ({records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tranches')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'tranches'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Lịch Sử Đợt Thu Tiền & Phiếu Thu ({selectedRecord?.receipts.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminder')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'reminder'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Thư Nhắc Nợ & Đòi Tiền Tự Động (Dunning Notice)</span>
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: LEDGER TABLE */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {/* Search & Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm số báo giá, tên khách hàng..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('OVERDUE')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === 'OVERDUE'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    🚨 Quá Hạn ({metrics.overdueCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PARTIALLY_PAID')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === 'PARTIALLY_PAID'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    Đặt Cọc / 1 Phần ({metrics.partiallyPaidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('UNPAID')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === 'UNPAID'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Chưa Thu ({metrics.unpaidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PAID')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === 'PAID'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Đã Thu Đủ ({metrics.paidCount})
                  </button>
                </div>
              </div>

              {/* Records List Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Số Báo Giá & Khách Hàng</th>
                        <th className="p-3">Tổng Phải Thu</th>
                        <th className="p-3">Đã Thu</th>
                        <th className="p-3">Còn Lại (Dư Nợ)</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3">Hạn Công Nợ</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecords.map((r) => {
                        const isSelected = r.id === selectedRecordId;
                        const progressPercent = r.totalReceivableUsd > 0 
                          ? Math.min(100, Math.round((r.totalPaidUsd / r.totalReceivableUsd) * 100))
                          : 100;

                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedRecordId(r.id)}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                              isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                            }`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100 font-mono flex items-center gap-1.5">
                                {r.quoteNumber}
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate" title={r.customerName}>
                                {r.customerName}
                              </div>
                            </td>

                            <td className="p-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                              ${r.totalReceivableUsd.toLocaleString()}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {r.totalReceivableVnd.toLocaleString()} đ
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                ${r.totalPaidUsd.toLocaleString()}
                              </div>
                              <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400">{progressPercent}%</span>
                            </td>

                            <td className="p-3">
                              <div className={`font-mono font-bold ${
                                r.outstandingBalanceUsd > 0 
                                  ? r.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400'
                              }`}>
                                ${r.outstandingBalanceUsd.toLocaleString()}
                              </div>
                              {r.outstandingBalanceVnd > 0 && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {r.outstandingBalanceVnd.toLocaleString()} đ
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <PaymentStatusBadge 
                                status={r.paymentStatus} 
                                daysOverdue={r.daysOverdue}
                                size="sm" 
                              />
                            </td>

                            <td className="p-3">
                              <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                {r.creditDueDate}
                              </div>
                              {r.creditTermDays === 0 ? (
                                <span className="text-[10px] text-slate-400">Prepaid (Trả trước)</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Hạn {r.creditTermDays} ngày</span>
                              )}
                              {r.isOverdue && (
                                <span className="block text-[10px] text-rose-600 font-bold">
                                  Trễ {r.daysOverdue} ngày
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordId(r.id);
                                    setActiveTab('tranches');
                                    setShowAddTrancheForm(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold transition"
                                >
                                  + Thu Tiền
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordId(r.id);
                                    setActiveTab('reminder');
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Gửi thư nhắc nợ"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANCHES & RECEIPTS */}
          {activeTab === 'tranches' && selectedRecord && (
            <div className="space-y-6">
              {/* Selected Quote Banner */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                      {selectedRecord.quoteNumber}
                    </span>
                    <PaymentStatusBadge 
                      status={selectedRecord.paymentStatus} 
                      daysOverdue={selectedRecord.daysOverdue}
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedRecord.customerName}
                  </h4>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span>Liên hệ: {selectedRecord.customerContactPerson || 'N/A'}</span>
                    <span>SĐT: {selectedRecord.customerContactPhone || 'N/A'}</span>
                    <span>Hạn công nợ: {selectedRecord.creditDueDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Dư nợ còn lại</span>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                      ${selectedRecord.outstandingBalanceUsd.toLocaleString()} USD
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTrancheForm(prev => !prev);
                      setTrancheAmount(selectedRecord.outstandingBalanceUsd);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showAddTrancheForm ? 'Đóng Form' : 'Ghi Nhận Thu Tiền Mới'}</span>
                  </button>
                </div>
              </div>

              {/* FORM: THÊM ĐỢT THU TIỀN MỚI */}
              {showAddTrancheForm && (
                <form 
                  onSubmit={handleRecordNewTranche}
                  className="p-5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4 animate-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Phiếu Thu Tiền Đợt Mới Cho Báo Giá {selectedRecord.quoteNumber}
                      </h4>
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Gợi ý số tiền nợ còn lại: ${selectedRecord.outstandingBalanceUsd.toLocaleString()} USD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Số Tiền Thu *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={trancheAmount || ''}
                        onChange={(e) => setTrancheAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Nhập số tiền..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Loại Tiền Tệ
                      </label>
                      <select
                        value={trancheCurrency}
                        onChange={(e) => setTrancheCurrency(e.target.value as 'USD' | 'VND')}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      >
                        <option value="USD">USD (Đô la Mỹ)</option>
                        <option value="VND">VND (Việt Nam Đồng)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Ngày Thu Tiền *
                      </label>
                      <input
                        type="date"
                        required
                        value={trancheDate}
                        onChange={(e) => setTrancheDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Phương Thức Thanh Toán
                      </label>
                      <select
                        value={trancheMethod}
                        onChange={(e) => setTrancheMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      >
                        <option value="BANK_TRANSFER">Chuyển Khoản Ngân Hàng (UNC)</option>
                        <option value="CASH">Tiền Mặt</option>
                        <option value="LETTER_OF_CREDIT">Thư Tín Dụng (L/C)</option>
                        <option value="CREDIT_CARD">Thẻ Tín Dụng Doanh Nghiệp</option>
                        <option value="CHECK">Séc / Hối Phiếu</option>
                        <option value="OTHER">Hình thức khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Mã Giao Dịch / Số UNC
                      </label>
                      <input
                        type="text"
                        value={trancheRef}
                        onChange={(e) => setTrancheRef(e.target.value)}
                        placeholder="VD: FT2627198273618 hoặc UNC-881"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Ngân Hàng Thụ Hưởng
                      </label>
                      <input
                        type="text"
                        value={trancheBank}
                        onChange={(e) => setTrancheBank(e.target.value)}
                        placeholder="VD: Vietcombank CN Tân Bình"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                        Người Ghi Nhận (Kế toán / Sales)
                      </label>
                      <input
                        type="text"
                        value={trancheRecordedBy}
                        onChange={(e) => setTrancheRecordedBy(e.target.value)}
                        placeholder="Tên kế toán xác nhận"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 text-xs font-medium">
                      Ghi Chú Đợt Thu Tiền
                    </label>
                    <input
                      type="text"
                      value={trancheNotes}
                      onChange={(e) => setTrancheNotes(e.target.value)}
                      placeholder="VD: Đặt cọc 30% booking / Thanh toán nốt số dư trước khi tàu cập cảng..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                    <button
                      type="button"
                      onClick={() => setShowAddTrancheForm(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                    >
                      Xác Nhận Thu Tiền & Cập Nhật Dư Nợ
                    </button>
                  </div>
                </form>
              )}

              {/* LỊCH SỬ ĐỢT THU TIỀN */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Danh Sách Các Đợt Thu Tiền Đã Ghi Nhận ({selectedRecord.receipts.length})</span>
                </h4>

                {selectedRecord.receipts.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-500">Chưa ghi nhận đợt thanh toán nào cho báo giá này.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddTrancheForm(true)}
                      className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
                    >
                      + Nhấp để ghi nhận đợt thu tiền đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Ngày Thu</th>
                          <th className="p-3">Số Tiền Thu</th>
                          <th className="p-3">Quy Đổi VNĐ</th>
                          <th className="p-3">Hình Thức</th>
                          <th className="p-3">Mã Giao Dịch / UNC</th>
                          <th className="p-3">Người Xác Nhận</th>
                          <th className="p-3">Ghi Chú</th>
                          <th className="p-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedRecord.receipts.map((rc) => (
                          <tr key={rc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                              {rc.paymentDate}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {rc.currency === 'USD' ? `$${rc.amount.toLocaleString()}` : `${rc.amount.toLocaleString()} đ`}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {rc.amountVndEquivalent.toLocaleString()} đ
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                                {rc.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển Khoản UNC' : rc.paymentMethod}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {rc.bankTransactionRef || '-'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {rc.recordedBy}
                            </td>
                            <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate" title={rc.notes}>
                              {rc.notes || '-'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteTranche(rc.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Xóa đợt thu tiền này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT REMINDER & DUNNING DISPATCHER */}
          {activeTab === 'reminder' && selectedRecord && reminderLetter && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Mẫu Thư Nhắc Nợ & Thu Hồi Dòng Tiền (Dunning & Statement Letter)
                    </h4>
                    <p className="text-2xs text-indigo-700 dark:text-indigo-300">
                      Tự động điền số dư nợ còn lại (${selectedRecord.outstandingBalanceUsd.toLocaleString()}), số ngày quá hạn và thông tin tài khoản thụ hưởng.
                    </p>
                  </div>
                </div>

                {/* Language Switch */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setReminderLang('vi')}
                    className={`px-3 py-1 rounded transition ${
                      reminderLang === 'vi' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderLang('en')}
                    className={`px-3 py-1 rounded transition ${
                      reminderLang === 'en' 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Letter Preview Box */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                {/* Subject Header */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Tiêu đề (Subject):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {reminderLang === 'vi' ? reminderLetter.vi.subject : reminderLetter.en.subject}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(
                      reminderLang === 'vi' ? reminderLetter.vi.subject : reminderLetter.en.subject,
                      'subject'
                    )}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[11px] font-medium transition"
                  >
                    {copiedField === 'subject' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'subject' ? 'Đã sao chép' : 'Sao chép tiêu đề'}</span>
                  </button>
                </div>

                {/* Email Body */}
                <div className="p-5 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-950/20 max-h-96 overflow-y-auto">
                  {reminderLang === 'vi' ? reminderLetter.vi.body : reminderLetter.en.body}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    {selectedRecord.customerContactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedRecord.customerContactEmail}
                      </span>
                    )}
                    {selectedRecord.customerContactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedRecord.customerContactPhone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        reminderLang === 'vi' ? reminderLetter.vi.body : reminderLetter.en.body,
                        'body'
                      )}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold transition"
                    >
                      {copiedField === 'body' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'body' ? 'Đã Sao Chép Toàn Bộ' : 'Sao Chép Nội Dung Thư'}</span>
                    </button>

                    {selectedRecord.customerContactEmail && (
                      <a
                        href={`mailto:${selectedRecord.customerContactEmail}?subject=${encodeURIComponent(
                          reminderLang === 'vi' ? reminderLetter.vi.subject : reminderLetter.en.subject
                        )}&body=${encodeURIComponent(
                          reminderLang === 'vi' ? reminderLetter.vi.body : reminderLetter.en.body
                        )}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Mở Trình Gửi Mail</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Dữ liệu thanh toán được bảo lưu bảo mật & đối soát thời gian thực</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
