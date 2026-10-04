import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Percent, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Gift, 
  Clock, 
  MessageSquare, 
  Copy, 
  Check, 
  Send, 
  Phone, 
  Award, 
  ChevronRight, 
  X, 
  Sliders, 
  TrendingUp, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Truck,
  HelpCircle,
  FileText
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { 
  ValueAddConcession, 
  FlashIncentive, 
  ObjectionBattlecard, 
  ObjectionType 
} from '../../types/dealClosing';
import { 
  STANDARD_VALUE_ADD_CONCESSIONS, 
  OBJECTION_BATTLECARDS_CATALOG, 
  simulateDealMargin, 
  generateFlashIncentive, 
  generateMultiChannelClosingPitch, 
  recordDealClosingOutcome 
} from '../../services/dealClosing/dealClosingService';

interface DealClosingAcceleratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuoteData | null;
  companyId: string;
  onDealClosed?: (quotationId: string, outcome: 'WON' | 'LOST', shipmentId?: string) => void;
  onOpenShipmentDetail?: (shipmentId: string) => void;
}

export const DealClosingAcceleratorModal: React.FC<DealClosingAcceleratorModalProps> = ({
  isOpen,
  onClose,
  quotation,
  companyId,
  onDealClosed,
  onOpenShipmentDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'CONCESSIONS' | 'OBJECTIONS' | 'PITCH'>('SIMULATOR');
  
  // Negotiation state
  const isVnd = quotation?.quoteCurrency === 'VND';
  const originalTotal = isVnd ? (quotation?.grandTotalVnd || 0) : (quotation?.grandTotalUsd || 0);
  const originalCost = isVnd ? (quotation?.totalCostVnd || 0) : (quotation?.totalCostUsd || 0);
  const currency = quotation?.quoteCurrency || 'USD';
  const quoteNumber = quotation?.quoteNumber || 'QUOTE';
  const customerName = quotation?.customer?.companyName || quotation?.customer?.customerName || 'Khách hàng';
  const pol = quotation?.shipment?.pol || quotation?.shipment?.origin || 'Cảng đi';
  const pod = quotation?.shipment?.pod || quotation?.shipment?.destination || 'Cảng đến';
  
  const [proposedTotal, setProposedTotal] = useState<number>(originalTotal);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  
  // Concessions state
  const [concessions, setConcessions] = useState<ValueAddConcession[]>(() => 
    STANDARD_VALUE_ADD_CONCESSIONS.map(c => ({ ...c }))
  );
  
  // Selected objection battlecard
  const [selectedObjectionType, setSelectedObjectionType] = useState<ObjectionType>('COMPETITOR_LOWER');
  
  // Flash incentive state
  const [enableFlashIncentive, setEnableFlashIncentive] = useState<boolean>(true);
  const [flashHours, setFlashHours] = useState<number>(6);
  const [flashDiscountAmount, setFlashDiscountAmount] = useState<number>(30);
  
  // Pitch channel tab
  const [pitchChannel, setPitchChannel] = useState<'ZALO' | 'WHATSAPP' | 'EMAIL'>('ZALO');
  const [copiedState, setCopiedState] = useState<string | null>(null);
  
  // Outcome recording state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [winLossNotes, setWinLossNotes] = useState<string>('');
  const [wonSuccessState, setWonSuccessState] = useState<{
    isWon: boolean;
    shipmentId?: string;
  } | null>(null);

  // Sync initial proposal when quote changes
  useEffect(() => {
    if (quotation) {
      const isV = quotation.quoteCurrency === 'VND';
      const tot = isV ? (quotation.grandTotalVnd || 0) : (quotation.grandTotalUsd || 0);
      setProposedTotal(tot);
      setDiscountInput(0);
      setWonSuccessState(null);
    }
  }, [quotation]);

  // Handle discount change
  const handleDiscountChange = (val: number, type: 'AMOUNT' | 'PERCENT') => {
    setDiscountInput(val);
    setDiscountType(type);
    if (type === 'AMOUNT') {
      const newTotal = Math.max(0, originalTotal - val);
      setProposedTotal(newTotal);
    } else {
      const discountVal = (originalTotal * val) / 100;
      setProposedTotal(Math.max(0, originalTotal - discountVal));
    }
  };

  // Run simulation
  const simulation = useMemo(() => {
    return simulateDealMargin({
      originalTotal,
      originalCost,
      proposedCustomerTotal: proposedTotal,
      currency,
      minMarginPercent: 8,
      targetMarginPercent: 15,
      quotationId: quotation?.id,
      quotationNumber: quoteNumber,
      customerName
    });
  }, [originalTotal, originalCost, proposedTotal, currency, quotation?.id, quoteNumber, customerName]);

  // Selected concessions
  const selectedConcessions = useMemo(() => {
    return concessions.filter(c => c.isSelected);
  }, [concessions]);

  const totalPerceivedValue = useMemo(() => {
    return selectedConcessions.reduce((sum, c) => sum + c.perceivedValue, 0);
  }, [selectedConcessions]);

  const totalCompanyCost = useMemo(() => {
    return selectedConcessions.reduce((sum, c) => sum + c.companyCost, 0);
  }, [selectedConcessions]);

  const toggleConcession = (id: string) => {
    setConcessions(prev => prev.map(c => c.id === id ? { ...c, isSelected: !c.isSelected } : c));
  };

  // Active flash incentive
  const flashIncentive = useMemo(() => {
    if (!enableFlashIncentive) return undefined;
    return generateFlashIncentive({
      quotationNumber: quoteNumber,
      discountType: 'FIXED_TOTAL',
      discountAmount: flashDiscountAmount,
      currency,
      durationHours: flashHours,
    });
  }, [enableFlashIncentive, quoteNumber, flashDiscountAmount, currency, flashHours]);

  // Closing pitch messages
  const actionPortalUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const quoteId = quotation?.id || 'quote';
      return `${window.location.origin}${window.location.pathname}#q/${quoteId}`;
    }
    return `https://app.logistics.io/#q/${quotation?.id || 'quote'}`;
  }, [quotation?.id]);

  const pitchMessages = useMemo(() => {
    return generateMultiChannelClosingPitch({
      customerName,
      quotationNumber: quoteNumber,
      routePol: pol,
      routePod: pod,
      finalPrice: proposedTotal,
      currency,
      concessions: selectedConcessions,
      flashIncentive,
      actionPortalUrl,
      salesName: 'Chuyên viên Báo giá Logistics',
    });
  }, [customerName, quoteNumber, pol, pod, proposedTotal, currency, selectedConcessions, flashIncentive, actionPortalUrl]);

  // Active battlecard
  const activeBattlecard = useMemo(() => {
    return OBJECTION_BATTLECARDS_CATALOG.find(b => b.type === selectedObjectionType) || OBJECTION_BATTLECARDS_CATALOG[0];
  }, [selectedObjectionType]);

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedState(label);
      setTimeout(() => setCopiedState(null), 2500);
    }
  };

  // Handle Win Deal
  const handleConfirmWinDeal = async () => {
    if (!quotation) return;
    setIsSubmitting(true);
    try {
      const result = await recordDealClosingOutcome({
        quotation,
        companyId,
        outcome: 'WON',
        closedPrice: proposedTotal,
        selectedConcessions,
        flashIncentive,
        winLossReason: winLossNotes || 'Khách đồng ý phương án giá đàm phán và nhận gói Concession 14 ngày Free DEM/DET.',
        closedBy: 'Sales Representative',
        autoCreateShipment: true
      });

      setWonSuccessState({
        isWon: true,
        shipmentId: result.createdShipmentId
      });

      if (onDealClosed) {
        onDealClosed(quotation.id, 'WON', result.createdShipmentId);
      }
    } catch (err) {
      console.error('Failed to record win deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Lost Deal
  const handleConfirmLostDeal = async () => {
    if (!quotation) return;
    const reason = prompt('Vui lòng nhập lý do khách không chốt đơn (để hệ thống ghi nhận BI):', 'Khách chọn đối thủ khác / hoãn kế hoạch xuất hàng');
    if (reason === null) return;

    setIsSubmitting(true);
    try {
      await recordDealClosingOutcome({
        quotation,
        companyId,
        outcome: 'LOST',
        closedPrice: proposedTotal,
        selectedConcessions: [],
        winLossReason: reason || 'Khách từ chối không rõ nguyên nhân',
        closedBy: 'Sales Representative',
        autoCreateShipment: false
      });

      if (onDealClosed) {
        onDealClosed(quotation.id, 'LOST');
      }
      onClose();
    } catch (err) {
      console.error('Failed to record lost deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !quotation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center rounded-none shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Trợ Lý Đàm Phán & Chốt Đơn
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Gói B • Phase 55
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Báo giá: <strong className="text-slate-800 dark:text-slate-200">{quoteNumber}</strong> • Khách hàng: <strong className="text-slate-800 dark:text-slate-200">{customerName}</strong> • Tuyến: <strong className="text-slate-800 dark:text-slate-200">{pol} ➔ {pod}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-6 gap-2 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'SIMULATOR'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            1. Bàn Đàm Phán & Giá Sàn (Margin)
            {simulation.floorStatus === 'BREACH' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('CONCESSIONS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'CONCESSIONS'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            2. Vũ Khí Giá Trị Gia Tăng (Concessions)
            <span className="px-1.5 py-0.2 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {selectedConcessions.length} đã chọn
            </span>
          </button>

          <button
            onClick={() => setActiveTab('OBJECTIONS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'OBJECTIONS'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Phone className="w-4 h-4" />
            3. Kịch Bản Đối Kháng (Battlecards)
          </button>

          <button
            onClick={() => setActiveTab('PITCH')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === 'PITCH'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            4. Nhắn Chốt 1-Chạm (Multi-Channel Pitch)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-900/40">
          
          {/* Success Banner if Deal WON */}
          {wonSuccessState?.isWon && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-none flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    CHÚC MỪNG BẠN ĐÃ CHỐT DEAL THÀNH CÔNG!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Báo giá đã được chuyển sang trạng thái <strong>ACCEPTED</strong>. Đơn đặt chỗ lô hàng (Shipment Booking) đã tự động được khởi tạo trên hệ thống Điều hành.
                  </p>
                </div>
              </div>
              {wonSuccessState.shipmentId && onOpenShipmentDetail && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenShipmentDetail(wonSuccessState.shipmentId!);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  Mở Lô Hàng Ngay
                </button>
              )}
            </div>
          )}

          {/* TAB 1: MARGIN SIMULATOR */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-6">
              
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Giá Báo Ban Đầu
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {originalTotal.toLocaleString()} {currency}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Lãi gốc: {simulation.originalProfit.toLocaleString()} ({simulation.originalMarginPercent.toFixed(1)}%)
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Tổng Chi Phí Vốn (Cost)
                  </span>
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                    {originalCost.toLocaleString()} {currency}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Gồm cước hãng tàu & local charges
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Giá Sàn An Toàn (Floor)
                  </span>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {Math.round(simulation.floorPriceThreshold).toLocaleString()} {currency}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Ngưỡng tối thiểu giữ 8% margin
                  </span>
                </div>

                <div className={`p-4 border ${
                  simulation.floorStatus === 'SAFE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : simulation.floorStatus === 'WARNING'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-slate-600 dark:text-slate-300">
                    Lợi Nhuận Sau Đàm Phán
                  </span>
                  <div className={`text-xl font-bold ${
                    simulation.floorStatus === 'SAFE'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : simulation.floorStatus === 'WARNING'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {Math.round(simulation.simulatedNetProfit).toLocaleString()} {currency}
                  </div>
                  <span className="text-[11px] font-semibold">
                    Biên lãi: {simulation.simulatedMarginPercent.toFixed(1)}% ({simulation.floorStatus})
                  </span>
                </div>
              </div>

              {/* Interactive Negotiation Control */}
              <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Mô Phỏng Giá Đàm Phán Trực Tiếp
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Mức Giảm Giá Cho Khách
                    </label>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={discountInput || ''}
                          onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, discountType)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                          {discountType === 'AMOUNT' ? currency : '%'}
                        </span>
                      </div>
                      
                      <div className="flex border border-slate-300 dark:border-slate-600">
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(discountInput, 'AMOUNT')}
                          className={`px-3 py-2 text-xs font-bold ${
                            discountType === 'AMOUNT' 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {currency}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(discountInput, 'PERCENT')}
                          className={`px-3 py-2 text-xs font-bold ${
                            discountType === 'PERCENT' 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>

                    {/* Quick discount chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-slate-400 py-1">Phím nhanh:</span>
                      {[20, 50, 100, 150].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleDiscountChange(amt, 'AMOUNT')}
                          className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-mono transition-colors"
                        >
                          -{amt} {currency}
                        </button>
                      ))}
                      {[3, 5, 8].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleDiscountChange(pct, 'PERCENT')}
                          className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-mono transition-colors"
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Giá Khách Hàng Sẽ Thanh Toán (Negotiated Price)
                    </label>
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {Math.round(proposedTotal).toLocaleString()} {currency}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        (Giảm {Math.round(simulation.proposedDiscountAmount).toLocaleString()} {currency} • {simulation.proposedDiscountPercent.toFixed(1)}%)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      💡 Mẹo: Khi khách hàng mặc cả nhiều, đừng giảm cước quá sâu mà hãy giữ giá và tặng kèm <strong>Vũ Khí Giá Trị Gia Tăng (Tab 2)</strong>!
                    </p>
                  </div>
                </div>

                {/* Floor Alert Box */}
                <div className={`p-4 border ${
                  simulation.floorStatus === 'SAFE'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : simulation.floorStatus === 'WARNING'
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {simulation.floorStatus === 'SAFE' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : simulation.floorStatus === 'WARNING' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          {simulation.floorStatus === 'SAFE'
                            ? 'LỢI NHUẬN AN TOÀN - ĐƯỢC PHÉP CHỐT NGAY'
                            : simulation.floorStatus === 'WARNING'
                            ? 'CẢNH BÁO BIÊN LỢI NHUẬN CẬN BIÊN (8% - 15%)'
                            : 'VI PHẠM GIÁ SÀN - CẦN GIÁM ĐỐC KINH DOANH PHÊ DUYỆT'}
                        </h4>
                      </div>
                      
                      <p className="text-xs mt-1 text-slate-700 dark:text-slate-300">
                        {simulation.approvalReason || 'Mức giá đàm phán hoàn toàn nằm trong biên độ cho phép.'}
                      </p>

                      {/* Sweet-Spot Counter Offer */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="text-xs">
                          <strong className="text-slate-900 dark:text-white">Mức Phản Hồi Tối Ưu (Sweet Spot):</strong>{' '}
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {simulation.recommendedCounterPrice.toLocaleString()} {currency}
                          </span>
                          <span className="text-slate-500 block text-[11px]">
                            {simulation.recommendedCounterReason}
                          </span>
                        </div>
                        {proposedTotal !== simulation.recommendedCounterPrice && (
                          <button
                            type="button"
                            onClick={() => {
                              setProposedTotal(simulation.recommendedCounterPrice);
                              setDiscountInput(originalTotal - simulation.recommendedCounterPrice);
                              setDiscountType('AMOUNT');
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 transition-colors"
                          >
                            Áp Dụng Sweet Spot
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: VALUE-ADD CONCESSIONS */}
          {activeTab === 'CONCESSIONS' && (
            <div className="space-y-6">
              
              {/* Value Leverage Hero Card */}
              <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-800 shadow-md">
                <div>
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block mb-1">
                    BẢO BỐI CHỐT DEAL "KHÔNG CẮT MÁU CƯỚC TÀU"
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Tặng Giá Trị Cảm Nhận Khủng Để Khách Ký Ngay
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Thay vì giảm trực tiếp tiền cước làm tụt lợi nhuận công ty, hãy trao cho khách các đặc quyền logistics có giá trị cảm nhận cao gấp 5-10 lần chi phí thực tế.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-3 border border-white/20">
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-300 block uppercase">Giá Trị Khách Nhận</span>
                    <span className="text-lg font-bold text-emerald-300 font-mono">
                      +${totalPerceivedValue}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-300 block uppercase">Chi Phí Của Ta</span>
                    <span className="text-lg font-bold text-white font-mono">
                      ${totalCompanyCost}
                    </span>
                  </div>
                </div>
              </div>

              {/* Concessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {concessions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleConcession(item.id)}
                    className={`p-4 border cursor-pointer transition-all ${
                      item.isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => {}} // Handled by container onClick
                          className="mt-1 w-4 h-4 text-emerald-600 rounded-none border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.nameVi}
                          </h4>
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            {item.logisticsBadgeVi}
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {item.descriptionVi}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-2 italic">
                            {item.termsAndConditions}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
                          +${item.perceivedValue}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Vốn: ${item.companyCost}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: OBJECTION BATTLECARDS */}
          {activeTab === 'OBJECTIONS' && (
            <div className="space-y-6">
              
              {/* Objection Category Selector */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {OBJECTION_BATTLECARDS_CATALOG.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedObjectionType(card.type)}
                    className={`p-3 text-left border transition-all text-xs ${
                      selectedObjectionType === card.type
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold border-slate-900 dark:border-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block truncate font-semibold">{card.titleVi}</span>
                  </button>
                ))}
              </div>

              {/* Active Battlecard Detail */}
              <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
                
                {/* Customer statement */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block mb-1">
                    CÂU KHÁCH HÀNG HAY NÓI:
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 italic">
                    "{activeBattlecard.customerVoice}"
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    🎯 <strong>Bản chất lo lắng:</strong> {activeBattlecard.rootConcern}
                  </p>
                </div>

                {/* Winning Strategy & Battle Points */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                    Chiến Thuật Lội Ngược Dòng & 3 Luận Điểm Thép
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-3 font-semibold">
                    {activeBattlecard.winningStrategy}
                  </p>
                  <div className="space-y-2">
                    {activeBattlecard.battlePoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Call Script */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Lời Thoại Khi Bốc Máy Gọi Điện Cho Khách (Call Script)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeBattlecard.callScriptVi, 'SCRIPT')}
                      className="px-2 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                    >
                      {copiedState === 'SCRIPT' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Đã sao chép!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Sao chép lời thoại
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                    {activeBattlecard.callScriptVi}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <strong className="text-slate-900 dark:text-white">Câu hỏi chốt hạ hợp đồng:</strong>{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold italic">
                      "{activeBattlecard.closingQuestion}"
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: MULTI-CHANNEL CLOSING PITCH & FLASH DEAL */}
          {activeTab === 'PITCH' && (
            <div className="space-y-6">
              
              {/* Flash Closing Incentive Config */}
              <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableFlash"
                    checked={enableFlashIncentive}
                    onChange={(e) => setEnableFlashIncentive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-none border-slate-300"
                  />
                  <div>
                    <label htmlFor="enableFlash" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                      Kích Hoạt Ưu Đãi Chốt Sớm Có Thời Hạn (Flash Closing Urgency)
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      Tạo tâm lý khẩn trương, đồng hồ đếm ngược giữ chỗ cont cho khách hàng.
                    </span>
                  </div>
                </div>

                {enableFlashIncentive && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Hết hạn trong:</span>
                      <select
                        value={flashHours}
                        onChange={(e) => setFlashHours(parseInt(e.target.value))}
                        className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value={4}>4 tiếng</option>
                        <option value={8}>8 tiếng (Hết ngày)</option>
                        <option value={24}>24 tiếng</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      <span>Giảm thêm:</span>
                      <input
                        type="number"
                        value={flashDiscountAmount}
                        onChange={(e) => setFlashDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-right"
                      />
                      <span>{currency}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Channel Selector */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
                <button
                  type="button"
                  onClick={() => setPitchChannel('ZALO')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                    pitchChannel === 'ZALO'
                      ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💬 Kịch Bản Zalo (Chốt 1-Chạm)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchChannel('WHATSAPP')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                    pitchChannel === 'WHATSAPP'
                      ? 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🟢 WhatsApp (International)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchChannel('EMAIL')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                    pitchChannel === 'EMAIL'
                      ? 'border-slate-900 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ✉️ Email Trình Lãnh Đạo
                </button>
              </div>

              {/* Message Box */}
              <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {pitchChannel === 'ZALO' && 'Bản Soạn Sẵn Gửi Zalo Cho Khách (Đã Tối Ưu Hóa Ngữ Điệu)'}
                    {pitchChannel === 'WHATSAPP' && 'Standard Export Confirmation for WhatsApp'}
                    {pitchChannel === 'EMAIL' && pitchMessages.email.title}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const txt = pitchChannel === 'ZALO' 
                          ? pitchMessages.zalo.messageText 
                          : pitchChannel === 'WHATSAPP' 
                          ? pitchMessages.whatsapp.messageText 
                          : pitchMessages.email.messageText;
                        handleCopyText(txt, 'PITCH');
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      {copiedState === 'PITCH' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                          Đã Sao Chép!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Sao Chép Nội Dung
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  rows={10}
                  value={
                    pitchChannel === 'ZALO' 
                      ? pitchMessages.zalo.messageText 
                      : pitchChannel === 'WHATSAPP' 
                      ? pitchMessages.whatsapp.messageText 
                      : pitchMessages.email.messageText
                  }
                  className="w-full p-3 font-mono text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none"
                />

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    🔗 Khách bấm link sẽ mở trang <strong>Ký Duyệt Trực Tuyến & E-Signature</strong>
                  </span>
                  <a
                    href={actionPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                  >
                    Xem trước trang khách hàng <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer & Bottom Closing Action Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleConfirmLostDeal}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Khách Từ Chối (Lost Deal)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleConfirmWinDeal}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Đang lưu dữ liệu...</>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  🏆 Chốt Deal Thành Công (Win Deal) & Tạo Booking Lô Hàng
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
