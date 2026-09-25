import React, { useState, useEffect, useMemo } from 'react';
import { 
  BusinessOpportunity, 
  OpportunityFilterOptions, 
  OpportunityRadarMetrics,
  OpportunityStatus,
  BusinessOpportunityType,
  OpportunityPriority
} from '../../types/opportunity';
import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { RateReviewTask, CustomerFollowUp } from '../../types/crm';
import { 
  syncRealBusinessOpportunities, 
  getBusinessOpportunities, 
  updateOpportunityStatus, 
  snoozeOpportunity, 
  dismissOpportunity, 
  calculateOpportunityMetrics 
} from '../../services/opportunity/businessOpportunityService';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityPipelineView } from './OpportunityPipelineView';
import { OpportunityAnalyticsView } from './OpportunityAnalyticsView';
import { 
  Radar, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  SlidersHorizontal, 
  ShieldCheck, 
  Plus, 
  Sparkles,
  Layers,
  BarChart3,
  Calendar,
  X,
  Compass
} from 'lucide-react';

interface BusinessOpportunityRadarWorkspaceProps {
  companyId?: string;
  customers: CustomerRecord[];
  quotes: QuoteData[];
  shipments?: ShipmentRecord[];
  contracts?: ContractRecord[];
  rateReviewTasks?: RateReviewTask[];
  followUps?: CustomerFollowUp[];
  user?: { email?: string; name?: string };
  onSelectCustomerForQuote?: (customer: CustomerRecord, prefill?: Partial<QuoteData>) => void;
  onOpenCustomer360?: (customerId: string, customerName: string) => void;
  onOpenRateReview?: (opp: BusinessOpportunity) => void;
  onOpenFollowUp?: (opp: BusinessOpportunity) => void;
  onOpenDecisionWorkspace?: (prefill?: any) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const BusinessOpportunityRadarWorkspace: React.FC<BusinessOpportunityRadarWorkspaceProps> = ({
  companyId = 'default-company',
  customers = [],
  quotes = [],
  shipments = [],
  contracts = [],
  rateReviewTasks = [],
  followUps = [],
  user,
  onSelectCustomerForQuote,
  onOpenCustomer360,
  onOpenRateReview,
  onOpenFollowUp,
  onOpenDecisionWorkspace,
  onClose,
  isModal = false
}) => {
  const [activeTab, setActiveTab] = useState<'FEED' | 'PIPELINE' | 'ANALYTICS'>('FEED');
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'OVERDUE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<BusinessOpportunityType | 'ALL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform detection and load opportunities
  const loadAndSyncOpportunities = async (forceSync = false) => {
    setIsLoading(true);
    if (forceSync) setIsScanning(true);
    try {
      const syncResult = await syncRealBusinessOpportunities({
        companyId,
        customers,
        quotes,
        shipments,
        contracts,
        rateReviewTasks,
        followUps,
        user
      });

      const list = await getBusinessOpportunities(companyId, {
        status: statusFilter,
        priority: priorityFilter,
        type: typeFilter,
        timeframe: timeframeFilter,
        search: searchTerm
      });

      setOpportunities(list);
      if (forceSync) {
        showToast(`Đã đồng bộ và phân tích ${syncResult.syncedCount} cơ hội mới từ dữ liệu thực tế!`);
      }
    } catch (err) {
      console.error('[OpportunityRadar] Failed to sync opportunities:', err);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadAndSyncOpportunities();
  }, [companyId, statusFilter, priorityFilter, typeFilter, timeframeFilter, searchTerm]);

  // Compute live metrics
  const metrics: OpportunityRadarMetrics = useMemo(() => {
    return calculateOpportunityMetrics(opportunities);
  }, [opportunities]);

  // Handlers
  const handleUpdateStatus = async (oppId: string, newStatus: OpportunityStatus, notes?: string) => {
    try {
      const updated = await updateOpportunityStatus(oppId, newStatus, user, notes);
      if (updated) {
        setOpportunities(prev => prev.map(o => o.id === oppId ? updated : o));
        showToast(`Đã cập nhật trạng thái cơ hội thành công!`);
      }
    } catch (err) {
      console.error('[OpportunityRadar] Failed to update status:', err);
    }
  };

  const handleSnooze = async (oppId: string, days: number, reason?: string) => {
    try {
      const updated = await snoozeOpportunity(oppId, days, user, reason);
      if (updated) {
        setOpportunities(prev => prev.map(o => o.id === oppId ? updated : o));
        showToast(`Đã tạm hoãn cơ hội ${days} ngày.`);
      }
    } catch (err) {
      console.error('[OpportunityRadar] Failed to snooze:', err);
    }
  };

  const handleDismiss = async (oppId: string, reason: string) => {
    try {
      const updated = await dismissOpportunity(oppId, reason, user);
      if (updated) {
        setOpportunities(prev => prev.map(o => o.id === oppId ? updated : o));
        showToast(`Đã lưu lý do và bỏ qua cơ hội.`);
      }
    } catch (err) {
      console.error('[OpportunityRadar] Failed to dismiss:', err);
    }
  };

  const handleSelectOpportunityForQuote = (opp: BusinessOpportunity) => {
    // Find customer in loaded list
    const foundCustomer: CustomerRecord = customers.find(c => c.id === opp.customerId) || {
      id: opp.customerId,
      companyName: opp.customerName,
      customerName: opp.customerName,
      code: opp.customerId.substring(0, 8).toUpperCase(),
      taxId: '',
      email: opp.actionPayload?.customerEmail || '',
      phone: opp.actionPayload?.customerPhone || '',
      address: '',
      contactPerson: ''
    };

    // Pre-fill quote parameters based on detected opportunity
    const prefill: Partial<QuoteData> = {
      shipment: {
        origin: opp.actionPayload?.origin || opp.origin || 'VNSGN',
        destination: opp.actionPayload?.destination || opp.destination || '',
        serviceMode: (opp.actionPayload?.serviceMode || opp.serviceMode || 'SEA_FCL') as any,
        incoterm: opp.actionPayload?.suggestedIncoterm || 'FOB',
        pol: opp.actionPayload?.origin || opp.origin || 'VNSGN',
        pod: opp.actionPayload?.destination || opp.destination || '',
        cargoDescription: `Chào giá mới cho cơ hội: ${opp.title}`
      } as any
    };

    if (onSelectCustomerForQuote) {
      onSelectCustomerForQuote(foundCustomer, prefill);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-3xl ${isModal ? 'h-[92vh] max-h-[950px]' : 'min-h-[85vh]'} border border-slate-200/90 shadow-2xl overflow-hidden`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-indigo-500/80 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
            <Radar className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">Business Opportunity Radar</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Phase 46
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3 h-3" />
                Zero Data Loss
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Phát hiện cơ hội tăng trưởng, gia hạn cước, tái báo giá và giữ chân khách hàng từ dữ liệu thực tế
            </p>
          </div>
        </div>

        {/* Right Controls: Scan, Refresh, Close */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isScanning}
            onClick={() => loadAndSyncOpportunities(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Quét lại toàn bộ dữ liệu thực tế để tìm cơ hội mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Đang Quét Dữ Liệu...' : 'Quét Dữ Liệu Thực Tế'}</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Ribbon: KPI summary & Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('FEED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'FEED'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Danh Sách Cơ Hội</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
              {metrics.totalActive}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PIPELINE')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'PIPELINE'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Quy Trình / Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ANALYTICS'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Phân Tích & Báo Cáo</span>
          </button>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
            Khẩn cấp: {metrics.criticalPriority}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            Ưu tiên cao: {metrics.highPriority}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã chốt: {metrics.converted}
          </span>
        </div>
      </div>

      {/* Filters Bar (Only on FEED & PIPELINE) */}
      {activeTab !== 'ANALYTICS' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white border-b border-slate-100 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo khách hàng, tuyến, mã báo giá, nội dung..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
            />
          </div>

          {/* Timeframe Chips */}
          <div className="flex flex-wrap items-center gap-1 font-medium">
            <span className="text-slate-400 mr-1 text-[11px]">Thời gian:</span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'THIS_WEEK', label: 'Tuần này' },
              { id: 'OVERDUE', label: 'Quá hạn' }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframeFilter(tf.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  timeframeFilter === tf.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Priority & Type Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
            >
              <option value="ALL">Mọi ưu tiên</option>
              <option value="CRITICAL">Khẩn cấp</option>
              <option value="HIGH">Ưu tiên cao</option>
              <option value="NORMAL">Bình thường</option>
              <option value="LOW">Theo dõi</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 max-w-[180px]"
            >
              <option value="ALL">Mọi danh mục (10)</option>
              <option value="CUSTOMER_GROWTH">Tăng trưởng khách hàng</option>
              <option value="CUSTOMER_RETENTION">Nguy cơ giảm giao dịch</option>
              <option value="RE_QUOTATION">Báo giá lại</option>
              <option value="RATE_RENEWAL">Rà soát cước</option>
              <option value="CROSS_SERVICE">Bán chéo dịch vụ</option>
              <option value="LANE_OPPORTUNITY">Tuyến trọng điểm</option>
              <option value="QUOTATION_CONVERSION">Thúc đẩy chốt báo giá</option>
              <option value="CONTRACT_RENEWAL">Gia hạn hợp đồng</option>
              <option value="SHIPMENT_FOLLOW_UP">Chăm sóc sau giao hàng</option>
              <option value="REACTIVATION">Tái kích hoạt khách cũ</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
        {isLoading && opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold">Đang tổng hợp dữ liệu cơ hội từ Firebase...</p>
          </div>
        ) : activeTab === 'ANALYTICS' ? (
          <OpportunityAnalyticsView opportunities={opportunities} metrics={metrics} />
        ) : activeTab === 'PIPELINE' ? (
          <OpportunityPipelineView
            opportunities={opportunities}
            onSelectForQuote={handleSelectOpportunityForQuote}
            onOpenCustomer360={onOpenCustomer360}
            onOpenRateReview={onOpenRateReview}
            onOpenFollowUp={onOpenFollowUp}
            onUpdateStatus={handleUpdateStatus}
            onSnooze={handleSnooze}
            onDismiss={handleDismiss}
          />
        ) : (
          /* FEED LIST VIEW */
          <div className="space-y-4 max-w-6xl mx-auto">
            {opportunities.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 shadow-2xs max-w-xl mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Radar className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Không Có Cơ Hội Cần Xử Lý
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Hệ thống không phát hiện cơ hội hoặc rủi ro nào phù hợp với bộ lọc hiện tại. Dữ liệu báo giá, vận chuyển và hợp đồng đang được theo dõi liên tục.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPriorityFilter('ALL');
                    setTypeFilter('ALL');
                    setTimeframeFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onSelectForQuote={handleSelectOpportunityForQuote}
                    onOpenCustomer360={onOpenCustomer360}
                    onOpenRateReview={onOpenRateReview}
                    onOpenFollowUp={onOpenFollowUp}
                    onOpenDecisionWorkspace={onOpenDecisionWorkspace ? () => onOpenDecisionWorkspace({
                      customerId: opp.customerId,
                      customerName: opp.customerName,
                      origin: opp.origin || 'VNSGN',
                      destination: opp.destination || 'USLAX',
                      mode: (opp.serviceMode as any) || 'SEA_FCL',
                      commodity: 'Hàng hóa thông thường',
                      specialRequirements: opp.title || opp.reason
                    }) : undefined}
                    onUpdateStatus={handleUpdateStatus}
                    onSnooze={handleSnooze}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
