import React, { useState } from 'react';
import { CompanyProfile } from '../types/logistics';
import { Settings, X, Save, Building, CreditCard, UserCheck } from 'lucide-react';

interface CompanyProfileModalProps {
  company: CompanyProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveCompany: (updated: CompanyProfile) => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  company,
  isOpen,
  onClose,
  onSaveCompany
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<CompanyProfile>({ ...company });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-700" />
            <h3 className="font-bold text-slate-900 text-base">Cấu Hình Thông Tin Doanh Nghiệp Forwarding</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Section 1: Company Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-cyan-800 font-bold border-b border-slate-100 pb-1">
              <Building className="w-4 h-4" />
              <span>THÔNG TIN PHÁP LÝ DỰ BÁO GIÁ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Tên Công Ty (Tiếng Việt)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Tên Tiếng Anh (English Name)</label>
                <input
                  type="text"
                  value={formData.englishName}
                  onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Mã Số Thuế (Tax ID)</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Số Điện Thoại Hotlines</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Địa Chỉ Đăng Ký Kinh Doanh</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Email Công Ty</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Banking Info */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-1.5 text-cyan-800 font-bold border-b border-slate-100 pb-1">
              <CreditCard className="w-4 h-4" />
              <span>TÀI KHOẢN NGÂN HÀNG NHẬN THANH TOÁN</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Tên Ngân Hàng & Chi Nhánh</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">Tên Chủ Tài Khoản</label>
                <input
                  type="text"
                  value={formData.bankAccountHolder}
                  onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Số Tài Khoản (VND / USD)</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Mã SWIFT Code (Chuyển quốc tế)</label>
                <input
                  type="text"
                  value={formData.bankSwiftCode}
                  onChange={(e) => setFormData({ ...formData, bankSwiftCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Sales Rep Info */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-1.5 text-cyan-800 font-bold border-b border-slate-100 pb-1">
              <UserCheck className="w-4 h-4" />
              <span>NGƯỜI LẬP BÁO GIÁ (SALES EXECUTIVE)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Họ & Tên Chuyên Viên Sales</label>
                <input
                  type="text"
                  value={formData.salesRepName}
                  onChange={(e) => setFormData({ ...formData, salesRepName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Chức Danh (Title)</label>
                <input
                  type="text"
                  value={formData.salesRepTitle}
                  onChange={(e) => setFormData({ ...formData, salesRepTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">SĐT Di Động / Zalo</label>
                <input
                  type="text"
                  value={formData.salesRepPhone}
                  onChange={(e) => setFormData({ ...formData, salesRepPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Email Cá Nhân Sales</label>
                <input
                  type="email"
                  value={formData.salesRepEmail}
                  onChange={(e) => setFormData({ ...formData, salesRepEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold flex items-center space-x-1.5 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
