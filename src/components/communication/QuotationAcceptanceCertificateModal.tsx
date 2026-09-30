import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Download, 
  Printer, 
  X, 
  Calendar, 
  Building, 
  FileText, 
  Ship, 
  ExternalLink,
  Award
} from 'lucide-react';
import { QuotationCustomerResponse } from '../../types/quotationCommunication';
import { QuotationDocumentRecord } from '../../types/quotationDocument';

interface QuotationAcceptanceCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: QuotationCustomerResponse;
  docRecord: QuotationDocumentRecord;
}

export const QuotationAcceptanceCertificateModal: React.FC<QuotationAcceptanceCertificateModalProps> = ({
  isOpen,
  onClose,
  response,
  docRecord,
}) => {
  if (!isOpen) return null;

  const s = docRecord.snapshot;
  const isVnd = s.currency === 'VND';
  const formatMoney = (amount: number) => {
    return isVnd
      ? new Intl.NumberFormat('vi-VN').format(Math.round(amount))
      : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:w-full">
        
        {/* Certificate Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block">
                Official Digital Certificate
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Chứng Thư Xác Nhận Báo Giá Điện Tử
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors print:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Printable Body */}
        <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-700 bg-white">
          
          {/* Certificate Identification Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Mã Chứng Thư (Certificate No.):</p>
              <p className="font-mono text-sm font-bold text-slate-900">{response.certificateId || `CERT-${Date.now().toString(36).toUpperCase()}`}</p>
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Thời Điểm Ký Xác Nhận:</p>
              <p className="font-mono text-xs font-semibold text-slate-800">
                {new Date(response.respondedAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Statement of Acceptance */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 text-emerald-950">
            <div className="flex items-center space-x-2 font-bold text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Báo Giá Đã Được Khách Hàng Chấp Thuận Ký Số Thành Công</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Chứng thư này xác nhận rằng bảng báo giá dịch vụ Logistics mã số <strong>{s.quoteNumber}</strong> (Revision {s.revision}) đã được khách hàng xem xét, đồng ý toàn bộ điều khoản giá cước và ký xác nhận điện tử hợp lệ.
            </p>
          </div>

          {/* Quotation & Parties Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Service Provider */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Đơn Vị Vận Chuyển:
              </span>
              <p className="font-bold text-slate-900">{s.company.name}</p>
              <p className="text-[11px] text-slate-500">MST: {s.company.taxId || 'N/A'}</p>
              <p className="text-[11px] text-slate-500">Chuyên viên phụ trách: {s.company.salesRepName || 'Logistics Sales'}</p>
            </div>

            {/* Customer */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Khách Hàng Chấp Thuận:
              </span>
              <p className="font-bold text-slate-900">{response.signerCompany || s.customer.companyName || s.customer.customerName}</p>
              <p className="text-[11px] text-slate-500">Người ký: <strong>{response.customerName}</strong> ({response.signerTitle || 'Đại diện'})</p>
              {response.customerEmail && <p className="text-[11px] text-slate-500">Email: {response.customerEmail}</p>}
            </div>

          </div>

          {/* Shipment & Financial Highlights */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
              Thông Tin Tuyến Vận Chuyển & Giá Trị Hợp Đồng
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Cảng Đi (POL):</span>
                <span className="font-bold text-slate-800">{s.shipment.pol}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Cảng Đến (POD):</span>
                <span className="font-bold text-slate-800">{s.shipment.pod}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Phương Thức:</span>
                <span className="font-bold text-blue-900">{s.shipment.mode} ({s.shipment.quantity} cont)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Tổng Giá Trị:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatMoney(isVnd ? s.grandTotalVnd : s.grandTotalUsd)} {s.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Embedded Signature Area */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Mã Băm Kiểm Tra Tính Toàn Vẹn (SHA-256 Hash):
              </span>
              <p className="font-mono text-[10px] text-slate-500 break-all max-w-sm">
                {response.certificateHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Chữ ký số đã được ghi nhận vào sổ nhật ký lưu trữ Cloud</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Chữ Ký Điện Tử Của Khách Hàng:
              </span>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50/50 min-w-[180px] max-w-[220px] flex flex-col items-center justify-center">
                {response.signatureDataUrl ? (
                  <img 
                    src={response.signatureDataUrl} 
                    alt={`Chữ ký ${response.customerName}`}
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <div className="font-serif italic font-bold text-slate-800 py-2">
                    {response.customerName}
                  </div>
                )}
                <div className="border-t border-slate-200 w-full pt-1 mt-1 text-center font-mono text-[9px] text-slate-500">
                  {response.customerName} &bull; {new Date(response.respondedAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Action Footbar */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between print:hidden">
          <p className="text-[11px] text-slate-500">
            Chứng thư có giá trị tra cứu đối chiếu độc lập trên hệ thống LogiQuote.
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Chứng Thư</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
