import React, { useState, useMemo } from 'react';
import { 
  QuoteData, 
  SalesRoadmapStage 
} from '../../types/logistics';
import { 
  Compass, 
  FileSearch, 
  Calculator, 
  Scale, 
  Trophy, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  Info, 
  ShieldCheck, 
  Eye, 
  Send, 
  Check, 
  Maximize2, 
  Minimize2,
  Zap,
  HelpCircle,
  Lightbulb,
  FileCheck2,
  Users,
  Search,
  Sliders,
  DollarSign,
  Flame,
  Swords
} from 'lucide-react';

interface SmartSalesRoadmapProps {
  quote: QuoteData;
  onUpdateSalesStage: (newStage: SalesRoadmapStage, notes?: string) => void;
  onOpenCustomerDna?: () => void;
  onOpenHsCodeTariff?: () => void;
  onOpenMultiOptionQuote?: () => void;
  onOpenCompetitorRadar?: () => void;
  onOpenConcessionGuard?: () => void;
  onOpenDealCloser?: () => void;
  onOpenSendModal?: () => void;
  className?: string;
}

export interface StageDefinition {
  id: SalesRoadmapStage;
  stepIndex: number;
  titleVi: string;
  titleEn: string;
  shortDescVi: string;
  winProbability: number;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
    bar: string;
  };
  checklist: {
    id: string;
    labelVi: string;
    checkFn: (q: QuoteData) => boolean;
  }[];
  coachingTipVi: string;
  primaryActionLabelVi: string;
  actionKey: string;
}

