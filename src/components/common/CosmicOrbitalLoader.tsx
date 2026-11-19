import React from 'react';

export interface CosmicOrbitalLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fullscreen';
  label?: string;
  sublabel?: string;
  className?: string;
  variant?: 'cyan-violet' | 'emerald-cyan' | 'amber-rose';
}

export const CosmicOrbitalLoader: React.FC<CosmicOrbitalLoaderProps> = ({
  size = 'md',
  label,
  sublabel,
  className = '',
  variant = 'cyan-violet',
}) => {
  const getDimension = () => {
    switch (size) {
      case 'xs':
        return { container: 'w-4 h-4', outer: 'w-4 h-4', inner: 'w-2.5 h-2.5', core: 'w-1 h-1' };
      case 'sm':
        return { container: 'w-6 h-6', outer: 'w-6 h-6', inner: 'w-4 h-4', core: 'w-1.5 h-1.5' };
      case 'lg':
      case 'fullscreen':
        return { container: 'w-16 h-16', outer: 'w-16 h-16', inner: 'w-11 h-11', core: 'w-3.5 h-3.5' };
      case 'md':
      default:
        return { container: 'w-10 h-10', outer: 'w-10 h-10', inner: 'w-7 h-7', core: 'w-2.5 h-2.5' };
    }
  };

  const dim = getDimension();

  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald-cyan':
        return {
          outerBorder: 'border-emerald-500/35 border-t-emerald-500',
          innerBorder: 'border-teal-500/35 border-b-teal-500',
          coreBg: 'bg-emerald-500',
          particle1: 'bg-emerald-400',
          particle2: 'bg-teal-400',
          glowColor: 'rgba(13, 148, 136, 0.4)',
        };
      case 'amber-rose':
        return {
          outerBorder: 'border-amber-500/35 border-t-amber-500',
          innerBorder: 'border-rose-500/35 border-b-rose-500',
          coreBg: 'bg-amber-500',
          particle1: 'bg-amber-400',
          particle2: 'bg-rose-400',
          glowColor: 'rgba(217, 119, 6, 0.4)',
        };
      case 'cyan-violet':
      default:
        return {
          outerBorder: 'border-blue-500/35 border-t-blue-600',
          innerBorder: 'border-teal-500/35 border-b-teal-500',
          coreBg: 'bg-blue-500',
          particle1: 'bg-blue-400',
          particle2: 'bg-teal-400',
          glowColor: 'rgba(37, 99, 235, 0.45)',
        };
    }
  };

  const v = getVariantStyles();

  const spinnerContent = (
    <div className={`relative flex items-center justify-center shrink-0 ${dim.container} ${className}`}>
      {/* Outer Gyroscope Elliptical Orbit (Clockwise) */}
      <div 
        className={`absolute inset-0 rounded-full border-1.5 ${v.outerBorder}`}
        style={{ animation: 'cosmicOrbitCw 2.4s linear infinite' }}
      >
        <span 
          className={`absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-xs ${v.particle1}`}
        />
      </div>

      {/* Inner Gyroscope Counter-Orbit (Counter-Clockwise) */}
      <div 
        className={`absolute rounded-full border-1.5 ${dim.inner} ${v.innerBorder}`}
        style={{ animation: 'cosmicOrbitCcw 1.8s linear infinite' }}
      >
        <span 
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full shadow-xs ${v.particle2}`}
        />
      </div>

      {/* Pulsing Celestial Core */}
      <div 
        className={`rounded-full ${dim.core} ${v.coreBg}`}
        style={{ animation: 'cosmicCorePulse 1.6s ease-in-out infinite' }}
      />
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1324]/75 backdrop-blur-md animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl bg-[#111C33] border border-white/10 shadow-2xl flex flex-col items-center max-w-sm text-center">
          {spinnerContent}
          {label && (
            <h4 className="mt-5 text-sm font-bold tracking-tight text-white flex items-center gap-2">
              {label}
            </h4>
          )}
          {sublabel && (
            <p className="mt-1 text-xs text-slate-400 font-normal">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (label || sublabel) {
    return (
      <div className="flex items-center space-x-3">
        {spinnerContent}
        <div className="min-w-0">
          {label && <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{label}</div>}
          {sublabel && <div className="text-[10px] text-slate-500 truncate">{sublabel}</div>}
        </div>
      </div>
    );
  }

  return spinnerContent;
};
