import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { PricingPolicyItem, PricingPolicyScope } from '../../types/pricingIntelligence';
import { TransportMode } from '../../types/logistics';

const COLLECTION_NAME = 'pricingPolicies';

// In-Memory Cache with TTL for optimal performance (Zero repetitive reads)
interface CacheEntry {
  data: PricingPolicyItem[];
  timestamp: number;
}
let policiesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidatePricingPolicyCache(): void {
  policiesCache = null;
}

/**
 * Standard Built-in Policies if Firestore has not been seeded yet
 */
export const DEFAULT_GLOBAL_PRICING_POLICY: PricingPolicyItem = {
  id: 'policy-default-global',
  policyCode: 'POL-GLOBAL-STD',
  policyName: 'Chính Sách Biên Lợi Nhuận Chuẩn Toàn Công Ty',
  scope: 'GLOBAL',
  targetMarginPercent: 20.0,
  minimumMarginPercent: 15.0,
  targetProfitAmount: 200,
  minimumProfitAmount: 50,
  maximumDiscountPercent: 20.0,
  priceFloorType: 'MIN_MARGIN',
  currency: 'USD',
  approvalThresholds: {
    autoEligibleMargin: 20.0,
    salesManagerApprovalMargin: 15.0,
    managementApprovalMargin: 10.0,
    blockMargin: 8.0,
  },
  status: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2028-12-31',
  version: 1,
  priority: 40,
  notes: 'Chính sách áp dụng mặc định cho tất cả các báo giá logistics không có quy định riêng biệt.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'System Admin',
};

export const DEFAULT_SEA_PRICING_POLICY: PricingPolicyItem = {
  id: 'policy-mode-sea',
  policyCode: 'POL-SEA-FCL',
  policyName: 'Chính Sách Vận Tải Đường Biển (Ocean FCL/LCL)',
  scope: 'SERVICE_MODE',
  targetId: 'SEA_FCL',
  targetName: 'Đường Biển (Ocean Freight)',
  targetMarginPercent: 18.0,
  minimumMarginPercent: 12.0,
  targetProfitAmount: 150,
  minimumProfitAmount: 50,
  maximumDiscountPercent: 25.0,
  priceFloorType: 'MIN_MARGIN',
  currency: 'USD',
  approvalThresholds: {
    autoEligibleMargin: 18.0,
    salesManagerApprovalMargin: 12.0,
    managementApprovalMargin: 8.0,
    blockMargin: 5.0,
  },
  status: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2028-12-31',
  version: 1,
  priority: 60,
  notes: 'Áp dụng cho cước biển FCL và LCL cạnh tranh thị trường.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'System Admin',
};

export const DEFAULT_AIR_PRICING_POLICY: PricingPolicyItem = {
  id: 'policy-mode-air',
  policyCode: 'POL-AIR-FREIGHT',
  policyName: 'Chính Sách Hàng Không (Air Freight)',
  scope: 'SERVICE_MODE',
  targetId: 'AIR_FREIGHT',
  targetName: 'Hàng Không (Air Freight)',
  targetMarginPercent: 22.0,
  minimumMarginPercent: 16.0,
  targetProfitAmount: 250,
  minimumProfitAmount: 80,
  maximumDiscountPercent: 15.0,
  priceFloorType: 'MIN_MARGIN',
  currency: 'USD',
  approvalThresholds: {
    autoEligibleMargin: 22.0,
    salesManagerApprovalMargin: 16.0,
    managementApprovalMargin: 12.0,
    blockMargin: 8.0,
  },
  status: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2028-12-31',
  version: 1,
  priority: 60,
  notes: 'Biên lãi cao hơn cho hàng không do biến động phụ phí nhiên liệu và tải trọng.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'System Admin',
};

