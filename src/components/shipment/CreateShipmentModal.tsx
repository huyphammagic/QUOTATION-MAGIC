import React, { useState } from 'react';
import { 
  ShipmentRecord, 
  ShipmentServiceMode, 
  ShipmentStatus 
} from '../../types/shipment';
import { QuoteData, CustomerInfo, ContainerType } from '../../types/logistics';
import { createShipment, createShipmentFromQuotation } from '../../services/shipment/shipmentService';
import { 
  X, 
  Package, 
  Ship, 
  Plane, 
  Truck, 
  FileCheck2, 
  Check, 
  Calendar, 
  MapPin, 
  Anchor, 
  Layers, 
  UserCheck, 
  FileText 
} from 'lucide-react';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (shipment: ShipmentRecord) => void;
  companyId: string;
  fromQuote?: QuoteData | null;
  customers?: CustomerInfo[];
  currentUser?: { uid: string; displayName?: string; email?: string };
  activeLanguage?: 'vi' | 'en';
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  companyId,
  fromQuote,
  customers = [],
  currentUser = { uid: 'user_default', displayName: 'Logistics Operator' },
  activeLanguage = 'vi',
}) => {
  if (!isOpen) return null;

  // Initialize fields
  const [serviceMode, setServiceMode] = useState<ShipmentServiceMode>(() => {
    if (fromQuote?.shipment?.serviceType) {
      const t = fromQuote.shipment.serviceType.toUpperCase();
      if (t.includes('AIR')) return 'AIR';
      if (t.includes('LCL')) return 'SEA_LCL';
      if (t.includes('TRUCK')) return 'TRUCKING';
      if (t.includes('CUSTOM')) return 'CUSTOMS';
    }
    return 'SEA_FCL';
  });

  const [customerId, setCustomerId] = useState<string>(fromQuote?.customer?.id || '');
  const [customerName, setCustomerName] = useState<string>(
    fromQuote?.customer?.companyName || fromQuote?.customer?.contactPerson || ''
  );
  const [origin, setOrigin] = useState<string>(
    fromQuote?.shipment?.origin || fromQuote?.shipment?.pol || 'Cảng Cát Lái, TP.HCM'
  );
  const [originPort, setOriginPort] = useState<string>(fromQuote?.shipment?.pol || '');
  const [destination, setDestination] = useState<string>(
    fromQuote?.shipment?.destination || fromQuote?.shipment?.pod || 'Los Angeles, CA, USA'
  );
  const [destinationPort, setDestinationPort] = useState<string>(fromQuote?.shipment?.pod || '');
  const [incoterm, setIncoterm] = useState<string>(fromQuote?.terms?.incoterm || 'FOB');
  const [commodity, setCommodity] = useState<string>(fromQuote?.shipment?.commodity || 'General Cargo');
  const [cargoDescription, setCargoDescription] = useState<string>(fromQuote?.shipment?.commodity || '');
  const [packageType, setPackageType] = useState<string>('Cartons / Pallets');
  const [packageQuantity, setPackageQuantity] = useState<string>(
    fromQuote?.shipment?.quantity ? String(fromQuote.shipment.quantity) : '1'
  );
  const [grossWeightKg, setGrossWeightKg] = useState<string>(
    fromQuote?.shipment?.grossWeightKg ? String(fromQuote.shipment.grossWeightKg) : ''
  );
  const [volumeCbm, setVolumeCbm] = useState<string>(
    fromQuote?.shipment?.volumeCbm ? String(fromQuote.shipment.volumeCbm) : ''
  );
  const [carrierName, setCarrierName] = useState<string>(fromQuote?.shipment?.carrier || '');
  const [vesselFlightName, setVesselFlightName] = useState<string>('');
  const [voyageFlightNumber, setVoyageFlightNumber] = useState<string>('');
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [blAwbNumber, setBlAwbNumber] = useState<string>('');
  const [etdPlanned, setEtdPlanned] = useState<string>(fromQuote?.shipment?.etd || '');
  const [etaPlanned, setEtaPlanned] = useState<string>(fromQuote?.shipment?.eta || '');
  const [siCutoff, setSiCutoff] = useState<string>('');
  const [cyCutoff, setCyCutoff] = useState<string>('');
  const [assignedToName, setAssignedToName] = useState<string>(currentUser.displayName || 'Operator PIC');
  const [notes, setNotes] = useState<string>(fromQuote?.terms?.exclusionsNotes || fromQuote?.terms?.paymentTerm || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setCustomerId(selectedId);
    const found = customers.find(c => c.id === selectedId);
    if (found) {
      setCustomerName(found.companyName || found.contactPerson || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg(activeLanguage === 'vi' ? 'Vui lòng nhập hoặc chọn khách hàng.' : 'Customer name is required.');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setErrorMsg(activeLanguage === 'vi' ? 'Vui lòng nhập nơi đi và nơi đến.' : 'Origin and destination are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      let record: ShipmentRecord;

      if (fromQuote) {
        record = await createShipmentFromQuotation(fromQuote, currentUser, {
          companyId,
          serviceMode,
          origin,
          originPort: originPort || undefined,
          destination,
          destinationPort: destinationPort || undefined,
          incoterm,
          commodity,
          cargoDescription: cargoDescription || undefined,
          packageType: packageType || undefined,
          packageQuantity: packageQuantity ? parseInt(packageQuantity) : undefined,
          grossWeightKg: grossWeightKg ? parseFloat(grossWeightKg) : undefined,
          volumeCbm: volumeCbm ? parseFloat(volumeCbm) : undefined,
          carrierName: carrierName || undefined,
          vesselFlightName: vesselFlightName || undefined,
          voyageFlightNumber: voyageFlightNumber || undefined,
          bookingNumber: bookingNumber || undefined,
          blAwbNumber: blAwbNumber || undefined,
          etdPlanned: etdPlanned || undefined,
          etaPlanned: etaPlanned || undefined,
          siCutoff: siCutoff || undefined,
          cyCutoff: cyCutoff || undefined,
          assignedToName: assignedToName || undefined,
          notes: notes || undefined,
        });
      } else {
        record = await createShipment({
          companyId,
          customerId: customerId || `cust_${Date.now()}`,
          customerName,
          serviceMode,
          status: 'BOOKING_REQUESTED',
          origin,
          originPort: originPort || undefined,
          destination,
          destinationPort: destinationPort || undefined,
          incoterm,
          commodity,
          cargoDescription: cargoDescription || undefined,
          packageType: packageType || undefined,
          packageQuantity: packageQuantity ? parseInt(packageQuantity) : undefined,
          grossWeightKg: grossWeightKg ? parseFloat(grossWeightKg) : undefined,
          volumeCbm: volumeCbm ? parseFloat(volumeCbm) : undefined,
          carrierName: carrierName || undefined,
          vesselFlightName: vesselFlightName || undefined,
          voyageFlightNumber: voyageFlightNumber || undefined,
          bookingNumber: bookingNumber || undefined,
          blAwbNumber: blAwbNumber || undefined,
          etdPlanned: etdPlanned || undefined,
          etaPlanned: etaPlanned || undefined,
          siCutoff: siCutoff || undefined,
          cyCutoff: cyCutoff || undefined,
          assignedToName: assignedToName || undefined,
          notes: notes || undefined,
          containers: [],
          milestones: [],
          linkedDocumentIds: [],
          linkedTaskIds: [],
          createdBy: currentUser.displayName || currentUser.email || 'Operator',
          updatedBy: currentUser.displayName || currentUser.email || 'Operator',
        }, currentUser);
      }

      onCreated(record);
      onClose();
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      setErrorMsg(err.message || 'Failed to create shipment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {fromQuote 
                  ? (activeLanguage === 'vi' ? 'Khởi Tạo Lô Hàng Từ Báo Giá' : 'Create Shipment From Quotation')
                  : (activeLanguage === 'vi' ? 'Khởi Tạo Lô Hàng Mới (New Shipment / Job)' : 'Create New Shipment')
                }
              </h2>
              {fromQuote && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {activeLanguage === 'vi' ? 'Liên kết báo giá gốc:' : 'Linked Quote:'} {fromQuote.quoteNumber}
                </p>
              )}
            </div>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Service Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {activeLanguage === 'vi' ? 'Phương Thức Vận Chuyển & Dịch Vụ' : 'Service Mode'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { mode: 'SEA_FCL', labelVi: 'Đường Biển FCL', labelEn: 'Ocean FCL', icon: Ship },
                { mode: 'SEA_LCL', labelVi: 'Đường Biển LCL', labelEn: 'Ocean LCL', icon: Layers },
                { mode: 'AIR', labelVi: 'Hàng Không Air', labelEn: 'Air Freight', icon: Plane },
                { mode: 'TRUCKING', labelVi: 'Vận Tải Đường Bộ', labelEn: 'Trucking', icon: Truck },
                { mode: 'CUSTOMS', labelVi: 'Thủ Tục Hải Quan', labelEn: 'Customs', icon: FileCheck2 },
              ].map(item => {
                const isSel = serviceMode === item.mode;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setServiceMode(item.mode as ShipmentServiceMode)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSel 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{activeLanguage === 'vi' ? item.labelVi : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer & Incoterm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Khách Hàng (Shipper / Consignee)' : 'Customer Name'} *
              </label>
              {customers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={customerId}
                    onChange={handleCustomerSelect}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{activeLanguage === 'vi' ? '-- Chọn từ danh bạ khách hàng --' : '-- Select customer --'}</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.contactPerson} ({c.taxId || 'No Tax'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customerName}
                    placeholder={activeLanguage === 'vi' ? 'Hoặc nhập tên khách hàng...' : 'Or type customer name...'}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={customerName}
                  placeholder="e.g., Công ty TNHH Xuất Nhập Khẩu ABC"
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Điều Kiện Incoterms' : 'Incoterm'}
              </label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP', 'FCA', 'CPT', 'CIP', 'DAT'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Route Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {activeLanguage === 'vi' ? 'Nơi Gửi / Cảng Đi (POL / Origin)' : 'Origin (POL)'} *
              </label>
              <input
                type="text"
                value={origin}
                placeholder="e.g., Cat Lai Port, Ho Chi Minh, Vietnam"
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-emerald-600" />
                {activeLanguage === 'vi' ? 'Nơi Nhận / Cảng Đến (POD / Dest)' : 'Destination (POD)'} *
              </label>
              <input
                type="text"
                value={destination}
                placeholder="e.g., Port of Los Angeles, USA"
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cargo Details */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Tên Hàng Hóa (Commodity)' : 'Commodity'}
              </label>
              <input
                type="text"
                value={commodity}
                placeholder="e.g., Garments, Footwear, Electronics..."
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Tổng Khối Lượng (GW kg)' : 'Gross Weight (kg)'}
              </label>
              <input
                type="number"
                value={grossWeightKg}
                placeholder="e.g., 18500"
                onChange={(e) => setGrossWeightKg(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Thể Tích (CBM)' : 'Volume (CBM)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={volumeCbm}
                placeholder="e.g., 45.5"
                onChange={(e) => setVolumeCbm(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Carrier, Vessel/Flight & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Hãng Vận Chuyển (Carrier/Line)' : 'Carrier / Shipping Line'}
              </label>
              <input
                type="text"
                value={carrierName}
                placeholder="e.g., ONE, Maersk, Evergreen, Vietnam Airlines"
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Tên Tàu / Chuyến Bay' : 'Vessel / Flight'}
              </label>
              <input
                type="text"
                value={vesselFlightName}
                placeholder="e.g., ONE APUS / VN650"
                onChange={(e) => setVesselFlightName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Số Chuyến (Voyage / Flight No)' : 'Voyage / Flight No'}
              </label>
              <input
                type="text"
                value={voyageFlightNumber}
                placeholder="e.g., 0021E"
                onChange={(e) => setVoyageFlightNumber(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Số Booking' : 'Booking No.'}
              </label>
              <input
                type="text"
                value={bookingNumber}
                placeholder="e.g., BK-987654"
                onChange={(e) => setBookingNumber(e.target.value)}
                className="w-full text-xs uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Số Vận Đơn (B/L / AWB)' : 'B/L or AWB No.'}
              </label>
              <input
                type="text"
                value={blAwbNumber}
                placeholder="e.g., ONEY12345678"
                onChange={(e) => setBlAwbNumber(e.target.value)}
                className="w-full text-xs uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Ngày khởi hành dự kiến (ETD)' : 'Planned ETD'}
              </label>
              <input
                type="date"
                value={etdPlanned}
                onChange={(e) => setEtdPlanned(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Ngày cập cảng dự kiến (ETA)' : 'Planned ETA'}
              </label>
              <input
                type="date"
                value={etaPlanned}
                onChange={(e) => setEtaPlanned(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Operational Notes & Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Ghi Chú Điều Hành' : 'Operational Notes'}
              </label>
              <input
                type="text"
                value={notes}
                placeholder={activeLanguage === 'vi' ? 'Yêu cầu kiểm hóa, nhiệt độ, dán nhãn...' : 'Special requirements, inspection...'}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeLanguage === 'vi' ? 'Nhân Viên Điều Hành (PIC)' : 'Operator / PIC'}
              </label>
              <input
                type="text"
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {activeLanguage === 'vi' ? 'Đóng' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <span>...</span>
              ) : (
                <Check className="w-4 h-4" />
              )}
              {activeLanguage === 'vi' ? 'Xác Nhận Tạo Lô Hàng' : 'Confirm & Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
