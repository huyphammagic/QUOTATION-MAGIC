import React, { useState } from 'react';
import { QuoteData } from '../types/logistics';
import { exportToGoogleSheets } from '../utils/googleSheets';
import { FileSpreadsheet, X, CheckCircle2, ExternalLink, Loader2, KeyRound } from 'lucide-react';

interface GoogleSheetsModalProps {
  quote: QuoteData;
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ quote, isOpen, onClose }) => {
  if (!isOpen) return null;

  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = async () => {
    if (!accessToken.trim()) {
      setErrorMsg('Vui lòng nhập Google OAuth Access Token hoặc đăng nhập Google Workspace.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSheetUrl('');

    const res = await exportToGoogleSheets(quote, accessToken.trim());
    setLoading(false);

    if (res.success && res.spreadsheetUrl) {
      setSheetUrl(res.spreadsheetUrl);
    } else {
      setErrorMsg(res.error || 'Xuất Google Sheets thất bại');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Đồng Bộ & Xuất Google Sheets</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-emerald-950">
            <p className="font-bold">Xuất dữ liệu chi tiết báo giá lên Google Drive:</p>
            <p className="text-[11px] text-emerald-800">
              Mã Báo Giá: <strong>{quote.quoteNumber}</strong> | Khách Hàng: <strong>{quote.customer.companyName || quote.customer.customerName}</strong>
            </p>
          </div>

          {!sheetUrl ? (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Google OAuth Bearer Access Token</span>
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Dán OAuth Access Token tại đây (hoặc token tự động từ Google OAuth)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Ứng dụng đã được tích hợp Google Workspace OAuth Scope (<code className="font-mono">spreadsheets</code> & <code className="font-mono">drive.file</code>).
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px]">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>Tạo Trang Tính Google Sheets Ngay</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Tạo File Google Sheets Thành Công!</h4>
                <p className="text-slate-500 text-xs mt-0.5">Báo giá của bạn đã được khởi tạo trên Google Drive.</p>
              </div>

              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs"
              >
                <span>Mở File Báo Giá Trong Google Sheets</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
