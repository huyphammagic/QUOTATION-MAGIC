import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  FileDown, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Send, 
  Eye, 
  Calendar, 
  DollarSign, 
  Building2, 
  Ship, 
  CreditCard, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Clock,
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { 
  DebitNoteRecord, 
  DebitNoteItem, 
  DebitNoteStatus, 
  DebitNoteCurrency,
  DebitNoteBankAccount 
} from '../../types/debitNote';
import { 
  DebitNoteService, 
  createDebitNoteFromQuote, 
  recalculateDebitNote, 
  generateVietQrUrl,
  DEFAULT_DEBIT_NOTE_BANKS 
} from '../../services/debitNote/debitNoteService';
import { exportDebitNotePdf } from '../../utils/exportDebitNotePdf';
import { exportDebitNoteExcel } from '../../utils/exportDebitNoteExcel';
import { formatUSD, formatVND } from '../../utils/formatters';

interface DebitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  onOpenPaymentHub?: (quoteId: string) => void;
}

// Quick suggestions for incident/additional charges in logistics
const INCIDENT_CHARGE_PRESETS: Array<{
  code: string;
  description: string;
  descriptionEn: string;
  category: any;
  defaultUnit: string;
  defaultPriceVnd: number;
  defaultVat: number;
}> = [
  { code: 'LIFT_ON_OFF', description: 'Phí nâng hạ vỏ container (Lift on / Lift off)', descriptionEn: 'Container Lift on/off fee', category: 'ORIGIN_LOCAL', defaultUnit: 'cont', defaultPriceVnd: 550000, defaultVat: 8 },
  { code: 'CONT_DEPOSIT', description: 'Phí cược vỏ container tạm thời', descriptionEn: 'Container deposit charge', category: 'OTHER', defaultUnit: 'cont', defaultPriceVnd: 2000000, defaultVat: 0 },
  { code: 'DEM_OVERDUE', description: 'Phí lưu bãi / lưu cont quá hạn (Demurrage/Detention)', descriptionEn: 'Demurrage / Detention fee', category: 'DESTINATION_LOCAL', defaultUnit: 'ngày', defaultPriceVnd: 850000, defaultVat: 8 },
  { code: 'INSPECTION', description: 'Phí kiểm hóa hải quan & bốc xếp hiện trường', descriptionEn: 'Customs physical inspection & handling', category: 'CUSTOMS', defaultUnit: 'lô', defaultPriceVnd: 1200000, defaultVat: 8 },
  { code: 'FUMIGATION', description: 'Phí hun trùng kiểm dịch thực vật', descriptionEn: 'Fumigation & Phytosanitary fee', category: 'OTHER', defaultUnit: 'cont', defaultPriceVnd: 450000, defaultVat: 8 },
  { code: 'VGM_WEIGH', description: 'Phí cân điện tử xác nhận tải trọng VGM', descriptionEn: 'VGM weighing certification', category: 'ORIGIN_LOCAL', defaultUnit: 'cont', defaultPriceVnd: 150000, defaultVat: 8 },
  { code: 'SEAL_FEE', description: 'Phí niêm chì hãng tàu (Seal fee)', descriptionEn: 'Carrier container seal fee', category: 'ORIGIN_LOCAL', defaultUnit: 'cái', defaultPriceVnd: 220000, defaultVat: 8 },
  { code: 'TELEX_REL', description: 'Phí điện giao hàng / Surrendered B/L', descriptionEn: 'Telex release / Surrendered B/L fee', category: 'ORIGIN_LOCAL', defaultUnit: 'set', defaultPriceVnd: 750000, defaultVat: 8 },
  { code: 'STORAGE', description: 'Phí lưu kho CFS / Kho ngoại quan phát sinh', descriptionEn: 'CFS / Bonded warehouse storage fee', category: 'WAREHOUSING', defaultUnit: 'cbm', defaultPriceVnd: 180000, defaultVat: 8 }
];

