/**
 * Phase 50.1: Hardened Multi-Company Active Context & Isolation Provider
 * Manages activeCompany, companyList, company switching, and isolated state synchronization.
 * Guarantees that activeCompanyId in localStorage is NEVER a security boundary.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CompanyRecord, 
  CompanyMetadataItem, 
  CompanyMemberRecord,
  CompanyMemberRole,
  CompanyMemberPermission,
  mapCompanyRecordToProfile 
} from '../types/multiCompany';
import { UserRole } from '../types/analytics';
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
import { 
  getUserMembership, 
  getUserMemberships, 
  bootstrapInitialAdminMembership,
  mapMemberRoleToUserRole,
  DEFAULT_ROLE_PERMISSIONS 
} from '../services/repository/companyMemberRepository';
import { useAuth } from './AuthContext';
import { syncHealthService } from '../services/integrity/syncHealthService';

const ACTIVE_COMPANY_STORAGE_KEY = 'logistics_active_company_id';

interface MultiCompanyContextType {
  // Current Active Company
  activeCompanyId: string;
  activeCompanyRecord: CompanyRecord | null;
  activeCompanyProfile: CompanyProfile;
  
  // Real RBAC Membership state
  activeMemberRecord: CompanyMemberRecord | null;
  activeMemberRole: CompanyMemberRole;
  activeUserRole: UserRole;
  activePermissions: CompanyMemberPermission;
  userMemberships: CompanyMemberRecord[];

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
  const { user } = useAuth();
  
  // UI preference only - NOT a security boundary
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY) || 'company_profile';
  });
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companyMetadataList, setCompanyMetadataList] = useState<CompanyMetadataItem[]>([]);
  const [activeCompanyRecord, setActiveCompanyRecord] = useState<CompanyRecord | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Real RBAC Membership States
  const [activeMemberRecord, setActiveMemberRecord] = useState<CompanyMemberRecord | null>(null);
  const [userMemberships, setUserMemberships] = useState<CompanyMemberRecord[]>([]);

  // Resolve membership whenever user or activeCompanyId updates
  useEffect(() => {
    let isMounted = true;
    async function syncMembership() {
      if (!user?.uid) {
        if (isMounted) {
          setActiveMemberRecord(null);
          setUserMemberships([]);
        }
        return;
      }

      const targetCompany = activeCompanyId || 'company_profile';
      try {
        // 1. Fetch user's actual active memberships across all companies
        const allMemberships = await getUserMemberships(user.uid);
        if (isMounted) {
          setUserMemberships(allMemberships);
        }

        // 2. Fetch or resolve membership for current active company
        let mRecord = await getUserMembership(user.uid, targetCompany);

        // Security gate: ONLY the system root admin (huypham.magic@gmail.com) can bootstrap
        // initial admin membership if zero memberships exist. Normal users remain unassigned viewers.
        if (!mRecord && allMemberships.length === 0 && user.email === 'huypham.magic@gmail.com') {
          mRecord = await bootstrapInitialAdminMembership({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          }, targetCompany);
          if (mRecord && isMounted) {
            setUserMemberships([mRecord]);
          }
        }

        // Security boundary validation: if stored company is not in user's memberships,
        // and user has other valid memberships, switch to their legitimate company!
        if (!mRecord && allMemberships.length > 0) {
          const legitimateCompany = allMemberships[0].companyId;
          console.info(`[MultiCompanyContext] Realigning activeCompanyId from ${targetCompany} to user-authorized company: ${legitimateCompany}`);
          if (isMounted) {
            setActiveCompanyId(legitimateCompany);
            localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, legitimateCompany);
            setActiveMemberRecord(allMemberships[0]);
          }
          return;
        }

        if (isMounted) {
          setActiveMemberRecord(mRecord);
        }
      } catch (err) {
        console.warn('[MultiCompanyContext] Error resolving user membership:', err);
      }
    }

    syncMembership();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, activeCompanyId]);

  const activeMemberRole: CompanyMemberRole = activeMemberRecord?.role || 'VIEWER';
  const activeUserRole: UserRole = mapMemberRoleToUserRole(activeMemberRole);
  const activePermissions: CompanyMemberPermission = activeMemberRecord?.permissions || DEFAULT_ROLE_PERMISSIONS.VIEWER;

  // Derive active CompanyProfile compatible with existing views
  const activeCompanyProfile = useMemo<CompanyProfile>(() => {
    if (activeCompanyRecord) {
      return mapCompanyRecordToProfile(activeCompanyRecord);
    }
    if (initialLegacyProfile) {
      return initialLegacyProfile;
    }
    return {
      name: '',
      englishName: '',
      shortName: '',
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
      salesRepTitle: '',
      salesRepPhone: '',
      salesRepEmail: '',
      version: 1,
    };
  }, [activeCompanyRecord, initialLegacyProfile]);

  // Load initial companies and active record
  const loadCompaniesData = useCallback(async (force = false) => {
    if (!user?.uid) {
      setIsLoadingCompanies(false);
      return;
    }

    setIsLoadingCompanies(true);
    try {
      // 1. Ensure default company is initialized
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
  }, [user?.uid, activeCompanyId, initialLegacyProfile]);

  // Initial mount load
  useEffect(() => {
    if (user?.uid) {
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
    }
  }, [user?.uid]);

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
    }, user?.uid || 'User');

    if (res.success && res.company) {
      setActiveCompanyRecord(res.company);
      const newProfile = mapCompanyRecordToProfile(res.company);
      if (onCompanyChanged) {
        onCompanyChanged(newProfile, targetId);
      }
      await loadCompaniesData(true);
    }
    return res;
  }, [activeCompanyId, user?.uid, onCompanyChanged, loadCompaniesData]);

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
      createdBy: user?.displayName || user?.email || 'User Admin',
      updatedBy: user?.displayName || user?.email || 'User Admin',
    };

    const res = await saveCompany(fullPayload, user?.uid || 'Admin');
    if (res.success && res.company) {
      // Immediately provision creator as COMPANY_ADMIN
      if (user?.uid) {
        await bootstrapInitialAdminMembership({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }, generatedId, { isCompanyCreator: true });
      }

      await loadCompaniesData(true);
      await switchCompany(generatedId);
      return { success: true, companyId: generatedId };
    }
    return { success: false, message: res.message || 'Không thể tạo công ty mới.' };
  }, [user, loadCompaniesData, switchCompany]);

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
    activeMemberRecord,
    activeMemberRole,
    activeUserRole,
    activePermissions,
    userMemberships,
    switchCompany,
    updateCurrentCompany,
    createNewCompany,
    generateNextQuoteNumber,
    refreshCompanies,
  }), [
    activeCompanyId,
    activeCompanyRecord,
    activeCompanyProfile,
    activeMemberRecord,
    activeMemberRole,
    activeUserRole,
    activePermissions,
    userMemberships,
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
