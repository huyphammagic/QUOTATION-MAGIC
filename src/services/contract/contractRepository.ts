import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  serverTimestamp,
  writeBatch,
  DocumentSnapshot,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  ContractItem, 
  ContractRateItem, 
  ContractVersionItem, 
  ContractDocumentItem, 
  ContractAuditLogItem,
  ContractStatus,
  ContractType 
} from '../../types/contract';
import { validateContractStatusTransition } from './contractValidation';

const COLLECTIONS = {
  CONTRACTS: 'contracts',
  CONTRACT_RATES: 'contractRates',
  CONTRACT_VERSIONS: 'contractVersions',
  CONTRACT_DOCUMENTS: 'contractDocuments',
  CONTRACT_AUDITS: 'contractAudits',
};

// In-Memory Cache with TTL for Performance Optimization
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const memoryContractsCache = new Map<string, CacheEntry<ContractItem[]>>();
const memoryRatesCache = new Map<string, CacheEntry<ContractRateItem[]>>();

export function invalidateContractsCache(): void {
  memoryContractsCache.clear();
  memoryRatesCache.clear();
}

/**
 * ============================================================================
 * 1. CONTRACTS CRUD & QUERIES (PAGINATED & FILTERED)
 * ============================================================================
 */
export interface FetchContractsOptions {
  contractType?: ContractType;
  status?: ContractStatus | 'ALL';
  partyId?: string;
  searchQuery?: string;
  limitCount?: number;
  lastDoc?: DocumentSnapshot;
}

