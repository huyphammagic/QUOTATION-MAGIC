import React, { useState } from 'react';
import { 
  ShipmentRecord, 
  ShipmentStatus, 
  ShipmentMilestone, 
  ShipmentContainer 
} from '../../types/shipment';
import { 
  updateShipment, 
  updateShipmentMilestone, 
  addContainerToShipment, 
  updateShipmentContainer, 
  removeShipmentContainer,
  linkDocumentToShipment
} from '../../services/shipment/shipmentService';
import { isValidStatusTransition, SHIPMENT_STATUS_TRANSITIONS } from '../../services/shipment/milestoneDefaults';
import { ShipmentMilestoneTimeline } from './ShipmentMilestoneTimeline';
import { ShipmentContainerManager } from './ShipmentContainerManager';
import { ShipmentEventsTimelineTab } from './events/ShipmentEventsTimelineTab';
import { ShipmentDeadlinesTab } from './ShipmentDeadlinesTab';
import { 
  X, 
  Package, 
  Ship, 
  Plane, 
  Truck, 
  FileCheck2, 
  Calendar, 
  MapPin, 
  Anchor, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  History, 
  Edit3, 
  Check, 
  Plus, 
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ClipboardList,
  Activity
} from 'lucide-react';

interface ShipmentDetailModalProps {
  shipment: ShipmentRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: ShipmentRecord) => void;
  onOpenQuotation?: (quoteId: string) => void;
  currentUser?: { uid: string; displayName?: string; email?: string };
  activeLanguage?: 'vi' | 'en';
}

type TabType = 'overview' | 'timeline' | 'containers' | 'milestones' | 'deadlines' | 'documents' | 'financial' | 'audit';

