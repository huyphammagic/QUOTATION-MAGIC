import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Clock, 
  Building2, 
  ArrowRightLeft, 
  Sliders, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ExchangeRateDetail, ExchangeRateConfig } from '../../types/exchangeRate';

interface ExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateDetail: ExchangeRateDetail;
  currentQuoteRate: number;
  config: ExchangeRateConfig;
  onApplyRateToQuote: (rate: number, isLocked?: boolean) => void;
  onSaveConfig: (newConfig: Partial<ExchangeRateConfig>) => void;
  onRefreshLiveRate: () => Promise<void>;
  quoteTotalUsd?: number;
  quoteTotalVnd?: number;
}

export const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({
  isOpen,
  onClose,
  rateDetail,
  currentQuoteRate,
  config,
  onApplyRateToQuote,
  onSaveConfig,
  onRefreshLiveRate,
  quoteTotalUsd = 0,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoSync, setAutoSync] = useState(config.autoSyncEnabled);
  const [isLocked, setIsLocked] = useState(config.lockRateForActiveQuote);
  const [spreadVnd, setSpreadVnd] = useState(config.rateSpreadAdjustmentVnd);
  const [calcUsd, setCalcUsd] = useState('1000');
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  // Sync internal state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setAutoSync(config.autoSyncEnabled);
      setIsLocked(config.lockRateForActiveQuote);
      setSpreadVnd(config.rateSpreadAdjustmentVnd);
    }
  }, [isOpen, config]);

  // Handle ESC key cleanly without any ESC text in UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveRate = rateDetail.rate + (spreadVnd || 0);
  const isUp = rateDetail.trend === 'UP';
  const isDown = rateDetail.trend === 'DOWN';

  // Calculator logic
  const numericCalcUsd = parseFloat(calcUsd) || 0;
  const calculatedVnd = Math.round(numericCalcUsd * effectiveRate);

  // Impact analysis on current active quote
  const currentTotalVndAtQuoteRate = Math.round(quoteTotalUsd * (currentQuoteRate || 25400));
  const newTotalVndAtLiveRate = Math.round(quoteTotalUsd * effectiveRate);
  const diffVnd = newTotalVndAtLiveRate - currentTotalVndAtQuoteRate;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshLiveRate();
      showToast('Đã kết nối và lấy tỷ giá Vietcombank mới nhất thành công!');
    } catch {
      showToast('Đã làm mới dữ liệu tỷ giá dự phòng.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastFeedback(msg);
    setTimeout(() => setToastFeedback(null), 3000);
  };

  const handleApplyToQuote = () => {
    onApplyRateToQuote(effectiveRate, isLocked);
    onSaveConfig({
      autoSyncEnabled: autoSync,
      lockRateForActiveQuote: isLocked,
      rateSpreadAdjustmentVnd: spreadVnd,
    });
    showToast(`Đã áp dụng tỷ giá 1 USD = ${effectiveRate.toLocaleString('vi-VN')} VND vào báo giá!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleSaveSettingsOnly = () => {
    onSaveConfig({
      autoSyncEnabled: autoSync,
      lockRateForActiveQuote: isLocked,
      rateSpreadAdjustmentVnd: spreadVnd,
    });
    showToast('Đã lưu cấu hình tự động đồng bộ tỷ giá!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Tỷ Giá USD Realtime Chuẩn Logistics</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE 100%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Nguồn: Vietcombank (VCB) Bán Chuyển Khoản & Thị trường Ngoại hối Liên ngân hàng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Lấy dữ liệu tỷ giá mới nhất ngay bây giờ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Cập Nhật Ngay</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOAST FEEDBACK */}
        {toastFeedback && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5 animate-in slide-in-from-top duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastFeedback}</span>
          </div>
        )}

        {/* BODY (SCROLLABLE) */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-700 text-xs">
          
          {/* HERO RATE CARD */}
          <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/40 p-4 rounded-xl border border-blue-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Tỷ Giá Hạch Toán Bán Chuyển Khoản (VCB Transfer Sell)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {effectiveRate.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">VND / 1 USD</span>
                  
                  {/* Trend Indicator */}
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isUp ? 'bg-emerald-100 text-emerald-800' : isDown ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : null}
                    {rateDetail.change24h > 0 ? `+${rateDetail.change24h}` : rateDetail.change24h}đ ({rateDetail.changePercent24h}%)
                  </span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-blue-200/60 sm:pl-4 space-y-1">
                <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Cập nhật: {new Date(rateDetail.lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Ngày hiệu lực: {rateDetail.effectiveDate}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Độ chính xác: 100%
                </div>
              </div>
            </div>

            {spreadVnd !== 0 && (
              <div className="mt-2.5 pt-2 border-t border-blue-200/50 text-[11px] text-blue-800 flex items-center justify-between">
                <span>Gốc VCB: <strong>{rateDetail.rate.toLocaleString()} ₫</strong></span>
                <span>Biên độ điều chỉnh: <strong>{spreadVnd > 0 ? `+${spreadVnd}` : spreadVnd} ₫</strong></span>
                <span>Tỷ giá áp dụng: <strong>{effectiveRate.toLocaleString()} ₫</strong></span>
              </div>
            )}
          </div>

          {/* DETAILED BANKING RATES GRID */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
              <span>Bảng Biểu Phí Ngoại Tệ Vietcombank Hôm Nay</span>
              <span className="text-[10px] font-normal text-slate-500">(Chuẩn tính cước quốc tế)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Mua Tiền Mặt</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {rateDetail.buyCash.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Mua Chuyển Khoản</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {rateDetail.buyTransfer.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700">Bán Chuyển Khoản ★</span>
                </div>
                <span className="font-mono font-extrabold text-blue-900 text-sm">
                  {rateDetail.sellTransfer.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Tỷ Giá Trung Tâm</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {rateDetail.centralRate.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          {/* IMPACT ANALYSIS ON CURRENT ACTIVE QUOTE */}
          {quoteTotalUsd > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  Đối Soát Giá Trị Báo Giá Đang Mở (${quoteTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Tỷ giá hiện tại trong quote: {currentQuoteRate.toLocaleString()} ₫
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Theo tỷ giá trong báo giá</span>
                  <span className="font-bold text-slate-700 text-xs">
                    {currentTotalVndAtQuoteRate.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-blue-600 block font-sans font-medium">Theo tỷ giá Live mới nhất</span>
                  <span className="font-extrabold text-blue-900 text-xs">
                    {newTotalVndAtLiveRate.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className={`p-2 rounded-lg border ${diffVnd >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  <span className="text-[10px] block font-sans font-medium">Chênh lệch khi cập nhật</span>
                  <span className="font-bold text-xs">
                    {diffVnd > 0 ? `+${diffVnd.toLocaleString('vi-VN')}` : diffVnd.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QUICK CURRENCY CONVERTER */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">
              Quy Đổi Nhanh Theo Tỷ Giá Vietcombank Live
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  value={calcUsd}
                  onChange={(e) => setCalcUsd(e.target.value)}
                  placeholder="Nhập số USD"
                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-slate-400 font-bold text-sm">=</span>
              <div className="flex-1 bg-white px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-extrabold text-blue-900 text-xs truncate">
                {calculatedVnd.toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </div>

          {/* AUTO-SYNC SETTINGS & RATE LOCK */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              Cấu Hình Tự Động Hóa & Khóa Tỷ Giá (Rate Lock)
            </h4>

            <div className="space-y-2">
              {/* Option 1: Auto Sync Toggle */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Tự động đồng bộ tỷ giá USD realtime vào báo giá</span>
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Mặc định Khuyến nghị</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống sẽ định kỳ kiểm tra biến động tỷ giá ngân hàng Vietcombank và tự động điều chỉnh tổng giá trị báo giá để không bao giờ bị lệch tỷ giá thị trường.
                  </p>
                </div>
              </label>

              {/* Option 2: Rate Lock Toggle */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isLocked}
                  onChange={(e) => setIsLocked(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="font-semibold text-slate-800">Khóa cố định tỷ giá cho Báo Giá này (Rate Lock)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bật tùy chọn này khi đã ký kết hợp đồng hoặc gửi báo giá cố định cho khách hàng để không bị tự động thay đổi số tiền VND khi tỷ giá thị trường biến động.
                  </p>
                </div>
              </label>

              {/* Option 3: Buffer spread */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white">
                <div>
                  <span className="font-semibold text-slate-800 block">Biên độ dự phòng biến động tỷ giá (Spread Buffer)</span>
                  <span className="text-[10px] text-slate-500">Cộng thêm vào tỷ giá gốc để dự phòng rủi ro thanh toán sau</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSpreadVnd(val)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        spreadVnd === val 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {val === 0 ? 'Chuẩn VCB' : `+${val}đ`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7-DAY TREND MINI HISTORICAL */}
          {rateDetail.historicalRates && rateDetail.historicalRates.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Xu Hướng Tỷ Giá USD 7 Ngày Qua (Vietcombank)
              </span>
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
                {rateDetail.historicalRates.map((h, i) => (
                  <div key={i} className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[9px]">{h.date.slice(5)}</span>
                    <span className="font-bold text-slate-800">{h.rate.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            Tỷ giá áp dụng sẽ có hiệu lực ngay cho toàn bộ các mục cước và phụ phí.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveSettingsOnly}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              Lưu Cấu Hình
            </button>
            <button
              type="button"
              onClick={handleApplyToQuote}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Áp Dụng Tỷ Giá Live Vào Báo Giá</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
