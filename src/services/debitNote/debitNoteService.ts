import { QuoteData, LineItem } from '../../types/logistics';
import { 
  DebitNoteRecord, 
  DebitNoteItem, 
  DebitNoteBankAccount, 
  DebitNoteStatus,
  DebitNoteCurrency 
} from '../../types/debitNote';
import { numberToVietnameseWords, numberToEnglishWords } from '../../utils/numberToWords';

const STORAGE_KEY = 'bogi_debit_notes_store_v1';

// Default Forwarder Bank Accounts (Vietcombank & Techcombank & USD)
export const DEFAULT_DEBIT_NOTE_BANKS: { vnd: DebitNoteBankAccount; usd: DebitNoteBankAccount } = {
  vnd: {
    bankId: 'VCB', // Vietcombank
    bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN Tân Bình',
    accountNumber: '0071001289999',
    accountHolder: 'CONG TY TNHH BOGI LOGISTICS & FORWARDING',
    branch: 'Chi nhánh Tân Bình, TP. Hồ Chí Minh',
    swiftCode: 'BFTV VNVX',
    currency: 'VND'
  },
  usd: {
    bankId: 'VCB',
    bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) - CN Tân Bình',
    accountNumber: '0071001298888',
    accountHolder: 'BOGI LOGISTICS & FORWARDING CO., LTD',
    branch: 'Tan Binh Branch, Ho Chi Minh City',
    swiftCode: 'BFTV VNVX',
    currency: 'USD'
  }
};

/**
 * Generates VietQR dynamic quick payment image URL
 */
