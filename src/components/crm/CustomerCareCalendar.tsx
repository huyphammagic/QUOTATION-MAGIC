import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Phone, 
  Mail, 
  Users, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { CustomerFollowUp, RateReviewTask } from '../../types/crm';
import { QuoteData } from '../../types/logistics';
import { ContractRecord } from '../../types/contract';

interface CalendarEventItem {
  id: string;
  type: 'FOLLOW_UP' | 'RATE_REVIEW' | 'QUOTE_EXPIRY' | 'CONTRACT_EXPIRY';
  title: string;
  customerName: string;
  dateStr: string; // YYYY-MM-DD
  timeStr?: string;
  priority?: string;
  status: string;
  originalEntity: any;
}

interface CustomerCareCalendarProps {
  followUps: CustomerFollowUp[];
  rateReviewTasks: RateReviewTask[];
  quotes: QuoteData[];
  contracts: ContractRecord[];
  onSelectCustomer?: (customerId: string) => void;
  onSelectFollowUp?: (followUp: CustomerFollowUp) => void;
  onSelectRateReview?: (task: RateReviewTask) => void;
}

export const CustomerCareCalendar: React.FC<CustomerCareCalendarProps> = ({
  followUps,
  rateReviewTasks,
  quotes,
  contracts,
  onSelectCustomer,
  onSelectFollowUp,
  onSelectRateReview
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Convert all items to unified calendar events
  const events: CalendarEventItem[] = useMemo(() => {
    const list: CalendarEventItem[] = [];

    // Follow-ups
    followUps.forEach(fu => {
      if (fu.dueDate) {
        const d = new Date(fu.dueDate);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        list.push({
          id: `fu_${fu.id}`,
          type: 'FOLLOW_UP',
          title: `[Chăm sóc] ${fu.followUpType}: ${fu.notes.slice(0, 30)}`,
          customerName: fu.customerName,
          dateStr: ymd,
          timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          priority: fu.priority,
          status: fu.status,
          originalEntity: fu,
        });
      }
    });

    // Rate Reviews
    rateReviewTasks.forEach(rr => {
      if (rr.dueAt) {
        const d = new Date(rr.dueAt);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        list.push({
          id: `rr_${rr.id}`,
          type: 'RATE_REVIEW',
          title: `[Review giá] Tuyến ${rr.lane}`,
          customerName: rr.customerName,
          dateStr: ymd,
          timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          priority: 'HIGH',
          status: rr.status,
          originalEntity: rr,
        });
      }
    });

    // Quotation Expiries
    quotes.forEach(q => {
      const validityDate = q.terms?.validityDate || (q as any).validUntil;
      if (validityDate && (q.status === 'SENT' || q.status === 'DRAFT')) {
        const d = new Date(validityDate);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        list.push({
          id: `qe_${q.id}`,
          type: 'QUOTE_EXPIRY',
          title: `[Hết hạn BG] ${q.quoteNumber}`,
          customerName: q.customer?.companyName || q.customer?.customerName || '',
          dateStr: ymd,
          status: 'EXPIRING',
          originalEntity: q,
        });
      }
    });

    // Contract Expiries
    contracts.forEach(c => {
      if (c.expiryDate && c.status === 'ACTIVE') {
        const d = new Date(c.expiryDate);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        list.push({
          id: `ce_${c.id}`,
          type: 'CONTRACT_EXPIRY',
          title: `[Hết hạn HĐ] ${c.contractNumber}`,
          customerName: c.partyName,
          dateStr: ymd,
          status: 'EXPIRING',
          originalEntity: c,
        });
      }
    });

    return list;
  }, [followUps, rateReviewTasks, quotes, contracts]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    return events.filter(e => e.type === filterType);
  }, [events, filterType]);

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sun

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, ymd, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: d, ymd, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, ymd, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const handlePrev = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayYmd = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Calendar Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-200 gap-4 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Lịch Chăm Sóc & Quản Lý Giá / Customer Care & Rate Calendar
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()} ({filteredEvents.length} lịch hẹn)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('FOLLOW_UP')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'FOLLOW_UP' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Follow-up
            </button>
            <button
              onClick={() => setFilterType('RATE_REVIEW')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'RATE_REVIEW' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Review Giá
            </button>
            <button
              onClick={() => setFilterType('QUOTE_EXPIRY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'QUOTE_EXPIRY' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hạn Báo Giá
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition"
          >
            Hôm nay
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-xs font-bold text-slate-600 py-2.5">
        <div>Chủ Nhật</div>
        <div>Thứ Hai</div>
        <div>Thứ Ba</div>
        <div>Thứ Tư</div>
        <div>Thứ Năm</div>
        <div>Thứ Sáu</div>
        <div>Thứ Bảy</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[560px]">
        {calendarDays.map(day => {
          const isToday = day.ymd === todayYmd;
          const dayEvents = filteredEvents.filter(e => e.dateStr === day.ymd);

          return (
            <div
              key={day.ymd}
              className={`p-2 flex flex-col min-h-[110px] transition ${
                !day.isCurrentMonth
                  ? 'bg-slate-50/40 text-slate-400'
                  : isToday
                  ? 'bg-blue-50/30'
                  : 'bg-white hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : day.isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    {dayEvents.length} việc
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                {dayEvents.map(evt => {
                  let badgeBg = 'bg-blue-100 text-blue-800 border-blue-200';
                  if (evt.type === 'RATE_REVIEW') badgeBg = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                  else if (evt.type === 'QUOTE_EXPIRY') badgeBg = 'bg-amber-100 text-amber-800 border-amber-200';
                  else if (evt.type === 'CONTRACT_EXPIRY') badgeBg = 'bg-purple-100 text-purple-800 border-purple-200';
                  if (evt.status === 'COMPLETED') badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through opacity-70';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (evt.type === 'FOLLOW_UP' && onSelectFollowUp) onSelectFollowUp(evt.originalEntity);
                        else if (evt.type === 'RATE_REVIEW' && onSelectRateReview) onSelectRateReview(evt.originalEntity);
                      }}
                      className={`text-[11px] p-1.5 rounded-md border cursor-pointer hover:shadow-2xs transition truncate ${badgeBg}`}
                      title={`${evt.title} - ${evt.customerName}`}
                    >
                      <div className="font-semibold truncate">{evt.title}</div>
                      <div className="text-[10px] opacity-85 truncate">{evt.customerName} {evt.timeStr ? `• ${evt.timeStr}` : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
