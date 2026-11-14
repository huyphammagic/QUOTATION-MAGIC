import React, { useState } from 'react';
import { QuoteData } from '../../types/logistics';
import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  Copy,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { formatUSD, formatVND } from '../../utils/formatters';

interface ConcurrencyConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  localQuote: QuoteData;
  remoteQuote: QuoteData;
  onForceOverwrite: () => void | Promise<void>;
  onReloadRemote: () => void;
  onCloneAsNewRevision?: () => void | Promise<void>;
}

export const ConcurrencyConflictModal: React.FC<ConcurrencyConflictModalProps> = ({
  isOpen,
  onClose,
  localQuote,
  remoteQuote,
  onForceOverwrite,
  onReloadRemote,
  onCloneAsNewRevision,
}) => {
  const [isProcessing, setIsProcessing] = useState<'OVERWRITE' | 'CLONE' | null>(null);

  if (!isOpen) return null;

  const localRev = (localQuote as any)._rev || localQuote.version || 1;
  const remoteRev = (remoteQuote as any)._rev || remoteQuote.version || 1;

  const localUsd = Number(localQuote.grandTotalUsd || 0);
  const remoteUsd = Number(remoteQuote.grandTotalUsd || 0);
  const usdDelta = localUsd - remoteUsd;

  const localRoute = `${localQuote.shipment?.origin || '—'} → ${localQuote.shipment?.destination || '—'}`;
  const remoteRoute = `${remoteQuote.shipment?.origin || '—'} → ${remoteQuote.shipment?.destination || '—'}`;

  const diffRows: {
    label: string;
    localVal: string;
    remoteVal: string;
    isDifferent: boolean;
    numeric?: boolean;
  }[] = [
    {
      label: 'Phiên bản (_rev / v)',
      localVal: `v${localRev}`,
      remoteVal: `v${remoteRev}`,
      isDifferent: localRev !== remoteRev,
      numeric: true,
    },
    {
      label: 'Khách hàng',
      localVal: localQuote.customer?.companyName || localQuote.customer?.customerName || 'N/A',
      remoteVal: remoteQuote.customer?.companyName || remoteQuote.customer?.customerName || 'N/A',
      isDifferent:
        (localQuote.customer?.companyName || '') !== (remoteQuote.customer?.companyName || ''),
    },
    {
      label: 'Tuyến vận chuyển',
      localVal: localRoute,
      remoteVal: remoteRoute,
      isDifferent: localRoute !== remoteRoute,
    },
    {
      label: 'Số dòng cước',
      localVal: `${localQuote.items?.length || 0} dòng`,
      remoteVal: `${remoteQuote.items?.length || 0} dòng`,
      isDifferent: (localQuote.items?.length || 0) !== (remoteQuote.items?.length || 0),
      numeric: true,
    },
    {
      label: 'Tổng tiền USD',
      localVal: formatUSD(localUsd),
      remoteVal: formatUSD(remoteUsd),
      isDifferent: Math.abs(usdDelta) > 0.01,
      numeric: true,
    },
    {
      label: 'Tổng tiền VND',
      localVal: formatVND(Number(localQuote.grandTotalVnd || 0)),
      remoteVal: formatVND(Number(remoteQuote.grandTotalVnd || 0)),
      isDifferent:
        Math.abs(Number(localQuote.grandTotalVnd || 0) - Number(remoteQuote.grandTotalVnd || 0)) > 1,
      numeric: true,
    },
    {
      label: 'Trạng thái',
      localVal: localQuote.status || 'DRAFT',
      remoteVal: remoteQuote.status || 'DRAFT',
      isDifferent: localQuote.status !== remoteQuote.status,
    },
    {
      label: 'Cập nhật gần nhất',
      localVal: localQuote.updatedDate || 'Hôm nay',
      remoteVal: remoteQuote.updatedDate || 'N/A',
      isDifferent: (localQuote.updatedDate || '') !== (remoteQuote.updatedDate || ''),
    },
  ];

  const handleForceOverwriteClick = async () => {
    setIsProcessing('OVERWRITE');
    try {
      await onForceOverwrite();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCloneClick = async () => {
    if (!onCloneAsNewRevision) return;
    setIsProcessing('CLONE');
    try {
      await onCloneAsNewRevision();
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        id="conflict-resolution-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                Xung Đột Phiên Bản Đa Thiết Bị — {localQuote.quoteNumber}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Lá chắn Optimistic Concurrency Guard đã chặn ghi đè ngầm lên dữ liệu mới hơn trên Cloud.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Phiên bản trên Cloud (<span className="font-mono font-bold">v{remoteRev}</span>) mới hơn bản nháp trên thiết bị này (<span className="font-mono font-bold">v{localRev}</span>).
                {Math.abs(usdDelta) > 0.01 && (
                  <span className="ml-1.5 font-mono font-bold text-amber-800 tabular-nums">
                    (Chênh lệch giá trị: {usdDelta > 0 ? '+' : ''}{formatUSD(usdDelta)})
                  </span>
                )}
              </p>
              <p className="text-amber-800">
                Nếu bạn chọn ghi đè lên Cloud, hệ thống sẽ tự động chụp 1 bản Snapshot bất biến (PRE_OVERWRITE) vào Hộp Đen trước khi lưu để không bao giờ mất bản Cloud cũ.
              </p>
            </div>
          </div>

          {/* Side-by-side Diff Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5 w-1/4">Trường Dữ Liệu</th>
                  <th className="px-3.5 py-2.5 w-[37.5%]">
                    <span className="text-slate-700">Thiết Bị Này (v{localRev})</span>
                  </th>
                  <th className="px-3.5 py-2.5 w-[37.5%] bg-emerald-50/60">
                    <span className="inline-flex items-center gap-1.5 text-emerald-800">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                      Bản Cloud Mới Nhất (v{remoteRev})
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diffRows.map((row) => (
                  <tr
                    key={row.label}
                    className={row.isDifferent ? 'bg-amber-50/40' : 'bg-white'}
                  >
                    <td className="px-3.5 py-2 font-medium text-slate-600">
                      <div className="flex items-center justify-between gap-1">
                        <span>{row.label}</span>
                        {row.isDifferent && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Khác
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-3.5 py-2 text-slate-800 ${
                        row.numeric ? 'font-mono tabular-nums' : ''
                      } ${row.isDifferent ? 'font-semibold' : ''}`}
                    >
                      {row.localVal}
                    </td>
                    <td
                      className={`px-3.5 py-2 text-emerald-900 bg-emerald-50/30 ${
                        row.numeric ? 'font-mono tabular-nums' : ''
                      } ${row.isDifferent ? 'font-bold' : ''}`}
                    >
                      {row.remoteVal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing !== null}
            className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Hủy thao tác
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {onCloneAsNewRevision && (
              <button
                type="button"
                onClick={handleCloneClick}
                disabled={isProcessing !== null}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {isProcessing === 'CLONE' ? 'Đang tách bản mới...' : 'Tách thành báo giá mới (Giữ cả 2)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleForceOverwriteClick}
              disabled={isProcessing !== null}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>
                {isProcessing === 'OVERWRITE' ? 'Đang lưu & chụp Snapshot...' : 'Ghi đè lên Cloud'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onReloadRemote}
              disabled={isProcessing !== null}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Giữ bản Cloud (Tải lại)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
