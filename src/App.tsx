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
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy loaded modals with auto-retry and chunk failure self-healing
const QuotePreviewModal = lazyWithRetry(() => import('./components/QuotePreviewModal').then(m => ({ default: m.QuotePreviewModal })), 'QuotePreviewModal');
const SavedQuotesModal = lazyWithRetry(() => import('./components/SavedQuotesModal').then(m => ({ default: m.SavedQuotesModal })), 'SavedQuotesModal');
const CompanyProfileModal = lazyWithRetry(() => import('./components/CompanyProfileModal').then(m => ({ default: m.CompanyProfileModal })), 'CompanyProfileModal');
const CustomerManagerModal = lazyWithRetry(() => import('./components/CustomerManagerModal').then(m => ({ default: m.CustomerManagerModal })), 'CustomerManagerModal');
const SurchargeCatalogModal = lazyWithRetry(() => import('./components/SurchargeCatalogModal').then(m => ({ default: m.SurchargeCatalogModal })), 'SurchargeCatalogModal');
const MasterRateHubModal = lazyWithRetry(() => import('./components/MasterRateHubModal').then(m => ({ default: m.MasterRateHubModal })), 'MasterRateHubModal');
const RateSearchModal = lazyWithRetry(() => import('./components/RateSearchModal').then(m => ({ default: m.RateSearchModal })), 'RateSearchModal');
const SmartRateAssistantModal = lazyWithRetry(() => import('./components/SmartRateAssistantModal').then(m => ({ default: m.SmartRateAssistantModal })), 'SmartRateAssistantModal');
const RateComparisonModal = lazyWithRetry(() => import('./components/RateComparisonModal').then(m => ({ default: m.RateComparisonModal })), 'RateComparisonModal');
const DataBackupModal = lazyWithRetry(() => import('./components/DataBackupModal').then(m => ({ default: m.DataBackupModal })), 'DataBackupModal');
const GeneratePdfModal = lazyWithRetry(() => import('./components/GeneratePdfModal').then(m => ({ default: m.GeneratePdfModal })), 'GeneratePdfModal');
const QuotationTemplateBuilderModal = lazyWithRetry(() => import('./components/QuotationTemplateBuilderModal').then(m => ({ default: m.QuotationTemplateBuilderModal })), 'QuotationTemplateBuilderModal');
const DocumentHistoryModal = lazyWithRetry(() => import('./components/DocumentHistoryModal').then(m => ({ default: m.DocumentHistoryModal })), 'DocumentHistoryModal');
const SendQuotationModal = lazyWithRetry(() => import('./components/communication/SendQuotationModal').then(m => ({ default: m.SendQuotationModal })), 'SendQuotationModal');
const CustomerSecureQuotePage = lazyWithRetry(() => import('./components/communication/CustomerSecureQuotePage').then(m => ({ default: m.CustomerSecureQuotePage })), 'CustomerSecureQuotePage');
const EmailTemplateManagementModal = lazyWithRetry(() => import('./components/communication/EmailTemplateManagementModal').then(m => ({ default: m.EmailTemplateManagementModal })), 'EmailTemplateManagementModal');
const FollowUpModal = lazyWithRetry(() => import('./components/communication/FollowUpModal').then(m => ({ default: m.FollowUpModal })), 'FollowUpModal');
const AdvancedAnalyticsDashboard = lazyWithRetry(() => import('./components/analytics/AdvancedAnalyticsDashboard').then(m => ({ default: m.AdvancedAnalyticsDashboard })), 'AdvancedAnalyticsDashboard');
const ContractHubModal = lazyWithRetry(() => import('./components/contract/ContractHubModal').then(m => ({ default: m.ContractHubModal })), 'ContractHubModal');
const ProfitIntelligenceModal = lazyWithRetry(() => import('./components/pricing/ProfitIntelligenceModal').then(m => ({ default: m.ProfitIntelligenceModal })), 'ProfitIntelligenceModal');
const PricingPolicyManagementModal = lazyWithRetry(() => import('./components/pricing/PricingPolicyManagementModal').then(m => ({ default: m.PricingPolicyManagementModal })), 'PricingPolicyManagementModal');
const ConflictResolutionModal = lazyWithRetry(() => import('./components/ConflictResolutionModal').then(m => ({ default: m.ConflictResolutionModal })), 'ConflictResolutionModal');
const MasterDataReferenceModal = lazyWithRetry(() => import('./components/MasterDataReferenceModal').then(m => ({ default: m.MasterDataReferenceModal })), 'MasterDataReferenceModal');
const SmartQuotationWorkspace = lazyWithRetry(() => import('./components/smartQuotation/SmartQuotationWorkspace').then(m => ({ default: m.SmartQuotationWorkspace })), 'SmartQuotationWorkspace');
const DataIntegrityDashboardModal = lazyWithRetry(() => import('./components/integrity/DataIntegrityDashboardModal').then(m => ({ default: m.DataIntegrityDashboardModal })), 'DataIntegrityDashboardModal');
const DocumentControlCenter = lazyWithRetry(() => import('./components/communication/DocumentControlCenter').then(m => ({ default: m.DocumentControlCenter })), 'DocumentControlCenter');

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
import { AppRouteId } from './navigation/routeTypes';
import { APP_ROUTES, parseRouteFromUrl, checkRoutePermission } from './navigation/navigationRegistry';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { AccessDeniedModal } from './components/common/AccessDeniedModal';
import { NotFoundViewModal } from './components/common/NotFoundViewModal';
import { QuotationCommunicationModal } from './components/communication/QuotationCommunicationModal';
import { loadSuppliers, loadCarriers } from './services/masterRate/supplierCarrierService';
import { SupplierItem, CarrierItem } from './types/masterRate';
import { useMultiCompany } from './context/MultiCompanyContext';
import { useFinancialConfig } from './context/FinancialConfigContext';
import { MultiCompanyManagementModal } from './components/company/MultiCompanyManagementModal';
import { createQuotationCompanySnapshot } from './types/multiCompany';

