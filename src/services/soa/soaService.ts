import { DebitNoteRecord, DebitNoteBankAccount } from '../../types/debitNote';
import { CustomerInfo, CompanyProfile } from '../../types/logistics';
import { SoaRecord, SoaEntry, SoaAgingSummary, SoaAgingBracket, SoaEntryStatus } from '../../types/soa';
import { DebitNoteService, DEFAULT_DEBIT_NOTE_BANKS, generateVietQrUrl } from '../debitNote/debitNoteService';
import { numberToVietnameseWords, numberToEnglishWords } from '../../utils/numberToWords';

const SOA_STORAGE_KEY = 'bogi_soa_records_store_v1';

/**
 * Calculates overdue days and aging bracket for a given due date
 */
export function calculateAging(dueDateStr: string, balanceDue: number): { overdueDays: number; bracket: SoaAgingBracket } {
  if (balanceDue <= 0) {
    return { overdueDays: 0, bracket: 'CURRENT' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { overdueDays: 0, bracket: 'CURRENT' };
  } else if (diffDays <= 15) {
    return { overdueDays: diffDays, bracket: '1_15' };
  } else if (diffDays <= 30) {
    return { overdueDays: diffDays, bracket: '16_30' };
  } else if (diffDays <= 60) {
    return { overdueDays: diffDays, bracket: '31_60' };
  } else {
    return { overdueDays: diffDays, bracket: 'OVER_60' };
  }
}

/**
 * Maps a DebitNoteRecord into a SoaEntry with real-time balance and aging
 */
export function mapDebitNoteToSoaEntry(dn: DebitNoteRecord): SoaEntry {
  const isVnd = dn.finalCurrency === 'VND';
  const originalAmount = dn.finalAmountToPay || 0;
  
  // Paid amount estimation from status
  let paidAmount = 0;
  if (dn.status === 'PAID') {
    paidAmount = originalAmount;
  } else if (dn.status === 'PARTIALLY_PAID') {
    paidAmount = isVnd ? (dn.paidAmountVnd || originalAmount * 0.5) : (dn.paidAmountUsd || originalAmount * 0.5);
  }

  const balanceDue = Math.max(0, originalAmount - paidAmount);
  const { overdueDays, bracket } = calculateAging(dn.dueDate, balanceDue);

  let status: SoaEntryStatus = 'OPEN';
  if (balanceDue <= 0) {
    status = 'PAID';
  } else if (overdueDays > 0) {
    status = 'OVERDUE';
  } else if (paidAmount > 0) {
    status = 'PARTIALLY_PAID';
  }

  const routing = `${dn.shipment?.pol || 'Cảng đi'} -> ${dn.shipment?.pod || 'Cảng đến'}`;

  return {
    id: `soa_entry_${dn.id}`,
    debitNoteId: dn.id,
    debitNoteNumber: dn.debitNoteNumber,
    quotationNumber: dn.quotationNumber,
    issueDate: dn.issueDate,
    dueDate: dn.dueDate,
    blNumber: dn.shipment?.blNumber || 'Chờ cập nhật',
    bookingNumber: dn.shipment?.bookingNumber,
    vesselVoyage: dn.shipment?.vesselVoyage,
    routing,
    cargoDescription: dn.shipment?.cargoDescription,
    currency: dn.finalCurrency,
    originalAmount,
    paidAmount,
    balanceDue,
    overdueDays,
    agingBracket: bracket,
    status,
    notes: dn.specialNotes
  };
}

/**
 * Creates or recalculates a Statement of Account Record for a selected Customer
 */
export function buildSoaForCustomer(
  customerName: string,
  periodFrom?: string,
  periodTo?: string,
  customBankAccount?: DebitNoteBankAccount
): SoaRecord {
  const allNotes = DebitNoteService.getAllDebitNotes();
  const customerNotes = allNotes.filter(dn => {
    const cust = (dn.customer.companyName || dn.customer.customerName || '').trim().toLowerCase();
    const target = customerName.trim().toLowerCase();
    const match = cust.includes(target) || target.includes(cust);
    if (!match) return false;

    if (periodFrom && dn.issueDate < periodFrom) return false;
    if (periodTo && dn.issueDate > periodTo) return false;

    return true;
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Format customer short acronym
  const customerSlug = customerName.replace(/CÔNG TY (TNHH|CỔ PHẦN) /gi, '').trim().slice(0, 6).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CUST';
  const soaNumber = `SOA-${yearMonth}-${customerSlug}-${String(Math.floor(Math.random() * 900) + 100)}`;

  // Default period: start of current month to today if not provided
  const defFrom = periodFrom || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const defTo = periodTo || todayStr;

  const entries: SoaEntry[] = customerNotes.map(mapDebitNoteToSoaEntry);

  // Totals Calculation
  let totalBilledVnd = 0;
  let totalPaidVnd = 0;
  let totalBalanceDueVnd = 0;
  let totalOverdueVnd = 0;

  let totalBilledUsd = 0;
  let totalPaidUsd = 0;
  let totalBalanceDueUsd = 0;
  let totalOverdueUsd = 0;

  const agingVnd: SoaAgingSummary = {
    currentAmount: 0,
    days1to15: 0,
    days16to30: 0,
    days31to60: 0,
    over60Days: 0,
    totalOverdue: 0
  };

  const exRate = customerNotes[0]?.exchangeRate || 25400;

  entries.forEach(entry => {
    if (entry.currency === 'USD') {
      totalBilledUsd += entry.originalAmount;
      totalPaidUsd += entry.paidAmount;
      totalBalanceDueUsd += entry.balanceDue;
      if (entry.overdueDays > 0) totalOverdueUsd += entry.balanceDue;

      // Equivalent converted to VND for aging
      const dueVnd = Math.round(entry.balanceDue * exRate);
      if (entry.agingBracket === 'CURRENT') agingVnd.currentAmount += dueVnd;
      else if (entry.agingBracket === '1_15') agingVnd.days1to15 += dueVnd;
      else if (entry.agingBracket === '16_30') agingVnd.days16to30 += dueVnd;
      else if (entry.agingBracket === '31_60') agingVnd.days31to60 += dueVnd;
      else if (entry.agingBracket === 'OVER_60') agingVnd.over60Days += dueVnd;
    } else {
      totalBilledVnd += entry.originalAmount;
      totalPaidVnd += entry.paidAmount;
      totalBalanceDueVnd += entry.balanceDue;
      if (entry.overdueDays > 0) totalOverdueVnd += entry.balanceDue;

      if (entry.agingBracket === 'CURRENT') agingVnd.currentAmount += entry.balanceDue;
      else if (entry.agingBracket === '1_15') agingVnd.days1to15 += entry.balanceDue;
      else if (entry.agingBracket === '16_30') agingVnd.days16to30 += entry.balanceDue;
      else if (entry.agingBracket === '31_60') agingVnd.days31to60 += entry.balanceDue;
      else if (entry.agingBracket === 'OVER_60') agingVnd.over60Days += entry.balanceDue;
    }
  });

  agingVnd.totalOverdue = agingVnd.days1to15 + agingVnd.days16to30 + agingVnd.days31to60 + agingVnd.over60Days;

  // Grand balance due in VND (sum of VND + converted USD)
  const grandTotalDueVnd = totalBalanceDueVnd + Math.round(totalBalanceDueUsd * exRate);

  const bankAccount = customBankAccount || DEFAULT_DEBIT_NOTE_BANKS.vnd;
  const paymentMemo = `TT ${soaNumber}`;
  const vietQrUrl = grandTotalDueVnd > 0
    ? generateVietQrUrl(bankAccount.bankId, bankAccount.accountNumber, grandTotalDueVnd, paymentMemo, bankAccount.accountHolder)
    : undefined;

  const firstNote = customerNotes[0];
  const customer: CustomerInfo = firstNote?.customer || {
    companyName: customerName,
    customerName,
    taxId: 'Chưa cập nhật',
    address: 'Việt Nam',
    email: '',
    phone: '',
    contactPerson: customerName
  };

  const company: CompanyProfile = firstNote?.company || {
    name: 'CÔNG TY TNHH BOGI LOGISTICS & FORWARDING',
    englishName: 'BOGI LOGISTICS & FORWARDING CO., LTD',
    taxId: '0318999888',
    address: 'Tòa nhà Logistics Center, Tân Bình, TP. Hồ Chí Minh',
    phone: '028.3888.9999',
    email: 'accounting@bogilogistics.vn',
    website: 'https://bogilogistics.vn',
    bankName: 'Vietcombank',
    bankAccountNo: '0071001289999',
    bankAccountHolder: 'CONG TY TNHH BOGI LOGISTICS & FORWARDING',
    bankSwiftCode: 'BFTV VNVX',
    salesRepName: 'Bộ phận Kế toán công nợ',
    salesRepTitle: 'AR Specialist',
    salesRepPhone: '028.3888.9999',
    salesRepEmail: 'accounting@bogilogistics.vn'
  };

  return {
    id: `soa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    soaNumber,
    statementDate: todayStr,
    periodFrom: defFrom,
    periodTo: defTo,
    status: 'CONFIRMED',
    customer,
    company,
    currency: totalBalanceDueUsd > 0 && totalBalanceDueVnd > 0 ? 'DUAL' : (totalBalanceDueUsd > 0 ? 'USD' : 'VND'),
    exchangeRate: exRate,
    entries,
    totalBilledVnd,
    totalPaidVnd,
    totalBalanceDueVnd,
    totalOverdueVnd,
    totalBilledUsd,
    totalPaidUsd,
    totalBalanceDueUsd,
    totalOverdueUsd,
    agingVnd,
    amountInWordsVi: grandTotalDueVnd > 0 ? numberToVietnameseWords(grandTotalDueVnd) : 'Không đồng',
    amountInWordsEn: grandTotalDueVnd > 0 ? numberToEnglishWords(grandTotalDueVnd, 'VND') : 'Zero VND',
    bankAccount,
    vietQrUrl,
    paymentMemo,
    paymentTermsNote: 'Kính đề nghị Quý khách hàng kiểm tra, đối chiếu và thanh toán toàn bộ số dư nợ đến hạn trong vòng 05 ngày làm việc kể từ ngày nhận được Bảng đối soát này.',
    disputeClause: 'Mọi thắc mắc hoặc khiếu nại về số liệu công nợ, Quý khách vui lòng phản hồi bằng văn bản hoặc email đến phòng Kế toán trong vòng 03 ngày làm việc. Quá thời hạn trên, số liệu được xem là chính xác và có giá trị xác nhận nợ pháp lý.',
    preparedBy: 'Kế toán công nợ (AR Accountant)',
    approvedBy: 'Kế toán trưởng (Chief Accountant)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Service to manage Statements of Account (SOA) in persistence
 */
export const SoaService = {
  getAllSoaRecords(): SoaRecord[] {
    try {
      const raw = localStorage.getItem(SOA_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read SOA records from storage:', e);
      return [];
    }
  },

  getSoaById(id: string): SoaRecord | null {
    const list = this.getAllSoaRecords();
    return list.find(s => s.id === id) || null;
  },

  saveSoa(soa: SoaRecord): SoaRecord {
    const list = this.getAllSoaRecords();
    const existingIdx = list.findIndex(s => s.id === soa.id);
    const updated = { ...soa, updatedAt: new Date().toISOString() };
    if (existingIdx >= 0) {
      list[existingIdx] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem(SOA_STORAGE_KEY, JSON.stringify(list));
    return updated;
  },

  deleteSoa(id: string): void {
    const list = this.getAllSoaRecords().filter(s => s.id !== id);
    localStorage.setItem(SOA_STORAGE_KEY, JSON.stringify(list));
  },

  /**
   * Returns all unique customer names present across Debit Notes
   */
  getAvailableCustomerNames(): string[] {
    const allNotes = DebitNoteService.getAllDebitNotes();
    const names = new Set<string>();
    allNotes.forEach(dn => {
      const name = dn.customer.companyName || dn.customer.customerName;
      if (name && name.trim()) {
        names.add(name.trim());
      }
    });
    return Array.from(names);
  },

  /**
   * Quick payment update for a Debit Note from within the SOA
   */
  recordPaymentForDebitNote(debitNoteId: string, paidAmount: number, isFullyPaid: boolean = false): void {
    const dn = DebitNoteService.getDebitNoteById(debitNoteId);
    if (!dn) return;

    const newStatus = isFullyPaid || paidAmount >= dn.finalAmountToPay ? 'PAID' : 'PARTIALLY_PAID';
    const updated: DebitNoteRecord = {
      ...dn,
      status: newStatus,
      paidAmountVnd: dn.finalCurrency === 'VND' ? paidAmount : undefined,
      paidAmountUsd: dn.finalCurrency === 'USD' ? paidAmount : undefined,
      paidDate: new Date().toISOString().split('T')[0]
    };

    DebitNoteService.saveDebitNote(updated);
  }
};
