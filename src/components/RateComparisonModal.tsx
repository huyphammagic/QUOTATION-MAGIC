import React, { useState } from 'react';
import { 
  RefreshCw, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ShieldAlert,
  Check
} from 'lucide-react';
import { RateComparisonDiff } from '../types/masterRate';
import { formatUSD, formatVND, formatPercent } from '../utils/formatters';

interface RateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffs: RateComparisonDiff[];
  onConfirmUpdate: (selectedLineItemIds: string[]) => void;
}

export const RateComparisonModal: React.FC<RateComparisonModalProps> = ({
  isOpen,
  onClose,
  diffs,
  onConfirmUpdate,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    return new Set(diffs.map(d => d.lineItemId));
  });

  if (!isOpen || diffs.length === 0) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
  };

  const handleSelectAll = () => {
    setSelectedItemIds(new Set(diffs.map(d => d.lineItemId)));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleApply = () => {
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    onConfirmUpdate(ids);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        id="rate-comparison-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <RefreshCw className="w-5 h-5 text-cyan-300 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Kiểm Tra & Cập Nhật Bảng Giá Mới (Rate Update Check)</h2>
              <p className="text-xs text-blue-100">
                Phát hiện {diffs.length} mục trong báo giá có thay đổi giá hoặc phiên bản mới trong Master Rate Database
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Nguyên tắc Bất Biến (Quotation Immutability):</strong> Báo giá hiện tại được bảo toàn nguyên trạng. Việc cập nhật lên bảng giá mới nhất chỉ diễn ra khi bạn chọn và xác nhận bên dưới.
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Chọn tất cả ({diffs.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-slate-500 hover:text-slate-700"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <span className="text-slate-600 font-medium">
            Đã chọn: <strong className="text-blue-700 font-bold">{selectedItemIds.size}</strong> mục
          </span>
        </div>

        {/* Diffs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-100">
          {diffs.map((diff) => {
            const isSelected = selectedItemIds.has(diff.lineItemId);
            const isPriceUp = diff.diffSellAmount > 0;
            const isPriceDown = diff.diffSellAmount < 0;

            return (
              <div 
                key={diff.lineItemId}
                className={`p-4 rounded-xl border transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected ? 'border-blue-300 shadow-2xs' : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Left details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(diff.lineItemId)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-800">
                        {diff.itemDescription}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {diff.currentRateCode || 'Master Rate'}
                      </span>
                      {diff.isExpiredNow && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Master Rate Đã Hết Hạn
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Phiên bản snapshot: <strong>v{diff.currentRateVersion || 1}</strong></span>
                      {diff.latestRateItem && diff.latestRateItem.version !== diff.currentRateVersion && (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-blue-700 font-bold">Mới nhất: v{diff.latestRateItem.version}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right price diff */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200 pl-7 md:pl-0">
                  {/* Current quote price */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Giá hiện tại</span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {diff.currentCurrency === 'USD' ? formatUSD(diff.currentUnitPrice) : formatVND(diff.currentUnitPrice)}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  {/* Latest master rate price */}
                  <div className="text-right">
                    <span className="text-[10px] text-blue-500 block uppercase font-bold">Giá mới nhất</span>
                    <span className="font-mono text-sm font-bold text-blue-700">
                      {diff.latestCurrency === 'USD' ? formatUSD(diff.latestUnitPrice) : formatVND(diff.latestUnitPrice)}
                    </span>
                  </div>

                  {/* Difference badge */}
                  <div className="text-right min-w-[90px]">
                    {diff.diffSellAmount !== 0 ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        isPriceUp 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isPriceUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {diff.diffSellAmount > 0 ? '+' : ''}
                        {diff.currentCurrency === 'USD' ? formatUSD(diff.diffSellAmount) : formatVND(diff.diffSellAmount)}
                        <span className="text-[10px]">({diff.diffSellPercent > 0 ? '+' : ''}{diff.diffSellPercent}%)</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Không đổi giá</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-200 font-semibold"
          >
            Giữ Nguyên Báo Giá Hiện Tại
          </button>
          <button
            onClick={handleApply}
            disabled={selectedItemIds.size === 0}
            className={`px-5 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 ${
              selectedItemIds.size > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Cập Nhật {selectedItemIds.size} Mục Đã Chọn
          </button>
        </div>
      </div>
    </div>
  );
};