export const DebitNoteModal: React.FC<DebitNoteModalProps> = ({
  isOpen,
  onClose,
  quote,
  onOpenPaymentHub
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'send' | 'history'>('editor');
  const [debitNote, setDebitNote] = useState<DebitNoteRecord | null>(null);
  const [allNotesForQuote, setAllNotesForQuote] = useState<DebitNoteRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize or load Debit Notes for this quote
  useEffect(() => {
    if (!isOpen || !quote) return;

    const existingList = DebitNoteService.getDebitNotesForQuote(quote.id);
    setAllNotesForQuote(existingList);

    if (existingList.length > 0) {
      // Load the most recent one
      setDebitNote(existingList[0]);
    } else {
      // Create a new Debit Note from the quote
      const newDn = createDebitNoteFromQuote(quote, '01');
      const saved = DebitNoteService.saveDebitNote(newDn);
      setDebitNote(saved);
      setAllNotesForQuote([saved]);
    }
    setActiveTab('editor');
  }, [isOpen, quote?.id]);

  if (!isOpen || !quote || !debitNote) return null;

  // Handle Create Another Debit Note (e.g. Phase 2 or Supplementary D/N)
  const handleCreateNewDebitNote = () => {
    const nextIndex = (allNotesForQuote.length + 1).toString().padStart(2, '0');
    const newDn = createDebitNoteFromQuote(quote, nextIndex);
    const saved = DebitNoteService.saveDebitNote(newDn);
    setDebitNote(saved);
    setAllNotesForQuote(prev => [saved, ...prev]);
    setActiveTab('editor');
  };

  // Switch to another Debit Note from history
  const handleSelectDebitNote = (dn: DebitNoteRecord) => {
    setDebitNote(dn);
    setActiveTab('editor');
  };

  // Delete a Debit Note
  const handleDeleteDebitNote = (id: string) => {
    if (allNotesForQuote.length <= 1) {
      alert('Không thể xóa Debit Note duy nhất. Bạn có thể chỉnh sửa lại các thông tin.');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa Debit Note này không?')) {
      DebitNoteService.deleteDebitNote(id);
      const remaining = allNotesForQuote.filter(item => item.id !== id);
      setAllNotesForQuote(remaining);
      if (debitNote.id === id) {
        setDebitNote(remaining[0]);
      }
    }
  };

  // Save changes
  const handleSave = () => {
    if (!debitNote) return;
    setIsSaving(true);
    const recalculated = recalculateDebitNote(debitNote);
    const saved = DebitNoteService.saveDebitNote(recalculated);
    setDebitNote(saved);
    setAllNotesForQuote(prev => prev.map(item => item.id === saved.id ? saved : item));
    setTimeout(() => {
      setIsSaving(false);
    }, 400);
  };

  // Update item field
  const handleUpdateItem = (itemId: string, field: keyof DebitNoteItem, value: any) => {
    if (!debitNote) return;
    const updatedItems = debitNote.items.map(it => {
      if (it.id === itemId) {
        return { ...it, [field]: value };
      }
      return it;
    });
    const updatedDn = recalculateDebitNote({
      ...debitNote,
      items: updatedItems
    });
    setDebitNote(updatedDn);
  };

  // Remove an item
  const handleRemoveItem = (itemId: string) => {
    if (!debitNote) return;
    const updatedItems = debitNote.items.filter(it => it.id !== itemId);
    const updatedDn = recalculateDebitNote({
      ...debitNote,
      items: updatedItems
    });
    setDebitNote(updatedDn);
  };

  // Add a blank custom item
  const handleAddBlankItem = () => {
    if (!debitNote) return;
    const newItem: DebitNoteItem = {
      id: `dni_custom_${Date.now()}`,
      code: 'EXTRA',
      description: 'Chi phí phát sinh thực tế',
      category: 'OTHER',
      unit: 'lô',
      quantity: 1,
      currency: debitNote.finalCurrency,
      unitPrice: 0,
      amount: 0,
      vatRate: 8,
      vatAmount: 0,
      totalAmount: 0,
      isCustomCharge: true
    };
    const updatedDn = recalculateDebitNote({
      ...debitNote,
      items: [...debitNote.items, newItem]
    });
    setDebitNote(updatedDn);
  };

  // Add preset incident charge
  const handleAddPresetCharge = (preset: typeof INCIDENT_CHARGE_PRESETS[0]) => {
    if (!debitNote) return;
    const newItem: DebitNoteItem = {
      id: `dni_preset_${Date.now()}_${preset.code}`,
      code: preset.code,
      description: preset.description,
      descriptionEn: preset.descriptionEn,
      category: preset.category,
      unit: preset.defaultUnit,
      quantity: 1,
      currency: 'VND',
      unitPrice: preset.defaultPriceVnd,
      amount: preset.defaultPriceVnd,
      vatRate: preset.defaultVat,
      vatAmount: (preset.defaultPriceVnd * preset.defaultVat) / 100,
      totalAmount: preset.defaultPriceVnd + (preset.defaultPriceVnd * preset.defaultVat) / 100,
      isCustomCharge: true
    };
    const updatedDn = recalculateDebitNote({
      ...debitNote,
      items: [...debitNote.items, newItem]
    });
    setDebitNote(updatedDn);
    setPresetDropdownOpen(false);
  };

  // Update Shipment particulars
  const handleUpdateShipment = (field: string, val: any) => {
    if (!debitNote) return;
    setDebitNote({
      ...debitNote,
      shipment: {
        ...debitNote.shipment,
        [field]: val
      }
    });
  };

  // Update bank details
  const handleSelectBank = (bankKey: 'VCB' | 'TCB' | 'MB') => {
    if (!debitNote) return;
    let bankObj: DebitNoteBankAccount;
    if (bankKey === 'TCB') {
      bankObj = {
        bankId: 'TCB',
        bankName: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank) - CN Sài Gòn',
        accountNumber: '19036788899999',
        accountHolder: 'CONG TY TNHH BOGI LOGISTICS & FORWARDING',
        branch: 'Chi nhánh Sài Gòn, TP.HCM',
        swiftCode: 'VTCBVNVX',
        currency: 'VND'
      };
    } else if (bankKey === 'MB') {
      bankObj = {
        bankId: 'MB',
        bankName: 'Ngân hàng TMCP Quân Đội (MBBank) - CN Nam Sài Gòn',
        accountNumber: '0988888999999',
        accountHolder: 'CONG TY TNHH BOGI LOGISTICS & FORWARDING',
        branch: 'CN Nam Sài Gòn, TP.HCM',
        swiftCode: 'MSCBVNVX',
        currency: 'VND'
      };
    } else {
      bankObj = DEFAULT_DEBIT_NOTE_BANKS.vnd;
    }

    setDebitNote({
      ...debitNote,
      bankAccountVnd: bankObj
    });
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!debitNote) return;
    setIsExportingPdf(true);
    try {
      await exportDebitNotePdf(debitNote);
    } catch (e) {
      console.error('Lỗi xuất PDF Debit Note:', e);
      alert('Không thể tạo PDF. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!debitNote) return;
    setIsExportingExcel(true);
    try {
      await exportDebitNoteExcel(debitNote);
    } catch (e) {
      console.error('Lỗi xuất Excel Debit Note:', e);
      alert('Không thể tạo file Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Direct Browser Print
  const handleDirectPrint = () => {
    window.print();
  };

  // Copy helper
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // VietQR URL for instant scan & pay
  const vietQrPaymentUrl = useMemo(() => {
    if (!debitNote) return '';
    const transferDesc = `${debitNote.debitNoteNumber}`;
    return generateVietQrUrl(
      debitNote.bankAccountVnd.bankId,
      debitNote.bankAccountVnd.accountNumber,
      debitNote.finalCurrency === 'VND' ? debitNote.finalAmountToPay : Math.round(debitNote.finalAmountToPay * debitNote.exchangeRate),
      transferDesc,
      debitNote.bankAccountVnd.accountHolder
    );
  }, [debitNote]);

  // Email template content
  const emailSubject = `[DEBIT NOTE] Yêu Cầu Thanh Toán Cước Dịch Vụ - Số: ${debitNote.debitNoteNumber} - Báo Giá: ${debitNote.quotationNumber}`;
  const emailBody = `Kính gửi Quý Khách Hàng / Đối Tác: ${debitNote.customer.companyName || debitNote.customer.customerName},

Công ty chúng tôi xin gửi đến Quý Khách Giấy Báo Nợ (Debit Note) số: ${debitNote.debitNoteNumber} cho lô hàng cước vận tải theo Báo giá số ${debitNote.quotationNumber}.

Chi tiết lô hàng:
- Tuyến vận chuyển: ${debitNote.shipment.pol} -> ${debitNote.shipment.pod} (${debitNote.shipment.mode})
- Số B/L / Booking: ${debitNote.shipment.blNumber || 'N/A'} / ${debitNote.shipment.bookingNumber || 'N/A'}
- Số Container/Chì: ${debitNote.shipment.containerSealNo || 'N/A'}
- Tàu/Chuyến: ${debitNote.shipment.vesselVoyage || 'N/A'}

TỔNG SỐ TIỀN CẦN THANH TOÁN:
👉 ${debitNote.finalCurrency === 'USD' ? formatUSD(debitNote.finalAmountToPay) : formatVND(debitNote.finalAmountToPay)} (${debitNote.finalCurrency})
Bằng chữ: ${debitNote.amountInWordsVi}
Hạn thanh toán: trước ngày ${debitNote.dueDate}

THÔNG TIN CHUYỂN KHOẢN:
- Tên tài khoản: ${debitNote.bankAccountVnd.accountHolder}
- Số tài khoản: ${debitNote.bankAccountVnd.accountNumber}
- Ngân hàng: ${debitNote.bankAccountVnd.bankName}
- Nội dung CK: "${debitNote.debitNoteNumber} ${debitNote.customer.companyName || ''}"

Quý khách có thể quét mã VietQR tự động bằng bất kỳ App Ngân Hàng nào để thanh toán nhanh 24/7.
Mọi thắc mắc xin liên hệ lại bộ phận Kế toán / Sales qua hotline: ${debitNote.company.phone}.

Trân trọng cảm ơn sự hợp tác của Quý Khách!
${debitNote.company.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  TẠO & QUẢN LÝ DEBIT NOTE
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  {debitNote.debitNoteNumber}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
                  debitNote.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  debitNote.status === 'SENT' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                  debitNote.status === 'ISSUED' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {debitNote.status === 'PAID' ? 'Đã Thanh Toán 100%' :
                   debitNote.status === 'SENT' ? 'Đã Gửi Khách Hàng' :
                   debitNote.status === 'ISSUED' ? 'Đã Phát Hành' : 'Bản Nháp (Draft)'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Lập trên Báo giá: <span className="font-semibold text-white">{quote.quoteNumber}</span> | Khách hàng: <span className="text-blue-300 font-medium">{quote.customer.companyName || quote.customer.customerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Actions in Header */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu D/N'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Xuất file PDF chuẩn A4 Unicode"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>{isExportingPdf ? 'Đang xuất...' : 'PDF'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Xuất file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-2"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Soạn Thảo & Cước Phí</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Xem Trước Bản In A4 & VietQR</span>
            </button>

            <button
              onClick={() => setActiveTab('send')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>3. Gửi Khách Hàng (Email / Zalo)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>4. Danh Sách D/N ({allNotesForQuote.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-500">
              Tổng tiền D/N: <strong className="text-slate-900 font-bold">{debitNote.finalCurrency === 'USD' ? formatUSD(debitNote.finalAmountToPay) : formatVND(debitNote.finalAmountToPay)}</strong> {debitNote.finalCurrency}
            </span>
            {onOpenPaymentHub && (
              <button
                type="button"
                onClick={() => { onOpenPaymentHub(quote.id); onClose(); }}
                className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                title="Mở Trung tâm Thu hồi Công nợ & Đối soát UNC"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Thu Công Nợ</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">

          {/* TAB 1: SOẠN THẢO & ĐIỀU CHỈNH CHI PHÍ */}
          {activeTab === 'editor' && (
            <div className="space-y-6">

              {/* SECTION A: METADATA & PARAMS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mã Số Debit Note</label>
                  <input
                    type="text"
                    value={debitNote.debitNoteNumber}
                    onChange={(e) => setDebitNote({ ...debitNote, debitNoteNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-900 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ngày Phát Hành</label>
                  <input
                    type="date"
                    value={debitNote.issueDate}
                    onChange={(e) => setDebitNote({ ...debitNote, issueDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hạn Thanh Toán (Due Date)</label>
                  <input
                    type="date"
                    value={debitNote.dueDate}
                    onChange={(e) => setDebitNote({ ...debitNote, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs text-rose-600 font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trạng Thái Debit Note</label>
                  <select
                    value={debitNote.status}
                    onChange={(e) => setDebitNote({ ...debitNote, status: e.target.value as DebitNoteStatus })}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="DRAFT">Bản Nháp (Draft)</option>
                    <option value="ISSUED">Đã Phát Hành (Issued)</option>
                    <option value="SENT">Đã Gửi Khách (Sent)</option>
                    <option value="PARTIALLY_PAID">Thanh Toán 1 Phần</option>
                    <option value="PAID">Đã Tất Toán (Paid)</option>
                    <option value="CANCELLED">Hủy Bỏ (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Đồng Tiền Thanh Toán Chính</label>
                  <select
                    value={debitNote.currency}
                    onChange={(e) => {
                      const newCurr = e.target.value as DebitNoteCurrency;
                      const updated = recalculateDebitNote({
                        ...debitNote,
                        currency: newCurr,
                        finalCurrency: newCurr === 'USD' ? 'USD' : 'VND'
                      });
                      setDebitNote(updated);
                    }}
                    className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-200 rounded-lg"
                  >
                    <option value="VND">VNĐ (Việt Nam Đồng - Tiêu chuẩn)</option>
                    <option value="USD">USD (Đô la Mỹ)</option>
                    <option value="DUAL">Song Tệ (Thể hiện cả USD & VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tỷ Giá Quy Đổi (VND/USD)</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={debitNote.exchangeRate}
                      onChange={(e) => {
                        const rate = Number(e.target.value) || 25400;
                        const updated = recalculateDebitNote({
                          ...debitNote,
                          exchangeRate: rate
                        });
                        setDebitNote(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nguồn Tỷ Giá Hạch Toán</label>
                  <input
                    type="text"
                    value={debitNote.exchangeRateSource || ''}
                    placeholder="VD: Vietcombank tỷ giá bán ra ngày chuyển khoản..."
                    onChange={(e) => setDebitNote({ ...debitNote, exchangeRateSource: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* SECTION B: SHIPMENT & CARGO PARTICULARS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Ship className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông Tin Lô Hàng & Vận Đơn (Shipment Particulars)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Tự động kế thừa từ Báo giá, có thể cập nhật số B/L, Cont, Chì</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Phương Thức</label>
                    <input
                      type="text"
                      value={debitNote.shipment.mode}
                      onChange={(e) => handleUpdateShipment('mode', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Cảng Đi (POL)</label>
                    <input
                      type="text"
                      value={debitNote.shipment.pol}
                      onChange={(e) => handleUpdateShipment('pol', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Cảng Đến (POD)</label>
                    <input
                      type="text"
                      value={debitNote.shipment.pod}
                      onChange={(e) => handleUpdateShipment('pod', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Hãng Vận Chuyển / Hãng Tàu</label>
                    <input
                      type="text"
                      value={debitNote.shipment.carrier || ''}
                      onChange={(e) => handleUpdateShipment('carrier', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Số Vận Đơn (B/L No.)</label>
                    <input
                      type="text"
                      value={debitNote.shipment.blNumber || ''}
                      placeholder="VD: ONEY12345678"
                      onChange={(e) => handleUpdateShipment('blNumber', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs font-semibold text-blue-900 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Số Booking</label>
                    <input
                      type="text"
                      value={debitNote.shipment.bookingNumber || ''}
                      placeholder="VD: BK9988112"
                      onChange={(e) => handleUpdateShipment('bookingNumber', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Tàu / Chuyến (Vessel / Voyage)</label>
                    <input
                      type="text"
                      value={debitNote.shipment.vesselVoyage || ''}
                      placeholder="VD: EVER GIVEN / 0422E"
                      onChange={(e) => handleUpdateShipment('vesselVoyage', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Số Cont & Số Chì (Container/Seal)</label>
                    <input
                      type="text"
                      value={debitNote.shipment.containerSealNo || ''}
                      placeholder="VD: TCNU1234567 / SL-9922"
                      onChange={(e) => handleUpdateShipment('containerSealNo', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-500">Tên Hàng Hóa / Quy Cách Đóng Gói</label>
                    <input
                      type="text"
                      value={debitNote.shipment.cargoDescription || ''}
                      onChange={(e) => handleUpdateShipment('cargoDescription', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Trọng Lượng (GW - KGS)</label>
                    <input
                      type="number"
                      value={debitNote.shipment.grossWeightKg || 0}
                      onChange={(e) => handleUpdateShipment('grossWeightKg', Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Thể Tích (CBM)</label>
                    <input
                      type="number"
                      value={debitNote.shipment.volumeCbm || 0}
                      onChange={(e) => handleUpdateShipment('volumeCbm', Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: CHARGES BREAKDOWN TABLE */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bảng Chi Tiết Cước & Phụ Phí (Debit Note Line Items)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chỉnh sửa đơn giá, số lượng, thuế suất VAT và thêm chi phí thực tế phát sinh
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 relative">
                    {/* Add preset incident charge */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Thêm Phí Phát Sinh Nhanh</span>
                      </button>

                      {presetDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 text-xs">
                          <div className="px-2 py-1 font-bold text-slate-700 text-[11px] border-b border-slate-100 mb-1">
                            Chọn Phụ Phí Phát Sinh Thường Gặp
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {INCIDENT_CHARGE_PRESETS.map((preset) => (
                              <button
                                key={preset.code}
                                type="button"
                                onClick={() => handleAddPresetCharge(preset)}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800">{preset.description}</div>
                                  <div className="text-[10px] text-slate-400">{preset.code} - VAT {preset.defaultVat}%</div>
                                </div>
                                <div className="text-emerald-600 font-bold text-[11px]">
                                  {formatVND(preset.defaultPriceVnd)}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add blank row */}
                    <button
                      type="button"
                      onClick={handleAddBlankItem}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Dòng</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-3 min-w-[200px]">Hạng Mục Chi Phí (Description)</th>
                        <th className="py-2 px-2 text-center w-16">Mã</th>
                        <th className="py-2 px-2 text-center w-16">SL</th>
                        <th className="py-2 px-2 text-center w-16">ĐVT</th>
                        <th className="py-2 px-2 text-center w-14">Tiền</th>
                        <th className="py-2 px-2 text-right w-24">Đơn Giá</th>
                        <th className="py-2 px-2 text-right w-28">Thành Tiền</th>
                        <th className="py-2 px-2 text-center w-16">VAT %</th>
                        <th className="py-2 px-2 text-right w-24">Tiền Thuế</th>
                        <th className="py-2 px-2 text-right w-28">Tổng Tiền</th>
                        <th className="py-2 px-2 text-center w-10">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {debitNote.items.map((item, index) => {
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-2 text-center text-slate-400 font-medium">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                  className="w-full px-2 py-1 text-xs text-slate-800 font-medium border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                                />
                                {item.isCustomCharge && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">
                                    Phát sinh
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="text"
                                value={item.code}
                                onChange={(e) => handleUpdateItem(item.id, 'code', e.target.value)}
                                className="w-14 text-center px-1 py-1 text-xs text-slate-600 border border-slate-200 rounded font-mono uppercase"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                                className="w-14 text-center px-1 py-1 text-xs text-slate-800 font-semibold border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                                className="w-14 text-center px-1 py-1 text-xs text-slate-600 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <select
                                value={item.currency}
                                onChange={(e) => handleUpdateItem(item.id, 'currency', e.target.value as 'USD' | 'VND')}
                                className="text-xs px-1 py-1 border border-slate-200 rounded font-semibold text-slate-700"
                              >
                                <option value="USD">USD</option>
                                <option value="VND">VND</option>
                              </select>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                                className="w-24 text-right px-1.5 py-1 text-xs font-semibold text-slate-800 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-slate-700">
                              {item.currency === 'USD' ? formatUSD(item.amount) : formatVND(item.amount)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <select
                                value={item.vatRate}
                                onChange={(e) => handleUpdateItem(item.id, 'vatRate', Number(e.target.value))}
                                className="text-xs px-1 py-1 border border-slate-200 rounded font-medium text-slate-700"
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={8}>8%</option>
                                <option value={10}>10%</option>
                              </select>
                            </td>
                            <td className="py-2 px-2 text-right text-slate-500 font-medium">
                              {item.currency === 'USD' ? formatUSD(item.vatAmount) : formatVND(item.vatAmount)}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">
                              {item.currency === 'USD' ? formatUSD(item.totalAmount) : formatVND(item.totalAmount)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary Footer */}
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>
                      <strong>Số tiền bằng chữ (VNĐ):</strong> <span className="text-blue-800 font-medium italic">{debitNote.amountInWordsVi}</span>
                    </p>
                    <p>
                      <strong>In English:</strong> <span className="text-slate-700 italic">{debitNote.amountInWordsEn}</span>
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1 text-xs min-w-[280px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Cộng tiền hàng USD:</span>
                      <span className="font-semibold text-slate-700">{formatUSD(debitNote.subtotalUsd)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cộng tiền hàng VND:</span>
                      <span className="font-semibold text-slate-700">{formatVND(debitNote.subtotalVnd)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tiền thuế VAT:</span>
                      <span className="font-semibold text-slate-700">
                        {formatUSD(debitNote.vatTotalUsd)} / {formatVND(debitNote.vatTotalVnd)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm font-bold text-blue-900">
                      <span>TỔNG THANH TOÁN:</span>
                      <span className="text-rose-600">
                        {debitNote.finalCurrency === 'USD' ? formatUSD(debitNote.finalAmountToPay) : formatVND(debitNote.finalAmountToPay)} {debitNote.finalCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D: BANK ACCOUNTS & TERMS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Account */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tài Khoản Ngân Hàng Thụ Hưởng & VietQR</span>
                  </h4>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBank('VCB')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                        debitNote.bankAccountVnd.bankId === 'VCB'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Vietcombank (VCB)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBank('TCB')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                        debitNote.bankAccountVnd.bankId === 'TCB'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Techcombank (TCB)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBank('MB')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                        debitNote.bankAccountVnd.bankId === 'MB'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      MB Bank (MB)
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Chủ Tài Khoản</label>
                      <input
                        type="text"
                        value={debitNote.bankAccountVnd.accountHolder}
                        onChange={(e) => setDebitNote({
                          ...debitNote,
                          bankAccountVnd: { ...debitNote.bankAccountVnd, accountHolder: e.target.value }
                        })}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">Số Tài Khoản</label>
                        <input
                          type="text"
                          value={debitNote.bankAccountVnd.accountNumber}
                          onChange={(e) => setDebitNote({
                            ...debitNote,
                            bankAccountVnd: { ...debitNote.bankAccountVnd, accountNumber: e.target.value }
                          })}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold text-blue-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">Mã Ngân Hàng</label>
                        <input
                          type="text"
                          value={debitNote.bankAccountVnd.bankId}
                          onChange={(e) => setDebitNote({
                            ...debitNote,
                            bankAccountVnd: { ...debitNote.bankAccountVnd, bankId: e.target.value }
                          })}
                          className="w-full px-2 py-1 border border-slate-200 rounded uppercase font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Tên Ngân Hàng & Chi Nhánh</label>
                      <input
                        type="text"
                        value={debitNote.bankAccountVnd.bankName}
                        onChange={(e) => setDebitNote({
                          ...debitNote,
                          bankAccountVnd: { ...debitNote.bankAccountVnd, bankName: e.target.value }
                        })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms & Notes */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Điều Khoản & Chữ Ký Phê Duyệt</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Điều Khoản Thanh Toán</label>
                      <textarea
                        rows={2}
                        value={debitNote.paymentTerms}
                        onChange={(e) => setDebitNote({ ...debitNote, paymentTerms: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Ghi Chú Chuyển Khoản & Phí Ngân Hàng</label>
                      <input
                        type="text"
                        value={debitNote.bankChargeClause}
                        onChange={(e) => setDebitNote({ ...debitNote, bankChargeClause: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">Người Lập Biểu (Prepared By)</label>
                        <input
                          type="text"
                          value={debitNote.preparedBy}
                          onChange={(e) => setDebitNote({ ...debitNote, preparedBy: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">Kế Toán Trưởng / Duyệt (Approved By)</label>
                        <input
                          type="text"
                          value={debitNote.approvedBy}
                          onChange={(e) => setDebitNote({ ...debitNote, approvedBy: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: A4 LIVE PRINT-READY PREVIEW & VIETQR */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Preview top toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Bản in A4 tiêu chuẩn thương mại quốc tế (Bilingual VN/EN) - Sẵn sàng xuất PDF / In ngay</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDirectPrint}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Ngay (Print)</span>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Tải File PDF</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Tải File Excel</span>
                  </button>
                </div>
              </div>

              {/* The A4 Document Container */}
              <div className="flex justify-center pb-8">
                <div 
                  ref={previewRef}
                  className="w-full max-w-[800px] bg-white p-8 sm:p-12 shadow-xl border border-slate-200 rounded-sm text-slate-800 print:m-0 print:p-0 print:border-none print:shadow-none"
                  style={{ minHeight: '1050px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {/* Decorative top bar */}
                  <div className="h-1.5 bg-blue-900 w-full mb-6" />

                  {/* Company Header */}
                  <div className="border-b border-slate-200 pb-4 mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {debitNote.company.name.toUpperCase()}
                        </h1>
                        {debitNote.company.englishName && (
                          <div className="text-xs font-bold text-slate-500 tracking-wide uppercase">
                            {debitNote.company.englishName}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 mt-1 max-w-lg leading-relaxed">
                          Địa chỉ: {debitNote.company.address}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          MST: <strong>{debitNote.company.taxId}</strong> | Hotline: {debitNote.company.phone} | Email: {debitNote.company.email}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs uppercase tracking-wider">
                          ORIGINAL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
                        DEBIT NOTE
                      </h2>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        GIẤY BÁO NỢ & YÊU CẦU THANH TOÁN
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs min-w-[240px]">
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 font-medium">Số D/N (No.):</span>
                        <strong className="text-blue-900 font-bold">{debitNote.debitNoteNumber}</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 font-medium">Ngày lập (Date):</span>
                        <span className="text-slate-700">{debitNote.issueDate}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 font-medium">Hạn thanh toán (Due):</span>
                        <strong className="text-rose-600 font-semibold">{debitNote.dueDate}</strong>
                      </div>
                      <div className="flex justify-between py-0.5 border-t border-slate-200 mt-1 pt-1">
                        <span className="text-slate-500 font-medium">Số Báo Giá (Quote Ref):</span>
                        <span className="font-semibold text-slate-800">{debitNote.quotationNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bill To & Shipment Info Side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
                    {/* Bill To */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3">
                      <div className="font-bold text-blue-900 uppercase text-[11px] pb-1 mb-2 border-b border-slate-200">
                        I. Khách Hàng Thanh Toán (Bill To)
                      </div>
                      <div className="font-bold text-slate-900 text-xs mb-1">
                        {debitNote.customer.companyName || debitNote.customer.customerName}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-tight">
                        <strong>MST:</strong> {debitNote.customer.taxId || 'N/A'}
                      </p>
                      <p className="text-slate-600 text-[11px] leading-tight">
                        <strong>Người liên hệ:</strong> {debitNote.customer.contactPerson || debitNote.customer.customerName || 'N/A'}
                      </p>
                      <p className="text-slate-600 text-[11px] leading-tight">
                        <strong>Điện thoại:</strong> {debitNote.customer.phone || 'N/A'} | {debitNote.customer.email || ''}
                      </p>
                      <p className="text-slate-600 text-[11px] leading-tight mt-0.5">
                        <strong>Địa chỉ:</strong> {debitNote.customer.address || 'N/A'}
                      </p>
                    </div>

                    {/* Shipment particulars */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3">
                      <div className="font-bold text-emerald-900 uppercase text-[11px] pb-1 mb-2 border-b border-slate-200">
                        II. Chi Tiết Lô Hàng (Shipment Particulars)
                      </div>
                      <p className="text-slate-700 text-[11px] leading-tight">
                        <strong>Tuyến:</strong> {debitNote.shipment.pol} &rarr; {debitNote.shipment.pod} ({debitNote.shipment.mode})
                      </p>
                      <p className="text-slate-700 text-[11px] leading-tight">
                        <strong>Số B/L:</strong> <span className="font-semibold text-blue-900">{debitNote.shipment.blNumber || 'N/A'}</span> | <strong>Booking:</strong> {debitNote.shipment.bookingNumber || 'N/A'}
                      </p>
                      <p className="text-slate-700 text-[11px] leading-tight">
                        <strong>Tàu/Chuyến:</strong> {debitNote.shipment.vesselVoyage || 'N/A'}
                      </p>
                      <p className="text-slate-700 text-[11px] leading-tight">
                        <strong>Cont/Chì:</strong> {debitNote.shipment.containerSealNo || 'N/A'}
                      </p>
                      <p className="text-slate-700 text-[11px] leading-tight">
                        <strong>Hàng hóa:</strong> {debitNote.shipment.cargoDescription || 'N/A'} | <strong>GW:</strong> {debitNote.shipment.grossWeightKg} kg | <strong>Vol:</strong> {debitNote.shipment.volumeCbm} CBM
                      </p>
                    </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-blue-950 text-white font-bold text-[11px]">
                          <th className="border border-slate-300 py-2 px-2 text-center w-8">STT</th>
                          <th className="border border-slate-300 py-2 px-3 text-left">Hạng Mục Chi Phí (Description)</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-12">Mã</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-12">SL</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-12">ĐVT</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-20">Đơn Giá</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-12">Loại</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-24">Thành Tiền</th>
                          <th className="border border-slate-300 py-2 px-2 text-center w-12">VAT</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-20">Tiền Thuế</th>
                          <th className="border border-slate-300 py-2 px-2 text-right w-24">Tổng Tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debitNote.items.map((it, idx) => (
                          <tr key={it.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-500 font-medium">{idx + 1}</td>
                            <td className="border border-slate-300 py-1.5 px-3 font-medium text-slate-900">
                              {it.description}
                              {it.descriptionEn && <div className="text-[10px] text-slate-500 italic">{it.descriptionEn}</div>}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-mono text-[10px] text-slate-600">{it.code}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold">{it.quantity}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-600">{it.unit}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-right text-slate-700">
                              {it.currency === 'USD' ? formatUSD(it.unitPrice) : formatVND(it.unitPrice)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-semibold text-slate-600">{it.currency}</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-right font-medium text-slate-800">
                              {it.currency === 'USD' ? formatUSD(it.amount) : formatVND(it.amount)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-medium">{it.vatRate}%</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-right text-slate-600">
                              {it.currency === 'USD' ? formatUSD(it.vatAmount) : formatVND(it.vatAmount)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-900">
                              {it.currency === 'USD' ? formatUSD(it.totalAmount) : formatVND(it.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Subtotals & Grand Total Box */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="text-xs text-slate-500 italic max-w-sm">
                      <p>• Tỷ giá quy đổi thanh toán: 1 USD = <strong>{formatVND(debitNote.exchangeRate)} VND</strong> ({debitNote.exchangeRateSource || 'VCB'})</p>
                      <p>• {debitNote.bankChargeClause}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs w-full sm:w-72 space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Cộng tiền chưa thuế USD:</span>
                        <span className="font-semibold">{formatUSD(debitNote.subtotalUsd)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Cộng tiền chưa thuế VND:</span>
                        <span className="font-semibold">{formatVND(debitNote.subtotalVnd)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tiền thuế VAT:</span>
                        <span className="font-semibold">{formatUSD(debitNote.vatTotalUsd)} / {formatVND(debitNote.vatTotalVnd)}</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm text-blue-950">
                        <span>TỔNG CẦN THANH TOÁN:</span>
                        <span className="text-rose-600 font-black">
                          {debitNote.finalCurrency === 'USD' ? formatUSD(debitNote.finalAmountToPay) : formatVND(debitNote.finalAmountToPay)} {debitNote.finalCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in words */}
                  <div className="bg-slate-100 p-3 rounded-lg text-xs mb-6 border border-slate-200">
                    <p className="text-slate-800">
                      <strong>Số tiền bằng chữ (VNĐ):</strong> <span className="font-semibold italic">{debitNote.amountInWordsVi}</span>
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      <strong>In English:</strong> <span className="italic">{debitNote.amountInWordsEn}</span>
                    </p>
                  </div>

                  {/* Payment Details with VietQR */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-amber-900 uppercase text-[11px] flex items-center space-x-1 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                        <span>Thông Tin Tài Khoản Ngân Hàng Thụ Hưởng (Beneficiary Bank)</span>
                      </div>
                      <p className="text-slate-800">
                        Tên tài khoản: <strong className="text-blue-900">{debitNote.bankAccountVnd.accountHolder}</strong>
                      </p>
                      <p className="text-slate-800">
                        Số tài khoản VND: <strong className="font-mono text-sm text-blue-950">{debitNote.bankAccountVnd.accountNumber}</strong>
                      </p>
                      <p className="text-slate-700">
                        Ngân hàng: {debitNote.bankAccountVnd.bankName}
                      </p>
                      <p className="text-slate-700">
                        Nội dung chuyển khoản: <strong className="bg-white px-2 py-0.5 border border-amber-300 rounded font-mono text-blue-900">{debitNote.debitNoteNumber} {debitNote.customer.companyName || ''}</strong>
                      </p>
                      <p className="text-[11px] text-amber-800 italic pt-1">
                        {debitNote.paymentTerms}
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-amber-200 shadow-2xs shrink-0 text-center">
                      <img 
                        src={vietQrPaymentUrl} 
                        alt="VietQR Chuyển Khoản Tức Thì"
                        className="w-32 h-32 object-contain rounded"
                        loading="lazy"
                      />
                      <span className="text-[10px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-blue-600" />
                        <span>Quét VietQR 24/7</span>
                      </span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">NGƯỜI LẬP PHIẾU</div>
                      <div className="text-[10px] text-slate-400 italic">(Prepared By)</div>
                      <div className="h-16 flex items-end justify-center font-bold text-slate-800">
                        {debitNote.preparedBy}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800">KẾ TOÁN TRƯỞNG</div>
                      <div className="text-[10px] text-slate-400 italic">(Chief Accountant / Approved)</div>
                      <div className="h-16 flex items-end justify-center font-bold text-slate-800">
                        {debitNote.approvedBy}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800">XÁC NHẬN KHÁCH HÀNG</div>
                      <div className="text-[10px] text-slate-400 italic">(Customer Acceptance)</div>
                      <div className="h-16 flex items-end justify-center text-slate-400 italic text-[11px]">
                        (Ký, ghi rõ họ tên & đóng dấu)
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GỬI KHÁCH HÀNG (EMAIL / ZALO / COPY LINK) */}
          {activeTab === 'send' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Soạn Email Gửi Debit Note Cho Khách Hàng</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nội dung được tự động chuẩn bị song ngữ, kèm đầy đủ thông tin thanh toán & VietQR
                    </p>
                  </div>

                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    Gửi đến: {debitNote.customer.email || 'Chưa có email khách'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu Đề Email (Subject)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={emailSubject}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(emailSubject, 'subject')}
                      className="absolute right-1.5 top-1.5 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'subject' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nội Dung Thư Đòi Nợ & Yêu Cầu Thanh Toán</label>
                  <div className="relative">
                    <textarea
                      rows={12}
                      readOnly
                      value={emailBody}
                      className="w-full p-3 text-xs text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(emailBody, 'body')}
                      className="absolute right-3 top-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {copiedField === 'body' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                      <span>{copiedField === 'body' ? 'Đã Sao Chép!' : 'Sao Chép Toàn Bộ'}</span>
                    </button>
                  </div>
                </div>

                {/* Mark as sent & quick share */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...debitNote,
                          status: 'SENT' as DebitNoteStatus,
                          sentAt: new Date().toISOString(),
                          sentViaChannel: 'EMAIL' as const
                        };
                        DebitNoteService.saveDebitNote(updated);
                        setDebitNote(updated);
                        alert(`Đã đánh dấu Debit Note ${debitNote.debitNoteNumber} là ĐÃ GỬI (SENT).`);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đánh Dấu "Đã Gửi Khách Hàng"</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const mailtoLink = `mailto:${encodeURIComponent(debitNote.customer.email || '')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                        window.location.href = mailtoLink;
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Ứng Dụng Email (Mailto)</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const zaloText = `[DEBIT NOTE ${debitNote.debitNoteNumber}] Kính gửi Quý Khách, cước phí cho Báo giá ${debitNote.quotationNumber} là ${debitNote.finalCurrency === 'USD' ? formatUSD(debitNote.finalAmountToPay) : formatVND(debitNote.finalAmountToPay)} ${debitNote.finalCurrency}. Hạn thanh toán: ${debitNote.dueDate}. STK: ${debitNote.bankAccountVnd.accountNumber} (${debitNote.bankAccountVnd.bankId}) - ${debitNote.bankAccountVnd.accountHolder}. Trân trọng!`;
                        handleCopy(zaloText, 'zalo');
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{copiedField === 'zalo' ? 'Đã copy tin nhắn Zalo!' : 'Copy Tin Nhắn Zalo / SMS'}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: LỊCH SỬ DEBIT NOTE CỦA BÁO GIÁ NÀY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Tất Cả Debit Note Đã Lập Cho Báo Giá {quote.quoteNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ xuất nhiều Debit Note theo từng đợt thanh toán (Đợt 1 Cước biển, Đợt 2 Phí cont & thủ tục)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewDebitNote}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Thêm Debit Note Mới (Đợt Khác)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allNotesForQuote.map((item) => {
                  const isCurrent = item.id === debitNote.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{item.debitNoteNumber}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                              Đang Mở
                            </span>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          item.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'SENT' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        <p>Ngày phát hành: <strong>{item.issueDate}</strong> | Hạn: <strong>{item.dueDate}</strong></p>
                        <p>Số lượng hạng mục cước: <strong>{item.items.length} phí</strong></p>
                        <p className="text-base font-black text-blue-900 pt-1">
                          {item.finalCurrency === 'USD' ? formatUSD(item.finalAmountToPay) : formatVND(item.finalAmountToPay)} {item.finalCurrency}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center space-x-2">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSelectDebitNote(item)}
                              className="px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-500 transition cursor-pointer"
                            >
                              Chọn Bản Này
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => exportDebitNotePdf(item)}
                            className="p-1 text-slate-600 hover:text-blue-600 rounded"
                            title="Tải PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportDebitNoteExcel(item)}
                            className="p-1 text-slate-600 hover:text-emerald-600 rounded"
                            title="Tải Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </div>

                        {allNotesForQuote.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDebitNote(item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded"
                            title="Xóa Debit Note này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* MODAL BOTTOM BAR */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Debit Note được lưu tự động trên hệ thống • Tích hợp trực tiếp công nợ & mã VietQR
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