const STATUS_CONFIG: Record<ShipmentStatus, { vi: string; en: string; color: string }> = {
  DRAFT: { vi: 'Bản nháp', en: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  BOOKING_REQUESTED: { vi: 'Chờ Booking', en: 'Booking Requested', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  BOOKED: { vi: 'Đã có Booking', en: 'Booked', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  IN_TRANSIT: { vi: 'Đang vận chuyển', en: 'In Transit', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  ARRIVED: { vi: 'Đã đến cảng đích', en: 'Arrived', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' },
  CUSTOMS_CLEARANCE: { vi: 'Thông quan hải quan', en: 'Customs Clearance', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  DELIVERING: { vi: 'Đang giao hàng', en: 'Delivering', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' },
  DELIVERED: { vi: 'Đã giao tới kho', en: 'Delivered', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  COMPLETED: { vi: 'Hoàn tất hồ sơ', en: 'Completed', color: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200' },
  CANCELLED: { vi: 'Đã hủy', en: 'Cancelled', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
};

export const ShipmentDetailModal: React.FC<ShipmentDetailModalProps> = ({
  shipment,
  isOpen,
  onClose,
  onUpdated,
  onOpenQuotation,
  currentUser = { uid: 'user_default', displayName: 'Logistics Operator' },
  activeLanguage = 'vi',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentShipment, setCurrentShipment] = useState<ShipmentRecord>(shipment);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // General edit mode
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editEtdActual, setEditEtdActual] = useState(shipment.etdActual || '');
  const [editEtaActual, setEditEtaActual] = useState(shipment.etaActual || '');
  const [editVessel, setEditVessel] = useState(shipment.vesselFlightName || '');
  const [editVoyage, setEditVoyage] = useState(shipment.voyageFlightNumber || '');
  const [editBlAwb, setEditBlAwb] = useState(shipment.blAwbNumber || '');
  const [editBooking, setEditBooking] = useState(shipment.bookingNumber || '');
  const [editNotes, setEditNotes] = useState(shipment.notes || '');

  const statusMeta = STATUS_CONFIG[currentShipment.status] || STATUS_CONFIG.DRAFT;
  const allowedNextStatuses = SHIPMENT_STATUS_TRANSITIONS[currentShipment.status] || [];

  const handleStatusChange = async (nextStatus: ShipmentStatus) => {
    if (!isValidStatusTransition(currentShipment.status, nextStatus)) {
      setStatusError(
        activeLanguage === 'vi' 
          ? `Không thể chuyển trực tiếp từ ${statusMeta.vi} sang ${STATUS_CONFIG[nextStatus]?.vi || nextStatus}`
          : `Illegal transition from ${currentShipment.status} to ${nextStatus}`
      );
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setStatusError(null);
      const res = await updateShipment(currentShipment.id, { status: nextStatus }, currentUser);
      setCurrentShipment(res);
      onUpdated(res);
    } catch (err: any) {
      console.error('Failed to change status:', err);
      setStatusError(err.message || 'Status transition error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleMilestoneUpdate = async (milestoneId: string, updates: Partial<ShipmentMilestone>) => {
    const res = await updateShipmentMilestone(currentShipment.id, milestoneId, updates, currentUser);
    setCurrentShipment(res);
    onUpdated(res);
  };

  const handleAddContainer = async (container: Omit<ShipmentContainer, 'id'>) => {
    const res = await addContainerToShipment(currentShipment.id, container, currentUser);
    setCurrentShipment(res);
    onUpdated(res);
  };

  const handleUpdateContainer = async (containerId: string, updates: Partial<ShipmentContainer>) => {
    const res = await updateShipmentContainer(currentShipment.id, containerId, updates, currentUser);
    setCurrentShipment(res);
    onUpdated(res);
  };

  const handleRemoveContainer = async (containerId: string) => {
    const res = await removeShipmentContainer(currentShipment.id, containerId, currentUser);
    setCurrentShipment(res);
    onUpdated(res);
  };

  const handleSaveOverview = async () => {
    try {
      const res = await updateShipment(currentShipment.id, {
        etdActual: editEtdActual || undefined,
        etaActual: editEtaActual || undefined,
        vesselFlightName: editVessel || undefined,
        voyageFlightNumber: editVoyage || undefined,
        blAwbNumber: editBlAwb || undefined,
        bookingNumber: editBooking || undefined,
        notes: editNotes || undefined,
      }, currentUser);
      setCurrentShipment(res);
      onUpdated(res);
      setIsEditingOverview(false);
    } catch (err) {
      console.error('Failed to update overview:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {currentShipment.shipmentNumber}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusMeta.color}`}>
                  {activeLanguage === 'vi' ? statusMeta.vi : statusMeta.en}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentShipment.serviceMode}
                </span>
                {currentShipment.operationalFreshness === 'STALE' && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 animate-pulse">
                    {activeLanguage === 'vi' ? 'Chưa cập nhật > 3 ngày' : 'Stale (>3d)'}
                  </span>
                )}
                {currentShipment.operationalFreshness === 'FRESH' && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {activeLanguage === 'vi' ? 'Dữ liệu mới' : 'Fresh'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentShipment.customerName} • {currentShipment.origin} → {currentShipment.destination}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Status transition dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                {activeLanguage === 'vi' ? 'Trạng thái:' : 'Status:'}
              </label>
              <select
                disabled={isUpdatingStatus || allowedNextStatuses.length === 0}
                value={currentShipment.status}
                onChange={(e) => handleStatusChange(e.target.value as ShipmentStatus)}
                className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                <option value={currentShipment.status}>
                  {activeLanguage === 'vi' ? statusMeta.vi : statusMeta.en}
                </option>
                {allowedNextStatuses.map(s => (
                  <option key={s} value={s}>
                    → {activeLanguage === 'vi' ? STATUS_CONFIG[s as ShipmentStatus]?.vi : STATUS_CONFIG[s as ShipmentStatus]?.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {statusError}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 bg-white dark:bg-slate-900">
          {[
            { id: 'overview', labelVi: 'Tổng Quan & Lịch Trình', labelEn: 'Overview & Route', icon: Anchor },
            { id: 'timeline', labelVi: 'Sự Kiện & Tiến Độ', labelEn: 'Events & Timeline', icon: Activity },
            { id: 'containers', labelVi: `Containers (${currentShipment.containers?.length || 0})`, labelEn: `Containers (${currentShipment.containers?.length || 0})`, icon: Layers },
            { id: 'milestones', labelVi: 'Mốc Dịch Vụ', labelEn: 'Milestones', icon: CheckCircle2 },
            { id: 'deadlines', labelVi: 'Hạn Chót Cut-off', labelEn: 'Deadlines & Cutoffs', icon: Clock },
            { id: 'documents', labelVi: `Chứng Từ (${currentShipment.linkedDocumentIds?.length || 0})`, labelEn: `Documents (${currentShipment.linkedDocumentIds?.length || 0})`, icon: FileText },
            { id: 'financial', labelVi: 'Tài Chính Tham Chiếu', labelEn: 'Quotation Snapshot', icon: DollarSign },
            { id: 'audit', labelVi: 'Lịch Sử / Audit', labelEn: 'Audit Trail', icon: History },
          ].map(t => {
            const isSel = activeTab === t.id;
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSel 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{activeLanguage === 'vi' ? t.labelVi : t.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & SCHEDULE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Linked Quote Banner */}
              {currentShipment.quotationNumber && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                        {activeLanguage === 'vi' ? 'Lô hàng tạo từ Báo giá:' : 'Linked Quotation:'} {currentShipment.quotationNumber}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {activeLanguage === 'vi' ? 'Dữ liệu báo giá gốc được bảo toàn snapshot bất biến.' : 'Original quotation snapshot preserved.'}
                      </p>
                    </div>
                  </div>
                  {onOpenQuotation && currentShipment.quotationId && (
                    <button
                      type="button"
                      onClick={() => onOpenQuotation(currentShipment.quotationId!)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs hover:bg-blue-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {activeLanguage === 'vi' ? 'Xem Báo Giá' : 'View Quote'}
                    </button>
                  )}
                </div>
              )}

              {/* Route & Schedule Box */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-blue-600" />
                    {activeLanguage === 'vi' ? 'Thông Tin Tuyến Đường & Lịch Trình' : 'Route & Operational Schedule'}
                  </h3>
                  {!isEditingOverview ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingOverview(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {activeLanguage === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingOverview(false)}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        {activeLanguage === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveOverview}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {activeLanguage === 'vi' ? 'Lưu' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Cảng/Nơi Đi (Origin)' : 'Origin / POL'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentShipment.origin}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Cảng/Nơi Đến (Destination)' : 'Destination / POD'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentShipment.destination}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Điều Kiện Incoterm' : 'Incoterm'}
                    </span>
                    <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {currentShipment.incoterm || 'FOB'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Hãng Tàu / Hãng Bay' : 'Carrier'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentShipment.carrierName || '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Tên Tàu / Chuyến Bay' : 'Vessel / Flight'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="text"
                        value={editVessel}
                        onChange={(e) => setEditVessel(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentShipment.vesselFlightName || '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Số Chuyến (Voyage No)' : 'Voyage No'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="text"
                        value={editVoyage}
                        onChange={(e) => setEditVoyage(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                        {currentShipment.voyageFlightNumber || '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Số Booking' : 'Booking No'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="text"
                        value={editBooking}
                        onChange={(e) => setEditBooking(e.target.value)}
                        className="w-full text-xs uppercase font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                        {currentShipment.bookingNumber || '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Số Vận Đơn (B/L / AWB)' : 'B/L or AWB No'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="text"
                        value={editBlAwb}
                        onChange={(e) => setEditBlAwb(e.target.value)}
                        className="w-full text-xs uppercase font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold font-mono text-blue-600 dark:text-blue-400">
                        {currentShipment.blAwbNumber || '—'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'ETD Kế Hoạch' : 'Planned ETD'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {currentShipment.etdPlanned || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'ETD Thực Tế (ATD)' : 'Actual ETD (ATD)'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="date"
                        value={editEtdActual}
                        onChange={(e) => setEditEtdActual(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {currentShipment.etdActual || '—'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'ETA Kế Hoạch' : 'Planned ETA'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {currentShipment.etaPlanned || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'ETA Thực Tế (ATA)' : 'Actual ETA (ATA)'}
                    </span>
                    {isEditingOverview ? (
                      <input
                        type="date"
                        value={editEtaActual}
                        onChange={(e) => setEditEtaActual(e.target.value)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {currentShipment.etaActual || '—'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    {activeLanguage === 'vi' ? 'Ghi chú điều hành:' : 'Operational Notes:'}
                  </span>
                  {isEditingOverview ? (
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                      {currentShipment.notes || (activeLanguage === 'vi' ? 'Không có ghi chú.' : 'No operational notes.')}
                    </p>
                  )}
                </div>
              </div>

              {/* Cargo Details */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  {activeLanguage === 'vi' ? 'Thông Tin Hàng Hóa & Đóng Gói' : 'Cargo & Commodity Specifications'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Tên Hàng Hóa' : 'Commodity'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentShipment.commodity || 'General Cargo'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Số Lượng Kiện / Cont' : 'Quantity / Pkgs'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentShipment.packageQuantity || currentShipment.containers?.length || 1} {currentShipment.packageType || 'Packages'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Tổng Trọng Lượng' : 'Gross Weight'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentShipment.grossWeightKg ? `${currentShipment.grossWeightKg.toLocaleString()} kg` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                      {activeLanguage === 'vi' ? 'Thể Tích' : 'Volume'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentShipment.volumeCbm ? `${currentShipment.volumeCbm} CBM` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TIMELINE & EVENTS */}
          {activeTab === 'timeline' && (
            <ShipmentEventsTimelineTab
              shipment={currentShipment}
              currentUser={currentUser || { uid: 'user', displayName: 'Logistics Operator' }}
              onShipmentUpdated={(updated) => {
                setCurrentShipment(updated);
                onUpdated(updated);
              }}
              language={activeLanguage}
            />
          )}

          {/* TAB 2: CONTAINERS */}
          {activeTab === 'containers' && (
            <ShipmentContainerManager
              containers={currentShipment.containers || []}
              onAddContainer={handleAddContainer}
              onUpdateContainer={handleUpdateContainer}
              onRemoveContainer={handleRemoveContainer}
              activeLanguage={activeLanguage}
            />
          )}

          {/* TAB 3: MILESTONES */}
          {activeTab === 'milestones' && (
            <ShipmentMilestoneTimeline
              milestones={currentShipment.milestones || []}
              onUpdateMilestone={handleMilestoneUpdate}
              activeLanguage={activeLanguage}
            />
          )}

          {/* TAB: DEADLINES */}
          {activeTab === 'deadlines' && (
            <ShipmentDeadlinesTab
              shipment={currentShipment}
              currentUser={currentUser}
              activeLanguage={activeLanguage}
              onShipmentUpdated={(updated) => {
                setCurrentShipment(updated);
                onUpdated(updated);
              }}
            />
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {activeLanguage === 'vi' ? 'Chứng Từ Vận Hành & Hồ Sơ Lô Hàng' : 'Operational Documents & Files'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeLanguage === 'vi' ? 'Liên kết trực tiếp với Document Control Center' : 'Integrated with Document Control Center'}
                </p>
              </div>

              {currentShipment.linkedDocumentIds && currentShipment.linkedDocumentIds.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentShipment.linkedDocumentIds.map((docId, index) => (
                    <div 
                      key={docId}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            Doc #{index + 1}: {docId}
                          </p>
                          <span className="text-2xs text-slate-400">Verified & Hash Protected</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Linked
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {activeLanguage === 'vi' 
                      ? 'Chưa có chứng từ nào được liên kết riêng cho lô hàng này. Hãy tạo chứng từ từ Document Control Center hoặc đính kèm B/L, Packing List.'
                      : 'No linked documents for this shipment yet.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FINANCIAL REFERENCE (PROTECTED SNAPSHOT) */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {activeLanguage === 'vi' ? 'Dữ liệu Tài chính Tham chiếu (Bảo toàn Bất biến)' : 'Immutable Financial Snapshot'}
                  </h4>
                  <p className="text-2xs text-amber-700 dark:text-amber-300">
                    {activeLanguage === 'vi' 
                      ? 'Doanh thu và chi phí được snapshot cố định từ Báo giá lúc tạo lô hàng. Mọi thay đổi báo giá sau này không làm sai lệch số liệu của lô hàng.' 
                      : 'Revenue and cost figures are immutably captured at shipment creation time.'
                    }
                  </p>
                </div>
              </div>

              {currentShipment.quotationSnapshot ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 block mb-1">
                        {activeLanguage === 'vi' ? 'Tổng Doanh Thu (Selling)' : 'Total Selling'}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                        ${(currentShipment.quotationSnapshot.totalSellingUsd || 0).toLocaleString()} USD
                      </span>
                      {currentShipment.quotationSnapshot.totalSellingVnd ? (
                        <span className="block text-2xs text-slate-500 font-mono mt-0.5">
                          {currentShipment.quotationSnapshot.totalSellingVnd.toLocaleString()} VND
                        </span>
                      ) : null}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 block mb-1">
                        {activeLanguage === 'vi' ? 'Tổng Chi Phí (Cost)' : 'Total Cost'}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                        ${(currentShipment.quotationSnapshot.totalCostUsd || 0).toLocaleString()} USD
                      </span>
                      {currentShipment.quotationSnapshot.totalCostVnd ? (
                        <span className="block text-2xs text-slate-500 font-mono mt-0.5">
                          {currentShipment.quotationSnapshot.totalCostVnd.toLocaleString()} VND
                        </span>
                      ) : null}
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-700 dark:text-emerald-400 block mb-1 font-medium">
                        {activeLanguage === 'vi' ? 'Lợi Nhuận Gộp (Margin)' : 'Gross Margin'}
                      </span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${(currentShipment.quotationSnapshot.profitUsd || 0).toLocaleString()} USD
                      </span>
                      <span className="block text-2xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Tỷ giá: {currentShipment.quotationSnapshot.exchangeRate?.toLocaleString()} VND/USD
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span>
                      {activeLanguage === 'vi' ? 'Số dòng cước & phụ phí:' : 'Line items count:'} {currentShipment.quotationSnapshot.lineItemsCount}
                    </span>
                    <span>
                      {activeLanguage === 'vi' ? 'Thời điểm chốt snapshot:' : 'Snapshot timestamp:'} {new Date(currentShipment.quotationSnapshot.snapshotAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  {activeLanguage === 'vi' 
                    ? 'Lô hàng này được tạo thủ công trực tiếp, không xuất phát từ báo giá nên không có snapshot tài chính tham chiếu.' 
                    : 'This shipment was created manually without a quotation snapshot.'
                  }
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>{activeLanguage === 'vi' ? 'Khởi tạo bởi:' : 'Created by:'} {currentShipment.createdBy}</span>
                  <span>{new Date(currentShipment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>{activeLanguage === 'vi' ? 'Cập nhật lần cuối bởi:' : 'Last updated by:'} {currentShipment.updatedBy}</span>
                  <span>{new Date(currentShipment.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>{activeLanguage === 'vi' ? 'Phiên bản (Version):' : 'Revision version:'} v{currentShipment.version || 1}</span>
                  <span>Company ID: {currentShipment.companyId}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
