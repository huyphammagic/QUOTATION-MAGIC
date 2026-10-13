import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  Swords, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Percent, 
  Info, 
  X, 
  Check, 
  ChevronRight, 
  Ship, 
  Award, 
  Clock, 
  Search,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Sparkles,
  Bot,
  Building2,
  Globe,
  MapPin,
  Calendar,
  Users,
  Copy,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  FileText,
  FileCheck,
  Send,
  MessageSquare,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowRight
} from 'lucide-react';
import { 
  LaneMarketBenchmark, 
  CompetitorProfile, 
  WinProbabilityResult, 
  PriceCompetitivenessRating, 
  WinLossFeedbackRecord,
  CompetitorTier,
  CompetitorScanResult,
  LaneCompetitorAnalysis,
  QuoteTearDownResult
} from '../../types/competitorIntelligence';
import { QuoteData } from '../../types/logistics';
import { 
  STANDARD_LANE_BENCHMARKS, 
  STANDARD_COMPETITORS, 
  findLaneBenchmark, 
  analyzeWinProbability,
  recordWinLossFeedback,
  getLocalWinLossRecords,
  getStoredCompetitors,
  saveStoredCompetitor,
  deleteStoredCompetitor,
  resetToStandardCompetitors,
  scanCompetitorWithAi,
  scanLaneCompetitorsWithAi,
  teardownCompetitorQuoteWithAi
} from '../../services/competitor/competitorIntelligenceService';

interface CompetitorIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote?: QuoteData | null;
  onApplySweetSpotPrice?: (newSellPrice: number) => void;
}

type ActiveTab = 
  | 'DIRECTORY'       // Quản lý danh mục đối thủ Forwarder tại Việt Nam & SWOT
  | 'AI_SCANNER'      // Quét AI thông minh thị trường & bóc tách báo giá đối thủ
  | 'HEAD_TO_HEAD'    // Ma trận so sánh đối đầu trực diện BOGI vs Đối thủ
  | 'SIMULATOR'       // Giả lập điểm ngọt & xác suất trúng thầu
  | 'BENCHMARKS'      // Bản đồ cước thị trường theo tuyến
  | 'WIN_LOSS_LOG';   // Nhật ký thắng/thua thầu thực tế

