import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  Box, 
  ArrowRight, 
  Plus, 
  Check, 
  Filter, 
  Search, 
  Layers, 
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  UserCheck,
  FileCheck,
  Building2,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { 
  RateMasterItem, 
  RateSearchContext, 
  RateSearchResult, 
  SmartRateScanResult, 
  SmartRateCategoryGroup,
  MatchQuality 
} from '../types/masterRate';
import { ShipmentDetails, TransportMode, CustomerInfo } from '../types/logistics';
import { scanSmartRatesForQuote, searchSmartRates } from '../services/masterRate/rateSearchService';
import { formatUSD, formatVND, formatPercent, formatNumber } from '../utils/formatters';

interface SmartRateAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: ShipmentDetails;
  customer?: CustomerInfo;
  rates: RateMasterItem[];
  exchangeRate: number;
  existingItemRateIds?: string[];
  onAddSelectedRates: (selectedRates: RateMasterItem[]) => void;
  onAddSingleRate: (rate: RateMasterItem) => void;
  onOpenManualAdd?: () => void;
}

export const SmartRateAssistantModal: React.FC<SmartRateAssistantModalProps> = ({
  isOpen,
  onClose,
  shipment,
  customer,
  rates,
  exchangeRate,
  existingItemRateIds = [],
  onAddSelectedRates,
  onAddSingleRate,
  onOpenManualAdd,
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedRateIds, setSelectedRateIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showExpiredTab, setShowExpiredTab] = useState(false);

  // Construct Rate Search Context from live Shipment & Customer
  const searchContext: RateSearchContext = useMemo(() => {
    return {
      transportMode: shipment.mode,
      origin: shipment.pol || '',
      destination: shipment.pod || '',
      pol: shipment.pol || '',
      pod: shipment.pod || '',
      containerType: shipment.containerType || '',
      containerQuantity: shipment.quantity || 1,
      grossWeightKg: shipment.grossWeightKg || 0,
      volumeCbm: shipment.volumeCbm || 0,
      chargeableWeight: shipment.chargeableWeight || 0,
      customerCode: customer?.customerName || '',
      customerName: customer?.companyName || customer?.customerName || '',
      quotationDate: new Date().toISOString().slice(0, 10),
      keyword,
      status: showExpiredTab ? 'ALL' : 'ACTIVE',
    };
  }, [shipment, customer, keyword, showExpiredTab]);

  // Scan and categorize matching rates
  const scanResult: SmartRateScanResult = useMemo(() => {
    return scanSmartRatesForQuote(rates, searchContext);
  }, [rates, searchContext]);

  // Expired / Inactive search list
  const expiredResults = useMemo(() => {
    if (!showExpiredTab) return [];
    const searchRes = searchSmartRates(rates, { ...searchContext, status: 'ALL' });
    return searchRes.expiredMatches;
  }, [rates, searchContext, showExpiredTab]);

  if (!isOpen) return null;

  const toggleSelectRate = (rateId: string) => {
    const next = new Set(selectedRateIds);
    if (next.has(rateId)) {
      next.delete(rateId);
    } else {
      next.add(rateId);
    }
    setSelectedRateIds(next);
  };

  const handleSelectAllRecommended = () => {
    const next = new Set<string>();
    for (const group of scanResult.groups) {
      for (const item of group.items) {
        if (item.isValidForDate) {
          next.add(item.rate.id);
        }
      }
    }
    setSelectedRateIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedRateIds(new Set());
  };

  const handleApplySelected = () => {
    const ratesToAdd: RateMasterItem[] = [];
    const allItems = scanResult.groups.flatMap(g => g.items);
    
    selectedRateIds.forEach(id => {
      const found = allItems.find(item => item.rate.id === id);
      if (found) {
        ratesToAdd.push(found.rate);
      }
    });

    if (ratesToAdd.length === 0) return;
    onAddSelectedRates(ratesToAdd);
    onClose();
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Financial preview of selected rates
  const selectedRatesList = scanResult.groups
    .flatMap(g => g.items)
    .filter(i => selectedRateIds.has(i.rate.id))
    .map(i => i.rate);

  const totalEstSellUsd = selectedRatesList.reduce((sum, r) => {
    const val = r.sellingCurrency === 'USD' ? r.sellingAmount : r.sellingAmount / exchangeRate;
    return sum + val;
  }, 0);

  const totalEstCostUsd = selectedRatesList.reduce((sum, r) => {
    const val = r.costCurrency === 'USD' ? r.costAmount : r.costAmount / exchangeRate;
    return sum + val;
  }, 0);

  const estMarginPct = totalEstSellUsd > 0 ? ((totalEstSellUsd - totalEstCostUsd) / totalEstSellUsd) * 100 : 0;

  const getQualityBadge = (quality: MatchQuality, priority: number) => {
    switch (quality) {
      case 'CUSTOMER_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
            <Building2 className="w-3 h-3" /> Hợp Đồng Khách Hàng (Customer Contract)
          </span>
        );
      case 'CONTRACT_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
            <FileCheck className="w-3 h-3" /> Hợp Đồng Ưu Đãi (Special Contract)
          </span>
        );
      case 'EXACT_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
            <CheckCircle2 className="w-3 h-3" /> Khớp Chính Xác (Exact Match)
          </span>
        );
      case 'CARRIER_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white shadow-2xs">
            <Ship className="w-3 h-3" /> Theo Hãng Tàu (Carrier Match)
          </span>
        );
      case 'ROUTE_MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-600 text-white shadow-2xs">
            <ArrowRight className="w-3 h-3" /> Theo Tuyến Đường (Route Match)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700">
            Bảng Giá Chung (General Rate)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        id="smart-rate-assistant-modal"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Smart Rate Assistant & Auto Quote Building</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  Phase C Engine
                </span>
              </div>
              <p className="text-xs text-blue-100/90">
                Tự động quét và khớp bảng giá chuẩn từ Firestore theo Tuyến đường, Loại Cont, Khách hàng & Hãng tàu
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="btn-close-smart-rate-assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Search Context Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Lô hàng hiện tại:</span>
              <span className="font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                {shipment.mode}
              </span>
              <span className="font-medium text-slate-800 px-2 py-0.5 rounded bg-slate-200/80">
                {shipment.pol || 'N/A'} → {shipment.pod || 'N/A'}
              </span>
              {shipment.containerType && (
                <span className="font-semibold text-purple-800 px-2 py-0.5 rounded bg-purple-100 border border-purple-200">
                  {shipment.containerType} (x{shipment.quantity || 1})
                </span>
              )}
              {customer?.companyName && (
                <span className="font-medium text-emerald-800 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                  KH: {customer.companyName}
                </span>
              )}
            </div>

            {/* Quick Search & Tab Switcher */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Lọc nhanh (THC, Maersk, OF...)"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  id="smart-rate-keyword-input"
                />
              </div>

              <button
                onClick={() => setShowExpiredTab(!showExpiredTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  showExpiredTab
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                id="btn-toggle-expired-tab"
              >
                <Clock className="w-3.5 h-3.5" />
                {showExpiredTab ? 'Ẩn Giá Cũ/Hết Hạn' : 'Xem Giá Cũ/Hết Hạn'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              Tìm thấy <strong className="text-blue-700">{scanResult.totalActiveMatches}</strong> bảng giá phù hợp đang hiệu lực:
            </span>
            <button
              onClick={handleSelectAllRecommended}
              className="text-blue-600 hover:text-blue-800 font-semibold underline text-xs"
              id="btn-select-all-recommended"
            >
              Chọn tất cả đề xuất
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-slate-500 hover:text-slate-700 text-xs"
              id="btn-deselect-all"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">
              Đã chọn: <strong className="text-blue-700 font-bold">{selectedRateIds.size}</strong> mục
            </span>
          </div>
        </div>

        {/* Main Content: Grouped Categorized Rate Results */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 space-y-5">
          {scanResult.groups.length === 0 && (!showExpiredTab || expiredResults.length === 0) ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Không tìm thấy bảng giá đang hiệu lực phù hợp
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                No matching active rate found. Tuyến đường hoặc loại container này chưa có bảng giá hiệu lực trong Master Rate Database.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {onOpenManualAdd && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenManualAdd();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                    id="btn-manual-add-fallback"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Nhập Phí Thủ Công Vào Báo Giá
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  id="btn-close-empty-assistant"
                >
                  Đóng Trợ Lý
                </button>
              </div>
            </div>
          ) : (
            scanResult.groups.map(group => {
              const isCollapsed = collapsedGroups[group.categoryKey];
              const groupSelectedCount = group.items.filter(i => selectedRateIds.has(i.rate.id)).length;

              return (
                <div 
                  key={group.categoryKey}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                  id={`smart-group-${group.categoryKey}`}
                >
                  {/* Group Header */}
                  <div 
                    onClick={() => toggleGroupCollapse(group.categoryKey)}
                    className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                        {group.titleVi}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({group.items.length} lựa chọn)
                      </span>
                      {groupSelectedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          Đã chọn {groupSelectedCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Group Item Cards */}
                  {!isCollapsed && (
                    <div className="p-3 divide-y divide-slate-100 space-y-2">
                      {group.items.map(result => {
                        const { rate, matchScore, matchQuality, priorityLevel, matchReasonVi, isExpiringSoon } = result;
                        const isSelected = selectedRateIds.has(rate.id);
                        const isAlreadyInQuote = existingItemRateIds.includes(rate.id);
                        const margin = rate.sellingAmount > 0 
                          ? ((rate.sellingAmount - rate.costAmount) / rate.sellingAmount) * 100 
                          : 0;

                        return (
                          <div 
                            key={rate.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isSelected 
                                ? 'bg-blue-50/70 border-blue-300 shadow-2xs' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                            id={`rate-card-${rate.id}`}
                          >
                            {/* Checkbox & Details */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRate(rate.id)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                id={`check-rate-${rate.id}`}
                              />

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                    {rate.rateCode}
                                  </span>

                                  {getQualityBadge(matchQuality, priorityLevel)}

                                  {rate.carrier && (
                                    <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      {rate.carrier}
                                    </span>
                                  )}

                                  {rate.containerType && (
                                    <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                      Cont {rate.containerType}
                                    </span>
                                  )}

                                  {isExpiringSoon && (
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" /> Sắp hết hạn
                                    </span>
                                  )}

                                  {isAlreadyInQuote && (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      ✓ Đã có trong báo giá
                                    </span>
                                  )}

                                  <span className="text-[11px] font-bold text-blue-700 ml-auto">
                                    Độ khớp: {matchScore}%
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900">
                                  {rate.rateName || rate.chargeName} ({rate.chargeCode})
                                </h4>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">Tuyến:</span>
                                    <strong className="text-slate-800">{rate.origin || 'N/A'}</strong>
                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                    <strong className="text-slate-800">{rate.destination || 'N/A'}</strong>
                                  </div>

                                  {rate.transitTime && (
                                    <div className="flex items-center gap-1 text-slate-500">
                                      <span>Transit:</span>
                                      <strong>{rate.transitTime}</strong>
                                    </div>
                                  )}

                                  {rate.freeTime && (
                                    <div className="flex items-center gap-1 text-slate-500">
                                      <span>Free Time:</span>
                                      <strong>{rate.freeTime}</strong>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1 text-slate-500">
                                    <span>Hiệu lực:</span>
                                    <strong className="text-slate-700">
                                      {rate.effectiveFrom} → {rate.effectiveTo}
                                    </strong>
                                  </div>
                                </div>

                                <p className="text-[11px] text-blue-700/90 italic">
                                  Lý do: {matchReasonVi}
                                </p>
                              </div>
                            </div>

                            {/* Financials & Quick Action */}
                            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200 pl-7 md:pl-0">
                              <div className="text-right space-y-0.5">
                                <div className="text-xs text-slate-500">
                                  Giá vốn: <span className="font-mono font-semibold text-slate-700">
                                    {rate.costCurrency === 'USD' ? formatUSD(rate.costAmount) : formatVND(rate.costAmount)}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-blue-700">
                                  Giá bán: <span className="font-mono">
                                    {rate.sellingCurrency === 'USD' ? formatUSD(rate.sellingAmount) : formatVND(rate.sellingAmount)}
                                  </span>
                                  <span className="text-[11px] font-normal text-slate-500 ml-1">/{rate.unit || rate.basis}</span>
                                </div>
                                <div className="text-[11px] font-medium text-emerald-600">
                                  Margin: {formatPercent(margin)}
                                  {rate.minimumCharge && Number(rate.minimumCharge) > 0 ? ` (Min $${rate.minimumCharge})` : ''}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  onAddSingleRate(rate);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1"
                                id={`btn-add-single-${rate.id}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Áp dụng
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Expired Rates Section if toggled */}
          {showExpiredTab && expiredResults.length > 0 && (
            <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>BẢNG GIÁ ĐÃ HẾT HẠN HIỆU LỰC (EXPIRED RATES) - {expiredResults.length} MỤC</span>
              </div>
              <p className="text-xs text-amber-800/80">
                Các bảng giá dưới đây đã hết hiệu lực. Nếu áp dụng, hệ thống sẽ yêu cầu xác nhận.
              </p>
              <div className="space-y-2">
                {expiredResults.map(exp => (
                  <div 
                    key={exp.rate.id}
                    className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between gap-3 text-xs opacity-85"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{exp.rate.rateCode} - {exp.rate.rateName}</div>
                      <div className="text-slate-500">Hiệu lực cũ: {exp.rate.effectiveFrom} → {exp.rate.effectiveTo} ({exp.rate.origin} → {exp.rate.destination})</div>
                    </div>
                    <button
                      onClick={() => onAddSingleRate(exp.rate)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
                    >
                      Áp Dụng Dù Đã Hết Hạn
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar with Selection Summary & Add Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Đã chọn: <strong className="text-blue-700 font-bold text-sm">{selectedRateIds.size}</strong> bảng giá
            </span>
            {selectedRateIds.size > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span>
                  Tổng Bán Ước Tính: <strong className="text-blue-900 font-mono font-bold">{formatUSD(totalEstSellUsd)}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Tổng Vốn: <strong className="text-slate-700 font-mono font-medium">{formatUSD(totalEstCostUsd)}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Margin: <strong className="text-emerald-600 font-bold">{formatPercent(estMarginPct)}</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors w-full sm:w-auto"
              id="btn-cancel-smart-assistant"
            >
              Hủy / Đóng
            </button>
            <button
              onClick={handleApplySelected}
              disabled={selectedRateIds.size === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                selectedRateIds.size > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
              id="btn-apply-selected-rates"
            >
              <Check className="w-4 h-4" />
              Thêm {selectedRateIds.size} Phí Đã Chọn Vào Báo Giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
