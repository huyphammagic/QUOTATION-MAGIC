import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Users, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight, 
  SlidersHorizontal,
  FileText,
  Building2,
  TrendingUp,
  History,
  Send,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  DeadlineEntity, 
  FollowUpChannel, 
  CustomerSentiment, 
  FollowUpTouchpointRecord 
} from '../../types/deadline';
import { 
  calculateTimeRemaining, 
  calculateFollowUpControlMetrics, 
  quickCadenceAdvance, 
  getCompanyTouchpoints,
  FollowUpControlMetrics 
} from '../../services/deadline/deadlineService';
import { LogFollowUpModal } from './LogFollowUpModal';
import { ActionExecutionModal } from './ActionExecutionModal';
import { FOLLOW_UP_CONTROL_I18N } from '../../i18n/followUpControl';

interface FollowUpControlCenterProps {
  actions: DeadlineEntity[];
  companyId: string;
  companyName?: string;
  user: { uid: string; displayName?: string; email?: string };
  onRefresh: () => void;
  onOpenQuotation?: (quotationId: string) => void;
  onOpenShipment?: (shipmentId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenRateHub?: () => void;
  onOpenOpportunity?: (opportunityId: string) => void;
  onOpenDecisionWorkspace?: (decisionId?: string) => void;
  isVi?: boolean;
}

export type FollowUpTab = 
  | 'ALL' 
  | 'OVERDUE' 
  | 'DUE_TODAY' 
  | 'UPCOMING' 
  | 'WARM_LEADS' 
  | 'PRICE_OBJECTIONS' 
  | 'COMPLETED';

export const FollowUpControlCenter: React.FC<FollowUpControlCenterProps> = ({
  actions,
  companyId,
  companyName = 'Logistics Co.',
  user,
  onRefresh,
  onOpenQuotation,
  onOpenShipment,
  onOpenCustomer,
  onOpenRateHub,
  onOpenOpportunity,
  onOpenDecisionWorkspace,
  isVi = true,
}) => {
  const t = isVi ? FOLLOW_UP_CONTROL_I18N.vi : FOLLOW_UP_CONTROL_I18N.en;

  const [activeTab, setActiveTab] = useState<FollowUpTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<FollowUpChannel | 'ALL'>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<CustomerSentiment | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'PIPELINE' | 'TIMELINE'>('PIPELINE');

  // Modals state
  const [touchpointModalAction, setTouchpointModalAction] = useState<DeadlineEntity | null>(null);
  const [executionModalAction, setExecutionModalAction] = useState<DeadlineEntity | null>(null);
  const [recentTouchpoints, setRecentTouchpoints] = useState<FollowUpTouchpointRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Calculate real-time metrics
  const [metrics, setMetrics] = useState<FollowUpControlMetrics>({
    totalActive: 0,
    overdue: 0,
    dueToday: 0,
    upcoming7Days: 0,
    priceObjections: 0,
    warmLeads: 0,
    completedWon: 0,
    lostCount: 0,
  });

  useEffect(() => {
    calculateFollowUpControlMetrics(actions).then(setMetrics);
  }, [actions]);

  // Load recent touchpoints for timeline view
  const loadRecentTimeline = async () => {
    setLoadingRecent(true);
    try {
      const logs = await getCompanyTouchpoints(companyId, 60);
      setRecentTouchpoints(logs);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'TIMELINE') {
      loadRecentTimeline();
    }
  }, [viewMode, companyId]);

  // Filtered Actions for Follow-Up
  const filteredActions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000;
    const in7Days = endOfToday + 6 * 86400000;

