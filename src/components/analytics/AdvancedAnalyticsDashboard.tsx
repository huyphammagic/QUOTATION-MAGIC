import React, { useState, useMemo, useEffect } from 'react';
import { QuoteData } from '../../types/logistics';
import { 
  QuotationCommunication, 
  QuotationCustomerResponse, 
  QuotationFollowUp,
  QuotationSecureLink
} from '../../types/quotationCommunication';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { 
  AnalyticsFilterState, 
  AnalyticsLanguage, 
  UserRole, 
  ROLE_PERMISSIONS
} from '../../types/analytics';
import { computeAggregatedAnalytics, AggregatedAnalyticsResult } from '../../services/quotation/analyticsService';

// Subcomponents
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { KpiCardsGrid } from './KpiCardsGrid';
import { QuotationFunnelChart } from './QuotationFunnelChart';
import { WinLossAnalyticsView } from './WinLossAnalyticsView';
import { SalesPerformanceTable } from './SalesPerformanceTable';
import { CustomerAnalyticsTable } from './CustomerAnalyticsTable';
import { ProfitabilityAnalyticsView } from './ProfitabilityAnalyticsView';
import { LaneAndServiceAnalyticsView } from './LaneAndServiceAnalyticsView';
import { AgingAndFollowUpView } from './AgingAndFollowUpView';
import { DataQualityView } from './DataQualityView';