export const DEFAULT_TRUCKING_PRICING_POLICY: PricingPolicyItem = {
  id: 'policy-mode-trucking',
  policyCode: 'POL-INLAND-TRUCKING',
  policyName: 'Chính Sách Vận Tải Đường Bộ (Trucking & Kéo Cont)',
  scope: 'SERVICE_MODE',
  targetId: 'INLAND_TRUCKING',
  targetName: 'Vận Tải Nội Địa (Trucking)',
  targetMarginPercent: 25.0,
  minimumMarginPercent: 18.0,
  targetProfitAmount: 100,
  minimumProfitAmount: 40,
  maximumDiscountPercent: 20.0,
  priceFloorType: 'HIGHER_OF_BOTH',
  currency: 'USD',
  approvalThresholds: {
    autoEligibleMargin: 25.0,
    salesManagerApprovalMargin: 18.0,
    managementApprovalMargin: 12.0,
    blockMargin: 10.0,
  },
  status: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2028-12-31',
  version: 1,
  priority: 60,
  notes: 'Đòi hỏi biên lợi nhuận cao do chi phí cầu đường và biến động dầu DO.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'System Admin',
};

export const BUILT_IN_POLICIES: PricingPolicyItem[] = [
  DEFAULT_GLOBAL_PRICING_POLICY,
  DEFAULT_SEA_PRICING_POLICY,
  DEFAULT_AIR_PRICING_POLICY,
  DEFAULT_TRUCKING_PRICING_POLICY,
];

/**
 * Fetches all pricing policies from Firestore with in-memory caching
 */
export async function getPricingPoliciesFromFirestore(): Promise<PricingPolicyItem[]> {
  const now = Date.now();
  if (policiesCache && (now - policiesCache.timestamp < CACHE_TTL_MS)) {
    return policiesCache.data;
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('priority', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // If collection is empty in Firestore, seed standard defaults and return
      policiesCache = { data: BUILT_IN_POLICIES, timestamp: now };
      return BUILT_IN_POLICIES;
    }

    const items: PricingPolicyItem[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as PricingPolicyItem);
    });

    policiesCache = { data: items, timestamp: now };
    return items;
  } catch (error) {
    console.warn('Error fetching pricing policies from Firestore, using in-memory fallbacks:', error);
    return BUILT_IN_POLICIES;
  }
}

/**
 * Saves or updates a pricing policy in Firestore
 */
export async function savePricingPolicyToFirestore(policy: PricingPolicyItem): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, policy.id);
  const nowIso = new Date().toISOString();

  const payload: PricingPolicyItem = {
    ...policy,
    updatedAt: nowIso,
    version: (policy.version || 1) + 1,
  };

  await setDoc(docRef, payload, { merge: true });
  invalidatePricingPolicyCache();
}

/**
 * Deletes a pricing policy from Firestore
 */
export async function deletePricingPolicyFromFirestore(policyId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, policyId);
  await deleteDoc(docRef);
  invalidatePricingPolicyCache();
}

export interface PolicyResolutionContext {
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  customerSegment?: string;     // e.g. 'VIP', 'STRATEGIC', 'STANDARD'
  mode?: TransportMode | string;
  tradeLane?: string;
}

/**
 * Resolves the applicable pricing policy based on a 4-tier hierarchy:
 * Tier 1: Customer-Specific Policy (priority: 100)
 * Tier 2: Customer Segment Policy (priority: 80)
 * Tier 3: Service / Transport Mode Policy (priority: 60)
 * Tier 4: Global Company Default Policy (priority: 40)
 */
