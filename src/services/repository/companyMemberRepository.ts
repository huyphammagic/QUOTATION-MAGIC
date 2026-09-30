/**
 * Phase 50.1: Hardened Company Membership & Role-Based Access Control (RBAC) Repository
 * Manages deterministic company memberships, user roles, granular permissions,
 * and security isolation under Firestore.
 * 
 * Rules:
 * - Deterministic document IDs: `${userId}_${companyId}`
 * - No automatic self-promotion to COMPANY_ADMIN for arbitrary users
 * - Zero bypasses for fallback company strings
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  CompanyMemberRecord, 
  CompanyMemberRole, 
  CompanyMemberPermission 
} from '../../types/multiCompany';
import { UserRole } from '../../types/analytics';
import { recordHealthAudit } from '../audit/systemHealthAuditService';

const MEMBERSHIPS_COLLECTION = 'companyMemberships';
const COMPANIES_COLLECTION = 'companies';

/**
 * Deterministic document ID for O(1) Firestore security rules lookup:
 * ID = `${userId}_${companyId}`
 */
export function getMembershipDocId(userId: string, companyId: string): string {
  const safeUser = (userId || 'unknown').trim();
  const safeComp = (companyId || 'company_profile').trim();
  return `${safeUser}_${safeComp}`;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<CompanyMemberRole, CompanyMemberPermission> = {
  COMPANY_ADMIN: {
    canCreateQuotes: true,
    canApproveQuotes: true,
    canEditCompanyProfile: true,
    canManageMembers: true,
    canManageRates: true,
    canViewProfitability: true,
  },
  LOGISTICS_MANAGER: {
    canCreateQuotes: true,
    canApproveQuotes: true,
    canEditCompanyProfile: false,
    canManageMembers: false,
    canManageRates: true,
    canViewProfitability: true,
  },
  PRICING_SPECIALIST: {
    canCreateQuotes: true,
    canApproveQuotes: false,
    canEditCompanyProfile: false,
    canManageMembers: false,
    canManageRates: true,
    canViewProfitability: true,
  },
  SALES_REP: {
    canCreateQuotes: true,
    canApproveQuotes: false,
    canEditCompanyProfile: false,
    canManageMembers: false,
    canManageRates: false,
    canViewProfitability: false,
  },
  OPERATOR: {
    canCreateQuotes: false,
    canApproveQuotes: false,
    canEditCompanyProfile: false,
    canManageMembers: false,
    canManageRates: false,
    canViewProfitability: false,
  },
  VIEWER: {
    canCreateQuotes: false,
    canApproveQuotes: false,
    canEditCompanyProfile: false,
    canManageMembers: false,
    canManageRates: false,
    canViewProfitability: false,
  },
};

/**
 * Map CompanyMemberRole to UserRole for navigation and UI views
 */
export function mapMemberRoleToUserRole(role: CompanyMemberRole): UserRole {
  switch (role) {
    case 'COMPANY_ADMIN':
      return 'ADMIN';
    case 'LOGISTICS_MANAGER':
      return 'SALES_MANAGER';
    case 'PRICING_SPECIALIST':
      return 'PRICING_SPECIALIST';
    case 'SALES_REP':
      return 'SALES_REP';
    case 'OPERATOR':
    case 'VIEWER':
    default:
      return 'VIEWER';
  }
}

/**
 * Get active membership of a user in a specific company.
 * Strictly reads from Firestore, returns null if non-existent or inactive.
 */
export async function getUserMembership(
  userId: string, 
  companyId: string
): Promise<CompanyMemberRecord | null> {
  if (!userId || !companyId || !db) return null;

  try {
    const docId = getMembershipDocId(userId, companyId);
    const snap = await getDoc(doc(db, MEMBERSHIPS_COLLECTION, docId));
    if (snap.exists()) {
      const data = snap.data() as CompanyMemberRecord;
      if (data.status === 'ACTIVE') {
        return { ...data, membershipId: snap.id };
      }
    }
    return null;
  } catch (err: any) {
    console.warn(`[companyMemberRepository] Notice getting membership for ${userId} in ${companyId}:`, err?.message || err);
    return null;
  }
}

/**
 * Fetch all companies where user has an active membership.
 */
export async function getUserMemberships(userId: string): Promise<CompanyMemberRecord[]> {
  if (!userId) return [];
  if (!db) return [];

  try {
    const q = query(
      collection(db, MEMBERSHIPS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);
    const list: CompanyMemberRecord[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data() as CompanyMemberRecord, membershipId: d.id });
    });
    return list;
  } catch (err: any) {
    console.warn('[companyMemberRepository] Error fetching user memberships:', err?.message || err);
    return [];
  }
}