import { 
  LayoutDashboard, 
  GitCommit, 
  Trophy, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Ship, 
  Hourglass, 
  ShieldCheck,
  Download,
  RotateCw,
  Globe,
  Shield,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface AdvancedAnalyticsDashboardProps {
  quotes: QuoteData[];
  communications?: QuotationCommunication[];
  customerResponses?: QuotationCustomerResponse[];
  documents?: QuotationDocumentRecord[];
  followUpTasks?: QuotationFollowUp[];
  shareLinks?: QuotationSecureLink[];
  currentUserRole?: UserRole;
  currentSalesName?: string;
  onSelectQuote?: (quoteId: string) => void;
  onClose?: () => void;
  initialTab?: DashboardTab;
}

type DashboardTab = 
  | 'OVERVIEW' 
  | 'FUNNEL' 
  | 'SALES' 
  | 'WIN_LOSS' 
  | 'CUSTOMERS' 
  | 'PROFITABILITY' 
  | 'LANES_SERVICES' 
  | 'AGING_EXPIRY' 
  | 'DATA_QUALITY';

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  quotes,
  communications = [],
  customerResponses = [],
  documents = [],
  followUpTasks = [],
  shareLinks = [],
  currentUserRole = 'ADMIN',
  currentSalesName,
  onSelectQuote,
  onClose,
  initialTab = 'OVERVIEW',
}) => {
  // Config & State
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [language, setLanguage] = useState<AnalyticsLanguage>('vi');
  const [userRole, setUserRole] = useState<UserRole>(currentUserRole);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const isVi = language === 'vi';

  // Filters state
  const initialFilter: AnalyticsFilterState = {
    dateRange: 'all',
    salesRep: userRole === 'SALES_REP' && currentSalesName ? currentSalesName : 'ALL',
    transportMode: 'ALL',
    currency: 'ALL',
    status: 'ALL',
  };

  const [filters, setFilters] = useState<AnalyticsFilterState>(initialFilter);

  // Lock body scroll when dashboard is opened, restore on unmount
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle || 'unset';
    };
  }, []);

  // Keyboard shortcut Esc to close dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Extract unique sales reps & modes from quotes
  const availableSalesReps = useMemo(() => {
    const reps = new Set<string>();
    quotes.forEach(q => {
      const rep = (q as any).salesRepName || (q as any).salesRep || q.company?.salesRepName;
      if (rep && String(rep).trim()) reps.add(String(rep).trim());
    });
    return Array.from(reps).sort();
  }, [quotes]);

  const availableModes = ['SEA_FCL', 'SEA_LCL', 'AIR', 'TRUCKING', 'CUSTOMS'];

  // Compute Aggregated Analytics from real Firestore quotes!
  const analytics: AggregatedAnalyticsResult = useMemo(() => {
    return computeAggregatedAnalytics({
      quotes,
      communications,
      responses: customerResponses,
      followUps: followUpTasks,
      links: shareLinks,
      filters,
      userRole,
    });
  }, [quotes, communications, customerResponses, documents, followUpTasks, shareLinks, filters, userRole]);

  // Export CSV Report
  const handleExportCsv = () => {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    if (!permissions.includes('analytics.export')) {
      alert(isVi ? 'Bạn không có quyền xuất file dữ liệu báo cáo (RBAC Restricted).' : 'You do not have permission to export CSV reports.');
      return;
    }

    const headers = [
      'QuoteNumber',
      'RootQuoteNumber',
      'Revision',
      'Customer',
      'Origin',
      'Destination',
      'Mode',
      'Status',
      'Currency',
      'SellingTotal',
      'BuyCostTotal',
      'GrossProfit',
      'MarginPercent',
      'CreatedDate',
      'ValidUntil',
      'SalesRep'
    ];

    const canViewProfit = permissions.includes('profitability.view');

    const rows = quotes.map(q => {
      const qAny = q as any;
      const rev = qAny.version || qAny.revision || 1;
      const origin = q.shipment?.origin || q.shipment?.pol || qAny.origin || '';
      const dest = q.shipment?.destination || q.shipment?.pod || qAny.destination || '';
      const mode = q.shipment?.mode || qAny.transportMode || '';
      const curr = q.quoteCurrency || qAny.currency || 'USD';
      const sell = curr === 'USD' ? (q.grandTotalUsd ?? qAny.totalAmount ?? 0) : (q.grandTotalVnd ?? qAny.totalAmount ?? 0);
      const cost = canViewProfit ? (curr === 'USD' ? (q.totalCostUsd ?? 0) : (q.totalCostVnd ?? 0)) : 'RESTRICTED';
      const profit = canViewProfit && typeof cost === 'number' ? (curr === 'USD' ? (q.totalProfitUsd ?? (sell - cost)) : (q.totalProfitVnd ?? (sell - cost))) : 'RESTRICTED';
      const margin = canViewProfit && typeof cost === 'number' && sell > 0 ? (q.overallMarginPercent ?? Math.round(((sell - cost) / sell) * 100)) : 'RESTRICTED';
      
      return [
        `"${String(q.quoteNumber || qAny.quoteNumber || '')}"`,
        `"${String(qAny.rootQuoteNumber || q.quoteNumber || '')}"`,
        rev,
        `"${String(q.customer?.customerName || qAny.customerName || '').replace(/"/g, '""')}"`,
        `"${String(origin)}"`,
        `"${String(dest)}"`,
        `"${String(mode)}"`,
        `"${String(q.status || qAny.status || '')}"`,
        curr,
        sell,
        cost,
        profit,
        margin,
        `"${String(q.createdDate || qAny.createdAt || '')}"`,
        `"${String(q.terms?.validityDate || qAny.validityDate || qAny.validUntil || '')}"`,
        `"${String(q.company?.salesRepName || qAny.salesRep || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LogiQuote_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex flex-col"
      id="modal-advanced-analytics-dashboard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-modal-title"
    >
      <div className="min-h-full bg-slate-100 text-slate-800 flex flex-col w-full shadow-2xl">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="dashboard-modal-title" className="text-base font-bold tracking-tight text-white">
                  LOGIQUOTE BUSINESS INTELLIGENCE
                </h1>
                <span className="text-[10px] font-mono font-bold bg-blue-500/30 text-blue-300 border border-blue-400/40 px-1.5 py-0.2 rounded">
                  PHASE 9
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isVi ? 'Trung Tâm Điều Hành & Phân Tích Hiệu Suất Báo Giá Logistics' : 'Executive Logistics Quotation Analytics & Performance Dashboard'}
              </p>
            </div>
          </div>

          {/* Right Action Controls: Role Switcher, Lang Toggle, CSV Export, Close */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            
            {/* RBAC Role Switcher (Demonstrates live access control!) */}
            <div className="flex items-center bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-700">
              <Shield className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <span className="text-[11px] text-slate-400 mr-1.5 hidden sm:inline">Role:</span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="bg-transparent text-white font-semibold text-xs focus:outline-hidden cursor-pointer"
                title="Thay đổi quyền để kiểm tra phân quyền bảo mật RBAC"
              >
                <option value="ADMIN" className="bg-slate-800 text-white">Admin (Toàn quyền)</option>
                <option value="SALES_MANAGER" className="bg-slate-800 text-white">Sales Manager (Quản lý)</option>
                <option value="PRICING_SPECIALIST" className="bg-slate-800 text-white">Pricing Specialist (Định giá)</option>
                <option value="SALES_REP" className="bg-slate-800 text-white">Sales Rep (Kinh doanh)</option>
                <option value="VIEWER" className="bg-slate-800 text-white">Viewer (Chỉ xem)</option>
              </select>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLanguage(isVi ? 'en' : 'vi')}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title={isVi ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">{isVi ? 'VI' : 'EN'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
              title={isVi ? 'Xuất toàn bộ báo cáo phân tích ra file CSV' : 'Export analytics report to CSV'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Xuất CSV' : 'Export CSV'}</span>
            </button>

            {/* Close Button if opened as modal */}
            {onClose && (
              <button
                type="button"
                id="btn-close-analytics-dashboard"
                onClick={onClose}
                className="flex items-center space-x-1 px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                title={isVi ? 'Đóng Dashboard (Esc)' : 'Close Dashboard (Esc)'}
              >
                <X className="w-4 h-4" />
                <span>{isVi ? 'Đóng (Esc)' : 'Close (Esc)'}</span>
              </button>
            )}

          </div>

        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-thin">
            
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'OVERVIEW'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tổng Quan' : 'Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FUNNEL')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'FUNNEL'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isVi ? 'Phễu Chuyển Đổi' : 'Funnel'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SALES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'SALES'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{isVi ? 'Hiệu Suất Sales' : 'Sales Leaderboard'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WIN_LOSS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'WIN_LOSS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thắng / Thua' : 'Win/Loss Analysis'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isVi ? 'Khách Hàng' : 'Customers'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROFITABILITY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'PROFITABILITY'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isVi ? 'Lợi Nhuận & Giá Vốn' : 'Profitability (RBAC)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LANES_SERVICES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'LANES_SERVICES'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tuyến Đường & Dịch Vụ' : 'Lanes & Services'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AGING_EXPIRY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'AGING_EXPIRY'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>{isVi ? 'Độ Tuổi & Hết Hạn' : 'Aging & Expiry'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DATA_QUALITY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'DATA_QUALITY'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isVi ? 'Chất Lượng Dữ Liệu' : 'Data Quality'}</span>
            </button>

          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Universal Filter Bar */}
        <AnalyticsFilterBar
          filters={filters}
          onFilterChange={(updated) => setFilters(updated)}
          onResetFilters={() => setFilters(initialFilter)}
          salesReps={availableSalesReps}
          transportModes={availableModes}
          language={language}
        />

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Top 8 Strategic KPI Cards */}
            <KpiCardsGrid
              kpis={analytics.kpis}
              language={language}
              onFilterStatus={(status) => setFilters({ ...filters, status })}
            />

            {/* Two Column Layout: Funnel + Win/Loss Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuotationFunnelChart
                stages={analytics.funnelStages}
                language={language}
              />
              <WinLossAnalyticsView
                bySales={analytics.winLossByDimension.bySales}
                byCustomer={analytics.winLossByDimension.byCustomer}
                byService={analytics.winLossByDimension.byService}
                byLane={analytics.winLossByDimension.byLane}
                language={language}
              />
            </div>

            {/* Quick Leaderboard Preview */}
            <SalesPerformanceTable
              salesList={analytics.salesPerformance}
              language={language}
            />
          </div>
        )}

        {/* Tab 2: FUNNEL */}
        {activeTab === 'FUNNEL' && (
          <div className="space-y-6">
            <QuotationFunnelChart
              stages={analytics.funnelStages}
              language={language}
            />
          </div>
        )}

        {/* Tab 3: SALES */}
        {activeTab === 'SALES' && (
          <div className="space-y-6">
            <SalesPerformanceTable
              salesList={analytics.salesPerformance}
              language={language}
            />
          </div>
        )}

        {/* Tab 4: WIN_LOSS */}
        {activeTab === 'WIN_LOSS' && (
          <div className="space-y-6">
            <WinLossAnalyticsView
              bySales={analytics.winLossByDimension.bySales}
              byCustomer={analytics.winLossByDimension.byCustomer}
              byService={analytics.winLossByDimension.byService}
              byLane={analytics.winLossByDimension.byLane}
              language={language}
            />
          </div>
        )}

        {/* Tab 5: CUSTOMERS */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-6">
            <CustomerAnalyticsTable
              customers={analytics.customerAnalytics}
              language={language}
            />
          </div>
        )}

        {/* Tab 6: PROFITABILITY (RBAC) */}
        {activeTab === 'PROFITABILITY' && (
          <div className="space-y-6">
            <ProfitabilityAnalyticsView
              items={analytics.profitabilityItems}
              userRole={userRole}
              language={language}
            />
          </div>
        )}

        {/* Tab 7: LANES_SERVICES */}
        {activeTab === 'LANES_SERVICES' && (
          <div className="space-y-6">
            <LaneAndServiceAnalyticsView
              lanes={analytics.laneAnalytics}
              services={analytics.serviceAnalytics}
              language={language}
            />
          </div>
        )}

        {/* Tab 8: AGING_EXPIRY */}
        {activeTab === 'AGING_EXPIRY' && (
          <div className="space-y-6">
            <AgingAndFollowUpView
              agingBuckets={analytics.agingBuckets}
              expiringQuotes={analytics.expiringQuotes}
              followUpSummary={analytics.followUpAnalytics}
              language={language}
              onSelectQuote={onSelectQuote}
            />
          </div>
        )}

        {/* Tab 9: DATA_QUALITY */}
        {activeTab === 'DATA_QUALITY' && (
          <div className="space-y-6">
            <DataQualityView
              report={analytics.dataQualityReport}
              language={language}
              onSelectQuote={onSelectQuote}
            />
          </div>
        )}

      </main>

      </div>
    </div>
  );
};
