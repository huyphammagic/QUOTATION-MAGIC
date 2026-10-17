import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  Layers, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Send, 
  Copy, 
  PhoneCall, 
  MessageSquare, 
  Sliders, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Ship, 
  DollarSign, 
  TrendingUp, 
  Check, 
  Plus, 
  Trash2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Eye,
  ThumbsUp,
  Award,
  RefreshCw
} from 'lucide-react';
import { QuoteData, LineItem } from '../../types/logistics';
import { 
  MultiOptionQuotationPackage, 
  MultiOptionItem, 
  MultiOptionTier 
} from '../../types/multiOptionQuote';
import { MultiOptionService } from '../../services/multiOption/multiOptionService';
import { exportMultiOptionPdf } from '../../utils/exportMultiOptionPdf';
import { exportMultiOptionExcel } from '../../utils/exportMultiOptionExcel';
import { formatUSD, formatVND } from '../../utils/formatters';
import { FolderFullscreenHeader } from '../tables/TableFullscreenHeader';

interface MultiOptionQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  onApplyOptionToQuote?: (selectedOption: MultiOptionItem, updatedItems: LineItem[]) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onNavigateToTable?: (targetId: string) => void;
}

export const MultiOptionQuoteModal: React.FC<MultiOptionQuoteModalProps> = ({
  isOpen,
  onClose,
  quote,
  onApplyOptionToQuote,
  isFullscreen,
  onToggleFullscreen,
  onNavigateToTable,
}) => {
  const [localFullscreen, setLocalFullscreen] = useState(true);
  const effectiveFullscreen = isFullscreen !== undefined ? isFullscreen : localFullscreen;
  const handleToggleFs = onToggleFullscreen || (() => setLocalFullscreen(!localFullscreen));

  const [activeTab, setActiveTab] = useState<'matrix' | 'customizer' | 'client_sim' | 'export_print'>('matrix');
  const [pkg, setPkg] = useState<MultiOptionQuotationPackage | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [copiedPitchType, setCopiedPitchType] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Initialize or load package
  useEffect(() => {
    if (isOpen && quote) {
      const existing = MultiOptionService.getPackageByQuoteId(quote.id);
      if (existing) {
        setPkg(existing);
        setSelectedOptionId(existing.selectedOptionId || existing.options.find(o => o.isRecommended)?.id || existing.options[0]?.id || '');
      } else {
        const generated = MultiOptionService.generateMultiOptionPackageFromQuote(quote);
        setPkg(generated);
        setSelectedOptionId(generated.selectedOptionId || generated.options.find(o => o.isRecommended)?.id || generated.options[0]?.id || '');
      }
    }
  }, [isOpen, quote]);

  if (!isOpen || !pkg) return null;

  const currentOption = pkg.options.find(o => o.id === selectedOptionId) || pkg.options[1] || pkg.options[0];

  const handleSelectOption = (optId: string) => {
    setSelectedOptionId(optId);
    if (!pkg) return;
    const updated = MultiOptionService.updateSelectedOption(pkg.id, optId);
    if (updated) setPkg(updated);
  };

  const handleSetRecommended = (optId: string) => {
    if (!pkg) return;
    const updated = {
      ...pkg,
      options: pkg.options.map(opt => ({
        ...opt,
        isRecommended: opt.id === optId
      })),
      updatedAt: new Date().toISOString()
    };
    MultiOptionService.savePackage(updated);
    setPkg(updated);
  };

  const handleUpdateOptionField = (optId: string, field: keyof MultiOptionItem, val: any) => {
    if (!pkg) return;
    const updated = {
      ...pkg,
      options: pkg.options.map(opt => {
        if (opt.id !== optId) return opt;
        return {
          ...opt,
          [field]: val
        };
      }),
      updatedAt: new Date().toISOString()
    };
    MultiOptionService.savePackage(updated);
    setPkg(updated);
  };

  const handleUpdateLineItemCost = (optId: string, itemIndex: number, field: 'unitPrice' | 'amountUsd' | 'amountVnd', val: number) => {
    if (!pkg) return;
    const updated = {
      ...pkg,
      options: pkg.options.map(opt => {
        if (opt.id !== optId) return opt;
        const newItems = [...opt.items];
        const target = { ...newItems[itemIndex] };
        (target as any)[field] = val;
        if (field === 'unitPrice') {
          target.amountUsd = val * (target.quantity || 1);
          target.amountVnd = Math.round(target.amountUsd * (pkg.exchangeRate || 25400));
        }
        newItems[itemIndex] = target;

        // Recalculate totals
        const totalUsd = newItems.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + (i.amountUsd || 0), 0);
        const totalVnd = newItems.filter(i => (i.currency || 'VND') === 'VND').reduce((s, i) => s + (i.amountVnd || 0), 0);

        return {
          ...opt,
          items: newItems,
          totalConvertedUsd: totalUsd + (totalVnd / (pkg.exchangeRate || 25400)),
          totalConvertedVnd: (totalUsd * (pkg.exchangeRate || 25400)) + totalVnd,
        };
      }),
      updatedAt: new Date().toISOString()
    };
    MultiOptionService.savePackage(updated);
    setPkg(updated);
  };

  const handleAddOptionExtraItem = (optId: string) => {
    if (!pkg) return;
    const newItem: LineItem = {
      id: `custom_charge_${Date.now()}`,
      code: 'EXTRA',
      description: 'Phí Dịch Vụ Gia Tăng Bổ Sung (Value-Added Logistics Fee)',
      unit: 'SHPT',
      currency: 'USD',
      quantity: 1,
      unitPrice: 45,
      amountUsd: 45,
      amountVnd: Math.round(45 * (pkg.exchangeRate || 25400)),
      category: 'OTHER',
      vatRate: 0
    };

    const updated = {
      ...pkg,
      options: pkg.options.map(opt => {
        if (opt.id !== optId) return opt;
        const newItems = [...opt.items, newItem];
        const totalUsd = newItems.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + (i.amountUsd || 0), 0);
        const totalVnd = newItems.filter(i => (i.currency || 'VND') === 'VND').reduce((s, i) => s + (i.amountVnd || 0), 0);
        return {
          ...opt,
          items: newItems,
          totalConvertedUsd: totalUsd + (totalVnd / (pkg.exchangeRate || 25400)),
          totalConvertedVnd: (totalUsd * (pkg.exchangeRate || 25400)) + totalVnd,
        };
      }),
      updatedAt: new Date().toISOString()
    };
    MultiOptionService.savePackage(updated);
    setPkg(updated);
  };

  const handleRemoveOptionItem = (optId: string, itemIndex: number) => {
    if (!pkg) return;
    const updated = {
      ...pkg,
      options: pkg.options.map(opt => {
        if (opt.id !== optId) return opt;
        const newItems = opt.items.filter((_, idx) => idx !== itemIndex);
        const totalUsd = newItems.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + (i.amountUsd || 0), 0);
        const totalVnd = newItems.filter(i => (i.currency || 'VND') === 'VND').reduce((s, i) => s + (i.amountVnd || 0), 0);
        return {
          ...opt,
          items: newItems,
          totalConvertedUsd: totalUsd + (totalVnd / (pkg.exchangeRate || 25400)),
          totalConvertedVnd: (totalUsd * (pkg.exchangeRate || 25400)) + totalVnd,
        };
      }),
      updatedAt: new Date().toISOString()
    };
    MultiOptionService.savePackage(updated);
  };

  const handleRegenerateFromQuote = () => {
    if (!window.confirm('Bạn có chắc muốn tạo lại 3 phương án mặc định từ dữ liệu báo giá hiện tại? Các chỉnh sửa thủ công sẽ được làm mới.')) {
      return;
    }
    const fresh = MultiOptionService.generateMultiOptionPackageFromQuote(quote);
    setPkg(fresh);
    setSelectedOptionId(fresh.selectedOptionId || fresh.options[1]?.id || fresh.options[0]?.id || '');
  };

  const handleCopyPitch = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchType(type);
    setTimeout(() => setCopiedPitchType(null), 2500);
  };

  const handleExportPdf = async () => {
    if (!pkg) return;
    try {
      setIsExportingPdf(true);
      await exportMultiOptionPdf(pkg);
    } catch (err) {
      console.error('Lỗi xuất PDF', err);
      alert('Không thể tạo file PDF. Vui lòng kiểm tra lại cấu hình.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!pkg) return;
    try {
      setIsExportingExcel(true);
      await exportMultiOptionExcel(pkg);
    } catch (err) {
      console.error('Lỗi xuất Excel', err);
      alert('Không thể tạo file Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleApplyToActiveQuote = (opt: MultiOptionItem) => {
    if (onApplyOptionToQuote) {
      onApplyOptionToQuote(opt, opt.items);
      setAppliedNotification(`Đã áp dụng thành công phương án [${opt.tierNameVi}] vào Bảng Tính Báo Giá!`);
      setTimeout(() => setAppliedNotification(null), 4000);
    }
  };

  return (
    <div 
      className={effectiveFullscreen
        ? "fixed inset-0 z-50 flex flex-col p-0 m-0 w-screen h-screen overflow-hidden bg-slate-950"
        : "fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      }
    >
      <div 
        className={effectiveFullscreen
          ? "bg-white w-screen h-screen max-w-none max-h-none rounded-none flex flex-col overflow-hidden border-0"
          : "bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden"
        }
      >
        {/* Fullscreen Folder Navigation & URL Header */}
        <FolderFullscreenHeader
          folderName="Thư Mục Báo Giá Đa Phương Án (Good - Better - Best)"
          folderCategory="Báo Giá & CRM"
          folderId="multi-option"
          routeId="multi_option_quotation"
          recordCount={pkg.options.length}
          isFullscreen={effectiveFullscreen}
          onToggleFullscreen={handleToggleFs}
          onClose={onClose}
          onNavigateToFolder={onNavigateToTable}
        />
        
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Báo Giá Đa Phương Án So Sánh (Good - Better - Best)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {pkg.packageCode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Tăng Win-Rate Chốt Đơn
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Khách hàng: <strong className="text-white">{pkg.customer?.companyName || (pkg.customer as any)?.customerName || 'Chưa định danh'}</strong> • Tuyến: <strong className="text-white">{pkg.shipment?.pol} ➔ {pkg.shipment?.pod}</strong> • Hàng: <strong className="text-white">{pkg.cargoSummary}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerateFromQuote}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Làm mới lại các phương án theo báo giá gốc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tạo lại từ gốc</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Ma Trận So Sánh (3 Options)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'customizer'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Tùy Biến Cước & Dịch Vụ Từng Gói</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('client_sim')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'client_sim'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Góc Nhìn Khách & Kịch Bản Chốt Sales</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export_print')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'export_print'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Xuất Báo Giá PDF & Excel</span>
            </button>
          </div>

          {/* Quick Stats or Actions */}
          <div className="flex items-center gap-2">
            {appliedNotification && (
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-in fade-in">
                {appliedNotification}
              </span>
            )}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Đang tạo...' : 'Tải PDF Ma Trận A4'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Modal Body - Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">

          {/* TAB 1: MA TRẬN SO SÁNH BA PHƯƠNG ÁN (GOOD - BETTER - BEST) */}
          {activeTab === 'matrix' && (
            <div className="space-y-6">
              {/* Intro Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-900/90 to-blue-900 rounded-xl text-white shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-indigo-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-300" />
                    Chiến Lược Chốt Đơn Hiệu Quả Nhất Ngành Forwarding
                  </h3>
                  <p className="text-xs text-indigo-200 mt-1 max-w-3xl leading-relaxed">
                    Thay vì gửi 1 báo giá đơn lẻ khiến khách hàng đi so sánh giá với đối thủ bên ngoài, hãy trao cho khách <strong>3 phương án có chủ đích</strong> (Tiết Kiệm - Tối Ưu - Siêu Tốc). Khách hàng sẽ tập trung so sánh nội bộ giữa các gói của bạn và tự tin chọn gói <strong>Tối Ưu / Cân Bằng</strong> với tỷ lệ chuyển đổi cao gấp 2.4 lần!
                  </p>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1 text-right">
                  <span className="text-[11px] text-indigo-300">Phương án được khách chọn hiện tại:</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-amber-400 text-slate-900 shadow-xs">
                    {currentOption?.tierNameVi || 'Chưa chọn'}
                  </span>
                </div>
              </div>

              {/* Three Option Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {pkg.options.map((option) => {
                  const isSelected = option.id === selectedOptionId;
                  const isRec = option.isRecommended;

                  let borderCls = 'border-slate-200 bg-white shadow-xs';
                  let headerBadgeCls = 'bg-slate-100 text-slate-700 border-slate-300';
                  let bannerColor = 'bg-slate-800 text-white';

                  if (option.tier === 'ECONOMY') {
                    borderCls = isSelected ? 'border-emerald-500 ring-2 ring-emerald-400 bg-white' : 'border-slate-200 bg-white';
                    headerBadgeCls = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                  } else if (option.tier === 'BALANCED') {
                    borderCls = isSelected ? 'border-indigo-600 ring-2 ring-indigo-500 bg-white shadow-lg' : 'border-indigo-300 bg-white shadow-md';
                    headerBadgeCls = 'bg-indigo-100 text-indigo-900 border-indigo-400';
                    bannerColor = 'bg-indigo-600 text-white';
                  } else if (option.tier === 'PREMIUM') {
                    borderCls = isSelected ? 'border-amber-500 ring-2 ring-amber-400 bg-white' : 'border-amber-200 bg-white';
                    headerBadgeCls = 'bg-amber-50 text-amber-900 border-amber-300';
                    bannerColor = 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
                  }

                  return (
                    <div 
                      key={option.id}
                      className={`rounded-2xl border flex flex-col transition-all relative overflow-hidden ${borderCls}`}
                    >
                      {/* Top Ribbon for Recommended */}
                      {isRec && (
                        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white py-1.5 px-4 text-center text-xs font-black tracking-wide uppercase shadow-xs flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          <span>★ ĐỀ XUẤT CHÍNH (KHUYÊN CHỌN) ★</span>
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col">
                        {/* Option Title and Tier Tag */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase border mb-1.5 ${headerBadgeCls}`}>
                              {option.tier} • {option.tierNameVi}
                            </span>
                            <h4 className="text-base font-bold text-slate-900 leading-snug">
                              {option.serviceType}
                            </h4>
                            <p className="text-xs text-slate-500 italic mt-0.5">
                              "{option.tagline}"
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleSetRecommended(option.id)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              isRec 
                                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                : 'bg-slate-50 text-slate-400 hover:text-slate-700 border-slate-200'
                            }`}
                            title={isRec ? 'Đang là phương án đề xuất chính' : 'Đặt làm phương án đề xuất chính cho khách'}
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price Block */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 mb-4">
                          <div className="text-[11px] text-slate-500 font-medium">Tổng cước phí ước tính:</div>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                              {formatUSD(option.totalConvertedUsd)}
                            </span>
                            {option.totalConvertedVnd > 0 && (
                              <span className="text-xs font-semibold text-slate-600">
                                + {formatVND(option.totalConvertedVnd)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                            <span>Chênh lệch cước:</span>
                            <span className="font-bold text-slate-700">
                              {option.tier === 'ECONOMY' ? 'Giá vốn sàn (Benchmark)' : option.tier === 'BALANCED' ? '+2.8% (Tối ưu dịch vụ)' : '+14.5% (Tàu nhanh, bảo hiểm VIP)'}
                            </span>
                          </div>
                        </div>

                        {/* Key Operational Specs */}
                        <div className="space-y-2 text-xs border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Ship className="w-3.5 h-3.5 text-slate-400" /> Hãng vận chuyển:
                            </span>
                            <span className="font-bold text-slate-800">{option.carrier}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> Thời gian transit:
                            </span>
                            <span className="font-bold text-slate-800">{option.transitTimeText} ({option.transitDays} ngày)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Lịch tàu / Cut-off:
                            </span>
                            <span className="font-medium text-slate-700">{option.departureSchedule} • {option.closingCutoff}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Miễn phí lưu vỏ/bãi:
                            </span>
                            <span className="font-bold text-indigo-600">{option.freeTimeDemDet}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Cam kết chỗ & cont:</span>
                            <span className="font-semibold text-slate-800">{option.spaceGuarantee}</span>
                          </div>
                        </div>

                        {/* Ratings Scorecards */}
                        <div className="mb-4 space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-bold text-slate-700 mb-1">Chỉ số đánh giá (Scorecard):</div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Mức độ Tiết Kiệm:</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${(option.rating?.costScore || 8) * 10}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{option.rating?.costScore || 8}/10</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Tốc độ & Transit:</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${(option.rating?.speedScore || 7) * 10}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{option.rating?.speedScore || 7}/10</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Độ tin cậy & Chỗ:</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${(option.rating?.reliabilityScore || 9) * 10}%` }} />
                              </div>
                              <span className="font-bold text-slate-700">{option.rating?.reliabilityScore || 9}/10</span>
                            </div>
                          </div>
                        </div>

                        {/* Highlights (Điểm mạnh) */}
                        <div className="mb-4">
                          <div className="text-[11px] font-bold text-slate-700 mb-1.5">Lợi thế nổi bật:</div>
                          <ul className="space-y-1">
                            {(option.valueAddHighlights || []).map((hl, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Caveats (Lưu ý) */}
                        <div className="mb-4">
                          <div className="text-[11px] font-bold text-slate-500 mb-1">Cân nhắc / Hạn chế:</div>
                          <ul className="space-y-1">
                            {option.caveats.map((cv, i) => (
                              <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                                <span className="text-amber-500 font-bold shrink-0">•</span>
                                <span>{cv}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectOption(option.id)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-4 h-4 text-white" />
                                <span>Khách Chọn Gói Này</span>
                              </>
                            ) : (
                              <span>Chọn phương án này</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyToActiveQuote(option)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Đẩy chi phí của phương án này vào báo giá đang mở để xuất chứng từ"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Đưa vào Báo Giá Hiện Tại</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pitch Script Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Gợi Ý Lời Thoại Telesales & Chốt Đơn Đa Phương Án
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    Bấm copy để gửi Zalo hoặc đọc khi gọi điện
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        Mẫu Tin Nhắn Zalo / Email (Đa Lựa Chọn)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPitch(pkg.pitchDecks.zaloMessage, 'zalo')}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPitchType === 'zalo' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPitchType === 'zalo' ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {pkg.pitchDecks.zaloMessage}
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                        Kịch Bản Gọi Điện (Chốt Gói Tối Ưu)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPitch(pkg.pitchDecks.phoneScript, 'call')}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPitchType === 'call' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPitchType === 'call' ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {pkg.pitchDecks.phoneScript}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TÙY BIẾN CHI TIẾT CƯỚC & DỊCH VỤ CỦA TỪNG PHƯƠNG ÁN */}
          {activeTab === 'customizer' && (
            <div className="space-y-6">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Tùy Biến Thông Số Vận Hành & Bảng Cước Từng Phương Án
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chỉnh sửa hãng tàu, thời gian transit, hạn miễn phí lưu cont hoặc điều chỉnh giá từng mục cước để phù hợp nhất với thỏa thuận thực tế.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Đang chọn gói:</span>
                  <select
                    value={selectedOptionId}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                  >
                    {pkg.options.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.tierNameVi} ({opt.carrier}) - {formatUSD(opt.totalConvertedUsd)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editing details for current selected option */}
              {currentOption && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                  {/* Top Attributes Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên phương án (Tier Label)
                      </label>
                      <input
                        type="text"
                        value={currentOption.tierNameVi}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'tierNameVi', e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hãng tàu / Carrier
                      </label>
                      <input
                        type="text"
                        value={currentOption.carrier}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'carrier', e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transit Time (Ngày)
                      </label>
                      <input
                        type="text"
                        value={currentOption.transitTimeText}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'transitTimeText', e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Miễn phí lưu DEM/DET
                      </label>
                      <input
                        type="text"
                        value={currentOption.freeTimeDemDet}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'freeTimeDemDet', e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tần suất & Lịch chạy
                      </label>
                      <input
                        type="text"
                        value={currentOption.departureSchedule}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'departureSchedule', e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Lịch đóng hàng Cut-off
                      </label>
                      <input
                        type="text"
                        value={currentOption.closingCutoff}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'closingCutoff', e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cam kết chỗ & Container
                      </label>
                      <input
                        type="text"
                        value={currentOption.spaceGuarantee}
                        onChange={(e) => handleUpdateOptionField(currentOption.id, 'spaceGuarantee', e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Line Items Table for this option */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Chi tiết các khoản mục cước & phụ phí của gói [{currentOption.tierNameVi}]
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleAddOptionExtraItem(currentOption.id)}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Phí / Dịch Vụ Mới</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">Khoản Mục Phí (Charge Description)</th>
                            <th className="p-3 w-24">Đơn vị</th>
                            <th className="p-3 w-28 text-right">Đơn Giá</th>
                            <th className="p-3 w-20 text-center">Tiền Tệ</th>
                            <th className="p-3 w-32 text-right">Thành Tiền</th>
                            <th className="p-3 w-12 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentOption.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/70">
                              <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800">{item.description}</div>
                                {item.code && (
                                  <div className="text-[11px] text-slate-400 font-mono">[{item.code}]</div>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">{item.unit || 'CNTR'}</td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  value={item.unitPrice || 0}
                                  onChange={(e) => handleUpdateLineItemCost(currentOption.id, idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right font-mono font-semibold px-2 py-1 border border-slate-300 rounded text-xs"
                                />
                              </td>
                              <td className="p-3 text-center font-bold text-slate-700">{item.currency || 'USD'}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {item.currency === 'VND' ? formatVND(item.amountVnd || 0) : formatUSD(item.amountUsd || 0)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionItem(currentOption.id, idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Xóa mục này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="p-3 text-right">Tổng cộng gói:</td>
                            <td className="p-3 text-right font-mono text-sm text-indigo-700">
                              {formatUSD(currentOption.totalConvertedUsd)}
                              {currentOption.totalConvertedVnd > 0 && ` + ${formatVND(currentOption.totalConvertedVnd)}`}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GÓC NHÌN KHÁCH HÀNG & BỘ CÔNG CỤ CHỐT SALES */}
          {activeTab === 'client_sim' && (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-900 rounded-xl text-white shadow-xs">
                <h3 className="font-bold text-sm text-emerald-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-300" />
                  Mô Phỏng Giao Diện Khách Hàng (Customer Decision Portal)
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  Đây là cách khách hàng nhìn thấy bảng so sánh trực quan và bấm chọn chốt đơn. Việc để khách tự bấm nút chọn gói tạo cảm giác "chủ động quyết định" thay vì "bị bán hàng".
                </p>
              </div>

              {/* Simulation Interactive Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h3 className="text-lg font-black text-slate-900">
                    Kính gửi Quý Khách Hàng: {pkg.customer?.companyName || (pkg.customer as any)?.customerName || 'Quý Doanh Nghiệp'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    BOGI Logistics trân trọng gửi 3 phương án vận chuyển tối ưu cho lô hàng {pkg.cargoSummary} từ {pkg.shipment?.pol} ➔ {pkg.shipment?.pod}. Quý khách vui lòng chọn phương án phù hợp nhất:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pkg.options.map(opt => {
                    const isPicked = opt.id === selectedOptionId;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                          isPicked
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-400'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {opt.isRecommended && (
                          <div className="absolute -top-3 right-4 bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                            PHÙ HỢP NHẤT
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {opt.tierNameVi}
                          </div>
                          <div className="text-xl font-black text-slate-900 mt-1">
                            {formatUSD(opt.totalConvertedUsd)}
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-1">
                            Hãng tàu: <strong className="text-slate-900">{opt.carrier}</strong>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Thời gian: <strong className="text-indigo-600">{opt.transitTimeText}</strong>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Free Time: <strong className="text-emerald-600">{opt.freeTimeDemDet}</strong>
                          </div>

                          <div className="my-4 border-t border-slate-200 pt-3 space-y-1.5">
                            {(opt.valueAddHighlights || []).map((h, i) => (
                              <div key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`w-full py-2 rounded-xl text-xs font-black transition mt-4 ${
                            isPicked
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isPicked ? '✓ ĐÃ CHỌN PHƯƠNG ÁN NÀY' : 'BẤM CHỌN GÓI NÀY'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Booking confirmation simulation */}
                <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Phương án chốt hiện tại: <span className="text-indigo-600 font-black">{currentOption.tierNameVi} ({currentOption.carrier})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tổng chi phí: {formatUSD(currentOption.totalConvertedUsd)} • Cam kết giao trước hạn • Miễn phí DEM/DET {currentOption.freeTimeDemDet}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyToActiveQuote(currentOption)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Xác Nhận & Đẩy Sang Báo Giá Chính</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: XUẤT BẢN IN PDF A4 & FILE EXCEL ĐỐI SOÁT */}
          {activeTab === 'export_print' && (
            <div className="space-y-6">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-indigo-600" />
                    Xuất Bản So Sánh Đa Phương Án Chuẩn Khổ Ngang (A4 Landscape)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tài liệu được căn chỉnh chính xác theo tỉ lệ mm, không bị co chữ hay chồng chéo dòng, đảm bảo chuẩn ngành Logistics chuyên nghiệp.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải File PDF (A4 Ngang)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Tải Bảng Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Visual Preview Container */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 space-y-6 max-w-5xl mx-auto shadow-inner">
                  {/* Paper Header */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">
                        BOGI LOGISTICS & FORWARDING CO., LTD
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        VP: Friendship Tower, 31 Le Duan, Ben Nghe, District 1, HCMC | Hotline: +84 28 3822 8899
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-indigo-700 uppercase">
                        BẢNG SO SÁNH ĐA PHƯƠNG ÁN VẬN CHUYỂN
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800">
                        Mã: {pkg.packageCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Ngày phát hành: {pkg.createdDate}
                      </div>
                    </div>
                  </div>

                  {/* Customer Meta Table */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400">Khách hàng:</span> <strong className="text-slate-800">{pkg.customer?.companyName || (pkg.customer as any)?.customerName || 'Quý Doanh Nghiệp'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Tuyến vận tải:</span> <strong className="text-slate-800">{pkg.shipment?.pol} ➔ {pkg.shipment?.pod}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Chi tiết hàng:</span> <strong className="text-slate-800">{pkg.cargoSummary}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Chuyên viên phụ trách:</span> <strong className="text-slate-800">{pkg.salesRepName} ({pkg.salesRepPhone})</strong>
                    </div>
                  </div>

                  {/* 3 Columns Preview */}
                  <div className="grid grid-cols-3 gap-3">
                    {pkg.options.map(opt => (
                      <div key={opt.id} className="border border-slate-300 rounded-xl p-3.5 bg-white flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] font-black uppercase text-indigo-700 border-b border-slate-100 pb-1">
                            {opt.tierNameVi}
                          </div>
                          <div className="text-base font-black text-slate-900 my-1">
                            {formatUSD(opt.totalConvertedUsd)}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Hãng tàu: <strong>{opt.carrier}</strong>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Transit: <strong>{opt.transitTimeText}</strong>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Free-Time: <strong className="text-emerald-700">{opt.freeTimeDemDet}</strong>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Ưu điểm:</div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            {(opt.valueAddHighlights || []).join(' • ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note and sign preview */}
                  <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
                    <p><strong>* Ghi chú thương mại:</strong> Báo giá có hiệu lực trong vòng 14 ngày kể từ ngày phát hành. Cước phí chưa bao gồm thuế GTGT và các phụ phí phát sinh ngoài biểu phí đã thông báo.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đang kích hoạt gói: <strong className="text-slate-800">{currentOption?.tierNameVi}</strong> ({formatUSD(currentOption?.totalConvertedUsd || 0)})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => handleApplyToActiveQuote(currentOption)}
              className="px-5 py-2 text-white bg-slate-900 hover:bg-slate-800 font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Áp Dụng Phương Án Này Vào Báo Giá</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

function CalendarIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}
