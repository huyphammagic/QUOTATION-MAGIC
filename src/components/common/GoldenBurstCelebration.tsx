import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Award, Trophy, Sparkles, CheckCircle2, Truck, FileDown, X, ExternalLink, Flame } from 'lucide-react';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';

export interface DealCelebrationData {
  quoteNumber: string;
  customerName?: string;
  totalAmount?: number;
  currency?: string;
  profit?: number;
  marginPercent?: number;
  shipmentId?: string;
}

interface GoldenBurstCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  data: DealCelebrationData | null;
  onOpenShipment?: (shipmentId: string) => void;
  onExportContract?: () => void;
}

interface Particle {
  id: number;
  dx: string;
  dy: string;
  scale: number;
  rot: string;
  duration: string;
  delay: string;
  color: string;
  shape: 'circle' | 'diamond' | 'star';
  size: number;
}

/**
 * Web Audio API synthesize a crystal golden chime celebration chord
 */
function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18 / (index + 1), ctx.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 1.3);
    });
  } catch {
    // Fail silently if browser audio permissions block
  }
}

export const GoldenBurstCelebration: React.FC<GoldenBurstCelebrationProps> = ({
  isOpen,
  onClose,
  data,
  onOpenShipment,
  onExportContract,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const hasPlayedAudio = useRef(false);

  // Generate particle burst coordinates
  useEffect(() => {
    if (isOpen) {
      if (!hasPlayedAudio.current) {
        playCelebrationChime();
        hasPlayedAudio.current = true;
      }

      const colors = ['#f59e0b', '#fbbf24', '#fde047', '#ffffff', '#eab308', '#d97706'];
      const shapes: ('circle' | 'diamond' | 'star')[] = ['circle', 'diamond', 'star'];
      
      const newParticles: Particle[] = Array.from({ length: 48 }, (_, i) => {
        const angle = (i / 48) * 2 * Math.PI + (Math.random() * 0.2 - 0.1);
        const distance = 120 + Math.random() * 260; // 120px to 380px radius
        const dx = `${Math.cos(angle) * distance}px`;
        const dy = `${Math.sin(angle) * distance}px`;
        const scale = 0.6 + Math.random() * 0.8;
        const rot = `${(Math.random() - 0.5) * 720}deg`;
        const duration = `${1.6 + Math.random() * 0.9}s`;
        const delay = `${Math.random() * 0.15}s`;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = shape === 'circle' ? 6 + Math.random() * 6 : 10 + Math.random() * 6;

        return {
          id: i,
          dx,
          dy,
          scale,
          rot,
          duration,
          delay,
          color,
          shape,
          size,
        };
      });

      setParticles(newParticles);
    } else {
      hasPlayedAudio.current = false;
      setParticles([]);
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isVnd = data.currency === 'VND';
  const formattedTotal = data.totalAmount 
    ? (isVnd ? formatVND(data.totalAmount) : formatUSD(data.totalAmount))
    : 'N/A';
  const formattedProfit = data.profit 
    ? (isVnd ? formatVND(data.profit) : formatUSD(data.profit))
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Golden Halo Expanding Ring */}
      <div 
        className="absolute w-72 h-72 rounded-full border-2 border-amber-400 pointer-events-none golden-halo-ring"
        style={{ left: 'calc(50% - 9rem)', top: 'calc(50% - 9rem)' }}
      />

      {/* Floating Shimmering Golden Particles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute golden-particle-node"
            style={{
              '--dx': p.dx,
              '--dy': p.dy,
              '--scale': p.scale,
              '--rot': p.rot,
              '--duration': p.duration,
              animationDelay: p.delay,
              backgroundColor: p.shape === 'circle' ? p.color : 'transparent',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: p.shape === 'circle' ? '9999px' : '2px',
              border: p.shape !== 'circle' ? `2px solid ${p.color}` : 'none',
              transform: p.shape === 'diamond' ? 'rotate(45deg)' : undefined,
              boxShadow: `0 0 10px ${p.color}`,
            } as React.CSSProperties}
          >
            {p.shape === 'star' && (
              <span 
                className="text-amber-300 font-bold leading-none select-none"
                style={{ fontSize: `${p.size}px`, color: p.color }}
              >
                ✦
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Celebratory Modal Card */}
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.35)] text-center text-white trophy-bounce-in overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Sheen Trim Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 gold-gradient-sheen" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Golden Trophy Icon with Radial Sunburst */}
        <div className="relative inline-flex items-center justify-center my-2">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 to-yellow-400/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-2xl shadow-amber-500/50 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 items-center justify-center text-[9px] font-bold text-slate-950">
              ★
            </span>
          </span>
        </div>

        {/* Congratulatory Title */}
        <div className="mt-3 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-bold text-amber-300 uppercase tracking-widest shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>KHOẢNH KHẮC CHIẾN THẮNG • DEAL CLOSED</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white pt-2">
            CHỐT DEAL THÀNH CÔNG! 🏆
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
            Chúc mừng bạn đã xuất sắc chốt thành công báo giá{' '}
            <span className="font-mono font-bold text-amber-400">{data.quoteNumber}</span>
            {data.customerName ? (
              <> cho doanh nghiệp <strong className="text-white">{data.customerName}</strong></>
            ) : null}
            !
          </p>
        </div>

        {/* Metric Overview Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left">
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tổng Giá Trị Đơn
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 tracking-tight mt-0.5 truncate">
              {formattedTotal}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Lợi Nhuận Gộp
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-400 tracking-tight mt-0.5 truncate">
              {formattedProfit || '+ Lãi mục tiêu'}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tỷ Suất Lãi (Margin)
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-sky-400 tracking-tight mt-0.5 truncate">
              {data.marginPercent !== undefined ? formatPercent(data.marginPercent) : '18.5%'}
            </div>
          </div>
        </div>

        {/* Automatic Booking Generated Banner */}
        {data.shipmentId && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs truncate">
                <span className="text-emerald-300 font-semibold">Tự động khởi tạo Lô Hàng: </span>
                <span className="font-mono text-white font-bold">{data.shipmentId}</span>
              </div>
            </div>
            {onOpenShipment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShipment(data.shipmentId!);
                }}
                className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Truck className="w-3 h-3" />
                <span>Xem Ngay</span>
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          {data.shipmentId && onOpenShipment ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShipment(data.shipmentId!);
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl gold-gradient-sheen text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Mở Điều Hành Lô Hàng</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl gold-gradient-sheen text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Tiếp Tục Báo Giá</span>
            </button>
          )}

          {onExportContract && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onExportContract();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Xuất Hợp Đồng</span>
            </button>
          )}
        </div>

        {/* Micro Footer Hint */}
        <p className="mt-4 text-[10px] text-slate-400">
          Nhấn ESC hoặc click bên ngoài để đóng • Dữ liệu đã đồng bộ 100% lên Cloud
        </p>
      </div>
    </div>
  );
};
