import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  Paperclip, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Eye, 
  FileText, 
  Link2, 
  Copy, 
  Check, 
  ChevronDown,
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { EmailTemplate, CommunicationLanguage } from '../../types/quotationCommunication';
import { getEmailTemplates, renderEmailTemplate, validateTemplateVariables } from '../../services/quotation/emailTemplateService';
import { createQuotationSecureLink } from '../../services/quotation/quotationSecurityService';
import { dispatchQuotationEmail, validateQuotationEligibleForSend } from '../../services/quotation/quotationCommunicationService';
import { ALLOWED_EMAIL_VARIABLES } from '../../data/defaultEmailTemplates';

interface SendQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  documents: QuotationDocumentRecord[];
  onApproveQuote?: () => void;
  onSuccess?: (message: string) => void;
}

export const SendQuotationModal: React.FC<SendQuotationModalProps> = ({
  isOpen,
  onClose,
  quote,
  documents,
  onApproveQuote,
  onSuccess
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [language, setLanguage] = useState<CommunicationLanguage>('vi');
  
  // Recipients
  const [toEmails, setToEmails] = useState<string>(quote.customer.email || '');
  const [ccEmails, setCcEmails] = useState<string>('');
  const [bccEmails, setBccEmails] = useState<string>(quote.company.salesRepEmail || '');
  const [showCcBcc, setShowCcBcc] = useState<boolean>(false);

  // Email content
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');

  // Attachments & Document selection
  // Filter for Customer Quotation documents only
  const customerDocs = documents.filter(d => d.documentType === 'CUSTOMER_QUOTATION' && d.status === 'ACTIVE');
  const [selectedDocId, setSelectedDocId] = useState<string>(customerDocs[0]?.id || '');
  const [includePdfAttachment, setIncludePdfAttachment] = useState<boolean>(true);

  // Secure Link Configuration
  const [includeSecureLink, setIncludeSecureLink] = useState<boolean>(true);
  const [expirationDays, setExpirationDays] = useState<number>(7);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  // Preview & sending states
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Find active document
  const selectedDoc = customerDocs.find(d => d.id === selectedDocId) || customerDocs[0] || null;

  // Validation
  const isApproved = ['APPROVED', 'ISSUED', 'SENT'].includes(quote.status);
  const eligibility = validateQuotationEligibleForSend(quote, selectedDoc);

  // Load templates on mount or language change
  useEffect(() => {
    async function load() {
      const allTemplates = await getEmailTemplates();
      setTemplates(allTemplates);
      
      const filtered = allTemplates.filter(t => t.type === 'QUOTATION_SEND' && t.language === language && t.active);
      const activeTemplate = filtered.find(t => t.isDefault) || filtered[0];

      if (activeTemplate) {
        setSelectedTemplateId(activeTemplate.id);
        applyTemplate(activeTemplate);
      }
    }
    if (isOpen) {
      load();
      setToEmails(quote.customer.email || '');
      setBccEmails(quote.company.salesRepEmail || '');
      setErrorMessage(null);
    }
  }, [isOpen, language, quote]);

  // Update selected doc if documents list changes
  useEffect(() => {
    if (customerDocs.length > 0 && !selectedDocId) {
      setSelectedDocId(customerDocs[0].id);
    }
  }, [customerDocs, selectedDocId]);

  const applyTemplate = (tmpl: EmailTemplate) => {
    const renderedSubj = renderEmailTemplate(tmpl.subject, {
      quote,
      document: selectedDoc,
      secureLinkUrl: '{{documentLink}}',
      revisionNumber: selectedDoc?.revision || 1
    });

    const renderedBody = renderEmailTemplate(tmpl.body, {
      quote,
      document: selectedDoc,
      secureLinkUrl: '{{documentLink}}',
      revisionNumber: selectedDoc?.revision || 1
    });

    setSubject(renderedSubj);
    setBodyHtml(renderedBody);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmplId = e.target.value;
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      applyTemplate(tmpl);
    }
  };

  const handleInsertVariable = (variableTag: string) => {
    setBodyHtml(prev => prev + ` ${variableTag} `);
  };

  const handleSend = async () => {
    setErrorMessage(null);

    if (!isApproved) {
      setErrorMessage('Quotation must be approved before sending. (Vui lòng phê duyệt báo giá trước khi gửi).');
      return;
    }

    if (!selectedDoc) {
      setErrorMessage('Chưa có tệp PDF Báo Giá Khách Hàng nào được tạo. Vui lòng bấm tạo PDF trước.');
      return;
    }

    if (!toEmails.trim() || !toEmails.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email người nhận hợp lệ.');
      return;
    }

    setIsSending(true);

    try {
      let secureLinkUrl: string | undefined = undefined;
      let secureLinkId: string | undefined = undefined;

      // Create secure link if enabled
      if (includeSecureLink && selectedDoc) {
        const linkResult = await createQuotationSecureLink({
          quotationId: quote.id,
          quotationNumber: quote.quoteNumber,
          revision: selectedDoc.revision,
          documentId: selectedDoc.id,
          customerName: quote.customer.companyName || quote.customer.customerName,
          customerEmail: toEmails.split(',')[0].trim(),
          language,
          expirationDays,
          createdBy: quote.company.salesRepName || 'Sales Rep',
        });
        secureLinkUrl = linkResult.shareableUrl;
        secureLinkId = linkResult.linkRecord.id;
        setCreatedShareUrl(secureLinkUrl);
      }

      // Final body interpolation with real secure link url
      let finalBodyHtml = bodyHtml;
      if (secureLinkUrl) {
        finalBodyHtml = finalBodyHtml.split('{{documentLink}}').join(secureLinkUrl);
      } else {
        finalBodyHtml = finalBodyHtml.split('{{documentLink}}').join('#');
      }

      const recipientsList = toEmails.split(',').map(e => e.trim()).filter(e => e);
      const ccList = ccEmails ? ccEmails.split(',').map(e => e.trim()).filter(e => e) : [];
      const bccList = bccEmails ? bccEmails.split(',').map(e => e.trim()).filter(e => e) : [];

      const result = await dispatchQuotationEmail({
        quote,
        document: selectedDoc,
        recipients: recipientsList,
        cc: ccList,
        bcc: bccList,
        subject,
        bodyHtml: finalBodyHtml,
        secureLinkId,
        secureLinkUrl,
        language,
        sentBy: quote.company.salesRepEmail || 'sales@logiquote.com',
        sentByName: quote.company.salesRepName || 'Sales Representative',
        templateId: selectedTemplateId,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Gửi email thất bại.');
        setIsSending(false);
        return;
      }

      if (onSuccess) {
        onSuccess(`Đã gửi thành công Báo Giá ${quote.quoteNumber} đến ${recipientsList.join(', ')}`);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi gửi email báo giá.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (createdShareUrl) {
      navigator.clipboard.writeText(createdShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Executive Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Mail className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">GỬI BÁO GIÁ CHO KHÁCH HÀNG (DISPATCH QUOTATION)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  {quote.quoteNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Gửi bảng cước và tài liệu PDF chính thức kèm liên kết xác nhận trực tuyến an toàn.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Warning Banner if Not Approved */}
        {!isApproved && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm text-amber-900">Báo Giá Chưa Được Phê Duyệt (Unapproved Quotation)</p>
                <p className="text-amber-700 mt-0.5">
                  Theo quy trình Freight Forwarding, báo giá đang ở trạng thái <strong>{quote.status}</strong>. Báo giá bắt buộc phải được Phê duyệt trước khi gửi khách hàng để bảo vệ doanh thu & tính pháp lý.
                </p>
              </div>
            </div>

            {onApproveQuote && (
              <button
                type="button"
                onClick={onApproveQuote}
                className="shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Phê Duyệt Ngay (Approve)</span>
              </button>
            )}
          </div>
        )}

        {/* Warning if no Customer PDF generated yet */}
        {customerDocs.length === 0 && (
          <div className="bg-rose-50 border-b border-rose-200 p-3.5 px-6 flex items-center space-x-3 text-rose-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Chưa có PDF Báo Giá Khách Hàng:</strong> Hệ thống chưa tìm thấy tệp PDF Customer Quotation nào cho báo giá này. Vui lòng tạo PDF ở mục <em>"Xuất PDF Báo Giá"</em> trước khi gửi.
            </span>
          </div>
        )}

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Top Config Row: Language, Template, Document Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Language */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ngôn Ngữ Email / Language:
              </label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`flex-1 py-1.5 font-bold text-xs transition-colors ${language === 'vi' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-1.5 font-bold text-xs transition-colors ${language === 'en' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Email Template Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Mẫu Email (Template):
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {templates.filter(t => t.language === language).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* PDF Document Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Tài Liệu Đính Kèm:</span>
                <span className="text-[10px] text-emerald-600 font-bold">Khách Hàng Only</span>
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {customerDocs.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fileName} (Rev {d.revision})
                  </option>
                ))}
                {customerDocs.length === 0 && (
                  <option value="">Chưa có PDF Customer Quotation</option>
                )}
              </select>
            </div>
          </div>

          {/* Recipients Section */}
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Gửi Đến (To) *:
                </label>
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-blue-700 hover:text-blue-800 text-[11px] font-bold"
                >
                  {showCcBcc ? 'Thu gọn CC / BCC' : '+ Thêm CC / BCC'}
                </button>
              </div>
              <input
                type="text"
                value={toEmails}
                onChange={(e) => setToEmails(e.target.value)}
                placeholder="customer@company.com (phân tách nhiều email bằng dấu phẩy)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {showCcBcc && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Đồng kính gửi (CC):
                  </label>
                  <input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="pricing@logistics.com, ops@logistics.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    BCC (Ẩn danh):
                  </label>
                  <input
                    type="text"
                    value={bccEmails}
                    onChange={(e) => setBccEmails(e.target.value)}
                    placeholder="crm@company.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tiêu Đề Thư (Subject) *:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Báo giá cước vận chuyển..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          {/* Email Body & Variables Toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nội Dung Email (Message Body):
              </label>
              
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="flex items-center space-x-1 text-xs font-bold text-indigo-700 hover:text-indigo-800"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewMode ? 'Chỉnh Sửa (Edit)' : 'Xem Trước Trực Quan (Live Preview)'}</span>
              </button>
            </div>

            {/* Variable Tags Selector */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Chèn Biến:</span>
              {ALLOWED_EMAIL_VARIABLES.slice(0, 8).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(v)}
                  className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-[10px] font-mono font-medium text-slate-600 transition-colors"
                  title={`Chèn biến ${v} vào nội dung email`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Editor or Preview */}
            {isPreviewMode ? (
              <div 
                className="w-full h-64 p-4 rounded-xl border border-slate-300 bg-white overflow-y-auto prose prose-sm text-slate-800 leading-relaxed shadow-inner"
                dangerouslySetInnerHTML={{ 
                  __html: renderEmailTemplate(bodyHtml, {
                    quote,
                    document: selectedDoc,
                    secureLinkUrl: 'https://app.logiquote.com/q/demo-token-preview',
                    revisionNumber: selectedDoc?.revision || 1
                  }) 
                }}
              />
            ) : (
              <textarea
                rows={9}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-800 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                placeholder="Nhập nội dung thư hoặc chọn mẫu từ danh sách..."
              />
            )}
          </div>

          {/* Attachments & Secure Link Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* PDF Attachment Option */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
              <input
                type="checkbox"
                id="checkPdf"
                checked={includePdfAttachment}
                onChange={(e) => setIncludePdfAttachment(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="checkPdf" className="font-bold text-slate-800 cursor-pointer flex items-center space-x-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đính Kèm Tệp PDF Báo Giá Chính Thức</span>
                </label>
                {selectedDoc ? (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{selectedDoc.fileName} ({(selectedDoc.fileSizeBytes ? Math.round(selectedDoc.fileSizeBytes / 1024) : 120)} KB)</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-600 mt-0.5">Chưa có tệp PDF nào được chọn</p>
                )}
              </div>
            </div>

            {/* Secure Link Option */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-start space-x-3">
              <input
                type="checkbox"
                id="checkSecureLink"
                checked={includeSecureLink}
                onChange={(e) => setIncludeSecureLink(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="checkSecureLink" className="font-bold text-slate-800 cursor-pointer flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Kèm Liên Kết Báo Giá Trực Tuyến Bảo Mật</span>
                </label>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[10px] text-slate-500">Thời hạn:</span>
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    disabled={!includeSecureLink}
                    className="px-2 py-0.5 rounded border border-blue-200 bg-white text-[11px] font-semibold text-slate-700"
                  >
                    <option value={1}>1 Ngày</option>
                    <option value={3}>3 Ngày</option>
                    <option value={7}>7 Ngày (Chuẩn)</option>
                    <option value={14}>14 Ngày</option>
                    <option value={30}>30 Ngày</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Security Guarantee Notice */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 text-[11px] text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Bảo Mật Tuyệt Đối (Data Confidentiality Guarantee):</strong> Hệ thống tự động kích hoạt <em>sanitizeCustomerQuotationData()</em> để loại bỏ 100% giá vốn (buy cost), biên lợi nhuận (margin), nhà cung cấp (supplier), và ghi chú nội bộ trước khi gửi.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-500 text-[11px]">
            {isApproved ? (
              <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Báo giá đủ điều kiện gửi (Status: {quote.status})</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cần phê duyệt báo giá trước khi bấm gửi</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors text-xs"
            >
              Hủy Bỏ (Cancel)
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !isApproved || customerDocs.length === 0}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
                isSending || !isApproved || customerDocs.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800 hover:shadow-lg active:scale-95'
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Gửi Báo Giá...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Khách Hàng (Send Quotation)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
