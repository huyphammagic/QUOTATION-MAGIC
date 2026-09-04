import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Building, 
  DollarSign, 
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { RateApprovalRequest, RateMasterItem } from '../../types/masterRate';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';

interface RateApprovalTabProps {
  approvals: RateApprovalRequest[];
  rates: RateMasterItem[];
  onApprove: (rate: RateMasterItem, approvalId: string, remarks?: string) => Promise<void>;
  onReject: (rate: RateMasterItem, approvalId: string, reason: string) => Promise<void>;
}

export const RateApprovalTab: React.FC<RateApprovalTabProps> = ({
  approvals,
  rates,
  onApprove,
  onReject,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [rejectingApproval, setRejectingApproval] = useState<RateApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const historyApprovals = approvals.filter(a => a.status !== 'PENDING');

  const displayList = activeSubTab === 'PENDING' ? pendingApprovals : historyApprovals;

  const handleConfirmApprove = async (approval: RateApprovalRequest) => {
    const rate = rates.find(r => r.id === approval.rateId);
    if (!rate) {
      alert('Không tìm thấy bảng giá tương ứng.');
      return;
    }
    setProcessingId(approval.id);
    try {
      await onApprove(rate, approval.id, approvalRemarks);
      setApprovalRemarks('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingApproval) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    const rate = rates.find(r => r.id === rejectingApproval.rateId);
    if (!rate) {
      alert('Không tìm thấy bảng giá tương ứng.');
      return;
    }

    setProcessingId(rejectingApproval.id);
    try {
      await onReject(rate, rejectingApproval.id, rejectionReason);
      setRejectingApproval(null);
      setRejectionReason('');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('PENDING')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeSubTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            id="tab-approval-pending"
          >
            <Clock className="w-3.5 h-3.5" /> Chờ Phê Duyệt ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveSubTab('HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeSubTab === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            id="tab-approval-history"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Lịch Sử Phê Duyệt ({historyApprovals.length})
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Quy trình kiểm soát phê duyệt giá vốn & giá bán tập trung
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              {activeSubTab === 'PENDING' ? 'Không có bảng giá nào đang chờ duyệt' : 'Chưa có lịch sử phê duyệt'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Tất cả các bảng giá cước đã được kiểm duyệt hoặc ở trạng thái hoạt động bình thường.
            </p>
          </div>
        ) : (
          displayList.map(appr => {
            const profit = appr.sellingAmount - appr.costAmount;
            const marginPct = appr.sellingAmount > 0 ? (profit / appr.sellingAmount) * 100 : 0;
            const isProfitPositive = profit >= 0;

            return (
              <div 
                key={appr.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">{appr.rateCode}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      v{appr.version}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {appr.rateType}
                    </span>
                    {appr.status === 'PENDING' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Chờ Duyệt
                      </span>
                    ) : appr.status === 'APPROVED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Đã Duyệt
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Từ Chối
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-800 text-sm">
                    {appr.rateName}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1 font-medium text-slate-800">
                      <span>{appr.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{appr.destination}</span>
                    </div>
                    {appr.carrier && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Building className="w-3 h-3" /> Hãng: {appr.carrier}
                      </div>
                    )}
                    <div className="text-slate-500 font-mono">
                      Hiệu lực: {appr.effectiveFrom} đến {appr.effectiveTo}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Người gửi duyệt: <span className="font-medium text-slate-700">{appr.submittedBy}</span> vào {new Date(appr.submittedAt).toLocaleString('vi-VN')}
                    {appr.reviewedBy && (
                      <span className="ml-2">
                        • Người duyệt: <span className="font-medium text-slate-700">{appr.reviewedBy}</span> ({new Date(appr.reviewedAt!).toLocaleString('vi-VN')})
                      </span>
                    )}
                  </div>

                  {appr.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mt-1">
                      <span className="font-bold">Lý do từ chối:</span> {appr.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Center: Financials */}
                <div className="flex items-center gap-6 border-y md:border-y-0 md:border-x border-slate-100 py-2 md:py-0 px-0 md:px-6">
                  <div>
                    <div className="text-[10px] text-purple-700 font-bold uppercase">Giá Vốn (Buy)</div>
                    <div className="text-sm font-mono font-bold text-purple-900">
                      {appr.costCurrency === 'USD' ? formatUSD(appr.costAmount) : formatVND(appr.costAmount)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-blue-700 font-bold uppercase">Giá Bán (Sell)</div>
                    <div className="text-sm font-mono font-bold text-blue-900">
                      {appr.sellingCurrency === 'USD' ? formatUSD(appr.sellingAmount) : formatVND(appr.sellingAmount)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-600 font-bold uppercase">Lợi Nhuận (GP)</div>
                    <div className={`text-sm font-mono font-bold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {appr.sellingCurrency === 'USD' ? formatUSD(profit) : formatVND(profit)}
                      <span className="text-[10px] ml-1">({formatPercent(marginPct)})</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {appr.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setRejectingApproval(appr)}
                      disabled={processingId === appr.id}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                      id={`btn-reject-${appr.id}`}
                    >
                      Từ Chối
                    </button>
                    <button
                      onClick={() => handleConfirmApprove(appr)}
                      disabled={processingId === appr.id}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      id={`btn-approve-${appr.id}`}
                    >
                      {processingId === appr.id ? 'Đang duyệt...' : 'Phê Duyệt'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectingApproval && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" /> Từ Chối Bảng Giá Cước
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Mã cước: <span className="font-mono font-bold text-slate-700">{rejectingApproval.rateCode}</span>. Vui lòng nhập lý do để nhân viên lập giá chỉnh sửa lại.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Giá vốn hãng báo có sự chênh lệch; Lợi nhuận thấp hơn mức tối thiểu 8%..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingApproval(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
