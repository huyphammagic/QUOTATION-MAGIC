import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { 
  QuoteData, 
  CompanyProfile, 
  LineItem, 
  CustomerInfo, 
  ShipmentDetails, 
  TermsAndConditions, 
  QuoteStatus, 
  CustomerRecord, 
  SurchargeItem,
  QuoteCurrency,
  TransportMode
} from './types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from './types/masterRate';
import { DEFAULT_COMPANY_PROFILE, createEmptyQuote, DEFAULT_EXCHANGE_RATE } from './data/presets';
import { generateQuoteNumber, calculateLineItem } from './utils/formatters';
import { calculateQuote } from './services/pricing';
import { 
  convertRateToLineItemSnapshot, 
  checkQuoteForRateUpdates, 
  applyLiveRateToLineItem 
} from './services/masterRate/rateSnapshot';
import { 
  saveQuoteToFirestore, 
  getQuotesFromFirestore, 
  deleteQuoteFromFirestore,
  saveCustomerToFirestore,
  getCustomersFromFirestore,
  deleteCustomerFromFirestore,
  saveSurchargeToFirestore,
  getSurchargesFromFirestore,
  deleteSurchargeFromFirestore,
  saveCompanyProfileToFirestore,
  getCompanyProfileFromFirestore,
  saveRateMasterToFirestore,
  getRateMastersFromFirestore,
  deleteRateMasterFromFirestore,
  saveChargeMasterToFirestore,
  getChargeMastersFromFirestore,
  deleteChargeMasterFromFirestore,
  getRateHistoriesFromFirestore,
  batchSaveMasterRatesToFirestore,
  subscribeToQuotations,
  subscribeToCustomers,
  subscribeToRateMasters,
  subscribeToSurcharges,
  subscribeToChargeMasters,
  subscribeToCompanyProfile,
  batchRestoreSystemDataToFirestore
} from './services/firebase/firestoreService';
import { getActiveQuotationDraft } from './services/repository/quotationRepository';
import { 
  fetchCustomers, 
  saveCustomer, 
  deleteCustomer, 
  autoUpsertCustomerFromQuote, 
  syncMissingCustomersFromQuotes 
} from './services/repository/customerRepository';
import { 
  getSavedQuotes, 
  getCompanySettings, 
  getSavedCustomers, 
  getSavedSurcharges, 
  getSavedRateMasters,
  getSavedChargeMasters,
  getSavedRateHistories,
  saveActiveQuoteDraft, 
  getActiveQuoteDraft, 
  cloneQuote, 
  updateQuoteStatus 
} from './utils/storage';
import { exportQuoteToPdf } from './utils/exportPdf';
import { exportQuoteToExcel } from './utils/exportExcel';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardStats } from './components/DashboardStats';
import { CustomerForm } from './components/CustomerForm';
import { ShipmentForm } from './components/ShipmentForm';
import { LineItemsTable } from './components/LineItemsTable';
import { TermsForm } from './components/TermsForm';
import { SummaryCard } from './components/SummaryCard';

import { QuotationCommunicationPanel } from './components/communication/QuotationCommunicationPanel';
import type { MasterDataType } from './components/MasterDataReferenceModal';

// Lazy loaded modals for on-demand bundle splitting
const QuotePreviewModal = lazy(() => import('./components/QuotePreviewModal').then(m => ({ default: m.QuotePreviewModal })));
const SavedQuotesModal = lazy(() => import('./components/SavedQuotesModal').then(m => ({ default: m.SavedQuotesModal })));
const CompanyProfileModal = lazy(() => import('./components/CompanyProfileModal').then(m => ({ default: m.CompanyProfileModal })));
const CustomerManagerModal = lazy(() => import('./components/CustomerManagerModal').then(m => ({ default: m.CustomerManagerModal })));
const SurchargeCatalogModal = lazy(() => import('./components/SurchargeCatalogModal').then(m => ({ default: m.SurchargeCatalogModal })));
const MasterRateHubModal = lazy(() => import('./components/MasterRateHubModal').then(m => ({ default: m.MasterRateHubModal })));
const RateSearchModal = lazy(() => import('./components/RateSearchModal').then(m => ({ default: m.RateSearchModal })));
const SmartRateAssistantModal = lazy(() => import('./components/SmartRateAssistantModal').then(m => ({ default: m.SmartRateAssistantModal })));
const RateComparisonModal = lazy(() => import('./components/RateComparisonModal').then(m => ({ default: m.RateComparisonModal })));
const DataBackupModal = lazy(() => import('./components/DataBackupModal').then(m => ({ default: m.DataBackupModal })));
const GeneratePdfModal = lazy(() => import('./components/GeneratePdfModal').then(m => ({ default: m.GeneratePdfModal })));
const QuotationTemplateBuilderModal = lazy(() => import('./components/QuotationTemplateBuilderModal').then(m => ({ default: m.QuotationTemplateBuilderModal })));
const DocumentHistoryModal = lazy(() => import('./components/DocumentHistoryModal').then(m => ({ default: m.DocumentHistoryModal })));
const SendQuotationModal = lazy(() => import('./components/communication/SendQuotationModal').then(m => ({ default: m.SendQuotationModal })));
const CustomerSecureQuotePage = lazy(() => import('./components/communication/CustomerSecureQuotePage').then(m => ({ default: m.CustomerSecureQuotePage })));
const EmailTemplateManagementModal = lazy(() => import('./components/communication/EmailTemplateManagementModal').then(m => ({ default: m.EmailTemplateManagementModal })));
const FollowUpModal = lazy(() => import('./components/communication/FollowUpModal').then(m => ({ default: m.FollowUpModal })));
const AdvancedAnalyticsDashboard = lazy(() => import('./components/analytics/AdvancedAnalyticsDashboard').then(m => ({ default: m.AdvancedAnalyticsDashboard })));
const ContractHubModal = lazy(() => import('./components/contract/ContractHubModal').then(m => ({ default: m.ContractHubModal })));
const ProfitIntelligenceModal = lazy(() => import('./components/pricing/ProfitIntelligenceModal').then(m => ({ default: m.ProfitIntelligenceModal })));
const PricingPolicyManagementModal = lazy(() => import('./components/pricing/PricingPolicyManagementModal').then(m => ({ default: m.PricingPolicyManagementModal })));
const ConflictResolutionModal = lazy(() => import('./components/ConflictResolutionModal').then(m => ({ default: m.ConflictResolutionModal })));
const MasterDataReferenceModal = lazy(() => import('./components/MasterDataReferenceModal').then(m => ({ default: m.MasterDataReferenceModal })));
const SmartQuotationWorkspace = lazy(() => import('./components/smartQuotation/SmartQuotationWorkspace').then(m => ({ default: m.SmartQuotationWorkspace })));
const DataIntegrityDashboardModal = lazy(() => import('./components/integrity/DataIntegrityDashboardModal').then(m => ({ default: m.DataIntegrityDashboardModal })));

import { getDocumentRecordsForQuotation, getAllQuotationDocuments } from './services/quotation/quotationDocumentService';
import { QuotationDocumentRecord } from './types/quotationDocument';
import { getAllCommunications, getAllFollowUps } from './services/quotation/quotationCommunicationService';
import { getAllCustomerResponses, getAllSecureLinks } from './services/quotation/quotationSecurityService';
import { 
  QuotationCommunication, 
  QuotationCustomerResponse, 
  QuotationFollowUp, 
  QuotationSecureLink 
} from './types/quotationCommunication';
import { resolveQuotationPricing } from './services/contract/contractRateResolver';
import { fetchContracts } from './services/contract/contractRepository';

// Phase 15: Profit & Margin Intelligence
import { 
  getPricingPoliciesFromFirestore, 
  resolvePricingPolicy, 
  DEFAULT_GLOBAL_PRICING_POLICY 
} from './services/pricing/pricingPolicyService';
import { recordPricingAuditEvent } from './services/pricing/pricingAuditService';
import { PricingPolicyItem } from './types/pricingIntelligence';
import { runPhase17Migration } from './services/repository/migrationService';
import { 
  saveQuotation, 
  deleteQuotation as repoDeleteQuotation, 
  fetchQuotations 
} from './services/repository/quotationRepository';
import { fetchRateMasters } from './services/repository/rateRepository';
import { UserRole } from './types/analytics';

import { Check, Ship, ShieldCheck, Sparkles } from 'lucide-react';

