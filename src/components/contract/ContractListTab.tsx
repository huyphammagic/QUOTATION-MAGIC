import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  Trash2,
  Edit3
} from 'lucide-react';
import { 
  ContractItem, 
  ContractType, 
  ContractStatus 
} from '../../types/contract';
import { 
  fetchContracts, 
  saveContract, 
  deleteContract 
} from '../../services/contract/contractRepository';
import { 
  analyzeContractExpiry, 
  filterContractsByUrgency 
} from '../../services/contract/contractExpiryService';
import { CustomerRecord } from '../../types/logistics';
import { SupplierItem, CarrierItem } from '../../types/masterRate';
import { ContractFormModal } from './ContractFormModal';
import { ContractDetailModal } from './ContractDetailModal';

interface ContractListTabProps {
  customers: CustomerRecord[];
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
}

export const ContractListTab: React.FC<ContractListTabProps> = ({
  customers,
  suppliers,
  carriers,
}) => {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [contractTypeFilter, setContractTypeFilter] = useState<'ALL' | ContractType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load contracts
  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchContracts({
        contractType: contractTypeFilter === 'ALL' ? undefined : contractTypeFilter,
        status: statusFilter,
        limitCount: 100, // Safe upper bound for UI list
      });
      setContracts(res.contracts);
    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [contractTypeFilter, statusFilter]);

  // Client-side text search & urgency filter
  const filteredContracts = useMemo(() => {
    let result = contracts;

    // Urgency filter
    result = filterContractsByUrgency(result, urgencyFilter);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.contractNumber.toLowerCase().includes(q) ||
        c.partyName.toLowerCase().includes(q) ||
        c.contractName.toLowerCase().includes(q) ||
        (c.partyCode && c.partyCode.toLowerCase().includes(q))
      );
    }

    return result;
  }, [contracts, urgencyFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredContracts.length / pageSize) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage, pageSize]);

  // Save contract handler
  const handleSaveContract = async (contract: ContractItem) => {
    await saveContract(contract);
    await loadContracts();
    if (selectedContract && selectedContract.id === contract.id) {
      setSelectedContract(contract);
    }
  };

  // Delete contract handler
  const handleDeleteContract = async (contractId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa hợp đồng này? Tất cả biểu cước liên quan cũng sẽ bị xóa.')) return;
    await deleteContract(contractId);
    setContracts(prev => prev.filter(c => c.id !== contractId));
  };

  // Status counts
  const activeCount = contracts.filter(c => c.status === 'ACTIVE').length;
  const inReviewCount = contracts.filter(c => c.status === 'IN_REVIEW').length;
  const expiringSoonCount = contracts.filter(c => {
    const a = analyzeContractExpiry(c.expiryDate);
    return a.urgency === 'EXPIRING_7' || a.urgency === 'EXPIRING_14' || a.urgency === 'EXPIRING_30';
  }).length;

  return (
    <div className="space-y-4" id="contract-list-tab">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Hợp Đồng</span>
            <span className="text-xl font-black text-slate-900">{contracts.length}</span>
          </div>
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đang Hiệu Lực (Active)</span>
            <span className="text-xl font-black text-emerald-600">{activeCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chờ Phê Duyệt</span>
            <span className="text-xl font-black text-amber-600">{inReviewCount}</span>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sắp Hết Hạn (&le;30d)</span>
            <span className="text-xl font-black text-rose-600">{expiringSoonCount}</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo số HĐ, tên đối tác..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Type Filter */}
          <select
            value={contractTypeFilter}
            onChange={(e) => {
              setContractTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
          >
            <option value="ALL">Tất cả loại HĐ</option>
            <option value="CUSTOMER">Khách Hàng (SELL)</option>
            <option value="SUPPLIER">Nhà Cung Cấp (BUY)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE - Đang hiệu lực</option>
            <option value="DRAFT">DRAFT - Bản nháp</option>
            <option value="IN_REVIEW">IN_REVIEW - Đang duyệt</option>
            <option value="APPROVED">APPROVED - Đã phê duyệt</option>
            <option value="EXPIRED">EXPIRED - Đã hết hạn</option>
            <option value="SUSPENDED">SUSPENDED - Tạm ngưng</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => {
              setUrgencyFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="ALL">Thời hạn: Tất cả</option>
            <option value="EXPIRING_SOON">Sắp hết hạn (&le;30 ngày)</option>
            <option value="EXPIRED">Đã hết hạn</option>
            <option value="ACTIVE">Còn hiệu lực an toàn</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadContracts}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setEditingContract(null);
              setIsFormModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Hợp Đồng Mới
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Đang tải danh sách hợp đồng...</span>
          </div>
        ) : paginatedContracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa có hợp đồng nào phù hợp bộ lọc</p>
            <p className="text-xs text-slate-400 mt-1">
              Bấm "Thêm Hợp Đồng Mới" để tạo hợp đồng khách hàng hoặc nhà cung cấp
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Số HĐ / Phiên Bản</th>
                <th className="py-3 px-4">Đối Tác Thương Mại</th>
                <th className="py-3 px-4">Loại Hợp Đồng</th>
                <th className="py-3 px-4">Thời Hạn Hiệu Lực</th>
                <th className="py-3 px-4 text-center">Biểu Cước</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.map(c => {
                const expiry = analyzeContractExpiry(c.expiryDate);
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => {
                      setSelectedContract(c);
                      setIsDetailModalOpen(true);
                    }}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                        {c.contractNumber}
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                          V{c.currentVersion}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{c.contractName}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{c.partyName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Mã: {c.partyCode || 'N/A'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                        c.contractType === 'CUSTOMER' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {c.contractType === 'CUSTOMER' ? 'Khách Hàng (SELL)' : 'Nhà Cung Cấp (BUY)'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-700 font-medium text-[11px]">
                        {c.effectiveDate} &rarr; {c.expiryDate}
                      </div>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded border ${expiry.badgeColor}`}>
                        {expiry.labelVi}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-full">
                        {c.totalRatesCount || 0} cước
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'IN_REVIEW' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-800' :
                        c.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                        c.status === 'CANCELLED' ? 'bg-slate-200 text-slate-600' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedContract(c);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingContract(c);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteContract(c.id, e)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Xóa hợp đồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {filteredContracts.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredContracts.length)} trong tổng số {filteredContracts.length} hợp đồng
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contract Form Modal */}
      {isFormModalOpen && (
        <ContractFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveContract}
          editingContract={editingContract}
          customers={customers}
          suppliers={suppliers}
          carriers={carriers}
        />
      )}

      {/* Contract Detail Modal */}
      {isDetailModalOpen && selectedContract && (
        <ContractDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          contract={selectedContract}
          onContractUpdated={(updated) => {
            setSelectedContract(updated);
            setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
          }}
          onOpenEditContractModal={() => {
            setEditingContract(selectedContract);
            setIsFormModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
