import React, { useState, useEffect } from 'react';
import { CompanyProfile } from '../types/logistics';
import { Building2, X, Save, CreditCard, UserCheck, ShieldCheck, Eye, Check, Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { uploadCompanyLogo } from '../services/firebase/fileStorageService';
import { syncHealthService } from '../services/integrity/syncHealthService';

interface CompanyProfileModalProps {
  company: CompanyProfile;
  isOpen: boolean;
  initialTab?: 'profile' | 'sales' | 'bank' | 'preview';
  onClose: () => void;
  onSaveCompany: (updated: CompanyProfile) => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  company,
  isOpen,
  initialTab = 'profile',
  onClose,
  onSaveCompany
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'sales' | 'bank' | 'preview'>('profile');
  const [formData, setFormData] = useState<CompanyProfile>({ ...company });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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
    const uploadId = `logo_${Date.now()}`;
    syncHealthService.startUpload(uploadId, file.name, file.size);

    try {
      const result = await uploadCompanyLogo(file);
      setFormData(prev => ({ ...prev, logoUrl: result.downloadUrl }));
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
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...company });
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, company, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Quản Lý Thông Tin Doanh Nghiệp (Forwarder Profile)
              </h3>
              <p className="text-[11px] text-slate-400">
                Thông tin này là Source of Truth cho toàn bộ đầu trang báo giá, preview, file PDF và Excel
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 font-bold transition-all ${
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
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 font-bold transition-all ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Người Báo Giá (Sales)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 font-bold transition-all ${
              activeTab === 'bank'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>3. Tài Khoản Ngân Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 font-bold transition-all ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>4. Xem Trước Đầu Báo Giá</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          
          {/* TAB 1: Legal & Company Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên Doanh Nghiệp / Công Ty (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ví dụ: CÔNG TY TNHH GIAO NHẬN TIẾP VẬN QUỐC TẾ ABC..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">
                    Tên Doanh Nghiệp Tiếng Anh (English Name)
                  </label>
                  <input
                    type="text"
                    value={formData.englishName}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: ABC INTERNATIONAL LOGISTICS COMPANY LIMITED"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tên Viết Tắt / Thương Hiệu (Short Name)
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: ABC LOGISTICS"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mã Số Thuế (Tax Code / MST) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: 031xxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Số Điện Thoại Tổng Đài / Hotline *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: (+84) 28 3840 xxxx"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Email Công Ty *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: pricing@yourcompany.com.vn"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Địa Chỉ Trụ Sở Doanh Nghiệp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Số 123 Đường ABC, Phường X, Quận Y, TP. Hồ Chí Minh"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">
                    Website Công Ty
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: www.yourcompany.com.vn"
                  />
                </div>

                {/* Logo Upload Section */}
                <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        Logo Doanh Nghiệp (Hiển thị trên Báo Giá & PDF)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Được lưu trữ 100% trên Firebase Storage & tự động đồng bộ tới mọi thiết bị khác.
                      </p>
                    </div>
                  </div>

                  {formData.logoUrl ? (
                    <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="w-24 h-16 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Logo đã tải lên đám mây Firebase
                        </span>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {formData.logoUrl.slice(0, 60)}...
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 flex items-center gap-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Gỡ Logo
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors bg-white">
                      <label className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                        {isUploadingLogo ? (
                          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs py-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Đang tải logo lên Firebase Cloud...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-blue-700 hover:underline">
                                Nhấp để chọn tệp logo
                              </span>
                              <span className="text-xs text-slate-500"> hoặc kéo thả vào đây</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Hỗ trợ định dạng PNG, JPG, SVG, WebP (Tối đa 5MB)
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingLogo}
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {logoUploadError && (
                    <div className="text-[11px] text-red-600 font-medium">
                      ⚠️ {logoUploadError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sales Rep */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60 text-[11px] text-emerald-900">
                👤 Thông tin chuyên viên sẽ xuất hiện tại phần <strong>Người Lập Báo Giá</strong> và <strong>Khung Ký Tên Đại Diện Công Ty</strong>.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Họ & Tên Chuyên Viên Sales *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.salesRepName}
                    onChange={(e) => setFormData({ ...formData, salesRepName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Chức Danh / Phòng Ban (Position) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.salesRepTitle}
                    onChange={(e) => setFormData({ ...formData, salesRepTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Senior Pricing & Sales Executive"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Số Điện Thoại Di Động / Zalo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.salesRepPhone}
                    onChange={(e) => setFormData({ ...formData, salesRepPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: (+84) 909 xxx xxx"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Email Cá Nhân Chuyên Viên Sales *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.salesRepEmail}
                    onChange={(e) => setFormData({ ...formData, salesRepEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: sales.rep@yourcompany.com.vn"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Banking Info */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-200/60 text-[11px] text-indigo-900">
                💳 Thông tin tài khoản ngân hàng sẽ được đưa vào phần <strong>Điều khoản thanh toán & Chuyển khoản</strong> trên báo giá.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên Ngân Hàng & Chi Nhánh *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN TP.HCM"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên Chủ Tài Khoản (Không Dấu) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankAccountHolder}
                    onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: CONG TY TNHH GIAO NHAN TIEP VAN ABC"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Số Tài Khoản (VND / USD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankAccountNo}
                    onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: 007100xxxxxxx (VND) / 007100yyyyyyy (USD)"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Mã SWIFT Code (Chuyển khoản quốc tế)
                  </label>
                  <input
                    type="text"
                    value={formData.bankSwiftCode}
                    onChange={(e) => setFormData({ ...formData, bankSwiftCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: BFTVVNVX"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Live Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="border-b-2 border-blue-900 pb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-extrabold text-blue-950 text-base uppercase">
                      {formData.name || 'CHƯA CẤU HÌNH TÊN DOANH NGHIỆP'}
                    </h4>
                    {formData.englishName && <p className="text-slate-500 text-[11px] italic">{formData.englishName}</p>}
                    <p className="text-slate-700 mt-1">ĐC: {formData.address || 'Chưa cấu hình địa chỉ'}</p>
                    <p className="text-slate-700">
                      MST: <span className="font-mono font-bold">{formData.taxId || 'N/A'}</span> | Tel: {formData.phone || 'N/A'} | Email: {formData.email || 'N/A'}
                    </p>
                    {formData.website && <p className="text-slate-700">Website: {formData.website}</p>}
                  </div>
                  {formData.logoUrl && (
                    <div className="h-16 w-32 shrink-0 bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo Preview" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded border border-slate-200 text-[11px] space-y-1">
                  <p className="font-bold text-blue-900 uppercase">THÔNG TIN CHUYỂN KHOẢN:</p>
                  <p>• Ngân hàng: {formData.bankName || 'Chưa cấu hình'}</p>
                  <p>• Số TK: <span className="font-mono font-bold text-slate-900">{formData.bankAccountNo || 'Chưa cấu hình'}</span></p>
                  <p>• Chủ tài khoản: <span className="font-bold">{formData.bankAccountHolder || 'Chưa cấu hình'}</span></p>
                  {formData.bankSwiftCode && <p>• SWIFT Code: <span className="font-mono">{formData.bankSwiftCode}</span></p>}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-[11px]">
                  <div className="text-center p-3 bg-white rounded border border-slate-200">
                    <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN KHÁCH HÀNG</p>
                    <p className="text-slate-400 italic text-[10px]">(Ký & ghi rõ họ tên)</p>
                    <div className="h-14"></div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-slate-200">
                    <p className="font-bold text-blue-900 uppercase">ĐẠI DIỆN CÔNG TY BÁO GIÁ</p>
                    <p className="text-slate-400 italic text-[10px]">({formData.shortName || 'FORWARDER'})</p>
                    <div className="h-10"></div>
                    <p className="font-bold text-slate-900">{formData.salesRepName || 'Chưa thiết lập sales'}</p>
                    <p className="text-slate-500 text-[10px]">{formData.salesRepTitle}</p>
                    <p className="text-slate-500 text-[10px]">Tel: {formData.salesRepPhone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <div className="text-slate-500 text-[11px] flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dữ liệu được lưu trữ trực tiếp vào Firebase Cloud & Single Source of Truth.</span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
              >
                Đóng
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Lưu & Đồng Bộ Toàn Hệ Thống</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
