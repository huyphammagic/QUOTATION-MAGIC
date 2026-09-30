import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  Key, 
  Mail, 
  User, 
  Lock, 
  Check, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { 
  CompanyMemberRecord, 
  CompanyMemberRole, 
  CompanyMemberPermission 
} from '../../types/multiCompany';
import { 
  getCompanyMembers, 
  updateCompanyMemberRole, 
  addCompanyMember, 
  removeCompanyMember,
  DEFAULT_ROLE_PERMISSIONS 
} from '../../services/repository/companyMemberRepository';
import { useAuth } from '../../context/AuthContext';
import { useMultiCompany } from '../../context/MultiCompanyContext';

interface CompanyMembersTabProps {
  companyId: string;
  companyName: string;
  isVi?: boolean;
}

export const CompanyMembersTab: React.FC<CompanyMembersTabProps> = ({
  companyId,
  companyName,
  isVi = true,
}) => {
  const { user } = useAuth();
  const { activePermissions, activeMemberRole } = useMultiCompany();

  const [members, setMembers] = useState<CompanyMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<CompanyMemberRole>('SALES_REP');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);

  const canManage = Boolean(activePermissions?.canManageMembers || activeMemberRole === 'COMPANY_ADMIN');

  const loadMembers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const list = await getCompanyMembers(companyId);
      setMembers(list);
    } catch (err) {
      console.warn('[CompanyMembersTab] Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRoleChange = async (membershipId: string, role: CompanyMemberRole) => {
    if (!canManage || !user?.uid) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const ok = await updateCompanyMemberRole(membershipId, role, {
        uid: user.uid,
        email: user.email || undefined,
      });
      if (ok) {
        setMessage({
          type: 'success',
          text: isVi ? `Đã cập nhật vai trò thành công thành ${role}` : `Updated role to ${role}`,
        });
        await loadMembers();
      } else {
        setMessage({
          type: 'error',
          text: isVi ? 'Không thể cập nhật vai trò' : 'Failed to update role',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating role' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (membershipId: string, email: string) => {
    if (!canManage || !user?.uid) return;
    if (!window.confirm(isVi ? `Xác nhận vô hiệu hóa thành viên ${email}?` : `Deactivate member ${email}?`)) {
      return;
    }
    setSubmitting(true);
    try {
      const ok = await removeCompanyMember(membershipId, {
        uid: user.uid,
        email: user.email || undefined,
      });
      if (ok) {
        setMessage({
          type: 'success',
          text: isVi ? `Đã vô hiệu hóa thành viên ${email}` : `Member ${email} deactivated`,
        });
        await loadMembers();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error removing member' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setMessage({ type: 'error', text: isVi ? 'Vui lòng nhập email thành viên' : 'Please provide member email' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const added = await addCompanyMember(companyId, {
        userEmail: newEmail.trim(),
        userName: newName.trim() || undefined,
        role: newRole,
      }, {
        uid: user?.uid || 'admin',
        email: user?.email || undefined,
      });

      if (added) {
        setMessage({
          type: 'success',
          text: isVi ? `Đã phân quyền thành viên ${added.userEmail} thành công!` : `Added member ${added.userEmail}!`,
        });
        setNewEmail('');
        setNewName('');
        setIsAddingMember(false);
        await loadMembers();
      } else {
        setMessage({
          type: 'error',
          text: isVi ? 'Lỗi khi thêm thành viên' : 'Failed to add member',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error adding member' });
    } finally {
      setSubmitting(false);
    }
  };

  const ROLE_BADGE_STYLE: Record<CompanyMemberRole, string> = {
    COMPANY_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    LOGISTICS_MANAGER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    PRICING_SPECIALIST: 'bg-amber-100 text-amber-800 border-amber-200',
    SALES_REP: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    OPERATOR: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>{isVi ? 'Thành Viên & Phân Quyền RBAC' : 'Team Members & RBAC'}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-normal">
              {members.length} {isVi ? 'thành viên' : 'members'}
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isVi 
              ? `Pháp nhân: ${companyName} (${companyId}) • Phân quyền bảo mật Firestore & Multi-Company`
              : `Company: ${companyName} (${companyId}) • Firestore RBAC Security & Isolation`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>{isVi ? 'Bảng Quyền Hạn' : 'Permissions Matrix'}</span>
          </button>

          <button
            type="button"
            onClick={loadMembers}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddingMember(!isAddingMember)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-2xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thêm / Phân Quyền Mới' : 'Add / Assign Member'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setMessage(null)} 
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Permission Matrix Drawer / Card */}
      {showPermissionMatrix && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              {isVi ? 'Quy Định Quyền Hạn Theo Vai Trò (Production Matrix)' : 'Role Permission Matrix'}
            </span>
            <button
              type="button"
              onClick={() => setShowPermissionMatrix(false)}
              className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold"
            >
              {isVi ? 'Thu gọn' : 'Close'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-indigo-200 bg-white rounded-lg overflow-hidden">
              <thead className="bg-indigo-100/70 text-indigo-900 font-bold border-b border-indigo-200">
                <tr>
                  <th className="p-2">{isVi ? 'Vai trò' : 'Role'}</th>
                  <th className="p-2 text-center">{isVi ? 'Tạo Báo Giá' : 'Create Quotes'}</th>
                  <th className="p-2 text-center">{isVi ? 'Duyệt Báo Giá' : 'Approve Quotes'}</th>
                  <th className="p-2 text-center">{isVi ? 'Quản Trị Giá' : 'Manage Rates'}</th>
                  <th className="p-2 text-center">{isVi ? 'Xem Lợi Nhuận' : 'View Margin'}</th>
                  <th className="p-2 text-center">{isVi ? 'Hồ Sơ Cty' : 'Edit Profile'}</th>
                  <th className="p-2 text-center">{isVi ? 'Quản Trị TV' : 'Manage Members'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100 font-medium text-slate-700">
                {(['COMPANY_ADMIN', 'LOGISTICS_MANAGER', 'PRICING_SPECIALIST', 'SALES_REP', 'OPERATOR', 'VIEWER'] as CompanyMemberRole[]).map(r => {
                  const p = DEFAULT_ROLE_PERMISSIONS[r];
                  return (
                    <tr key={r} className="hover:bg-indigo-50/40">
                      <td className="p-2 font-bold text-slate-900">{r}</td>
                      <td className="p-2 text-center">{p.canCreateQuotes ? '✓' : '—'}</td>
                      <td className="p-2 text-center">{p.canApproveQuotes ? '✓' : '—'}</td>
                      <td className="p-2 text-center">{p.canManageRates ? '✓' : '—'}</td>
                      <td className="p-2 text-center">{p.canViewProfitability ? '✓' : '—'}</td>
                      <td className="p-2 text-center">{p.canEditCompanyProfile ? '✓' : '—'}</td>
                      <td className="p-2 text-center font-bold text-indigo-700">{p.canManageMembers ? '✓' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {isAddingMember && (
        <form onSubmit={handleAddMemberSubmit} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-600" />
              {isVi ? 'Thêm Thành Viên Vào Pháp Nhân Này' : 'Assign New Member'}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingMember(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {isVi ? 'Họ và Tên' : 'Full Name'}
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nguyen Van A"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {isVi ? 'Vai trò (Role)' : 'Role'}
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as CompanyMemberRole)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="SALES_REP">SALES_REP (Báo giá & CSKH)</option>
                <option value="PRICING_SPECIALIST">PRICING_SPECIALIST (Quản trị biểu cước)</option>
                <option value="LOGISTICS_MANAGER">LOGISTICS_MANAGER (Quản lý & Duyệt giá)</option>
                <option value="OPERATOR">OPERATOR (Điều hành giao nhận)</option>
                <option value="VIEWER">VIEWER (Chỉ xem báo cáo)</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN (Toàn quyền pháp nhân)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingMember(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-2xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isVi ? 'Xác Nhận Thêm' : 'Confirm Add'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Members Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">{isVi ? 'Thành Viên' : 'Member'}</th>
                <th className="p-3">{isVi ? 'Email / UID' : 'Email / UID'}</th>
                <th className="p-3">{isVi ? 'Vai Trò (Role)' : 'Role'}</th>
                <th className="p-3 text-center">{isVi ? 'Trạng Thái' : 'Status'}</th>
                <th className="p-3 text-right">{isVi ? 'Thao Tác' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-blue-600 mb-1" />
                    {isVi ? 'Đang tải danh sách thành viên...' : 'Loading company members...'}
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    <Users className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    {isVi ? 'Chưa có thành viên nào được phân quyền trong công ty này' : 'No members assigned to this company yet'}
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isCurrentUser = m.userId === user?.uid || m.userEmail === user?.email;
                  return (
                    <tr key={m.membershipId} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                            {m.userName ? m.userName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{m.userName || 'Logistics Member'}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                  {isVi ? 'Bạn' : 'You'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {isVi ? 'Gia nhập:' : 'Joined:'} {m.createdAt ? m.createdAt.slice(0, 10) : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-600">
                        <div className="font-mono text-xs text-slate-800">{m.userEmail}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                          {m.userId}
                        </div>
                      </td>

                      <td className="p-3">
                        {canManage ? (
                          <select
                            value={m.role}
                            disabled={submitting}
                            onChange={(e) => handleRoleChange(m.membershipId, e.target.value as CompanyMemberRole)}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${ROLE_BADGE_STYLE[m.role]}`}
                          >
                            <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                            <option value="LOGISTICS_MANAGER">LOGISTICS_MANAGER</option>
                            <option value="PRICING_SPECIALIST">PRICING_SPECIALIST</option>
                            <option value="SALES_REP">SALES_REP</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${ROLE_BADGE_STYLE[m.role]}`}>
                            {m.role}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {m.status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemove(m.membershipId, m.userEmail)}
                            disabled={submitting || (isCurrentUser && m.role === 'COMPANY_ADMIN')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                            title={isVi ? 'Vô hiệu hóa thành viên' : 'Deactivate member'}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
