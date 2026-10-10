import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Calculator, 
  ShieldAlert, 
  Check, 
  Copy, 
  ArrowRight, 
  X, 
  FileSpreadsheet, 
  Percent, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  HelpCircle, 
  ExternalLink,
  DollarSign,
  Scale,
  Clock,
  Layers,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  Award,
  Zap,
  Tag,
  SlidersHorizontal,
  PackageCheck,
  Cpu,
  Shirt,
  Apple,
  Cog,
  Car,
  Boxes,
  FlaskConical,
  Home,
  Stethoscope
} from 'lucide-react';
import { 
  HsCodeTariffItem, 
  CustomsTaxCalculationResult 
} from '../../types/customsTariff';
import { QuoteData, LineItem } from '../../types/logistics';
import { 
  COMMON_HS_CODE_DATABASE, 
  TARIFF_CATEGORIES, 
  TariffCategoryMeta 
} from '../../data/commonHsTariffs';
import { 
  lookupHsCodeWithAi, 
  calculateCustomsTaxes,
  searchMasterHsTariffs,
  normalizeHsDigits,
  removeVietnameseDiacritics
} from '../../services/customsTariff/customsTariffService';

interface HsCodeTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  onApplyLineItemsToQuote?: (items: LineItem[]) => void;
  onApplyHsCodeToShipment?: (hsCode: string, commodityDescription?: string) => void;
}

