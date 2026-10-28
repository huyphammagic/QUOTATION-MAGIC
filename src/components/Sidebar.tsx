import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CompanyProfile, QuoteData } from '../types/logistics';
import { UserRole, ROLE_PERMISSIONS } from '../types/analytics';
import { NavigationLanguage, NAVIGATION_I18N } from '../i18n/navigation';
import { 
  loadSavedPinnedFavorites, 
  persistPinnedFavorites,
  loadSavedExpandedGroups,
  persistExpandedGroups,
  loadSavedSidebarCollapsed,
  persistSidebarCollapsed,
  STORAGE_KEY_PINNED_FAVORITES,
} from '../utils/userPreferences';
import { subscribeToUserPreferences } from '../services/firebase/firestoreService';
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  Settings, 
  FileText, 
  Plus, 
  Printer, 
  Users, 
  Receipt, 
  Database, 
  Ship, 
  Sparkles,
  Layers,
  History,
  Layout,
  Mail,
  Send,
  Calendar, 
  LayoutDashboard,
  TrendingUp, 
  Sliders, 
  Search, 
  Star, 
  PanelLeftClose, 
  PanelLeftOpen, 
  FileCheck2, 
  Anchor, 
  Box, 
  Lock, 
  Compass, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  Package, 
  Radar, 
  SlidersHorizontal,
  X,
  FileCheck,
  Check,
  Award,
  Inbox,
  Swords,
  Flame,
  Scale,
  Dna,
  ShieldAlert,
  Calculator,
  BarChart3,
  Target,
  Eye,
  EyeOff,
  LayoutGrid,
  Zap,
  Briefcase,
  ArrowUp
} from 'lucide-react';

export interface SidebarProps {
  company: CompanyProfile;
  savedQuotes: QuoteData[];
  customersCount?: number;
  surchargesCount?: number;
  rateMastersCount?: number;
  chargeMastersCount?: number;
  contractsCount?: number;
  shipmentsCount?: number;
  exchangeRate: number;
  lastAutoSaveTime: string | null;
  isAutoSaving?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewQuote: () => void;
  onOpenSavedQuotes: (filter?: string) => void;
  onOpenCompanyProfile: (tab?: 'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial') => void;
  onOpenCustomers: () => void;
  onOpenSurchargeCatalog: () => void;
  onOpenMasterRateHub?: (tab?: 'RATES' | 'CHARGES' | 'SUPPLIERS' | 'APPROVAL' | 'REQUESTS' | 'EXPIRING' | 'AUDIT') => void;
  onOpenRateSearch?: () => void;
  onOpenSmartAssistant?: () => void;
  onOpenDataBackup: () => void;
  onOpenPreview?: () => void;
  onOpenDocumentHistory?: () => void;
  onOpenTemplateBuilder?: () => void;
  onOpenGeneratePdf?: () => void;
  onOpenSendModal?: () => void;
  onOpenCommunication?: () => void;
  onOpenDocumentCenter?: () => void;
  onOpenSmartQuotationWorkspace?: () => void;
  onOpenEmailTemplates?: () => void;
  onOpenFollowUps?: () => void;
  onOpenOpportunityRadar?: () => void;
  onOpenDecisionWorkspace?: () => void;
  onOpenDashboard?: (tab?: string) => void;
  onOpenContracts?: () => void;
  onOpenProfitIntelligence?: () => void;
  onOpenPricingPolicies?: () => void;
  onOpenMasterDataReference?: (type: 'PORT' | 'CONTAINER_TYPE' | 'INCOTERM' | 'PAYMENT_TERM') => void;
  onSelectTransportMode?: (mode: 'SEA_FCL' | 'SEA_LCL' | 'AIR_FREIGHT' | 'INLAND_TRUCKING' | 'CUSTOMS_CLEARANCE') => void;
  onOpenShipmentWorkspace?: () => void;
  onOpenControlTower?: () => void;
  onOpenActionCenter?: () => void;
  onOpenEngagementRadar?: () => void;
  onOpenDealCloser?: () => void;
  onOpenRfqInbox?: () => void;
  onOpenCompetitorRadar?: () => void;
  onOpenCustomerReengagement?: () => void;
  onOpenValiditySurcharge?: () => void;
  onOpenDemDetPort?: () => void;
  onOpenGoldenHourRadar?: () => void;
  onOpenConcessionGuard?: () => void;
  onOpenEnterpriseTender?: () => void;
  onOpenCustomerDna?: () => void;
  onOpenCarrierInvoiceAudit?: () => void;
  onOpenQuotationPayments?: (quoteId?: string) => void;
  onOpenDocumentParser?: () => void;
  onOpenHsCodeTariff?: () => void;
  onOpenFreightRateBenchmarking?: () => void;
  onOpenDebitNoteManagement?: () => void;
  onOpenMultiOptionQuote?: () => void;
  onOpenExchangeRateHub?: () => void;
  onOpenRoutePresets?: () => void;
  onOpenCustomer360?: () => void;
  onOpenSmartSurcharge?: () => void;
  smartSurchargesCount?: number;
  dormantCustomersCount?: number;
  activeEngagementsCount?: number;
  exceptionsCount?: number;
  deadlinesCount?: number;
  currentUserRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  language?: NavigationLanguage;
  onLanguageChange?: (lang: NavigationLanguage) => void;
  activeRouteId?: string;
  onOpenIntegrityDashboard?: () => void;
  onAccessDenied?: (moduleName: string, requiredRoleDesc: string) => void;
  onOpenAuthModal?: () => void;
}

export type SidebarGroupKey = 
  | 'commercial'   // 1. Kinh Doanh & Báo Giá (Commercial & Deal Desk)
  | 'pricing'      // 2. Biểu Cước & Trí Tuệ Giá (Pricing & Carrier Intelligence)
  | 'operations'   // 3. Vận Hành & Điều Hành Lô Hàng (Operations & Control Tower)
  | 'crm'          // 4. Khách Hàng & Công Nợ (CRM & Receivables)
  | 'system';      // 5. Hệ Thống, Danh Mục & Quản Trị (System & Master Governance)

