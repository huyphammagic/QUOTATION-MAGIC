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
  Stethoscope,
  TrendingDown,
  FileCheck2,
  FileText,
  Download,
  Shield,
  Activity,
  CheckSquare,
  FileBadge
} from 'lucide-react';
import { 
  HsCodeTariffItem, 
  CustomsTaxCalculationResult,
  FtaComparisonRow,
  CustomsRiskAssessment,
  AdvanceRulingDossier
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
  removeVietnameseDiacritics,
  compareFtaTaxSavings,
  assessCustomsRisk,
  generateAdvanceRulingDossier
} from '../../services/customsTariff/customsTariffService';

interface HsCodeTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  onApplyLineItemsToQuote?: (items: LineItem[]) => void;
  onApplyHsCodeToShipment?: (hsCode: string, commodityDescription?: string) => void;
}

export type HsIntelligenceTab = 'search_gir' | 'fta_matrix' | 'nsw_radar' | 'advance_ruling' | 'customs_risk';

export const HsCodeTariffModal: React.FC<HsCodeTariffModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyLineItemsToQuote,
  onApplyHsCodeToShipment,
}) => {
  // Navigation Tab
  const [activeTab, setActiveTab] = useState<HsIntelligenceTab>('search_gir');

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

  // Selected HS item for calculator and intelligence suites
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

  // Smart Intelligence Computations
  const ftaRows = useMemo<FtaComparisonRow[]>(() => {
    if (!selectedHsItem) return [];
    return compareFtaTaxSavings(selectedHsItem, cifValueUsd, exchangeRate);
  }, [selectedHsItem, cifValueUsd, exchangeRate]);

  const bestFta = useMemo(() => {
    return ftaRows.find(r => r.isBestOption) || null;
  }, [ftaRows]);

  const customsRisk = useMemo<CustomsRiskAssessment>(() => {
    if (!selectedHsItem) {
      return {
        predictedChannel: 'GREEN',
        valuationRisk: 'LOW',
        hsDiscrepancyRisk: 'LOW',
        overallScore: 90,
        riskFactors: [],
        mitigationSteps: [],
        requiredDossierDocuments: []
      };
    }
    return assessCustomsRisk(selectedHsItem, cifValueUsd);
  }, [selectedHsItem, cifValueUsd]);

  const advanceRulingDossier = useMemo<AdvanceRulingDossier>(() => {
    return generateAdvanceRulingDossier(
      selectedHsItem || COMMON_HS_CODE_DATABASE[0],
      searchQuery || currentQuote.shipment.commodity || 'Hàng xuất nhập khẩu',
      currentQuote.shipment.pol || 'Trung Quốc'
    );
  }, [selectedHsItem, searchQuery, currentQuote.shipment.commodity, currentQuote.shipment.pol]);

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

  const handleDownloadDossier = () => {
    const element = document.createElement("a");
    const file = new Blob([advanceRulingDossier.draftPetitionText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Don_Xac_Dinh_Truoc_Ma_HS_${selectedHsItem.hsCode.replace(/\./g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Đã tải xuống Đơn Đề Nghị Xác Định Trước Mã Số!');
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
      showToast(res.isExactMatch ? 'Đã tìm thấy mã HS chính xác 100%!' : 'Đã phân loại mã HS theo chuẩn GIR thành công!');
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
      cifValueUsd,
      exchangeRate,
      quantity,
      appliedAgreementCode: selectedAgreement,
      hsItem: selectedHsItem,
    });
  }, [selectedHsItem, cifValueUsd, exchangeRate, quantity, selectedAgreement]);

  // Apply Line Items to Quotation
  const handleApplyToQuotation = () => {
    if (!selectedHsItem || !taxCalculation) return;

    if (onApplyLineItemsToQuote && taxCalculation.suggestedLineItems.length > 0) {
      onApplyLineItemsToQuote(taxCalculation.suggestedLineItems);
    }

    if (onApplyHsCodeToShipment) {
      onApplyHsCodeToShipment(selectedHsItem.hsCode, selectedHsItem.descriptionVi);
    }

    showToast(`Đã áp dụng mã HS ${selectedHsItem.hsCode} & đưa các dòng thuế vào Báo Giá!`);
    onClose();
  };

  // Apply HS code only to shipment record
  const handleApplyHsOnly = () => {
    if (!selectedHsItem) return;
    if (onApplyHsCodeToShipment) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-150">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-7xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 text-slate-900">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50/60 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Trung Tâm Trí Tuệ Hải Quan & Phân Loại Mã HS Code Thông Minh
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Nghị Định 26/2023/NĐ-CP
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Award className="w-3 h-3 text-amber-600" />
                  Chuẩn 6 Quy Tắc GIR
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động suy luận HS Code, so sánh thuế suất FTA đa phương, radar kiểm tra chuyên ngành NSW và dự thảo hồ sơ xác định trước mã số
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

        {/* 5 SMART INTELLIGENCE NAVIGATION TABS */}
        <div className="px-3 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { 
              id: 'search_gir', 
              label: '1. Tra Cứu & AI Phân Loại GIR', 
              icon: Search, 
              badge: `${candidateItems.length} kết quả` 
            },
            { 
              id: 'fta_matrix', 
              label: '2. Ma Trận Thuế FTA & Tối Ưu C/O', 
              icon: TrendingDown, 
              badge: `${selectedHsItem?.ftaTariffs?.length || 0} FTA`,
              highlight: bestFta ? `Tiết kiệm ${(bestFta.savingsVsMfnUsd).toFixed(0)}$` : undefined
            },
            { 
              id: 'nsw_radar', 
              label: '3. Radar Chuyên Ngành NSW', 
              icon: ShieldAlert, 
              badge: selectedHsItem?.specializedInspection?.isRequired ? 'Bắt buộc KT' : 'Miễn KT',
              alert: selectedHsItem?.specializedInspection?.isRequired
            },
            { 
              id: 'advance_ruling', 
              label: '4. Hồ Sơ Xác Định Trước Mã Số', 
              icon: FileCheck2, 
              badge: 'Điều 28 Luật HQ' 
            },
            { 
              id: 'customs_risk', 
              label: '5. Dự Báo Luồng Tờ Khai & Rủi Ro', 
              icon: AlertTriangle, 
              badge: `Luồng ${customsRisk.predictedChannel}`,
              channel: customsRisk.predictedChannel
            },
          ].map(t => {
            const isSel = activeTab === t.id;
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as HsIntelligenceTab)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSel 
                    ? 'border-amber-500 text-amber-700 font-bold bg-white shadow-2xs' 
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isSel ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{t.label}</span>
                {t.highlight ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {t.highlight}
                  </span>
                ) : t.alert ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                    {t.badge}
                  </span>
                ) : t.channel ? (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    t.channel === 'GREEN' ? 'bg-emerald-100 text-emerald-800' :
                    t.channel === 'YELLOW' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {t.badge}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/70 text-slate-700">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Active HS Quick Pill Info Bar */}
        <div className="px-4 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">MÃ ĐANG CHỌN:</span>
            <span className="font-mono text-sm font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/40">
              {selectedHsItem?.hsCode || '---'}
            </span>
            <span className="text-slate-300 font-medium truncate max-w-md hidden sm:inline">
              {selectedHsItem?.descriptionVi}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
              <span>MFN: <strong className="text-amber-300">{selectedHsItem?.importPreferentialTariff}%</strong></span>
              <span>•</span>
              <span>VAT: <strong className="text-indigo-300">{selectedHsItem?.vatTariff}%</strong></span>
              <span>•</span>
              <span>Xuất khẩu: <strong className="text-emerald-300">{selectedHsItem?.exportTariff}%</strong></span>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(selectedHsItem?.hsCode || '', 'top_hscode')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer transition"
            >
              <Copy className="w-3 h-3 text-slate-400" />
              <span>{copiedKey === 'top_hscode' ? 'Đã sao chép' : 'Copy HS'}</span>
            </button>
          </div>
        </div>

        {/* MAIN BODY CONTENT AREA */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50">
          
          {/* LEFT OR CENTER PRIMARY WORKSPACE */}
          <div className="w-full lg:w-7/12 border-r border-slate-200 flex flex-col overflow-y-auto">
            
            {/* TAB 1: SEARCH & GIR AI CLASSIFIER */}
            {activeTab === 'search_gir' && (
              <div className="p-3 sm:p-5 space-y-4">
                {/* Search Bar */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onKeyDown={(e) => e.key === 'Enter' && handlePerformAiLookup()}
                      placeholder="Nhập tên sản phẩm (VD: Pin lithium, Laptop, Sầu riêng, Áo thun...) hoặc Mã HS (VD: 8507.60.90, 8471...)..."
                      className="w-full pl-9 pr-24 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-28 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
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
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
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
                      Mẫu tra nhanh:
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

                {/* EXACT MATCH HIGHLIGHT BANNER */}
                {localSearchResult.exactMatch && (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
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
                    <p className="text-slate-700 leading-relaxed text-[11.5px]">
                      {rulingAdvice}
                    </p>
                  </div>
                )}

                {/* Candidate HS Code Cards List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Danh Sách Mã HS Ứng Viên ({candidateItems.length}):</span>
                    <span>Bấm vào thẻ để chọn và tính thuế ngay</span>
                  </div>

                  {candidateItems.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                      <Search className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        Không tìm thấy mã HS khớp với từ khóa "{searchQuery}".
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePerformAiLookup()}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Kích hoạt AI Tìm Kiếm & Suy Luận Chuyên Sâu</span>
                      </button>
                    </div>
                  ) : (
                    candidateItems.map((item) => {
                      const isSelected = selectedHsItem?.id === item.id;
                      const isItemExact = item.isExactMatch || localSearchResult.exactMatch?.id === item.id;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedHsItem(item)}
                          className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                            isSelected
                              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                              : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-slate-900 tracking-tight">
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

                          {/* Classification Reason GIR */}
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-700">Căn cứ GIR: </strong>
                              <span>{item.classificationReason}</span>
                            </div>
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SMART FTA TAX MATRIX & C/O ARBITRAGE */}
            {activeTab === 'fta_matrix' && (
              <div className="p-3 sm:p-5 space-y-4">
                {/* Header Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Ma Trận So Sánh Thuế Suất FTA & Tối Ưu Hóa C/O (Form E, EUR.1, CPTPP...)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      Hàng {selectedHsItem.hsCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Đối chiếu mức thuế nhập khẩu giữa biểu thuế chuẩn MFN và các Hiệp định Thương mại Tự do song phương/đa phương. Tự động tính toán số tiền thuế doanh nghiệp tiết kiệm được khi xin cấp C/O hợp lệ.
                  </p>
                </div>

                {/* Best Tax Saving Trophy Card */}
                {bestFta && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        🏆
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                          <span>PHƯƠNG ÁN THUẾ TỐI ƯU NHẤT:</span>
                          <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                            {bestFta.agreementCode} ({bestFta.coForm})
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Thuế suất giảm từ <strong>{selectedHsItem.importPreferentialTariff}%</strong> xuống <strong className="text-emerald-700">{bestFta.rate}%</strong>. Tiết kiệm <strong className="font-mono text-emerald-950">{bestFta.savingsVsMfnVnd.toLocaleString()} VND</strong> (~${bestFta.savingsVsMfnUsd.toFixed(0)} USD) tiền thuế nộp kho bạc!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgreement(bestFta.agreementCode);
                        showToast(`Đã chọn phương án ${bestFta.agreementCode} (${bestFta.coForm})!`);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
                    >
                      Áp Dụng Hiệp Định Này
                    </button>
                  </div>
                )}

                {/* Matrix Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="px-3.5 py-2.5">Hiệp Định / Biểu Thuế</th>
                        <th className="px-3 py-2.5">Form C/O Yêu Cầu</th>
                        <th className="px-3 py-2.5 text-center">Thuế Suất</th>
                        <th className="px-3 py-2.5 text-right">Tiền Thuế NK (VND)</th>
                        <th className="px-3 py-2.5 text-right text-emerald-700">Tiết Kiệm (Savings)</th>
                        <th className="px-3 py-2.5">Tiêu Chí Xuất Xứ (ROO)</th>
                        <th className="px-3 py-2.5 text-right">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ftaRows.map((row) => {
                        const isSelectedAgr = selectedAgreement === row.agreementCode;
                        return (
                          <tr 
                            key={row.agreementCode}
                            className={`transition ${isSelectedAgr ? 'bg-amber-50/60 font-medium' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-slate-900">{row.agreementCode}</div>
                              <div className="text-[10px] text-slate-500">{row.agreementName}</div>
                            </td>

                            <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                              {row.coForm}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                row.rate === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {row.rate}%
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                              {row.dutyAmountVnd.toLocaleString()} đ
                            </td>

                            <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">
                              {row.savingsVsMfnVnd > 0 ? (
                                <span>+{row.savingsVsMfnVnd.toLocaleString()} đ</span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-[11px] text-slate-600">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                {row.qualifyingRule}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAgreement(row.agreementCode);
                                  showToast(`Đã chuyển sang hiệp định ${row.agreementCode}!`);
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                  isSelectedAgr
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isSelectedAgr ? 'Đang chọn' : 'Chọn'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rules of Origin (ROO) Guidance */}
                <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileBadge className="w-4 h-4 text-indigo-600" />
                    <span>Hướng Dẫn Kiểm Tra Quy Tắc Xuất Xứ Hàng Hóa (Rules of Origin - ROO):</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">Tiêu chí RVC (Hàm lượng nội khối):</strong>
                      <p>Yêu cầu giá trị nguyên liệu nội khối đạt tối thiểu 40% (RVC 40%) theo công thức tính giá FOB của hiệp định.</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">Tiêu chí CTC / CTSH (Chuyển đổi mã HS):</strong>
                      <p>Nguyên liệu đầu vào không có xuất xứ phải khác mã HS ở cấp 4 số (CTH) hoặc 6 số (CTSH) so với thành phẩm.</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">Vận chuyển trực tiếp (Direct Consignment):</strong>
                      <p>Hàng hóa phải đi trực tiếp từ nước xuất khẩu về VN hoặc có xác nhận giám sát hải quan nếu chuyển tải qua nước thứ 3.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NATIONAL SINGLE WINDOW RADAR */}
            {activeTab === 'nsw_radar' && (
              <div className="p-3 sm:p-5 space-y-4">
                {/* Header Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-900 to-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Radar Kiểm Tra Chuyên Ngành & Cổng Thông Tin Một Cửa Quốc Gia (NSW)
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      selectedHsItem.specializedInspection?.isRequired
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {selectedHsItem.specializedInspection?.isRequired ? 'HÀNG CẦN GIẤY PHÉP / KIỂM TRA' : 'MIỄN KIỂM TRA CHUYÊN NGÀNH'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Tự động nhận diện danh mục quản lý của các Bộ chủ quản. Cung cấp quy trình đăng ký trên NSW, chi phí ước tính, thời gian phụ trội và danh mục chứng từ bắt buộc.
                  </p>
                </div>

                {/* 5 Ministries Interactive Radar Map */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { code: 'MOIT', name: 'Bộ Công Thương', duty: 'Hiệu suất năng lượng, Hóa chất, Tiền chất' },
                    { code: 'MARD', name: 'Bộ NN & PTNT', duty: 'Kiểm dịch thực vật, động vật, VSATTP' },
                    { code: 'MOST', name: 'Bộ KH & CN', duty: 'Kiểm tra chất lượng, Hợp chuẩn CR, QCVN' },
                    { code: 'MOH', name: 'Bộ Y Tế', duty: 'Thiết bị y tế, Mỹ phẩm, Dược phẩm' },
                    { code: 'MIC', name: 'Bộ TT & TT', duty: 'Hợp quy thiết bị phát sóng, Viễn thông' },
                  ].map(ministry => {
                    const isTargetAgency = selectedHsItem.specializedInspection?.isRequired && 
                      (selectedHsItem.specializedInspection.agency || '').toLowerCase().includes(ministry.code.toLowerCase()) ||
                      (selectedHsItem.specializedInspection.agency || '').toLowerCase().includes(ministry.name.toLowerCase());

                    return (
                      <div 
                        key={ministry.code}
                        className={`p-3 rounded-xl border text-center transition ${
                          isTargetAgency
                            ? 'bg-rose-50 border-rose-300 shadow-sm ring-1 ring-rose-300'
                            : 'bg-white border-slate-200 opacity-60'
                        }`}
                      >
                        <div className={`font-bold text-xs ${isTargetAgency ? 'text-rose-900 font-black' : 'text-slate-700'}`}>
                          {ministry.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {ministry.duty}
                        </div>
                        <div className="mt-2">
                          {isTargetAgency ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                              Đang Quản Lý
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Không áp dụng</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Inspection Protocol */}
                {selectedHsItem.specializedInspection?.isRequired ? (
                  <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-rose-600" />
                        <span>Quy Trình Xử Lý Thực Tế Đối Với Mã HS {selectedHsItem.hsCode}:</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        Phí dự kiến: {(selectedHsItem.specializedInspection.estimatedCostVnd || 2500000).toLocaleString()} VND
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <strong className="text-slate-900 block mb-0.5">1. Thủ tục đăng ký trên Cổng một cửa quốc gia:</strong>
                        <p>{selectedHsItem.specializedInspection.procedureName || 'Nộp hồ sơ trực tuyến qua hệ thống NSW (vnsw.gov.vn) để nhận mã số tiếp nhận hồ sơ kiểm tra chất lượng.'}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <strong className="text-slate-900 block mb-0.5">2. Thời gian thông quan & giải phóng hàng:</strong>
                        <p>Dự kiến mất <strong>{selectedHsItem.specializedInspection.estimatedDays || 3} - 5 ngày làm việc</strong>. Doanh nghiệp có thể xin cơ chế đưa hàng về kho bảo quản theo Mẫu 09/BQHH/GSQL nếu kho bãi đạt điều kiện niêm phong.</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <strong className="text-slate-900 block mb-0.5">3. Danh mục hồ sơ cần nộp cơ quan kiểm định:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                          <li>Giấy đăng ký kiểm tra nhà nước có xác nhận tiếp nhận của NSW</li>
                          <li>Hóa đơn thương mại (Commercial Invoice), Vận đơn (B/L) và Packing List</li>
                          <li>Chứng chỉ chất lượng nhà sản xuất (Certificate of Quality / Test Report)</li>
                          <li>Mẫu nhãn phụ sản phẩm theo Nghị định 43/2017/NĐ-CP và Nghị định 111/2021/NĐ-CP</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-xl border border-emerald-200 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-950">
                      Mặt hàng không thuộc danh mục kiểm tra chuyên ngành bắt buộc
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Mã HS {selectedHsItem.hsCode} ({selectedHsItem.descriptionVi}) được thông quan tiêu chuẩn theo thủ tục hải quan thông thường, không phát sinh chi phí và thời gian kiểm định phụ trội.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ADVANCE RULING DOSSIER */}
            {activeTab === 'advance_ruling' && (
              <div className="p-3 sm:p-5 space-y-4">
                {/* Header Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Dự Thảo Hồ Sơ Đề Nghị Xác Định Trước Mã Số Hải Quan (Advance Ruling)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      {advanceRulingDossier.dossierNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Căn cứ Điều 28 Luật Hải quan 2014 & Thông tư 38/2015/TT-BTC. Soạn thảo đơn đề nghị Tổng cục Hải quan ban hành Thông báo xác định trước mã số trước khi hàng về cảng, loại bỏ 100% rủi ro bị bẻ mã hoặc xử phạt vi phạm hành chính.
                  </p>
                </div>

                {/* International vs National HS Comparison Strip */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Mã Chuẩn WCO Quốc Tế (6 Chữ Số)
                    </span>
                    <span className="font-mono text-base font-black text-blue-700">
                      {selectedHsItem.hsCode.slice(0, 7)}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Thống nhất toàn cầu giữa nước xuất khẩu & nước nhập khẩu
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Mã Phân Nhóm Quốc Gia VN (8 Chữ Số)
                    </span>
                    <span className="font-mono text-base font-black text-amber-700">
                      {selectedHsItem.hsCode}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Quyết định chính xác mức thuế suất theo Biểu thuế XNK Việt Nam
                    </span>
                  </div>
                </div>

                {/* Draft Document Box */}
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Văn bản Đơn Đề Nghị Xác Định Trước Mã Số:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(advanceRulingDossier.draftPetitionText, 'advance_ruling_text')}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>{copiedKey === 'advance_ruling_text' ? 'Đã sao chép' : 'Sao chép đơn'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadDossier}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Tải file .txt</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-b border-slate-200">
                    {advanceRulingDossier.draftPetitionText}
                  </div>
                </div>

                {/* Required Attachments Checklist */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">
                    Danh Mục Tài Liệu Kèm Theo Hồ Sơ Nộp Hải Quan:
                  </span>
                  <div className="space-y-1.5">
                    {advanceRulingDossier.requiredAttachments.map((att, aIdx) => (
                      <div key={aIdx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">{att.name}</strong> {att.required && <span className="text-rose-600 font-bold">*</span>}
                          <p className="text-slate-500 mt-0.5">{att.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CUSTOMS CLEARANCE & VALUATION RISK AUDIT */}
            {activeTab === 'customs_risk' && (
              <div className="p-3 sm:p-5 space-y-4">
                {/* Header Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-purple-950 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Đánh Giá Rủi Ro Hải Quan & Dự Báo Luồng Tờ Khai (Xanh - Vàng - Đỏ)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      Điểm An Toàn: {customsRisk.overallScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Mô phỏng thuật toán quản lý rủi ro của hệ thống VNACCS. Dự báo xác suất luồng kiểm tra thực tế và nguy cơ bị bác bỏ trị giá khai báo (tham vấn giá hải quan).
                  </p>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Channel Prediction */}
                  <div className={`p-4 rounded-xl border ${
                    customsRisk.predictedChannel === 'GREEN'
                      ? 'bg-emerald-50 border-emerald-300'
                      : customsRisk.predictedChannel === 'YELLOW'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-rose-50 border-rose-300'
                  }`}>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Dự Báo Luồng Tờ Khai
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${
                        customsRisk.predictedChannel === 'GREEN' ? 'bg-emerald-500 animate-pulse' :
                        customsRisk.predictedChannel === 'YELLOW' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'
                      }`} />
                      <span className="text-base font-black">
                        {customsRisk.predictedChannel === 'GREEN' ? 'LUỒNG XANH' :
                         customsRisk.predictedChannel === 'YELLOW' ? 'LUỒNG VÀNG' : 'LUỒNG ĐỎ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {customsRisk.predictedChannel === 'GREEN' ? 'Thông quan tự động nhanh chóng' :
                       customsRisk.predictedChannel === 'YELLOW' ? 'Kiểm tra chi tiết hồ sơ giấy tờ' : 'Kiểm tra thực tế hàng hóa tại bãi'}
                    </p>
                  </div>

                  {/* Valuation Risk */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Rủi Ro Tham Vấn Giá
                    </span>
                    <span className={`text-base font-black ${
                      customsRisk.valuationRisk === 'HIGH' ? 'text-rose-600' :
                      customsRisk.valuationRisk === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {customsRisk.valuationRisk === 'HIGH' ? 'CAO (High Risk)' :
                       customsRisk.valuationRisk === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP (An toàn)'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Trị giá CIF: ${cifValueUsd.toLocaleString()} USD
                    </p>
                  </div>

                  {/* Discrepancy Risk */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Rủi Ro Bất Đồng Mã HS
                    </span>
                    <span className={`text-base font-black ${
                      customsRisk.hsDiscrepancyRisk === 'HIGH' ? 'text-rose-600' :
                      customsRisk.hsDiscrepancyRisk === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {customsRisk.hsDiscrepancyRisk === 'HIGH' ? 'RỦI RO CAO' :
                       customsRisk.hsDiscrepancyRisk === 'MEDIUM' ? 'TRUNG BÌNH' : 'RẤT THẤP'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Độ ổn định phân nhóm 8 số
                    </p>
                  </div>
                </div>

                {/* Risk Factors and Mitigation Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Yếu Tố Gây Rủi Ro Nhận Diện:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      {customsRisk.riskFactors.map((rf, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{rf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Biện Pháp Phòng Ngừa & Bảo Vệ:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      {customsRisk.mitigationSteps.map((ms, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{ms}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Audit Defense Pack Checklist */}
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">
                    Bộ Chứng Từ Bảo Vệ Khi Hải Quan Kiểm Tra (Audit Defense Pack):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {customsRisk.requiredDossierDocuments.map((doc, dIdx) => (
                      <div key={dIdx} className="p-2 rounded bg-white border border-slate-200 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-slate-800 font-medium">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT PANE: REAL-TIME DUTY CALCULATOR & QUOTE SYNC */}
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
                      Số Lượng ({selectedHsItem?.unit || 'Chiếc'}):
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Biểu Thuế / C/O Áp Dụng:
                    </label>
                    <select
                      value={selectedAgreement}
                      onChange={(e) => setSelectedAgreement(e.target.value)}
                      className="w-full px-2 py-1.5 font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer text-xs"
                    >
                      <option value="MFN">Thuế Ưu Đãi Chuẩn MFN ({selectedHsItem?.importPreferentialTariff}%)</option>
                      {selectedHsItem?.ftaTariffs?.map((fta) => (
                        <option key={fta.agreementCode} value={fta.agreementCode}>
                          {fta.agreementCode} ({fta.rate}% - {fta.coForm})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tax Breakdowns */}
              <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                {/* 1. Thuế Nhập Khẩu */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">
                      1. Thuế Nhập Khẩu ({taxCalculation.appliedDutyRate}%)
                    </div>
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
