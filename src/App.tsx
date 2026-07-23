import React, { useState, useEffect } from 'react';
import { QuoteData, CompanyProfile, LineItem, CustomerInfo, ShipmentDetails, TermsAndConditions, QuoteStatus, CustomerRecord, SurchargeItem } from './types/logistics';
import { DEFAULT_COMPANY_PROFILE, INITIAL_SAMPLE_QUOTE, DEFAULT_EXCHANGE_RATE } from './data/presets';
import { calculateQuoteTotals, generateQuoteNumber, calculateLineItem } from './utils/formatters';
import { 
  getSavedQuotes, saveQuote, deleteQuote, cloneQuote, updateQuoteStatus, 
  getCompanySettings, saveCompanySettings,
  getSavedCustomers, saveCustomerRecord, deleteCustomerRecord,
  getSavedSurcharges, saveSurchargeItem, deleteSurchargeItem
} from './utils/storage';
import { exportQuoteToPdf } from './utils/exportPdf';
import { exportQuoteToExcel } from './utils/exportExcel';

import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { CustomerForm } from './components/CustomerForm';
import { ShipmentForm } from './components/ShipmentForm';
import { LineItemsTable } from './components/LineItemsTable';
import { TermsForm } from './components/TermsForm';
import { SummaryCard } from './components/SummaryCard';

import { QuotePreviewModal } from './components/QuotePreviewModal';
import { SavedQuotesModal } from './components/SavedQuotesModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { CustomerManagerModal } from './components/CustomerManagerModal';
import { SurchargeCatalogModal } from './components/SurchargeCatalogModal';

import { Check, Ship, FileText, Settings, FileSpreadsheet, LayoutDashboard, Building2, Receipt } from 'lucide-react';

