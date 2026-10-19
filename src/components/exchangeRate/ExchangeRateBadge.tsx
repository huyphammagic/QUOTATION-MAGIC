import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { ExchangeRateDetail } from '../../types/exchangeRate';

interface ExchangeRateBadgeProps {
  rateDetail: ExchangeRateDetail;
  isUpdating?: boolean;
  onRefresh?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  className?: string;
}

export const ExchangeRateBadge: React.FC<ExchangeRateBadgeProps> = ({
  rateDetail,
  isUpdating = false,
  onRefresh,
  onClick,
  className = '',
}) => {
  const isUp = rateDetail.trend === 'UP';
  const isDown = rateDetail.trend === 'DOWN';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title="Bấm để xem Trung tâm Quản lý Tỷ giá USD Realtime & Cập nhật tự động"
      className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer select-none text-xs ${className}`}
    >
      {/* Live Pulsing Dot */}
      <div className="relative flex items-center justify-center w-2 h-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </div>

      {/* Label & Source */}
      <span className="text-[10px] font-semibold tracking-wide text-slate-500 flex items-center gap-0.5">
        <Zap className="w-2.5 h-2.5 text-amber-500" />
        USD:
      </span>

      {/* Primary Rate Value */}
      <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
        {rateDetail.rate.toLocaleString('vi-VN')}
      </span>
      <span className="text-[10px] text-slate-400">₫</span>

      {/* Trend Icon */}
      {isUp ? (
        <span className="text-[10px] text-emerald-600 flex items-center font-medium" title={`Tăng ${rateDetail.change24h > 0 ? `+${rateDetail.change24h}` : ''}đ`}>
          <TrendingUp className="w-3 h-3" />
        </span>
      ) : isDown ? (
        <span className="text-[10px] text-rose-600 flex items-center font-medium" title={`Giảm ${rateDetail.change24h}đ`}>
          <TrendingDown className="w-3 h-3" />
        </span>
      ) : (
        <Minus className="w-2.5 h-2.5 text-slate-400" />
      )}

      {/* 1-Click Refresh Button */}
      {onRefresh && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh(e);
          }}
          disabled={isUpdating}
          className="ml-0.5 p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
          title="Lấy tỷ giá Vietcombank mới nhất ngay bây giờ"
        >
          <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      )}
    </div>
  );
};
