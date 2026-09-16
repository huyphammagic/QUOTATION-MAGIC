/**
 * Phase 37: Multi-Company Active Context & Isolation Provider
 * Manages activeCompany, companyList, company switching, and isolated state synchronization.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CompanyRecord, 
  CompanyMetadataItem, 
  mapCompanyRecordToProfile 
} from '../types/multiCompany';
import { CompanyProfile } from '../types/logistics';
import { 
  fetchAllCompanies, 
  fetchCompanyMetadataList, 
  getCompanyById, 
  saveCompany, 
  ensureDefaultCompanyInitialized,
  generateCompanyQuotationNumber,
  subscribeToCompanies
} from '../services/repository/companyRepository';
import { syncHealthService } from '../services/integrity/syncHealthService';

const ACTIVE_COMPANY_STORAGE_KEY = 'logistics_active_company_id';

interface MultiCompanyContextType {
  // Current Active Company
  activeCompanyId: string;
  activeCompanyRecord: CompanyRecord | null;
  activeCompanyProfile: CompanyProfile;
  
  // Available Companies List
  companies: CompanyRecord[];
  companyMetadataList: CompanyMetadataItem[];
  isLoadingCompanies: boolean;
  
  // Switcher & Actions
  switchCompany: (companyId: string) => Promise<boolean>;
  updateCurrentCompany: (updated: Partial<CompanyRecord>) => Promise<{ success: boolean; conflict?: boolean; message?: string }>;
  createNewCompany: (newCompany: Omit<CompanyRecord, 'companyId' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { companyId?: string }) => Promise<{ success: boolean; companyId?: string; message?: string }>;
  generateNextQuoteNumber: () => Promise<string>;
  refreshCompanies: () => Promise<void>;
}

const MultiCompanyContext = createContext<MultiCompanyContextType | undefined>(undefined);

export const MultiCompanyProvider: React.FC<{ 
  children: React.ReactNode;
  initialLegacyProfile?: CompanyProfile;
  onCompanyChanged?: (newProfile: CompanyProfile, companyId: string) => void;
}> = ({ children, initialLegacyProfile, onCompanyChanged }) => {
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY) || 'company_profile';
  });
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companyMetadataList, setCompanyMetadataList] = useState<CompanyMetadataItem[]>([]);
  const [activeCompanyRecord, setActiveCompanyRecord] = useState<CompanyRecord | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Derive active CompanyProfile compatible with existing views
  const activeCompanyProfile = useMemo<CompanyProfile>(() => {
    if (activeCompanyRecord) {
      return mapCompanyRecordToProfile(activeCompanyRecord);
    }
    if (initialLegacyProfile) {
      return initialLegacyProfile;
    }
    return {
      name: 'LOGISTICS SOLUTIONS',
      englishName: 'LOGISTICS SOLUTIONS CO., LTD',
      shortName: 'LOG',
      taxId: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logoUrl: '',
      bankName: '',
      bankAccountNo: '',
      bankAccountHolder: '',
      bankSwiftCode: '',
      salesRepName: '',
      salesRepTitle: 'Logistics Consultant',
      salesRepPhone: '',
      salesRepEmail: '',
      version: 1,
    };
  }, [activeCompanyRecord, initialLegacyProfile]);

  // Load initial companies and active record
  const loadCompaniesData = useCallback(async (force = false) => {
    setIsLoadingCompanies(true);
    try {
      // 1. Ensure default company is seeded/migrated from legacy profile
      await ensureDefaultCompanyInitialized(initialLegacyProfile);

      // 2. Fetch all companies
      const list = await fetchAllCompanies(force);
      setCompanies(list);

      const meta = list.map(c => ({
        companyId: c.companyId,
        companyCode: c.companyCode,
        displayName: c.displayName,
        legalName: c.legalName,
        logoUrl: c.branding?.logoUrl,
        status: c.status,
        taxCode: c.taxCode,
        quotationPrefix: c.branding?.quotationPrefix || 'LOG',
        defaultCurrency: c.branding?.defaultCurrency || 'USD',
      }));
      setCompanyMetadataList(meta);

      // 3. Resolve active company record
      let targetId = activeCompanyId;
      let matched = list.find(c => c.companyId === targetId && c.status === 'ACTIVE');
      if (!matched && list.length > 0) {
        matched = list.find(c => c.status === 'ACTIVE') || list[0];
        targetId = matched.companyId;
        setActiveCompanyId(targetId);
        localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, targetId);
      }
      setActiveCompanyRecord(matched || null);
    } catch (err) {
      console.warn('[MultiCompanyContext] Error loading companies data:', err);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [activeCompanyId, initialLegacyProfile]);

  // Initial mount load
  useEffect(() => {
    loadCompaniesData();

    // Subscribe to real-time changes in companies collection
    const unsub = subscribeToCompanies((updatedList) => {
      setCompanies(updatedList);
      setCompanyMetadataList(updatedList.map(c => ({
        companyId: c.companyId,
        companyCode: c.companyCode,
        displayName: c.displayName,
        legalName: c.legalName,
        logoUrl: c.branding?.logoUrl,
        status: c.status,
        taxCode: c.taxCode,
        quotationPrefix: c.branding?.quotationPrefix || 'LOG',
        defaultCurrency: c.branding?.defaultCurrency || 'USD',
      })));

      // Sync active company record if it was modified
      const currentActive = updatedList.find(c => c.companyId === activeCompanyId);
      if (currentActive) {
        setActiveCompanyRecord(currentActive);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Switch Active Company Handler
  const switchCompany = useCallback(async (newCompanyId: string): Promise<boolean> => {
    if (!newCompanyId) return false;
    let target = companies.find(c => c.companyId === newCompanyId);
    if (!target) {
      target = await getCompanyById(newCompanyId);
    }
    if (!target) {
      console.warn(`[MultiCompanyContext] Company not found: ${newCompanyId}`);
      return false;
    }

    setActiveCompanyId(newCompanyId);
    setActiveCompanyRecord(target);
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, newCompanyId);

    const newProfile = mapCompanyRecordToProfile(target);
    if (onCompanyChanged) {
      onCompanyChanged(newProfile, newCompanyId);
    }
    return true;
  }, [companies, onCompanyChanged]);

  // Update current company
  const updateCurrentCompany = useCallback(async (
    updated: Partial<CompanyRecord>
  ): Promise<{ success: boolean; conflict?: boolean; message?: string }> => {
    const targetId = updated.companyId || activeCompanyId;
    const res = await saveCompany({
      ...updated,
      companyId: targetId,
    });

    if (res.success && res.company) {
      setActiveCompanyRecord(res.company);
      const newProfile = mapCompanyRecordToProfile(res.company);
      if (onCompanyChanged) {
        onCompanyChanged(newProfile, targetId);
      }
      await loadCompaniesData(true);
    }
    return res;
  }, [activeCompanyId, onCompanyChanged, loadCompaniesData]);

  // Create new company
  const createNewCompany = useCallback(async (
    newCompanyData: Omit<CompanyRecord, 'companyId' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { companyId?: string }
  ): Promise<{ success: boolean; companyId?: string; message?: string }> => {
    const generatedId = newCompanyData.companyId || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullPayload: CompanyRecord = {
      ...newCompanyData,
      companyId: generatedId,
      version: 1,
      quotationCounter: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'User Admin',
      updatedBy: 'User Admin',
    };

    const res = await saveCompany(fullPayload);
    if (res.success && res.company) {
      await loadCompaniesData(true);
      // Auto switch to newly created company
      await switchCompany(generatedId);
      return { success: true, companyId: generatedId };
    }
    return { success: false, message: res.message || 'Không thể tạo công ty mới.' };
  }, [loadCompaniesData, switchCompany]);

  // Next quotation number for the currently active company
  const generateNextQuoteNumber = useCallback(async (): Promise<string> => {
    return generateCompanyQuotationNumber(activeCompanyId);
  }, [activeCompanyId]);

  const refreshCompanies = useCallback(async () => {
    await loadCompaniesData(true);
  }, [loadCompaniesData]);

  const value = useMemo(() => ({
    activeCompanyId,
    activeCompanyRecord,
    activeCompanyProfile,
    companies,
    companyMetadataList,
    isLoadingCompanies,
    switchCompany,
    updateCurrentCompany,
    createNewCompany,
    generateNextQuoteNumber,
    refreshCompanies,
  }), [
    activeCompanyId,
    activeCompanyRecord,
    activeCompanyProfile,
    companies,
    companyMetadataList,
    isLoadingCompanies,
    switchCompany,
    updateCurrentCompany,
    createNewCompany,
    generateNextQuoteNumber,
    refreshCompanies,
  ]);

  return (
    <MultiCompanyContext.Provider value={value}>
      {children}
    </MultiCompanyContext.Provider>
  );
};

export function useMultiCompany(): MultiCompanyContextType {
  const context = useContext(MultiCompanyContext);
  if (!context) {
    throw new Error('useMultiCompany must be used within a MultiCompanyProvider');
  }
  return context;
}
