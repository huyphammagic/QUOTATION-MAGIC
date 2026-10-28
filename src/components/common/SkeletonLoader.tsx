import { Ship } from 'lucide-react';
import { CosmicOrbitalLoader } from './CosmicOrbitalLoader';

interface SkeletonProps {
  className?: string;
  dark?: boolean;
}

/**
 * Basic Primitive Skeleton Block with Nebula Aurora Shimmer Sweep
 */
export const SkeletonBlock: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', dark = false }) => {
  return (
    <div 
      className={`rounded-md ${dark ? 'nebula-shimmer-dark' : 'nebula-shimmer-light'} ${className}`} 
      aria-hidden="true" 
    />
  );
};

/**
 * Enterprise Table Skeleton Loader with authentic columnar rhythm
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number; dark?: boolean }> = ({ 
  rows = 6, 
  columns = 5,
  dark = false 
}) => {
  return (
    <div className={`w-full rounded-xl border overflow-hidden ${dark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
      {/* Table Header Placeholder */}
      <div className={`px-4 py-3 border-b flex items-center gap-4 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock 
            key={`th-${i}`} 
            dark={dark} 
            className={`h-3.5 ${i === 0 ? 'w-28' : i === 1 ? 'w-40' : 'flex-1 max-w-[120px]'}`} 
          />
        ))}
      </div>

      {/* Table Rows Placeholder */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="px-4 py-3.5 flex items-center gap-4 animate-in fade-in duration-150">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <SkeletonBlock 
                key={`td-${rIdx}-${cIdx}`} 
                dark={dark} 
                className={`h-3 ${
                  cIdx === 0 
                    ? 'w-24' 
                    : cIdx === 1 
                    ? 'w-36' 
                    : cIdx % 2 === 0 
                    ? 'w-20' 
                    : 'flex-1 max-w-[100px]'
                }`} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Metric & KPI Card Grid Skeleton
 */
export const CardGridSkeleton: React.FC<{ cards?: number; dark?: boolean }> = ({ cards = 4, dark = false }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {Array.from({ length: cards }).map((_, idx) => (
        <div 
          key={`kpi-${idx}`} 
          className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${
            dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock dark={dark} className="h-3 w-24" />
            <SkeletonBlock dark={dark} className="h-6 w-6 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock dark={dark} className="h-6 w-28" />
            <SkeletonBlock dark={dark} className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * High Perceived Performance Modal Skeleton
 * Replaces generic blocking spinners with a structured wireframe preview
 */
export const ModalSkeleton: React.FC<{ title?: string }> = ({ title = 'Đang tải phân hệ dữ liệu...' }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="status"
      aria-label={title}
    >
      <div className="w-full max-w-5xl h-[85vh] max-h-[820px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Top 2.5px Indeterminate Momentum Sweep Progress Bar */}
        <div className="h-[2.5px] w-full loading-bar-sweep shrink-0 z-30" />

        {/* Modal Header Skeleton */}
        <div className="px-5 py-4 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-850 border border-slate-700/60 flex items-center justify-center shrink-0">
              <CosmicOrbitalLoader size="xs" variant="cyan-violet" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <SkeletonBlock dark className="h-4 w-36" />
                <SkeletonBlock dark className="h-3.5 w-16" />
              </div>
              <SkeletonBlock dark className="h-2.5 w-52" />
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <SkeletonBlock dark className="h-8 w-24 rounded-lg hidden sm:block" />
            <SkeletonBlock dark className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Sub-Header & Action Filter Strip */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <SkeletonBlock dark className="h-8 w-full rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock dark className="h-7 w-20 rounded-lg" />
            <SkeletonBlock dark className="h-7 w-24 rounded-lg" />
            <SkeletonBlock dark className="h-7 w-16 rounded-lg" />
          </div>
        </div>

        {/* Main Body Skeleton */}
        <div className="flex-1 p-5 space-y-4 overflow-hidden flex flex-col">
          {/* Top Quick Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`m-kpi-${i}`} className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-2">
                <SkeletonBlock dark className="h-2.5 w-20" />
                <SkeletonBlock dark className="h-5 w-28" />
              </div>
            ))}
          </div>

          {/* Table / Grid Wireframe */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/70">
              <div className="flex items-center gap-4 flex-1">
                <SkeletonBlock dark className="h-3 w-32" />
                <SkeletonBlock dark className="h-3 w-24" />
                <SkeletonBlock dark className="h-3 w-40 hidden sm:block" />
              </div>
              <SkeletonBlock dark className="h-3 w-20" />
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, rowIdx) => (
                <div key={`m-row-${rowIdx}`} className="flex items-center gap-4 py-2 border-b border-slate-800/40">
                  <SkeletonBlock dark className="h-3 w-6 rounded-md" />
                  <SkeletonBlock dark className="h-3.5 w-48" />
                  <SkeletonBlock dark className="h-3 w-28 hidden sm:block" />
                  <SkeletonBlock dark className="h-3 w-36 flex-1" />
                  <SkeletonBlock dark className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Skeleton */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <SkeletonBlock dark className="h-3 w-48" />
          <div className="flex items-center gap-2">
            <SkeletonBlock dark className="h-8 w-20 rounded-lg" />
            <SkeletonBlock dark className="h-8 w-24 rounded-lg" />
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * Customer Public Secure Portal Skeleton
 */
export const PortalSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Sweep Progress */}
      <div className="h-[2.5px] w-full loading-bar-sweep shrink-0" />

      {/* Top Header */}
      <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBlock dark className="h-8 w-8 rounded-lg" />
          <SkeletonBlock dark className="h-4 w-36" />
        </div>
        <SkeletonBlock dark className="h-8 w-28 rounded-lg" />
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        <div className="space-y-2">
          <SkeletonBlock dark className="h-7 w-64" />
          <SkeletonBlock dark className="h-4 w-96 max-w-full" />
        </div>

        {/* Card Placeholder */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-2">
              <SkeletonBlock dark className="h-3 w-24" />
              <SkeletonBlock dark className="h-5 w-48" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock dark className="h-3 w-24" />
              <SkeletonBlock dark className="h-5 w-48" />
            </div>
          </div>

          <div className="space-y-3">
            <SkeletonBlock dark className="h-4 w-40" />
            <TableSkeleton rows={4} columns={4} dark />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <SkeletonBlock dark className="h-10 w-44 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