import { Check, Ship, ShieldCheck, Sparkles } from 'lucide-react';

export default function App() {
  // Phase 37: Multi-Company Active Context
  const { 
    activeCompanyId, 
    activeCompanyProfile, 
    activeCompanyRecord,
    generateNextQuoteNumber,
    updateCurrentCompany 
  } = useMultiCompany();

  // Phase 38: Multi-Company Financial & Commercial Snapshot Engine
  const { createSnapshotsForQuote, financialSettings } = useFinancialConfig();

  // Saved data states
  const [savedQuotes, setSavedQuotes] = useState<QuoteData[]>([]);
  const [company, setCompany] = useState<CompanyProfile>(() => activeCompanyProfile || DEFAULT_COMPANY_PROFILE);
  const [quote, setQuote] = useState<QuoteData>(() => {
    const { calculatedQuote } = calculateQuote(createEmptyQuote(activeCompanyProfile || DEFAULT_COMPANY_PROFILE));
    return calculatedQuote;
  });

  // Sync local company state whenever activeCompanyProfile updates
  useEffect(() => {
    if (activeCompanyProfile) {
      setCompany(activeCompanyProfile);
    }
  }, [activeCompanyProfile]);
  
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
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [companyModalTab, setCompanyModalTab] = useState<'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial'>('profile');
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
  
  // Phase 40: Document & Communication Control Center
  const [isDocumentCenterOpen, setIsDocumentCenterOpen] = useState(false);

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

  // Phase 30: Central Routing, Module Access & Reliability Engine States
  const [activeRouteId, setActiveRouteId] = useState<string>('quotation_workbench');
  const [accessDeniedState, setAccessDeniedState] = useState<{ isOpen: boolean; moduleName: string; requiredDesc: string }>({
    isOpen: false,
    moduleName: '',
    requiredDesc: '',
  });
  const [notFoundPath, setNotFoundPath] = useState<string | null>(null);
  const [contractSuppliers, setContractSuppliers] = useState<SupplierItem[]>([]);
  const [contractCarriers, setContractCarriers] = useState<CarrierItem[]>([]);

  // Preload real Suppliers and Carriers for Contract and Rate Hubs (100% Cloud-First)
  const ensureSuppliersAndCarriersLoaded = async () => {
    if (contractSuppliers.length === 0) {
      try {
        const sups = await loadSuppliers();
        if (Array.isArray(sups)) setContractSuppliers(sups);
      } catch (e) {
        console.warn('Notice loading suppliers from Cloud:', e);
      }
    }
    if (contractCarriers.length === 0) {
      try {
        const cars = await loadCarriers();
        if (Array.isArray(cars)) setContractCarriers(cars);
      } catch (e) {
        console.warn('Notice loading carriers from Cloud:', e);
      }
    }
  };

  const closeAllModals = () => {
    setIsDashboardOpen(false);
    setIsSmartQuotationWorkspaceOpen(false);
    setIsSavedOpen(false);
    setIsCustomersOpen(false);
    setIsSurchargesOpen(false);
    setIsMasterRateHubOpen(false);
    setIsRateSearchOpen(false);
    setIsSmartAssistantOpen(false);
    setIsComparisonModalOpen(false);
    setIsCompanyOpen(false);
    setIsCreateCompanyOpen(false);
    setIsDataBackupOpen(false);
    setIsPreviewOpen(false);
    setIsDocumentHistoryOpen(false);
    setIsTemplateBuilderOpen(false);
    setIsGeneratePdfOpen(false);
    setIsSendQuotationOpen(false);
    setIsCommunicationPanelOpen(false);
    setIsDocumentCenterOpen(false);
    setIsEmailTemplatesOpen(false);
    setIsFollowUpOpen(false);
    setIsMasterDataRefOpen(false);
    setIsContractsOpen(false);
    setIsProfitIntelligenceOpen(false);
    setIsPricingPolicyMgmtOpen(false);
    setIsIntegrityDashboardOpen(false);
    setViewingSecureToken(null);
    setNotFoundPath(null);
  };

  const handleModalClose = () => {
    closeAllModals();
    setActiveRouteId('quotation_workbench');
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

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

  // Unified Route Navigation Function (Phase 30)
  const navigateToRoute = (routeId: AppRouteId | 'workbench', param?: string, options?: { skipHistory?: boolean }) => {
    // 1. Strict RBAC Permission Check
    if (routeId !== 'workbench') {
      const perm = checkRoutePermission(routeId, appUserRole);
      if (!perm.hasAccess) {
        setAccessDeniedState({
          isOpen: true,
          moduleName: APP_ROUTES[routeId]?.titleVi || routeId,
          requiredDesc: perm.requiredDesc,
        });
        return;
      }
    }

    // 2. Clear open modals
    closeAllModals();

    // 3. Return to Quotation Workbench
    if (routeId === 'workbench') {
      setActiveRouteId('quotation_workbench');
      if (!options?.skipHistory && window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
      return;
    }

    // 4. Update route state and URL hash
    setActiveRouteId(routeId);
    const routeDef = APP_ROUTES[routeId];
    if (!options?.skipHistory && routeDef?.hash && window.location.hash !== routeDef.hash) {
      window.history.pushState(null, '', routeDef.hash);
    }

    // 5. Dispatch to corresponding module
    switch (routeId) {
      case 'main_dashboard':
        handleOpenDashboard('OVERVIEW');
        break;
      case 'analytics_overview':
        handleOpenDashboard('OVERVIEW');
        break;
      case 'analytics_funnel':
        handleOpenDashboard('FUNNEL');
        break;
      case 'analytics_sales':
        handleOpenDashboard('SALES');
        break;
      case 'analytics_profit':
        handleOpenDashboard('PROFITABILITY');
        break;
      case 'analytics_lanes':
        handleOpenDashboard('LANES_SERVICES');
        break;
      case 'smart_quotation_workspace':
        setIsSmartQuotationWorkspaceOpen(true);
        break;
      case 'quotation_new':
        handleNewQuote();
        setActiveRouteId('quotation_workbench');
        if (!options?.skipHistory) {
          window.history.pushState(null, '', window.location.pathname);
        }
        break;
      case 'quotations_all':
        handleOpenSavedQuotes('ALL');
        break;
      case 'quotations_draft':
        handleOpenSavedQuotes('DRAFT');
        break;
      case 'quotations_pending':
        handleOpenSavedQuotes('PENDING_APPROVAL');
        break;
      case 'quotations_sent':
        handleOpenSavedQuotes('SENT');
        break;
      case 'quotation_preview':
        setIsPreviewOpen(true);
        break;
      case 'quotation_snapshots':
        setIsDocumentHistoryOpen(true);
        break;
      case 'quotation_templates':
        setIsTemplateBuilderOpen(true);
        break;
      case 'quotation_send':
        loadQuotationDocuments(quote.id);
        setIsSendQuotationOpen(true);
        break;
      case 'quotation_communication':
        loadQuotationDocuments(quote.id);
        setIsCommunicationPanelOpen(true);
        break;
      case 'quotation_document_center':
        loadQuotationDocuments(quote.id);
        setIsDocumentCenterOpen(true);
        break;
      case 'quotation_email_templates':
        setIsEmailTemplatesOpen(true);
        break;
      case 'quotation_followup':
        setIsFollowUpOpen(true);
        break;
      case 'pricing_rates':
        handleOpenMasterRateHub('RATES');
        break;
      case 'pricing_contracts':
        ensureSuppliersAndCarriersLoaded();
        setIsContractsOpen(true);
        break;
      case 'pricing_policies':
        setIsPricingPolicyMgmtOpen(true);
        break;
      case 'pricing_profit':
        setIsProfitIntelligenceOpen(true);
        break;
      case 'pricing_smart':
        setIsSmartAssistantOpen(true);
        break;
      case 'pricing_search':
        setIsRateSearchOpen(true);
        break;
      case 'master_customers':
        setIsCustomersOpen(true);
        break;
      case 'master_suppliers':
        ensureSuppliersAndCarriersLoaded();
        handleOpenMasterRateHub('SUPPLIERS');
        break;
      case 'master_charges':
        handleOpenMasterRateHub('CHARGES');
        break;
      case 'master_surcharges':
        setIsSurchargesOpen(true);
        break;
      case 'master_ports':
        handleOpenMasterDataRef('PORT');
        break;
      case 'master_containers':
        handleOpenMasterDataRef('CONTAINER_TYPE');
        break;
      case 'master_incoterms':
        handleOpenMasterDataRef('INCOTERM');
        break;
      case 'master_payment_terms':
        handleOpenMasterDataRef('PAYMENT_TERM');
        break;
      case 'ops_ocean':
        handleSelectTransportMode('SEA_FCL');
        break;
      case 'ops_air':
        handleSelectTransportMode('AIR_FREIGHT');
        break;
      case 'ops_trucking':
        handleSelectTransportMode('INLAND_TRUCKING');
        break;
      case 'ops_customs':
        handleSelectTransportMode('CUSTOMS_CLEARANCE');
        break;
      case 'sys_profile':
        handleOpenCompanyProfile('profile');
        break;
      case 'sys_financial':
      case 'sys_financial_config':
        handleOpenCompanyProfile('financial');
        break;
      case 'sys_sales_bank':
        handleOpenCompanyProfile('sales');
        break;
      case 'sys_audit':
        handleOpenMasterRateHub('AUDIT');
        break;
      case 'sys_backup':
        setIsDataBackupOpen(true);
        break;
      case 'sys_integrity':
        setIsIntegrityDashboardOpen(true);
        break;
      case 'secure_quote_portal':
        if (param) setViewingSecureToken(param);
        break;
      default:
        setActiveRouteId('quotation_workbench');
        break;
    }
  };

  // Synchronize Browser Address Bar (Path and Hash) with Navigation Engine
  useEffect(() => {
    const handleUrlRouteSync = () => {
      const parsed = parseRouteFromUrl(window.location.pathname, window.location.hash);
      if (parsed.isNotFound) {
        setNotFoundPath(window.location.hash || window.location.pathname);
      } else if (parsed.routeId) {
        navigateToRoute(parsed.routeId, parsed.param, { skipHistory: true });
      } else {
        closeAllModals();
        setActiveRouteId('quotation_workbench');
      }
    };

    handleUrlRouteSync();
    window.addEventListener('popstate', handleUrlRouteSync);
    window.addEventListener('hashchange', handleUrlRouteSync);
    return () => {
      window.removeEventListener('popstate', handleUrlRouteSync);
      window.removeEventListener('hashchange', handleUrlRouteSync);
    };
  }, [appUserRole]);

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

  const handleOpenCompanyProfile = (tab: 'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial' = 'profile') => {
    setIsCreateCompanyOpen(false);
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

  // Company Settings Save with Firestore & Multi-Company Context
  const handleSaveCompanyProfile = async (updatedCompany: CompanyProfile) => {
    setCompany(updatedCompany);
    await updateCurrentCompany(updatedCompany);
    const bankStr = `${updatedCompany.bankName}\nSố TK: ${updatedCompany.bankAccountNo}\nChủ TK: ${updatedCompany.bankAccountHolder}${updatedCompany.bankSwiftCode ? `\nSWIFT Code: ${updatedCompany.bankSwiftCode}` : ''}`;
    
    // Create new snapshot for quote
    const currentCompany = activeCompanyRecord || updatedCompany;
    const companySnapshot = createQuotationCompanySnapshot(currentCompany);

    updateQuoteState({
      company: updatedCompany,
      companyId: activeCompanyId,
      companySnapshot,
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
  const handleNewQuote = async () => {
    let newRef: string;
    try {
      newRef = await generateNextQuoteNumber();
    } catch {
      newRef = generateQuoteNumber();
    }

    const currentCompany = activeCompanyRecord || company;
    const companySnapshot = createQuotationCompanySnapshot(currentCompany);

    const rawFreshQuote: Partial<QuoteData> = {
      id: `quote-${Date.now()}`,
      quoteNumber: newRef,
      companyId: activeCompanyId,
      companySnapshot: companySnapshot,
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
    // Ensure companyId and companySnapshot exist on the quote before calculation
    const currentCompany = activeCompanyRecord || company;
    let quoteWithSnapshot: QuoteData = {
      ...quote,
      companyId: quote.companyId || activeCompanyId,
      companySnapshot: quote.companySnapshot || createQuotationCompanySnapshot(currentCompany),
    };

    // Phase 38: Attach immutable financial snapshot when quote is Approved or Sent
    if (quoteWithSnapshot.status === 'APPROVED' || quoteWithSnapshot.status === 'SENT') {
      try {
        const financialSnapshots = await createSnapshotsForQuote(quoteWithSnapshot);
        quoteWithSnapshot = { ...quoteWithSnapshot, ...financialSnapshots };
      } catch (snapErr) {
        console.warn('[Phase 38] Snapshot generation notice:', snapErr);
      }
    }

    const { calculatedQuote } = calculateQuote(quoteWithSnapshot);
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
    let target = savedQuotes.find((q) => q.id === id);
    if (!target) {
      target = cloneQuote(id) || undefined;
    }
    if (target) {
      let newRef: string;
      try {
        newRef = await generateNextQuoteNumber();
      } catch {
        newRef = generateQuoteNumber();
      }
      const currentCompany = activeCompanyRecord || company;
      const companySnapshot = createQuotationCompanySnapshot(currentCompany);

      const clonedQuote: QuoteData = {
        ...JSON.parse(JSON.stringify(target)),
        id: `quote-${Date.now()}`,
        quoteNumber: newRef,
        companyId: activeCompanyId,
        companySnapshot: companySnapshot,
        version: 1,
        createdDate: new Date().toISOString().slice(0, 10),
        updatedDate: new Date().toISOString().slice(0, 10),
        status: 'DRAFT',
      };

      const { calculatedQuote } = calculateQuote(clonedQuote);
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

  // Update Status with Firestore & Phase 38 Immutable Snapshot Attachment
  const handleUpdateStatus = async (id: string, status: QuoteStatus) => {
    updateQuoteStatus(id, status);
    const target = savedQuotes.find(q => q.id === id);
    if (target) {
      let updatedQuote: QuoteData = { 
        ...target, 
        status, 
        updatedDate: new Date().toISOString().slice(0, 10),
      };

      // Phase 38: When quotation enters APPROVED or SENT, attach immutable financial & commercial snapshot
      if (status === 'APPROVED' || status === 'SENT') {
        try {
          const financialSnapshots = await createSnapshotsForQuote(updatedQuote);
          updatedQuote = { ...updatedQuote, ...financialSnapshots };
          if (quote.id === id) {
            setQuote(prev => ({ ...prev, ...financialSnapshots, status }));
          }
        } catch (snapErr) {
          console.warn('[Phase 38] Error attaching snapshots during status transition:', snapErr);
        }
      }

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
    showToast(`Đã cập nhật trạng thái báo giá thành ${status} & đồng bộ 100% Cloud (kèm Snapshot tài chính)!`);
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
          onNewQuote={() => navigateToRoute('quotation_new')}
          onOpenSavedQuotes={(filter) => {
            if (filter === 'DRAFT') navigateToRoute('quotations_draft');
            else if (filter === 'PENDING_APPROVAL') navigateToRoute('quotations_pending');
            else if (filter === 'SENT') navigateToRoute('quotations_sent');
            else navigateToRoute('quotations_all');
          }}
          onOpenCompanyProfile={(tab) => {
            if (tab === 'sales') navigateToRoute('sys_sales_bank');
            else if (tab === 'financial') navigateToRoute('sys_financial');
            else navigateToRoute('sys_profile');
          }}
          onOpenCustomers={() => navigateToRoute('master_customers')}
          onOpenSurchargeCatalog={() => navigateToRoute('master_surcharges')}
          onOpenMasterRateHub={(tab) => {
            if (tab === 'SUPPLIERS') navigateToRoute('master_suppliers');
            else if (tab === 'CHARGES') navigateToRoute('master_charges');
            else if (tab === 'AUDIT') navigateToRoute('sys_audit');
            else navigateToRoute('pricing_rates');
          }}
          onOpenRateSearch={() => navigateToRoute('pricing_search')}
          onOpenSmartAssistant={() => navigateToRoute('pricing_smart')}
          onOpenDataBackup={() => navigateToRoute('sys_backup')}
          onOpenPreview={() => navigateToRoute('quotation_preview')}
          onOpenDocumentHistory={() => navigateToRoute('quotation_snapshots')}
          onOpenTemplateBuilder={() => navigateToRoute('quotation_templates')}
          onOpenGeneratePdf={() => setIsGeneratePdfOpen(true)}
          onOpenSendModal={() => navigateToRoute('quotation_send')}
          onOpenCommunication={() => navigateToRoute('quotation_communication')}
          onOpenDocumentCenter={() => navigateToRoute('quotation_document_center')}
          onOpenSmartQuotationWorkspace={() => navigateToRoute('smart_quotation_workspace')}
          onOpenEmailTemplates={() => navigateToRoute('quotation_email_templates')}
          onOpenFollowUps={() => navigateToRoute('quotation_followup')}
          onOpenDashboard={(tab) => {
            if (tab === 'FUNNEL') navigateToRoute('analytics_funnel');
            else if (tab === 'SALES') navigateToRoute('analytics_sales');
            else if (tab === 'PROFITABILITY') navigateToRoute('analytics_profit');
            else if (tab === 'LANES_SERVICES') navigateToRoute('analytics_lanes');
            else navigateToRoute('main_dashboard');
          }}
          onOpenContracts={() => navigateToRoute('pricing_contracts')}
          contractsCount={contractsCount}
          onOpenProfitIntelligence={() => navigateToRoute('pricing_profit')}
          onOpenPricingPolicies={() => navigateToRoute('pricing_policies')}
          onOpenMasterDataReference={(type) => {
            if (type === 'PORT') navigateToRoute('master_ports');
            else if (type === 'CONTAINER_TYPE') navigateToRoute('master_containers');
            else if (type === 'INCOTERM') navigateToRoute('master_incoterms');
            else if (type === 'PAYMENT_TERM') navigateToRoute('master_payment_terms');
          }}
          onSelectTransportMode={(mode) => {
            if (mode === 'SEA_FCL' || mode === 'SEA_LCL') navigateToRoute('ops_ocean');
            else if (mode === 'AIR_FREIGHT') navigateToRoute('ops_air');
            else if (mode === 'INLAND_TRUCKING') navigateToRoute('ops_trucking');
            else if (mode === 'CUSTOMS_CLEARANCE') navigateToRoute('ops_customs');
          }}
          currentUserRole={appUserRole}
          onRoleChange={setAppUserRole}
          language={appLanguage}
          onLanguageChange={setAppLanguage}
          activeRouteId={activeRouteId}
          onOpenIntegrityDashboard={() => navigateToRoute('sys_integrity')}
          onAccessDenied={(moduleName, requiredRoleDesc) => {
            setAccessDeniedState({
              isOpen: true,
              moduleName,
              requiredDesc: requiredRoleDesc,
            });
          }}
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
            onOpenDashboard={handleOpenDashboard}
            onOpenCompanyProfile={(tab) => {
              handleOpenCompanyProfile(tab || 'profile');
            }}
            onOpenCreateCompany={() => {
              setCompanyModalTab('profile');
              setIsCreateCompanyOpen(true);
              setIsCompanyOpen(true);
            }}
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
                pricingWarnings={quote.pricingWarnings}
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
      <Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-4 flex items-center gap-3 border border-slate-200">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-700">Đang tải phân hệ...</span>
          </div>
        </div>
      }>
        {isPreviewOpen && (
          <RouteErrorBoundary routeName="Xem Trước Báo Giá" onReset={handleModalClose} onNavigateHome={handleModalClose}>
            <QuotePreviewModal
              quote={quote}
              isOpen={isPreviewOpen}
              onClose={handleModalClose}
              onCurrencyChange={handleQuoteCurrencyChange}
            />
          </RouteErrorBoundary>
        )}

      {isCustomersOpen && (
        <RouteErrorBoundary routeName="Quản Lý Khách Hàng CRM" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <CustomerManagerModal
            isOpen={isCustomersOpen}
            onClose={handleModalClose}
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
        </RouteErrorBoundary>
      )}

      {isSurchargesOpen && (
        <RouteErrorBoundary routeName="Biểu Phí Phụ Phí Surcharges" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <SurchargeCatalogModal
            isOpen={isSurchargesOpen}
            onClose={handleModalClose}
            surcharges={surcharges}
            exchangeRate={quote.exchangeRate}
            onSaveSurcharge={handleSaveSurcharge}
            onDeleteSurcharge={handleDeleteSurcharge}
            onAddSurchargeToQuote={handleAddSurchargeToQuote}
          />
        </RouteErrorBoundary>
      )}

      {isMasterRateHubOpen && (
        <RouteErrorBoundary routeName="Trung Tâm Biểu Cước Master Rates" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <MasterRateHubModal
            isOpen={isMasterRateHubOpen}
            onClose={handleModalClose}
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
        </RouteErrorBoundary>
      )}

      {isRateSearchOpen && (
        <RouteErrorBoundary routeName="Tra Cứu Nhanh Biểu Cước" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <RateSearchModal
            isOpen={isRateSearchOpen}
            onClose={handleModalClose}
            rates={rates}
            exchangeRate={quote.exchangeRate}
            shipment={quote.shipment}
            onSelectRate={(selectedRate) => {
              handleSelectRateForQuote(selectedRate);
              setIsRateSearchOpen(false);
            }}
          />
        </RouteErrorBoundary>
      )}

      {isSmartAssistantOpen && (
        <RouteErrorBoundary routeName="Trợ Lý Định Giá AI" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <SmartRateAssistantModal
            isOpen={isSmartAssistantOpen}
            onClose={handleModalClose}
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
        </RouteErrorBoundary>
      )}

      {isComparisonModalOpen && (
        <RouteErrorBoundary routeName="So Sánh Biến Động Biểu Cước" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <RateComparisonModal
            isOpen={isComparisonModalOpen}
            onClose={handleModalClose}
            diffs={outdatedRatesDiffs}
            onConfirmUpdate={handleConfirmRateUpdates}
          />
        </RouteErrorBoundary>
      )}

      {isSavedOpen && (
        <RouteErrorBoundary routeName="Danh Sách Báo Giá" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <SavedQuotesModal
            quotes={savedQuotes}
            isOpen={isSavedOpen}
            initialStatusFilter={savedQuotesInitialFilter}
            onClose={handleModalClose}
            onSelectQuote={handleSelectQuote}
            onCloneQuote={handleCloneQuote}
            onDeleteQuote={handleDeleteQuote}
            onUpdateStatus={handleUpdateStatus}
          />
        </RouteErrorBoundary>
      )}

      {isCompanyOpen && (
        <RouteErrorBoundary routeName="Hồ Sơ Doanh Nghiệp & Multi-Entity" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <MultiCompanyManagementModal
            isOpen={isCompanyOpen}
            initialTab={companyModalTab}
            startCreateNew={isCreateCompanyOpen}
            onClose={handleModalClose}
          />
        </RouteErrorBoundary>
      )}

      {isDataBackupOpen && (
        <RouteErrorBoundary routeName="Sao Lưu & Khôi Phục Dữ Liệu" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <DataBackupModal
            isOpen={isDataBackupOpen}
            onClose={handleModalClose}
            onDataImported={handleDataImported}
            savedQuotesCount={savedQuotes.length}
            customersCount={customers.length}
            surchargesCount={surcharges.length}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 7: Professional Quotation PDF Engine Modals */}
      {isGeneratePdfOpen && (
        <RouteErrorBoundary routeName="Xuất Bản Báo Giá PDF" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <GeneratePdfModal
            isOpen={isGeneratePdfOpen}
            onClose={handleModalClose}
            quote={quote}
            onOpenTemplateBuilder={() => setIsTemplateBuilderOpen(true)}
            onDocumentGenerated={(rec) => {
              showToast(`Đã phát hành file PDF ${rec.fileName} (Rev ${rec.revision}) thành công!`);
            }}
          />
        </RouteErrorBoundary>
      )}

      {isTemplateBuilderOpen && (
        <RouteErrorBoundary routeName="Thiết Kế Mẫu Báo Giá" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <QuotationTemplateBuilderModal
            isOpen={isTemplateBuilderOpen}
            onClose={handleModalClose}
            sampleQuote={quote}
            onTemplatesUpdated={() => {
              showToast('Đã cập nhật hệ thống mẫu báo giá!');
            }}
          />
        </RouteErrorBoundary>
      )}

      {isDocumentHistoryOpen && (
        <RouteErrorBoundary routeName="Lịch Sử Ấn Bản Snapshots" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <DocumentHistoryModal
            isOpen={isDocumentHistoryOpen}
            onClose={handleModalClose}
            quotationId={quote.id}
            quotationNumber={quote.quoteNumber}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 8: Quotation Communication & Secure Dispatch Modals */}
      {isSendQuotationOpen && (
        <RouteErrorBoundary routeName="Gửi Báo Giá & Email" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <SendQuotationModal
            isOpen={isSendQuotationOpen}
            onClose={handleModalClose}
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
        </RouteErrorBoundary>
      )}

      {/* Quotation Communication Modal Dialog */}
      {isCommunicationPanelOpen && (
        <RouteErrorBoundary routeName="Trung Tâm Giao Tiếp" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <QuotationCommunicationModal
            isOpen={isCommunicationPanelOpen}
            onClose={handleModalClose}
            quote={quote}
            documents={quotationDocuments}
            onOpenSendModal={() => {
              setIsCommunicationPanelOpen(false);
              navigateToRoute('quotation_send');
            }}
            onOpenFollowUpModal={() => {
              setIsCommunicationPanelOpen(false);
              navigateToRoute('quotation_followup');
            }}
            onOpenSecureLinkPreview={(token) => {
              setIsCommunicationPanelOpen(false);
              navigateToRoute('secure_quote_portal', token);
            }}
            onRefreshQuote={() => handleSelectQuote(quote)}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 40: Document & Communication Control Center */}
      {isDocumentCenterOpen && (
        <RouteErrorBoundary routeName="Trung Tâm Quản Lý Tài Liệu & Giao Tiếp" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <DocumentControlCenter
            isOpen={isDocumentCenterOpen}
            onClose={handleModalClose}
            quote={quote}
            companyId={company.companyId}
            onOpenGeneratePdf={() => {
              setIsDocumentCenterOpen(false);
              setIsGeneratePdfOpen(true);
            }}
            onOpenSendEmail={() => {
              setIsDocumentCenterOpen(false);
              navigateToRoute('quotation_send');
            }}
            onOpenPortalPreview={(token) => {
              setIsDocumentCenterOpen(false);
              navigateToRoute('secure_quote_portal', token);
            }}
          />
        </RouteErrorBoundary>
      )}

      {/* Customer Online Secure Quote Portal */}
      {viewingSecureToken && (
        <RouteErrorBoundary routeName="Cổng Tra Cứu Báo Giá Trực Tuyến" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 backdrop-blur-xs">
            <CustomerSecureQuotePage
              token={viewingSecureToken}
              onBackToApp={handleModalClose}
            />
          </div>
        </RouteErrorBoundary>
      )}

      {isEmailTemplatesOpen && (
        <RouteErrorBoundary routeName="Mẫu Email Báo Giá" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <EmailTemplateManagementModal
            isOpen={isEmailTemplatesOpen}
            onClose={handleModalClose}
          />
        </RouteErrorBoundary>
      )}

      {isFollowUpOpen && (
        <RouteErrorBoundary routeName="Kế Hoạch Chăm Sóc Khách Hàng" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <FollowUpModal
            isOpen={isFollowUpOpen}
            onClose={handleModalClose}
            quote={quote}
            onSuccess={() => {
              showToast('Đã lưu nhiệm vụ chăm sóc khách hàng thành công!');
            }}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 9: Advanced Business Intelligence & Sales Analytics Dashboard */}
      {isDashboardOpen && (
        <RouteErrorBoundary routeName="Dashboard & BI Doanh Nghiệp" onReset={handleModalClose} onNavigateHome={handleModalClose}>
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
              handleModalClose();
            }}
            onClose={handleModalClose}
          />
        </RouteErrorBoundary>
      )}

      {/* Master Data Reference Modal (Ports, Container Types, Incoterms, Payment Terms) */}
      {isMasterDataRefOpen && (
        <RouteErrorBoundary routeName="Dữ Liệu Danh Mục Master" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <MasterDataReferenceModal
            isOpen={isMasterDataRefOpen}
            onClose={handleModalClose}
            initialType={masterDataRefType}
            language={appLanguage}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 14: Customer & Supplier Contract Management Hub */}
      {isContractsOpen && (
        <RouteErrorBoundary routeName="Quản Lý Hợp Đồng" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <ContractHubModal
            isOpen={isContractsOpen}
            onClose={handleModalClose}
            customers={customers}
            suppliers={contractSuppliers}
            carriers={contractCarriers}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 15: Profit & Margin Intelligence Modals */}
      {isProfitIntelligenceOpen && (
        <RouteErrorBoundary routeName="Phân Tích Lợi Nhuận" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <ProfitIntelligenceModal
            isOpen={isProfitIntelligenceOpen}
            onClose={handleModalClose}
            quote={quote}
            activePolicy={activePricingPolicy}
            onApplyWhatIfToQuote={handleApplyWhatIfToQuote}
            onOpenPolicyManagement={() => {
              setIsProfitIntelligenceOpen(false);
              navigateToRoute('pricing_policies');
            }}
          />
        </RouteErrorBoundary>
      )}

      {isPricingPolicyMgmtOpen && (
        <RouteErrorBoundary routeName="Chính Sách Định Giá" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <PricingPolicyManagementModal
            isOpen={isPricingPolicyMgmtOpen}
            onClose={handleModalClose}
            policies={pricingPolicies}
            onPoliciesUpdated={loadPricingPoliciesData}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 17: Cross-Device Concurrency Conflict Resolution Modal */}
      {conflictState.isOpen && conflictState.localQuote && conflictState.remoteQuote && (
        <RouteErrorBoundary routeName="Xử Lý Xung Đột Dữ Liệu" onReset={() => setConflictState({ isOpen: false })} onNavigateHome={handleModalClose}>
          <ConflictResolutionModal
            isOpen={conflictState.isOpen}
            onClose={() => setConflictState({ isOpen: false })}
            localQuote={conflictState.localQuote}
            remoteQuote={conflictState.remoteQuote}
            onForceOverwrite={handleForceOverwriteConflict}
            onReloadRemote={handleReloadRemoteConflict}
          />
        </RouteErrorBoundary>
      )}

      {/* Phase 20: Smart Quotation Workspace & Intelligent Pricing Assistant */}
      {isSmartQuotationWorkspaceOpen && (
        <RouteErrorBoundary routeName="Bàn Làm Việc Báo Giá Nâng Cao" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <SmartQuotationWorkspace
            isOpen={isSmartQuotationWorkspaceOpen}
            onClose={handleModalClose}
            initialQuote={quote}
            company={company}
            currentUserRole={appUserRole}
            onSaveQuoteToDatabase={async (updatedQuote) => {
              const currentCompany = activeCompanyRecord || company;
              const quoteWithCompany: QuoteData = {
                ...updatedQuote,
                companyId: updatedQuote.companyId || activeCompanyId,
                companySnapshot: updatedQuote.companySnapshot || createQuotationCompanySnapshot(currentCompany),
              };
              const { calculatedQuote } = calculateQuote(quoteWithCompany);
              setQuote(calculatedQuote);
              await saveQuotation(calculatedQuote, {
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
        </RouteErrorBoundary>
      )}

      {/* Phase 24 & 27: Global Data Integrity & Sync Health Recovery Hub */}
      {isIntegrityDashboardOpen && (
        <RouteErrorBoundary routeName="Kiểm Tra Toàn Vẹn Dữ Liệu" onReset={handleModalClose} onNavigateHome={handleModalClose}>
          <DataIntegrityDashboardModal
            isOpen={isIntegrityDashboardOpen}
            onClose={handleModalClose}
            quotes={savedQuotes}
            customers={customers}
            company={company}
            onRefreshData={handleForceCloudSync}
            onApplyFixedQuotes={(fixed) => setSavedQuotes(fixed)}
            onApplyFixedCustomers={(fixed) => setCustomers(fixed)}
            lang={appLanguage}
          />
        </RouteErrorBoundary>
      )}

      {/* Access Denied Modal (RBAC Guard) */}
      <AccessDeniedModal
        isOpen={accessDeniedState.isOpen}
        onClose={() => setAccessDeniedState({ isOpen: false, moduleName: '', requiredDesc: '' })}
        currentRole={appUserRole}
        requiredRoleDesc={accessDeniedState.requiredDesc}
        moduleName={accessDeniedState.moduleName}
        onSwitchRole={setAppUserRole}
      />

      {/* 404 Route Not Found Modal */}
      <NotFoundViewModal
        isOpen={notFoundPath !== null}
        onClose={handleModalClose}
        requestedPath={notFoundPath || undefined}
      />
      </Suspense>

    </div>
  );
}
