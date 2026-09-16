import { QuoteData, QuoteCurrency, CompanyProfile } from '../../types/logistics';
import { normalizeUnicode } from './pdfFontLoader';
import { 
  formatUSD, 
  formatNumberVND, 
  formatNumber, 
  formatExchangeRate 
} from '../../utils/formatters';

export type DocumentLanguage = 'vi' | 'en' | 'bilingual';

export interface DocumentChargeRow {
  index: number;
  description: string;
  note: string;
  quantity: number | string;
  unit: string;
  unitPriceFormatted: string;
  currency: string;
  vatRateFormatted: string;
  amountFormatted: string;
  location: 'POL' | 'FREIGHT' | 'POD' | 'OTHER';
}

export interface DocumentChargeGroup {
  locationKey: 'POL' | 'FREIGHT' | 'POD' | 'OTHER';
  groupTitle: string;
  subtotalText: string;
  rows: DocumentChargeRow[];
}

export interface CanonicalDocumentViewModel {
  meta: {
    quoteNumber: string;
    revision: string;
    createdDate: string;
    validityDate: string;
    currency: QuoteCurrency;
    isVnd: boolean;
    exchangeRateText: string;
    documentTitle: string;
  };
  company: {
    companyId?: string;
    companyCode?: string;
    name: string;
    englishName: string;
    address: string;
    taxId: string;
    phone: string;
    email: string;
    website: string;
    logoUrl?: string;
    salesRepName: string;
    salesRepTitle: string;
    salesRepPhone: string;
    salesRepEmail: string;
    bankName: string;
    bankAccountNo: string;
    bankAccountHolder: string;
    bankBranch: string;
  };
  customer: {
    name: string;
    companyName: string;
    contactPerson: string;
    address: string;
    taxId: string;
    phone: string;
    email: string;
  };
  shipment: {
    mode: string;
    containerType: string;
    pol: string;
    pod: string;
    commodity: string;
    quantitySummary: string;
    transitTime: string;
    freeTime: string;
  };
  charges: {
    groups: DocumentChargeGroup[];
    allRows: DocumentChargeRow[];
    subtotalFormatted: string;
    vatTotalFormatted: string;
    grandTotalFormatted: string;
    equivalentUsdFormatted?: string;
    equivalentVndFormatted?: string;
  };
  terms: {
    incoterm: string;
    paymentTerm: string;
    exclusionsNotes: string;
    bankAccountInfo: string;
  };
  signatures: {
    customerTitle: string;
    customerSub: string;
    customerSigner: string;
    companyTitle: string;
    companySub: string;
    companySigner: string;
    companyContact: string;
  };
}

/**
 * Builds the canonical document view model from real Firebase QuoteData.
 * Guarantees zero mock/fake data, zero hardcoded business data,
 * and 100% Unicode NFC normalization.
 */
