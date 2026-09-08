import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight,
  RefreshCw,
  Clock,
  Check,
  StopCircle,
  FileDown
} from 'lucide-react';
import { RateMasterItem, DuplicatePolicy } from '../../types/masterRate';
import { 
  parseFileToRawRows, 
  inspectImportDataset, 
  executeStreamingBulkImport, 
  PreImportInspection,
  exportErrorsToExcel,
  generateRateImportTemplate
} from '../../services/masterRate/bulkImportEngine';
import { getSampleCsvTemplate } from '../../services/masterRate/rateImportExportService';

interface RateBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRates: RateMasterItem[];
  onConfirmImport: (importedRates: RateMasterItem[], jobId?: string) => Promise<void>;
  companyId?: string;
}

export const RateBulkImportModal: React.FC<RateBulkImportModalProps> = ({
  isOpen,
  onClose,
  existingRates,
  onConfirmImport,
  companyId,
}) => {
  const [activeStep, setActiveStep] = useState<'SELECT' | 'PREVIEW' | 'IMPORTING' | 'RESULT'>('SELECT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspection, setInspection] = useState<PreImportInspection | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('UPDATE');

  // Streaming progress state
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [cancelRequested, setCancelRequested] = useState(false);
  const cancelRef = useRef(false);

  // Result summary
  const [importSummary, setImportSummary] = useState<{
    success: number;
    skipped: number;
    updated: number;
    newVersion: number;
    cancelled: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const processSelectedFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      alert('Chỉ hỗ trợ file bảng tính định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)');
      return;
    }

    setSelectedFile(file);
    setIsInspecting(true);

    try {
      const rawRows = await parseFileToRawRows(file);
      if (rawRows.length === 0) {
        alert('File không có dữ liệu hoặc định dạng không đúng tiêu chuẩn.');
        setIsInspecting(false);
        return;
      }

      const insp = inspectImportDataset(rawRows, existingRates, companyId);
      setInspection(insp);
      setActiveStep('PREVIEW');
    } catch (err: any) {
      console.error('Lỗi đọc file:', err);
      alert(`Không thể đọc file: ${err?.message || 'Định dạng file không tương thích'}`);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDownloadExcelTemplate = async () => {
    const blob = await generateRateImportTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LOGIQUOTE_Rate_Master_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = getSampleCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LOGIQUOTE_Rate_Master_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrors = async () => {
    if (!inspection || inspection.errors.length === 0) return;
    const blob = await exportErrorsToExcel(inspection.errors);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rate_Import_Errors_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStartStreamingImport = async () => {
    if (!inspection || inspection.previewItems.length === 0) return;

    if (duplicatePolicy === 'REJECT' && inspection.duplicateRows > 0) {
      alert('Chính sách "REJECT" đang được chọn nhưng phát hiện có dòng trùng lặp. Vui lòng chọn chính sách khác hoặc chỉnh sửa dữ liệu.');
      return;
    }

    setActiveStep('IMPORTING');
    setProgressPercent(0);
    setProcessedCount(0);
    setTotalToProcess(inspection.previewItems.length);
    setCancelRequested(false);
    cancelRef.current = false;

    const jobId = `job-${Date.now()}`;

    try {
      const result = await executeStreamingBulkImport(
        inspection.previewItems,
        existingRates,
        duplicatePolicy,
        (processed, total, pct) => {
          setProcessedCount(processed);
          setProgressPercent(pct);
        },
        () => cancelRef.current,
        100 // chunk size
      );

      // Save to Firestore & Local Storage via parent
      if (result.successRates.length > 0) {
        await onConfirmImport(result.successRates, jobId);
      }

      setImportSummary({
        success: result.successRates.length,
        skipped: result.skippedCount,
        updated: result.updatedCount,
        newVersion: result.newVersionCount,
        cancelled: result.cancelled,
      });

      setActiveStep('RESULT');
    } catch (error) {
      console.error('Lỗi trong quá trình import streaming:', error);
      alert('Đã xảy ra sự cố trong quá trình nạp dữ liệu. Vui lòng thử lại.');
      setActiveStep('PREVIEW');
    }
  };

  const handleCancelStreaming = () => {
    cancelRef.current = true;
    setCancelRequested(true);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Nạp Bảng Giá Hàng Loạt (Bulk Rate Import)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Xử lý streaming theo từng chunk • Kiểm tra toàn diện • Chống nghẽn giao diện
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Indicator */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className={`font-semibold flex items-center gap-1.5 ${activeStep === 'SELECT' ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-bold">1</span>
              Chọn file dữ liệu
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-semibold flex items-center gap-1.5 ${activeStep === 'PREVIEW' ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-bold">2</span>
              Kiểm tra & Xem trước
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-semibold flex items-center gap-1.5 ${activeStep === 'IMPORTING' ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-bold">3</span>
              Nạp dữ liệu
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-semibold flex items-center gap-1.5 ${activeStep === 'RESULT' ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center border text-[11px] font-bold">4</span>
              Hoàn tất
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcelTemplate}
              className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 transition"
              title="Tải file mẫu Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              Mẫu Excel (.xlsx)
            </button>
            <button
              onClick={handleDownloadCsvTemplate}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition"
              title="Tải file mẫu CSV (.csv)"
            >
              <Download className="w-3.5 h-3.5" />
              Mẫu CSV
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* STEP 1: SELECT FILE */}
          {activeStep === 'SELECT' && (
            <div className="space-y-6">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center transition cursor-pointer group"
                onClick={() => document.getElementById('bulk-rate-file-input')?.click()}
              >
                <input
                  id="bulk-rate-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 group-hover:scale-105 transition">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-800">
                  Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Hệ thống tự động nhận diện các cột: Tên cước, Hãng vận chuyển, Tuyến đường (Origin/Destination), Loại cont, Giá vốn, Giá bán, Ngày hiệu lực.
                </p>
                <button
                  type="button"
                  className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Chọn file từ máy tính
                </button>
              </div>

              {isInspecting && (
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang phân tích cấu trúc dữ liệu và kiểm tra toàn vẹn...
                </div>
              )}

              {/* Instructions Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Quy chuẩn dữ liệu đầu vào:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 pl-6 list-disc">
                  <div>• Hỗ trợ cả file Excel (.xlsx) nhiều dòng và CSV định dạng UTF-8.</div>
                  <div>• Cột bắt buộc: RateName, Origin, Destination, EffectiveFrom, EffectiveTo.</div>
                  <div>• Định dạng ngày hỗ trợ: YYYY-MM-DD hoặc DD/MM/YYYY.</div>
                  <div>• Tự động chuẩn hóa đơn vị tiền tệ USD và VND.</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & INSPECTION */}
          {activeStep === 'PREVIEW' && inspection && (
            <div className="space-y-6">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tổng số dòng</div>
                  <div className="text-xl font-bold text-slate-800">{inspection.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">Hợp lệ (Sẵn sàng)</div>
                  <div className="text-xl font-bold text-emerald-800">{inspection.validRows}</div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-medium">Trùng lặp (Duplicate)</div>
                  <div className="text-xl font-bold text-amber-800">{inspection.duplicateRows}</div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-[11px] text-rose-700 font-medium">Không hợp lệ (Lỗi)</div>
                  <div className="text-xl font-bold text-rose-800">{inspection.invalidRows}</div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-medium">Cảnh báo chồng chéo</div>
                  <div className="text-xl font-bold text-blue-800">{inspection.warningRows}</div>
                </div>
              </div>

              {/* Duplicate Resolution Policy Selection */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Chính sách xử lý khi phát hiện trùng lặp (Duplicate Policy):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Phát hiện qua Rate Identity Key
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDuplicatePolicy('UPDATE')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      duplicatePolicy === 'UPDATE' 
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Cập nhật đè (UPDATE)</span>
                      {duplicatePolicy === 'UPDATE' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Ghi đè giá mới lên bản ghi cũ</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuplicatePolicy('CREATE_NEW_VERSION')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      duplicatePolicy === 'CREATE_NEW_VERSION' 
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Tạo phiên bản mới (V+1)</span>
                      {duplicatePolicy === 'CREATE_NEW_VERSION' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Tăng version, giữ nguyên lịch sử</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuplicatePolicy('SKIP')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      duplicatePolicy === 'SKIP' 
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Bỏ qua (SKIP)</span>
                      {duplicatePolicy === 'SKIP' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Chỉ nạp các rate hoàn toàn mới</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuplicatePolicy('REJECT')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      duplicatePolicy === 'REJECT' 
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Từ chối (REJECT)</span>
                      {duplicatePolicy === 'REJECT' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Hủy toàn bộ nếu có trùng lặp</p>
                  </button>
                </div>
              </div>

              {/* Errors Alert & Download Button */}
              {inspection.invalidRows > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Có {inspection.invalidRows} dòng dữ liệu không đạt chuẩn.</span> Các dòng này sẽ bị loại bỏ khi nạp.
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadErrors}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <FileDown className="w-4 h-4" />
                    Tải file báo cáo lỗi (.xlsx)
                  </button>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                  <span>Xem trước danh sách ({inspection.previewItems.length} dòng hợp lệ):</span>
                  <span className="text-[11px] text-slate-500 font-normal">Hiển thị tối đa 15 dòng đầu tiên</span>
                </div>
                <div className="overflow-x-auto max-h-60 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 font-semibold">Mã cước</th>
                        <th className="p-2.5 font-semibold">Tên cước</th>
                        <th className="p-2.5 font-semibold">Hãng vận chuyển</th>
                        <th className="p-2.5 font-semibold">Tuyến</th>
                        <th className="p-2.5 font-semibold">Giá vốn</th>
                        <th className="p-2.5 font-semibold">Giá bán</th>
                        <th className="p-2.5 font-semibold">Hiệu lực</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspection.previewItems.slice(0, 15).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-mono text-[11px] text-blue-600 font-medium">{item.rateCode}</td>
                          <td className="p-2.5 font-medium text-slate-800 max-w-[180px] truncate">{item.rateName}</td>
                          <td className="p-2.5 text-slate-600">{item.carrier || '—'}</td>
                          <td className="p-2.5 text-slate-600">{item.origin} → {item.destination}</td>
                          <td className="p-2.5 font-mono text-slate-700">{item.costAmount.toLocaleString()} {item.costCurrency}</td>
                          <td className="p-2.5 font-mono text-emerald-700 font-bold">{item.sellingAmount.toLocaleString()} {item.sellingCurrency}</td>
                          <td className="p-2.5 text-slate-500 text-[11px]">{item.effectiveFrom} ~ {item.effectiveTo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STREAMING PROGRESS */}
          {activeStep === 'IMPORTING' && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin flex items-center justify-center"></div>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                  {progressPercent}%
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Đang nạp dữ liệu vào Rate Master Hub...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Đã xử lý {processedCount} / {totalToProcess} dòng (Streaming chunk 100 dòng/lần)
                </p>
              </div>

              <div className="w-full max-w-md bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <button
                type="button"
                onClick={handleCancelStreaming}
                disabled={cancelRequested}
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
              >
                <StopCircle className="w-4 h-4" />
                {cancelRequested ? 'Đang dừng...' : 'Hủy nạp dữ liệu (Cancel)'}
              </button>
            </div>
          )}

          {/* STEP 4: IMPORT COMPLETED */}
          {activeStep === 'RESULT' && importSummary && (
            <div className="py-8 px-4 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-800">
                  {importSummary.cancelled ? 'Đã dừng nạp dữ liệu theo yêu cầu' : 'Nạp Bảng Giá Thành Công!'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Dữ liệu đã được đồng bộ hóa hoàn toàn vào Firebase Firestore và hệ thống định vị Rate Intelligence.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">Đã nạp thành công</div>
                  <div className="text-xl font-bold text-emerald-800">{importSummary.success}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-medium">Đã ghi đè (Updated)</div>
                  <div className="text-xl font-bold text-blue-800">{importSummary.updated}</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div className="text-[11px] text-indigo-700 font-medium">Phiên bản mới (V+1)</div>
                  <div className="text-xl font-bold text-indigo-800">{importSummary.newVersion}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-600 font-medium">Bỏ qua (Skipped)</div>
                  <div className="text-xl font-bold text-slate-700">{importSummary.skipped}</div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
                >
                  Đóng và quay lại bảng giá
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeStep === 'PREVIEW' && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep('SELECT')}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
            >
              ← Chọn file khác
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStartStreamingImport}
                disabled={!inspection || inspection.previewItems.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                Tiến hành nạp ({inspection?.previewItems.length || 0} bảng giá)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