export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  group: SidebarGroupKey;
  action: () => void;
  badge?: string | number | null;
  badgeTone?: 'default' | 'amber' | 'emerald' | 'rose' | 'sky';
  isCta?: boolean;
  shortcut?: string;
  restricted?: boolean;
  requiredRoleDesc?: string;
  isCore?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  company,
  savedQuotes,
  customersCount = 0,
  surchargesCount = 0,
  rateMastersCount = 0,
  chargeMastersCount = 0,
  contractsCount = 0,
  exchangeRate,
  lastAutoSaveTime,
  isAutoSaving,
  isOpenMobile,
  onCloseMobile,
  onNewQuote,
  onOpenSavedQuotes,
  onOpenCompanyProfile,
  onOpenCustomers,
  onOpenSurchargeCatalog,
  onOpenMasterRateHub,
  onOpenRateSearch,
  onOpenSmartAssistant,
  onOpenDataBackup,
  onOpenPreview,
  onOpenDocumentHistory,
  onOpenTemplateBuilder,
  onOpenDocumentCenter,
  onOpenSmartQuotationWorkspace,
  onOpenEmailTemplates,
  onOpenFollowUps,
  onOpenOpportunityRadar,
  onOpenDecisionWorkspace,
  onOpenDashboard,
  onOpenContracts,
  onOpenProfitIntelligence,
  onOpenPricingPolicies,
  onOpenMasterDataReference,
  onOpenShipmentWorkspace,
  onOpenControlTower,
  onOpenActionCenter,
  onOpenEngagementRadar,
  onOpenDealCloser,
  onOpenRfqInbox,
  onOpenCompetitorRadar,
  onOpenCustomerReengagement,
  onOpenValiditySurcharge,
  onOpenDemDetPort,
  onOpenGoldenHourRadar,
  onOpenConcessionGuard,
  onOpenEnterpriseTender,
  onOpenCustomerDna,
  onOpenCarrierInvoiceAudit,
  onOpenQuotationPayments,
  onOpenDocumentParser,
  onOpenHsCodeTariff,
  onOpenFreightRateBenchmarking,
  onOpenDebitNoteManagement,
  onOpenMultiOptionQuote,
  onOpenExchangeRateHub,
  onOpenRoutePresets,
  onOpenCustomer360,
  onOpenSmartSurcharge,
  smartSurchargesCount = 0,
  dormantCustomersCount = 3,
  activeEngagementsCount = 0,
  shipmentsCount = 0,
  exceptionsCount = 0,
  deadlinesCount = 0,
  currentUserRole = 'ADMIN',
  onRoleChange,
  language = 'vi',
  onLanguageChange,
  activeRouteId = 'quotation_workbench',
  onOpenIntegrityDashboard,
  onAccessDenied,
  onOpenAuthModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => loadSavedSidebarCollapsed());
  const [isMinimalMode, setIsMinimalMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('LOGISTICS_SIDEBAR_MINIMAL_MODE');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole>(currentUserRole);
  const [activeLang, setActiveLang] = useState<NavigationLanguage>(language);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleMinimalMode = () => {
    setIsMinimalMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('LOGISTICS_SIDEBAR_MINIMAL_MODE', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setActiveRole(currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  const t = NAVIGATION_I18N[activeLang];

  // Pinned favorites
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadSavedPinnedFavorites());

  // Default expanded groups: clean logical breakdown for 5 workflows
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>(() => {
    const saved = loadSavedExpandedGroups();
    return Object.keys(saved).length > 0 
      ? saved 
      : { 
          commercial: true, 
          pricing: true,
          operations: false, 
          crm: false, 
          system: false, 
        };
  });

  // Listen for favorite updates across tabs and cloud sync
  useEffect(() => {
    const handleFavoritesChanged = (e: any) => {
      if (Array.isArray(e.detail)) {
        setPinnedIds(e.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PINNED_FAVORITES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setPinnedIds(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('logistics_pinned_favorites_changed', handleFavoritesChanged);
    window.addEventListener('storage', handleStorageChange);

    const unsubCloud = subscribeToUserPreferences((prefs) => {
      if (prefs && Array.isArray(prefs.pinnedNavIds)) {
        setPinnedIds(current => {
          const isDiff = current.length !== prefs.pinnedNavIds!.length ||
            !current.every((id, idx) => id === prefs.pinnedNavIds![idx]);
          if (isDiff) {
            try {
              localStorage.setItem(STORAGE_KEY_PINNED_FAVORITES, JSON.stringify(prefs.pinnedNavIds));
            } catch {}
            return prefs.pinnedNavIds!;
          }
          return current;
        });
      }
    });

    return () => {
      window.removeEventListener('logistics_pinned_favorites_changed', handleFavoritesChanged);
      window.removeEventListener('storage', handleStorageChange);
      unsubCloud();
    };
  }, []);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = {
        ...prev,
        [groupKey]: !prev[groupKey],
      };
      persistExpandedGroups(next);
      return next;
    });
  };

  // 3. Scrolling Physics & Auto-Scroll-Into-View Engine
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScrollEdges = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    setCanScrollUp(hasOverflow && el.scrollTop > 12);
    setCanScrollDown(hasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 12);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollEdges();
    el.addEventListener('scroll', checkScrollEdges, { passive: true });
    window.addEventListener('resize', checkScrollEdges);
    return () => {
      el.removeEventListener('scroll', checkScrollEdges);
      window.removeEventListener('resize', checkScrollEdges);
    };
  }, [expandedGroups, isMinimalMode, searchQuery]);

  // Auto-expand workflow group and smoothly scroll active route into view with physics
  useEffect(() => {
    if (activeRouteId) {
      const activeItem = allNavItems.find(i => i.id === activeRouteId);
      if (activeItem && activeItem.group) {
        setExpandedGroups(prev => {
          if (!prev[activeItem.group]) {
            const next = { ...prev, [activeItem.group]: true };
            persistExpandedGroups(next);
            return next;
          }
          return prev;
        });
      }

      // Smooth auto-scroll target after group expansion render
      const timer = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const activeEl = container.querySelector(`[data-nav-id="${activeRouteId}"]`);
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        checkScrollEdges();
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [activeRouteId]);

  const handleAction = (callback: () => void) => {
    callback();
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      persistPinnedFavorites(next);
      return next;
    });
  };

  const toggleSidebarCollapse = (val?: boolean) => {
    setIsCollapsed(prev => {
      const next = typeof val === 'boolean' ? val : !prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  // Keyboard shortcut Ctrl+K to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed) setIsCollapsed(false);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (isOpenMobile) onCloseMobile();
        if (searchQuery) setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile, isCollapsed, searchQuery]);

  // Real-time status counters
  const pendingApprovalCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'PENDING_APPROVAL').length;
  }, [savedQuotes]);

  const draftsCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'DRAFT').length;
  }, [savedQuotes]);

  const sentCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'SENT' || q.status === 'ISSUED').length;
  }, [savedQuotes]);

  const permissions = ROLE_PERMISSIONS[activeRole] || [];
  const canViewProfitability = permissions.includes('profitability.view');
  const isAdminOrManager = activeRole === 'ADMIN' || activeRole === 'SALES_MANAGER';

  // Navigation Items - 5 Core Workflow-Centric IA (Commercial, Pricing, Operations, CRM, System)
  const allNavItems: NavItem[] = [
    // =========================================================================
    // LUỒNG 1: KINH DOANH & BÁO GIÁ (COMMERCIAL & DEAL DESK)
    // =========================================================================
    {
      id: 'smart_quotation_workspace',
      label: activeLang === 'vi' ? 'Bàn Làm Việc Báo Giá' : 'Quotation Workbench',
      icon: Sparkles,
      group: 'commercial',
      action: () => onOpenSmartQuotationWorkspace && onOpenSmartQuotationWorkspace(),
      isCore: true,
    },
    {
      id: 'quotations_all',
      label: activeLang === 'vi' ? 'Tất Cả Báo Giá' : 'All Quotations',
      icon: FileText,
      group: 'commercial',
      action: () => onOpenSavedQuotes('ALL'),
      badge: savedQuotes.length > 0 ? savedQuotes.length : null,
      badgeTone: 'default',
      isCore: true,
    },
    {
      id: 'rfq_inbox',
      label: activeLang === 'vi' ? 'Hộp Thư RFQ AI (5 Giây)' : 'Smart RFQ Inbox (5s)',
      icon: Inbox,
      group: 'commercial',
      action: () => onOpenRfqInbox && onOpenRfqInbox(),
      badge: 'AI ⚡',
      badgeTone: 'emerald',
      isCore: true,
    },
    {
      id: 'deal_closing_accelerator',
      label: activeLang === 'vi' ? 'Trợ Lý Chốt Deal Tốc Độ' : 'Deal Closer Suite',
      icon: Award,
      group: 'commercial',
      action: () => onOpenDealCloser && onOpenDealCloser(),
      badgeTone: 'amber',
      isCore: true,
    },
    {
      id: 'customer_reengagement',
      label: activeLang === 'vi' ? 'Đánh Thức Khách Cũ & Tái Ký' : 'Shipper Re-engagement',
      icon: UserCheck,
      group: 'commercial',
      action: () => onOpenCustomerReengagement && onOpenCustomerReengagement(),
      badge: dormantCustomersCount > 0 ? dormantCustomersCount : undefined,
      badgeTone: 'amber',
      isCore: false,
    },
    {
      id: 'multi_option_quotation',
      label: activeLang === 'vi' ? 'Báo Giá Đa Phương Án' : 'Multi-Option Pricing Matrix',
      icon: Sparkles,
      group: 'commercial',
      action: () => onOpenMultiOptionQuote && onOpenMultiOptionQuote(),
      isCore: false,
    },
    {
      id: 'route_presets_hub',
      label: activeLang === 'vi' ? 'Gói Mẫu Tuyến Trọn Gói' : 'Route & Service Presets',
      icon: Zap,
      group: 'commercial',
      action: () => onOpenRoutePresets && onOpenRoutePresets(),
      badge: '1-Click',
      badgeTone: 'emerald',
      isCore: true,
    },
    {
      id: 'quotations_draft',
      label: activeLang === 'vi' ? 'Bản Nháp' : 'Draft Quotes',
      icon: Clock,
      group: 'commercial',
      action: () => onOpenSavedQuotes('DRAFT'),
      badge: draftsCount > 0 ? draftsCount : null,
      badgeTone: 'default',
      isCore: false,
    },
    {
      id: 'quotations_pending',
      label: activeLang === 'vi' ? 'Chờ Phê Duyệt' : 'Pending Approval',
      icon: CheckCircle2,
      group: 'commercial',
      action: () => onOpenSavedQuotes('PENDING_APPROVAL'),
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeTone: pendingApprovalCount > 0 ? 'amber' : 'default',
      isCore: pendingApprovalCount > 0,
    },
    {
      id: 'quotations_sent',
      label: activeLang === 'vi' ? 'Đã Gửi Khách Hàng' : 'Sent Quotations',
      icon: Send,
      group: 'commercial',
      action: () => onOpenSavedQuotes('SENT'),
      badge: sentCount > 0 ? sentCount : null,
      badgeTone: 'emerald',
      isCore: false,
    },
    {
      id: 'quotation_preview',
      label: activeLang === 'vi' ? 'Xem Trước Bản In (A4)' : 'Print Preview (A4)',
      icon: Printer,
      group: 'commercial',
      action: () => onOpenPreview && onOpenPreview(),
      isCore: true,
    },
    {
      id: 'quotation_templates',
      label: activeLang === 'vi' ? 'Mẫu Thiết Kế Báo Giá' : 'Quotation Templates',
      icon: Layout,
      group: 'commercial',
      action: () => onOpenTemplateBuilder && onOpenTemplateBuilder(),
      isCore: false,
    },
    {
      id: 'quotation_email_templates',
      label: activeLang === 'vi' ? 'Mẫu Email Gửi Khách' : 'Email Templates',
      icon: Mail,
      group: 'commercial',
      action: () => onOpenEmailTemplates && onOpenEmailTemplates(),
      isCore: false,
    },
    {
      id: 'quotation_snapshots',
      label: activeLang === 'vi' ? 'Lịch Sử Ấn Bản Snapshots' : 'Document Snapshots',
      icon: History,
      group: 'commercial',
      action: () => onOpenDocumentHistory && onOpenDocumentHistory(),
      isCore: false,
    },

    // =========================================================================
    // LUỒNG 2: BIỂU CƯỚC & TRÍ TUỆ GIÁ (PRICING & CARRIER INTELLIGENCE)
    // =========================================================================
    {
      id: 'pricing_rates',
      label: activeLang === 'vi' ? 'Biểu Cước Master Rates' : 'Master Rates Hub',
      icon: Database,
      group: 'pricing',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('RATES'),
      badge: rateMastersCount > 0 ? rateMastersCount : null,
      isCore: true,
    },
    {
      id: 'exchange_rate_hub',
      label: activeLang === 'vi' ? 'Tỷ Giá USD Realtime VCB' : 'Live USD Exchange Rate',
      icon: Zap,
      group: 'pricing',
      action: () => onOpenExchangeRateHub && onOpenExchangeRateHub(),
      badge: 'Live VCB',
      badgeTone: 'emerald',
      isCore: true,
    },
    {
      id: 'pricing_search',
      label: activeLang === 'vi' ? 'Tra Cứu Cước Nhanh' : 'Rate Search',
      icon: Search,
      group: 'pricing',
      action: () => onOpenRateSearch && onOpenRateSearch(),
      isCore: true,
    },
    {
      id: 'pricing_smart',
      label: activeLang === 'vi' ? 'Trợ Lý Ghép Giá AI' : 'Smart Rate Assistant',
      icon: Sparkles,
      group: 'pricing',
      action: () => onOpenSmartAssistant && onOpenSmartAssistant(),
      isCore: false,
    },
    {
      id: 'competitor_radar',
      label: activeLang === 'vi' ? 'Benchmark Giá Đối Thủ (AI)' : 'Competitor Radar & AI',
      icon: Swords,
      group: 'pricing',
      action: () => onOpenCompetitorRadar && onOpenCompetitorRadar(),
      isCore: true,
    },
    {
      id: 'freight_rate_benchmarking',
      label: activeLang === 'vi' ? 'Đối Soát Cước & Biên Lãi P.72' : 'Freight Benchmark P.72',
      icon: BarChart3,
      group: 'pricing',
      action: () => onOpenFreightRateBenchmarking && onOpenFreightRateBenchmarking(),
      badge: 'P.72',
      badgeTone: 'sky',
      isCore: true,
    },
    {
      id: 'smart_surcharges',
      label: activeLang === 'vi' ? 'Gợi Ý Phụ Phí Tuyến & Mùa (AI)' : 'Smart Surcharges (AI)',
      icon: Sparkles,
      group: 'pricing',
      action: () => onOpenSmartSurcharge && onOpenSmartSurcharge(),
      badge: smartSurchargesCount > 0 ? `${smartSurchargesCount}` : 'Auto',
      badgeTone: 'sky',
      isCore: true,
    },
    {
      id: 'validity_surcharge_radar',
      label: activeLang === 'vi' ? 'Hiệu Lực & Phụ Phí GRI/PSS' : 'Rate Validity & GRI Radar',
      icon: Flame,
      group: 'pricing',
      action: () => onOpenValiditySurcharge && onOpenValiditySurcharge(),
      isCore: false,
    },
    {
      id: 'golden_hour_radar',
      label: activeLang === 'vi' ? 'Bắt Nhịp Giờ Vàng Chốt Sale' : 'Golden Hour Closer',
      icon: Flame,
      group: 'pricing',
      action: () => onOpenGoldenHourRadar && onOpenGoldenHourRadar(),
      isCore: false,
    },
    {
      id: 'enterprise_tender_engine',
      label: activeLang === 'vi' ? 'Đấu Thầu Nhà Máy (Tender)' : 'Factory Tender Matrix',
      icon: Building2,
      group: 'pricing',
      action: () => onOpenEnterpriseTender && onOpenEnterpriseTender(),
      isCore: false,
    },
    {
      id: 'concession_guard',
      label: activeLang === 'vi' ? 'Đổi Trác Điều Khoản & Sàn Lãi' : 'Concession & Margin Guard',
      icon: Scale,
      group: 'pricing',
      action: () => onOpenConcessionGuard && onOpenConcessionGuard(),
      isCore: false,
    },
    {
      id: 'customs_tariff_ai',
      label: activeLang === 'vi' ? 'Tra Mã HS & Thuế AI' : 'AI HS Code & Tariff',
      icon: Calculator,
      group: 'pricing',
      action: () => onOpenHsCodeTariff && onOpenHsCodeTariff(),
      isCore: false,
    },
    {
      id: 'pricing_contracts',
      label: activeLang === 'vi' ? 'Hợp Đồng Cước & Hãng Tàu' : 'Contracts Hub',
      icon: FileText,
      group: 'pricing',
      action: () => onOpenContracts && onOpenContracts(),
      badge: contractsCount > 0 ? contractsCount : null,
      isCore: false,
    },
    {
      id: 'pricing_profit',
      label: activeLang === 'vi' ? 'Phân Tích Lợi Nhuận What-If' : 'Profit Intelligence',
      icon: TrendingUp,
      group: 'pricing',
      action: () => onOpenProfitIntelligence && onOpenProfitIntelligence(),
      restricted: !canViewProfitability,
      requiredRoleDesc: 'RBAC',
      isCore: false,
    },
    {
      id: 'pricing_policies',
      label: activeLang === 'vi' ? 'Chính Sách Định Giá & Sàn Lãi' : 'Pricing Policies',
      icon: Sliders,
      group: 'pricing',
      action: () => onOpenPricingPolicies && onOpenPricingPolicies(),
      restricted: !isAdminOrManager,
      requiredRoleDesc: 'Manager',
      isCore: false,
    },
    {
      id: 'decision_workspace',
      label: activeLang === 'vi' ? 'Phòng Quyết Định & Kịch Bản' : 'Decision Workspace',
      icon: SlidersHorizontal,
      group: 'pricing',
      action: () => onOpenDecisionWorkspace && onOpenDecisionWorkspace(),
      isCore: false,
    },

    // =========================================================================
    // LUỒNG 3: VẬN HÀNH & ĐIỀU HÀNH LÔ HÀNG (OPERATIONS & CONTROL TOWER)
    // =========================================================================
    {
      id: 'ops_control_tower',
      label: activeLang === 'vi' ? 'Tháp Điều Hành Logistics' : 'Control Tower',
      icon: Radar,
      group: 'operations',
      action: () => onOpenControlTower && onOpenControlTower(),
      badge: exceptionsCount > 0 ? exceptionsCount : undefined,
      badgeTone: exceptionsCount > 0 ? 'rose' : 'default',
      isCore: true,
    },
    {
      id: 'ops_shipments',
      label: activeLang === 'vi' ? 'Điều Hành & Lô Hàng' : 'Shipment Operations',
      icon: Package,
      group: 'operations',
      action: () => onOpenShipmentWorkspace && onOpenShipmentWorkspace(),
      badge: shipmentsCount > 0 ? shipmentsCount : undefined,
      badgeTone: 'sky',
      isCore: true,
    },
    {
      id: 'dem_det_port_radar',
      label: activeLang === 'vi' ? 'Bộ Tính DEM/DET & Cảng Biển' : 'DEM/DET & Port Risk Radar',
      icon: Anchor,
      group: 'operations',
      action: () => onOpenDemDetPort && onOpenDemDetPort(),
      badgeTone: 'amber',
      isCore: true,
    },
    {
      id: 'ops_action_center',
      label: activeLang === 'vi' ? 'Hạn Chót & Hành Động Khẩn' : 'Deadline & Action Center',
      icon: Clock,
      group: 'operations',
      action: () => onOpenActionCenter && onOpenActionCenter(),
      badge: deadlinesCount > 0 ? deadlinesCount : undefined,
      badgeTone: deadlinesCount > 0 ? 'amber' : 'default',
      isCore: false,
    },
    {
      id: 'carrier_invoice_audit',
      label: activeLang === 'vi' ? 'Đối Soát Hóa Đơn Hãng Tàu' : 'Carrier Invoice Audit',
      icon: ShieldAlert,
      group: 'operations',
      action: () => onOpenCarrierInvoiceAudit && onOpenCarrierInvoiceAudit(),
      isCore: false,
    },
    {
      id: 'ai_document_parser',
      label: activeLang === 'vi' ? 'Trích Xuất Chứng Từ AI' : 'AI Document Parser',
      icon: Sparkles,
      group: 'operations',
      action: () => onOpenDocumentParser && onOpenDocumentParser(),
      isCore: false,
    },
    {
      id: 'quotation_document_center',
      label: activeLang === 'vi' ? 'Trung Tâm Tài Liệu & Vận Tải' : 'Document & Comm Hub',
      icon: Layers,
      group: 'operations',
      action: () => onOpenDocumentCenter && onOpenDocumentCenter(),
      isCore: false,
    },

    // =========================================================================
    // LUỒNG 4: KHÁCH HÀNG & CÔNG NỢ (CRM & RECEIVABLES INTELLIGENCE)
    // =========================================================================
    {
      id: 'master_customers',
      label: activeLang === 'vi' ? 'Danh Bạ Khách Hàng (CRM)' : 'Customer Directory',
      icon: Users,
      group: 'crm',
      action: onOpenCustomers,
      badge: customersCount > 0 ? customersCount : null,
      isCore: true,
    },
    {
      id: 'customer_360_hub',
      label: activeLang === 'vi' ? 'Trung Tâm Khách Hàng 360°' : 'Customer 360° Hub',
      icon: Users,
      group: 'crm',
      action: () => onOpenCustomer360 && onOpenCustomer360(),
      badge: '360°',
      badgeTone: 'sky',
      isCore: true,
    },
    {
      id: 'customer_dna_power_map',
      label: activeLang === 'vi' ? 'Giải Mã Khách Hàng (DNA)' : 'Customer DNA & Power Map',
      icon: Dna,
      group: 'crm',
      action: () => onOpenCustomerDna && onOpenCustomerDna(),
      isCore: true,
    },
    {
      id: 'quotation_payments',
      label: activeLang === 'vi' ? 'Kiểm Soát Thu Nợ & Công Nợ' : 'Payments & Receivables',
      icon: CreditCard,
      group: 'crm',
      action: () => onOpenQuotationPayments && onOpenQuotationPayments(),
      isCore: true,
    },
    {
      id: 'debit_note_management',
      label: activeLang === 'vi' ? 'Quản Lý Debit Note' : 'Debit Note Management',
      icon: Receipt,
      group: 'crm',
      action: () => onOpenDebitNoteManagement && onOpenDebitNoteManagement(),
      isCore: true,
    },
    {
      id: 'quotation_followup',
      label: activeLang === 'vi' ? 'Lịch Chăm Sóc Khách' : 'Follow-up Schedule',
      icon: Calendar,
      group: 'crm',
      action: () => onOpenFollowUps && onOpenFollowUps(),
      isCore: false,
    },
    {
      id: 'engagement_radar',
      label: activeLang === 'vi' ? 'Radar Khách Trực Tuyến' : 'Live Engagement Radar',
      icon: Radar,
      group: 'crm',
      action: () => onOpenEngagementRadar && onOpenEngagementRadar(),
      badge: activeEngagementsCount > 0 ? activeEngagementsCount : undefined,
      badgeTone: activeEngagementsCount > 0 ? 'emerald' : 'default',
      isCore: false,
    },
    {
      id: 'opportunity_radar',
      label: activeLang === 'vi' ? 'Radar Cơ Hội Kinh Doanh' : 'Opportunity Radar',
      icon: Radar,
      group: 'crm',
      action: () => onOpenOpportunityRadar && onOpenOpportunityRadar(),
      isCore: false,
    },

    // =========================================================================
    // LUỒNG 5: HỆ THỐNG, DANH MỤC & QUẢN TRỊ (SYSTEM & MASTER GOVERNANCE)
    // =========================================================================
    {
      id: 'sys_integrity',
      label: activeLang === 'vi' ? 'Kiểm Định Toàn Vẹn Dữ Liệu' : 'Data Integrity Health',
      icon: ShieldCheck,
      group: 'system',
      action: () => onOpenIntegrityDashboard && onOpenIntegrityDashboard(),
      badge: '1-Click',
      badgeTone: 'emerald',
      isCore: true,
    },
    {
      id: 'executive_cockpit',
      label: activeLang === 'vi' ? 'Bảng Điều Hành Cockpit (BI)' : 'Executive Cockpit BI',
      icon: Compass,
      group: 'system',
      action: () => onOpenDashboard && onOpenDashboard('COCKPIT'),
      badge: 'C-Level',
      badgeTone: 'sky',
      isCore: true,
    },
    {
      id: 'analytics_overview',
      label: activeLang === 'vi' ? 'Báo Cáo Tổng Quan & KPIs' : 'Analytics & KPIs',
      icon: LayoutDashboard,
      group: 'system',
      action: () => onOpenDashboard && onOpenDashboard('OVERVIEW'),
      isCore: false,
    },
    {
      id: 'analytics_funnel',
      label: activeLang === 'vi' ? 'Phễu Chuyển Đổi Báo Giá' : 'Conversion Funnel',
      icon: TrendingUp,
      group: 'system',
      action: () => onOpenDashboard && onOpenDashboard('FUNNEL'),
      isCore: false,
    },
    {
      id: 'analytics_sales',
      label: activeLang === 'vi' ? 'Hiệu Suất Sales' : 'Sales Performance',
      icon: Users,
      group: 'system',
      action: () => onOpenDashboard && onOpenDashboard('SALES'),
      isCore: false,
    },
    {
      id: 'analytics_lanes',
      label: activeLang === 'vi' ? 'Phân Tích Tuyến Vận Chuyển' : 'Trade Lanes Analytics',
      icon: Compass,
      group: 'system',
      action: () => onOpenDashboard && onOpenDashboard('LANES_SERVICES'),
      isCore: false,
    },
    {
      id: 'sys_profile',
      label: activeLang === 'vi' ? 'Hồ Sơ Doanh Nghiệp' : 'Company Profile',
      icon: Building2,
      group: 'system',
      action: () => onOpenCompanyProfile('profile'),
      isCore: true,
    },
    {
      id: 'sys_financial',
      label: activeLang === 'vi' ? 'Cấu Hình Tài Chính & Thuế' : 'Financial & Tax Engine',
      icon: Receipt,
      group: 'system',
      action: () => onOpenCompanyProfile('financial'),
      isCore: false,
    },
    {
      id: 'sys_sales_bank',
      label: activeLang === 'vi' ? 'Tài Khoản Ngân Hàng' : 'Bank Accounts',
      icon: UserCheck,
      group: 'system',
      action: () => onOpenCompanyProfile('sales'),
      isCore: false,
    },
    {
      id: 'master_suppliers',
      label: activeLang === 'vi' ? 'Hãng Tàu & Nhà Xe' : 'Carriers & Suppliers',
      icon: Ship,
      group: 'system',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('SUPPLIERS'),
      isCore: false,
    },
    {
      id: 'master_charges',
      label: activeLang === 'vi' ? 'Mã Cước & Khoản Phí' : 'Charge Master',
      icon: Layers,
      group: 'system',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('CHARGES'),
      badge: chargeMastersCount > 0 ? chargeMastersCount : null,
      isCore: false,
    },
    {
      id: 'master_surcharges',
      label: activeLang === 'vi' ? 'Danh Mục Phụ Phí' : 'Surcharges Catalog',
      icon: Receipt,
      group: 'system',
      action: onOpenSurchargeCatalog,
      badge: surchargesCount > 0 ? surchargesCount : null,
      isCore: false,
    },
    {
      id: 'master_ports',
      label: activeLang === 'vi' ? 'Cảng Biển & Sân Bay' : 'Ports & Locations',
      icon: Anchor,
      group: 'system',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PORT'),
      isCore: false,
    },
    {
      id: 'master_containers',
      label: activeLang === 'vi' ? 'Quy Cách Container & Xe' : 'Containers & Trucks',
      icon: Box,
      group: 'system',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('CONTAINER_TYPE'),
      isCore: false,
    },
    {
      id: 'master_incoterms',
      label: activeLang === 'vi' ? 'Điều Khoản Incoterms 2020' : 'Incoterms Rules',
      icon: FileCheck2,
      group: 'system',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('INCOTERM'),
      isCore: false,
    },
    {
      id: 'master_payment_terms',
      label: activeLang === 'vi' ? 'Điều Khoản Thanh Toán' : 'Payment Terms',
      icon: CreditCard,
      group: 'system',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PAYMENT_TERM'),
      isCore: false,
    },
    {
      id: 'sys_audit',
      label: activeLang === 'vi' ? 'Nhật Ký Kiểm Toán' : 'Audit Logs',
      icon: History,
      group: 'system',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('AUDIT'),
      isCore: false,
    },
    {
      id: 'sys_backup',
      label: activeLang === 'vi' ? 'Sao Lưu & Khôi Phục Cloud' : 'Data Backup & Restore',
      icon: Database,
      group: 'system',
      action: onOpenDataBackup,
      isCore: false,
    },
  ];

  // Search filter
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return allNavItems;
    const q = searchQuery.toLowerCase().trim();
    return allNavItems.filter(item => 
      item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [allNavItems, searchQuery]);

  // 5 Workflow-Centric Groups (Enterprise IA)
  const workflowGroups: { 
    key: SidebarGroupKey; 
    index: number;
    title: string; 
    englishTitle: string;
    icon: React.FC<{ className?: string }>;
    quickCount?: string | number;
  }[] = [
    { 
      key: 'commercial', 
      index: 1,
      title: activeLang === 'vi' ? 'Kinh Doanh & Báo Giá' : 'Commercial & Deal Desk', 
      englishTitle: 'Commercial & Deal Desk',
      icon: Briefcase,
      quickCount: savedQuotes.length > 0 ? savedQuotes.length : undefined
    },
    { 
      key: 'pricing', 
      index: 2,
      title: activeLang === 'vi' ? 'Biểu Cước & Trí Tuệ Giá' : 'Pricing & Carrier Intelligence', 
      englishTitle: 'Pricing & Carrier Intelligence',
      icon: TrendingUp,
      quickCount: rateMastersCount > 0 ? rateMastersCount : undefined
    },
    { 
      key: 'operations', 
      index: 3,
      title: activeLang === 'vi' ? 'Vận Hành & Điều Hành Lô Hàng' : 'Operations & Control Tower', 
      englishTitle: 'Operations & Control Tower',
      icon: Ship,
      quickCount: (exceptionsCount + deadlinesCount > 0) ? `${exceptionsCount + deadlinesCount} việc` : undefined
    },
    { 
      key: 'crm', 
      index: 4,
      title: activeLang === 'vi' ? 'Khách Hàng & Công Nợ' : 'CRM & Receivables Intelligence', 
      englishTitle: 'CRM & Receivables Intelligence',
      icon: Users,
      quickCount: customersCount > 0 ? `${customersCount} KH` : undefined
    },
    { 
      key: 'system', 
      index: 5,
      title: activeLang === 'vi' ? 'Hệ Thống, Danh Mục & Quản Trị' : 'System & Master Governance', 
      englishTitle: 'System & Master Governance',
      icon: ShieldCheck,
      quickCount: '1-Click'
    },
  ];

  const areAllWorkflowsExpanded = useMemo(() => {
    return workflowGroups.every(g => expandedGroups[g.key]);
  }, [workflowGroups, expandedGroups]);

  const toggleAllWorkflows = () => {
    const nextState = !areAllWorkflowsExpanded;
    const next: Record<string, boolean> = {};
    workflowGroups.forEach(g => {
      next[g.key] = nextState;
    });
    setExpandedGroups(next);
    persistExpandedGroups(next);
  };

  const pinnedItems = useMemo(() => {
    return allNavItems.filter(item => pinnedIds.includes(item.id));
  }, [allNavItems, pinnedIds]);

  // Minimalist mode thematic groups - 5 Workflow Core Highlights
  const minimalSections = useMemo(() => {
    return [
      {
        id: 'min_commercial',
        title: activeLang === 'vi' ? '1. Kinh Doanh & Báo Giá' : '1. Commercial & Deal Desk',
        icon: Briefcase,
        items: allNavItems.filter(i => 
          ['smart_quotation_workspace', 'quotations_all', 'rfq_inbox', 'deal_closing_accelerator', 'route_presets_hub'].includes(i.id)
        ),
      },
      {
        id: 'min_pricing',
        title: activeLang === 'vi' ? '2. Biểu Cước & Trí Tuệ Giá' : '2. Pricing & Rates',
        icon: TrendingUp,
        items: allNavItems.filter(i => 
          ['pricing_rates', 'exchange_rate_hub', 'pricing_search', 'competitor_radar', 'freight_rate_benchmarking'].includes(i.id)
        ),
      },
      {
        id: 'min_operations',
        title: activeLang === 'vi' ? '3. Vận Hành & Điều Hành Lô Hàng' : '3. Operations & Control Tower',
        icon: Ship,
        items: allNavItems.filter(i => 
          ['ops_control_tower', 'ops_shipments', 'dem_det_port_radar'].includes(i.id)
        ),
      },
      {
        id: 'min_crm',
        title: activeLang === 'vi' ? '4. Khách Hàng & Công Nợ' : '4. CRM & Receivables',
        icon: Users,
        items: allNavItems.filter(i => 
          ['master_customers', 'customer_360_hub', 'customer_dna_power_map', 'quotation_payments', 'debit_note_management'].includes(i.id)
        ),
      },
      {
        id: 'min_system',
        title: activeLang === 'vi' ? '5. Hệ Thống, Danh Mục & Quản Trị' : '5. System & Governance',
        icon: ShieldCheck,
        items: allNavItems.filter(i => 
          ['sys_integrity', 'executive_cockpit', 'sys_profile'].includes(i.id)
        ),
      },
    ];
  }, [allNavItems, activeLang]);

  // Curated list for collapsed mode (Top 10 essential tools only, prevents 50+ icon vertical overflow)
  const collapsedNavItems = useMemo(() => {
    const pinned = allNavItems.filter(i => pinnedIds.includes(i.id));
    const core = allNavItems.filter(i => i.isCore);
    const combined = [...pinned];
    for (const item of core) {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    }
    return combined.slice(0, 10);
  }, [allNavItems, pinnedIds]);

  const handleRoleSwitch = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (onRoleChange) onRoleChange(newRole);
    setShowRoleSelector(false);
  };

  const handleLanguageToggle = () => {
    const nextLang: NavigationLanguage = activeLang === 'vi' ? 'en' : 'vi';
    setActiveLang(nextLang);
    if (onLanguageChange) onLanguageChange(nextLang);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Column with Deep Cosmic Starlight Glass & Void Texture */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#070B14] text-slate-300 flex flex-col border-r border-slate-800/90 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none shadow-2xl ${
          isCollapsed ? 'w-16' : 'w-72'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        {/* Top Header & Branding with Cosmic Starlight Glass */}
        <div className="h-14 px-3.5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-[#0A101E]/95 backdrop-blur-md">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10 border border-slate-700/80 p-0.5 shrink-0 shadow-inner">
              <img 
                src="/logo.png" 
                alt="LogiQuote Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-semibold text-xs text-white tracking-tight block truncate flex items-center gap-1.5">
                  LogiQuote Studio
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">PRO</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal truncate block">
                  {company.shortName || company.name || 'TMS Logistics'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => toggleSidebarCollapse()}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-slate-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
            aria-label="Đóng menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Button: Tạo Báo Giá Mới (Ergonomic Hero CTA) */}
        <div className="p-2.5 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => handleAction(onNewQuote)}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
            } rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40 press-physics focus-ring-physics cursor-pointer group`}
            title={isCollapsed ? (activeLang === 'vi' ? 'Tạo Báo Giá Mới (Ctrl+N)' : 'Create Quotation (Ctrl+N)') : undefined}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Plus className="w-4 h-4 text-white shrink-0 group-hover:rotate-90 transition-transform duration-200" />
              {!isCollapsed && (
                <span className="text-xs font-bold tracking-tight truncate">
                  {activeLang === 'vi' ? 'Tạo Báo Giá Mới' : 'Create Quotation'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-indigo-100 font-mono px-1.5 py-0.5 rounded bg-indigo-700/70 border border-indigo-400/30 text-xs">
                Ctrl+N
              </span>
            )}
          </button>
        </div>

        {/* Quick Search & Minimalist View Mode Switch */}
        {!isCollapsed && (
          <div className="px-2.5 pb-2 shrink-0 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeLang === 'vi' ? 'Tìm nhanh (Ctrl+K)...' : 'Search (Ctrl+K)...'}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus-ring-physics focus:bg-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer press-physics focus-ring-physics rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toggle Minimalist Mode */}
            <button
              type="button"
              onClick={toggleMinimalMode}
              className={`h-7.5 px-2.5 rounded-xl border flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer shrink-0 press-physics focus-ring-physics ${
                isMinimalMode
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/60 shadow-xs'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isMinimalMode ? (activeLang === 'vi' ? 'Đang bật Chế độ Tối giản (Click để xem đầy đủ)' : 'Minimal mode ON (Click to show full)') : (activeLang === 'vi' ? 'Đang xem Đầy đủ (Click để bật tối giản)' : 'Full mode (Click to switch to minimal)')}
            >
              {isMinimalMode ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{isMinimalMode ? (activeLang === 'vi' ? 'Tối giản' : 'Minimal') : (activeLang === 'vi' ? 'Đầy đủ' : 'Full')}</span>
            </button>
          </div>
        )}

        {/* Pinned Favorites Quick Strip (When Expanded & not searching) */}
        {!isCollapsed && !searchQuery && pinnedItems.length > 0 && (
          <div className="px-2.5 py-1.5 border-b border-slate-800/60 shrink-0 bg-slate-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{activeLang === 'vi' ? 'Yêu thích' : 'Favorites'} ({pinnedItems.length})</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pinnedItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeRouteId === item.id;
                return (
                  <div
                    key={`pinned-${item.id}`}
                    className={`inline-flex items-center rounded-lg text-[11px] border transition-all press-physics-subtle ${
                      isActive 
                        ? 'active-nav-glow text-white font-semibold shadow-xs' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAction(item.action)}
                      className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer focus-ring-physics rounded-l-md"
                      title={item.label}
                    >
                      <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'icon-active-glow' : 'text-slate-400'}`} />
                      <span className="truncate max-w-[110px]">{item.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => togglePin(e, item.id)}
                      className="pr-1.5 pl-0.5 py-0.5 text-slate-500 hover:text-amber-400 cursor-pointer press-physics focus-ring-physics rounded-r-md"
                      title="Bỏ ghim"
                    >
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Items Area with Smooth Momentum Scrolling Physics & Dynamic Shadow Hints */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Top Edge Shadow Hint (revealed when scrolled down) */}
          <div 
            className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#0b1120] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollUp ? 'opacity-100' : 'opacity-0'
            }`} 
            aria-hidden="true"
          />

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-xs custom-scrollbar-dark nebula-trail-scrollbar scroll-container-physics"
          >
            
            {/* SEARCH RESULTS VIEW */}
            {searchQuery ? (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-medium text-slate-400">
                  {filteredNavItems.length} {activeLang === 'vi' ? 'kết quả phù hợp' : 'results found'}
                </div>
                {filteredNavItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    {activeLang === 'vi' ? 'Không tìm thấy chức năng' : 'No feature matches found'}
                  </div>
                ) : (
                  filteredNavItems.map((item) => {
                    const isItemPinned = pinnedIds.includes(item.id);
                    const isActive = activeRouteId === item.id;
                    return (
                      <div
                        key={item.id}
                        data-nav-id={item.id}
                        className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all border group overflow-hidden press-physics-subtle cosmic-card-sheen ${
                          isActive 
                            ? 'active-nav-glow text-white font-medium shadow-[0_0_12px_rgba(56,189,248,0.2)]' 
                            : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border-slate-800/80'
                        }`}
                      >
                      {/* Cosmic Laser Beam on Active Item */}
                      {isActive && (
                        <span 
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 cosmic-laser-rail rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" 
                          aria-hidden="true" 
                        >
                          <span className="absolute -top-0.5 left-0 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
                          <span className="absolute -bottom-0.5 left-0 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#c084fc]" />
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleAction(item.action);
                          setSearchQuery('');
                        }}
                        className="flex items-center space-x-2.5 min-w-0 flex-1 text-left cursor-pointer focus-ring-physics rounded-lg py-0.5 pl-0.5"
                      >
                        <item.icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'icon-active-glow' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="text-xs truncate">{item.label}</span>
                      </button>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700/50">
                            {item.badge}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => togglePin(e, item.id)}
                          className="p-1 rounded text-slate-500 hover:text-amber-400 cursor-pointer press-physics focus-ring-physics"
                          title={isItemPinned ? 'Bỏ ghim' : 'Ghim'}
                        >
                          <Star className={`w-3 h-3 ${isItemPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : isCollapsed ? (
            /* COLLAPSED ICON RAIL: Show only the top 10 curated core/pinned tools */
            <div className="space-y-1.5 py-1">
              {collapsedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeRouteId === item.id;
                return (
                  <div key={`collapsed-${item.id}`} data-nav-id={item.id} className="relative group/tooltip flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.restricted) {
                          if (onAccessDenied) onAccessDenied(item.label, item.requiredRoleDesc || activeRole);
                          return;
                        }
                        handleAction(item.action);
                      }}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer press-physics focus-ring-physics ${
                        isActive 
                          ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400/50' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      } ${item.restricted ? 'opacity-50' : ''}`}
                      aria-label={item.label}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'icon-active-glow' : ''}`} />
                    </button>

                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover/tooltip:flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700/80 whitespace-nowrap z-50 pointer-events-none">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isMinimalMode ? (
            /* MINIMALIST WORKSPACE: Pure, zero-noise, essential daily workflow */
            <div className="space-y-3">
              {minimalSections.map((section) => {
                if (section.items.length === 0) return null;
                const SectionIcon = section.icon;
                return (
                  <div key={section.id} className="space-y-1">
                    <div className="px-2 pt-1 pb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <SectionIcon className="w-3 h-3 text-slate-500" />
                      <span>{section.title}</span>
                    </div>

                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isPinned = pinnedIds.includes(item.id);
                        const isActive = activeRouteId === item.id;
                        return (
                          <div
                            key={item.id}
                            data-nav-id={item.id}
                            className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all duration-150 group overflow-hidden press-physics-subtle cosmic-card-sheen ${
                              isActive 
                                ? 'active-nav-glow text-cyan-200 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.2)]' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                            } ${item.restricted ? 'opacity-60' : ''}`}
                          >
                            {/* Cosmic Laser Beam on Active Item */}
                            {isActive && (
                              <span 
                                className="absolute left-0 top-1.5 bottom-1.5 w-1 cosmic-laser-rail rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" 
                                aria-hidden="true"
                              >
                                <span className="absolute -top-0.5 left-0 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
                                <span className="absolute -bottom-0.5 left-0 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#c084fc]" />
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (item.restricted) {
                                  if (onAccessDenied) onAccessDenied(item.label, item.requiredRoleDesc || activeRole);
                                  return;
                                }
                                handleAction(item.action);
                              }}
                              className="flex-1 flex items-center space-x-2.5 min-w-0 text-left cursor-pointer pl-0.5 focus-ring-physics rounded-lg py-0.5"
                            >
                              <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-indigo-400 icon-active-glow' : 'text-slate-400 group-hover:text-slate-200'}`} />
                              <span className="text-xs truncate">{item.label}</span>
                            </button>

                            <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border bg-slate-900 border-slate-800 text-slate-300">
                                  {item.badge}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => togglePin(e, item.id)}
                                className={`p-0.5 rounded transition-opacity cursor-pointer press-physics focus-ring-physics ${
                                  isPinned 
                                    ? 'text-amber-400 opacity-100' 
                                    : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                                }`}
                                title={isPinned ? 'Bỏ ghim' : 'Ghim'}
                              >
                                <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Minimal Mode Expander Button */}
              <div className="pt-2 px-0.5">
                <button
                  type="button"
                  onClick={toggleMinimalMode}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 transition-all text-left cursor-pointer group press-physics focus-ring-physics"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-slate-300 group-hover:text-white">
                        {activeLang === 'vi' ? 'Xem tất cả tính năng' : 'Show All Modules'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {activeLang === 'vi' ? 'Mở rộng 5 luồng công tác chuyên sâu' : 'Expand 5 complete enterprise workflows'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* FULL WORKSPACE: 5 Workflow-Centric Desks (Commercial -> Pricing -> Operations -> CRM -> System) */
            <>
              {/* Top View Controls Header */}
              <div className="flex items-center justify-between gap-1.5 pb-2 px-0.5">
                <button
                  type="button"
                  onClick={toggleMinimalMode}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer press-physics focus-ring-physics"
                >
                  <Eye className="w-3 h-3 text-indigo-400" />
                  <span>{activeLang === 'vi' ? 'Bật chế độ tối giản' : 'Switch to Minimalist View'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleAllWorkflows}
                  className="px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-medium transition-colors cursor-pointer shrink-0 press-physics focus-ring-physics"
                  title={areAllWorkflowsExpanded ? 'Thu gọn tất cả luồng' : 'Mở rộng tất cả luồng'}
                >
                  {areAllWorkflowsExpanded 
                    ? (activeLang === 'vi' ? 'Thu gọn tất cả' : 'Collapse all') 
                    : (activeLang === 'vi' ? 'Mở tất cả' : 'Expand all')}
                </button>
              </div>

              {/* 5 Enterprise Workflow Groups */}
              <div className="space-y-2">
                {workflowGroups.map((group) => {
                  const groupItems = allNavItems.filter(item => item.group === group.key);
                  if (groupItems.length === 0) return null;

                  const isExpanded = expandedGroups[group.key] ?? false;
                  const GroupIcon = group.icon;
                  const hasActiveChild = groupItems.some(i => i.id === activeRouteId);

                  return (
                    <div 
                      key={group.key} 
                      className={`rounded-xl border transition-all ${
                        hasActiveChild 
                          ? 'bg-slate-900/80 border-indigo-500/35 shadow-xs' 
                          : 'bg-slate-900/35 border-slate-800/60 hover:border-slate-700/60'
                      }`}
                    >
                      {/* Workflow Desk Header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 text-left cursor-pointer transition-colors rounded-xl select-none press-physics-subtle focus-ring-physics ${
                          hasActiveChild 
                            ? 'text-white' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                        }`}
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                            hasActiveChild 
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' 
                              : 'bg-slate-800 text-slate-400 border-slate-700/60'
                          }`}>
                            0{group.index}
                          </span>
                          <GroupIcon className={`w-3.5 h-3.5 shrink-0 ${hasActiveChild ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <span className="text-[11px] font-semibold tracking-tight truncate">
                            {group.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          {group.quickCount && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-slate-400 bg-slate-950/80 border border-slate-800">
                              {group.quickCount}
                            </span>
                          )}
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        </div>
                      </button>

                      {/* Workflow Module List */}
                      {isExpanded && (
                        <div className="px-1.5 pb-1.5 pt-0.5 space-y-0.5 border-t border-slate-800/60">
                          {groupItems.map((item) => {
                            const Icon = item.icon;
                            const isPinned = pinnedIds.includes(item.id);
                            const isActive = activeRouteId === item.id;

                            return (
                              <div
                                key={item.id}
                                data-nav-id={item.id}
                                className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 group overflow-hidden press-physics-subtle cosmic-card-sheen ${
                                  isActive 
                                    ? 'active-nav-glow text-white font-medium shadow-[0_0_12px_rgba(56,189,248,0.2)]' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                                } ${item.restricted ? 'opacity-60' : ''}`}
                              >
                                {/* Cosmic Laser Beam on Active Item */}
                                {isActive && (
                                  <span 
                                    className="absolute left-0 top-1.5 bottom-1.5 w-1 cosmic-laser-rail rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" 
                                    aria-hidden="true"
                                  >
                                    <span className="absolute -top-0.5 left-0 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
                                    <span className="absolute -bottom-0.5 left-0 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#c084fc]" />
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.restricted) {
                                      if (onAccessDenied) onAccessDenied(item.label, item.requiredRoleDesc || activeRole);
                                      return;
                                    }
                                    handleAction(item.action);
                                  }}
                                  className="flex-1 flex items-center space-x-2.5 min-w-0 text-left cursor-pointer pl-0.5 focus-ring-physics rounded-md py-0.5"
                                >
                                  <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-indigo-400 icon-active-glow' : 'text-slate-400 group-hover:text-slate-300'}`} />
                                  <span className="text-xs truncate">{item.label}</span>
                                </button>

                                <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                                  {item.restricted && (
                                    <span title={item.requiredRoleDesc} className="inline-flex items-center">
                                      <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                                    </span>
                                  )}

                                  {item.badge && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border bg-slate-950 border-slate-800 text-slate-300">
                                      {item.badge}
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => togglePin(e, item.id)}
                                    className={`p-0.5 rounded transition-opacity cursor-pointer press-physics focus-ring-physics ${
                                      isPinned 
                                        ? 'text-amber-400 opacity-100' 
                                        : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                                    }`}
                                    title={isPinned ? (activeLang === 'vi' ? 'Bỏ ghim' : 'Unpin') : (activeLang === 'vi' ? 'Ghim yêu thích' : 'Pin to top')}
                                  >
                                    <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          </div>

          {/* Bottom Edge Shadow Hint (revealed when more content is below) */}
          <div 
            className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0b1120] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              canScrollDown ? 'opacity-100' : 'opacity-0'
            }`} 
            aria-hidden="true"
          />

          {/* Floating Scroll-To-Top Button */}
          {canScrollUp && (
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="absolute bottom-2.5 right-3 z-20 p-1.5 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl press-physics focus-ring-physics cursor-pointer transition-all flex items-center justify-center backdrop-blur-xs"
              title={activeLang === 'vi' ? 'Cuộn lên đầu danh mục' : 'Scroll to top'}
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>

        {/* Sidebar Bottom Footer: User, Role & Sync status */}
        <div className="p-2.5 bg-[#0d1527] border-t border-slate-800/80 text-slate-400 flex flex-col gap-2 shrink-0">
          
          {!isCollapsed ? (
            <div className="relative">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div 
                  className="flex items-center space-x-2.5 min-w-0 cursor-pointer press-physics-subtle rounded-lg p-0.5"
                  onClick={() => onOpenAuthModal && onOpenAuthModal()}
                  title="Quản lý tài khoản"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {company.salesRepName ? company.salesRepName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate hover:text-slate-300">
                      {company.salesRepName || 'Chuyên viên Logistics'}
                    </div>
                    {Boolean((import.meta as any).env?.DEV) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRoleSelector(!showRoleSelector);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer press-physics focus-ring-physics rounded px-1"
                        title="Chế độ DEV: Đổi vai trò kiểm thử"
                      >
                        <span>{activeRole}</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <span>{activeRole}</span>
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Language Switcher */}
                <button
                  type="button"
                  onClick={handleLanguageToggle}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer press-physics focus-ring-physics"
                  title="Chuyển ngôn ngữ / Switch language"
                >
                  <span className={activeLang === 'vi' ? 'text-white' : 'text-slate-500'}>VI</span>
                  <span className="mx-0.5 text-slate-600">/</span>
                  <span className={activeLang === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
                </button>
              </div>

              {/* RBAC Role Selector Dropdown (DEV MODE ONLY) */}
              {showRoleSelector && Boolean((import.meta as any).env?.DEV) && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-amber-400 tracking-wider">
                    Chuyển vai trò (DEV TEST)
                  </div>
                  {(['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'PRICING_SPECIALIST', 'VIEWER'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer press-physics-subtle focus-ring-physics ${
                        activeRole === r 
                          ? 'bg-slate-800 text-white font-semibold' 
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span>
                        {r === 'ADMIN' && t.roleAdmin}
                        {r === 'SALES_MANAGER' && t.roleSalesManager}
                        {r === 'SALES_REP' && t.roleSalesRep}
                        {r === 'PRICING_SPECIALIST' && t.rolePricingSpecialist}
                        {r === 'VIEWER' && t.roleViewer}
                      </span>
                      {activeRole === r && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Collapsed Footer Profile Icon */
            <div className="flex flex-col items-center gap-2 py-1">
              <button
                type="button"
                onClick={handleLanguageToggle}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center justify-center hover:bg-slate-800 cursor-pointer press-physics focus-ring-physics"
                title="VI / EN"
              >
                {activeLang.toUpperCase()}
              </button>
              <div 
                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white flex items-center justify-center text-xs font-semibold cursor-pointer"
                onClick={() => onOpenAuthModal && onOpenAuthModal()}
                title={`${company.salesRepName || 'User'} (${activeRole})`}
              >
                {company.salesRepName ? company.salesRepName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          )}

          {/* Real-time Cloud Auto-Save & Rate status */}
          {!isCollapsed && (
            <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>{isAutoSaving ? 'Đang lưu Cloud...' : 'Đã đồng bộ'}:</span>
                <span className="font-mono text-slate-300">
                  {lastAutoSaveTime || 'Sẵn sàng'}
                </span>
              </span>

              <span className="font-mono text-slate-400">
                1 USD = {exchangeRate.toLocaleString()}₫
              </span>
            </div>
          )}

        </div>

      </aside>
    </>
  );
};
