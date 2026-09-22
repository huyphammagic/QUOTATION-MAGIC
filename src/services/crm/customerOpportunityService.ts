import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc,
  query, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerOpportunity, OpportunityStage } from '../../types/crm';
import { logCRMAudit } from './crmAuditService';
import { logCustomerActivity } from './customerActivityService';

const COLLECTION_NAME = 'customerOpportunities';

export async function createCustomerOpportunity(
  opportunity: Omit<CustomerOpportunity, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email?: string; name?: string }
): Promise<CustomerOpportunity> {
  const id = `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newOpp: CustomerOpportunity = {
    ...opportunity,
    id,
    companyId: opportunity.companyId || 'default-company',
    stage: opportunity.stage || 'NEW',
    probability: opportunity.probability !== undefined ? opportunity.probability : 20,
    currency: opportunity.currency || 'USD',
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleanData: Record<string, any> = { ...newOpp, serverCreatedAt: serverTimestamp() };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      await logCustomerActivity({
        companyId: newOpp.companyId,
        customerId: newOpp.customerId,
        customerName: newOpp.customerName,
        activityType: 'NOTE_ADDED',
        occurredAt: now,
        createdBy: user?.email || newOpp.ownerId,
        createdByName: user?.name || newOpp.ownerName,
        relatedEntityType: 'OPPORTUNITY',
        relatedEntityId: id,
        relatedEntityNumber: newOpp.title,
        summary: `Tạo cơ hội bán hàng mới: ${newOpp.title}`,
        details: `Tuyến: ${newOpp.lane} | Mode: ${newOpp.serviceMode} | KL ước tính: ${newOpp.estimatedVolume || 'N/A'}`,
        nextAction: newOpp.nextAction,
        nextActionDue: newOpp.nextActionDue,
        visibility: 'INTERNAL',
      }, user);

      await logCRMAudit({
        companyId: newOpp.companyId,
        customerId: newOpp.customerId,
        entityType: 'OPPORTUNITY',
        entityId: id,
        action: 'OPPORTUNITY_CREATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: { title: newOpp.title, stage: newOpp.stage, lane: newOpp.lane }
      });
    } catch (err) {
      console.error('[CustomerOpportunityService] Failed to create opportunity:', err);
    }
  }

  return newOpp;
}

export async function getCustomerOpportunities(
  companyId: string,
  filters?: { customerId?: string; stage?: OpportunityStage | 'ALL'; ownerId?: string }
): Promise<CustomerOpportunity[]> {
  if (!db) return [];
  try {
    const collRef = collection(db, COLLECTION_NAME);
    let q = query(collRef, where('companyId', '==', companyId || 'default-company'), limit(200));

    if (filters?.customerId) {
      q = query(collRef, where('companyId', '==', companyId || 'default-company'), where('customerId', '==', filters.customerId), limit(100));
    }

    const snap = await getDocs(q);
    const list: CustomerOpportunity[] = [];
    snap.forEach(d => {
      const data = d.data() as CustomerOpportunity;
      if (filters?.stage && filters.stage !== 'ALL' && data.stage !== filters.stage) {
        return;
      }
      if (filters?.ownerId && data.ownerId !== filters.ownerId) {
        return;
      }
      list.push(data);
    });

    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  } catch (err) {
    console.error('[CustomerOpportunityService] Failed to get opportunities:', err);
    return [];
  }
}

export async function updateOpportunityStage(
  oppId: string,
  newStage: OpportunityStage,
  user?: { email?: string; name?: string },
  additional?: { lostReason?: string; probability?: number; notes?: string; nextAction?: string; nextActionDue?: string }
): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, oppId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const current = snap.data() as CustomerOpportunity;
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      stage: newStage,
      updatedAt: nowIso,
      ...additional,
    };

    if (newStage === 'WON') {
      updatePayload.wonAt = nowIso;
      updatePayload.probability = 100;
    } else if (newStage === 'LOST') {
      updatePayload.probability = 0;
      updatePayload.closedAt = nowIso;
    }

    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);
    await updateDoc(docRef, updatePayload);

    await logCustomerActivity({
      companyId: current.companyId,
      customerId: current.customerId,
      customerName: current.customerName,
      activityType: 'NOTE_ADDED',
      occurredAt: nowIso,
      createdBy: user?.email || 'user',
      createdByName: user?.name || 'User',
      relatedEntityType: 'OPPORTUNITY',
      relatedEntityId: oppId,
      relatedEntityNumber: current.title,
      summary: `Chuyển giai đoạn cơ hội sang: ${newStage}`,
      details: additional?.notes || (newStage === 'LOST' ? `Lý do thất bại: ${additional?.lostReason || 'N/A'}` : undefined),
      nextAction: additional?.nextAction || current.nextAction,
      visibility: 'INTERNAL',
    }, user);

    await logCRMAudit({
      companyId: current.companyId,
      customerId: current.customerId,
      entityType: 'OPPORTUNITY',
      entityId: oppId,
      action: `OPPORTUNITY_STAGE_${newStage}`,
      performedBy: user?.email || 'user',
      performedByName: user?.name || 'User',
      previousState: { stage: current.stage },
      newState: { stage: newStage, ...additional }
    });
  } catch (err) {
    console.error('[CustomerOpportunityService] Failed to update opportunity stage:', err);
  }
}
