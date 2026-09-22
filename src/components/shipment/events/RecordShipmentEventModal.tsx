/**
 * Phase 43: Record Shipment Event Modal
 * Clean, accessible dialog to log real logistics occurrences
 * Idempotent, with rich event categories and milestone association.
 */

import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Tag, 
  FileText, 
  Send, 
  Layers, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  Ship,
  Plane,
  Truck,
  Building2,
  User,
  Plus
} from 'lucide-react';
import { ShipmentRecord } from '../../../types/shipment';
import { 
  LogisticsEventType, 
  ShipmentEventSource, 
  EventReferenceType, 
  CreateShipmentEventPayload 
} from '../../../types/shipmentEvent';
import { LOGISTICS_EVENT_DEFINITIONS, getEventDefinition } from '../../../services/shipment/eventDefinitions';
import { createShipmentEvent } from '../../../services/shipment/eventIntelligenceService';

interface RecordShipmentEventModalProps {
  shipment: ShipmentRecord;
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  currentUser: { uid: string; displayName?: string; email?: string };
  language?: 'vi' | 'en';
}

export const RecordShipmentEventModal: React.FC<RecordShipmentEventModalProps> = ({
  shipment,
  isOpen,
  onClose,
  onEventCreated,
  currentUser,
  language = 'vi',
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';

  // Default event type based on service mode
  const initialType: LogisticsEventType = 
    shipment.serviceMode === 'AIR' ? 'FLIGHT_DEPARTED' :
    shipment.serviceMode === 'TRUCKING' ? 'TRUCK_IN_TRANSIT' :
    shipment.serviceMode === 'CUSTOMS' ? 'CUSTOMS_DECLARATION_SUBMITTED' :
    'VESSEL_DEPARTED';

  const [eventType, setEventType] = useState<LogisticsEventType>(initialType);
  const [eventSource, setEventSource] = useState<ShipmentEventSource>('USER');
  const [eventTime, setEventTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState<string>(
    shipment.originPort || shipment.origin || 'Ho Chi Minh Port'
  );
  const [referenceType, setReferenceType] = useState<EventReferenceType>(
    shipment.blAwbNumber ? 'BL' : shipment.bookingNumber ? 'BOOKING' : 'CONTAINER'
  );
  const [referenceId, setReferenceId] = useState<string>(
    shipment.blAwbNumber || shipment.bookingNumber || (shipment.containers?.[0]?.containerNumber) || ''
  );
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [selectedMilestoneCode, setSelectedMilestoneCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDef = getEventDefinition(eventType);

  const handleSetNow = () => {
    setEventTime(new Date().toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setErrorMessage(isVi ? 'Vui lòng nhập địa điểm diễn ra sự kiện' : 'Please provide event location');
      return;
    }
    if (!eventTime) {
      setErrorMessage(isVi ? 'Vui lòng chọn thời gian diễn ra' : 'Please provide event time');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: CreateShipmentEventPayload = {
        companyId: shipment.companyId,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        eventType,
        eventSource,
        eventTime: new Date(eventTime).toISOString(),
        location: location.trim(),
        referenceType,
        referenceId: referenceId.trim() || undefined,
        affectsMilestoneCode: selectedMilestoneCode || selectedDef.defaultMilestoneCode,
        affectsContainerId: selectedContainerId || undefined,
        notes: notes.trim() || undefined,
      };

      await createShipmentEvent(payload, currentUser);
      onEventCreated();
      onClose();
    } catch (err: any) {
      console.error('[RecordShipmentEventModal] Error creating event:', err);
      setErrorMessage(err.message || (isVi ? 'Lỗi ghi nhận sự kiện' : 'Failed to record event'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              {isVi ? 'Ghi Nhận Sự Kiện Vận Hành' : 'Record Operational Event'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Lô hàng:' : 'Shipment:'} <span className="font-mono font-semibold">{shipment.shipmentNumber}</span> ({shipment.customerName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Loại sự kiện (Event Type) *' : 'Event Type *'}
            </label>
            <select
              value={eventType}
              onChange={(e) => {
                const nextType = e.target.value as LogisticsEventType;
                setEventType(nextType);
                const d = getEventDefinition(nextType);
                if (d.defaultMilestoneCode) setSelectedMilestoneCode(d.defaultMilestoneCode);
              }}
              className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {LOGISTICS_EVENT_DEFINITIONS.map(d => (
                <option key={d.type} value={d.type}>
                  [{d.category}] {isVi ? d.titleVi : d.titleEn}
                </option>
              ))}
            </select>
          </div>

          {/* Event Time & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Thời gian diễn ra *' : 'Occurrence Time *'}
                </label>
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  {isVi ? 'Bây giờ' : 'Now'}
                </button>
              </div>
              <input
                type="datetime-local"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
                className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Nguồn thông tin (Source) *' : 'Event Source *'}
              </label>
              <select
                value={eventSource}
                onChange={(e) => setEventSource(e.target.value as ShipmentEventSource)}
                className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="USER">{isVi ? 'Người vận hành (User Confirmed)' : 'User Confirmed'}</option>
                <option value="CARRIER">{isVi ? 'Hãng tàu (Shipping Line / EDI)' : 'Carrier / Shipping Line'}</option>
                <option value="AIRLINE">{isVi ? 'Hãng hàng không (Airline)' : 'Airline'}</option>
                <option value="TRUCKER">{isVi ? 'Nhà xe / Tài xế (Trucker)' : 'Trucker'}</option>
                <option value="CUSTOMS">{isVi ? 'Hải quan / VNACCS' : 'Customs Authority'}</option>
                <option value="CUSTOMER">{isVi ? 'Khách hàng xác nhận' : 'Customer'}</option>
                <option value="SUPPLIER">{isVi ? 'Nhà cung cấp / Cảng' : 'Supplier / Port'}</option>
                <option value="SYSTEM">{isVi ? 'Hệ thống tự động' : 'System Auto'}</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Địa điểm diễn ra (Cảng / Kho / Depot) *' : 'Event Location (Port / Warehouse) *'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isVi ? 'Ví dụ: Cảng Cát Lái, Tân Sơn Nhất...' : 'e.g. Cat Lai Port, Tan Son Nhat Airport...'}
                required
                className="w-full text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reference Type & Reference ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Loại số tham chiếu' : 'Reference Type'}
              </label>
              <select
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value as EventReferenceType)}
                className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="BL">B/L (Vận đơn đường biển)</option>
                <option value="AWB">AWB (Vận đơn hàng không)</option>
                <option value="BOOKING">Booking Number</option>
                <option value="CONTAINER">Container Number</option>
                <option value="CUSTOMS_DECLARATION">Tờ khai Hải quan</option>
                <option value="TRUCK_PLATE">Biển số xe tải</option>
                <option value="VESSEL">Tên tàu / Chuyến</option>
                <option value="OTHER">Khác (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Mã số tham chiếu' : 'Reference Number'}
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder={isVi ? 'VD: ONEY12345600, TCLU1234567...' : 'e.g. ONEY12345600...'}
                className="w-full text-xs font-mono rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Associated Milestone & Target Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Mốc tiến độ liên đới (Milestone)' : 'Associated Milestone'}
              </label>
              <select
                value={selectedMilestoneCode}
                onChange={(e) => setSelectedMilestoneCode(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isVi ? '-- Tự động xác định theo loại sự kiện --' : '-- Auto-inferred from Event --'}</option>
                {(shipment.milestones || []).map(m => (
                  <option key={m.id} value={m.milestoneCode}>
                    #{m.sequence} {isVi ? m.titleVi : m.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Container liên quan' : 'Target Container'}
              </label>
              <select
                value={selectedContainerId}
                onChange={(e) => setSelectedContainerId(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isVi ? '-- Áp dụng toàn bộ lô hàng --' : '-- All Containers / Shipment --'}</option>
                {(shipment.containers || []).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.containerNumber || 'Cont chưa gán số'} ({c.containerType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Ghi chú nghiệp vụ / Chi tiết' : 'Operational Notes / Details'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isVi ? 'Ghi nhận chi tiết diễn biến, biên nhận hoặc hướng dẫn...' : 'Provide details...'}
              className="w-full text-xs rounded-lg p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu sự kiện' : 'Record Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
