import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, Mail, MapPin, Building2, Calendar, Clock, 
  TrendingUp, Activity, CheckCircle, AlertCircle, Plus, FileText,
  DollarSign, RefreshCw, Star, ShieldAlert, Award, ChevronRight, Check,
  Radar, SlidersHorizontal
} from 'lucide-react';
import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { 
  CustomerActivityLog, 
  CustomerFollowUp, 
  RateReviewSchedule, 
  RateReviewTask, 
  CustomerOpportunity, 
  CustomerHealthScore,
  CustomerContactPerson 
} from '../../types/crm';
import { BusinessOpportunity } from '../../types/opportunity';
import { fetchCustomer360Data } from '../../services/crm/customer360Service';
import { completeCustomerFollowUp } from '../../services/crm/customerFollowUpService';
import { getBusinessOpportunities } from '../../services/opportunity/businessOpportunityService';
import { OpportunityCard } from '../opportunity/OpportunityCard';
import { LogActivityModal } from './LogActivityModal';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import { CreateRateReviewModal } from './CreateRateReviewModal';

interface Customer360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  companyId?: string;
  user?: { email?: string; name?: string };
  quotes?: QuoteData[];
  shipments?: ShipmentRecord[];
  contracts?: ContractRecord[];
  onSelectCustomerForQuote?: (customer: CustomerRecord) => void;
  onOpenDecisionWorkspace?: (prefill: any) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  isOpen,
  onClose,
  customer,
  companyId = 'default-company',
  user,
  quotes = [],
  shipments = [],
  contracts = [],
  onSelectCustomerForQuote,
  onOpenDecisionWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'FOLLOW_UPS' | 'RATE_REVIEWS' | 'OPPORTUNITIES' | 'CONTACTS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  
  // 360 Data State
  const [activities, setActivities] = useState<CustomerActivityLog[]>([]);
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [rateSchedules, setRateSchedules] = useState<RateReviewSchedule[]>([]);
  const [rateTasks, setRateTasks] = useState<RateReviewTask[]>([]);
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [radarOpportunities, setRadarOpportunities] = useState<BusinessOpportunity[]>([]);
  const [healthScore, setHealthScore] = useState<CustomerHealthScore | null>(null);

  // Modal open states
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false);
  const [isRateReviewOpen, setIsRateReviewOpen] = useState(false);

  const loadData = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const data = await fetchCustomer360Data(customer.id, companyId, customer, quotes, shipments, contracts);
      setActivities(data.activities);
      setFollowUps(data.followUps);
      setRateSchedules(data.rateReviewSchedules);
      setRateTasks(data.rateReviewTasks);
      setOpportunities(data.opportunities);
      setHealthScore(data.healthScore);

      // Load Business Opportunity Radar items
      try {
        const radarList = await getBusinessOpportunities(companyId || 'default-company', { customerId: customer.id });
        setRadarOpportunities(radarList);
      } catch (rErr) {
        console.warn('Could not load radar opportunities:', rErr);
      }
    } catch (err) {
      console.error('Failed to load 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer?.id) {
      loadData();
    }
  }, [isOpen, customer?.id]);

  if (!isOpen || !customer) return null;

  // Filtered associated quotes, shipments, contracts
  const customerQuotes = quotes.filter(q => 
    q.customer?.id === customer.id || 
    q.customer?.customerName?.toLowerCase() === (customer.customerName || customer.companyName || '').toLowerCase()
  );

  const customerShipments = shipments.filter(s => 
    (s as any).customerId === customer.id || 
    (s as any).shipperName?.toLowerCase().includes((customer.companyName || '').toLowerCase())
  );

  const customerContracts = contracts.filter(c => 
    c.partyId === customer.id ||
    c.partyName?.toLowerCase().includes((customer.companyName || '').toLowerCase())
  );

  const formatSafeDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString('vi-VN');
  };

  const formatSafeDateTime = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString('vi-VN');
  };

  const openFollowUpsCount = followUps.filter(f => f.status === 'OPEN').length;
  const overdueFollowUpsCount = followUps.filter(f => {
    if (f.status !== 'OPEN' || !f.dueDate) return false;
    const t = new Date(f.dueDate).getTime();
    return !isNaN(t) && t < Date.now();
  }).length;

  const getHealthBadge = (health: CustomerHealthScore | null) => {
    if (!health) {
      return (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
          Chưa đánh giá
        </span>
      );
    }
    switch (health.status) {
      case 'CHURN_RISK':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Nguy cơ mất khách ({health.score}/100)</span>
          </span>
        );
      case 'NEEDS_ATTENTION':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Cần quan tâm chăm sóc ({health.score}/100)</span>
          </span>
        );
      case 'LOYAL':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khách hàng thân thiết ({health.score}/100)</span>
          </span>
        );
      case 'HEALTHY':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-300">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Khách hàng ổn định ({health.score}/100)</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-lg">
              {customer.code || 'KH'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white tracking-tight">{customer.companyName || customer.customerName}</h2>
                {getHealthBadge(healthScore)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span>MST: {customer.taxId || '—'}</span>
                <span>•</span>
                <span>Nhóm: {customer.group || 'Khách Thương Mại'}</span>
                <span>•</span>
                <span>Người liên hệ: {customer.customerName || customer.contactPerson || '—'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelectCustomerForQuote && (
              <button
                onClick={() => {
                  onSelectCustomerForQuote(customer);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tạo Báo Giá Cho KH</span>
              </button>
            )}
            <button
              onClick={() => setIsLogActivityOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ghi Tương Tác</span>
            </button>
            <button
              onClick={() => setIsFollowUpOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lên Lịch Chăm Sóc</span>
            </button>
            {onOpenDecisionWorkspace && (
              <button
                onClick={() => {
                  onOpenDecisionWorkspace({
                    customerId: customer.id,
                    customerName: customer.customerName || customer.companyName,
                    customerCode: customer.code
                  });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                title="Mở Decision & Scenario Workspace cho khách hàng này"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Decision Hub</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-5 divide-x divide-slate-100 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-3 text-center">
            <span className="text-slate-400 block text-[11px] font-medium">Báo Giá Đã Lập</span>
            <span className="text-sm font-bold text-slate-800">{customerQuotes.length}</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-slate-400 block text-[11px] font-medium">Lô Hàng Thực Hiện</span>
            <span className="text-sm font-bold text-blue-700">{customerShipments.length}</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-slate-400 block text-[11px] font-medium">Hợp Đồng Ký Kết</span>
            <span className="text-sm font-bold text-emerald-700">{customerContracts.length}</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-slate-400 block text-[11px] font-medium">Việc Cần Follow-up</span>
            <span className={`text-sm font-bold ${overdueFollowUpsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {openFollowUpsCount} {overdueFollowUpsCount > 0 && `(${overdueFollowUpsCount} quá hạn)`}
            </span>
          </div>
          <div className="p-3 text-center">
            <span className="text-slate-400 block text-[11px] font-medium">Chu Kỳ Review Giá</span>
            <span className="text-sm font-bold text-indigo-700">
              {rateSchedules.filter(s => s.active).length} tuyến
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'OVERVIEW'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tổng Quan Hồ Sơ
          </button>
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'TIMELINE'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Dòng Thời Gian Tương Tác</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] rounded-full">
              {activities.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('FOLLOW_UPS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'FOLLOW_UPS'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Kế Hoạch Chăm Sóc (Follow-ups)</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${openFollowUpsCount > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
              {openFollowUpsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('RATE_REVIEWS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'RATE_REVIEWS'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Định Kỳ Review Giá (Rate Schedules)</span>
            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] rounded-full">
              {rateSchedules.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('OPPORTUNITIES')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'OPPORTUNITIES'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cơ Hội & Radar ({radarOpportunities.length + opportunities.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Đang tải hồ sơ khách hàng 360...</p>
            </div>
          ) : (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Health summary card */}
                  {healthScore && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-start gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800">
                            Chỉ Số Sức Khỏe & Hành Vi Khách Hàng (Health Score)
                          </h4>
                          <span className="text-xs font-bold text-slate-600">
                            Điểm: {healthScore.score}/100
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{healthScore.primaryReason || (healthScore as any).reason}</p>
                        
                        {/* Indicators pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                          {Array.isArray(healthScore.indicators) ? (
                            healthScore.indicators.map((ind, idx) => (
                              <div key={ind.code || idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block truncate">{ind.label}</span>
                                <span className={`font-semibold ${ind.impact === 'POSITIVE' ? 'text-emerald-700' : ind.impact === 'NEGATIVE' ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {ind.scoreDelta > 0 ? `+${ind.scoreDelta}` : ind.scoreDelta} điểm
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate" title={ind.reason}>{ind.reason}</span>
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Information Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Thông Tin Pháp Lý & Địa Chỉ</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Mã KH:</span>
                          <span className="font-bold text-blue-900 font-mono">{customer.code}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Mã số thuế:</span>
                          <span className="font-mono font-medium text-slate-800">{customer.taxId || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Địa chỉ công ty:</span>
                          <span className="text-slate-800 text-right max-w-[280px]">{customer.address || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Nhóm khách hàng:</span>
                          <span className="font-semibold text-slate-700">{customer.group || 'Khách Thương Mại'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ghi chú nội bộ:</span>
                          <span className="text-slate-600 text-right max-w-[280px] italic">{customer.notes || 'Không có ghi chú'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Đầu Mối Liên Hệ Trực Tiếp</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Người đại diện / liên hệ:</span>
                          <span className="font-bold text-slate-800">{customer.customerName || customer.contactPerson || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Số điện thoại:</span>
                          <span className="font-mono text-blue-700 font-semibold">{customer.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Email trao đổi:</span>
                          <span className="font-mono text-slate-700">{customer.email || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span className="text-slate-500">Sale phụ trách:</span>
                          <span className="font-semibold text-slate-800">{customer.salesPerson || user?.name || 'Chưa gán'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Highlight */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tương Tác Gần Đây Nhất</span>
                      </h4>
                      <button
                        onClick={() => setActiveTab('TIMELINE')}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Xem tất cả ({activities.length})
                      </button>
                    </div>

                    {activities.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">Chưa có tương tác nào được ghi nhận.</p>
                    ) : (
                      <div className="space-y-2">
                        {activities.slice(0, 3).map(act => (
                          <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{act.summary}</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-semibold rounded">
                                  {act.activityType}
                                </span>
                              </div>
                              {act.details && <p className="text-slate-500 mt-1 text-[11px]">{act.details}</p>}
                              {act.nextAction && (
                                <p className="text-blue-700 font-medium mt-1 text-[11px]">
                                  Hành động tiếp: {act.nextAction}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-3">
                              {formatSafeDate(act.occurredAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: TIMELINE */}
              {activeTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Lịch Sử & Dòng Thời Gian Tương Tác</h4>
                      <p className="text-xs text-slate-500">Các cuộc gọi, email, buổi gặp và nhật ký trao đổi nghiệp vụ</p>
                    </div>
                    <button
                      onClick={() => setIsLogActivityOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi Nhận Tương Tác Mới</span>
                    </button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có ghi chép nào. Bấm nút "Ghi Nhận Tương Tác Mới" để lưu nhật ký cuộc gọi hoặc trao đổi.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {activities.map(act => (
                        <div key={act.id} className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
                          <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{act.summary}</span>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200">
                                  {act.activityType}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                Bởi {act.createdByName || act.createdBy} • {formatSafeDateTime(act.occurredAt)}
                              </p>
                            </div>
                            {act.relatedEntityNumber && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {act.relatedEntityType}: {act.relatedEntityNumber}
                              </span>
                            )}
                          </div>

                          {act.details && (
                            <p className="text-slate-600 mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                              {act.details}
                            </p>
                          )}

                          {act.nextAction && (
                            <div className="mt-2 text-xs flex items-center gap-2 text-indigo-700 font-medium">
                              <span className="font-bold">Next Action:</span>
                              <span>{act.nextAction}</span>
                              {act.nextActionDue && (
                                <span className="text-[11px] text-slate-400">
                                  (Hạn: {formatSafeDate(act.nextActionDue)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: FOLLOW_UPS */}
              {activeTab === 'FOLLOW_UPS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Kế Hoạch & Lịch Chăm Sóc Khách Hàng</h4>
                      <p className="text-xs text-slate-500">Các cuộc hẹn gọi lại, kiểm tra cước định kỳ và chăm sóc đơn hàng</p>
                    </div>
                    <button
                      onClick={() => setIsFollowUpOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lên Lịch Chăm Sóc</span>
                    </button>
                  </div>

                  {followUps.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có lịch hẹn chăm sóc nào. Hãy lên lịch gọi điện thoại hoặc gửi báo giá tiếp theo.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {followUps.map(fu => {
                        const isOverdue = fu.status === 'OPEN' && new Date(fu.dueDate) < new Date();
                        const isDone = fu.status === 'COMPLETED';

                        return (
                          <div
                            key={fu.id}
                            className={`p-4 rounded-xl border text-xs bg-white shadow-xs transition ${
                              isDone
                                ? 'border-slate-200 opacity-60'
                                : isOverdue
                                ? 'border-rose-300 bg-rose-50/20'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {!isDone && (
                                  <button
                                    onClick={async () => {
                                      await completeCustomerFollowUp(fu.id, 'Đã hoàn thành qua Customer 360', user);
                                      loadData();
                                    }}
                                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200"
                                    title="Đánh dấu hoàn thành"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">{fu.notes}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                      fu.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                                      fu.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {fu.priority}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">
                                      {fu.followUpType}
                                    </span>
                                    {isDone && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                        ĐÃ HOÀN THÀNH
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-400 text-[11px] mt-1">
                                    Người phụ trách: {fu.ownerName || fu.ownerId} • Hạn chót:{' '}
                                    <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
                                      {formatSafeDateTime(fu.dueDate)}
                                    </span>
                                  </p>
                                  {fu.nextAction && (
                                    <p className="text-indigo-700 mt-1 text-[11px]">
                                      Dự kiến tiếp theo: {fu.nextAction}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {fu.relatedEntityNumber && (
                                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {fu.relatedEntityNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: RATE_REVIEWS */}
              {activeTab === 'RATE_REVIEWS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Chu Kỳ Rà Soát Giá Cước Định Kỳ (Rate Reviews)</h4>
                      <p className="text-xs text-slate-500">Tự động rà soát mức giá theo tuần/tháng để cập nhật theo biến động thị trường</p>
                    </div>
                    <button
                      onClick={() => setIsRateReviewOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thiết Lập Lịch Review Giá</span>
                    </button>
                  </div>

                  {rateSchedules.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                      Chưa có lịch review giá cho tuyến vận chuyển nào của khách hàng này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {rateSchedules.map(sch => (
                        <div key={sch.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-sm">{sch.lane}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200">
                              {sch.frequency}
                            </span>
                          </div>
                          <div className="text-slate-500 space-y-1 text-[11px]">
                            <p>Phương thức: <span className="font-semibold text-slate-700">{sch.serviceMode}</span></p>
                            <p>Ngày review tiếp theo: <span className="font-semibold text-blue-700">{sch.nextReviewDate}</span></p>
                            {sch.notes && <p className="italic text-slate-400">"{sch.notes}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: OPPORTUNITIES */}
              {activeTab === 'OPPORTUNITIES' && (
                <div className="space-y-6">
                  {/* Radar Detected Opportunities */}
                  {radarOpportunities.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Radar className="w-4 h-4 text-indigo-600 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Cơ Hội Phát Hiện Tự Động (Radar Intelligence - {radarOpportunities.length})
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {radarOpportunities.map(opp => (
                          <OpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            compact={true}
                            onSelectForQuote={() => {
                              if (onSelectCustomerForQuote) {
                                onSelectCustomerForQuote(customer);
                              }
                            }}
                            onOpenFollowUp={() => setIsFollowUpOpen(true)}
                            onOpenRateReview={() => setIsRateReviewOpen(true)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Sales Pipeline Opportunities */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Cơ Hội Kinh Doanh Thủ Công (Pipelines)</h4>
                        <p className="text-xs text-slate-500">Các tuyến hàng do Sales ghi nhận và theo dõi thủ công</p>
                      </div>
                      <button
                        onClick={() => setIsOpportunityOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Cơ Hội Mới</span>
                      </button>
                    </div>

                    {opportunities.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                        Chưa ghi nhận cơ hội thủ công nào.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opportunities.map(opp => (
                          <div key={opp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-sm">{opp.title}</span>
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded border border-emerald-200">
                                    {opp.stage} ({opp.probability}%)
                                  </span>
                                </div>
                                <p className="text-slate-500 text-[11px] mt-0.5">
                                  Tuyến: {opp.lane} • Sản lượng: {opp.estimatedVolume || '—'} • Giá trị: ${opp.estimatedValue?.toLocaleString() || 0}
                                </p>
                              </div>
                              {opp.nextAction && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Hành động tiếp</span>
                                  <span className="text-blue-700 font-semibold">{opp.nextAction}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Sub Modals */}
      <LogActivityModal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        customerId={customer.id}
        customerName={customer.companyName || customer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateFollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        customerId={customer.id}
        customerName={customer.companyName || customer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateOpportunityModal
        isOpen={isOpportunityOpen}
        onClose={() => setIsOpportunityOpen(false)}
        customerId={customer.id}
        customerName={customer.companyName || customer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />

      <CreateRateReviewModal
        isOpen={isRateReviewOpen}
        onClose={() => setIsRateReviewOpen(false)}
        customerId={customer.id}
        customerName={customer.companyName || customer.customerName}
        companyId={companyId}
        user={user}
        onSuccess={loadData}
      />
    </div>
  );
};
