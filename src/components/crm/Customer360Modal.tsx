import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Phone, Mail, MapPin, Building2, Calendar, Clock, 
  TrendingUp, Activity, CheckCircle, AlertCircle, Plus, FileText,
  DollarSign, RefreshCw, Star, ShieldAlert, Award, ChevronRight, Check,
  Radar, SlidersHorizontal, CreditCard, Shield, AlertTriangle, 
  Receipt, ArrowRight, Eye, ExternalLink, Search, Lock, Unlock, 
  Navigation, Anchor, Box, Plane, Truck, HelpCircle, Ship
} from 'lucide-react';
import { CustomerRecord, QuoteData, Currency } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { 
  CustomerActivityLog, 
  CustomerFollowUp, 
  RateReviewSchedule, 
  RateReviewTask, 
  CustomerOpportunity, 
  CustomerHealthScore,
  CustomerContactPerson 
} from '../../types/crm';
import { BusinessOpportunity } from '../../types/opportunity';
import { fetchCustomer360Data } from '../../services/crm/customer360Service';
import { completeCustomerFollowUp } from '../../services/crm/customerFollowUpService';
import { getBusinessOpportunities } from '../../services/opportunity/businessOpportunityService';
import { DebitNoteService } from '../../services/debitNote/debitNoteService';
import { DebitNoteRecord } from '../../types/debitNote';
import { formatUSD, formatVND, formatNumber } from '../../utils/formatters';
import { LogActivityModal } from './LogActivityModal';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import { CreateRateReviewModal } from './CreateRateReviewModal';

