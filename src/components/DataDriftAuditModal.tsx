import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Building2, 
  UserCheck, 
  CreditCard, 
  X, 
  ArrowRight,
  Database,
  ExternalLink
} from 'lucide-react';
import { DataDriftReport, DataDriftItem } from '../services/audit/dataDriftDetector';

interface DataDriftAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DataDriftReport;
  onReconcile: () => void;
  onForceRefreshCloud: () => Promise<void>;
  onOpenCompanyProfile: () => void;
  isSyncing?: boolean;
}

export const DataDriftAuditModal: React.FC<DataDriftAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  onReconcile,
  onForceRefreshCloud,
  onOpenCompanyProfile,
  isSyncing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
              report.overallStatus === 'IN_SYNC' 
                ? 'bg-emerald-600 text-white' 
                : report.overallStatus === 'DRIFT_DETECTED' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-amber-600 text-white'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Single Source of Truth & Data Integrity Audit
                </h2>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border ${
                  report.overallStatus === 'IN_SYNC'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : report.overallStatus === 'DRIFT_DETECTED'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/30 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}>
                  {report.overallStatus === 'IN_SYNC' ? '100% IN SYNC' : report.overallStatus === 'DRIFT_DETECTED' ? 'DATA DRIFT DETECTED' : 'UNCONFIGURED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kiểm soát tính nhất quán dữ liệu tuyệt đối giữa Firebase Cloud và Báo giá #{report.activeQuoteNumber}
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

        {/* Status Banner */}
        <div className={`px-6 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          report.overallStatus === 'IN_SYNC'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : report.overallStatus === 'DRIFT_DETECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start space-x-2.5">
            {report.overallStatus === 'IN_SYNC' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">
                {report.overallStatus === 'IN_SYNC'
                  ? 'Tuyệt đối đồng bộ — Không phát hiện lệch dữ liệu'
                  : report.overallStatus === 'DRIFT_DETECTED'
                    ? `Phát hiện ${report.driftCount} trường dữ liệu bị lệch giữa Hồ sơ Doanh nghiệp và Báo giá`
                    : 'Hồ sơ Doanh nghiệp chưa được cấu hình'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {report.overallStatus === 'IN_SYNC'
                  ? 'Forwarder Profile, Sales Representative và Thông tin Ngân hàng trên Báo giá hoàn toàn trùng khớp với Firebase Firestore.'
                  : report.overallStatus === 'DRIFT_DETECTED'
                    ? 'Báo giá hiện tại có thể đang sử dụng dữ liệu snapshot cũ hoặc thông tin đã được chỉnh sửa độc lập. Bạn có thể nhấn "Đồng Bộ Ngay" bên phải.'
                    : 'Vui lòng cập nhật đầy đủ thông tin pháp lý, chuyên viên phụ trách và số tài khoản ngân hàng để hệ thống tự động đồng bộ.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {report.overallStatus === 'DRIFT_DETECTED' && (
              <button
                type="button"
                onClick={onReconcile}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đồng Bộ Ngay (Zero Drift)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onForceRefreshCloud()}
              disabled={isSyncing}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Tải Lại Firebase</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Canonical Source of Truth Quick Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Nguồn Dữ Liệu Gốc (Single Source of Truth - Firestore /settings/company_profile)</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompanyProfile();
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center space-x-1"
              >
                <span>Chỉnh sửa hồ sơ gốc</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Forwarder Profile */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px]">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đơn Vị Forwarder</span>
                </div>
                <p className="font-bold text-slate-900 line-clamp-1" title={report.canonicalCompany.name}>
                  {report.canonicalCompany.name || 'Chưa cấu hình'}
                </p>
                <p className="text-slate-500 text-[11px] font-mono">
                  MST: {report.canonicalCompany.taxId || 'N/A'}
                </p>
                <p className="text-slate-600 text-[11px] line-clamp-1" title={report.canonicalCompany.address}>
                  {report.canonicalCompany.address || 'Chưa có địa chỉ'}
                </p>
              </div>

              {/* Card 2: Sales Executive */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px]">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chuyên Viên Sales</span>
                </div>
                <p className="font-bold text-slate-900">
                  {report.canonicalCompany.salesRepName || 'Chưa thiết lập'}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {report.canonicalCompany.salesRepTitle || 'Chưa có chức danh'}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {report.canonicalCompany.salesRepPhone || 'Chưa có SĐT'}
                </p>
              </div>

              {/* Card 3: Bank Account */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px]">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tài Khoản Ngân Hàng</span>
                </div>
                <p className="font-bold text-slate-900 line-clamp-1" title={report.canonicalCompany.bankName}>
                  {report.canonicalCompany.bankName || 'Chưa cấu hình'}
                </p>
                <p className="text-slate-500 text-[11px] font-mono font-semibold">
                  STK: {report.canonicalCompany.bankAccountNo || 'N/A'}
                </p>
                <p className="text-slate-600 text-[11px] line-clamp-1" title={report.canonicalCompany.bankAccountHolder}>
                  Chủ TK: {report.canonicalCompany.bankAccountHolder || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Drift Audit Table */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Bảng Đối Chiếu Tính Toàn Vẹn & Khử Lệch Dữ Liệu (Drift Matrix)</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 font-bold">Thực Thể / Trường Dữ Liệu</th>
                    <th className="p-3 font-bold">Nguồn Canonical (Firebase)</th>
                    <th className="p-3 font-bold">Snapshot Báo Giá #{report.activeQuoteNumber}</th>
                    <th className="p-3 font-bold text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.items.map((item) => (
                    <tr key={item.id} className={item.isDrifted ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/50'}>
                      <td className="p-3 font-semibold text-slate-800">
                        <div className="font-bold">{item.field}</div>
                        <div className="text-[10px] text-slate-500">{item.description}</div>
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] block truncate" title={item.canonicalValue}>
                          {item.canonicalValue}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs font-medium">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] block truncate border ${
                          item.isDrifted 
                            ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold' 
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`} title={item.quoteSnapshotValue}>
                          {item.quoteSnapshotValue}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.isDrifted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Bị Lệch (Drift)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đồng Bộ (OK)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 flex items-center space-x-2">
            <span>Thời điểm kiểm toán: <strong className="font-mono text-slate-700">{report.auditedAt}</strong></span>
            <span>•</span>
            <span>Giao thức: <strong className="font-mono text-slate-700">Firebase Firestore SSOT v21</strong></span>
          </div>

          <div className="flex items-center space-x-2.5">
            {report.overallStatus === 'DRIFT_DETECTED' && (
              <button
                type="button"
                onClick={() => {
                  onReconcile();
                  onClose();
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đồng Bộ Ngay Với SSOT</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