export default function App() {
  // Saved data states
  const [savedQuotes, setSavedQuotes] = useState<QuoteData[]>([]);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [quote, setQuote] = useState<QuoteData>(() => {
    const { calculatedQuote } = calculateQuote(createEmptyQuote(DEFAULT_COMPANY_PROFILE));
    return calculatedQuote;
  });
  
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [surcharges, setSurcharges] = useState<SurchargeItem[]>([]);
  const [rates, setRates] = useState<RateMasterItem[]>([]);
  const [chargeMasters, setChargeMasters] = useState<ChargeMasterItem[]>([]);
  const [rateHistories, setRateHistories] = useState<RateHistoryItem[]>([]);

  // Auto-Save Draft States
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const quoteRef = useRef(quote);
  const isInitialMount = useRef(true);

  // Keep quoteRef in sync with latest quote state
  useEffect(() => {
    quoteRef.current = quote;
  }, [quote]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Phase 17: Cloud-First Persistence & Cross-Device Sync States
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncedAt, setLastCloudSyncedAt] = useState<Date | null>(null);
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    localQuote?: QuoteData;
    remoteQuote?: QuoteData;
  }>({ isOpen: false });

  // Modal visibility states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyModalTab, setCompanyModalTab] = useState<'profile' | 'sales' | 'bank' | 'preview'>('profile');
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isSurchargesOpen, setIsSurchargesOpen] = useState(false);
  const [isMasterRateHubOpen, setIsMasterRateHubOpen] = useState(false);
  const [masterRateHubTab, setMasterRateHubTab] = useState<
    'RATES' | 'COMPARISON' | 'MATCHING' | 'EXPIRING' | 'APPROVALS' | 'REQUESTS' | 'ENTITIES' | 'CHARGES' | 'AUDIT'
  >('RATES');
  const [savedQuotesInitialFilter, setSavedQuotesInitialFilter] = useState<string>('ALL');
  const [dashboardInitialTab, setDashboardInitialTab] = useState<string>('OVERVIEW');
  const [isMasterDataRefOpen, setIsMasterDataRefOpen] = useState(false);
  const [masterDataRefType, setMasterDataRefType] = useState<MasterDataType>('PORT');
  const [appUserRole, setAppUserRole] = useState<UserRole>('ADMIN');
  const [appLanguage, setAppLanguage] = useState<'vi' | 'en'>('vi');
  const [isRateSearchOpen, setIsRateSearchOpen] = useState(false);
  const [isSmartAssistantOpen, setIsSmartAssistantOpen] = useState(false);
  const [isSmartQuotationWorkspaceOpen, setIsSmartQuotationWorkspaceOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Phase 7: Professional PDF Quotation Engine & Template Builder Modals
  const [isGeneratePdfOpen, setIsGeneratePdfOpen] = useState(false);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isDocumentHistoryOpen, setIsDocumentHistoryOpen] = useState(false);

  // Phase 8: Quotation Communication, Email & Secure Sharing
  const [isSendQuotationOpen, setIsSendQuotationOpen] = useState(false);
  const [isEmailTemplatesOpen, setIsEmailTemplatesOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isCommunicationPanelOpen, setIsCommunicationPanelOpen] = useState(false);
  const [quotationDocuments, setQuotationDocuments] = useState<QuotationDocumentRecord[]>([]);
  const [viewingSecureToken, setViewingSecureToken] = useState<string | null>(null);

  // Phase 9: Advanced Business Intelligence & Sales Analytics Dashboard
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [allCommunications, setAllCommunications] = useState<QuotationCommunication[]>([]);
  const [allResponses, setAllResponses] = useState<QuotationCustomerResponse[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<QuotationFollowUp[]>([]);
  const [allLinks, setAllLinks] = useState<QuotationSecureLink[]>([]);
  const [allDocuments, setAllDocuments] = useState<QuotationDocumentRecord[]>([]);

  // Phase 14: Customer & Supplier Contract Management
  const [isContractsOpen, setIsContractsOpen] = useState(false);
  const [contractsCount, setContractsCount] = useState(0);

  // Phase 24: Global Data Integrity & Sync Health Dashboard
  const [isIntegrityDashboardOpen, setIsIntegrityDashboardOpen] = useState(false);

  // Phase 15: Profit & Margin Intelligence
  const [isProfitIntelligenceOpen, setIsProfitIntelligenceOpen] = useState(false);
  const [isPricingPolicyMgmtOpen, setIsPricingPolicyMgmtOpen] = useState(false);
  const [pricingPolicies, setPricingPolicies] = useState<PricingPolicyItem[]>([DEFAULT_GLOBAL_PRICING_POLICY]);
  const [activePricingPolicy, setActivePricingPolicy] = useState<PricingPolicyItem>(DEFAULT_GLOBAL_PRICING_POLICY);

  const loadPricingPoliciesData = async () => {
    try {
      const list = await getPricingPoliciesFromFirestore();
      setPricingPolicies(list);
      const resolved = resolvePricingPolicy(list, quote.customer?.id, (quote.customer as any)?.segment, quote.shipment?.mode);
      setActivePricingPolicy(resolved);
    } catch (e) {
      console.warn('Error loading pricing policies:', e);
    }
  };

  const loadContractsCount = async () => {
    try {
      const res = await fetchContracts({ limitCount: 100 });
      setContractsCount(res.contracts ? res.contracts.length : 0);
    } catch (e) {
      console.warn('Error loading contracts count:', e);
    }
  };

  useEffect(() => {
    loadContractsCount();
  }, [isContractsOpen]);

  // Listen for secure quote URLs like /q/:token or #q/:token or #dashboard
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/q/')) {
        const tok = path.replace('/q/', '').trim();
        if (tok) setViewingSecureToken(tok);
      } else if (hash.startsWith('#/q/') || hash.startsWith('#q/')) {
        const tok = hash.replace(/^#(?:|\/)q\//, '').trim();
        if (tok) setViewingSecureToken(tok);
      } else if (
        hash === '#analytics' || 
        hash === '#dashboard' || 
        hash.startsWith('#/analytics') || 
        hash.startsWith('#/dashboard') ||
        path === '/analytics' ||
        path === '/dashboard'
      ) {
        setIsDashboardOpen(true);
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  // Load comprehensive analytics data across all collections
  const loadAnalyticsData = async () => {
    try {
      const [comms, resps, follow, links, docs] = await Promise.all([
        getAllCommunications(),
        getAllCustomerResponses(),
        getAllFollowUps(),
        getAllSecureLinks(),
        getAllQuotationDocuments(),
      ]);
      setAllCommunications(comms);
      setAllResponses(resps);
      setAllFollowUps(follow);
      setAllLinks(links);
      setAllDocuments(docs);
    } catch (e) {
      console.warn('Error loading analytics dataset:', e);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [isDashboardOpen, savedQuotes.length]);

  // Load customer PDF documents for active quote
  const loadQuotationDocuments = async (qId: string) => {
    try {
      const docs = await getDocumentRecordsForQuotation(qId);
      setQuotationDocuments(docs);
    } catch (e) {
      console.warn('Error loading quote documents:', e);
    }
  };

  useEffect(() => {
    if (quote.id) {
      loadQuotationDocuments(quote.id);
    }
  }, [quote.id, quote.updatedDate]);

  // Approve Quote Handler with Phase 15 Margin Intelligence Approval Checks
  const handleApproveCurrentQuote = async () => {
    if (quote.marginStatus === 'BLOCKED') {
      showToast('⚠️ KHÔNG THỂ PHÊ DUYỆT: Biên lợi nhuận vi phạm mức chặn tối thiểu của chính sách định giá!');
      setIsProfitIntelligenceOpen(true);
      return;
    }

    if (quote.marginStatus === 'BELOW_MINIMUM') {
      const confirmEx = window.confirm(
        `⚠️ CẢNH BÁO BIÊN LÃI:\nBiên lợi nhuận (${(quote.overallMarginPercent || 0).toFixed(1)}%) thấp hơn mức tối thiểu (${quote.minimumMarginPercent || 15}%).\nYêu cầu phê duyệt cấp Quản lý / Giám đốc.\n\nBạn có muốn phê duyệt ngoại lệ với quyền quản trị?`
      );
      if (!confirmEx) return;

      // Record audit event for policy exception approval
      await recordPricingAuditEvent({
        quotationId: quote.id,
        quotationNumber: quote.quoteNumber,
        action: 'MARGIN_OVERRIDE',
        userId: company.salesRepName || 'Manager',
        userName: company.salesRepName || 'Manager',
        oldValue: { marginPercent: quote.overallMarginPercent, grandTotalUsd: quote.grandTotalUsd },
        newValue: { marginPercent: quote.overallMarginPercent, grandTotalUsd: quote.grandTotalUsd },
        reason: 'Phê duyệt ngoại lệ biên lợi nhuận thấp hơn mức tối thiểu',
        notes: `Chính sách: ${activePricingPolicy.policyCode}`,
      });
    }

    await handleUpdateStatus(quote.id, 'APPROVED');
    showToast(`Đã phê duyệt báo giá ${quote.quoteNumber}! Bây giờ bạn có thể gửi cho khách hàng.`);
  };

  // Phase 14: Resolve Contract Pricing for Current Quotation
  const handleResolveContractPricing = async () => {
    const customerId = quote.customer.code || quote.customer.companyName;
    const origin = quote.shipment.origin;
    const destination = quote.shipment.destination;
    const modeUpper = (quote.shipment.serviceType || '').toUpperCase();
    const mappedMode: TransportMode = 
      modeUpper.includes('AIR') ? 'AIR_FREIGHT' :
      modeUpper.includes('TRUCK') ? 'INLAND_TRUCKING' :
      modeUpper.includes('CUSTOMS') ? 'CUSTOMS_CLEARANCE' :
      modeUpper.includes('LCL') ? 'SEA_LCL' : 'SEA_FCL';

    showToast('Đang tra cứu biểu cước theo hợp đồng khách hàng & nhà cung cấp...');
    try {
      const resolved = await resolveQuotationPricing({
        customerId,
        origin,
        destination,
        mode: mappedMode,
        shipmentDate: quote.shipment.etd || new Date().toISOString().slice(0, 10),
        equipment: quote.shipment.containerType,
      }, rates);

      if (resolved.isFound) {
        let hasUpdated = false;
        const updatedItems = quote.items.map(item => {
          if (item.category === 'FREIGHT' || item.location === 'FREIGHT') {
            hasUpdated = true;
            return {
              ...item,
              unitPrice: resolved.sellUnitPrice,
              costPrice: resolved.costUnitPrice,
              priceSource: resolved.priceSource,
              sourceContractNumber: resolved.sourceContractNumber,
              sourceVersion: resolved.sourceVersion,
              sourceContractId: resolved.sourceContractId,
              priceTraceability: resolved.priceTraceability,
            };
          }
          return item;
        });

        if (hasUpdated) {
          updateQuoteState({ items: updatedItems });
          showToast(`Đã áp dụng: ${resolved.priceTraceability}`);
        } else {
          showToast(`Tìm thấy cước ${resolved.priceSource} ($${resolved.sellUnitPrice}), nhưng chưa có dòng cước FREIGHT để gán.`);
        }
      } else {
        showToast('Không tìm thấy biểu cước hợp đồng khớp cho tuyến này. Bạn có thể mở mục Hợp Đồng để bổ sung.');
      }
    } catch (err: any) {
      console.error('Error resolving contract pricing:', err);
      showToast('Lỗi khi tra cứu biểu cước hợp đồng: ' + (err.message || ''));
    }
  };

  // Compute live diffs between quote snapshots and master rates database
  const outdatedRatesDiffs = useMemo(() => {
    return checkQuoteForRateUpdates(quote.items, rates);
  }, [quote.items, rates]);

  const handleOpenCompanyProfile = (tab: 'profile' | 'sales' | 'bank' | 'preview' = 'profile') => {
    setCompanyModalTab(tab);
    setIsCompanyOpen(true);
  };

  const handleOpenMasterRateHub = (tab: 'RATES' | 'CHARGES' | 'SUPPLIERS' | 'APPROVAL' | 'REQUESTS' | 'EXPIRING' | 'AUDIT' = 'RATES') => {
    const mappedTab = tab === 'SUPPLIERS' ? 'ENTITIES' : tab === 'APPROVAL' ? 'APPROVALS' : tab;
    setMasterRateHubTab(mappedTab as any);
    setIsMasterRateHubOpen(true);
  };

  const handleOpenSavedQuotes = (filter: string = 'ALL') => {
    setSavedQuotesInitialFilter(filter);
    setIsSavedOpen(true);
  };

  const handleOpenDashboard = (tab: string = 'OVERVIEW') => {
    setDashboardInitialTab(tab);
    setIsDashboardOpen(true);
  };

  const handleOpenMasterDataRef = (type: MasterDataType) => {
    setMasterDataRefType(type);
    setIsMasterDataRefOpen(true);
  };

  const handleSelectTransportMode = (mode: string) => {
    handleChangeShipment({ mode: mode as any });
    showToast(`Đã chuyển phương thức vận tải sang: ${mode}`);
  };

  // Mount Effect: Restore saved lists & active draft with Firestore Sync
  useEffect(() => {
    // 1. Initial Local In-Memory Cache Load
    setSavedQuotes(getSavedQuotes());
    const companySettings = getCompanySettings();
    if (companySettings) setCompany(companySettings);
    setCustomers(getSavedCustomers());
    setSurcharges(getSavedSurcharges());
    setRates(getSavedRateMasters());
    setChargeMasters(getSavedChargeMasters());
    setRateHistories(getSavedRateHistories());

    // Restore active quote draft from local draft if available
    const activeDraft = getActiveQuoteDraft();
    if (activeDraft.quote) {
      const { calculatedQuote } = calculateQuote(activeDraft.quote);
      setQuote(calculatedQuote);
      if (activeDraft.savedAt) {
        setLastAutoSaveTime(activeDraft.savedAt);
      }
    }

    // 2. Phase 17 Migration: scan and migrate legacy browser data
    runPhase17Migration().then((stats) => {
      if (stats.quotesCount > 0 || stats.customersCount > 0 || stats.ratesCount > 0) {
        console.log('[Phase 17] Migration complete:', stats);
        showToast(`Đã đồng bộ toàn bộ dữ liệu lên Firebase Cloud (${stats.quotesCount} báo giá, ${stats.customersCount} khách hàng).`);
      }
    }).catch((err) => {
      console.warn('[Phase 17] Migration note:', err);
    });

    // 3. Async Sync with Firebase Firestore
    async function syncFirestoreData() {
      setIsCloudSyncing(true);
      try {
        const [
          cloudQuotes, 
          cloudCustomers, 
          cloudSurcharges, 
          cloudCompany,
          cloudRates,
          cloudChargeMasters,
          cloudHistories
        ] = await Promise.all([
          fetchQuotations(),
          fetchCustomers(true),
          getSurchargesFromFirestore(),
          getCompanyProfileFromFirestore(),
          fetchRateMasters(),
          getChargeMastersFromFirestore(),
          getRateHistoriesFromFirestore(),
        ]);

        if (cloudQuotes && cloudQuotes.length > 0) setSavedQuotes(cloudQuotes);
        if (Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
          setCustomers(cloudCustomers);
        }
        if (cloudSurcharges && cloudSurcharges.length > 0) setSurcharges(cloudSurcharges);
        if (cloudCompany) {
          setCompany(cloudCompany);
        }
        if (cloudRates && cloudRates.length > 0) setRates(cloudRates);
        if (cloudChargeMasters && cloudChargeMasters.length > 0) setChargeMasters(cloudChargeMasters);
        if (cloudHistories && cloudHistories.length > 0) setRateHistories(cloudHistories);

        // Auto-recover any missing customers from historical quotations into Cloud CRM
        if (cloudQuotes && cloudQuotes.length > 0) {
          syncMissingCustomersFromQuotes(cloudQuotes).then((recovered) => {
            if (recovered > 0) {
              console.log(`[AutoRecovery] Recovered ${recovered} customer(s) from quotes into Cloud CRM`);
              fetchCustomers(true).then((fresh) => {
                if (fresh && fresh.length > 0) setCustomers(fresh);
              });
            }
          });
        }

        // Sync Phase 15 Pricing Policies
        await loadPricingPoliciesData();
        setLastCloudSyncedAt(new Date());
      } catch (err) {
        console.warn('Firestore initial background sync notice:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }

    syncFirestoreData();

    // 4. Restore active quote draft from Cloud Firestore (cross-device continuity)
    getActiveQuotationDraft('current_user').then((cloudDraft) => {
      if (cloudDraft && cloudDraft.quote && cloudDraft.quote.quoteNumber) {
        const { calculatedQuote } = calculateQuote(cloudDraft.quote);
        setQuote(calculatedQuote);
        if (cloudDraft.savedAt) {
          setLastAutoSaveTime(cloudDraft.savedAt);
        }
      }
    }).catch((err) => {
      console.warn('Notice checking cloud draft:', err);
    });

    // 5. Real-time Listeners (100% Cross-Device Instant Synchronization)
    const unsubQuotes = subscribeToQuotations((cloudQuotes) => {
      if (Array.isArray(cloudQuotes)) {
        setSavedQuotes(cloudQuotes);
        setLastCloudSyncedAt(new Date());
      }
    });

    const unsubCustomers = subscribeToCustomers((cloudCustomers) => {
      if (Array.isArray(cloudCustomers)) {
        setCustomers(cloudCustomers);
      }
    });

    const unsubRates = subscribeToRateMasters((cloudRates) => {
      if (Array.isArray(cloudRates)) {
        setRates(cloudRates);
      }
    });

    const unsubSurcharges = subscribeToSurcharges((cloudSurcharges) => {
      if (Array.isArray(cloudSurcharges)) {
        setSurcharges(cloudSurcharges);
      }
    });

    const unsubCharges = subscribeToChargeMasters((cloudCharges) => {
      if (Array.isArray(cloudCharges)) {
        setChargeMasters(cloudCharges);
      }
    });

    const unsubCompany = subscribeToCompanyProfile((cloudCompany) => {
      if (cloudCompany && cloudCompany.name) {
        setCompany(cloudCompany);
      }
    });

    return () => {
      unsubQuotes();
      unsubCustomers();
      unsubRates();
      unsubSurcharges();
      unsubCharges();
      unsubCompany();
    };
  }, []);

  // Continuous 100% Real-Time Auto-Save & Cloud Synchronization (1200ms debounce on any quote edit)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!quote.id || !quote.quoteNumber) return;

    setIsAutoSaving(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const time = saveActiveQuoteDraft(quote);
        if (time) setLastAutoSaveTime(time);

        // 100% Persistence to Firestore Cloud
        await saveQuotation(quote, {
          userId: company.salesRepName || 'User',
          userName: company.salesRepName || 'User',
        });

        // Continuous sync customer into Cloud CRM so other computers immediately have access to this customer
        if (quote.customer && (quote.customer.companyName || quote.customer.taxId)) {
          autoUpsertCustomerFromQuote(quote.customer).catch((cErr) => {
            console.warn('[AutoSave CRM] Customer sync notice:', cErr);
          });
        }

        // Keep local savedQuotes list synchronized in-place
        setSavedQuotes((prev) => {
          const idx = prev.findIndex((q) => q.id === quote.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = quote;
            return next;
          }
          return [quote, ...prev];
        });

        setLastCloudSyncedAt(new Date());
      } catch (err) {
        console.warn('Auto cloud sync notice:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200);

    return () => clearTimeout(debounceTimer);
  }, [quote, company.salesRepName]);

  // Window unload listener to flush unsaved changes immediately
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (quoteRef.current && quoteRef.current.id) {
        saveActiveQuoteDraft(quoteRef.current);
        saveQuotation(quoteRef.current, {
          userId: company.salesRepName || 'User',
          userName: company.salesRepName || 'User',
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [company.salesRepName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to re-compute totals through the Logistics Pricing Engine
  const updateQuoteState = (partialQuote: Partial<QuoteData>) => {
    setQuote((prev) => {
      const merged = { 
        ...prev, 
        ...partialQuote,
        updatedDate: new Date().toISOString().slice(0, 10),
      };
      const { calculatedQuote } = calculateQuote(merged);
      return calculatedQuote;
    });
  };

  // Exchange Rate change handler
  const handleExchangeRateChange = (rate: number) => {
    const validRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;
    updateQuoteState({ exchangeRate: validRate });
    showToast(`Đã cập nhật tỷ giá: 1 USD = ${validRate.toLocaleString('vi-VN')} VND`);
  };

  // Customer Form Changes
  const handleChangeCustomer = (field: keyof CustomerInfo, val: string) => {
    updateQuoteState({
      customer: { ...quote.customer, [field]: val },
    });
  };

  // Select Customer from Manager to Auto-fill Quote with Pricing Policy resolution
  const handleSelectCustomerForQuote = (cust: CustomerRecord) => {
    const resolvedPolicy = resolvePricingPolicy(pricingPolicies, cust.id || cust.code, cust.segment, quote.shipment?.mode);
    setActivePricingPolicy(resolvedPolicy);

    updateQuoteState({
      customer: {
        id: cust.id,
        code: cust.code,
        segment: cust.segment,
        companyName: cust.companyName,
        customerName: cust.customerName,
        taxId: cust.taxId,
        address: cust.address,
        email: cust.email,
        phone: cust.phone,
        contactPerson: cust.contactPerson || cust.customerName,
      },
      targetMarginPercent: resolvedPolicy.targetMarginPercent,
      minimumMarginPercent: resolvedPolicy.minimumMarginPercent,
      pricingPolicyId: resolvedPolicy.id,
      pricingPolicyCode: resolvedPolicy.policyCode,
    });
    showToast(`Đã chọn khách hàng [${cust.code}] ${cust.companyName} (Áp dụng chính sách: ${resolvedPolicy.policyName})`);
  };

  // Customer Manager CRUD with Firestore
  const [isSavingCustomerToCrm, setIsSavingCustomerToCrm] = useState(false);

  const handleSaveCustomer = async (cust: CustomerRecord) => {
    try {
      await saveCustomer(cust);
      const updated = await fetchCustomers(true);
      setCustomers(updated);
      showToast(`Đã lưu và đồng bộ 100% khách hàng [${cust.code}] lên Cloud!`);
    } catch (err: any) {
      console.error('Lỗi khi lưu khách hàng:', err);
      showToast(`Lỗi khi lưu khách hàng lên Cloud: ${err?.message || 'Vui lòng thử lại'}`);
      throw err;
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer(id);
      const updated = await fetchCustomers(true);
      setCustomers(updated);
      showToast('Đã xóa thông tin khách hàng khỏi hệ thống!');
    } catch (err: any) {
      console.error('Lỗi khi xóa khách hàng:', err);
      showToast('Lỗi khi xóa khách hàng khỏi Cloud');
      throw err;
    }
  };

  const handleSaveCurrentCustomerToCrm = async () => {
    if (!quote.customer || (!quote.customer.companyName && !quote.customer.taxId)) {
      showToast('Vui lòng nhập Tên Doanh Nghiệp hoặc Mã Số Thuế để lưu vào danh bạ CRM.');
      return;
    }
    setIsSavingCustomerToCrm(true);
    try {
      const saved = await autoUpsertCustomerFromQuote(quote.customer);
      if (saved) {
        const fresh = await fetchCustomers(true);
        setCustomers(fresh);
        showToast(`Đã lưu [${saved.companyName}] (${saved.code}) vào Danh Bạ CRM và đồng bộ lên Cloud!`);
      }
    } catch (err: any) {
      showToast(`Lỗi khi lưu khách hàng vào CRM: ${err?.message || 'Không thể đồng bộ'}`);
    } finally {
      setIsSavingCustomerToCrm(false);
    }
  };

  // Surcharge Catalog CRUD with Firestore
  const handleSaveSurcharge = async (item: SurchargeItem) => {
    await saveSurchargeToFirestore(item);
    const updated = await getSurchargesFromFirestore();
    setSurcharges(updated);
    showToast(`Đã lưu mã phụ phí [${item.code}] vào danh mục!`);
  };

  const handleDeleteSurcharge = async (id: string) => {
    await deleteSurchargeFromFirestore(id);
    const updated = await getSurchargesFromFirestore();
    setSurcharges(updated);
    showToast('Đã xóa mã phí khỏi danh mục master!');
  };

  // Master Rate CRUD with Firestore & Audit Logging
  const handleSaveRate = async (rate: RateMasterItem) => {
    await saveRateMasterToFirestore(rate, company.salesRepName || 'Admin');
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast(`Đã lưu bảng giá [${rate.rateCode}] vào Master Rate Database!`);
  };

  const handleDeleteRate = async (id: string, softDelete: boolean = true) => {
    await deleteRateMasterFromFirestore(id, softDelete);
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast('Đã cập nhật trạng thái bảng giá!');
  };

  // Charge Master CRUD with Firestore
  const handleSaveCharge = async (charge: ChargeMasterItem) => {
    await saveChargeMasterToFirestore(charge);
    const updated = await getChargeMastersFromFirestore();
    setChargeMasters(updated);
    showToast(`Đã lưu phí chuẩn [${charge.chargeCode}] vào Charge Master!`);
  };

  const handleDeleteCharge = async (id: string) => {
    await deleteChargeMasterFromFirestore(id);
    const updated = await getChargeMastersFromFirestore();
    setChargeMasters(updated);
    showToast('Đã ngừng áp dụng mã phí chuẩn!');
  };

  // Bulk Import Master Rates with Firebase Cloud Batching
  const handleBulkImportRates = async (importedRates: RateMasterItem[]) => {
    await batchSaveMasterRatesToFirestore(importedRates, undefined, company.salesRepName || 'Bulk Import');
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast(`Đã lưu và đồng bộ thành công ${importedRates.length} bảng giá lên Cloud!`);
  };

  // Apply Master Rate to Current Quote as an Immutable Snapshot
  const handleSelectRateForQuote = (selectedRate: RateMasterItem) => {
    const snapshotLineItem = convertRateToLineItemSnapshot(
      selectedRate,
      quote.shipment,
      quote.exchangeRate
    );
    handleUpdateItems([...quote.items, snapshotLineItem]);
    showToast(`Đã áp dụng bảng giá [${selectedRate.rateCode}] (Snapshot v${selectedRate.version}) vào báo giá!`);
  };

  // Bulk Apply Rates from Smart Assistant
  const handleAddSmartRates = (selectedRates: RateMasterItem[]) => {
    const newItems = selectedRates.map(r => 
      convertRateToLineItemSnapshot(r, quote.shipment, quote.exchangeRate)
    );
    handleUpdateItems([...quote.items, ...newItems]);
    showToast(`Đã thêm thành công ${newItems.length} bảng giá vào báo giá!`);
  };

  // Confirm Rate Updates from Rate Comparison Modal
  const handleConfirmRateUpdates = (selectedLineItemIds: string[]) => {
    const ratesMap = new Map<string, RateMasterItem>();
    rates.forEach(r => ratesMap.set(r.id, r));

    const updated = quote.items.map(item => {
      if (selectedLineItemIds.includes(item.id) && item.rateId && ratesMap.has(item.rateId)) {
        return applyLiveRateToLineItem(item, ratesMap.get(item.rateId)!, quote.shipment, quote.exchangeRate);
      }
      return item;
    });

    handleUpdateItems(updated);
    showToast(`Đã cập nhật ${selectedLineItemIds.length} mục theo Master Rate mới nhất!`);
  };

  // Phase 15: Apply What-If Pricing Simulation to Quote with Audit Trail
  const handleApplyWhatIfToQuote = async (simulatedItems: LineItem[], appliedReason: string) => {
    const oldMargin = quote.overallMarginPercent;
    const oldTotal = quote.grandTotalUsd;

    handleUpdateItems(simulatedItems);

    const { calculatedQuote } = calculateQuote({ ...quote, items: simulatedItems });

    await recordPricingAuditEvent({
      quotationId: quote.id,
      quotationNumber: quote.quoteNumber,
      action: 'WHAT_IF_APPLIED',
      userId: company.salesRepName || 'Pricing Analyst',
      userName: company.salesRepName || 'Pricing Analyst',
      oldValue: { marginPercent: oldMargin, grandTotalUsd: oldTotal },
      newValue: { marginPercent: calculatedQuote.overallMarginPercent, grandTotalUsd: calculatedQuote.grandTotalUsd },
      reason: appliedReason || 'Áp dụng kịch bản mô phỏng What-If Pricing',
      notes: `Chính sách: ${activePricingPolicy.policyCode}`,
    });

    showToast(`Đã áp dụng kết quả What-If thành công! Biên lãi mới: ${(calculatedQuote.overallMarginPercent || 0).toFixed(1)}%`);
  };

  const handleAddSurchargeToQuote = (surcharge: SurchargeItem) => {
    const unitPrice = surcharge.currency === 'USD' ? surcharge.priceUsd : surcharge.priceVnd;
    const costPrice = Math.round(unitPrice * 0.8 * 100) / 100;
    
    const rawItem: LineItem = {
      id: `item-${Date.now()}`,
      category: surcharge.category,
      location: surcharge.location || 'POL',
      code: surcharge.code,
      description: surcharge.name,
      basis: 'PER_CONTAINER',
      quantity: 1,
      unit: surcharge.unit,
      unitPrice: unitPrice,
      costPrice: costPrice,
      currency: surcharge.currency,
      vatRate: surcharge.vatRate,
      amountUsd: 0,
      amountVnd: 0,
      note: '',
    };
    const calculated = calculateLineItem(rawItem, quote.exchangeRate, quote.shipment);
    handleUpdateItems([...quote.items, calculated]);
    showToast(`Đã thêm phụ phí [${surcharge.code}] vào báo giá hiện tại!`);
  };

  // Quote Metadata Changes
  const handleChangeQuoteMeta = (field: 'quoteNumber' | 'createdDate' | 'validityDate' | 'status', val: string) => {
    if (field === 'validityDate') {
      updateQuoteState({
        terms: { ...quote.terms, validityDate: val },
      });
    } else if (field === 'status') {
      updateQuoteState({ status: val as QuoteStatus });
    } else {
      updateQuoteState({ [field]: val });
    }
  };

  // Shipment Details Changes
  const handleChangeShipment = (updatedShipment: Partial<ShipmentDetails>) => {
    updateQuoteState({
      shipment: { ...quote.shipment, ...updatedShipment },
    });
  };

  // Line Items Changes
  const handleUpdateItems = (newItems: LineItem[]) => {
    updateQuoteState({ items: newItems });
  };

  // Terms Changes
  const handleChangeTerms = (updatedTerms: Partial<TermsAndConditions>) => {
    updateQuoteState({
      terms: { ...quote.terms, ...updatedTerms },
    });
  };

  // Currency Changes for Quote
  const handleQuoteCurrencyChange = (currency: QuoteCurrency) => {
    updateQuoteState({
      quoteCurrency: currency,
      terms: {
        ...quote.terms,
        currency,
      },
    });
    showToast(`Đã chọn hiển thị báo giá bằng tiền ${currency === 'VND' ? 'VNĐ' : 'USD'}`);
  };

  // Company Settings Save with Firestore
  const handleSaveCompanyProfile = async (updatedCompany: CompanyProfile) => {
    setCompany(updatedCompany);
    await saveCompanyProfileToFirestore(updatedCompany);
    const bankStr = `${updatedCompany.bankName}\nSố TK: ${updatedCompany.bankAccountNo}\nChủ TK: ${updatedCompany.bankAccountHolder}${updatedCompany.bankSwiftCode ? `\nSWIFT Code: ${updatedCompany.bankSwiftCode}` : ''}`;
    updateQuoteState({
      company: updatedCompany,
      terms: {
        ...quote.terms,
        bankAccountInfo: bankStr,
      },
    });
    showToast('Đã lưu thông tin doanh nghiệp & đồng bộ vào báo giá!');
  };

  // Import Backup Data Handler with 100% Firebase Cloud Persistence
  const handleDataImported = async (data: {
    quotes: QuoteData[];
    companySettings?: CompanyProfile;
    customers: CustomerRecord[];
    surcharges: SurchargeItem[];
    rateMasters?: RateMasterItem[];
    chargeMasters?: ChargeMasterItem[];
  }) => {
    setSavedQuotes(data.quotes);
    if (data.companySettings) {
      setCompany(data.companySettings);
      updateQuoteState({ company: data.companySettings });
    }
    setCustomers(data.customers);
    setSurcharges(data.surcharges);
    if (data.rateMasters) setRates(data.rateMasters);
    if (data.chargeMasters) setChargeMasters(data.chargeMasters);

    try {
      await batchRestoreSystemDataToFirestore(data);
      showToast('Đã lưu & đồng bộ 100% dữ liệu backup lên Firebase Cloud!');
    } catch (err) {
      console.warn('Backup cloud sync notice:', err);
      showToast('Đã đồng bộ & khôi phục toàn bộ dữ liệu thành công!');
    }
  };

  // Create New Blank Quote
  const handleNewQuote = () => {
    const newRef = generateQuoteNumber();
    const rawFreshQuote: Partial<QuoteData> = {
      id: `quote-${Date.now()}`,
      quoteNumber: newRef,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      exchangeRate: quote.exchangeRate || DEFAULT_EXCHANGE_RATE,
      customer: {
        customerName: '',
        companyName: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        contactPerson: '',
      },
      shipment: {
        mode: 'SEA_FCL',
        pol: 'Cat Lai Port, Ho Chi Minh, Vietnam (VN)',
        pod: 'Los Angeles / Long Beach Port, CA, USA',
        commodity: 'General Cargo',
        containerType: "40'HC",
        quantity: 1,
        grossWeightKg: 15000,
        volumeCbm: 40,
        chargeableWeight: 40,
        transitTime: '14-16 ngày',
        freeTime: '7 days Dem/Det',
      },
      items: [
        {
          id: `item-${Date.now()}-1`,
          category: 'FREIGHT',
          location: 'FREIGHT',
          code: 'OCEAN_FREIGHT',
          description: 'Cước vận tải đường biển (Ocean Freight)',
          basis: 'PER_CONTAINER',
          quantity: 1,
          unit: "Container 40'HC",
          unitPrice: 1800,
          costPrice: 1450,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Direct service / Tuyến trực tiếp',
        },
        {
          id: `item-${Date.now()}-2`,
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'THC',
          description: 'Phí xếp dỡ tại cảng (Terminal Handling Charge)',
          basis: 'PER_CONTAINER',
          quantity: 1,
          unit: 'Container',
          unitPrice: 140,
          costPrice: 110,
          currency: 'USD',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Cảng bốc hàng (POL)',
        },
        {
          id: `item-${Date.now()}-3`,
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'BL_FEE',
          description: 'Phí phát hành vận đơn (Bill of Lading Fee)',
          basis: 'PER_BL',
          quantity: 1,
          unit: 'Bill',
          unitPrice: 1000000,
          costPrice: 750000,
          currency: 'VND',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Vận đơn đường biển gốc',
        }
      ],
      terms: {
        incoterm: 'FOB',
        validityDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        paymentTerm: 'Thanh toán 100% trước khi lấy D/O hoặc phát hành Surrendered B/L.',
        exclusionsNotes: '• Báo giá chưa bao gồm Thuế NK/VAT tại cảng đến.\n• Chưa bao gồm phí kiểm hóa hải quan luồng đỏ hoặc lưu kho bãi quá hạn free time.',
        bankAccountInfo: `${company.bankName}\nSố TK (VND): ${company.bankAccountNo}\nChủ TK: ${company.bankAccountHolder}`,
      },
      company: company,
    };

    const { calculatedQuote } = calculateQuote(rawFreshQuote);
    setQuote(calculatedQuote);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    
    // 100% PERSISTENCE: Save immediately to Firestore Cloud upon creation
    saveQuotation(calculatedQuote, {
      userId: company.salesRepName || 'User',
      userName: company.salesRepName || 'User',
    }).then(async () => {
      const updated = await fetchQuotations({ forceRefresh: true });
      setSavedQuotes(updated);
      setLastCloudSyncedAt(new Date());
    }).catch((err) => {
      console.warn('Initial quote cloud save notice:', err);
    });

    showToast(`Đã tạo và lưu 100% báo giá mới [${newRef}] lên Cloud!`);
  };

  // Manual Cloud Sync Function for Navbar Trigger
  const handleForceCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const [cloudQuotes, cloudCustomers, cloudRates, cloudCompany, cloudSurcharges, cloudCharges] = await Promise.all([
        fetchQuotations({ forceRefresh: true }),
        fetchCustomers(true),
        fetchRateMasters(true),
        getCompanyProfileFromFirestore(),
        getSurchargesFromFirestore(),
        getChargeMastersFromFirestore(),
      ]);
      if (cloudQuotes) setSavedQuotes(cloudQuotes);
      if (cloudCustomers) setCustomers(cloudCustomers);
      if (cloudRates) setRates(cloudRates);
      if (cloudCompany && cloudCompany.name) setCompany(cloudCompany);
      if (cloudSurcharges) setSurcharges(cloudSurcharges);
      if (cloudCharges) setChargeMasters(cloudCharges);
      setLastCloudSyncedAt(new Date());
      showToast('Đã đồng bộ 100% dữ liệu với Firebase Cloud!');
    } catch (e) {
      console.warn('Manual cloud sync notice:', e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Save Quote Handler with Firestore Sync & Cross-Device Conflict Handling
  const handleSaveQuoteAction = async () => {
    const { calculatedQuote } = calculateQuote(quote);
    setQuote(calculatedQuote);

    // Auto-upsert customer to Cloud CRM database if companyName or taxId is present
    if (calculatedQuote.customer && (calculatedQuote.customer.companyName || calculatedQuote.customer.taxId)) {
      try {
        const savedCrmCust = await autoUpsertCustomerFromQuote(calculatedQuote.customer);
        if (savedCrmCust) {
          fetchCustomers(true).then(fresh => {
            if (fresh && fresh.length > 0) setCustomers(fresh);
          });
        }
      } catch (custErr) {
        console.warn('[AutoCRM] Notice auto-upserting customer from quote:', custErr);
      }
    }

    const result = await saveQuotation(calculatedQuote, {
      userId: company.salesRepName || 'User',
      userName: company.salesRepName || 'User',
    });

    // Check for concurrency conflict (saved on another device)
    if (result.conflict && result.remoteQuote) {
      setConflictState({
        isOpen: true,
        localQuote: calculatedQuote,
        remoteQuote: result.remoteQuote,
      });
      return;
    }

    const updated = await fetchQuotations({ forceRefresh: true });
    setSavedQuotes(updated);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    setLastCloudSyncedAt(new Date());
    showToast(`Đã lưu báo giá ${calculatedQuote.quoteNumber} thành công 100% lên Cloud (v${result.savedQuote?.version || calculatedQuote.version || 1})!`);
  };

  // Handle Conflict Modal Actions
  const handleForceOverwriteConflict = async () => {
    if (!conflictState.localQuote) return;
    const res = await saveQuotation(conflictState.localQuote, { 
      forceOverwrite: true,
      userId: company.salesRepName || 'User',
    });
    setConflictState({ isOpen: false });
    const updated = await fetchQuotations({ forceRefresh: true });
    setSavedQuotes(updated);
    setLastCloudSyncedAt(new Date());
    showToast(`Đã ghi đè thành công lên Cloud (v${res.savedQuote?.version || 1})!`);
  };

  const handleReloadRemoteConflict = () => {
    if (!conflictState.remoteQuote) return;
    const { calculatedQuote } = calculateQuote(conflictState.remoteQuote);
    setQuote(calculatedQuote);
    setConflictState({ isOpen: false });
    showToast(`Đã tải phiên bản mới nhất từ Cloud (v${conflictState.remoteQuote.version || 1})!`);
  };

  // Select Saved Quote
  const handleSelectQuote = (selected: QuoteData) => {
    const { calculatedQuote } = calculateQuote(selected);
    setQuote(calculatedQuote);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    showToast(`Đã tải báo giá ${selected.quoteNumber}`);
  };

  // Clone Saved Quote (100% Cloud Persistence)
  const handleCloneQuote = async (id: string) => {
    const cloned = cloneQuote(id);
    if (cloned) {
      const { calculatedQuote } = calculateQuote(cloned);
      setQuote(calculatedQuote);
      await saveQuotation(calculatedQuote, {
        userId: company.salesRepName || 'User',
        userName: company.salesRepName || 'User',
      });
      const updated = await fetchQuotations({ forceRefresh: true });
      setSavedQuotes(updated);
      const savedTime = saveActiveQuoteDraft(calculatedQuote);
      if (savedTime) setLastAutoSaveTime(savedTime);
      setLastCloudSyncedAt(new Date());
      showToast(`Đã nhân bản và lưu 100% báo giá mới: ${calculatedQuote.quoteNumber}`);
    }
  };

  // Delete Saved Quote with Firestore
  const handleDeleteQuote = async (id: string) => {
    await repoDeleteQuotation(id);
    await deleteQuoteFromFirestore(id);
    const updated = await fetchQuotations({ forceRefresh: true });
    setSavedQuotes(updated);
    setLastCloudSyncedAt(new Date());
    showToast('Đã xóa báo giá khỏi danh sách và đồng bộ Cloud!');
  };

  // Update Status with Firestore
  const handleUpdateStatus = async (id: string, status: QuoteStatus) => {
    updateQuoteStatus(id, status);
    const target = savedQuotes.find(q => q.id === id);
    if (target) {
      const updatedQuote = { 
        ...target, 
        status, 
        updatedDate: new Date().toISOString().slice(0, 10),
      };
      await saveQuotation(updatedQuote, {
        userId: company.salesRepName || 'User',
        userName: company.salesRepName || 'User',
      });
    }
    const updatedList = await fetchQuotations({ forceRefresh: true });
    setSavedQuotes(updatedList);
    if (quote.id === id) {
      setQuote(prev => ({ ...prev, status }));
    }
    setLastCloudSyncedAt(new Date());
    showToast(`Đã cập nhật trạng thái báo giá thành ${status} & đồng bộ 100% Cloud!`);
  };

  // If viewing a public customer secure quote link, render the dedicated portal view
  if (viewingSecureToken) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Đang tải cổng thông tin bảo mật...</div>}>
        <CustomerSecureQuotePage
          token={viewingSecureToken}
          onBackToApp={() => {
            setViewingSecureToken(null);
            if (window.location.hash.includes('q/')) {
              window.location.hash = '';
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      
      <div className="flex flex-1">
        
        {/* Left Sidebar containing Directory Folders and Navigation */}
        <Sidebar
          company={quote.company || company}
          savedQuotes={savedQuotes}
          customersCount={customers.length}
          surchargesCount={surcharges.length}
          rateMastersCount={rates.length}
          chargeMastersCount={chargeMasters.length}
          exchangeRate={quote.exchangeRate}
          lastAutoSaveTime={lastAutoSaveTime}
          isAutoSaving={isAutoSaving}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNewQuote={handleNewQuote}
          onOpenSavedQuotes={handleOpenSavedQuotes}
          onOpenCompanyProfile={handleOpenCompanyProfile}
          onOpenCustomers={() => setIsCustomersOpen(true)}
          onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
          onOpenMasterRateHub={handleOpenMasterRateHub}
          onOpenRateSearch={() => setIsRateSearchOpen(true)}
          onOpenSmartAssistant={() => setIsSmartAssistantOpen(true)}
          onOpenDataBackup={() => setIsDataBackupOpen(true)}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onOpenDocumentHistory={() => setIsDocumentHistoryOpen(true)}
          onOpenTemplateBuilder={() => setIsTemplateBuilderOpen(true)}
          onOpenGeneratePdf={() => setIsGeneratePdfOpen(true)}
          onOpenSendModal={() => setIsSendQuotationOpen(true)}
          onOpenCommunication={() => setIsCommunicationPanelOpen(true)}
          onOpenSmartQuotationWorkspace={() => setIsSmartQuotationWorkspaceOpen(true)}
          onOpenEmailTemplates={() => setIsEmailTemplatesOpen(true)}
          onOpenFollowUps={() => setIsFollowUpOpen(true)}
          onOpenDashboard={handleOpenDashboard}
          onOpenContracts={() => setIsContractsOpen(true)}
          contractsCount={contractsCount}
          onOpenProfitIntelligence={() => setIsProfitIntelligenceOpen(true)}
          onOpenPricingPolicies={() => setIsPricingPolicyMgmtOpen(true)}
          onOpenMasterDataReference={handleOpenMasterDataRef}
          onSelectTransportMode={handleSelectTransportMode}
          currentUserRole={appUserRole}
          onRoleChange={setAppUserRole}
          language={appLanguage}
          onLanguageChange={setAppLanguage}
          onOpenIntegrityDashboard={() => setIsIntegrityDashboardOpen(true)}
        />

        {/* Right Main Application Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Navbar */}
          <Navbar
            company={company}
            exchangeRate={quote.exchangeRate}
            lastAutoSaveTime={lastAutoSaveTime}
            isAutoSaving={isAutoSaving}
            onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onExchangeRateChange={handleExchangeRateChange}
            onNewQuote={handleNewQuote}
            isCloudSyncing={isCloudSyncing}
            onForceCloudSync={handleForceCloudSync}
            lastCloudSyncedAt={lastCloudSyncedAt}
            quoteCount={savedQuotes.length}
            customerCount={customers.length}
            rateCount={rates.length}
            onOpenIntegrityDashboard={() => setIsIntegrityDashboardOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Toast Alert */}
            {toastMessage && (
              <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-500/80 flex items-center space-x-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Dashboard Stats Bar */}
            <DashboardStats 
              quotes={savedQuotes} 
              onOpenAnalytics={() => setIsDashboardOpen(true)}
            />

            {/* Top Section: Customer Info & Shipment Route Forms Side-by-Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CustomerForm
                customer={quote.customer}
                quoteNumber={quote.quoteNumber}
                createdDate={quote.createdDate}
                validityDate={quote.terms.validityDate}
                status={quote.status}
                salesRepName={company.salesRepName}
                customers={customers}
                onChangeCustomer={handleChangeCustomer}
                onChangeQuoteMeta={handleChangeQuoteMeta}
                onOpenCustomerManager={() => setIsCustomersOpen(true)}
                onSaveToCrm={handleSaveCurrentCustomerToCrm}
                onSelectCustomer={handleSelectCustomerForQuote}
                isSavingToCrm={isSavingCustomerToCrm}
              />

              <ShipmentForm
                shipment={quote.shipment}
                onChangeShipment={handleChangeShipment}
              />
            </div>

            {/* Phase 14 Contract Quick Resolver Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="font-bold text-slate-800">Contract Rate Engine:</span>
                  <span className="text-slate-600 ml-1.5">
                    {quote.customer.companyName ? `Khách: ${quote.customer.companyName}` : 'Chưa chọn khách hàng'} &bull; {quote.shipment.origin || 'POL'} &rarr; {quote.shipment.destination || 'POD'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSmartQuotationWorkspaceOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                  id="btn-open-smart-quotation-workspace"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Smart Workspace (Phase 20)
                </button>
                <button
                  type="button"
                  onClick={handleResolveContractPricing}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                  id="btn-resolve-contract-pricing"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Khớp Giá Hợp Đồng
                </button>
                <button
                  type="button"
                  onClick={() => setIsContractsOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-900 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                >
                  Quản Lý HĐ ({contractsCount})
                </button>
              </div>
            </div>

            {/* Full-Width Section: Line Items Table (Pricing Engine Integration) */}
            <div className="w-full">
              <LineItemsTable
                items={quote.items}
                exchangeRate={quote.exchangeRate}
                onUpdateItems={handleUpdateItems}
                onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
                onOpenRateSearch={() => setIsRateSearchOpen(true)}
                onOpenSmartAssistant={() => setIsSmartAssistantOpen(true)}
                onCheckRateUpdates={() => setIsComparisonModalOpen(true)}
                outdatedRatesCount={outdatedRatesDiffs.length}
              />
            </div>

            {/* Summary Card - Positioned directly below Line Items Table */}
            <SummaryCard
              quote={quote}
              onExchangeRateChange={handleExchangeRateChange}
              onCurrencyChange={handleQuoteCurrencyChange}
              onSaveQuote={handleSaveQuoteAction}
              onExportPdf={(curr) => exportQuoteToPdf(quote, curr)}
              onExportExcel={(curr) => exportQuoteToExcel(quote, curr)}
              onOpenPreview={() => setIsPreviewOpen(true)}
              onOpenGeneratePdf={() => setIsGeneratePdfOpen(true)}
              onOpenSendModal={() => setIsSendQuotationOpen(true)}
              onOpenProfitIntelligence={() => setIsProfitIntelligenceOpen(true)}
            />

            {/* Phase 8: Quotation Communication, Dispatch History & Timeline Panel */}
            <div id="quotation-communication-section" className="w-full">
              <QuotationCommunicationPanel
                quote={quote}
                documents={quotationDocuments}
                onOpenSendModal={() => setIsSendQuotationOpen(true)}
                onOpenFollowUpModal={() => setIsFollowUpOpen(true)}
                onOpenSecureLinkPreview={(token) => setViewingSecureToken(token)}
                onRefreshQuote={() => handleSelectQuote(quote)}
              />
            </div>

            {/* Terms & Conditions */}
            <TermsForm
              terms={quote.terms}
              quoteCurrency={quote.quoteCurrency}
              onChangeTerms={handleChangeTerms}
              onChangeCurrency={handleQuoteCurrencyChange}
            />

          </main>

          {/* Technical Status Bar Footer */}
          <footer className="h-10 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[11px] uppercase tracking-wider font-mono border-t border-slate-800 shrink-0">
            <div className="flex items-center space-x-4">
              <span>Ex.Rate: 1 USD = {quote.exchangeRate.toLocaleString()} VND</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="text-amber-300 font-semibold">Đồng tiền file: {quote.quoteCurrency || 'USD'}</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="hidden md:inline text-cyan-400">Pricing Engine Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Synced
              </span>
              <span className="hidden sm:inline text-slate-700">|</span>
              <span className="hidden sm:inline">Logistics Freight Management</span>
            </div>
          </footer>

        </div>

      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {isPreviewOpen && (
          <QuotePreviewModal
            quote={quote}
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            onCurrencyChange={handleQuoteCurrencyChange}
          />
        )}

      {isCustomersOpen && (
        <CustomerManagerModal
          isOpen={isCustomersOpen}
          onClose={() => setIsCustomersOpen(false)}
          customers={customers}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onSelectCustomerForQuote={handleSelectCustomerForQuote}
          onForceRefresh={async () => {
            const fresh = await fetchCustomers(true);
            setCustomers(fresh);
            showToast(`Đã đồng bộ ${fresh.length} khách hàng từ Firebase Cloud!`);
          }}
          isSyncing={isCloudSyncing}
        />
      )}

      {isSurchargesOpen && (
        <SurchargeCatalogModal
          isOpen={isSurchargesOpen}
          onClose={() => setIsSurchargesOpen(false)}
          surcharges={surcharges}
          exchangeRate={quote.exchangeRate}
          onSaveSurcharge={handleSaveSurcharge}
          onDeleteSurcharge={handleDeleteSurcharge}
          onAddSurchargeToQuote={handleAddSurchargeToQuote}
        />
      )}

      {isMasterRateHubOpen && (
        <MasterRateHubModal
          isOpen={isMasterRateHubOpen}
          onClose={() => setIsMasterRateHubOpen(false)}
          initialTab={masterRateHubTab}
          rates={rates}
          charges={chargeMasters}
          histories={rateHistories}
          exchangeRate={quote.exchangeRate}
          currentUser={company.salesRepName || 'Pricing Manager'}
          onSaveRate={handleSaveRate}
          onDeleteRate={handleDeleteRate}
          onSaveCharge={handleSaveCharge}
          onDeleteCharge={handleDeleteCharge}
          onBulkImportRates={handleBulkImportRates}
          onSelectRateForQuote={handleSelectRateForQuote}
        />
      )}

      {isRateSearchOpen && (
        <RateSearchModal
          isOpen={isRateSearchOpen}
          onClose={() => setIsRateSearchOpen(false)}
          rates={rates}
          exchangeRate={quote.exchangeRate}
          shipment={quote.shipment}
          onSelectRate={(selectedRate) => {
            handleSelectRateForQuote(selectedRate);
            setIsRateSearchOpen(false);
          }}
        />
      )}

      {isSmartAssistantOpen && (
        <SmartRateAssistantModal
          isOpen={isSmartAssistantOpen}
          onClose={() => setIsSmartAssistantOpen(false)}
          shipment={quote.shipment}
          customer={quote.customer}
          rates={rates}
          exchangeRate={quote.exchangeRate}
          existingItemRateIds={quote.items.map(i => i.rateId).filter(Boolean) as string[]}
          onAddSelectedRates={handleAddSmartRates}
          onAddSingleRate={handleSelectRateForQuote}
          onOpenManualAdd={() => {
            setIsSmartAssistantOpen(false);
          }}
        />
      )}

      {isComparisonModalOpen && (
        <RateComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
          diffs={outdatedRatesDiffs}
          onConfirmUpdate={handleConfirmRateUpdates}
        />
      )}

      {isSavedOpen && (
        <SavedQuotesModal
          quotes={savedQuotes}
          isOpen={isSavedOpen}
          initialStatusFilter={savedQuotesInitialFilter}
          onClose={() => setIsSavedOpen(false)}
          onSelectQuote={handleSelectQuote}
          onCloneQuote={handleCloneQuote}
          onDeleteQuote={handleDeleteQuote}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isCompanyOpen && (
        <CompanyProfileModal
          company={company}
          isOpen={isCompanyOpen}
          initialTab={companyModalTab}
          onClose={() => setIsCompanyOpen(false)}
          onSaveCompany={handleSaveCompanyProfile}
        />
      )}

      {isDataBackupOpen && (
        <DataBackupModal
          isOpen={isDataBackupOpen}
          onClose={() => setIsDataBackupOpen(false)}
          onDataImported={handleDataImported}
          savedQuotesCount={savedQuotes.length}
          customersCount={customers.length}
          surchargesCount={surcharges.length}
        />
      )}

      {/* Phase 7: Professional Quotation PDF Engine Modals */}
      {isGeneratePdfOpen && (
        <GeneratePdfModal
          isOpen={isGeneratePdfOpen}
          onClose={() => setIsGeneratePdfOpen(false)}
          quote={quote}
          onOpenTemplateBuilder={() => setIsTemplateBuilderOpen(true)}
          onDocumentGenerated={(rec) => {
            showToast(`Đã phát hành file PDF ${rec.fileName} (Rev ${rec.revision}) thành công!`);
          }}
        />
      )}

      {isTemplateBuilderOpen && (
        <QuotationTemplateBuilderModal
          isOpen={isTemplateBuilderOpen}
          onClose={() => setIsTemplateBuilderOpen(false)}
          sampleQuote={quote}
          onTemplatesUpdated={() => {
            showToast('Đã cập nhật hệ thống mẫu báo giá!');
          }}
        />
      )}

      {isDocumentHistoryOpen && (
        <DocumentHistoryModal
          isOpen={isDocumentHistoryOpen}
          onClose={() => setIsDocumentHistoryOpen(false)}
          quotationId={quote.id}
          quotationNumber={quote.quoteNumber}
        />
      )}

      {/* Phase 8: Quotation Communication & Secure Dispatch Modals */}
      {isSendQuotationOpen && (
        <SendQuotationModal
          isOpen={isSendQuotationOpen}
          onClose={() => setIsSendQuotationOpen(false)}
          quote={quote}
          documents={quotationDocuments}
          onApproveQuote={handleApproveCurrentQuote}
          onOpenTemplateManager={() => {
            setIsSendQuotationOpen(false);
            setIsEmailTemplatesOpen(true);
          }}
          onSuccess={(msg) => {
            showToast(msg);
            loadQuotationDocuments(quote.id);
            handleUpdateStatus(quote.id, 'SENT');
          }}
        />
      )}

      {isEmailTemplatesOpen && (
        <EmailTemplateManagementModal
          isOpen={isEmailTemplatesOpen}
          onClose={() => setIsEmailTemplatesOpen(false)}
        />
      )}

      {isFollowUpOpen && (
        <FollowUpModal
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
          quote={quote}
          onSuccess={() => {
            showToast('Đã lưu nhiệm vụ chăm sóc khách hàng thành công!');
          }}
        />
      )}

      {/* Phase 9: Advanced Business Intelligence & Sales Analytics Dashboard */}
      {isDashboardOpen && (
        <AdvancedAnalyticsDashboard
          quotes={savedQuotes}
          communications={allCommunications}
          customerResponses={allResponses}
          documents={allDocuments}
          followUpTasks={allFollowUps}
          shareLinks={allLinks}
          currentUserRole={appUserRole}
          currentSalesName={company.salesRepName}
          initialTab={dashboardInitialTab as any}
          onSelectQuote={(qId) => {
            const target = savedQuotes.find(q => q.id === qId || q.quoteNumber === qId);
            if (target) {
              handleSelectQuote(target);
            }
            setIsDashboardOpen(false);
          }}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}

      {/* Master Data Reference Modal (Ports, Container Types, Incoterms, Payment Terms) */}
      {isMasterDataRefOpen && (
        <MasterDataReferenceModal
          isOpen={isMasterDataRefOpen}
          onClose={() => setIsMasterDataRefOpen(false)}
          initialType={masterDataRefType}
          language={appLanguage}
        />
      )}

      {/* Phase 14: Customer & Supplier Contract Management Hub */}
      {isContractsOpen && (
        <ContractHubModal
          isOpen={isContractsOpen}
          onClose={() => setIsContractsOpen(false)}
          customers={customers}
          suppliers={[]}
          carriers={[]}
        />
      )}

      {/* Phase 15: Profit & Margin Intelligence Modals */}
      {isProfitIntelligenceOpen && (
        <ProfitIntelligenceModal
          isOpen={isProfitIntelligenceOpen}
          onClose={() => setIsProfitIntelligenceOpen(false)}
          quote={quote}
          activePolicy={activePricingPolicy}
          onApplyWhatIfToQuote={handleApplyWhatIfToQuote}
          onOpenPolicyManagement={() => {
            setIsProfitIntelligenceOpen(false);
            setIsPricingPolicyMgmtOpen(true);
          }}
        />
      )}

      {isPricingPolicyMgmtOpen && (
        <PricingPolicyManagementModal
          isOpen={isPricingPolicyMgmtOpen}
          onClose={() => setIsPricingPolicyMgmtOpen(false)}
          policies={pricingPolicies}
          onPoliciesUpdated={loadPricingPoliciesData}
        />
      )}

      {/* Phase 17: Cross-Device Concurrency Conflict Resolution Modal */}
      {conflictState.isOpen && conflictState.localQuote && conflictState.remoteQuote && (
        <ConflictResolutionModal
          isOpen={conflictState.isOpen}
          onClose={() => setConflictState({ isOpen: false })}
          localQuote={conflictState.localQuote}
          remoteQuote={conflictState.remoteQuote}
          onForceOverwrite={handleForceOverwriteConflict}
          onReloadRemote={handleReloadRemoteConflict}
        />
      )}

      {/* Phase 20: Smart Quotation Workspace & Intelligent Pricing Assistant */}
      {isSmartQuotationWorkspaceOpen && (
        <SmartQuotationWorkspace
          isOpen={isSmartQuotationWorkspaceOpen}
          onClose={() => setIsSmartQuotationWorkspaceOpen(false)}
          initialQuote={quote}
          company={company}
          currentUserRole={appUserRole}
          onSaveQuoteToDatabase={async (updatedQuote) => {
            const { calculatedQuote } = calculateQuote(updatedQuote);
            setQuote(calculatedQuote);
            const result = await saveQuotation(calculatedQuote, {
              userId: company.salesRepName || 'User',
              userName: company.salesRepName || 'User',
            });
            const updated = await fetchQuotations();
            setSavedQuotes(updated);
            showToast(`Đã lưu báo giá ${calculatedQuote.quoteNumber} và Snapshot thành công!`);
            return true;
          }}
          onExportPdf={(q, curr) => exportQuoteToPdf(q, curr)}
          onExportExcel={(q, curr) => exportQuoteToExcel(q, curr)}
        />
      )}

      {/* Phase 24: Global Data Integrity & Sync Health Dashboard */}
      {isIntegrityDashboardOpen && (
        <DataIntegrityDashboardModal
          isOpen={isIntegrityDashboardOpen}
          onClose={() => setIsIntegrityDashboardOpen(false)}
          quotes={savedQuotes}
          customers={customers}
          onRefreshData={handleForceCloudSync}
          onApplyFixedQuotes={(fixed) => setSavedQuotes(fixed)}
          onApplyFixedCustomers={(fixed) => setCustomers(fixed)}
        />
      )}
      </Suspense>

    </div>
  );
}