export const HsCodeTariffModal: React.FC<HsCodeTariffModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyLineItemsToQuote,
  onApplyHsCodeToShipment,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(currentQuote.shipment.commodity || 'Pin Lithium');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [aiCustomItems, setAiCustomItems] = useState<HsCodeTariffItem[] | null>(null);
  const [rulingAdviceOverride, setRulingAdviceOverride] = useState<string | null>(null);
  const [detectedCategoryOverride, setDetectedCategoryOverride] = useState<string | null>(null);

  // Instant deterministic search across master tariff schedule
  const localSearchResult = useMemo(() => {
    return searchMasterHsTariffs(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Combined candidate items: priority to AI if explicitly fetched, otherwise instant local match
  const candidateItems = useMemo(() => {
    if (aiCustomItems && aiCustomItems.length > 0) {
      return aiCustomItems;
    }
    return localSearchResult.items;
  }, [aiCustomItems, localSearchResult.items]);

  // Selected HS item for calculator
  const [selectedHsItem, setSelectedHsItem] = useState<HsCodeTariffItem>(() => {
    return localSearchResult.exactMatch || localSearchResult.items[0] || COMMON_HS_CODE_DATABASE[0];
  });

  // When exact match is found locally, auto-select it for immediate calculator synchronization
  useEffect(() => {
    if (localSearchResult.exactMatch) {
      setSelectedHsItem(localSearchResult.exactMatch);
    } else if (candidateItems.length > 0 && !candidateItems.some(i => i.id === selectedHsItem?.id)) {
      setSelectedHsItem(candidateItems[0]);
    }
  }, [localSearchResult.exactMatch, candidateItems]);

  // Advice & Category labels
  const rulingAdvice = rulingAdviceOverride || localSearchResult.rulingAdvice;
  const detectedCategory = detectedCategoryOverride || localSearchResult.detectedCategory;

  // Calculator Inputs
  const [cifValueUsd, setCifValueUsd] = useState<number>(() => {
    const gw = currentQuote.shipment.grossWeightKg || 1000;
    return Math.max(1000, Math.round(gw * 2.5));
  });
  const [quantity, setQuantity] = useState<number>(() => currentQuote.shipment.quantity || 100);
  const [selectedAgreement, setSelectedAgreement] = useState<string>('MFN');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const exchangeRate = currentQuote.exchangeRate || 25400;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Perform AI Deep Lookup
  const handlePerformAiLookup = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearchingAi(true);
    try {
      const res = await lookupHsCodeWithAi(q, currentQuote.shipment.pol);
      setAiCustomItems(res.items);
      if (res.items.length > 0) {
        setSelectedHsItem(res.items[0]);
        setSelectedAgreement('MFN');
      }
      setRulingAdviceOverride(res.rulingAdvice);
      setDetectedCategoryOverride(res.detectedCategory);
      showToast(res.isExactMatch ? 'Đã tìm thấy mã HS chính xác 100%!' : 'Đã phân loại mã HS thành công!');
    } catch (err: any) {
      showToast('Lỗi khi tra cứu mã HS AI.');
    } finally {
      setIsSearchingAi(false);
    }
  };

  // Reset AI override on user manual typing to re-enable 0ms instant local search
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setAiCustomItems(null);
    setRulingAdviceOverride(null);
    setDetectedCategoryOverride(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAiCustomItems(null);
    setRulingAdviceOverride(null);
    setDetectedCategoryOverride(null);
  };

  // Auto trigger lookup when opened if quote has commodity
  useEffect(() => {
    if (isOpen && currentQuote.shipment.commodity) {
      setSearchQuery(currentQuote.shipment.commodity);
      setAiCustomItems(null);
    }
  }, [isOpen, currentQuote.shipment.commodity]);

  // Real-time Tax Calculation Result
  const taxCalculation: CustomsTaxCalculationResult = useMemo(() => {
    if (!selectedHsItem) {
      return {
        cifValueVnd: 0,
        cifValueUsd: 0,
        appliedDutyRate: 0,
        appliedDutyName: 'N/A',
        importDutyVnd: 0,
        importDutyUsd: 0,
        specialConsumptionTaxVnd: 0,
        specialConsumptionTaxUsd: 0,
        environmentalTaxVnd: 0,
        environmentalTaxUsd: 0,
        vatTaxVnd: 0,
        vatTaxUsd: 0,
        totalCustomsTaxVnd: 0,
        totalCustomsTaxUsd: 0,
        effectiveTaxRatePercent: 0,
        suggestedLineItems: [],
      };
    }

    return calculateCustomsTaxes({
      cifValueUsd: Math.max(0, cifValueUsd),
      exchangeRate,
      quantity: Math.max(1, quantity),
      appliedAgreementCode: selectedAgreement,
      hsItem: selectedHsItem,
    });
  }, [cifValueUsd, exchangeRate, quantity, selectedAgreement, selectedHsItem]);

  // Apply to quotation lines
  const handleApplyToQuotation = () => {
    if (!taxCalculation || taxCalculation.suggestedLineItems.length === 0) {
      showToast('Không có dòng chi phí thuế nào để thêm.');
      return;
    }

    if (onApplyLineItemsToQuote) {
      onApplyLineItemsToQuote(taxCalculation.suggestedLineItems);
    }
    if (onApplyHsCodeToShipment && selectedHsItem) {
      onApplyHsCodeToShipment(selectedHsItem.hsCode, selectedHsItem.descriptionVi);
    }

    showToast(`Đã thêm ${taxCalculation.suggestedLineItems.length} khoản thuế & phí hải quan vào Báo giá!`);
    onClose();
  };

  // Just apply HS code to shipment form
  const handleApplyHsOnly = () => {
    if (selectedHsItem && onApplyHsCodeToShipment) {
      onApplyHsCodeToShipment(selectedHsItem.hsCode, selectedHsItem.descriptionVi);
      showToast(`Đã gán mã HS ${selectedHsItem.hsCode} vào thông tin lô hàng!`);
      onClose();
    }
  };

  // Quick Preset Tags with exact HS codes
  const QUICK_TAGS = [
    { label: 'Pin Lithium (8507.60.90)', query: '8507.60.90' },
    { label: 'Laptop (8471.30.20)', query: '8471.30.20' },
    { label: 'Sầu Riêng Tươi (0810.60.00)', query: '0810.60.00' },
    { label: 'Áo Thun Cotton (6109.10.00)', query: '6109.10.00' },
    { label: 'Xe Nâng Diesel (8427.20.00)', query: '8427.20.00' },
    { label: 'Tôn Mạ Kẽm (7210.49.12)', query: '7210.49.12' },
    { label: 'Hạt Nhựa PP (3902.10.40)', query: '3902.10.40' },
    { label: 'Kem Dưỡng Da (3304.99.30)', query: '3304.99.30' },
    { label: 'Gạo ST25 (1006.30.99)', query: '1006.30.99' },
    { label: 'Tôm Thẻ ĐL (0306.17.21)', query: '0306.17.21' },
    { label: 'Ô Tô Điện EV (8703.80.98)', query: '8703.80.98' },
    { label: 'Thép HRC (7208.39.90)', query: '7208.39.90' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-150">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 text-slate-900">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tra Cứu Mã HS Code & Tự Động Tính Thuế XNK
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Biểu Thuế XNK Mới Nhất (Nghị Định 26/2023/NĐ-CP)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Award className="w-3 h-3 text-amber-600" />
                  Lọc Chính Xác 100%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lọc chính xác theo mã HS hoặc tên sản phẩm, đối chiếu 6 quy tắc GIR, so sánh thuế quan FTA và tính thuế DDP/DAP tức thì
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Search Bar & Preset Tags */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformAiLookup()}
                placeholder="Nhập tên sản phẩm (VD: Pin lithium, Laptop, Sầu riêng, Áo thun...) hoặc Mã HS (VD: 8507.60.90, 8471...)..."
                className="w-full pl-9 pr-24 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-28 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePerformAiLookup()}
                disabled={isSearchingAi}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSearchingAi ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    <span>AI Đang Phân Tích...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>AI Phân Tích</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Category Tabs Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
            {TARIFF_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setAiCustomItems(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 border ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{cat.labelVi}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Preset Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-thin">
            <span className="text-slate-400 text-[11px] font-semibold shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Tra nhanh mẫu:
            </span>
            {QUICK_TAGS.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(tag.query);
                  setAiCustomItems(null);
                  setRulingAdviceOverride(null);
                  setDetectedCategoryOverride(null);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-900 border border-slate-200 transition shrink-0 cursor-pointer shadow-2xs font-mono"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Dual-Pane Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50">
          
          {/* LEFT PANE: CANDIDATE HS CODES & DETAILS */}
          <div className="w-full lg:w-7/12 border-r border-slate-200 flex flex-col overflow-y-auto p-3 sm:p-5 space-y-4">
            
            {/* EXACT MATCH HIGHLIGHT BANNER */}
            {localSearchResult.exactMatch && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                        ĐÃ KHỚP CHÍNH XÁC 100% VỚI BIỂU THUẾ XNK:
                      </span>
                      <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {localSearchResult.exactMatch.hsCode}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-emerald-800 font-medium">
                      {localSearchResult.exactMatch.descriptionVi}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHsItem(localSearchResult.exactMatch!)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                >
                  Chọn Mã Này
                </button>
              </div>
            )}

            {/* Advice Box */}
            {rulingAdvice && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>Căn Cứ Phân Loại Hải Quan & Biểu Thuế:</span>
                  </div>
                  <span className="text-[11px] bg-amber-200/60 px-2 py-0.5 rounded text-amber-800 font-mono">
                    {detectedCategory}
                  </span>
                </div>
                <p className="text-amber-800 text-[11.5px] leading-relaxed">
                  {rulingAdvice}
                </p>
              </div>
            )}

            {/* Candidate HS Code Cards */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>Danh Sách Mã HS ({candidateItems.length}):</span>
                <span className="text-[11px] text-slate-400 font-normal">Click chọn để đưa vào máy tính thuế</span>
              </div>

              {candidateItems.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Không tìm thấy mã HS phù hợp trong biểu thuế cho "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Thử từ khóa khác hoặc bấm nút "AI Phân Tích" ở trên để mô hình Gemini phân loại tự động.
                  </p>
                </div>
              ) : (
                candidateItems.map((item) => {
                  const isSelected = selectedHsItem?.id === item.id;
                  const isItemExact = item.isExactMatch || item.confidenceScore === 100;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHsItem(item)}
                      className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Header: HS Code & Confidence Badge */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base sm:text-lg font-black text-amber-600 tracking-tight">
                            {item.hsCode}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.hsCode, item.id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Sao chép mã HS"
                          >
                            {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 font-mono">
                            Chương {item.chapter}
                          </span>
                          {item.categoryNameVi && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {item.categoryNameVi}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isItemExact ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Khớp 100% Chính Xác</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                              <span>{item.confidenceScore}% Tin cậy</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {item.descriptionVi}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] italic">
                          {item.descriptionEn}
                        </div>
                      </div>

                      {/* Classification Reason */}
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700">Căn cứ phân loại: </span>
                        <span>{item.classificationReason}</span>
                      </div>

                      {/* Base Tariff Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block font-semibold">Thuế NK Ưu Đãi (MFN):</span>
                          <span className="font-bold text-amber-700">{item.importPreferentialTariff}%</span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block font-semibold">Thuế GTGT (VAT):</span>
                          <span className="font-bold text-indigo-700">{item.vatTariff}%</span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block font-semibold">Thuế Xuất Khẩu:</span>
                          <span className="font-bold text-emerald-700">{item.exportTariff}%</span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block font-semibold">Đơn Vị Tính:</span>
                          <span className="font-bold text-slate-900">{item.unit || 'Chiếc'}</span>
                        </div>
                      </div>

                      {/* FTA Preferential Table */}
                      {item.ftaTariffs && item.ftaTariffs.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                            <span>Ưu đãi Thuế quan Hiệp định Thương mại Tự do (FTA):</span>
                            <span className="text-[10px] text-indigo-600 font-normal">Cần C/O hợp lệ để hưởng thuế 0%</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                            {item.ftaTariffs.map((fta, fIdx) => (
                              <div key={fIdx} className="bg-indigo-50/50 p-1.5 rounded border border-indigo-100 flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-bold text-indigo-900 block">{fta.agreementCode}</span>
                                  <span className="text-[10px] text-slate-500">{fta.coForm}</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                                  {fta.rate}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specialized Inspection Badge */}
                      {item.specializedInspection?.isRequired && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11.5px]">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Yêu Cầu Kiểm Tra Chuyên Ngành:</span>
                          </div>
                          <div className="text-rose-800 text-[11px] space-y-0.5">
                            <p>• <strong>Cơ quan:</strong> {item.specializedInspection.agency}</p>
                            <p>• <strong>Thủ tục:</strong> {item.specializedInspection.inspectionType}</p>
                            {item.specializedInspection.estimatedCostVnd && (
                              <p>• <strong>Chi phí ước tính:</strong> {item.specializedInspection.estimatedCostVnd.toLocaleString()} VND (Dự kiến {item.specializedInspection.estimatedDays || 3} ngày)</p>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT PANE: INTERACTIVE DUTY CALCULATOR & QUOTE SYNC */}
          <div className="w-full lg:w-5/12 flex flex-col bg-white overflow-y-auto p-3 sm:p-5 space-y-4">
            
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>Máy Tính Thuế XNK Trực Quan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                    {selectedHsItem?.hsCode || '---'}
                  </span>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Trị Giá Tính Thuế (CIF Value USD):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={cifValueUsd}
                      onChange={(e) => setCifValueUsd(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Tương đương: <strong>{(cifValueUsd * exchangeRate).toLocaleString()} VND</strong> (Tỷ giá: {exchangeRate.toLocaleString()} VND/USD)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Số Lượng ({selectedHsItem?.unit || 'Đơn vị'}):
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Biểu Thuế Áp Dụng:
                    </label>
                    <select
                      value={selectedAgreement}
                      onChange={(e) => setSelectedAgreement(e.target.value)}
                      className="w-full px-2 py-1.5 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="MFN">Thuế Ưu Đãi MFN ({selectedHsItem?.importPreferentialTariff}%)</option>
                      {selectedHsItem?.ftaTariffs?.map((fta, idx) => (
                        <option key={idx} value={fta.agreementCode}>
                          {fta.agreementCode} ({fta.rate}% - {fta.coForm})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Computation Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Bảng Phân Tích Các Khoản Thuế:</span>
                <span className="text-[11px] text-slate-500">{taxCalculation.appliedDutyName}</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 1. Thuế Nhập Khẩu */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">1. Thuế Nhập Khẩu ({taxCalculation.appliedDutyRate}%)</div>
                    <div className="text-[10px] text-slate-500">
                      {taxCalculation.coFormRequired ? `Yêu cầu ${taxCalculation.coFormRequired}` : 'Không cần C/O'}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>{taxCalculation.importDutyVnd.toLocaleString()} VND</div>
                    <div className="text-[10px] text-slate-400">${taxCalculation.importDutyUsd.toFixed(2)}</div>
                  </div>
                </div>

                {/* 2. Thuế Tiêu Thụ Đặc Biệt (nếu có) */}
                {taxCalculation.specialConsumptionTaxVnd > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-800">2. Thuế Tiêu Thụ Đặc Biệt</div>
                      <div className="text-[10px] text-slate-500">Hàng hóa chịu thuế TTĐB</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      <div>{taxCalculation.specialConsumptionTaxVnd.toLocaleString()} VND</div>
                      <div className="text-[10px] text-slate-400">${taxCalculation.specialConsumptionTaxUsd.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {/* 3. Thuế GTGT (VAT) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">3. Thuế Giá Trị Gia Tăng (VAT {selectedHsItem?.vatTariff || 8}%)</div>
                    <div className="text-[10px] text-slate-500">Tính trên (CIF + Thuế NK + Thuế TTĐB)</div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>{taxCalculation.vatTaxVnd.toLocaleString()} VND</div>
                    <div className="text-[10px] text-slate-400">${taxCalculation.vatTaxUsd.toFixed(2)}</div>
                  </div>
                </div>

                {/* Phí kiểm tra chuyên ngành ước tính */}
                {selectedHsItem?.specializedInspection?.isRequired && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                    <div>
                      <div className="font-bold text-rose-900">4. Phí Kiểm Tra Chuyên Ngành</div>
                      <div className="text-[10px] text-rose-700">{selectedHsItem.specializedInspection.agency}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-rose-900">
                      <div>{(selectedHsItem.specializedInspection.estimatedCostVnd || 2500000).toLocaleString()} VND</div>
                      <div className="text-[10px] text-slate-400">Dự kiến {selectedHsItem.specializedInspection.estimatedDays} ngày</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Duty Banner */}
              <div className="p-3 bg-gradient-to-r from-amber-500 to-rose-500 rounded-xl text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-100">
                  <span>TỔNG THUẾ PHẢI NỘP NHÀ NƯỚC:</span>
                  <span className="font-mono text-white text-[11px] bg-white/20 px-2 py-0.5 rounded">
                    Tỷ lệ thuế: {taxCalculation.effectiveTaxRatePercent.toFixed(1)}% CIF
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                    {taxCalculation.totalCustomsTaxVnd.toLocaleString()} <span className="text-sm font-sans font-bold">VND</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-white/90">
                    ≈ ${taxCalculation.totalCustomsTaxUsd.toFixed(2)} USD
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleApplyToQuotation}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                title="Tự động thêm Thuế nhập khẩu và Thuế VAT vào bảng chi phí Báo Giá"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Đưa Thuế & Phí Hải Quan Vào Báo Giá (1 Chạm)</span>
              </button>

              <button
                type="button"
                onClick={handleApplyHsOnly}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Chỉ Gán Mã HS {selectedHsItem?.hsCode} Vào Lô Hàng</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
