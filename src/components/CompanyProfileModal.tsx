import React, { useState, useEffect } from 'react';
import { CompanyProfile } from '../types/logistics';
import { Building2, X, Save, CreditCard, UserCheck, ShieldCheck, Eye, Sparkles, RefreshCw, Check } from 'lucide-react';

interface CompanyProfileModalProps {
  company: CompanyProfile;
  isOpen: boolean;
  initialTab?: 'profile' | 'sales' | 'bank' | 'preview';
  onClose: () => void;
  onSaveCompany: (updated: CompanyProfile) => void;
}

const PRESET_COMPANIES: { title: string; profile: CompanyProfile }[] = [
  {
    title: 'Global Seaways Logistics',
    profile: {
      name: 'CÔNG TY CỔ PHẦN LOGISTICS & VẬN TẢI QUỐC TẾ GLOBAL SEAWAYS',
      englishName: 'GLOBAL SEAWAYS LOGISTICS JOINT STOCK COMPANY',
      shortName: 'GSL LOGISTICS',
      taxId: '0312984712',
      address: 'Tầng 8, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Q. Bình Thạnh, TP. Hồ Chí Minh',
      phone: '(+84) 28 3840 9988',
      email: 'pricing@globalseaways.com.vn',
      website: 'www.globalseaways.com.vn',
      bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN TP.HCM',
      bankAccountNo: '0071001289388 (VND) / 0071001289399 (USD)',
      bankAccountHolder: 'CONG TY CP LOGISTICS & VAN TAI QUOC TE GLOBAL SEAWAYS',
      bankSwiftCode: 'BFTVVNVX007',
      salesRepName: 'Nguyễn Văn Hùng',
      salesRepTitle: 'Senior Pricing & Sales Executive',
      salesRepPhone: '(+84) 909 123 456',
      salesRepEmail: 'hung.nguyen@globalseaways.com.vn'
    }
  },
  {
    title: 'Tân Cảng Express Forwarding',
    profile: {
      name: 'CÔNG TY TNHH TIẾP VẬN VÀ GIAO NHẬN TÂN CẢNG EXPRESS',
      englishName: 'TAN CANG EXPRESS FORWARDING & LOGISTICS CO., LTD',
      shortName: 'TCE LOGISTICS',
      taxId: '0309988776',
      address: 'Khu Cảng Cát Lái, Đường Lê Phụng Hiểu, Phường Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh',
      phone: '(+84) 28 3742 2222',
      email: 'quote@tancang-express.vn',
      website: 'www.tancang-express.vn',
      bankName: 'Ngân hàng TMCP Quân Đội (MBBank) - CN Sài Gòn',
      bankAccountNo: '110019998888 (VND)',
      bankAccountHolder: 'CONG TY TNHH TIEP VAN VA GIAO NHAN TAN CANG EXPRESS',
      bankSwiftCode: 'MBVCVNVX',
      salesRepName: 'Trần Minh Tuấn',
      salesRepTitle: 'Trưởng Nhóm Sales Cước & Logistics',
      salesRepPhone: '0988 567 890',
      salesRepEmail: 'tuan.tran@tancang-express.vn'
    }
  },
  {
    title: 'VietTrans International',
    profile: {
      name: 'CÔNG TY CỔ PHẦN GIAO NHẬN VẬN TẢI QUỐC TẾ VIETTRANS',
      englishName: 'VIETTRANS INTERNATIONAL FREIGHT FORWARDERS CORP',
      shortName: 'VIETTRANS',
      taxId: '0100109988',
      address: 'Tòa nhà VCCI, Số 9 Đào Duy Anh, Quận Đống Đa, TP. Hà Nội',
      phone: '(+84) 24 3574 1111',
      email: 'sales@viettrans-intl.com',
      website: 'www.viettrans-intl.com',
      bankName: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank) - CN Đống Đa',
      bankAccountNo: '112000888999 (VND)',
      bankAccountHolder: 'CONG TY CP GIAO NHAN VAN TAI QUOC TE VIETTRANS',
      bankSwiftCode: 'ICBVVNVX',
      salesRepName: 'Lê Hoàng Yến',
      salesRepTitle: 'Key Account Manager - Air & Sea Freight',
      salesRepPhone: '0915 678 123',
      salesRepEmail: 'yen.le@viettrans-intl.com'
    }
  }
];

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  company,
  isOpen,
  initialTab = 'profile',
  onClose,
  onSaveCompany
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'sales' | 'bank' | 'preview'>('profile');
  const [formData, setFormData] = useState<CompanyProfile>({ ...company });

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

  const handleApplyPreset = (preset: CompanyProfile) => {
    setFormData({ ...preset });
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
                Thông tin này sẽ được thể hiện trực tiếp trên đầu trang báo giá, file PDF và Excel
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

        {/* Preset Quick Loader Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Mẫu doanh nghiệp tiêu chuẩn:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COMPANIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.profile)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 hover:border-blue-300 rounded font-medium text-[11px] transition-colors"
              >
                {preset.title}
              </button>
            ))}
          </div>
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
            <span>1. Pháp Lý & Liên Hệ</span>
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
            <span>2. Người Lập Báo Giá (Sales)</span>
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
            <span>4. Xem Trước Báo Giá (Preview)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* TAB 1: Company Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/60 text-[11px] text-blue-900">
                💡 Thông tin này sẽ xuất hiện trên <strong>Header chính</strong> của bảng báo giá (Web, PDF, Excel) gửi tới khách hàng.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên Doanh Nghiệp (Tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="CÔNG TY CỔ PHẦN LOGISTICS..."
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
                    placeholder="GLOBAL SEAWAYS LOGISTICS JOINT STOCK COMPANY"
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
                    placeholder="GSL LOGISTICS"
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
                    placeholder="0312984712"
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
                    placeholder="(+84) 28 3840 9988"
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
                    placeholder="pricing@company.com.vn"
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
                    placeholder="Tầng 8, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Q. Bình Thạnh, TP. HCM"
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
                    placeholder="www.companylogistics.com.vn"
                  />
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
                    placeholder="Nguyễn Văn Hùng"
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
                    placeholder="Senior Pricing & Sales Executive"
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
                    placeholder="(+84) 909 123 456"
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
                    placeholder="hung.nguyen@company.com.vn"
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
                    placeholder="Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN TP.HCM"
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
                    placeholder="CONG TY CP LOGISTICS & VAN TAI QUOC TE GLOBAL SEAWAYS"
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
                    placeholder="0071001289388 (VND) / 0071001289399 (USD)"
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
                    placeholder="BFTVVNVX007"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Live Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="border-b-2 border-blue-900 pb-3">
                  <h4 className="font-extrabold text-blue-950 text-base uppercase">{formData.name}</h4>
                  {formData.englishName && <p className="text-slate-500 text-[11px] italic">{formData.englishName}</p>}
                  <p className="text-slate-700 mt-1">ĐC: {formData.address}</p>
                  <p className="text-slate-700">
                    MST: <span className="font-mono font-bold">{formData.taxId}</span> | Tel: {formData.phone} | Email: {formData.email}
                  </p>
                  {formData.website && <p className="text-slate-700">Website: {formData.website}</p>}
                </div>

                <div className="bg-white p-3 rounded border border-slate-200 text-[11px] space-y-1">
                  <p className="font-bold text-blue-900 uppercase">THÔNG TIN CHUYỂN KHOẢN:</p>
                  <p>• Ngân hàng: {formData.bankName}</p>
                  <p>• Số TK: <span className="font-mono font-bold text-slate-900">{formData.bankAccountNo}</span></p>
                  <p>• Chủ tài khoản: <span className="font-bold">{formData.bankAccountHolder}</span></p>
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
                    <p className="font-bold text-slate-900">{formData.salesRepName}</p>
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
              <span>Dữ liệu được lưu trữ an toàn trong trình duyệt & file backup.</span>
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
                <span>Lưu & Áp Dụng Báo Giá</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
