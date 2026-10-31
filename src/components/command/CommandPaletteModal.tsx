import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Ship, 
  Plane, 
  MapPin, 
  Tag, 
  Users, 
  Command, 
  Plus, 
  FileText, 
  Save, 
  Download, 
  DollarSign, 
  Radar, 
  TrendingUp, 
  Database, 
  BookOpen, 
  HelpCircle,
  X,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { LOGISTICS_PORTS_DATA, PortItem } from '../../data/portsData';
import { PRESET_LOCAL_CHARGES } from '../../data/presets';
import { CustomerRecord, SurchargeItem, LineItem, Currency, FeeCategory, ChargeLocation } from '../../types/logistics';
import { formatUSD, formatVND } from '../../utils/formatters';

export type CommandPaletteTab = 'ALL' | 'PORTS' | 'CHARGES' | 'CUSTOMERS' | 'ACTIONS';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Ports callbacks
  onSelectPol: (portName: string) => void;
  onSelectPod: (portName: string) => void;
  // Surcharge callbacks
  onAddCharge: (charge: {
    code: string;
    description: string;
    category: FeeCategory;
    location: ChargeLocation;
    unit: string;
    unitPrice: number;
    costPrice: number;
    currency: Currency;
    vatRate: number;
  }) => void;
  // Customer callbacks
  onSelectCustomer: (customer: CustomerRecord) => void;
  customers: CustomerRecord[];
  surcharges?: SurchargeItem[];
  exchangeRate: number;
  // Actions
  onNewQuote: () => void;
  onSaveQuote: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onOpenRoutePresets: () => void;
  onOpenExchangeRate: () => void;
  onOpenControlTower: () => void;
  onOpenBiDashboard: () => void;
  onOpenMasterRates: () => void;
  onOpenCustomers: () => void;
  onOpenSurcharges: () => void;
  onOpenShortcutsHelp: () => void;
}

