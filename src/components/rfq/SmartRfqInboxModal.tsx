import React, { useState, useMemo, useEffect } from 'react';
import { 
  Inbox, 
  Sparkles, 
  Search, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  Send, 
  FileText, 
  ExternalLink, 
  X, 
  Ship, 
  Calendar, 
  MapPin, 
  Box, 
  Phone, 
  Mail, 
  Building, 
  ChevronRight, 
  Zap, 
  TrendingUp, 
  Layers, 
  SlidersHorizontal,
  RefreshCw,
  User,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { 
  SmartRfqItem, 
  RfqStatus, 
  RfqSource, 
  RfqUrgency 
} from '../../types/smartRfq';
import { CompanyProfile, QuoteData } from '../../types/logistics';
import { 
  SAMPLE_REAL_WORLD_RFQS, 
  parseRfqFromRawText, 
  convertRfqToQuotation, 
  matchRfqWithMasterRates,
  getLocalRfqList,
  saveLocalRfqList
} from '../../services/rfq/smartRfqService';

interface SmartRfqInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  exchangeRate?: number;
  onQuotationCreated?: (quotation: QuoteData) => void;
}

export const SmartRfqInboxModal: React.FC<SmartRfqInboxModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  exchangeRate = 25400,
  onQuotationCreated,
}) => {
  // RFQ List State
  const [rfqList, setRfqList] = useState<SmartRfqItem[]>(() => {
    const local = getLocalRfqList();
    if (local.length > 0) return local;
    // Pre-populate with sample items on first load
    return [];
  });

  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'MATCHED' | 'QUOTED' | 'URGENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New RFQ Input State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [inputRawText, setInputRawText] = useState('');
  const [inputSource, setInputSource] = useState<RfqSource>('ZALO');
  const [isParsing, setIsParsing] = useState(false);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Quote Generation State
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [conversionSuccessQuote, setConversionSuccessQuote] = useState<QuoteData | null>(null);

  // Initialize samples if empty
  useEffect(() => {
    if (rfqList.length === 0) {
      const initialItems: SmartRfqItem[] = SAMPLE_REAL_WORLD_RFQS.map((sample, idx) => {
        const id = `rfq_sample_${idx + 1}`;
        const item: SmartRfqItem = {
          id,
          companyId: companyProfile.companyId || 'company_profile',
          rfqNumber: `RFQ-2026-00${idx + 1}`,
          source: sample.source,
          rawText: sample.rawText,
          status: idx === 2 ? 'QUOTED' : (idx === 1 ? 'NEW' : 'MATCHED'),
          urgency: idx === 0 ? 'URGENT' : 'NORMAL',
          customer: {
            customerName: idx === 0 ? 'Anh Tuấn' : (idx === 1 ? 'Chị Mai (XNK)' : 'Anh Hoàng'),
            companyName: idx === 0 ? 'Cty CP May Sài Gòn' : (idx === 1 ? 'Cty TNHH Thủy Sản Biển Đông' : 'Cty Mỹ Nghệ Á Châu'),
            phone: idx === 0 ? '0912.345.678' : (idx === 1 ? '0988.765.432' : '0903.888.999'),
            email: idx === 1 ? 'mai.tran@biendongseafood.com.vn' : undefined,
          },
          shipment: {
            mode: idx === 2 ? 'SEA_LCL' : 'SEA_FCL',
            pol: idx === 2 ? 'Hai Phong Port, Vietnam' : 'Cat Lai Port, Ho Chi Minh',
            pod: idx === 0 ? 'Long Beach, USA' : (idx === 1 ? 'Tokyo, Japan' : 'Hamburg, Germany'),
            commodity: idx === 0 ? 'Hàng may mặc xuất khẩu' : (idx === 1 ? 'Tôm sú đông lạnh (-18C)' : 'Đồ thủ công mỹ nghệ mây tre'),
            containerType: idx === 0 ? "40'HC" : (idx === 1 ? "20'RF" : "LCL (CBM/KGS)"),
            quantity: idx === 0 ? 2 : 1,
            grossWeightKg: idx === 0 ? 32000 : (idx === 1 ? 18500 : 1450),
            volumeCbm: idx === 2 ? 5.2 : 68,
            incoterm: idx === 1 ? 'CIF' : 'FOB',
            freeTimeRequired: idx === 0 ? '14 Days Free DEM/DET' : '7 Days',
            specialNotes: idx === 0 ? ['Cần tàu chạy thẳng (Direct)', 'Xin 14 ngày free time'] : []
          },
          confidenceScore: 94,
          extractedAt: new Date(Date.now() - idx * 3600000).toISOString(),
          missingFields: idx === 0 ? [] : ['Chưa có ngày đóng hàng cụ thể'],
          suggestedFollowUpQuestions: idx === 1 ? ['Anh/chị dự kiến xuất hàng vào thứ mấy để bên em giữ chỗ cont lạnh?'] : [],
          createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
          updatedAt: new Date(Date.now() - idx * 3600000).toISOString(),
        };
        item.matchedRates = matchRfqWithMasterRates(item);
        item.selectedMatchIndex = 0;
        return item;
      });
      setRfqList(initialItems);
      saveLocalRfqList(initialItems);
      setSelectedRfqId(initialItems[0].id);
    } else if (!selectedRfqId && rfqList.length > 0) {
      setSelectedRfqId(rfqList[0].id);
    }
  }, [companyProfile.companyId, rfqList.length, selectedRfqId]);

  // Selected Active RFQ
  const activeRfq = useMemo(() => {
    return rfqList.find(r => r.id === selectedRfqId) || rfqList[0] || null;
  }, [rfqList, selectedRfqId]);

  // Filtered List
  const filteredRfqList = useMemo(() => {
    return rfqList.filter(item => {
      // Status filter
      if (statusFilter === 'NEW' && item.status !== 'NEW') return false;
      if (statusFilter === 'MATCHED' && item.status !== 'MATCHED') return false;
      if (statusFilter === 'QUOTED' && item.status !== 'QUOTED') return false;
      if (statusFilter === 'URGENT' && item.urgency !== 'URGENT') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCustomer = item.customer.customerName.toLowerCase().includes(q) || item.customer.companyName.toLowerCase().includes(q);
        const matchesRoute = item.shipment.pol.toLowerCase().includes(q) || item.shipment.pod.toLowerCase().includes(q);
        const matchesCommodity = item.shipment.commodity.toLowerCase().includes(q);
        const matchesNum = item.rfqNumber.toLowerCase().includes(q);
        if (!matchesCustomer && !matchesRoute && !matchesCommodity && !matchesNum) return false;
      }
      return true;
    });
  }, [rfqList, statusFilter, searchQuery]);

  // Handle parsing new raw text
  const handleParseNewRfq = async () => {
    if (!inputRawText.trim()) return;
    setIsParsing(true);
    try {
      const newItem = await parseRfqFromRawText({
        rawText: inputRawText,
        source: inputSource,
        companyId: companyProfile.companyId || 'company_profile'
      });
      setRfqList(prev => [newItem, ...prev]);
      setSelectedRfqId(newItem.id);
      setIsCreatingNew(false);
      setInputRawText('');
    } catch (err) {
      console.error('Failed to parse RFQ:', err);
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Quick Sample Paste
  const handleLoadSample = (sample: typeof SAMPLE_REAL_WORLD_RFQS[0]) => {
    setInputRawText(sample.rawText);
    setInputSource(sample.source);
  };

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedState(label);
      setTimeout(() => setCopiedState(null), 2500);
    }
  };

  // Convert RFQ to Quotation (The 5-Second Quote Generator!)
  const handleGenerate5SecQuote = async (rfq: SmartRfqItem) => {
    setIsGeneratingQuote(true);
    setConversionSuccessQuote(null);
    try {
      const result = await convertRfqToQuotation({
        rfq,
        companyProfile,
        exchangeRate
      });

      if (result.success && result.quotation) {
        setConversionSuccessQuote(result.quotation);
        // Update local RFQ list
        setRfqList(prev => prev.map(r => r.id === rfq.id ? { ...rfq, status: 'QUOTED', convertedQuotationId: result.quotation.id, convertedQuotationNumber: result.quotation.quoteNumber } : r));

        if (onQuotationCreated) {
          onQuotationCreated(result.quotation);
        }
      }
    } catch (err) {
      console.error('Failed to generate 5-second quote:', err);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-7xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center rounded-none shadow-sm">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  AI Smart RFQ Inbox & Tạo Báo Giá 5 Giây
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Ý Tưởng 1 • Phase 56
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bóc tách tự động yêu cầu hỏi cước từ Zalo, Email, Excel & Đối chiếu Master Rates tạo Báo Giá hoàn chỉnh trong 5 giây.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setInputRawText('');
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dán RFQ Mới (+Paste)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: RFQ Inbox List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
            
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm RFQ, tuyến đường, khách hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto text-[11px] pb-1">
                {(['ALL', 'NEW', 'MATCHED', 'QUOTED', 'URGENT'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 font-bold whitespace-nowrap transition-colors ${
                      statusFilter === tab
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'ALL' && `Tất Cả (${rfqList.length})`}
                    {tab === 'NEW' && 'Mới Nhận'}
                    {tab === 'MATCHED' && 'Đã Ghép Giá'}
                    {tab === 'QUOTED' && 'Đã Tạo Giá'}
                    {tab === 'URGENT' && '⚡ Gấp'}
                  </button>
                ))}
              </div>
            </div>

            {/* RFQ Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRfqList.map((item) => {
                const isSelected = item.id === selectedRfqId && !isCreatingNew;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedRfqId(item.id);
                      setIsCreatingNew(false);
                      setConversionSuccessQuote(null);
                    }}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          item.source === 'ZALO' ? 'bg-blue-100 text-blue-800' :
                          item.source === 'EMAIL' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.source}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.rfqNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.urgency === 'URGENT' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                            GẤP
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 text-[10px] font-semibold ${
                          item.status === 'QUOTED' ? 'text-emerald-600 dark:text-emerald-400' :
                          item.status === 'MATCHED' ? 'text-blue-600 dark:text-blue-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.status === 'QUOTED' ? '✓ Đã tạo giá' : item.status === 'MATCHED' ? 'Đã ghép giá' : 'Mới nhận'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.customer.customerName} • {item.customer.companyName}
                    </h4>

                    {/* Route line */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <span className="font-semibold truncate">{item.shipment.pol.split(',')[0]}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-semibold truncate text-indigo-600 dark:text-indigo-400">{item.shipment.pod.split(',')[0]}</span>
                    </div>

                    {/* Specs summary */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span>{item.shipment.quantity}x {item.shipment.containerType}</span>
                      <span className="truncate max-w-[140px] text-right italic">{item.shipment.commodity}</span>
                    </div>
                  </div>
                );
              })}

              {filteredRfqList.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy RFQ nào phù hợp bộ lọc.
                </div>
              )}
            </div>

          </div>

          {/* RIGHT MAIN PANEL: Active RFQ Detail or New Paste Form */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-y-auto">
            
            {/* VIEW A: CREATE / PASTE NEW RFQ FORM */}
            {isCreatingNew ? (
              <div className="p-6 space-y-5 animate-fade-in max-w-4xl mx-auto w-full">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Dán Yêu Cầu Chào Giá (RFQ) Mới Từ Khách Hàng
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Hệ thống sẽ dùng AI phân tích tự động tên khách, cảng đi, cảng đến, số lượng cont, trọng lượng và ghép giá tức thì.
                  </p>
                </div>

                {/* Quick Sample Buttons */}
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    ⚡ Hoặc thử nhanh với các mẫu RFQ thực tế:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_REAL_WORLD_RFQS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleLoadSample(sample)}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>{sample.source === 'ZALO' ? '💬' : sample.source === 'EMAIL' ? '✉️' : '📊'}</span>
                        <span className="font-semibold">{sample.title.split(':')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source selector & Textarea */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nguồn RFQ:</span>
                    {(['ZALO', 'EMAIL', 'EXCEL', 'SKYPE'] as const).map(src => (
                      <label key={src} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="rfqSource"
                          checked={inputSource === src}
                          onChange={() => setInputSource(src)}
                          className="text-indigo-600"
                        />
                        <span>{src}</span>
                      </label>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={inputRawText}
                    onChange={(e) => setInputRawText(e.target.value)}
                    placeholder="Dán toàn bộ tin nhắn Zalo, nội dung email hoặc bảng Excel RFQ của khách hàng vào đây..."
                    className="w-full p-4 font-mono text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Quay Lại Danh Sách
                  </button>

                  <button
                    type="button"
                    disabled={isParsing || !inputRawText.trim()}
                    onClick={handleParseNewRfq}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI Đang Phân Tích & Bóc Tách...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Phân Tích Bằng AI & Ghép Cước Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : activeRfq ? (
              
              /* VIEW B: ACTIVE RFQ WORKBENCH */
              <div className="p-6 space-y-6">
                
                {/* Success Banner if converted to quote */}
                {conversionSuccessQuote && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                          ĐÃ TẠO BÁO GIÁ THÀNH CÔNG TRONG 5 GIÂY!
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Báo giá mã <strong>{conversionSuccessQuote.quoteNumber}</strong> đã được lưu và sẵn sàng gửi khách.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                    >
                      <span>Mở Xem Báo Giá</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* RFQ Title & Hero 5-Second Quote Button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900 shadow-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400">{activeRfq.rfqNumber}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-white/10 border border-white/20">
                        Nguồn: {activeRfq.source}
                      </span>
                      {activeRfq.urgency === 'URGENT' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white">
                          ⚡ GẤP TRONG NGÀY
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      {activeRfq.shipment.quantity}x {activeRfq.shipment.containerType} &bull; {activeRfq.shipment.pol.split(',')[0]} ➔ {activeRfq.shipment.pod.split(',')[0]}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Khách hàng: <strong>{activeRfq.customer.customerName}</strong> ({activeRfq.customer.companyName}) &bull; Độ tin cậy AI: <strong>{activeRfq.confidenceScore}%</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isGeneratingQuote}
                      onClick={() => handleGenerate5SecQuote(activeRfq)}
                      className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingQuote ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang Tính Cước & Tạo Báo Giá...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-slate-950" />
                          <span>⚡ TẠO BÁO GIÁ TRONG 5 GIÂY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Customer Info Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Thông Tin Khách Hàng
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Người liên hệ:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{activeRfq.customer.customerName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Công ty:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{activeRfq.customer.companyName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Điện thoại:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{activeRfq.customer.phone || 'Chưa cung cấp'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email:</span>
                        <span className="text-slate-800 dark:text-slate-200 truncate block">{activeRfq.customer.email || 'Chưa cung cấp'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipment Specs Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-indigo-600" />
                      Quy Cách Vận Chuyển
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Phương thức:</span>
                        <strong className="text-indigo-600 font-bold">{activeRfq.shipment.mode}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Loại cont:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{activeRfq.shipment.containerType}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Số lượng:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{activeRfq.shipment.quantity} container</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Incoterm:</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono">{activeRfq.shipment.incoterm || 'FOB'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Trọng lượng:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">{activeRfq.shipment.grossWeightKg?.toLocaleString()} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Thể tích:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">{activeRfq.shipment.volumeCbm} CBM</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Raw RFQ Text Box (Collapsed/Expandable) */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Nội dung RFQ gốc từ khách:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {activeRfq.rawText}
                  </p>
                </div>

                {/* AI Master Rate Matching Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Gợi Ý Ghép Cước Master Rates & Phụ Phí Tự Động
                    </h4>
                    <span className="text-xs text-slate-400">
                      Tự động tính toán chi phí vốn & biên lãi mục tiêu
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeRfq.matchedRates && activeRfq.matchedRates.map((rate, idx) => (
                      <div
                        key={rate.rateId}
                        className={`p-4 border transition-all ${
                          idx === (activeRfq.selectedMatchIndex || 0)
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm text-slate-900 dark:text-white">
                                {rate.carrierName}
                              </strong>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {rate.serviceType}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                {rate.freeTimeDemDet}
                              </span>
                            </div>

                            {/* Local charges summary */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Đã bao gồm phụ phí chuẩn: {rate.suggestedLocalCharges.map(l => l.code).join(', ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Giá Bán Đề Xuất</span>
                              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                ${rate.baseSell.toLocaleString()} {rate.currency}
                              </span>
                            </div>

                            <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                              <span className="text-[10px] text-slate-400 block uppercase">Lãi Dự Kiến</span>
                              <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                                +${rate.estimatedProfit.toLocaleString()} ({rate.marginPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Info & Smart Follow-up Questions */}
                {activeRfq.suggestedFollowUpQuestions.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 space-y-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                      Trợ Lý Thông Tin Còn Thiếu & Câu Hỏi Gợi Ý Cho Khách:
                    </span>
                    <div className="space-y-1.5">
                      {activeRfq.suggestedFollowUpQuestions.map((q, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 border border-amber-200 dark:border-amber-800/60">
                          <span className="italic">"{q}"</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(q, `Q_${i}`)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0 ml-2"
                          >
                            {copiedState === `Q_${i}` ? '✓ Đã sao chép' : 'Sao chép câu hỏi'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : null}

          </div>

        </div>

      </div>
    </div>
  );
};
