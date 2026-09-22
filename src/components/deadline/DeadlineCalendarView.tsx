import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { DeadlineEntity } from '../../types/deadline';
import { calculateTimeRemaining } from '../../services/deadline/deadlineService';

interface DeadlineCalendarViewProps {
  deadlines: DeadlineEntity[];
  onSelectDeadline?: (deadline: DeadlineEntity) => void;
  onOpenShipment?: (shipmentId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
  onCompleteDeadline?: (deadlineId: string) => void;
  onSnoozeDeadline?: (deadline: DeadlineEntity) => void;
  isVi?: boolean;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDeadlineDateYMD(dueAt: string): string {
  if (!dueAt) return '';
  if (dueAt.length === 10 && !dueAt.includes('T')) return dueAt;
  const d = new Date(dueAt);
  if (isNaN(d.getTime())) return dueAt.substring(0, 10);
  return formatYMD(d);
}

export const DeadlineCalendarView: React.FC<DeadlineCalendarViewProps> = ({
  deadlines,
  onSelectDeadline,
  onOpenShipment,
  onOpenQuotation,
  onCompleteDeadline,
  onSnoozeDeadline,
  isVi = true,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayYMD, setSelectedDayYMD] = useState<string>(() => {
    return formatYMD(new Date());
  });
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');

  // Month navigation
  const prevPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'MONTH') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'MONTH') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayYMD(formatYMD(now));
  };

  // Group deadlines by YYYY-MM-DD
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineEntity[]>();
    deadlines.forEach((d) => {
      if (!d.dueAt) return;
      const ymd = getDeadlineDateYMD(d.dueAt);
      const list = map.get(ymd) || [];
      list.push(d);
      map.set(ymd, list);
    });
    return map;
  }, [deadlines]);

  // Generate calendar days for MONTH view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week: 0 (Sun) to 6 (Sat). We want Monday first (0 = Mon, 6 = Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean; ymd: string }[] = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        ymd: formatYMD(d),
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        ymd: formatYMD(d),
      });
    }

    // Next month filler days (fill up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        ymd: formatYMD(d),
      });
    }

    return days;
  }, [currentDate]);

  const todayYMD = formatYMD(new Date());
  const selectedDayDeadlines = deadlinesByDate.get(selectedDayYMD) || [];

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 capitalize">
              {currentDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <p className="text-xs text-slate-500">
              {isVi ? 'Lịch vận hành & theo dõi hạn chót' : 'Operations Schedule & Surveillance Calendar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {isVi ? 'Hôm Nay' : 'Today'}
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              onClick={prevPeriod}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPeriod}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid & Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Month Calendar Matrix */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>{isVi ? 'T2' : 'Mon'}</span>
            <span>{isVi ? 'T3' : 'Tue'}</span>
            <span>{isVi ? 'T4' : 'Wed'}</span>
            <span>{isVi ? 'T5' : 'Thu'}</span>
            <span>{isVi ? 'T6' : 'Fri'}</span>
            <span className="text-amber-600">{isVi ? 'T7' : 'Sat'}</span>
            <span className="text-red-500">{isVi ? 'CN' : 'Sun'}</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayItem) => {
              const dayDeadlines = deadlinesByDate.get(dayItem.ymd) || [];
              const isSelected = selectedDayYMD === dayItem.ymd;
              const isToday = todayYMD === dayItem.ymd;
              const overdueCount = dayDeadlines.filter(d => d.status === 'OVERDUE').length;
              const criticalCount = dayDeadlines.filter(d => d.priority === 'CRITICAL').length;

              return (
                <div
                  key={dayItem.ymd}
                  onClick={() => setSelectedDayYMD(dayItem.ymd)}
                  className={`min-h-[72px] sm:min-h-[85px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                      : isToday
                      ? 'border-amber-300 bg-amber-50/20'
                      : dayItem.isCurrentMonth
                      ? 'border-slate-100 bg-white hover:bg-slate-50/80'
                      : 'border-transparent bg-slate-50/40 opacity-40 hover:opacity-80'
                  }`}
                >
                  {/* Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-amber-500 text-white font-black'
                          : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayItem.date.getDate()}
                    </span>

                    {dayDeadlines.length > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${
                        overdueCount > 0 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {dayDeadlines.length}
                      </span>
                    )}
                  </div>

                  {/* Deadline Pills */}
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {dayDeadlines.slice(0, 2).map((d) => (
                      <div
                        key={d.id}
                        className={`text-[9.5px] px-1 py-0.5 rounded truncate font-medium ${
                          d.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 line-through opacity-70'
                            : d.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-800 font-bold'
                            : d.priority === 'CRITICAL'
                            ? 'bg-amber-100 text-amber-900 font-semibold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                        title={d.title}
                      >
                        {d.title}
                      </div>
                    ))}
                    {dayDeadlines.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-semibold pl-1">
                        +{dayDeadlines.length - 2} {isVi ? 'việc khác' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Drawer */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isVi ? 'Hạn Chót Ngày' : 'Deadlines For'}
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {new Date(selectedDayYMD + 'T00:00:00').toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                })}
              </h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {selectedDayDeadlines.length} {isVi ? 'mục' : 'items'}
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 max-h-[460px]">
            {selectedDayDeadlines.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                {isVi ? 'Không có hạn chót nào trong ngày này' : 'No deadlines scheduled for this day'}
              </div>
            ) : (
              selectedDayDeadlines.map((item) => {
                const timeInfo = calculateTimeRemaining(item.dueAt, item.snoozedUntil);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/70 hover:border-indigo-300 bg-white hover:bg-slate-50/50 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${timeInfo.badgeColorClass}`}>
                            {isVi ? timeInfo.formattedTextVi : timeInfo.formattedTextEn}
                          </span>
                          {item.priority === 'CRITICAL' && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
                              CRITICAL
                            </span>
                          )}
                          {item.entityNumber && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {item.entityNumber}
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {item.title}
                        </h5>
                      </div>
                    </div>

                    {item.actionRequired && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800">{isVi ? 'Hành động:' : 'Action:'} </span>
                        {item.actionRequired}
                      </div>
                    )}

                    {/* Quick Action Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <div className="text-slate-500 truncate max-w-[130px]">
                        {item.assignedToName ? `👤 ${item.assignedToName}` : <span className="text-amber-600 font-medium">⚠️ Chưa phân công</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.entityType === 'SHIPMENT' && item.entityId && onOpenShipment && (
                          <button
                            onClick={() => onOpenShipment(item.entityId)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={isVi ? 'Mở hồ sơ lô hàng' : 'Open shipment'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.entityType === 'QUOTATION' && item.entityId && onOpenQuotation && (
                          <button
                            onClick={() => onOpenQuotation(item.entityId)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={isVi ? 'Mở báo giá' : 'Open quotation'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== 'COMPLETED' && onSnoozeDeadline && (
                          <button
                            onClick={() => onSnoozeDeadline(item)}
                            className="px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
                          >
                            {isVi ? 'Tạm hoãn' : 'Snooze'}
                          </button>
                        )}

                        {item.status !== 'COMPLETED' && onCompleteDeadline && (
                          <button
                            onClick={() => onCompleteDeadline(item.id)}
                            className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                          >
                            {isVi ? 'Xong' : 'Done'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
