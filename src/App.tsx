import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QuoteData, 
  CompanyProfile, 
  LineItem, 
  CustomerInfo, 
  ShipmentDetails, 
  TermsAndConditions, 
  QuoteStatus, 
  CustomerRecord, 
  SurchargeItem,
  QuoteCurrency
} from './types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from './types/masterRate';
import { DEFAULT_COMPANY_PROFILE, INITIAL_SAMPLE_QUOTE, DEFAULT_EXCHANGE_RATE } from './data/presets';
import { generateQuoteNumber, calculateLineItem } from './utils/formatters';
import { calculateQuote } from './services/pricing';
import { 
  convertRateToLineItemSnapshot, 
  checkQuoteForRateUpdates, 
  applyLiveRateToLineItem 
} from './services/masterRate/rateSnapshot';
import { 
  saveQuoteToFirestore, 
  getQuotesFromFirestore, 
  deleteQuoteFromFirestore,
  saveCustomerToFirestore,
  getCustomersFromFirestore,
  deleteCustomerFromFirestore,
  saveSurchargeToFirestore,
  getSurchargesFromFirestore,
  deleteSurchargeFromFirestore,
  saveCompanyProfileToFirestore,
  getCompanyProfileFromFirestore,
  saveRateMasterToFirestore,
  getRateMastersFromFirestore,
  deleteRateMasterFromFirestore,
  saveChargeMasterToFirestore,
  getChargeMastersFromFirestore,
  deleteChargeMasterFromFirestore,
  getRateHistoriesFromFirestore
} from './services/firebase/firestoreService';
import { 
  getSavedQuotes, 
  getCompanySettings, 
  getSavedCustomers, 
  getSavedSurcharges, 
  getSavedRateMasters,
  getSavedChargeMasters,
  getSavedRateHistories,
  saveActiveQuoteDraft, 
  getActiveQuoteDraft, 
  cloneQuote, 
  updateQuoteStatus 
} from './utils/storage';
import { exportQuoteToPdf } from './utils/exportPdf';
import { exportQuoteToExcel } from './utils/exportExcel';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardStats } from './components/DashboardStats';
import { CustomerForm } from './components/CustomerForm';
import { ShipmentForm } from './components/ShipmentForm';
import { LineItemsTable } from './components/LineItemsTable';
import { TermsForm } from './components/TermsForm';
import { SummaryCard } from './components/SummaryCard';

import { QuotePreviewModal } from './components/QuotePreviewModal';
import { SavedQuotesModal } from './components/SavedQuotesModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { CustomerManagerModal } from './components/CustomerManagerModal';
import { SurchargeCatalogModal } from './components/SurchargeCatalogModal';
import { MasterRateHubModal } from './components/MasterRateHubModal';
import { RateSearchModal } from './components/RateSearchModal';
import { SmartRateAssistantModal } from './components/SmartRateAssistantModal';
import { RateComparisonModal } from './components/RateComparisonModal';
import { DataBackupModal } from './components/DataBackupModal';
import { GeneratePdfModal } from './components/GeneratePdfModal';
import { QuotationTemplateBuilderModal } from './components/QuotationTemplateBuilderModal';
import { DocumentHistoryModal } from './components/DocumentHistoryModal';

import { SendQuotationModal } from './components/communication/SendQuotationModal';
import { QuotationCommunicationPanel } from './components/communication/QuotationCommunicationPanel';
import { CustomerSecureQuotePage } from './components/communication/CustomerSecureQuotePage';
import { EmailTemplateManagementModal } from './components/communication/EmailTemplateManagementModal';
import { FollowUpModal } from './components/communication/FollowUpModal';
import { getDocumentRecordsForQuotation } from './services/quotation/quotationDocumentService';
import { QuotationDocumentRecord } from './types/quotationDocument';

import { Check, Ship, ShieldCheck } from 'lucide-react';