export function generateVietQrUrl(
  bankId: string, 
  accountNumber: string, 
  amount: number, 
  description: string, 
  accountHolder: string
): string {
  const cleanBank = bankId.trim();
  const cleanAcc = accountNumber.trim().replace(/\s+/g, '');
  const cleanAmt = Math.round(Math.max(0, amount));
  const cleanDesc = encodeURIComponent(description.slice(0, 50));
  const cleanName = encodeURIComponent(accountHolder.toUpperCase());
  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-compact2.png?amount=${cleanAmt}&addInfo=${cleanDesc}&accountName=${cleanName}`;
}

/**
 * Maps a Quotation LineItem to a Debit Note Item with statutory VAT handling
 */
function mapLineItemToDebitNoteItem(item: LineItem, exchangeRate: number): DebitNoteItem {
  const isFreight = item.category === 'FREIGHT' || item.location === 'FREIGHT';
  // Statutory VAT in Vietnam: International freight is 0% VAT. Local charges / trucking / customs are usually 8% or 10%.
  let defaultVat = 0;
  if (!isFreight) {
    defaultVat = item.code?.includes('TRUCK') || item.code?.includes('CUSTOMS') || item.code?.includes('THC') ? 8 : (item.vatRate || 10);
  }

  const quantity = item.quantity || 1;
  const unitPrice = item.unitPrice || 0;
  const currency = (item.currency === 'VND' ? 'VND' : 'USD') as 'USD' | 'VND';
  const amount = (currency === 'VND' ? item.amountVnd : item.amountUsd) || (quantity * unitPrice);
  const vatAmount = Math.round((amount * defaultVat) / 100 * 100) / 100;
  const totalAmount = amount + vatAmount;

  return {
    id: `dni_${item.id || Math.random().toString(36).substring(2, 9)}`,
    code: item.code || 'CHG',
    description: item.description || 'Chi phí dịch vụ logistics',
    descriptionEn: (item as any).descriptionEn || item.description,
    category: item.category || 'OTHER',
    unit: item.unit || 'Lô',
    quantity,
    currency,
    unitPrice,
    amount,
    vatRate: defaultVat,
    vatAmount,
    totalAmount,
    exchangeRate,
    isCustomCharge: false
  };
}

/**
 * Recalculates all sums, VAT, USD/VND conversions, and words in VN/EN
 */
export function recalculateDebitNote(dn: DebitNoteRecord): DebitNoteRecord {
  const exRate = dn.exchangeRate > 0 ? dn.exchangeRate : 25400;

  let subtotalUsd = 0;
  let subtotalVnd = 0;
  let vatTotalUsd = 0;
  let vatTotalVnd = 0;

  const items = dn.items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const amount = qty * price;
    const vatRate = Number(it.vatRate) || 0;
    const vatAmount = (amount * vatRate) / 100;
    const totalAmount = amount + vatAmount;

    let amountVndConverted = 0;
    if (it.currency === 'USD') {
      subtotalUsd += amount;
      vatTotalUsd += vatAmount;
      amountVndConverted = Math.round(totalAmount * exRate);
    } else {
      subtotalVnd += amount;
      vatTotalVnd += vatAmount;
      amountVndConverted = totalAmount;
    }

    return {
      ...it,
      amount,
      vatAmount,
      totalAmount,
      amountVndConverted
    };
  });

  const grandTotalUsd = subtotalUsd + vatTotalUsd;
  const grandTotalVnd = subtotalVnd + vatTotalVnd;

  // Determine final payment amount & currency
  let finalAmountToPay = 0;
  let finalCurrency: 'VND' | 'USD' = 'VND';

  if (dn.currency === 'USD') {
    finalAmountToPay = grandTotalUsd + (grandTotalVnd > 0 ? grandTotalVnd / exRate : 0);
    finalCurrency = 'USD';
  } else {
    // Default to VND (standard for invoicing in Vietnam)
    finalAmountToPay = grandTotalVnd + (grandTotalUsd > 0 ? Math.round(grandTotalUsd * exRate) : 0);
    finalCurrency = 'VND';
  }

  const amountInWordsVi = numberToVietnameseWords(
    finalCurrency === 'VND' ? finalAmountToPay : Math.round(finalAmountToPay * exRate)
  );
  const amountInWordsEn = numberToEnglishWords(
    finalCurrency === 'USD' ? finalAmountToPay : Math.round(finalAmountToPay),
    finalCurrency
  );

  return {
    ...dn,
    items,
    exchangeRate: exRate,
    subtotalUsd: Math.round(subtotalUsd * 100) / 100,
    subtotalVnd: Math.round(subtotalVnd),
    vatTotalUsd: Math.round(vatTotalUsd * 100) / 100,
    vatTotalVnd: Math.round(vatTotalVnd),
    grandTotalUsd: Math.round(grandTotalUsd * 100) / 100,
    grandTotalVnd: Math.round(grandTotalVnd),
    finalAmountToPay: finalCurrency === 'VND' ? Math.round(finalAmountToPay) : Math.round(finalAmountToPay * 100) / 100,
    finalCurrency,
    amountInWordsVi,
    amountInWordsEn,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates a new Debit Note record prefilled from an existing QuoteData
 */
export function createDebitNoteFromQuote(
  quote: QuoteData, 
  customSuffix: string = '01'
): DebitNoteRecord {
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  
  // Due date default +3 days
  const dueDateObj = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const exRate = quote.exchangeRate || 25400;
  const quoteNum = quote.quoteNumber || `QUOTE-${now.getTime()}`;
  const debitNoteNumber = `DN-${quoteNum.replace(/^LOG-/, '')}-${customSuffix}`;

  const mappedItems = (quote.items || []).map(item => mapLineItemToDebitNoteItem(item, exRate));

  const draft: DebitNoteRecord = {
    id: `dn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    debitNoteNumber,
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    version: 1,
    issueDate,
    dueDate,
    status: 'DRAFT',
    currency: quote.quoteCurrency === 'VND' ? 'VND' : 'DUAL',
    exchangeRate: exRate,
    exchangeRateSource: 'Vietcombank bán ra thời điểm lập D/N',
    customer: {
      ...quote.customer
    },
    company: {
      ...quote.company
    },
    shipment: {
      mode: quote.shipment?.mode || 'Đường biển (Sea Freight FCL)',
      pol: quote.shipment?.pol || 'Cảng Cát Lái, TP.HCM (VNCLI)',
      pod: quote.shipment?.pod || 'Singapore Port (SGSIN)',
      carrier: quote.shipment?.carrier || 'ONE / MAERSK LINE',
      vesselVoyage: 'M/V EVER GIVEN / V.0422E',
      blNumber: `BL-${quote.quoteNumber.replace(/[^0-9]/g, '').slice(-6) || 'VN998811'}`,
      bookingNumber: `BK-${quote.quoteNumber.replace(/[^0-9]/g, '').slice(-6) || 'BK00213'}`,
      containerSealNo: `${quote.shipment?.containerType || "40'HC"}: TCNU8923412 / SL-88391`,
      cargoDescription: quote.shipment?.commodity || 'Hàng bách hóa / May mặc & Linh kiện (General Cargo)',
      grossWeightKg: quote.shipment?.grossWeightKg || 18500,
      volumeCbm: quote.shipment?.volumeCbm || 45,
      packages: `${quote.shipment?.quantity || 1} Container`,
      etd: quote.shipment?.etd || issueDate,
      eta: quote.shipment?.eta || dueDate
    },
    items: mappedItems,
    subtotalUsd: 0,
    subtotalVnd: 0,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: 0,
    grandTotalVnd: 0,
    finalAmountToPay: 0,
    finalCurrency: 'VND',
    amountInWordsVi: '',
    amountInWordsEn: '',
    bankAccountVnd: DEFAULT_DEBIT_NOTE_BANKS.vnd,
    bankAccountUsd: DEFAULT_DEBIT_NOTE_BANKS.usd,
    paymentTerms: 'Thanh toán trong vòng 03 ngày làm việc kể từ ngày phát hành Giấy báo nợ hoặc trước khi phát hành Lệnh giao hàng (D/O) / House B/L gốc.',
    specialNotes: `Nội dung chuyển khoản xin ghi rõ: "${debitNoteNumber} ${quote.customer?.companyName || ''}". Mọi thắc mắc về cước phí vui lòng liên hệ kế toán cước hoặc nhân viên phụ trách trong vòng 24h.`,
    bankChargeClause: "Mọi chi phí chuyển tiền ngân hàng do bên thanh toán chịu (OUR) / All banking charges are for payer's account (OUR).",
    preparedBy: quote.customer?.salesPerson || 'Kế toán cước & công nợ (Billing Specialist)',
    approvedBy: 'Kế toán trưởng (Chief Accountant)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return recalculateDebitNote(draft);
}

