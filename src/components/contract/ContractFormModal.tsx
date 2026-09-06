import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  Clock
} from 'lucide-react';
import { 
  ContractItem, 
  ContractType, 
  ContractStatus, 
  ContractCommercialTerms, 
  ContractVolumeCommitment 
} from '../../types/contract';
import { CustomerRecord } from '../../types/logistics';
import { SupplierItem, CarrierItem } from '../../types/masterRate';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: ContractItem) => Promise<void>;
  editingContract?: ContractItem | null;
  defaultType?: ContractType;
  customers: CustomerRecord[];
  suppliers: SupplierItem[];
  carriers: CarrierItem[];
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingContract,
  defaultType = 'CUSTOMER',
  customers,
  suppliers,
  carriers,
}) => {
  const [contractType, setContractType] = useState<ContractType>(defaultType);
  const [contractNumber, setContractNumber] = useState('');
  const [contractName, setContractName] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<ContractStatus>('DRAFT');
  
  // Commercial Terms
  const [freeTimeDays, setFreeTimeDays] = useState(14);
  const [freeTimeDetails, setFreeTimeDetails] = useState('14 days Dem/Det combined at POL/POD');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 days from B/L date');
  const [creditDays, setCreditDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(50000);
  const [validityConditions, setValidityConditions] = useState('Áp dụng cho hàng hóa thông thường (General Cargo)');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Volume Commitment
  const [volumePeriod, setVolumePeriod] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TOTAL'>('MONTHLY');
  const [targetTeu, setTargetTeu] = useState<number | undefined>(20);
  const [minVolume, setMinVolume] = useState<number | undefined>(10);
  const [maxVolume, setMaxVolume] = useState<number | undefined>(50);

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingContract) {
      setContractType(editingContract.contractType);
      setContractNumber(editingContract.contractNumber);
      setContractName(editingContract.contractName);
      setContractDescription(editingContract.contractDescription || '');
      setPartyId(editingContract.partyId);
      setPartyName(editingContract.partyName);
      setPartyCode(editingContract.partyCode || '');
      setCurrency(editingContract.currency);
      setEffectiveDate(editingContract.effectiveDate);
      setExpiryDate(editingContract.expiryDate);
      setStatus(editingContract.status);

      // Terms
      setFreeTimeDays(editingContract.commercialTerms.freeTimeDays ?? 14);
      setFreeTimeDetails(editingContract.commercialTerms.freeTimeDetails || '');
      setPaymentTerms(editingContract.commercialTerms.paymentTerms || '');
      setCreditDays(editingContract.commercialTerms.creditDays ?? 30);
      setCreditLimit(editingContract.commercialTerms.creditLimit ?? 50000);
      setValidityConditions(editingContract.commercialTerms.validityConditions || '');
      setSpecialInstructions(editingContract.commercialTerms.specialInstructions || '');

      // Volume
      setVolumePeriod(editingContract.volumeCommitment.period || 'MONTHLY');
      setTargetTeu(editingContract.volumeCommitment.targetTeu);
      setMinVolume(editingContract.volumeCommitment.minVolume);
      setMaxVolume(editingContract.volumeCommitment.maxVolume);
    } else {
      const year = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setContractType(defaultType);
      setContractNumber(`CTR-${defaultType === 'CUSTOMER' ? 'CUST' : 'SUPP'}-${year}-${rand}`);
      setContractName('');
      setContractDescription('');
      setPartyId('');
      setPartyName('');
      setPartyCode('');
      setCurrency('USD');
      
      const nowStr = new Date().toISOString().slice(0, 10);
      const nextYearStr = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
      setEffectiveDate(nowStr);
      setExpiryDate(nextYearStr);
      setStatus('DRAFT');

      setFreeTimeDays(14);
      setFreeTimeDetails('14 days Dem/Det combined');
      setPaymentTerms('Net 30 days');
      setCreditDays(30);
      setCreditLimit(50000);
      setValidityConditions('Áp dụng cho hàng FCL thông thường');
      setSpecialInstructions('');
      setVolumePeriod('MONTHLY');
      setTargetTeu(20);
      setMinVolume(10);
      setMaxVolume(50);
    }
    setErrors([]);
  }, [editingContract, defaultType, isOpen]);

  // Handle Party Selection
  const handleSelectParty = (selectedId: string) => {
    setPartyId(selectedId);
    if (contractType === 'CUSTOMER') {
      const cust = customers.find(c => c.id === selectedId);
      if (cust) {
        setPartyName(cust.companyName || cust.customerName);
        setPartyCode(cust.code || '');
        if (!contractName) {
          setContractName(`Hợp Đồng Cước Dài Hạn - ${cust.companyName || cust.customerName}`);
        }
      }
    } else {
      // Supplier or Carrier
      const supp = suppliers.find(s => s.id === selectedId);
      if (supp) {
        setPartyName(supp.name);
        setPartyCode(supp.code || '');
        if (!contractName) {
          setContractName(`Hợp Đồng Dịch Vụ Đầu Vào - ${supp.name}`);
        }
      } else {
        const carr = carriers.find(c => c.id === selectedId);
        if (carr) {
          setPartyName(carr.name);
          setPartyCode(carr.code || '');
          if (!contractName) {
            setContractName(`Hợp Đồng Biểu Cước Hãng Tàu - ${carr.name}`);
          }
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!contractNumber.trim()) newErrors.push('Vui lòng nhập Số Hợp Đồng.');
    if (!partyId) newErrors.push('Vui lòng chọn Đối tác (Khách hàng hoặc Nhà cung cấp).');
    if (!contractName.trim()) newErrors.push('Vui lòng nhập Tên Hợp Đồng.');
    if (!effectiveDate) newErrors.push('Vui lòng chọn Ngày Bắt Đầu Hiệu Lực.');
    if (!expiryDate) newErrors.push('Vui lòng chọn Ngày Hết Hạn.');
    if (effectiveDate && expiryDate && effectiveDate > expiryDate) {
      newErrors.push('Ngày hết hạn phải sau hoặc bằng ngày bắt đầu hiệu lực.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const commercialTerms: ContractCommercialTerms = {
        freeTimeDays: Number(freeTimeDays) || 0,
        freeTimeDetails,
        paymentTerms,
        creditDays: Number(creditDays) || 0,
        creditLimit: Number(creditLimit) || 0,
        creditCurrency: currency,
        validityConditions,
        specialInstructions,
      };

      const volumeCommitment: ContractVolumeCommitment = {
        period: volumePeriod,
        targetTeu: Number(targetTeu) || undefined,
        minVolume: Number(minVolume) || undefined,
        maxVolume: Number(maxVolume) || undefined,
      };

      const contractItem: ContractItem = {
        id: editingContract?.id || `ctr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        companyId: editingContract?.companyId || 'company_default',
        contractNumber: contractNumber.trim().toUpperCase(),
        contractType,
        partyId,
        partyName,
        partyCode,
        contractName: contractName.trim(),
        contractDescription: contractDescription.trim(),
        currency,
        effectiveDate,
        expiryDate,
        status: editingContract?.status || status,
        currentVersion: editingContract?.currentVersion || 1,
        totalRatesCount: editingContract?.totalRatesCount || 0,
        commercialTerms,
        volumeCommitment,
        createdBy: editingContract?.createdBy || 'Pricing Manager',
        createdAt: editingContract?.createdAt || new Date().toISOString(),
        updatedBy: 'Pricing Manager',
        updatedAt: new Date().toISOString(),
      };

      await onSave(contractItem);
      onClose();
    } catch (err: any) {
      setErrors([err.message || 'Lỗi khi lưu hợp đồng.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8"
        id="contract-form-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {editingContract ? `Chỉnh Sửa Hợp Đồng [${editingContract.contractNumber}]` : 'Tạo Mới Hợp Đồng Logistics'}
              </h3>
              <p className="text-xs text-slate-300">
                Thiết lập thỏa thuận thương mại, cam kết cước và sản lượng dài hạn
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

        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Contract Type & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Loại Hợp Đồng *
              </label>
              <select
                value={contractType}
                onChange={(e) => {
                  const t = e.target.value as ContractType;
                  setContractType(t);
                  setPartyId('');
                  setPartyName('');
                }}
                disabled={!!editingContract}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold bg-slate-50 disabled:opacity-75"
              >
                <option value="CUSTOMER">Hợp Đồng Khách Hàng (SELL)</option>
                <option value="SUPPLIER">Hợp Đồng Nhà Cung Cấp (BUY)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số Hợp Đồng (Contract No.) *
              </label>
              <input
                type="text"
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                placeholder="VD: CTR-2026-001"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đồng Tiền Chính *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
              >
                <option value="USD">USD - Đô la Mỹ</option>
                <option value="VND">VND - Việt Nam Đồng</option>
              </select>
            </div>
          </div>

          {/* Row 2: Select Party */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {contractType === 'CUSTOMER' ? 'Khách Hàng Ký Hợp Đồng *' : 'Nhà Cung Cấp / Hãng Vận Chuyển *'}
              </label>
              <select
                value={partyId}
                onChange={(e) => handleSelectParty(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold"
              >
                <option value="">-- Chọn đối tác thương mại --</option>
                {contractType === 'CUSTOMER' ? (
                  customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.customerName} ({c.code || 'KH'})
                    </option>
                  ))
                ) : (
                  <>
                    <optgroup label="Nhà Cung Cấp (Suppliers)">
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.type}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Hãng Vận Chuyển (Carriers)">
                      {carriers.map(car => (
                        <option key={car.id} value={car.id}>{car.name} ({car.code}) - {car.mode}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên Hợp Đồng / Thỏa Thuận *
              </label>
              <input
                type="text"
                required
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="VD: Hợp đồng nguyên tắc cước biển dài hạn 2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Ngày Bắt Đầu Hiệu Lực *
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Ngày Hết Hạn Hợp Đồng *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-medium"
              />
            </div>
          </div>

          {/* Section: Commercial Terms */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Điều Khoản Thương Mại & Tín Dụng
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Miễn Phí Lưu Bãi/Vỏ (Free Time)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={freeTimeDays}
                    onChange={(e) => setFreeTimeDays(parseInt(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="text-xs text-slate-500">ngày</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Thời Hạn Nợ (Credit Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={creditDays}
                    onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="text-xs text-slate-500">ngày</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hạn Mức Tín Dụng ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chi Tiết Free Time & Demurrage/Detention
                </label>
                <input
                  type="text"
                  value={freeTimeDetails}
                  onChange={(e) => setFreeTimeDetails(e.target.value)}
                  placeholder="VD: 14 days Dem/Det combined at Cat Lai"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Điều Khoản Thanh Toán (Payment Terms)
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="VD: Net 30 days from B/L date"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section: Volume Commitment */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" /> Cam Kết Sản Lượng (Volume Commitment)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chu Kỳ Cam Kết</label>
                <select
                  value={volumePeriod}
                  onChange={(e) => setVolumePeriod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="MONTHLY">Hàng Tháng (Monthly)</option>
                  <option value="QUARTERLY">Hàng Quý (Quarterly)</option>
                  <option value="ANNUAL">Hàng Năm (Annual)</option>
                  <option value="TOTAL">Toàn Bộ Hợp Đồng</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mục Tiêu (TEU)</label>
                <input
                  type="number"
                  min={0}
                  value={targetTeu ?? ''}
                  onChange={(e) => setTargetTeu(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="VD: 50"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mức Tối Thiểu</label>
                <input
                  type="number"
                  min={0}
                  value={minVolume ?? ''}
                  onChange={(e) => setMinVolume(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="VD: 20"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mức Tối Đa</label>
                <input
                  type="number"
                  min={0}
                  value={maxVolume ?? ''}
                  onChange={(e) => setMaxVolume(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="VD: 100"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi Chú & Điều Kiện Đặc Biệt
            </label>
            <textarea
              rows={2}
              value={contractDescription}
              onChange={(e) => setContractDescription(e.target.value)}
              placeholder="Ghi chú thêm về hợp đồng, phạm vi tuyến, điều khoản phụ..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              {isSubmitting ? 'Đang Lưu...' : editingContract ? 'Lưu Thay Đổi' : 'Tạo Hợp Đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