interface PaletteActionItem {
  id: string;
  type: 'ACTION';
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: any;
  category: 'DOCUMENT' | 'NAVIGATION' | 'FINANCE' | 'SYSTEM';
  run: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectPol,
  onSelectPod,
  onAddCharge,
  onSelectCustomer,
  customers = [],
  surcharges = [],
  exchangeRate = 25400,
  onNewQuote,
  onSaveQuote,
  onExportPdf,
  onExportExcel,
  onOpenRoutePresets,
  onOpenExchangeRate,
  onOpenControlTower,
  onOpenBiDashboard,
  onOpenMasterRates,
  onOpenCustomers,
  onOpenSurcharges,
  onOpenShortcutsHelp,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CommandPaletteTab>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // System actions list
  const systemActions: PaletteActionItem[] = useMemo(() => [
    {
      id: 'act-new-quote',
      type: 'ACTION',
      title: 'Tạo Báo Giá Mới',
      subtitle: 'Khởi tạo bản báo giá trống sạch sẽ',
      shortcut: 'Ctrl + N',
      icon: Plus,
      category: 'DOCUMENT',
      run: () => { onNewQuote(); onClose(); },
    },
    {
      id: 'act-save-quote',
      type: 'ACTION',
      title: 'Lưu Báo Giá Hiện Tại',
      subtitle: 'Lưu vào bộ nhớ máy và đồng bộ đám mây Firestore',
      shortcut: 'Ctrl + S',
      icon: Save,
      category: 'DOCUMENT',
      run: () => { onSaveQuote(); onClose(); },
    },
    {
      id: 'act-export-pdf',
      type: 'ACTION',
      title: 'Xuất PDF Báo Giá Chuyên Nghiệp',
      subtitle: 'In và tải file PDF báo giá hoàn chỉnh cho khách',
      shortcut: 'Ctrl + P',
      icon: FileText,
      category: 'DOCUMENT',
      run: () => { onExportPdf(); onClose(); },
    },
    {
      id: 'act-export-excel',
      type: 'ACTION',
      title: 'Xuất File Excel Chi Tiết',
      subtitle: 'Tải file bảng tính Excel đầy đủ công thức và chi phí',
      shortcut: 'Ctrl + E',
      icon: Download,
      category: 'DOCUMENT',
      run: () => { onExportExcel(); onClose(); },
    },
    {
      id: 'act-route-presets',
      type: 'ACTION',
      title: 'Thư Viện Tuyến Mẫu 1-Click (Route Presets)',
      subtitle: 'Điền nhanh toàn bộ tuyến FCL bờ Tây Mỹ, LCL Châu Á, Air Express...',
      shortcut: 'Ctrl + Shift + R',
      icon: Layers,
      category: 'NAVIGATION',
      run: () => { onOpenRoutePresets(); onClose(); },
    },
    {
      id: 'act-exchange-rate',
      type: 'ACTION',
      title: 'Trung Tâm Tỷ Giá USD Vietcombank Realtime',
      subtitle: `Tỷ giá hiện hành: 1 USD = ${exchangeRate.toLocaleString()} VND`,
      shortcut: 'Ctrl + Shift + E',
      icon: DollarSign,
      category: 'FINANCE',
      run: () => { onOpenExchangeRate(); onClose(); },
    },
    {
      id: 'act-control-tower',
      type: 'ACTION',
      title: 'Tháp Điều Hành Lô Hàng (Control Tower)',
      subtitle: 'Quản trị tiến độ, booking, tàu bè, rủi ro Dem/Det thời gian thực',
      shortcut: 'Ctrl + Shift + T',
      icon: Radar,
      category: 'NAVIGATION',
      run: () => { onOpenControlTower(); onClose(); },
    },
    {
      id: 'act-bi-dashboard',
      type: 'ACTION',
      title: 'Cockpit & Báo Cáo Phân Tích BI',
      subtitle: 'Doanh thu, biên lợi nhuận, hiệu suất Sale và tuyến tàu',
      shortcut: 'Ctrl + Shift + D',
      icon: TrendingUp,
      category: 'NAVIGATION',
      run: () => { onOpenBiDashboard(); onClose(); },
    },
    {
      id: 'act-master-rates',
      type: 'ACTION',
      title: 'Quản Lý Biểu Cước Gốc (Master Rates Hub)',
      subtitle: 'Tra cứu giá mua hãng tàu, so sánh giá cước SPOT và hợp đồng',
      shortcut: 'Ctrl + B',
      icon: Database,
      category: 'NAVIGATION',
      run: () => { onOpenMasterRates(); onClose(); },
    },
    {
      id: 'act-customers',
      type: 'ACTION',
      title: 'Quản Lý Danh Bạ Khách Hàng CRM',
      subtitle: 'Tra cứu danh sách khách hàng, hạn mức công nợ và lịch sử',
      shortcut: 'Ctrl + Shift + C',
      icon: Users,
      category: 'NAVIGATION',
      run: () => { onOpenCustomers(); onClose(); },
    },
    {
      id: 'act-surcharges',
      type: 'ACTION',
      title: 'Danh Mục Phụ Phí Chuẩn (Surcharge Catalog)',
      subtitle: 'Quản lý biểu phí Local charges cảng đi/đến niêm yết',
      shortcut: 'Ctrl + Shift + S',
      icon: Tag,
      category: 'NAVIGATION',
      run: () => { onOpenSurcharges(); onClose(); },
    },
    {
      id: 'act-shortcuts-help',
      type: 'ACTION',
      title: 'Xem Toàn Bộ Bảng Phím Tắt Thao Tác Nhanh',
      subtitle: 'Xem danh sách toàn bộ hotkeys tăng 300% tốc độ nhập liệu',
      shortcut: '?',
      icon: HelpCircle,
      category: 'SYSTEM',
      run: () => { onOpenShortcutsHelp(); onClose(); },
    },
  ], [
    exchangeRate,
    onNewQuote,
    onSaveQuote,
    onExportPdf,
    onExportExcel,
    onOpenRoutePresets,
    onOpenExchangeRate,
    onOpenControlTower,
    onOpenBiDashboard,
    onOpenMasterRates,
    onOpenCustomers,
    onOpenSurcharges,
    onOpenShortcutsHelp,
    onClose,
  ]);