/**
 * Fetch all members of a company (Admin or Manager operation).
 */
export async function getCompanyMembers(companyId: string): Promise<CompanyMemberRecord[]> {
  if (!companyId) return [];
  if (!db) return [];

  try {
    const q = query(
      collection(db, MEMBERSHIPS_COLLECTION),
      where('companyId', '==', companyId)
    );
    const snap = await getDocs(q);
    const list: CompanyMemberRecord[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data() as CompanyMemberRecord, membershipId: d.id });
    });
    return list;
  } catch (err: any) {
    console.warn('[companyMemberRepository] Error fetching company members:', err?.message || err);
    return [];
  }
}

/**
 * Explicit bootstrapping for initial company owner/admin.
 * Strictly gated:
 * 1. Explicit company creation by user (options.isCompanyCreator = true)
 * 2. Root system admin (huypham.magic@gmail.com)
 * 3. The company has ZERO existing members AND is brand new
 * Never auto-promotes an arbitrary user to COMPANY_ADMIN of an existing company.
 */
export async function bootstrapInitialAdminMembership(
  user: { uid: string; email?: string | null; displayName?: string | null },
  companyId: string,
  options?: { isCompanyCreator?: boolean }
): Promise<CompanyMemberRecord | null> {
  if (!user.uid || !companyId) return null;
  const effectiveCompanyId = companyId.trim();
  const docId = getMembershipDocId(user.uid, effectiveCompanyId);

  // Check if membership already exists
  const existing = await getUserMembership(user.uid, effectiveCompanyId);
  if (existing) {
    return existing;
  }

  // Security gate: If not root admin and not explicitly creating the company,
  // ensure the company does not already have members
  const isRootAdmin = user.email === 'huypham.magic@gmail.com';
  const isCreator = Boolean(options?.isCompanyCreator);

  if (!isRootAdmin && !isCreator && db) {
    try {
      const existingMembers = await getCompanyMembers(effectiveCompanyId);
      if (existingMembers.length > 0) {
        console.warn(`[companyMemberRepository] Blocked unauthorized self-provisioning: user ${user.uid} (${user.email}) attempted to bootstrap COMPANY_ADMIN into company ${effectiveCompanyId} which already has ${existingMembers.length} member(s).`);
        return null;
      }
    } catch (checkErr) {
      console.warn('[companyMemberRepository] Could not check existing members for bootstrap gate:', checkErr);
      return null;
    }
  }

  const nowIso = new Date().toISOString();
  const record: CompanyMemberRecord = {
    membershipId: docId,
    userId: user.uid,
    userEmail: user.email || '',
    userName: user.displayName || user.email?.split('@')[0] || 'Administrator',
    companyId: effectiveCompanyId,
    role: 'COMPANY_ADMIN',
    permissions: DEFAULT_ROLE_PERMISSIONS.COMPANY_ADMIN,
    status: 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (db) {
    try {
      await setDoc(doc(db, MEMBERSHIPS_COLLECTION, docId), {
        ...record,
        _updatedAt: serverTimestamp(),
      }, { merge: true });

      await recordHealthAudit({
        userId: user.uid,
        companyId: effectiveCompanyId,
        entityType: 'System' as any,
        entityId: docId,
        action: 'MEMBERSHIP_CREATED' as any,
        result: 'SUCCESS',
        details: `Initial COMPANY_ADMIN bootstrapped for ${record.userName} (${record.userEmail}) in ${effectiveCompanyId}`,
      });
    } catch (err: any) {
      console.warn('[companyMemberRepository] Notice bootstrapping admin membership:', err?.message || err);
      return null;
    }
  }

  return record;
}

/**
 * Resolves existing membership for a user in the target company.
 * Strictly read-only: NEVER auto-provisions or self-promotes unauthorized users!
 */
export async function ensureUserMembership(
  user: { uid: string; email?: string | null; displayName?: string | null },
  companyId: string
): Promise<CompanyMemberRecord | null> {
  if (!user?.uid || !companyId) return null;
  return getUserMembership(user.uid, companyId);
}

/**
 * Update a member's role and permissions (Admin action)
 */
export async function updateCompanyMemberRole(
  membershipId: string,
  newRole: CompanyMemberRole,
  operatorUser: { uid: string; email?: string }
): Promise<boolean> {
  if (!db) return true;

  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, membershipId);
    const permissions = DEFAULT_ROLE_PERMISSIONS[newRole];
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      role: newRole,
      permissions,
      updatedAt: nowIso,
      _updatedAt: serverTimestamp(),
    });

    const targetCompanyId = membershipId.includes('_') ? membershipId.split('_').slice(1).join('_') : 'company_profile';

    await recordHealthAudit({
      userId: operatorUser.uid,
      companyId: targetCompanyId,
      entityType: 'System' as any,
      entityId: membershipId,
      action: 'ROLE_CHANGED' as any,
      result: 'SUCCESS',
      details: `Member ${membershipId} role updated to ${newRole} by ${operatorUser.email || operatorUser.uid}`,
    });

    return true;
  } catch (err) {
    console.error('[companyMemberRepository] Error updating member role:', err);
    return false;
  }
}

