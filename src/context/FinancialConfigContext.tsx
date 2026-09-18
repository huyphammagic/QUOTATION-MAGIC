/**
 * Phase 38: Financial & Commercial Configuration React Context Provider
 * Bridges Firestore Multi-Company Financial Data with the UI & Quotation Flow.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CompanyFinancialSettings,
  CompanyTaxConfiguration,
  CompanyPaymentTerm,
  CompanyBankAccount,
  CompanyCommercialSettings,
  SaveOperationStatus
} from '../types/financialConfig';
import {
  getCompanyFinancialSettings,
  saveCompanyFinancialSettings,
  getCompanyTaxConfiguration,
  saveCompanyTaxConfiguration,
  getCompanyPaymentTerms,
  saveCompanyPaymentTerm,
  deleteCompanyPaymentTerm,
  getCompanyBankAccounts,
  saveCompanyBankAccount,
  deleteCompanyBankAccount,
  getCompanyCommercialSettings,
  saveCompanyCommercialSettings,
  createQuotationFinancialSnapshots,
  invalidateCompanyFinancialCache,
  createDefaultFinancialSettings,
  createDefaultTaxConfiguration,
  createDefaultPaymentTerms,
  createDefaultCommercialSettings
} from '../services/repository/financialConfigRepository';
import { useMultiCompany } from './MultiCompanyContext';
import { QuoteData } from '../types/logistics';

interface FinancialConfigContextType {
  activeCompanyId: string;
  isLoading: boolean;
  saveStatus: SaveOperationStatus;
  statusMessage: string | null;

  // Domain Config Objects
  financialSettings: CompanyFinancialSettings;
  taxConfig: CompanyTaxConfiguration;
  paymentTerms: CompanyPaymentTerm[];
  defaultPaymentTerm: CompanyPaymentTerm | null;
  bankAccounts: CompanyBankAccount[];
  defaultUsdBank: CompanyBankAccount | null;
  defaultVndBank: CompanyBankAccount | null;
  commercialSettings: CompanyCommercialSettings;

  // Mutations
  updateFinancialSettings: (partial: Partial<CompanyFinancialSettings>) => Promise<boolean>;
  updateTaxConfig: (partial: Partial<CompanyTaxConfiguration>) => Promise<boolean>;
  savePaymentTermAction: (term: Partial<CompanyPaymentTerm>) => Promise<boolean>;
  deletePaymentTermAction: (termId: string) => Promise<boolean>;
  saveBankAccountAction: (bank: Partial<CompanyBankAccount>) => Promise<boolean>;
  deleteBankAccountAction: (bankId: string) => Promise<boolean>;
  updateCommercialSettings: (partial: Partial<CompanyCommercialSettings>) => Promise<boolean>;

  // Snapshot Engine
  createSnapshotsForQuote: (quote: QuoteData) => Promise<Partial<QuoteData>>;
  refreshAllFinancialData: () => Promise<void>;
}

const FinancialConfigContext = createContext<FinancialConfigContextType | undefined>(undefined);

export const FinancialConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useMultiCompany();

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveOperationStatus>('SAVED');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [financialSettings, setFinancialSettings] = useState<CompanyFinancialSettings>(() => 
    createDefaultFinancialSettings(activeCompanyId || 'company_profile')
  );
  const [taxConfig, setTaxConfig] = useState<CompanyTaxConfiguration>(() => 
    createDefaultTaxConfiguration(activeCompanyId || 'company_profile')
  );
  const [paymentTerms, setPaymentTerms] = useState<CompanyPaymentTerm[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [commercialSettings, setCommercialSettings] = useState<CompanyCommercialSettings>(() => 
    createDefaultCommercialSettings(activeCompanyId || 'company_profile')
  );

  // Load all configuration for the active company
  const loadAllData = useCallback(async (targetCompanyId: string, force = false) => {
    if (!targetCompanyId) return;
    setIsLoading(true);
    try {
      const [fSet, tCfg, pTerms, bAccs, cSet] = await Promise.all([
        getCompanyFinancialSettings(targetCompanyId, force),
        getCompanyTaxConfiguration(targetCompanyId, force),
        getCompanyPaymentTerms(targetCompanyId, force),
        getCompanyBankAccounts(targetCompanyId, force),
        getCompanyCommercialSettings(targetCompanyId, force)
      ]);

      setFinancialSettings(fSet);
      setTaxConfig(tCfg);
      setPaymentTerms(pTerms);
      setBankAccounts(bAccs);
      setCommercialSettings(cSet);
      setSaveStatus('SAVED');
    } catch (err: any) {
      console.warn('[FinancialConfigContext] Error loading company financial configuration:', err);
      setStatusMessage('Không thể tải cấu hình tài chính của công ty.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload when active company changes
  useEffect(() => {
    if (activeCompanyId) {
      loadAllData(activeCompanyId);
    }
  }, [activeCompanyId, loadAllData]);

  // Derived values
  const defaultPaymentTerm = useMemo(() => {
    return paymentTerms.find(t => t.isDefault && t.isActive) || paymentTerms[0] || null;
  }, [paymentTerms]);

  const defaultUsdBank = useMemo(() => {
    return bankAccounts.find(b => b.isDefaultUsd && b.isActive) || bankAccounts.find(b => b.currency === 'USD' && b.isActive) || null;
  }, [bankAccounts]);

  const defaultVndBank = useMemo(() => {
    return bankAccounts.find(b => b.isDefaultVnd && b.isActive) || bankAccounts.find(b => b.currency === 'VND' && b.isActive) || null;
  }, [bankAccounts]);

  // Actions
  const updateFinancialSettings = useCallback(async (partial: Partial<CompanyFinancialSettings>): Promise<boolean> => {
    setSaveStatus('SAVING');
    setStatusMessage('Đang lưu cấu hình tài chính & ngoại tệ...');
    const res = await saveCompanyFinancialSettings(activeCompanyId, partial);
    if (res.success && res.data) {
      setFinancialSettings(res.data);
      setSaveStatus('SAVED');
      setStatusMessage('Đã lưu cấu hình tài chính thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    setStatusMessage(res.message || 'Lỗi khi lưu cấu hình tài chính.');
    return false;
  }, [activeCompanyId]);

  const updateTaxConfig = useCallback(async (partial: Partial<CompanyTaxConfiguration>): Promise<boolean> => {
    setSaveStatus('SAVING');
    setStatusMessage('Đang lưu chính sách thuế & VAT...');
    const res = await saveCompanyTaxConfiguration(activeCompanyId, partial);
    if (res.success && res.data) {
      setTaxConfig(res.data);
      setSaveStatus('SAVED');
      setStatusMessage('Đã lưu cấu hình thuế VAT thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    setStatusMessage(res.message || 'Lỗi khi lưu cấu hình thuế.');
    return false;
  }, [activeCompanyId]);

  const savePaymentTermAction = useCallback(async (term: Partial<CompanyPaymentTerm>): Promise<boolean> => {
    setSaveStatus('SAVING');
    setStatusMessage('Đang lưu điều khoản thanh toán...');
    const res = await saveCompanyPaymentTerm(activeCompanyId, term);
    if (res.success) {
      const updated = await getCompanyPaymentTerms(activeCompanyId, true);
      setPaymentTerms(updated);
      setSaveStatus('SAVED');
      setStatusMessage('Đã lưu điều khoản thanh toán.');
      setTimeout(() => setStatusMessage(null), 3000);
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    setStatusMessage(res.message || 'Lỗi khi lưu điều khoản thanh toán.');
    return false;
  }, [activeCompanyId]);

  const deletePaymentTermAction = useCallback(async (termId: string): Promise<boolean> => {
    setSaveStatus('SAVING');
    const ok = await deleteCompanyPaymentTerm(activeCompanyId, termId);
    if (ok) {
      const updated = await getCompanyPaymentTerms(activeCompanyId, true);
      setPaymentTerms(updated);
      setSaveStatus('SAVED');
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    return false;
  }, [activeCompanyId]);

  const saveBankAccountAction = useCallback(async (bank: Partial<CompanyBankAccount>): Promise<boolean> => {
    setSaveStatus('SAVING');
    setStatusMessage('Đang lưu tài khoản ngân hàng...');
    const res = await saveCompanyBankAccount(activeCompanyId, bank);
    if (res.success) {
      const updated = await getCompanyBankAccounts(activeCompanyId, true);
      setBankAccounts(updated);
      setSaveStatus('SAVED');
      setStatusMessage('Đã lưu tài khoản ngân hàng thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    setStatusMessage(res.message || 'Lỗi khi lưu tài khoản ngân hàng.');
    return false;
  }, [activeCompanyId]);

  const deleteBankAccountAction = useCallback(async (bankId: string): Promise<boolean> => {
    setSaveStatus('SAVING');
    const ok = await deleteCompanyBankAccount(activeCompanyId, bankId);
    if (ok) {
      const updated = await getCompanyBankAccounts(activeCompanyId, true);
      setBankAccounts(updated);
      setSaveStatus('SAVED');
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    return false;
  }, [activeCompanyId]);

  const updateCommercialSettings = useCallback(async (partial: Partial<CompanyCommercialSettings>): Promise<boolean> => {
    setSaveStatus('SAVING');
    setStatusMessage('Đang lưu cấu hình thương mại...');
    const res = await saveCompanyCommercialSettings(activeCompanyId, partial);
    if (res.success && res.data) {
      setCommercialSettings(res.data);
      setSaveStatus('SAVED');
      setStatusMessage('Đã lưu cấu hình thương mại thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
      return true;
    }
    setSaveStatus('SAVE_FAILED');
    setStatusMessage(res.message || 'Lỗi khi lưu cấu hình thương mại.');
    return false;
  }, [activeCompanyId]);

  const createSnapshotsForQuote = useCallback(async (quote: QuoteData): Promise<Partial<QuoteData>> => {
    const snapshots = await createQuotationFinancialSnapshots(activeCompanyId, quote);
    return {
      currencySnapshot: snapshots.currencySnapshot,
      taxSnapshot: snapshots.taxSnapshot,
      paymentTermSnapshot: snapshots.paymentTermSnapshot,
      exchangeRateSnapshot: snapshots.exchangeRateSnapshot,
      commercialTermsSnapshot: snapshots.commercialTermsSnapshot,
      bankSnapshot: snapshots.bankSnapshot,
      financialSnapshot: snapshots.financialSnapshot,
    };
  }, [activeCompanyId]);

  const refreshAllFinancialData = useCallback(async () => {
    invalidateCompanyFinancialCache(activeCompanyId);
    await loadAllData(activeCompanyId, true);
  }, [activeCompanyId, loadAllData]);

  const value = useMemo(() => ({
    activeCompanyId,
    isLoading,
    saveStatus,
    statusMessage,
    financialSettings,
    taxConfig,
    paymentTerms,
    defaultPaymentTerm,
    bankAccounts,
    defaultUsdBank,
    defaultVndBank,
    commercialSettings,
    updateFinancialSettings,
    updateTaxConfig,
    savePaymentTermAction,
    deletePaymentTermAction,
    saveBankAccountAction,
    deleteBankAccountAction,
    updateCommercialSettings,
    createSnapshotsForQuote,
    refreshAllFinancialData,
  }), [
    activeCompanyId,
    isLoading,
    saveStatus,
    statusMessage,
    financialSettings,
    taxConfig,
    paymentTerms,
    defaultPaymentTerm,
    bankAccounts,
    defaultUsdBank,
    defaultVndBank,
    commercialSettings,
    updateFinancialSettings,
    updateTaxConfig,
    savePaymentTermAction,
    deletePaymentTermAction,
    saveBankAccountAction,
    deleteBankAccountAction,
    updateCommercialSettings,
    createSnapshotsForQuote,
    refreshAllFinancialData,
  ]);

  return (
    <FinancialConfigContext.Provider value={value}>
      {children}
    </FinancialConfigContext.Provider>
  );
};

export function useFinancialConfig(): FinancialConfigContextType {
  const context = useContext(FinancialConfigContext);
  if (!context) {
    throw new Error('useFinancialConfig must be used within a FinancialConfigProvider');
  }
  return context;
}
