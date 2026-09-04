import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  FileSpreadsheet,
  Layers,
  ArrowRight
} from 'lucide-react';
import { RateMasterItem, BulkImportSummary } from '../../types/masterRate';
import { 
  parseCsvText, 
  validateAndParseRateCsv, 
  getSampleCsvTemplate,
  exportRatesToCsv 
} from '../../services/masterRate/rateImportExportService';

interface RateCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRates: RateMasterItem[];
  onConfirmImport: (importedRates: RateMasterItem[]) => Promise<void>;
}

export const RateCsvImportModal: React.FC<RateCsvImportModalProps> = ({
  isOpen,
  onClose,
  existingRates,
  onConfirmImport,
}) => {
  const [csvText, setCsvText] = useState('');
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvText(content);
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleParse = (textToParse: string) => {
    const parsedRows = parseCsvText(textToParse);
    if (parsedRows.length === 0) {
      alert('Không tìm thấy dữ liệu hợp lệ trong file CSV.');
      return;
    }
    const result = validateAndParseRateCsv(parsedRows, existingRates);
    setSummary(result);
    setActiveStep('PREVIEW');
  };

  const handleDownloadTemplate = () => {
    const template = getSampleCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'LOGIQUOTE_Rate_Master_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirm = async () => {
    if (!summary || summary.itemsToImport.length === 0) return;
    setIsProcessing(true);
    try {
      await onConfirmImport(summary.itemsToImport);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Nạp Bảng Giá Hàng Loạt (Bulk CSV Import)</h3>
              <p className="text-xs text-slate-300">
                Nhập khẩu nhanh hàng trăm bảng giá từ file CSV/Excel kèm kiểm tra tính toàn vẹn
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {activeStep === 'INPUT' ? (
            <div className="space-y-4">
              {/* File upload drag drop */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/20 transition-all">
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Chọn hoặc Kéo Thả File CSV Vào Đây</h4>
                <p className="text-xs text-slate-500 mt-1">Hỗ trợ file định dạng .csv chuẩn UTF-8</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors">
                    Tải File Lên (Upload File)
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải Template CSV Mẫu
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc Dán Nội Dung CSV Trực Tiếp
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Dán dữ liệu CSV có dòng tiêu đề tại đây..."
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            // PREVIEW STEP
            summary && (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500">Tổng Số Dòng</div>
                    <div className="text-xl font-bold text-slate-800">{summary.totalRows}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-xs text-emerald-700">Hợp Lệ (Sẵn Sàng Nạp)</div>
                    <div className="text-xl font-bold text-emerald-900">{summary.validRows}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <div className="text-xs text-rose-700">Không Hợp Lệ (Bị Bỏ Qua)</div>
                    <div className="text-xl font-bold text-rose-900">{summary.invalidRows}</div>
                  </div>
                </div>

                {/* Details list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5 w-12 text-center">Dòng</th>
                        <th className="p-2.5">Mã / Tên Bảng Giá</th>
                        <th className="p-2.5">Tuyến Vận Chuyển</th>
                        <th className="p-2.5">Giá Vốn / Bán</th>
                        <th className="p-2.5">Hiệu Lực</th>
                        <th className="p-2.5">Kết Quả Kiểm Tra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.rowDetails.map((row) => (
                        <tr key={row.rowNumber} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50'}>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                            {row.rowNumber}
                          </td>
                          <td className="p-2.5">
                            <div className="font-mono font-bold text-blue-700">{row.parsedRate.rateCode}</div>
                            <div className="text-slate-600 truncate max-w-[180px]">{row.parsedRate.rateName}</div>
                          </td>
                          <td className="p-2.5">
                            <div className="font-medium text-slate-800">
                              {row.parsedRate.origin} → {row.parsedRate.destination}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {row.parsedRate.transportMode} • {row.parsedRate.containerType || row.parsedRate.unit}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono">
                            <div className="text-purple-700 font-medium">Buy: {row.parsedRate.costAmount} {row.parsedRate.costCurrency}</div>
                            <div className="text-blue-700 font-bold">Sell: {row.parsedRate.sellingAmount} {row.parsedRate.sellingCurrency}</div>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">
                            {row.parsedRate.effectiveFrom} ~ {row.parsedRate.effectiveTo}
                          </td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hợp Lệ
                              </span>
                            ) : (
                              <div className="text-rose-700 text-[11px] space-y-0.5">
                                {row.errors.map((err, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {activeStep === 'PREVIEW' && (
              <button
                onClick={() => setActiveStep('INPUT')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Quay lại nhập file khác
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Đóng
            </button>
            {activeStep === 'INPUT' ? (
              <button
                onClick={() => handleParse(csvText)}
                disabled={!csvText.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs"
              >
                Phân Tích & Xem Trước (Preview)
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={isProcessing || !summary || summary.validRows === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs"
              >
                {isProcessing ? 'Đang nạp...' : `Xác Nhận Nạp ${summary?.validRows || 0} Bảng Giá`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
