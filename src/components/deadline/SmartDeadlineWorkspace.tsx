import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  User, 
  Building2, 
  CheckSquare, 
  Flame, 
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Inbox,
  PauseCircle,
  FileText,
  Ship,
  TrendingUp,
  Phone,
  MessageSquare
} from 'lucide-react';
import { 
  DeadlineEntity, 
  DeadlineStatus, 
  DeadlinePriority, 
  DeadlineEntityType, 
  DeadlineMetrics,
  ActionWaitingReason 
} from '../../types/deadline';
import { 
  getDeadlines, 
  getDeadlineMetrics, 
  completeDeadline, 
  calculateTimeRemaining 
} from '../../services/deadline/deadlineService';
import { CreateBusinessActionModal } from './CreateBusinessActionModal';
import { ActionExecutionModal } from './ActionExecutionModal';
import { SnoozeDeadlineModal } from './SnoozeDeadlineModal';
import { DeadlineCalendarView } from './DeadlineCalendarView';
import { FollowUpControlCenter } from './FollowUpControlCenter';
import { LogFollowUpModal } from './LogFollowUpModal';
import { ACTION_CENTER_I18N } from '../../i18n/actionCenter';

interface SmartDeadlineWorkspaceProps {
  companyId: string;
  companyName?: string;
  user: { uid: string; displayName?: string; email?: string };
  onOpenShipment?: (shipmentId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenRateHub?: () => void;
  onOpenOpportunity?: (opportunityId: string) => void;
  onOpenDecisionWorkspace?: (decisionId?: string) => void;
  isVi?: boolean;
}

export type DeadlineTab = 
  | 'TODAY_OPS' 
  | 'FOLLOW_UP_CONTROL'
  | 'MY_ACTIONS' 
  | 'TEAM_ACTIONS' 
  | 'WAITING_QUEUES'
  | 'CRITICAL_ACTIONS'
  | 'QUOTATION_VALIDITY' 
  | 'CALENDAR';

export const SmartDeadlineWorkspace: React.FC<SmartDeadlineWorkspaceProps> = ({
  companyId,
  companyName = 'Logistics Co.',
  user,
  onOpenShipment,
  onOpenQuotation,
  onOpenCustomer,
  onOpenRateHub,
  onOpenOpportunity,
  onOpenDecisionWorkspace,
  isVi = true,
}) => {
  const t = isVi ? ACTION_CENTER_I18N.vi : ACTION_CENTER_I18N.en;

  const [activeTab, setActiveTab] = useState<DeadlineTab>('TODAY_OPS');
  const [deadlines, setDeadlines] = useState<DeadlineEntity[]>([]);
  const [metrics, setMetrics] = useState<DeadlineMetrics>({
    total: 0,
    active: 0,
    overdue: 0,
    dueToday: 0,
    dueSoon: 0,
    critical: 0,
    upcoming: 0,
    completed: 0,
    unassigned: 0,
    myItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeadlineStatus | 'ALL' | 'ACTIVE'>('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState<DeadlinePriority | 'ALL'>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<DeadlineEntityType | 'ALL'>('ALL');
  const [waitingReasonSubFilter, setWaitingReasonSubFilter] = useState<ActionWaitingReason | 'ALL'>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActionForExecution, setSelectedActionForExecution] = useState<DeadlineEntity | null>(null);
  const [snoozeModalTarget, setSnoozeModalTarget] = useState<DeadlineEntity | null>(null);
  const [followUpModalTarget, setFollowUpModalTarget] = useState<DeadlineEntity | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([
        getDeadlines(companyId, {
          status: statusFilter,
          priority: priorityFilter,
          entityType: entityTypeFilter,
          searchQuery,
          pageLimit: 250,
        }),
        getDeadlineMetrics(companyId, user.uid),
      ]);
      setDeadlines(list);
      setMetrics(m);
    } catch (err) {
      console.error('[SmartDeadlineWorkspace] Error loading deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, statusFilter, priorityFilter, entityTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleComplete = async (deadlineId: string) => {
    try {
      await completeDeadline(deadlineId, user, 'Hoàn thành từ Action Center');
      loadData();
    } catch (err) {
      console.error('Error completing deadline:', err);
    }
  };

  // Waiting count calculation
  const waitingCount = useMemo(() => {
    return deadlines.filter(d => d.status === 'WAITING').length;
  }, [deadlines]);

  // Tab-filtered lists
  const displayItems = useMemo(() => {
    let result = deadlines;

    if (activeTab === 'TODAY_OPS') {
      result = deadlines.filter(d => 
        d.status === 'OVERDUE' || 
        d.status === 'DUE_TODAY' || 
        d.status === 'DUE_SOON' || 
        d.priority === 'CRITICAL' ||
        !d.assignedTo
      );
    } else if (activeTab === 'MY_ACTIONS') {
      result = deadlines.filter(d => d.assignedTo === user.uid || !d.assignedTo);
    } else if (activeTab === 'WAITING_QUEUES') {
      result = deadlines.filter(d => d.status === 'WAITING');
      if (waitingReasonSubFilter !== 'ALL') {
        result = result.filter(d => d.waitingReason === waitingReasonSubFilter);
      }
    } else if (activeTab === 'CRITICAL_ACTIONS') {
      result = deadlines.filter(d => d.priority === 'CRITICAL' || d.status === 'OVERDUE');
    } else if (activeTab === 'QUOTATION_VALIDITY') {
      result = deadlines.filter(d => d.entityType === 'QUOTATION' || d.actionType === 'QUOTATION_FOLLOW_UP' || d.actionType === 'QUOTATION_VALID_UNTIL');
    }

    // Secondary client search query if any
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.entityNumber && d.entityNumber.toLowerCase().includes(q)) ||
        (d.customerName && d.customerName.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.actionRequired && d.actionRequired.toLowerCase().includes(q))
      );
    }

    return result;
  }, [deadlines, activeTab, user.uid, waitingReasonSubFilter, searchQuery]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {companyName}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {isVi ? 'Phân Hệ Giám Sát & Điều Phối Hành Động Nghiệp Vụ' : 'Smart Action & Execution Workspace'}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-600" />
            {isVi ? 'Không Gian Hành Động & Thực Thi Nghiệp Vụ' : 'Business Action & Execution Workspace'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? 'Chuyển hóa Quyết định → Hành động → Công việc → Hạn chót → Theo dõi & Kiểm toán'
              : 'Orchestrating Decision → Action → Task → Deadline → Follow-up → Execution → Audit'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title={isVi ? 'Tải lại dữ liệu' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isVi ? 'Tạo Hành Động Nghiệp Vụ' : 'New Business Action'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Overdue */}
        <div 
          onClick={() => { setActiveTab('TODAY_OPS'); setStatusFilter('OVERDUE'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-red-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              {isVi ? 'Quá Hạn' : 'Overdue'}
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.overdue}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Cần xử lý ngay' : 'Immediate action'}</div>
        </div>

        {/* Metric 2: Due Today */}
        <div 
          onClick={() => { setActiveTab('TODAY_OPS'); setStatusFilter('DUE_TODAY'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              {isVi ? 'Đến Hạn Hôm Nay' : 'Due Today'}
            </span>
            <Flame className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.dueToday}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Trong 24 giờ' : 'Next 24 hours'}</div>
        </div>

        {/* Metric 3: Critical */}
        <div 
          onClick={() => { setActiveTab('CRITICAL_ACTIONS'); setPriorityFilter('CRITICAL'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              {isVi ? 'Mức Khẩn Cấp' : 'Critical'}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.critical}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Rủi ro cao' : 'High business impact'}</div>
        </div>

        {/* Metric 4: Waiting Queue */}
        <div 
          onClick={() => { setActiveTab('WAITING_QUEUES'); setStatusFilter('ALL'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              {isVi ? 'Đang Chờ Xử Lý' : 'Waiting Queues'}
            </span>
            <Clock className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{waitingCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Chờ khách / hãng / duyệt' : 'External / internal block'}</div>
        </div>

        {/* Metric 5: Việc Của Tôi */}
        <div 
          onClick={() => setActiveTab('MY_ACTIONS')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              {isVi ? 'Việc Của Tôi' : 'My Actions'}
            </span>
            <User className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.myItems}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Được phân công' : 'Assigned to me'}</div>
        </div>

        {/* Metric 6: Chưa Phân Công */}
        <div 
          onClick={() => { setActiveTab('TEAM_ACTIONS'); setStatusFilter('ALL'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {isVi ? 'Chưa Gán PIC' : 'Unassigned'}
            </span>
            <CheckSquare className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.unassigned}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Cần giao việc' : 'Needs owner'}</div>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('TODAY_OPS')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'TODAY_OPS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>{isVi ? 'Ca Trực Hôm Nay' : "Today's Ops"}</span>
            {(metrics.overdue + metrics.dueToday) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                {metrics.overdue + metrics.dueToday}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('FOLLOW_UP_CONTROL')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'FOLLOW_UP_CONTROL'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Phone className="w-4 h-4 text-blue-600" />
            <span>{isVi ? 'Trung Tâm Follow-Up' : 'Follow-Up Hub'}</span>
            {(metrics.overdue + metrics.dueToday) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                {metrics.overdue + metrics.dueToday}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('MY_ACTIONS')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'MY_ACTIONS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <User className="w-4 h-4 text-indigo-500" />
            <span>{isVi ? 'Việc Của Tôi' : 'My Actions'}</span>
            {metrics.myItems > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                {metrics.myItems}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('TEAM_ACTIONS')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'TEAM_ACTIONS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-slate-500" />
            <span>{isVi ? 'Đội Ngũ Vận Hành' : 'Team Actions'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {metrics.active}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('WAITING_QUEUES')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'WAITING_QUEUES'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Inbox className="w-4 h-4 text-purple-600" />
            <span>{isVi ? 'Hàng Chờ Nghiệp Vụ' : 'Waiting Queues'}</span>
            {waitingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                {waitingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CRITICAL_ACTIONS')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'CRITICAL_ACTIONS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{isVi ? 'Khẩn Cấp & Quá Hạn' : 'Critical Actions'}</span>
          </button>

          <button
            onClick={() => setActiveTab('QUOTATION_VALIDITY')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'QUOTATION_VALIDITY'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-500" />
            <span>{isVi ? 'Hiệu Lực Báo Giá' : 'Quotation Validity'}</span>
          </button>

          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'CALENDAR'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>{isVi ? 'Lịch Vận Hành' : 'Operations Calendar'}</span>
          </button>
        </div>
      </div>

      {/* 4. Sub-Filter for Waiting Queues */}
      {activeTab === 'WAITING_QUEUES' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setWaitingReasonSubFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tất cả hàng chờ ({waitingCount})
          </button>

          <button
            onClick={() => setWaitingReasonSubFilter('CUSTOMER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'CUSTOMER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chờ khách hàng ({deadlines.filter(d => d.status === 'WAITING' && d.waitingReason === 'CUSTOMER').length})
          </button>

          <button
            onClick={() => setWaitingReasonSubFilter('SUPPLIER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'SUPPLIER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chờ đại lý / hãng tàu ({deadlines.filter(d => d.status === 'WAITING' && d.waitingReason === 'SUPPLIER').length})
          </button>

          <button
            onClick={() => setWaitingReasonSubFilter('RATE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'RATE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chờ giá cước ({deadlines.filter(d => d.status === 'WAITING' && d.waitingReason === 'RATE').length})
          </button>

          <button
            onClick={() => setWaitingReasonSubFilter('INTERNAL_APPROVAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'INTERNAL_APPROVAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chờ duyệt nội bộ ({deadlines.filter(d => d.status === 'WAITING' && d.waitingReason === 'INTERNAL_APPROVAL').length})
          </button>

          <button
            onClick={() => setWaitingReasonSubFilter('DOCUMENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              waitingReasonSubFilter === 'DOCUMENTS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chờ chứng từ ({deadlines.filter(d => d.status === 'WAITING' && d.waitingReason === 'DOCUMENTS').length})
          </button>
        </div>
      )}

      {/* 5. Filter & Search Strip (List views) */}
      {activeTab !== 'CALENDAR' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm theo mã lô, báo giá, tiêu đề, khách hàng, hành động...' : 'Search by shipment, quote, title, customer...'}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ACTIVE">{isVi ? 'Trạng thái: Đang theo dõi' : 'Status: Active'}</option>
              <option value="ALL">{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="OVERDUE">{isVi ? 'Quá hạn (Overdue)' : 'Overdue'}</option>
              <option value="DUE_TODAY">{isVi ? 'Hôm nay (Due Today)' : 'Due Today'}</option>
              <option value="DUE_SOON">{isVi ? 'Sắp đến hạn' : 'Due Soon'}</option>
              <option value="WAITING">{isVi ? 'Đang chờ (Waiting)' : 'Waiting'}</option>
              <option value="IN_PROGRESS">{isVi ? 'Đang xử lý (In Progress)' : 'In Progress'}</option>
              <option value="SNOOZED">{isVi ? 'Đang tạm hoãn' : 'Snoozed'}</option>
              <option value="COMPLETED">{isVi ? 'Đã hoàn tất' : 'Completed'}</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">{isVi ? 'Mức độ: Tất cả' : 'Priority: All'}</option>
              <option value="CRITICAL">{isVi ? 'Khẩn cấp (Critical)' : 'Critical'}</option>
              <option value="HIGH">{isVi ? 'Cao (High)' : 'High'}</option>
              <option value="MEDIUM">{isVi ? 'Vừa (Medium)' : 'Medium'}</option>
              <option value="LOW">{isVi ? 'Thấp (Low)' : 'Low'}</option>
            </select>

            {/* Entity Type Filter */}
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value as any)}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">{isVi ? 'Nguồn: Tất cả' : 'Type: All'}</option>
              <option value="QUOTATION">{isVi ? 'Báo giá (Quote)' : 'Quotation'}</option>
              <option value="SHIPMENT">{isVi ? 'Lô hàng (Shipment)' : 'Shipment'}</option>
              <option value="CUSTOMER">{isVi ? 'Khách hàng (Customer)' : 'Customer'}</option>
              <option value="RATE">{isVi ? 'Bảng cước (Rate)' : 'Rate'}</option>
              <option value="OPPORTUNITY">{isVi ? 'Cơ hội (Opportunity)' : 'Opportunity'}</option>
              <option value="DECISION">{isVi ? 'Quyết định (Decision)' : 'Decision'}</option>
              <option value="CUSTOM">{isVi ? 'Hạn chót tự lập' : 'Custom'}</option>
            </select>
          </div>
        </div>
      )}

      {/* 6. Main Content Area */}
      {activeTab === 'FOLLOW_UP_CONTROL' ? (
        <FollowUpControlCenter
          actions={deadlines}
          companyId={companyId}
          companyName={companyName}
          user={user}
          onRefresh={loadData}
          onOpenQuotation={onOpenQuotation}
          onOpenShipment={onOpenShipment}
          onOpenCustomer={onOpenCustomer}
          onOpenRateHub={onOpenRateHub}
          onOpenOpportunity={onOpenOpportunity}
          onOpenDecisionWorkspace={onOpenDecisionWorkspace}
          isVi={isVi}
        />
      ) : activeTab === 'CALENDAR' ? (
        <DeadlineCalendarView
          deadlines={deadlines}
          onOpenShipment={onOpenShipment}
          onOpenQuotation={onOpenQuotation}
          onCompleteDeadline={handleComplete}
          onSnoozeDeadline={(d) => setSnoozeModalTarget(d)}
          isVi={isVi}
        />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                {isVi ? 'Đang truy vấn các hành động và hạn chót nghiệp vụ...' : 'Querying business actions and deadlines...'}
              </p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {isVi ? 'Không có hành động nào cần xử lý trong mục này' : 'No actions require execution in this queue'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isVi 
                  ? 'Toàn bộ mốc hạn chót, follow-up và công việc đều đã được xử lý hoặc chưa phát sinh dữ liệu.'
                  : 'All operational actions and deadlines are currently up to date.'}
              </p>
            </div>
          ) : (
            displayItems.map((item) => {
              const timeInfo = calculateTimeRemaining(item.dueAt, item.snoozedUntil);
              const isDone = item.status === 'COMPLETED';
              const isWaiting = item.status === 'WAITING';
              const subtaskCount = item.subtasks?.length || 0;
              const subtaskDone = item.subtasks?.filter(s => s.isCompleted).length || 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all p-4.5 shadow-2xs hover:shadow-xs space-y-3 ${
                    isDone 
                      ? 'border-slate-200/60 opacity-60 bg-slate-50/50' 
                      : item.status === 'OVERDUE'
                      ? 'border-red-300 hover:border-red-400 bg-red-50/10'
                      : item.priority === 'CRITICAL'
                      ? 'border-amber-300 hover:border-amber-400'
                      : isWaiting
                      ? 'border-purple-300 bg-purple-50/10 hover:border-purple-400'
                      : 'border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  {/* Top Bar: Badges & Identifiers */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${timeInfo.badgeColorClass}`}>
                        {isVi ? timeInfo.formattedTextVi : timeInfo.formattedTextEn}
                      </span>

                      {item.priority === 'CRITICAL' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-600 text-white shadow-2xs">
                          CRITICAL
                        </span>
                      )}

                      {isWaiting && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Đang chờ: {item.waitingReason || 'Bên thứ ba'}</span>
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.deadlineType}
                      </span>

                      {item.entityNumber && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {item.entityNumber}
                        </span>
                      )}

                      {item.customerName && (
                        <span className="text-xs text-slate-600 font-medium">
                          • {item.customerName}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 self-end sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.details.dueAt}: </span>
                      <strong className="text-slate-800">{new Date(item.dueAt).toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div 
                    onClick={() => setSelectedActionForExecution(item)}
                    className="space-y-1 cursor-pointer group"
                  >
                    <h4 className={`text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 ${
                      isDone ? 'line-through text-slate-500' : ''
                    }`}>
                      <span>{item.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </h4>
                    {item.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Operational Action Required Box */}
                  {item.actionRequired && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">{isVi ? 'Hành động đề xuất: ' : 'Action required: '}</span>
                          <span>{item.actionRequired}</span>
                        </div>
                      </div>

                      {item.assignedToName ? (
                        <span className="text-[11px] font-semibold text-slate-600 shrink-0 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          👤 {item.assignedToName}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          ⚠️ Chưa có PIC
                        </span>
                      )}
                    </div>
                  )}

                  {/* Subtask progress if any */}
                  {subtaskCount > 0 && (
                    <div className="flex items-center gap-3 text-xs bg-indigo-50/40 px-3 py-1.5 rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-900">
                        Tiến độ subtasks: {subtaskDone}/{subtaskCount} ({Math.round((subtaskDone / subtaskCount) * 100)}%)
                      </span>
                      <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${(subtaskDone / subtaskCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="text-[11px] text-slate-500">
                      {isDone && item.completedAt && (
                        <span className="text-emerald-700 font-medium">
                          ✓ Đã hoàn tất lúc {new Date(item.completedAt).toLocaleString('vi-VN')} ({item.completedBy})
                        </span>
                      )}
                      {!isDone && item.snoozedUntil && (
                        <span className="text-purple-700 font-medium">
                          Tạm hoãn đến {new Date(item.snoozedUntil).toLocaleString('vi-VN')} (Lần {item.snoozeCount || 1})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDone && (
                        <button
                          onClick={() => setFollowUpModalTarget(item)}
                          className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Ghi nhận cuộc gọi, email, trao đổi với khách hàng"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Follow-up' : 'Touchpoint'}</span>
                        </button>
                      )}

                      {/* Deep Execution CTA */}
                      <button
                        onClick={() => setSelectedActionForExecution(item)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Xem & Xử Lý' : 'Execute Action'}</span>
                      </button>

                      {item.entityType === 'SHIPMENT' && item.entityId && onOpenShipment && (
                        <button
                          onClick={() => onOpenShipment(item.entityId)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>{isVi ? 'Lô Hàng' : 'Shipment'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.entityType === 'QUOTATION' && item.entityId && onOpenQuotation && (
                        <button
                          onClick={() => onOpenQuotation(item.entityId)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>{isVi ? 'Báo Giá' : 'Quote'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isDone && (
                        <button
                          onClick={() => setSnoozeModalTarget(item)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                        >
                          {isVi ? 'Hoãn' : 'Snooze'}
                        </button>
                      )}

                      {!isDone && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-2xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Xong' : 'Done'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Create Business Action Modal */}
      <CreateBusinessActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => loadData()}
        companyId={companyId}
        user={user}
        isVi={isVi}
      />

      {/* 2. Deep Execution Workspace Modal */}
      <ActionExecutionModal
        isOpen={Boolean(selectedActionForExecution)}
        onClose={() => setSelectedActionForExecution(null)}
        action={selectedActionForExecution}
        companyId={companyId}
        user={user}
        onActionUpdated={() => loadData()}
        onOpenQuotation={onOpenQuotation}
        onOpenShipment={onOpenShipment}
        onOpenCustomer={onOpenCustomer}
        onOpenRateHub={onOpenRateHub}
        onOpenOpportunity={onOpenOpportunity}
        onOpenDecisionWorkspace={onOpenDecisionWorkspace}
        isVi={isVi}
      />

      {/* 3. Quick Snooze Modal */}
      <SnoozeDeadlineModal
        isOpen={Boolean(snoozeModalTarget)}
        onClose={() => setSnoozeModalTarget(null)}
        onSnoozed={() => loadData()}
        deadline={snoozeModalTarget}
        user={user}
      />

      {/* 4. Log Follow-Up Touchpoint Modal */}
      <LogFollowUpModal
        isOpen={Boolean(followUpModalTarget)}
        onClose={() => setFollowUpModalTarget(null)}
        action={followUpModalTarget}
        companyId={companyId}
        user={user}
        onSuccess={() => loadData()}
        isVi={isVi}
      />

    </div>
  );
};
