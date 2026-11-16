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
  const { user, hasSignedInAccount, login, loginWithGoogle, register, logout, loading } = useAuth();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg(isVi ? 'Cửa sổ đăng nhập Google đã được đóng.' : 'Google popup closed.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(isVi ? 'Trình duyệt đang chặn popup. Vui lòng cho phép popup rồi thử lại.' : 'Popup blocked by browser.');
      } else {
        setErrorMsg(err?.message || (isVi ? 'Đăng nhập Google thất bại' : 'Google sign-in failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

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
                {hasSignedInAccount 
                  ? (isVi ? 'Hồ Sơ Tài Khoản Đồng Bộ' : 'Synced Account Profile')
                  : (isVi ? 'Đồng Bộ Danh Tính Đa Thiết Bị' : 'Cross-Device Identity')}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Đăng nhập Google để tự động nhận diện phiên làm việc mọi nơi' : 'Identity & Cross-Device Continuity'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {hasSignedInAccount ? (
            /* Signed-in Google / Email Profile View */
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isVi ? 'Đã liên kết tài khoản đám mây' : 'Authenticated Cloud Account'}</span>
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
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={submitting || loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isVi ? 'Đăng Xuất' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sign In / Google 1-Tap / Register Form */
            <div className="space-y-4">
              {/* Google 1-Click Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting || loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                </svg>
                <span>{isVi ? 'Đăng Nhập Nhanh Bằng Google (Khuyên Dùng)' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {isVi ? 'Hoặc dùng Email / Mật khẩu' : 'Or with Email'}
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Tab Selector */}
              <div className="flex p-1 rounded-xl bg-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setTab('LOGIN'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                    tab === 'LOGIN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isVi ? 'Đăng Nhập' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('REGISTER'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
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
