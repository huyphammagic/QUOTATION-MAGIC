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
  Radio
} from 'lucide-react';
import {
  GoldenHourLeadEvent,
  FollowUpOutcomePayload
} from '../../types/goldenHourFollowUp';
import {
  getGoldenHourLeads,
  recordGoldenHourFollowUpOutcome
} from '../../services/goldenHour/goldenHourService';

interface GoldenHourFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuoteToOpen?: (quotationId: string) => void;
}

export const GoldenHourFollowUpModal: React.FC<GoldenHourFollowUpModalProps> = ({
  isOpen,
  onClose,
  onSelectQuoteToOpen
}) => {
  const [leads, setLeads] = useState<GoldenHourLeadEvent[]>(getGoldenHourLeads());
  const [selectedLead, setSelectedLead] = useState<GoldenHourLeadEvent>(leads[0] || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Outcome logger state
  const [isLoggingOutcome, setIsLoggingOutcome] = useState<boolean>(false);
  const [outcomeType, setOutcomeType] = useState<FollowUpOutcomePayload['outcome']>('WON_BOOKING');
  const [outcomeNote, setOutcomeNote] = useState<string>('Khách hàng đồng ý chốt booking ngay sau khi nghe cam kết giữ slot tàu!');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner text-amber-200 animate-pulse">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">"Golden Hour" Smart Follow-Up & Intent Trigger Engine</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/25 text-white rounded-full uppercase">
                  Phase 61
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                Bắt Nhịp "Giờ Vàng" Chốt Đơn, Đọc Vị Ý Định Mua Hàng & Kịch Bản Cuộc Gọi Thần Tốc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout: Left Sidebar Leads + Right Script Action Terminal */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-50/50">
          
          {/* Left Column: Golden Leads List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-200 p-3 sm:p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-600 animate-ping" />
                <span>Khách Hàng Đang Trong Giờ Vàng ({leads.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Theo thời gian thực</span>
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
                        ? 'bg-rose-50/50 border-rose-400 shadow-xs ring-1 ring-rose-300'
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
                      <span className="text-slate-400">{lead.quotationNumber}</span>
                      {lead.isFollowedUp ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã gọi
                        </span>
                      ) : (
                        <span className="text-orange-700 font-bold">Chưa gọi (Cần gọi ngay)</span>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      Mục Tiêu Gọi Điện Chốt Đơn
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                      {selectedLead.contactPerson} - {selectedLead.customerName}
                    </h3>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3">
                      <span className="font-bold text-slate-800">SĐT: {selectedLead.customerPhone}</span>
                      <span>Mã Báo Giá: <strong>{selectedLead.quotationNumber}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedLead.customerPhone}`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Kịch Bản Cuộc Gọi Phá Băng & Đóng Deal (Ice-Breaker Call Script)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold">Tự nhiên • Không lộ theo dõi lén</span>
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
