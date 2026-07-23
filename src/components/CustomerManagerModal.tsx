import React, { useState } from 'react';
import { CustomerRecord } from '../types/logistics';
import { 
  Users, Plus, Search, Edit2, Trash2, Building2, Phone, Mail, 
  MapPin, Check, X, FileText, UserCheck, ShieldCheck 
} from 'lucide-react';

interface CustomerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerRecord[];
  onSaveCustomer: (customer: CustomerRecord) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectCustomerForQuote?: (customer: CustomerRecord) => void;
}

export const CustomerManagerModal: React.FC<CustomerManagerModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectCustomerForQuote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<CustomerRecord>>({});

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxId.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  const handleAddNew = () => {
    const newCode = `KH-00${customers.length + 1}`;
    setEditingCustomer({
      id: `cust-${Date.now()}`,
      code: newCode,
      companyName: '',
      customerName: '',
      contactPerson: '',
      taxId: '',
      address: '',
      email: '',
      phone: '',
      group: 'Khách Thương Mại',
      notes: '',
      createdDate: new Date().toISOString().slice(0, 10)
    });
    setIsEditing(true);
  };

  const handleEdit = (cust: CustomerRecord) => {
    setEditingCustomer({ ...cust });
    setIsEditing(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer.companyName || !editingCustomer.customerName) return;

    onSaveCustomer(editingCustomer as CustomerRecord);
    setIsEditing(false);
    setEditingCustomer({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-700 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                QUẢN LÝ DỮ LIỆU KHÁCH HÀNG (CUSTOMER CRM)
              </h2>
              <p className="text-xs text-slate-400">
                Danh bạ doanh nghiệp, mã số thuế & liên hệ phục vụ lập báo giá
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên công ty, MST, người liên hệ, SĐT..."
              className="w-full pl-9 pr-3 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-500 font-mono">
              Tổng: {filteredCustomers.length} KH
            </span>
            <button
              onClick={handleAddNew}
              className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khách Hàng Mới</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Form Create/Edit */}
          {isEditing && (
            <form onSubmit={handleSubmitForm} className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  {editingCustomer.id ? 'Hiệu Chỉnh Khách Hàng' : 'Tạo Khách Hàng Mới'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Mã Khách Hàng *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.code || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-500 font-bold mb-1">Tên Doanh Nghiệp / Công Ty *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.companyName || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="CÔNG TY TNHH ABC..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Mã Số Thuế (Tax ID)</label>
                  <input
                    type="text"
                    value={editingCustomer.taxId || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="0312345678"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Người Đại Diện / Nhận Báo Giá *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.customerName || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Chức Danh / Liên Hệ Phụ</label>
                  <input
                    type="text"
                    value={editingCustomer.contactPerson || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Ms. A - Trưởng phòng XNK"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Số Điện Thoại *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0909 123 456"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Email Nhận Báo Giá *</label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Nhóm Ngành / Phân Loại</label>
                  <input
                    type="text"
                    value={editingCustomer.group || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, group: e.target.value }))}
                    placeholder="Dệt May / Gỗ / Điện Tử..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-500 font-bold mb-1">Địa Chỉ Đăng Ký Kinh Doanh / Kho</label>
                  <input
                    type="text"
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Số 123 Đường XYZ, Q.1, TP.HCM"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-500 font-bold mb-1">Ghi Chú Đặc Thù Dịch Vụ</label>
                  <input
                    type="text"
                    value={editingCustomer.notes || ''}
                    onChange={(e) => setEditingCustomer(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Khách hàng ưu tiên đi cước trả sau, yêu cầu vỏ container đẹp..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded shadow-2xs flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Hồ Sơ Khách Hàng</span>
                </button>
              </div>
            </form>
          )}

          {/* Customer Table Grid */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3 w-16">Mã KH</th>
                  <th className="p-3">Doanh Nghiệp / Công Ty</th>
                  <th className="p-3">Mã Số Thuế</th>
                  <th className="p-3">Người Đại Diện</th>
                  <th className="p-3">SĐT & Email</th>
                  <th className="p-3">Nhóm Ngành</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      Chưa tìm thấy khách hàng nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-900">
                        {cust.code}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{cust.companyName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{cust.address || 'Chưa cập nhật địa chỉ'}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {cust.taxId || '—'}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{cust.customerName}</div>
                        {cust.contactPerson && (
                          <div className="text-[11px] text-slate-500">{cust.contactPerson}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{cust.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {cust.group || 'Chung'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {onSelectCustomerForQuote && (
                          <button
                            onClick={() => {
                              onSelectCustomerForQuote(cust);
                              onClose();
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1"
                            title="Chọn khách hàng này cho Báo Giá đang tạo"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Chọn Áp Báo Giá</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(cust)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa thông tin khách hàng ${cust.companyName}?`)) {
                              onDeleteCustomer(cust.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa khách hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>Hệ thống quản lý dữ liệu Khách Hàng Logistics</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
