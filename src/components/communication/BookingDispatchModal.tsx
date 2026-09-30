import React, { useState } from 'react';
import { 
  Package, 
  Calendar, 
  Building, 
  MapPin, 
  FileText, 
  ArrowRight, 
  X,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { QuotationBookingDispatchInfo } from '../../types/quotationCommunication';

interface BookingDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToSign: (bookingInfo: QuotationBookingDispatchInfo) => void;
  defaultShipperName?: string;
  defaultConsigneeName?: string;
}

export const BookingDispatchModal: React.FC<BookingDispatchModalProps> = ({
  isOpen,
  onClose,
  onProceedToSign,
  defaultShipperName = '',
  defaultConsigneeName = '',
}) => {
  const [cargoReadyDate, setCargoReadyDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [shipperName, setShipperName] = useState(defaultShipperName);
  const [shipperAddress, setShipperAddress] = useState('');
  const [consigneeName, setConsigneeName] = useState(defaultConsigneeName);
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [notifyParty, setNotifyParty] = useState('Same as Consignee');
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProceedToSign({
      cargoReadyDate,
      shipperName: shipperName.trim(),
      shipperAddress: shipperAddress.trim(),
      consigneeName: consigneeName.trim(),
      consigneeAddress: consigneeAddress.trim(),
      notifyParty: notifyParty.trim(),
      specialInstructions: specialInstructions.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Thông Tin Đặt Chỗ Vận Tải (Booking)</h3>
              <p className="text-[11px] text-slate-400">Bước 1/2: Chuẩn bị thông tin điều phối trước khi ký số</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Cargo Readiness Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Dự kiến ngày hàng sẵn sàng (Cargo Ready Date / CRD) *:</span>
            </label>
            <input
              type="date"
              required
              value={cargoReadyDate}
              onChange={(e) => setCargoReadyDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Shipper Information */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-500">
              Thông Tin Người Gửi Hàng (Shipper)
            </span>
            <input
              type="text"
              placeholder="Tên công ty xuất khẩu / Shipper"
              value={shipperName}
              onChange={(e) => setShipperName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Địa chỉ kho lấy hàng / Đóng hàng"
              value={shipperAddress}
              onChange={(e) => setShipperAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Consignee Information */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-500">
              Thông Tin Người Nhận Hàng (Consignee)
            </span>
            <input
              type="text"
              placeholder="Tên công ty nhập khẩu / Consignee"
              value={consigneeName}
              onChange={(e) => setConsigneeName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Địa chỉ giao hàng tại nước đến"
              value={consigneeAddress}
              onChange={(e) => setConsigneeAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Special Instructions */}
          <div className="pt-1 border-t border-slate-100">
            <label className="block font-semibold text-slate-700 mb-1">
              Yêu cầu chỉ dẫn đặc biệt (Special Instructions):
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="VD: Cần kẹp chì hãng tàu nguyên vẹn, hàng cần giữ nhiệt độ mát, hun trùng ISPM-15..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Footbar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Quay lại
            </button>

            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md active:scale-95 cursor-pointer"
            >
              <span>Tiếp Tục Ký Số Điện Tử</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
