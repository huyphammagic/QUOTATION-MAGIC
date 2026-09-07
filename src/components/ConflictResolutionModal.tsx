import React from 'react';
import { QuoteData } from '../types/logistics';
import { AlertTriangle, ArrowRight, Check, Cloud, RefreshCw, X } from 'lucide-react';
import { formatUSD } from '../utils/formatters';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  localQuote: QuoteData;
  remoteQuote: QuoteData;
  onForceOverwrite: () => void;
  onReloadRemote: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  localQuote,
  remoteQuote,
  onForceOverwrite,
  onReloadRemote,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        id="conflict-resolution-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-amber-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Phát Hiện Xung Đột Dữ Liệu Đa Thiết Bị</h3>
              <p className="text-amber-100 text-xs">Cross-Device Concurrency Conflict (Bản ghi đã được cập nhật từ thiết bị khác)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <p className="font-medium">
              Báo giá <span className="font-mono font-bold">{localQuote.quoteNumber}</span> trên Firebase Cloud đã được chỉnh sửa và lưu từ một phiên đăng nhập hoặc thiết bị khác với phiên bản cao hơn.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Để đảm bảo tính nhất quán (Data Consistency) theo kiến trúc Cloud-First Phase 17, vui lòng chọn cách xử lý bên dưới.
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thiết Bị Này (Hiện Tại)</span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                  v{localQuote.version || 1}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách hàng:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[140px]">
                    {localQuote.customer.companyName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số dòng cước:</span>
                  <span className="font-medium text-slate-800">{localQuote.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tổng tiền USD:</span>
                  <span className="font-bold text-indigo-600">
                    {formatUSD(localQuote.grandTotalUsd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cập nhật lúc:</span>
                  <span className="font-medium text-slate-700">{localQuote.updatedDate || 'Hôm nay'}</span>
                </div>
              </div>
            </div>

            {/* Remote Cloud Version */}
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center space-x-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Bản Ghi Trên Cloud</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  v{remoteQuote.version || 1} (Mới hơn)
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách hàng:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[140px]">
                    {remoteQuote.customer?.companyName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số dòng cước:</span>
                  <span className="font-medium text-slate-800">{remoteQuote.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tổng tiền USD:</span>
                  <span className="font-bold text-emerald-600">
                    {formatUSD(remoteQuote.grandTotalUsd || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cập nhật lúc:</span>
                  <span className="font-medium text-slate-700">{remoteQuote.updatedDate || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Hủy thao tác
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onForceOverwrite}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <span>Ghi đè lên Cloud</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReloadRemote}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải bản Cloud mới nhất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
