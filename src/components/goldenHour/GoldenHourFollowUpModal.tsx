import React, { useState } from 'react';
import {
  Flame,
  Phone,
  Clock,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  X,
  Copy,
  Check,
  Eye,
  AlertCircle,
  TrendingUp,
  FileText,
  UserCheck,
  ChevronRight,
  Send,
  Radio,
  FileDown,
  Monitor,
  Smartphone,
  MapPin,
  Play,
  RotateCcw,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import {
  GoldenHourLeadEvent,
  FollowUpOutcomePayload,
  QuotationReadReceipt,
  ReadReceiptEventType
} from '../../types/goldenHourFollowUp';
import {
  getGoldenHourLeads,
  recordGoldenHourFollowUpOutcome,
  getQuotationReadReceipts,
  simulateCustomerInteraction
} from '../../services/goldenHour/goldenHourService';
import { QuoteData } from '../../types/logistics';
import { formatUSD } from '../../utils/formatters';

interface GoldenHourFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote?: QuoteData;
  savedQuotes?: QuoteData[];
  onSelectQuoteToOpen?: (quotationId: string) => void;
}

export const GoldenHourFollowUpModal: React.FC<GoldenHourFollowUpModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  savedQuotes = [],
  onSelectQuoteToOpen
}) => {
  const [activeTab, setActiveTab] = useState<'HOT_LEADS' | 'READ_RECEIPTS' | 'SIMULATOR'>('HOT_LEADS');
  const [leads, setLeads] = useState<GoldenHourLeadEvent[]>(getGoldenHourLeads());
  const [selectedLead, setSelectedLead] = useState<GoldenHourLeadEvent>(leads[0] || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Read receipts feed
  const [readReceipts, setReadReceipts] = useState<QuotationReadReceipt[]>(getQuotationReadReceipts());
  const [selectedReceiptFilter, setSelectedReceiptFilter] = useState<string>('ALL');

  // Outcome logger state
  const [isLoggingOutcome, setIsLoggingOutcome] = useState<boolean>(false);
  const [outcomeType, setOutcomeType] = useState<FollowUpOutcomePayload['outcome']>('WON_BOOKING');
  const [outcomeNote, setOutcomeNote] = useState<string>('Khách hàng đồng ý chốt booking ngay sau khi nghe cam kết giữ slot tàu!');

  // Simulation feedback
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveOutcome = async () => {
    if (!selectedLead) return;
    setIsLoggingOutcome(true);
    try {
      const updated = await recordGoldenHourFollowUpOutcome({
        leadId: selectedLead.id,
        outcome: outcomeType,
        notes: outcomeNote
      });
      if (updated) {
        setLeads([...getGoldenHourLeads()]);
        setSelectedLead({ ...updated });
      }
    } finally {
      setIsLoggingOutcome(false);
    }
  };

  const handleSimulate = (action: ReadReceiptEventType) => {
    const targetQuote = currentQuote || (savedQuotes.length > 0 ? savedQuotes[0] : null);
    if (!targetQuote) return;

    const { receipt, lead } = simulateCustomerInteraction(targetQuote, action);
    setReadReceipts(getQuotationReadReceipts());
    setLeads(getGoldenHourLeads());
    setSelectedLead(lead);

    setSimFeedback(`⚡ Đã kích hoạt sự kiện: "${receipt.eventTitleVi}". Báo giá ${targetQuote.quoteNumber} đang ở trạng thái Giờ Vàng!`);
    setTimeout(() => setSimFeedback(null), 4000);
  };

  const onlineLeadsCount = leads.filter(l => l.isCurrentlyOnline).length;
  const filteredReceipts = selectedReceiptFilter === 'ALL'
    ? readReceipts
    : readReceipts.filter(r => r.quotationId === selectedReceiptFilter || r.quotationNumber === selectedReceiptFilter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Radar Theo Dõi Tương Tác & Giờ Vàng Chốt Đơn</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full uppercase">
                  Golden Hour Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nhận diện ngay khi khách mở xem báo giá • Bắt nhịp 45 phút vàng • Kịch bản cuộc gọi chuyển hóa deal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onlineLeadsCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{onlineLeadsCount} khách đang online</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900 px-5 pt-2 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('HOT_LEADS')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeTab === 'HOT_LEADS'
                  ? 'bg-white text-slate-900 border-white shadow-xs'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Khung Giờ Vàng (Hot Leads)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                {leads.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('READ_RECEIPTS')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeTab === 'READ_RECEIPTS'
                  ? 'bg-white text-slate-900 border-white shadow-xs'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nhật Ký Đọc Báo Giá (Read Receipts)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                {readReceipts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SIMULATOR')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeTab === 'SIMULATOR'
                  ? 'bg-white text-slate-900 border-white shadow-xs'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Mô Phỏng Tương Tác (Live Test)</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 pb-2">
            <span>Thời lượng vàng tiêu chuẩn: <strong>45 phút</strong></span>
          </div>
        </div>

        {/* Simulation Feedback Alert */}
        {simFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{simFeedback}</span>
            </span>
            <button 
              type="button" 
              onClick={() => setActiveTab('HOT_LEADS')}
              className="text-xs font-bold text-emerald-700 underline cursor-pointer"
            >
              Xem ngay
            </button>
          </div>
        )}

        {/* TAB 1: GOLDEN HOUR LEADS & PSYCHOLOGICAL CALL TERMINAL */}
        {activeTab === 'HOT_LEADS' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-50/50">
            
            {/* Left Column: Golden Leads List (5 cols) */}
            <div className="md:col-span-5 border-r border-slate-200 p-3 sm:p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-600 animate-ping" />
                  <span>Khách Hàng Đang Trong Giờ Vàng ({leads.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Thời gian thực</span>
              </div>

              <div className="space-y-2.5">
                {leads.map(lead => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-rose-50/60 border-rose-400 shadow-xs ring-1 ring-rose-300'
                          : 'bg-white border-slate-200 hover:border-rose-200 hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {lead.isCurrentlyOnline && (
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            )}
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              lead.intentLevel === 'READY_TO_BUY'
                                ? 'bg-rose-100 text-rose-800'
                                : lead.intentLevel === 'PRICE_EVALUATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {lead.intentScore}% • {lead.intentLevel === 'READY_TO_BUY' ? 'CỰC NÓNG 🔥' : 'ĐANG XEM GIÁ'}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Còn {lead.goldenWindowRemainingMinutes}p</span>
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                          {lead.customerName}
                        </h4>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {lead.contactPerson}
                        </p>

                        <div className="mt-2 text-[10px] text-slate-500 bg-slate-100/70 px-2 py-1 rounded-md">
                          <strong>Tuyến:</strong> {lead.pol} ➔ {lead.pod} ({lead.carrier})
                        </div>

                        <div className="mt-2 text-[11px] font-semibold text-rose-900 bg-rose-50/80 p-1.5 rounded-lg border border-rose-100 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="line-clamp-1">{lead.triggerTitleVi}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-mono">{lead.quotationNumber}</span>
                        {lead.isFollowedUp ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Đã gọi ({lead.followUpOutcome === 'WON_BOOKING' ? 'Chốt Deal 🎉' : 'Đã trao đổi'})
                          </span>
                        ) : (
                          <span className="text-orange-700 font-bold flex items-center gap-0.5 animate-pulse">
                            <Clock className="w-3 h-3" /> Cần gọi ngay
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Script & Call Terminal (7 cols) */}
            <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto space-y-4">
              {selectedLead ? (
                <>
                  {/* Contact Quick Action Banner */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          Mục Tiêu Gọi Điện Chốt Đơn
                        </span>
                        {onSelectQuoteToOpen && (
                          <button
                            type="button"
                            onClick={() => onSelectQuoteToOpen(selectedLead.quotationId)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Mở Báo Giá</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        {selectedLead.contactPerson} - {selectedLead.customerName}
                      </h3>
                      <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-800">SĐT: {selectedLead.customerPhone}</span>
                        <span>Mã: <strong className="font-mono">{selectedLead.quotationNumber}</strong></span>
                        <span>Tổng tiền: <strong className="text-indigo-700">{formatUSD(selectedLead.grandTotalUsd)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${selectedLead.customerPhone}`}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Bấm Gọi Ngay</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedLead.customerPhone, 'phone')}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Sao chép SĐT"
                      >
                        {copiedKey === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Behavioral Trigger Diagnosis */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Đọc Vị Hành Vi: {selectedLead.triggerTitleVi}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {selectedLead.triggerDescriptionVi}
                    </p>
                  </div>

                  {/* 3-Step Psychological Call Script */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kịch Bản Cuộc Gọi Phá Băng & Đóng Deal (Ice-Breaker Script)</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold">Tự nhiên • Tuyệt đối không để lộ theo dõi lén</span>
                    </div>

                    {/* Step 1: Hook */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700">
                        <span>1. Câu Mở Đầu Phá Băng (Hook)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedLead.callScript.hookVi, 'hook')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer font-normal"
                        >
                          {copiedKey === 'hook' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Sao chép</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 italic font-sans leading-relaxed">
                        "{selectedLead.callScript.hookVi}"
                      </p>
                    </div>

                    {/* Step 2: Core Value Pitch */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                        <span>2. Giải Tỏa Nỗi Bận Tâm & Đòn Bẩy (Core Pitch)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedLead.callScript.pitchVi, 'pitch')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer font-normal"
                        >
                          {copiedKey === 'pitch' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Sao chép</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 italic font-sans leading-relaxed">
                        "{selectedLead.callScript.pitchVi}"
                      </p>
                    </div>

                    {/* Step 3: Closing Question */}
                    <div className="space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                        <span>3. Câu Hỏi Chốt Dứt Điểm (Closing Prompt)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedLead.callScript.closingQuestionVi, 'closing')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer font-normal"
                        >
                          {copiedKey === 'closing' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Sao chép</span>
                        </button>
                      </div>
                      <p className="text-xs text-emerald-950 font-bold font-sans leading-relaxed">
                        "{selectedLead.callScript.closingQuestionVi}"
                      </p>
                    </div>

                    {/* Zalo Quick Note */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Tin Nhắn Zalo Nhanh (Nếu Khách Bận Chưa Bắt Máy)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedLead.callScript.zaloQuickNoteVi, 'zalo')}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'zalo' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'zalo' ? 'Đã Chép' : 'Sao Chép Zalo'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed font-sans">
                        {selectedLead.callScript.zaloQuickNoteVi}
                      </p>
                    </div>
                  </div>

                  {/* Outcome Logger Box */}
                  <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ghi Nhận Kết Quả Sau Cuộc Gọi</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {(
                        [
                          { id: 'WON_BOOKING', label: '🎉 Đã Chốt Deal' },
                          { id: 'REQUESTED_DISCOUNT', label: '💰 Khách Đòi Giảm Giá' },
                          { id: 'BUSY_CALL_LATER', label: '⏳ Hẹn Gọi Lại Sau' },
                          { id: 'SEND_UPDATED_SCHEDULE', label: '🚢 Gửi Thêm Lịch Tàu' },
                        ] as const
                      ).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setOutcomeType(item.id)}
                          className={`p-2 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer text-center ${
                            outcomeType === item.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outcomeNote}
                        onChange={e => setOutcomeNote(e.target.value)}
                        placeholder="Ghi chú chi tiết sau cuộc gọi..."
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium focus:ring-1 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        disabled={isLoggingOutcome}
                        onClick={handleSaveOutcome}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {isLoggingOutcome ? 'Đang lưu...' : 'Lưu Kết Quả'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Chọn một khách hàng ở danh sách bên trái để mở kịch bản gọi điện.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE READ RECEIPTS FEED */}
        {activeTab === 'READ_RECEIPTS' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-600" />
                  <span>Dòng Sự Kiện Tương Tác Thời Gian Thực (Live Read Receipts Feed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ghi nhận tự động mỗi khi khách mở link, tải PDF, đọc mục cước hoặc xem phần ký duyệt
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Lọc báo giá:</span>
                <select
                  value={selectedReceiptFilter}
                  onChange={(e) => setSelectedReceiptFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">Tất cả báo giá ({readReceipts.length})</option>
                  {Array.from(new Set(readReceipts.map(r => r.quotationNumber))).map(qNum => (
                    <option key={qNum} value={qNum}>{qNum}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receipts Timeline Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-slate-100">
                {filteredReceipts.map((receipt) => {
                  const elapsedMs = Date.now() - new Date(receipt.timestamp).getTime();
                  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
                  const isHotWindow = elapsedMinutes < 45;

                  return (
                    <div key={receipt.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Event Icon Badge */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          receipt.eventType === 'PDF_DOWNLOADED'
                            ? 'bg-rose-100 text-rose-700'
                            : receipt.eventType === 'SIGNATURE_SECTION'
                            ? 'bg-amber-100 text-amber-700'
                            : receipt.eventType === 'DWELL_PRICING'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {receipt.eventType === 'PDF_DOWNLOADED' ? (
                            <FileDown className="w-4 h-4" />
                          ) : receipt.eventType === 'SIGNATURE_SECTION' ? (
                            <UserCheck className="w-4 h-4" />
                          ) : receipt.eventType === 'DWELL_PRICING' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">
                              {receipt.customerName}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {receipt.quotationNumber}
                            </span>
                            {isHotWindow && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-rose-600" />
                                <span>Giờ Vàng ({45 - elapsedMinutes}p còn lại)</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {receipt.eventTitleVi}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              {receipt.device.includes('Mobile') ? (
                                <Smartphone className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Monitor className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{receipt.device}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{receipt.ipLocation}</span>
                            </span>
                            <span>•</span>
                            <span>Thời lượng đọc: <strong className="text-slate-700">{receipt.dwellTimeSeconds}s</strong></span>
                            <span>•</span>
                            <span>Khu vực: <strong className="text-indigo-600">{receipt.pageSection}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp & Quick Call Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-[11px] font-mono text-slate-500">
                          {elapsedMinutes <= 0 ? 'Vừa xong' : `${elapsedMinutes} phút trước`}
                        </span>
                        {receipt.customerPhone && (
                          <a
                            href={`tel:${receipt.customerPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Gọi {receipt.contactPerson?.split(' ')[0] || 'Khách'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIMULATOR & TEST HARNESS */}
        {activeTab === 'SIMULATOR' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Mô Phỏng Tương Tác Khách Hàng (Customer Interaction Simulator)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Thử nghiệm phản ứng của Radar Giờ Vàng khi khách hàng mở link, tải PDF hoặc dừng xem cước
                    </p>
                  </div>
                </div>

                {/* Target Quote Preview */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Báo giá đang được chọn kiểm thử:</span>
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{currentQuote?.customer?.companyName || 'Công ty Cổ phần Thủy Sản Biển Xanh'}</span>
                    <span className="font-mono text-indigo-700">{currentQuote?.quoteNumber || 'QUO-2026-1008-01'}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Tuyến: {currentQuote?.shipment?.pol || 'Cát Lái'} ➔ {currentQuote?.shipment?.pod || 'Long Beach'} ({currentQuote?.shipment?.carrier || 'ONE Line'})
                  </div>
                </div>

                {/* Action Trigger Buttons */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Chọn hành vi khách hàng cần kích hoạt:</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSimulate('LINK_OPENED')}
                      className="p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl font-semibold text-slate-800 text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs group"
                    >
                      <Eye className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-slate-900">1. Khách Click Mở Link</div>
                        <div className="text-[10px] text-slate-500">Kích hoạt đồng hồ 45 phút vàng</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulate('DWELL_PRICING')}
                      className="p-3 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl font-semibold text-slate-800 text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs group"
                    >
                      <Clock className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-slate-900">2. Dừng Đọc Kỹ Bảng Cước</div>
                        <div className="text-[10px] text-slate-500">Tăng điểm ý định lên 88% (Hot)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulate('PDF_DOWNLOADED')}
                      className="p-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl font-semibold text-slate-800 text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs group"
                    >
                      <FileDown className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-slate-900">3. Khách Tải File PDF A4</div>
                        <div className="text-[10px] text-slate-500">Chuẩn bị trình sếp duyệt cước</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulate('SIGNATURE_SECTION')}
                      className="p-3 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl font-semibold text-slate-800 text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs group"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-emerald-950">4. Đọc Mục Ký & Chốt Deal</div>
                        <div className="text-[10px] text-emerald-700 font-medium">Ý định 96% (Cực Nóng 🔥)</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lợi ích thực tế cho đội ngũ Kinh Doanh (Sales Forwarder):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Theo thống kê nghiệp vụ logistics, gọi điện cho khách hàng trong vòng 45 phút đầu tiên sau khi họ vừa mở xem báo giá giúp tăng tỷ lệ chốt booking thành công lên gấp <strong>3.8 lần</strong> so với việc gọi sau 24 giờ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
            <span>Hệ thống tự động phát hiện khi khách hàng tương tác với báo giá trong 45 phút gần nhất</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng Radar Giờ Vàng
          </button>
        </div>
      </div>
    </div>
  );
};
