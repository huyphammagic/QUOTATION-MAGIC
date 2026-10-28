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
          outerBorder: 'border-emerald-400/40 border-t-emerald-300',
          innerBorder: 'border-cyan-400/40 border-b-cyan-300',
          coreBg: 'bg-emerald-400',
          particle1: 'bg-emerald-300 shadow-emerald-400/80',
          particle2: 'bg-cyan-300 shadow-cyan-400/80',
          glowColor: 'rgba(52, 211, 153, 0.5)',
        };
      case 'amber-rose':
        return {
          outerBorder: 'border-amber-400/40 border-t-amber-300',
          innerBorder: 'border-rose-400/40 border-b-rose-300',
          coreBg: 'bg-amber-400',
          particle1: 'bg-amber-300 shadow-amber-400/80',
          particle2: 'bg-rose-300 shadow-rose-400/80',
          glowColor: 'rgba(251, 191, 36, 0.5)',
        };
      case 'cyan-violet':
      default:
        return {
          outerBorder: 'border-cyan-400/40 border-t-cyan-300',
          innerBorder: 'border-indigo-400/40 border-b-violet-400',
          coreBg: 'bg-cyan-300',
          particle1: 'bg-cyan-200 shadow-cyan-400/90',
          particle2: 'bg-violet-300 shadow-violet-400/90',
          glowColor: 'rgba(56, 189, 248, 0.6)',
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl bg-[#090E17]/90 border border-slate-700/60 shadow-2xl flex flex-col items-center max-w-sm text-center">
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
