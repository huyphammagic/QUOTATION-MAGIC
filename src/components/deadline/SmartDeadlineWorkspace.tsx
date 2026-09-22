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
  ChevronDown
} from 'lucide-react';
import { 
  DeadlineEntity, 
  DeadlineStatus, 
  DeadlinePriority, 
  DeadlineEntityType, 
  DeadlineMetrics 
} from '../../types/deadline';
import { 
  getDeadlines, 
  getDeadlineMetrics, 
  completeDeadline, 
  calculateTimeRemaining 
} from '../../services/deadline/deadlineService';
import { CreateCustomDeadlineModal } from './CreateCustomDeadlineModal';
import { SnoozeDeadlineModal } from './SnoozeDeadlineModal';
import { DeadlineCalendarView } from './DeadlineCalendarView';

interface SmartDeadlineWorkspaceProps {
  companyId: string;
  companyName?: string;
  user: { uid: string; displayName?: string; email?: string };
  onOpenShipment?: (shipmentId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
  isVi?: boolean;
}

export type DeadlineTab = 
  | 'TODAY_OPS' 
  | 'MY_ACTIONS' 
  | 'TEAM_ACTIONS' 
  | 'QUOTATION_VALIDITY' 
  | 'CALENDAR';

export const SmartDeadlineWorkspace: React.FC<SmartDeadlineWorkspaceProps> = ({
  companyId,
  companyName = 'Logistics Co.',
  user,
  onOpenShipment,
  onOpenQuotation,
  isVi = true,
}) => {
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

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [snoozeModalTarget, setSnoozeModalTarget] = useState<DeadlineEntity | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([
        getDeadlines(companyId, {
          status: statusFilter,
          priority: priorityFilter,
          entityType: entityTypeFilter,
          searchQuery,
          pageLimit: 200,
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

  // Tab-filtered lists
  const displayItems = useMemo(() => {
    if (activeTab === 'TODAY_OPS') {
      // Overdue, Due Today, Due Soon, Critical, or Unassigned
      return deadlines.filter(d => 
        d.status === 'OVERDUE' || 
        d.status === 'DUE_TODAY' || 
        d.status === 'DUE_SOON' || 
        d.priority === 'CRITICAL' ||
        !d.assignedTo
      );
    }
    if (activeTab === 'MY_ACTIONS') {
      return deadlines.filter(d => d.assignedTo === user.uid || !d.assignedTo);
    }
    if (activeTab === 'QUOTATION_VALIDITY') {
      return deadlines.filter(d => d.entityType === 'QUOTATION');
    }
    return deadlines;
  }, [deadlines, activeTab, user.uid]);

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
              {isVi ? 'Phân Hệ Giám Sát Tiến Độ & Hạn Chót Vận Hành' : 'Deadline & Action Surveillance Engine'}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-600" />
            {isVi ? 'Trung Tâm Hạn Chót & Hành Động (Action Center)' : 'Smart Logistics Deadline & Action Center'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? 'Theo dõi chính xác SI/CY/VGM Cut-off, Cargo Ready, Hiệu lực báo giá, ETD/ETA và công việc điều hành'
              : 'Surveillance of Cutoffs, Cargo Ready, Quote Validity, ETD/ETA commitments and team actions'}
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
            <span>{isVi ? 'Thiết Lập Hạn Chót (Custom)' : 'New Deadline'}</span>
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
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Cần xử lý khẩn' : 'Action needed'}</div>
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
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Hạn trong 24 giờ' : 'Within 24 hours'}</div>
        </div>

        {/* Metric 3: Critical */}
        <div 
          onClick={() => { setActiveTab('TODAY_OPS'); setPriorityFilter('CRITICAL'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              {isVi ? 'Mức Khẩn Cấp' : 'Critical'}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.critical}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Nguy cơ phạt/rớt tàu' : 'High impact risk'}</div>
        </div>

        {/* Metric 4: Sắp Đến Hạn */}
        <div 
          onClick={() => { setActiveTab('TEAM_ACTIONS'); setStatusFilter('DUE_SOON'); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              {isVi ? 'Sắp Đến Hạn' : 'Due Soon'}
            </span>
            <Clock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.dueSoon}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Trong 48 giờ' : 'Next 48h'}</div>
        </div>

        {/* Metric 5: Việc Của Tôi */}
        <div 
          onClick={() => setActiveTab('MY_ACTIONS')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              {isVi ? 'Việc Của Tôi' : 'My Items'}
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
          <div className="text-[10px] text-slate-500 mt-0.5">{isVi ? 'Cần giao trách nhiệm' : 'Needs owner'}</div>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('TODAY_OPS')}
            className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'TODAY_OPS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>{isVi ? 'Ca Trực Hôm Nay (Morning Ops)' : "Today's Operations"}</span>
            {(metrics.overdue + metrics.dueToday) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-100 text-red-800">
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
            <span>{isVi ? 'Việc Của Tôi (My Actions)' : 'My Action Center'}</span>
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
            <span>{isVi ? 'Đội Ngũ Vận Hành (Team View)' : 'Team Action Center'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {metrics.active}
            </span>
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
            <span>{isVi ? 'Hiệu Lực Báo Giá (Quote Follow-up)' : 'Quotation Validity'}</span>
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
            <span>{isVi ? 'Lịch Vận Hành (Calendar)' : 'Operations Calendar'}</span>
          </button>
        </div>
      </div>

      {/* 4. Filter & Search Strip (Shown for list views) */}
      {activeTab !== 'CALENDAR' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm theo số lô hàng, số báo giá, tiêu đề, khách hàng...' : 'Search by shipment, quote, title, customer...'}
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
              <option value="SHIPMENT">{isVi ? 'Lô hàng (Shipment)' : 'Shipment'}</option>
              <option value="QUOTATION">{isVi ? 'Báo giá (Quote)' : 'Quotation'}</option>
              <option value="CUSTOM">{isVi ? 'Hạn chót tự lập' : 'Custom'}</option>
            </select>
          </div>
        </div>
      )}

      {/* 5. Main Content Area */}
      {activeTab === 'CALENDAR' ? (
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
                {isVi ? 'Đang truy vấn các mốc hạn chót vận hành...' : 'Querying operational deadlines...'}
              </p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {isVi ? 'Không có hạn chót nào cần xử lý' : 'No deadlines require action'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isVi 
                  ? 'Toàn bộ mốc Cut-off, tiến độ lô hàng và hiệu lực báo giá đều an toàn hoặc chưa có dữ liệu phát sinh.'
                  : 'All cutoffs, operational milestones, and quote validities are on schedule or no items exist.'}
              </p>
            </div>
          ) : (
            displayItems.map((item) => {
              const timeInfo = calculateTimeRemaining(item.dueAt, item.snoozedUntil);
              const isDone = item.status === 'COMPLETED';

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
                      <span>Hạn chót: </span>
                      <strong className="text-slate-800">{new Date(item.dueAt).toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold text-slate-900 ${isDone ? 'line-through text-slate-500' : ''}`}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">
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
                      {item.entityType === 'SHIPMENT' && item.entityId && onOpenShipment && (
                        <button
                          onClick={() => onOpenShipment(item.entityId)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>{isVi ? 'Mở Lô Hàng' : 'View Shipment'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.entityType === 'QUOTATION' && item.entityId && onOpenQuotation && (
                        <button
                          onClick={() => onOpenQuotation(item.entityId)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>{isVi ? 'Mở Báo Giá' : 'View Quote'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isDone && (
                        <button
                          onClick={() => setSnoozeModalTarget(item)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                        >
                          {isVi ? 'Tạm Hoãn' : 'Snooze'}
                        </button>
                      )}

                      {!isDone && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-2xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Xác Nhận Xong' : 'Mark Done'}</span>
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

      {/* Modals */}
      <CreateCustomDeadlineModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => loadData()}
        companyId={companyId}
        user={user}
      />

      <SnoozeDeadlineModal
        isOpen={Boolean(snoozeModalTarget)}
        onClose={() => setSnoozeModalTarget(null)}
        onSnoozed={() => loadData()}
        deadline={snoozeModalTarget}
        user={user}
      />
    </div>
  );
};