export const CompetitorIntelligenceModal: React.FC<CompetitorIntelligenceModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplySweetSpotPrice
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DIRECTORY');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(STANDARD_LANE_BENCHMARKS[0].id);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Competitor Directory State
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [laneFilter, setLaneFilter] = useState<string>('ALL');

  // Comparison State
  const [compareCompetitorId, setCompareCompetitorId] = useState<string>('');

  // AI Scanner Sub-modes
  const [aiScanMode, setAiScanMode] = useState<'SINGLE_COMPETITOR' | 'LANE_SCAN' | 'TEARDOWN_QUOTE'>('SINGLE_COMPETITOR');
  
  // 1. Single Competitor Scan State
  const [scanCompName, setScanCompName] = useState('');
  const [scanCompHq, setScanCompHq] = useState('');
  const [scanCompLane, setScanCompLane] = useState('');
  const [isScanningComp, setIsScanningComp] = useState(false);
  const [scanResult, setScanResult] = useState<CompetitorScanResult | null>(null);

  // 2. Lane Scan State
  const [scanOrigin, setScanOrigin] = useState('Cat Lai / Hai Phong, Vietnam');
  const [scanDestination, setScanDestination] = useState('Long Beach / Los Angeles, USA');
  const [isScanningLane, setIsScanningLane] = useState(false);
  const [laneScanResult, setLaneScanResult] = useState<LaneCompetitorAnalysis | null>(null);

  // 3. Quote Teardown State
  const [teardownQuoteText, setTeardownQuoteText] = useState('');
  const [teardownCompName, setTeardownCompName] = useState('');
  const [isTearingDown, setIsTearingDown] = useState(false);
  const [teardownResult, setTeardownResult] = useState<QuoteTearDownResult | null>(null);

  // Modal manual Add / Edit Competitor
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Partial<CompetitorProfile>>({});

  // Initial pricing from current quote if available
  const quoteFreightItem = currentQuote?.items.find(i => i.category === 'FREIGHT');
  const initialProposedPrice = quoteFreightItem?.unitPrice || 1850;
  const initialCostPrice = quoteFreightItem?.costPrice || 1500;

  const [proposedPrice, setProposedPrice] = useState<number>(initialProposedPrice);
  const [costPrice, setCostPrice] = useState<number>(initialCostPrice);

  // Selected benchmark
  const activeBenchmark = useMemo(() => {
    if (currentQuote?.shipment) {
      return findLaneBenchmark(
        currentQuote.shipment.pol,
        currentQuote.shipment.pod,
        currentQuote.shipment.mode,
        currentQuote.shipment.containerType
      );
    }
    return STANDARD_LANE_BENCHMARKS.find(b => b.id === selectedBenchmarkId) || STANDARD_LANE_BENCHMARKS[0];
  }, [currentQuote, selectedBenchmarkId]);

  // Win probability calculation
  const winProbResult: WinProbabilityResult = useMemo(() => {
    return analyzeWinProbability({
      proposedPrice,
      costPrice,
      benchmark: activeBenchmark,
      currency: activeBenchmark.currency
    });
  }, [proposedPrice, costPrice, activeBenchmark]);

  // Win/Loss logger state
  const [wlOutcome, setWlOutcome] = useState<'WON' | 'LOST'>('WON');
  const [wlCompetitor, setWlCompetitor] = useState<string>('Maersk Spot Direct');
  const [wlReason, setWlReason] = useState<WinLossFeedbackRecord['primaryReason']>('PRICE');
  const [wlWinningPrice, setWlWinningPrice] = useState<number>(proposedPrice);
  const [wlNotes, setWlNotes] = useState<string>('');
  const [isSavingWl, setIsSavingWl] = useState(false);
  const [wlSavedSuccess, setWlSavedSuccess] = useState(false);

  // Load stored competitors on mount
  useEffect(() => {
    const list = getStoredCompetitors();
    setCompetitors(list);
    if (list.length > 0) {
      setSelectedCompetitor(list[0]);
      setCompareCompetitorId(list[0].id);
    }
  }, []);

  // Filtered Competitors
  const filteredCompetitors = useMemo(() => {
    return competitors.filter(c => {
      // Tier filter
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchHq = (c.headquarters || '').toLowerCase().includes(q);
        const matchLanes = c.strongLanes.some(l => l.toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchHq && !matchLanes) return false;
      }
      return true;
    });
  }, [competitors, tierFilter, searchQuery]);

  // Handle Copy Script
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(id);
    setTimeout(() => setCopiedState(null), 2500);
  };

  // AI Handler: Scan specific competitor
  const handleRunCompetitorScan = async () => {
    if (!scanCompName.trim()) return;
    setIsScanningComp(true);
    try {
      const res = await scanCompetitorWithAi({
        competitorName: scanCompName.trim(),
        headquarters: scanCompHq.trim(),
        tradeLane: scanCompLane.trim()
      });
      setScanResult(res);
      // Refresh list
      const updated = getStoredCompetitors();
      setCompetitors(updated);
      setSelectedCompetitor(res.competitor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningComp(false);
    }
  };

  // AI Handler: Scan Trade Lane
  const handleRunLaneScan = async () => {
    setIsScanningLane(true);
    try {
      const res = await scanLaneCompetitorsWithAi({
        origin: scanOrigin,
        destination: scanDestination,
        mode: currentQuote?.shipment?.mode || 'SEA_FCL',
      });
      setLaneScanResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningLane(false);
    }
  };

  // AI Handler: Teardown Quote
  const handleRunQuoteTeardown = async () => {
    if (!teardownQuoteText.trim()) return;
    setIsTearingDown(true);
    try {
      const res = await teardownCompetitorQuoteWithAi({
        rawQuoteText: teardownQuoteText,
        competitorName: teardownCompName,
        customerName: currentQuote?.customer?.companyName || currentQuote?.customer?.customerName || 'Khách hàng'
      });
      setTeardownResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTearingDown(false);
    }
  };

  // Delete competitor
  const handleDeleteComp = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa đối thủ này khỏi danh sách quản lý?')) {
      deleteStoredCompetitor(id);
      const updated = getStoredCompetitors();
      setCompetitors(updated);
      if (selectedCompetitor?.id === id) {
        setSelectedCompetitor(updated[0] || null);
      }
    }
  };

  // Save Manual Competitor
  const handleSaveManualComp = async () => {
    if (!editingCompetitor.name) return;
    const toSave: CompetitorProfile = {
      id: editingCompetitor.id || `comp_${Date.now()}`,
      name: editingCompetitor.name,
      code: editingCompetitor.code || editingCompetitor.name.slice(0, 8).toUpperCase(),
      tier: editingCompetitor.tier || 'TOP_LOCAL_FORWARDER',
      headquarters: editingCompetitor.headquarters || 'TP. Hồ Chí Minh',
      strongLanes: editingCompetitor.strongLanes || ['Tuyến phổ thông'],
      typicalDiscountPercent: editingCompetitor.typicalDiscountPercent || 0,
      pricePositioning: editingCompetitor.pricePositioning || 'STANDARD',
      localChargesRating: editingCompetitor.localChargesRating || 'MODERATE',
      strengths: editingCompetitor.strengths || ['Mạng lưới cơ bản'],
      weaknesses: editingCompetitor.weaknesses || ['Chưa rõ điểm yếu'],
      winningCounterTactics: editingCompetitor.winningCounterTactics || ['Tư vấn chu đáo và báo giá trọn gói'],
      killPitchVi: editingCompetitor.killPitchVi || '',
      zaloScriptVi: editingCompetitor.zaloScriptVi || '',
      trapQuestionsVi: editingCompetitor.trapQuestionsVi || [],
      isCustomAdded: true,
      lastScannedAt: new Date().toISOString()
    };
    await saveStoredCompetitor(toSave);
    const updated = getStoredCompetitors();
    setCompetitors(updated);
    setSelectedCompetitor(toSave);
    setIsEditModalOpen(false);
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục danh sách chuẩn các forwarder Việt Nam ban đầu?')) {
      const reset = resetToStandardCompetitors();
      setCompetitors(reset);
      setSelectedCompetitor(reset[0]);
    }
  };

  const handleSaveWinLoss = async () => {
    setIsSavingWl(true);
    const record: WinLossFeedbackRecord = {
      id: `wl_${Date.now()}`,
      companyId: currentQuote?.companyId || 'company_bogi',
      quotationId: currentQuote?.id || 'quote_current',
      quoteNumber: currentQuote?.quoteNumber || 'Q-DRAFT',
      customerName: currentQuote?.customer?.companyName || currentQuote?.customer?.customerName || 'Khách hàng',
      lane: `${activeBenchmark.pol} ➔ ${activeBenchmark.pod}`,
      outcome: wlOutcome,
      quotedPrice: proposedPrice,
      winningPrice: wlWinningPrice,
      competitorWon: wlCompetitor,
      primaryReason: wlReason,
      feedbackNotes: wlNotes,
      recordedBy: currentQuote?.company?.salesRepName || 'Sales Specialist',
      recordedAt: new Date().toISOString()
    };

    await recordWinLossFeedback(record);
    setIsSavingWl(false);
    setWlSavedSuccess(true);
    setTimeout(() => setWlSavedSuccess(false), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                             */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Quản Lý Đối Thủ Cạnh Tranh & Quét Trí Tuệ Forwarder Việt Nam
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-indigo-300" />
                  Gemini 3.8 AI Radar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Quét thông tin forwarder toàn quốc, phân tích SWOT, điểm mạnh điểm yếu và bộ vũ khí chốt đơn (Battlecards)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION TABS BAR                                                      */}
        {/* ========================================================================= */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between overflow-x-auto gap-1 text-xs shrink-0">
          <div className="flex items-center gap-1 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('DIRECTORY')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'DIRECTORY'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Quản Lý Đối Thủ ({competitors.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AI_SCANNER')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'AI_SCANNER'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Quét Đối Thủ & Báo Giá</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HEAD_TO_HEAD')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'HEAD_TO_HEAD'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>So Sánh Đối Đầu (Matrix)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SIMULATOR')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'SIMULATOR'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Điểm Ngọt & Win-Rate</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('BENCHMARKS')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'BENCHMARKS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bản Đồ Cước Thị Trường</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WIN_LOSS_LOG')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'WIN_LOSS_LOG'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Nhật Ký Thắng/Thua Deal</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingCompetitor({});
                setIsEditModalOpen(true);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>+ Thêm FWD</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY AREA                                                           */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ======================================================================= */}
          {/* TAB 1: DANH MỤC & HỒ SƠ ĐỐI THỦ FORWARDER VIỆT NAM (SWOT & BATTLECARDS) */}
          {/* ======================================================================= */}
          {activeTab === 'DIRECTORY' && (
            <div className="space-y-4">
              
              {/* Filter & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">Phân loại:</span>
                  {(['ALL', 'TIER_1_GLOBAL', 'TOP_LOCAL_FORWARDER', 'DIRECT_CARRIER', 'NICHE_SPECIALIST', 'BUDGET_FORWARDER'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setTierFilter(tier)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        tierFilter === tier
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tier === 'ALL' ? 'Tất cả' :
                       tier === 'TIER_1_GLOBAL' ? 'Đa Quốc Gia (MNC)' :
                       tier === 'TOP_LOCAL_FORWARDER' ? 'Top FWD Việt Nam' :
                       tier === 'DIRECT_CARRIER' ? 'Hãng Tàu Direct' :
                       tier === 'NICHE_SPECIALIST' ? 'Chuyên Tuyến / Ngách' : 'FWD Giá Rẻ'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm đối thủ, cảng, tuyến..."
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                    title="Khôi phục mặc định"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Layout 2 Cột: Danh sách bên trái + Chi tiết SWOT & Battlecard bên phải */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left 5 Cols: Danh sách các công ty Forwarder */}
                <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredCompetitors.map((comp) => {
                    const isSelected = selectedCompetitor?.id === comp.id;
                    const tierLabel = comp.tier === 'TIER_1_GLOBAL' ? 'Global MNC' :
                                      comp.tier === 'TOP_LOCAL_FORWARDER' ? 'Top VN' :
                                      comp.tier === 'DIRECT_CARRIER' ? 'Hãng Tàu' :
                                      comp.tier === 'NICHE_SPECIALIST' ? 'Niche FWD' : 'Budget';

                    const tierColor = comp.tier === 'TIER_1_GLOBAL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      comp.tier === 'TOP_LOCAL_FORWARDER' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      comp.tier === 'DIRECT_CARRIER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      comp.tier === 'NICHE_SPECIALIST' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

                    return (
                      <div
                        key={comp.id}
                        onClick={() => setSelectedCompetitor(comp)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">{comp.name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${tierColor}`}>
                                {tierLabel}
                              </span>
                              {comp.isAiGenerated && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                  AI Scanned
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {comp.headquarters || 'Việt Nam'} • {comp.employeeCount || 'Đội ngũ chuyên nghiệp'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-bold font-mono ${
                              comp.typicalDiscountPercent < 0 ? 'text-rose-600' : 'text-slate-600'
                            }`}>
                              {comp.typicalDiscountPercent < 0 
                                ? `Rẻ hơn ~${Math.abs(comp.typicalDiscountPercent)}%` 
                                : `Cao hơn +${comp.typicalDiscountPercent}%`}
                            </span>
                          </div>
                        </div>

                        {/* Top weakness snippet */}
                        <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1 line-clamp-1">
                          <span className="text-rose-500 font-bold shrink-0">Yếu:</span>
                          <span className="truncate">{comp.weaknesses[0] || 'Phí local charges cao'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredCompetitors.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      Không tìm thấy đối thủ nào phù hợp với bộ lọc.
                    </div>
                  )}
                </div>

                {/* Right 7 Cols: Chi tiết hồ sơ SWOT & Sales Battlecard */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 max-h-[600px] overflow-y-auto">
                  {selectedCompetitor ? (
                    <>
                      {/* Company Header */}
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-extrabold text-slate-900">
                              {selectedCompetitor.name}
                            </h4>
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {selectedCompetitor.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {selectedCompetitor.legalName || selectedCompetitor.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {selectedCompetitor.headquarters || 'TP.HCM / Hải Phòng'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {selectedCompetitor.employeeCount || '200+ nhân sự'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" />
                              {selectedCompetitor.website || 'forwarder.vn'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCompareCompetitorId(selectedCompetitor.id);
                              setActiveTab('HEAD_TO_HEAD');
                            }}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                            title="So sánh trực diện với BOGI Logistics"
                          >
                            ⚔️ So Sánh BOGI
                          </button>
                          {selectedCompetitor.isCustomAdded && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComp(selectedCompetitor.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Xóa đối thủ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tuyến thế mạnh & Định vị giá */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Tuyến thế mạnh cốt lõi:</span>
                          <div className="space-y-1">
                            {selectedCompetitor.strongLanes.map((lane, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                                <Ship className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{lane}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <span className="font-bold text-slate-700 block mb-1">Định vị giá & Local Charges:</span>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-500">Mặt bằng giá cước:</span>
                              <span className="font-bold text-slate-800">
                                {selectedCompetitor.pricePositioning === 'PREMIUM' ? 'Cao cấp (+5% đến +10%)' :
                                 selectedCompetitor.pricePositioning === 'BUDGET_AGGRESSIVE' ? 'Phá giá (-5% đến -8%)' : 'Mặt bằng thị trường'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Biểu phí Local Charges:</span>
                              <span className={`font-bold ${
                                selectedCompetitor.localChargesRating === 'EXPENSIVE' ? 'text-rose-600' :
                                selectedCompetitor.localChargesRating === 'COMPETITIVE' ? 'text-emerald-600' : 'text-slate-700'
                              }`}>
                                {selectedCompetitor.localChargesRating === 'EXPENSIVE' ? 'Rất đắt' :
                                 selectedCompetitor.localChargesRating === 'COMPETITIVE' ? 'Rất rẻ' : 'Vừa phải'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SWOT ANALYSIS 4 GÓC (MA TRẬN SWOT NGÀNH LOGISTICS) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Ma Trận Phân Tích SWOT Đối Thủ:</span>
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          {/* S - STRENGTHS */}
                          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                            <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1.5">
                              <ThumbsUp className="w-3.5 h-3.5 text-blue-700" />
                              <span>Điểm Mạnh (Strengths):</span>
                            </div>
                            <ul className="list-disc list-inside text-blue-950 space-y-1 text-[11px]">
                              {(selectedCompetitor.swotAnalysis?.strengths || selectedCompetitor.strengths).map((s, idx) => (
                                <li key={idx} className="leading-relaxed">{s}</li>
                              ))}
                            </ul>
                          </div>

                          {/* W - WEAKNESSES */}
                          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                            <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1.5">
                              <ThumbsDown className="w-3.5 h-3.5 text-rose-700" />
                              <span>Điểm Yếu Tử Huyệt (Weaknesses):</span>
                            </div>
                            <ul className="list-disc list-inside text-rose-950 space-y-1 text-[11px]">
                              {(selectedCompetitor.swotAnalysis?.weaknesses || selectedCompetitor.weaknesses).map((w, idx) => (
                                <li key={idx} className="leading-relaxed font-semibold">{w}</li>
                              ))}
                            </ul>
                          </div>

                          {/* O - OPPORTUNITIES */}
                          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                            <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1.5">
                              <Zap className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Cơ Hội Của BOGI Logistics (Opportunities):</span>
                            </div>
                            <ul className="list-disc list-inside text-emerald-950 space-y-1 text-[11px]">
                              {(selectedCompetitor.swotAnalysis?.opportunities || selectedCompetitor.winningCounterTactics).map((o, idx) => (
                                <li key={idx} className="leading-relaxed">{o}</li>
                              ))}
                            </ul>
                          </div>

                          {/* T - THREATS */}
                          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                            <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                              <span>Thách Thức Cần Đề Phòng (Threats):</span>
                            </div>
                            <ul className="list-disc list-inside text-amber-950 space-y-1 text-[11px]">
                              {(selectedCompetitor.swotAnalysis?.threats || ['Họ có quan hệ lâu năm với khách hàng']).map((t, idx) => (
                                <li key={idx} className="leading-relaxed">{t}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* BATTLECARD SALES VŨ KHÍ HẠ GỤC (KILL PITCH) */}
                      {selectedCompetitor.killPitchVi && (
                        <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                              <Flame className="w-4 h-4 text-amber-400" />
                              <span>Lời Thoại Hạ Gục (Kill Pitch) Khi Khách Nhắc Tên Họ:</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedCompetitor.killPitchVi || '', 'kill_pitch')}
                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedState === 'kill_pitch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedState === 'kill_pitch' ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                            "{selectedCompetitor.killPitchVi}"
                          </p>
                        </div>
                      )}

                      {/* ZALO SCRIPT TEMPLATE */}
                      {selectedCompetitor.zaloScriptVi && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                              <span>Mẫu Tin Nhắn Zalo Phản Hồi Khách Hàng (1-Click Copy):</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedCompetitor.zaloScriptVi || '', 'zalo_script')}
                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedState === 'zalo_script' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedState === 'zalo_script' ? 'Đã sao chép Zalo' : 'Chép gửi Zalo'}</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-blue-950 bg-white p-2.5 rounded-lg border border-blue-100 whitespace-pre-wrap leading-relaxed">
                            {selectedCompetitor.zaloScriptVi}
                          </p>
                        </div>
                      )}

                      {/* BỘ CÂU HỎI BẪY (TRAP QUESTIONS) */}
                      {selectedCompetitor.trapQuestionsVi && selectedCompetitor.trapQuestionsVi.length > 0 && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Câu Hỏi Gợi Mở Để Khách Tự Thấy Nhược Điểm Của Đối Thủ:</span>
                          </span>
                          <div className="space-y-1 pl-1">
                            {selectedCompetitor.trapQuestionsVi.map((q, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                <span className="font-bold text-indigo-600 shrink-0">?</span>
                                <span>{q}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </>
                  ) : (
                    <div className="py-20 text-center text-slate-400">
                      Chọn một đối thủ bên trái để xem phân tích chi tiết.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 2: AI QUÉT ĐỐI THỦ THÔNG MINH & BÓC TÁCH BÁO GIÁ ĐỐI THỦ          */}
          {/* ======================================================================= */}
          {activeTab === 'AI_SCANNER' && (
            <div className="space-y-5">
              
              {/* Sub-mode selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAiScanMode('SINGLE_COMPETITOR')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    aiScanMode === 'SINGLE_COMPETITOR'
                      ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>1. Quét Sâu 1 Đối Thủ Bất Kỳ</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nhập tên bất kỳ FWD nào tại VN, AI sẽ bóc tách SWOT & sinh ra Battlecard
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAiScanMode('LANE_SCAN')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    aiScanMode === 'LANE_SCAN'
                      ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                    <Ship className="w-4 h-4 text-blue-600" />
                    <span>2. Quét Đối Thủ Theo Tuyến Hàng</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Xem các bên đang thống trị tuyến Mỹ, Châu Âu, Nội Á và mức giá cước
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAiScanMode('TEARDOWN_QUOTE')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    aiScanMode === 'TEARDOWN_QUOTE'
                      ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>3. Bóc Tách Báo Giá Đối Thủ</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dán báo giá khách gửi, AI tìm bẫy phụ phí ẩn & soạn kịch bản phản đòn
                  </p>
                </button>
              </div>

              {/* MODE 1: SINGLE COMPETITOR SCAN */}
              {aiScanMode === 'SINGLE_COMPETITOR' && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-indigo-600" />
                        <span>AI Quét Toàn Diện Forwarder Việt Nam:</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dùng mô hình Gemini AI để truy xuất dữ liệu thị trường, phân tích SWOT và vũ khí hạ gục
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên công ty FWD cần quét (*):</label>
                      <input
                        type="text"
                        value={scanCompName}
                        onChange={(e) => setScanCompName(e.target.value)}
                        placeholder="VD: Dolphin Sea Air, Viconship, Hải An..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Trụ sở / Khu vực (tùy chọn):</label>
                      <input
                        type="text"
                        value={scanCompHq}
                        onChange={(e) => setScanCompHq(e.target.value)}
                        placeholder="VD: Hải Phòng, TP.HCM, Hà Nội..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tuyến trọng tâm (tùy chọn):</label>
                      <input
                        type="text"
                        value={scanCompLane}
                        onChange={(e) => setScanCompLane(e.target.value)}
                        placeholder="VD: Tuyến Mỹ, Hải Phòng -> Rotterdam..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunCompetitorScan}
                      disabled={isScanningComp || !scanCompName.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      {isScanningComp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                      <span>{isScanningComp ? 'Đang quét AI...' : 'Bắt Đầu Quét Trí Tuệ AI'}</span>
                    </button>
                  </div>

                  {/* Scan Result Output */}
                  {scanResult && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Kết quả quét cho: {scanResult.competitor.name}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                          {scanResult.competitor.tier}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {scanResult.marketIntelligenceSummaryVi}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                          <span className="font-bold text-rose-900 block mb-1">Tử huyệt cạnh tranh của họ:</span>
                          <ul className="list-disc list-inside text-rose-950 space-y-0.5 text-[11px]">
                            {scanResult.keyVulnerabilitiesVi.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                          <span className="font-bold text-emerald-900 block mb-1">Hành động Sales BOGI cần làm ngay:</span>
                          <p className="text-emerald-950 text-[11px] leading-relaxed">
                            {scanResult.immediateSalesActionVi}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('DIRECTORY');
                            setSelectedCompetitor(scanResult.competitor);
                          }}
                          className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span>Xem Hồ Sơ SWOT & Battlecard Đầy Đủ</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: TRADE LANE SCAN */}
              {aiScanMode === 'LANE_SCAN' && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-600" />
                      <span>Quét Bản Đồ Đối Thủ Theo Tuyến Vận Tải (Trade Lane Radar):</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Xem đối thủ nào đang nắm thị phần lớn nhất trên tuyến và chiến lược đánh chiếm khách hàng
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cảng đi (POL / Origin):</label>
                      <input
                        type="text"
                        value={scanOrigin}
                        onChange={(e) => setScanOrigin(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cảng đến (POD / Destination):</label>
                      <input
                        type="text"
                        value={scanDestination}
                        onChange={(e) => setScanDestination(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunLaneScan}
                      disabled={isScanningLane}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      {isScanningLane ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>{isScanningLane ? 'Đang phân tích tuyến...' : 'Quét Cục Diện Đối Thủ Tuyến Này'}</span>
                    </button>
                  </div>

                  {laneScanResult && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Tuyến: {laneScanResult.lane}
                        </span>
                        <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                          Đầu bảng: {laneScanResult.marketLeader}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {laneScanResult.keyCompetitors.map((c, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{c.name}</span>
                              <span className="text-indigo-600 font-mono">${c.typicalRateUsd}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">{c.estimatedShare}</div>
                            <div className="text-[11px] text-emerald-700 pt-1">
                              <strong>Ưu:</strong> {c.pros}
                            </div>
                            <div className="text-[11px] text-rose-700">
                              <strong>Nhược:</strong> {c.cons}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chiến Lược Chiến Thắng Cho BOGI Logistics:</span>
                        </span>
                        <p className="text-[11px] text-indigo-950 leading-relaxed">
                          {laneScanResult.bogiStrategyRecommendation}
                        </p>
                        <div className="pt-1 font-mono font-bold text-xs text-indigo-800">
                          Mức giá điểm ngọt khuyến nghị: ${laneScanResult.priceSweetSpotUsd} / cont
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: QUOTE TEARDOWN */}
              {aiScanMode === 'TEARDOWN_QUOTE' && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Bóc Tách & Bẻ Gãy Báo Giá Đối Thủ (Quote Tear-Down Engine):</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dán nội dung tin nhắn Zalo hoặc email báo giá của đối thủ, AI sẽ phát hiện các bẫy phụ phí ẩn & viết kịch bản phản đòn
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên đối thủ báo giá (nếu biết):</label>
                    <input
                      type="text"
                      value={teardownCompName}
                      onChange={(e) => setTeardownCompName(e.target.value)}
                      placeholder="VD: Kuehne+Nagel, Bee Logistics, Maersk Spot..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung báo giá của đối thủ (*):</label>
                    <textarea
                      rows={5}
                      value={teardownQuoteText}
                      onChange={(e) => setTeardownQuoteText(e.target.value)}
                      placeholder="Dán nội dung báo giá của đối thủ vào đây (Ví dụ: Ocean Freight $1750, THC $140, Bill $40, Free time 5 days...)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none font-mono leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunQuoteTeardown}
                      disabled={isTearingDown || !teardownQuoteText.trim()}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      {isTearingDown ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4 text-amber-300" />}
                      <span>{isTearingDown ? 'Đang bóc tách chi phí...' : 'Bóc Tách & Soạn Kịch Bản Phản Đòn'}</span>
                    </button>
                  </div>

                  {teardownResult && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-rose-200 space-y-4">
                      <div className="font-bold text-rose-950 text-sm flex items-center gap-2 border-b pb-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Phát hiện các bẫy phụ phí ẩn trong báo giá của {teardownResult.competitorName}:</span>
                      </div>

                      {/* Hidden Fees Cards */}
                      <div className="space-y-2">
                        {teardownResult.hiddenFeeAlerts.map((fee, i) => (
                          <div key={i} className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-rose-900">
                              <span>⚠️ {fee.feeName}</span>
                              <span className="font-mono text-rose-700">{fee.estimatedCost}</span>
                            </div>
                            <p className="text-[11px] text-rose-950 leading-relaxed">
                              {fee.descriptionVi}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Counter Pitch Script */}
                      <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 text-xs">
                            Kịch Bản Lời Thoại Phản Đòn Gọi Cho Khách:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(teardownResult.counterPitchVi, 'teardown_pitch')}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedState === 'teardown_pitch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedState === 'teardown_pitch' ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed italic">
                          "{teardownResult.counterPitchVi}"
                        </p>
                      </div>

                      {/* Zalo Message */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">
                            Tin Nhắn Zalo Khóa Đơn Gửi Ngay:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(teardownResult.zaloMessageTemplateVi, 'teardown_zalo')}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedState === 'teardown_zalo' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedState === 'teardown_zalo' ? 'Đã sao chép' : 'Chép gửi Zalo'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-blue-950 bg-white p-2.5 rounded-lg border border-blue-100 whitespace-pre-wrap">
                          {teardownResult.zaloMessageTemplateVi}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 3: MA TRẬN SO SÁNH ĐỐI ĐẦU TRỰC DIỆN (BOGI VS COMPETITOR MATRIX)    */}
          {/* ======================================================================= */}
          {activeTab === 'HEAD_TO_HEAD' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Ma Trận So Sánh Đối Đầu Trực Diện: BOGI Logistics vs Đối Thủ
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Đánh giá 8 tiêu chí cốt lõi của hợp đồng Logistics để tìm ra thế mạnh chốt đơn
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Chọn đối thủ so sánh:</span>
                  <select
                    value={compareCompetitorId}
                    onChange={(e) => setCompareCompetitorId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:outline-none"
                  >
                    {competitors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Head-to-Head Comparison Table */}
              {(() => {
                const comp = competitors.find(c => c.id === compareCompetitorId) || competitors[0];
                if (!comp) return null;

                const isGlobal = comp.tier === 'TIER_1_GLOBAL';
                const isCarrier = comp.tier === 'DIRECT_CARRIER';
                const isBudget = comp.tier === 'BUDGET_FORWARDER';

                const criteria = [
                  {
                    title: '1. Cước vận chuyển chính (Ocean/Air Freight)',
                    bogi: 'Cực kỳ cạnh tranh theo hợp đồng hãng tàu trực tiếp',
                    competitor: isGlobal ? 'Cao hơn 5-10% do chi phí thương hiệu' : isBudget ? 'Rẻ hơn 3-5% để câu khách' : 'Tương đương thị trường',
                    winner: isBudget ? 'COMPETITOR' : 'BOGI'
                  },
                  {
                    title: '2. Phụ phí Local Charges & Tính minh bạch',
                    bogi: '100% Minh bạch All-in, không bao giờ phát sinh phụ phí ẩn',
                    competitor: isGlobal ? 'Phí chứng từ & Handling rất đắt đỏ' : isBudget ? 'Dày đặc phụ phí ẩn tại cảng đích' : 'Biểu phí tiêu chuẩn',
                    winner: 'BOGI'
                  },
                  {
                    title: '3. Tốc độ báo giá & Phản hồi',
                    bogi: 'Phản hồi trong 15-30 phút, chuyên viên tư vấn 1-1 qua Zalo',
                    competitor: isGlobal ? 'Chậm chạp (mất 24-48h qua hệ thống ticket)' : isCarrier ? 'Báo giá tự động web nhưng không có người hỗ trợ' : 'Trong ngày',
                    winner: 'BOGI'
                  },
                  {
                    title: '4. Chính sách Free Time DEM/DET tại cảng đến',
                    bogi: 'Tặng kèm 14 - 21 ngày Free Time miễn phí',
                    competitor: isCarrier ? 'Chỉ cho 5-7 ngày, phạt $150-$180/ngày' : isGlobal ? '7-10 ngày tiêu chuẩn' : '7 ngày',
                    winner: 'BOGI'
                  },
                  {
                    title: '5. Hỗ trợ thủ tục Hải quan & C/O tại Việt Nam',
                    bogi: 'Đội ngũ hiện trường xử lý 24/7 tại Cát Lái/Hải Phòng, hỗ trợ C/O form E/AK/D',
                    competitor: isCarrier ? 'Không làm hải quan' : isGlobal ? 'Thu phí dịch vụ khai thuê rất cao' : 'Có hỗ trợ',
                    winner: 'BOGI'
                  },
                  {
                    title: '6. Xử lý sự cố & Linh hoạt đổi ngày tàu',
                    bogi: 'Hỗ trợ đổi chuyến không phạt tiền cọc khi xưởng chậm tiến độ',
                    competitor: isCarrier ? 'Phạt hủy booking $300-$500/cont' : 'Thủ tục dời tàu phức tạp',
                    winner: 'BOGI'
                  },
                  {
                    title: '7. Cổng Portal khách hàng & Theo dõi (Tracking)',
                    bogi: 'Portal tra cứu trực tuyến, e-Sign báo giá 1 chạm',
                    competitor: isGlobal ? 'Có myKN/myDHL mạnh mẽ' : 'Gửi file Excel cập nhật thủ công',
                    winner: isGlobal ? 'TIE' : 'BOGI'
                  },
                  {
                    title: '8. Chính sách công nợ & Thanh toán',
                    bogi: 'Linh hoạt công nợ 30-45 ngày cho doanh nghiệp thân thiết',
                    competitor: isCarrier ? 'Thanh toán ngay trước khi lấy lệnh' : isGlobal ? 'Xét duyệt bảo lãnh ngân hàng gắt gao' : '15-30 ngày',
                    winner: 'BOGI'
                  }
                ];

                return (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                          <th className="py-3 px-4 w-[28%]">Tiêu Chí Đánh Giá</th>
                          <th className="py-3 px-4 w-[36%] bg-indigo-900/80 text-indigo-100">
                            ⭐ BOGI Logistics
                          </th>
                          <th className="py-3 px-4 w-[36%] bg-slate-800">
                            🏢 {comp.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {criteria.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-bold text-slate-800 align-top">
                              {item.title}
                            </td>
                            <td className="py-3 px-4 bg-indigo-50/20 text-indigo-950 font-medium align-top">
                              <div className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item.bogi}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 align-top">
                              <div className="flex items-start gap-1.5">
                                {item.winner === 'BOGI' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                )}
                                <span>{item.competitor}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 4: MÔ PHỎNG GIÁ & ĐIỂM NGỌT SWEET SPOT                             */}
          {/* ======================================================================= */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-6">
              
              {/* Header Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">Tuyến khảo sát:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {activeBenchmark.pol} ➔ {activeBenchmark.pod} ({activeBenchmark.containerType})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Biên độ thị trường: P10 Low: <strong>${activeBenchmark.p10LowPrice}</strong> | P50 Median: <strong>${activeBenchmark.p50MedianPrice}</strong> | P90 High: <strong>${activeBenchmark.p90HighPrice}</strong>
                  </div>
                </div>

                {onApplySweetSpotPrice && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplySweetSpotPrice(winProbResult.sweetSpotPrice);
                      onClose();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Áp Dụng Giá Sweet-Spot (${winProbResult.sweetSpotPrice})</span>
                  </button>
                )}
              </div>

              {/* Price Interactive Slider */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Giả Lập Giá Bán Đề Xuất (Price Elasticity Slider)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Kéo thanh trượt để kiểm tra xác suất trúng thầu và mức lợi nhuận kỳ vọng
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-semibold">Giá vốn:</span>
                      <input
                        type="number"
                        value={costPrice}
                        onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                        className="w-20 text-xs font-mono font-bold text-right bg-white border border-slate-300 rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-slate-500 font-bold">$</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                      <span className="text-xs text-indigo-900 font-semibold">Giá bán:</span>
                      <input
                        type="number"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(Number(e.target.value) || 0)}
                        className="w-20 text-xs font-mono font-extrabold text-right bg-white border border-indigo-300 text-indigo-950 rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-indigo-900 font-bold">$</span>
                    </div>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min={Math.round(costPrice * 0.95)}
                    max={Math.round(activeBenchmark.p90HighPrice * 1.2)}
                    step={10}
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>Sàn Cost: ${Math.round(costPrice * 0.95)}</span>
                    <span className="text-emerald-600 font-bold">P10: ${activeBenchmark.p10LowPrice}</span>
                    <span className="text-indigo-600 font-bold">P50: ${activeBenchmark.p50MedianPrice}</span>
                    <span className="text-rose-600 font-bold">P90: ${activeBenchmark.p90HighPrice}</span>
                    <span>Max: ${Math.round(activeBenchmark.p90HighPrice * 1.2)}</span>
                  </div>
                </div>

                {/* Probability & Sweet Spot 2-Col Result */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Left: Win Rate & Proposed Rating */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Xác Suất Thắng Thầu:</span>
                      <span className="text-2xl font-extrabold font-mono text-indigo-600">
                        {winProbResult.winProbabilityPercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          winProbResult.winProbabilityPercent >= 80 ? 'bg-emerald-500' :
                          winProbResult.winProbabilityPercent >= 65 ? 'bg-indigo-600' :
                          winProbResult.winProbabilityPercent >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${winProbResult.winProbabilityPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 text-slate-600">
                      <span>Lợi nhuận gộp đề xuất:</span>
                      <span className="font-mono font-bold text-slate-900">
                        +${winProbResult.expectedProfitProposed} ({winProbResult.marginPercentAtProposed}%)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                      💡 {winProbResult.analysisSummaryVi}
                    </p>
                  </div>

                  {/* Right: Sweet-Spot Vàng */}
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <span>Điểm Ngọt Tối Ưu (Sweet Spot):</span>
                      </span>
                      <span className="text-2xl font-black font-mono text-indigo-700">
                        ${winProbResult.sweetSpotPrice}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-indigo-900">
                      <span>Xác suất trúng thầu tại Sweet-Spot:</span>
                      <span className="font-mono font-bold">{winProbResult.sweetSpotWinProbability}%</span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-indigo-200 pt-1 text-indigo-900">
                      <span>Lợi nhuận gộp tại Sweet-Spot:</span>
                      <span className="font-mono font-bold text-indigo-950">
                        +${winProbResult.expectedProfitSweetSpot} ({winProbResult.marginPercentAtSweetSpot}%)
                      </span>
                    </div>

                    <p className="text-[11px] text-indigo-950 leading-relaxed font-semibold bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                      🎯 Khuyến nghị: {winProbResult.suggestedActionVi}
                    </p>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 5: BẢN ĐỒ CƯỚC THỊ TRƯỜNG                                         */}
          {/* ======================================================================= */}
          {activeTab === 'BENCHMARKS' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Bản Đồ Cước Thị Trường Tuyến Chính (Lane Market Radar)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu khảo sát từ các hãng tàu quốc tế và báo giá thực tế trên thị trường
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STANDARD_LANE_BENCHMARKS.map((bm) => (
                  <div 
                    key={bm.id}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedBenchmarkId === bm.id
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{bm.pol} ➔ {bm.pod}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {bm.containerType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Khảo sát: {bm.sampleQuotesCount} báo giá • Cập nhật: {bm.lastUpdated}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        bm.trend === 'RISING' ? 'bg-rose-100 text-rose-700' :
                        bm.trend === 'FALLING' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        Xu hướng: {bm.trend === 'RISING' ? 'Tăng' : bm.trend === 'FALLING' ? 'Giảm' : 'Ổn định'}
                      </span>
                    </div>

                    {/* Percentile Stats */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-2 bg-slate-50 rounded-lg text-center">
                      <div>
                        <div className="text-[10px] text-slate-500">P10 (Giá thấp)</div>
                        <div className="text-sm font-bold text-emerald-600">${bm.p10LowPrice}</div>
                      </div>
                      <div className="border-x border-slate-200">
                        <div className="text-[10px] text-slate-500">P50 (Trung bình)</div>
                        <div className="text-sm font-extrabold text-slate-900">${bm.p50MedianPrice}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">P90 (Giá cao)</div>
                        <div className="text-sm font-bold text-rose-600">${bm.p90HighPrice}</div>
                      </div>
                    </div>

                    {/* Carrier Breakdown */}
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="font-semibold text-slate-700">Bình quân theo Hãng tàu:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(bm.carrierAverages).map(([carrier, avgPrice]) => (
                          <span key={carrier} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {carrier}: <strong className="text-slate-900">${avgPrice}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBenchmarkId(bm.id);
                          setProposedPrice(bm.p50MedianPrice);
                          setActiveTab('SIMULATOR');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Mô phỏng giá tuyến này</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 6: NHẬT KÝ THẮNG / THUA DEAL (WIN/LOSS LOGGER)                      */}
          {/* ======================================================================= */}
          {activeTab === 'WIN_LOSS_LOG' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Ghi Nhận Kết Quả Đàm Phán Thực Tế (Win / Loss Feedback)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu ghi nhận sẽ tự động hiệu chỉnh độ chính xác của mô hình dự báo Win-Rate theo thời gian
                </p>
              </div>

              {wlSavedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã ghi nhận kết quả thành công! Mô hình đã được cập nhật dữ liệu.</span>
                </div>
              )}

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
                
                {/* Won / Lost Selector */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Kết quả thương lượng:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWlOutcome('WON')}
                      className={`py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        wlOutcome === 'WON'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>THẮNG DEAL (WON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWlOutcome('LOST')}
                      className={`py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        wlOutcome === 'LOST'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>THUA DEAL (LOST)</span>
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Đối thủ cạnh tranh trực tiếp:</label>
                    <select
                      value={wlCompetitor}
                      onChange={(e) => setWlCompetitor(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      {competitors.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="Khác">Đối thủ khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Lý do chính yếu:</label>
                    <select
                      value={wlReason}
                      onChange={(e) => setWlReason(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="PRICE">Giá cước (Price)</option>
                      <option value="TRANSIT_TIME">Thời gian vận chuyển (Transit Time)</option>
                      <option value="FREE_TIME">Thời gian miễn phí (Free Time DEM/DET)</option>
                      <option value="PAYMENT_TERMS">Điều khoản công nợ (Credit / Payment)</option>
                      <option value="SPACE_AVAILABILITY">Chỗ / Vỏ container (Space & Equipment)</option>
                      <option value="CUSTOMER_RELATIONSHIP">Mối quan hệ thân thiết từ trước</option>
                      <option value="OTHER">Lý do khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Ghi chú đàm phán:</label>
                  <textarea
                    rows={3}
                    value={wlNotes}
                    onChange={(e) => setWlNotes(e.target.value)}
                    placeholder="Ghi chú chi tiết phản hồi của khách hàng (VD: Khách chê cước biển cao hơn $40 nhưng khen dịch vụ hỗ trợ hải quan)..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveWinLoss}
                    disabled={isSavingWl}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                  >
                    {isSavingWl ? 'Đang lưu...' : 'Lưu Kết Quả Vào Hệ Thống'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* MODAL EDIT / ADD MANUAL COMPETITOR POPUP                                  */}
        {/* ========================================================================= */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-sm text-slate-900">
                  {editingCompetitor.id ? 'Chỉnh Sửa Hồ Sơ Đối Thủ' : 'Thêm Công Ty Forwarder Mới'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên công ty / Thương hiệu (*):</label>
                  <input
                    type="text"
                    value={editingCompetitor.name || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, name: e.target.value })}
                    placeholder="VD: Indo-Trans Logistics, Viconship..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phân loại (Tier):</label>
                    <select
                      value={editingCompetitor.tier || 'TOP_LOCAL_FORWARDER'}
                      onChange={(e) => setEditingCompetitor({ ...editingCompetitor, tier: e.target.value as any })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="TIER_1_GLOBAL">Đa Quốc Gia (MNC)</option>
                      <option value="TOP_LOCAL_FORWARDER">Top FWD Việt Nam</option>
                      <option value="NICHE_SPECIALIST">Chuyên Tuyến / Ngách</option>
                      <option value="DIRECT_CARRIER">Hãng Tàu Bán Trực Tiếp</option>
                      <option value="BUDGET_FORWARDER">FWD Giá Rẻ</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trụ sở chính:</label>
                    <input
                      type="text"
                      value={editingCompetitor.headquarters || ''}
                      onChange={(e) => setEditingCompetitor({ ...editingCompetitor, headquarters: e.target.value })}
                      placeholder="VD: TP.HCM, Hải Phòng..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Điểm yếu lớn nhất:</label>
                  <input
                    type="text"
                    value={editingCompetitor.weaknesses?.[0] || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, weaknesses: [e.target.value] })}
                    placeholder="VD: Phí local charges cao, chậm duyệt giá..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lời thoại hạ gục (Kill Pitch):</label>
                  <textarea
                    rows={2}
                    value={editingCompetitor.killPitchVi || ''}
                    onChange={(e) => setEditingCompetitor({ ...editingCompetitor, killPitchVi: e.target.value })}
                    placeholder="Lời nói khi khách hàng nhắc đến đối thủ này..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualComp}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Lưu Đối Thủ
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