interface Customer360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  customers?: CustomerRecord[];
  companyId?: string;
  user?: { email?: string; name?: string };
  quotes?: QuoteData[];
  shipments?: ShipmentRecord[];
  contracts?: ContractRecord[];
  onSelectCustomerForQuote?: (customer: CustomerRecord) => void;
  onOpenDecisionWorkspace?: (prefill: any) => void;
  onSaveCustomer?: (updatedCustomer: CustomerRecord) => Promise<void> | void;
  onOpenDebitNoteForQuote?: (quote: QuoteData) => void;
  onOpenStatementOfAccount?: (customerName: string) => void;
  onOpenQuoteDetail?: (quote: QuoteData) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  isOpen,
  onClose,
  customer: initialCustomer,
  customers = [],
  companyId = 'company_profile',
  user,
  quotes = [],
  shipments = [],
  contracts = [],
  onSelectCustomerForQuote,
  onOpenDecisionWorkspace,
  onSaveCustomer,
  onOpenDebitNoteForQuote,
  onOpenStatementOfAccount,
  onOpenQuoteDetail,
}) => {
  const [activeCustomer, setActiveCustomer] = useState<CustomerRecord>(initialCustomer);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);

  type TabKey = 
    | 'OVERVIEW' 
    | 'FINANCE_CREDIT' 
    | 'QUOTATIONS' 
    | 'SHIPMENTS' 
    | 'TIMELINE' 
    | 'FOLLOW_UPS' 
    | 'RATE_REVIEWS' 
    | 'OPPORTUNITIES' 
    | 'CONTACTS';

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  
  // 360 Data State
  const [activities, setActivities] = useState<CustomerActivityLog[]>([]);
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [rateSchedules, setRateSchedules] = useState<RateReviewSchedule[]>([]);
  const [rateTasks, setRateTasks] = useState<RateReviewTask[]>([]);
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [radarOpportunities, setRadarOpportunities] = useState<BusinessOpportunity[]>([]);
  const [healthScore, setHealthScore] = useState<CustomerHealthScore | null>(null);

  // Credit limit edit state
  const [isEditingCredit, setIsEditingCredit] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState<string>('200000000');
  const [creditTermDaysInput, setCreditTermDaysInput] = useState<string>('30');

  // Modal open states
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false);
  const [isRateReviewOpen, setIsRateReviewOpen] = useState(false);

  // Synchronize when initialCustomer changes
  useEffect(() => {
    if (initialCustomer) {
      setActiveCustomer(initialCustomer);
      setCreditLimitInput(String(initialCustomer.creditLimitVnd || 200000000));
      setCreditTermDaysInput(String(initialCustomer.creditTermDays || 30));
    }
  }, [initialCustomer]);

  const loadData = async () => {
    if (!activeCustomer?.id) return;
    setLoading(true);
    try {
      const data = await fetchCustomer360Data(activeCustomer.id, companyId, activeCustomer, quotes, shipments, contracts);
      setActivities(data.activities);
      setFollowUps(data.followUps);
      setRateSchedules(data.rateReviewSchedules);
      setRateTasks(data.rateReviewTasks);
      setOpportunities(data.opportunities);
      setHealthScore(data.healthScore);

      // Load Business Opportunity Radar items
      try {
        const radarList = await getBusinessOpportunities(companyId || 'company_profile', { customerId: activeCustomer.id });
        setRadarOpportunities(radarList);
      } catch (rErr) {
        console.warn('Could not load radar opportunities:', rErr);
      }
    } catch (err) {
      console.error('Failed to load 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeCustomer?.id) {
      loadData();
    }
  }, [isOpen, activeCustomer?.id, quotes.length, shipments.length]);

  // Filter Quotes for Active Customer
  const customerQuotes = useMemo(() => {
    if (!activeCustomer) return [];
    return quotes.filter(q => 
      q.customer?.id === activeCustomer.id || 
      q.customer?.companyName === activeCustomer.companyName ||
      (activeCustomer.taxId && q.customer?.taxId === activeCustomer.taxId)
    ).sort((a, b) => new Date(b.createdDate || '').getTime() - new Date(a.createdDate || '').getTime());
  }, [quotes, activeCustomer]);

  // Quotation Win-Rate Statistics
  const quoteStats = useMemo(() => {
    const total = customerQuotes.length;
    const accepted = customerQuotes.filter(q => q.status === 'ACCEPTED').length;
    const sent = customerQuotes.filter(q => q.status === 'SENT').length;
    const draft = customerQuotes.filter(q => q.status === 'DRAFT').length;
    const rejected = customerQuotes.filter(q => q.status === 'REJECTED').length;
    const winRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const totalValUsd = customerQuotes.reduce((acc, q) => acc + (q.grandTotalUsd || q.subtotalUsd || 0), 0);
    const totalValVnd = customerQuotes.reduce((acc, q) => acc + (q.grandTotalVnd || q.subtotalVnd || 0), 0);
    const acceptedValUsd = customerQuotes
      .filter(q => q.status === 'ACCEPTED')
      .reduce((acc, q) => acc + (q.grandTotalUsd || q.subtotalUsd || 0), 0);

    return {
      total,
      accepted,
      sent,
      draft,
      rejected,
      winRate,
      totalValUsd,
      totalValVnd,
      acceptedValUsd,
    };
  }, [customerQuotes]);

  // Filter Shipments for Active Customer
  const customerShipments = useMemo(() => {
    if (!activeCustomer) return [];
    return shipments.filter(s => 
      s.customerId === activeCustomer.id || 
      s.customerName === activeCustomer.companyName ||
      s.customerName === activeCustomer.customerName
    ).sort((a, b) => new Date(b.cargoReadyDate || b.etdPlanned || '').getTime() - new Date(a.cargoReadyDate || a.etdPlanned || '').getTime());
  }, [shipments, activeCustomer]);

  // Filter Debit Notes for Active Customer
  const customerDebitNotes = useMemo(() => {
    if (!activeCustomer) return [];
    const all = DebitNoteService.getAllDebitNotes();
    return all.filter(dn => {
      const custName = dn.customer?.companyName || dn.customer?.customerName;
      const custTax = dn.customer?.taxId;
      return (
        custName === activeCustomer.companyName ||
        custName === activeCustomer.customerName ||
        (activeCustomer.taxId && custTax === activeCustomer.taxId) ||
        (dn.quotationId && customerQuotes.some(q => q.id === dn.quotationId))
      );
    }).sort((a, b) => new Date(b.issueDate || '').getTime() - new Date(a.issueDate || '').getTime());
  }, [activeCustomer, customerQuotes]);

  // Financial & Debt Metrics
  const debtMetrics = useMemo(() => {
    const totalBilledVnd = customerDebitNotes.reduce((acc, dn) => acc + (dn.grandTotalVnd || dn.subtotalVnd || 0), 0);
    
    // Paid vs Unpaid
    const paidDebitNotes = customerDebitNotes.filter(dn => dn.status === 'PAID');
    const unpaidDebitNotes = customerDebitNotes.filter(dn => dn.status !== 'PAID' && dn.status !== 'CANCELLED');
    
    const paidAmountVnd = paidDebitNotes.reduce((acc, dn) => acc + (dn.grandTotalVnd || dn.subtotalVnd || 0), 0);
    const outstandingVnd = unpaidDebitNotes.reduce((acc, dn) => acc + (dn.grandTotalVnd || dn.subtotalVnd || 0), 0);
    
    // Overdue Check
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueDebitNotes = unpaidDebitNotes.filter(dn => dn.dueDate && dn.dueDate < todayStr);
    const overdueAmountVnd = overdueDebitNotes.reduce((acc, dn) => acc + (dn.grandTotalVnd || dn.subtotalVnd || 0), 0);

    const creditLimitVnd = activeCustomer.creditLimitVnd || 200000000;
    const creditTermDays = activeCustomer.creditTermDays || 30;
    const utilizationPercent = Math.min(100, Math.round((outstandingVnd / (creditLimitVnd || 1)) * 100));

    // Credit Risk Category
    let creditRiskStatus: 'SAFE' | 'WARNING' | 'LOCKED' = 'SAFE';
    let creditRiskMessage = 'Tín dụng an toàn, dư nợ trong hạn mức cho phép.';

    if (overdueAmountVnd > 0 || outstandingVnd >= creditLimitVnd) {
      creditRiskStatus = 'LOCKED';
      creditRiskMessage = overdueAmountVnd > 0 
        ? `CẢNH BÁO: Có ${overdueDebitNotes.length} Debit Note quá hạn (${formatVND(overdueAmountVnd)}). Khóa cấp tín dụng mới!`
        : `Dư nợ đã chạm hoặc vượt trần hạn mức tín dụng (${formatVND(creditLimitVnd)}).`;
    } else if (utilizationPercent >= 70) {
      creditRiskStatus = 'WARNING';
      creditRiskMessage = `Dư nợ chiếm dụng ${utilizationPercent}% hạn mức. Cần theo dõi tiến độ thanh toán.`;
    }

    return {
      totalBilledVnd,
      paidAmountVnd,
      outstandingVnd,
      overdueCount: overdueDebitNotes.length,
      overdueAmountVnd,
      creditLimitVnd,
      creditTermDays,
      utilizationPercent,
      creditRiskStatus,
      creditRiskMessage,
      debitNotesCount: customerDebitNotes.length,
    };
  }, [customerDebitNotes, activeCustomer]);

  const customerContracts = useMemo(() => {
    if (!activeCustomer) return [];
    return contracts.filter(c => 
      c.partyId === activeCustomer.id || 
      c.partyName === activeCustomer.companyName
    );
  }, [contracts, activeCustomer]);

  const openFollowUpsCount = followUps.filter(f => f.status === 'OPEN').length;
  const overdueFollowUpsCount = followUps.filter(f => f.status === 'OPEN' && new Date(f.dueDate) < new Date()).length;

  // Save Credit limit updates
  const handleSaveCreditLimit = async () => {
    const limitNum = parseFloat(creditLimitInput.replace(/[^0-9]/g, '')) || 200000000;
    const termNum = parseInt(creditTermDaysInput, 10) || 30;
    const updated: CustomerRecord = {
      ...activeCustomer,
      creditLimitVnd: limitNum,
      creditTermDays: termNum,
      creditStatus: debtMetrics.creditRiskStatus,
    };
    setActiveCustomer(updated);
    if (onSaveCustomer) {
      await onSaveCustomer(updated);
    }
    setIsEditingCredit(false);
  };

  const formatSafeDate = (d?: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('vi-VN');
    } catch {
      return d;
    }
  };

  const getHealthBadge = (health: CustomerHealthScore | null) => {
    if (!health) return null;
    switch (health.status) {
      case 'CHURN_RISK':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Nguy cơ mất khách ({health.score}/100)</span>
          </span>
        );
      case 'NEEDS_ATTENTION':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Cần quan tâm chăm sóc ({health.score}/100)</span>
          </span>
        );
      case 'LOYAL':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khách hàng thân thiết ({health.score}/100)</span>
          </span>
        );
      case 'HEALTHY':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-300">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Khách hàng ổn định ({health.score}/100)</span>
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        
        {/* Top Header & Customer Switcher Bar */}
        <div className="px-5 py-3.5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 font-bold text-base shrink-0 shadow-inner">
              {activeCustomer.code || 'KH'}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[320px] sm:max-w-md">
                  {activeCustomer.companyName || activeCustomer.customerName}
                </h2>
                {getHealthBadge(healthScore)}
                
                {/* Credit Risk Status Pill */}
                {debtMetrics.creditRiskStatus === 'LOCKED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Khóa Nợ</span>
                  </span>
                ) : debtMetrics.creditRiskStatus === 'WARNING' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Cảnh Báo Nợ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold uppercase tracking-wider">
                    <Shield className="w-2.5 h-2.5" />
                    <span>Tín Dụng Tốt</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>MST: <strong>{activeCustomer.taxId || '—'}</strong></span>
                <span className="text-slate-500">•</span>
                <span>Nhóm: <strong>{activeCustomer.group || 'Khách Thương Mại'}</strong></span>
                <span className="text-slate-500">•</span>
                <span>Người liên hệ: <strong>{activeCustomer.customerName || activeCustomer.contactPerson || '—'}</strong></span>
                
                {/* Switcher Button */}
                {customers.length > 1 && (
                  <div className="relative inline-block ml-1">
                    <button
                      type="button"
                      onClick={() => setIsCustomerSelectorOpen(!isCustomerSelectorOpen)}
                      className="text-[11px] font-semibold text-indigo-300 hover:text-white underline cursor-pointer"
                    >
                      [Đổi khách hàng ({customers.length})]
                    </button>

                    {isCustomerSelectorOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-72 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl z-50 p-2 space-y-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                          <input
                            type="text"
                            placeholder="Tìm khách hàng..."
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                          {customers
                            .filter(c => 
                              (c.companyName || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                              (c.code || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                              (c.taxId || '').includes(customerSearchQuery)
                            )
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setActiveCustomer(c);
                                  setIsCustomerSelectorOpen(false);
                                  setCustomerSearchQuery('');
                                }}
                                className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                                  c.id === activeCustomer.id ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="truncate">{c.code} · {c.companyName}</span>
                                {c.id === activeCustomer.id && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onSelectCustomerForQuote && (
              <button
                type="button"
                onClick={() => {
                  onSelectCustomerForQuote(activeCustomer);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                title="Tạo báo giá mới áp dụng khách hàng này"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ Báo Giá Mới</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLogActivityOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              title="Ghi nhận cuộc gọi, tin nhắn Zalo hoặc buổi gặp"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ghi Tương Tác</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFollowUpOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              title="Lên lịch hẹn chăm sóc khách hàng"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lên Lịch Hẹn</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 6-Metric High Impact Control Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-slate-100 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Sức Khỏe KH</span>
            <span className="text-sm font-extrabold text-indigo-700 font-mono">
              {healthScore?.score || 70}/100
            </span>
          </div>

          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Tỷ Lệ Chốt (Win-rate)</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono">
              {quoteStats.winRate}% ({quoteStats.accepted}/{quoteStats.total})
            </span>
          </div>

          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Tổng Đã Báo (USD)</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              {formatUSD(quoteStats.totalValUsd)}
            </span>
          </div>

          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Lô Hàng Thực Hiện</span>
            <span className="text-sm font-extrabold text-blue-700 font-mono">
              {customerShipments.length} lô
            </span>
          </div>

          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Dư Nợ Hiện Tại</span>
            <span className={`text-sm font-extrabold font-mono ${debtMetrics.outstandingVnd > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {debtMetrics.outstandingVnd > 0 ? formatVND(debtMetrics.outstandingVnd) : '0 ₫'}
            </span>
          </div>

          <div className="p-2.5 text-center">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Tín Dụng & Hạn Mức</span>
            <span className={`text-xs font-bold ${
              debtMetrics.creditRiskStatus === 'LOCKED' ? 'text-rose-600' : debtMetrics.creditRiskStatus === 'WARNING' ? 'text-amber-600' : 'text-emerald-700'
            }`}>
              {debtMetrics.creditRiskStatus === 'LOCKED' ? '🔒 KHÓA NỢ' : debtMetrics.creditRiskStatus === 'WARNING' ? '⚠️ CẢNH BÁO' : '✅ AN TOÀN'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-200 bg-white overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tổng Quan Hồ Sơ
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FINANCE_CREDIT')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'FINANCE_CREDIT'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tài Chính & Công Nợ</span>
            {debtMetrics.outstandingVnd > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                debtMetrics.creditRiskStatus === 'LOCKED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {debtMetrics.debitNotesCount} DN
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUOTATIONS')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'QUOTATIONS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Báo Giá & Win-rate ({quoteStats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SHIPMENTS')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'SHIPMENTS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-blue-600" />
            <span>Lô Hàng Vận Hành ({customerShipments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'TIMELINE'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Dòng Thời Gian ({activities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FOLLOW_UPS')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'FOLLOW_UPS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Lịch Chăm Sóc</span>
            {openFollowUpsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                {openFollowUpsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RATE_REVIEWS')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'RATE_REVIEWS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span>Định Kỳ Review Giá ({rateSchedules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OPPORTUNITIES')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'OPPORTUNITIES'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Radar Cơ Hội ({radarOpportunities.length + opportunities.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/60">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Đang đồng bộ hồ sơ khách hàng 360°...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Health summary card */}
                  {healthScore && (
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
                      <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800">
                            Chỉ Số Sức Khỏe & Hành Vi Khách Hàng (Health Score)
                          </h4>
                          <span className="text-xs font-extrabold text-indigo-700 font-mono">
                            Điểm: {healthScore.score}/100
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {healthScore.primaryReason || 'Khách hàng có lịch sử giao dịch ổn định.'}
                        </p>
                        
                        {/* Indicators pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                          {Array.isArray(healthScore.indicators) ? (
                            healthScore.indicators.map((ind, idx) => (
                              <div key={ind.code || idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block truncate">{ind.label}</span>
                                <span className={`font-semibold ${ind.impact === 'POSITIVE' ? 'text-emerald-700' : ind.impact === 'NEGATIVE' ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {ind.scoreDelta > 0 ? `+${ind.scoreDelta}` : ind.scoreDelta} điểm
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate" title={ind.reason}>{ind.reason}</span>
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Thông Tin Pháp Lý & Phân Hạng</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Mã Khách Hàng:</span>
                          <span className="font-bold text-indigo-900 font-mono">{activeCustomer.code}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Mã số thuế:</span>
                          <span className="font-mono font-medium text-slate-800">{activeCustomer.taxId || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Địa chỉ trụ sở:</span>
                          <span className="text-slate-800 text-right max-w-[280px] truncate" title={activeCustomer.address}>{activeCustomer.address || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Nhóm khách hàng:</span>
                          <span className="font-semibold text-slate-700">{activeCustomer.group || 'Khách Thương Mại'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ghi chú quản lý:</span>
                          <span className="text-slate-600 text-right max-w-[280px] italic">{activeCustomer.notes || 'Chưa có ghi chú'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Đầu Mối Liên Hệ & Kênh Trao Đổi</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Người đại diện:</span>
                          <span className="font-bold text-slate-800">{activeCustomer.customerName || activeCustomer.contactPerson || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Số điện thoại:</span>
                          <span className="font-mono text-indigo-700 font-semibold">{activeCustomer.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Email giao dịch:</span>
                          <span className="font-mono text-slate-700">{activeCustomer.email || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Sale phụ trách:</span>
                          <span className="font-semibold text-slate-800">{activeCustomer.salesPerson || user?.name || 'Chưa gán'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hợp đồng hiệu lực:</span>
                          <span className="font-bold text-emerald-700">{customerContracts.length} hợp đồng</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCE_CREDIT (Tài Chính & Rủi Ro Công Nợ) */}
              {activeTab === 'FINANCE_CREDIT' && (
                <div className="space-y-4">
                  {/* Credit Risk Warning Banner */}
                  {debtMetrics.creditRiskStatus === 'LOCKED' && (
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                          Khóa Tín Dụng Báo Giá & Booking Mới (Credit Lock Active)
                        </h4>
                        <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                          {debtMetrics.creditRiskMessage} Khách hàng bắt buộc phải thanh toán các hóa đơn quá hạn hoặc cần có phê duyệt của Ban Giám Đốc mới được phát hành báo giá tiếp theo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3 Metric Cards for Credit */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Hạn mức tín dụng */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Hạn Mức Công Nợ</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingCredit(!isEditingCredit)}
                          className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          {isEditingCredit ? 'Hủy' : 'Điều Chỉnh'}
                        </button>
                      </div>

                      {isEditingCredit ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            value={creditLimitInput}
                            onChange={(e) => setCreditLimitInput(e.target.value)}
                            placeholder="Số tiền hạn mức (VND)"
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={creditTermDaysInput}
                              onChange={(e) => setCreditTermDaysInput(e.target.value)}
                              placeholder="Số ngày nợ"
                              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono"
                            />
                            <span className="text-xs text-slate-500">ngày</span>
                            <button
                              type="button"
                              onClick={handleSaveCreditLimit}
                              className="ml-auto px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-xl font-black text-slate-900 font-mono mt-1">
                            {formatVND(debtMetrics.creditLimitVnd)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Thời hạn thanh toán: <strong>Net {debtMetrics.creditTermDays} ngày</strong>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Dư nợ hiện tại */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider text-[10px]">
                        Dư Nợ Chưa Thanh Toán
                      </div>
                      <div className="text-xl font-black text-amber-700 font-mono mt-1">
                        {formatVND(debtMetrics.outstandingVnd)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>Chiếm dụng: <strong>{debtMetrics.utilizationPercent}%</strong></span>
                        <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${debtMetrics.utilizationPercent >= 80 ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${debtMetrics.utilizationPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nợ quá hạn */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider text-[10px]">
                        Nợ Quá Hạn Cần Thu
                      </div>
                      <div className={`text-xl font-black font-mono mt-1 ${debtMetrics.overdueAmountVnd > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {debtMetrics.overdueAmountVnd > 0 ? formatVND(debtMetrics.overdueAmountVnd) : '0 ₫'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {debtMetrics.overdueCount > 0 ? (
                          <span className="text-rose-600 font-bold">{debtMetrics.overdueCount} Debit Note quá hạn</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Không có khoản nợ quá hạn</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Debit Notes Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-800">
                          Danh Sách Giấy Báo Nợ (Debit Notes) Đã Phát Hành ({customerDebitNotes.length})
                        </h4>
                      </div>
                      {onOpenStatementOfAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenStatementOfAccount(activeCustomer.companyName || activeCustomer.customerName);
                            onClose();
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xuất Đối Soát SOA & VietQR</span>
                        </button>
                      )}
                    </div>

                    {customerDebitNotes.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Chưa có Debit Note nào được phát hành cho khách hàng này.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                              <th className="py-2.5 px-3">Mã Debit Note</th>
                              <th className="py-2.5 px-3">Ngày Lập</th>
                              <th className="py-2.5 px-3">Hạn Thanh Toán</th>
                              <th className="py-2.5 px-3 text-right">Tổng Tiền (VND)</th>
                              <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerDebitNotes.map(dn => {
                              const isOverdue = dn.status !== 'PAID' && dn.dueDate && dn.dueDate < new Date().toISOString().slice(0, 10);
                              return (
                                <tr key={dn.id} className="hover:bg-slate-50 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {dn.debitNoteNumber}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">{dn.issueDate}</td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                      {dn.dueDate || '—'} {isOverdue && '(Quá hạn)'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatVND(dn.grandTotalVnd || dn.subtotalVnd || 0)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      dn.status === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isOverdue
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {dn.status === 'PAID' ? 'Đã Thanh Toán' : isOverdue ? 'Quá Hạn' : dn.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: QUOTATIONS (Báo Giá & Win-rate) */}
              {activeTab === 'QUOTATIONS' && (
                <div className="space-y-4">
                  {/* Quotation Win-rate Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Số Báo Giá</div>
                      <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{quoteStats.total}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Đã lập từ trước đến nay</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Tỷ Lệ Chốt Thành Công</div>
                      <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{quoteStats.winRate}%</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">{quoteStats.accepted} đơn đã ký duyệt</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang Treo Phản Hồi</div>
                      <div className="text-xl font-black text-amber-700 font-mono mt-0.5">{quoteStats.sent}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Báo giá đã gửi khách</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh Số Đã Chốt (USD)</div>
                      <div className="text-xl font-black text-indigo-700 font-mono mt-0.5">{formatUSD(quoteStats.acceptedValUsd)}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Tổng giá trị đơn Won</div>
                    </div>
                  </div>

                  {/* Quotations List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Danh Sách Chi Tiết {customerQuotes.length} Báo Giá Của Khách Hàng</span>
                      </h4>
                      {onSelectCustomerForQuote && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCustomerForQuote(activeCustomer);
                            onClose();
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo Báo Giá Mới</span>
                        </button>
                      )}
                    </div>

                    {customerQuotes.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Chưa có báo giá nào cho khách hàng này.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                              <th className="py-2.5 px-3">Mã Báo Giá</th>
                              <th className="py-2.5 px-3">Ngày Lập</th>
                              <th className="py-2.5 px-3">Tuyến Đường (POL ➔ POD)</th>
                              <th className="py-2.5 px-3">Quy Cách</th>
                              <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                              <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                              <th className="py-2.5 px-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerQuotes.map(q => (
                              <tr key={q.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-950">
                                  {q.quoteNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{q.createdDate}</td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium">
                                  {(q.shipment?.pol || 'POL').split(',')[0]} ➔ {(q.shipment?.pod || 'POD').split(',')[0]}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono">
                                  {q.shipment?.containerType || "40'HC"} ({q.shipment?.quantity || 1})
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {q.quoteCurrency === 'VND' 
                                    ? formatVND(q.grandTotalVnd || q.subtotalVnd || 0)
                                    : formatUSD(q.grandTotalUsd || q.subtotalUsd || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    q.status === 'ACCEPTED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : q.status === 'SENT'
                                      ? 'bg-blue-100 text-blue-800'
                                      : q.status === 'REJECTED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {q.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {onOpenQuoteDetail && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenQuoteDetail(q);
                                        onClose();
                                      }}
                                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 px-2 py-1 hover:bg-indigo-50 rounded"
                                    >
                                      Mở Báo Giá
                                    </button>
                                  )}
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

              {/* TAB 4: SHIPMENTS (Lô Hàng Đang Thực Hiện) */}
              {activeTab === 'SHIPMENTS' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Ship className="w-4 h-4 text-blue-600" />
                        <span>Danh Sách Lô Hàng Logistics Thực Hiện ({customerShipments.length})</span>
                      </h4>
                    </div>

                    {customerShipments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Chưa có lô hàng vận hành nào của khách hàng này được tạo trên hệ thống.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                              <th className="py-2.5 px-3">Mã Lô Hàng</th>
                              <th className="py-2.5 px-3">Phương Thức</th>
                              <th className="py-2.5 px-3">Lộ Trình</th>
                              <th className="py-2.5 px-3">Lịch ETD/ETA</th>
                              <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerShipments.map(s => (
                              <tr key={s.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                                  {s.shipmentNumber || s.id}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 font-medium">{s.serviceMode}</td>
                                <td className="py-2.5 px-3 text-slate-800">
                                  {s.origin || s.originPort} ➔ {s.destination || s.destinationPort}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                  ETD: {s.etdPlanned || '—'} · ETA: {s.etaPlanned || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {s.status}
                                  </span>
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

              {/* TAB 5: TIMELINE */}
              {activeTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Lịch Sử & Dòng Thời Gian Tương Tác</h4>
                      <p className="text-xs text-slate-500">Các cuộc gọi, email, buổi gặp và nhật ký trao đổi nghiệp vụ</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLogActivityOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi Nhận Tương Tác Mới</span>
                    </button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có ghi chép nào. Bấm nút "Ghi Nhận Tương Tác Mới" để lưu nhật ký cuộc gọi hoặc trao đổi.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {activities.map(act => (
                        <div key={act.id} className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                          <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{act.summary}</span>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200">
                                  {act.activityType}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                Bởi {act.createdByName || act.createdBy} • {formatSafeDate(act.occurredAt)}
                              </p>
                            </div>
                            {act.relatedEntityNumber && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {act.relatedEntityType}: {act.relatedEntityNumber}
                              </span>
                            )}
                          </div>

                          {act.details && (
                            <p className="text-slate-600 mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                              {act.details}
                            </p>
                          )}

                          {act.nextAction && (
                            <div className="mt-2 text-xs flex items-center gap-2 text-indigo-700 font-medium">
                              <span className="font-bold">Next Action:</span>
                              <span>{act.nextAction}</span>
                              {act.nextActionDue && (
                                <span className="text-[11px] text-slate-400">
                                  (Hạn: {formatSafeDate(act.nextActionDue)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: FOLLOW_UPS */}
              {activeTab === 'FOLLOW_UPS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Kế Hoạch & Lịch Chăm Sóc Khách Hàng</h4>
                      <p className="text-xs text-slate-500">Các cuộc hẹn gọi lại, kiểm tra cước định kỳ và chăm sóc đơn hàng</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFollowUpOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lên Lịch Chăm Sóc</span>
                    </button>
                  </div>

                  {followUps.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có lịch hẹn chăm sóc nào. Hãy lên lịch gọi điện thoại hoặc gửi báo giá tiếp theo.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {followUps.map(fu => {
                        const isOverdue = fu.status === 'OPEN' && new Date(fu.dueDate) < new Date();
                        const isDone = fu.status === 'COMPLETED';

                        return (
                          <div
                            key={fu.id}
                            className={`p-4 rounded-xl border text-xs bg-white shadow-2xs transition ${
                              isDone
                                ? 'border-slate-200 opacity-60'
                                : isOverdue
                                ? 'border-rose-300 bg-rose-50/20'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {!isDone && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await completeCustomerFollowUp(fu.id, 'Đã hoàn thành qua Customer 360', user);
                                      loadData();
                                    }}
                                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 cursor-pointer"
                                    title="Đánh dấu hoàn thành"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className={`font-bold text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                      {fu.followUpType || 'Chăm sóc khách hàng'}
                                    </h5>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                      isDone ? 'bg-slate-100 text-slate-500' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {isDone ? 'Đã xong' : isOverdue ? 'Quá hạn' : 'Đang chờ'}
                                    </span>
                                  </div>
                                  <p className="text-slate-500 text-xs mt-1">{fu.notes || fu.nextAction || 'Không có ghi chú'}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                Hạn: {formatSafeDate(fu.dueDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: RATE_REVIEWS */}
              {activeTab === 'RATE_REVIEWS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Định Kỳ Review Giá Cước Khách Hàng</h4>
                      <p className="text-xs text-slate-500">Tự động kích hoạt lịch khảo sát và cập nhật giá theo chu kỳ hợp đồng</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRateReviewOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Lịch Review Giá</span>
                    </button>
                  </div>

                  {rateSchedules.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có lịch review giá nào cho khách hàng này.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rateSchedules.map(rs => (
                        <div key={rs.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{rs.lane || (rs.origin && rs.destination ? `${rs.origin} → ${rs.destination}` : 'Toàn bộ tuyến')}</span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded">
                                {rs.frequency}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">Phương thức: {rs.serviceMode || 'Đa phương thức'}</p>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            Kỳ tiếp theo: {formatSafeDate(rs.nextReviewDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: OPPORTUNITIES */}
              {activeTab === 'OPPORTUNITIES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Radar Cơ Hội Thương Mại & Bán Chéo Dịch Vụ</h4>
                      <p className="text-xs text-slate-500">Khám phá các tuyến hàng mới và cơ hội tăng trưởng doanh thu</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpportunityOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Cơ Hội Mới</span>
                    </button>
                  </div>

                  {opportunities.length === 0 && radarOpportunities.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa phát hiện cơ hội mới. Bấm "Thêm Cơ Hội Mới" để ghi nhận nhu cầu mở tuyến mới của khách.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opportunities.map(opp => (
                        <div key={opp.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-sm text-slate-800">{opp.title}</h5>
                            <p className="text-slate-500 mt-1">{opp.notes || (opp.origin && opp.destination ? `Tuyến: ${opp.origin} → ${opp.destination}` : opp.lane || '')}</p>
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-indigo-700 font-semibold">
                              {opp.estimatedVolume && <span>Sản lượng: {opp.estimatedVolume}</span>}
                              {opp.estimatedVolume && opp.estimatedValue ? <span>•</span> : null}
                              {opp.estimatedValue ? <span>Giá trị ước tính: {formatUSD(opp.estimatedValue)}</span> : null}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">
                            {opp.stage}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Trung tâm Quản Lý Khách Hàng 360° đồng bộ dữ liệu thời gian thực giữa Báo Giá, Vận Hành Lô Hàng, Hợp Đồng và Công Nợ Debit Notes.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Sub Modals */}
      <LogActivityModal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        customerId={activeCustomer.id}
        customerName={activeCustomer.companyName || activeCustomer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateFollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        customerId={activeCustomer.id}
        customerName={activeCustomer.companyName || activeCustomer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateOpportunityModal
        isOpen={isOpportunityOpen}
        onClose={() => setIsOpportunityOpen(false)}
        customerId={activeCustomer.id}
        customerName={activeCustomer.companyName || activeCustomer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateRateReviewModal
        isOpen={isRateReviewOpen}
        onClose={() => setIsRateReviewOpen(false)}
        customerId={activeCustomer.id}
        customerName={activeCustomer.companyName || activeCustomer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />
    </div>
  );
};