export async function resolveApplicablePricingPolicy(
  context: PolicyResolutionContext,
  providedPolicies?: PricingPolicyItem[]
): Promise<PricingPolicyItem> {
  const allPolicies = providedPolicies && providedPolicies.length > 0 
    ? providedPolicies 
    : await getPricingPoliciesFromFirestore();

  const activePolicies = allPolicies.filter(p => p.status === 'ACTIVE');

  // Normalize inputs
  const customerId = (context.customerId || '').trim().toLowerCase();
  const customerCode = (context.customerCode || '').trim().toLowerCase();
  const segment = (context.customerSegment || '').trim().toUpperCase();
  const modeStr = (context.mode || '').toString().toUpperCase();

  // Tier 1: Customer-Specific
  if (customerId || customerCode) {
    const custPolicy = activePolicies.find(p => 
      p.scope === 'CUSTOMER' && 
      p.targetId && 
      (p.targetId.toLowerCase() === customerId || p.targetId.toLowerCase() === customerCode)
    );
    if (custPolicy) return custPolicy;
  }

  // Tier 2: Customer Segment (VIP, Strategic, etc.)
  if (segment) {
    const segPolicy = activePolicies.find(p => 
      p.scope === 'CUSTOMER_SEGMENT' && 
      p.targetId && 
      p.targetId.toUpperCase() === segment
    );
    if (segPolicy) return segPolicy;
  }

  // Tier 3: Service Mode (SEA, AIR, TRUCKING, CUSTOMS)
  if (modeStr) {
    const modePolicy = activePolicies.find(p => {
      if (p.scope !== 'SERVICE_MODE' || !p.targetId) return false;
      const targetModeUpper = p.targetId.toUpperCase();
      if (modeStr.includes('AIR') && targetModeUpper.includes('AIR')) return true;
      if (modeStr.includes('TRUCK') && targetModeUpper.includes('TRUCK')) return true;
      if (modeStr.includes('CUSTOMS') && targetModeUpper.includes('CUSTOMS')) return true;
      if ((modeStr.includes('SEA') || modeStr.includes('OCEAN') || modeStr.includes('FCL') || modeStr.includes('LCL')) && 
          (targetModeUpper.includes('SEA') || targetModeUpper.includes('FCL') || targetModeUpper.includes('OCEAN'))) {
        return true;
      }
      return false;
    });
    if (modePolicy) return modePolicy;
  }

  // Tier 4: Global Default Policy
  const globalPolicy = activePolicies.find(p => p.scope === 'GLOBAL');
  return globalPolicy || DEFAULT_GLOBAL_PRICING_POLICY;
}

/**
 * Synchronous resolver for instant policy lookup when policies list is already loaded in memory
 */
export function resolvePricingPolicy(
  policies: PricingPolicyItem[],
  customerId?: string,
  customerSegment?: string,
  mode?: TransportMode | string
): PricingPolicyItem {
  const activePolicies = (policies && policies.length > 0 ? policies : BUILT_IN_POLICIES)
    .filter(p => p.status === 'ACTIVE');

  const cId = (customerId || '').trim().toLowerCase();
  const seg = (customerSegment || '').trim().toUpperCase();
  const mStr = (mode || '').toString().toUpperCase();

  // Tier 1: Customer
  if (cId) {
    const custPol = activePolicies.find(p => p.scope === 'CUSTOMER' && p.targetId && p.targetId.toLowerCase() === cId);
    if (custPol) return custPol;
  }

  // Tier 2: Segment
  if (seg) {
    const segPol = activePolicies.find(p => p.scope === 'CUSTOMER_SEGMENT' && p.targetId && p.targetId.toUpperCase() === seg);
    if (segPol) return segPol;
  }

  // Tier 3: Service Mode
  if (mStr) {
    const modePol = activePolicies.find(p => {
      if (p.scope !== 'SERVICE_MODE' || !p.targetId) return false;
      const t = p.targetId.toUpperCase();
      if (mStr.includes('AIR') && t.includes('AIR')) return true;
      if (mStr.includes('TRUCK') && t.includes('TRUCK')) return true;
      if (mStr.includes('CUSTOMS') && t.includes('CUSTOMS')) return true;
      if ((mStr.includes('SEA') || mStr.includes('OCEAN') || mStr.includes('FCL') || mStr.includes('LCL')) && 
          (t.includes('SEA') || t.includes('FCL') || t.includes('OCEAN'))) {
        return true;
      }
      return false;
    });
    if (modePol) return modePol;
  }

  // Tier 4: Global Default
  const globalPol = activePolicies.find(p => p.scope === 'GLOBAL');
  return globalPol || DEFAULT_GLOBAL_PRICING_POLICY;
}