export interface FetchContractsResult {
  contracts: ContractItem[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
}

export async function fetchContracts(
  options: FetchContractsOptions = {}
): Promise<FetchContractsResult> {
  const {
    contractType,
    status,
    partyId,
    searchQuery,
    limitCount = 20,
    lastDoc,
  } = options;

  if (!db) {
    return { contracts: [], hasMore: false };
  }

  try {
    const collRef = collection(db, COLLECTIONS.CONTRACTS);
    const queryConstraints: any[] = [];

    // Filter by Contract Type (CUSTOMER vs SUPPLIER)
    if (contractType) {
      queryConstraints.push(where('contractType', '==', contractType));
    }

    // Filter by Status
    if (status && status !== 'ALL') {
      queryConstraints.push(where('status', '==', status));
    }

    // Filter by Customer or Supplier ID
    if (partyId) {
      queryConstraints.push(where('partyId', '==', partyId));
    }

    // Order by update timestamp or effective date
    queryConstraints.push(orderBy('updatedAt', 'desc'));

    // Pagination limit
    queryConstraints.push(limit(limitCount));

    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    const q = query(collRef, ...queryConstraints);
    const snap = await getDocs(q);

    let contracts = snap.docs.map(d => d.data() as ContractItem);

    // Client-side quick search for text matching contract number or party name
    if (searchQuery && searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      contracts = contracts.filter(c => 
        c.contractNumber.toLowerCase().includes(qLower) ||
        c.partyName.toLowerCase().includes(qLower) ||
        c.contractName.toLowerCase().includes(qLower) ||
        (c.partyCode && c.partyCode.toLowerCase().includes(qLower))
      );
    }

    const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
    const hasMore = snap.docs.length === limitCount;

    return {
      contracts,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching contracts from Firestore:', error);
    return { contracts: [], hasMore: false };
  }
}

/**
 * Fetch a single contract by ID
 */
export async function getContractById(contractId: string): Promise<ContractItem | null> {
  if (!db || !contractId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ContractItem;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching contract ${contractId}:`, error);
    return null;
  }
}

/**
 * Save or Update a Contract
 */
export async function saveContract(
  contract: ContractItem,
  actor: string = 'System'
): Promise<void> {
  if (!db) return;

  const docRef = doc(db, COLLECTIONS.CONTRACTS, contract.id);
  const now = new Date().toISOString();
  const isNew = !contract.createdAt;

  const dataToSave: ContractItem = {
    ...contract,
    createdAt: contract.createdAt || now,
    updatedAt: now,
    updatedBy: actor,
  };

  await setDoc(docRef, dataToSave, { merge: true });
  invalidateContractsCache();

  // Record Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId: contract.id,
    action: isNew ? 'CONTRACT_CREATED' : 'CONTRACT_UPDATED',
    performedBy: actor,
    timestamp: now,
    details: isNew 
      ? `Tạo mới hợp đồng [${contract.contractNumber}] cho đối tác [${contract.partyName}]` 
      : `Cập nhật thông tin hợp đồng [${contract.contractNumber}]`,
  });
}

/**
 * Change Contract Status via Lifecycle Workflow
 */
export async function updateContractStatus(
  contract: ContractItem,
  targetStatus: ContractStatus,
  actor: string,
  remarks?: string
): Promise<{ success: boolean; message: string }> {
  const validation = validateContractStatusTransition(contract.status, targetStatus, contract.expiryDate);
  if (!validation.isValid) {
    return { success: false, message: validation.messageVi };
  }

  if (!db) return { success: false, message: 'Firestore chưa sẵn sàng.' };

  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.CONTRACTS, contract.id);

  const updates: Partial<ContractItem> = {
    status: targetStatus,
    updatedAt: now,
    updatedBy: actor,
  };

  if (targetStatus === 'APPROVED') {
    updates.approvedBy = actor;
    updates.approvedAt = now;
  }

  if (remarks) {
    updates.reviewRemarks = remarks;
  }

  await updateDoc(docRef, updates as any);
  invalidateContractsCache();

  // Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId: contract.id,
    action: 'STATUS_CHANGED',
    performedBy: actor,
    timestamp: now,
    details: `Chuyển trạng thái hợp đồng từ [${contract.status}] sang [${targetStatus}]${remarks ? `. Ghi chú: ${remarks}` : ''}`,
    oldValue: contract.status,
    newValue: targetStatus,
  });

  return { success: true, message: `Đã cập nhật trạng thái hợp đồng thành [${targetStatus}].` };
}

/**
 * Create a New Version of a Contract (Preserves historical version)
 */
export async function createNewContractVersion(
  contract: ContractItem,
  newEffectiveDate: string,
  newExpiryDate: string,
  changeSummary: string,
  actor: string
): Promise<ContractItem> {
  if (!db) throw new Error('Database not connected');

  const oldVersionNum = contract.currentVersion;
  const newVersionNum = oldVersionNum + 1;
  const now = new Date().toISOString();

  // 1. Save Snapshot of Old Version to contractVersions
  const versionSnapshot: ContractVersionItem = {
    id: `ver-${contract.id}-V${oldVersionNum}`,
    contractId: contract.id,
    versionNumber: oldVersionNum,
    effectiveDate: contract.effectiveDate,
    expiryDate: contract.expiryDate,
    status: contract.status,
    changeSummary: `Lưu trữ phiên bản V${oldVersionNum}`,
    commercialTermsSnapshot: { ...contract.commercialTerms },
    volumeCommitmentSnapshot: { ...contract.volumeCommitment },
    ratesCount: contract.totalRatesCount || 0,
    createdBy: contract.updatedBy || actor,
    createdAt: contract.updatedAt || now,
  };

  await setDoc(doc(db, COLLECTIONS.CONTRACT_VERSIONS, versionSnapshot.id), versionSnapshot);

  // 2. Update Contract to New Version
  const updatedContract: ContractItem = {
    ...contract,
    currentVersion: newVersionNum,
    effectiveDate: newEffectiveDate,
    expiryDate: newExpiryDate,
    status: 'DRAFT', // New version starts as DRAFT for review
    updatedAt: now,
    updatedBy: actor,
  };

  await saveContract(updatedContract, actor);

  // 3. Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId: contract.id,
    action: 'VERSION_CREATED',
    performedBy: actor,
    timestamp: now,
    details: `Tạo phiên bản mới V${newVersionNum} (thay thế V${oldVersionNum}). Lý do: ${changeSummary}`,
    oldValue: `V${oldVersionNum}`,
    newValue: `V${newVersionNum}`,
  });

  return updatedContract;
}

/**
 * Delete a Contract (Safe soft delete / purge)
 */
export async function deleteContract(contractId: string): Promise<void> {
  if (!db || !contractId) return;
  await deleteDoc(doc(db, COLLECTIONS.CONTRACTS, contractId));
  invalidateContractsCache();
}

/**
 * ============================================================================
 * 2. CONTRACT RATES CRUD (ISOLATED & ON-DEMAND PER CONTRACT)
 * ============================================================================
 */
export interface FetchContractRatesOptions {
  serviceMode?: string;
  origin?: string;
  destination?: string;
  limitCount?: number;
}

export async function fetchContractRates(
  contractId: string,
  options: FetchContractRatesOptions = {}
): Promise<ContractRateItem[]> {
  if (!db || !contractId) return [];

  // Check memory cache
  const cacheKey = `rates_${contractId}`;
  const cached = memoryRatesCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const collRef = collection(db, COLLECTIONS.CONTRACT_RATES);
    const q = query(
      collRef,
      where('contractId', '==', contractId),
      orderBy('validTo', 'desc'),
      limit(options.limitCount || 200)
    );

    const snap = await getDocs(q);
    let rates = snap.docs.map(d => d.data() as ContractRateItem);

    if (options.serviceMode && options.serviceMode !== 'ALL') {
      rates = rates.filter(r => r.serviceMode === options.serviceMode);
    }

    memoryRatesCache.set(cacheKey, { data: rates, cachedAt: Date.now() });
    return rates;
  } catch (error) {
    console.error(`Error fetching rates for contract ${contractId}:`, error);
    return [];
  }
}

/**
 * Save a Contract Rate
 */
export async function saveContractRate(
  rate: ContractRateItem,
  actor: string = 'Pricing Specialist'
): Promise<void> {
  if (!db) return;

  const docRef = doc(db, COLLECTIONS.CONTRACT_RATES, rate.id);
  const now = new Date().toISOString();

  const dataToSave: ContractRateItem = {
    ...rate,
    createdAt: rate.createdAt || now,
    updatedAt: now,
  };

  await setDoc(docRef, dataToSave, { merge: true });
  memoryRatesCache.delete(`rates_${rate.contractId}`);

  // Increment rates count in contract
  try {
    const contractRef = doc(db, COLLECTIONS.CONTRACTS, rate.contractId);
    const contractSnap = await getDoc(contractRef);
    if (contractSnap.exists()) {
      const c = contractSnap.data() as ContractItem;
      await updateDoc(contractRef, {
        totalRatesCount: (c.totalRatesCount || 0) + 1,
        updatedAt: now,
      });
    }
  } catch (e) {
    console.warn('Could not update totalRatesCount on parent contract', e);
  }

  // Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId: rate.contractId,
    action: 'RATE_CREATED',
    performedBy: actor,
    timestamp: now,
    details: `Tạo/cập nhật biểu cước [${rate.rateCode}] tuyến ${rate.origin} -> ${rate.destination} (${rate.baseRate} ${rate.currency})`,
  });
}

/**
 * Batch Save Contract Rates (Chunked in 400 docs)
 */
export async function batchSaveContractRates(
  rates: ContractRateItem[],
  contractId: string,
  actor: string = 'Bulk Import'
): Promise<number> {
  if (!db || rates.length === 0) return 0;

  const chunkSize = 400; // Well below 500 Firestore writeBatch limit
  let totalSaved = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < rates.length; i += chunkSize) {
    const chunk = rates.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const rate of chunk) {
      const rateDocRef = doc(db, COLLECTIONS.CONTRACT_RATES, rate.id);
      batch.set(rateDocRef, {
        ...rate,
        createdAt: rate.createdAt || now,
        updatedAt: now,
      }, { merge: true });
      totalSaved++;
    }

    await batch.commit();
  }

  // Update rates count on contract
  try {
    const contractRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
    const contractSnap = await getDoc(contractRef);
    if (contractSnap.exists()) {
      const current = contractSnap.data() as ContractItem;
      await updateDoc(contractRef, {
        totalRatesCount: (current.totalRatesCount || 0) + totalSaved,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('Could not update totalRatesCount after bulk import', err);
  }

  memoryRatesCache.delete(`rates_${contractId}`);
  invalidateContractsCache();

  // Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId,
    action: 'RATES_IMPORTED',
    performedBy: actor,
    timestamp: now,
    details: `Nạp hàng loạt thành công ${totalSaved} biểu cước vào hợp đồng`,
  });

  return totalSaved;
}

/**
 * Delete a Contract Rate
 */
export async function deleteContractRate(
  rateId: string,
  contractId: string,
  actor: string = 'Pricing Specialist'
): Promise<void> {
  if (!db || !rateId) return;

  await deleteDoc(doc(db, COLLECTIONS.CONTRACT_RATES, rateId));
  memoryRatesCache.delete(`rates_${contractId}`);

  // Decrement rates count on contract
  try {
    const contractRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
    const contractSnap = await getDoc(contractRef);
    if (contractSnap.exists()) {
      const c = contractSnap.data() as ContractItem;
      const count = Math.max(0, (c.totalRatesCount || 1) - 1);
      await updateDoc(contractRef, {
        totalRatesCount: count,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Could not update totalRatesCount on rate delete', e);
  }

  // Audit
  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId,
    action: 'RATE_DELETED',
    performedBy: actor,
    timestamp: new Date().toISOString(),
    details: `Đã xóa biểu cước ID: ${rateId}`,
  });
}

/**
 * ============================================================================
 * 3. CONTRACT VERSIONS & DOCUMENTS & AUDIT TRAIL
 * ============================================================================
 */
export async function fetchContractVersions(contractId: string): Promise<ContractVersionItem[]> {
  if (!db || !contractId) return [];
  try {
    const collRef = collection(db, COLLECTIONS.CONTRACT_VERSIONS);
    const q = query(
      collRef,
      where('contractId', '==', contractId),
      orderBy('versionNumber', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ContractVersionItem);
  } catch (err) {
    console.error(`Error fetching versions for contract ${contractId}:`, err);
    return [];
  }
}

export async function fetchContractDocuments(contractId: string): Promise<ContractDocumentItem[]> {
  if (!db || !contractId) return [];
  try {
    const collRef = collection(db, COLLECTIONS.CONTRACT_DOCUMENTS);
    const q = query(
      collRef,
      where('contractId', '==', contractId),
      orderBy('uploadedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ContractDocumentItem);
  } catch (err) {
    console.error(`Error fetching documents for contract ${contractId}:`, err);
    return [];
  }
}

export async function saveContractDocument(
  docItem: ContractDocumentItem,
  actor: string
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, COLLECTIONS.CONTRACT_DOCUMENTS, docItem.id);
  await setDoc(docRef, docItem, { merge: true });

  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId: docItem.contractId,
    action: 'DOCUMENT_UPLOADED',
    performedBy: actor,
    timestamp: new Date().toISOString(),
    details: `Đã tải lên tài liệu [${docItem.fileName}] (Loại: ${docItem.documentType})`,
  });
}

export async function deleteContractDocument(docId: string, contractId: string, actor: string): Promise<void> {
  if (!db || !docId) return;
  await deleteDoc(doc(db, COLLECTIONS.CONTRACT_DOCUMENTS, docId));

  await recordContractAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    contractId,
    action: 'DOCUMENT_DELETED',
    performedBy: actor,
    timestamp: new Date().toISOString(),
    details: `Đã xóa tài liệu ID [${docId}]`,
  });
}

export async function fetchContractAudits(contractId: string): Promise<ContractAuditLogItem[]> {
  if (!db || !contractId) return [];
  try {
    const collRef = collection(db, COLLECTIONS.CONTRACT_AUDITS);
    const q = query(
      collRef,
      where('contractId', '==', contractId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ContractAuditLogItem);
  } catch (err) {
    console.error(`Error fetching audits for contract ${contractId}:`, err);
    return [];
  }
}

export async function recordContractAudit(audit: ContractAuditLogItem): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.CONTRACT_AUDITS, audit.id);
    await setDoc(docRef, audit);
  } catch (err) {
    console.warn('Could not record contract audit log', err);
  }
}
