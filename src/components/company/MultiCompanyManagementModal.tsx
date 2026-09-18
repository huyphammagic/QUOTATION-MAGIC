/**
 * Phase 37: MultiCompanyManagementModal Component
 * Full-scale Multi-Company / Multi-Entity Management Modal:
 * 1. Company Directory (list all entities, search, status, quick switch)
 * 2. Edit Active Entity (legal credentials, tax, address, contact)
 * 3. Branding & Template Engine (Logo upload, quote prefix, default currency, colors, terms)
 * 4. Banking & Financial Accounts
 * 5. Signer & Sales Rep Sign-Off
 * 6. Create New Company Entity
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Save, 
  CreditCard, 
  UserCheck, 
  ShieldCheck, 
  Eye, 
  Check, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Loader2,
  Plus,
  Palette,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { CompanyRecord, CompanyStatus } from '../../types/multiCompany';
import { useMultiCompany } from '../../context/MultiCompanyContext';
import { uploadCompanyLogo } from '../../services/firebase/fileStorageService';
import { syncHealthService } from '../../services/integrity/syncHealthService';
import { CompanyFinancialEngineTab } from './CompanyFinancialEngineTab';

interface MultiCompanyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial';
  startCreateNew?: boolean;
}

export const MultiCompanyManagementModal: React.FC<MultiCompanyManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
  startCreateNew = false,
}) => {
  const {
    activeCompanyId,
    activeCompanyRecord,
    companies,
    switchCompany,
    updateCurrentCompany,
    createNewCompany,
    refreshCompanies,
  } = useMultiCompany();

  const [activeTab, setActiveTab] = useState<'directory' | 'profile' | 'branding' | 'sales' | 'bank' | 'preview' | 'financial'>(initialTab);
  const [formData, setFormData] = useState<Partial<CompanyRecord>>({});
  const [isCreatingNew, setIsCreatingNew] = useState(startCreateNew);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsCreatingNew(startCreateNew);
    }
  }, [isOpen, initialTab, startCreateNew]);

  // Sync form data with active company record
  useEffect(() => {
    if (isCreatingNew) {
      setFormData({
        companyCode: `LOG-${String(companies.length + 1).padStart(2, '0')}`,
        legalName: '',
        displayName: '',
        shortName: '',
        taxCode: '',
        address: '',
        country: 'Vietnam',
        city: 'Ho Chi Minh',
        phone: '',
        email: '',
        website: '',
        bankName: '',
        bankAccountNo: '',
        bankAccountHolder: '',
        bankSwiftCode: '',
        bankBranch: '',
        defaultSalesRepName: '',
        defaultSalesRepTitle: 'Logistics Specialist',
        defaultSalesRepPhone: '',
        defaultSalesRepEmail: '',
        branding: {
          logoUrl: '',
          quotationPrefix: `LOG${companies.length + 1}`,
          defaultCurrency: 'USD',
          defaultQuotationValidityDays: 15,
          customTermsVi: '',
          primaryColor: '#0f172a',
        },
        status: 'ACTIVE',
      });
      setActiveTab('profile');
    } else if (activeCompanyRecord) {
      setFormData({
        ...activeCompanyRecord,
        branding: {
          quotationPrefix: 'LOG',
          defaultCurrency: 'USD',
          defaultQuotationValidityDays: 15,
          primaryColor: '#0f172a',
          ...(activeCompanyRecord.branding || {}),
        },
      });
    }
  }, [activeCompanyRecord, isCreatingNew, companies.length]);

  if (!isOpen) return null;

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Vui lòng chọn tệp hình ảnh (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Kích thước logo không được vượt quá 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    const uploadId = `comp_logo_${Date.now()}`;
    syncHealthService.startUpload(uploadId, file.name, file.size);

    try {
      const targetCompanyId = formData.companyId || activeCompanyId || 'company_profile';
      const result = await uploadCompanyLogo(file, targetCompanyId);
      setFormData(prev => ({
        ...prev,
        branding: {
          ...(prev.branding || {}),
          logoUrl: result.downloadUrl,
          logoStoragePath: result.storagePath,
        }
      }));
      syncHealthService.finishUploadSuccess(uploadId, result.downloadUrl, result.storagePath);
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải logo lên Firebase Storage.';
      setLogoUploadError(msg);
      syncHealthService.finishUploadFailed(uploadId, msg);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...(prev.branding || {}),
        logoUrl: '',
        logoStoragePath: '',
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      if (isCreatingNew) {
        if (!formData.displayName && !formData.legalName) {
          setFeedbackMessage({ type: 'error', text: 'Vui lòng nhập tên công ty.' });
          setIsSaving(false);
          return;
        }

        const res = await createNewCompany(formData as any);
        if (res.success) {
          setIsCreatingNew(false);
          setFeedbackMessage({ type: 'success', text: 'Tạo công ty mới thành công!' });
        } else {
          setFeedbackMessage({ type: 'error', text: res.message || 'Lỗi khi tạo công ty.' });
        }
      } else {
        const res = await updateCurrentCompany(formData);
        if (res.success) {
          setFeedbackMessage({ type: 'success', text: 'Đã lưu & đồng bộ thông tin công ty thành công!' });
        } else if (res.conflict) {
          setFeedbackMessage({ type: 'error', text: res.message || 'Xung đột phiên bản dữ liệu.' });
        } else {
          setFeedbackMessage({ type: 'error', text: res.message || 'Lỗi khi lưu công ty.' });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Lỗi hệ thống.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="multi-company-management-modal"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Quản Trị Pháp Nhân & Thương Hiệu Báo Giá (Multi-Entity)
                </h3>
                {isCreatingNew ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                    Tạo Mới
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                    {formData.companyCode || 'ACTIVE'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quản lý các công ty logistics thành viên, logo, tiền tệ mặc định và tiền tố báo giá độc lập
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className={`px-5 py-2.5 text-xs flex items-center space-x-2 ${
            feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 gap-1.5 text-xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => { setIsCreatingNew(false); setActiveTab('directory'); }}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'directory'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh Sách Pháp Nhân ({companies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Pháp Lý & Trụ Sở</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'branding'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>2. Logo & Branding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>3. Người Báo Giá (Sales)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'bank'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Ngân Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'financial'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-emerald-700 hover:text-emerald-900 bg-emerald-50/50 hover:bg-emerald-50'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>5. Tài Chính & Thuế (P38)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>6. Xem Trước Header</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-slate-50/40">
          
          {/* TAB 0: Directory */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Danh Sách Doanh Nghiệp Của Bạn</h4>
                  <p className="text-slate-500 text-[11px]">Chọn công ty để chuyển đổi không gian làm việc hoặc chỉnh sửa thông số cấu hình</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-2xs self-start"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Công Ty Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companies.map((comp) => {
                  const isActive = comp.companyId === activeCompanyId;
                  return (
                    <div 
                      key={comp.companyId}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive 
                          ? 'bg-blue-50/60 border-blue-400 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 p-1">
                            {comp.branding?.logoUrl ? (
                              <img src={comp.branding.logoUrl} alt={comp.displayName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <Building2 className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                {comp.companyCode}
                              </span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                                {comp.status}
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-900 text-xs truncate mt-1">
                              {comp.displayName || comp.legalName}
                            </h5>
                            <p className="text-[11px] text-slate-500 truncate">
                              MST: {comp.taxCode || 'Chưa cập nhật'}
                            </p>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded shrink-0">
                            Đang Dùng
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchCompany(comp.companyId)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600/30 rounded-lg transition-colors shrink-0"
                          >
                            Chuyển
                          </button>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tiền tố báo giá: <strong className="font-mono text-slate-700">{comp.branding?.quotationPrefix || 'LOG'}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            switchCompany(comp.companyId);
                            setActiveTab('profile');
                          }}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Chỉnh sửa hồ sơ &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: Profile & Legal */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mã Công Ty / Entity Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyCode || ''}
                    onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: ABC-LOG"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mã Số Thuế (Tax ID) *
                  </label>
                  <input
                    type="text"
                    value={formData.taxCode || ''}
                    onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0312345678"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên Doanh Nghiệp (Hiển Thị / Thương Hiệu) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName || ''}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="VD: CÔNG TY TNHH LOGISTICS TOÀN CẦU ABC"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">
                    Tên Pháp Nhân Tiếng Anh (English Name)
                  </label>
                  <input
                    type="text"
                    value={formData.legalName || ''}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: ABC GLOBAL LOGISTICS COMPANY LIMITED"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tên Viết Tắt (Short Name)
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: ABC LOGISTICS"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Trạng Thái Hoạt Động
                  </label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CompanyStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Đang Hoạt Động)</option>
                    <option value="INACTIVE">INACTIVE (Tạm Ngưng)</option>
                    <option value="ARCHIVED">ARCHIVED (Lưu Trữ)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">
                    Địa Chỉ Trụ Sở Chính
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Tầng 8, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, P. 25, Q. Bình Thạnh, TP.HCM"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Số Điện Thoại / Hotline
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: +84 28 3888 9999"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Email Công Ty / Báo Giá
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: pricing@abclogistics.vn"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">
                    Website Doanh Nghiệp
                  </label>
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: https://www.abclogistics.vn"
                  />
                </div>
              </div>

              {/* Action Save Button */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isCreatingNew ? 'Khởi Tạo Công Ty' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Branding & Identity */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  <span>Logo Doanh Nghiệp (Tự động áp dụng vào Báo Giá & PDF)</span>
                </h4>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Display */}
                  <div className="w-28 h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden relative group">
                    {formData.branding?.logoUrl ? (
                      <img
                        src={formData.branding.logoUrl}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px]">Chưa có logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-xs">
                    <p className="text-slate-600 text-[11px]">
                      Logo sẽ hiển thị ở góc trên bên trái của mọi báo giá in ấn và file PDF. Định dạng hỗ trợ: PNG, JPG, WebP, SVG. Tối đa 5MB.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingLogo ? 'Đang tải lên...' : 'Tải Lên Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>

                      {formData.branding?.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-medium flex items-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Gỡ logo</span>
                        </button>
                      )}
                    </div>

                    {logoUploadError && (
                      <p className="text-rose-600 text-[11px] font-medium">{logoUploadError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Numbering & Validity Configuration */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Cấu Hình Đánh Số Báo Giá & Điều Khoản Độc Lập
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Tiền Tố Báo Giá (Prefix) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.branding?.quotationPrefix || 'LOG'}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...(formData.branding || {}), quotationPrefix: e.target.value.toUpperCase() }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: ABC"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">VD: {formData.branding?.quotationPrefix || 'LOG'}-20260916-0001</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Đồng Tiền Mặc Định
                    </label>
                    <select
                      value={formData.branding?.defaultCurrency || 'USD'}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...(formData.branding || {}), defaultCurrency: e.target.value as 'USD' | 'VND' }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD (Đô la Mỹ)</option>
                      <option value="VND">VND (Việt Nam Đồng)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Thời Hạn Hiệu Lực Mặc Định (Ngày)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={formData.branding?.defaultQuotationValidityDays || 15}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...(formData.branding || {}), defaultQuotationValidityDays: parseInt(e.target.value, 10) || 15 }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-700 font-medium mb-1">
                      Điều Khoản Riêng Của Công Ty (In ở cuối báo giá PDF)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.branding?.customTermsVi || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...(formData.branding || {}), customTermsVi: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                      placeholder="Quy định thanh toán, phụ phí thay đổi theo thông báo của hãng tàu..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu Cấu Hình Thương Hiệu</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Sales Rep Sign-Off */}
          {activeTab === 'sales' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Người Đại Diện Ký Báo Giá Mặc Định (Signer Profile)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Họ Và Tên Người Báo Giá *
                    </label>
                    <input
                      type="text"
                      value={formData.defaultSalesRepName || ''}
                      onChange={(e) => setFormData({ ...formData, defaultSalesRepName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: Nguyễn Văn Nam"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Chức Danh / Vị Trí
                    </label>
                    <input
                      type="text"
                      value={formData.defaultSalesRepTitle || ''}
                      onChange={(e) => setFormData({ ...formData, defaultSalesRepTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: Trưởng Phòng Kinh Doanh / Logistics Consultant"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Số Điện Thoại Trực Tiếp (Direct Line)
                    </label>
                    <input
                      type="text"
                      value={formData.defaultSalesRepPhone || ''}
                      onChange={(e) => setFormData({ ...formData, defaultSalesRepPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: 0909 123 456"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Email Liên Hệ Trực Tiếp
                    </label>
                    <input
                      type="email"
                      value={formData.defaultSalesRepEmail || ''}
                      onChange={(e) => setFormData({ ...formData, defaultSalesRepEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: nam.nguyen@abclogistics.vn"
                    />
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu Thông Tin Ký Duyệt</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Bank Accounts */}
          {activeTab === 'bank' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Tài Khoản Ngân Hàng Nhận Thanh Toán (In trên Báo Giá)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">
                      Tên Ngân Hàng *
                    </label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: NGÂN HÀNG TMCP NGOẠI THƯƠNG VIỆT NAM (VIETCOMBANK)"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Số Tài Khoản (Account Number) *
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountNo || ''}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: 0071001234567"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Chủ Tài Khoản (Account Holder) *
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountHolder || ''}
                      onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: CONG TY TNHH LOGISTICS TOAN CAU ABC"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Chi Nhánh (Branch)
                    </label>
                    <input
                      type="text"
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: Chi nhánh TP.HCM"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Mã SWIFT Code (Cho thanh toán quốc tế)
                    </label>
                    <input
                      type="text"
                      value={formData.bankSwiftCode || ''}
                      onChange={(e) => setFormData({ ...formData, bankSwiftCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: BFTVVNVX"
                    />
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu Thông Tin Ngân Hàng</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: Live Header Preview */}
          {activeTab === 'preview' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  {formData.branding?.logoUrl ? (
                    <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shadow-2xs">
                      <img src={formData.branding.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 uppercase">
                      {formData.displayName || 'TÊN DOANH NGHIỆP'}
                    </h2>
                    {formData.legalName && (
                      <p className="text-xs text-slate-500 italic">{formData.legalName}</p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formData.address || 'Địa chỉ trụ sở chưa cấu hình'}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 space-y-0.5 self-end sm:self-auto">
                  {formData.taxCode && <p className="font-mono font-bold text-slate-900">MST: {formData.taxCode}</p>}
                  {formData.phone && <p>Tel: {formData.phone}</p>}
                  {formData.email && <p>Email: {formData.email}</p>}
                  {formData.website && <p>Web: {formData.website}</p>}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                <p className="font-bold text-slate-700">TÀI KHOẢN NHẬN THANH TOÁN:</p>
                <p className="text-slate-900 font-semibold">{formData.bankName || 'Chưa cấu hình ngân hàng'}</p>
                <p className="font-mono">Số TK: {formData.bankAccountNo || '---'} | Chủ TK: {formData.bankAccountHolder || '---'}</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Hoàn Tất Xem Trước
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Multi-Company Financial & Commercial Configuration (Phase 38) */}
          {activeTab === 'financial' && (
            <CompanyFinancialEngineTab />
          )}

        </div>
      </div>
    </div>
  );
};
