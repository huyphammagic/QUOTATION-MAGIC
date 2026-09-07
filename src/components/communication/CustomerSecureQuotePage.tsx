import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard,
  Ship,
  Plane,
  Truck,
  Package,
  Info,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Send
} from 'lucide-react';
import { QuotationSecureLink, QuotationCustomerResponse } from '../../types/quotationCommunication';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { resolveSecureLink, submitCustomerResponse } from '../../services/quotation/quotationSecurityService';
import { exportQuotationDocumentToPdf } from '../../services/quotation/quotationPdfEngine';

interface CustomerSecureQuotePageProps {
  token: string;
  onBackToApp?: () => void;
}

export const CustomerSecureQuotePage: React.FC<CustomerSecureQuotePageProps> = ({
  token,
  onBackToApp
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'MAX_VIEWS_REACHED' | null>(null);
  const [linkRecord, setLinkRecord] = useState<QuotationSecureLink | null>(null);
  const [docRecord, setDocRecord] = useState<QuotationDocumentRecord | null>(null);

  // Modals for actions
  const [actionModal, setActionModal] = useState<'ACCEPT' | 'REJECT' | 'REVISE' | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('Giá cước chưa cạnh tranh');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuotation() {
      setLoading(true);
      try {
        const result = await resolveSecureLink(token);
        if (!result.isValid) {
          setErrorState(result.errorCode || 'NOT_FOUND');
        } else {
          setLinkRecord(result.link || null);
          setDocRecord(result.document || null);
          if (result.link) {
            setCustomerName(result.link.customerName || '');
            setCustomerEmail(result.link.customerEmail || '');
          }
        }
      } catch (err) {
        setErrorState('NOT_FOUND');
      } finally {
        setLoading(false);
      }
    }
    loadQuotation();
  }, [token]);

  const handleDownloadPdf = async () => {
    if (!docRecord) return;
    try {
      await exportQuotationDocumentToPdf(docRecord);
    } catch (e) {
      console.error('Download PDF error:', e);
      if (docRecord.downloadUrl) {
        window.open(docRecord.downloadUrl, '_blank');
      }
    }
  };

  const handleSubmitResponse = async (type: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    if (!linkRecord) return;
    setIsSubmittingAction(true);

    try {
      await submitCustomerResponse({
        link: linkRecord,
        responseType: type,
        customerName: customerName || linkRecord.customerName,
        customerEmail: customerEmail || linkRecord.customerEmail,
        rejectionReason: type === 'REJECTED' ? rejectionReason : undefined,
        revisionMessage: type === 'REVISION_REQUESTED' ? feedbackNote : undefined,
        notes: feedbackNote,
      });

      if (type === 'ACCEPTED') {
        setActionSuccessMessage('Quý khách đã CHẤP NHẬN báo giá thành công! Chuyên viên kinh doanh của chúng tôi sẽ liên hệ ngay để hỗ trợ chuẩn bị thủ tục book chỗ.');
      } else if (type === 'REJECTED') {
        setActionSuccessMessage('Cảm ơn Quý khách đã gửi phản hồi. Chúng tôi đã ghi nhận lý do và sẽ cải thiện phương án dịch vụ tốt hơn trong các đợt báo giá tiếp theo.');
      } else if (type === 'REVISION_REQUESTED') {
        setActionSuccessMessage('Yêu cầu điều chỉnh báo giá đã được gửi thành công! Đội ngũ Pricing của chúng tôi sẽ tiến hành rà soát và gửi lại bản báo giá cập nhật sớm nhất.');
      }
      setActionModal(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">Đang giải mã và tải báo giá bảo mật...</p>
      </div>
    );
  }

  // Error States
  if (errorState || !docRecord || !docRecord.snapshot) {
    let title = 'Liên Kết Báo Giá Không Hợp Lệ';
    let message = 'Đường dẫn liên kết báo giá này không tồn tại hoặc đã bị thay đổi.';
    let icon = <AlertTriangle className="w-12 h-12 text-amber-500" />;

    if (errorState === 'EXPIRED') {
      title = 'Báo Giá Đã Hết Hiệu Lực (Quotation Expired)';
      message = 'Bảng báo giá này đã quá thời hạn hiệu lực. Để nhận mức giá cước và lịch trình mới nhất, Quý khách vui lòng liên hệ trực tiếp với chuyên viên phụ trách.';
      icon = <Clock className="w-12 h-12 text-amber-500" />;
    } else if (errorState === 'REVOKED') {
      title = 'Liên Kết Báo Giá Đã Bị Thu Hồi';
      message = 'Liên kết báo giá này đã được thu hồi hoặc thay thế bằng phiên bản cập nhật mới hơn.';
      icon = <XCircle className="w-12 h-12 text-rose-500" />;
    }

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200">
          <div className="flex justify-center mb-4">{icon}</div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">{message}</p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Về Trang Quản Trị LogiQuote
            </button>
          )}
        </div>
      </div>
    );
  }

  const s = docRecord.snapshot;
  const isVnd = s.currency === 'VND';
  const formatMoney = (amount: number) => {
    return isVnd
      ? new Intl.NumberFormat('vi-VN').format(Math.round(amount))
      : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const isExpired = linkRecord?.expiresAt ? new Date(linkRecord.expiresAt) < new Date() : false;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans pb-12">
      
      {/* Top Header Bar */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white py-3.5 px-4 sm:px-8 border-b border-blue-800/40 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-blue-300 text-sm">
              LQ
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block sm:inline">
                {s.company.name}
              </span>
              <span className="hidden sm:inline text-xs text-blue-300 font-medium ml-2 border-l border-blue-400/30 pl-2">
                Cổng Xác Nhận Báo Giá Trực Tuyến
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải PDF</span>
            </button>

            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                Vào Ứng Dụng
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Quotation Display Container */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Success Alert Banner if customer submitted an action */}
        {actionSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-md flex items-start space-x-3 text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Xác Nhận Thành Công!</h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">{actionSuccessMessage}</p>
            </div>
          </div>
        )}

        {/* Security & Validity Badge Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base text-slate-900">BÁO GIÁ DỊCH VỤ LOGISTICS (FREIGHT QUOTATION)</h1>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold text-xs rounded">
                  Rev {String(s.revision).padStart(2, '0')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã số: <strong className="font-mono text-slate-800">{s.quoteNumber}</strong> &bull; Ngày phát hành: {s.createdDate}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Hiệu Lực Đến:</p>
              <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{s.terms.validityDate || 'Xem chi tiết'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Company & Customer Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Service Provider Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-blue-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <Building className="w-4 h-4" />
              <span>ĐƠN VỊ VẬN CHUYỂN (SERVICE PROVIDER)</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{s.company.name}</h3>
              {s.company.englishName && <p className="text-xs text-slate-500">{s.company.englishName}</p>}
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p className="flex items-start space-x-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{s.company.address}</span>
              </p>
              <p className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Hotline: {s.company.phone}</span>
              </p>
              <p className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Email: {s.company.email}</span>
              </p>
              {s.company.salesRepName && (
                <div className="pt-2 border-t border-slate-100 text-slate-700">
                  <p className="text-[11px] text-slate-400">Chuyên viên phụ trách báo giá:</p>
                  <p className="font-bold text-xs text-blue-900">{s.company.salesRepName} &bull; {s.company.salesRepPhone || s.company.salesRepEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-indigo-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <Building className="w-4 h-4" />
              <span>KHÁCH HÀNG (QUOTED TO)</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {s.customer.companyName || s.customer.customerName || 'Quý Khách Hàng'}
              </h3>
              {s.customer.contactPerson && (
                <p className="text-xs text-slate-500">Người liên hệ: <strong className="text-slate-800">{s.customer.contactPerson}</strong></p>
              )}
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              {s.customer.address && (
                <p className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{s.customer.address}</span>
                </p>
              )}
              {s.customer.taxId && (
                <p>Mã số thuế: <strong className="font-mono text-slate-800">{s.customer.taxId}</strong></p>
              )}
              {s.customer.email && (
                <p className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.customer.email}</span>
                </p>
              )}
              {s.customer.phone && (
                <p className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.customer.phone}</span>
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Shipment Route & Cargo Specifications */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
            <Ship className="w-4 h-4 text-blue-700" />
            <span>CHI TIẾT LÔ HÀNG & LỊCH TRÌNH (SHIPMENT & ROUTING DETAILS)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Cảng Đi (POL):</span>
              <strong className="text-slate-900 text-sm mt-0.5 block">{s.shipment.pol}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Cảng Đến (POD):</span>
              <strong className="text-slate-900 text-sm mt-0.5 block">{s.shipment.pod}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Phương Thức:</span>
              <strong className="text-blue-900 text-sm mt-0.5 block">{s.shipment.mode}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Quy Cách & Số Lượng:</span>
              <strong className="text-slate-900 text-sm mt-0.5 block">
                {s.shipment.quantity} x {s.shipment.containerType}
              </strong>
            </div>

            {s.shipment.commodity && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Tên Hàng Hóa:</span>
                <span className="text-slate-800 font-semibold">{s.shipment.commodity}</span>
              </div>
            )}

            {s.shipment.transitTime && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Thời Gian Vận Chuyển:</span>
                <span className="text-slate-800 font-semibold">{s.shipment.transitTime}</span>
              </div>
            )}

            {s.shipment.freeTime && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Thời Gian Lưu Bãi (Free Time):</span>
                <span className="text-slate-800 font-semibold">{s.shipment.freeTime}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Điều Kiện Giao Hàng:</span>
              <span className="text-indigo-900 font-bold">{s.terms.incoterm}</span>
            </div>
          </div>
        </div>

        {/* Customer Quotation Charges Table (Strictly Sanitized) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              BẢNG CHI TIẾT CƯỚC & PHỤ PHÍ (FREIGHT & CHARGES BREAKDOWN)
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Tiền tệ: <strong className="font-bold text-slate-900">{s.currency}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Mã Phí & Diễn Giải</th>
                  <th className="py-3 px-4">Khu Vực</th>
                  <th className="py-3 px-4 text-center">Số Lượng</th>
                  <th className="py-3 px-4 text-center">Đơn Vị</th>
                  <th className="py-3 px-4 text-right">Đơn Giá ({s.currency})</th>
                  <th className="py-3 px-4 text-right">VAT</th>
                  <th className="py-3 px-4 text-right">Thành Tiền ({s.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.items.map((item, idx) => {
                  const lineAmount = isVnd ? item.amountVnd : item.amountUsd;
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                          {item.code}
                        </span>
                        <span className="font-medium text-slate-800">{item.description}</span>
                        {item.note && <p className="text-[10px] text-slate-400 mt-0.5">{item.note}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-semibold text-[11px]">{item.location}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{item.quantity}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {item.vatRate > 0 ? `${item.vatRate}%` : '0%'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(lineAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Footer */}
          <div className="bg-slate-50/80 p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-end">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng Tiền Trước Thuế:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatMoney(isVnd ? s.subtotalVnd : s.subtotalUsd)} {s.currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Thuế GTGT (VAT):</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatMoney(isVnd ? s.vatTotalVnd : s.vatTotalUsd)} {s.currency}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                <span className="text-blue-900">TỔNG CỘNG THANH TOÁN:</span>
                <span className="font-mono text-base text-blue-900">
                  {formatMoney(isVnd ? s.grandTotalVnd : s.grandTotalUsd)} {s.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions & Payment Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            ĐIỀU KHOẢN VẬN CHUYỂN & THÔNG TIN THANH TOÁN (TERMS & CONDITIONS)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
            <div>
              <p className="font-semibold text-slate-700">Điều kiện thanh toán:</p>
              <p className="mt-0.5">{s.terms.paymentTerm || 'Thanh toán trước khi nhận vận đơn (Bill of Lading)'}</p>

              {s.terms.exclusionsNotes && (
                <div className="mt-2.5">
                  <p className="font-semibold text-slate-700">Ghi chú & Ngoại trừ:</p>
                  <p className="mt-0.5 leading-relaxed">{s.terms.exclusionsNotes}</p>
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-slate-700 flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Thông tin tài khoản ngân hàng thụ hưởng:</span>
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-1 font-mono text-[11px] space-y-0.5 text-slate-800">
                <p>Ngân hàng: <strong>{s.company.bankName}</strong></p>
                <p>Số tài khoản: <strong>{s.company.bankAccountNo}</strong></p>
                <p>Chủ tài khoản: <strong>{s.company.bankAccountHolder}</strong></p>
                {s.company.bankSwiftCode && <p>SWIFT Code: <strong>{s.company.bankSwiftCode}</strong></p>}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Decision Action Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">Xác Nhận Phương Án Báo Giá</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Quý khách có thể bấm xác nhận chấp nhận báo giá, yêu cầu chỉnh sửa, hoặc từ chối trực tiếp tại đây.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Request Revision */}
            <button
              type="button"
              onClick={() => setActionModal('REVISE')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              <Edit3 className="w-3.5 h-3.5 text-violet-300" />
              <span>Yêu Cầu Chỉnh Sửa</span>
            </button>

            {/* Reject */}
            <button
              type="button"
              onClick={() => setActionModal('REJECT')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-500/30"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-300" />
              <span>Từ Chối</span>
            </button>

            {/* Accept */}
            <button
              type="button"
              onClick={() => setActionModal('ACCEPT')}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>CHẤP NHẬN BÁO GIÁ (ACCEPT)</span>
            </button>
          </div>
        </div>

      </main>

      {/* Action Dialog Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {actionModal === 'ACCEPT' && 'Xác Nhận Chấp Nhận Báo Giá'}
                {actionModal === 'REVISE' && 'Gửi Yêu Cầu Chỉnh Sửa Báo Giá'}
                {actionModal === 'REJECT' && 'Từ Chối Báo Giá'}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Người xác nhận (Họ & Tên):</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Email liên hệ xác nhận:</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="contact@company.com"
                />
              </div>

              {actionModal === 'REJECT' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Lý do từ chối:</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Giá cước chưa cạnh tranh">Giá cước chưa cạnh tranh / Cao hơn đối thủ</option>
                    <option value="Đã chọn hãng tàu/forwarder khác">Đã chọn hãng tàu/forwarder khác</option>
                    <option value="Kế hoạch xuất khẩu bị hủy">Kế hoạch xuất khẩu bị hủy hoặc hoãn lại</option>
                    <option value="Lịch trình vận chuyển không phù hợp">Lịch trình vận chuyển (ETD/Transit Time) không phù hợp</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>
              )}

              {actionModal === 'REVISE' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Nội dung yêu cầu điều chỉnh:</label>
                  <textarea
                    rows={3}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="VD: Nhờ kiểm tra lại giá cước cont 40HC, gia hạn thêm free time 14 ngày..."
                  />
                </div>
              )}

              {actionModal === 'ACCEPT' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                  Bằng việc bấm xác nhận, Quý khách đồng ý với các mức giá, điều kiện Incoterms và điều khoản thanh toán được nêu trong bảng báo giá {s.quoteNumber}.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 font-bold text-slate-600 text-xs hover:bg-slate-100"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => handleSubmitResponse(
                  actionModal === 'ACCEPT' ? 'ACCEPTED' : (actionModal === 'REJECT' ? 'REJECTED' : 'REVISION_REQUESTED')
                )}
                disabled={isSubmittingAction}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-all ${
                  actionModal === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700' : (
                    actionModal === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  )
                }`}
              >
                {isSubmittingAction ? 'Đang gửi...' : 'Gửi Xác Nhận'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
