import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Search, 
  Clock, 
  DollarSign, 
  Layers, 
  FileText, 
  Save, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Eye, 
  Send, 
  Printer, 
  TrendingUp, 
  Building2, 
  UserCheck, 
  Box, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Check, 
  HelpCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  QuoteData, 
  ShipmentDetails, 
  CustomerInfo, 
  TransportMode, 
  ContainerType, 
  IncotermCode, 
  Currency, 
  LineItem,
  CompanyProfile 
} from '../../types/logistics';
import { 
  SmartQuotationStep, 
  MatchedRateCandidate, 
  SmartRateMatchingResult, 
  MissingRateDetectionItem, 
  AutosaveStatus, 
  QuotationPricingSnapshot 
} from '../../types/smartQuotation';
import { 
  matchRatesForQuotation 
} from '../../services/smartQuotation/smartRateMatcher';
import { 
  CostingItem, 
  CostingSummary, 
  SellingPriceMethod, 
  convertCandidateToCostingItem, 
  calculateCostingSummary, 
  convertCostingItemsToLineItems 
} from '../../services/smartQuotation/smartCostingEngine';
import { 
  buildPricingSnapshot, 
  canEditQuotationPricing, 
  createQuotationRevision, 
  logPriceOverrideAudit 
} from '../../services/smartQuotation/quotationSnapshotService';
import { fetchCustomers } from '../../services/repository/customerRepository';
import { getPricingPoliciesFromFirestore } from '../../services/pricing/pricingPolicyService';
import { PricingPolicyItem } from '../../types/pricingIntelligence';
import { UserRole } from '../../types/analytics';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';

interface SmartQuotationWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuote: QuoteData;
  company: CompanyProfile;
  currentUserRole?: UserRole;
  onSaveQuoteToDatabase: (updatedQuote: QuoteData) => Promise<boolean>;
  onExportPdf?: (quote: QuoteData, currency: 'USD' | 'VND') => void;
  onExportExcel?: (quote: QuoteData, currency: 'USD' | 'VND') => void;
}

const STEPS: { id: SmartQuotationStep; labelVi: string; stepNumber: number }[] = [
  { id: 'SHIPMENT', labelVi: '1. Thông Tin Lô Hàng', stepNumber: 1 },
  { id: 'MATCHING', labelVi: '2. Khớp Cước Thông Minh', stepNumber: 2 },
  { id: 'COSTING', labelVi: '3. Phân Tích Giá Vốn', stepNumber: 3 },
  { id: 'SELLING', labelVi: '4. Xác Định Giá Bán', stepNumber: 4 },
  { id: 'PROFIT', labelVi: '5. Lợi Nhuận & Biên Lãi', stepNumber: 5 },
  { id: 'VALIDATION', labelVi: '6. Cảnh Báo & Hợp Lệ', stepNumber: 6 },
  { id: 'REVIEW', labelVi: '7. Xem Trước Báo Giá', stepNumber: 7 },
  { id: 'SAVE', labelVi: '8. Lưu & Tạo Snapshot', stepNumber: 8 },
  { id: 'APPROVAL', labelVi: '9. Phê Duyệt & Khóa Giá', stepNumber: 9 },
];

