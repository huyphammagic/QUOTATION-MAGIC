import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  X,
  Copy,
  Check,
  Send,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  Ship,
  Sparkles,
  Info
} from 'lucide-react';
import {
  SurchargeMarketAlert,
  QuotationValidityAudit,
  RateValidityStatus,
  BulkRepriceResult
} from '../../types/validitySurcharge';
import {
  getMarketSurchargeAlerts,
  getQuotationValidityAudits,
  executeBulkValidityExtension,
  generateUrgentClosingMessage
} from '../../services/validity/validitySurchargeService';

interface RateValiditySurchargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuoteToOpen?: (quotationId: string) => void;
}

export const RateValiditySurchargeModal: React.FC<RateValiditySurchargeModalProps> = ({
  isOpen,
  onClose,
  onSelectQuoteToOpen
}) => {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'AUDIT' | 'BULK_REPRICE'>('ALERTS');
  const [alerts, setAlerts] = useState<SurchargeMarketAlert[]>(getMarketSurchargeAlerts());
  const [auditList, setAuditList] = useState<QuotationValidityAudit[]>(getQuotationValidityAudits());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RateValidityStatus>('ALL');

  // Copy notification state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected quote for urgency preview
  const [previewQuote, setPreviewQuote] = useState<QuotationValidityAudit | null>(auditList[0] || null);
  const [selectedAlertForQuote, setSelectedAlertForQuote] = useState<SurchargeMarketAlert | null>(alerts[0] || null);

  // Bulk re-pricing states
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>(
    auditList.filter(q => q.daysRemaining <= 7).map(q => q.quotationId)
  );
  const [extensionDays, setExtensionDays] = useState<number>(14);
  const [bufferAmountUsd, setBufferAmountUsd] = useState<number>(150);
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [bulkResults, setBulkResults] = useState<BulkRepriceResult[] | null>(null);

  const filteredQuotes = useMemo(() => {
    return auditList.filter(item => {
      const matchSearch =
        item.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pod.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.carrier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = statusFilter === 'ALL' || item.status === statusFilter;
      return matchSearch && matchFilter;
    });
  }, [auditList, searchQuery, statusFilter]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExecuteBulk = async () => {
    if (selectedQuoteIds.length === 0) return;
    setIsProcessingBulk(true);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + extensionDays);
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      const results = await executeBulkValidityExtension({
        quoteIds: selectedQuoteIds,
        daysToAdd: extensionDays,
        applySurchargeBufferUsd: bufferAmountUsd,
        newValidToDate: dateStr
      });
      setBulkResults(results);
      setAuditList([...getQuotationValidityAudits()]);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedQuoteIds.length === filteredQuotes.length) {
      setSelectedQuoteIds([]);
    } else {
      setSelectedQuoteIds(filteredQuotes.map(q => q.quotationId));
    }
  };

  const toggleQuoteSelect = (id: string) => {
    setSelectedQuoteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner text-amber-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Smart Validity & Surcharge Volatility Alert Engine</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/25 text-white rounded-full uppercase">
                  Phase 59
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Radar Biến Động Phụ Phí (GRI/PSS/ETS), Đếm Ngược Hạn Báo Giá & Cập Nhật Giá 1-Click
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('ALERTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ALERTS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Radar Phụ Phí & Biến Động Hãng Tàu ({alerts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Bộ Đếm Hiệu Lực Báo Giá ({auditList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BULK_REPRICE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'BULK_REPRICE'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>1-Click Gia Hạn & Cập Nhật Giá Hàng Loạt</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          
          {/* TAB 1: Surcharge Market Alerts */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Cảnh Báo Đang Hoạt Động</span>
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                      <Flame className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{alerts.length} đợt tăng</div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">1 Critical, 2 High Priority</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Báo Giá Chịu Rủi Ro GRI</span>
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-rose-600 mt-2">12 báo giá</div>
                  <div className="text-[11px] text-rose-700 font-medium mt-1">Nguy cơ âm margin nếu khách book trễ</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Cơ Hội Chốt Đơn Cấp Bách</span>
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                      <Sparkles className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-2">+$1,450 / cont</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">Giá trị tiết kiệm cho khách nếu chốt sớm</div>
                </div>
              </div>

              {/* Alert List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Ship className="w-4 h-4 text-amber-600" />
                  <span>Bản Tin Phụ Phí Chính Thức Từ Các Hãng Tàu (Market Circulars)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : alert.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {alert.surchargeType} • {alert.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Hiệu lực: <strong className="text-slate-800">{alert.effectiveDate}</strong>
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                          {alert.surchargeNameVi}
                        </h4>
                        
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Hãng tàu:</span>
                            <span className="text-indigo-700 font-bold">{alert.carrierName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Tuyến áp dụng:</span>
                            <span>{alert.lanePol} ➔ {alert.lanePod}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Mức phụ thu:</span>
                            <span className="text-rose-600 font-extrabold text-sm">
                              +${alert.amountUsd} USD / {alert.containerUnit}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          "{alert.summaryVi}"
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          Mã công văn: {alert.officialCircularRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlertForQuote(alert);
                            setActiveTab('AUDIT');
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Tạo Lời Thoại Giục Khách</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Quotation Validity Countdown & Urgency Pitch */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-5">
              {/* Filter & Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã số, khách hàng, cảng..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {(['ALL', 'CRITICAL_48H', 'EXPIRED', 'EXPIRING_SOON', 'HEALTHY'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
                        statusFilter === st
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL' && 'Tất cả'}
                      {st === 'CRITICAL_48H' && '🔴 Dưới 48H'}
                      {st === 'EXPIRED' && '⛔ Quá hạn'}
                      {st === 'EXPIRING_SOON' && '🟡 Sắp hết hạn'}
                      {st === 'HEALTHY' && '🟢 Còn hạn'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of Quotes */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-3">Báo Giá & Khách Hàng</th>
                        <th className="p-3">Hải Trình / Hãng Tàu</th>
                        <th className="p-3">Hạn Hiệu Lực</th>
                        <th className="p-3 text-right">Giá Bán / Vốn</th>
                        <th className="p-3 text-center">Biên Lợi Nhuận</th>
                        <th className="p-3 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuotes.map(quote => {
                        const isSelected = previewQuote?.quotationId === quote.quotationId;
                        return (
                          <tr
                            key={quote.quotationId}
                            className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{quote.quoteNumber}</div>
                              <div className="text-[11px] text-slate-600 line-clamp-1">{quote.customerName}</div>
                            </td>

                            <td className="p-3">
                              <div className="font-medium text-slate-800">{quote.pol} ➔ {quote.pod}</div>
                              <div className="text-[11px] text-indigo-700 font-semibold">{quote.carrier}</div>
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  quote.status === 'EXPIRED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : quote.status === 'CRITICAL_48H'
                                    ? 'bg-orange-100 text-orange-800'
                                    : quote.status === 'EXPIRING_SOON'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {quote.status === 'EXPIRED' && 'Hết hạn'}
                                  {quote.status === 'CRITICAL_48H' && `Còn ${quote.daysRemaining} ngày!`}
                                  {quote.status === 'EXPIRING_SOON' && `Còn ${quote.daysRemaining} ngày`}
                                  {quote.status === 'HEALTHY' && `Còn ${quote.daysRemaining} ngày`}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{quote.validTo}</div>
                            </td>

                            <td className="p-3 text-right">
                              <div className="font-bold text-slate-900">${quote.currentFreightSellUsd.toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400">Vốn: ${quote.currentFreightCostUsd.toLocaleString()}</div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {quote.currentProfitMarginPercent}%
                              </span>
                              {quote.projectedGRIImpactUsd > 0 && (
                                <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                                  Rủi ro GRI: -${quote.projectedGRIImpactUsd}
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPreviewQuote(quote)}
                                className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Giục Khách</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pitch Preview Box if quote selected */}
              {previewQuote && (
                <div className="bg-white rounded-xl border border-amber-300 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        Lời Thoại Giục Khách Chốt Đơn Trước Hạn (Báo giá: {previewQuote.quoteNumber} - {previewQuote.customerName})
                      </h4>
                    </div>
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Tự động gắn thông tin GRI & Hiệu lực
                    </span>
                  </div>

                  {(() => {
                    const messagePayload = generateUrgentClosingMessage(
                      previewQuote,
                      selectedAlertForQuote || alerts[0]
                    );
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Zalo Script */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                💬 Tin Nhắn Zalo / SMS Khẩn Cấp
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(messagePayload.messageZalo, 'zalo')}
                                className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === 'zalo' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === 'zalo' ? 'Đã chép' : 'Sao chép'}</span>
                              </button>
                            </div>
                            <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-white p-2.5 rounded border border-slate-100">
                              {messagePayload.messageZalo}
                            </pre>
                          </div>
                        </div>

                        {/* Email Script */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                ✉️ Email Doanh Nghiệp (Official Notice)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(messagePayload.messageEmail, 'email')}
                                className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === 'email' ? 'Đã chép' : 'Sao chép'}</span>
                              </button>
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500 mb-1">
                              Tiêu đề: {messagePayload.subject}
                            </div>
                            <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-white p-2.5 rounded border border-slate-100 max-h-48 overflow-y-auto">
                              {messagePayload.messageEmail}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 1-Click Bulk Re-pricing & Validity Extension */}
          {activeTab === 'BULK_REPRICE' && (
            <div className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="font-bold">Cơ chế gia hạn hàng loạt:</strong> Khi cước của các báo giá sắp hết hạn hoặc thị trường có thông báo tăng giá GRI, sales có thể chọn cùng lúc nhiều báo giá để:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium">
                    <li>Gia hạn thêm ngày hiệu lực (14 ngày hoặc 30 ngày).</li>
                    <li>Cộng đệm cước an toàn (Buffer Margin) ví dụ +$100 đến +$200/cont để chống rủi ro hãng tàu tăng giá đột ngột.</li>
                    <li>Tự động cập nhật lại hạn và trạng thái trong hệ thống chỉ với 1 click.</li>
                  </ul>
                </div>
              </div>

              {/* Bulk Form Controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gia Hạn Thêm (Số Ngày)
                  </label>
                  <select
                    value={extensionDays}
                    onChange={e => setExtensionDays(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold"
                  >
                    <option value={7}>Thêm 7 ngày (Chu kỳ 1 tuần)</option>
                    <option value={14}>Thêm 14 ngày (Nửa tháng - Khuyên dùng)</option>
                    <option value={21}>Thêm 21 ngày (3 tuần)</option>
                    <option value={30}>Thêm 30 ngày (Trọn tháng sau)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cộng Đệm Cước Bù GRI/PSS ($ USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={bufferAmountUsd}
                      onChange={e => setBufferAmountUsd(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-3 py-2 bg-slate-50 font-bold"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Nhập 0 nếu giữ nguyên giá bán</span>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={selectedQuoteIds.length === 0 || isProcessingBulk}
                    onClick={handleExecuteBulk}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isProcessingBulk ? 'animate-spin' : ''}`} />
                    <span>Áp Dụng Gia Hạn ({selectedQuoteIds.length} Báo Giá)</span>
                  </button>
                </div>
              </div>

              {/* Selection Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Chọn tất cả ({selectedQuoteIds.length}/{filteredQuotes.length} đã chọn)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Ưu tiên các báo giá có nguy cơ hết hạn & rủi ro phụ phí</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="p-3 w-10 text-center">Chọn</th>
                        <th className="p-3">Mã Báo Giá</th>
                        <th className="p-3">Khách Hàng</th>
                        <th className="p-3">Hạn Cũ</th>
                        <th className="p-3 text-right">Giá Hiện Tại</th>
                        <th className="p-3 text-right text-amber-700">Giá Mới (Sau Đệm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuotes.map(quote => {
                        const checked = selectedQuoteIds.includes(quote.quotationId);
                        const newPriceEstimate = quote.currentFreightSellUsd + bufferAmountUsd;
                        return (
                          <tr
                            key={quote.quotationId}
                            onClick={() => toggleQuoteSelect(quote.quotationId)}
                            className={`hover:bg-slate-50 cursor-pointer ${checked ? 'bg-amber-50/30' : ''}`}
                          >
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQuoteSelect(quote.quotationId)}
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-900">{quote.quoteNumber}</td>
                            <td className="p-3 text-slate-700">{quote.customerName}</td>
                            <td className="p-3">
                              <span className="text-slate-600">{quote.validTo}</span>
                              <span className="ml-1.5 text-[10px] text-slate-400 font-medium">({quote.daysRemaining} ngày)</span>
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-700">
                              ${quote.currentFreightSellUsd.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-700">
                              ${newPriceEstimate.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bulk Results feedback */}
              {bulkResults && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã gia hạn thành công {bulkResults.length} báo giá!</span>
                  </div>
                  <div className="text-xs text-emerald-700 space-y-1">
                    {bulkResults.map(r => (
                      <div key={r.quotationId} className="flex items-center justify-between text-[11px] bg-white/70 p-1.5 rounded">
                        <span><strong>{r.quoteNumber}:</strong> Hạn mới đến {r.newValidTo}</span>
                        <span>Giá: ${r.oldFreightSellUsd} ➔ <strong className="text-emerald-800">${r.newFreightSellUsd}</strong> (Margin: {r.newMarginPercent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Dữ liệu thị trường cập nhật thời gian thực từ hãng tàu ONE, Maersk, COSCO, CMA CGM, Evergreen</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng Radar
          </button>
        </div>
      </div>
    </div>
  );
};
