import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Send, 
  RefreshCw, 
  Check, 
  Copy, 
  Phone, 
  Mail, 
  Calendar, 
  Ship, 
  Gift, 
  Zap, 
  ShieldAlert, 
  X, 
  ChevronRight, 
  ExternalLink,
  Search,
  MessageSquare,
  Sparkles,
  TrendingDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  DormantCustomerAlert, 
  ShipperHealthStatus, 
  ReEngagementPitch 
} from '../../types/customerReengagement';
import { QuoteData, CompanyProfile } from '../../types/logistics';
import { 
  SAMPLE_DORMANT_CUSTOMERS, 
  getLocalReengagementAlerts, 
  generateReEngagementPitch, 
  convertDormantAlertToQuote,
  markAlertContacted 
} from '../../services/reengagement/customerReengagementService';

interface CustomerReengagementRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  exchangeRate?: number;
  onReQuotationCreated?: (quote: QuoteData) => void;
}

export const CustomerReengagementRadarModal: React.FC<CustomerReengagementRadarModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  exchangeRate = 25400,
  onReQuotationCreated
}) => {
  const [alerts, setAlerts] = useState<DormantCustomerAlert[]>(() => getLocalReengagementAlerts());
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPROACHING_CYCLE' | 'DORMANT_30D' | 'DORMANT_60D_PLUS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for pitch drafting modal
  const [activePitchAlert, setActivePitchAlert] = useState<DormantCustomerAlert | null>(null);
  const [pitchChannel, setPitchChannel] = useState<'ZALO' | 'EMAIL' | 'WHATSAPP'>('ZALO');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchFilter = 
        filterStatus === 'ALL' || 
        a.healthStatus === filterStatus;
      
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        !q ||
        a.customerName.toLowerCase().includes(q) ||
        a.companyName.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.primaryLanes.some(l => l.pol.toLowerCase().includes(q) || l.pod.toLowerCase().includes(q));

      return matchFilter && matchSearch;
    });
  }, [alerts, filterStatus, searchQuery]);

  // Key KPI stats
  const stats = useMemo(() => {
    const totalDormant = alerts.filter(a => a.healthStatus === 'DORMANT_30D' || a.healthStatus === 'DORMANT_60D_PLUS').length;
    const approachingCount = alerts.filter(a => a.healthStatus === 'APPROACHING_CYCLE').length;
    const atRiskRevenue = alerts
      .filter(a => a.healthStatus.startsWith('DORMANT'))
      .reduce((sum, a) => sum + a.totalLifetimeRevenueUsd, 0);

    return {
      totalDormant,
      approachingCount,
      atRiskRevenue,
      highRiskCount: alerts.filter(a => a.riskScore >= 80).length
    };
  }, [alerts]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 2500);
  };

  const handleMarkContacted = async (alertId: string, channel: 'ZALO' | 'EMAIL' | 'PHONE' | 'WHATSAPP') => {
    await markAlertContacted(alertId, channel);
    setAlerts([...getLocalReengagementAlerts()]);
  };

  const handleGenerateReQuote = (alert: DormantCustomerAlert) => {
    const quote = convertDormantAlertToQuote({
      alert,
      companyProfile,
      exchangeRate
    });
    if (onReQuotationCreated) {
      onReQuotationCreated(quote);
    }
  };

  if (!isOpen) return null;

  const currentPitch: ReEngagementPitch | null = activePitchAlert 
    ? generateReEngagementPitch(activePitchAlert, pitchChannel) 
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between border-b border-sky-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 border border-sky-400/30 rounded-xl">
              <Users className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Radar Tái Kích Hoạt Khách Hàng Cũ & Đơn Hàng Lặp Lại
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/30 text-sky-200 border border-sky-400/30 rounded-full">
                  Phase 58 • Lựa Chọn 2
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nhận diện khách trễ chu kỳ xuất khẩu, đón đầu trước đối thủ và tái chào giá 1-chạm (Auto Re-engagement)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
          
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Khách Ngủ Đông (&gt;30d)</div>
            <div className="text-2xl font-black text-rose-600 mt-1 flex items-baseline gap-1.5">
              {stats.totalDormant}
              <span className="text-xs font-normal text-slate-500">tài khoản</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Doanh Thu Đang Bị Đe Dọa</div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
              ${(stats.atRiskRevenue / 1000).toFixed(0)}k
              <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
              Sắp Đến Chu Kỳ Đóng Hàng
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-baseline gap-1.5">
              {stats.approachingCount}
              <span className="text-xs font-normal text-slate-500">cần gọi ngay</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-rose-800 uppercase">Báo Động Đỏ Churn Risk</div>
            <div className="text-2xl font-black text-rose-700 mt-1 flex items-baseline gap-1.5">
              {stats.highRiskCount}
              <span className="text-xs font-normal text-slate-500">nguy cơ mất hẳn</span>
            </div>
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('APPROACHING_CYCLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'APPROACHING_CYCLE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ⚡ Sắp Đến Chu Kỳ ({stats.approachingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('DORMANT_30D')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'DORMANT_30D'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Trễ 30 Ngày
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('DORMANT_60D_PLUS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === 'DORMANT_60D_PLUS'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Ngủ Đông &gt;60 Ngày
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm khách hàng, cảng đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

        </div>

        {/* Shippers Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Không tìm thấy khách hàng nào theo bộ lọc</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const lane = alert.primaryLanes[0];
              const isApproaching = alert.healthStatus === 'APPROACHING_CYCLE';
              const isSevere = alert.healthStatus === 'DORMANT_60D_PLUS';

              return (
                <div 
                  key={alert.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isApproaching 
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-xs' 
                      : isSevere
                      ? 'border-rose-200 bg-rose-50/15 shadow-xs'
                      : 'border-slate-200 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    
                    {/* Customer Profile Column */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-slate-900">{alert.companyName}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                          isApproaching 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isSevere
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isApproaching ? '⚡ Sắp đến chu kỳ' : isSevere ? 'Ngủ đông >60 ngày' : 'Trễ 30 ngày'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Rủi ro mất khách: {alert.riskScore}%
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center space-x-3">
                        <span className="font-semibold text-slate-800">{alert.customerName}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {alert.phone}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {alert.email}
                        </span>
                      </div>

                      {/* Cadence info */}
                      <p className="text-[11px] text-slate-500">
                        Chu kỳ đóng hàng: <strong className="text-slate-700">{alert.cadence} ({alert.averageDaysBetweenShipments} ngày/lần)</strong> • 
                        Đã <strong className="text-rose-600 font-bold">{alert.daysSinceLastQuote} ngày</strong> chưa check giá • 
                        Dự kiến xuất tiếp: <strong className="text-indigo-600 font-bold">{alert.predictedNextBookingDate}</strong>
                      </p>
                    </div>

                    {/* Historical Lane Column */}
                    {lane && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 min-w-[240px]">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-sky-600" />
                          <span>{lane.pol} ➔ {lane.pod}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Hàng: <span className="font-medium text-slate-800">{lane.commodity}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Quy cách: {lane.containerType} ({lane.typicalVolumePerShipment} cont) • Hãng quen: {lane.preferredCarrier} • Giá cũ: ${lane.lastQuotedPriceUsd}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons Column */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                      
                      {/* Open Pitch Drawer */}
                      <button
                        type="button"
                        onClick={() => setActivePitchAlert(alert)}
                        className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                        <span>Soạn Lời Tiếp Cận</span>
                      </button>

                      {/* 1-Click Re-Quote */}
                      <button
                        type="button"
                        onClick={() => handleGenerateReQuote(alert)}
                        className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Tự động tạo báo giá mới với mã ưu đãi kích hoạt và nạp vào bàn làm việc"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>Tạo Lại Giá 1-Click</span>
                      </button>

                    </div>

                  </div>

                  {/* Reactivation Offer Callout */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-slate-700">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-amber-900">
                        {alert.suggestedOffer.title}:
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        {alert.suggestedOffer.benefitDescriptionVi}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono font-bold text-[10px] rounded border border-amber-300">
                        [{alert.suggestedOffer.code}]
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {alert.outreachStatus === 'SENT' ? (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Đã gửi qua {alert.outreachChannel || 'Zalo'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkContacted(alert.id, 'ZALO')}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                        >
                          Đánh dấu đã liên hệ
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal Pitch Drawer / Submodal */}
        {activePitchAlert && currentPitch && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
              
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold">Kịch Bản Tiếp Cận: {activePitchAlert.companyName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePitchAlert(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Channel Selector */}
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Kênh gửi:</span>
                <button
                  type="button"
                  onClick={() => setPitchChannel('ZALO')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    pitchChannel === 'ZALO' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Zalo (Thân thiện)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchChannel('EMAIL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    pitchChannel === 'EMAIL' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Email (Trang trọng)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchChannel('WHATSAPP')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    pitchChannel === 'WHATSAPP' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  WhatsApp (Quốc tế)
                </button>
              </div>

              {/* Pitch Content */}
              <div className="p-5 space-y-3">
                <textarea
                  readOnly
                  rows={8}
                  value={currentPitch.messageContent}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed focus:outline-hidden"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-500">
                    Mã ưu đãi đính kèm: <strong className="text-amber-800 font-mono">[{currentPitch.incentiveCode}]</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentPitch.messageContent, 'pitch_modal')}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedState === 'pitch_modal' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Đã Sao Chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao Chép Lời Nhắn</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkContacted(activePitchAlert.id, pitchChannel);
                        setActivePitchAlert(null);
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Đánh dấu Đã Gửi
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hệ thống tự động đồng bộ chu kỳ dựa trên lịch sử vận đơn và báo giá</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
