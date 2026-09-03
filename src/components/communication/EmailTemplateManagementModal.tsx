import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Save, 
  Eye, 
  FileText, 
  Check, 
  AlertTriangle, 
  Sparkles,
  Search,
  Globe,
  Sliders
} from 'lucide-react';
import { EmailTemplate, EmailTemplateType, CommunicationLanguage } from '../../types/quotationCommunication';
import { getEmailTemplates, saveEmailTemplate, deleteEmailTemplate, validateTemplateVariables } from '../../services/quotation/emailTemplateService';
import { ALLOWED_EMAIL_VARIABLES } from '../../data/defaultEmailTemplates';

interface EmailTemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: EmailTemplate) => void;
}

export const EmailTemplateManagementModal: React.FC<EmailTemplateManagementModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [filterLang, setFilterLang] = useState<'ALL' | 'vi' | 'en'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Edit / Form state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadTemplates = async () => {
    const list = await getEmailTemplates();
    setTemplates(list);
    if (!selectedTemplate && list.length > 0) {
      setSelectedTemplate(list[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setIsEditing(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleStartCreate = () => {
    const newTmpl: Partial<EmailTemplate> = {
      id: `tmpl_${Date.now()}`,
      companyId: 'default-company',
      name: 'Mẫu Email Báo Giá Mới',
      code: `TMPL_${Date.now().toString().slice(-4)}`,
      type: 'QUOTATION_SEND',
      language: 'vi',
      subject: 'Báo giá vận chuyển logistics {{quotationNumber}} - {{origin}} đến {{destination}}',
      body: '<p>Kính gửi <strong>{{customerName}}</strong>,</p>\n\n<p>Chúng tôi xin gửi đến Quý khách bảng báo giá dịch vụ cước vận chuyển...</p>',
      variables: ALLOWED_EMAIL_VARIABLES,
      active: true,
      version: 1,
      isDefault: false,
      createdBy: 'Sales Admin',
      updatedBy: 'Sales Admin',
    };
    setFormData(newTmpl);
    setIsEditing(true);
    setValidationErrors([]);
  };

  const handleStartEdit = (tmpl: EmailTemplate) => {
    setFormData({ ...tmpl });
    setIsEditing(true);
    setValidationErrors([]);
  };

  const handleDuplicate = async (tmpl: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...tmpl,
      id: `tmpl_${Date.now()}`,
      name: `${tmpl.name} (Bản Sao)`,
      code: `${tmpl.code}_COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveEmailTemplate(duplicated);
    await loadTemplates();
    setSelectedTemplate(duplicated);
  };

  const handleDelete = async (tmplId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu email này?')) {
      await deleteEmailTemplate(tmplId);
      await loadTemplates();
      setSelectedTemplate(null);
      setIsEditing(false);
    }
  };

  const handleInsertVariable = (variableTag: string) => {
    setFormData(prev => ({
      ...prev,
      body: (prev.body || '') + ` ${variableTag} `
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      setValidationErrors(['Vui lòng điền đầy đủ Tên mẫu, Tiêu đề và Nội dung email.']);
      return;
    }

    // Validate variables
    const checkSubj = validateTemplateVariables(formData.subject);
    const checkBody = validateTemplateVariables(formData.body);

    const errors: string[] = [];
    if (!checkSubj.isValid) {
      if (checkSubj.forbiddenViolations.length > 0) {
        errors.push(`Tiêu đề chứa biến bị cấm (bảo mật): ${checkSubj.forbiddenViolations.join(', ')}`);
      }
      if (checkSubj.unknownVariables.length > 0) {
        errors.push(`Tiêu đề chứa biến không xác định: ${checkSubj.unknownVariables.join(', ')}`);
      }
    }
    if (!checkBody.isValid) {
      if (checkBody.forbiddenViolations.length > 0) {
        errors.push(`Nội dung chứa biến bị cấm (bảo mật): ${checkBody.forbiddenViolations.join(', ')}`);
      }
      if (checkBody.unknownVariables.length > 0) {
        errors.push(`Nội dung chứa biến không xác định: ${checkBody.unknownVariables.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const templateToSave = formData as EmailTemplate;
    await saveEmailTemplate(templateToSave);
    await loadTemplates();
    setSelectedTemplate(templateToSave);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const filteredTemplates = templates.filter(t => {
    if (filterLang !== 'ALL' && t.language !== filterLang) return false;
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 text-xs">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">QUẢN LÝ MẪU EMAIL BÁO GIÁ & GIAO TIẾP</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Thiết kế mẫu thư gửi cước vận chuyển, nhắc hẹn follow-up đa ngôn ngữ với các biến động an toàn.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleStartCreate}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Mẫu Mới</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 px-6 text-emerald-800 font-bold text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu mẫu email thành công!</span>
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex-1 flex min-h-0 divide-x divide-slate-200">
          
          {/* Left Column: Template List & Filters */}
          <div className="w-1/3 flex flex-col bg-slate-50/50 p-4 space-y-3 min-w-[280px]">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mẫu email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setFilterLang('ALL')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${filterLang === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterLang('vi')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${filterLang === 'vi' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setFilterLang('en')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${filterLang === 'en' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                🇬🇧 English
              </button>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplate?.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-900 truncate">{tmpl.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                        {tmpl.language.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{tmpl.subject}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>Loại: {tmpl.type}</span>
                      {tmpl.isDefault && <span className="text-blue-700 font-bold">Mặc định</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Viewer or Editor */}
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            {isEditing ? (
              // EDIT FORM
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    {formData.id ? 'Chỉnh Sửa Mẫu Email' : 'Tạo Mẫu Email Mới'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-500 hover:text-slate-700 font-bold"
                  >
                    Hủy Bỏ
                  </button>
                </div>

                {validationErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1">
                    <p className="font-bold flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cảnh báo biến mẫu email không hợp lệ:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên Mẫu Email *:</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-900"
                      placeholder="Báo giá chuẩn đường biển..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngôn Ngữ:</label>
                    <select
                      value={formData.language || 'vi'}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as any }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tiêu Đề Thư (Subject) *:</label>
                  <input
                    type="text"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900"
                    placeholder="Báo giá {{quotationNumber}}..."
                  />
                </div>

                {/* Insert Variable helper */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Bấm để chèn biến an toàn:
                  </label>
                  <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    {ALLOWED_EMAIL_VARIABLES.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-[10px] font-mono text-slate-600"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Nội Dung Thư (HTML / Formatted):</label>
                  <textarea
                    rows={8}
                    value={formData.body || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs flex-1"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs"
                  >
                    Lưu Mẫu Email
                  </button>
                </div>
              </div>
            ) : selectedTemplate ? (
              // TEMPLATE VIEWER
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedTemplate.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Mã: {selectedTemplate.code} &bull; Ngôn ngữ: {selectedTemplate.language.toUpperCase()} &bull; Loại: {selectedTemplate.type}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedTemplate)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(selectedTemplate)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nhân Bản</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedTemplate.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Xóa mẫu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subject Preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tiêu Đề (Subject):</span>
                  <p className="font-semibold text-slate-900">{selectedTemplate.subject}</p>
                </div>

                {/* Body Preview */}
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Xem Trước Nội Dung:</span>
                  <div 
                    className="p-4 bg-white rounded-xl border border-slate-200 flex-1 overflow-y-auto prose prose-sm text-slate-800 leading-relaxed shadow-inner"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.body }}
                  />
                </div>

                {onSelectTemplate && (
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate(selectedTemplate);
                        onClose();
                      }}
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs"
                    >
                      Sử Dụng Mẫu Này
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                <FileText className="w-10 h-10 mb-2 opacity-30" />
                <p>Chọn một mẫu email từ danh sách bên trái để xem chi tiết.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