  // Combined charges catalog
  const chargesCatalog = useMemo(() => {
    const list: Array<{
      code: string;
      name: string;
      category: FeeCategory;
      location: ChargeLocation;
      unit: string;
      priceUsd: number;
      priceVnd: number;
      vat: number;
      currency: Currency;
    }> = [];

    // From preset local charges
    PRESET_LOCAL_CHARGES.forEach(c => {
      list.push({
        code: c.code,
        name: c.name,
        category: c.category,
        location: c.location,
        unit: c.unit,
        priceUsd: c.priceUsd,
        priceVnd: c.priceVnd,
        vat: c.vat,
        currency: c.currency,
      });
    });

    // From user custom surcharges (if not duplicated by code)
    if (surcharges && surcharges.length > 0) {
      surcharges.forEach(s => {
        if (!list.some(existing => existing.code.toUpperCase() === s.code.toUpperCase())) {
          list.push({
            code: s.code,
            name: s.name,
            category: s.category || 'LOCAL_CHARGE',
            location: s.location || 'POL',
            unit: s.unit || 'Shipment',
            priceUsd: s.priceUsd || 0,
            priceVnd: s.priceVnd || 0,
            vat: s.vatRate || 8,
            currency: s.currency || 'USD',
          });
        }
      });
    }

    return list;
  }, [surcharges]);

