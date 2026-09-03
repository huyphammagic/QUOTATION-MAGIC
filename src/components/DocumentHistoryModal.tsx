import React, { useState, useEffect } from 'react';
import { QuotationDocumentRecord } from '../types/quotationDocument';
import { getQuotationDocuments, archiveQuotationDocument } from '../services/quotation/quotationDocumentService';
import { 
  X, 
  FileText, 
  Download, 
  Archive, 
  Eye, 
  Search, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  User, 
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { formatUSD, formatVND } from '../utils/formatters';

interface DocumentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId?: string;
  quotationNumber?: string;
}

export const DocumentHistoryModal: React.FC<DocumentHistoryModalProps> = ({
  isOpen,
  onClose,
  quotationId,
  quotationNumber,
}) => {
  const [documents, setDocuments] = useState<QuotationDocumentRecord[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectDoc, setInspectDoc] = useState<QuotationDocumentRecord | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const list = await getQuotationDocuments(quotationId);
      setDocuments(list);
    };
    load();
  }, [isOpen, quotationId]);

  if (!isOpen) return null;

  const handleArchive = async (id: string) => {
    if (confirm('Bạn có chắc muốn chuyển tài liệu này vào mục lưu trữ (Archive)?')) {
      await archiveQuotationDocument(id);
      const updated = await getQuotationDocuments(quotationId);
      setDocuments(updated);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesType = filterType === 'ALL' || d.documentType === filterType;
    const matchesSearch = 
      d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.generatedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 KB';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Kho Tài Liệu PDF & Snapshot Lịch Sử
                {quotationNumber ? ` — [${quotationNumber}]` : ''}
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ các bản PDF đã phát hành, phiên bản revision và dữ liệu snapshot bất biến
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên file, mã báo giá, template..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center space-x-1 text-xs overflow-x-auto w-full sm:w-auto">
            {[
              { key: 'ALL', label: 'Tất Cả' },
              { key: 'CUSTOMER_QUOTATION', label: 'Báo Giá Khách' },
              { key: 'INTERNAL_QUOTATION', label: 'Nội Bộ (Internal)' },
              { key: 'CONFIRMATION_NOTICE', label: 'Xác Nhận Đặt Chỗ' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                  filterType === tab.key
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Loại Tài Liệu</th>
                  <th className="p-3">Số Báo Giá / Rev</th>
                  <th className="p-3">Mẫu Template</th>
                  <th className="p-3">Tiền Tệ / File Size</th>
                  <th className="p-3">Người Tạo / Thời Gian</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredDocs.map((doc) => {
                  const isCustomer = doc.documentType === 'CUSTOMER_QUOTATION';
                  const isInternal = doc.documentType === 'INTERNAL_QUOTATION';
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Document Type Badge */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {isCustomer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 w-fit">
                              Báo Giá Khách Hàng
                            </span>
                          )}
                          {isInternal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                              Dự Toán Nội Bộ
                            </span>
                          )}
                          {!isCustomer && !isInternal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 w-fit">
                              Xác Nhận Đặt Chỗ
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </td>

                      {/* Quote & Revision */}
                      <td className="p-3 font-medium">
                        <div className="font-mono font-bold text-slate-900">{doc.quotationNumber}</div>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-300 font-mono">
                          Rev {String(doc.revision).padStart(2, '0')}
                        </span>
                      </td>

                      {/* Template Name */}
                      <td className="p-3 text-slate-700">
                        <div className="font-semibold line-clamp-1">{doc.templateName}</div>
                        <span className="text-[10px] text-slate-400 capitalize">{doc.language}</span>
                      </td>

                      {/* Currency & Size */}
                      <td className="p-3">
                        <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          doc.currency === 'VND' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.currency}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">
                          {formatBytes(doc.fileSizeBytes)} • {doc.pageCount} trang
                        </div>
                      </td>

                      {/* Generated By & At */}
                      <td className="p-3">
                        <div className="text-slate-800 font-medium">{doc.generatedBy}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(doc.generatedAt).toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.status === 'GENERATED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {doc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* Inspect Snapshot */}
                          <button
                            type="button"
                            onClick={() => setInspectDoc(doc)}
                            className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Kiểm tra Snapshot dữ liệu bất biến"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              download={doc.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors inline-block"
                              title="Tải file PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          {/* Archive */}
                          {doc.status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleArchive(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Lưu trữ tài liệu"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Chưa có tài liệu PDF nào được phát hành trong lịch sử báo giá này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Snapshot Inspection Sub-Modal */}
        {inspectDoc && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200">
              <div className="p-4 bg-slate-900 text-white rounded-t-xl flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">Kiểm Tra Snapshot Bất Biến (Audit Trail)</span>
                </div>
                <button onClick={() => setInspectDoc(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Chứng thực dữ liệu thương mại bất biến:</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    {inspectDoc.documentType === 'CUSTOMER_QUOTATION'
                      ? 'Dữ liệu file này đã được LỌC SẠCH toàn bộ Giá Vốn (Cost), Lợi Nhuận (Profit) & Tỷ Suất Margin theo đúng chuẩn bảo mật thương mại.'
                      : 'File lưu trữ nội bộ bao gồm đầy đủ dữ liệu giá vốn và tỷ suất lợi nhuận để phục vụ kiểm toán.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div><strong>Mã Báo Giá:</strong> {inspectDoc.snapshot.quoteNumber} (Rev {inspectDoc.snapshot.revision})</div>
                  <div><strong>Ngày Báo Giá:</strong> {inspectDoc.snapshot.createdDate}</div>
                  <div><strong>Loại Tiền:</strong> {inspectDoc.snapshot.currency}</div>
                  <div><strong>Tỷ Giá:</strong> 1 USD = {inspectDoc.snapshot.exchangeRate} VND</div>
                  <div><strong>Tổng Cộng:</strong> {inspectDoc.snapshot.currency === 'VND' ? `${formatVND(inspectDoc.snapshot.grandTotalVnd)}` : formatUSD(inspectDoc.snapshot.grandTotalUsd)}</div>
                  <div><strong>Người Lập:</strong> {inspectDoc.snapshot.approvedBy}</div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-700 mb-1">Các hạng mục trong Snapshot ({inspectDoc.snapshot.items.length}):</h5>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {inspectDoc.snapshot.items.map((item, idx) => (
                      <div key={idx} className="p-2 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{idx + 1}. {item.description}</span>
                          <span className="text-slate-400 ml-2">({item.quantity} {item.unit})</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {inspectDoc.snapshot.currency === 'VND' ? `${formatVND(item.amountVnd)}` : formatUSD(item.amountUsd)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setInspectDoc(null)}
                    className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
