import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Navigation, 
  Anchor, 
  Plane, 
  Ship, 
  Compass, 
  Wind, 
  Waves, 
  Clock, 
  MapPin, 
  Sparkles, 
  Activity, 
  Layers, 
  Maximize2, 
  Play, 
  Pause,
  Leaf
} from 'lucide-react';
import { buildRouteAnalysis, RouteAnalysis, RouteWaypoint } from './portCoordinates';

interface RouteParticleBeamMapProps {
  pol: string;
  pod: string;
  mode?: string;
  transitTimeDays?: number;
  carrier?: string;
  etd?: string;
  eta?: string;
  className?: string;
  isCompact?: boolean;
}

export const RouteParticleBeamMap: React.FC<RouteParticleBeamMapProps> = ({
  pol,
  pod,
  mode = 'SEA_FCL',
  transitTimeDays,
  carrier,
  etd,
  eta,
  className = '',
  isCompact = false
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activeWaypoint, setActiveWaypoint] = useState<RouteWaypoint | null>(null);

  // Compute rich navigational data
  const route = useMemo<RouteAnalysis>(() => {
    return buildRouteAnalysis(pol, pod, mode, transitTimeDays);
  }, [pol, pod, mode, transitTimeDays]);

  const isAir = mode === 'AIR_FREIGHT';

  // SVG dimensions
  const svgWidth = 1000;
  const svgHeight = 440;

  return (
    <div className={`bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col ${className}`}>
      
      {/* Telemetry Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center shrink-0 shadow-inner">
            {isAir ? (
              <Plane className="w-4 h-4 text-sky-400" />
            ) : (
              <Ship className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Hải Trình & Tia Hạt Lộ Trình
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                {route.origin.code} ➔ {route.destination.code}
              </span>
              {carrier && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  {carrier}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {route.origin.nameVi} <span className="text-slate-600">➔</span> {route.destination.nameVi}
            </p>
          </div>
        </div>

        {/* Telemetry quick stats */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-bold">{route.totalDistanceNm.toLocaleString('vi-VN')}</span>
            <span className="text-slate-500 text-[10px]">NM</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-bold">{route.estimatedTransitDays}</span>
            <span className="text-slate-500 text-[10px]">Ngày</span>
          </div>

          {/* Animation controls */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isPlaying ? 'Tạm dừng mô phỏng hành trình' : 'Tiếp tục chạy tia hạt'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Geospatial Vector Map Viewport */}
      <div className="relative bg-slate-950 overflow-hidden select-none flex items-center justify-center min-h-[260px] sm:min-h-[340px]">
        
        {/* Subtle Cyber Radar Radial Circles */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950/90 to-black pointer-events-none" />

        {/* Interactive SVG Projection */}
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto drop-shadow-2xl"
          style={{ maxHeight: isCompact ? '240px' : '360px' }}
        >
          <defs>
            {/* Glowing neon filters */}
            <filter id="neonBeamGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient along beam */}
            <linearGradient id="routeBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Background Map Grid Pattern */}
            <pattern id="geoGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect width={svgWidth} height={svgHeight} fill="url(#geoGrid)" />

          {/* Stylized Continental Landmass Outlines (World Basemap Reference) */}
          <g fill="#0f172a" stroke="#1e293b" strokeWidth="1" opacity="0.6">
            {/* Asia / SE Asia outline */}
            <path d="M 400 80 Q 480 90 560 140 T 580 240 Q 520 280 460 270 T 410 180 Z" />
            {/* Indochina / Vietnam Peninsula */}
            <path d="M 510 190 Q 530 220 520 250 Q 510 260 500 240 Z" fill="#132337" stroke="#0284c7" strokeWidth="0.8" />
            {/* East Asia / Japan / Korea */}
            <path d="M 620 120 Q 660 140 640 180 Q 610 170 600 140 Z" />
            {/* North America West Coast */}
            <path d="M 780 60 Q 860 120 840 220 Q 810 260 760 210 Z" />
            {/* Europe */}
            <path d="M 120 70 Q 200 80 210 140 Q 150 170 110 120 Z" />
            {/* Australia */}
            <path d="M 580 320 Q 660 330 650 390 Q 570 410 560 350 Z" />
          </g>

          {/* Latitude Equator & Tropic Lines */}
          <line x1="0" y1="220" x2={svgWidth} y2="220" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="6 4" opacity="0.25" />
          <text x="20" y="215" fill="#0ea5e9" fontSize="9" fontFamily="monospace" opacity="0.5">
            EQUATOR 0°00'N
          </text>

          {/* Ocean Shipping Lanes Ambient Vector Trails */}
          <g stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.5">
            <path d="M 180 140 Q 320 260 510 250" />
            <path d="M 510 250 Q 680 180 820 190" />
            <path d="M 520 240 Q 580 330 620 370" />
          </g>

          {/* ============================================================== */}
          {/* HIỆU ỨNG 4: TIA HẠT LỘ TRÌNH VẬN TẢI POL ➔ POD               */}
          {/* ============================================================== */}

          {/* 1. Underlying Soft Glow Halo Trail */}
          <path
            d={route.svgPathD}
            fill="none"
            stroke="url(#routeBeamGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.18"
            filter="url(#neonBeamGlow)"
          />

          {/* 2. Core Laser Beam Path */}
          <path
            d={route.svgPathD}
            fill="none"
            stroke="url(#routeBeamGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#neonBeamGlow)"
            className={isPlaying ? 'laser-beam-pulse' : ''}
          />

          {/* 3. High-Frequency Photon Dash Trail */}
          <path
            d={route.svgPathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="8 24"
            strokeLinecap="round"
            opacity="0.9"
            style={{
              animation: isPlaying ? `routeLaserDash ${8 / speedMultiplier}s linear infinite` : 'none'
            }}
          />

          {/* 4. Flowing High-Energy Photon Particle Emitters (Tia Hạt Photon Chạy Dọc Lộ Trình) */}
          {isPlaying && (
            <>
              {/* Particle 1: Primary Lead Photon */}
              <circle r="4.5" fill="#38bdf8" filter="url(#particleGlow)">
                <animateMotion
                  path={route.svgPathD}
                  dur={`${7 / speedMultiplier}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
              {/* Particle 1 Sparkle Ring */}
              <circle r="8" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.7">
                <animateMotion
                  path={route.svgPathD}
                  dur={`${7 / speedMultiplier}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>

              {/* Particle 2: Trailing Photon (Offset) */}
              <circle r="3.5" fill="#34d399" filter="url(#particleGlow)">
                <animateMotion
                  path={route.svgPathD}
                  dur={`${7 / speedMultiplier}s`}
                  begin={`${2.3 / speedMultiplier}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>

              {/* Particle 3: Secondary Trailing Photon (Offset) */}
              <circle r="3" fill="#facc15" filter="url(#particleGlow)">
                <animateMotion
                  path={route.svgPathD}
                  dur={`${7 / speedMultiplier}s`}
                  begin={`${4.6 / speedMultiplier}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </>
          )}

          {/* 5. Live Moving Vessel or Airplane Sprite traversing the path */}
          <g>
            <animateMotion
              path={route.svgPathD}
              dur={`${14 / speedMultiplier}s`}
              repeatCount="indefinite"
              rotate="auto"
            />
            {isAir ? (
              /* Air Cargo Plane */
              <g transform="translate(-12, -12)">
                <circle cx="12" cy="12" r="14" fill="#0284c7" opacity="0.25" />
                <circle cx="12" cy="12" r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 12 5 L 14 11 L 19 13 L 14 14 L 13 18 L 12 17 L 11 18 L 10 14 L 5 13 L 10 11 Z" fill="#38bdf8" />
              </g>
            ) : (
              /* Ocean Cargo Vessel */
              <g transform="translate(-12, -12)">
                <circle cx="12" cy="12" r="14" fill="#059669" opacity="0.25" />
                <circle cx="12" cy="12" r="10" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                {/* Ship icon vector */}
                <path d="M 6 15 L 18 15 L 16 18 L 8 18 Z" fill="#34d399" />
                <rect x="9" y="10" width="6" height="5" fill="#34d399" />
                <rect x="11" y="7" width="2" height="3" fill="#ffffff" />
              </g>
            )}
          </g>

          {/* 6. Waypoints and Sonar Pulsing Beacons */}
          {route.waypoints.map((wp) => {
            const isOrigin = wp.type === 'POL';
            const isDest = wp.type === 'POD';
            const isHub = wp.type === 'HUB';

            const beaconColor = isOrigin ? '#10b981' : isDest ? '#06b6d4' : '#f59e0b';

            return (
              <g 
                key={wp.code} 
                transform={`translate(${wp.x}, ${wp.y})`}
                className="cursor-pointer group"
                onClick={() => setActiveWaypoint(wp)}
              >
                {/* Sonar Beacon Expanding Radar Rings */}
                <circle cx="0" cy="0" r="18" fill="none" stroke={beaconColor} strokeWidth="1" opacity="0.25">
                  <animate attributeName="r" values="6;24" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="12" fill="none" stroke={beaconColor} strokeWidth="1.5" opacity="0.4">
                  <animate attributeName="r" values="4;16" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                </circle>

                {/* Core Waypoint Node */}
                <circle cx="0" cy="0" r="5" fill={beaconColor} stroke="#090d16" strokeWidth="2" />

                {/* Port Code Badge */}
                <g transform="translate(0, -18)">
                  <rect 
                    x="-24" 
                    y="-12" 
                    width="48" 
                    height="16" 
                    rx="4" 
                    fill="#0f172a" 
                    stroke={beaconColor} 
                    strokeWidth="1" 
                    opacity="0.9" 
                  />
                  <text 
                    x="0" 
                    y="0" 
                    fill="#ffffff" 
                    fontSize="9" 
                    fontFamily="monospace" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    {wp.code}
                  </text>
                </g>

                {/* Role Tag Label */}
                <text 
                  x="0" 
                  y="18" 
                  fill={beaconColor} 
                  fontSize="8.5" 
                  fontFamily="sans-serif" 
                  fontWeight="600" 
                  textAnchor="middle"
                >
                  {isOrigin ? 'POL (Xuất)' : isDest ? 'POD (Nhập)' : 'Hub Chuyển Tải'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Waypoint Tooltip HUD */}
        {activeWaypoint && (
          <div className="absolute top-4 left-4 z-20 bg-slate-900/95 border border-cyan-500/40 p-3 rounded-xl shadow-xl max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {activeWaypoint.code} - {activeWaypoint.name}
              </span>
              <button 
                type="button" 
                onClick={() => setActiveWaypoint(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1 font-mono">
              <div>Tọa độ: {activeWaypoint.lat.toFixed(4)}°N, {activeWaypoint.lng.toFixed(4)}°E</div>
              <div>Hành trình: Ngày thứ {activeWaypoint.estDaysFromOrigin}</div>
              <div>Vai trò: {activeWaypoint.type === 'POL' ? 'Cảng bốc hàng chính' : activeWaypoint.type === 'POD' ? 'Cảng dỡ hàng đích' : 'Cảng trung chuyển quốc tế'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry HUD Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 border-t border-slate-800">
        
        {/* Metric 1: Distance & Nautical Miles */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            Hải Trình Thực Tế
          </div>
          <div className="font-mono text-base font-bold text-cyan-300">
            {route.totalDistanceNm.toLocaleString('vi-VN')} <span className="text-xs text-slate-400">NM</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            ≈ {route.totalDistanceKm.toLocaleString('vi-VN')} KM cung đại vòng
          </div>
        </div>

        {/* Metric 2: Estimated Transit Days & Schedule */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Thời Gian Vận Chuyển (T/T)
          </div>
          <div className="font-mono text-base font-bold text-emerald-300">
            {route.estimatedTransitDays} <span className="text-xs text-slate-400">Ngày</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {etd ? `ETD: ${etd}` : 'Chuyến đi cố định hàng tuần'}
          </div>
        </div>

        {/* Metric 3: Maritime Meteorological Conditions */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <Waves className="w-3.5 h-3.5 text-sky-400" />
            Khí Tượng & Sóng Biển
          </div>
          <div className="font-mono text-xs font-bold text-slate-200">
            Sóng: <span className="text-sky-300">{route.seaConditions.waveHeightM}m</span> • Gió: <span className="text-sky-300">{route.seaConditions.windKnots} kts</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {route.seaConditions.weatherVi}
          </div>
        </div>

        {/* Metric 4: Carbon Emission Footprint ESG */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            Phát Thải CO2 (ESG)
          </div>
          <div className="font-mono text-base font-bold text-emerald-300">
            {route.carbonEmissionKgCo2e.toLocaleString('vi-VN')} <span className="text-xs text-slate-400">kg CO2e</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Chuẩn tính toán IMO / GLEC
          </div>
        </div>

      </div>

      {/* Transit Corridor Flow Info Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>
            Hành lang: <strong className="text-white">{route.origin.countryCode} ➔ {route.transshipmentHub ? `${route.transshipmentHub.code} ➔ ` : ''}{route.destination.countryCode}</strong> ({isAir ? 'Đường Hàng Không Quốc Tế' : 'Tuyến Hải Vận Container'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">Tốc độ mô phỏng:</span>
          {[1, 2, 4].map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => setSpeedMultiplier(mult)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                speedMultiplier === mult
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mult}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
