import React, { useState } from 'react';
import { 
  Menu, 
  Plus, 
  Eye, 
  Save, 
  MoreHorizontal, 
  RotateCcw, 
  FileDown, 
  Send, 
  Zap, 
  Users, 
  Receipt, 
  Sparkles, 
  X,
  CreditCard,
  Building2,
  Ship,
  Compass
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { formatUSD, formatVND } from '../../utils/formatters';

interface MobileBottomBarProps {
  quote: QuoteData;
  isSaving?: boolean;
  onOpenSidebar: () => void;
  onOpenAddFee: () => void;
  onOpenPreview: () => void;
  onSaveQuote: () => void;
  onOpenGeneratePdf?: () => void;
  onOpenSendModal?: () => void;
  onOpenRoutePresets?: () => void;
  onOpenCustomer360?: () => void;
  onOpenMultiOption?: () => void;
  onOpenDebitNote?: () => void;
  onOpenSavedQuotes?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  quote,
  isSaving = false,
  onOpenSidebar,
  onOpenAddFee,
  onOpenPreview,
  onSaveQuote,
  onOpenGeneratePdf,
  onOpenSendModal,
  onOpenRoutePresets,
  onOpenCustomer360,
  onOpenMultiOption,
  onOpenDebitNote,
  onOpenSavedQuotes,
}) => {
  const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);

  const totalAmount = quote.quoteCurrency === 'USD' 
    ? formatUSD(quote.grandTotalUsd || quote.subtotalUsd || 0) 
    : formatVND(quote.grandTotalVnd || quote.subtotalVnd || 0);

  return (
    <>
      {/* Mobile Actions Bottom Sheet Backdrop */}
      {isActionsSheetOpen && (
        <div 
          onClick={() => setIsActionsSheetOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Actions Bottom Sheet Modal */}
      {isActionsSheetOpen && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 pb-6 space-y-4 max-h-[85vh] overflow-y-auto lg:hidden animate-in slide-in-from-bottom duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Sheet Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Thao Tác Nhanh Trên Điện Thoại
              </h3>
              <p className="text-[11px] text-slate-500">
                Báo giá: <strong className="text-slate-800">{quote.quoteNumber || 'Bản nháp'}</strong> • Tổng: <strong className="text-blue-600">{totalAmount}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActionsSheetOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {onOpenGeneratePdf && (
              <button
                type="button"
                onClick={() => { onOpenGeneratePdf(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileDown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Xuất PDF</div>
                  <div className="text-[10px] text-slate-400">Tải file in A4</div>
                </div>
              </button>
            )}

            {onOpenSendModal && (
              <button
                type="button"
                onClick={() => { onOpenSendModal(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Gửi Khách</div>
                  <div className="text-[10px] text-slate-400">Email & Link trực tuyến</div>
                </div>
              </button>
            )}

            {onOpenRoutePresets && (
              <button
                type="button"
                onClick={() => { onOpenRoutePresets(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <div className="font-bold text-amber-950">Gói Tuyến 1-Click</div>
                  <div className="text-[10px] text-amber-800">Tự điền cước & phụ phí</div>
                </div>
              </button>
            )}

            {onOpenCustomer360 && (
              <button
                type="button"
                onClick={() => { onOpenCustomer360(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-900 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-indigo-950">Khách Hàng 360°</div>
                  <div className="text-[10px] text-indigo-800">Hồ sơ & lịch sử giao dịch</div>
                </div>
              </button>
            )}

            {onOpenMultiOption && (
              <button
                type="button"
                onClick={() => { onOpenMultiOption(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">3 Phương Án</div>
                  <div className="text-[10px] text-slate-400">So sánh gói cước</div>
                </div>
              </button>
            )}

            {onOpenDebitNote && (
              <button
                type="button"
                onClick={() => { onOpenDebitNote(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Debit Note</div>
                  <div className="text-[10px] text-slate-400">Tạo giấy báo nợ & QR</div>
                </div>
              </button>
            )}

            {onOpenSavedQuotes && (
              <button
                type="button"
                onClick={() => { onOpenSavedQuotes(); setIsActionsSheetOpen(false); }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition col-span-2"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Danh Sách Báo Giá Đã Lưu</div>
                  <div className="text-[10px] text-slate-500">Tra cứu, lọc trạng thái và nhân bản báo giá</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl px-2 py-1.5 lg:hidden select-none"
        aria-label="Thanh điều hướng di động"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
          
          {/* Button 1: Menu (Open Sidebar) */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            aria-label="Mở Menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Menu</span>
          </button>

          {/* Button 2: Preview (Xem Bản In) */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            aria-label="Xem trước báo giá"
          >
            <Eye className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Xem Trước</span>
          </button>

          {/* Button 3: CENTER HERO ACTION: + Thêm Phí */}
          <button
            type="button"
            onClick={onOpenAddFee}
            className="flex flex-col items-center justify-center -mt-4 py-1.5 px-1 rounded-2xl bg-linear-to-b from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30 active:scale-90 transition transform cursor-pointer border-2 border-white"
            aria-label="Thêm chi phí vào báo giá"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-0.5">
              <Plus className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <span className="text-[10px] font-extrabold tracking-tight">Thêm Phí</span>
          </button>

          {/* Button 4: Save (Lưu Cloud) */}
          <button
            type="button"
            onClick={onSaveQuote}
            disabled={isSaving}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-50 transition cursor-pointer"
            aria-label="Lưu báo giá"
          >
            {isSaving ? (
              <RotateCcw className="w-5 h-5 text-indigo-600 animate-spin" />
            ) : (
              <Save className="w-5 h-5 text-emerald-600" />
            )}
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">
              {isSaving ? 'Đang lưu' : 'Lưu Cloud'}
            </span>
          </button>

          {/* Button 5: More Actions (Thao Tác Nhanh) */}
          <button
            type="button"
            onClick={() => setIsActionsSheetOpen(!isActionsSheetOpen)}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            aria-label="Thao tác khác"
          >
            <MoreHorizontal className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Thao Tác</span>
          </button>

        </div>
      </nav>
    </>
  );
};
