import React, { useState, useMemo } from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { getGoldenHourLeads } from '../services/goldenHour/goldenHourService';
import { 
  FileCheck, 
  TrendingUp, 
  Anchor, 
  Plane, 
  Truck, 
  LayoutDashboard, 
  ChevronDown, 
  ChevronUp,
  Flame,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface DashboardStatsProps {
  quotes: QuoteData[];
  onOpenAnalytics?: () => void;
  onOpenGoldenHourRadar?: () => void;
  onSelectQuote?: (quoteId: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  quotes, 
  onOpenAnalytics,
  onOpenGoldenHourRadar,
  onSelectQuote
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoized Core Metrics (Zero-Lag Performance)
  const stats = useMemo(() => {
    const totalCount = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
    const pendingQuotes = quotes.filter(q => q.status === 'SENT' || q.status === 'VIEWED' || q.status === 'PENDING_APPROVAL');
    
    const totalPipelineUsd = quotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
    const totalPipelineVnd = quotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);
    
    const wonUsd = acceptedQuotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
    const wonVnd = acceptedQuotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);
    
    const winRatePercent = totalCount > 0 ? Math.round((acceptedQuotes.length / totalCount) * 100) : 0;
    
    const seaQuotes = quotes.filter(q => q.shipment?.mode?.startsWith('SEA')).length;
    const airQuotes = quotes.filter(q => q.shipment?.mode === 'AIR_FREIGHT').length;
    const truckingQuotes = quotes.filter(q => q.shipment?.mode === 'INLAND_TRUCKING' || q.shipment?.mode === 'CUSTOMS_CLEARANCE').length;

    // Golden Hour Telemetry Leads
    const allGoldenLeads = getGoldenHourLeads();
    const activeGoldenLeads = allGoldenLeads.filter(l => l.goldenWindowRemainingMinutes > 0 || l.isCurrentlyOnline);

    // Target Monthly Quota (Default $120,000 USD)
    const targetQuotaUsd = 120000;
    const quotaAchievementPercent = Math.min(Math.round((wonUsd / targetQuotaUsd) * 100), 150);
    const weightedForecastUsd = Math.round(wonUsd + (pendingQuotes.reduce((s, q) => s + (q.grandTotalUsd || 0), 0) * 0.35));

    // Expiring Quotes (within next 48h)
    const now = Date.now();
    const expiringQuotes = quotes.filter(q => {
      if (!q.terms?.validityDate || q.status === 'ACCEPTED' || q.status === 'REJECTED') return false;
      const validUntil = new Date(q.terms.validityDate).getTime();
      const diffHours = (validUntil - now) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 48;
    });

    return {
      totalCount,
      acceptedQuotes,
      pendingQuotes,
      totalPipelineUsd,
      totalPipelineVnd,
      wonUsd,
      wonVnd,
      winRatePercent,
      seaQuotes,
      airQuotes,
      truckingQuotes,
      activeGoldenLeads,
      targetQuotaUsd,
      quotaAchievementPercent,
      weightedForecastUsd,
      expiringQuotes
    };
  }, [quotes]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
      {/* Sleek Executive KPI Strip */}
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Key Metrics in Unboxed Quiet Typography */}
        <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1.5 text-slate-600 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Hệ thống:</span>
            <strong className="text-slate-900 font-bold font-mono tabular-nums">{stats.totalCount} báo giá</strong>
            <span className="text-emerald-700 font-mono text-[11px] font-semibold">({stats.acceptedQuotes.length} chốt)</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Pipeline:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatUSD(stats.totalPipelineUsd)}
            </span>
            <span className="text-slate-400 font-mono text-[11px] hidden xl:inline">
              (~ {formatVND(stats.totalPipelineVnd)})
            </span>
          </div>

          <span className="text-slate-300 hidden md:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Win-Rate:</span>
            <span className="font-mono font-bold text-emerald-700 tabular-nums">
              {stats.winRatePercent}%
            </span>
          </div>

          <span className="text-slate-300 hidden lg:inline">·</span>

          <div className="hidden lg:flex items-center gap-2.5 text-slate-500">
            <span className="flex items-center gap-1 text-[11px]" title="Đường biển">
              <Anchor className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{stats.seaQuotes}</span> biển
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-[11px]" title="Đường bay">
              <Plane className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{stats.airQuotes}</span> air
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-[11px]" title="Đường bộ & hải quan">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{stats.truckingQuotes}</span> bộ
            </span>
          </div>

          {/* Golden Hour Interactive Pill */}
          {stats.activeGoldenLeads.length > 0 && onOpenGoldenHourRadar && (
            <>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <button
                type="button"
                onClick={onOpenGoldenHourRadar}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs group"
                title="Khách hàng đang xem báo giá - Bấm để mở Radar & Kịch bản chốt"
              >
                <Flame className="w-3 h-3 text-rose-600 fill-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                <span>{stats.activeGoldenLeads.length} Khách Giờ Vàng</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              </button>
            </>
          )}
        </div>

        {/* Right: Analytics & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              title="Mở nhanh Dashboard BI (Phím tắt: Ctrl + D)"
              className="press-physics-subtle inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Báo Cáo & BI Dashboard</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded">
                Ctrl+D
              </kbd>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="press-physics-subtle p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80"
            title={isExpanded ? "Thu gọn chi tiết thống kê" : "Mở rộng 4 thẻ KPI Bento Mini-HUD"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>

      {/* Expanded Modern Bento Mini-HUD (4 Intelligent Cards) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-150">
          
          {/* Card 1: Khung Giờ Vàng & Hot Leads */}
          <div 
            onClick={onOpenGoldenHourRadar}
            className="press-physics-subtle p-3.5 rounded-xl bg-gradient-to-br from-rose-50/60 via-white to-white border border-rose-200/80 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-rose-800">
                  <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
                  Radar Giờ Vàng (Hot Leads)
                </span>
                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">
                  {stats.activeGoldenLeads.length} online
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {stats.activeGoldenLeads[0]?.customerName ? (
                    <span className="truncate block text-sm" title={stats.activeGoldenLeads[0].customerName}>
                      {stats.activeGoldenLeads[0].customerName}
                    </span>
                  ) : (
                    <span>Chờ tương tác mới</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {stats.activeGoldenLeads[0] 
                      ? `Còn ${stats.activeGoldenLeads[0].goldenWindowRemainingMinutes}p giờ vàng · ${stats.activeGoldenLeads[0].carrier}`
                      : 'Radar tự động phát chuông khi khách mở file'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-rose-700 font-bold">
              <span>Mở Radar & Kịch Bản Chốt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Tỷ Lệ Chốt Thắng & Tốc Độ */}
          <div 
            onClick={onOpenAnalytics}
            className="press-physics-subtle p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/60 via-white to-white border border-emerald-200/80 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-800">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Tỷ Lệ Thắng (Win-Rate)
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  {stats.winRatePercent >= 35 ? 'Mục tiêu đạt' : 'Cần tăng tốc'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {stats.winRatePercent}%
                </span>
                <span className="text-xs text-emerald-700 font-mono font-semibold">
                  {stats.acceptedQuotes.length} / {stats.totalCount} chốt
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Doanh số đã chốt: <strong className="text-slate-800 font-mono">${Math.round(stats.wonUsd).toLocaleString()}</strong>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700 font-bold">
              <span>Xem Báo Cáo Chuyển Đổi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Tiến Độ Chỉ Tiêu & Pipeline Dự Phóng */}
          <div 
            onClick={onOpenAnalytics}
            className="press-physics-subtle p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/60 via-white to-white border border-indigo-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-800">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  Tiến Độ Doanh Số Tháng
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                  {stats.quotaAchievementPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-mono font-bold text-slate-900 text-base">
                    ${Math.round(stats.wonUsd).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Mục tiêu: ${Math.round(stats.targetQuotaUsd).toLocaleString()}
                  </span>
                </div>
                {/* Progress track */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${stats.quotaAchievementPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Dự phóng (Weighted): <strong className="text-slate-800 font-mono">${Math.round(stats.weightedForecastUsd).toLocaleString()}</strong>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-bold">
              <span>Mô Phỏng Kịch Bản (What-If)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Cơ Cấu Tuyến & Cảnh Báo Khẩn Cấp */}
          <div 
            onClick={onOpenAnalytics}
            className="press-physics-subtle p-3.5 rounded-xl bg-gradient-to-br from-amber-50/60 via-white to-white border border-amber-200/80 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Cảnh Báo Hết Hạn & Phương Thức
                </span>
                {stats.expiringQuotes.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded animate-pulse">
                    {stats.expiringQuotes.length} cần gia hạn
                  </span>
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                  <span>{stats.seaQuotes} Biển</span>
                  <span className="text-slate-300">·</span>
                  <span>{stats.airQuotes} Bay</span>
                  <span className="text-slate-300">·</span>
                  <span>{stats.truckingQuotes} Bộ</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {stats.expiringQuotes.length > 0 
                    ? `Có ${stats.expiringQuotes.length} báo giá hết hiệu lực trong 48h tới`
                    : 'Không có báo giá nào gặp rủi ro quá hạn'}
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800 font-bold">
              <span>Kiểm Tra Toàn Bộ Tuyến Hàng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
