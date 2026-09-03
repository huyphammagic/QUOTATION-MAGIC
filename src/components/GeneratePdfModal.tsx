import React, { useState, useEffect } from 'react';
import { QuoteData, QuoteCurrency } from '../types/logistics';
import { 
  QuotationTemplate, 
  QuotationDocumentType, 
  QuotationDocumentLanguage, 
  QuotationDocumentRecord 
} from '../types/quotationDocument';
import { 
  getQuotationTemplates, 
  generateAndSaveQuotationDocument, 
  getQuotationDocuments 
} from '../services/quotation/quotationDocumentService';
import { validateQuotationForDocumentGeneration } from '../services/quotation/quotationSanitizer';
import { 
  X, 
  FileDown, 
  ShieldCheck, 
  Lock, 
  Eye, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Coins, 
  Globe 
} from 'lucide-react';
import { formatUSD, formatVND } from '../utils/formatters';

interface GeneratePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  onDocumentGenerated?: (record: QuotationDocumentRecord) => void;
  onOpenTemplateBuilder?: () => void;
}

export const GeneratePdfModal: React.FC<GeneratePdfModalProps> = ({
  isOpen,
  onClose,
  quote,
  onDocumentGenerated,
  onOpenTemplateBuilder,
}) => {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [documentType, setDocumentType] = useState<QuotationDocumentType>('CUSTOMER_QUOTATION');
  const [language, setLanguage] = useState<QuotationDocumentLanguage>('bilingual');
  const [selectedCurrency, setSelectedCurrency] = useState<QuoteCurrency>(quote.quoteCurrency || 'USD');
  const [existingRevisionsCount, setExistingRevisionsCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<QuotationDocumentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const tmpls = await getQuotationTemplates();
      setTemplates(tmpls);
      const defaultTmpl = tmpls.find(t => t.isDefault) || tmpls[0];
      if (defaultTmpl) {
        setSelectedTemplateId(defaultTmpl.id);
      }

      const docs = await getQuotationDocuments(quote.id);
      setExistingRevisionsCount(docs.length);
      setSelectedCurrency(quote.quoteCurrency || 'USD');
      setGenerationSuccess(null);
      setErrorMessage(null);
    };
    load();
  }, [isOpen, quote]);

  if (!isOpen) return null;

  const nextRevision = existingRevisionsCount + 1;
  const validation = validateQuotationForDocumentGeneration(quote);

  const handleGenerate = async () => {
    if (!validation.isValid) {
      setErrorMessage(`Không thể xuất PDF: ${validation.errors.join(', ')}`);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // Ensure quote currency matches user selection in modal
      const quoteWithCurrency: QuoteData = {
        ...quote,
        quoteCurrency: selectedCurrency,
      };

      const { record } = await generateAndSaveQuotationDocument({
        quote: quoteWithCurrency,
        templateId: selectedTemplateId,
        documentType,
        language,
        companyId: 'default',
        generatedBy: quote.company?.salesRepName || 'Sales Representative',
        autoDownload: true,
      });

      setGenerationSuccess(record);
      onDocumentGenerated?.(record);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi tạo và lưu file PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Phát Hành & Xuất File PDF Báo Giá Chính Thức</h3>
              <p className="text-xs text-slate-400">Tạo bản snapshot thương mại bất biến, render PDF A4 chuẩn quốc tế</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Generation Success Screen */}
          {generationSuccess ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-emerald-900">Phát Hành PDF Thành Công!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  File đã được tự động tải về máy tính và lưu trữ an toàn trên hệ thống.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200 text-left text-xs space-y-1.5 font-mono">
                <div><strong>Tên File:</strong> {generationSuccess.fileName}</div>
                <div><strong>Phiên Bản:</strong> Rev {String(generationSuccess.revision).padStart(2, '0')}</div>
                <div><strong>Mẫu Template:</strong> {generationSuccess.templateName}</div>
                <div><strong>Tiền Tệ:</strong> {generationSuccess.currency}</div>
                <div><strong>Dung Lượng:</strong> {(generationSuccess.fileSizeBytes / 1024).toFixed(1)} KB ({generationSuccess.pageCount} trang)</div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Hoàn Tất
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Pre-flight Warnings / Errors */}
              {validation.errors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Không thể tạo PDF do thiếu thông tin:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                    {validation.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && validation.errors.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-0.5">
                  <div className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lưu ý kiểm tra trước khi xuất:</span>
                  </div>
                  {validation.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] pl-4">• {w}</p>
                  ))}
                </div>
              )}

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  1. Mục Đích Xuất Bản (Document Purpose)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Customer Quotation */}
                  <div 
                    onClick={() => setDocumentType('CUSTOMER_QUOTATION')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      documentType === 'CUSTOMER_QUOTATION'
                        ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Báo Giá Gửi Khách Hàng</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Bản chính thức gửi khách. Tuyệt đối không để lộ giá vốn, lợi nhuận hoặc margin.
                    </p>
                    <span className="mt-2 inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Bảo mật giá vốn 100%
                    </span>
                  </div>

                  {/* Internal Costing Sheet */}
                  <div 
                    onClick={() => setDocumentType('INTERNAL_QUOTATION')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      documentType === 'INTERNAL_QUOTATION'
                        ? 'bg-rose-50/70 border-rose-500 shadow-sm ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Bản Dự Toán Nội Bộ</span>
                      <Lock className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dành cho Trưởng phòng / Giám đốc duyệt giá: Hiển thị giá vốn, doanh thu, lãi gộp & margin.
                    </p>
                    <span className="mt-2 inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                      Nội bộ & Giám sát chi phí
                    </span>
                  </div>

                </div>
              </div>

              {/* Template & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Template Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Mẫu Báo Giá (Template)
                    </label>
                    {onOpenTemplateBuilder && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onOpenTemplateBuilder(); }}
                        className="text-[11px] font-bold text-cyan-700 hover:underline"
                      >
                        Tùy Biến Mẫu
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? '★ (Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                {/* Language Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    3. Ngôn Ngữ Văn Bản
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as QuotationDocumentLanguage)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="bilingual">Song ngữ Anh - Việt (Bilingual Standard)</option>
                    <option value="en">English (Chỉ Tiếng Anh cho đối tác ngoại)</option>
                    <option value="vi">Tiếng Việt (Báo giá nội địa)</option>
                  </select>
                </div>

              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  4. Tiền Tệ Hiển Thị Trên PDF
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCurrency('USD')}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedCurrency === 'USD'
                        ? 'bg-cyan-50 border-cyan-500 font-bold text-cyan-900 ring-1 ring-cyan-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-xs">Đô La Mỹ ($ USD)</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        {formatUSD(quote.grandTotalUsd)}
                      </div>
                    </div>
                    {selectedCurrency === 'USD' && <Check className="w-4 h-4 text-cyan-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCurrency('VND')}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedCurrency === 'VND'
                        ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-xs">Việt Nam Đồng (VNĐ)</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        {formatVND(quote.grandTotalVnd)}
                      </div>
                    </div>
                    {selectedCurrency === 'VND' && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* Revision & Security Info Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Mã Báo Giá: </span>
                  <strong className="font-mono text-slate-900">{quote.quoteNumber}</strong>
                  <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold text-[11px]">
                    Sẽ lưu thành Rev {String(nextRevision).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Tỷ giá: 1 USD = {quote.exchangeRate.toLocaleString()} VND
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={isGenerating || !validation.isValid}
                  onClick={handleGenerate}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isGenerating ? 'Đang Tạo & Lưu PDF...' : 'Phát Hành & Tải PDF Ngay'}</span>
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