export const SmartQuotationWorkspace: React.FC<SmartQuotationWorkspaceProps> = ({
  isOpen,
  onClose,
  initialQuote,
  company,
  currentUserRole = 'SALES',
  onSaveQuoteToDatabase,
  onExportPdf,
  onExportExcel,
}) => {
  // Working local state of the quote in workspace
  const [quote, setQuote] = useState<QuoteData>(initialQuote);
  const [currentStep, setCurrentStep] = useState<SmartQuotationStep>('SHIPMENT');
  
  // Autosave status
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('SAVED');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Step 1: Customer lookup state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerInfo[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // Step 2: Rate Matching state
  const [isMatchingRates, setIsMatchingRates] = useState(false);
  const [matchingResult, setMatchingResult] = useState<SmartRateMatchingResult | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Step 3 & 4: Costing & Selling State
  const [costingItems, setCostingItems] = useState<CostingItem[]>([]);
  const [sellingMethod, setSellingMethod] = useState<SellingPriceMethod>('TARGET_MARGIN');
  const [globalTargetMargin, setGlobalTargetMargin] = useState<number>(15);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(20);
  const [pricingPolicies, setPricingPolicies] = useState<PricingPolicyItem[]>([]);
  const [activePolicy, setActivePolicy] = useState<PricingPolicyItem | undefined>(undefined);

  // Price Override Modal State
  const [overrideItem, setOverrideItem] = useState<CostingItem | null>(null);
  const [overrideNewPrice, setOverrideNewPrice] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Synchronize when initialQuote changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setQuote(initialQuote);
      setAutosaveStatus('SAVED');
    }
  }, [isOpen, initialQuote]);

  // Load Policies on mount
  useEffect(() => {
    getPricingPoliciesFromFirestore().then(policies => {
      setPricingPolicies(policies);
      if (policies.length > 0) {
        setActivePolicy(policies[0]);
      }
    }).catch(err => console.warn('Could not fetch pricing policies:', err));
  }, []);

  // Debounced customer search (300ms)
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setCustomerOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const allCustomers = await fetchCustomers();
        const q = customerSearchQuery.toLowerCase().trim();
        const filtered = allCustomers.filter(c => 
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          (c.taxId && c.taxId.toLowerCase().includes(q))
        );
        setCustomerOptions(filtered);
      } catch (err) {
        console.warn('Error fetching customers:', err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Compute Costing Summary in-memory
  const costingSummary: CostingSummary = useMemo(() => {
    return calculateCostingSummary(costingItems, quote.exchangeRate, activePolicy);
  }, [costingItems, quote.exchangeRate, activePolicy]);

  // Step 2 Action: Run Smart Rate Matching against 100% REAL Firebase records
  const handleRunRateMatching = useCallback(async () => {
    setIsMatchingRates(true);
    try {
      const result = await matchRatesForQuotation({
        shipment: quote.shipment,
        customer: quote.customer,
        carrier: quote.shipment.carrier,
        quotationDate: quote.createdDate,
        validityDate: quote.terms.validityDate,
        incoterm: quote.terms.incoterm,
      });
      setMatchingResult(result);

      // Auto-select all Best Matches by default
      const defaultSelected = new Set<string>();
      result.bestMatches.forEach(b => defaultSelected.add(b.id));
      setSelectedCandidateIds(defaultSelected);

      // Pre-fill costing items from selected best matches
      const containerQty = Number(quote.shipment.quantity) || 1;
      const initialCostings = result.bestMatches.map(c => 
        convertCandidateToCostingItem(
          c, 
          containerQty, 
          quote.exchangeRate, 
          sellingMethod, 
          globalTargetMargin, 
          globalMarkupPercent, 
          activePolicy
        )
      );
      setCostingItems(initialCostings);
    } catch (err) {
      console.error('Error running rate matching:', err);
    } finally {
      setIsMatchingRates(false);
    }
  }, [quote.shipment, quote.customer, quote.createdDate, quote.terms, quote.exchangeRate, sellingMethod, globalTargetMargin, globalMarkupPercent, activePolicy]);

  // Toggle candidate selection
  const handleToggleCandidate = (candidate: MatchedRateCandidate) => {
    const next = new Set(selectedCandidateIds);
    if (next.has(candidate.id)) {
      next.delete(candidate.id);
      setCostingItems(prev => prev.filter(i => i.id !== candidate.id));
    } else {
      next.add(candidate.id);
      const containerQty = Number(quote.shipment.quantity) || 1;
      const newCosting = convertCandidateToCostingItem(
        candidate, 
        containerQty, 
        quote.exchangeRate, 
        sellingMethod, 
        globalTargetMargin, 
        globalMarkupPercent, 
        activePolicy
      );
      setCostingItems(prev => [...prev, newCosting]);
    }
    setSelectedCandidateIds(next);
  };

  // Recalculate costing items when selling method or margins change
  const handleApplySellingMethod = (
    method: SellingPriceMethod, 
    margin: number, 
    markup: number, 
    policy?: PricingPolicyItem
  ) => {
    setSellingMethod(method);
    setGlobalTargetMargin(margin);
    setGlobalMarkupPercent(markup);
    if (policy) setActivePolicy(policy);

    setCostingItems(prev => prev.map(item => {
      // Don't overwrite if manual override was applied
      if (item.isPriceOverridden) return item;

      let newSellRate = item.sellRate;
      if (method === 'COST_PLUS') {
        newSellRate = item.buyRate * (1 + markup / 100);
      } else if (method === 'TARGET_MARGIN') {
        newSellRate = margin < 100 ? item.buyRate / (1 - margin / 100) : item.buyRate * 1.2;
      } else if (method === 'POLICY_RULE' && policy) {
        newSellRate = item.buyRate / (1 - policy.targetMarginPercent / 100);
      }

      newSellRate = item.currency === 'USD' ? Math.round(newSellRate * 100) / 100 : Math.round(newSellRate);
      const sellAmount = newSellRate * item.quantity;
      const sellAmountUsd = item.currency === 'USD' ? sellAmount : (quote.exchangeRate > 0 ? sellAmount / quote.exchangeRate : 0);
      const sellAmountVnd = item.currency === 'VND' ? sellAmount : (quote.exchangeRate > 0 ? sellAmount * quote.exchangeRate : 0);
      const vatAmountUsd = Math.round(sellAmountUsd * (item.vatRate / 100) * 100) / 100;
      const vatAmountVnd = Math.round(sellAmountVnd * (item.vatRate / 100));
      const profitUsd = Math.round((sellAmountUsd - item.buyAmountUsd) * 100) / 100;
      const profitVnd = Math.round(sellAmountVnd - item.buyAmountVnd);
      const marginPercent = sellAmountUsd > 0 ? Math.round((profitUsd / sellAmountUsd) * 10000) / 100 : 0;

      return {
        ...item,
        sellRate: newSellRate,
        sellAmount,
        sellAmountUsd,
        sellAmountVnd,
        vatAmountUsd,
        vatAmountVnd,
        totalWithVatUsd: Math.round((sellAmountUsd + vatAmountUsd) * 100) / 100,
        totalWithVatVnd: Math.round(sellAmountVnd + vatAmountVnd),
        profitUsd,
        profitVnd,
        marginPercent,
      };
    }));
  };

  // Handle Manual Price Override
  const handleOpenOverrideModal = (item: CostingItem) => {
    setOverrideItem(item);
    setOverrideNewPrice(item.sellRate);
    setOverrideReason(item.overrideReason || '');
  };

  const handleApplyOverride = async () => {
    if (!overrideItem) return;
    const originalPrice = overrideItem.sellRate;
    const newPrice = overrideNewPrice;

    setCostingItems(prev => prev.map(i => {
      if (i.id !== overrideItem.id) return i;

      const sellAmount = newPrice * i.quantity;
      const sellAmountUsd = i.currency === 'USD' ? sellAmount : (quote.exchangeRate > 0 ? sellAmount / quote.exchangeRate : 0);
      const sellAmountVnd = i.currency === 'VND' ? sellAmount : (quote.exchangeRate > 0 ? sellAmount * quote.exchangeRate : 0);
      const vatAmountUsd = Math.round(sellAmountUsd * (i.vatRate / 100) * 100) / 100;
      const vatAmountVnd = Math.round(sellAmountVnd * (i.vatRate / 100));
      const profitUsd = Math.round((sellAmountUsd - i.buyAmountUsd) * 100) / 100;
      const profitVnd = Math.round(sellAmountVnd - i.buyAmountVnd);
      const marginPercent = sellAmountUsd > 0 ? Math.round((profitUsd / sellAmountUsd) * 10000) / 100 : 0;

      return {
        ...i,
        sellRate: newPrice,
        sellAmount,
        sellAmountUsd,
        sellAmountVnd,
        vatAmountUsd,
        vatAmountVnd,
        totalWithVatUsd: Math.round((sellAmountUsd + vatAmountUsd) * 100) / 100,
        totalWithVatVnd: Math.round(sellAmountVnd + vatAmountVnd),
        profitUsd,
        profitVnd,
        marginPercent,
        isPriceOverridden: true,
        originalSellRate: originalPrice,
        overrideReason,
      };
    }));

    // Log to pricing audit trail in Firestore
    const convertedItem = convertCostingItemsToLineItems([overrideItem], quote.exchangeRate)[0];
    await logPriceOverrideAudit(
      quote, 
      convertedItem, 
      originalPrice, 
      newPrice, 
      overrideReason, 
      company.salesRepName || 'Sales Rep'
    );

    setOverrideItem(null);
  };

  // Step 8 Action: Save quote to Firestore with Snapshot
  const handleSaveQuotation = async () => {
    setAutosaveStatus('SAVING');
    try {
      const newLineItems = convertCostingItemsToLineItems(costingItems, quote.exchangeRate);
      
      const updatedQuoteData: QuoteData = {
        ...quote,
        items: newLineItems,
        subtotalUsd: costingSummary.totalSellUsd,
        subtotalVnd: costingSummary.totalSellVnd,
        vatTotalUsd: costingSummary.vatTotalUsd,
        vatTotalVnd: costingSummary.vatTotalVnd,
        grandTotalUsd: costingSummary.grandTotalUsd,
        grandTotalVnd: costingSummary.grandTotalVnd,
        totalCostUsd: costingSummary.totalBuyUsd,
        totalCostVnd: costingSummary.totalBuyVnd,
        totalProfitUsd: costingSummary.grossProfitUsd,
        totalProfitVnd: costingSummary.grossProfitVnd,
        overallMarginPercent: costingSummary.grossMarginPercent,
        targetMarginPercent: globalTargetMargin,
        updatedDate: new Date().toISOString().slice(0, 10),
      };

      // Build immutable pricing snapshot
      const snapshot = buildPricingSnapshot(updatedQuoteData, company.salesRepName || 'User');
      updatedQuoteData.pricingSnapshot = snapshot;

      const success = await onSaveQuoteToDatabase(updatedQuoteData);
      if (success) {
        setQuote(updatedQuoteData);
        setAutosaveStatus('SAVED');
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setAutosaveStatus('SAVE_FAILED');
      }
    } catch (err) {
      console.error('Error saving quotation in workspace:', err);
      setAutosaveStatus('SAVE_FAILED');
    }
  };

  // Step 9 Action: Approval & Price Locking
  const handleTogglePriceLock = async () => {
    const isLocked = !quote.priceLocked;
    const updated = {
      ...quote,
      priceLocked: isLocked,
      status: isLocked ? ('APPROVED' as const) : ('DRAFT' as const),
    };
    setQuote(updated);
    await onSaveQuoteToDatabase(updated);
  };

  const handleCreateRevision = async () => {
    const revised = createQuotationRevision(quote, company.salesRepName || 'User');
    setQuote(revised);
    await onSaveQuoteToDatabase(revised);
    setCurrentStep('SHIPMENT');
  };

  if (!isOpen) return null;

  const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* ================================================================= */}
        {/* WORKSPACE HEADER                                                  */}
        {/* ================================================================= */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Smart Quotation Workspace</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                  Phase 20
                </span>
                {quote.priceLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Số Báo Giá: <strong className="text-white font-mono">{quote.quoteNumber}</strong></span>
                <span>&bull;</span>
                <span>Khách: <strong className="text-white">{quote.customer.companyName || quote.customer.customerName || 'Chưa chọn'}</strong></span>
                <span>&bull;</span>
                <span>Tuyến: <strong className="text-white">{quote.shipment.origin || 'POL'} &rarr; {quote.shipment.destination || 'POD'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700">
              {autosaveStatus === 'SAVING' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-blue-300">Đang lưu Firestore...</span>
                </>
              )}
              {autosaveStatus === 'SAVED' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Đã lưu an toàn {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </>
              )}
              {autosaveStatus === 'UNSAVED' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-300">Chưa lưu thay đổi</span>
                </>
              )}
              {autosaveStatus === 'SAVE_FAILED' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300">Lỗi lưu Firestore</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Đóng Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* STEP PROGRESS BAR                                                 */}
        {/* ================================================================= */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
          {STEPS.map((s, idx) => {
            const isCurrent = s.id === currentStep;
            const isPassed = idx < currentStepIdx;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isCurrent 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isPassed 
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-white text-indigo-700' : isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>
                  {isPassed ? <Check className="w-2.5 h-2.5" /> : s.stepNumber}
                </span>
                <span>{s.labelVi}</span>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* WORKSPACE BODY                                                    */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ------------------------------------------------------------- */}
          {/* STEP 1: SHIPMENT & CUSTOMER REQUIREMENTS                      */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'SHIPMENT' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 1: Thông Tin Lô Hàng & Yêu Cầu Vận Tải</h3>
                  <p className="text-xs text-slate-500">Nhập đầy đủ thông tin thực tế để hệ thống tự động tìm kiếm biểu cước phù hợp nhất.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleRunRateMatching();
                    setCurrentStep('MATCHING');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  Tiếp Tục: Khớp Cước Thông Minh <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Selector with Debounced Search */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Chọn Khách Hàng (Tìm kiếm từ Firestore)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Gõ tên khách hàng, công ty hoặc mã số thuế để tìm..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {isSearchingCustomers && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Đang tìm...</span>
                  )}
                </div>

                {customerOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                    {customerOptions.map(c => (
                      <div
                        key={c.id || c.customerName}
                        onClick={() => {
                          setQuote(prev => ({ ...prev, customer: c }));
                          setCustomerSearchQuery(c.companyName || c.customerName);
                          setCustomerOptions([]);
                        }}
                        className="p-2.5 text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-slate-800">{c.companyName || c.customerName}</strong>
                          <span className="text-slate-500 ml-2">MST: {c.taxId || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-bold">Chọn</span>
                      </div>
                    ))}
                  </div>
                )}

                {customerSearchQuery && customerOptions.length === 0 && !isSearchingCustomers && (
                  <p className="text-xs text-slate-500 italic">Không tìm thấy khách hàng phù hợp trong cơ sở dữ liệu Firebase.</p>
                )}

                {quote.customer.companyName && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Đã chọn:</span> <strong className="text-indigo-900">{quote.customer.companyName}</strong>
                      {quote.customer.address && <span className="text-slate-600 ml-2">({quote.customer.address})</span>}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Đã gán</span>
                  </div>
                )}
              </div>

              {/* Transport Mode & Route Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phương thức vận chuyển (Mode)</label>
                  <select
                    value={quote.shipment.mode}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, mode: e.target.value as TransportMode }
                    }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SEA_FCL">Đường biển nguyên container (SEA FCL)</option>
                    <option value="SEA_LCL">Đường biển hàng lẻ (SEA LCL)</option>
                    <option value="AIR_FREIGHT">Đường hàng không (AIR FREIGHT)</option>
                    <option value="INLAND_TRUCKING">Vận tải bộ nội địa (TRUCKING)</option>
                    <option value="CUSTOMS_CLEARANCE">Thủ tục hải quan (CUSTOMS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cảng đi / Nơi đi (POL / Origin)</label>
                  <input
                    type="text"
                    value={quote.shipment.origin || quote.shipment.pol || ''}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, origin: e.target.value, pol: e.target.value }
                    }))}
                    placeholder="VD: Cat Lai, Hai Phong, VNSGN..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cảng đến / Nơi đến (POD / Destination)</label>
                  <input
                    type="text"
                    value={quote.shipment.destination || quote.shipment.pod || ''}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, destination: e.target.value, pod: e.target.value }
                    }))}
                    placeholder="VD: Singapore, Los Angeles, USLAX..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Điều kiện Incoterm</label>
                  <select
                    value={quote.terms.incoterm}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      terms: { ...prev.terms, incoterm: e.target.value as IncotermCode }
                    }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'DAP', 'DDP', 'CIP', 'CPT'].map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Equipment & Cargo Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại Container / Thiết bị</label>
                  <select
                    value={quote.shipment.containerType || '40HC'}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, containerType: e.target.value as ContainerType }
                    }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {['20GP', '40GP', '40HC', '45HC', '20RF', '40RF', '20OT', '40OT', '20FR', '40FR', 'LCL'].map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng cont / Kiện (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={quote.shipment.quantity || 1}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, quantity: Number(e.target.value) || 1 }
                    }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trọng lượng tổng (Gross Weight - KG)</label>
                  <input
                    type="number"
                    value={quote.shipment.grossWeightKg || ''}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, grossWeightKg: Number(e.target.value) || 0 }
                    }))}
                    placeholder="VD: 15000"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thể tích (Volume - CBM)</label>
                  <input
                    type="number"
                    value={quote.shipment.volumeCbm || ''}
                    onChange={(e) => setQuote(prev => ({
                      ...prev,
                      shipment: { ...prev.shipment, volumeCbm: Number(e.target.value) || 0 }
                    }))}
                    placeholder="VD: 35"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2: SMART RATE MATCHING & EXPLANATION                     */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'MATCHING' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Bước 2: Kết Quả Khớp Cước Thông Minh (100% Real Firebase)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ưu tiên: Hợp đồng khách hàng &rarr; Hợp đồng khung &rarr; Hãng vận tải &rarr; Chuẩn &rarr; Spot.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunRateMatching}
                    disabled={isMatchingRates}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isMatchingRates ? 'animate-spin' : ''}`} />
                    Quét Lại Biểu Cước
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('COSTING')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                  >
                    Tiếp Tục: Phân Tích Giá Vốn <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isMatchingRates && (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Đang truy vấn biểu cước thực tế từ Firebase Firestore...</p>
                </div>
              )}

              {/* No Matching Rates Found (Real Empty State) */}
              {!isMatchingRates && matchingResult && !matchingResult.isFound && (
                <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Không tìm thấy mức giá phù hợp</h4>
                    <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                      Không có biểu cước nào trong cơ sở dữ liệu thỏa mãn tuyến {quote.shipment.origin || 'POL'} &rarr; {quote.shipment.destination || 'POD'} 
                      cho phương thức {quote.shipment.mode}.
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500">Hệ thống tuân thủ 100% dữ liệu thực và không tự tạo mức giá giả.</p>
                </div>
              )}

              {/* Best Matches Display */}
              {!isMatchingRates && matchingResult && matchingResult.bestMatches.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Biểu Cước Phù Hợp Nhất (Best Match)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matchingResult.bestMatches.map(c => {
                      const isSelected = selectedCandidateIds.has(c.id);
                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-indigo-50/40 border-indigo-300 shadow-xs' 
                              : 'bg-white border-slate-200 opacity-75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.sourceType === 'CUSTOMER_CONTRACT' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : c.sourceType === 'CARRIER' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {c.sourceType === 'CUSTOMER_CONTRACT' ? 'HỢP ĐỒNG KHÁCH HÀNG' : c.sourceType}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{c.chargeName}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Nguồn: <strong>{c.sourceReference}</strong> &bull; Hãng: <strong>{c.carrier || 'N/A'}</strong>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleCandidate(c)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {isSelected ? 'Đã Chọn' : 'Chọn'}
                            </button>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">Giá Vốn (Buy):</span>
                              <strong className="block text-slate-800 text-sm font-mono">
                                {c.currency === 'USD' ? formatUSD(c.buyRate) : formatVND(c.buyRate)} / {c.unit}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Giá Bán Tham Chiếu:</span>
                              <strong className="block text-indigo-700 text-sm font-mono">
                                {c.currency === 'USD' ? formatUSD(c.sellRate) : formatVND(c.sellRate)} / {c.unit}
                              </strong>
                            </div>
                          </div>

                          {/* Plain Factual Rate Explanation */}
                          <div className="mt-3 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{c.explanation}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Alternative Rates Display */}
              {!isMatchingRates && matchingResult && matchingResult.alternativeMatches.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Biểu Cước Thay Thế (Alternative Rates)
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {matchingResult.alternativeMatches.map(alt => (
                      <div key={alt.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {alt.sourceType}
                            </span>
                            <strong className="text-slate-800">{alt.chargeName}</strong>
                            <span className="text-slate-500">({alt.sourceReference})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{alt.explanation}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Giá vốn</span>
                            <strong className="font-mono">{alt.currency === 'USD' ? formatUSD(alt.buyRate) : formatVND(alt.buyRate)}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCandidate(alt)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[11px] font-bold"
                          >
                            Áp Dụng Thay Thế
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Rate Alerts */}
              {!isMatchingRates && matchingResult && matchingResult.missingRates.length > 0 && (
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Phát Hiện Thiếu Biểu Cước (Missing Rate Detection)
                  </h4>
                  <p className="text-xs text-rose-700">
                    Các hạng mục phí sau cần thiết cho chuyến hàng nhưng chưa tìm thấy giá trong hệ thống:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {matchingResult.missingRates.filter(m => m.status === 'MISSING').map(m => (
                      <div key={m.code} className="p-2.5 bg-white border border-rose-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-rose-900">{m.name}</strong>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                            Chưa Có Giá
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{m.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3: COSTING ENGINE (BUY CHARGES)                          */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'COSTING' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 3: Chi Tiết Giá Vốn (Costing Breakdown)</h3>
                  <p className="text-xs text-slate-500">Mỗi khoản chi phí mua vào đều gắn liền với nguồn gốc và cơ sở tính thực tế.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('SELLING')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Xác Định Giá Bán <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {costingItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs text-slate-600">Chưa có hạng mục phí nào được chọn từ bước Khớp Cước.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('MATCHING')}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                  >
                    Quay lại Bước 2: Khớp Cước
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Hạng Mục / Diễn Giải</th>
                        <th className="p-3">Nguồn Gốc (Source)</th>
                        <th className="p-3 text-center">ĐVT</th>
                        <th className="p-3 text-right">Số Lượng</th>
                        <th className="p-3 text-right">Đơn Giá Vốn</th>
                        <th className="p-3 text-right">Thành Tiền Vốn (USD)</th>
                        <th className="p-3 text-right">Thành Tiền Vốn (VND)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {costingItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <strong className="text-slate-800 block">{item.description}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{item.code} &bull; {item.location}</span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600">
                            {item.sourceReference || 'Biểu cước chuẩn'}
                          </td>
                          <td className="p-3 text-center font-mono">{item.unit}</td>
                          <td className="p-3 text-right font-mono">{item.quantity}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700">
                            {item.currency === 'USD' ? formatUSD(item.buyRate) : formatVND(item.buyRate)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatUSD(item.buyAmountUsd)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {formatVND(item.buyAmountVnd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                      <tr>
                        <td colSpan={5} className="p-3 text-right">Tổng Chi Phí Mua Vào (Total Buy Cost):</td>
                        <td className="p-3 text-right text-indigo-900 font-mono font-extrabold">
                          {formatUSD(costingSummary.totalBuyUsd)}
                        </td>
                        <td className="p-3 text-right text-slate-700 font-mono">
                          {formatVND(costingSummary.totalBuyVnd)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 4: SELLING PRICE & PRICING RULES                         */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'SELLING' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 4: Xác Định Phương Pháp & Giá Bán (Selling Price)</h3>
                  <p className="text-xs text-slate-500">Áp dụng công thức tính giá bán theo chính sách hoặc điều chỉnh thủ công có kiểm soát.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('PROFIT')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Xem Lợi Nhuận <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Pricing Method Selector Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <label className="text-xs font-bold text-slate-700 block">Phương pháp định giá bán</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => handleApplySellingMethod('TARGET_MARGIN', globalTargetMargin, globalMarkupPercent)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      sellingMethod === 'TARGET_MARGIN' ? 'bg-indigo-50 border-indigo-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <strong className="block text-indigo-900 font-bold">Biên Lãi Mục Tiêu (%)</strong>
                    <span className="text-[11px] text-slate-500">Target Margin = {globalTargetMargin}%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplySellingMethod('COST_PLUS', globalTargetMargin, globalMarkupPercent)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      sellingMethod === 'COST_PLUS' ? 'bg-indigo-50 border-indigo-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <strong className="block text-indigo-900 font-bold">Giá Vốn + % Markup</strong>
                    <span className="text-[11px] text-slate-500">Markup = {globalMarkupPercent}%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplySellingMethod('POLICY_RULE', globalTargetMargin, globalMarkupPercent, activePolicy)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      sellingMethod === 'POLICY_RULE' ? 'bg-indigo-50 border-indigo-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <strong className="block text-indigo-900 font-bold">Chính Sách Giá (Policy)</strong>
                    <span className="text-[11px] text-slate-500">{activePolicy ? activePolicy.policyName : 'Không có chính sách'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSellingMethod('MANUAL')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      sellingMethod === 'MANUAL' ? 'bg-indigo-50 border-indigo-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <strong className="block text-indigo-900 font-bold">Điều Chỉnh Thủ Công</strong>
                    <span className="text-[11px] text-slate-500">Theo quyền Sales/Pricing</span>
                  </button>
                </div>

                {/* Adjuster Slider / Inputs */}
                {sellingMethod === 'TARGET_MARGIN' && (
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs text-slate-600 font-medium">Mức biên lãi mong muốn:</span>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      value={globalTargetMargin}
                      onChange={(e) => handleApplySellingMethod('TARGET_MARGIN', Number(e.target.value), globalMarkupPercent)}
                      className="w-48 accent-indigo-600"
                    />
                    <strong className="text-xs font-mono text-indigo-700 bg-white px-2 py-1 border rounded">{globalTargetMargin}%</strong>
                  </div>
                )}
              </div>

              {/* Selling Price Breakdown Table with Manual Override */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Hạng Mục</th>
                      <th className="p-3 text-right">Đơn Giá Vốn</th>
                      <th className="p-3 text-right">Đơn Giá Bán</th>
                      <th className="p-3 text-right">Doanh Thu (USD)</th>
                      <th className="p-3 text-right">Lợi Nhuận (USD)</th>
                      <th className="p-3 text-right">Biên Lãi (%)</th>
                      <th className="p-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costingItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="p-3">
                          <strong className="text-slate-800 block">{item.description}</strong>
                          {item.isPriceOverridden && (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                              <Edit3 className="w-3 h-3" /> Đã ghi đè thủ công
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatUSD(item.buyRate)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-700">
                          {formatUSD(item.sellRate)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatUSD(item.sellAmountUsd)}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${item.profitUsd >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatUSD(item.profitUsd)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            item.marginPercent >= 15 ? 'bg-emerald-100 text-emerald-800' : item.marginPercent >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {formatPercent(item.marginPercent)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenOverrideModal(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded text-[11px] font-medium"
                          >
                            Chỉnh Giá
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 5: PROFIT & MARGIN ANALYSIS                              */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'PROFIT' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 5: Phân Tích Lợi Nhuận & Biên Lãi (Gross Margin)</h3>
                  <p className="text-xs text-slate-500">Đánh giá hiệu quả kinh doanh của chuyến hàng trên cơ sở chi phí và doanh thu thực.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('VALIDATION')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Kiểm Tra Cảnh Báo <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Financial KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Tổng Chi Phí Mua (Buy Cost)</span>
                  <strong className="text-lg font-bold text-slate-800 font-mono mt-1 block">
                    {formatUSD(costingSummary.totalBuyUsd)}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                    {formatVND(costingSummary.totalBuyVnd)}
                  </span>
                </div>

                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                  <span className="text-xs text-indigo-700 block">Tổng Doanh Thu Bán (Selling)</span>
                  <strong className="text-lg font-bold text-indigo-950 font-mono mt-1 block">
                    {formatUSD(costingSummary.totalSellUsd)}
                  </strong>
                  <span className="text-[11px] text-indigo-700 font-mono mt-0.5 block">
                    {formatVND(costingSummary.totalSellVnd)}
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${
                  costingSummary.grossProfitUsd >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                }`}>
                  <span className="text-xs text-slate-500 block">Lợi Nhuận Gộp (Gross Profit)</span>
                  <strong className={`text-lg font-bold font-mono mt-1 block ${
                    costingSummary.grossProfitUsd >= 0 ? 'text-emerald-800' : 'text-rose-700'
                  }`}>
                    {formatUSD(costingSummary.grossProfitUsd)}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                    {formatVND(costingSummary.grossProfitVnd)}
                  </span>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <span className="text-xs text-blue-700 block">Biên Lợi Nhuận Gộp (% Margin)</span>
                  <strong className="text-lg font-bold text-blue-950 font-mono mt-1 block">
                    {formatPercent(costingSummary.grossMarginPercent)}
                  </strong>
                  <span className="text-[11px] text-blue-700 mt-0.5 block">
                    {costingSummary.grossMarginPercent >= 15 ? 'Đạt chuẩn biên lãi' : 'Cần xem xét giá bán'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 6: VALIDATION & PRICING WARNINGS                         */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'VALIDATION' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 6: Kiểm Tra Hợp Lệ & Cảnh Báo Định Giá</h3>
                  <p className="text-xs text-slate-500">Hệ thống phân tích rủi ro tài chính, thiếu biểu cước và hiệu lực báo giá dựa trên dữ liệu thật.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('REVIEW')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Xem Lại Báo Giá <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {costingSummary.warnings.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">Báo giá hoàn toàn hợp lệ</h4>
                  <p className="text-xs text-emerald-700">Không phát hiện rủi ro về giá vốn, biên lãi âm hay thiếu thông tin quan trọng.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {costingSummary.warnings.map(w => (
                    <div 
                      key={w.id} 
                      className={`p-4 rounded-xl border flex items-start gap-3 ${
                        w.severity === 'CRITICAL' ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}
                    >
                      {w.severity === 'CRITICAL' ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block text-xs font-bold">{w.titleVi}</strong>
                        <p className="text-xs mt-0.5 opacity-90">{w.detailVi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 7: REVIEW & PREVIEW                                      */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'REVIEW' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 7: Xem Trước Tổng Thể Báo Giá</h3>
                  <p className="text-xs text-slate-500">Kiểm tra thông tin trước khi lưu chính thức vào cơ sở dữ liệu.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('SAVE')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Lưu & Tạo Snapshot <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-slate-500">Khách hàng:</span>
                    <strong className="block text-slate-800 mt-0.5">{quote.customer.companyName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tuyến đường:</span>
                    <strong className="block text-slate-800 mt-0.5">{quote.shipment.origin || 'POL'} &rarr; {quote.shipment.destination || 'POD'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Incoterm:</span>
                    <strong className="block text-slate-800 mt-0.5">{quote.terms.incoterm}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Hiệu lực:</span>
                    <strong className="block text-slate-800 mt-0.5">{quote.terms.validityDate || '14 ngày'}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-600">Tổng cộng thanh toán (Grand Total):</span>
                  <strong className="text-base text-indigo-900 font-mono font-extrabold">
                    {formatUSD(costingSummary.grandTotalUsd)} ({formatVND(costingSummary.grandTotalVnd)})
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 8: SAVE & CREATE SNAPSHOT                                */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'SAVE' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bước 8: Lưu Báo Giá & Tạo Snapshot Cố Định</h3>
                  <p className="text-xs text-slate-500">Đảm bảo lịch sử định giá bất biến ngay cả khi biểu cước gốc thay đổi trong tương lai.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('APPROVAL')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  Tiếp Tục: Phê Duyệt & Khóa Giá <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Save className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">Lưu Dữ Liệu Báo Giá Lên Firestore</h4>
                  <p className="text-xs text-indigo-700 mt-1 max-w-lg mx-auto">
                    Hệ thống sẽ lưu trữ toàn bộ các dòng phí, cơ sở tính, liên kết hợp đồng và đóng băng một bản sao Snapshot định giá độc lập.
                  </p>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleSaveQuotation}
                    disabled={autosaveStatus === 'SAVING'}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                  >
                    {autosaveStatus === 'SAVING' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang Lưu Vào Firebase...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Xác Nhận Lưu Báo Giá & Tạo Snapshot
                      </>
                    )}
                  </button>
                </div>

                {quote.pricingSnapshot && (
                  <div className="mt-4 p-3 bg-white border border-indigo-200 rounded-lg text-left text-xs space-y-1">
                    <span className="font-bold text-slate-800 block">Snapshot Hiện Có:</span>
                    <span className="text-slate-600 block">Mã Snapshot: <strong className="font-mono">{quote.pricingSnapshot.snapshotId}</strong></span>
                    <span className="text-slate-600 block">Tạo lúc: {quote.pricingSnapshot.createdAt} &bull; Số lượng mục giá: {quote.pricingSnapshot.items?.length || 0}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 9: APPROVAL & PRICE LOCK                                 */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 'APPROVAL' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-800">Bước 9: Quy Trình Phê Duyệt & Khóa Giá (Price Lock)</h3>
                <p className="text-xs text-slate-500">Khóa mức giá sau khi duyệt để ngăn chặn chỉnh sửa trực tiếp ngoài luồng.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Trạng Thái Phê Duyệt & Khóa Giá
                  </h4>
                  <p className="text-xs text-slate-600">
                    Trạng thái hiện tại: <strong className="uppercase font-bold text-indigo-700">{quote.status}</strong>
                    {quote.priceLocked ? ' (ĐÃ KHÓA GIÁ)' : ' (ĐANG MỞ)'}
                  </p>
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTogglePriceLock}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        quote.priceLocked ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {quote.priceLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {quote.priceLocked ? 'Mở Khóa Định Giá' : 'Phê Duyệt & Khóa Cố Định Giá'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-purple-600" /> Tạo Bản Sửa Đổi (Create Revision)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Nếu báo giá đã duyệt cần thay đổi theo thỏa thuận mới, hãy tạo một phiên bản sửa đổi (Revision) để giữ nguyên lịch sử báo giá cũ.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCreateRevision}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Tạo Bản Sửa Đổi Mới ({quote.quoteNumber}-R{(quote.version || 1)})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* WORKSPACE FOOTER ACTIONS                                          */}
        {/* ================================================================= */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (currentStepIdx > 0) {
                setCurrentStep(STEPS[currentStepIdx - 1].id);
              }
            }}
            disabled={currentStepIdx === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Bước Trước
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveQuotation}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Lưu Thay Đổi
            </button>

            {currentStepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS[currentStepIdx + 1].id)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                Tiếp Theo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Hoàn Tất
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Manual Price Override Modal */}
      {overrideItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Điều Chỉnh Giá Bán Thủ Công (Price Override)
            </h4>
            <div className="text-xs text-slate-600 space-y-1">
              <p>Hạng mục: <strong className="text-slate-900">{overrideItem.description}</strong></p>
              <p>Đơn giá vốn: <strong className="font-mono">{formatUSD(overrideItem.buyRate)}</strong></p>
              <p>Đơn giá bán hiện tại: <strong className="font-mono text-indigo-700">{formatUSD(overrideItem.sellRate)}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá bán mới ({overrideItem.currency})</label>
              <input
                type="number"
                value={overrideNewPrice}
                onChange={(e) => setOverrideNewPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lý do điều chỉnh (Bắt buộc kiểm toán)</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="VD: Giảm giá cạnh tranh theo phê duyệt của Trưởng phòng..."
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyOverride}
                disabled={!overrideReason.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                Lưu Điều Chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