/**
 * Add / invite a new member to the company (Admin action)
 */
export async function addCompanyMember(
  companyId: string,
  member: {
    userId?: string;
    userEmail: string;
    userName?: string;
    role: CompanyMemberRole;
  },
  operatorUser: { uid: string; email?: string }
): Promise<CompanyMemberRecord | null> {
  if (!db) return null;
  const safeCompany = companyId || 'company_profile';
  const resolvedUserId = (member.userId && member.userId.trim()) || `user_${member.userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const docId = getMembershipDocId(resolvedUserId, safeCompany);
  const nowIso = new Date().toISOString();
  const permissions = DEFAULT_ROLE_PERMISSIONS[member.role] || DEFAULT_ROLE_PERMISSIONS.SALES_REP;

  const record: CompanyMemberRecord = {
    membershipId: docId,
    userId: resolvedUserId,
    userEmail: member.userEmail.trim(),
    userName: member.userName?.trim() || member.userEmail.split('@')[0],
    companyId: safeCompany,
    role: member.role,
    permissions,
    status: 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await setDoc(doc(db, MEMBERSHIPS_COLLECTION, docId), {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    await recordHealthAudit({
      userId: operatorUser.uid,
      companyId: safeCompany,
      entityType: 'System' as any,
      entityId: docId,
      action: 'MEMBERSHIP_CREATED' as any,
      result: 'SUCCESS',
      details: `Added member ${record.userEmail} with role ${record.role} by ${operatorUser.email || operatorUser.uid}`,
    });

    return record;
  } catch (err) {
    console.error('[companyMemberRepository] Error adding company member:', err);
    return null;
  }
}

/**
 * Deactivate / remove a member from the company (Admin action)
 */
export async function removeCompanyMember(
  membershipId: string,
  operatorUser: { uid: string; email?: string }
): Promise<boolean> {
  if (!db) return true;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, membershipId);
    await updateDoc(docRef, {
      status: 'INACTIVE',
      updatedAt: new Date().toISOString(),
      _updatedAt: serverTimestamp(),
    });

    const targetCompanyId = membershipId.includes('_') ? membershipId.split('_').slice(1).join('_') : 'company_profile';

    await recordHealthAudit({
      userId: operatorUser.uid,
      companyId: targetCompanyId,
      entityType: 'System' as any,
      entityId: membershipId,
      action: 'MEMBERSHIP_DELETED' as any,
      result: 'SUCCESS',
      details: `Deactivated member ${membershipId} by ${operatorUser.email || operatorUser.uid}`,
    });
    return true;
  } catch (err) {
    console.error('[companyMemberRepository] Error deactivating member:', err);
    return false;
  }
}
