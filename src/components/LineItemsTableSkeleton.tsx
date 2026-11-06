import React from 'react';
import { ChargeLocation } from '../types/logistics';
import { RefreshCw, Sparkles, CheckCircle2, Zap } from 'lucide-react';

interface LineItemsTableSkeletonRowsProps {
  rowsCount?: number;
  showCostAndProfit?: boolean;
  viewMode?: 'flat' | 'grouped';
  activeLegFilter?: ChargeLocation | 'ALL';
}

/**
 * High-Fidelity Skeleton Rows with Shimmer Wave for LineItemsTable
 * Accurately mirrors the 8-column layout geometry of the logistics quotation table
 */
export const LineItemsTableSkeletonRows: React.FC<LineItemsTableSkeletonRowsProps> = ({
  rowsCount = 5,
  showCostAndProfit = true,
  viewMode = 'flat',
  activeLegFilter = 'ALL',
}) => {
  // Realistic title widths to avoid mechanical repetition
  const titleWidths = ['w-3/5', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2', 'w-5/6'];

  const renderSkeletonRow = (idx: number, legTag: string = 'POL') => {
    const titleWidth = titleWidths[idx % titleWidths.length];

    return (
      <tr 
        key={`skel-row-${idx}`} 
        className="border-b border-slate-100 bg-white/70 hover:bg-slate-50/50 transition-colors animate-in fade-in duration-200"
      >
        {/* Col 1: STT & Grip */}
        <td className="py-3 px-1 text-center align-middle w-16">
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-3 h-4 rounded bg-slate-200/70 skeleton-shimmer" />
            <div className="w-4 h-4 rounded-full bg-slate-200/80 skeleton-shimmer" />
          </div>
        </td>

        {/* Col 2: Diễn Giải / Tên Phí */}
        <td className="py-3 px-3 align-top min-w-[280px]">
          <div className="space-y-2">
            <div className={`h-4 ${titleWidth} max-w-[340px] rounded bg-slate-200/80 skeleton-shimmer`} />
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 rounded bg-slate-200/60 skeleton-shimmer" />
              <div className="h-3 w-28 rounded bg-slate-100 skeleton-shimmer hidden sm:block" />
            </div>
          </div>
        </td>

        {/* Col 3: Chặng & Tính (Basis) */}
        <td className="py-3 px-2.5 align-middle w-[145px]">
          <div className="space-y-1.5">
            <div className="h-4 w-20 rounded bg-slate-200/70 skeleton-shimmer" />
            <div className="h-3 w-14 rounded bg-slate-100 skeleton-shimmer" />
          </div>
        </td>

        {/* Col 4: SL & ĐVT */}
        <td className="py-3 px-2.5 align-middle w-[110px] text-right">
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-4 w-12 rounded bg-slate-200/80 skeleton-shimmer" />
            <div className="h-3 w-10 rounded bg-slate-100 skeleton-shimmer" />
          </div>
        </td>

        {/* Col 5: Giá Bán & VAT */}
        <td className="py-3 px-2.5 align-middle w-[170px] text-right bg-blue-50/25">
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-4 w-20 rounded bg-blue-200/60 nebula-shimmer-light" />
            <div className="h-3 w-12 rounded bg-blue-100/70 nebula-shimmer-light" />
          </div>
        </td>

        {/* Col 6: Giá Vốn & Lãi Margin (Optional) */}
        {showCostAndProfit && (
          <td className="py-3 px-2.5 align-middle w-[155px] text-right bg-amber-50/25 border-l border-r border-amber-100/70">
            <div className="space-y-1.5 flex flex-col items-end">
              <div className="h-4 w-18 rounded bg-amber-200/60 skeleton-shimmer" />
              <div className="h-3 w-14 rounded bg-emerald-100 skeleton-shimmer" />
            </div>
          </td>
        )}

        {/* Col 7: Thành Tiền ($ / ₫) */}
        <td className="py-3 px-3 align-middle w-[155px] text-right">
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-4.5 w-24 rounded bg-slate-300/80 nebula-shimmer-light" />
            <div className="h-3 w-28 rounded bg-slate-200/60 nebula-shimmer-light" />
          </div>
        </td>

        {/* Col 8: Thao Tác */}
        <td className="py-3 px-2 align-middle text-center w-20">
          <div className="flex items-center justify-center gap-1">
            <div className="w-6 h-6 rounded bg-slate-200/60 skeleton-shimmer" />
            <div className="w-6 h-6 rounded bg-slate-200/60 skeleton-shimmer" />
          </div>
        </td>
      </tr>
    );
  };

  if (viewMode === 'grouped') {
    const legs: { loc: ChargeLocation; title: string; bg: string; count: number }[] = [
      { loc: 'POL', title: '1. ĐẦU XUẤT (POL - Port of Loading)', bg: 'bg-slate-100/90 text-slate-800', count: 2 },
      { loc: 'FREIGHT', title: '2. CƯỚC CHẶNG CHÍNH (FREIGHT - Ocean / Air / Trucking)', bg: 'bg-blue-100/70 text-blue-900', count: 2 },
      { loc: 'POD', title: '3. ĐẦU NHẬP (POD - Port of Discharge)', bg: 'bg-purple-100/70 text-purple-900', count: 1 },
      { loc: 'OTHER', title: '4. DỊCH VỤ KHÁC (OTHER - Thủ Tục, Giám Định, Kho)', bg: 'bg-amber-100/70 text-amber-900', count: 1 },
    ];

    return (
      <>
        {legs.map((leg) => {
          if (activeLegFilter !== 'ALL' && activeLegFilter !== leg.loc) return null;

          return (
            <React.Fragment key={`skel-group-${leg.loc}`}>
              {/* Group Header Skeleton */}
              <tr className={`${leg.bg} font-bold border-y border-slate-200`}>
                <td colSpan={showCostAndProfit ? 4 : 3} className="py-2.5 px-3 uppercase tracking-wide text-[11px]">
                  <div className="flex items-center gap-2">
                    <span>{leg.title}</span>
                    <div className="h-3.5 w-12 rounded bg-white/60 skeleton-shimmer inline-block" />
                  </div>
                </td>
                <td className="py-2.5 px-2.5 text-right">
                  <div className="h-5 w-28 rounded bg-white/70 skeleton-shimmer ml-auto" />
                </td>
                <td colSpan={showCostAndProfit ? 2 : 1} className="py-2.5 px-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="h-4 w-20 rounded bg-white/80 skeleton-shimmer" />
                    <div className="h-3 w-24 rounded bg-white/60 skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center" />
              </tr>

              {/* Group Rows Skeletons */}
              {Array.from({ length: leg.count }).map((_, rIdx) => 
                renderSkeletonRow(rIdx, leg.loc)
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  }

  // Flat view: render uniform realistic rows
  const safeRowCount = Math.max(3, rowsCount);
  return (
    <>
      {Array.from({ length: safeRowCount }).map((_, idx) => 
        renderSkeletonRow(idx)
      )}
    </>
  );
};

interface LineItemsTableShimmerBannerProps {
  message?: string;
  progressPercent?: number;
  onCancel?: () => void;
}

/**
 * Non-blocking Shimmer Progress Banner
 * Informs the user of ongoing recalculation/reload while keeping the dashboard interactive
 */
export const LineItemsTableShimmerBanner: React.FC<LineItemsTableShimmerBannerProps> = ({
  message = 'Đang tái tính toán biểu cước & đối soát phụ phí...',
  progressPercent,
  onCancel,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50 border-b border-blue-200/80 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
      {/* Top micro progress sweep */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-100 overflow-hidden">
        {progressPercent !== undefined ? (
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
          />
        ) : (
          <div className="loading-bar-sweep h-full w-full" />
        )}
      </div>

      {/* Left: Indicator & Message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-800 truncate">{message}</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300/60 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Non-blocking
          </span>
        </div>
      </div>

      {/* Right: Progress % or quick dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        {progressPercent !== undefined && (
          <span className="text-[11px] font-mono font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
            {Math.round(progressPercent)}%
          </span>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-white/80 transition-colors cursor-pointer"
            title="Đóng thông báo hoặc hoàn tất ngay"
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
};