    return actions.filter((action) => {
      // Basic Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = action.title?.toLowerCase().includes(q);
        const matchCustomer = action.customerName?.toLowerCase().includes(q);
        const matchNumber = action.entityNumber?.toLowerCase().includes(q);
        const matchPic = action.assignedToName?.toLowerCase().includes(q);
        const matchNote = action.actionRequired?.toLowerCase().includes(q);
        if (!matchTitle && !matchCustomer && !matchNumber && !matchPic && !matchNote) {
          return false;
        }
      }

      // Channel Filter
      if (channelFilter !== 'ALL' && action.lastTouchpointChannel !== channelFilter) {
        return false;
      }

      // Sentiment Filter
      if (sentimentFilter !== 'ALL' && action.customerSentiment !== sentimentFilter) {
        return false;
      }

      const isCompleted = action.status === 'COMPLETED';
      const dueTime = new Date(action.dueAt).getTime();

      // Tab Filters
      switch (activeTab) {
        case 'OVERDUE':
          return !isCompleted && !isNaN(dueTime) && dueTime < startOfToday;
        case 'DUE_TODAY':
          return !isCompleted && !isNaN(dueTime) && dueTime >= startOfToday && dueTime < endOfToday;
        case 'UPCOMING':
          return !isCompleted && !isNaN(dueTime) && dueTime >= endOfToday && dueTime <= in7Days;
        case 'WARM_LEADS':
          return !isCompleted && (
            action.customerSentiment === 'VERY_INTERESTED' ||
            action.customerSentiment === 'READY_TO_BOOK'
          );
        case 'PRICE_OBJECTIONS':
          return !isCompleted && (
            action.customerSentiment === 'PRICE_SENSITIVE' ||
            action.waitingReason === 'RATE' ||
            action.customerSentiment === 'NEED_REVISION'
          );
        case 'COMPLETED':
          return isCompleted;
        case 'ALL':
        default:
          return !isCompleted;
      }
    });
  }, [actions, activeTab, searchQuery, channelFilter, sentimentFilter]);

  // Handler: Quick Cadence Advance (+24h, +72h, +168h)
  const handleQuickAdvance = async (action: DeadlineEntity, hours: number) => {
    await quickCadenceAdvance(action.id, companyId, hours, user);
    onRefresh();
  };

  const getSentimentBadge = (sentiment?: CustomerSentiment) => {
    if (!sentiment) return null;
    const label = t.sentiments[sentiment] || sentiment;
    switch (sentiment) {
      case 'VERY_INTERESTED':
      case 'READY_TO_BOOK':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1">
            <Flame className="w-3 h-3 text-emerald-600" />
            <span>{label}</span>
          </span>
        );
      case 'PRICE_SENSITIVE':
      case 'NEED_REVISION':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>{label}</span>
          </span>
        );
      case 'WAITING_MANAGEMENT':
      case 'COMPARING_COMPETITORS':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>{label}</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
            {label}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. EXECUTIVE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Overdue */}
        <div 
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'OVERDUE' 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
              : 'bg-white border-slate-200/80 hover:border-rose-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.overdueFollowUps}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">
              {metrics.overdue}
            </span>
            {metrics.overdue > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded">
                Gấp
              </span>
            )}
          </div>
        </div>

        {/* Due Today */}
        <div 
          onClick={() => setActiveTab('DUE_TODAY')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'DUE_TODAY' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200/80 hover:border-amber-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.dueToday}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {metrics.dueToday}
            </span>
            <span className="text-[10px] font-bold text-slate-400">Hôm nay</span>
          </div>
        </div>

        {/* Warm Leads / High Interest */}
        <div 
          onClick={() => setActiveTab('WARM_LEADS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'WARM_LEADS' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
              : 'bg-white border-slate-200/80 hover:border-emerald-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.warmLeads}
            </span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {metrics.warmLeads}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded">
              Sắp chốt
            </span>
          </div>
        </div>

        {/* Price Objections */}
        <div 
          onClick={() => setActiveTab('PRICE_OBJECTIONS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'PRICE_OBJECTIONS' 
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400' 
              : 'bg-white border-slate-200/80 hover:border-purple-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.priceObjections}
            </span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">
              {metrics.priceObjections}
            </span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100/60 px-1.5 py-0.5 rounded">
              Xem lại giá
            </span>
          </div>
        </div>

        {/* Upcoming 7 Days */}
        <div 
          onClick={() => setActiveTab('UPCOMING')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'UPCOMING' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
              : 'bg-white border-slate-200/80 hover:border-blue-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.upcomingCadence}
            </span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">
              {metrics.upcoming7Days}
            </span>
            <span className="text-[10px] font-bold text-slate-400">7 ngày tới</span>
          </div>
        </div>

        {/* Total Active Pipeline */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ALL' 
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' 
              : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              {t.kpi.totalActive}
            </span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">
              {metrics.totalActive}
            </span>
            <span className="text-[10px] font-bold text-slate-400">Đang chạy</span>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTROLS & SEARCH */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Main Cadence Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-bold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 rounded-xl transition ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.tabs.all} ({metrics.totalActive})
            </button>
            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span>{t.tabs.overdue}</span>
              {metrics.overdue > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black">
                  {metrics.overdue}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('DUE_TODAY')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'DUE_TODAY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span>{t.tabs.dueToday}</span>
              {metrics.dueToday > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black">
                  {metrics.dueToday}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('WARM_LEADS')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'WARM_LEADS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span>{t.tabs.warmLeads}</span>
            </button>
            <button
              onClick={() => setActiveTab('PRICE_OBJECTIONS')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'PRICE_OBJECTIONS'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <span>{t.tabs.priceObjections}</span>
            </button>
            <button
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-3.5 py-2 rounded-xl transition ${
                activeTab === 'UPCOMING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {t.tabs.upcoming}
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3.5 py-2 rounded-xl transition ${
                activeTab === 'COMPLETED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.tabs.completed}
            </button>
          </div>

          {/* View mode toggle & Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('PIPELINE')}
                className={`px-3 py-1 rounded-lg transition ${
                  viewMode === 'PIPELINE'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                  viewMode === 'TIMELINE'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Channel Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo khách hàng, mã báo giá, nội dung follow-up..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Channel dropdown */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="ALL">Kênh: Tất cả</option>
            <option value="CALL">📞 Điện thoại</option>
            <option value="EMAIL">✉️ Email</option>
            <option value="CHAT_ZALO">💬 Zalo</option>
            <option value="MEETING">🤝 Gặp mặt</option>
          </select>

          {/* Sentiment dropdown */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="ALL">Thái độ: Tất cả</option>
            <option value="VERY_INTERESTED">🔥 Quan tâm cao</option>
            <option value="INTERESTED">👍 Đang xem xét</option>
            <option value="PRICE_SENSITIVE">⚠️ Chê giá cao</option>
            <option value="NEED_REVISION">✏️ Cần sửa giá/cước</option>
            <option value="WAITING_MANAGEMENT">⏳ Chờ sếp duyệt</option>
            <option value="READY_TO_BOOK">✅ Đồng ý chốt</option>
          </select>
        </div>
      </div>

      {/* 3. MAIN CONTENT: PIPELINE CARDS OR TIMELINE VIEW */}
      {viewMode === 'PIPELINE' ? (
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/70" />
              <p className="font-bold text-slate-700">Tuyệt vời! Không có hành động follow-up nào bị tồn đọng.</p>
              <p className="text-xs text-slate-500">
                Toàn bộ lịch follow-up và phản hồi của khách hàng đã được cập nhật đầy đủ.
              </p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const timeInfo = calculateTimeRemaining(action.dueAt, action.snoozedUntil);
              const hasTouchpoints = (action.touchpointsCount || 0) > 0;

              return (
                <div
                  key={action.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs ${
                    action.priority === 'CRITICAL' || timeInfo.isOverdue
                      ? 'border-rose-200/80'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      
                      {/* Badges strip */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${timeInfo.badgeColorClass}`}>
                          {isVi ? timeInfo.formattedTextVi : timeInfo.formattedTextEn}
                        </span>

                        {action.entityNumber && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {action.entityType}: {action.entityNumber}
                          </span>
                        )}

                        {getSentimentBadge(action.customerSentiment)}

                        {hasTouchpoints && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <History className="w-3 h-3" />
                            <span>{action.touchpointsCount} lần tương tác</span>
                          </span>
                        )}

                        {action.waitingReason && action.waitingReason !== 'NONE' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            Chờ: {action.waitingReason}
                          </span>
                        )}
                      </div>

                      {/* Action Title */}
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {action.title}
                      </h4>

                      {/* Sub context & notes */}
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          {action.customerName && (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{action.customerName}</span>
                            </span>
                          )}

                          {action.assignedToName && (
                            <span className="text-slate-500">
                              PIC: <strong className="text-slate-700">{action.assignedToName}</strong>
                            </span>
                          )}

                          {action.lastTouchpointAt && (
                            <span className="text-slate-400">
                              Tương tác gần nhất: {new Date(action.lastTouchpointAt).toLocaleString('vi-VN')}
                              {action.lastTouchpointChannel ? ` (${action.lastTouchpointChannel})` : ''}
                            </span>
                          )}
                        </div>

                        {action.waitingReasonNote && (
                          <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{action.waitingReasonNote}"
                          </p>
                        )}
                      </div>

                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* Log Touchpoint CTA */}
                      <button
                        onClick={() => setTouchpointModalAction(action)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{t.actions.logTouchpoint}</span>
                      </button>

                      {/* Quick Cadence buttons */}
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => handleQuickAdvance(action, 24)}
                          className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
                          title="Khách bận, dời lịch gọi lại sang ngày mai"
                        >
                          +1N
                        </button>
                        <button
                          onClick={() => handleQuickAdvance(action, 72)}
                          className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
                          title="Hẹn theo dõi sau 3 ngày"
                        >
                          +3N
                        </button>
                        <button
                          onClick={() => handleQuickAdvance(action, 168)}
                          className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
                          title="Hẹn tuần sau"
                        >
                          +1T
                        </button>
                      </div>

                      {/* Open Execution Modal */}
                      <button
                        onClick={() => setExecutionModalAction(action)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                        title="Xem toàn bộ chi tiết hành động"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Source Entity Direct Link */}
                      {action.entityType === 'QUOTATION' && onOpenQuotation && (
                        <button
                          onClick={() => onOpenQuotation(action.entityId)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition"
                          title="Mở báo giá gốc"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}

                      {action.entityType === 'CUSTOMER' && onOpenCustomer && (
                        <button
                          onClick={() => onOpenCustomer(action.entityId)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition"
                          title="Mở Customer 360"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TIMELINE VIEW: Recent Interactions across the company */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>{t.history.title} (Toàn Công Ty)</span>
            </h3>
            <button
              onClick={loadRecentTimeline}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại</span>
            </button>
          </div>

          {loadingRecent ? (
            <div className="py-12 text-center text-slate-400 font-medium">Đang tải lịch sử tương tác...</div>
          ) : recentTouchpoints.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">{t.history.noHistory}</div>
          ) : (
            <div className="space-y-3">
              {recentTouchpoints.map((tp) => (
                <div 
                  key={tp.id} 
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        {tp.channel === 'CALL' && <Phone className="w-3.5 h-3.5 text-blue-600" />}
                        {tp.channel === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-indigo-600" />}
                        {tp.channel === 'MEETING' && <Users className="w-3.5 h-3.5 text-emerald-600" />}
                        {tp.channel === 'CHAT_ZALO' && <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />}
                        <span>{t.channels[tp.channel] || tp.channel}</span>
                      </span>
                      {tp.customerName && (
                        <span className="text-slate-500">• {tp.customerName}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(tp.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {tp.discussionSummary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <div className="flex items-center gap-2">
                      {getSentimentBadge(tp.sentiment)}
                      {tp.nextStepAction && (
                        <span>Bước tiếp: <strong className="text-slate-700">{tp.nextStepAction}</strong></span>
                      )}
                    </div>
                    <span>Thực hiện bởi: <strong>{tp.createdByName}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: LOG FOLLOW-UP TOUCHPOINT */}
      <LogFollowUpModal
        isOpen={Boolean(touchpointModalAction)}
        onClose={() => setTouchpointModalAction(null)}
        action={touchpointModalAction}
        companyId={companyId}
        user={user}
        onSuccess={() => {
          onRefresh();
          if (viewMode === 'TIMELINE') {
            loadRecentTimeline();
          }
        }}
        isVi={isVi}
      />

      {/* MODAL 2: FULL ACTION EXECUTION MODAL */}
      <ActionExecutionModal
        isOpen={Boolean(executionModalAction)}
        onClose={() => setExecutionModalAction(null)}
        action={executionModalAction}
        companyId={companyId}
        user={user}
        onActionUpdated={onRefresh}
        onOpenQuotation={onOpenQuotation}
        onOpenShipment={onOpenShipment}
        onOpenCustomer={onOpenCustomer}
        onOpenRateHub={onOpenRateHub}
        onOpenOpportunity={onOpenOpportunity}
        onOpenDecisionWorkspace={onOpenDecisionWorkspace}
        isVi={isVi}
      />
    </div>
  );
};
