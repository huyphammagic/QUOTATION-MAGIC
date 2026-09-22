import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle, Clock, AlertTriangle, Phone, Mail, 
  Users, RefreshCw, Sparkles, Filter, Search, Plus, Check, ArrowRight
} from 'lucide-react';
import { CustomerFollowUp, RateReviewTask, SmartCRMRecommendation } from '../../types/crm';
import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { 
  subscribeCustomerFollowUps, 
  completeCustomerFollowUp 
} from '../../services/crm/customerFollowUpService';
import { subscribeRateReviewTasks } from '../../services/crm/rateReviewService';
import { generateCRMIntelligenceRecommendations } from '../../services/crm/smartCRMIntelligenceService';
import { CustomerCareCalendar } from './CustomerCareCalendar';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { LogActivityModal } from './LogActivityModal';

interface SalesFollowUpWorkspaceProps {
  companyId?: string;
  user?: { email?: string; name?: string };
  customers: CustomerRecord[];
  quotes: QuoteData[];
  shipments: ShipmentRecord[];
  contracts: ContractRecord[];
  onOpenCustomer360?: (customerId: string) => void;
}

export const SalesFollowUpWorkspace: React.FC<SalesFollowUpWorkspaceProps> = ({
  companyId = 'default-company',
  user,
  customers = [],
  quotes = [],
  shipments = [],
  contracts = [],
  onOpenCustomer360
}) => {
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [rateReviewTasks, setRateReviewTasks] = useState<RateReviewTask[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR' | 'RECOMMENDATIONS'>('LIST');
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'COMPLETED' | 'ALL'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowUp, setSelectedFollowUp] = useState<CustomerFollowUp | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [activeCustomerForAction, setActiveCustomerForAction] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const unsubFollowUps = subscribeCustomerFollowUps(companyId, list => {
      setFollowUps(list);
    });
    const unsubRates = subscribeRateReviewTasks(companyId, list => {
      setRateReviewTasks(list);
    });

    return () => {
      unsubFollowUps();
      unsubRates();
    };
  }, [companyId]);

  // Compute Smart Recommendations
  const recommendations: SmartCRMRecommendation[] = useMemo(() => {
    return generateCRMIntelligenceRecommendations({
      customers,
      quotes,
      shipments,
      contracts,
      followUps,
      rateReviewTasks
    });
  }, [customers, quotes, shipments, contracts, followUps, rateReviewTasks]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;

  const overdueCount = followUps.filter(f => f.status === 'OPEN' && new Date(f.dueDate).getTime() < todayStart).length;
  const todayCount = followUps.filter(f => {
    const t = new Date(f.dueDate).getTime();
    return f.status === 'OPEN' && t >= todayStart && t < todayEnd;
  }).length;
  const completedCount = followUps.filter(f => f.status === 'COMPLETED').length;

  const filteredFollowUps = followUps.filter(f => {
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesSearch = 
      f.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.ownerName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleComplete = async (fu: CustomerFollowUp) => {
    try {
      await completeCustomerFollowUp(fu.id, 'Đã hoàn thành qua Sales Follow-Up Workspace', user);
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Quá Hạn Chăm Sóc</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{overdueCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cần liên hệ lại ngay hôm nay</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lịch Hẹn Hôm Nay</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{todayCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cuộc gọi, email & kiểm tra giá</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gợi Ý Bán Hàng (AI/Smart)</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{recommendations.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cơ hội chốt đơn & giữ chân KH</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã Hoàn Thành</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{completedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Nhiệm vụ chăm sóc hoàn tất</p>
        </div>
      </div>

      {/* Navigation Tabs and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'LIST'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Danh Sách Nhiệm Vụ ({filteredFollowUps.length})
          </button>
          <button
            onClick={() => setViewMode('RECOMMENDATIONS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'RECOMMENDATIONS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi Ý Thông Minh ({recommendations.length})</span>
          </button>
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'CALENDAR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch Chăm Sóc Tháng</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'LIST' && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhiệm vụ, khách hàng..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
              >
                <option value="OPEN">Chưa xong (Open)</option>
                <option value="COMPLETED">Đã xong (Completed)</option>
                <option value="ALL">Tất cả</option>
              </select>
            </>
          )}

          <button
            onClick={() => {
              setActiveCustomerForAction({
                id: customers[0]?.id || 'cust-default',
                name: customers[0]?.companyName || 'Khách hàng',
              });
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Lịch Chăm Sóc</span>
          </button>
        </div>
      </div>

      {/* VIEW: CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <CustomerCareCalendar
          followUps={followUps}
          rateReviewTasks={rateReviewTasks}
          quotes={quotes}
          contracts={contracts}
          onSelectCustomer={id => onOpenCustomer360 && onOpenCustomer360(id)}
          onSelectFollowUp={fu => {
            setSelectedFollowUp(fu);
          }}
        />
      )}

      {/* VIEW: SMART RECOMMENDATIONS */}
      {viewMode === 'RECOMMENDATIONS' && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Tuyệt vời! Hiện tại không có cảnh báo rủi ro khách hàng hay báo giá tồn đọng nào cần xử lý khẩn.
            </div>
          ) : (
            recommendations.map(rec => (
              <div 
                key={rec.id} 
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-start justify-between gap-4 hover:border-purple-200 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 text-purple-700 rounded-lg shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{rec.title}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        (rec.priority === 'URGENT' || rec.urgency === 'CRITICAL') ? 'bg-rose-100 text-rose-800' :
                        (rec.priority === 'HIGH' || rec.urgency === 'HIGH') ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.priority || rec.urgency || 'NORMAL'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {rec.customerName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {rec.reason}
                    </p>

                    <div className="mt-2 text-xs font-semibold text-purple-700 flex items-center gap-1">
                      <span>Đề xuất:</span>
                      <span>{rec.suggestedAction}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenCustomer360 && (
                    <button
                      onClick={() => onOpenCustomer360(rec.customerId)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition font-semibold"
                    >
                      Hồ Sơ 360
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveCustomerForAction({ id: rec.customerId, name: rec.customerName });
                      setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition"
                  >
                    <span>Lên Lịch Ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW: LIST OF TASKS */}
      {viewMode === 'LIST' && (
        <div className="space-y-3">
          {filteredFollowUps.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Không có nhiệm vụ follow-up nào trong danh sách.
            </div>
          ) : (
            filteredFollowUps.map(fu => {
              const isOverdue = fu.status === 'OPEN' && new Date(fu.dueDate).getTime() < todayStart;
              const isDone = fu.status === 'COMPLETED';

              return (
                <div
                  key={fu.id}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition ${
                    isDone
                      ? 'border-slate-200 opacity-60'
                      : isOverdue
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {!isDone && (
                        <button
                          onClick={() => handleComplete(fu)}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition mt-0.5"
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

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>Khách hàng: <strong className="text-slate-700">{fu.customerName}</strong></span>
                          <span>Phụ trách: <strong className="text-slate-700">{fu.ownerName}</strong></span>
                          <span>
                            Hạn chót:{' '}
                            <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>
                              {new Date(fu.dueDate).toLocaleString('vi-VN')}
                            </strong>
                          </span>
                        </div>

                        {fu.nextAction && (
                          <p className="text-xs text-indigo-700 font-medium mt-1">
                            Bước tiếp: {fu.nextAction}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenCustomer360 && (
                        <button
                          onClick={() => onOpenCustomer360(fu.customerId)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-md transition font-semibold"
                        >
                          KH 360
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveCustomerForAction({ id: fu.customerId, name: fu.customerName });
                          setIsLogActivityOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                      >
                        Ghi nhật ký
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub Modals */}
      {activeCustomerForAction && (
        <>
          <CreateFollowUpModal
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              setActiveCustomerForAction(null);
            }}
            customerId={activeCustomerForAction.id}
            customerName={activeCustomerForAction.name}
            companyId={companyId}
            user={user}
          />

          <LogActivityModal
            isOpen={isLogActivityOpen}
            onClose={() => {
              setIsLogActivityOpen(false);
              setActiveCustomerForAction(null);
            }}
            customerId={activeCustomerForAction.id}
            customerName={activeCustomerForAction.name}
            companyId={companyId}
            user={user}
          />
        </>
      )}
    </div>
  );
};
