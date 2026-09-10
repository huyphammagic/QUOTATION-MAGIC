import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CompanyProfile, QuoteData } from '../types/logistics';
import { UserRole, ROLE_PERMISSIONS } from '../types/analytics';
import { NavigationLanguage, NAVIGATION_I18N } from '../i18n/navigation';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  Eye, 
  Settings, 
  FileText, 
  Plus, 
  Printer, 
  Users, 
  Receipt, 
  Coins, 
  Database, 
  Ship, 
  Sparkles,
  Layers,
  History,
  FileDown,
  Layout,
  Archive,
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
  Plane,
  Truck,
  FileCheck2,
  Anchor,
  Box,
  Lock,
  Compass,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export interface SidebarProps {
  company: CompanyProfile;
  savedQuotes: QuoteData[];
  customersCount?: number;
  surchargesCount?: number;
  rateMastersCount?: number;
  chargeMastersCount?: number;
  contractsCount?: number;
  exchangeRate: number;
  lastAutoSaveTime: string | null;
  isAutoSaving?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewQuote: () => void;
  onOpenSavedQuotes: (filter?: string) => void;
  onOpenCompanyProfile: (tab?: 'profile' | 'sales' | 'bank' | 'preview') => void;
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
  onOpenSmartQuotationWorkspace?: () => void;
  onOpenEmailTemplates?: () => void;
  onOpenFollowUps?: () => void;
  onOpenDashboard?: (tab?: string) => void;
  onOpenContracts?: () => void;
  onOpenProfitIntelligence?: () => void;
  onOpenPricingPolicies?: () => void;
  onOpenMasterDataReference?: (type: 'PORT' | 'CONTAINER_TYPE' | 'INCOTERM' | 'PAYMENT_TERM') => void;
  onSelectTransportMode?: (mode: 'SEA_FCL' | 'SEA_LCL' | 'AIR_FREIGHT' | 'INLAND_TRUCKING' | 'CUSTOMS_CLEARANCE') => void;
  currentUserRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  language?: NavigationLanguage;
  onLanguageChange?: (lang: NavigationLanguage) => void;
  activeRouteId?: string;
  onOpenIntegrityDashboard?: () => void;
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
  onOpenGeneratePdf,
  onOpenSendModal,
  onOpenCommunication,
  onOpenSmartQuotationWorkspace,
  onOpenEmailTemplates,
  onOpenFollowUps,
  onOpenDashboard,
  onOpenContracts,
  onOpenProfitIntelligence,
  onOpenPricingPolicies,
  onOpenMasterDataReference,
  onSelectTransportMode,
  currentUserRole = 'ADMIN',
  onRoleChange,
  language = 'vi',
  onLanguageChange,
  activeRouteId = 'quotation_workbench',
  onOpenIntegrityDashboard,
}) => {
  // Collapsed state (icon-only mode)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole>(currentUserRole);
  const [activeLang, setActiveLang] = useState<NavigationLanguage>(language);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronize incoming role or language props
  useEffect(() => {
    setActiveRole(currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  const t = NAVIGATION_I18N[activeLang];

  // Pinned favorite items IDs
  const [pinnedIds, setPinnedIds] = useState<string[]>([
    'quotations_all',
    'pricing_rates',
    'master_customers',
    'pricing_contracts',
  ]);

  // Collapsible Group states
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    main: true,
    quotation: true,
    pricing: true,
    masterData: false,
    operations: false,
    analytics: false,
    system: false,
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleAction = (callback: () => void) => {
    callback();
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Keyboard shortcut Ctrl+K to search navigation & Escape to close mobile
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

  // Real-time counter calculations from loaded memory (Zero fake badges!)
  const pendingApprovalCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'PENDING_APPROVAL').length;
  }, [savedQuotes]);

  const draftsCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'DRAFT').length;
  }, [savedQuotes]);

  const sentCount = useMemo(() => {
    return savedQuotes.filter(q => q.status === 'SENT' || q.status === 'ISSUED').length;
  }, [savedQuotes]);

  // Permissions validation based on current role
  const permissions = ROLE_PERMISSIONS[activeRole] || [];
  const canViewProfitability = permissions.includes('profitability.view');
  const isAdminOrManager = activeRole === 'ADMIN' || activeRole === 'SALES_MANAGER';

  // Navigation Items Definition
  interface NavItem {
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    group: 'main' | 'quotation' | 'pricing' | 'masterData' | 'operations' | 'analytics' | 'system';
    action: () => void;
    badge?: string | number | null;
    badgeColor?: string;
    isCta?: boolean;
    shortcut?: string;
    restricted?: boolean;
    requiredRoleDesc?: string;
  }

  const allNavItems: NavItem[] = [
    // --- MAIN ---
    {
      id: 'main_dashboard',
      label: t.analyticsDashboard,
      icon: LayoutDashboard,
      group: 'main',
      action: () => onOpenDashboard && onOpenDashboard('OVERVIEW'),
      badge: 'KPIs',
      badgeColor: 'bg-blue-600/80 text-blue-100',
    },

    // --- QUOTATION ---
    {
      id: 'smart_quotation_workspace',
      label: language === 'vi' ? 'Workspace Báo Giá Thông Minh' : 'Smart Quotation Workspace',
      icon: Sparkles,
      group: 'quotation',
      action: () => onOpenSmartQuotationWorkspace && onOpenSmartQuotationWorkspace(),
      badge: 'Phase 20',
      badgeColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      id: 'quotation_new',
      label: t.createQuotation,
      icon: Plus,
      group: 'quotation',
      action: onNewQuote,
      isCta: true,
      shortcut: 'Ctrl+N',
    },
    {
      id: 'quotations_all',
      label: t.allQuotations,
      icon: FileText,
      group: 'quotation',
      action: () => onOpenSavedQuotes('ALL'),
      badge: savedQuotes.length > 0 ? savedQuotes.length : null,
      badgeColor: 'bg-slate-800 text-slate-200 border border-slate-700',
    },
    {
      id: 'quotations_draft',
      label: t.drafts,
      icon: Clock,
      group: 'quotation',
      action: () => onOpenSavedQuotes('DRAFT'),
      badge: draftsCount > 0 ? draftsCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    },
    {
      id: 'quotations_pending',
      label: t.pendingApproval,
      icon: CheckCircle2,
      group: 'quotation',
      action: () => onOpenSavedQuotes('PENDING_APPROVAL'),
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
    },
    {
      id: 'quotations_sent',
      label: t.sentQuotations,
      icon: Send,
      group: 'quotation',
      action: () => onOpenSavedQuotes('SENT'),
      badge: sentCount > 0 ? sentCount : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    },
    {
      id: 'quotation_preview',
      label: activeLang === 'vi' ? 'Xem Trước Bản In (A4)' : 'Print Preview (A4)',
      icon: Printer,
      group: 'quotation',
      action: () => onOpenPreview && onOpenPreview(),
    },
    {
      id: 'quotation_snapshots',
      label: t.quoteSnapshots,
      icon: Archive,
      group: 'quotation',
      action: () => onOpenDocumentHistory && onOpenDocumentHistory(),
    },
    {
      id: 'quotation_templates',
      label: t.quoteTemplates,
      icon: Layout,
      group: 'quotation',
      action: () => onOpenTemplateBuilder && onOpenTemplateBuilder(),
    },
    {
      id: 'quotation_send',
      label: activeLang === 'vi' ? 'Gửi Email Báo Giá' : 'Send Quote Email',
      icon: Mail,
      group: 'quotation',
      action: () => onOpenSendModal && onOpenSendModal(),
    },
    {
      id: 'quotation_communication',
      label: t.communicationCenter,
      icon: ExternalLink,
      group: 'quotation',
      action: () => onOpenCommunication && onOpenCommunication(),
    },
    {
      id: 'quotation_email_templates',
      label: t.emailTemplates,
      icon: FileText,
      group: 'quotation',
      action: () => onOpenEmailTemplates && onOpenEmailTemplates(),
    },
    {
      id: 'quotation_followup',
      label: t.followUpSchedule,
      icon: Calendar,
      group: 'quotation',
      action: () => onOpenFollowUps && onOpenFollowUps(),
    },

    // --- PRICING ---
    {
      id: 'pricing_rates',
      label: t.rateManagement,
      icon: Database,
      group: 'pricing',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('RATES'),
      badge: rateMastersCount > 0 ? rateMastersCount : null,
      badgeColor: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
    },
    {
      id: 'pricing_contracts',
      label: t.contractsHub,
      icon: FileText,
      group: 'pricing',
      action: () => onOpenContracts && onOpenContracts(),
      badge: contractsCount > 0 ? contractsCount : null,
      badgeColor: 'bg-purple-900/80 text-purple-200 border border-purple-700/50',
    },
    {
      id: 'pricing_policies',
      label: t.pricingPolicies,
      icon: Sliders,
      group: 'pricing',
      action: () => onOpenPricingPolicies && onOpenPricingPolicies(),
      restricted: !isAdminOrManager,
      requiredRoleDesc: 'Admin / Manager',
    },
    {
      id: 'pricing_profit',
      label: t.profitIntelligence,
      icon: TrendingUp,
      group: 'pricing',
      action: () => onOpenProfitIntelligence && onOpenProfitIntelligence(),
      restricted: !canViewProfitability,
      requiredRoleDesc: 'RBAC Protected',
    },
    {
      id: 'pricing_smart',
      label: t.smartAssistant,
      icon: Sparkles,
      group: 'pricing',
      action: () => onOpenSmartAssistant && onOpenSmartAssistant(),
      badge: 'AI',
      badgeColor: 'bg-amber-600/80 text-white font-bold',
    },
    {
      id: 'pricing_search',
      label: t.rateSearch,
      icon: Search,
      group: 'pricing',
      action: () => onOpenRateSearch && onOpenRateSearch(),
    },

    // --- MASTER DATA ---
    {
      id: 'master_customers',
      label: t.customersCrm,
      icon: Users,
      group: 'masterData',
      action: onOpenCustomers,
      badge: customersCount > 0 ? customersCount : null,
      badgeColor: 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50',
    },
    {
      id: 'master_suppliers',
      label: t.suppliersCarriers,
      icon: Ship,
      group: 'masterData',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('SUPPLIERS'),
    },
    {
      id: 'master_charges',
      label: t.chargeCodes,
      icon: Layers,
      group: 'masterData',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('CHARGES'),
      badge: chargeMastersCount > 0 ? chargeMastersCount : null,
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    },
    {
      id: 'master_surcharges',
      label: t.surchargesCatalog,
      icon: Receipt,
      group: 'masterData',
      action: onOpenSurchargeCatalog,
      badge: surchargesCount > 0 ? surchargesCount : null,
      badgeColor: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
    },
    {
      id: 'master_ports',
      label: t.portsLocations,
      icon: Anchor,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PORT'),
    },
    {
      id: 'master_containers',
      label: t.containerTypes,
      icon: Box,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('CONTAINER_TYPE'),
    },
    {
      id: 'master_incoterms',
      label: t.incotermsTerms,
      icon: FileCheck2,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('INCOTERM'),
    },
    {
      id: 'master_payment_terms',
      label: t.paymentTerms,
      icon: CreditCard,
      group: 'masterData',
      action: () => onOpenMasterDataReference && onOpenMasterDataReference('PAYMENT_TERM'),
    },

    // --- OPERATIONS ---
    {
      id: 'ops_ocean',
      label: t.oceanFclLcl,
      icon: Ship,
      group: 'operations',
      action: () => {
        if (onSelectTransportMode) onSelectTransportMode('SEA_FCL');
        else if (onOpenMasterRateHub) onOpenMasterRateHub('RATES');
      },
    },
    {
      id: 'ops_air',
      label: t.airFreight,
      icon: Plane,
      group: 'operations',
      action: () => {
        if (onSelectTransportMode) onSelectTransportMode('AIR_FREIGHT');
        else if (onOpenMasterRateHub) onOpenMasterRateHub('RATES');
      },
    },
    {
      id: 'ops_trucking',
      label: t.truckingInland,
      icon: Truck,
      group: 'operations',
      action: () => {
        if (onSelectTransportMode) onSelectTransportMode('INLAND_TRUCKING');
        else if (onOpenMasterRateHub) onOpenMasterRateHub('RATES');
      },
    },
    {
      id: 'ops_customs',
      label: t.customsClearance,
      icon: FileCheck2,
      group: 'operations',
      action: () => {
        if (onSelectTransportMode) onSelectTransportMode('CUSTOMS_CLEARANCE');
        else if (onOpenMasterRateHub) onOpenMasterRateHub('CHARGES');
      },
    },

    // --- ANALYTICS ---
    {
      id: 'analytics_funnel',
      label: t.quotationFunnel,
      icon: TrendingUp,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('FUNNEL'),
    },
    {
      id: 'analytics_sales',
      label: t.salesPerformance,
      icon: Users,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('SALES'),
    },
    {
      id: 'analytics_profit',
      label: t.profitabilityRbac,
      icon: Coins,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('PROFITABILITY'),
      restricted: !canViewProfitability,
      requiredRoleDesc: 'RBAC Restricted',
    },
    {
      id: 'analytics_lanes',
      label: t.laneServiceAnalytics,
      icon: Compass,
      group: 'analytics',
      action: () => onOpenDashboard && onOpenDashboard('LANES_SERVICES'),
    },

    // --- SYSTEM ---
    {
      id: 'sys_profile',
      label: t.companyProfile,
      icon: Building2,
      group: 'system',
      action: () => onOpenCompanyProfile('profile'),
    },
    {
      id: 'sys_sales_bank',
      label: t.salesRepBank,
      icon: UserCheck,
      group: 'system',
      action: () => onOpenCompanyProfile('sales'),
    },
    {
      id: 'sys_audit',
      label: t.auditLogs,
      icon: History,
      group: 'system',
      action: () => onOpenMasterRateHub && onOpenMasterRateHub('AUDIT'),
    },
    {
      id: 'sys_backup',
      label: t.dataBackup,
      icon: Database,
      group: 'system',
      action: onOpenDataBackup,
    },
    {
      id: 'sys_integrity',
      label: 'Sức Khỏe & Toàn Vẹn Dữ Liệu',
      icon: ShieldCheck,
      group: 'system',
      action: () => onOpenIntegrityDashboard && onOpenIntegrityDashboard(),
    },
  ];

  // Filter items if searching
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return allNavItems;
    const q = searchQuery.toLowerCase();
    return allNavItems.filter(item => 
      item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [allNavItems, searchQuery]);

  // Group definitions
  const groups: { key: string; title: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'main', title: t.groupMain, icon: LayoutDashboard },
    { key: 'quotation', title: t.groupQuotation, icon: FileText },
    { key: 'pricing', title: t.groupPricing, icon: Sliders },
    { key: 'masterData', title: t.groupMasterData, icon: Database },
    { key: 'operations', title: t.groupOperations, icon: Ship },
    { key: 'analytics', title: t.groupAnalytics, icon: TrendingUp },
    { key: 'system', title: t.groupSystem, icon: Settings },
  ];

  // Pinned items for quick access tray
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
          className="fixed inset-0 bg-slate-950/75 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none shadow-xl ${
          isCollapsed ? 'w-18' : 'w-72 lg:w-74'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        {/* Top App Header & Branding */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 min-h-[60px]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-xs text-white uppercase tracking-wider truncate">
                    {t.appName}
                  </h1>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    TMS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                  {company.shortName || company.name || t.appSubtitle}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title={isCollapsed ? t.expandSidebar : t.collapseSidebar}
            aria-label={isCollapsed ? t.expandSidebar : t.collapseSidebar}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-blue-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            aria-label="Đóng menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search & Command Bar (When Expanded) */}
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Pinned Favorites Tray (When Expanded and not searching) */}
        {!isCollapsed && !searchQuery && pinnedItems.length > 0 && (
          <div className="px-3 py-1.5 border-b border-slate-800/60 bg-slate-950/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{t.favorites}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pinnedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`pinned-${item.id}`}
                    type="button"
                    onClick={() => handleAction(item.action)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white text-[11px] border border-slate-700/60 transition-colors group"
                    title={item.label}
                  >
                    <Icon className="w-3 h-3 text-blue-400 group-hover:text-blue-300 shrink-0" />
                    <span className="truncate max-w-[120px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Items Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-xs custom-scrollbar">
          
          {/* SEARCH RESULTS VIEW (if search input has query) */}
          {searchQuery ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                {filteredNavItems.length} {activeLang === 'vi' ? 'kết quả tìm kiếm' : 'search results'}
              </div>
              {filteredNavItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  {activeLang === 'vi' ? 'Không tìm thấy chức năng phù hợp' : 'No matching menu item'}
                </div>
              ) : (
                filteredNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleAction(item.action);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left group border border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <item.icon className="w-4 h-4 text-blue-400 group-hover:text-blue-300 shrink-0" />
                      <span className="text-xs truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* REGULAR STRUCTURED GROUPS */
            groups.map((group) => {
              const groupItems = allNavItems.filter(item => item.group === group.key);
              if (groupItems.length === 0) return null;

              const isExpanded = expandedGroups[group.key];
              const GroupIcon = group.icon;

              // Check if any child item is active
              const hasActiveChild = groupItems.some(i => i.id === activeRouteId);

              return (
                <div 
                  key={group.key}
                  className={`rounded-xl border transition-colors overflow-hidden ${
                    hasActiveChild 
                      ? 'border-blue-500/40 bg-slate-900/60' 
                      : 'border-slate-800/60 bg-slate-950/20'
                  }`}
                >
                  {/* Group Header */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className={`w-full flex items-center justify-between p-2 hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors text-left ${
                        hasActiveChild ? 'text-blue-300 font-bold' : ''
                      }`}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <GroupIcon className={`w-3.5 h-3.5 shrink-0 ${hasActiveChild ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="font-bold text-[11px] uppercase tracking-wider truncate">
                          {group.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </button>
                  ) : (
                    /* Collapsed Group Divider Icon */
                    <div className="py-1 text-center border-b border-slate-800/60" title={group.title}>
                      <GroupIcon className="w-4 h-4 mx-auto text-slate-400" />
                    </div>
                  )}

                  {/* Group Menu Items */}
                  {(isExpanded || isCollapsed) && (
                    <div className={`${isCollapsed ? 'py-1 space-y-1' : 'px-1.5 pb-1.5 space-y-0.5'}`}>
                      {groupItems.map((item) => {
                        const Icon = item.icon;
                        const isPinned = pinnedIds.includes(item.id);
                        const isActive = activeRouteId === item.id;

                        // Prominent CTA style for 'Create Quotation'
                        if (item.isCta) {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleAction(item.action)}
                              className={`w-full flex items-center ${
                                isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
                              } rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md hover:shadow-blue-500/20 transition-all group my-1`}
                              title={isCollapsed ? item.label : undefined}
                              aria-label={item.label}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <Plus className="w-4 h-4 text-white shrink-0 group-hover:rotate-90 transition-transform duration-200" />
                                {!isCollapsed && (
                                  <span className="text-xs font-bold tracking-wide truncate">
                                    {item.label}
                                  </span>
                                )}
                              </div>
                              {!isCollapsed && item.shortcut && (
                                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono font-medium">
                                  {item.shortcut}
                                </span>
                              )}
                            </button>
                          );
                        }

                        // Regular Item
                        return (
                          <div
                            key={item.id}
                            className="relative group/tooltip"
                          >
                            {isCollapsed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.restricted) {
                                    alert(`${t.permissionRestricted}: ${item.requiredRoleDesc || activeRole}`);
                                    return;
                                  }
                                  handleAction(item.action);
                                }}
                                disabled={item.restricted}
                                className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all text-left ${
                                  isActive 
                                    ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-2xs' 
                                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                                } ${item.restricted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label={item.label}
                              >
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                                }`} />
                              </button>
                            ) : (
                              <div
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left group ${
                                  isActive 
                                    ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-2xs font-semibold' 
                                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                                } ${item.restricted ? 'opacity-50' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.restricted) {
                                      alert(`${t.permissionRestricted}: ${item.requiredRoleDesc || activeRole}`);
                                      return;
                                    }
                                    handleAction(item.action);
                                  }}
                                  disabled={item.restricted}
                                  className="flex-1 flex items-center space-x-2 min-w-0 text-left bg-transparent border-0 p-0 text-inherit cursor-pointer disabled:cursor-not-allowed"
                                  aria-label={item.label}
                                >
                                  <Icon className={`w-3.5 h-3.5 shrink-0 ${
                                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                                  }`} />
                                  <span className="text-xs truncate">{item.label}</span>
                                </button>

                                <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                                  {item.restricted && (
                                    <Lock className="w-3 h-3 text-rose-400 shrink-0" title={item.requiredRoleDesc} />
                                  )}

                                  {item.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                      item.badgeColor || 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}

                                  {/* Pin toggle on hover */}
                                  <button
                                    type="button"
                                    onClick={(e) => togglePin(e, item.id)}
                                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-amber-300 ${
                                      isPinned ? 'text-amber-400 opacity-100' : 'text-slate-500'
                                    }`}
                                    title={isPinned ? t.unpinFromFavorites : t.pinToFavorites}
                                  >
                                    <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Floating Tooltip in Collapsed Mode */}
                            {isCollapsed && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tooltip:flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap z-50 pointer-events-none">
                                <span>{item.label}</span>
                                {item.badge && (
                                  <span className="text-[10px] px-1 py-0.2 rounded font-mono bg-blue-600 text-white">
                                    {item.badge}
                                  </span>
                                )}
                                {item.restricted && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-900 text-rose-200">
                                    {item.requiredRoleDesc}
                                  </span>
                                )}
                              </div>
                            )}
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

        {/* Sidebar Footer: Profile, Role Switcher, Language & System Status */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-slate-400 flex flex-col gap-2">
          
          {/* User Profile Card & Role Indicator */}
          {!isCollapsed ? (
            <div className="relative">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {company.salesRepName ? company.salesRepName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {company.salesRepName || 'Logistics Specialist'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRoleSelector(!showRoleSelector)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                    >
                      <span>{activeRole}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Language Switcher VI | EN */}
                <button
                  type="button"
                  onClick={handleLanguageToggle}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold border border-slate-700 transition-colors flex items-center gap-1"
                  title="Chuyển ngôn ngữ / Switch language"
                >
                  <span className={activeLang === 'vi' ? 'text-blue-400' : 'text-slate-400'}>VI</span>
                  <span>|</span>
                  <span className={activeLang === 'en' ? 'text-blue-400' : 'text-slate-400'}>EN</span>
                </button>
              </div>

              {/* RBAC Role Selector Dropdown */}
              {showRoleSelector && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {t.switchRole} (RBAC)
                  </div>
                  {(['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'PRICING_SPECIALIST', 'VIEWER'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        activeRole === r 
                          ? 'bg-blue-600 text-white font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>
                        {r === 'ADMIN' && t.roleAdmin}
                        {r === 'SALES_MANAGER' && t.roleSalesManager}
                        {r === 'SALES_REP' && t.roleSalesRep}
                        {r === 'PRICING_SPECIALIST' && t.rolePricingSpecialist}
                        {r === 'VIEWER' && t.roleViewer}
                      </span>
                      {activeRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
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
                className="w-8 h-8 rounded bg-slate-800 text-[10px] font-bold text-blue-400 flex items-center justify-center hover:bg-slate-700"
                title="VI / EN"
              >
                {activeLang.toUpperCase()}
              </button>
              <div 
                className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold"
                title={`${company.salesRepName || 'User'} (${activeRole})`}
              >
                {company.salesRepName ? company.salesRepName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          )}

          {/* System Status: Auto-save & USD Rate (When expanded) */}
          {!isCollapsed && (
            <div className="pt-1.5 border-t border-slate-900/90 flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>{isAutoSaving ? t.autoSaving : t.autoSaved}:</span>
                <span className="font-mono text-emerald-400 font-medium truncate max-w-[80px]">
                  {lastAutoSaveTime || 'Ready'}
                </span>
              </span>

              <span className="font-mono text-slate-400" title="Tỷ giá USD">
                ${exchangeRate.toLocaleString()}
              </span>
            </div>
          )}

        </div>

      </aside>
    </>
  );
};