/**
 * Service to manage Debit Notes in local persistence
 */
export const DebitNoteService = {
  getAllDebitNotes(): DebitNoteRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read debit notes from storage:', e);
      return [];
    }
  },

  getDebitNotesForQuote(quoteId: string): DebitNoteRecord[] {
    const list = this.getAllDebitNotes();
    return list.filter(dn => dn.quotationId === quoteId || dn.quotationNumber === quoteId);
  },

  getDebitNoteById(id: string): DebitNoteRecord | null {
    const list = this.getAllDebitNotes();
    return list.find(dn => dn.id === id) || null;
  },

  saveDebitNote(debitNote: DebitNoteRecord): DebitNoteRecord {
    const recalculated = recalculateDebitNote(debitNote);
    const list = this.getAllDebitNotes();
    const existingIdx = list.findIndex(dn => dn.id === recalculated.id);
    if (existingIdx >= 0) {
      list[existingIdx] = recalculated;
    } else {
      list.unshift(recalculated);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save debit note to storage:', e);
    }
    return recalculated;
  },

  deleteDebitNote(id: string): boolean {
    const list = this.getAllDebitNotes();
    const filtered = list.filter(dn => dn.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete debit note:', e);
      return false;
    }
  },

  updateStatus(id: string, status: DebitNoteStatus): DebitNoteRecord | null {
    const dn = this.getDebitNoteById(id);
    if (!dn) return null;
    dn.status = status;
    dn.updatedAt = new Date().toISOString();
    return this.saveDebitNote(dn);
  }
};
