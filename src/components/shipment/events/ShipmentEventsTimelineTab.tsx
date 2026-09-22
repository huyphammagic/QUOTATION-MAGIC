/**
 * Phase 43: Shipment Events & Operational Timeline Tab
 * Central command tab inside Shipment Workspace:
 * - Milestone Stepper (Planned vs Estimated vs Confirmed Actual)
 * - ETA & Operational Freshness Indicator
 * - Event Feed & Audit History
 * - Real Event Logging, Correction & Cancellation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShipmentRecord, 
  ShipmentMilestone 
} from '../../../types/shipment';
import { 
  ShipmentEventRecord, 
  LogisticsEventType 
} from '../../../types/shipmentEvent';
import { 
  getShipmentEvents, 
  reconcileShipmentWithEvents 
} from '../../../services/shipment/eventIntelligenceService';
import { checkCarrierLiveStatus } from '../../../services/shipment/externalIntegrationService';
import { getEventDefinition } from '../../../services/shipment/eventDefinitions';
import { RecordShipmentEventModal } from './RecordShipmentEventModal';
import { CorrectShipmentEventModal } from './CorrectShipmentEventModal';
import { 
  Activity, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Ship, 
  Plane, 
  Truck, 
  FileCheck2, 
  ShieldCheck, 
  Search, 
  Filter, 
  Edit3, 
  Ban, 
  RotateCcw, 
  ExternalLink,
  Calendar,
  AlertTriangle,
  Radio,
  Tag,
  Info
} from 'lucide-react';

interface ShipmentEventsTimelineTabProps {
  shipment: ShipmentRecord;
  currentUser: { uid: string; displayName?: string; email?: string };
  onShipmentUpdated: (updated: ShipmentRecord) => void;
  language?: 'vi' | 'en';
}

export const ShipmentEventsTimelineTab: React.FC<ShipmentEventsTimelineTabProps> = ({
  shipment,
  currentUser,
  onShipmentUpdated,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  // Events state
  const [events, setEvents] = useState<ShipmentEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [carrierSyncMessage, setCarrierSyncMessage] = useState<string | null>(null);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedEventForAction, setSelectedEventForAction] = useState<ShipmentEventRecord | null>(null);
  const [actionModalMode, setActionModalMode] = useState<'CORRECT' | 'CANCEL'>('CORRECT');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Load events
  const loadEvents = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const list = await getShipmentEvents(shipment.companyId, shipment.id, {
        status: statusFilter,
        pageLimit: 100,
      });
      setEvents(list);
    } catch (err) {
      console.error('[ShipmentEventsTimelineTab] Error loading events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [shipment.id, statusFilter]);

  // Reconcile and reload
  const handleEventCreatedOrUpdated = async () => {
    try {
      setIsSyncing(true);
      const updated = await reconcileShipmentWithEvents(shipment.id, currentUser);
      onShipmentUpdated(updated);
      await loadEvents(true);
    } catch (err) {
      console.error('Error reconciling:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // On-demand carrier tracking check
  const handleCarrierCheck = async () => {
    try {
      setIsSyncing(true);
      setCarrierSyncMessage(null);
      const res = await checkCarrierLiveStatus({
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        companyId: shipment.companyId,
        trackingNumber: shipment.blAwbNumber || shipment.bookingNumber || (shipment.containers?.[0]?.containerNumber) || '',
        trackingType: shipment.blAwbNumber ? 'BL' : 'BOOKING',
      });
      setCarrierSyncMessage(isVi ? res.messageVi : res.messageEn);
    } catch (err: any) {
      setCarrierSyncMessage(err.message || 'Carrier check failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e => 
      e.titleVi.toLowerCase().includes(q) ||
      e.titleEn.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.referenceId && e.referenceId.toLowerCase().includes(q)) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  // Milestones sorted by sequence
  const sortedMilestones = useMemo(() => {
    return [...(shipment.milestones || [])].sort((a, b) => a.sequence - b.sequence);
  }, [shipment.milestones]);

  const completedMilestonesCount = sortedMilestones.filter(m => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* 1. OPERATIONAL INTELLIGENCE & FRESHNESS HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Activity className="w-3.5 h-3.5" />
              Event Intelligence Engine
            </span>
            {shipment.operationalFreshness === 'STALE' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isVi ? 'Chưa có cập nhật > 3 ngày' : 'No update in 3+ days'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isVi ? 'Dữ liệu hoạt động bình thường' : 'Operational Status Fresh'}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-100">
            {isVi ? 'Sự kiện gần nhất:' : 'Latest Event:'}{' '}
            <span className="text-blue-400 font-semibold">
              {shipment.lastOperationalEventTitle || (isVi ? 'Chưa có sự kiện nào' : 'No recorded events yet')}
            </span>
          </h3>
          {shipment.lastOperationalEventTime && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {new Date(shipment.lastOperationalEventTime).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleCarrierCheck}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
            title={isVi ? 'Kiểm tra trạng thái trực tiếp' : 'Check Carrier Live Status'}
          >
            <Radio className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isVi ? 'Kiểm tra Hãng tàu' : 'Carrier Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isVi ? 'Ghi Nhận Sự Kiện' : 'Record Event'}</span>
          </button>
        </div>
      </div>

      {carrierSyncMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{carrierSyncMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setCarrierSyncMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. PLANNED / ESTIMATED / ACTUAL MILESTONE JOURNEY */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {isVi ? 'Hành Trình Mốc Vận Chuyển (Planned vs Actual)' : 'Operational Milestones (Planned vs Actual)'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi 
                ? `Hoàn thành ${completedMilestonesCount}/${sortedMilestones.length} mốc nghiệp vụ dựa trên sự kiện thực tế xác nhận.` 
                : `${completedMilestonesCount}/${sortedMilestones.length} milestones completed based on confirmed events.`}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 self-start sm:self-auto bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
            {Math.round((completedMilestonesCount / (sortedMilestones.length || 1)) * 100)}%
          </span>
        </div>

        {/* Milestone Visual Stepper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedMilestones.map((ms) => {
            const isCompleted = ms.status === 'COMPLETED';
            const isDelayed = ms.status === 'DELAYED';
            const isInProgress = ms.status === 'IN_PROGRESS';

            return (
              <div 
                key={ms.id}
                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                  isCompleted 
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : isDelayed
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    : isInProgress
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs">
                      {ms.sequence}
                    </span>
                    <span className="line-clamp-1">{isVi ? ms.titleVi : ms.titleEn}</span>
                  </div>
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {isVi ? 'Thực tế' : 'Actual'}
                    </span>
                  ) : isDelayed ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 shrink-0">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      {isVi ? 'Quá hạn' : 'Overdue'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">
                      {isVi ? 'Chờ sự kiện' : 'Pending'}
                    </span>
                  )}
                </div>

                {/* 3-Tier Date Information */}
                <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  {/* Planned Date */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-sans text-[10px] text-slate-400">
                      {isVi ? 'Kế hoạch (Plan):' : 'Planned:'}
                    </span>
                    <span>{ms.plannedDate ? ms.plannedDate.substring(0, 16).replace('T', ' ') : '--'}</span>
                  </div>

                  {/* Confirmed Actual Date */}
                  <div className="flex items-center justify-between font-semibold">
                    <span className="font-sans text-[10px] text-slate-400">
                      {isVi ? 'Thực tế (Actual):' : 'Actual:'}
                    </span>
                    {ms.actualDate ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {ms.actualDate.substring(0, 16).replace('T', ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-sans font-normal text-[10px]">
                        {isVi ? 'Chưa diễn ra' : 'Pending event'}
                      </span>
                    )}
                  </div>
                </div>

                {ms.location && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{ms.location}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. EVENT AUDIT STREAM & FEED */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              {isVi ? 'Dòng Sự Kiện Tác Nghiệp (Event Feed)' : 'Operational Event Stream'}
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredEvents.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'ALL')}
              className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="ACTIVE">{isVi ? 'Chỉ sự kiện hiệu lực (Active)' : 'Active Events'}</option>
              <option value="ALL">{isVi ? 'Tất cả (Kèm đính chính & đã hủy)' : 'All (Including Corrected/Cancelled)'}</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm sự kiện, địa điểm...' : 'Search events...'}
                className="text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Event List */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs">{isVi ? 'Đang tải danh sách sự kiện...' : 'Loading events...'}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isVi ? 'Chưa ghi nhận sự kiện thực tế nào cho lô hàng này' : 'No operational events recorded for this shipment yet'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              {isVi 
                ? 'Nhấn nút "Ghi Nhận Sự Kiện" phía trên để cập nhật thông tin tàu xuất bến, thông quan, hoặc giao hàng.' 
                : 'Click "Record Event" above to log actual vessel departure, customs release, or delivery.'}
            </p>
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100"
            >
              <Plus className="w-3.5 h-3.5" />
              {isVi ? 'Thêm sự kiện đầu tiên' : 'Add First Event'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const def = getEventDefinition(evt.eventType);
              const isActive = evt.status === 'ACTIVE';
              const isCorrected = evt.status === 'CORRECTED';
              const isCancelled = evt.status === 'CANCELLED';

              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCancelled 
                      ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60' 
                      : isCorrected
                      ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/70 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Icon & Titles */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isCancelled ? 'bg-slate-200 text-slate-600 dark:bg-slate-800' :
                        isCorrected ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        <Activity className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {isVi ? evt.titleVi : evt.titleEn}
                          </h5>

                          {/* Status Pill */}
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                          {isCorrected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {isVi ? 'Đã đính chính' : 'Corrected'}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              {isVi ? 'Đã hủy' : 'Cancelled'}
                            </span>
                          )}

                          {/* Source Pill */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {evt.eventSource}
                          </span>
                        </div>

                        {/* Location & Time Info */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(evt.eventTime).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {evt.location}
                          </span>
                          {evt.referenceId && (
                            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {evt.referenceType}: {evt.referenceId}
                            </span>
                          )}
                        </div>

                        {/* Notes */}
                        {evt.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            {evt.notes}
                          </p>
                        )}

                        {/* Correction / Cancellation Reason Audit */}
                        {evt.correctionReason && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                            {isVi ? 'Lý do đính chính:' : 'Correction reason:'} {evt.correctionReason} (bởi {evt.correctedBy})
                          </p>
                        )}
                        {evt.cancelledReason && (
                          <p className="text-[11px] text-rose-700 dark:text-rose-400 italic">
                            {isVi ? 'Lý do hủy:' : 'Cancellation reason:'} {evt.cancelledReason} (bởi {evt.cancelledBy})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {isActive && (
                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForAction(evt);
                            setActionModalMode('CORRECT');
                            setIsActionModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>{isVi ? 'Đính chính' : 'Correct'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForAction(evt);
                            setActionModalMode('CANCEL');
                            setIsActionModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Ban className="w-3 h-3" />
                          <span>{isVi ? 'Hủy' : 'Cancel'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: RECORD EVENT */}
      <RecordShipmentEventModal
        shipment={shipment}
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onEventCreated={handleEventCreatedOrUpdated}
        currentUser={currentUser}
        language={language}
      />

      {/* MODAL 2: CORRECT / CANCEL EVENT */}
      {selectedEventForAction && (
        <CorrectShipmentEventModal
          event={selectedEventForAction}
          isOpen={isActionModalOpen}
          mode={actionModalMode}
          onClose={() => {
            setIsActionModalOpen(false);
            setSelectedEventForAction(null);
          }}
          onSuccess={handleEventCreatedOrUpdated}
          currentUser={currentUser}
          language={language}
        />
      )}
    </div>
  );
};
