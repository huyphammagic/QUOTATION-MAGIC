import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Layers, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sliders, 
  Rotate3d, 
  Maximize2, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Plane,
  Truck,
  Anchor
} from 'lucide-react';
import { computeSimulationMetrics, CargoSimulationMetrics, getEquipmentSpec } from './equipmentSpecs';

interface ContainerCargoSimulatorProps {
  containerType: string;
  quantity?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  commodity?: string;
  onSelectAlternativeType?: (newType: string) => void;
  className?: string;
  isCompact?: boolean;
}

export type ViewPerspective = 'ISOMETRIC' | 'SIDE_CUTAWAY' | 'TOP_DOWN';
export type CargoPackagingType = 'CARTONS' | 'PALLETS' | 'WOOD_CRATES' | 'DRUMS';

export const ContainerCargoSimulator: React.FC<ContainerCargoSimulatorProps> = ({
  containerType,
  quantity = 1,
  grossWeightKg = 0,
  volumeCbm = 0,
  commodity = '',
  onSelectAlternativeType,
  className = '',
  isCompact = false
}) => {
  const [viewPerspective, setViewPerspective] = useState<ViewPerspective>('ISOMETRIC');
  const [isDoorOpen, setIsDoorOpen] = useState<boolean>(true);
  const [brokenStowage, setBrokenStowage] = useState<number>(0.10); // 10%
  const [packagingType, setPackagingType] = useState<CargoPackagingType>('CARTONS');

  // Compute live engineering logistics metrics
  const metrics = useMemo<CargoSimulationMetrics>(() => {
    return computeSimulationMetrics(containerType, quantity, grossWeightKg, volumeCbm, brokenStowage);
  }, [containerType, quantity, grossWeightKg, volumeCbm, brokenStowage]);

  // Generate cargo box grid layout based on fill percentage
  const cargoBlocks = useMemo(() => {
    const fillRatio = Math.min(1.15, metrics.volumeUtilizationPercent / 100);
    const totalSlots = 24;
    const filledSlots = Math.min(totalSlots, Math.max(fillRatio > 0 ? 1 : 0, Math.round(fillRatio * totalSlots)));
    
    const blocks: { id: number; col: number; row: number; layer: number; color: string }[] = [];
    let count = 0;
    
    // 3 columns x 4 rows x 2 layers
    for (let layer = 0; layer < 2; layer++) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          if (count < filledSlots) {
            let color = '#d97706'; // warm amber carton
            if (packagingType === 'PALLETS') color = '#0284c7'; // cyan/blue pallet wrap
            if (packagingType === 'WOOD_CRATES') color = '#b45309'; // wood brown
            if (packagingType === 'DRUMS') color = '#475569'; // steel drum slate

            blocks.push({ id: count, col, row, layer, color });
            count++;
          }
        }
      }
    }
    return blocks;
  }, [metrics.volumeUtilizationPercent, packagingType]);

  const weightGaugeColor = useMemo(() => {
    if (metrics.isWeightOverloaded) return 'text-rose-500 stroke-rose-500';
    if (metrics.weightUtilizationPercent > 90) return 'text-amber-500 stroke-amber-500';
    if (metrics.weightUtilizationPercent > 70) return 'text-cyan-500 stroke-cyan-500';
    return 'text-emerald-500 stroke-emerald-500';
  }, [metrics.isWeightOverloaded, metrics.weightUtilizationPercent]);

  const volumeGaugeColor = useMemo(() => {
    if (metrics.isVolumeOverfilled) return 'text-rose-500 stroke-rose-500';
    if (metrics.volumeUtilizationPercent > 92) return 'text-amber-500 stroke-amber-500';
    if (metrics.volumeUtilizationPercent > 70) return 'text-cyan-500 stroke-cyan-500';
    return 'text-emerald-500 stroke-emerald-500';
  }, [metrics.isVolumeOverfilled, metrics.volumeUtilizationPercent]);

  const categoryIcon = useMemo(() => {
    if (metrics.spec.category === 'AIR') return <Plane className="w-4 h-4 text-sky-400" />;
    if (metrics.spec.category === 'TRUCKING') return <Truck className="w-4 h-4 text-emerald-400" />;
    return <Anchor className="w-4 h-4 text-cyan-400" />;
  }, [metrics.spec.category]);

  return (
    <div className={`bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      
      {/* Top Telemetry Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
            {categoryIcon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Mô Phỏng Tải Trọng 3D
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                {metrics.spec.id}
              </span>
              {metrics.isWeightOverloaded && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-700 text-rose-300 animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                  QUÁ TẢI TRỌNG
                </span>
              )}
              {metrics.isVolumeOverfilled && !metrics.isWeightOverloaded && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-700 text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  VƯỢT THỂ TÍCH
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {metrics.spec.name} {commodity ? `• Hàng: ${commodity}` : ''}
            </p>
          </div>
        </div>

        {/* View Perspective & Door Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="p-0.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewPerspective('ISOMETRIC')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                viewPerspective === 'ISOMETRIC'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Phối cảnh 3D Isometric"
            >
              Phối Cảnh 3D
            </button>
            <button
              type="button"
              onClick={() => setViewPerspective('SIDE_CUTAWAY')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                viewPerspective === 'SIDE_CUTAWAY'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mặt cắt bên hông"
            >
              Mặt Cắt Bên
            </button>
            <button
              type="button"
              onClick={() => setViewPerspective('TOP_DOWN')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                viewPerspective === 'TOP_DOWN'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mặt bằng từ trên xuống"
            >
              Mặt Bằng Sàn
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDoorOpen(!isDoorOpen)}
            className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
              isDoorOpen 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
            }`}
            title="Mở hoặc đóng cửa container"
          >
            {isDoorOpen ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
            <span>{isDoorOpen ? 'Mở cửa' : 'Đóng cửa'}</span>
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport (Canvas / SVG Engine) */}
      <div className="relative p-4 sm:p-6 bg-radial from-slate-900 via-slate-950 to-black overflow-hidden flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
        {/* Subtle Engineering Grid Background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Ambient lighting halo behind container */}
        <div className={`absolute w-72 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
          metrics.isWeightOverloaded ? 'bg-rose-600' : 'bg-cyan-500'
        }`} />

        {/* 3D Container SVG Model */}
        <div className="relative z-10 w-full max-w-xl flex items-center justify-center">
          {viewPerspective === 'ISOMETRIC' && (
            <svg 
              viewBox="0 0 600 320" 
              className="w-full h-auto drop-shadow-2xl select-none"
              style={{ maxHeight: isCompact ? '200px' : '260px' }}
            >
              <defs>
                {/* Metallic container gradients */}
                <linearGradient id="contRoofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="contSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="60%" stopColor="#0369a1" />
                  <stop offset="100%" stopColor="#075985" />
                </linearGradient>
                <linearGradient id="contFloorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#090d16" />
                </linearGradient>
                <linearGradient id="cargoGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
                </linearGradient>
                {/* Warning Hazard Pattern */}
                <pattern id="hazardStripe" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="10" height="20" fill="#f43f5e" />
                  <rect x="10" width="10" height="20" fill="#1e1b4b" />
                </pattern>
              </defs>

              {/* Shadow underneath */}
              <ellipse cx="300" cy="285" rx="220" ry="22" fill="#000000" opacity="0.6" filter="blur(8px)" />

              {/* Container Isometric Frame:
                  Origin (Front-Left): (120, 240)
                  Front-Right: (460, 240)
                  Rear-Left: (180, 110)
                  Rear-Right: (520, 110)
                  Height: 120px
              */}

              {/* Floor Plank Base */}
              <polygon 
                points="130,225 450,225 510,125 190,125" 
                fill="url(#contFloorGrad)" 
                stroke="#334155" 
                strokeWidth="1.5" 
              />
              {/* Floor Guideline Grids */}
              <line x1="236" y1="225" x2="296" y2="125" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
              <line x1="343" y1="225" x2="403" y2="125" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

              {/* Rear Wall (Interior) */}
              <polygon 
                points="190,125 510,125 510,35 190,35" 
                fill="#090d16" 
                stroke="#1e293b" 
                strokeWidth="1.5" 
              />
              {/* Corrugated Vertical Ribs on Rear Wall */}
              {[230, 270, 310, 350, 390, 430, 470].map((rx) => (
                <line key={rx} x1={rx} y1="35" x2={rx} y2="125" stroke="#1e293b" strokeWidth="2" opacity="0.7" />
              ))}

              {/* Left Far End Wall (Cutaway or Solid) */}
              <polygon 
                points="130,225 190,125 190,35 130,135" 
                fill="#0f172a" 
                stroke="#334155" 
                strokeWidth="1.5" 
                opacity={isDoorOpen ? 0.35 : 0.85}
              />

              {/* Cargo Block Simulation (Stacks inside container) */}
              {cargoBlocks.map((block) => {
                // Coordinate projection in isometric space
                // col: 0..2 (lateral), row: 0..3 (longitudinal), layer: 0..1 (vertical)
                const baseX = 160 + block.col * 85 + block.row * 16;
                const baseY = 205 - block.row * 24 - block.layer * 38;
                const w = 44;
                const h = 32;

                return (
                  <g key={block.id} className="transition-all duration-300">
                    {/* Cargo Box Front Face */}
                    <polygon
                      points={`${baseX},${baseY} ${baseX + w},${baseY} ${baseX + w},${baseY - h} ${baseX},${baseY - h}`}
                      fill={block.color}
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                    {/* Cargo Box Top Face */}
                    <polygon
                      points={`${baseX},${baseY - h} ${baseX + w},${baseY - h} ${baseX + w + 12},${baseY - h - 8} ${baseX + 12},${baseY - h - 8}`}
                      fill={block.color}
                      filter="brightness(1.2)"
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                    {/* Cargo Box Right Side Face */}
                    <polygon
                      points={`${baseX + w},${baseY} ${baseX + w + 12},${baseY - 8} ${baseX + w + 12},${baseY - h - 8} ${baseX + w},${baseY - h}`}
                      fill={block.color}
                      filter="brightness(0.85)"
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                    {/* Strap / Tape lines */}
                    <line x1={baseX + w / 2} y1={baseY} x2={baseX + w / 2} y2={baseY - h} stroke="#000000" strokeWidth="0.8" opacity="0.3" />
                  </g>
                );
              })}

              {/* Center of Gravity (CoG) Crosshair Indicator */}
              <g transform="translate(320, 175)" className="animate-pulse">
                {/* Glowing crosshair */}
                <circle cx="0" cy="0" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="0" cy="0" r="4" fill="#38bdf8" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="0" y1="-20" x2="0" y2="20" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="18" y="-8" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  CoG
                </text>
              </g>

              {/* Container Exterior Outer Frame & Roof */}
              {/* Roof */}
              <polygon 
                points="130,135 450,135 510,35 190,35" 
                fill={metrics.isWeightOverloaded ? "url(#hazardStripe)" : "url(#contRoofGrad)"} 
                stroke="#475569" 
                strokeWidth="1.5"
                opacity={isDoorOpen ? 0.35 : 0.9}
              />

              {/* Front Right Door / Wall */}
              {isDoorOpen ? (
                /* Swing Door Open */
                <g>
                  {/* Left Door swung open */}
                  <polygon points="130,225 100,240 100,150 130,135" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" opacity="0.9" />
                  {/* Right Door swung open */}
                  <polygon points="450,225 480,240 480,150 450,135" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" opacity="0.9" />
                </g>
              ) : (
                /* Closed Doors with CSC Safety Plate and Container Number */
                <g>
                  <polygon 
                    points="130,225 450,225 450,135 130,135" 
                    fill="url(#contSideGrad)" 
                    stroke="#0284c7" 
                    strokeWidth="2" 
                  />
                  {/* Door Divider */}
                  <line x1="290" y1="135" x2="290" y2="225" stroke="#0f172a" strokeWidth="2.5" />
                  {/* Door Locking Rods */}
                  <line x1="210" y1="138" x2="210" y2="222" stroke="#64748b" strokeWidth="3" />
                  <line x1="270" y1="138" x2="270" y2="222" stroke="#64748b" strokeWidth="3" />
                  <line x1="310" y1="138" x2="310" y2="222" stroke="#64748b" strokeWidth="3" />
                  <line x1="370" y1="138" x2="370" y2="222" stroke="#64748b" strokeWidth="3" />

                  {/* ISO Markings & CSC Plate */}
                  <rect x="330" y="150" width="80" height="26" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.8" rx="2" />
                  <text x="370" y="162" fill="#bae6fd" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    BOGI-U 202688-4
                  </text>
                  <text x="370" y="172" fill="#7dd3fc" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                    MAX GR {Math.round(metrics.spec.maxGrossWeightKg)} KG
                  </text>

                  {/* Tare / Payload Plate */}
                  <rect x="330" y="182" width="80" height="24" fill="#0f172a" stroke="#475569" strokeWidth="0.8" rx="2" />
                  <text x="370" y="192" fill="#cbd5e1" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                    PAYLOAD {Math.round(metrics.spec.maxPayloadKg)} KG
                  </text>
                  <text x="370" y="201" fill="#94a3b8" fontSize="6" fontFamily="monospace" textAnchor="middle">
                    CUBE {metrics.spec.maxVolumeCbm} CBM
                  </text>
                </g>
              )}

              {/* Corner Castings (Top & Bottom) */}
              {[[130, 225], [450, 225], [130, 135], [450, 135], [510, 35], [190, 35], [510, 125]].map(([cx, cy], idx) => (
                <rect key={idx} x={cx - 5} y={cy - 5} width="10" height="10" fill="#334155" stroke="#94a3b8" strokeWidth="1" rx="1" />
              ))}
            </svg>
          )}

          {viewPerspective === 'SIDE_CUTAWAY' && (
            <svg 
              viewBox="0 0 540 220" 
              className="w-full h-auto drop-shadow-2xl select-none"
              style={{ maxHeight: isCompact ? '200px' : '240px' }}
            >
              {/* Ground line */}
              <line x1="20" y1="195" x2="520" y2="195" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

              {/* Container Outer Frame */}
              <rect x="50" y="30" width="440" height="150" fill="#090d16" stroke="#0284c7" strokeWidth="3" rx="4" />
              
              {/* Floor Planks */}
              <rect x="50" y="170" width="440" height="10" fill="#1e293b" />
              
              {/* Vertical Corrugations */}
              {[100, 150, 200, 250, 300, 350, 400, 450].map((x) => (
                <line key={x} x1={x} y1="30" x2={x} y2="170" stroke="#1e293b" strokeWidth="1.5" opacity="0.6" />
              ))}

              {/* Dynamic Fill Level Bar */}
              <rect 
                x="56" 
                y={170 - Math.min(130, (metrics.volumeUtilizationPercent / 100) * 130)} 
                width="428" 
                height={Math.min(130, (metrics.volumeUtilizationPercent / 100) * 130)} 
                fill={metrics.isVolumeOverfilled ? '#f43f5e' : '#0284c7'} 
                opacity="0.35" 
              />

              {/* Render Stacked Cargo Boxes */}
              {cargoBlocks.map((b) => (
                <rect
                  key={b.id}
                  x={70 + (b.col * 4 + b.row) * 32}
                  y={130 - b.layer * 38}
                  width="28"
                  height="34"
                  fill={b.color}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  rx="2"
                />
              ))}

              {/* Dimension Labels */}
              <text x="270" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Chiều Dài Trong: {metrics.spec.innerLengthM}m
              </text>
              <text x="498" y="110" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="start">
                Cao: {metrics.spec.innerHeightM}m
              </text>
            </svg>
          )}

          {viewPerspective === 'TOP_DOWN' && (
            <svg 
              viewBox="0 0 540 220" 
              className="w-full h-auto drop-shadow-2xl select-none"
              style={{ maxHeight: isCompact ? '200px' : '240px' }}
            >
              {/* Floor Outline */}
              <rect x="50" y="30" width="440" height="160" fill="#090d16" stroke="#0284c7" strokeWidth="3" rx="4" />
              {/* Pallet Stacking Grid (Euro / ISO standard) */}
              <g stroke="#334155" strokeWidth="1" strokeDasharray="2 2" fill="none">
                {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                  <line key={col} x1={50 + col * 55} y1="30" x2={50 + col * 55} y2="190" />
                ))}
                <line x1="50" y1="110" x2="490" y2="110" />
              </g>

              {/* Occupied Pallets */}
              {Array.from({ length: Math.min(16, metrics.estimatedPalletFit) }).map((_, idx) => {
                const col = idx % 8;
                const row = Math.floor(idx / 8);
                return (
                  <rect
                    key={idx}
                    x={56 + col * 54}
                    y={36 + row * 76}
                    width="46"
                    height="68"
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    rx="3"
                    opacity="0.8"
                  />
                );
              })}

              {/* Center of Gravity Mark */}
              <circle cx="270" cy="110" r="10" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="270" cy="110" r="3" fill="#f59e0b" />
              <text x="270" y="135" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                Trọng Tâm ISO (CoG)
              </text>
            </svg>
          )}
        </div>

        {/* Center of Gravity Telemetry status */}
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${metrics.centerOfGravity.isBalanced ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-rose-400 ring-2 ring-rose-400/30 animate-pulse'}`} />
          <span>{metrics.centerOfGravity.statusText}</span>
        </div>
      </div>

      {/* Engineering Gauges & Utilization Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-900 border-t border-slate-800">
        
        {/* Gauge 1: Weight Capacity Ratio */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Tải Trọng (Payload)
            </span>
            <span className={`font-mono font-bold text-xs ${weightGaugeColor}`}>
              {metrics.weightUtilizationPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.isWeightOverloaded ? 'bg-rose-500 animate-pulse' :
                metrics.weightUtilizationPercent > 90 ? 'bg-amber-400' :
                metrics.weightUtilizationPercent > 70 ? 'bg-cyan-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, metrics.weightUtilizationPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>{Math.round(metrics.weightPerUnitKg).toLocaleString('vi-VN')} KG</span>
            <span className="text-slate-500">/ {metrics.spec.maxPayloadKg.toLocaleString('vi-VN')} KG</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Dư tải: <span className="text-slate-300 font-mono">{metrics.remainingPayloadKg.toLocaleString('vi-VN')} KG</span>
          </div>
        </div>

        {/* Gauge 2: Volume Utilization Ratio */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-amber-400" />
              Thể Tích (Volume)
            </span>
            <span className={`font-mono font-bold text-xs ${volumeGaugeColor}`}>
              {metrics.volumeUtilizationPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.isVolumeOverfilled ? 'bg-rose-500 animate-pulse' :
                metrics.volumeUtilizationPercent > 90 ? 'bg-amber-400' :
                metrics.volumeUtilizationPercent > 70 ? 'bg-cyan-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, metrics.volumeUtilizationPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>{metrics.volumePerUnitCbm.toFixed(1)} CBM</span>
            <span className="text-slate-500">/ {metrics.usableVolumeCbm} CBM</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Dư khối: <span className="text-slate-300 font-mono">{metrics.remainingVolumeCbm} CBM</span>
          </div>
        </div>

        {/* Metric 3: Cargo Density & Stowage */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Mật Độ Hàng (Density)
          </div>
          <div className="my-1">
            <div className="font-mono text-base font-bold text-slate-100">
              {metrics.densityKgPerCbm} <span className="text-xs font-normal text-slate-400">kg/m³</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {metrics.densityKgPerCbm > 700 ? 'Hàng nặng (Deadweight)' : 
               metrics.densityKgPerCbm < 250 ? 'Hàng nhẹ cồng kềnh (Measurement)' : 'Mật độ tiêu chuẩn'}
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Ước tính Pallet ISO: <span className="text-cyan-400 font-mono font-bold">{metrics.estimatedPalletFit}</span>/{metrics.spec.standardPalletCapacity}
          </div>
        </div>

        {/* Metric 4: Packaging Type & Broken Stowage */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" />
              Quy cách đóng gói
            </span>
          </div>

          <select
            value={packagingType}
            onChange={(e) => setPackagingType(e.target.value as CargoPackagingType)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 cursor-pointer font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="CARTONS">Thùng Carton bách hóa</option>
            <option value="PALLETS">Pallet Tiêu Chuẩn ISO</option>
            <option value="WOOD_CRATES">Kiện Gỗ / Máy móc</option>
            <option value="DRUMS">Thùng phuy / Chất lỏng</option>
          </select>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Hao hụt xếp dỡ:</span>
            <span className="font-mono text-cyan-400 font-bold">{metrics.brokenStowagePercent}%</span>
          </div>
        </div>
      </div>

      {/* Advisory & Recommendation Bar */}
      {metrics.recommendation && (
        <div className="px-4 py-2.5 bg-cyan-950/40 border-t border-cyan-900/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span className="text-cyan-200 text-[11px] leading-relaxed">
              <strong className="font-bold text-white">Gợi ý AI BOGI:</strong> {metrics.recommendation}
            </span>
          </div>
          {onSelectAlternativeType && metrics.spec.id === "40'GP" && (
            <button
              type="button"
              onClick={() => onSelectAlternativeType("40'HC")}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1 transition cursor-pointer"
            >
              <span>Đổi sang 40'HC</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