export const STAGES_CONFIG: StageDefinition[] = [
  {
    id: 'PROSPECTING',
    stepIndex: 1,
    titleVi: '1. Tiếp Cận',
    titleEn: 'Prospecting',
    shortDescVi: 'Xác định khách hàng & phân loại hạn mức tín dụng',
    winProbability: 15,
    icon: Compass,
    accentColor: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      glow: 'shadow-blue-500/20',
      bar: 'bg-blue-500',
    },
    checklist: [
      {
        id: 'cust_name',
        labelVi: 'Tên người liên hệ & Doanh nghiệp hợp lệ',
        checkFn: (q) => Boolean((q.customer?.companyName || q.customer?.customerName) && (q.customer.companyName || q.customer.customerName).trim().length > 2),
      },
      {
        id: 'cust_contact',
        labelVi: 'Email hoặc Số điện thoại để giao dịch',
        checkFn: (q) => Boolean(q.customer?.email || q.customer?.phone),
      },
      {
        id: 'cust_credit',
        labelVi: 'Kiểm tra hạn mức công nợ & lịch sử thanh toán',
        checkFn: (q) => Boolean(q.customer?.creditStatus !== 'LOCKED'),
      },
    ],
    coachingTipVi: 'Xác định rõ người ra quyết định (Decision Maker) và loại khách hàng (VIP/Regular/Mới) để đưa ra chiến lược giá phù hợp ngay từ đầu.',
    primaryActionLabelVi: 'Hồ Sơ Khách Hàng (DNA)',
    actionKey: 'dna',
  },
  {
    id: 'RFQ',
    stepIndex: 2,
    titleVi: '2. Tiếp Nhận RFQ',
    titleEn: 'RFQ & Scope',
    shortDescVi: 'Làm rõ cảng đi/đến, Incoterms & quy cách hàng',
    winProbability: 35,
    icon: FileSearch,
    accentColor: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      border: 'border-cyan-300 dark:border-cyan-700',
      text: 'text-cyan-700 dark:text-cyan-300',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
      glow: 'shadow-cyan-500/20',
      bar: 'bg-cyan-500',
    },
    checklist: [
      {
        id: 'route_valid',
        labelVi: 'Đã xác định cặp Cảng bốc (POL) & Cảng dỡ (POD)',
        checkFn: (q) => Boolean(q.shipment?.pol && q.shipment?.pod),
      },
      {
        id: 'commodity_info',
        labelVi: 'Tên hàng hóa & quy cách cont/trọng lượng',
        checkFn: (q) => Boolean(q.shipment?.commodity && (q.shipment.quantity > 0 || q.shipment.grossWeightKg > 0)),
      },
      {
        id: 'incoterm_defined',
        labelVi: 'Quy tắc thương mại Incoterms 2020 rõ ràng',
        checkFn: (q) => Boolean(q.terms?.incoterm),
      },
    ],
    coachingTipVi: 'Đừng chỉ nhận thông tin chung chung, hãy hỏi ngày hàng sẵn sàng (CRD) và yêu cầu free time Dem/Det của khách để đề xuất gói cước trúng đích.',
    primaryActionLabelVi: 'Tra Cứu Mã HS & Thuế',
    actionKey: 'hs_tariff',
  },
  {
    id: 'QUOTATION',
    stepIndex: 3,
    titleVi: '3. Lập Báo Giá',
    titleEn: 'Quotation Drafting',
    shortDescVi: 'Xây dựng cơ cấu cước & tối ưu biên lợi nhuận',
    winProbability: 60,
    icon: Calculator,
    accentColor: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      border: 'border-indigo-300 dark:border-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-300',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
      glow: 'shadow-indigo-500/20',
      bar: 'bg-indigo-500',
    },
    checklist: [
      {
        id: 'items_added',
        labelVi: 'Đầy đủ cước chính (Freight) & Local Charges 2 đầu',
        checkFn: (q) => Boolean(q.items && q.items.length >= 2),
      },
      {
        id: 'margin_safe',
        labelVi: 'Biên lợi nhuận gộp an toàn (Margin > 8%)',
        checkFn: (q) => Boolean(q.overallMarginPercent && q.overallMarginPercent >= 8),
      },
      {
        id: 'validity_set',
        labelVi: 'Thời hạn hiệu lực cước được quy định cụ thể',
        checkFn: (q) => Boolean(q.terms?.validityDate),
      },
    ],
    coachingTipVi: 'Áp dụng chiến lược chào 3 phương án (Express / Standard / Eco) để khách hàng tự chọn lựa thay vì đi so sánh giá với forwarder đối thủ.',
    primaryActionLabelVi: 'Chào 3 Phương Án (Multi-Option)',
    actionKey: 'multi_option',
  },
  {
    id: 'NEGOTIATION',
    stepIndex: 4,
    titleVi: '4. Đàm Phán',
    titleEn: 'Negotiation',
    shortDescVi: 'Thương lượng giá, free time & bảo vệ sàn lợi nhuận',
    winProbability: 85,
    icon: Scale,
    accentColor: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
      glow: 'shadow-amber-500/20',
      bar: 'bg-amber-500',
    },
    checklist: [
      {
        id: 'quote_sent',
        labelVi: 'Báo giá đã được gửi / khách hàng đã mở xem',
        checkFn: (q) => ['SENT', 'VIEWED', 'APPROVED'].includes(q.status),
      },
      {
        id: 'floor_respected',
        labelVi: 'Tuân thủ giá sàn (Floor Price Guard bảo vệ)',
        checkFn: (q) => q.priceRiskLevel !== 'LOSS' && q.priceRiskLevel !== 'BLOCKED',
      },
      {
        id: 'competitor_radar',
        labelVi: 'Đối chiếu mức giá thị trường & đối thủ cạnh tranh',
        checkFn: (q) => Boolean(q.items && q.items.length > 0),
      },
    ],
    coachingTipVi: 'Nguyên tắc vàng: Không bao giờ nhượng bộ về giá nếu không đổi lấy điều kiện khác (Ví dụ: Giảm $30/cont nếu khách cam kết tối thiểu 5 cont/tháng).',
    primaryActionLabelVi: 'Bảo Vệ Sàn Giá (Concession Guard)',
    actionKey: 'concession',
  },
  {
    id: 'DEAL_CLOSED',
    stepIndex: 5,
    titleVi: '5. Chốt Deal',
    titleEn: 'Deal Won & Closed',
    shortDescVi: 'Khách duyệt, cấp Booking & chuyển giao lô hàng',
    winProbability: 100,
    icon: Trophy,
    accentColor: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
      glow: 'shadow-emerald-500/20',
      bar: 'bg-emerald-500',
    },
    checklist: [
      {
        id: 'quote_accepted',
        labelVi: 'Khách hàng ký duyệt bằng văn bản / E-Sign',
        checkFn: (q) => q.status === 'ACCEPTED',
      },
      {
        id: 'booking_issued',
        labelVi: 'Yêu cầu cấp Booking gửi Hãng tàu / Airlines',
        checkFn: (q) => Boolean(q.shipment?.commodity),
      },
      {
        id: 'handover_ops',
        labelVi: 'Chuyển giao hồ sơ sang bộ phận Ops điều hành',
        checkFn: (q) => Boolean(q.quoteNumber),
      },
    ],
    coachingTipVi: 'Ngay sau khi chốt deal, gửi lời cảm ơn trang trọng và theo dõi sát sao lịch lấy vỏ container để giữ vững uy tín chất lượng dịch vụ.',
    primaryActionLabelVi: 'Chốt Deal Bắn Pháo Hoa',
    actionKey: 'closer',
  },
];

