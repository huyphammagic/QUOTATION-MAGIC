import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  DollarSign,
  FileText,
  Copy,
  Check,
  X,
  Search,
  Building2,
  Ship,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  ChevronRight,
  Receipt,
  FileDown,
  Send,
  HelpCircle,
  Award
} from 'lucide-react';
import {
  CarrierInvoiceAuditRecord,
  DisputeResolutionStatus,
  CarrierBillingScorecard
} from '../../types/carrierInvoiceAudit';
import { CarrierInvoiceAuditService } from '../../services/carrierAudit/carrierInvoiceAuditService';

interface CarrierInvoiceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShipmentId?: string;
}

export const CarrierInvoiceAuditModal: React.FC<CarrierInvoiceAuditModalProps> = ({
  isOpen,
  onClose,
  initialShipmentId
}) => {
  const [records, setRecords] = useState<CarrierInvoiceAuditRecord[]>(() =>
    CarrierInvoiceAuditService.getAuditRecords()
  );

  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    if (initialShipmentId) {
      const match = CarrierInvoiceAuditService.getAuditRecords().find(r => r.shipmentId === initialShipmentId);
      if (match) return match.id;
    }
    const all = CarrierInvoiceAuditService.getAuditRecords();
    return all[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'audit_feed' | 'dispute_generator' | 'carrier_scorecards'>('audit_feed');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [disputeLang, setDisputeLang] = useState<'vi' | 'en'>('vi');

  const selectedRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || records[0];
  }, [records, selectedRecordId]);

  const metrics = useMemo(() => {
    return CarrierInvoiceAuditService.getLeakageMetrics();
  }, [records]);

  const scorecards = useMemo(() => {
    return CarrierInvoiceAuditService.getCarrierScorecards();
  }, [records]);

  if (!isOpen || !selectedRecord) return null;

  const filteredRecords = records.filter(r => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'DISCREPANCY') return r.status === 'DISCREPANCY_DETECTED' || r.status === 'DISPUTE_FILED';
    if (filterStatus === 'RESOLVED') return r.status === 'CREDIT_NOTE_ISSUED';
    if (filterStatus === 'CLEAN') return r.status === 'MATCHED_CLEAN';
    return true;
  });

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUpdateStatus = (newStatus: DisputeResolutionStatus, recoveredAmount?: number) => {
    const updated = CarrierInvoiceAuditService.updateDisputeStatus(
      selectedRecord.id,
      newStatus,
      recoveredAmount,
      `Đã cập nhật trạng thái sang ${newStatus} lúc ${new Date().toLocaleTimeString()}`
    );
    if (updated) {
      setRecords(CarrierInvoiceAuditService.getAuditRecords());
    }
  };

  const disputeLetter = CarrierInvoiceAuditService.generateCarrierDisputeLetter(selectedRecord);

  const getStatusBadge = (status: DisputeResolutionStatus) => {
    switch (status) {
      case 'MATCHED_CLEAN':
        return {
          label: 'Khớp Sạch 100%',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'DISCREPANCY_DETECTED':
        return {
          label: 'Phát Hiện Tính Lố',
          color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500 animate-pulse'
        };
      case 'DISPUTE_FILED':
        return {
          label: 'Đang Khiếu Nại Hãng Tàu',
          color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      case 'CREDIT_NOTE_ISSUED':
        return {
          label: 'Đã Cấp Credit Note (Đòi Tiền Xong)',
          color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      default:
        return {
          label: 'Chờ Đối Soát',
          color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
          dot: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-amber-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cỗ Máy Tự Động Đối Soát Chi Phí Hãng Tàu
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Carrier Invoice Audit & Margin Guard
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đối soát 3 chiều (Báo Giá - Cam Kết Mua - Hóa Đơn Hãng Tàu), bắt bẫy phụ phí ngầm & tự động xuất công văn khiếu nại
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Financial Metrics Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Thất Thoát Đã Ngăn Chặn</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                ${metrics.totalPreventedLeakageUsd.toLocaleString()} USD ({metrics.totalPreventedLeakageVnd})
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Đang Khiếu Nại (Tranh Chấp)</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm tabular-nums">
                {metrics.activeDisputesCount} Hóa Đơn (${metrics.activeDisputedAmountUsd.toLocaleString()} USD)
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Tỷ Lệ Đòi Lại Tiền Thành Công</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm tabular-nums">
                {metrics.successfulRecoveryRatePercent}% (Qua Credit Note)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Chọn hóa đơn:</span>
            <select
              value={selectedRecordId}
              onChange={e => setSelectedRecordId(e.target.value)}
              aria-label="Chọn hóa đơn hãng tàu đối soát"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {records.map(r => (
                <option key={r.id} value={r.id}>
                  {r.carrierName} - B/L {r.bookingNumber} ({r.totalProfitLeakageUsd > 0 ? `Lệch $${r.totalProfitLeakageUsd}` : 'Khớp'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('audit_feed')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'audit_feed'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Bảng Đối Soát 3 Chiều & Bẫy Phụ Phí
          </button>

          <button
            onClick={() => setActiveTab('dispute_generator')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'dispute_generator'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Trợ Lý Khiếu Nại & Công Văn Giảm Trừ
          </button>

          <button
            onClick={() => setActiveTab('carrier_scorecards')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'carrier_scorecards'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Award className="w-4 h-4" />
            Bảng Điểm Uy Tín Hóa Đơn Hãng Tàu ({scorecards.length})
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* TAB 1: 3-WAY MATCHING & LEAKAGE FEED */}
          {activeTab === 'audit_feed' && (
            <div className="space-y-6">
              
              {/* Selected Shipment Summary Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        B/L: {selectedRecord.bookingNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        Hãng tàu: {selectedRecord.carrierName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 font-mono">
                        Số HĐ: {selectedRecord.carrierInvoiceNumber} ({selectedRecord.invoiceDate})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Khách hàng: <strong className="text-slate-700 dark:text-slate-300">{selectedRecord.customerName}</strong> ({selectedRecord.pol} ➔ {selectedRecord.pod} · {selectedRecord.containerInfo})
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusBadge(selectedRecord.status).color}`}>
                      <span className={`w-2 h-2 rounded-full ${getStatusBadge(selectedRecord.status).dot}`} />
                      {getStatusBadge(selectedRecord.status).label}
                    </span>

                    {selectedRecord.totalProfitLeakageUsd > 0 && selectedRecord.status === 'DISCREPANCY_DETECTED' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('dispute_generator')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition btn-tactile cursor-pointer"
                      >
                        Khiếu Nại Ngay <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Way Financial Comparison KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 tabular-nums">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Giá Bán Khách (Sell Rate)</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                      ${selectedRecord.customerTotalSellUsd.toLocaleString()} USD
                    </span>
                    <span className="text-[10px] text-slate-400">Theo báo giá {selectedRecord.quoteNumber}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Giá Mua Cam Kết (Agreed Buy)</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                      ${selectedRecord.expectedTotalBuyUsd.toLocaleString()} USD
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Lãi dự kiến: +${selectedRecord.expectedGrossProfitUsd} USD</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Hãng Tàu Thực Tính (Invoiced)</span>
                    <span className={`text-base font-bold mt-0.5 block ${selectedRecord.totalProfitLeakageUsd > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      ${selectedRecord.actualInvoicedTotalBuyUsd.toLocaleString()} USD
                    </span>
                    <span className="text-[10px] text-slate-400">Số tiền hãng tàu đòi thu</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    selectedRecord.totalProfitLeakageUsd > 0
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                  }`}>
                    <span className="text-[10px] font-semibold uppercase block text-slate-500">
                      {selectedRecord.totalProfitLeakageUsd > 0 ? 'Số Tiền Tính Lố (Thất Thoát)' : 'Độ Chính Xác Hóa Đơn'}
                    </span>
                    <span className={`text-base font-bold mt-0.5 block ${
                      selectedRecord.totalProfitLeakageUsd > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedRecord.totalProfitLeakageUsd > 0 ? `+$${selectedRecord.totalProfitLeakageUsd.toLocaleString()} USD` : 'Khớp 100% Chuẩn'}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold block">
                      {selectedRecord.actualGrossProfitIfPaidUsd < 0
                        ? `NGUY HIỂM: Gây LỖ -$${Math.abs(selectedRecord.actualGrossProfitIfPaidUsd)} USD!`
                        : selectedRecord.totalProfitLeakageUsd > 0
                        ? `Lãi giảm từ $${selectedRecord.expectedGrossProfitUsd} xuống $${selectedRecord.actualGrossProfitIfPaidUsd}`
                        : 'Không có rủi ro'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line-by-Line 3-Way Match Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Bảng Đối Chiếu Từng Dòng Phụ Phí (Line-by-Line Reconciliation)
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedRecord.lineItems.length} khoản mục phí
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Khoản Phí (Charge)</th>
                        <th className="py-2.5 px-3">Giá Bán Khách</th>
                        <th className="py-2.5 px-3">Cam Kết Mua (Buy)</th>
                        <th className="py-2.5 px-3">Hãng Tàu Thực Tính</th>
                        <th className="py-2.5 px-3">Chênh Lệch Lố</th>
                        <th className="py-2.5 px-4">Đánh Giá & Căn Cứ Vi Phạm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {selectedRecord.lineItems.map(item => (
                        <tr
                          key={item.id}
                          className={`${
                            item.isFlagged
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <td className="py-3 px-4 font-sans">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {item.isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                              <span>{item.chargeNameVi}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">Mã: {item.chargeCode}</span>
                          </td>

                          <td className="py-3 px-3 tabular-nums font-semibold">
                            ${item.customerSellRateUsd.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                            ${item.agreedBuyRateUsd.toLocaleString()}
                          </td>

                          <td className={`py-3 px-3 tabular-nums font-bold ${item.isFlagged ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            ${item.actualInvoicedBuyUsd.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 tabular-nums font-bold">
                            {item.discrepancyUsd > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                +${item.discrepancyUsd.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">$0</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-sans text-xs">
                            {item.isFlagged ? (
                              <div className="space-y-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                                  {item.discrepancyType === 'UNEXPECTED_SURCHARGE' && 'Phụ phí ngoài hợp đồng'}
                                  {item.discrepancyType === 'DEM_DET_OVERBILLING' && 'Tính phạt sai Free-Time'}
                                  {item.discrepancyType === 'DUPLICATE_LINE_ITEM' && 'Tính trùng lặp phí'}
                                  {item.discrepancyType === 'LOCAL_CHARGE_INFLATION' && 'Tự ý tăng biểu phí'}
                                  {item.discrepancyType === 'BASE_RATE_OVERCHARGE' && 'Cước biển cao hơn thỏa thuận'}
                                </span>
                                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                                  {item.violationReason}
                                </p>
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp chính xác
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                {selectedRecord.disputeNotes && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <div>
                      <strong>Nhật ký xử lý:</strong> {selectedRecord.disputeNotes}
                    </div>
                    {selectedRecord.recoveredAmountUsd && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Đã thu hồi: ${selectedRecord.recoveredAmountUsd.toLocaleString()} USD
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DISPUTE LETTER & DEBIT NOTE ASSISTANT */}
          {activeTab === 'dispute_generator' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Công Văn Khiếu Nại Sai Lệch Hóa Đơn Gửi Hãng Tàu {selectedRecord.carrierName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống tự động bóc tách điều khoản Booking và phát hành văn bản đòi Credit Note / Giảm trừ cước
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setDisputeLang('vi')}
                      className={`px-3 py-1 font-semibold rounded ${disputeLang === 'vi' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisputeLang('en')}
                      className={`px-3 py-1 font-semibold rounded ${disputeLang === 'en' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                    >
                      English
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(
                      disputeLang === 'vi' ? disputeLetter.letterBodyVi : disputeLetter.letterBodyEn,
                      'dispute_letter'
                    )}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition btn-tactile cursor-pointer"
                  >
                    {copiedField === 'dispute_letter' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        Đã Sao Chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Sao Chép Toàn Bộ
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dispute Letter Preview Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tiêu Đề Email / Công Văn:</div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                    {disputeLang === 'vi' ? disputeLetter.subjectVi : disputeLetter.subjectEn}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {disputeLang === 'vi' ? disputeLetter.letterBodyVi : disputeLetter.letterBodyEn}
                </div>

                {/* Workflow Status Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Trạng thái hiện tại: <strong className="text-slate-800 dark:text-slate-200">{getStatusBadge(selectedRecord.status).label}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('DISPUTE_FILED')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition btn-tactile"
                    >
                      Đánh Dấu: Đã Gửi Khiếu Nại
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('CREDIT_NOTE_ISSUED', selectedRecord.totalProfitLeakageUsd)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition btn-tactile"
                    >
                      Ghi Nhận: Đã Nhận Credit Note (+${selectedRecord.totalProfitLeakageUsd} USD)
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CARRIER BILLING SCORECARDS */}
          {activeTab === 'carrier_scorecards' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Bảng Điểm Uy Tín Hóa Đơn & Mức Độ Tính Lố Của Từng Hãng Tàu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dữ liệu kiểm toán thực tế qua các chuyến hàng — Giúp đội ngũ Pricing & Sales nhận diện hãng tàu nào hay "gài bẫy phụ phí" để chủ động cộng buffer an toàn vào báo giá
                </p>
              </div>

              {/* Carrier Scorecards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {scorecards.map(sc => (
                  <div
                    key={sc.carrierName}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm card-hover-lift space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600">
                          <Ship className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sc.carrierName}</h4>
                          <span className="text-[10px] text-slate-400">Đã đối soát {sc.totalInvoicesAudited} hóa đơn</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                          sc.reliabilityGrade === 'A+' || sc.reliabilityGrade === 'A'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sc.reliabilityGrade === 'B'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          Hạng {sc.reliabilityGrade}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 tabular-nums">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Tỷ Lệ Sai Lệch</span>
                        <span className={`font-bold ${sc.errorRatePercent > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                          {sc.errorRatePercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Tổng Tiền Tính Lố</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          ${sc.totalOverbilledAmountUsd.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Đã Đòi Lại</span>
                        <span className="font-bold text-emerald-600">
                          ${sc.totalRecoveredAmountUsd.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Chiêu Bẫy Phụ Phí Thường Gặp:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sc.commonOverchargeTypes.length > 0 ? (
                          sc.commonOverchargeTypes.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {t === 'UNEXPECTED_SURCHARGE' && 'Phụ phí PSS/CIC ngầm'}
                              {t === 'DEM_DET_OVERBILLING' && 'Tính phạt sai DEM/DET'}
                              {t === 'DUPLICATE_LINE_ITEM' && 'Tính trùng lặp phí Bill'}
                              {t === 'LOCAL_CHARGE_INFLATION' && 'Đội giá Local Charges'}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-600 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Hóa đơn chuẩn chỉ, chưa phát hiện sai lệch
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Đã bảo vệ toàn vẹn biên lợi nhuận cho {records.length} lô hàng gần nhất</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
