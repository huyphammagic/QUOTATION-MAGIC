import React, { useState, useMemo } from 'react';
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Percent,
  Sparkles,
  Copy,
  Check,
  X,
  Layers,
  ArrowRight,
  TrendingDown,
  Gift,
  Clock,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import {
  ConcessionSimulationInput,
  ConcessionSimulationResult,
  SmartConcessionOption
} from '../../types/smartConcession';
import {
  simulateSmartConcessions,
  saveConcessionSimulation
} from '../../services/concession/smartConcessionService';
import { QuoteData } from '../../types/logistics';

interface SmartConcessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote?: QuoteData;
  onApplyConcessionToQuote?: (newFreightSell: number, tradeOffSummary: string) => void;
}

export const SmartConcessionModal: React.FC<SmartConcessionModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyConcessionToQuote
}) => {
  // Extract defaults from current quote
  const defaultSell = currentQuote?.grandTotalUsd || currentQuote?.items?.reduce((s, i) => s + (i.amountUsd || 0), 0) || 3850;
  const defaultCost = currentQuote?.items?.reduce((s, i) => s + (i.costTotalUsd || 0), 0) || 3450;
  const defaultQty = currentQuote?.shipment?.quantity || 2;

  // Simulator state
  const [freightSell, setFreightSell] = useState<number>(defaultSell);
  const [freightCost, setFreightCost] = useState<number>(defaultCost);
  const [marginFloor, setMarginFloor] = useState<number>(7.0);
  const [requestedDiscount, setRequestedDiscount] = useState<number>(100);
  const [containerQty, setContainerQty] = useState<number>(defaultQty);

  // Selected Option for detailed view
  const [selectedStrategyType, setSelectedStrategyType] = useState<string>('VOLUME_TRADEOFF');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const simulation: ConcessionSimulationResult = useMemo(() => {
    return simulateSmartConcessions({
      quotationId: currentQuote?.id,
      quoteNumber: currentQuote?.quoteNumber,
      customerName: currentQuote?.customer?.companyName || 'Công ty Khách Hàng',
      carrier: currentQuote?.shipment?.carrier || 'ONE Line',
      route: `${currentQuote?.shipment?.pol || 'Cát Lái'} ➔ ${currentQuote?.shipment?.pod || 'Long Beach'}`,
      currentFreightSellUsd: freightSell,
      currentFreightCostUsd: freightCost,
      minMarginFloorPercent: marginFloor,
      requestedDiscountUsd: requestedDiscount,
      containerQuantity: containerQty
    });
  }, [currentQuote, freightSell, freightCost, marginFloor, requestedDiscount, containerQty]);

  const activeOption = simulation.options.find(o => o.strategyType === selectedStrategyType) || simulation.options[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleApplyToQuote = (opt: SmartConcessionOption) => {
    saveConcessionSimulation(simulation, currentQuote?.customer?.companyName || 'Khách hàng', currentQuote?.quoteNumber);
    if (onApplyConcessionToQuote) {
      onApplyConcessionToQuote(opt.newFreightSellUsd, opt.tradeOffConditionVi);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner text-emerald-200">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Smart Concession & Margin Floor Guard</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/25 text-white rounded-full uppercase">
                  Phase 62
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Trợ Lý Đổi Trác Điều Khoản Win-Win & Phòng Thủ Sàn Biên Lợi Nhuận Khi Khách Đòi Giảm Giá
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">

          {/* Deal Input & Margin Floor Parameters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Giá Bán Cước Hiện Tại ($)</label>
              <input
                type="number"
                value={freightSell}
                onChange={e => setFreightSell(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Giá Vốn Cước ($)</label>
              <input
                type="number"
                value={freightCost}
                onChange={e => setFreightCost(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-slate-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Sàn Biên Lãi Tối Thiểu (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={marginFloor}
                  onChange={e => setMarginFloor(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-indigo-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Khách Đòi Giảm ($ / cont)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-xs">-$</span>
                <input
                  type="number"
                  value={requestedDiscount}
                  onChange={e => setRequestedDiscount(Number(e.target.value))}
                  className="w-full text-xs border border-rose-200 rounded-lg pl-8 pr-3 py-2 bg-rose-50 font-extrabold text-rose-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Số Lượng Container</label>
              <input
                type="number"
                min={1}
                value={containerQty}
                onChange={e => setContainerQty(Math.max(1, Number(e.target.value)))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold"
              />
            </div>
          </div>

          {/* Margin Floor Diagnosis Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
            simulation.isBreachingFloor
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-start gap-3">
              {simulation.isBreachingFloor ? (
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide">
                  {simulation.isBreachingFloor ? 'Cảnh Báo Vi Phạm Sàn Lợi Nhuận' : 'Biên Lợi Nhuận An Toàn'}
                </div>
                <div className="text-xs mt-0.5">
                  Lãi hiện tại: <strong>${simulation.currentProfitUsd} USD ({simulation.currentMarginPercent}%)</strong> ➔ Nếu giảm thẳng theo ý khách: Lãi còn{' '}
                  <strong className={simulation.isBreachingFloor ? 'text-rose-700' : 'text-emerald-700'}>
                    ${simulation.projectedProfitIfDirectDiscountUsd} USD ({simulation.projectedMarginIfDirectDiscountPercent}%)
                  </strong>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  {simulation.strategicAdviceVi}
                </div>
              </div>
            </div>

            <div className="bg-white/80 px-3 py-2 rounded-lg border border-current/15 shrink-0 text-right">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Giảm tiền mặt tối đa cho phép</div>
              <div className="text-base font-extrabold text-slate-900">
                ${simulation.allowedMaxDirectDiscountUsd} <span className="text-xs font-normal">USD/cont</span>
              </div>
            </div>
          </div>

          {/* 5 Win-Win Trade-off Strategies Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>5 Phương Án Đổi Trác Điều Khoản Đỉnh Cao (Không Cắt Máu Lợi Nhuận)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Bấm để xem kịch bản chi tiết</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {simulation.options.map(opt => {
                const isSelected = selectedStrategyType === opt.strategyType;
                return (
                  <button
                    key={opt.strategyType}
                    type="button"
                    onClick={() => setSelectedStrategyType(opt.strategyType)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 inline-block mb-1.5">
                        {opt.badgeVi}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {opt.titleVi}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="text-slate-500 text-[10px]">Biên lãi mới:</div>
                      <div className="font-extrabold text-emerald-700 text-xs">
                        {opt.newMarginPercent}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Trade-off Detail & Sales Pitch Script Box */}
          {activeOption && (
            <div className="bg-white rounded-xl border border-emerald-300 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                    Chi Tiết Phương Án: {activeOption.badgeVi}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                    {activeOption.titleVi}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    Giá Cước Đề Xuất: <strong className="text-emerald-700">${activeOption.newFreightSellUsd} USD</strong>
                  </span>
                  {onApplyConcessionToQuote && (
                    <button
                      type="button"
                      onClick={() => handleApplyToQuote(activeOption)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Áp Dụng Vào Báo Giá</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Conditions Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <span className="font-extrabold text-amber-900 uppercase text-[10px] tracking-wider block mb-1">
                    👉 ĐIỀU KIỆN KHÁCH HÀNG PHẢI ĐÁP ỨNG (TRADE-OFF):
                  </span>
                  <p className="text-slate-800 leading-relaxed font-semibold">
                    {activeOption.tradeOffConditionVi}
                  </p>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <span className="font-extrabold text-emerald-900 uppercase text-[10px] tracking-wider block mb-1">
                    🎁 QUYỀN LỢI CÔNG TY TRAO CHO KHÁCH (CONCESSION):
                  </span>
                  <p className="text-slate-800 leading-relaxed font-semibold">
                    {activeOption.concessionOfferedVi}
                  </p>
                  <div className="mt-1 text-[10px] text-emerald-800 font-bold">
                    Giá trị khách cảm nhận: ~${activeOption.customerPerceivedValueUsd} USD • Chi phí cty bỏ ra: chỉ ~${activeOption.companyActualCostUsd} USD!
                  </div>
                </div>
              </div>

              {/* Pitch Script for Sales */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lời Thoại Sales Đối Đáp Thuyết Phục (Nói Qua Điện Thoại Hoặc Nhắn Zalo)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeOption.salesPitchScriptVi, 'pitch')}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-md text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'pitch' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'pitch' ? 'Đã Chép' : 'Sao Chép Lời Thoại'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-700 italic font-sans leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                  "{activeOption.salesPitchScriptVi}"
                </p>
              </div>

              {/* Contract Clause Snippet */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    📄 Điều Khoản Thỏa Thuận Ghi Vào Phụ Lục Hợp Đồng
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeOption.contractClauseSnippetVi, 'clause')}
                    className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'clause' ? 'Đã chép điều khoản!' : 'Chép điều khoản'}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded">
                  {activeOption.contractClauseSnippetVi}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span>Quy tắc thương lượng chuẩn Harvard: Luôn đổi lấy điều kiện khác khi khách đòi giảm giá</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng Trợ Lý
          </button>
        </div>
      </div>
    </div>
  );
};
