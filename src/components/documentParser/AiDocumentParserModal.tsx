import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Check, 
  Copy, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  X, 
  Ship, 
  Box, 
  Calendar, 
  Building, 
  MapPin, 
  CheckCircle2, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  Scale, 
  History, 
  Layers, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Trash2, 
  Plus, 
  Clock, 
  Anchor, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { 
  ParsedDocumentData, 
  LogisticsDocumentType, 
  CrossCheckResult,
  ExtractedContainerSeal
} from '../../types/documentParser';
import { QuoteData, CompanyProfile } from '../../types/logistics';
import { SAMPLE_REAL_LOGISTICS_DOCUMENTS } from '../../data/sampleDocuments';
import { 
  getAllParsedDocuments, 
  saveParsedDocument, 
  deleteParsedDocument 
} from '../../services/documentParser/documentParserRepository';
import { 
  parseDocumentWithAi, 
  crossCheckDocuments, 
  populateQuotationFromDocument 
} from '../../services/documentParser/aiDocumentParserService';

interface AiDocumentParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote: QuoteData;
  onApplyToQuote: (updatedQuote: QuoteData) => void;
  onQuotationCreated?: (newQuote: QuoteData) => void;
}

export const AiDocumentParserModal: React.FC<AiDocumentParserModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplyToQuote,
  onQuotationCreated,
}) => {
  // Document storage state
  const [documents, setDocuments] = useState<ParsedDocumentData[]>(() => getAllParsedDocuments());
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const list = getAllParsedDocuments();
    return list.length > 0 ? list[0].id : '';
  });

  // Modal active view tab
  const [activeTab, setActiveTab] = useState<'PARSER' | 'CROSS_CHECK' | 'VAULT'>('PARSER');

  // Active Document
  const activeDocument = useMemo(() => {
    return documents.find(d => d.id === activeDocId) || documents[0] || null;
  }, [documents, activeDocId]);

  // Upload & Parse State
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [docTypeHint, setDocTypeHint] = useState<LogisticsDocumentType>('AUTO_DETECT');
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewMode, setPreviewMode] = useState<'DOCUMENT' | 'RAW_TEXT'>('DOCUMENT');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cross-Check State
  const [crossCheckDocAId, setCrossCheckDocAId] = useState<string>('');
  const [crossCheckDocBId, setCrossCheckDocBId] = useState<string>('');
  const [crossCheckResult, setCrossCheckResult] = useState<CrossCheckResult | null>(null);

  // Text input fallback modal/drawer
  const [rawTextModalOpen, setRawTextModalOpen] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync documents on mount / storage updates
  useEffect(() => {
    const handleStorage = () => {
      setDocuments(getAllParsedDocuments());
    };
    window.addEventListener('logistics_parsed_documents_changed', handleStorage);
    return () => window.removeEventListener('logistics_parsed_documents_changed', handleStorage);
  }, []);

  // Set initial cross check candidates
  useEffect(() => {
    if (documents.length >= 2) {
      if (!crossCheckDocAId) setCrossCheckDocAId(documents[0].id);
      if (!crossCheckDocBId) setCrossCheckDocBId(documents[1].id);
    }
  }, [documents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const mimeType = file.type || 'application/pdf';

        const parsed = await parseDocumentWithAi({
          fileBase64: result,
          mimeType,
          fileName: file.name,
          docTypeHint,
        });

        saveParsedDocument(parsed);
        setDocuments(getAllParsedDocuments());
        setActiveDocId(parsed.id);
        setIsProcessing(false);
        showToast(`Đã bóc tách thành công ${parsed.documentTypeNameVi}!`);
      };

      reader.onerror = () => {
        setIsProcessing(false);
        showToast('Lỗi đọc tập tin.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err.message || 'Lỗi bóc tách tài liệu.');
    }
  };

  // Handle raw text parsing
  const handleParseRawText = async () => {
    if (!rawTextInput.trim()) return;
    setIsProcessing(true);
    setRawTextModalOpen(false);

    try {
      const parsed = await parseDocumentWithAi({
        rawText: rawTextInput,
        fileName: 'Van_ban_dan_truc_tiep.txt',
        mimeType: 'text/plain',
        docTypeHint,
      });

      saveParsedDocument(parsed);
      setDocuments(getAllParsedDocuments());
      setActiveDocId(parsed.id);
      setIsProcessing(false);
      setRawTextInput('');
      showToast(`Đã bóc tách thành công văn bản chứng từ!`);
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err.message || 'Lỗi bóc tách văn bản.');
    }
  };

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Apply to current quotation
  const handleApplyToQuotation = (mode: 'merge' | 'replace') => {
    if (!activeDocument) return;
    const updated = populateQuotationFromDocument(currentQuote, activeDocument, mode);
    onApplyToQuote(updated);
    showToast(`Đã ${mode === 'replace' ? 'làm mới toàn bộ' : 'cập nhật'} báo giá từ ${activeDocument.documentNumber}!`);
    onClose();
  };

  // Create brand new quote from document
  const handleCreateNewQuote = () => {
    if (!activeDocument) return;
    const updated = populateQuotationFromDocument(currentQuote, activeDocument, 'replace');
    if (onQuotationCreated) {
      onQuotationCreated(updated);
    } else {
      onApplyToQuote(updated);
    }
    showToast(`Đã tạo báo giá mới từ chứng từ ${activeDocument.documentNumber}!`);
    onClose();
  };

  // Run Cross-Check
  const handleRunCrossCheck = () => {
    const docA = documents.find(d => d.id === crossCheckDocAId);
    const docB = documents.find(d => d.id === crossCheckDocBId);
    if (!docA || !docB) {
      showToast('Vui lòng chọn đủ 2 chứng từ để đối chiếu.');
      return;
    }
    const result = crossCheckDocuments(docA, docB);
    setCrossCheckResult(result);
  };

  // Export Cont & Seal list to clipboard
  const handleCopyContainerList = () => {
    if (!activeDocument || activeDocument.containers.length === 0) {
      showToast('Không có danh sách container để sao chép.');
      return;
    }
    const lines = activeDocument.containers.map(
      (c, idx) => `${idx + 1}. Cont: ${c.containerNo} | Seal: ${c.sealNo} | Type: ${c.type} | Kiện: ${c.packageCount || 0} | GW: ${c.grossWeightKg?.toLocaleString() || 0} KGS`
    );
    copyToClipboard(lines.join('\n'), 'container_list');
  };

  // Export JSON
  const handleExportJson = () => {
    if (!activeDocument) return;
    const blob = new Blob([JSON.stringify(activeDocument, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR_${activeDocument.documentNumber || 'DOCUMENT'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống file JSON dữ liệu!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-150">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 text-slate-900">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Trích Xuất Chứng Từ Logistics Bằng AI (OCR Parser)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Gemini 3.8 Multimodal
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động bóc tách Bill of Lading, Booking Hãng Tàu, Invoice, Packing List & Tờ Khai Hải Quan trong 2 giây
              </p>
            </div>
          </div>

          {/* Tab Switcher & Modal Close */}
          <div className="flex items-center gap-2">
            
            <div className="flex p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('PARSER')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'PARSER' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trích Xuất & Điền Báo Giá
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('CROSS_CHECK');
                  if (!crossCheckResult && documents.length >= 2) {
                    handleRunCrossCheck();
                  }
                }}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'CROSS_CHECK' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đối Chiếu B/L vs Booking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VAULT')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'VAULT' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Kho Hồ Sơ ({documents.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* ============================================================== */}
        {/* TAB 1: PARSER & AUTOFILL WORKSPACE */}
        {/* ============================================================== */}
        {activeTab === 'PARSER' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* LEFT PANE: UPLOAD & PREVIEW */}
            <div className="w-full lg:w-1/2 border-r border-slate-200 flex flex-col bg-slate-50/50 overflow-hidden">
              
              {/* Document Selector & Quick Samples Bar */}
              <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Mẫu thực tế hoặc Tải lên:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRawTextModalOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold underline cursor-pointer"
                    >
                      Dán văn bản trực tiếp
                    </button>
                  </div>
                </div>

                {/* Quick real-world samples */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {SAMPLE_REAL_LOGISTICS_DOCUMENTS.map((sample) => {
                    const isSelected = activeDocId === sample.id;
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => setActiveDocId(sample.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs ring-1 ring-indigo-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold">{sample.documentTypeNameVi.split('(')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{sample.documentNumber}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Upload Trigger Area */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50' 
                      : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left text-xs">
                      <div className="font-bold text-slate-800">
                        Kéo thả B/L, Booking, Invoice, Tờ Khai Hải Quan vào đây
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Hỗ trợ hình ảnh (JPG, PNG) và PDF · Dung lượng đến 10MB
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100">
                
                {/* Preview Toolbar */}
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-mono text-[11px] text-slate-300">
                      {activeDocument?.fileName || 'Chung_tu.pdf'}
                    </span>
                    <span>·</span>
                    <span className="text-[11px]">
                      {activeDocument?.fileSize ? `${Math.round(activeDocument.fileSize / 1024)} KB` : '428 KB'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode(previewMode === 'DOCUMENT' ? 'RAW_TEXT' : 'DOCUMENT')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                    >
                      {previewMode === 'DOCUMENT' ? 'Xem Text OCR' : 'Xem Bản Gốc'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.2))}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 transition"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 px-1">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.min(2.5, previewZoom + 0.2))}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 transition"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(1)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 transition"
                      title="Khôi phục gốc"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Viewport Content */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-3">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <div className="text-sm font-bold text-white">AI Gemini Đang Bóc Tách Chứng Từ...</div>
                      <div className="text-xs text-slate-400">Đang nhận diện mã B/L, container, seal, cảng và trọng lượng</div>
                    </div>
                  )}

                  {previewMode === 'DOCUMENT' ? (
                    <div 
                      className="bg-white text-slate-900 shadow-2xl rounded p-6 font-mono text-[11px] leading-relaxed max-w-xl w-full border border-slate-700 transition-transform origin-top"
                      style={{ transform: `scale(${previewZoom})` }}
                    >
                      <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black tracking-wider uppercase text-slate-900">
                            {activeDocument?.carrierOrIssuer || 'LOGISTICS DOCUMENT'}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                            {activeDocument?.documentTypeNameVi}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">REFERENCE NO:</div>
                          <div className="text-xs font-bold text-indigo-700">{activeDocument?.documentNumber}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] border-b border-slate-200 pb-3 mb-3">
                        <div>
                          <span className="font-bold text-slate-600 block">SHIPPER / EXPORTER:</span>
                          <span className="text-slate-900 font-semibold">{activeDocument?.shipper?.name}</span>
                          <p className="text-slate-500 text-[9px] mt-0.5">{activeDocument?.shipper?.address}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">CONSIGNEE / IMPORTER:</span>
                          <span className="text-slate-900 font-semibold">{activeDocument?.consignee?.name}</span>
                          <p className="text-slate-500 text-[9px] mt-0.5">{activeDocument?.consignee?.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] border-b border-slate-200 pb-3 mb-3">
                        <div>
                          <span className="font-bold text-slate-600 block">PORT OF LOADING (POL):</span>
                          <span className="text-slate-900 font-bold">{activeDocument?.pol}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">PORT OF DISCHARGE (POD):</span>
                          <span className="text-slate-900 font-bold">{activeDocument?.pod}</span>
                        </div>
                      </div>

                      <div className="text-[10px] space-y-1 mb-3">
                        <div className="font-bold text-slate-600">CONTAINERS & SEALS:</div>
                        {activeDocument?.containers?.map((c, i) => (
                          <div key={i} className="bg-slate-100 p-1.5 rounded flex items-center justify-between font-bold text-slate-800 text-[9.5px]">
                            <span>CONT: {c.containerNo}</span>
                            <span>SEAL: {c.sealNo}</span>
                            <span>TYPE: {c.type}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] border-t border-slate-200 pt-2 text-slate-600 flex justify-between">
                        <span>GW: <strong>{activeDocument?.grossWeightKg?.toLocaleString()} KGS</strong></span>
                        <span>VOL: <strong>{activeDocument?.volumeCbm} CBM</strong></span>
                        <span>PACKAGES: <strong>{activeDocument?.packageCount} {activeDocument?.packageUnit}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-auto p-4 bg-slate-950 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed select-text">
                      {activeDocument?.rawText || 'Không có văn bản thô OCR.'}
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* RIGHT PANE: STRUCTURED EXTRACTION & FORM */}
            <div className="w-full lg:w-1/2 flex flex-col bg-white overflow-hidden">
              
              {/* Document Identity Banner */}
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {activeDocument?.documentTypeNameVi.split('(')[0] || 'Chứng Từ'}
                  </span>
                  
                  <div className="flex items-center gap-1 font-mono text-sm font-bold text-slate-900">
                    <span>{activeDocument?.documentNumber || 'CHƯA CÓ MÃ'}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeDocument?.documentNumber || '', 'doc_no')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      title="Sao chép số chứng từ"
                    >
                      {copiedKey === 'doc_no' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Độ tin cậy: {activeDocument?.confidenceScore || 95}%</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {activeDocument?.processingTimeMs ? `${(activeDocument.processingTimeMs / 1000).toFixed(1)}s` : '1.2s'}
                  </span>
                </div>

              </div>

              {/* Scrollable Form Fields */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                
                {/* Section 1: Parties (Shipper & Consignee) */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Building className="w-3.5 h-3.5 text-sky-600" />
                      <span>1. Doanh Nghiệp Xuất / Nhập Khẩu</span>
                    </div>
                    {activeDocument?.shipper?.taxId && (
                      <span className="text-[11px] font-mono text-slate-500">MST: {activeDocument.shipper.taxId}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-500 text-[10px] uppercase">Người Gửi (Shipper):</div>
                      <div className="font-bold text-slate-900 mt-0.5">{activeDocument?.shipper?.name || '---'}</div>
                      <div className="text-slate-600 text-[11px] mt-1">{activeDocument?.shipper?.address || '---'}</div>
                      {activeDocument?.shipper?.phone && (
                        <div className="text-slate-500 text-[10px] mt-1">SĐT: {activeDocument.shipper.phone}</div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-500 text-[10px] uppercase">Người Nhận (Consignee):</div>
                      <div className="font-bold text-slate-900 mt-0.5">{activeDocument?.consignee?.name || '---'}</div>
                      <div className="text-slate-600 text-[11px] mt-1">{activeDocument?.consignee?.address || '---'}</div>
                      {activeDocument?.consignee?.phone && (
                        <div className="text-slate-500 text-[10px] mt-1">SĐT: {activeDocument.consignee.phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Routing & Transport */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Ship className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Lộ Trình & Điều Hành Hãng Vận Chuyển</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {activeDocument?.mode || 'SEA_FCL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Cảng Đi (POL):</span>
                      <span className="font-bold text-slate-900">{activeDocument?.pol || '---'}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Cảng Đến (POD):</span>
                      <span className="font-bold text-slate-900">{activeDocument?.pod || '---'}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Tàu / Chuyến:</span>
                      <span className="font-bold text-slate-900">
                        {activeDocument?.vesselOrFlight ? `${activeDocument.vesselOrFlight} ${activeDocument.voyageNo || ''}` : '---'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">ETD / ETA:</span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {activeDocument?.etd || '---'} &rarr; {activeDocument?.eta || '---'}
                      </span>
                    </div>
                  </div>

                  {/* Cut-off info if Booking */}
                  {(activeDocument?.cyCutOff || activeDocument?.siCutOff) && (
                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hạn Chót Điều Hành:</span>
                      </div>
                      <div className="flex items-center gap-3 text-amber-800 text-[11px]">
                        {activeDocument.cyCutOff && (
                          <span>CY Cut-Off: <strong>{activeDocument.cyCutOff}</strong></span>
                        )}
                        {activeDocument.siCutOff && (
                          <span>SI Cut-Off: <strong>{activeDocument.siCutOff}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Cargo Specifications */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Box className="w-3.5 h-3.5 text-amber-600" />
                      <span>3. Quy Cách Hàng Hóa & Tải Trọng</span>
                    </div>
                    {activeDocument?.hsCode && (
                      <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                        HS: {activeDocument.hsCode}
                      </span>
                    )}
                  </div>

                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">Mô Tả Hàng Hóa:</span>
                    <span className="font-bold text-slate-900">{activeDocument?.commodity || '---'}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Loại Cont / Số Lượng:</span>
                      <span className="font-bold text-slate-900">
                        {activeDocument?.containerCount || 1} x {activeDocument?.containerType || "40'HC"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Tổng Trọng Lượng Gross:</span>
                      <span className="font-bold text-emerald-700">
                        {activeDocument?.grossWeightKg?.toLocaleString()} KGS
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Thể Tích CBM:</span>
                      <span className="font-bold text-indigo-700">
                        {activeDocument?.volumeCbm} CBM
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block font-semibold">Đóng Gói (Packages):</span>
                      <span className="font-bold text-slate-900">
                        {activeDocument?.packageCount} {activeDocument?.packageUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Containers & Seals List */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. Danh Sách Container & Số Chì Niêm Phong ({activeDocument?.containers?.length || 0})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyContainerList}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao Chép Cho Cảng / Hải Quan</span>
                    </button>
                  </div>

                  {activeDocument?.containers && activeDocument.containers.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Số Container</th>
                            <th className="p-2">Số Chì (Seal)</th>
                            <th className="p-2">Loại Cont</th>
                            <th className="p-2 text-right">Trọng Lượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {activeDocument.containers.map((c, i) => (
                            <tr key={c.id || i} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-400 font-sans">{i + 1}</td>
                              <td className="p-2 font-bold text-slate-900">{c.containerNo}</td>
                              <td className="p-2 text-indigo-700 font-bold">{c.sealNo}</td>
                              <td className="p-2 text-slate-600">{c.type}</td>
                              <td className="p-2 text-right text-slate-800">
                                {c.grossWeightKg ? `${c.grossWeightKg.toLocaleString()} KG` : '---'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                      Không có container nào trong chứng từ này
                    </div>
                  )}
                </div>

                {/* Section 5: Extracted Charges & Invoicing */}
                {activeDocument?.charges && activeDocument.charges.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>5. Các Khoản Cước & Phụ Phí Đã Bóc Tách ({activeDocument.charges.length})</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">Đơn vị: {activeDocument.currency}</span>
                    </div>

                    <div className="space-y-1.5">
                      {activeDocument.charges.map((ch, idx) => (
                        <div key={ch.id || idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800 text-[10px]">
                              {ch.code}
                            </span>
                            <span className="font-semibold text-slate-800">{ch.description}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            {ch.amount?.toLocaleString()} {ch.currency} / {ch.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 6: AI Warnings & Notes */}
                {activeDocument?.warnings && activeDocument.warnings.length > 0 && (
                  <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/60 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lưu Ý Cảnh Báo Từ AI:</span>
                    </div>
                    {activeDocument.warnings.map((w, i) => (
                      <p key={i} className="text-amber-800 pl-5 text-[11.5px]">• {w}</p>
                    ))}
                  </div>
                )}

              </div>

              {/* Bottom Action Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Xuất JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeDocument) {
                        deleteParsedDocument(activeDocument.id);
                        const list = getAllParsedDocuments();
                        setDocuments(list);
                        if (list.length > 0) setActiveDocId(list[0].id);
                        showToast('Đã xóa chứng từ khỏi danh sách.');
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Xóa chứng từ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyToQuotation('merge')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
                    title="Giữ nguyên mã báo giá và cập nhật bổ sung các trường thông tin"
                  >
                    <span>Cập Nhật Bổ Sung Vào Báo Giá</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateNewQuote}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition cursor-pointer"
                    title="Tạo báo giá mới sạch sẽ từ toàn bộ dữ liệu chứng từ này"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Điền Vào Báo Giá (1 Chạm)</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CROSS-CHECK MISMATCH DETECTION ENGINE */}
        {/* ============================================================== */}
        {activeTab === 'CROSS_CHECK' && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    <span>Đối Chiếu Chéo Hai Chứng Từ (Cross-Check Mismatch Guard)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phát hiện sai lệch giữa Booking vs Bill of Lading vs Commercial Invoice (tránh phạt sửa B/L hoặc hạ cont sai VGM)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunCrossCheck}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Chạy Phân Tích Đối Chiếu</span>
                </button>
              </div>

              {/* Selector for 2 documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chứng Từ A (Ví dụ: Booking Hãng Tàu / Tờ Khai):
                  </label>
                  <select
                    value={crossCheckDocAId}
                    onChange={(e) => setCrossCheckDocAId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.documentTypeNameVi} - #{d.documentNumber} ({d.shipper?.name || 'No shipper'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chứng Từ B (Ví dụ: Bill of Lading B/L / Commercial Invoice):
                  </label>
                  <select
                    value={crossCheckDocBId}
                    onChange={(e) => setCrossCheckDocBId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.documentTypeNameVi} - #{d.documentNumber} ({d.consignee?.name || 'No consignee'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {crossCheckResult && (
              <div className="space-y-4">
                
                {/* Score & Alerts Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      crossCheckResult.overallMatchScore >= 90 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : (crossCheckResult.overallMatchScore >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                    }`}>
                      {crossCheckResult.overallMatchScore}%
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Điểm Tương Thích Tổng Thể</div>
                      <div className="text-[11px] text-slate-500">
                        {crossCheckResult.overallMatchScore >= 90 ? 'Hợp lệ để thông quan' : 'Cần đối soát trước khi duyệt'}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                    <div className="text-xs font-bold text-slate-900 mb-1">Khuyến Nghị Điều Hành:</div>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {crossCheckResult.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Field Comparison Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                    Bảng Chi Tiết So Sánh Các Trường Trọng Yếu
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-3">Hạng Mục</th>
                          <th className="p-3">Chứng Từ A</th>
                          <th className="p-3">Chứng Từ B</th>
                          <th className="p-3">Trạng Thái</th>
                          <th className="p-3">Đánh Giá & Rủi Ro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {crossCheckResult.fields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="p-3 font-bold text-slate-900">{f.labelVi}</td>
                            <td className="p-3 font-mono text-slate-700">{f.valueDocA}</td>
                            <td className="p-3 font-mono text-slate-700">{f.valueDocB}</td>
                            <td className="p-3">
                              {f.status === 'MATCH' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Khớp 100%
                                </span>
                              )}
                              {f.status === 'WARNING' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Lệch Nhỏ
                                </span>
                              )}
                              {f.status === 'MISMATCH' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <X className="w-3 h-3 text-rose-600" />
                                  Sai Lệch
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 text-[11.5px]">{f.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DOCUMENT VAULT & HISTORY */}
        {/* ============================================================== */}
        {activeTab === 'VAULT' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kho Hồ Sơ Chứng Từ Đã Số Hóa ({documents.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Toàn bộ tài liệu B/L, Booking, Invoice đã quét lưu trữ an toàn và sẵn sàng tái sử dụng
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {doc.documentTypeNameVi.split('(')[0]}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {doc.issueDate || '2026-10'}
                      </span>
                    </div>

                    <div className="font-mono font-bold text-sm text-slate-900">
                      {doc.documentNumber}
                    </div>

                    <div className="text-xs text-slate-600 line-clamp-1">
                      Shipper: <strong>{doc.shipper?.name || 'N/A'}</strong>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>Tuyến: {doc.pol} &rarr; {doc.pod}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>GW: {doc.grossWeightKg?.toLocaleString()} KGS</span>
                      <span>·</span>
                      <span>{doc.containerCount} cont {doc.containerType}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocId(doc.id);
                        setActiveTab('PARSER');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      Mở Xem Chi Tiết &rarr;
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        deleteParsedDocument(doc.id);
                        setDocuments(getAllParsedDocuments());
                        showToast('Đã xóa chứng từ.');
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Xóa chứng từ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Raw Text Ingest Modal */}
      {rawTextModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 max-w-xl w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Dán Văn Bản Chứng Từ Để AI Bóc Tách</span>
              </h4>
              <button
                type="button"
                onClick={() => setRawTextModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={8}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder="Dán nội dung Bill of Lading, Booking Note từ email hoặc tin nhắn Zalo vào đây..."
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRawTextModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleParseRawText}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Bắt Đầu Bóc Tách Bằng AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
