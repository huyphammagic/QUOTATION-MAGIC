import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Calculator, 
  ShieldAlert, 
  Check, 
  Copy, 
  ArrowRight, 
  X, 
  FileSpreadsheet, 
  Percent, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  HelpCircle, 
  ExternalLink,
  DollarSign,
  Scale,
  Clock,
  Layers,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { 
  HsCodeTariffItem, 
  CustomsTaxCalculationResult 
} from '../../types/customsTariff';
import { QuoteData, LineItem } from '../../types/logistics';
import { COMMON_HS_CODE_DATABASE } from '../../data/commonHsTariffs';
import { 
  lookupHsCodeWithAi, 
  calculateCustomsTaxes 
} from '../../services/customsTariff/customsTariffService';

interface HsCodeTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  onApplyLineItemsToQuote?: (items: LineItem[]) => void;
  onApplyHsCodeToShipment?: (hsCode: string, commodityDescription?: string) => void;
}

export const HsCodeTariffModal: React.FC<HsCodeTariffModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyLineItemsToQuote,
  onApplyHsCodeToShipment,
}) => {
  // Search State
  const [searchQuery, setSearchQuery] = useState(currentQuote.shipment.commodity || 'Pin Lithium');
  const [isSearching, setIsSearching] = useState(false);
  const [candidateItems, setCandidateItems] = useState<HsCodeTariffItem[]>(() => COMMON_HS_CODE_DATABASE.slice(0, 3));
  const [selectedHsItem, setSelectedHsItem] = useState<HsCodeTariffItem>(() => COMMON_HS_CODE_DATABASE[0]);
  const [rulingAdvice, setRulingAdvice] = useState<string>('Áp dụng theo Danh mục Hàng hóa XNK Việt Nam và 6 Quy tắc tổng quát GIR.');
  const [detectedCategory, setDetectedCategory] = useState<string>('Thiết bị điện & Pin');

  // Calculator Inputs
  const [cifValueUsd, setCifValueUsd] = useState<number>(() => {
    // Estimate from shipment gross weight or default
    const gw = currentQuote.shipment.grossWeightKg || 1000;
    return Math.max(1000, Math.round(gw * 2.5));
  });
  const [quantity, setQuantity] = useState<number>(() => currentQuote.shipment.quantity || 100);
  const [selectedAgreement, setSelectedAgreement] = useState<string>('MFN');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const exchangeRate = currentQuote.exchangeRate || 25400;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Perform AI Lookup
  const handlePerformLookup = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await lookupHsCodeWithAi(q, currentQuote.shipment.pol);
      setCandidateItems(res.items);
      if (res.items.length > 0) {
        setSelectedHsItem(res.items[0]);
        // Reset selected agreement if current not in fta
        setSelectedAgreement('MFN');
      }
      setRulingAdvice(res.rulingAdvice);
      setDetectedCategory(res.detectedCategory);
    } catch (err: any) {
      showToast('Lỗi khi tra cứu mã HS.');
    } finally {
      setIsSearching(false);
    }
  };

  // Auto trigger lookup when opened if quote has commodity
  useEffect(() => {
    if (isOpen && currentQuote.shipment.commodity) {
      setSearchQuery(currentQuote.shipment.commodity);
      handlePerformLookup(currentQuote.shipment.commodity);
    }
  }, [isOpen]);

  // Real-time Tax Calculation Result
  const taxCalculation: CustomsTaxCalculationResult = useMemo(() => {
    if (!selectedHsItem) {
      return {
        cifValueVnd: 0,
        cifValueUsd: 0,
        appliedDutyRate: 0,
        appliedDutyName: 'N/A',
        importDutyVnd: 0,
        importDutyUsd: 0,
        specialConsumptionTaxVnd: 0,
        specialConsumptionTaxUsd: 0,
        environmentalTaxVnd: 0,
        environmentalTaxUsd: 0,
        vatTaxVnd: 0,
        vatTaxUsd: 0,
        totalCustomsTaxVnd: 0,
        totalCustomsTaxUsd: 0,
        effectiveTaxRatePercent: 0,
        suggestedLineItems: [],
      };
    }

    return calculateCustomsTaxes({
      cifValueUsd: Math.max(0, cifValueUsd),
      exchangeRate,
      quantity: Math.max(1, quantity),
      appliedAgreementCode: selectedAgreement,
      hsItem: selectedHsItem,
    });
  }, [cifValueUsd, exchangeRate, quantity, selectedAgreement, selectedHsItem]);

  // Apply to quotation lines
  const handleApplyToQuotation = () => {
    if (!taxCalculation || taxCalculation.suggestedLineItems.length === 0) {
      showToast('Không có dòng chi phí thuế nào để thêm.');
      return;
    }

    if (onApplyLineItemsToQuote) {
      onApplyLineItemsToQuote(taxCalculation.suggestedLineItems);
    }
    if (onApplyHsCodeToShipment && selectedHsItem) {
      onApplyHsCodeToShipment(selectedHsItem.hsCode, selectedHsItem.descriptionVi);
    }

    showToast(`Đã thêm ${taxCalculation.suggestedLineItems.length} khoản thuế & phí hải quan vào Báo giá!`);
    onClose();
  };

  // Just apply HS code to shipment form
  const handleApplyHsOnly = () => {
    if (selectedHsItem && onApplyHsCodeToShipment) {
      onApplyHsCodeToShipment(selectedHsItem.hsCode, selectedHsItem.descriptionVi);
      showToast(`Đã gán mã HS ${selectedHsItem.hsCode} vào thông tin lô hàng!`);
      onClose();
    }
  };

  // Quick Preset Tags
  const QUICK_TAGS = [
    { label: 'Pin Lithium Ắc Quy', query: 'Pin Lithium ion sạc lại được' },
    { label: 'Áo Thun Cotton', query: 'Áo thun may mặc dệt kim 100% cotton' },
    { label: 'Máy Tính Laptop', query: 'Máy tính xách tay xách tay Laptop' },
    { label: 'Thanh Long Đông Lạnh', query: 'Quả thanh long ruột đỏ đông lạnh' },
    { label: 'Xe Nâng Hàng Tự Hành', query: 'Xe nâng hàng tự hành diesel' },
    { label: 'Mỹ Phẩm Dưỡng Da', query: 'Kem dưỡng ẩm da mặt mỹ phẩm' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-150">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 text-slate-900">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tra Cứu Mã HS Code & Tự Động Tính Thuế XNK Bằng AI
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Biểu Thuế XNK Việt Nam
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Phân loại mã HS 8 chữ số theo 6 quy tắc GIR, so sánh thuế FTA ưu đãi và tự động tính toán thuế trọn gói DDP/DAP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Search Bar & Preset Tags */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformLookup()}
                placeholder="Nhập tên hàng hóa, thành phần hoặc công dụng (VD: Pin lithium xe điện, Áo thun 100% cotton, Laptop...)..."
                className="w-full pl-9 pr-24 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => handlePerformLookup()}
                disabled={isSearching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang Tra Cứu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>AI Tra Cứu</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
            <span className="text-slate-400 text-[11px] font-semibold shrink-0">Hàng mẫu nhanh:</span>
            {QUICK_TAGS.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(tag.query);
                  handlePerformLookup(tag.query);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 transition shrink-0 cursor-pointer"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Dual-Pane Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50">
          
          {/* LEFT PANE: CANDIDATE HS CODES & DETAILS */}
          <div className="w-full lg:w-7/12 border-r border-slate-200 flex flex-col overflow-y-auto p-3 sm:p-5 space-y-4">
            
            {/* Advice Box from AI */}
            {rulingAdvice && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>Khuyến Nghị Phân Loại Hải Quan (GIR Rulings):</span>
                  </div>
                  <span className="text-[11px] bg-amber-200/60 px-2 py-0.5 rounded text-amber-800 font-mono">
                    {detectedCategory}
                  </span>
                </div>
                <p className="text-amber-800 text-[11.5px] leading-relaxed">
                  {rulingAdvice}
                </p>
              </div>
            )}

            {/* Candidate HS Code Cards */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>Các Mã HS Phù Hợp Nhất ({candidateItems.length}):</span>
                <span className="text-[11px] text-slate-400 font-normal">Click chọn để đưa vào máy tính thuế</span>
              </div>

              {candidateItems.map((item) => {
                const isSelected = selectedHsItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedHsItem(item)}
                    className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Header: HS Code & Confidence Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base sm:text-lg font-black text-amber-600 tracking-tight">
                          {item.hsCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.hsCode, item.id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Sao chép mã HS"
                        >
                          {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 font-mono">
                          Chương {item.chapter}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.confidenceScore}% Tin cậy</span>
                        </span>
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 leading-snug">
                        {item.descriptionVi}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] italic">
                        {item.descriptionEn}
                      </div>
                    </div>

                    {/* Classification Reason */}
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-700">Căn cứ phân loại: </span>
                      <span>{item.classificationReason}</span>
                    </div>

                    {/* Base Tariff Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block font-semibold">Thuế NK Ưu Đãi (MFN):</span>
                        <span className="font-bold text-amber-700">{item.importPreferentialTariff}%</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block font-semibold">Thuế GTGT (VAT):</span>
                        <span className="font-bold text-indigo-700">{item.vatTariff}%</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block font-semibold">Thuế Xuất Khẩu:</span>
                        <span className="font-bold text-emerald-700">{item.exportTariff}%</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block font-semibold">Đơn Vị Tính:</span>
                        <span className="font-bold text-slate-900">{item.unit || 'Chiếc'}</span>
                      </div>
                    </div>

                    {/* FTA Preferential Table */}
                    {item.ftaTariffs && item.ftaTariffs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>Ưu đãi Thuế quan Hiệp định Thương mại Tự do (FTA):</span>
                          <span className="text-[10px] text-indigo-600 font-normal">Cần C/O hợp lệ để hưởng thuế</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                          {item.ftaTariffs.map((fta, fIdx) => (
                            <div key={fIdx} className="bg-indigo-50/50 p-1.5 rounded border border-indigo-100 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-bold text-indigo-900 block">{fta.agreementCode}</span>
                                <span className="text-[10px] text-slate-500">{fta.coForm}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                                {fta.rate}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specialized Inspection Badge */}
                    {item.specializedInspection?.isRequired && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11.5px]">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          <span>Yêu Cầu Kiểm Tra Chuyên Ngành:</span>
                        </div>
                        <div className="text-rose-800 text-[11px] space-y-0.5">
                          <p>• <strong>Cơ quan:</strong> {item.specializedInspection.agency}</p>
                          <p>• <strong>Thủ tục:</strong> {item.specializedInspection.inspectionType}</p>
                          {item.specializedInspection.estimatedCostVnd && (
                            <p>• <strong>Chi phí ước tính:</strong> {item.specializedInspection.estimatedCostVnd.toLocaleString()} VND (Dự kiến {item.specializedInspection.estimatedDays || 3} ngày)</p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT PANE: INTERACTIVE DUTY CALCULATOR & QUOTE SYNC */}
          <div className="w-full lg:w-5/12 flex flex-col bg-white overflow-y-auto p-3 sm:p-5 space-y-4">
            
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>Máy Tính Thuế XNK Trực Quan</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                  {selectedHsItem?.hsCode || '---'}
                </span>
              </div>

              {/* Input Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Trị Giá Tính Thuế (CIF Value USD):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={cifValueUsd}
                      onChange={(e) => setCifValueUsd(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Tương đương: <strong>{(cifValueUsd * exchangeRate).toLocaleString()} VND</strong> (Tỷ giá: {exchangeRate.toLocaleString()})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Số Lượng ({selectedHsItem?.unit || 'Đơn vị'}):
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Hiệp Định Áp Dụng:
                    </label>
                    <select
                      value={selectedAgreement}
                      onChange={(e) => setSelectedAgreement(e.target.value)}
                      className="w-full px-2 py-1.5 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="MFN">Thuế Ưu Đãi MFN ({selectedHsItem?.importPreferentialTariff}%)</option>
                      {selectedHsItem?.ftaTariffs?.map((fta, idx) => (
                        <option key={idx} value={fta.agreementCode}>
                          {fta.agreementCode} ({fta.rate}% - {fta.coForm})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Computation Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Bảng Phân Tích Các Khoản Thuế:</span>
                <span className="text-[11px] text-slate-500">{taxCalculation.appliedDutyName}</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 1. Thuế Nhập Khẩu */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">1. Thuế Nhập Khẩu ({taxCalculation.appliedDutyRate}%)</div>
                    <div className="text-[10px] text-slate-500">
                      {taxCalculation.coFormRequired ? `Yêu cầu ${taxCalculation.coFormRequired}` : 'Không cần C/O'}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>{taxCalculation.importDutyVnd.toLocaleString()} VND</div>
                    <div className="text-[10px] text-slate-400">${taxCalculation.importDutyUsd.toFixed(2)}</div>
                  </div>
                </div>

                {/* 2. Thuế Tiêu Thụ Đặc Biệt (nếu có) */}
                {taxCalculation.specialConsumptionTaxVnd > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-800">2. Thuế Tiêu Thụ Đặc Biệt</div>
                      <div className="text-[10px] text-slate-500">Hàng hóa chịu thuế TTĐB</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      <div>{taxCalculation.specialConsumptionTaxVnd.toLocaleString()} VND</div>
                      <div className="text-[10px] text-slate-400">${taxCalculation.specialConsumptionTaxUsd.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {/* 3. Thuế GTGT (VAT) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">3. Thuế Giá Trị Gia Tăng (VAT {selectedHsItem?.vatTariff || 8}%)</div>
                    <div className="text-[10px] text-slate-500">Tính trên (CIF + Thuế NK + Thuế TTĐB)</div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-900">
                    <div>{taxCalculation.vatTaxVnd.toLocaleString()} VND</div>
                    <div className="text-[10px] text-slate-400">${taxCalculation.vatTaxUsd.toFixed(2)}</div>
                  </div>
                </div>

                {/* Phí kiểm tra chuyên ngành ước tính */}
                {selectedHsItem?.specializedInspection?.isRequired && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                    <div>
                      <div className="font-bold text-rose-900">4. Phí Kiểm Tra Chuyên Ngành</div>
                      <div className="text-[10px] text-rose-700">{selectedHsItem.specializedInspection.agency}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-rose-900">
                      <div>{(selectedHsItem.specializedInspection.estimatedCostVnd || 2500000).toLocaleString()} VND</div>
                      <div className="text-[10px] text-slate-400">Dự kiến {selectedHsItem.specializedInspection.estimatedDays} ngày</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Duty Banner */}
              <div className="p-3 bg-gradient-to-r from-amber-500 to-rose-500 rounded-xl text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-100">
                  <span>TỔNG THUẾ PHẢI NỘP NHÀ NƯỚC:</span>
                  <span className="font-mono text-white text-[11px] bg-white/20 px-2 py-0.5 rounded">
                    Tỷ lệ thuế: {taxCalculation.effectiveTaxRatePercent.toFixed(1)}% CIF
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                    {taxCalculation.totalCustomsTaxVnd.toLocaleString()} <span className="text-sm font-sans font-bold">VND</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-white/90">
                    ≈ ${taxCalculation.totalCustomsTaxUsd.toFixed(2)} USD
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleApplyToQuotation}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                title="Tự động thêm Thuế nhập khẩu và Thuế VAT vào bảng chi phí Báo Giá"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Đưa Thuế & Phí Hải Quan Vào Báo Giá (1 Chạm)</span>
              </button>

              <button
                type="button"
                onClick={handleApplyHsOnly}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Chỉ Gán Mã HS {selectedHsItem?.hsCode} Vào Lô Hàng</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
