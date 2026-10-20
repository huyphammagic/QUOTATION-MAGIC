import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  Ship, 
  Plane, 
  Truck, 
  Boxes, 
  Star, 
  Check, 
  ArrowRight, 
  Plus, 
  Trash2, 
  X, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  FileText,
  Bookmark,
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react';
import { RoutePreset, TradeLane, PresetApplyMode } from '../../types/routePreset';
import { QuoteData, TransportMode } from '../../types/logistics';
import { 
  getAllRoutePresets, 
  saveCustomRoutePreset, 
  deleteCustomRoutePreset, 
  toggleRoutePresetFavorite,
  convertQuoteToRoutePreset,
  applyRoutePresetToQuote
} from '../../services/quotation/routePresetService';
import { formatUSD, formatVND } from '../../utils/formatters';

interface RoutePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  onApplyPreset: (updatedQuote: QuoteData, message: string) => void;
  exchangeRate: number;
}

export const RoutePresetModal: React.FC<RoutePresetModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyPreset,
  exchangeRate,
}) => {
  const [presets, setPresets] = useState<RoutePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeLane, setSelectedTradeLane] = useState<TradeLane | 'FAVORITES' | 'CUSTOM'>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  // State for Saving Current Quote as Preset Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    shortName: '',
    tradeLane: 'TRANSPACIFIC_US' as TradeLane,
    carrier: '',
    badge: 'Mẫu Tùy Chỉnh Doanh Nghiệp',
    description: '',
  });

  // Toast / feedback message inside modal
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Load presets on open
  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen]);

  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const list = await getAllRoutePresets();
      setPresets(list);
    } catch (err) {
      console.warn('Error loading route presets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = toggleRoutePresetFavorite(presetId);
    setPresets(prev => prev.map(p => p.id === presetId ? { ...p, isFavorite: isFav } : p));
  };

  const handleDeleteCustom = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa gói mẫu báo giá tùy chỉnh này?')) {
      await deleteCustomRoutePreset(presetId);
      setPresets(prev => prev.filter(p => p.id !== presetId));
      triggerNotice('Đã xóa gói mẫu thành công.');
    }
  };

  const triggerNotice = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // 1-Click Apply Handlers
  const handleApply = (preset: RoutePreset, mode: PresetApplyMode) => {
    const updated = applyRoutePresetToQuote(
      currentQuote,
      preset,
      mode,
      exchangeRate,
      currentQuote.company
    );

    let message = '';
    if (mode === 'NEW_QUOTE') {
      message = `✨ Đã tạo Báo giá mới ${updated.quoteNumber} từ gói "${preset.name}" (${preset.items.length} mục phí trọn gói)!`;
    } else if (mode === 'OVERWRITE_CURRENT') {
      message = `🔄 Đã áp dụng trọn bộ tuyến & cước phí từ gói "${preset.name}" vào báo giá hiện tại!`;
    } else {
      message = `➕ Đã thêm ${preset.items.length} dòng phí của gói "${preset.shortName}" vào báo giá!`;
    }

    onApplyPreset(updated, message);
    onClose();
  };

  // Open Save Current Quote Dialog
  const handleOpenSaveForm = () => {
    const polShort = currentQuote.shipment.pol ? currentQuote.shipment.pol.split(',')[0] : 'Cát Lái';
    const podShort = currentQuote.shipment.pod ? currentQuote.shipment.pod.split(',')[0] : 'Cảng Đích';
    const modeName = currentQuote.shipment.mode === 'AIR_FREIGHT' ? 'Air' : currentQuote.shipment.containerType || 'FCL';

    setCustomForm({
      name: `${modeName} ${polShort} ➔ ${podShort} (${currentQuote.terms.incoterm || 'FOB'})`,
      shortName: `${modeName} ${podShort}`,
      tradeLane: 'TRANSPACIFIC_US',
      carrier: 'Hãng tàu chỉ định',
      badge: 'Gói Tiêu Chuẩn Doanh Nghiệp',
      description: `Mẫu lưu từ báo giá ${currentQuote.quoteNumber} với ${currentQuote.items.length} mục chi phí.`,
    });
    setIsSaveModalOpen(true);
  };

  const handleSaveCurrentAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;

    const newPreset = convertQuoteToRoutePreset(currentQuote, {
      name: customForm.name,
      shortName: customForm.shortName || customForm.name,
      tradeLane: customForm.tradeLane,
      carrier: customForm.carrier,
      badge: customForm.badge,
      description: customForm.description,
    });

    await saveCustomRoutePreset(newPreset);
    setPresets(prev => [newPreset, ...prev]);
    setIsSaveModalOpen(false);
    triggerNotice(`⭐ Đã lưu thành công gói mẫu tuyến "${newPreset.shortName}"!`);
  };

  // Filter & Search Logic
  const filteredPresets = useMemo(() => {
    return presets.filter(preset => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = preset.name.toLowerCase().includes(q);
        const matchPol = preset.pol.toLowerCase().includes(q);
        const matchPod = preset.pod.toLowerCase().includes(q);
        const matchCarrier = (preset.carrier || '').toLowerCase().includes(q);
        const matchItems = preset.items.some(i => i.description.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
        if (!matchName && !matchPol && !matchPod && !matchCarrier && !matchItems) {
          return false;
        }
      }

      // Mode filter
      if (selectedMode !== 'ALL' && preset.serviceMode !== selectedMode) {
        return false;
      }

      // Trade Lane filter
      if (selectedTradeLane === 'FAVORITES') {
        return preset.isFavorite;
      }
      if (selectedTradeLane === 'CUSTOM') {
        return preset.isCustom;
      }
      if (selectedTradeLane !== 'ALL' && preset.tradeLane !== selectedTradeLane) {
        return false;
      }

      return true;
    });
  }, [presets, searchQuery, selectedMode, selectedTradeLane]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Bộ Mẫu Báo Giá Trọn Gói Theo Tuyến
                </h2>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  1-Click Presets
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tự động điền đầy đủ cước biển/hàng không, trọn bộ Local Charges (POL/POD), phụ phí an ninh và điều khoản chuẩn chỉ với 1 chạm.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleOpenSaveForm}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 transition-all cursor-pointer shadow-xs"
              title="Lưu toàn bộ thông tin và chi phí của báo giá hiện tại thành một gói mẫu mới"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Lưu Báo Giá Này Thành Gói Mẫu</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center space-x-2 text-emerald-800 text-xs font-medium animate-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo cảng POL, POD, tên tuyến, hãng tàu, phụ phí..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mode Filter Selector */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap mr-1">Hình thức:</span>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'SEA_FCL', label: 'FCL Cont', icon: Ship },
                { id: 'SEA_LCL', label: 'LCL Gom lẻ', icon: Boxes },
                { id: 'AIR_FREIGHT', label: 'Hàng không', icon: Plane },
                { id: 'MULTIMODAL', label: 'Door-to-Door', icon: Truck },
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1 ${
                    selectedMode === mode.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode.icon && <mode.icon className="w-3.5 h-3.5" />}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trade Lane Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'Tất Cả Tuyến' },
              { id: 'FAVORITES', label: '⭐ Yêu Thích' },
              { id: 'TRANSPACIFIC_US', label: '🇺🇸 Bắc Mỹ (US/CA)' },
              { id: 'EUROPE', label: '🇪🇺 Châu Âu (EU)' },
              { id: 'INTRA_ASIA', label: '🇯🇵 🇨🇳 Nội Á (Nhật/Hàn/Trung)' },
              { id: 'SOUTHEAST_ASIA', label: '🇸🇬 Đông Nam Á' },
              { id: 'DOOR_TO_DOOR_ALL', label: '📦 Trọn Gói Door-to-Door' },
              { id: 'DOMESTIC_VIETNAM', label: '🇻🇳 Nội Địa VN' },
              { id: 'CUSTOM', label: '📁 Mẫu Của Tôi' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTradeLane(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition cursor-pointer ${
                  selectedTradeLane === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Presets Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/60">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Đang tải danh mục gói mẫu tuyến...</p>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto my-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Không tìm thấy gói mẫu phù hợp</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục tuyến đường khác.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedTradeLane('ALL'); setSelectedMode('ALL'); }}
                className="mt-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPresets.map(preset => {
                const isExpanded = expandedPresetId === preset.id;
                const isFcl = preset.serviceMode === 'SEA_FCL';
                const isAir = preset.serviceMode === 'AIR_FREIGHT';
                const isLcl = preset.serviceMode === 'SEA_LCL';

                return (
                  <div
                    key={preset.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                      preset.isFavorite ? 'border-amber-300 ring-1 ring-amber-200/60 shadow-xs' : 'border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300'
                    }`}
                  >
                    {/* Card Header & Badges */}
                    <div className="p-4 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Service Mode Tag */}
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isAir 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : isLcl 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {isAir ? <Plane className="w-3 h-3" /> : isLcl ? <Boxes className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
                            <span>{preset.serviceMode.replace('_', ' ')}</span>
                          </span>

                          {/* Preset Feature Badge */}
                          {preset.badge && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {preset.badge}
                            </span>
                          )}

                          {/* Custom Indicator */}
                          {preset.isCustom && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Mẫu Tùy Chỉnh
                            </span>
                          )}
                        </div>

                        {/* Favorite & Delete Buttons */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(preset.id, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              preset.isFavorite 
                                ? 'text-amber-500 hover:bg-amber-50' 
                                : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                            }`}
                            title={preset.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                          >
                            <Star className={`w-4 h-4 ${preset.isFavorite ? 'fill-amber-400' : ''}`} />
                          </button>

                          {preset.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustom(preset.id, e)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa mẫu tùy chỉnh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Short Description */}
                      <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                        {preset.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>

                      {/* Route Path Indicator */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex-1 truncate">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cảng Đi (POL)</div>
                          <div className="font-semibold text-slate-800 truncate" title={preset.pol}>
                            {preset.pol || 'Chưa xác định'}
                          </div>
                        </div>

                        <div className="px-3 flex flex-col items-center text-indigo-600">
                          {isAir ? <Plane className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                          <span className="text-[10px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">
                            {preset.transitTime.split('(')[0].trim()}
                          </span>
                        </div>

                        <div className="flex-1 truncate text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cảng Đến (POD)</div>
                          <div className="font-semibold text-slate-800 truncate" title={preset.pod}>
                            {preset.pod || 'Chưa xác định'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Details & Metrics */}
                    <div className="p-4 space-y-3">
                      {/* Carrier & Terms quick info */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate"><strong>Free time:</strong> {preset.freeTime}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate"><strong>Hãng vận chuyển:</strong> {preset.carrier || 'Chỉ định'}</span>
                        </div>
                      </div>

                      {/* Estimated Financial Summary Box */}
                      <div className="p-3 bg-linear-to-r from-indigo-50/60 via-slate-50 to-emerald-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            Dự toán chi phí trọn gói ({preset.items.length} mục phí)
                          </div>
                          <div className="flex items-baseline space-x-1.5 mt-0.5">
                            <span className="text-base font-extrabold text-slate-900">
                              {formatUSD(preset.estimatedTotalUsd)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              (~ {formatVND(preset.estimatedTotalVnd)})
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                            Lợi Nhuận Dự Tính
                          </div>
                          <div className="flex items-center justify-end space-x-1 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600">
                              +{formatUSD(preset.estimatedProfitUsd)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800">
                              {preset.estimatedMarginPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expand/Collapse Items Details */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                          className="w-full py-1 text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center space-x-1 transition cursor-pointer"
                        >
                          <span>{isExpanded ? 'Thu gọn chi tiết các khoản phí' : `Xem chi tiết ${preset.items.length} khoản phí trong gói`}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden text-xs animate-in fade-in-50 duration-150">
                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {preset.items.map((item, idx) => (
                                <div key={item.id || idx} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex items-center space-x-2 truncate pr-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                                      item.location === 'POL' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : item.location === 'POD' 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {item.location}
                                    </span>
                                    <div className="truncate">
                                      <span className="font-semibold text-slate-800">{item.code}: </span>
                                      <span className="text-slate-600">{item.description}</span>
                                    </div>
                                  </div>
                                  <div className="text-right whitespace-nowrap shrink-0 font-medium text-slate-800">
                                    {item.currency === 'USD' ? formatUSD(item.unitPrice) : formatVND(item.unitPrice)}
                                    <span className="text-[10px] text-slate-400 font-normal"> / {item.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="bg-slate-50 p-2 text-[11px] text-slate-500 border-t border-slate-200">
                              <strong>Điều khoản mặc định:</strong> Incoterm {preset.defaultTerms.incoterm} • {preset.defaultTerms.paymentTerm}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 items-center justify-between">
                      {/* Sub-actions */}
                      <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleApply(preset, 'OVERWRITE_CURRENT')}
                          className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
                          title="Ghi đè tuyến và toàn bộ dòng phí vào báo giá hiện tại"
                        >
                          Ghi đè vào Báo Giá Này
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(preset, 'APPEND_ITEMS_ONLY')}
                          className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
                          title="Chỉ chèn các dòng phí của gói này vào báo giá hiện tại (giữ nguyên thông tin khách hàng & tuyến)"
                        >
                          Chỉ Thêm Phí
                        </button>
                      </div>

                      {/* Primary 1-Click Action */}
                      <button
                        type="button"
                        onClick={() => handleApply(preset, 'NEW_QUOTE')}
                        className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg shadow-xs hover:shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
                        title="Tạo mới một bản báo giá sạch với mã số mới từ gói mẫu này"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Tạo Báo Giá Mới (1 Chạm)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Mẹo: Bạn có thể chỉnh sửa cước phí của báo giá hiện tại và nhấn <strong>"Lưu Báo Giá Này Thành Gói Mẫu"</strong> để tái sử dụng cho toàn đội ngũ Sales!
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* SUB-MODAL: Save Current Quote As Route Preset */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Lưu Báo Giá Hiện Tại Thành Gói Mẫu Tuyến</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentAsPreset} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên gói mẫu tuyến trọn gói <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customForm.name}
                  onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                  placeholder="Ví dụ: FCL Cát Lái đi Los Angeles (Dệt May)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên ngắn / Mã gọi</label>
                  <input
                    type="text"
                    value={customForm.shortName}
                    onChange={e => setCustomForm({ ...customForm, shortName: e.target.value })}
                    placeholder="Ví dụ: FCL LAX Direct"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khu vực tuyến đường (Trade Lane)</label>
                  <select
                    value={customForm.tradeLane}
                    onChange={e => setCustomForm({ ...customForm, tradeLane: e.target.value as TradeLane })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="TRANSPACIFIC_US">Bắc Mỹ (Hoa Kỳ / Canada)</option>
                    <option value="EUROPE">Châu Âu (EU)</option>
                    <option value="INTRA_ASIA">Nội Á (Nhật/Hàn/Trung)</option>
                    <option value="SOUTHEAST_ASIA">Đông Nam Á (ASEAN)</option>
                    <option value="DOOR_TO_DOOR_ALL">Trọn Gói Door-to-Door</option>
                    <option value="DOMESTIC_VIETNAM">Nội Địa Việt Nam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hãng tàu / Vận chuyển đề xuất</label>
                  <input
                    type="text"
                    value={customForm.carrier}
                    onChange={e => setCustomForm({ ...customForm, carrier: e.target.value })}
                    placeholder="Ví dụ: Maersk / ONE"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Huy hiệu nổi bật (Badge)</label>
                  <input
                    type="text"
                    value={customForm.badge}
                    onChange={e => setCustomForm({ ...customForm, badge: e.target.value })}
                    placeholder="Ví dụ: Khách VIP • Ưu Tiên"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả / Ghi chú nghiệp vụ</label>
                <textarea
                  rows={2}
                  value={customForm.description}
                  onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
                  placeholder="Ghi chú về lịch tàu, thời gian vận chuyển hoặc quy cách hàng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-600">
                <span>Số mục phí sẽ lưu: <strong>{currentQuote.items.length} mục</strong></span>
                <span>Tuyến: <strong>{currentQuote.shipment.pol.split(',')[0]} ➔ {currentQuote.shipment.pod.split(',')[0]}</strong></span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Xác Nhận Lưu Gói Mẫu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
