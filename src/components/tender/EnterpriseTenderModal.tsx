import React, { useState } from 'react';
import {
  Building2,
  Layers,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  X,
  Copy,
  Check,
  Percent,
  Sliders,
  ShieldCheck,
  Ship,
  FileText,
  DollarSign,
  ChevronRight,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import {
  EnterpriseTenderProject,
  TenderLaneItem,
  LaneTenderStrategy
} from '../../types/enterpriseTender';
import {
  getEnterpriseTenders,
  optimizePortfolioPricing,
  convertTenderToQuoteData,
  exportTenderToCsv,
  saveEnterpriseTender
} from '../../services/tender/enterpriseTenderService';
import { QuoteData } from '../../types/logistics';

interface EnterpriseTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTenderToWorkspace?: (masterQuote: QuoteData) => void;
}

export const EnterpriseTenderModal: React.FC<EnterpriseTenderModalProps> = ({
  isOpen,
  onClose,
  onLoadTenderToWorkspace
}) => {
  const [tenders, setTenders] = useState<EnterpriseTenderProject[]>(getEnterpriseTenders());
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || 'tnd-phongphu-2026');
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'OPTIMIZER' | 'EXECUTIVE_SLA'>('MATRIX');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Optimizer parameters
  const [targetBlendedMargin, setTargetBlendedMargin] = useState<number>(8.0);
  const [volumeDriverMax, setVolumeDriverMax] = useState<number>(4.0);
  const [profitDriverMin, setProfitDriverMin] = useState<number>(14.0);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  const currentTender = tenders.find(t => t.id === selectedTenderId) || tenders[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const updated = optimizePortfolioPricing(currentTender, {
        targetBlendedMarginPercent: targetBlendedMargin,
        volumeDriverMarginMax: volumeDriverMax,
        profitDriverMarginMin: profitDriverMin
      });
      setTenders([...getEnterpriseTenders()]);
      setIsOptimizing(false);
    }, 400);
  };

  const handleExportCsv = () => {
    const csvContent = exportTenderToCsv(currentTender);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentTender.tenderCode}_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadToWorkspace = () => {
    const quote = convertTenderToQuoteData(currentTender);
    saveEnterpriseTender(currentTender);
    if (onLoadTenderToWorkspace) {
      onLoadTenderToWorkspace(quote);
    }
  };

  if (!isOpen || !currentTender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner text-indigo-300">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Enterprise Multi-Lane RFQ & Portfolio Tender Engine</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/40 text-white rounded-full uppercase border border-indigo-400/30">
                  Phase 63
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Cỗ Máy Đấu Thầu Ma Trận Tuyến Nhà Máy & Tối Ưu Hóa Biên Lợi Nhuận Toàn Danh Mục
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

        {/* Project Selector Bar & KPI Summary Cards */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-3 shrink-0 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Gói Thầu:</span>
            <select
              value={selectedTenderId}
              onChange={e => setSelectedTenderId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 shadow-2xs w-full lg:w-96"
            >
              {tenders.map(t => (
                <option key={t.id} value={t.id}>
                  {t.tenderCode} - {t.customerName} ({t.totalAnnualVolumeTeu} TEU)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 text-xs">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Tổng Sản Lượng</span>
              <strong className="text-slate-900 font-extrabold">{currentTender.totalAnnualVolumeTeu.toLocaleString()} TEU/năm</strong>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Doanh Thu Thầu</span>
              <strong className="text-indigo-700 font-extrabold">${(currentTender.totalTenderRevenueUsd / 1000000).toFixed(2)}M USD</strong>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Lợi Nhuận Gộp Năm</span>
              <strong className="text-emerald-700 font-extrabold">+${currentTender.totalAnnualGrossProfitUsd.toLocaleString()} USD</strong>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Biên Lãi Danh Mục</span>
              <strong className="text-blue-700 font-extrabold">{currentTender.blendedMarginPercent}%</strong>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Xác Suất Thắng</span>
              <strong className="text-rose-600 font-extrabold">{currentTender.estimatedWinProbabilityPercent}%</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('MATRIX')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'MATRIX'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ma Trận Tuyến Đấu Thầu ({currentTender.lanes.length} Tuyến)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OPTIMIZER')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'OPTIMIZER'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cân Bằng Lãi Danh Mục (Portfolio Optimizer)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXECUTIVE_SLA')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'EXECUTIVE_SLA'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Hồ Sơ Đấu Thầu C-Level & Cam Kết SLA</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">

          {/* TAB 1: Multi-Lane Tender Matrix */}
          {activeTab === 'MATRIX' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <span>Bảng Ma Trận Giá Chào Thầu Cho Từng Tuyến (Tender Rate Sheet)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hạn nộp thầu: <strong>{currentTender.submissionDeadline}</strong> • Ngành: <strong>{currentTender.industrySector}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất File Thầu Excel/CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadToWorkspace}
                    className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Nạp Thành Báo Giá Master</span>
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Hải Trình / Nhà Máy Xuất Phát</th>
                        <th className="p-3">Hãng Tàu & Loại Cont</th>
                        <th className="p-3 text-center">Sản Lượng (TEU)</th>
                        <th className="p-3 text-right">Giá Trần / Vốn</th>
                        <th className="p-3 text-right text-indigo-900 font-extrabold">Giá Chào Thầu</th>
                        <th className="p-3 text-center">Chiến Lược</th>
                        <th className="p-3 text-right">Lãi Năm ($)</th>
                        <th className="p-3 text-center">Xác Suất Thắng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentTender.lanes.map(lane => (
                        <tr key={lane.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{lane.pol} ➔ {lane.pod}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{lane.factoryPlantOrigin}</div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{lane.carrierSuggested}</div>
                            <div className="text-[10px] text-slate-500">{lane.containerType} • {lane.transitTimeDays} ngày (Free {lane.freeTimeDays}d)</div>
                          </td>

                          <td className="p-3 text-center font-bold text-slate-900">
                            {lane.annualVolumeTeu.toLocaleString()}
                          </td>

                          <td className="p-3 text-right">
                            <div className="font-semibold text-slate-700">${lane.clientTargetPriceUsd}</div>
                            <div className="text-[10px] text-slate-400">Vốn: ${lane.baseCostUsd}</div>
                          </td>

                          <td className="p-3 text-right font-extrabold text-indigo-700 text-sm">
                            ${lane.proposedSellPriceUsd.toLocaleString()}
                          </td>

                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lane.strategy === 'VOLUME_DRIVER'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : lane.strategy === 'PROFIT_DRIVER'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {lane.strategy === 'VOLUME_DRIVER' && 'Volume Driver'}
                              {lane.strategy === 'PROFIT_DRIVER' && 'Profit Driver'}
                              {lane.strategy === 'BALANCED' && 'Balanced'}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="font-bold text-emerald-700">+${lane.totalAnnualProfitUsd.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400">Margin: {lane.marginPercent}%</div>
                          </td>

                          <td className="p-3 text-center">
                            <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {lane.winProbabilityPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Portfolio Margin Balancing Optimizer */}
          {activeTab === 'OPTIMIZER' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <strong className="font-bold">Nguyên lý Đấu Thầu Toàn Danh Mục (Portfolio Margin Optimization):</strong> Trong các gói thầu lớn của nhà máy, đối thủ thường chào giá thấp ở các tuyến phổ biến. Để thắng thầu toàn diện:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium">
                    <li><strong>Volume Driver (Tuyến cờ đầu):</strong> Ép biên lợi nhuận xuống thấp (3% – 5%) và giá bán thấp hơn giá trần của khách $20 – $50 để đạt điểm tuyệt đối ở phần đánh giá năng lực giá khối lượng lớn.</li>
                    <li><strong>Profit Driver (Tuyến ngách / Châu Âu / Nội địa):</strong> Đẩy biên lợi nhuận lên 12% – 16% để tối đa hóa dòng tiền và bù đắp cho toàn bộ danh mục thầu.</li>
                    <li><strong>Kết quả:</strong> Giữ vững biên lợi nhuận gộp toàn bộ gói thầu mà vẫn đảm bảo tỷ lệ trúng thầu $\ge 85\%$.</li>
                  </ul>
                </div>
              </div>

              {/* Sliders & Optimizer Controls */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Biên Lợi Nhuận Mục Tiêu (Blended Margin)</label>
                    <span className="text-xs font-extrabold text-indigo-700">{targetBlendedMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    step={0.5}
                    value={targetBlendedMargin}
                    onChange={e => setTargetBlendedMargin(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Biên lãi gộp trung bình của toàn bộ các tuyến</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Trần Lãi Tuyến Volume Driver</label>
                    <span className="text-xs font-extrabold text-teal-700">{volumeDriverMax}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={7}
                    step={0.5}
                    value={volumeDriverMax}
                    onChange={e => setVolumeDriverMax(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Giữ lãi mỏng để hạ gục đối thủ cạnh tranh</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Sàn Lãi Tuyến Profit Driver</label>
                    <span className="text-xs font-extrabold text-purple-700">{profitDriverMin}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={20}
                    step={0.5}
                    value={profitDriverMin}
                    onChange={e => setProfitDriverMin(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tạo lợi nhuận bù đắp từ các tuyến chất lượng cao</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isOptimizing}
                  onClick={handleRunOptimizer}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-900 to-blue-900 hover:from-indigo-800 hover:to-blue-800 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
                  <span>{isOptimizing ? 'Đang Tính Toán...' : '1-Click Tối Ưu Hóa & Cân Bằng Toàn Ma Trận'}</span>
                </button>
              </div>

              {/* Portfolio Mix Visual Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-teal-200">
                  <h4 className="text-xs font-bold text-teal-900 uppercase flex items-center gap-1.5 mb-2">
                    <Ship className="w-4 h-4 text-teal-600" />
                    <span>Nhóm Volume Drivers (Tuyến Giành Thầu)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chiếm <strong>61.6% tổng sản lượng (770 TEU)</strong>. Áp dụng mức cước sát sàn ($3,480 - $3,530/cont) để đảm bảo nhà máy chấm điểm tuyệt đối về chỉ tiêu giá trên các tuyến trọng điểm Bờ Tây Mỹ.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-purple-200">
                  <h4 className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1.5 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>Nhóm Profit Drivers (Tuyến Sinh Lời)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chiếm <strong>38.4% tổng sản lượng còn lại</strong> nhưng đóng góp hơn <strong>70% tổng lợi nhuận</strong> của cả gói thầu. Tận dụng thế mạnh hợp đồng Master Rate giá rẻ với Maersk, CMA CGM tuyến Châu Âu & Bờ Đông.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Executive Summary & Plant SLA Deck */}
          {activeTab === 'EXECUTIVE_SLA' && (
            <div className="space-y-6">
              {/* Executive Pitch Deck Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Bản Tóm Tắt Chiến Lược Dành Cho Ban Tổng Giám Đốc Nhà Máy (Executive Brief)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentTender.executiveSummaryVi, 'exec')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'exec' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Sao chép</span>
                  </button>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  {currentTender.executiveSummaryVi}
                </p>
              </div>

              {/* Plant SLA Commitments */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>5 Cam Kết Chỉ Số KPI & Bảo Lãnh Vận Hành Nhà Máy (SLA Commitments)</span>
                </h4>

                <div className="space-y-2">
                  {currentTender.slaCommitmentsVi.map((sla, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{sla}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            <span>Hỗ trợ định dạng ma trận thầu chuẩn Excel cho các nhà máy FDI, KCN và tập đoàn xuất nhập khẩu</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng Cỗ Máy Thầu
          </button>
        </div>
      </div>
    </div>
  );
};
