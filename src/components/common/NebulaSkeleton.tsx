import React from 'react';

export interface NebulaSkeletonProps {
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'line' | 'rounded' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const NebulaSkeleton: React.FC<NebulaSkeletonProps> = ({
  className = '',
  theme = 'light',
  variant = 'line',
  width,
  height,
}) => {
  const getVariantRadius = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-xl';
      case 'line':
      default:
        return 'rounded-md';
    }
  };

  const shimmerClass = theme === 'dark' 
    ? 'nebula-shimmer-dark border border-slate-800/80' 
    : 'nebula-shimmer-light border border-slate-200/50';

  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      className={`${shimmerClass} ${getVariantRadius()} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const NebulaSkeletonCard: React.FC<{ className?: string; theme?: 'light' | 'dark' }> = ({
  className = '',
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  return (
    <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200/80'} shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <NebulaSkeleton theme={theme} className="h-4 w-28" />
        <NebulaSkeleton theme={theme} variant="circle" className="h-7 w-7" />
      </div>
      <NebulaSkeleton theme={theme} className="h-7 w-36" />
      <div className="space-y-1.5 pt-1">
        <NebulaSkeleton theme={theme} className="h-3 w-full" />
        <NebulaSkeleton theme={theme} className="h-3 w-3/4" />
      </div>
    </div>
  );
};

export const NebulaSkeletonTable: React.FC<{ rows?: number; cols?: number; theme?: 'light' | 'dark' }> = ({
  rows = 5,
  cols = 4,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  return (
    <div className={`w-full rounded-xl border ${isDark ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200/80'} overflow-hidden shadow-xs`}>
      {/* Header */}
      <div className={`p-3 border-b ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'} flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <NebulaSkeleton theme={theme} className="h-4 w-32" />
        </div>
        <NebulaSkeleton theme={theme} className="h-7 w-20 rounded-lg" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`row-${rIdx}`} className="p-3.5 flex items-center space-x-4">
            <NebulaSkeleton theme={theme} variant="circle" className="h-5 w-5 shrink-0" />
            <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <NebulaSkeleton 
                  key={`cell-${rIdx}-${cIdx}`} 
                  theme={theme} 
                  className={`h-3.5 ${cIdx === 0 ? 'w-full' : cIdx === 1 ? 'w-4/5' : 'w-2/3'}`} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
