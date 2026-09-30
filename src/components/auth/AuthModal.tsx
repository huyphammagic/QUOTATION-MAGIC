import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, User, LogIn, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVi?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isVi = true,
}) => {
  const { user, isAuthenticated, login, register, logout, loading } = useAuth();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg(isVi ? 'Vui lòng điền đầy đủ email và mật khẩu' : 'Please provide email and password');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'LOGIN') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMsg(isVi ? 'Email hoặc mật khẩu không chính xác' : 'Invalid email or password');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg(isVi ? 'Email này đã được sử dụng' : 'Email is already registered');
      } else if (code === 'auth/weak-password') {
        setErrorMsg(isVi ? 'Mật khẩu phải có ít nhất 6 ký tự' : 'Password must be at least 6 characters');
      } else {
        setErrorMsg(err.message || (isVi ? 'Xác thực thất bại' : 'Authentication failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await logout();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAuthenticated 
                  ? (isVi ? 'Hồ Sơ Tài Khoản Firebase' : 'Firebase Auth Profile')
                  : (isVi ? 'Đăng Nhập Hệ Thống' : 'System Authentication')}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Xác thực định danh & phân quyền bảo mật' : 'Identity & Access Control'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isAuthenticated ? (
            /* Logged In Profile View */
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isVi ? 'Đã xác thực thành công' : 'Authenticated'}</span>
                </div>
                <div className="space-y-1 text-slate-700 font-medium">
                  <p>Email: <strong className="text-slate-900">{user?.email}</strong></p>
                  <p>{isVi ? 'Họ tên' : 'Name'}: <strong className="text-slate-900">{user?.displayName}</strong></p>
                  <p className="font-mono text-[11px] text-slate-500 break-all">
                    UID: {user?.uid}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={submitting || loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isVi ? 'Đăng Xuất' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sign In / Sign Up Form */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex p-1 rounded-xl bg-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTab('LOGIN'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition ${
                    tab === 'LOGIN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isVi ? 'Đăng Nhập' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('REGISTER'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition ${
                    tab === 'REGISTER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isVi ? 'Tạo Tài Khoản' : 'Register'}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {tab === 'REGISTER' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isVi ? 'Họ và tên' : 'Display Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isVi ? 'Nguyễn Văn A' : 'Full Name'}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@logistics.vn"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isVi ? 'Mật khẩu' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{tab === 'LOGIN' ? (isVi ? 'Đăng Nhập' : 'Sign In') : (isVi ? 'Đăng Ký' : 'Register')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
