import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Laptop,
  Database,
  CheckCircle2,
  AlertCircle,
  Cloud,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCloudVaultStatus } from '../services/firebase/cloudStorageVaultService';

export interface CrossDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  counts: {
    quotes: number;
    customers: number;
    rates: number;
    contracts: number;
    shipments: number;
  };
  onForceSync: () => Promise<void>;
}

export const CrossDeviceSyncModal: React.FC<CrossDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  isSyncing,
  lastSyncedAt,
  counts,
  onForceSync,
}) => {
  const { user, hasSignedInAccount, loginWithGoogle, logout } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const effectiveWorkspaceId = (workspaceId || 'company_profile').trim();

  const pairingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?workspace=${encodeURIComponent(effectiveWorkspaceId)}`
      : `?workspace=${encodeURIComponent(effectiveWorkspaceId)}`;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setQrError(null);
    QRCode.toDataURL(pairingUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError('Không thể tạo mã QR.');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, pairingUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const vaultModules = getCloudVaultStatus(effectiveWorkspaceId);
  const hydratedVaultCount = vaultModules.filter((m) => m.isHydrated).length;
  const vaultRecordsCount = vaultModules.reduce((acc, m) => acc + (m.count || 0), 0);

  const handleCopyPairingLink = async () => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await loginWithGoogle();
      await onForceSync();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Cửa sổ đăng nhập Google đã đóng.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Trình duyệt đang chặn popup. Vui lòng cho phép popup và thử lại.');
      } else {
        setAuthError(err?.message || 'Đăng nhập Google không thành công.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await logout();
    } finally {
      setAuthBusy(false);
    }
  };

  const formatSyncTime = (d: Date | null) => {
    if (!d) return 'Chưa có mốc';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-slate-900 text-white shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Mở & Đồng Bộ Dữ Liệu Thật Trên Thiết Bị Khác
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Workspace: <span className="font-mono font-semibold text-slate-700">{workspaceName || effectiveWorkspaceId}</span>
                {' · '}
                Mã đồng bộ: <span className="font-mono text-slate-700">{effectiveWorkspaceId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
            title="Đóng cửa sổ (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body: Two clean 1px-bordered columns (Zero nested card clutter) */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left Column: QR Pairing & Direct Link */}
          <div className="md:col-span-5 p-5 flex flex-col items-center justify-between bg-slate-50/40">
            <div className="w-full text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 mb-3">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>Quét QR Để Mở Ngay Trên Điện Thoại</span>
              </div>

              <div className="mx-auto w-52 h-52 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Workspace ${effectiveWorkspaceId}`}
                    className="w-full h-full object-contain"
                  />
                ) : qrError ? (
                  <span className="text-xs text-rose-600 font-medium">{qrError}</span>
                ) : (
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                Quét mã bằng camera điện thoại hoặc gửi đường dẫn bên dưới sang máy tính khác để tự động kết nối đúng kho dữ liệu Cloud này.
              </p>
            </div>

            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <input
                  type="text"
                  readOnly
                  value={pairingUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full text-[11px] font-mono text-slate-600 bg-transparent focus:outline-none truncate"
                  aria-label="Liên kết đồng bộ đa thiết bị"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyPairingLink}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer whitespace-nowrap ${
                    copiedLink
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã Sao Chép' : 'Sao Chép Link'}</span>
                </button>

                <a
                  href={pairingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Tab Mới</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Google Identity + Live Cloud Inventory + 1-Click Server Pull */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between space-y-4">
            {/* Section 1: Cross-Device Identity (Google Login) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>1. Định Danh Tài Khoản Đa Thiết Bị</span>
                </h3>
                <span className={`text-[11px] font-semibold ${hasSignedInAccount ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {hasSignedInAccount ? 'Đã liên kết tài khoản' : 'Chế độ Workspace mở'}
                </span>
              </div>

              {hasSignedInAccount ? (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 rounded-full border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {(user?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {user?.displayName || 'Người dùng hệ thống'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 truncate">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={authBusy}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đổi TK</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <Laptop className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      Đăng nhập cùng tài khoản Google trên các máy khác nhau để đồng bộ tức thì phiên làm việc & bản nháp đang soạn.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={authBusy}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                    </svg>
                    <span>{authBusy ? 'Đang kết nối Google...' : 'Đăng Nhập Nhanh Bằng Google'}</span>
                  </button>
                </div>
              )}

              {authError && (
                <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            {/* Section 2: Real Data Inventory Table (Dense 1px divider grid, tabular-nums) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <span>2. Dữ Liệu Thực Tế Đang Đồng Bộ Trên Máy Này</span>
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Cập nhật: {formatSyncTime(lastSyncedAt)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
                <div className="px-3.5 py-2 flex items-center justify-between bg-slate-50/70">
                  <span className="font-medium text-slate-600">Báo giá đã tạo (Quotations)</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{counts.quotes} hồ sơ</span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between bg-white">
                  <span className="font-medium text-slate-600">Khách hàng (CRM Customers)</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{counts.customers} doanh nghiệp</span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between bg-slate-50/70">
                  <span className="font-medium text-slate-600">Biểu cước Master (Rate Masters)</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{counts.rates} tuyến cước</span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between bg-white">
                  <span className="font-medium text-slate-600">Hợp đồng & Lô hàng vận hành</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {counts.contracts} HĐ · {counts.shipments} Lô hàng
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between bg-slate-50/70">
                  <span className="font-medium text-slate-600">Firebase Storage Vault (14 phân hệ)</span>
                  <span className="font-mono font-bold tabular-nums text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {hydratedVaultCount}/{vaultModules.length} phân hệ ({vaultRecordsCount} mục)
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action: Force Cloud Server Pull */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Cloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Truy vấn trực tiếp từ Cloud Server (bỏ qua cache cũ)</span>
              </div>

              <button
                type="button"
                onClick={onForceSync}
                disabled={isSyncing}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang Đồng Bộ...' : 'Đồng Bộ Từ Cloud Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
