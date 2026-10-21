import React, { useMemo } from 'react';
import { 
  X, 
  History, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  DollarSign, 
  Ship, 
  Plane, 
  Check, 
  Info,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { QuoteData, Currency } from '../../types/logistics';
import { 
  analyzeHistoricalRatesForPortPair, 
  applyHistoricalSuggestedRateToQuote 
} from '../../services/pricing/historicalRateService';
import { formatUSD, formatVND } from '../../utils/formatters';

interface HistoricalRateAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  savedQuotes: QuoteData[];
  onApplyRate: (updatedQuote: QuoteData, message: string) => void;
}

export const HistoricalRateAdvisorModal: React.FC<HistoricalRateAdvisorModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  savedQuotes,
  onApplyRate,
}) => {
  const pol = currentQuote.shipment?.pol || '';
  const pod = currentQuote.shipment?.pod || '';
  const containerType = currentQuote.shipment?.containerType;

  const analysis = useMemo(() => {
    return analyzeHistoricalRatesForPortPair(
      pol,
      pod,
      savedQuotes,
      currentQuote.id,
      containerType,
      currentQuote.quoteCurrency || 'USD'
    );
  }, [pol, pod, savedQuotes, currentQuote.id, containerType, currentQuote.quoteCurrency]);

  if (!isOpen) return null;

  const handleApplyTier = (rate: number, currency: Currency, strategyTitle: string) => {
    const updated = applyHistoricalSuggestedRateToQuote(currentQuote, rate, currency, strategyTitle);
    const formatted = currency === 'USD' ? formatUSD(rate) : formatVND(rate);
    const message = `🎯 Đã cập nhật giá cước chính thành ${formatted} (${strategyTitle}) vào báo giá!`;
    onApplyRate(updated, message);
    onClose();
  };

  const polShort = pol.split(',')[0].trim() || 'Cảng POL';
  const podShort = pod.split(',')[0].trim() || 'Cảng POD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <History className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Gợi Ý Giá Cước Cạnh Tranh (Dữ Liệu Lịch Sử POL - POD)
                </h2>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  3 Tháng Gần Nhất
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Tuyến: <strong>{polShort}</strong> ➔ <strong>{podShort}</strong></span>
                <span className="text-slate-400">·</span>
                <span>Quy cách: {containerType || "40'HC"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/60 space-y-5">
          {!analysis.hasMatches ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center max-w-lg mx-auto my-6">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Chưa có dữ liệu báo giá lịch sử cho cặp cảng này trong 3 tháng qua
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tuyến <strong>{pol || 'POL'}</strong> ➔ <strong>{pod || 'POD'}</strong> chưa có báo giá nào được lưu trong 90 ngày gần nhất. Hệ thống sẽ tự động ghi nhận và phân tích ngay khi bạn lưu báo giá cho tuyến này!
              </p>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs space-y-1 text-slate-600">
                <div>💡 <strong>Gợi ý:</strong> Bạn có thể:</div>
                <div className="text-slate-500">• Chọn nhanh gói cước chuẩn từ <strong>Bộ Mẫu Tuyến Trọn Gói (1-Click)</strong></div>
                <div className="text-slate-500">• Sử dụng tính năng <strong>Đối Soát Cước Thị Trường (Benchmarking)</strong></div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cước Thấp Nhất (Floor)
                  </div>
                  <div className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5">
                    {formatUSD(analysis.minRate)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Mức sàn từng báo</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cước Trung Bình (Avg)
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                    {formatUSD(analysis.avgRate)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Trên {analysis.totalQuotesCount} báo giá</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Giá Chốt Thành Công
                  </div>
                  <div className="text-lg font-extrabold text-blue-800 font-mono mt-0.5">
                    {analysis.wonRate ? formatUSD(analysis.wonRate) : '—'}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {analysis.acceptedCount > 0 ? `${analysis.acceptedCount} đơn đã chốt` : 'Chưa có đơn chốt'}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Giá Báo Gần Nhất
                  </div>
                  <div className="text-lg font-extrabold text-indigo-700 font-mono mt-0.5">
                    {formatUSD(analysis.latestRate)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {analysis.matches[0]?.daysAgo === 0 ? 'Hôm nay' : `${analysis.matches[0]?.daysAgo} ngày trước`}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Biên Lãi TB Lịch Sử
                  </div>
                  <div className="text-lg font-extrabold text-purple-700 font-mono mt-0.5">
                    {analysis.avgMarginPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    {analysis.trend === 'UPWARD' && (
                      <span className="text-rose-600 font-bold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> Xu hướng tăng
                      </span>
                    )}
                    {analysis.trend === 'DOWNWARD' && (
                      <span className="text-emerald-600 font-bold flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5" /> Xu hướng giảm
                      </span>
                    )}
                    {analysis.trend === 'STABLE' && <span>Giá đi ngang ổn định</span>}
                  </div>
                </div>
              </div>

              {/* SECTION: 3 Competitive Strategy Tiers */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>3 Mức Giá Đề Xuất Cạnh Tranh (Chọn & Áp Dụng Ngay)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Bấm nút "Áp dụng giá này" để cập nhật trực tiếp vào dòng cước chính
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {analysis.tiers.map((tier) => {
                    const isAggressive = tier.id === 'AGGRESSIVE_WIN';
                    const isBalanced = tier.id === 'MARKET_BALANCED';
                    const isPremium = tier.id === 'PREMIUM_MARGIN';

                    return (
                      <div
                        key={tier.id}
                        className={`bg-white rounded-2xl border p-4.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                          isBalanced
                            ? 'border-indigo-400 ring-2 ring-indigo-300/40 shadow-xs'
                            : isAggressive
                            ? 'border-emerald-300 hover:border-emerald-400'
                            : 'border-purple-300 hover:border-purple-400'
                        }`}
                      >
                        <div>
                          {/* Badge & Title */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isBalanced
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : isAggressive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {tier.badge}
                            </span>
                            {tier.savingsVsAvgPercent !== 0 && (
                              <span className={`text-[10px] font-semibold font-mono ${
                                tier.savingsVsAvgPercent < 0 ? 'text-emerald-600' : 'text-purple-600'
                              }`}>
                                {tier.savingsVsAvgPercent > 0 ? `+${tier.savingsVsAvgPercent}%` : `${tier.savingsVsAvgPercent}%`} vs TB
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">
                            {tier.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {tier.subtitle}
                          </p>

                          {/* Rate Big Price */}
                          <div className="my-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Đơn Giá Cước</div>
                              <div className="text-2xl font-black text-slate-900 font-mono">
                                {formatUSD(tier.rate)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Biên Lãi Dự Tính</div>
                              <div className="text-sm font-bold text-emerald-600 font-mono">
                                ~{tier.estimatedMarginPercent}%
                              </div>
                            </div>
                          </div>

                          {/* Recommendation explanation */}
                          <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
                            {tier.recommendationReason}
                          </p>
                        </div>

                        {/* 1-Click Apply Button */}
                        <button
                          type="button"
                          onClick={() => handleApplyTier(tier.rate, tier.currency, tier.title)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            isBalanced
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : isAggressive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Áp Dụng Mức Giá Này</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Historical Quotes Audit Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Bảng Chi Tiết {analysis.matches.length} Báo Giá Lịch Sử Tuyến Trong 90 Ngày Qua
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Sắp xếp theo thời gian mới nhất
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Mã Báo Giá</th>
                        <th className="py-2.5 px-3">Thời Gian</th>
                        <th className="py-2.5 px-3">Khách Hàng</th>
                        <th className="py-2.5 px-3">Quy Cách</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá Cước</th>
                        <th className="py-2.5 px-3 text-center">Biên Lãi</th>
                        <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.matches.map((item) => {
                        const isWon = item.status === 'ACCEPTED' || item.status === 'APPROVED';

                        return (
                          <tr key={item.quoteId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                              {item.quoteNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <div>{item.createdDate}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.daysAgo === 0 ? 'Hôm nay' : `${item.daysAgo} ngày trước`}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[160px] truncate" title={item.customerName}>
                              {item.customerName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {item.containerType} ({item.quantity})
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                              {formatUSD(item.freightItem.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.freightItem.marginPercent !== undefined ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                                  item.freightItem.marginPercent >= 15 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {Math.round(item.freightItem.marginPercent * 10) / 10}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isWon
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : item.status === 'SENT'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {isWon ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : null}
                                <span>{item.status}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleApplyTier(
                                  item.freightItem.unitPrice, 
                                  item.freightItem.currency, 
                                  `Lấy theo đơn ${item.quoteNumber}`
                                )}
                                className="px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                                title="Áp dụng giá cước của báo giá này"
                              >
                                Lấy Giá Này
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Thuật toán tự động đối soát cảng bốc/dỡ và quy cách thiết bị để đưa ra mức giá tăng tỷ lệ chốt đơn cao nhất.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