export default function App() {
  // Saved data states
  const [savedQuotes, setSavedQuotes] = useState<QuoteData[]>([]);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [quote, setQuote] = useState<QuoteData>(INITIAL_SAMPLE_QUOTE);
  
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [surcharges, setSurcharges] = useState<SurchargeItem[]>([]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal visibility states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isSurchargesOpen, setIsSurchargesOpen] = useState(false);

  useEffect(() => {
    const quotesList = getSavedQuotes();
    setSavedQuotes(quotesList);

    const companySettings = getCompanySettings();
    if (companySettings) {
      setCompany(companySettings);
    }

    setCustomers(getSavedCustomers());
    setSurcharges(getSavedSurcharges());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to re-compute totals and update active quote state
  const updateQuoteState = (partialQuote: Partial<QuoteData>) => {
    setQuote((prev) => {
      const merged = { ...prev, ...partialQuote };
      const totals = calculateQuoteTotals(merged.items, merged.exchangeRate);
      return {
        ...merged,
        ...totals,
        updatedDate: new Date().toISOString().slice(0, 10),
      };
    });
  };

  // Exchange Rate change handler
  const handleExchangeRateChange = (rate: number) => {
    const validRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;
    const recomputedItems = quote.items.map((item) => calculateLineItem(item, validRate));
    updateQuoteState({ exchangeRate: validRate, items: recomputedItems });
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

  // Customer Manager CRUD
  const handleSaveCustomer = (cust: CustomerRecord) => {
    const updated = saveCustomerRecord(cust);
    setCustomers(updated);
    showToast(`Đã lưu dữ liệu khách hàng [${cust.code}] thành công!`);
  };

  const handleDeleteCustomer = (id: string) => {
    const updated = deleteCustomerRecord(id);
    setCustomers(updated);
    showToast('Đã xóa thông tin khách hàng khỏi hệ thống!');
  };

  // Surcharge Catalog CRUD & Selection
  const handleSaveSurcharge = (item: SurchargeItem) => {
    const updated = saveSurchargeItem(item);
    setSurcharges(updated);
    showToast(`Đã lưu mã phụ phí [${item.code}] vào danh mục!`);
  };

  const handleDeleteSurcharge = (id: string) => {
    const updated = deleteSurchargeItem(id);
    setSurcharges(updated);
    showToast('Đã xóa mã phí khỏi danh mục master!');
  };

  const handleAddSurchargeToQuote = (surcharge: SurchargeItem) => {
    const unitPrice = surcharge.currency === 'USD' ? surcharge.priceUsd : surcharge.priceVnd;
    const rawItem: LineItem = {
      id: `item-${Date.now()}`,
      category: surcharge.category,
      code: surcharge.code,
      description: surcharge.name,
      quantity: 1,
      unit: surcharge.unit,
      unitPrice: unitPrice,
      currency: surcharge.currency,
      vatRate: surcharge.vatRate,
      amountUsd: 0,
      amountVnd: 0,
      note: surcharge.description || '',
    };
    const calculated = calculateLineItem(rawItem, quote.exchangeRate);
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

  // Company Settings Save
  const handleSaveCompanyProfile = (updatedCompany: CompanyProfile) => {
    setCompany(updatedCompany);
    saveCompanySettings(updatedCompany);
    updateQuoteState({ company: updatedCompany });
    showToast('Đã lưu cấu hình doanh nghiệp!');
  };

  // Create New Blank Quote
  const handleNewQuote = () => {
    const newRef = generateQuoteNumber();
    const freshQuote: QuoteData = {
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
          code: 'OCEAN_FREIGHT',
          description: 'Cước vận tải đường biển (Ocean Freight)',
          quantity: 1,
          unit: "Container 40'HC",
          unitPrice: 1800,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 1800,
          amountVnd: Math.round(1800 * quote.exchangeRate),
          note: 'Trực tiếp không qua trung chuyển',
        },
        {
          id: `item-${Date.now()}-2`,
          category: 'LOCAL_CHARGE',
          code: 'THC',
          description: 'Phí xếp dỡ tại cảng (Terminal Handling Charge)',
          quantity: 1,
          unit: 'Container',
          unitPrice: 140,
          currency: 'USD',
          vatRate: 8,
          amountUsd: 140,
          amountVnd: Math.round(140 * quote.exchangeRate),
          note: 'Cảng bốc hàng',
        },
      ],
      terms: {
        incoterm: 'FOB',
        validityDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        paymentTerm: 'Thanh toán 100% trước khi lấy D/O hoặc phát hành Surrendered B/L.',
        exclusionsNotes: '• Báo giá chưa bao gồm Thuế NK/VAT tại cảng đến.\n• Chưa bao gồm phí kiểm hóa hải quan luồng đỏ hoặc lưu kho bãi quá hạn free time.',
        bankAccountInfo: `${company.bankName}\nSố TK (VND): ${company.bankAccountNo}\nChủ TK: ${company.bankAccountHolder}`,
      },
      company: company,
      subtotalUsd: 1940,
      subtotalVnd: Math.round(1940 * quote.exchangeRate),
      vatTotalUsd: 11.2,
      vatTotalVnd: Math.round(11.2 * quote.exchangeRate),
      grandTotalUsd: 1951.2,
      grandTotalVnd: Math.round(1951.2 * quote.exchangeRate),
    };

    setQuote(freshQuote);
    showToast(`Đã tạo báo giá mới: ${newRef}`);
  };

  // Save Quote Handler
  const handleSaveQuoteAction = () => {
    const updatedList = saveQuote(quote);
    setSavedQuotes(updatedList);
    showToast(`Đã lưu báo giá ${quote.quoteNumber} thành công!`);
  };

  // Select Saved Quote
  const handleSelectQuote = (selected: QuoteData) => {
    setQuote(selected);
    showToast(`Đã tải báo giá ${selected.quoteNumber}`);
  };

  // Clone Saved Quote
  const handleCloneQuote = (id: string) => {
    const cloned = cloneQuote(id);
    if (cloned) {
      setSavedQuotes(getSavedQuotes());
      setQuote(cloned);
      showToast(`Đã nhân bản thành báo giá mới: ${cloned.quoteNumber}`);
    }
  };

  // Delete Saved Quote
  const handleDeleteQuote = (id: string) => {
    const updated = deleteQuote(id);
    setSavedQuotes(updated);
    showToast('Đã xóa báo giá khỏi danh sách!');
  };

  // Update Status
  const handleUpdateStatus = (id: string, status: QuoteStatus) => {
    const updated = updateQuoteStatus(id, status);
    setSavedQuotes(updated);
    if (quote.id === id) {
      setQuote({ ...quote, status });
    }
    showToast(`Đã cập nhật trạng thái báo giá thành ${status}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      
      <div className="flex flex-1">
        
        {/* Left Dark Sidebar Dock */}
        <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 items-center hidden sm:flex shrink-0">
          
          <div className="flex flex-col items-center gap-6">
            {/* Top Logo Action */}
            <button 
              onClick={handleNewQuote}
              className="w-10 h-10 bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center text-white font-bold transition-colors shadow-2xs"
              title="Tạo Báo Giá Mới"
            >
              <Ship className="w-5 h-5 text-white" />
            </button>

            {/* Navigation Icons */}
            <nav className="flex flex-col gap-3">
              <button 
                onClick={() => setIsSavedOpen(false)} 
                className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors"
                title="Bảng Báo Giá Hiện Tại"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsCustomersOpen(true)} 
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Quản Lý Data Khách Hàng (CRM)"
              >
                <Building2 className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsSurchargesOpen(true)} 
                className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors"
                title="Danh Mục Phụ Phí Master"
              >
                <Receipt className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsSavedOpen(true)} 
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors relative"
                title="Danh Sách Báo Giá Đã Lưu"
              >
                <FileText className="w-5 h-5" />
                {savedQuotes.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                )}
              </button>

              <button 
                onClick={() => setIsSheetsOpen(true)} 
                className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                title="Đồng Bộ Google Sheets"
              >
                <FileSpreadsheet className="w-5 h-5" />
              </button>
            </nav>
          </div>

          {/* Bottom Controls */}
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={() => setIsCompanyOpen(true)} 
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Cấu Hình Doanh Nghiệp"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs font-bold text-blue-200">
              LQ
            </div>
          </div>

        </aside>

        {/* Right Main Application Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Navbar */}
          <Navbar
            company={company}
            savedCount={savedQuotes.length}
            exchangeRate={quote.exchangeRate}
            onExchangeRateChange={handleExchangeRateChange}
            onNewQuote={handleNewQuote}
            onOpenSavedQuotes={() => setIsSavedOpen(true)}
            onOpenCompanyProfile={() => setIsCompanyOpen(true)}
            onOpenCustomers={() => setIsCustomersOpen(true)}
            onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
            onOpenGoogleSheets={() => setIsSheetsOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Toast Alert */}
            {toastMessage && (
              <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-500/80 flex items-center space-x-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Dashboard Stats Bar */}
            <DashboardStats quotes={savedQuotes} />

            {/* Core Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Input Forms */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Customer & Quote Meta */}
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

                {/* Shipment Route & Cargo Specs */}
                <ShipmentForm
                  shipment={quote.shipment}
                  onChangeShipment={handleChangeShipment}
                />

                {/* Line Items Table */}
                <LineItemsTable
                  items={quote.items}
                  exchangeRate={quote.exchangeRate}
                  onUpdateItems={handleUpdateItems}
                  onOpenSurchargeCatalog={() => setIsSurchargesOpen(true)}
                />

                {/* Terms & Conditions */}
                <TermsForm
                  terms={quote.terms}
                  onChangeTerms={handleChangeTerms}
                />

              </div>

              {/* Right Column: Sticky Live Totals & Action Card */}
              <div className="lg:col-span-1">
                <SummaryCard
                  quote={quote}
                  onExchangeRateChange={handleExchangeRateChange}
                  onSaveQuote={handleSaveQuoteAction}
                  onExportPdf={() => exportQuoteToPdf(quote)}
                  onExportExcel={() => exportQuoteToExcel(quote)}
                  onExportGoogleSheets={() => setIsSheetsOpen(true)}
                  onOpenPreview={() => setIsPreviewOpen(true)}
                />
              </div>

            </div>

          </main>

          {/* Technical Status Bar Footer */}
          <footer className="h-10 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[11px] uppercase tracking-wider font-mono border-t border-slate-800 shrink-0">
            <div className="flex items-center space-x-4">
              <span>Ex.Rate: 1 USD = {quote.exchangeRate.toLocaleString()} VND</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="hidden md:inline">LogiQuote Pro Engine</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                System Online
              </span>
              <span className="hidden sm:inline text-slate-700">|</span>
              <span className="hidden sm:inline">Forwarding Logistics Management</span>
            </div>
          </footer>

        </div>

      </div>

      {/* Modals */}
      <QuotePreviewModal
        quote={quote}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
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
        onClose={() => setIsCompanyOpen(false)}
        onSaveCompany={handleSaveCompanyProfile}
      />

      <GoogleSheetsModal
        quote={quote}
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
      />

    </div>
  );
}
