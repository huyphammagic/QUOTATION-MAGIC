import React, { useState, useEffect, useMemo } from 'react';
import { 
  RFQParameters, 
  DecisionScenario, 
  DecisionCandidateRate, 
  DecisionRiskItem,
  DataCompletenessReport,
  CustomerCommercialContext, 
  LaneHistoricalContext, 
  SuggestedNextAction,
  DecisionSnapshot,
  PersistentDecisionScenario,
  ConcurrencyCheckResult,
  DecisionSourceEntity
} from '../../types/decision';
import { CustomerRecord, QuoteData, TransportMode, Currency } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { BusinessOpportunity } from '../../types/opportunity';
import { RateMasterItem } from '../../types/masterRate';
import { 
  buildCustomerCommercialContext, 
  buildLaneHistoricalContext, 
  findCandidateRates, 
  generateSuggestedNextActions, 
  saveDecisionSnapshot, 
  saveDecisionScenario,
  loadDecisionScenarios,
  deleteDecisionScenario,
  checkScenarioSourceConcurrency,
  createDraftQuoteFromScenario 
} from '../../services/decision/decisionService';
import { evaluateDecisionRisks } from '../../services/decision/decisionRiskEngine';
import { evaluateDataCompleteness } from '../../services/decision/decisionCompletenessEngine';
import { 
  generateCandidateScenarios, 
  calculateScenarioMetrics, 
  annotateFactualTags 
} from '../../services/decision/decisionScenarioEngine';
import { createBusinessAction } from '../../services/deadline/deadlineService';
import { decisionTranslations, DecisionLanguage } from '../../i18n/decision';
import { 
  X, 
  SlidersHorizontal, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Ship, 
  Plane, 
  Truck, 
  FileText, 
  Layers, 
  RefreshCw, 
  AlertTriangle, 
  Award, 
  Sparkles, 
  Check, 
  Info, 
  ExternalLink,
  ChevronRight,
  PlusCircle,
  Save,
  Clock,
  Trash2
} from 'lucide-react';

interface DecisionWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  customers: CustomerRecord[];
  allQuotes: QuoteData[];
  shipments?: ShipmentRecord[];
  contracts?: ContractRecord[];
  opportunities?: BusinessOpportunity[];
  masterRates?: RateMasterItem[];
  initialRfq?: Partial<RFQParameters>;
  sourceEntity?: DecisionSourceEntity;
  sourceEntityId?: string;
  sourceVersion?: number;
  userRole?: string; // 'admin' | 'manager' | 'pricing' | 'sales' | 'operator'
  user?: { email: string; name: string };
  companyProfile?: any;
  onSelectQuoteForDraft?: (quoteDraft: Partial<QuoteData>) => void;
  onOpenOpportunity?: (oppId: string) => void;
  onOpenFollowUp?: () => void;
  onOpenRateHub?: () => void;
  onOpenActionCenter?: () => void;
}

