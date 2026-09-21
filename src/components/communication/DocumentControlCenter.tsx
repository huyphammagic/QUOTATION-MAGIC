import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, 
  FileText, 
  Download, 
  UploadCloud, 
  Mail, 
  Send, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Archive, 
  RotateCcw, 
  Lock, 
  Unlock, 
  FileCheck, 
  FilePlus, 
  Share2, 
  HardDrive, 
  Building2, 
  User, 
  Calendar, 
  ChevronRight, 
  Activity, 
  Database,
  X,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { 
  QuotationDocumentRecord, 
  QuotationDocumentType, 
  DocumentVisibility, 
  QuotationAuditLog 
} from '../../types/quotationDocument';
import { 
  QuotationCommunication, 
  QuotationSecureLinkRecord 
} from '../../types/quotationCommunication';
import { 
  getCompanyQuotationDocuments, 
  uploadSupportingDocument, 
  updateDocumentVisibility, 
  toggleDocumentArchive, 
  checkDocumentsIntegrity,
  getQuotationAuditLogs 
} from '../../services/quotation/quotationDocumentService';
import { 
  getCompanyCommunications, 
  retryQuotationEmail, 
  checkCommunicationIntegrity 
} from '../../services/quotation/quotationCommunicationService';
import { getSecureLinksForQuotation } from '../../services/quotation/quotationSecurityService';
import { formatUSD, formatVND } from '../../utils/formatters';

interface DocumentControlCenterProps {
  quote?: QuoteData;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenGeneratePdf?: () => void;
  onOpenSendEmail?: () => void;
  onOpenPortalPreview?: (token: string) => void;
  companyId?: string;
  isStandalonePage?: boolean;
}

