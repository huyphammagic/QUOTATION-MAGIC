import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerActivity, CustomerActivityType } from '../../types/crm';
import { logCRMAudit } from './crmAuditService';

const COLLECTION_NAME = 'customerActivities';

export async function logCustomerActivity(
  activity: Omit<CustomerActivity, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email?: string; name?: string }
): Promise<CustomerActivity> {
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newActivity: CustomerActivity = {
    ...activity,
    id,
    companyId: activity.companyId || 'default-company',
    occurredAt: activity.occurredAt || now,
    createdBy: user?.email || activity.createdBy || 'system',
    createdByName: user?.name || activity.createdByName || 'System User',
    visibility: activity.visibility || 'INTERNAL',
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleanData: Record<string, any> = {
        ...newActivity,
        serverCreatedAt: serverTimestamp(),
      };
      // remove undefined
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      await logCRMAudit({
        companyId: newActivity.companyId,
        customerId: newActivity.customerId,
        entityType: 'ACTIVITY',
        entityId: id,
        action: `ACTIVITY_LOGGED_${newActivity.activityType}`,
        performedBy: newActivity.createdBy,
        performedByName: newActivity.createdByName,
        newState: { summary: newActivity.summary, activityType: newActivity.activityType }
      });
    } catch (err) {
      console.error('[CustomerActivityService] Failed to persist activity:', err);
    }
  }

  return newActivity;
}

export async function getCustomerActivities(
  companyId: string, 
  customerId: string, 
  maxCount: number = 50
): Promise<CustomerActivity[]> {
  if (!db || !customerId) return [];

  try {
    const collRef = collection(db, COLLECTION_NAME);
    // Query by customerId and companyId
    const q = query(
      collRef,
      where('companyId', '==', companyId || 'default-company'),
      where('customerId', '==', customerId),
      limit(maxCount)
    );

    const snap = await getDocs(q);
    const activities: CustomerActivity[] = [];
    snap.forEach(docSnap => {
      activities.push(docSnap.data() as CustomerActivity);
    });

    // Sort by occurredAt descending
    activities.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return activities;
  } catch (err) {
    console.error('[CustomerActivityService] Failed to fetch activities:', err);
    return [];
  }
}