export const DecisionWorkspaceModal: React.FC<DecisionWorkspaceModalProps> = ({
  isOpen,
  onClose,
  companyId,
  customers,
  allQuotes,
  shipments = [],
  contracts = [],
  opportunities = [],
  masterRates = [],
  initialRfq,
  sourceEntity = 'RFQ',
  sourceEntityId,
  sourceVersion = 1,
  userRole = 'manager',
  user = { email: 'sales@logistics.vn', name: 'Logistics Specialist' },
  companyProfile,
  onSelectQuoteForDraft,
  onOpenOpportunity,
  onOpenFollowUp,
  onOpenRateHub,
  onOpenActionCenter,
}) => {
  // Navigation Tabs & Language
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCENARIO' | 'RISKS' | 'ACTIONS' | 'SAVED'>('OVERVIEW');
  const [lang, setLang] = useState<DecisionLanguage>('vi');
  const t = decisionTranslations[lang];

  // Phase 48: Business Action Creation state
  const [createdActionsMap, setCreatedActionsMap] = useState<Record<string, boolean>>({});
  const [actionCreatingId, setActionCreatingId] = useState<string | null>(null);

  // Working RFQ State
  const [rfq, setRfq] = useState<RFQParameters>(() => {
    const defaultCust = customers[0];
    return {
      customerId: initialRfq?.customerId || defaultCust?.id || '',
      customerName: initialRfq?.customerName || defaultCust?.customerName || defaultCust?.companyName || 'Khách hàng',
      customerCode: initialRfq?.customerCode || defaultCust?.code,
      origin: initialRfq?.origin || 'VNSGN',
      destination: initialRfq?.destination || 'USLAX',
      originPort: initialRfq?.originPort || 'Cát Lái, TP.HCM',
      destinationPort: initialRfq?.destinationPort || 'Los Angeles, USA',
      mode: initialRfq?.mode || 'SEA_FCL',
      serviceType: initialRfq?.serviceType || 'SEA_FCL',
      incoterm: initialRfq?.incoterm || 'FOB',
      commodity: initialRfq?.commodity || 'May mặc xuất khẩu (Garments)',
      containerType: initialRfq?.containerType || "40'GP",
      quantity: initialRfq?.quantity || 2,
      grossWeightKg: initialRfq?.grossWeightKg || 18000,
      volumeCbm: initialRfq?.volumeCbm || 55,
      expectedShipmentDate: initialRfq?.expectedShipmentDate || new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      requestedValidity: initialRfq?.requestedValidity || new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
      specialRequirements: initialRfq?.specialRequirements || '',
      targetRate: initialRfq?.targetRate || 1950,
      targetCurrency: initialRfq?.targetCurrency || 'USD'
    };
  });

  // Selected Customer Record
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === rfq.customerId);
  }, [customers, rfq.customerId]);

  // Context: Customer Commercial Summary
  const customerContext: CustomerCommercialContext = useMemo(() => {
    return buildCustomerCommercialContext(
      rfq.customerId,
      selectedCustomer,
      allQuotes,
      shipments,
      opportunities,
      contracts,
      []
    );
  }, [rfq.customerId, selectedCustomer, allQuotes, shipments, opportunities, contracts]);

  // Context: Lane Historical Analytics
  const laneContext: LaneHistoricalContext = useMemo(() => {
    return buildLaneHistoricalContext(
      rfq.origin,
      rfq.destination,
      rfq.mode,
      allQuotes,
      shipments
    );
  }, [rfq.origin, rfq.destination, rfq.mode, allQuotes, shipments]);

  // Candidate Rates matched from DB
  const candidateRates: DecisionCandidateRate[] = useMemo(() => {
    return findCandidateRates(rfq, masterRates, contracts);
  }, [rfq, masterRates, contracts]);

  // Scenarios State
  const [scenarios, setScenarios] = useState<DecisionScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // Initialize or re-generate candidate scenarios when RFQ or candidate rates update
  useEffect(() => {
    const generated = generateCandidateScenarios(rfq, candidateRates);
    setScenarios(generated);
    if (generated.length > 0) {
      setSelectedScenarioId(generated[0].id);
    }
  }, [rfq.origin, rfq.destination, rfq.mode, rfq.containerType, candidateRates.length]);

  const selectedScenario = useMemo(() => {
    return scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];
  }, [scenarios, selectedScenarioId]);

  // Risks Evaluation
  const risks: DecisionRiskItem[] = useMemo(() => {
    return evaluateDecisionRisks({
      rfq,
      scenarios,
      selectedScenario,
      candidateRates,
      matchingContracts: contracts.filter(c => c.partyId === rfq.customerId)
    });
  }, [rfq, scenarios, selectedScenario, candidateRates, contracts]);

  // Data Completeness Checklist
  const completenessReport: DataCompletenessReport = useMemo(() => {
    return evaluateDataCompleteness(rfq);
  }, [rfq]);

  // Suggested Actions
  const suggestedActions: SuggestedNextAction[] = useMemo(() => {
    if (!selectedScenario) return [];
    return generateSuggestedNextActions(rfq, selectedScenario, risks, completenessReport);
  }, [rfq, selectedScenario, risks, completenessReport]);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Scenario Parameter Tweaker
  const handleUpdateScenario = (
    id: string, 
    field: keyof DecisionScenario, 
    value: any
  ) => {
    setScenarios(prev => {
      const updated = prev.map(sc => {
        if (sc.id !== id) return sc;
        const modified = { ...sc, [field]: value };
        const metrics = calculateScenarioMetrics(modified);
        return {
          ...modified,
          ...metrics
        };
      });
      annotateFactualTags(updated);
      return updated;
    });
  };

  // Save Decision Snapshot
  const handleSaveDecisionSnapshot = async () => {
    if (!selectedScenario) return;
    setIsSavingSnapshot(true);
    try {
      await saveDecisionSnapshot({
        companyId,
        customerId: rfq.customerId,
        customerName: rfq.customerName,
        sourceEntity: 'RFQ',
        sourceEntityId: rfq.id || `rfq_${Date.now()}`,
        baseVersion: 1,
        rfq,
        selectedScenarioId: selectedScenario.id,
        selectedScenario,
        scenarios,
        risks,
        completenessScore: completenessReport.completionScore,
        missingData: completenessReport.missingRequiredKeys,
        recommendations: suggestedActions,
        decisionStatus: 'SCENARIO_ACCEPTED',
        createdBy: user.email,
        createdByName: user.name
      }, user);
      showToast('Đã lưu bản chụp quyết định kinh doanh (Decision Snapshot) thành công!');
    } catch (err) {
      console.error(err);
      showToast('Không thể lưu Decision Snapshot. Vui lòng thử lại.');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Create Draft Quote from Scenario
  const handleCreateDraftQuote = () => {
    if (!selectedScenario) return;
    const draftQuote = createDraftQuoteFromScenario(rfq, selectedScenario, companyProfile);
    showToast(`Đã tạo bản nháp báo giá từ ${selectedScenario.name}`);
    if (onSelectQuoteForDraft) {
      onSelectQuoteForDraft(draftQuote);
    }
  };

  // Concurrency Conflict State
  const [concurrencyConflict, setConcurrencyConflict] = useState<ConcurrencyCheckResult | null>(null);
  const [dismissConcurrencyWarning, setDismissConcurrencyWarning] = useState<boolean>(false);

  // Concurrency Verification on Mount or Source Change
  useEffect(() => {
    if (sourceEntity && sourceEntityId && sourceVersion !== undefined) {
      const conflict = checkScenarioSourceConcurrency(
        sourceEntity,
        sourceEntityId,
        sourceVersion,
        allQuotes,
        masterRates
      );
      if (conflict.hasConflict) {
        setConcurrencyConflict(conflict);
      }
    }
  }, [sourceEntity, sourceEntityId, sourceVersion, allQuotes, masterRates]);

  // Saved Scenarios State
  const [savedScenarios, setSavedScenarios] = useState<PersistentDecisionScenario[]>([]);
  const [isLoadingSavedScenarios, setIsLoadingSavedScenarios] = useState<boolean>(false);
  const [isSavingScenario, setIsSavingScenario] = useState<boolean>(false);

  const fetchSavedScenarios = async () => {
    setIsLoadingSavedScenarios(true);
    try {
      const list = await loadDecisionScenarios(companyId, { customerId: rfq.customerId });
      setSavedScenarios(list);
    } catch (e) {
      console.warn('Failed to load saved scenarios', e);
    } finally {
      setIsLoadingSavedScenarios(false);
    }
  };

  useEffect(() => {
    fetchSavedScenarios();
  }, [companyId, rfq.customerId]);

  const handleSaveIndividualScenario = async () => {
    if (!selectedScenario) return;
    setIsSavingScenario(true);
    try {
      const saved = await saveDecisionScenario(
        companyId,
        selectedScenario.name,
        selectedScenario,
        rfq,
        sourceEntity || 'RFQ',
        sourceEntityId || rfq.id || `rfq_${Date.now()}`,
        sourceVersion || 1,
        user,
        `Kịch bản lưu từ Decision Workspace: Carrier ${selectedScenario.carrier}, Bán ${selectedScenario.sellingPrice} ${selectedScenario.currency}`
      );
      showToast(lang === 'vi' ? `Đã lưu kịch bản "${selectedScenario.name}" lên Cloud!` : `Saved scenario "${selectedScenario.name}" to Cloud!`);
      setSavedScenarios(prev => [saved, ...prev]);
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi khi lưu kịch bản. Vui lòng thử lại.' : 'Failed to save scenario.');
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleDeleteSavedScenario = async (scenarioId: string) => {
    const ok = await deleteDecisionScenario(scenarioId);
    if (ok) {
      setSavedScenarios(prev => prev.filter(s => s.id !== scenarioId));
      showToast(lang === 'vi' ? 'Đã xóa kịch bản khỏi Cloud' : 'Deleted scenario from Cloud');
    }
  };

  const handleLoadSavedScenarioIntoWorkspace = (saved: PersistentDecisionScenario) => {
    if (saved.scenarioInputs) {
      setRfq(saved.scenarioInputs);
    }
    if (saved.scenario) {
      setScenarios(prev => {
        const exists = prev.some(s => s.id === saved.scenario.id);
        if (exists) {
          return prev.map(s => s.id === saved.scenario.id ? saved.scenario : s);
        }
        return [saved.scenario, ...prev];
      });
      setSelectedScenarioId(saved.scenario.id);
    }
    setActiveTab('SCENARIO');
    showToast(lang === 'vi' ? `Đã nạp kịch bản "${saved.scenarioName}" vào khu vực mô phỏng!` : `Loaded "${saved.scenarioName}" into simulation!`);
  };

  // Phase 48: Bridge from Decision to Smart Action Center
  const handleCreateBusinessActionFromSuggested = async (actionItem: SuggestedNextAction) => {
    setActionCreatingId(actionItem.id);
    try {
      const due = new Date();
      due.setDate(due.getDate() + (actionItem.priority === 'HIGH' ? 1 : 2));
      due.setHours(17, 0, 0, 0);

      await createBusinessAction({
        companyId,
        actionType: actionItem.actionType === 'CREATE_FOLLOW_UP' ? 'CUSTOMER_FOLLOW_UP' : 'DECISION_ACTION',
        sourceEntityType: 'DECISION',
        sourceEntityId: sourceEntityId || `DEC_${rfq.origin}_${rfq.destination}`,
        title: actionItem.titleVi,
        description: actionItem.whyVi,
        actionRequired: actionItem.whyVi,
        priority: actionItem.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        urgency: actionItem.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
        dueAt: due.toISOString(),
        assignedTo: user.email,
        assignedToName: user.name,
        relatedCustomerId: rfq.customerId,
        relatedCustomerName: rfq.customerName,
        relatedDecisionId: sourceEntityId,
        relatedScenarioId: selectedScenario?.id,
        source: 'DECISION_WORKSPACE',
        metadata: {
          lane: `${rfq.origin} - ${rfq.destination}`,
          mode: rfq.mode,
          carrier: selectedScenario?.carrier,
          sellingPrice: selectedScenario?.totalSellingPrice,
        }
      }, { uid: user.email, displayName: user.name, email: user.email });

      setCreatedActionsMap(prev => ({ ...prev, [actionItem.id]: true }));
      showToast(lang === 'vi' ? 'Đã khởi tạo hành động nghiệp vụ vào Action Center thành công!' : 'Created business action in Action Center!');
    } catch (err) {
      console.error('Error creating business action from decision:', err);
      showToast(lang === 'vi' ? 'Không thể tạo hành động nghiệp vụ!' : 'Failed to create business action');
    } finally {
      setActionCreatingId(null);
    }
  };

  const handleExecuteScenarioToActions = async () => {
    if (!selectedScenario) return;
    setActionCreatingId('SCENARIO_PLAN');
    try {
      const due = new Date();
      due.setDate(due.getDate() + 2);
      due.setHours(17, 0, 0, 0);

      await createBusinessAction({
        companyId,
        actionType: 'SCENARIO_EXECUTION',
        sourceEntityType: 'SCENARIO',
        sourceEntityId: selectedScenario.id,
        title: `Thực thi kịch bản: Hãng ${selectedScenario.carrier} (${rfq.origin} → ${rfq.destination})`,
        description: `Kịch bản được phê duyệt: Hãng ${selectedScenario.carrier}, Giá bán: ${selectedScenario.totalSellingPrice.toLocaleString()} ${selectedScenario.currency}. Lãi gộp: ${selectedScenario.grossProfit.toLocaleString()} ${selectedScenario.currency} (${selectedScenario.marginPercent}%).`,
        actionRequired: 'Xác nhận giữ chỗ hãng vận tải, phát hành báo giá chính thức và follow up chốt booking',
        priority: 'HIGH',
        urgency: 'HIGH',
        dueAt: due.toISOString(),
        assignedTo: user.email,
        assignedToName: user.name,
        relatedCustomerId: rfq.customerId,
        relatedCustomerName: rfq.customerName,
        relatedDecisionId: sourceEntityId,
        relatedScenarioId: selectedScenario.id,
        source: 'SCENARIO_ENGINE',
        subtasks: [
          { id: 'st_1', title: `Xác nhận tải và giá cước với hãng ${selectedScenario.carrier}`, isCompleted: false },
          { id: 'st_2', title: `Phát hành báo giá nháp gửi cho ${rfq.customerName || 'khách hàng'}`, isCompleted: false },
          { id: 'st_3', title: `Theo dõi hạn hiệu lực cước đến ${selectedScenario.rateValidUntil || 'cuối kỳ'}`, isCompleted: false },
          { id: 'st_4', title: 'Thu hồi phản hồi của khách hàng và xác nhận booking', isCompleted: false },
        ]
      }, { uid: user.email, displayName: user.name, email: user.email });

      setCreatedActionsMap(prev => ({ ...prev, SCENARIO_PLAN: true }));
      showToast(lang === 'vi' ? 'Đã tạo kế hoạch thực thi 4 bước vào Action Center!' : 'Created 4-step execution plan in Action Center!');
    } catch (err) {
      console.error('Error executing scenario to actions:', err);
      showToast(lang === 'vi' ? 'Không thể khởi tạo kế hoạch thực thi!' : 'Failed to create execution plan');
    } finally {
      setActionCreatingId(null);
    }
  };

  if (!isOpen) return null;

  const canViewBuyCost = userRole === 'admin' || userRole === 'manager' || userRole === 'pricing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[94vh] max-h-[960px] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-8 z-50 bg-slate-900 text-white font-semibold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/80 flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Header & Context Summary Bar */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {t.workspaceTitle}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Phase 47
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                <span>{rfq.customerName}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{rfq.origin} ➔ {rfq.destination}</span>
                <span>•</span>
                <span>{rfq.mode}</span>
                <span>•</span>
                <span>{rfq.incoterm}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')}
              className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
              title="Chuyển đổi ngôn ngữ / Switch Language"
            >
              {lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </button>

            {/* Quick Readiness Indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              <span className="text-slate-500">{t.completenessScore}:</span>
              <span className={`font-bold ${completenessReport.completionScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {completenessReport.completionScore}%
              </span>
              {risks.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{risks.length} rủi ro</span>
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Đóng Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Concurrency Conflict Alert Banner */}
        {concurrencyConflict && !dismissConcurrencyWarning && (
          <div className="mx-6 mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs shrink-0 shadow-xs">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  {lang === 'vi' ? concurrencyConflict.messageVi : concurrencyConflict.messageEn}
                </div>
                <div className="text-amber-700 dark:text-amber-400 text-2xs mt-0.5">
                  {t.sourceVersionWarning}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  setDismissConcurrencyWarning(true);
                  showToast(lang === 'vi' ? 'Đang tiếp tục với phiên bản hiện hành' : 'Continuing with current version');
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
              >
                {t.continueOldVersion}
              </button>
            </div>
          </div>
        )}

        {/* 2. Navigation Tabs */}
        <div className="px-6 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. {t.tabOverview}</span>
          </button>

          <button
            onClick={() => setActiveTab('SCENARIO')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'SCENARIO'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. {t.tabScenario}</span>
            <span className="px-1.5 py-0.5 rounded-full text-2xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold">
              {scenarios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('RISKS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'RISKS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${risks.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <span>3. {t.tabRisks} ({risks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'ACTIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-500" />
            <span>4. {t.tabActions}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('SAVED');
              fetchSavedScenarios();
            }}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'SAVED'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Save className="w-4 h-4 text-indigo-500" />
            <span>5. {t.tabSavedScenarios}</span>
            {savedScenarios.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-2xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {savedScenarios.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Main Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: OVERVIEW & CONTEXT 360 */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              
              {/* Row 1: RFQ Parameters Card */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Chi Tiết Yêu Cầu Báo Giá (RFQ Specification)
                    </h3>
                  </div>
                  <span className="text-2xs text-slate-400">Dữ liệu thời gian thực</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Khách Hàng</label>
                    <select
                      value={rfq.customerId}
                      onChange={(e) => {
                        const target = customers.find(c => c.id === e.target.value);
                        setRfq(prev => ({
                          ...prev,
                          customerId: e.target.value,
                          customerName: target?.customerName || target?.companyName || 'Khách hàng',
                          customerCode: target?.code
                        }));
                      }}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.companyName || c.customerName} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Phương thức (Mode)</label>
                    <select
                      value={rfq.mode}
                      onChange={(e) => setRfq(prev => ({ ...prev, mode: e.target.value as TransportMode }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SEA_FCL">Đường biển nguyên container (SEA FCL)</option>
                      <option value="SEA_LCL">Đường biển hàng lẻ (SEA LCL)</option>
                      <option value="AIR">Đường hàng không (AIR)</option>
                      <option value="ROAD">Đường bộ / Kéo cont (ROAD)</option>
                      <option value="CUSTOMS">Thủ tục Hải quan (CUSTOMS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Cảng đi / POL</label>
                    <input
                      type="text"
                      value={rfq.origin}
                      onChange={(e) => setRfq(prev => ({ ...prev, origin: e.target.value }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      placeholder="VD: VNSGN"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Cảng đến / POD</label>
                    <input
                      type="text"
                      value={rfq.destination}
                      onChange={(e) => setRfq(prev => ({ ...prev, destination: e.target.value }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      placeholder="VD: USLAX"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Tên Hàng (Commodity)</label>
                    <input
                      type="text"
                      value={rfq.commodity}
                      onChange={(e) => setRfq(prev => ({ ...prev, commodity: e.target.value }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      placeholder="VD: May mặc, Điện tử..."
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Loại Cont / Thiết bị</label>
                    <input
                      type="text"
                      value={rfq.containerType || ''}
                      onChange={(e) => setRfq(prev => ({ ...prev, containerType: e.target.value as any }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      placeholder="20GP, 40GP, 40HC..."
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Số lượng</label>
                    <input
                      type="number"
                      value={rfq.quantity || 1}
                      onChange={(e) => setRfq(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 uppercase">Incoterm</label>
                    <select
                      value={rfq.incoterm}
                      onChange={(e) => setRfq(prev => ({ ...prev, incoterm: e.target.value as any }))}
                      className="mt-1 w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="FOB">FOB - Free on Board</option>
                      <option value="CIF">CIF - Cost Insurance & Freight</option>
                      <option value="CFR">CFR - Cost and Freight</option>
                      <option value="EXW">EXW - Ex Works</option>
                      <option value="DAP">DAP - Delivered at Place</option>
                      <option value="DDP">DDP - Delivered Duty Paid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Customer Commercial Profile & Lane History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Customer Context 360 */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Bối Cảnh Thương Mại Khách Hàng (Customer 360)
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        customerContext.status === 'ACTIVE' 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {customerContext.status === 'ACTIVE' ? 'ĐANG GIAO DỊCH' : 'TIỀM NĂNG'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Báo giá lịch sử</div>
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                          {customerContext.totalHistoricalQuotes}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Lô hàng thành công</div>
                        <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                          {customerContext.totalHistoricalShipments}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Hợp đồng hiệu lực</div>
                        <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                          {customerContext.activeContractsCount}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Báo giá gần nhất:</span>
                        <span className="font-semibold">
                          {customerContext.lastQuoteDate ? `${customerContext.lastQuoteDate.slice(0, 10)} (${customerContext.lastQuotePrice?.toLocaleString()} ${customerContext.lastQuoteCurrency})` : 'Chưa có'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Lô hàng gần nhất:</span>
                        <span className="font-semibold">
                          {customerContext.lastShipmentDate ? customerContext.lastShipmentDate.slice(0, 10) : 'Chưa có lô hàng'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Điều khoản thanh toán:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{customerContext.paymentTerm}</span>
                      </div>
                    </div>
                  </div>

                  {customerContext.openOpportunitiesCount > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Có {customerContext.openOpportunitiesCount} cơ hội tăng trưởng đang mở
                        </span>
                      </div>
                      {onOpenOpportunity && (
                        <button
                          onClick={() => onOpenOpportunity(rfq.customerId)}
                          className="text-2xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center space-x-1"
                        >
                          <span>Xem Radar</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Lane Analytics Context */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Phân Tích Tuyến Đường (Lane Context)
                      </h4>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {laneContext.laneKey}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Báo giá trên tuyến</div>
                        <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                          {laneContext.totalQuotesOnLane}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Tỷ lệ chốt đơn (Win Rate)</div>
                        <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                          {laneContext.winRatePercent}%
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div className="text-2xs text-slate-400">Biên lãi TB trên tuyến</div>
                        <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                          {laneContext.averageMarginPercent}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xs font-semibold text-slate-400 uppercase mb-2">Báo giá tương tự gần đây</div>
                      {laneContext.previousQuotes.length > 0 ? (
                        <div className="space-y-1.5">
                          {laneContext.previousQuotes.map(pq => (
                            <div key={pq.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{pq.quoteNumber}</span>
                              <span className="text-slate-500">{pq.createdDate.slice(0, 10)}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {pq.subtotal.toLocaleString()} {pq.currency}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                                pq.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {pq.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          Không có lịch sử báo giá tương tự trên tuyến này.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Giá chào gần nhất:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {laneContext.lastQuotedPrice ? `${laneContext.lastQuotedPrice.toLocaleString()} ${laneContext.lastQuotedCurrency}` : 'Chưa có'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Matched Candidate Rates */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Biểu Cước Khả Dụng Khớp Tuyến (Candidate Rates - Master Rate & Hợp Đồng)
                    </h3>
                  </div>
                  {onOpenRateHub && (
                    <button
                      onClick={onOpenRateHub}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Tra cứu Master Rate Hub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {candidateRates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-2xs uppercase text-slate-400">
                          <th className="py-2.5 px-3">Hạng (Tier)</th>
                          <th className="py-2.5 px-3">Nguồn Biểu Cước</th>
                          <th className="py-2.5 px-3">Hãng Tàu / Nhà CC</th>
                          <th className="py-2.5 px-3">Loại Thiết Bị</th>
                          {canViewBuyCost && <th className="py-2.5 px-3 text-right">Giá Cước (Buy Rate)</th>}
                          <th className="py-2.5 px-3">Hiệu Lực Đến</th>
                          <th className="py-2.5 px-3">Thời gian đi</th>
                          <th className="py-2.5 px-3">Free time</th>
                          <th className="py-2.5 px-3 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {candidateRates.map(cr => (
                          <tr key={cr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-2xs font-extrabold ${
                                cr.tier === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                Tier {cr.tier}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {cr.source === 'CUSTOMER_CONTRACT' ? 'Hợp đồng Khách Hàng' : cr.source === 'SUPPLIER_CONTRACT' ? 'Hợp đồng Hãng Tàu' : 'Cước Spot Master'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              {cr.carrier || cr.supplierName || 'Carrier'}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{cr.equipment || 'All'}</td>
                            {canViewBuyCost && (
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                                {cr.buyCost.toLocaleString()} {cr.currency}
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-slate-500">
                              {cr.validUntil || 'Chưa rõ'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {cr.transitTimeDays ? `${cr.transitTimeDays} ngày` : 'Theo lịch'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {cr.freeTimeDays ? `${cr.freeTimeDays} ngày` : 'Tiêu chuẩn'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setActiveTab('SCENARIO');
                                  showToast(`Đã chuyển sang mô phỏng kịch bản từ ${cr.carrier || 'biểu cước'}`);
                                }}
                                className="px-2.5 py-1 text-2xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                              >
                                Đưa vào Kịch bản
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Không tìm thấy biểu cước Master còn hiệu lực khớp với tuyến {rfq.origin} ➔ {rfq.destination}.
                    </p>
                    <p className="text-2xs text-slate-400">
                      Bạn vẫn có thể nhập giá cước và chi phí ước tính trực tiếp trong Tab Mô phỏng Kịch Bản.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SCENARIO WORKSPACE (WHAT-IF SIMULATOR - TRỌNG TÂM) */}
          {activeTab === 'SCENARIO' && (
            <div className="space-y-6">
              
              {/* Introduction bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/70 dark:border-indigo-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      What-If Scenario Simulator (Mô Phỏng Phương Án Cước)
                    </h3>
                    <p className="text-2xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                      Thử nghiệm các phương án cước hãng tàu, điều chỉnh giá bán và tỷ lệ chiết khấu mà KHÔNG ghi đè dữ liệu báo giá thật.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newId = `sc_${Date.now()}`;
                      const letter = String.fromCharCode(65 + scenarios.length);
                      const base = selectedScenario || scenarios[0];
                      const newSc: DecisionScenario = {
                        ...base,
                        id: newId,
                        name: `Kịch bản ${letter} - Phương án Mới`,
                        isBaseline: false,
                        status: 'ACTIVE'
                      };
                      setScenarios(prev => [...prev, newSc]);
                      setSelectedScenarioId(newId);
                      showToast(`Đã tạo thêm Kịch bản ${letter}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors flex items-center space-x-1 shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm Kịch Bản</span>
                  </button>

                  <button
                    onClick={handleSaveIndividualScenario}
                    disabled={isSavingScenario}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center space-x-1 shadow-2xs disabled:opacity-50"
                    title="Lưu kịch bản đang chọn lên Firestore"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingScenario ? 'Đang lưu...' : 'Lưu Kịch Bản Lên Cloud'}</span>
                  </button>
                </div>
              </div>

              {/* Scenario Cards Grid (Side-by-side comparison) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {scenarios.map((sc, index) => {
                  const isSelected = sc.id === selectedScenarioId;
                  return (
                    <div 
                      key={sc.id}
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`relative rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-xl ring-2 ring-indigo-500/20' 
                          : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Header Badge */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                            <span>{sc.name}</span>
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-indigo-600 text-white flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Được chọn</span>
                            </span>
                          )}
                        </div>

                        {/* Factual Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {sc.factualTags.map(tag => (
                            <span 
                              key={tag} 
                              className={`px-2 py-0.5 rounded-md text-2xs font-extrabold ${
                                tag === 'LOWER_COST' 
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : tag === 'HIGHER_MARGIN'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : tag === 'CUSTOMER_CONTRACT'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : tag === 'EXPIRING_SOON'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Editable Fields for What-If Simulation */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="text-2xs font-semibold text-slate-400">Hãng Vận Chuyển</label>
                            <input
                              type="text"
                              value={sc.carrier}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateScenario(sc.id, 'carrier', e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            />
                          </div>

                          {canViewBuyCost && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-2xs font-semibold text-slate-400">Giá Vốn Cước (Buy Cost)</label>
                                <input
                                  type="number"
                                  value={sc.buyCost}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateScenario(sc.id, 'buyCost', Number(e.target.value))}
                                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="text-2xs font-semibold text-slate-400">Tổng Phụ Phí (Surcharges)</label>
                                <div className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  +{sc.totalSurcharges.toLocaleString()} {sc.currency}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-2xs font-semibold text-slate-400">Giá Bán Cước (Selling Price)</label>
                              <input
                                type="number"
                                value={sc.sellingPrice}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateScenario(sc.id, 'sellingPrice', Number(e.target.value))}
                                className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                              />
                            </div>

                            <div>
                              <label className="text-2xs font-semibold text-slate-400">Chiết Khấu (Discount)</label>
                              <input
                                type="number"
                                value={sc.discountAmount}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateScenario(sc.id, 'discountAmount', Number(e.target.value))}
                                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calculated Outcomes (Profit & Margin) */}
                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500">Giá Chào Khách (All-In):</span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {sc.totalSellingPrice.toLocaleString()} {sc.currency}
                          </span>
                        </div>

                        {canViewBuyCost && (
                          <>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-500">Lãi Gộp (Gross Profit):</span>
                              <span className={`font-bold ${sc.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {sc.grossProfit.toLocaleString()} {sc.currency}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Tỷ Suất Biên Lợi Nhuận:</span>
                              <span className={`font-extrabold px-2 py-0.5 rounded-md text-2xs ${
                                sc.marginPercent >= 10 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : sc.marginPercent >= 5 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sc.marginPercent}%
                              </span>
                            </div>
                          </>
                        )}

                        <div className="mt-3 flex space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScenarioId(sc.id);
                              showToast(`Đã chọn ${sc.name} làm phương án chuẩn`);
                            }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                            }`}
                          >
                            {isSelected ? 'Đang Áp Dụng' : 'Chọn Kịch Bản Này'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: RISKS & DATA COMPLETENESS CHECKLIST */}
          {activeTab === 'RISKS' && (
            <div className="space-y-6">
              
              {/* Row 1: Active Risks Panel */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bảng Cảnh Báo Rủi Ro Kinh Doanh Thực Tế ({risks.length} phát hiện)
                    </h3>
                  </div>
                  <span className="text-2xs text-slate-400">Kiểm tra dựa trên quy tắc nghiệp vụ</span>
                </div>

                {risks.length > 0 ? (
                  <div className="space-y-3">
                    {risks.map(r => (
                      <div 
                        key={r.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                          r.severity === 'CRITICAL'
                            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                            : r.severity === 'HIGH'
                            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-md text-2xs font-extrabold ${
                              r.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : r.severity === 'HIGH' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'
                            }`}>
                              {r.severity}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {r.reason}
                          </p>
                          <div className="text-2xs font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-1">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Đề xuất xử lý:</span>
                            <span>{r.suggestedReview}</span>
                          </div>
                        </div>

                        <span className="text-2xs font-mono text-slate-400 shrink-0 self-start">
                          {r.source}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Không phát hiện rủi ro thương mại nghiêm trọng!
                    </p>
                    <p className="text-2xs text-emerald-600 dark:text-emerald-400">
                      Thời hạn hiệu lực, giá cước và tỷ suất lợi nhuận đều nằm trong ngưỡng an toàn.
                    </p>
                  </div>
                )}
              </div>

              {/* Row 2: Dynamic Smart Completeness Checklist */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Danh Sách Kiểm Tra Đầy Đủ Thông Tin ({rfq.mode})
                    </h3>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Đảm bảo đầy đủ dữ liệu trước khi ban hành báo giá chính thức
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {completenessReport.completionScore}% hoàn tất
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${completenessReport.completionScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completenessReport.items.map(item => (
                    <div 
                      key={item.field}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        {item.status === 'COMPLETE' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : item.status === 'MISSING' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.labelVi}
                          </div>
                          {item.value && (
                            <div className="text-2xs text-slate-500 font-mono mt-0.5">
                              {item.value}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                        item.status === 'COMPLETE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'MISSING'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.status === 'COMPLETE' ? 'ĐẦY ĐỦ' : item.status === 'MISSING' ? 'THIẾU' : 'TÙY CHỌN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: DECISION SUMMARY & SUGGESTED ACTIONS */}
          {activeTab === 'ACTIONS' && (
            <div className="space-y-6">
              
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    Decision Summary Card
                  </span>
                  <span className="text-2xs text-slate-400">Quyết định bởi người dùng</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2">
                  <div>
                    <div className="text-2xs text-indigo-300 uppercase">Khách Hàng & Tuyến Vận Chuyển</div>
                    <div className="text-base font-bold text-white mt-1">{rfq.customerName}</div>
                    <div className="text-xs text-slate-300 font-mono mt-0.5">
                      {rfq.origin} ➔ {rfq.destination} ({rfq.mode})
                    </div>
                  </div>

                  <div>
                    <div className="text-2xs text-indigo-300 uppercase">Kịch Bản Đã Chọn (Selected Scenario)</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      {selectedScenario?.name}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Hãng vận chuyển: {selectedScenario?.carrier} | Nguồn: {selectedScenario?.rateSource}
                    </div>
                  </div>

                  <div>
                    <div className="text-2xs text-indigo-300 uppercase">Giá Bán & Tỷ Suất Lợi Nhuận</div>
                    <div className="text-base font-extrabold text-white mt-1">
                      {selectedScenario?.totalSellingPrice.toLocaleString()} {selectedScenario?.currency}
                    </div>
                    {canViewBuyCost && (
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                        Lãi gộp: {selectedScenario?.grossProfit.toLocaleString()} {selectedScenario?.currency} ({selectedScenario?.marginPercent}%)
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-slate-300">
                  <div>Hiệu lực cước: <span className="font-semibold text-white">{selectedScenario?.rateValidUntil || 'Chưa rõ'}</span></div>
                  <div>•</div>
                  <div>Thời gian đi: <span className="font-semibold text-white">{selectedScenario?.transitTime || 'Theo lịch hãng'}</span></div>
                  <div>•</div>
                  <div>Rủi ro phát hiện: <span className="font-semibold text-amber-300">{risks.length} cảnh báo</span></div>
                </div>

                {/* Phase 48: Scenario Execution Action Plan Button */}
                <div className="mt-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Kế Hoạch Thực Thi Kịch Bản (Execution Workspace)
                    </span>
                    <span className="text-slate-300 text-2xs mt-0.5 block">
                      Khởi tạo hành động nghiệm thu, giữ chỗ carrier và checklist 4 bước vào Action Center
                    </span>
                  </div>

                  {createdActionsMap['SCENARIO_PLAN'] ? (
                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 self-end sm:self-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Đã đưa vào Action Center</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleExecuteScenarioToActions}
                      disabled={actionCreatingId === 'SCENARIO_PLAN'}
                      className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold transition-all flex items-center gap-1.5 shadow-md self-end sm:self-center"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{actionCreatingId === 'SCENARIO_PLAN' ? 'Đang khởi tạo...' : 'Tạo Action Plan'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons Hub */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Các Hành Động Được Hệ Thống Gợi Ý (Suggested Next Actions)
                </h3>

                <div className="space-y-3">
                  {suggestedActions.map(action => (
                    <div 
                      key={action.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-2xs font-extrabold ${
                            action.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {action.priority}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{action.titleVi}</span>
                        </div>
                        <p className="text-2xs text-slate-500 mt-1">{action.whyVi}</p>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {/* Phase 48: Create Business Action button */}
                        {createdActionsMap[action.id] ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã tạo Action</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateBusinessActionFromSuggested(action)}
                            disabled={actionCreatingId === action.id}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{actionCreatingId === action.id ? 'Đang tạo...' : 'Tạo Action'}</span>
                          </button>
                        )}

                        {action.actionType === 'CREATE_DRAFT_QUOTE' && (
                          <button
                            onClick={handleCreateDraftQuote}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:opacity-95 transition-all flex items-center space-x-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Tạo Báo Giá Nháp</span>
                          </button>
                        )}

                        {action.actionType === 'CREATE_FOLLOW_UP' && onOpenFollowUp && (
                          <button
                            onClick={onOpenFollowUp}
                            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center space-x-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Lên Lịch Hẹn</span>
                          </button>
                        )}

                        {action.actionType === 'FILL_MISSING_DATA' && (
                          <button
                            onClick={() => setActiveTab('OVERVIEW')}
                            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            Bổ Sung Dữ Liệu
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: SAVED SCENARIOS (PERSISTENCE) */}
          {activeTab === 'SAVED' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'vi' ? 'Danh Sách Kịch Bản Đã Lưu (Cloud Scenarios)' : 'Saved Cloud Scenarios'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'vi' 
                      ? 'Các kịch bản What-If đã lưu trữ thực tế trên Firestore cho công ty và khách hàng này.' 
                      : 'Real What-If scenarios persisted to Firestore for this company and customer.'}
                  </p>
                </div>
                <button
                  onClick={fetchSavedScenarios}
                  disabled={isLoadingSavedScenarios}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSavedScenarios ? 'animate-spin' : ''}`} />
                  <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
                </button>
              </div>

              {savedScenarios.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Save className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.noSavedScenarios}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {lang === 'vi'
                      ? 'Tại tab "Mô Phỏng Kịch Bản", bạn có thể tinh chỉnh các thông số và bấm "Lưu Kịch Bản Lên Cloud" để lưu trữ và truy cập lại từ bất kỳ thiết bị nào.'
                      : 'In the "What-If Scenarios" tab, tune parameters and click "Save Scenario to Cloud" to persist and access across devices.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedScenarios.map(saved => (
                    <div key={saved.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{saved.scenarioName}</span>
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {saved.sourceEntityType} v{saved.sourceVersion}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {saved.scenario?.carrier} • {saved.scenario?.mode} • {saved.scenarioInputs?.origin} ➔ {saved.scenarioInputs?.destination}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-center text-xs">
                          <div>
                            <div className="text-2xs text-slate-400">{t.sellingPrice}</div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{saved.scenario?.sellingPrice?.toLocaleString()} {saved.scenario?.currency}</div>
                          </div>
                          <div>
                            <div className="text-2xs text-slate-400">{t.grossProfit}</div>
                            <div className="font-bold text-emerald-600">{saved.scenario?.grossProfit?.toLocaleString()} {saved.scenario?.currency}</div>
                          </div>
                          <div>
                            <div className="text-2xs text-slate-400">{t.marginPercent}</div>
                            <div className="font-bold text-indigo-600">{saved.scenario?.marginPercent}%</div>
                          </div>
                        </div>
                        <div className="mt-2 text-2xs text-slate-400">
                          {lang === 'vi' ? 'Lưu bởi' : 'Saved by'} {saved.createdBy} lúc {new Date(saved.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button
                          onClick={() => handleDeleteSavedScenario(saved.id)}
                          className="text-2xs text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'vi' ? 'Xóa' : 'Delete'}</span>
                        </button>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLoadSavedScenarioIntoWorkspace(saved)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition"
                          >
                            {lang === 'vi' ? 'Nạp vào Workspace' : 'Load into Workspace'}
                          </button>
                          <button
                            onClick={() => {
                              const draftQuote = createDraftQuoteFromScenario(saved.scenarioInputs, saved.scenario, companyProfile);
                              if (onSelectQuoteForDraft) onSelectQuoteForDraft(draftQuote);
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{t.createDraftQuote}</span>
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

        {/* 4. Footer Action Bar */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-2xs text-slate-500 dark:text-slate-400">
            Kịch bản đang chọn: <strong className="text-slate-800 dark:text-slate-200">{selectedScenario?.name}</strong> (All-in: {selectedScenario?.totalSellingPrice.toLocaleString()} {selectedScenario?.currency})
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveDecisionSnapshot}
              disabled={isSavingSnapshot}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingSnapshot ? 'Đang lưu...' : 'Lưu Decision Snapshot'}</span>
            </button>

            <button
              onClick={handleCreateDraftQuote}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:opacity-95 transition-all flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Khởi Tạo Bản Nháp Báo Giá (Draft)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