  // Filtered Results Calculation
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Ports
    let matchedPorts: PortItem[] = [];
    if (activeTab === 'ALL' || activeTab === 'PORTS') {
      if (!q) {
        matchedPorts = LOGISTICS_PORTS_DATA.filter(p => p.isPopular).slice(0, 8);
      } else {
        matchedPorts = LOGISTICS_PORTS_DATA.filter(p => 
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.vietnameseName && p.vietnameseName.toLowerCase().includes(q)) ||
          p.country.toLowerCase().includes(q)
        ).slice(0, 15);
      }
    }

    // 2. Charges
    let matchedCharges: typeof chargesCatalog = [];
    if (activeTab === 'ALL' || activeTab === 'CHARGES') {
      if (!q) {
        matchedCharges = chargesCatalog.slice(0, 8);
      } else {
        matchedCharges = chargesCatalog.filter(c => 
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        ).slice(0, 15);
      }
    }

    // 3. Customers
    let matchedCustomers: CustomerRecord[] = [];
    if (activeTab === 'ALL' || activeTab === 'CUSTOMERS') {
      if (!q) {
        matchedCustomers = customers.slice(0, 6);
      } else {
        matchedCustomers = customers.filter(cust => 
          (cust.customerName && cust.customerName.toLowerCase().includes(q)) ||
          (cust.companyName && cust.companyName.toLowerCase().includes(q)) ||
          (cust.taxId && cust.taxId.toLowerCase().includes(q)) ||
          (cust.email && cust.email.toLowerCase().includes(q)) ||
          (cust.phone && cust.phone.toLowerCase().includes(q))
        ).slice(0, 10);
      }
    }

    // 4. Actions
    let matchedActions: PaletteActionItem[] = [];
    if (activeTab === 'ALL' || activeTab === 'ACTIONS') {
      if (!q) {
        matchedActions = systemActions;
      } else {
        matchedActions = systemActions.filter(act => 
          act.title.toLowerCase().includes(q) ||
          act.subtitle.toLowerCase().includes(q) ||
          (act.shortcut && act.shortcut.toLowerCase().includes(q))
        );
      }
    }

    return {
      ports: matchedPorts,
      charges: matchedCharges,
      customers: matchedCustomers,
      actions: matchedActions,
      totalCount: matchedPorts.length + matchedCharges.length + matchedCustomers.length + matchedActions.length,
    };
  }, [query, activeTab, chargesCatalog, customers, systemActions]);

  // Flattened items list for arrow key navigation
  type FlattenedItem = 
    | { type: 'PORT'; data: PortItem }
    | { type: 'CHARGE'; data: typeof chargesCatalog[0] }
    | { type: 'CUSTOMER'; data: CustomerRecord }
    | { type: 'ACTION'; data: PaletteActionItem };

  const flattenedItems = useMemo<FlattenedItem[]>(() => {
    const list: FlattenedItem[] = [];
    filteredResults.actions.forEach(a => list.push({ type: 'ACTION', data: a }));
    filteredResults.ports.forEach(p => list.push({ type: 'PORT', data: p }));
    filteredResults.charges.forEach(c => list.push({ type: 'CHARGE', data: c }));
    filteredResults.customers.forEach(cust => list.push({ type: 'CUSTOMER', data: cust }));
    return list;
  }, [filteredResults]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, flattenedItems.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flattenedItems[selectedIndex];
      if (!current) return;

      if (current.type === 'ACTION') {
        current.data.run();
      } else if (current.type === 'PORT') {
        // Default Enter on port assigns as POL or shows toast
        onSelectPol(`${current.data.name} (${current.data.code})`);
        onClose();
      } else if (current.type === 'CHARGE') {
        onAddCharge({
          code: current.data.code,
          description: current.data.name,
          category: current.data.category,
          location: current.data.location,
          unit: current.data.unit,
          unitPrice: current.data.currency === 'USD' ? current.data.priceUsd : current.data.priceVnd,
          costPrice: Math.round((current.data.currency === 'USD' ? current.data.priceUsd : current.data.priceVnd) * 0.8),
          currency: current.data.currency,
          vatRate: current.data.vat,
        });
        onClose();
      } else if (current.type === 'CUSTOMER') {
        onSelectCustomer(current.data);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-slate-950/70 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl spotlight-glass rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-white"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm cảng biển (Cát Lái, LAX, SIN...), phụ phí (THC, D/O...), khách hàng, hoặc lệnh tắt..."
            className="w-full bg-transparent text-white text-sm sm:text-base placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono font-medium text-cyan-300 bg-slate-800/80 border border-slate-700 rounded shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Tab Filters Header */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto text-xs text-slate-300">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'ALL' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab('PORTS')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PORTS' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            Cảng & Sân bay
            {filteredResults.ports.length > 0 && (
              <span className="text-[10px] opacity-80">({filteredResults.ports.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('CHARGES')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CHARGES' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Phụ phí
            {filteredResults.charges.length > 0 && (
              <span className="text-[10px] opacity-80">({filteredResults.charges.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CUSTOMERS' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Khách hàng
            {filteredResults.customers.length > 0 && (
              <span className="text-[10px] opacity-80">({filteredResults.customers.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ACTIONS' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Command className="w-3.5 h-3.5" />
            Lệnh tắt
            {filteredResults.actions.length > 0 && (
              <span className="text-[10px] opacity-80">({filteredResults.actions.length})</span>
            )}
          </button>
        </div>

        {/* Results List View */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[55vh]">
          {flattenedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <p className="font-medium text-slate-700">Không tìm thấy kết quả nào phù hợp với &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">Thử tìm mã cảng (VNSGN, USLAX), tên phụ phí (THC, D/O), hoặc tên công ty.</p>
            </div>
          ) : (
            <>
              {/* 1. System Actions Group */}
              {filteredResults.actions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Command className="w-3.5 h-3.5 text-indigo-500" />
                    Lệnh Thao Tác Nhanh
                  </div>
                  {filteredResults.actions.map(action => {
                    const itemIndex = flattenedItems.findIndex(i => i.type === 'ACTION' && (i.data as PaletteActionItem).id === action.id);
                    const isSelected = itemIndex === selectedIndex;
                    const ActionIcon = action.icon;
                    return (
                      <div
                        key={action.id}
                        onClick={action.run}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-950/80 border border-cyan-500/50 text-white' : 'hover:bg-slate-800/50 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            <ActionIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate text-white">{action.title}</p>
                            <p className="text-xs text-slate-400 truncate">{action.subtitle}</p>
                          </div>
                        </div>
                        {action.shortcut && (
                          <div className="flex items-center gap-1 shrink-0 ml-3">
                            <kbd className="px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-300 bg-slate-800 border border-slate-700 rounded">
                              {action.shortcut}
                            </kbd>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Ports Group */}
              {filteredResults.ports.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-blue-500" />
                      Cảng Biển & Sân Bay Quốc Tế
                    </span>
                    <span className="text-[10px] lowercase text-slate-400">Chọn POL (Đi) hoặc POD (Đến)</span>
                  </div>
                  {filteredResults.ports.map(port => {
                    const itemIndex = flattenedItems.findIndex(i => i.type === 'PORT' && (i.data as PortItem).code === port.code);
                    const isSelected = itemIndex === selectedIndex;
                    const isAir = port.type === 'AIR';
                    const PortIcon = isAir ? Plane : Ship;
                    const formattedPortValue = `${port.name} (${port.code})`;

                    return (
                      <div
                        key={port.code}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-slate-800/90 border border-cyan-500/50 text-white' : 'hover:bg-slate-800/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-md shrink-0 ${
                            isAir ? 'bg-amber-900/40 text-amber-300' : 'bg-cyan-900/40 text-cyan-300'
                          }`}>
                            <PortIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                                {port.code}
                              </span>
                              <p className="text-sm font-semibold text-white truncate">
                                {port.name}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {port.vietnameseName ? `${port.vietnameseName} · ` : ''}{port.country}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons: Set as POL / Set as POD */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPol(formattedPortValue);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                            title="Đặt làm Cảng Bốc Hàng (POL)"
                          >
                            POL (Đi)
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPod(formattedPortValue);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                            title="Đặt làm Cảng Dỡ Hàng (POD)"
                          >
                            POD (Đến)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. Surcharges & Local Charges Group */}
              {filteredResults.charges.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-500" />
                      Phụ Phí & Local Charges Chuẩn
                    </span>
                    <span className="text-[10px] lowercase text-slate-400">1-Click thêm vào bảng báo giá</span>
                  </div>
                  {filteredResults.charges.map(charge => {
                    const itemIndex = flattenedItems.findIndex(i => i.type === 'CHARGE' && (i.data as typeof chargesCatalog[0]).code === charge.code);
                    const isSelected = itemIndex === selectedIndex;
                    const priceFormatted = charge.currency === 'USD' ? formatUSD(charge.priceUsd) : formatVND(charge.priceVnd);

                    return (
                      <div
                        key={charge.code}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-slate-800/90 border border-emerald-500/50 text-white' : 'hover:bg-slate-800/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-emerald-900/40 text-emerald-300 shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-1.5 py-0.2 bg-slate-800 text-emerald-300 rounded border border-slate-700">
                                {charge.code}
                              </span>
                              <p className="text-sm font-semibold text-white truncate">
                                {charge.name}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {charge.location} · {charge.unit} · VAT {charge.vat}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {priceFormatted}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddCharge({
                                code: charge.code,
                                description: charge.name,
                                category: charge.category,
                                location: charge.location,
                                unit: charge.unit,
                                unitPrice: charge.currency === 'USD' ? charge.priceUsd : charge.priceVnd,
                                costPrice: Math.round((charge.currency === 'USD' ? charge.priceUsd : charge.priceVnd) * 0.8),
                                currency: charge.currency,
                                vatRate: charge.vat,
                              });
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Thêm
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Customers Group */}
              {filteredResults.customers.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-violet-500" />
                      Khách Hàng Thân Thiết (CRM)
                    </span>
                    <span className="text-[10px] lowercase text-slate-400">Gán nhanh vào báo giá</span>
                  </div>
                  {filteredResults.customers.map(cust => {
                    const itemIndex = flattenedItems.findIndex(i => i.type === 'CUSTOMER' && (i.data as CustomerRecord).id === cust.id);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div
                        key={cust.id}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-slate-800/90 border border-purple-500/50 text-white' : 'hover:bg-slate-800/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-purple-900/40 text-purple-300 shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {cust.companyName || cust.customerName}
                            </p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {cust.taxId ? `MST: ${cust.taxId} · ` : ''}
                              {cust.phone || cust.email || cust.contactPerson || 'Khách hàng hệ thống'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(cust);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer shrink-0 ml-2 shadow-2xs"
                        >
                          Chọn KH
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hotkey Guide */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-medium text-cyan-300 shadow-2xs">↑↓</kbd>
              <span>Điều hướng</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-medium text-cyan-300 shadow-2xs">↵</kbd>
              <span>Chọn</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-medium text-cyan-300 shadow-2xs">ESC</kbd>
              <span>Đóng</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenShortcutsHelp();
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Toàn bộ phím tắt (?)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
