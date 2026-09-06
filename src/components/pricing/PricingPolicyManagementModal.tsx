import React, { useState } from 'react';
import { 
  PricingPolicyItem, 
  PricingPolicyScope, 
  PriceFloorType 
} from '../../types/pricingIntelligence';
import { 
  savePricingPolicyToFirestore, 
  deletePricingPolicyFromFirestore 
} from '../../services/pricing/pricingPolicyService';
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert,
  Percent,
  DollarSign,
  Tag
} from 'lucide-react';

interface PricingPolicyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies: PricingPolicyItem[];
  onRefreshPolicies: () => Promise<void>;
  showToast: (msg: string) => void;
}

export const PricingPolicyManagementModal: React.FC<PricingPolicyManagementModalProps> = ({
  isOpen,
  onClose,
  policies,
  onRefreshPolicies,
  showToast,
}) => {
  const [editingPolicy, setEditingPolicy] = useState<PricingPolicyItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    const newPolicy: PricingPolicyItem = {
      id: `policy-${Date.now()}`,
      policyCode: `POL-CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
      policyName: '',
      scope: 'CUSTOMER',
      targetMarginPercent: 20.0,
      minimumMarginPercent: 15.0,
      targetProfitAmount: 200,
      minimumProfitAmount: 50,
      maximumDiscountPercent: 20.0,
      priceFloorType: 'MIN_MARGIN',
      currency: 'USD',
      approvalThresholds: {
        autoEligibleMargin: 20.0,
        salesManagerApprovalMargin: 15.0,
        managementApprovalMargin: 10.0,
        blockMargin: 8.0,
      },
      status: 'ACTIVE',
      effectiveDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      version: 1,
      priority: 80,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'User',
    };
    setEditingPolicy(newPolicy);
    setIsCreatingNew(true);
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    if (!editingPolicy.policyName.trim() || !editingPolicy.policyCode.trim()) {
      showToast('Vui lòng nhập đầy đủ Mã và Tên chính sách định giá!');
      return;
    }
    if (editingPolicy.minimumMarginPercent > editingPolicy.targetMarginPercent) {
      showToast('Biên lãi tối thiểu không được lớn hơn Biên lãi mục tiêu!');
      return;
    }

    setIsSaving(true);
    try {
      await savePricingPolicyToFirestore(editingPolicy);
      await onRefreshPolicies();
      showToast(`Đã lưu chính sách [${editingPolicy.policyCode}] thành công!`);
      setEditingPolicy(null);
      setIsCreatingNew(false);
    } catch (err) {
      console.error('Error saving policy:', err);
      showToast('Có lỗi xảy ra khi lưu chính sách!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string, code: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa chính sách [${code}]?`)) {
      try {
        await deletePricingPolicyFromFirestore(id);
        await onRefreshPolicies();
        showToast(`Đã xóa chính sách [${code}]!`);
        if (editingPolicy?.id === id) {
          setEditingPolicy(null);
        }
      } catch (err) {
        showToast('Lỗi khi xóa chính sách!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="pricing-policy-mgmt-modal"
        className="bg-slate-900 text-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Quản Lý Danh Mục Chính Sách Định Giá (Pricing Policies)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập biên lợi nhuận mục tiêu, giá sàn tối thiểu và ma trận phê duyệt tự động.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {editingPolicy ? (
            /* Editing / Creating Form */
            <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  <span>{isCreatingNew ? 'Thêm Mới Chính Sách Định Giá' : `Chỉnh Sửa: ${editingPolicy.policyCode}`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPolicy(null); setIsCreatingNew(false); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mã chính sách (*):</label>
                  <input
                    type="text"
                    value={editingPolicy.policyCode}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, policyCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 text-white font-mono px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    placeholder="VD: POL-CUST-VINATEX"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Tên chính sách (*):</label>
                  <input
                    type="text"
                    value={editingPolicy.policyName}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, policyName: e.target.value })}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    placeholder="VD: Chính sách áp dụng riêng cho Vinatex..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phạm vi áp dụng (Scope):</label>
                  <select
                    value={editingPolicy.scope}
                    onChange={(e) => {
                      const scope = e.target.value as PricingPolicyScope;
                      const priority = scope === 'CUSTOMER' ? 100 : scope === 'CUSTOMER_SEGMENT' ? 80 : scope === 'SERVICE_MODE' ? 60 : 40;
                      setEditingPolicy({ ...editingPolicy, scope, priority });
                    }}
                    className="w-full bg-slate-900 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
                  >
                    <option value="GLOBAL">Toàn công ty (GLOBAL)</option>
                    <option value="SERVICE_MODE">Phương thức vận chuyển (SERVICE_MODE)</option>
                    <option value="CUSTOMER_SEGMENT">Phân khúc khách hàng (SEGMENT)</option>
                    <option value="CUSTOMER">Khách hàng cụ thể (CUSTOMER)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Đối tượng (Target ID/Code):</label>
                  <input
                    type="text"
                    value={editingPolicy.targetId || ''}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, targetId: e.target.value })}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    placeholder="Mã KH, SEA_FCL, AIR, VIP..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Trạng thái:</label>
                  <select
                    value={editingPolicy.status}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, status: e.target.value as any })}
                    className="w-full bg-slate-900 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="DRAFT">Bản thảo (DRAFT)</option>
                    <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
                    <option value="EXPIRED">Hết hạn (EXPIRED)</option>
                  </select>
                </div>
              </div>

              {/* Numerical Targets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">Target Margin (%):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPolicy.targetMarginPercent}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, targetMarginPercent: Number(e.target.value) })}
                    className="w-full bg-slate-900 text-white font-mono font-bold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-rose-400 font-semibold mb-1">Minimum Margin (% Sàn):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPolicy.minimumMarginPercent}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, minimumMarginPercent: Number(e.target.value) })}
                    className="w-full bg-slate-900 text-white font-mono font-bold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 font-semibold mb-1">Max Discount (%):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPolicy.maximumDiscountPercent || 20}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, maximumDiscountPercent: Number(e.target.value) })}
                    className="w-full bg-slate-900 text-white font-mono font-bold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quy tắc Giá sàn (Floor):</label>
                  <select
                    value={editingPolicy.priceFloorType}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, priceFloorType: e.target.value as PriceFloorType })}
                    className="w-full bg-slate-900 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
                  >
                    <option value="MIN_MARGIN">Theo Minimum Margin %</option>
                    <option value="MIN_PROFIT">Theo Lợi nhuận cố định</option>
                    <option value="HIGHER_OF_BOTH">Lấy giá trị cao hơn</option>
                  </select>
                </div>
              </div>

              {/* Approval Thresholds */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block">
                  Phân Tầng Ngưỡng Phê Duyệt Tự Động (Margin % Thresholds):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-emerald-400 text-[11px] mb-1">Auto-Eligible (&gt;= %):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingPolicy.approvalThresholds.autoEligibleMargin}
                      onChange={(e) => setEditingPolicy({
                        ...editingPolicy,
                        approvalThresholds: { ...editingPolicy.approvalThresholds, autoEligibleMargin: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-900 text-white font-mono px-3 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 text-[11px] mb-1">Sales Manager (&gt;= %):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingPolicy.approvalThresholds.salesManagerApprovalMargin}
                      onChange={(e) => setEditingPolicy({
                        ...editingPolicy,
                        approvalThresholds: { ...editingPolicy.approvalThresholds, salesManagerApprovalMargin: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-900 text-white font-mono px-3 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-rose-400 text-[11px] mb-1">Director (&gt;= %):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingPolicy.approvalThresholds.managementApprovalMargin}
                      onChange={(e) => setEditingPolicy({
                        ...editingPolicy,
                        approvalThresholds: { ...editingPolicy.approvalThresholds, managementApprovalMargin: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-900 text-white font-mono px-3 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-red-400 text-[11px] mb-1">Block Floor (&lt; %):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingPolicy.approvalThresholds.blockMargin}
                      onChange={(e) => setEditingPolicy({
                        ...editingPolicy,
                        approvalThresholds: { ...editingPolicy.approvalThresholds, blockMargin: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-900 text-white font-mono px-3 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Ghi chú chính sách:</label>
                <textarea
                  rows={2}
                  value={editingPolicy.notes || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, notes: e.target.value })}
                  className="w-full bg-slate-900 text-slate-200 text-xs p-2.5 rounded-lg border border-slate-700 focus:outline-none"
                  placeholder="Ghi chú điều kiện thương mại, thời hạn xem xét lại..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingPolicy(null); setIsCreatingNew(false); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Chính Sách'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Hiện có <span className="text-cyan-400 font-bold">{policies.length}</span> chính sách đang được quản lý.
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chính Sách Mới</span>
              </button>
            </div>
          )}

          {/* Policy List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {policies.map((p) => {
              return (
                <div 
                  key={p.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{p.policyName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          p.status === 'ACTIVE' 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                        {p.policyCode} | Phạm vi: <span className="text-slate-300">{p.scope}</span>
                        {p.targetId ? ` (${p.targetId})` : ''}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditingPolicy(p); setIsCreatingNew(false); }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePolicy(p.id, p.policyCode)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Mục Tiêu:</span>
                      <span className="text-emerald-400 font-bold">{p.targetMarginPercent}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tối Thiểu (Sàn):</span>
                      <span className="text-rose-400 font-bold">{p.minimumMarginPercent}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Chiết Khấu:</span>
                      <span className="text-amber-400 font-bold">{p.maximumDiscountPercent || 20}%</span>
                    </div>
                  </div>

                  {p.notes && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                      {p.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