export const DocumentControlCenter: React.FC<DocumentControlCenterProps> = ({
  quote,
  isOpen = true,
  onClose,
  onOpenGeneratePdf,
  onOpenSendEmail,
  onOpenPortalPreview,
  companyId = 'default-company',
  isStandalonePage = false,
}) => {
  // Tabs: 'DOCUMENTS' | 'COMMUNICATIONS' | 'PORTAL' | 'INTEGRITY'
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'COMMUNICATIONS' | 'PORTAL' | 'INTEGRITY'>('DOCUMENTS');
  
  // Scope filter: 'CURRENT_QUOTE' | 'ALL_COMPANY'
  const [scope, setScope] = useState<'CURRENT_QUOTE' | 'ALL_COMPANY'>(quote ? 'CURRENT_QUOTE' : 'ALL_COMPANY');

  // Data states
  const [documents, setDocuments] = useState<QuotationDocumentRecord[]>([]);
  const [communications, setCommunications] = useState<QuotationCommunication[]>([]);
  const [secureLinks, setSecureLinks] = useState<QuotationSecureLinkRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<QuotationAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');

  // Submodals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [inspectDoc, setInspectDoc] = useState<QuotationDocumentRecord | null>(null);
  const [inspectEmail, setInspectEmail] = useState<QuotationCommunication | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [actionErrorMsg, setActionErrorMsg] = useState<string>('');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<QuotationDocumentType>('COMMERCIAL_INVOICE');
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('CUSTOMER_VISIBLE');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Integrity Check State
  const [integrityDocReport, setIntegrityDocReport] = useState<any>(null);
  const [integrityCommReport, setIntegrityCommReport] = useState<any>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState<boolean>(false);

  // Copy tracking
  const [copiedLinkToken, setCopiedLinkToken] = useState<string | null>(null);

  const effectiveCompanyId = quote?.company?.companyId || companyId || 'default-company';
  const effectiveQuoteId = scope === 'CURRENT_QUOTE' && quote ? quote.id : undefined;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(''), 4500);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(''), 4500);
    }
  };

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, comms, audits] = await Promise.all([
        getCompanyQuotationDocuments(effectiveCompanyId, effectiveQuoteId),
        getCompanyCommunications(effectiveCompanyId, effectiveQuoteId),
        getQuotationAuditLogs(effectiveQuoteId),
      ]);

      setDocuments(docs);
      setCommunications(comms);
      setAuditLogs(audits);

      if (effectiveQuoteId) {
        const links = await getSecureLinksForQuotation(effectiveQuoteId);
        setSecureLinks(links);
      } else {
        setSecureLinks([]);
      }
    } catch (err: any) {
      console.error('DocumentControlCenter load error:', err);
      showNotification('Không thể tải dữ liệu trung tâm tài liệu.', true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, scope, quote?.id]);

  // Run initial integrity check on integrity tab click
  const handleRunIntegrityAudit = async () => {
    setIsCheckingIntegrity(true);
    try {
      const [dRep, cRep] = await Promise.all([
        checkDocumentsIntegrity(effectiveCompanyId),
        checkCommunicationIntegrity(effectiveCompanyId),
      ]);
      setIntegrityDocReport(dRep);
      setIntegrityCommReport(cRep);
      showNotification('Đã hoàn tất kiểm tra tính toàn vẹn hệ thống!');
    } catch (e: any) {
      showNotification('Lỗi khi kiểm tra tính toàn vẹn: ' + e.message, true);
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  // Upload handler
  const handleUploadSupportingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification('Vui lòng chọn một tệp tài liệu để tải lên.', true);
      return;
    }

    setIsUploading(true);
    try {
      await uploadSupportingDocument({
        companyId: effectiveCompanyId,
        quotationId: quote?.id || 'GENERAL',
        quotationNumber: quote?.quoteNumber || 'GENERAL',
        file: uploadFile,
        documentType: uploadDocType,
        visibility: uploadVisibility,
        uploadedBy: quote?.company?.salesRepName || 'User',
        notes: uploadNotes,
        customerName: quote?.customer?.companyName || quote?.customer?.customerName,
        customerId: quote?.customer?.id,
      });

      showNotification(`Tải lên tài liệu ${uploadFile.name} thành công!`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadNotes('');
      loadData();
    } catch (err: any) {
      showNotification('Lỗi tải tệp: ' + err.message, true);
    } finally {
      setIsUploading(false);
    }
  };

  // Visibility toggle
  const handleToggleVisibility = async (docId: string, currentVis: DocumentVisibility) => {
    const nextVis: DocumentVisibility = currentVis === 'CUSTOMER_VISIBLE' ? 'INTERNAL' : 'CUSTOMER_VISIBLE';
    try {
      await updateDocumentVisibility(docId, nextVis, quote?.company?.salesRepName || 'User');
      showNotification(`Đã cập nhật quyền truy cập sang: ${nextVis === 'CUSTOMER_VISIBLE' ? 'Khách Hàng Xem Được' : 'Chỉ Nội Bộ'}`);
      loadData();
    } catch (e: any) {
      showNotification('Lỗi cập nhật quyền: ' + e.message, true);
    }
  };

  // Archive / Restore toggle
  const handleToggleArchive = async (docId: string, isArchived: boolean) => {
    try {
      await toggleDocumentArchive(docId, !isArchived, quote?.company?.salesRepName || 'User');
      showNotification(isArchived ? 'Đã khôi phục tài liệu!' : 'Đã chuyển tài liệu vào kho lưu trữ!');
      loadData();
    } catch (e: any) {
      showNotification('Lỗi thao tác lưu trữ: ' + e.message, true);
    }
  };

  // Email retry
  const handleRetryEmail = async (commId: string) => {
    try {
      const res = await retryQuotationEmail(commId, quote?.company?.salesRepName || 'User');
      if (res.success) {
        showNotification('Thử lại gửi email thành công!');
      } else {
        showNotification(`Thử lại thất bại: ${res.error}`, true);
      }
      loadData();
    } catch (e: any) {
      showNotification('Lỗi kết nối khi gửi lại email: ' + e.message, true);
    }
  };

  // Copy link
  const handleCopyLink = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkToken(token);
    setTimeout(() => setCopiedLinkToken(null), 2500);
    showNotification('Đã sao chép liên kết vào bộ nhớ tạm!');
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = 
        d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.quotationNumber && d.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.customerName && d.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.generatedBy && d.generatedBy.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === 'ALL' || d.documentType === typeFilter;
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'CURRENT' ? (d.isCurrent !== false && d.status !== 'ARCHIVED') :
        statusFilter === 'SUPERSEDED' ? (d.status === 'SUPERSEDED' || d.isCurrent === false) :
        statusFilter === 'ARCHIVED' ? (d.status === 'ARCHIVED') : true;

      const matchesVisibility = visibilityFilter === 'ALL' || d.visibility === visibilityFilter;

      return matchesSearch && matchesType && matchesStatus && matchesVisibility;
    });
  }, [documents, searchTerm, typeFilter, statusFilter, visibilityFilter]);

  // Filtered communications
  const filteredCommunications = useMemo(() => {
    return communications.filter(c => {
      const matchesSearch = 
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.recipients.some(r => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.quotationNumber && c.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [communications, searchTerm]);

  // Metrics
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const currentDocs = documents.filter(d => d.isCurrent !== false && d.status !== 'ARCHIVED').length;
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
    const sizeFormatted = totalBytes > 1024 * 1024 
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB` 
      : `${(totalBytes / 1024).toFixed(1)} KB`;

    const totalEmails = communications.length;
    const deliveredEmails = communications.filter(c => c.status === 'DELIVERED' || c.status === 'OPENED' || c.status === 'SENT').length;
    const deliveryRate = totalEmails > 0 ? Math.round((deliveredEmails / totalEmails) * 100) : 100;

    return {
      totalDocs,
      currentDocs,
      sizeFormatted,
      totalEmails,
      deliveryRate,
      portalLinks: secureLinks.length,
    };
  }, [documents, communications, secureLinks]);

  const getDocTypeBadge = (type: QuotationDocumentType) => {
    switch (type) {
      case 'CUSTOMER_QUOTATION':
      case 'OFFICIAL_QUOTATION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Báo Giá Chính Thức</span>;
      case 'INTERNAL_QUOTATION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Báo Giá Nội Bộ</span>;
      case 'PROFORMA_INVOICE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Proforma Invoice</span>;
      case 'COMMERCIAL_INVOICE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Hóa Đơn TM (CI)</span>;
      case 'PACKING_LIST':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">Phiếu Đóng Gói (PL)</span>;
      case 'BILL_OF_LADING':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">Vận Đơn (B/L)</span>;
      case 'CONTRACT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Hợp Đồng</span>;
      case 'CUSTOMS_DECLARATION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">Tờ Khai HQ</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Tài Liệu Đính Kèm</span>;
    }
  };

  const getStatusBadge = (doc: QuotationDocumentRecord) => {
    if (doc.status === 'ARCHIVED') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1"><Archive className="w-3 h-3" /> Đã Lưu Trữ</span>;
    }
    if (doc.status === 'SUPERSEDED' || doc.isCurrent === false) {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Bản Cũ (Superseded)</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hiện Hành (Active)</span>;
  };

  const getVisibilityBadge = (visibility?: DocumentVisibility) => {
    if (visibility === 'INTERNAL') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1"><Lock className="w-3 h-3 text-slate-500" /> Nội Bộ</span>;
    }
    if (visibility === 'SUPPLIER_VISIBLE') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><Building2 className="w-3 h-3" /> Nhà Cung Cấp</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><Eye className="w-3 h-3 text-teal-600" /> Khách Hàng Xem</span>;
  };

  const getCommStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Khách Đã Duyệt</span>;
      case 'OPENED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Đã Mở Xem</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Đã Phát Tới Hộp Thư</span>;
      case 'SENT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Đã Gửi Đi</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Thất Bại</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  if (!isOpen && !isStandalonePage) return null;

  return (
    <div className={`${isStandalonePage ? 'min-h-screen bg-slate-50 py-8 px-4 sm:px-6' : 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto'}`}>
      <div className={`bg-white text-slate-900 rounded-2xl shadow-2xl w-full ${isStandalonePage ? 'max-w-7xl mx-auto' : 'max-w-6xl max-h-[94vh]'} flex flex-col border border-slate-200 overflow-hidden`}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Trung Tâm Quản Lý Tài Liệu & Giao Tiếp</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">Phase 40 Control Center</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {quote ? `Báo giá: ${quote.quoteNumber} | Khách hàng: ${quote.customer?.companyName || quote.customer?.customerName || 'N/A'}` : 'Tập trung toàn bộ ấn bản PDF, phụ lục đính kèm, email & cổng tương tác'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setIsRefreshing(true); loadData(); }}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            {!isStandalonePage && onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications Bar */}
        {actionSuccessMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900"><X className="w-4 h-4" /></button>
          </div>
        )}
        {actionErrorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg('')} className="text-rose-700 hover:text-rose-900"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Top KPIs Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-5 h-5" /></div>
            <div>
              <div className="text-slate-500 font-medium">Tổng Tài Liệu / Dung Lượng</div>
              <div className="text-base font-bold text-slate-900">{stats.totalDocs} file <span className="text-xs font-normal text-slate-500">({stats.sizeFormatted})</span></div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-slate-500 font-medium">Bản Hiện Hành (Active)</div>
              <div className="text-base font-bold text-emerald-700">{stats.currentDocs} <span className="text-xs font-normal text-slate-500">/ {stats.totalDocs} bản</span></div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Mail className="w-5 h-5" /></div>
            <div>
              <div className="text-slate-500 font-medium">Email / Tỷ Lệ Phát Tới</div>
              <div className="text-base font-bold text-purple-900">{stats.totalEmails} lần <span className="text-xs font-normal text-purple-700">({stats.deliveryRate}% ok)</span></div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-slate-500 font-medium">Cổng Khách Hàng / Toàn Vẹn</div>
              <div className="text-base font-bold text-teal-800">{stats.portalLinks} link <span className="text-xs font-normal text-teal-600">(Đã bảo mật)</span></div>
            </div>
          </div>
        </div>

        {/* Tab Selection and Action Bar */}
        <div className="px-6 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('DOCUMENTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'DOCUMENTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Kho Tài Liệu & Phụ Lục ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('COMMUNICATIONS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'COMMUNICATIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Nhật Ký Gửi & Tương Tác ({communications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PORTAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'PORTAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Cổng Tra Cứu Khách Hàng</span>
            </button>
            <button
              onClick={() => { setActiveTab('INTEGRITY'); handleRunIntegrityAudit(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'INTEGRITY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Kiểm Tra Toàn Vẹn & Audit</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {quote && (
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setScope('CURRENT_QUOTE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    scope === 'CURRENT_QUOTE' ? 'bg-white shadow-xs text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Báo Giá Này
                </button>
                <button
                  onClick={() => setScope('ALL_COMPANY')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    scope === 'ALL_COMPANY' ? 'bg-white shadow-xs text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toàn Công Ty
                </button>
              </div>
            )}

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Tải Lên Phụ Lục</span>
            </button>

            {onOpenGeneratePdf && (
              <button
                onClick={onOpenGeneratePdf}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Tạo PDF Mới</span>
              </button>
            )}

            {onOpenSendEmail && (
              <button
                onClick={onOpenSendEmail}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Email Khách</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar (for Documents & Communications) */}
        {(activeTab === 'DOCUMENTS' || activeTab === 'COMMUNICATIONS') && (
          <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'DOCUMENTS' ? "Tìm theo tên file, số báo giá, khách hàng..." : "Tìm email, người nhận, tiêu đề..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {activeTab === 'DOCUMENTS' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">Tất Cả Loại Tài Liệu</option>
                  <option value="OFFICIAL_QUOTATION">Báo Giá Chính Thức</option>
                  <option value="INTERNAL_QUOTATION">Báo Giá Nội Bộ</option>
                  <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                  <option value="COMMERCIAL_INVOICE">Hóa Đơn Thương Mại (CI)</option>
                  <option value="PACKING_LIST">Phiếu Đóng Gói (PL)</option>
                  <option value="BILL_OF_LADING">Vận Đơn (B/L)</option>
                  <option value="CONTRACT">Hợp Đồng</option>
                  <option value="CUSTOMS_DECLARATION">Tờ Khai Hải Quan</option>
                  <option value="OTHER_ATTACHMENT">Phụ Lục Khác</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">Tất Cả Phiên Bản</option>
                  <option value="CURRENT">Chỉ Bản Hiện Hành (Active)</option>
                  <option value="SUPERSEDED">Bản Cũ (Superseded)</option>
                  <option value="ARCHIVED">Đã Lưu Trữ (Archived)</option>
                </select>

                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">Tất Cả Quyền Truy Cập</option>
                  <option value="CUSTOMER_VISIBLE">Khách Hàng Xem Được</option>
                  <option value="INTERNAL">Chỉ Nội Bộ</option>
                  <option value="SUPPLIER_VISIBLE">Nhà Cung Cấp</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p className="text-sm font-medium">Đang tải trung tâm tài liệu & dữ liệu giao tiếp...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: KHO TÀI LIỆU & PHỤ LỤC */}
              {activeTab === 'DOCUMENTS' && (
                <div>
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-800">Chưa có tài liệu hoặc tệp đính kèm nào</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Tạo bản in PDF báo giá hoặc nhấn nút "Tải Lên Phụ Lục" để thêm hóa đơn thương mại, packing list, hợp đồng hoặc chứng từ đính kèm.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                        >
                          Tải Lên Ngay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="py-3 px-4">Tệp & Ấn Bản</th>
                            <th className="py-3 px-4">Báo Giá / Thực Thể</th>
                            <th className="py-3 px-4">Loại Tài Liệu</th>
                            <th className="py-3 px-4">Quyền Xem</th>
                            <th className="py-3 px-4">Trạng Thái Bản</th>
                            <th className="py-3 px-4">Dung Lượng</th>
                            <th className="py-3 px-4">Ngày Tạo / Bởi</th>
                            <th className="py-3 px-4 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDocuments.map((docItem) => {
                            const isPdf = docItem.fileName.toLowerCase().endsWith('.pdf');
                            const isCurrent = docItem.isCurrent !== false && docItem.status !== 'ARCHIVED';
                            const isArchived = docItem.status === 'ARCHIVED';

                            return (
                              <tr key={docItem.id} className={`hover:bg-slate-50/80 transition-colors ${!isCurrent ? 'bg-slate-50/40 text-slate-500' : ''}`}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2.5">
                                    <div className={`p-2 rounded-lg shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        <span>{docItem.fileName}</span>
                                        {docItem.revision && (
                                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-200 text-slate-800">
                                            Rev {docItem.revision}
                                          </span>
                                        )}
                                      </div>
                                      {docItem.notes && (
                                        <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">{docItem.notes}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-medium text-slate-800">{docItem.quotationNumber || 'N/A'}</div>
                                  <div className="text-[11px] text-slate-500">{docItem.customerName || 'N/A'}</div>
                                </td>

                                <td className="py-3 px-4">
                                  {getDocTypeBadge(docItem.documentType)}
                                </td>

                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleToggleVisibility(docItem.id, docItem.visibility || 'CUSTOMER_VISIBLE')}
                                    title="Nhấn để đổi quyền truy cập"
                                    className="cursor-pointer transition-transform active:scale-95 text-left"
                                  >
                                    {getVisibilityBadge(docItem.visibility)}
                                  </button>
                                </td>

                                <td className="py-3 px-4">
                                  {getStatusBadge(docItem)}
                                </td>

                                <td className="py-3 px-4 text-slate-600 font-mono">
                                  {docItem.fileSizeBytes 
                                    ? docItem.fileSizeBytes > 1024 * 1024 
                                      ? `${(docItem.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                      : `${(docItem.fileSizeBytes / 1024).toFixed(0)} KB`
                                    : 'N/A'}
                                </td>

                                <td className="py-3 px-4 text-slate-500">
                                  <div>{new Date(docItem.generatedAt).toLocaleDateString('vi-VN')}</div>
                                  <div className="text-[11px] text-slate-400">{docItem.generatedBy}</div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    {/* Direct Download */}
                                    {docItem.downloadUrl && (
                                      <a
                                        href={docItem.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={docItem.fileName}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Tải về tệp gốc"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    )}

                                    {/* Inspect Snapshot */}
                                    <button
                                      onClick={() => setInspectDoc(docItem)}
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                                      title="Xem chi tiết snapshot dữ liệu"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Archive / Restore */}
                                    <button
                                      onClick={() => handleToggleArchive(docItem.id, isArchived)}
                                      className={`p-1.5 rounded-md transition-colors ${
                                        isArchived ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                      }`}
                                      title={isArchived ? "Khôi phục tài liệu" : "Lưu trữ tài liệu"}
                                    >
                                      {isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: NHẬT KÝ GỬI & TƯƠNG TÁC */}
              {activeTab === 'COMMUNICATIONS' && (
                <div>
                  {filteredCommunications.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-800">Chưa có lịch sử gửi email hoặc giao tiếp nào</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Khi gửi báo giá cho khách hàng qua hệ thống, nhật ký gửi, tệp đính kèm và hành vi xem thư của khách hàng sẽ tự động ghi lại tại đây.
                      </p>
                      {onOpenSendEmail && (
                        <div className="mt-4">
                          <button
                            onClick={onOpenSendEmail}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                          >
                            Gửi Email Báo Giá Đầu Tiên
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCommunications.map((comm) => (
                        <div key={comm.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{comm.quotationNumber}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-600 font-medium">Đến: {comm.recipients.join(', ')}</span>
                              {comm.cc && comm.cc.length > 0 && (
                                <span className="text-slate-400 text-[11px]">(CC: {comm.cc.join(', ')})</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {getCommStatusBadge(comm.status)}
                              <span className="text-slate-400 text-[11px]">
                                {new Date(comm.sentAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{comm.subject}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {comm.attachmentSnapshot && comm.attachmentSnapshot.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs transition-colors border border-slate-200"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{att.fileName}</span>
                                    <Download className="w-3 h-3 text-slate-400" />
                                  </a>
                                ))}

                                {comm.secureLinkUrl && (
                                  <button
                                    onClick={() => onOpenPortalPreview && comm.secureLinkId ? onOpenPortalPreview(comm.secureLinkId) : window.open(comm.secureLinkUrl, '_blank')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs transition-colors border border-teal-200"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Cổng Tra Cứu Khách Hàng</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {comm.status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetryEmail(comm.id)}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Thử Lại Gửi</span>
                                </button>
                              )}

                              <button
                                onClick={() => setInspectEmail(comm)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem Nội Dung Thư</span>
                              </button>
                            </div>
                          </div>

                          {comm.failureReason && (
                            <div className="mt-2.5 p-2 bg-rose-50 rounded-md border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Lý do lỗi: {comm.failureReason} (Đã thử {comm.attemptCount || 1} lần)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CỔNG KHÁCH HÀNG */}
              {activeTab === 'PORTAL' && (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-teal-950">Cổng Tra Cứu Báo Giá Trực Tuyến Dành Cho Khách Hàng</h4>
                      <p className="mt-1 text-teal-800">
                        Khách hàng có thể truy cập liên kết mã hóa bảo mật để xem báo giá chính thức, tải file PDF snapshot gốc, phản hồi đồng ý hoặc yêu cầu thương lượng giá trực tiếp trên trình duyệt mà không cần cài đặt phần mềm.
                      </p>
                    </div>
                  </div>

                  {secureLinks.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Share2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-slate-800">Chưa có liên kết bảo mật nào được phát hành</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Liên kết bảo mật sẽ tự động tạo khi bạn gửi email báo giá có kích hoạt tùy chọn "Tạo link tra cứu bảo mật".
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {secureLinks.map((link) => {
                        const isExpired = new Date(link.expiresAt).getTime() < Date.now();
                        const portalUrl = `${window.location.origin}/#portal/${link.id}`;

                        return (
                          <div key={link.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">{link.quotationNumber} (Rev {link.revision})</span>
                              {isExpired ? (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Đã Hết Hạn</span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Đang Hoạt Động</span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 space-y-1">
                              <div><span className="text-slate-400">Khách hàng:</span> {link.customerName} ({link.customerEmail})</div>
                              <div><span className="text-slate-400">Hạn truy cập:</span> {new Date(link.expiresAt).toLocaleString('vi-VN')}</div>
                              <div><span className="text-slate-400">Lượt xem:</span> {link.viewCount || 0} lần</div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => handleCopyLink(portalUrl, link.id)}
                                className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                              >
                                {copiedLinkToken === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedLinkToken === link.id ? 'Đã Sao Chép' : 'Sao Chép Link'}</span>
                              </button>

                              <button
                                onClick={() => onOpenPortalPreview ? onOpenPortalPreview(link.id) : window.open(portalUrl, '_blank')}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Mở Cổng Xem</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: KIỂM TRA TOÀN VẸN & AUDIT */}
              {activeTab === 'INTEGRITY' && (
                <div className="space-y-6">
                  {/* Integrity Diagnostic Panel */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <h4 className="font-bold text-sm">Chẩn Đoán Toàn Vẹn Hệ Thống Lưu Trữ & Giao Tiếp</h4>
                      </div>
                      <button
                        onClick={handleRunIntegrityAudit}
                        disabled={isCheckingIntegrity}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
                        <span>Chạy Chẩn Đoán Ngay</span>
                      </button>
                    </div>

                    {integrityDocReport && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-800">
                        <div className="bg-slate-800 p-2.5 rounded-lg">
                          <div className="text-slate-400">Tài liệu khả dụng</div>
                          <div className="text-lg font-bold text-emerald-400">{integrityDocReport.healthyCount} / {integrityDocReport.totalCount}</div>
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg">
                          <div className="text-slate-400">Bản cũ thay thế</div>
                          <div className="text-lg font-bold text-amber-400">{integrityDocReport.supersededCount}</div>
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg">
                          <div className="text-slate-400">Đã lưu trữ</div>
                          <div className="text-lg font-bold text-slate-300">{integrityDocReport.archivedCount}</div>
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg">
                          <div className="text-slate-400">Lỗi đường dẫn Storage</div>
                          <div className={`text-lg font-bold ${integrityDocReport.missingUrlCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {integrityDocReport.missingUrlCount}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audit Logs Table */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Nhật Ký Kiểm Toán (Audit Logs)</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="py-2.5 px-4">Thời Gian</th>
                            <th className="py-2.5 px-4">Hành Động</th>
                            <th className="py-2.5 px-4">Thực Hiện Bởi</th>
                            <th className="py-2.5 px-4">Đối Tượng</th>
                            <th className="py-2.5 px-4">Chi Tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {auditLogs.slice(0, 30).map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                {new Date(log.timestamp).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-700">{log.performedBy}</td>
                              <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{log.entityType} ({log.entityId.slice(0, 10)}...)</td>
                              <td className="py-2.5 px-4 text-slate-500 text-[11px] truncate max-w-xs">
                                {JSON.stringify(log.details)}
                              </td>
                            </tr>
                          ))}
                          {auditLogs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 italic">Chưa có nhật ký kiểm toán nào được ghi lại.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Chế độ đa công ty & Lưu trữ Firebase Cloud Storage bảo mật v1</span>
          </div>
          <div>
            {!isStandalonePage && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors shadow-xs"
              >
                Đóng
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: TẢI LÊN PHỤ LỤC TÀI LIỆU */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>Tải Lên Phụ Lục & Chứng Từ</span>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUploadSupportingDoc} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại Tài Liệu *</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as QuotationDocumentType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="COMMERCIAL_INVOICE">Hóa Đơn Thương Mại (Commercial Invoice - CI)</option>
                  <option value="PACKING_LIST">Phiếu Đóng Gói (Packing List - PL)</option>
                  <option value="BILL_OF_LADING">Vận Đơn (Bill of Lading - B/L)</option>
                  <option value="CONTRACT">Hợp Đồng Ngoại Thương / Hợp Đồng Dịch Vụ</option>
                  <option value="CUSTOMS_DECLARATION">Tờ Khai Hải Quan Thông Quan</option>
                  <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                  <option value="OTHER_ATTACHMENT">Chứng Từ & Tài Liệu Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quyền Xem Truy Cập</label>
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as DocumentVisibility)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="CUSTOMER_VISIBLE">Khách Hàng Xem Được (Hiển thị trên Cổng Khách Hàng)</option>
                  <option value="INTERNAL">Chỉ Nội Bộ Công Ty (Bảo mật nội bộ)</option>
                  <option value="SUPPLIER_VISIBLE">Nhà Cung Cấp / Hãng Tàu Xem Được</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Tệp Đính Kèm (PDF, Word, Excel, Hình Ảnh) *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer text-center transition-colors"
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  {uploadFile ? (
                    <div className="font-semibold text-blue-700 truncate">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</div>
                  ) : (
                    <>
                      <div className="font-medium text-slate-700">Bấm để chọn file hoặc kéo thả vào đây</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ PDF, DOCX, XLSX, PNG, JPG lên tới 25MB</div>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Hoặc Mô Tả</label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Ghi chú nội bộ hoặc hướng dẫn khách hàng về tài liệu này..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Tải Lên Đám Mây...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Xác Nhận Tải Lên</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT DOCUMENT SNAPSHOT */}
      {inspectDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-base">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <span>Chi Tiết Snapshot Tài Liệu (Bất Biến)</span>
              </div>
              <button onClick={() => setInspectDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><span className="text-slate-400">Tên Tệp:</span> <span className="font-semibold text-slate-900">{inspectDoc.fileName}</span></div>
                <div><span className="text-slate-400">Phiên Bản:</span> <span className="font-semibold text-slate-900">Rev {inspectDoc.revision || 1}</span></div>
                <div><span className="text-slate-400">Số Báo Giá:</span> <span className="font-semibold text-slate-900">{inspectDoc.quotationNumber}</span></div>
                <div><span className="text-slate-400">Người Tạo:</span> <span className="font-semibold text-slate-900">{inspectDoc.generatedBy}</span></div>
                <div><span className="text-slate-400">Thời Gian Tạo:</span> <span className="font-semibold text-slate-900">{new Date(inspectDoc.generatedAt).toLocaleString('vi-VN')}</span></div>
                <div><span className="text-slate-400">Trạng Thái:</span> <span className="font-semibold text-slate-900">{inspectDoc.status}</span></div>
              </div>

              {inspectDoc.snapshot && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800">Dữ Liệu Snapshot Báo Giá Lúc Phát Hành:</div>
                  <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-64">
                    <pre>{JSON.stringify(inspectDoc.snapshot, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT SENT EMAIL */}
      {inspectEmail && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-base">
                <Mail className="w-5 h-5 text-purple-600" />
                <span>Nội Dung Thư Đã Gửi Khách Hàng</span>
              </div>
              <button onClick={() => setInspectEmail(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="text-slate-400">Người gửi:</span> <span className="font-semibold text-slate-800">{inspectEmail.sentByName} ({inspectEmail.sentBy})</span></div>
                <div><span className="text-slate-400">Người nhận:</span> <span className="font-semibold text-slate-800">{inspectEmail.recipients.join(', ')}</span></div>
                {inspectEmail.cc && inspectEmail.cc.length > 0 && <div><span className="text-slate-400">CC:</span> {inspectEmail.cc.join(', ')}</div>}
                <div><span className="text-slate-400">Tiêu đề:</span> <span className="font-bold text-slate-900">{inspectEmail.subject}</span></div>
                <div><span className="text-slate-400">Thời gian:</span> {new Date(inspectEmail.sentAt).toLocaleString('vi-VN')}</div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-sans prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: inspectEmail.bodySnapshot }} />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setInspectEmail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
