import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, 
  Clock, AlertTriangle, ShieldCheck, Filter, Search, Plus, ExternalLink
} from 'lucide-react';
import { RateReviewTask, RateReviewStatus, RateReviewSchedule } from '../../types/crm';
import { 
  subscribeRateReviewTasks, 
  subscribeRateReviewSchedules, 
  processRateReviewTask,
  triggerRateReviewFromSchedule
} from '../../services/crm/rateReviewService';
import { CreateRateReviewModal } from './CreateRateReviewModal';

interface RateReviewWorkspaceProps {
  companyId?: string;
  user?: { email?: string; name?: string };
  onOpenCustomer360?: (customerId: string) => void;
}

export const RateReviewWorkspace: React.FC<RateReviewWorkspaceProps> = ({
  companyId = 'default-company',
  user,
  onOpenCustomer360
}) => {
  const [tasks, setTasks] = useState<RateReviewTask[]>([]);
  const [schedules, setSchedules] = useState<RateReviewSchedule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTasks = subscribeRateReviewTasks(companyId, list => {
      setTasks(list);
    });
    const unsubSchedules = subscribeRateReviewSchedules(companyId, list => {
      setSchedules(list);
    });

    return () => {
      unsubTasks();
      unsubSchedules();
    };
  }, [companyId]);

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch = 
      t.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lane?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.carrier?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = tasks.filter(t => t.status === 'REVIEW_REQUIRED').length;
  const underReviewCount = tasks.filter(t => t.status === 'UNDER_REVIEW').length;
  const proposalReadyCount = tasks.filter(t => t.status === 'PROPOSAL_READY').length;

  const handleStartReview = async (task: RateReviewTask) => {
    setProcessingTaskId(task.id);
    try {
      await processRateReviewTask(
        task.id,
        'UNDER_REVIEW',
        {
          reviewerNotes: `Đang kiểm tra biến động giá thị trường bởi ${user?.name || 'Pricing'}...`,
        },
        user
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleConfirmAndApply = async (task: RateReviewTask) => {
    setProcessingTaskId(task.id);
    try {
      await processRateReviewTask(
        task.id,
        'CUSTOMER_RATE_UPDATED',
        {
          reviewerNotes: `Đã xác nhận và cập nhật mức cước mới vào bảng giá khách hàng.`,
        },
        user
      );
    } catch (err) {
      console.error('Failed to confirm rate update:', err);
    } finally {
      setProcessingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cần Review Ngay</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Chu kỳ đến hạn hoặc giá thị trường đổi</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đang Phân Tích</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{underReviewCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Đang đối chiếu giá hãng tàu & margin</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã Lập Đề Xuất Giá</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{proposalReadyCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Chờ xác nhận để gửi khách hàng</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lịch Review Kích Hoạt</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {schedules.filter(s => s.active).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Tuyến chạy định kỳ tự động</p>
        </div>
      </div>

      {/* Control Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo khách hàng, tuyến đường (lane) hoặc hãng tàu..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="REVIEW_REQUIRED">Cần review (Review Required)</option>
            <option value="UNDER_REVIEW">Đang review (Under Review)</option>
            <option value="PROPOSAL_READY">Đã có đề xuất (Proposal Ready)</option>
            <option value="CUSTOMER_RATE_UPDATED">Đã cập nhật (Updated)</option>
          </select>
        </div>

        <button
          onClick={() => setIsCreateScheduleOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Chu Kỳ Review Tuyến Mới</span>
        </button>
      </div>

      {/* Rate Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            Không có nhiệm vụ review giá nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isProcessing = processingTaskId === task.id;
            const marginDiff = (task.currentMargin && task.proposedMargin) 
              ? task.proposedMargin - task.currentMargin 
              : 0;

            return (
              <div 
                key={task.id} 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800 text-sm">{task.lane}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        task.status === 'REVIEW_REQUIRED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        task.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        task.status === 'PROPOSAL_READY' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {task.status}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                        {task.serviceMode}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span>Khách hàng: <strong className="text-slate-800">{task.customerName}</strong></span>
                      {task.carrier && <span>Hãng tàu: <strong className="text-slate-700">{task.carrier}</strong></span>}
                      <span>Hạn rà soát: <strong className="text-slate-700">
                        {task.dueAt && !isNaN(new Date(task.dueAt).getTime())
                          ? new Date(task.dueAt).toLocaleDateString('vi-VN')
                          : (task.dueAt || '—')}
                      </strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenCustomer360 && (
                      <button
                        onClick={() => onOpenCustomer360(task.customerId)}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 font-semibold"
                        title="Xem hồ sơ khách hàng 360"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem KH 360</span>
                      </button>
                    )}

                    {task.status === 'REVIEW_REQUIRED' && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleStartReview(task)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition disabled:opacity-50"
                      >
                        {isProcessing ? 'Đang cập nhật...' : 'Bắt đầu Review'}
                      </button>
                    )}

                    {(task.status === 'UNDER_REVIEW' || task.status === 'PROPOSAL_READY') && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleConfirmAndApply(task)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác nhận & Cập nhật Giá KH</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Rate Comparison Cards */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  {/* Current Rates */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">MỨC GIÁ HIỆN TẠI (CURRENT)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Giá Mua (Buy)</span>
                        <span className="font-bold text-slate-700 font-mono">
                          ${task.currentBuyRate?.toLocaleString() || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Giá Bán KH (Sell)</span>
                        <span className="font-bold text-blue-700 font-mono">
                          ${task.currentSellRate?.toLocaleString() || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lãi gộp (Margin)</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          ${task.currentMargin?.toLocaleString() || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Rates */}
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs">
                    <span className="text-[11px] font-bold text-blue-600 block mb-1">MỨC GIÁ ĐỀ XUẤT MỚI (PROPOSED)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Giá Mua Mới</span>
                        <span className="font-bold text-slate-700 font-mono">
                          ${task.proposedBuyRate?.toLocaleString() || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Giá Bán Đề Xuất</span>
                        <span className="font-bold text-blue-800 font-mono">
                          ${task.proposedSellRate?.toLocaleString() || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Biến động Margin</span>
                        <span className={`font-bold font-mono flex items-center gap-0.5 ${
                          marginDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {marginDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>${Math.abs(marginDiff).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {task.reviewerNotes && (
                  <p className="text-[11px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded border border-slate-100">
                    Ghi chú review: {task.reviewerNotes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <CreateRateReviewModal
        isOpen={isCreateScheduleOpen}
        onClose={() => setIsCreateScheduleOpen(false)}
        customerId="cust-default"
        customerName="Khách hàng chọn lọc"
        companyId={companyId}
        user={user}
      />
    </div>
  );
};