export const SmartSalesRoadmap: React.FC<SmartSalesRoadmapProps> = ({
  quote,
  onUpdateSalesStage,
  onOpenCustomerDna,
  onOpenHsCodeTariff,
  onOpenMultiOptionQuote,
  onOpenCompetitorRadar,
  onOpenConcessionGuard,
  onOpenDealCloser,
  onOpenSendModal,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Determine current active stage intelligently
  const currentStage: SalesRoadmapStage = useMemo(() => {
    if (quote.salesStage) {
      return quote.salesStage;
    }
    // Intelligent heuristic resolution based on quote fields
    if (quote.status === 'ACCEPTED') return 'DEAL_CLOSED';
    if (quote.status === 'SENT' || quote.status === 'VIEWED' || (quote.discountPercent && quote.discountPercent > 0)) {
      return 'NEGOTIATION';
    }
    if (quote.items && quote.items.length > 0) return 'QUOTATION';
    if ((quote.shipment?.pol && quote.shipment?.pod) || quote.shipment?.commodity) return 'RFQ';
    return 'PROSPECTING';
  }, [quote.salesStage, quote.status, quote.items, quote.shipment, quote.discountPercent]);

  const activeStageConfig = useMemo(() => {
    return STAGES_CONFIG.find(s => s.id === currentStage) || STAGES_CONFIG[0];
  }, [currentStage]);

  const activeIndex = STAGES_CONFIG.findIndex(s => s.id === currentStage);

  // Handle stage jump
  const handleSelectStage = (targetStage: SalesRoadmapStage) => {
    if (targetStage === currentStage) return;
    onUpdateSalesStage(targetStage);
  };

  // Next stage shortcut
  const nextStageConfig = useMemo(() => {
    if (activeIndex < STAGES_CONFIG.length - 1) {
      return STAGES_CONFIG[activeIndex + 1];
    }
    return null;
  }, [activeIndex]);

  const handleAdvanceNext = () => {
    if (nextStageConfig) {
      if (nextStageConfig.id === 'DEAL_CLOSED' && onOpenDealCloser) {
        onOpenDealCloser();
      }
      onUpdateSalesStage(nextStageConfig.id);
    }
  };

  // Action dispatcher
  const handleTriggerAction = (actionKey: string) => {
    switch (actionKey) {
      case 'dna':
        onOpenCustomerDna?.();
        break;
      case 'hs_tariff':
        onOpenHsCodeTariff?.();
        break;
      case 'multi_option':
        onOpenMultiOptionQuote?.();
        break;
      case 'concession':
        onOpenConcessionGuard?.();
        break;
      case 'closer':
        onOpenDealCloser?.();
        break;
      default:
        break;
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all ${className}`}>
      {/* Top Bar: Title, Win Probability Meter & Collapsible Toggle */}
      <div className="p-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Smart Sales Roadmap (Lộ Trình Bán Hàng 5 Giai Đoạn)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Xác suất thắng: {activeStageConfig.winProbability}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Theo dõi tiến độ từ Tiếp cận ➔ RFQ ➔ Báo giá ➔ Đàm phán ➔ Chốt deal với trợ lý chỉ dẫn thực chiến
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Next Stage Shortcut Button */}
          {nextStageConfig && (
            <button
              type="button"
              onClick={handleAdvanceNext}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={`Chuyển nhanh sang giai đoạn tiếp theo: ${nextStageConfig.titleVi}`}
            >
              <span>Tiến tới: {nextStageConfig.titleVi}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Thu gọn roadmap' : 'Mở rộng chi tiết roadmap'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5-STAGE INTERACTIVE STEPPER HUD */}
      <div className="p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {STAGES_CONFIG.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;
            const isUpcoming = idx > activeIndex;
            const IconComp = stage.icon;

            // Compute checklist completion count
            const checkedCount = stage.checklist.filter(c => c.checkFn(quote)).length;
            const totalChecks = stage.checklist.length;
            const allChecked = checkedCount === totalChecks;

            return (
              <div
                key={stage.id}
                onClick={() => handleSelectStage(stage.id)}
                className={`group relative p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? `bg-white dark:bg-slate-900 ${stage.accentColor.border} ring-2 ring-blue-500/20 shadow-md ${stage.accentColor.glow}`
                    : isCompleted
                    ? 'bg-white/80 dark:bg-slate-900/60 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400'
                    : 'bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? `${stage.accentColor.bg} ${stage.accentColor.text}`
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <IconComp className="w-3.5 h-3.5" />}
                    </div>

                    <span className={`text-xs font-bold truncate ${
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : isCompleted
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {stage.titleVi}
                    </span>
                  </div>

                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isActive
                      ? stage.accentColor.badge
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}>
                    {stage.winProbability}%
                  </span>
                </div>

                {/* Subtitle / Description */}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                  {stage.shortDescVi}
                </p>

                {/* Micro Checklist Pill Indicator */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                  <span className="text-slate-400 font-mono">
                    Checklist: <strong className={allChecked ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}>{checkedCount}/{totalChecks}</strong>
                  </span>

                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      Hiện Tại
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      Đã qua
                    </span>
                  )}
                </div>

                {/* Active Underline Glow Bar */}
                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${stage.accentColor.bar}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* EXPANDED DETAILED COACHING & CHECKLIST CONSOLE */}
      {isExpanded && (
        <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left 7 Columns: Active Stage Criteria & Checklist */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${activeStageConfig.accentColor.badge}`}>
                    {activeStageConfig.titleVi} ({activeStageConfig.titleEn})
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Mục tiêu giai đoạn:
                  </span>
                </div>

                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Xác suất chốt deal: <strong className="text-blue-600 dark:text-blue-400">{activeStageConfig.winProbability}%</strong>
                </span>
              </div>

              {/* Checklist Items */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeStageConfig.checklist.map((item) => {
                  const passed = item.checkFn(quote);
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border text-xs transition flex items-start gap-2 ${
                        passed
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        passed ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {passed ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                      </div>
                      <span className="text-[11px] leading-tight font-medium">
                        {item.labelVi}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Stage Transition Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Click vào thẻ giai đoạn bất kỳ để chuyển bước.</span>
                </div>

                <div className="flex items-center gap-2">
                  {activeIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => onUpdateSalesStage(STAGES_CONFIG[activeIndex - 1].id)}
                      className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition cursor-pointer"
                    >
                      ← Lùi lại: {STAGES_CONFIG[activeIndex - 1].titleVi}
                    </button>
                  )}

                  {nextStageConfig && (
                    <button
                      type="button"
                      onClick={handleAdvanceNext}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    >
                      <span>Hoàn tất & Sang: {nextStageConfig.titleVi}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: AI Sales Coaching & Quick Context Action */}
            <div className="lg:col-span-5 p-3.5 rounded-xl bg-gradient-to-br from-amber-50/70 via-white to-indigo-50/40 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-indigo-950/20 border border-amber-200/80 dark:border-amber-900/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>AI Sales Coaching (Bí Quyết Thực Chiến):</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{activeStageConfig.coachingTipVi}"
                </p>
              </div>

              {/* Primary Action Button for this Stage */}
              <div className="pt-2 border-t border-amber-200/50 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Công cụ hỗ trợ giai đoạn:
                </span>

                <button
                  type="button"
                  onClick={() => handleTriggerAction(activeStageConfig.actionKey)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                  <span>{activeStageConfig.primaryActionLabelVi}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
