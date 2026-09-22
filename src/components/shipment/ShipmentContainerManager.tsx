import React, { useState } from 'react';
import { 
  ShipmentContainer, 
  ShipmentContainerStatus 
} from '../../types/shipment';
import { ContainerType } from '../../types/logistics';
import { 
  Box, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  Weight, 
  AlertCircle 
} from 'lucide-react';

interface ShipmentContainerManagerProps {
  containers: ShipmentContainer[];
  onAddContainer: (container: Omit<ShipmentContainer, 'id'>) => Promise<void>;
  onUpdateContainer: (containerId: string, updates: Partial<ShipmentContainer>) => Promise<void>;
  onRemoveContainer: (containerId: string) => Promise<void>;
  readOnly?: boolean;
  activeLanguage?: 'vi' | 'en';
}

const CONTAINER_TYPES: ContainerType[] = [
  "20'GP",
  "40'GP",
  "40'HC",
  "45'HC",
  "20'RF",
  "40'RF",
  "20'OT",
  "40'OT"
];

const STATUS_LABELS: Record<ShipmentContainerStatus, { vi: string; en: string; color: string }> = {
  PLANNED: { vi: 'Kế hoạch', en: 'Planned', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  ASSIGNED: { vi: 'Đã cấp vỏ', en: 'Assigned', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  GATE_OUT: { vi: 'Rời bãi lấy vỏ', en: 'Gate Out', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  LOADED: { vi: 'Đã đóng hàng', en: 'Loaded', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  IN_TRANSIT: { vi: 'Đang vận chuyển', en: 'In Transit', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  DISCHARGED: { vi: 'Đã hạ bãi cảng đến', en: 'Discharged', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' },
  EMPTY_RETURNED: { vi: 'Đã hạ rỗng trả depot', en: 'Empty Returned', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  COMPLETED: { vi: 'Hoàn tất', en: 'Completed', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
};

export const ShipmentContainerManager: React.FC<ShipmentContainerManagerProps> = ({
  containers,
  onAddContainer,
  onUpdateContainer,
  onRemoveContainer,
  readOnly = false,
  activeLanguage = 'vi',
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formContNumber, setFormContNumber] = useState('');
  const [formType, setFormType] = useState<ContainerType>("40'HC");
  const [formSeal, setFormSeal] = useState('');
  const [formTare, setFormTare] = useState<string>('');
  const [formGross, setFormGross] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ShipmentContainerStatus>('PLANNED');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormContNumber('');
    setFormType("40'HC");
    setFormSeal('');
    setFormTare('');
    setFormGross('');
    setFormStatus('PLANNED');
    setFormNotes('');
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleStartEdit = (c: ShipmentContainer) => {
    setEditingId(c.id);
    setFormContNumber(c.containerNumber);
    setFormType(c.containerType);
    setFormSeal(c.sealNumber || '');
    setFormTare(c.tareWeightKg ? String(c.tareWeightKg) : '');
    setFormGross(c.grossWeightKg ? String(c.grossWeightKg) : '');
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const cleanContNumber = formContNumber.toUpperCase().trim();
      const payload: Omit<ShipmentContainer, 'id'> = {
        containerNumber: cleanContNumber,
        containerType: formType,
        sealNumber: formSeal.toUpperCase().trim() || undefined,
        tareWeightKg: formTare ? parseFloat(formTare) : undefined,
        grossWeightKg: formGross ? parseFloat(formGross) : undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined,
      };

      if (editingId) {
        await onUpdateContainer(editingId, payload);
      } else {
        await onAddContainer(payload);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save container:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (containerId: string, status: ShipmentContainerStatus) => {
    if (readOnly) return;
    try {
      await onUpdateContainer(containerId, { status });
    } catch (err) {
      console.error('Failed to quick update container status:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {activeLanguage === 'vi' ? 'Danh sách Container & Hàng hóa' : 'Container & Cargo Manifest'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {containers.length} {activeLanguage === 'vi' ? 'container được theo dõi' : 'containers tracked'}
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeLanguage === 'vi' ? 'Thêm Container' : 'Add Container'}
          </button>
        )}
      </div>

      {/* Container Cards / Table */}
      {containers.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <Box className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {activeLanguage === 'vi' ? 'Chưa có container nào được thêm.' : 'No containers recorded yet.'}
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              + {activeLanguage === 'vi' ? 'Thêm container đầu tiên' : 'Add first container'}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Số Container' : 'Container No.'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Loại Cont' : 'Type'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Số Seal' : 'Seal No.'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Trọng lượng (GW/TW)' : 'Weight (kg)'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="px-4 py-3">{activeLanguage === 'vi' ? 'Ghi chú' : 'Notes'}</th>
                {!readOnly && <th className="px-4 py-3 text-right">{activeLanguage === 'vi' ? 'Thao tác' : 'Actions'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {containers.map((c, index) => {
                const statusMeta = STATUS_LABELS[c.status] || STATUS_LABELS.PLANNED;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {c.containerNumber ? (
                        c.containerNumber
                      ) : (
                        <span className="text-slate-400 italic">
                          {activeLanguage === 'vi' ? '(Chưa chỉ định)' : '(Unassigned)'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                        {c.containerType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {c.sealNumber || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.grossWeightKg ? (
                        <span>GW: {c.grossWeightKg.toLocaleString()} kg</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!readOnly ? (
                        <select
                          value={c.status}
                          onChange={(e) => handleQuickStatusChange(c.id, e.target.value as ShipmentContainerStatus)}
                          className={`text-xs rounded-lg px-2 py-1 font-semibold border-0 cursor-pointer ${statusMeta.color}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, val]) => (
                            <option key={k} value={k}>
                              {activeLanguage === 'vi' ? val.vi : val.en}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.color}`}>
                          {activeLanguage === 'vi' ? statusMeta.vi : statusMeta.en}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-500">
                      {c.notes || '—'}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title={activeLanguage === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveContainer(c.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title={activeLanguage === 'vi' ? 'Xóa' : 'Remove'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit Container */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-600" />
                {editingId 
                  ? (activeLanguage === 'vi' ? 'Cập Nhật Container' : 'Edit Container')
                  : (activeLanguage === 'vi' ? 'Thêm Container Mới' : 'Add New Container')
                }
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {activeLanguage === 'vi' ? 'Số Container (4 chữ cái + 7 số)' : 'Container Number (ISO 6346)'}
                </label>
                <input
                  type="text"
                  value={formContNumber}
                  placeholder="e.g., TEMU1234567, MSCU9876543"
                  onChange={(e) => setFormContNumber(e.target.value)}
                  className="w-full text-xs font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {activeLanguage === 'vi' ? 'Quy cách (Type)' : 'Container Type'}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ContainerType)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    {CONTAINER_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {activeLanguage === 'vi' ? 'Số Niêm Phong (Seal No.)' : 'Seal Number'}
                  </label>
                  <input
                    type="text"
                    value={formSeal}
                    placeholder="e.g., SL123456"
                    onChange={(e) => setFormSeal(e.target.value)}
                    className="w-full text-xs uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {activeLanguage === 'vi' ? 'Tổng trọng lượng (Gross Wt kg)' : 'Gross Wt (kg)'}
                  </label>
                  <input
                    type="number"
                    value={formGross}
                    placeholder="e.g., 22000"
                    onChange={(e) => setFormGross(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {activeLanguage === 'vi' ? 'Trọng lượng vỏ (Tare Wt kg)' : 'Tare Wt (kg)'}
                  </label>
                  <input
                    type="number"
                    value={formTare}
                    placeholder="e.g., 3800"
                    onChange={(e) => setFormTare(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {activeLanguage === 'vi' ? 'Trạng thái hiện tại' : 'Current Status'}
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ShipmentContainerStatus)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(STATUS_LABELS).map(([k, val]) => (
                    <option key={k} value={k}>
                      {activeLanguage === 'vi' ? val.vi : val.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {activeLanguage === 'vi' ? 'Ghi chú thêm' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  placeholder={activeLanguage === 'vi' ? 'Tình trạng vỏ cont, nhiệt độ reefer...' : 'Condition, temperature...'}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {activeLanguage === 'vi' ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>...</span>
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {activeLanguage === 'vi' ? 'Lưu Container' : 'Save Container'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