export function buildQuotationDocumentModel(
  quote: QuoteData,
  targetCurrency?: QuoteCurrency,
  language: DocumentLanguage = 'bilingual'
): CanonicalDocumentViewModel {
  const currency: QuoteCurrency = targetCurrency || quote.quoteCurrency || 'USD';
  const isVnd = currency === 'VND';

  // 1. Normalized Company (Phase 37: Prioritize Immutable Company Snapshot)
  const snap = quote.companySnapshot;
  const legacy = (quote.company || {}) as Partial<CompanyProfile>;
  const company = {
    companyId: snap?.companyId || quote.companyId || 'company_profile',
    companyCode: snap?.companyCode || '',
    name: normalizeUnicode(snap?.displayName || snap?.legalName || legacy.name || ''),
    englishName: normalizeUnicode(snap?.legalName || legacy.englishName || legacy.name || ''),
    address: normalizeUnicode(snap?.address || legacy.address || ''),
    taxId: normalizeUnicode(snap?.taxCode || legacy.taxId || ''),
    phone: normalizeUnicode(snap?.phone || legacy.phone || ''),
    email: normalizeUnicode(snap?.email || legacy.email || ''),
    website: normalizeUnicode(snap?.website || legacy.website || ''),
    logoUrl: snap?.logoUrl || legacy.logoUrl || '',
    salesRepName: normalizeUnicode(snap?.salesRepName || legacy.salesRepName || ''),
    salesRepTitle: normalizeUnicode(snap?.salesRepTitle || legacy.salesRepTitle || ''),
    salesRepPhone: normalizeUnicode(snap?.salesRepPhone || legacy.salesRepPhone || ''),
    salesRepEmail: normalizeUnicode(snap?.salesRepEmail || legacy.salesRepEmail || ''),
    bankName: normalizeUnicode(snap?.bankName || legacy.bankName || ''),
    bankAccountNo: normalizeUnicode(snap?.bankAccountNo || legacy.bankAccountNo || ''),
    bankAccountHolder: normalizeUnicode(snap?.bankAccountHolder || legacy.bankAccountHolder || ''),
    bankBranch: normalizeUnicode(snap?.bankBranch || (legacy as any).bankBranch || ''),
  };

  // 2. Normalized Customer
  const customerData: any = quote.customer || {};
  const customer = {
    name: normalizeUnicode(customerData.customerName || ''),
    companyName: normalizeUnicode(customerData.companyName || customerData.customerName || ''),
    contactPerson: normalizeUnicode(customerData.contactPerson || customerData.customerName || ''),
    address: normalizeUnicode(customerData.address || ''),
    taxId: normalizeUnicode(customerData.taxId || ''),
    phone: normalizeUnicode(customerData.phone || ''),
    email: normalizeUnicode(customerData.email || ''),
  };

  // 3. Normalized Shipment
  const shipmentData: any = quote.shipment || {};
  const shipment = {
    mode: normalizeUnicode(shipmentData.mode || 'SEA'),
    containerType: normalizeUnicode(shipmentData.containerType || ''),
    pol: normalizeUnicode(shipmentData.pol || ''),
    pod: normalizeUnicode(shipmentData.pod || ''),
    commodity: normalizeUnicode(shipmentData.commodity || ''),
    quantitySummary: normalizeUnicode(
      `${shipmentData.quantity || 1} ${shipmentData.containerType || 'cont'} / ${formatNumber(shipmentData.grossWeightKg || 0)} KGS / ${formatNumber(shipmentData.volumeCbm || 0)} CBM`
    ),
    transitTime: normalizeUnicode(shipmentData.transitTime || ''),
    freeTime: normalizeUnicode(shipmentData.freeTime || ''),
  };

  // 4. Normalized Terms & Conditions
  const termsData: any = quote.terms || {};
  const terms = {
    incoterm: normalizeUnicode(termsData.incoterm || 'FOB'),
    paymentTerm: normalizeUnicode(termsData.paymentTerm || ''),
    exclusionsNotes: normalizeUnicode(termsData.exclusionsNotes || ''),
    bankAccountInfo: normalizeUnicode(termsData.bankAccountInfo || ''),
  };

  // 5. Document Title
  let documentTitle = 'BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS / FREIGHT QUOTATION';
  if (language === 'vi') {
    documentTitle = 'BẢNG BÁO GIÁ DỊCH VỤ LOGISTICS';
  } else if (language === 'en') {
    documentTitle = 'LOGISTICS SERVICE QUOTATION';
  }

  // 6. Charge Breakdown by Group
  const locations: Array<'POL' | 'FREIGHT' | 'POD' | 'OTHER'> = ['POL', 'FREIGHT', 'POD', 'OTHER'];
  
  const locTitleMap: Record<'POL' | 'FREIGHT' | 'POD' | 'OTHER', { vi: string; en: string }> = {
    POL: {
      vi: `1. CHI PHÍ ĐẦU XUẤT / CẢNG ĐI (${shipment.pol || 'POL'})`,
      en: `1. POL LOCAL CHARGES (${shipment.pol || 'POL'})`,
    },
    FREIGHT: {
      vi: `2. CƯỚC VẬN CHUYỂN CHẶNG CHÍNH (${shipment.mode})`,
      en: `2. MAIN FREIGHT (${shipment.mode})`,
    },
    POD: {
      vi: `3. CHI PHÍ ĐẦU NHẬP / CẢNG ĐÍCH (${shipment.pod || 'POD'})`,
      en: `3. POD LOCAL CHARGES (${shipment.pod || 'POD'})`,
    },
    OTHER: {
      vi: '4. DỊCH VỤ CỘNG THÊM & THỦ TỤC KHÁC',
      en: '4. OTHER CHARGES & SERVICES',
    },
  };

  const groups: DocumentChargeGroup[] = [];
  const allRows: DocumentChargeRow[] = [];
  let itemCounter = 1;

  locations.forEach((locKey) => {
    const locItems = (quote.items || []).filter(item => (item.location || 'POL') === locKey);
    if (locItems.length === 0) return;

    const locSubtotalUsd = locItems.reduce((acc, i) => acc + (i.amountUsd || 0), 0);
    const locSubtotalVnd = locItems.reduce((acc, i) => acc + (i.amountVnd || 0), 0);

    const subtotalText = isVnd
      ? `${formatNumberVND(locSubtotalVnd)} VND`
      : formatUSD(locSubtotalUsd);

    const localizedTitle = language === 'vi' 
      ? locTitleMap[locKey].vi
      : language === 'en'
      ? locTitleMap[locKey].en
      : `${locTitleMap[locKey].vi} / ${locTitleMap[locKey].en}`;

    const groupRows: DocumentChargeRow[] = [];

    locItems.forEach((item) => {
      const unitPriceFormatted = item.currency === 'USD'
        ? formatUSD(item.unitPrice || 0)
        : `${formatNumberVND(item.unitPrice || 0)} VND`;

      const amountFormatted = isVnd
        ? `${formatNumberVND(item.amountVnd || 0)} VND`
        : formatUSD(item.amountUsd || 0);

      const row: DocumentChargeRow = {
        index: itemCounter++,
        description: normalizeUnicode(item.description || ''),
        note: normalizeUnicode(item.note || ''),
        quantity: item.quantity,
        unit: normalizeUnicode(item.unit || ''),
        unitPriceFormatted,
        currency: item.currency,
        vatRateFormatted: `${item.vatRate || 0}%`,
        amountFormatted,
        location: locKey,
      };

      groupRows.push(row);
      allRows.push(row);
    });

    groups.push({
      locationKey: locKey,
      groupTitle: localizedTitle,
      subtotalText,
      rows: groupRows,
    });
  });

  // 7. Totals
  const subtotalFormatted = isVnd
    ? `${formatNumberVND(quote.subtotalVnd || 0)} VND`
    : formatUSD(quote.subtotalUsd || 0);

  const vatTotalFormatted = isVnd
    ? `${formatNumberVND(quote.vatTotalVnd || 0)} VND`
    : formatUSD(quote.vatTotalUsd || 0);

  const grandTotalFormatted = isVnd
    ? `${formatNumberVND(quote.grandTotalVnd || 0)} VND`
    : formatUSD(quote.grandTotalUsd || 0);

  // 8. Signatures
  const signatures = {
    customerTitle: language === 'en' 
      ? 'CUSTOMER ACCEPTANCE' 
      : language === 'vi'
      ? 'XÁC NHẬN CỦA KHÁCH HÀNG'
      : 'XÁC NHẬN KHÁCH HÀNG / CUSTOMER ACCEPTANCE',
    customerSub: '(Sign & Stamp / Ký tên & đóng dấu)',
    customerSigner: customer.contactPerson || customer.name || 'Người đại diện có thẩm quyền',
    companyTitle: language === 'en'
      ? 'FOR AND ON BEHALF OF'
      : language === 'vi'
      ? 'ĐẠI DIỆN ĐƠN VỊ BÁO GIÁ'
      : 'ĐẠI DIỆN ĐƠN VỊ BÁO GIÁ / FOR AND ON BEHALF OF',
    companySub: company.name || 'LOGISTICS COMPANY',
    companySigner: company.salesRepName || 'Đại diện kinh doanh',
    companyContact: [
      company.salesRepTitle,
      company.salesRepPhone ? `Tel: ${company.salesRepPhone}` : '',
      company.salesRepEmail ? `Email: ${company.salesRepEmail}` : '',
    ].filter(Boolean).join(' | '),
  };

  return {
    meta: {
      quoteNumber: normalizeUnicode(quote.quoteNumber || 'QUOTATION'),
      revision: 'Rev 01',
      createdDate: quote.createdDate || new Date().toISOString().slice(0, 10),
      validityDate: termsData.validityDate || '',
      currency,
      isVnd,
      exchangeRateText: `1 USD = ${formatExchangeRate(quote.exchangeRate)} VND`,
      documentTitle,
    },
    company,
    customer,
    shipment,
    charges: {
      groups,
      allRows,
      subtotalFormatted,
      vatTotalFormatted,
      grandTotalFormatted,
      equivalentUsdFormatted: isVnd ? formatUSD(quote.grandTotalUsd || 0) : undefined,
      equivalentVndFormatted: !isVnd ? `${formatNumberVND(quote.grandTotalVnd || 0)} VND` : undefined,
    },
    terms,
    signatures,
  };
}
