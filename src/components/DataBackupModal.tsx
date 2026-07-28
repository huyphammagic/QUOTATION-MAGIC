import React, { useState, useRef } from 'react';
import { X, Download, Upload, Database, CheckCircle2, AlertTriangle, FileJson, RefreshCw, Server, ArrowRight } from 'lucide-react';
import { downloadBackupJsonFile, importSystemData } from '../utils/storage';
import { QuoteData, CompanyProfile, CustomerRecord, SurchargeItem } from '../types/logistics';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: (data: {
    quotes: QuoteData[];
    companySettings?: CompanyProfile;
    customers: CustomerRecord[];
    surcharges: SurchargeItem[];
  }) => void;
  savedQuotesCount: number;
  customersCount: number;
  surchargesCount: number;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
  savedQuotesCount,
  customersCount,
  surchargesCount,
}) => {
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      downloadBackupJsonFile();
      setImportStatus({
        type: 'success',
        message: 'Đã tải xuống file sao lưu thành công (backup_logistics_data.json)!',
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: 'Lỗi khi xuất file sao lưu: ' + (err.message || 'Không xác định'),
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        const result = importSystemData(parsed, importMode);
        onDataImported(result);
        
        setImportStatus({
          type: 'success',
          message: `Đã nhập dữ liệu thành công! (${result.quotes.length} báo giá, ${result.customers.length} khách hàng, ${result.surcharges.length} phụ phí)`,
        });
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: 'Lỗi khi đọc file backup. Đảm bảo đây là file JSON hợp lệ được xuất từ ứng dụng!',
        });
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Sao Lưu & Khôi Phục Dữ Liệu</h2>
              <p className="text-xs text-slate-400">Đồng bộ toàn bộ báo giá, khách hàng & phụ phí giữa AI Studio và Vercel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Vercel & AI Studio Sync Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
            <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 space-y-1.5 leading-relaxed">
              <p className="font-bold text-blue-900">
                💡 Làm thế nào để giữ dữ liệu khi cập nhật ứng dụng từ AI Studio lên Vercel?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>
                  <strong>Trên cùng 1 tên miền Vercel:</strong> Khi bạn deploy bản mới lên Vercel, dữ liệu đã lưu trong trình duyệt sẽ <strong>tự động giữ nguyên 100%</strong> không bị mất.
                </li>
                <li>
                  <strong>Khi chuyển đổi domain hoặc môi trường:</strong> Bấm <strong>"Tải Xuất File Backup"</strong> tại AI Studio, sau đó sang trang Vercel bấm <strong>"Nhập File Backup"</strong> để chuyển toàn bộ dữ liệu chỉ trong 1 cú click!
                </li>
              </ul>
            </div>
          </div>

          {/* Current System Data Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">{savedQuotesCount}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Báo Giá Đã Lưu</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-lg sm:text-2xl font-black text-blue-700 font-mono">{customersCount}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Khách Hàng (CRM)</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-lg sm:text-2xl font-black text-amber-600 font-mono">{surchargesCount}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Mã Phụ Phí Master</div>
            </div>
          </div>

          {/* Alert Status Message */}
          {importStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Box 1: Export Data */}
            <div className="border border-slate-200 hover:border-blue-300 rounded-xl p-5 space-y-3 bg-white flex flex-col justify-between transition-all">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>1. Xuất Sao Lưu (Export Backup)</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Tải xuống toàn bộ cơ sở dữ liệu hiện tại (báo giá, CRM khách hàng, phụ phí) dưới dạng file JSON an toàn.
                </p>
              </div>

              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors shadow-2xs"
              >
                <FileJson className="w-4 h-4" />
                <span>Tải File Backup (.JSON)</span>
              </button>
            </div>

            {/* Box 2: Import Data */}
            <div className="border border-slate-200 hover:border-emerald-300 rounded-xl p-5 space-y-3 bg-white flex flex-col justify-between transition-all">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>2. Nhập Dữ Liệu (Import Backup)</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Tải file backup JSON từ máy tính để khôi phục hoặc đồng bộ vào hệ thống.
                </p>

                {/* Import Mode Radio */}
                <div className="pt-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Chế độ nhập:</label>
                  <div className="flex items-center space-x-3 text-xs">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Gộp dữ liệu (Merge)</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-slate-700">Ghi đè tất cả</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors shadow-2xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn File Backup (.JSON)</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
