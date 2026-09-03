import React, { useState, useEffect } from 'react';
import { 
  QuotationTemplate, 
  QuotationDocumentLanguage 
} from '../types/quotationDocument';
import { QuoteData } from '../types/logistics';
import { 
  getQuotationTemplates, 
  saveQuotationTemplate, 
  setDefaultTemplate 
} from '../services/quotation/quotationDocumentService';
import { 
  X, 
  Layout, 
  Plus, 
  Check, 
  Copy, 
  Star, 
  Palette, 
  Eye, 
  Sliders, 
  FileText, 
  Type, 
  CheckSquare,
  Sparkles
} from 'lucide-react';

interface QuotationTemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleQuote: QuoteData;
  onTemplatesUpdated?: () => void;
}

export const QuotationTemplateBuilderModal: React.FC<QuotationTemplateBuilderModalProps> = ({
  isOpen,
  onClose,
  sampleQuote,
  onTemplatesUpdated,
}) => {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'sections' | 'styles' | 'preview'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load templates on open
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const list = await getQuotationTemplates();
      setTemplates(list);
      if (list.length > 0 && !selectedTemplate) {
        setSelectedTemplate(list[0]);
      }
    };
    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectTemplate = (t: QuotationTemplate) => {
    setSelectedTemplate(JSON.parse(JSON.stringify(t)));
  };

  const handleCreateNew = () => {
    const newTmpl: QuotationTemplate = {
      id: `tmpl-${Date.now()}`,
      companyId: 'default',
      name: 'Mẫu Báo Giá Mới (Custom Template)',
      code: `CUSTOM_${Date.now().toString().slice(-4)}`,
      description: 'Mẫu báo giá tùy chỉnh doanh nghiệp',
      version: 1,
      isDefault: false,
      isActive: true,
      supportedLanguages: ['bilingual', 'vi', 'en'],
      sections: {
        header: {
          showLogo: true,
          showTaxId: true,
          showContact: true,
          showEnglishName: true,
          titleVi: 'BẢNG BÁO GIÁ LOGISTICS',
          titleEn: 'FREIGHT QUOTATION',
        },
        customer: {
          showTaxId: true,
          showContactPerson: true,
          showPhoneEmail: true,
          showAddress: true,
        },
        shipment: {
          showGrossWeight: true,
          showVolumeCbm: true,
          showChargeableWeight: true,
          showTransitTime: true,
          showFreeTime: true,
        },
        charges: {
          groupBy: 'LOCATION',
          showVatColumn: true,
          showUnitColumn: true,
          showCurrencyColumn: true,
          showNotes: true,
        },
        totals: {
          showSubtotal: true,
          showVat: true,
          showGrandTotal: true,
          showEquivalent: true,
          showExchangeRateNote: true,
        },
        terms: {
          showIncoterm: true,
          showPaymentTerm: true,
          showExclusions: true,
          showBankInfo: true,
        },
        signature: {
          showCustomerSignature: true,
          showCompanySignature: true,
          stampPlaceholder: true,
        },
        footer: {
          showPageNumbers: true,
          customFooterText: 'LogiQuote Enterprise - Rates are valid when signed.',
        },
      },
      styles: {
        primaryColor: '#0f766e',
        secondaryColor: '#475569',
        accentColor: '#0d9488',
        lightBgColor: '#f0fdfa',
        fontFamily: 'helvetica',
        fontSizeScale: 'standard',
        tableTheme: 'grid',
        showBorders: true,
        headerHeightMm: 32,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates([newTmpl, ...templates]);
    setSelectedTemplate(newTmpl);
    setActiveTab('info');
    showToastMsg('Đã tạo mẫu mới! Bạn có thể chỉnh sửa và lưu.');
  };

  const handleDuplicate = (t: QuotationTemplate) => {
    const clone: QuotationTemplate = {
      ...JSON.parse(JSON.stringify(t)),
      id: `tmpl-${Date.now()}`,
      name: `${t.name} (Bản sao)`,
      code: `${t.code}_COPY`,
      isDefault: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplates([clone, ...templates]);
    setSelectedTemplate(clone);
    showToastMsg(`Đã nhân bản mẫu: ${clone.name}`);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      const updated: QuotationTemplate = {
        ...selectedTemplate,
        version: selectedTemplate.version + 1,
        updatedAt: new Date().toISOString(),
      };
      await saveQuotationTemplate(updated);
      const list = await getQuotationTemplates();
      setTemplates(list);
      setSelectedTemplate(updated);
      onTemplatesUpdated?.();
      showToastMsg(`Đã lưu thành công mẫu [${updated.name}] (v${updated.version})!`);
    } catch (error) {
      console.error(error);
      showToastMsg('Có lỗi xảy ra khi lưu mẫu!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (tmpl: QuotationTemplate) => {
    await setDefaultTemplate(tmpl.id);
    const list = await getQuotationTemplates();
    setTemplates(list);
    if (selectedTemplate?.id === tmpl.id) {
      setSelectedTemplate({ ...selectedTemplate, isDefault: true });
    }
    onTemplatesUpdated?.();
    showToastMsg(`Đã đặt mẫu [${tmpl.name}] làm Mẫu Mặc Định!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Quotation Template Builder (Trình Thiết Kế Mẫu Báo Giá)</h3>
              <p className="text-xs text-slate-400">Tùy biến nhận diện, trường hiển thị & bố cục cho file PDF báo giá chính thức</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-fadeIn">
            {toast}
          </div>
        )}

        {/* Content Body: Sidebar List + Editor Pane */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* Left Column: Template List */}
          <div className="w-full lg:w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mẫu Đã Lưu ({templates.length})
              </span>
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Mới</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {templates.map((tmpl) => {
                const isSel = selectedTemplate?.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSel 
                        ? 'bg-white border-cyan-500 shadow-md ring-1 ring-cyan-500' 
                        : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                          style={{ backgroundColor: tmpl.styles.primaryColor }}
                        />
                        <span className="font-bold text-xs text-slate-900 line-clamp-1">
                          {tmpl.name}
                        </span>
                      </div>
                      {tmpl.isDefault && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold shrink-0">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {tmpl.description}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="font-mono">v{tmpl.version} • {tmpl.code}</span>
                      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(tmpl)}
                          className="p-1 hover:text-cyan-700"
                          title="Nhân bản mẫu"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {!tmpl.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(tmpl)}
                            className="p-1 hover:text-amber-600"
                            title="Đặt làm mặc định"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Editor */}
          {selectedTemplate ? (
            <div className="flex-1 flex flex-col overflow-y-auto bg-white">
              
              {/* Tab Navigation */}
              <div className="flex items-center border-b border-slate-200 px-6 pt-3 bg-slate-50/70 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'info'
                      ? 'border-cyan-700 text-cyan-800'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Thông Tin Cơ Bản</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('sections')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'sections'
                      ? 'border-cyan-700 text-cyan-800'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>2. Bật / Tắt Các Khối Báo Giá</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('styles')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'styles'
                      ? 'border-cyan-700 text-cyan-800'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>3. Màu Sắc & Font Chữ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'preview'
                      ? 'border-cyan-700 text-cyan-800'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>4. Xem Thử Trực Quan</span>
                </button>
              </div>

              {/* Tab 1: Info */}
              {activeTab === 'info' && (
                <div className="p-6 space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Mẫu Báo Giá</label>
                    <input
                      type="text"
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mã Nhận Diện (Code)</label>
                      <input
                        type="text"
                        value={selectedTemplate.code}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phiên Bản (Version)</label>
                      <input
                        type="number"
                        disabled
                        value={selectedTemplate.version}
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-300 rounded-lg text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Mục Đích Sử Dụng</label>
                    <textarea
                      rows={3}
                      value={selectedTemplate.description}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu Đề Tiếng Việt Trên Header</label>
                    <input
                      type="text"
                      value={selectedTemplate.sections.header.titleVi}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        sections: {
                          ...selectedTemplate.sections,
                          header: { ...selectedTemplate.sections.header, titleVi: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu Đề Tiếng Anh Trên Header</label>
                    <input
                      type="text"
                      value={selectedTemplate.sections.header.titleEn}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        sections: {
                          ...selectedTemplate.sections,
                          header: { ...selectedTemplate.sections.header, titleEn: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Chân Trang (Footer Note)</label>
                    <input
                      type="text"
                      value={selectedTemplate.sections.footer.customFooterText || ''}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        sections: {
                          ...selectedTemplate.sections,
                          footer: { ...selectedTemplate.sections.footer, customFooterText: e.target.value }
                        }
                      })}
                      placeholder="VD: Báo giá chỉ có giá trị khi có chữ ký và con dấu..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Sections */}
              {activeTab === 'sections' && (
                <div className="p-6 space-y-6 max-w-3xl">
                  
                  {/* Charges Table Settings */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                      Cấu Trúc Bảng Cước Phí (Charges Table)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1 font-medium">Cách Phân Nhóm Dòng Phí:</label>
                        <select
                          value={selectedTemplate.sections.charges.groupBy}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              charges: {
                                ...selectedTemplate.sections.charges,
                                groupBy: e.target.value as 'LOCATION' | 'CATEGORY' | 'NONE'
                              }
                            }
                          })}
                          className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="LOCATION">Phân nhóm Cảng Đi / Cước Chính / Cảng Đến (Khuyên Dùng)</option>
                          <option value="CATEGORY">Phân nhóm Theo Danh Mục (Freight / Surcharge / Customs)</option>
                          <option value="NONE">Bảng Phẳng (Không Phân Nhóm)</option>
                        </select>
                      </div>

                      <div className="space-y-2 pt-4">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTemplate.sections.charges.showVatColumn}
                            onChange={(e) => setSelectedTemplate({
                              ...selectedTemplate,
                              sections: {
                                ...selectedTemplate.sections,
                                charges: { ...selectedTemplate.sections.charges, showVatColumn: e.target.checked }
                              }
                            })}
                            className="rounded text-cyan-700"
                          />
                          <span>Hiển thị cột thuế VAT (%)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTemplate.sections.charges.showNotes}
                            onChange={(e) => setSelectedTemplate({
                              ...selectedTemplate,
                              sections: {
                                ...selectedTemplate.sections,
                                charges: { ...selectedTemplate.sections.charges, showNotes: e.target.checked }
                              }
                            })}
                            className="rounded text-cyan-700"
                          />
                          <span>Hiển thị ghi chú dưới tên hạng mục</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Shipment Info Toggles */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                      Thông Tin Vận Chuyển (Shipment Details Box)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.shipment.showGrossWeight}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              shipment: { ...selectedTemplate.sections.shipment, showGrossWeight: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Trọng lượng (Gross Weight)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.shipment.showVolumeCbm}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              shipment: { ...selectedTemplate.sections.shipment, showVolumeCbm: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Thể tích (CBM)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.shipment.showTransitTime}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              shipment: { ...selectedTemplate.sections.shipment, showTransitTime: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Thời gian vận chuyển (Transit)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.shipment.showFreeTime}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              shipment: { ...selectedTemplate.sections.shipment, showFreeTime: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Hạn lưu vỏ bãi (Free Time)</span>
                      </label>
                    </div>
                  </div>

                  {/* Signatures & Bank Info */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                      Điều Khoản & Chữ Ký (Signatures & Bank Terms)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.terms.showBankInfo}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              terms: { ...selectedTemplate.sections.terms, showBankInfo: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Hiển thị thông tin chuyển khoản ngân hàng</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.signature.showCustomerSignature}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              signature: { ...selectedTemplate.sections.signature, showCustomerSignature: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Khung chữ ký xác nhận của khách hàng</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.signature.showCompanySignature}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              signature: { ...selectedTemplate.sections.signature, showCompanySignature: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Khung chữ ký người đại diện forwarder</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.sections.footer.showPageNumbers}
                          onChange={(e) => setSelectedTemplate({
                            ...selectedTemplate,
                            sections: {
                              ...selectedTemplate.sections,
                              footer: { ...selectedTemplate.sections.footer, showPageNumbers: e.target.checked }
                            }
                          })}
                          className="rounded text-cyan-700"
                        />
                        <span>Số trang ở chân trang (Page X of Y)</span>
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: Styles */}
              {activeTab === 'styles' && (
                <div className="p-6 space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Màu Nhận Diện Chính (Primary Brand Color)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={selectedTemplate.styles.primaryColor}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: { ...selectedTemplate.styles, primaryColor: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <input
                        type="text"
                        value={selectedTemplate.styles.primaryColor}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: { ...selectedTemplate.styles, primaryColor: e.target.value }
                        })}
                        className="w-32 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                      {/* Color Presets */}
                      <div className="flex items-center space-x-1.5">
                        {['#164e63', '#0f172a', '#1e3a8a', '#047857', '#b45309', '#be123c', '#4c1d95'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedTemplate({
                              ...selectedTemplate,
                              styles: { ...selectedTemplate.styles, primaryColor: c }
                            })}
                            className="w-6 h-6 rounded-full border border-slate-300 transition-transform hover:scale-110"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Màu Phụ (Secondary Accent Color)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={selectedTemplate.styles.secondaryColor}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: { ...selectedTemplate.styles, secondaryColor: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300"
                      />
                      <input
                        type="text"
                        value={selectedTemplate.styles.secondaryColor}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: { ...selectedTemplate.styles, secondaryColor: e.target.value }
                        })}
                        className="w-32 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Font Chữ Văn Bản</label>
                      <select
                        value={selectedTemplate.styles.fontFamily}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: {
                            ...selectedTemplate.styles,
                            fontFamily: e.target.value as 'helvetica' | 'times' | 'courier'
                          }
                        })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="helvetica">Helvetica (Sans-Serif - Hiện đại, rõ nét)</option>
                        <option value="times">Times (Serif - Cổ điển, trang trọng)</option>
                        <option value="courier">Courier (Monospace - Bảng kỹ thuật)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giao Diện Bảng (Table Theme)</label>
                      <select
                        value={selectedTemplate.styles.tableTheme}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          styles: {
                            ...selectedTemplate.styles,
                            tableTheme: e.target.value as 'grid' | 'striped' | 'plain'
                          }
                        })}
                        className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="grid">Grid (Đường kẻ ô đầy đủ)</option>
                        <option value="striped">Striped (Kẻ sọc xen kẽ)</option>
                        <option value="plain">Plain (Tối giản thanh mảnh)</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 4: Live Visual Card Preview */}
              {activeTab === 'preview' && (
                <div className="p-6 bg-slate-100 flex-1 overflow-y-auto">
                  <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden font-sans">
                    
                    {/* Top color bar */}
                    <div 
                      className="h-2.5 w-full" 
                      style={{ backgroundColor: selectedTemplate.styles.primaryColor }}
                    />

                    {/* Mock header */}
                    <div className="p-5 border-b border-slate-200 flex justify-between items-start">
                      <div>
                        <div 
                          className="font-bold text-base" 
                          style={{ color: selectedTemplate.styles.primaryColor }}
                        >
                          {sampleQuote.company?.name || 'LOGISTICS COMPANY LTD'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sampleQuote.company?.address || '123 Harbor Way, Ho Chi Minh, Vietnam'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Tel: {sampleQuote.company?.phone || '028 3888 9999'} | Tax ID: {sampleQuote.company?.taxId || '0312345678'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div 
                          className="text-xs font-bold uppercase tracking-wider" 
                          style={{ color: selectedTemplate.styles.primaryColor }}
                        >
                          {selectedTemplate.sections.header.titleVi}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {sampleQuote.quoteNumber} (Rev 01)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Date: {sampleQuote.createdDate}
                        </div>
                      </div>
                    </div>

                    {/* Customer & Route Mock */}
                    <div className="p-4 grid grid-cols-2 gap-3 text-xs bg-slate-50/50">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1">Khách Hàng:</div>
                        <div className="font-semibold text-slate-900">{sampleQuote.customer.companyName || 'Công ty TNHH Xuất Nhập Khẩu'}</div>
                        <div className="text-slate-500 text-[11px]">Người liên hệ: {sampleQuote.customer.contactPerson || 'Nguyễn Văn A'}</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1">Lô Hàng:</div>
                        <div className="text-slate-900">{sampleQuote.shipment.pol} ➔ {sampleQuote.shipment.pod}</div>
                        <div className="text-slate-500 text-[11px]">{sampleQuote.shipment.mode} • {sampleQuote.shipment.containerType}</div>
                      </div>
                    </div>

                    {/* Sample Table Mock */}
                    <div className="p-4">
                      <div 
                        className="text-white text-xs font-bold px-3 py-1.5 rounded-t flex justify-between"
                        style={{ backgroundColor: selectedTemplate.styles.primaryColor }}
                      >
                        <span>Hạng mục cước phí</span>
                        <span>Đơn vị / Thành tiền</span>
                      </div>
                      <div className="border border-slate-200 divide-y divide-slate-100 text-xs text-slate-700">
                        <div className="p-2 flex justify-between">
                          <span>1. Ocean Freight (Cước biển FCL)</span>
                          <span className="font-mono font-bold">$1,800.00</span>
                        </div>
                        <div className="p-2 flex justify-between">
                          <span>2. Terminal Handling Charge (THC POL)</span>
                          <span className="font-mono font-bold">$140.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer note mock */}
                    <div className="p-3 border-t border-slate-200 text-[10px] text-slate-400 text-center italic">
                      {selectedTemplate.sections.footer.customFooterText || 'LogiQuote Professional PDF Engine'}
                    </div>

                  </div>
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-slate-700">Mã: {selectedTemplate.code}</span>
                  {selectedTemplate.isDefault && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                      Mẫu Mặc Định
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!selectedTemplate.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(selectedTemplate)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition-colors"
                    >
                      Đặt Làm Mặc Định
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi Mẫu'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 p-8 italic">
              Vui lòng chọn hoặc tạo mới một mẫu báo giá để chỉnh sửa.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