export default function App() {
  // Saved data states
  const [savedQuotes, setSavedQuotes] = useState<QuoteData[]>([]);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [quote, setQuote] = useState<QuoteData>(() => {
    const { calculatedQuote } = calculateQuote(INITIAL_SAMPLE_QUOTE);
    return calculatedQuote;
  });
  
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [surcharges, setSurcharges] = useState<SurchargeItem[]>([]);
  const [rates, setRates] = useState<RateMasterItem[]>([]);
  const [chargeMasters, setChargeMasters] = useState<ChargeMasterItem[]>([]);
  const [rateHistories, setRateHistories] = useState<RateHistoryItem[]>([]);

  // Auto-Save Draft States
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const quoteRef = useRef(quote);

  // Keep quoteRef in sync with latest quote state
  useEffect(() => {
    quoteRef.current = quote;
  }, [quote]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal visibility states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyModalTab, setCompanyModalTab] = useState<'profile' | 'sales' | 'bank' | 'preview'>('profile');
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isSurchargesOpen, setIsSurchargesOpen] = useState(false);
  const [isMasterRateHubOpen, setIsMasterRateHubOpen] = useState(false);
  const [masterRateHubTab, setMasterRateHubTab] = useState<'RATES' | 'CHARGES' | 'AUDIT'>('RATES');
  const [isRateSearchOpen, setIsRateSearchOpen] = useState(false);
  const [isSmartAssistantOpen, setIsSmartAssistantOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Phase 7: Professional PDF Quotation Engine & Template Builder Modals
  const [isGeneratePdfOpen, setIsGeneratePdfOpen] = useState(false);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isDocumentHistoryOpen, setIsDocumentHistoryOpen] = useState(false);

  // Phase 8: Quotation Communication, Email & Secure Sharing
  const [isSendQuotationOpen, setIsSendQuotationOpen] = useState(false);
  const [isEmailTemplatesOpen, setIsEmailTemplatesOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isCommunicationPanelOpen, setIsCommunicationPanelOpen] = useState(false);
  const [quotationDocuments, setQuotationDocuments] = useState<QuotationDocumentRecord[]>([]);
  const [viewingSecureToken, setViewingSecureToken] = useState<string | null>(null);

  // Listen for secure quote URLs like /q/:token or #q/:token
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/q/')) {
        const tok = path.replace('/q/', '').trim();
        if (tok) setViewingSecureToken(tok);
      } else if (hash.startsWith('#/q/') || hash.startsWith('#q/')) {
        const tok = hash.replace(/^#(?:|\/)q\//, '').trim();
        if (tok) setViewingSecureToken(tok);
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  // Load customer PDF documents for active quote
  const loadQuotationDocuments = async (qId: string) => {
    try {
      const docs = await getDocumentRecordsForQuotation(qId);
      setQuotationDocuments(docs);
    } catch (e) {
      console.warn('Error loading quote documents:', e);
    }
  };

  useEffect(() => {
    if (quote.id) {
      loadQuotationDocuments(quote.id);
    }
  }, [quote.id, quote.updatedDate]);

  // Approve Quote Handler
  const handleApproveCurrentQuote = async () => {
    await handleUpdateStatus(quote.id, 'APPROVED');
    showToast(`Đã phê duyệt báo giá ${quote.quoteNumber}! Bây giờ bạn có thể gửi cho khách hàng.`);
  };

  // Compute live diffs between quote snapshots and master rates database
  const outdatedRatesDiffs = useMemo(() => {
    return checkQuoteForRateUpdates(quote.items, rates);
  }, [quote.items, rates]);

  const handleOpenCompanyProfile = (tab: 'profile' | 'sales' | 'bank' | 'preview' = 'profile') => {
    setCompanyModalTab(tab);
    setIsCompanyOpen(true);
  };

  const handleOpenMasterRateHub = (tab: 'RATES' | 'CHARGES' | 'AUDIT' = 'RATES') => {
    setMasterRateHubTab(tab);
    setIsMasterRateHubOpen(true);
  };

  // Mount Effect: Restore saved lists & active draft with Firestore Sync
  useEffect(() => {
    // 1. Initial Local Cache Load
    setSavedQuotes(getSavedQuotes());
    const companySettings = getCompanySettings();
    if (companySettings) setCompany(companySettings);
    setCustomers(getSavedCustomers());
    setSurcharges(getSavedSurcharges());
    setRates(getSavedRateMasters());
    setChargeMasters(getSavedChargeMasters());
    setRateHistories(getSavedRateHistories());

    // Restore active quote draft from local draft if available
    const activeDraft = getActiveQuoteDraft();
    if (activeDraft.quote) {
      const { calculatedQuote } = calculateQuote(activeDraft.quote);
      setQuote(calculatedQuote);
      if (activeDraft.savedAt) {
        setLastAutoSaveTime(activeDraft.savedAt);
      }
    }

    // 2. Async Sync with Firebase Firestore
    async function syncFirestoreData() {
      try {
        const [
          cloudQuotes, 
          cloudCustomers, 
          cloudSurcharges, 
          cloudCompany,
          cloudRates,
          cloudChargeMasters,
          cloudHistories
        ] = await Promise.all([
          getQuotesFromFirestore(),
          getCustomersFromFirestore(),
          getSurchargesFromFirestore(),
          getCompanyProfileFromFirestore(),
          getRateMastersFromFirestore(),
          getChargeMastersFromFirestore(),
          getRateHistoriesFromFirestore(),
        ]);

        if (cloudQuotes && cloudQuotes.length > 0) setSavedQuotes(cloudQuotes);
        if (cloudCustomers && cloudCustomers.length > 0) setCustomers(cloudCustomers);
        if (cloudSurcharges && cloudSurcharges.length > 0) setSurcharges(cloudSurcharges);
        if (cloudCompany) {
          setCompany(cloudCompany);
        }
        if (cloudRates && cloudRates.length > 0) setRates(cloudRates);
        if (cloudChargeMasters && cloudChargeMasters.length > 0) setChargeMasters(cloudChargeMasters);
        if (cloudHistories && cloudHistories.length > 0) setRateHistories(cloudHistories);
      } catch (err) {
        console.warn('Firestore initial background sync notice:', err);
      }
    }

    syncFirestoreData();
  }, []);

  // 30-Second Auto-Save Interval Effect
  useEffect(() => {
    const initialTime = saveActiveQuoteDraft(quoteRef.current);
    if (initialTime) setLastAutoSaveTime(initialTime);

    const autoSaveTimer = setInterval(() => {
      setIsAutoSaving(true);
      const savedTime = saveActiveQuoteDraft(quoteRef.current);
      if (savedTime) {
        setLastAutoSaveTime(savedTime);
      }
      setTimeout(() => setIsAutoSaving(false), 600);
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to re-compute totals through the Logistics Pricing Engine
  const updateQuoteState = (partialQuote: Partial<QuoteData>) => {
    setQuote((prev) => {
      const merged = { 
        ...prev, 
        ...partialQuote,
        updatedDate: new Date().toISOString().slice(0, 10),
      };
      const { calculatedQuote } = calculateQuote(merged);
      return calculatedQuote;
    });
  };

  // Exchange Rate change handler
  const handleExchangeRateChange = (rate: number) => {
    const validRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;
    updateQuoteState({ exchangeRate: validRate });
    showToast(`Đã cập nhật tỷ giá: 1 USD = ${validRate.toLocaleString('vi-VN')} VND`);
  };

  // Customer Form Changes
  const handleChangeCustomer = (field: keyof CustomerInfo, val: string) => {
    updateQuoteState({
      customer: { ...quote.customer, [field]: val },
    });
  };

  // Select Customer from Manager to Auto-fill Quote
  const handleSelectCustomerForQuote = (cust: CustomerRecord) => {
    updateQuoteState({
      customer: {
        companyName: cust.companyName,
        customerName: cust.customerName,
        taxId: cust.taxId,
        address: cust.address,
        email: cust.email,
        phone: cust.phone,
        contactPerson: cust.contactPerson || cust.customerName,
      }
    });
    showToast(`Đã chọn áp dụng khách hàng [${cust.code}] ${cust.companyName}`);
  };

  // Customer Manager CRUD with Firestore
  const handleSaveCustomer = async (cust: CustomerRecord) => {
    await saveCustomerToFirestore(cust);
    const updated = await getCustomersFromFirestore();
    setCustomers(updated);
    showToast(`Đã lưu dữ liệu khách hàng [${cust.code}] thành công!`);
  };

  const handleDeleteCustomer = async (id: string) => {
    await deleteCustomerFromFirestore(id);
    const updated = await getCustomersFromFirestore();
    setCustomers(updated);
    showToast('Đã xóa thông tin khách hàng khỏi hệ thống!');
  };

  // Surcharge Catalog CRUD with Firestore
  const handleSaveSurcharge = async (item: SurchargeItem) => {
    await saveSurchargeToFirestore(item);
    const updated = await getSurchargesFromFirestore();
    setSurcharges(updated);
    showToast(`Đã lưu mã phụ phí [${item.code}] vào danh mục!`);
  };

  const handleDeleteSurcharge = async (id: string) => {
    await deleteSurchargeFromFirestore(id);
    const updated = await getSurchargesFromFirestore();
    setSurcharges(updated);
    showToast('Đã xóa mã phí khỏi danh mục master!');
  };

  // Master Rate CRUD with Firestore & Audit Logging
  const handleSaveRate = async (rate: RateMasterItem) => {
    await saveRateMasterToFirestore(rate, company.salesRepName || 'Admin');
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast(`Đã lưu bảng giá [${rate.rateCode}] vào Master Rate Database!`);
  };

  const handleDeleteRate = async (id: string, softDelete: boolean = true) => {
    await deleteRateMasterFromFirestore(id, softDelete);
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast('Đã cập nhật trạng thái bảng giá!');
  };

  // Charge Master CRUD with Firestore
  const handleSaveCharge = async (charge: ChargeMasterItem) => {
    await saveChargeMasterToFirestore(charge);
    const updated = await getChargeMastersFromFirestore();
    setChargeMasters(updated);
    showToast(`Đã lưu phí chuẩn [${charge.chargeCode}] vào Charge Master!`);
  };

  const handleDeleteCharge = async (id: string) => {
    await deleteChargeMasterFromFirestore(id);
    const updated = await getChargeMastersFromFirestore();
    setChargeMasters(updated);
    showToast('Đã ngừng áp dụng mã phí chuẩn!');
  };

  // Bulk Import Master Rates
  const handleBulkImportRates = async (importedRates: RateMasterItem[]) => {
    for (const r of importedRates) {
      await saveRateMasterToFirestore(r, company.salesRepName || 'Bulk Import');
    }
    const [updatedRates, updatedHistories] = await Promise.all([
      getRateMastersFromFirestore(),
      getRateHistoriesFromFirestore()
    ]);
    setRates(updatedRates);
    setRateHistories(updatedHistories);
    showToast(`Đã nhập thành công ${importedRates.length} bảng giá vào hệ thống!`);
  };

  // Apply Master Rate to Current Quote as an Immutable Snapshot
  const handleSelectRateForQuote = (selectedRate: RateMasterItem) => {
    const snapshotLineItem = convertRateToLineItemSnapshot(
      selectedRate,
      quote.shipment,
      quote.exchangeRate
    );
    handleUpdateItems([...quote.items, snapshotLineItem]);
    showToast(`Đã áp dụng bảng giá [${selectedRate.rateCode}] (Snapshot v${selectedRate.version}) vào báo giá!`);
  };

  // Bulk Apply Rates from Smart Assistant
  const handleAddSmartRates = (selectedRates: RateMasterItem[]) => {
    const newItems = selectedRates.map(r => 
      convertRateToLineItemSnapshot(r, quote.shipment, quote.exchangeRate)
    );
    handleUpdateItems([...quote.items, ...newItems]);
    showToast(`Đã thêm thành công ${newItems.length} bảng giá vào báo giá!`);
  };

  // Confirm Rate Updates from Rate Comparison Modal
  const handleConfirmRateUpdates = (selectedLineItemIds: string[]) => {
    const ratesMap = new Map<string, RateMasterItem>();
    rates.forEach(r => ratesMap.set(r.id, r));

    const updated = quote.items.map(item => {
      if (selectedLineItemIds.includes(item.id) && item.rateId && ratesMap.has(item.rateId)) {
        return applyLiveRateToLineItem(item, ratesMap.get(item.rateId)!, quote.shipment, quote.exchangeRate);
      }
      return item;
    });

    handleUpdateItems(updated);
    showToast(`Đã cập nhật ${selectedLineItemIds.length} mục theo Master Rate mới nhất!`);
  };

  const handleAddSurchargeToQuote = (surcharge: SurchargeItem) => {
    const unitPrice = surcharge.currency === 'USD' ? surcharge.priceUsd : surcharge.priceVnd;
    const costPrice = Math.round(unitPrice * 0.8 * 100) / 100;
    
    const rawItem: LineItem = {
      id: `item-${Date.now()}`,
      category: surcharge.category,
      location: surcharge.location || 'POL',
      code: surcharge.code,
      description: surcharge.name,
      basis: 'PER_CONTAINER',
      quantity: 1,
      unit: surcharge.unit,
      unitPrice: unitPrice,
      costPrice: costPrice,
      currency: surcharge.currency,
      vatRate: surcharge.vatRate,
      amountUsd: 0,
      amountVnd: 0,
      note: '',
    };
    const calculated = calculateLineItem(rawItem, quote.exchangeRate, quote.shipment);
    handleUpdateItems([...quote.items, calculated]);
    showToast(`Đã thêm phụ phí [${surcharge.code}] vào báo giá hiện tại!`);
  };

  // Quote Metadata Changes
  const handleChangeQuoteMeta = (field: 'quoteNumber' | 'createdDate' | 'validityDate' | 'status', val: string) => {
    if (field === 'validityDate') {
      updateQuoteState({
        terms: { ...quote.terms, validityDate: val },
      });
    } else if (field === 'status') {
      updateQuoteState({ status: val as QuoteStatus });
    } else {
      updateQuoteState({ [field]: val });
    }
  };

  // Shipment Details Changes
  const handleChangeShipment = (updatedShipment: Partial<ShipmentDetails>) => {
    updateQuoteState({
      shipment: { ...quote.shipment, ...updatedShipment },
    });
  };

  // Line Items Changes
  const handleUpdateItems = (newItems: LineItem[]) => {
    updateQuoteState({ items: newItems });
  };

  // Terms Changes
  const handleChangeTerms = (updatedTerms: Partial<TermsAndConditions>) => {
    updateQuoteState({
      terms: { ...quote.terms, ...updatedTerms },
    });
  };

  // Currency Changes for Quote
  const handleQuoteCurrencyChange = (currency: QuoteCurrency) => {
    updateQuoteState({
      quoteCurrency: currency,
      terms: {
        ...quote.terms,
        currency,
      },
    });
    showToast(`Đã chọn hiển thị báo giá bằng tiền ${currency === 'VND' ? 'VNĐ' : 'USD'}`);
  };

  // Company Settings Save with Firestore
  const handleSaveCompanyProfile = async (updatedCompany: CompanyProfile) => {
    setCompany(updatedCompany);
    await saveCompanyProfileToFirestore(updatedCompany);
    const bankStr = `${updatedCompany.bankName}\nSố TK: ${updatedCompany.bankAccountNo}\nChủ TK: ${updatedCompany.bankAccountHolder}${updatedCompany.bankSwiftCode ? `\nSWIFT Code: ${updatedCompany.bankSwiftCode}` : ''}`;
    updateQuoteState({
      company: updatedCompany,
      terms: {
        ...quote.terms,
        bankAccountInfo: bankStr,
      },
    });
    showToast('Đã lưu thông tin doanh nghiệp & đồng bộ vào báo giá!');
  };

  // Import Backup Data Handler
  const handleDataImported = (data: {
    quotes: QuoteData[];
    companySettings?: CompanyProfile;
    customers: CustomerRecord[];
    surcharges: SurchargeItem[];
  }) => {
    setSavedQuotes(data.quotes);
    if (data.companySettings) {
      setCompany(data.companySettings);
      updateQuoteState({ company: data.companySettings });
    }
    setCustomers(data.customers);
    setSurcharges(data.surcharges);
    showToast('Đã đồng bộ & khôi phục toàn bộ dữ liệu thành công!');
  };

  // Create New Blank Quote
  const handleNewQuote = () => {
    const newRef = generateQuoteNumber();
    const rawFreshQuote: Partial<QuoteData> = {
      id: `quote-${Date.now()}`,
      quoteNumber: newRef,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      exchangeRate: quote.exchangeRate || DEFAULT_EXCHANGE_RATE,
      customer: {
        customerName: '',
        companyName: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        contactPerson: '',
      },
      shipment: {
        mode: 'SEA_FCL',
        pol: 'Cat Lai Port, Ho Chi Minh, Vietnam (VN)',
        pod: 'Los Angeles / Long Beach Port, CA, USA',
        commodity: 'General Cargo',
        containerType: "40'HC",
        quantity: 1,
        grossWeightKg: 15000,
        volumeCbm: 40,
        chargeableWeight: 40,
        transitTime: '14-16 ngày',
        freeTime: '7 days Dem/Det',
      },
      items: [
        {
          id: `item-${Date.now()}-1`,
          category: 'FREIGHT',
          location: 'FREIGHT',
          code: 'OCEAN_FREIGHT',
          description: 'Cước vận tải đường biển (Ocean Freight)',
          basis: 'PER_CONTAINER',
          quantity: 1,
          unit: "Container 40'HC",
          unitPrice: 1800,
          costPrice: 1450,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Direct service / Tuyến trực tiếp',
        },
        {
          id: `item-${Date.now()}-2`,
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'THC',
          description: 'Phí xếp dỡ tại cảng (Terminal Handling Charge)',
          basis: 'PER_CONTAINER',
          quantity: 1,
          unit: 'Container',
          unitPrice: 140,
          costPrice: 110,
          currency: 'USD',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Cảng bốc hàng (POL)',
        },
        {
          id: `item-${Date.now()}-3`,
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'BL_FEE',
          description: 'Phí phát hành vận đơn (Bill of Lading Fee)',
          basis: 'PER_BL',
          quantity: 1,
          unit: 'Bill',
          unitPrice: 1000000,
          costPrice: 750000,
          currency: 'VND',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
          note: 'Vận đơn đường biển gốc',
        }
      ],
      terms: {
        incoterm: 'FOB',
        validityDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        paymentTerm: 'Thanh toán 100% trước khi lấy D/O hoặc phát hành Surrendered B/L.',
        exclusionsNotes: '• Báo giá chưa bao gồm Thuế NK/VAT tại cảng đến.\n• Chưa bao gồm phí kiểm hóa hải quan luồng đỏ hoặc lưu kho bãi quá hạn free time.',
        bankAccountInfo: `${company.bankName}\nSố TK (VND): ${company.bankAccountNo}\nChủ TK: ${company.bankAccountHolder}`,
      },
      company: company,
    };

    const { calculatedQuote } = calculateQuote(rawFreshQuote);
    setQuote(calculatedQuote);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    showToast(`Đã tạo báo giá mới: ${newRef}`);
  };

  // Save Quote Handler with Firestore Sync
  const handleSaveQuoteAction = async () => {
    const { calculatedQuote } = calculateQuote(quote);
    setQuote(calculatedQuote);
    await saveQuoteToFirestore(calculatedQuote);
    const updated = await getQuotesFromFirestore();
    setSavedQuotes(updated);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    showToast(`Đã lưu báo giá ${calculatedQuote.quoteNumber} thành công!`);
  };

  // Select Saved Quote
  const handleSelectQuote = (selected: QuoteData) => {
    const { calculatedQuote } = calculateQuote(selected);
    setQuote(calculatedQuote);
    const savedTime = saveActiveQuoteDraft(calculatedQuote);
    if (savedTime) setLastAutoSaveTime(savedTime);
    showToast(`Đã tải báo giá ${selected.quoteNumber}`);
  };

  // Clone Saved Quote
  const handleCloneQuote = async (id: string) => {
    const cloned = cloneQuote(id);
    if (cloned) {
      const { calculatedQuote } = calculateQuote(cloned);
      await saveQuoteToFirestore(calculatedQuote);
      const updated = await getQuotesFromFirestore();
      setSavedQuotes(updated);
      setQuote(calculatedQuote);
      const savedTime = saveActiveQuoteDraft(calculatedQuote);
      if (savedTime) setLastAutoSaveTime(savedTime);
      showToast(`Đã nhân bản thành báo giá mới: ${calculatedQuote.quoteNumber}`);
    }
  };

  // Delete Saved Quote with Firestore
  const handleDeleteQuote = async (id: string) => {
    await deleteQuoteFromFirestore(id);
    const updated = await getQuotesFromFirestore();
    setSavedQuotes(updated);
    showToast('Đã xóa báo giá khỏi danh sách!');
  };

  // Update Status with Firestore
  const handleUpdateStatus = async (id: string, status: QuoteStatus) => {
    updateQuoteStatus(id, status);
    const target = savedQuotes.find(q => q.id === id);
    if (target) {
      const updatedQuote = { ...target, status };
      await saveQuoteToFirestore(updatedQuote);
    }
    const updatedList = await getQuotesFromFirestore();
    setSavedQuotes(updatedList);
    if (quote.id === id) {
      setQuote(prev => ({ ...prev, status }));
    }
    showToast(`Đã cập nhật trạng thái báo giá thành ${status}`);
  };

  // If viewing a public customer secure quote link, render the dedicated portal view
  if (viewingSecureToken) {
    return (
      <CustomerSecureQuotePage
        token={viewingSecureToken}
        onBackToApp={() => {
          setViewingSecureToken(null);
          if (window.location.hash.includes('q/')) {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      
      <div className="flex flex-1">
        
        {/* Left Sidebar containing Directory Folders and Navigation */}
        <Sidebar
          company={quote.company || company}
          savedQuotes={savedQuotes}
          customersCount={customers.length}
          surchargesCount={surcharges.length}
          rateMastersCount={rates.length}
          chargeMastersCount={chargeMasters.length}
          exchangeRate={quote.exchangeRate}
          lastAutoSaveTime={lastAutoSaveTime}
          isAutoSaving={isAutoSaving}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNewQuote={handleNewQuote}
          onOpenSavedQuotes={() => setIsSavedOpen(true)}
          onOpenCompanyProfile={handleOpenCompanyProfile}
          onOpenCustomers={() => setIsCustomersOpen(true)}
          onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
          onOpenMasterRateHub={handleOpenMasterRateHub}
          onOpenRateSearch={() => setIsRateSearchOpen(true)}
          onOpenSmartAssistant={() => setIsSmartAssistantOpen(true)}
          onOpenDataBackup={() => setIsDataBackupOpen(true)}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onOpenDocumentHistory={() => setIsDocumentHistoryOpen(true)}
          onOpenTemplateBuilder={() => setIsTemplateBuilderOpen(true)}
          onOpenGeneratePdf={() => setIsGeneratePdfOpen(true)}
          onOpenSendModal={() => setIsSendQuotationOpen(true)}
          onOpenCommunication={() => setIsCommunicationPanelOpen(true)}
          onOpenEmailTemplates={() => setIsEmailTemplatesOpen(true)}
          onOpenFollowUps={() => setIsFollowUpOpen(true)}
        />

        {/* Right Main Application Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Navbar */}
          <Navbar
            company={company}
            exchangeRate={quote.exchangeRate}
            lastAutoSaveTime={lastAutoSaveTime}
            isAutoSaving={isAutoSaving}
            onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onExchangeRateChange={handleExchangeRateChange}
            onNewQuote={handleNewQuote}
          />

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Toast Alert */}
            {toastMessage && (
              <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-500/80 flex items-center space-x-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Dashboard Stats Bar */}
            <DashboardStats quotes={savedQuotes} />

            {/* Top Section: Customer Info & Shipment Route Forms Side-by-Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CustomerForm
                customer={quote.customer}
                quoteNumber={quote.quoteNumber}
                createdDate={quote.createdDate}
                validityDate={quote.terms.validityDate}
                status={quote.status}
                salesRepName={company.salesRepName}
                onChangeCustomer={handleChangeCustomer}
                onChangeQuoteMeta={handleChangeQuoteMeta}
                onOpenCustomerManager={() => setIsCustomersOpen(true)}
              />

              <ShipmentForm
                shipment={quote.shipment}
                onChangeShipment={handleChangeShipment}
              />
            </div>

            {/* Full-Width Section: Line Items Table (Pricing Engine Integration) */}
            <div className="w-full">
              <LineItemsTable
                items={quote.items}
                exchangeRate={quote.exchangeRate}
                onUpdateItems={handleUpdateItems}
                onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
                onOpenRateSearch={() => setIsRateSearchOpen(true)}
                onOpenSmartAssistant={() => setIsSmartAssistantOpen(true)}
                onCheckRateUpdates={() => setIsComparisonModalOpen(true)}
                outdatedRatesCount={outdatedRatesDiffs.length}
              />
            </div>

            {/* Summary Card - Positioned directly below Line Items Table */}
            <SummaryCard
              quote={quote}
              onExchangeRateChange={handleExchangeRateChange}
              onCurrencyChange={handleQuoteCurrencyChange}
              onSaveQuote={handleSaveQuoteAction}
              onExportPdf={(curr) => exportQuoteToPdf(quote, curr)}
              onExportExcel={(curr) => exportQuoteToExcel(quote, curr)}
              onOpenPreview={() => setIsPreviewOpen(true)}
              onOpenGeneratePdf={() => setIsGeneratePdfOpen(true)}
              onOpenSendModal={() => setIsSendQuotationOpen(true)}
            />

            {/* Phase 8: Quotation Communication, Dispatch History & Timeline Panel */}
            <div id="quotation-communication-section" className="w-full">
              <QuotationCommunicationPanel
                quote={quote}
                documents={quotationDocuments}
                onOpenSendModal={() => setIsSendQuotationOpen(true)}
                onOpenFollowUpModal={() => setIsFollowUpOpen(true)}
                onOpenSecureLinkPreview={(token) => setViewingSecureToken(token)}
                onRefreshQuote={() => handleSelectQuote(quote)}
              />
            </div>

            {/* Terms & Conditions */}
            <TermsForm
              terms={quote.terms}
              quoteCurrency={quote.quoteCurrency}
              onChangeTerms={handleChangeTerms}
              onChangeCurrency={handleQuoteCurrencyChange}
            />

          </main>

          {/* Technical Status Bar Footer */}
          <footer className="h-10 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[11px] uppercase tracking-wider font-mono border-t border-slate-800 shrink-0">
            <div className="flex items-center space-x-4">
              <span>Ex.Rate: 1 USD = {quote.exchangeRate.toLocaleString()} VND</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="text-amber-300 font-semibold">Đồng tiền file: {quote.quoteCurrency || 'USD'}</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="hidden md:inline text-cyan-400">Pricing Engine Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Synced
              </span>
              <span className="hidden sm:inline text-slate-700">|</span>
              <span className="hidden sm:inline">Logistics Freight Management</span>
            </div>
          </footer>

        </div>

      </div>

      {/* Modals */}
      <QuotePreviewModal
        quote={quote}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onCurrencyChange={handleQuoteCurrencyChange}
      />

      <CustomerManagerModal
        isOpen={isCustomersOpen}
        onClose={() => setIsCustomersOpen(false)}
        customers={customers}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onSelectCustomerForQuote={handleSelectCustomerForQuote}
      />

      <SurchargeCatalogModal
        isOpen={isSurchargesOpen}
        onClose={() => setIsSurchargesOpen(false)}
        surcharges={surcharges}
        exchangeRate={quote.exchangeRate}
        onSaveSurcharge={handleSaveSurcharge}
        onDeleteSurcharge={handleDeleteSurcharge}
        onAddSurchargeToQuote={handleAddSurchargeToQuote}
      />

      <MasterRateHubModal
        isOpen={isMasterRateHubOpen}
        onClose={() => setIsMasterRateHubOpen(false)}
        initialTab={masterRateHubTab}
        rates={rates}
        charges={chargeMasters}
        histories={rateHistories}
        exchangeRate={quote.exchangeRate}
        currentUser={company.salesRepName || 'Pricing Manager'}
        onSaveRate={handleSaveRate}
        onDeleteRate={handleDeleteRate}
        onSaveCharge={handleSaveCharge}
        onDeleteCharge={handleDeleteCharge}
        onBulkImportRates={handleBulkImportRates}
        onSelectRateForQuote={handleSelectRateForQuote}
      />

      <RateSearchModal
        isOpen={isRateSearchOpen}
        onClose={() => setIsRateSearchOpen(false)}
        rates={rates}
        exchangeRate={quote.exchangeRate}
        shipment={quote.shipment}
        onSelectRate={(selectedRate) => {
          handleSelectRateForQuote(selectedRate);
          setIsRateSearchOpen(false);
        }}
      />

      <SmartRateAssistantModal
        isOpen={isSmartAssistantOpen}
        onClose={() => setIsSmartAssistantOpen(false)}
        shipment={quote.shipment}
        customer={quote.customer}
        rates={rates}
        exchangeRate={quote.exchangeRate}
        existingItemRateIds={quote.items.map(i => i.rateId).filter(Boolean) as string[]}
        onAddSelectedRates={handleAddSmartRates}
        onAddSingleRate={handleSelectRateForQuote}
        onOpenManualAdd={() => {
          setIsSmartAssistantOpen(false);
        }}
      />

      <RateComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        diffs={outdatedRatesDiffs}
        onConfirmUpdate={handleConfirmRateUpdates}
      />

      <SavedQuotesModal
        quotes={savedQuotes}
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        onSelectQuote={handleSelectQuote}
        onCloneQuote={handleCloneQuote}
        onDeleteQuote={handleDeleteQuote}
        onUpdateStatus={handleUpdateStatus}
      />

      <CompanyProfileModal
        company={company}
        isOpen={isCompanyOpen}
        initialTab={companyModalTab}
        onClose={() => setIsCompanyOpen(false)}
        onSaveCompany={handleSaveCompanyProfile}
      />

      <DataBackupModal
        isOpen={isDataBackupOpen}
        onClose={() => setIsDataBackupOpen(false)}
        onDataImported={handleDataImported}
        savedQuotesCount={savedQuotes.length}
        customersCount={customers.length}
        surchargesCount={surcharges.length}
      />

      {/* Phase 7: Professional Quotation PDF Engine Modals */}
      <GeneratePdfModal
        isOpen={isGeneratePdfOpen}
        onClose={() => setIsGeneratePdfOpen(false)}
        quote={quote}
        onOpenTemplateBuilder={() => setIsTemplateBuilderOpen(true)}
        onDocumentGenerated={(rec) => {
          showToast(`Đã phát hành file PDF ${rec.fileName} (Rev ${rec.revision}) thành công!`);
        }}
      />

      <QuotationTemplateBuilderModal
        isOpen={isTemplateBuilderOpen}
        onClose={() => setIsTemplateBuilderOpen(false)}
        sampleQuote={quote}
        onTemplatesUpdated={() => {
          showToast('Đã cập nhật hệ thống mẫu báo giá!');
        }}
      />

      <DocumentHistoryModal
        isOpen={isDocumentHistoryOpen}
        onClose={() => setIsDocumentHistoryOpen(false)}
        quotationId={quote.id}
        quotationNumber={quote.quoteNumber}
      />

      {/* Phase 8: Quotation Communication & Secure Dispatch Modals */}
      <SendQuotationModal
        isOpen={isSendQuotationOpen}
        onClose={() => setIsSendQuotationOpen(false)}
        quote={quote}
        documents={quotationDocuments}
        onApproveQuote={handleApproveCurrentQuote}
        onOpenTemplateManager={() => {
          setIsSendQuotationOpen(false);
          setIsEmailTemplatesOpen(true);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadQuotationDocuments(quote.id);
          handleUpdateStatus(quote.id, 'SENT');
        }}
      />

      <EmailTemplateManagementModal
        isOpen={isEmailTemplatesOpen}
        onClose={() => setIsEmailTemplatesOpen(false)}
      />

      <FollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        quote={quote}
        onSuccess={() => {
          showToast('Đã lưu nhiệm vụ chăm sóc khách hàng thành công!');
        }}
      />

    </div>
  );
}
