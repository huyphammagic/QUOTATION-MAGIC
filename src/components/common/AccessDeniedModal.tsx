import React from 'react';
import { ShieldX, ArrowLeft, KeyRound, UserCheck, ShieldAlert } from 'lucide-react';
import { UserRole } from '../../types/analytics';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  requiredRoleDesc?: string;
  moduleName?: string;
  onSwitchRole?: (newRole: UserRole) => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  requiredRoleDesc,
  moduleName,
  onSwitchRole,
}) => {
  if (!isOpen) return null;

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Quản Trị Viên (Admin)',
    SALES_MANAGER: 'Trưởng Phòng Kinh Doanh (Sales Manager)',
    SALES_REP: 'Chuyên Viên Sales (Sales Rep)',
    PRICING_SPECIALIST: 'Chuyên Viên Định Giá (Pricing Specialist)',
    VIEWER: 'Người Xem (Viewer)',
  };

  return (
    <div 
      id="access-denied-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-slate-800 text-left">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <ShieldX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Không Có Quyền Truy Cập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân quyền bảo mật RBAC (Role-Based Access Control)
            </p>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 mb-4 text-xs text-amber-900 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Mục: {moduleName || 'Chức năng được bảo vệ'}</span>
          </div>
          <div className="text-slate-600">
            Vai trò hiện tại của bạn: <strong className="text-slate-900">{roleLabels[currentRole] || currentRole}</strong>
          </div>
          {requiredRoleDesc && (
            <div className="text-slate-600">
              Yêu cầu quyền: <strong className="text-amber-700">{requiredRoleDesc}</strong>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          Chức năng này chứa các công thức giá, chính sách chiết khấu hoặc thông số lợi nhuận nhạy cảm của doanh nghiệp, yêu cầu quyền quản trị hoặc thẩm quyền tương ứng để xem và sửa đổi.
        </p>

        {onSwitchRole && (
          <div className="mb-5 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>Môi trường thử nghiệm - Chuyển đổi vai trò nhanh</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['ADMIN', 'SALES_MANAGER', 'PRICING_SPECIALIST'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onSwitchRole(r);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 transition-colors cursor-pointer"
                >
                  Đổi sang {r === 'ADMIN' ? 'Admin' : r === 'SALES_MANAGER' ? 'Manager' : 'Pricing'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="btn-access-denied-back"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Đã Hiểu, Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
};
