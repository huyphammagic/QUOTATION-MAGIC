import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShipmentRecord, 
  ShipmentStatus, 
  ShipmentServiceMode 
} from '../../types/shipment';
import { CustomerInfo, QuoteData } from '../../types/logistics';
import { 
  getShipments, 
  getShipmentSummaryStats, 
  updateShipment 
} from '../../services/shipment/shipmentService';
import { CreateShipmentModal } from './CreateShipmentModal';
import { ShipmentDetailModal } from './ShipmentDetailModal';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Ship, 
  Plane, 
  Truck, 
  FileCheck2, 
  Layers, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Anchor, 
  ChevronRight, 
  ExternalLink,
  Kanban,
  ListFilter,
  ArrowUpDown,
  Building2
} from 'lucide-react';

interface ShipmentOperationalWorkspaceProps {
  companyId: string;
  customers?: CustomerInfo[];
  allQuotes?: QuoteData[];
  onOpenQuotation?: (quoteId: string) => void;
  currentUser?: { uid: string; displayName?: string; email?: string };
  activeLanguage?: 'vi' | 'en';
}

const STATUS_MAP: Record<ShipmentStatus, { vi: string; en: string; color: string }> = {
  DRAFT: { vi: 'Bản nháp', en: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  BOOKING_REQUESTED: { vi: 'Chờ Booking', en: 'Booking Req', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  BOOKED: { vi: 'Đã có Booking', en: 'Booked', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  IN_TRANSIT: { vi: 'Đang vận chuyển', en: 'In Transit', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  ARRIVED: { vi: 'Đã đến cảng', en: 'Arrived', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' },
  CUSTOMS_CLEARANCE: { vi: 'Hải quan', en: 'Customs', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  DELIVERING: { vi: 'Đang giao kho', en: 'Delivering', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' },
  DELIVERED: { vi: 'Đã giao hàng', en: 'Delivered', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  COMPLETED: { vi: 'Hoàn tất hồ sơ', en: 'Completed', color: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200' },
  CANCELLED: { vi: 'Đã hủy', en: 'Cancelled', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
};

export const ShipmentOperationalWorkspace: React.FC<ShipmentOperationalWorkspaceProps> = ({
  companyId,
  customers = [],
  allQuotes = [],
  onOpenQuotation,
  currentUser = { uid: 'user_default', displayName: 'Logistics Operator' },
  activeLanguage = 'vi',
}) => {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [selectedMode, setSelectedMode] = useState<ShipmentServiceMode | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalActive: 0,
    inTransit: 0,
    arrivingSoon: 0,
    customsPending: 0,
    delivered: 0,
  });

  const fetchShipmentData = async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        getShipments(companyId, {
          status: selectedStatus,
          serviceMode: selectedMode,
          searchQuery,
          pageLimit: 50,
        }),
        getShipmentSummaryStats(companyId),
      ]);
      setShipments(res.shipments);
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentData();
  }, [companyId, selectedStatus, selectedMode]);

  const handleCreated = (newShipment: ShipmentRecord) => {
    setShipments(prev => [newShipment, ...prev]);
    setSelectedShipment(newShipment);
    fetchShipmentData();
  };

  const handleUpdated = (updated: ShipmentRecord) => {
    setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelectedShipment(updated);
  };

  // Filtered in memory for instant responsiveness
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedMode !== 'ALL' && s.serviceMode !== selectedMode) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = s.shipmentNumber.toLowerCase().includes(q);
        const matchQuote = s.quotationNumber?.toLowerCase().includes(q);
        const matchCustomer = s.customerName?.toLowerCase().includes(q);
        const matchBl = s.blAwbNumber?.toLowerCase().includes(q);
        const matchBooking = s.bookingNumber?.toLowerCase().includes(q);
        const matchCont = s.containers?.some(c => c.containerNumber.toLowerCase().includes(q));
        if (!matchNumber && !matchQuote && !matchCustomer && !matchBl && !matchBooking && !matchCont) {
          return false;
        }
      }
      return true;
    });
  }, [shipments, selectedStatus, selectedMode, searchQuery]);

  const getModeIcon = (mode: ShipmentServiceMode) => {
    switch (mode) {
      case 'AIR': return <Plane className="w-4 h-4 text-sky-500" />;
      case 'TRUCKING': return <Truck className="w-4 h-4 text-amber-500" />;
      case 'CUSTOMS': return <FileCheck2 className="w-4 h-4 text-emerald-500" />;
      case 'SEA_LCL': return <Layers className="w-4 h-4 text-indigo-500" />;
      default: return <Ship className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {activeLanguage === 'vi' ? 'Không Gian Điều Hành Lô Hàng (Shipments)' : 'Shipment Operations Workspace'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeLanguage === 'vi' 
                  ? 'Theo dõi vòng đời vận hành từ Báo giá → Booking → Vận tải → Hải quan → Giao hàng'
                  : 'Manage operational lifecycle from Quote → Booking → Transport → Customs → POD'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchShipmentData}
            title={activeLanguage === 'vi' ? 'Tải lại danh sách' : 'Refresh'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{activeLanguage === 'vi' ? 'Tạo Lô Hàng Mới' : 'New Shipment'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            {activeLanguage === 'vi' ? 'Đang Xử Lý' : 'Active Shipments'}
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {stats.totalActive}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 block mb-1">
            {activeLanguage === 'vi' ? 'Đang Vận Chuyển' : 'In Transit'}
          </span>
          <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {stats.inTransit}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 block mb-1">
            {activeLanguage === 'vi' ? 'Cập Cảng Đích' : 'Arrived at POD'}
          </span>
          <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
            {stats.arrivingSoon}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400 block mb-1">
            {activeLanguage === 'vi' ? 'Hải Quan' : 'Customs'}
          </span>
          <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {stats.customsPending}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block mb-1">
            {activeLanguage === 'vi' ? 'Đã Giao / Xong' : 'Delivered & POD'}
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.delivered}
          </span>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeLanguage === 'vi' ? 'Tìm mã lô hàng, khách hàng, B/L, cont, booking...' : 'Search shipment, client, B/L, container...'}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Mode filter */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as ShipmentServiceMode | 'ALL')}
            className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{activeLanguage === 'vi' ? 'Tất cả phương thức' : 'All Modes'}</option>
            <option value="SEA_FCL">Đường Biển FCL</option>
            <option value="SEA_LCL">Đường Biển LCL</option>
            <option value="AIR">Hàng Không Air</option>
            <option value="TRUCKING">Đường Bộ (Trucking)</option>
            <option value="CUSTOMS">Thủ Tục Hải Quan</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ShipmentStatus | 'ALL')}
            className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{activeLanguage === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
            {Object.entries(STATUS_MAP).map(([k, val]) => (
              <option key={k} value={k}>
                {activeLanguage === 'vi' ? val.vi : val.en}
              </option>
            ))}
          </select>
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-1 self-end lg:self-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeLanguage === 'vi' ? 'Danh Sách' : 'List'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
        </div>
      </div>

      {/* Main View: List or Kanban */}
      {filteredShipments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-3">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {activeLanguage === 'vi' ? 'Không tìm thấy lô hàng nào' : 'No shipments found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeLanguage === 'vi' 
              ? 'Tạo lô hàng mới trực tiếp hoặc chuyển đổi nhanh từ báo giá đã được duyệt.'
              : 'Create a new shipment or convert directly from an approved quotation.'
            }
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{activeLanguage === 'vi' ? 'Khởi tạo lô hàng ngay' : 'Create Shipment Now'}</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Mã Lô Hàng' : 'Shipment No.'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Khách Hàng' : 'Customer'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Dịch Vụ' : 'Mode'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Tuyến Vận Chuyển' : 'Route'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Hãng Vận Tải' : 'Carrier / Vessel'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Lịch Trình (ETD/ETA)' : 'Schedule'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Containers / Kiện' : 'Cargo / Cont'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                <th className="px-4 py-3 text-right">{activeLanguage === 'vi' ? 'Chi Tiết' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredShipments.map((s) => {
                const statusMeta = STATUS_MAP[s.status] || STATUS_MAP.DRAFT;
                return (
                  <tr 
                    key={s.id} 
                    onClick={() => setSelectedShipment(s)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {s.shipmentNumber}
                      </div>
                      {s.quotationNumber && (
                        <span className="text-2xs text-slate-400 font-mono">
                          Ref: {s.quotationNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[180px] truncate">
                      {s.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getModeIcon(s.serviceMode)}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {s.serviceMode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate text-slate-800 dark:text-slate-200 font-medium">
                        {s.origin} → {s.destination}
                      </div>
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {s.incoterm || 'FOB'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {s.carrierName || '—'}
                      </div>
                      {s.vesselFlightName && (
                        <div className="text-2xs text-slate-500">
                          {s.vesselFlightName} {s.voyageFlightNumber ? `(${s.voyageFlightNumber})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-2xs text-slate-500">
                        ETD: <span className="font-medium text-slate-700 dark:text-slate-300">{s.etdActual || s.etdPlanned || '—'}</span>
                      </div>
                      <div className="text-2xs text-slate-500">
                        ETA: <span className="font-medium text-slate-700 dark:text-slate-300">{s.etaActual || s.etaPlanned || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.containers && s.containers.length > 0 ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {s.containers.length} Conts
                        </span>
                      ) : (
                        <span>{s.packageQuantity || 1} {s.packageType || 'Pkgs'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-semibold ${statusMeta.color}`}>
                        {activeLanguage === 'vi' ? statusMeta.vi : statusMeta.en}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShipment(s);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors"
                      >
                        {activeLanguage === 'vi' ? 'Xem' : 'View'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {[
            { 
              titleVi: 'Khởi Tạo & Chờ Booking', 
              titleEn: 'Booking Stage', 
              statuses: ['DRAFT', 'BOOKING_REQUESTED', 'BOOKED'], 
              color: 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20' 
            },
            { 
              titleVi: 'Đang Vận Chuyển', 
              titleEn: 'In Transit', 
              statuses: ['IN_TRANSIT'], 
              color: 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20' 
            },
            { 
              titleVi: 'Đến Nơi & Hải Quan', 
              titleEn: 'Arrived & Customs', 
              statuses: ['ARRIVED', 'CUSTOMS_CLEARANCE'], 
              color: 'border-purple-400 bg-purple-50/30 dark:bg-purple-950/20' 
            },
            { 
              titleVi: 'Giao Hàng & Hoàn Tất', 
              titleEn: 'Delivery & Closed', 
              statuses: ['DELIVERING', 'DELIVERED', 'COMPLETED'], 
              color: 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20' 
            },
          ].map(col => {
            const items = filteredShipments.filter(s => col.statuses.includes(s.status));
            return (
              <div 
                key={col.titleEn}
                className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activeLanguage === 'vi' ? col.titleVi : col.titleEn}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {items.map(s => {
                    const statusMeta = STATUS_MAP[s.status] || STATUS_MAP.DRAFT;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedShipment(s)}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {s.shipmentNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${statusMeta.color}`}>
                            {activeLanguage === 'vi' ? statusMeta.vi : statusMeta.en}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {s.customerName}
                        </p>

                        <div className="text-2xs text-slate-500 truncate flex items-center gap-1">
                          {getModeIcon(s.serviceMode)}
                          <span>{s.origin} → {s.destination}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-2xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                          <span>{s.containers?.length || 1} {s.serviceMode === 'SEA_FCL' ? 'Cont' : 'Pkg'}</span>
                          <span>ETA: {s.etaActual || s.etaPlanned || '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE SHIPMENT */}
      {showCreateModal && (
        <CreateShipmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          companyId={companyId}
          customers={customers}
          currentUser={currentUser}
          activeLanguage={activeLanguage}
        />
      )}

      {/* MODAL: SHIPMENT DETAIL */}
      {selectedShipment && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          isOpen={!!selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onUpdated={handleUpdated}
          onOpenQuotation={onOpenQuotation}
          currentUser={currentUser}
          activeLanguage={activeLanguage}
        />
      )}
    </div>
  );
};
