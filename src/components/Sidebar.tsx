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
  Swords
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
  | 'quotation' 
  | 'operations' 
  | 'pricing' 
  | 'documents' 
  | 'masterData' 
  | 'analytics' 
  | 'system';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole>(currentUserRole);
  const [activeLang, setActiveLang] = useState<NavigationLanguage>(language);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveRole(currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  const t = NAVIGATION_I18N[activeLang];

  // Pinned favorites
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadSavedPinnedFavorites());

  // Default expanded groups: clean logical breakdown
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>(() => {
    const saved = loadSavedExpandedGroups();
    return Object.keys(saved).length > 0 
      ? saved 
      : { 
          quotation: true, 
          operations: true, 
          pricing: true, 
          documents: false, 
          masterData: false, 
          analytics: false, 
          system: false 
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

  // Navigation Items - Structured for Enterprise Logistics
  const allNavItems: NavItem[] = [
    // === 1. BÁO GIÁ & THƯƠNG MẠI (QUOTATION & COMMERCIAL) ===
    {
      id: 'smart_quotation_workspace',
      label: activeLang === 'vi' ? 'Bàn Làm Việc Báo Giá' : 'Quotation Workbench',
      icon: Sparkles,
      group: 'quotation',
      action: () => onOpenSmartQuotationWorkspace && onOpenSmartQuotationWorkspace(),
    },
    {
      id: 'quotations_all',
      label: activeLang === 'vi' ? 'Tất Cả Báo Giá' : 'All Quotations',
      icon: FileText,
      group: 'quotation',
      action: () => onOpenSavedQuotes('ALL'),
      badge: savedQuotes.length > 0 ? savedQuotes.length : null,
      badgeTone: 'default',
    },
    {
      id: 'quotations_draft',
      label: activeLang === 'vi' ? 'Bản Nháp' : 'Draft Quotes',
      icon: Clock,
      group: 'quotation',
      action: () => onOpenSavedQuotes('DRAFT'),
      badge: draftsCount > 0 ? draftsCount : null,
      badgeTone: 'default',
    },
    {
      id: 'quotations_pending',
      label: activeLang === 'vi' ? 'Chờ Phê Duyệt' : 'Pending Approval',
      icon: CheckCircle2,
      group: 'quotation',
      action: () => onOpenSavedQuotes('PENDING_APPROVAL'),
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeTone: pendingApprovalCount > 0 ? 'amber' : 'default',
    },
    {
      id: 'quotations_sent',
      label: activeLang === 'vi' ? 'Đã Gửi Khách Hàng' : 'Sent Quotations',
      icon: Send,
      group: 'quotation',
      action: () => onOpenSavedQuotes('SENT'),
      badge: sentCount > 0 ? sentCount : null,
      badgeTone: 'emerald',
    },
    {
      id: 'rfq_inbox',
      label: activeLang === 'vi' ? 'Hộp Thư RFQ & Tạo Giá 5s' : 'Smart RFQ Inbox (5s)',
      icon: Inbox,
      group: 'quotation',
      action: () => onOpenRfqInbox && onOpenRfqInbox(),
      badge: '3 mới',
      badgeTone: 'emerald',
    },
    {
      id: 'engagement_radar',
      label: activeLang === 'vi' ? 'Radar Khách Hàng (Live)' : 'Live Engagement Radar',
      icon: Radar,
      group: 'quotation',
      action: () => onOpenEngagementRadar && onOpenEngagementRadar(),
      badge: activeEngagementsCount > 0 ? `${activeEngagementsCount} online` : undefined,
      badgeTone: activeEngagementsCount > 0 ? 'emerald' : 'default',
    },
    {
      id: 'deal_closing_accelerator',
      label: activeLang === 'vi' ? 'Trợ Lý Chốt Deal (Gói B)' : 'Deal Closer Suite',
      icon: Award,
      group: 'quotation',
      action: () => onOpenDealCloser && onOpenDealCloser(),
      badge: 'Hot Deal',
      badgeTone: 'emerald',
    },
    {
      id: 'competitor_radar',
      label: activeLang === 'vi' ? 'Radar Giá Đối Thủ & Win-Rate' : 'Competitor & Win-Rate',
      icon: Swords,
      group: 'quotation',
      action: () => onOpenCompetitorRadar && onOpenCompetitorRadar(),
      badge: 'P50 Sweet',
      badgeTone: 'sky',
    },
    {
      id: 'customer_reengagement',
      label: activeLang === 'vi' ? 'Đánh Thức Khách Cũ (Chu Kỳ)' : 'Shipper Re-engagement',
      icon: UserCheck,
      group: 'quotation',
      action: () => onOpenCustomerReengagement && onOpenCustomerReengagement(),
      badge: dormantCustomersCount > 0 ? `${dormantCustomersCount} cần gọi` : undefined,
      badgeTone: 'amber',
    },
    {
      id: 'opportunity_radar',
      label: activeLang === 'vi' ? 'Radar Cơ Hội Kinh Doanh' : 'Opportunity Radar',
      icon: Radar,
      group: 'quotation',
      action: () => onOpenOpportunityRadar && onOpenOpportunityRadar(),
    },
    {
      id: 'decision_workspace',
      label: activeLang === 'vi' ? 'Phòng Quyết Định & Kịch Bản' : 'Decision Workspace',
      icon: SlidersHorizontal,
      group: 'quotation',
      action: () => onOpenDecisionWorkspace && onOpenDecisionWorkspace(),
    },
    {
      id: 'quotation_followup',
      label: activeLang === 'vi' ? 'Lịch Chăm Sóc Khách' : 'Follow-up Schedule',
      icon: Calendar,
      group: 'quotation',
      action: () => onOpenFollowUps && onOpenFollowUps(),
    },

    // === 2. ĐIỀU HÀNH & LÔ HÀNG (OPERATIONS & CONTROL TOWER) ===
    {
      id: 'ops_control_tower',
      label: activeLang === 'vi' ? 'Tháp Điều Hành Logistics' : 'Control Tower',
      icon: Radar,
      group: 'operations',
      action: () => onOpenControlTower && onOpenControlTower(),
      badge: exceptionsCount > 0 ? `${exceptionsCount} cảnh báo` : undefined,
      badgeTone: exceptionsCount > 0 ? 'rose' : 'default',
    },
    {
      id: 'ops_shipments',
      label: activeLang === 'vi' ? 'Điều Hành Lô Hàng' : 'Shipment Operations',
      icon: Package,
      group: 'operations',
      action: () => onOpenShipmentWorkspace && onOpenShipmentWorkspace(),
      badge: shipmentsCount > 0 ? shipmentsCount : undefined,
      badgeTone: 'sky',
    },
    {
      id: 'ops_action_center',
      label: activeLang === 'vi' ? 'Hạn Chót & Hành Động' : 'Deadline & Action Center',
      icon: Clock,
      group: 'operations',
      action: () => onOpenActionCenter && onOpenActionCenter(),
      badge: deadlinesCount > 0 ? `${deadlinesCount} việc` : undefined,
      badgeTone: deadlinesCount > 0 ? 'amber' : 'default',
    },

    // === 3. BIỂU CƯỚC & ĐỊNH GIÁ (RATES & PRICING) ===
    {
      id: 'pricing_rates',
      label: activeLang === 'vi' ? 'Biểu Cước Master Rates' : 'Master Rates Hub',
      icon: Database,
      group: 'pricing',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('RATES'),
      badge: rateMastersCount > 0 ? rateMastersCount : null,
    },
    {
      id: 'pricing_contracts',
      label: activeLang === 'vi' ? 'Quản Lý Hợp Đồng' : 'Contracts Hub',
      icon: FileText,
      group: 'pricing',
      action: () => onOpenContracts && onOpenContracts(),
      badge: contractsCount > 0 ? contractsCount : null,
    },
    {
      id: 'pricing_search',
      label: activeLang === 'vi' ? 'Tra Cứu Cước Nhanh' : 'Rate Search',
      icon: Search,
      group: 'pricing',
      action: () => onOpenRateSearch && onOpenRateSearch(),
    },
    {
      id: 'pricing_smart',
      label: activeLang === 'vi' ? 'Trợ Lý Ghép Giá AI' : 'Smart Rate Assistant',
      icon: Sparkles,
      group: 'pricing',
      action: () => onOpenSmartAssistant && onOpenSmartAssistant(),
      badge: 'AI',
      badgeTone: 'emerald',
    },
    {
      id: 'pricing_profit',
      label: activeLang === 'vi' ? 'Phân Tích Lợi Nhuận' : 'Profit Intelligence',
      icon: TrendingUp,
      group: 'pricing',
      action: () => onOpenProfitIntelligence && onOpenProfitIntelligence(),
      restricted: !canViewProfitability,
      requiredRoleDesc: 'RBAC',
    },
    {
      id: 'pricing_policies',
      label: activeLang === 'vi' ? 'Chính Sách Định Giá' : 'Pricing Policies',
      icon: Sliders,
      group: 'pricing',
      action: () => onOpenPricingPolicies && onOpenPricingPolicies(),
      restricted: !isAdminOrManager,
      requiredRoleDesc: 'Manager',
    },

    // === 4. TÀI LIỆU & ẤN BẢN (DOCUMENTS & OUTPUT) ===
    {
      id: 'quotation_preview',
      label: activeLang === 'vi' ? 'Xem Trước Bản In (A4)' : 'Print Preview (A4)',
      icon: Printer,
      group: 'documents',
      action: () => onOpenPreview && onOpenPreview(),
    },
    {
      id: 'quotation_document_center',
      label: activeLang === 'vi' ? 'Trung Tâm Tài Liệu & Gửi' : 'Document & Comm Hub',
      icon: Layers,
      group: 'documents',
      action: () => onOpenDocumentCenter && onOpenDocumentCenter(),
    },
    {
      id: 'quotation_snapshots',
      label: activeLang === 'vi' ? 'Lịch Sử Ấn Bản Snapshots' : 'Document Snapshots',
      icon: History,
      group: 'documents',
      action: () => onOpenDocumentHistory && onOpenDocumentHistory(),
    },
    {
      id: 'quotation_templates',
      label: activeLang === 'vi' ? 'Mẫu Thiết Kế Báo Giá' : 'Quotation Templates',
      icon: Layout,
      group: 'documents',
      action: () => onOpenTemplateBuilder && onOpenTemplateBuilder(),
    },
    {
      id: 'quotation_email_templates',
      label: activeLang === 'vi' ? 'Mẫu Email Gửi Khách' : 'Email Templates',
      icon: Mail,
      group: 'documents',
      action: () => onOpenEmailTemplates && onOpenEmailTemplates(),
    },

    // === 5. DANH MỤC & ĐỐI TÁC (MASTER DATA & CRM) ===
    {
      id: 'master_customers',
      label: activeLang === 'vi' ? 'Danh Bạ Khách Hàng (CRM)' : 'Customer Directory',
      icon: Users,
      group: 'masterData',
      action: onOpenCustomers,
      badge: customersCount > 0 ? customersCount : null,
    },
    {
      id: 'master_suppliers',
      label: activeLang === 'vi' ? 'Hãng Tàu & Nhà Xe' : 'Carriers & Suppliers',
      icon: Ship,
      group: 'masterData',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('SUPPLIERS'),
    },
    {
      id: 'master_charges',
      label: activeLang === 'vi' ? 'Mã Cước & Khoản Phí' : 'Charge Master',
      icon: Layers,
      group: 'masterData',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('CHARGES'),
      badge: chargeMastersCount > 0 ? chargeMastersCount : null,
    },
    {
      id: 'master_surcharges',
      label: activeLang === 'vi' ? 'Danh Mục Phụ Phí' : 'Surcharges Catalog',
      icon: Receipt,
      group: 'masterData',
      action: onOpenSurchargeCatalog,
      badge: surchargesCount > 0 ? surchargesCount : null,
    },
    {
      id: 'master_ports',
      label: activeLang === 'vi' ? 'Cảng Biển & Sân Bay' : 'Ports & Locations',
      icon: Anchor,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PORT'),
    },
    {
      id: 'master_containers',
      label: activeLang === 'vi' ? 'Quy Cách Container & Xe' : 'Containers & Trucks',
      icon: Box,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('CONTAINER_TYPE'),
    },
    {
      id: 'master_incoterms',
      label: activeLang === 'vi' ? 'Điều Khoản Incoterms 2020' : 'Incoterms Rules',
      icon: FileCheck2,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('INCOTERM'),
    },
    {
      id: 'master_payment_terms',
      label: activeLang === 'vi' ? 'Điều Khoản Thanh Toán' : 'Payment Terms',
      icon: CreditCard,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PAYMENT_TERM'),
    },

    // === 6. BÁO CÁO & PHÂN TÍCH (ANALYTICS & BI) ===
    {
      id: 'analytics_overview',
      label: activeLang === 'vi' ? 'Báo Cáo Tổng Quan & KPIs' : 'Analytics & KPIs',
      icon: LayoutDashboard,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('OVERVIEW'),
    },
    {
      id: 'analytics_funnel',
      label: activeLang === 'vi' ? 'Phễu Chuyển Đổi Báo Giá' : 'Conversion Funnel',
      icon: TrendingUp,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('FUNNEL'),
    },
    {
      id: 'analytics_sales',
      label: activeLang === 'vi' ? 'Hiệu Suất Nhân Viên Sales' : 'Sales Performance',
      icon: Users,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('SALES'),
    },
    {
      id: 'analytics_lanes',
      label: activeLang === 'vi' ? 'Phân Tích Tuyến Vận Chuyển' : 'Trade Lanes Analytics',
      icon: Compass,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('LANES_SERVICES'),
    },

    // === 7. HỆ THỐNG & CẤU HÌNH (SYSTEM & SETTINGS) ===
    {
      id: 'sys_profile',
      label: activeLang === 'vi' ? 'Hồ Sơ Doanh Nghiệp' : 'Company Profile',
      icon: Building2,
      group: 'system',
      action: () => onOpenCompanyProfile('profile'),
    },
    {
      id: 'sys_financial',
      label: activeLang === 'vi' ? 'Cấu Hình Tài Chính & Thuế' : 'Financial & Tax Engine',
      icon: Receipt,
      group: 'system',
      action: () => onOpenCompanyProfile('financial'),
    },
    {
      id: 'sys_sales_bank',
      label: activeLang === 'vi' ? 'Tài Khoản Ngân Hàng' : 'Bank Accounts',
      icon: UserCheck,
      group: 'system',
      action: () => onOpenCompanyProfile('sales'),
    },
    {
      id: 'sys_integrity',
      label: activeLang === 'vi' ? 'Toàn Vẹn Dữ Liệu & Sức Khỏe' : 'Data Integrity Health',
      icon: ShieldCheck,
      group: 'system',
      action: () => onOpenIntegrityDashboard && onOpenIntegrityDashboard(),
    },
    {
      id: 'sys_audit',
      label: activeLang === 'vi' ? 'Nhật Ký Kiểm Toán' : 'Audit Logs',
      icon: History,
      group: 'system',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('AUDIT'),
    },
    {
      id: 'sys_backup',
      label: activeLang === 'vi' ? 'Sao Lưu & Khôi Phục' : 'Data Backup & Restore',
      icon: Database,
      group: 'system',
      action: onOpenDataBackup,
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

  // Clean, professional group taxonomy with calm titles
  const groups: { 
    key: SidebarGroupKey; 
    title: string; 
    icon: React.FC<{ className?: string }>;
    quickCount?: string | number;
  }[] = [
    { 
      key: 'quotation', 
      title: activeLang === 'vi' ? 'Báo giá & Thương mại' : 'Quotation & Sales', 
      icon: FileText,
      quickCount: savedQuotes.length > 0 ? savedQuotes.length : undefined
    },
    { 
      key: 'operations', 
      title: activeLang === 'vi' ? 'Điều hành & Lô hàng' : 'Operations & Logistics', 
      icon: Ship,
      quickCount: (exceptionsCount + deadlinesCount > 0) ? `${exceptionsCount + deadlinesCount} lưu ý` : undefined
    },
    { 
      key: 'pricing', 
      title: activeLang === 'vi' ? 'Biểu cước & Định giá' : 'Rates & Pricing', 
      icon: Sliders,
      quickCount: rateMastersCount > 0 ? rateMastersCount : undefined
    },
    { 
      key: 'documents', 
      title: activeLang === 'vi' ? 'Tài liệu & Ấn bản' : 'Documents & Output', 
      icon: Layers 
    },
    { 
      key: 'masterData', 
      title: activeLang === 'vi' ? 'Danh mục & CRM' : 'Master Data & CRM', 
      icon: Database,
      quickCount: customersCount > 0 ? customersCount : undefined
    },
    { 
      key: 'analytics', 
      title: activeLang === 'vi' ? 'Báo cáo & Phân tích' : 'Analytics & BI', 
      icon: TrendingUp 
    },
    { 
      key: 'system', 
      title: activeLang === 'vi' ? 'Hệ thống & Cài đặt' : 'System Settings', 
      icon: Settings 
    },
  ];

  const pinnedItems = useMemo(() => {
    return allNavItems.filter(item => pinnedIds.includes(item.id));
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

      {/* Main Sidebar Column */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#0b1120] text-slate-300 flex flex-col border-r border-slate-800/80 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none shadow-xl ${
          isCollapsed ? 'w-16' : 'w-72'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        {/* Top Header & Branding */}
        <div className="h-14 px-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0d1527]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-semibold text-xs text-white tracking-tight block truncate">
                  LogiQuote Studio
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
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            } rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-all duration-150 cursor-pointer group active:scale-[0.99]`}
            title={isCollapsed ? (activeLang === 'vi' ? 'Tạo Báo Giá Mới (Ctrl+N)' : 'Create Quotation (Ctrl+N)') : undefined}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Plus className="w-4 h-4 text-white shrink-0 group-hover:rotate-90 transition-transform duration-200" />
              {!isCollapsed && (
                <span className="text-xs font-semibold tracking-tight truncate">
                  {activeLang === 'vi' ? 'Tạo Báo Giá Mới' : 'Create Quotation'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-emerald-100/90 font-mono px-1.5 py-0.5 rounded bg-emerald-700/60 text-xs">
                Ctrl+N
              </span>
            )}
          </button>
        </div>

        {/* Quick Search & Command Filter */}
        {!isCollapsed && (
          <div className="px-2.5 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeLang === 'vi' ? 'Tìm chức năng (Ctrl+K)...' : 'Search features (Ctrl+K)...'}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:bg-slate-900 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
                    className={`inline-flex items-center rounded-md text-[11px] border transition-colors ${
                      isActive 
                        ? 'bg-slate-800 text-white border-slate-700' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAction(item.action)}
                      className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer"
                      title={item.label}
                    >
                      <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[110px]">{item.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => togglePin(e, item.id)}
                      className="pr-1.5 pl-0.5 py-0.5 text-slate-500 hover:text-amber-400 cursor-pointer"
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

        {/* Navigation Items Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-xs custom-scrollbar">
          
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors border group ${
                        isActive 
                          ? 'bg-slate-800 text-white border-slate-700 font-medium' 
                          : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border-slate-800/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleAction(item.action);
                          setSearchQuery('');
                        }}
                        className="flex items-center space-x-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <item.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
                        <span className="text-xs truncate">{item.label}</span>
                      </button>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                            {item.badge}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => togglePin(e, item.id)}
                          className="p-1 rounded text-slate-500 hover:text-amber-400 cursor-pointer"
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
          ) : (
            /* CLEAN LOGICAL WORKFLOW GROUPS */
            groups.map((group) => {
              const groupItems = allNavItems.filter(item => item.group === group.key);
              if (groupItems.length === 0) return null;

              const isExpanded = expandedGroups[group.key] ?? false;
              const GroupIcon = group.icon;
              const hasActiveChild = groupItems.some(i => i.id === activeRouteId);

              return (
                <div key={group.key} className="space-y-0.5">
                  
                  {/* Category Header */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors text-left cursor-pointer ${
                        hasActiveChild 
                          ? 'text-white' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <GroupIcon className={`w-3.5 h-3.5 shrink-0 ${hasActiveChild ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="truncate">{group.title}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {group.quickCount && !isExpanded && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-slate-400 bg-slate-900/80 border border-slate-800">
                            {group.quickCount}
                          </span>
                        )}
                        <span className="text-slate-500">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </button>
                  ) : (
                    /* Collapsed icon divider */
                    <div className="w-full py-1.5 flex items-center justify-center border-t border-slate-800/80">
                      <GroupIcon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                  )}

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="space-y-0.5 pl-1">
                      {groupItems.map((item) => {
                        const Icon = item.icon;
                        const isPinned = pinnedIds.includes(item.id);
                        const isActive = activeRouteId === item.id;

                        // Collapsed Mode Item
                        if (isCollapsed) {
                          return (
                            <div key={item.id} className="relative group/tooltip">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.restricted) {
                                    if (onAccessDenied) onAccessDenied(item.label, item.requiredRoleDesc || activeRole);
                                    return;
                                  }
                                  handleAction(item.action);
                                }}
                                className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                                  isActive 
                                    ? 'bg-slate-800 text-white font-medium border-l-2 border-emerald-400' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                } ${item.restricted ? 'opacity-50' : ''}`}
                                aria-label={item.label}
                              >
                                <Icon className="w-4 h-4 shrink-0" />
                              </button>

                              {/* Floating Tooltip in Collapsed Mode */}
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tooltip:flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-800 whitespace-nowrap z-50 pointer-events-none">
                                <span>{item.label}</span>
                                {item.badge && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Expanded Mode Item
                        return (
                          <div
                            key={item.id}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors group ${
                              isActive 
                                ? 'bg-slate-800 text-white font-medium border-l-2 border-emerald-400 pl-2' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                            } ${item.restricted ? 'opacity-60' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (item.restricted) {
                                  if (onAccessDenied) onAccessDenied(item.label, item.requiredRoleDesc || activeRole);
                                  return;
                                }
                                handleAction(item.action);
                              }}
                              className="flex-1 flex items-center space-x-2.5 min-w-0 text-left cursor-pointer"
                            >
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                              <span className="text-xs truncate">{item.label}</span>
                            </button>

                            <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                              {item.restricted && (
                                <span title={item.requiredRoleDesc} className="inline-flex items-center">
                                  <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                                </span>
                              )}

                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border ${
                                  item.badgeTone === 'amber'
                                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                                    : item.badgeTone === 'emerald'
                                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                    : item.badgeTone === 'rose'
                                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                                    : item.badgeTone === 'sky'
                                    ? 'bg-sky-950/40 border-sky-800/60 text-sky-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}>
                                  {item.badge}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => togglePin(e, item.id)}
                                className={`p-0.5 rounded transition-opacity cursor-pointer ${
                                  isPinned 
                                    ? 'text-amber-400 opacity-100' 
                                    : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                                }`}
                                title={isPinned ? 'Bỏ ghim' : 'Ghim'}
                              >
                                <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* Sidebar Bottom Footer: User, Role & Sync status */}
        <div className="p-2.5 bg-[#0d1527] border-t border-slate-800/80 text-slate-400 flex flex-col gap-2 shrink-0">
          
          {!isCollapsed ? (
            <div className="relative">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div 
                  className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
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
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer"
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
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
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
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
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
                className="w-8 h-8 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center justify-center hover:bg-slate-800 cursor-pointer"
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
