import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  QuotationCommunication, 
  QuotationTimelineEvent, 
  QuotationFollowUp, 
  EmailCommunicationStatus,
  EmailAttachmentSnapshot,
  CommunicationLanguage,
  QuotationCustomerResponse 
} from '../../types/quotationCommunication';
import { QuoteData } from '../../types/logistics';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { verifyCustomerQuotationSecurity } from './quotationSanitizer';
import { recordAuditLog, getDocumentsForQuotation } from './quotationDocumentService';
import { saveQuoteToFirestore } from '../firebase/firestoreService';
import { getCustomerResponses, getLinksForQuotation } from './quotationSecurityService';

const COLLECTION_COMMUNICATIONS = 'quotationCommunications';
const COLLECTION_FOLLOW_UPS = 'followUps';

// In-memory cache (NO LOCAL STORAGE BUSINESS DATA - PHASE 17)
let memoryCommunications: QuotationCommunication[] = [];
let memoryFollowUps: QuotationFollowUp[] = [];

function getLocalCommunications(): QuotationCommunication[] {
  return memoryCommunications;
}

function saveLocalCommunications(items: QuotationCommunication[]) {
  memoryCommunications = items;
}

function getLocalFollowUps(): QuotationFollowUp[] {
  return memoryFollowUps;
}

function saveLocalFollowUps(items: QuotationFollowUp[]) {
  memoryFollowUps = items;
}

/**
 * Phase 8 Rule: Checks whether a quotation is eligible to be sent to a customer.
 * MUST be APPROVED and have an official CUSTOMER_QUOTATION PDF.
 */
export function validateQuotationEligibleForSend(
  quote: QuoteData,
  selectedDoc: QuotationDocumentRecord | null
): {
  isEligible: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check 1: Approval status
  const approvedStatuses = ['APPROVED', 'ISSUED', 'SENT'];
  if (!approvedStatuses.includes(quote.status)) {
    errors.push('Quotation must be approved before sending. (Báo giá phải được phê duyệt trước khi gửi cho khách hàng).');
  }

  // Check 2: Customer document presence
  if (!selectedDoc) {
    errors.push('Chưa chọn tài liệu PDF Báo Giá Khách Hàng. Vui lòng tạo PDF Customer Quotation trước khi gửi.');
  } else {
    // Check 3: Strictly forbid internal quotations
    if (selectedDoc.documentType === 'INTERNAL_QUOTATION') {
      errors.push('NGUY HIỂM: Tài liệu được chọn là INTERNAL_QUOTATION (Báo Giá Nội Bộ có chứa giá vốn và lợi nhuận). Hệ thống cấm gửi tài liệu nội bộ cho khách hàng.');
    }

    // Check 4: Deep security check on snapshot
    const securityCheck = verifyCustomerQuotationSecurity(selectedDoc.snapshot);
    if (!securityCheck.isSecure) {
      errors.push(`Phát hiện vi phạm bảo mật dữ liệu khách hàng: ${securityCheck.violations.join('; ')}`);
    }
  }

  // Check 5: Customer Email format
  if (!quote.customer.email || !quote.customer.email.includes('@')) {
    errors.push('Địa chỉ email của khách hàng không hợp lệ hoặc đang để trống.');
  }

  return {
    isEligible: errors.length === 0,
    errors,
  };
}

export interface SendQuotationParams {
  quote: QuoteData;
  document: QuotationDocumentRecord;
  additionalAttachments?: QuotationDocumentRecord[];
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  secureLinkId?: string;
  secureLinkUrl?: string;
  language: CommunicationLanguage;
  sentBy: string;
  sentByName?: string;
  templateId?: string;
  idempotencyKey?: string;
}

/**
 * Executes quotation email dispatch, records immutable history, and updates quote status
 */
export async function dispatchQuotationEmail(params: SendQuotationParams): Promise<{
  success: boolean;
  communication: QuotationCommunication;
  error?: string;
}> {
  const { 
    quote, 
    document, 
    additionalAttachments = [], 
    recipients, 
    cc, 
    bcc, 
    subject, 
    bodyHtml, 
    secureLinkId, 
    secureLinkUrl, 
    language, 
    sentBy, 
    sentByName, 
    templateId,
    idempotencyKey: customIdempotencyKey
  } = params;

  // 1. Double check eligibility
  const validation = validateQuotationEligibleForSend(quote, document);
  if (!validation.isEligible) {
    return {
      success: false,
      communication: null as any,
      error: validation.errors.join(' | '),
    };
  }

  // Idempotency Check: Prevent duplicate sends from rapid clicking or retries
  const idempotencyKey = customIdempotencyKey || `${quote.id}_rev${document.revision}_${recipients.slice().sort().join('_')}_${Math.floor(Date.now() / 60000)}`;
  const currentLocal = getLocalCommunications();
  const existingComm = currentLocal.find(c => 
    (c.idempotencyKey && c.idempotencyKey === idempotencyKey) ||
    (c.quotationId === quote.id && c.documentId === document.id && c.status === 'SENT' && (Date.now() - new Date(c.createdAt).getTime() < 30000))
  );

  if (existingComm) {
    console.warn('[Idempotency Guard] Duplicate email dispatch prevented for key:', idempotencyKey);
    return {
      success: true,
      communication: existingComm,
    };
  }

  // 2. Prepare attachment snapshot (primary doc + any additional attachments)
  const attachmentSnapshot: EmailAttachmentSnapshot[] = [
    {
      documentId: document.id,
      fileName: document.fileName,
      storagePath: document.storagePath,
      downloadUrl: document.downloadUrl,
      revision: document.revision,
      documentType: document.documentType as any,
      language: document.language,
      fileSizeBytes: document.fileSizeBytes,
    }
  ];

  const attachmentIds: string[] = [document.id];

  if (additionalAttachments && additionalAttachments.length > 0) {
    additionalAttachments.forEach(att => {
      if (!attachmentIds.includes(att.id)) {
        attachmentIds.push(att.id);
        attachmentSnapshot.push({
          documentId: att.id,
          fileName: att.fileName,
          storagePath: att.storagePath,
          downloadUrl: att.downloadUrl,
          revision: att.revision || 1,
          documentType: (att.documentType as any) || 'OTHER_ATTACHMENT',
          language: att.language || 'bilingual',
          fileSizeBytes: att.fileSizeBytes,
        });
      }
    });
  }

  const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const commRecord: QuotationCommunication = {
    id: commId,
    companyId: document.companyId || (quote as any).companyId || 'default-company',
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    documentId: document.id,
    revision: document.revision,
    communicationType: 'EMAIL_QUOTATION',
    recipients,
    cc: cc || [],
    bcc: bcc || [],
    subject,
    bodySnapshot: bodyHtml,
    attachmentIds,
    attachmentSnapshot,
    secureLinkId,
    secureLinkUrl,
    language,
    status: 'SENT',
    sentBy,
    sentByName: sentByName || 'Sales Executive',
    sentAt: now,
    deliveredAt: now,
    templateId,
    templateVersion: 1,
    createdAt: now,
    updatedAt: now,
    idempotencyKey,
    attemptCount: 1,
    lastAttemptAt: now,
    retryable: true,
    customerId: quote.customer?.id,
    customerName: quote.customer?.companyName || quote.customer?.customerName,
    totalAmount: quote.quoteCurrency === 'VND' ? quote.grandTotalVnd : quote.grandTotalUsd,
    currency: quote.quoteCurrency || 'USD',
    channel: 'EMAIL',
    deliveryDetails: {
      provider: 'Cloud Native Mailer',
      acceptedAt: now,
    },
  };

  // Try calling server-side API if available
  try {
    const res = await fetch('/api/quotation/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationId: commId,
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        recipients,
        cc,
        bcc,
        subject,
        bodyHtml,
        secureLinkUrl,
        attachment: attachmentSnapshot[0],
        sentBy,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status) {
        commRecord.status = data.status;
      }
    }
  } catch (apiErr) {
    console.log('Server-side email API dispatch noted (proceeding with Firestore persistence):', apiErr);
  }

  // 3. Save to memory cache
  const latestLocal = getLocalCommunications();
  saveLocalCommunications([commRecord, ...latestLocal]);

  // 4. Save to Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_COMMUNICATIONS, commId);
      await setDoc(docRef, {
        ...commRecord,
        _serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore communication record error:', err);
    }
  }

  // 5. Create Audit Log
  await recordAuditLog({
    id: `audit_comm_${Date.now()}`,
    companyId: document.companyId || 'default-company',
    quotationId: quote.id,
    entityType: 'QUOTATION_COMMUNICATION',
    entityId: commId,
    action: 'QUOTATION_SENT',
    performedBy: sentBy,
    timestamp: now,
    details: {
      recipients,
      cc,
      documentId: document.id,
      fileName: document.fileName,
      secureLinkUrl,
      subject,
    },
  });

  // 6. Update Quote Status to SENT (or ISSUED if already approved)
  const updatedQuote: QuoteData = {
    ...quote,
    status: 'SENT',
    updatedDate: new Date().toISOString().slice(0, 10),
  };
  await saveQuoteToFirestore(updatedQuote);

  return {
    success: true,
    communication: commRecord,
  };
}

/**
 * Retrieves communications history for a quotation
 */
export async function getCommunicationsForQuotation(quotationId: string): Promise<QuotationCommunication[]> {
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_COMMUNICATIONS),
        where('quotationId', '==', quotationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items: QuotationCommunication[] = [];
        snap.forEach(d => items.push({ ...d.data() as QuotationCommunication, id: d.id }));
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return items;
      }
    } catch (err) {
      console.warn('Firestore getCommunications error:', err);
    }
  }

  const local = getLocalCommunications();
  return local.filter(c => c.quotationId === quotationId);
}

/**
 * Follow-up Management
 */
export async function createFollowUp(followUp: QuotationFollowUp): Promise<void> {
  const local = getLocalFollowUps();
  saveLocalFollowUps([followUp, ...local]);

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_FOLLOW_UPS, followUp.id);
      await setDoc(docRef, {
        ...followUp,
        _serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore create follow-up error:', err);
    }
  }

  // Audit log
  await recordAuditLog({
    id: `audit_followup_${Date.now()}`,
    companyId: followUp.companyId || 'default-company',
    quotationId: followUp.quotationId,
    entityType: 'QUOTATION_FOLLOW_UP',
    entityId: followUp.id,
    action: 'FOLLOW_UP_CREATED',
    performedBy: followUp.assignedToName || 'Sales Rep',
    timestamp: new Date().toISOString(),
    details: {
      followUpDate: followUp.followUpDate,
      priority: followUp.priority,
      note: followUp.note,
    },
  });
}

export async function updateFollowUpStatus(
  followUpId: string, 
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  completedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  const local = getLocalFollowUps();
  const idx = local.findIndex(f => f.id === followUpId);
  if (idx >= 0) {
    local[idx].status = status;
    if (status === 'COMPLETED') {
      local[idx].completedAt = now;
      local[idx].completedBy = completedBy;
    }
    local[idx].updatedAt = now;
    saveLocalFollowUps(local);
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_FOLLOW_UPS, followUpId);
      await updateDoc(docRef, {
        status,
        completedAt: status === 'COMPLETED' ? now : null,
        completedBy: status === 'COMPLETED' ? completedBy : null,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Firestore update follow-up error:', err);
    }
  }
}

export async function getFollowUpsForQuotation(quotationId: string): Promise<QuotationFollowUp[]> {
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_FOLLOW_UPS),
        where('quotationId', '==', quotationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items: QuotationFollowUp[] = [];
        snap.forEach(d => items.push({ ...d.data() as QuotationFollowUp, id: d.id }));
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return items;
      }
    } catch (err) {
      console.warn('Firestore getFollowUps error:', err);
    }
  }

  const local = getLocalFollowUps();
  return local.filter(f => f.quotationId === quotationId);
}

/**
 * Builds a comprehensive chronological timeline of all events for this quotation
 */
export async function buildQuotationTimeline(quote: QuoteData): Promise<QuotationTimelineEvent[]> {
  const events: QuotationTimelineEvent[] = [];

  // 1. Quotation creation
  if (quote.createdDate) {
    events.push({
      id: `evt_created_${quote.id}`,
      type: 'CREATED',
      title: 'Khởi Tạo Báo Giá (Draft Created)',
      description: `Báo giá ${quote.quoteNumber} được tạo cho khách hàng ${quote.customer.companyName || quote.customer.customerName}`,
      timestamp: `${quote.createdDate}T08:00:00Z`,
      actor: quote.company.salesRepName || 'Pricing Specialist',
      badgeColor: 'blue',
      details: {
        totalUsd: quote.grandTotalUsd,
        totalVnd: quote.grandTotalVnd,
      }
    });
  }

  // 2. Approval status event
  if (quote.status === 'APPROVED' || quote.status === 'ISSUED' || quote.status === 'SENT' || quote.status === 'ACCEPTED') {
    events.push({
      id: `evt_approved_${quote.id}`,
      type: 'APPROVED',
      title: 'Phê Duyệt Báo Giá (Quotation Approved)',
      description: `Báo giá chính thức được phê duyệt bởi Ban Quản Trị / Pricing Manager. Sẵn sàng phát hành tài liệu và gửi khách hàng.`,
      timestamp: quote.updatedDate ? `${quote.updatedDate}T09:00:00Z` : new Date().toISOString(),
      actor: 'Pricing / Operations Manager',
      badgeColor: 'emerald',
    });
  }

  // 3. Document PDFs generated
  const docs = await getDocumentsForQuotation(quote.id);
  docs.forEach(d => {
    events.push({
      id: `evt_doc_${d.id}`,
      type: 'PDF_GENERATED',
      title: `Tạo Bản In PDF (${d.documentType === 'CUSTOMER_QUOTATION' ? 'Báo Giá Khách Hàng' : 'Nội Bộ'})`,
      description: `Tạo thành công tài liệu PDF ${d.fileName} (Phiên bản Rev ${d.revision})`,
      timestamp: d.generatedAt,
      actor: d.generatedBy,
      badgeColor: d.documentType === 'CUSTOMER_QUOTATION' ? 'indigo' : 'purple',
      details: {
        pages: d.pageCount,
        fileSize: d.fileSizeBytes,
      }
    });
  });

  // 4. Secure Links created & viewed
  const links = await getLinksForQuotation(quote.id);
  links.forEach(l => {
    events.push({
      id: `evt_link_${l.id}`,
      type: 'PDF_GENERATED',
      title: `Tạo Liên Kết Báo Giá Trực Tuyến (${l.status})`,
      description: `Tạo liên kết an toàn bảo mật có hiệu lực đến ${new Date(l.expiresAt).toLocaleDateString('vi-VN')}`,
      timestamp: l.createdAt,
      actor: l.createdBy,
      badgeColor: 'sky',
    });

    if (l.viewCount > 0 && l.firstViewedAt) {
      events.push({
        id: `evt_view_${l.id}`,
        type: 'OPENED',
        title: `Khách Hàng Đã Mở Xem Báo Giá Trực Tuyến (${l.viewCount} lượt xem)`,
        description: `Khách hàng ${l.customerName} đã truy cập xem báo giá. Lần xem gần nhất: ${new Date(l.lastViewedAt || l.firstViewedAt).toLocaleString('vi-VN')}`,
        timestamp: l.lastViewedAt || l.firstViewedAt,
        actor: l.customerName,
        badgeColor: 'amber',
      });
    }
  });

  // 5. Emails Sent & Delivered
  const comms = await getCommunicationsForQuotation(quote.id);
  comms.forEach(c => {
    events.push({
      id: `evt_comm_${c.id}`,
      type: 'SENT',
      title: `Gửi Email Báo Giá Đến Khách Hàng (${c.status})`,
      description: `Đã gửi báo giá đến: ${c.recipients.join(', ')} với tiêu đề: "${c.subject}"`,
      timestamp: c.sentAt || c.createdAt,
      actor: c.sentByName || c.sentBy,
      badgeColor: 'blue',
      details: {
        recipients: c.recipients,
        cc: c.cc,
      }
    });
  });

  // 6. Customer Responses (Accepted, Rejected, Revision Requested)
  const responses = await getCustomerResponses(quote.id);
  responses.forEach(r => {
    let evtType: QuotationTimelineEvent['type'] = 'ACCEPTED';
    let title = 'Khách Hàng Chấp Nhận Báo Giá (Accepted)';
    let badgeColor = 'emerald';
    let desc = `Khách hàng ${r.customerName} (${r.customerEmail}) đã bấm CHẤP NHẬN báo giá chính thức.`;

    if (r.responseType === 'REJECTED') {
      evtType = 'REJECTED';
      title = 'Khách Hàng Từ Chối Báo Giá (Rejected)';
      badgeColor = 'rose';
      desc = `Khách hàng từ chối. Lý do: ${r.rejectionReason || 'Không có lý do chi tiết'}. Ghi chú: ${r.notes || 'Không'}`;
    } else if (r.responseType === 'REVISION_REQUESTED') {
      evtType = 'REVISION_REQUESTED';
      title = 'Khách Hàng Yêu Cầu Chỉnh Sửa (Revision Requested)';
      badgeColor = 'violet';
      desc = `Khách hàng yêu cầu điều chỉnh báo giá: "${r.revisionMessage || r.notes || ''}"`;
    }

    events.push({
      id: `evt_resp_${r.id}`,
      type: evtType,
      title,
      description: desc,
      timestamp: r.respondedAt,
      actor: r.customerName,
      badgeColor,
    });
  });

  // 7. Follow-ups
  const followUps = await getFollowUpsForQuotation(quote.id);
  followUps.forEach(f => {
    events.push({
      id: `evt_followup_${f.id}`,
      type: 'FOLLOW_UP',
      title: `Lên Lịch Chăm Sóc / Follow-Up (${f.status})`,
      description: `Hạn xử lý: ${f.followUpDate} - Mức ưu tiên: ${f.priority}. Nội dung: "${f.note}"`,
      timestamp: f.createdAt,
      actor: f.assignedToName || 'Sales Rep',
      badgeColor: f.status === 'COMPLETED' ? 'emerald' : 'orange',
    });
  });

  // Sort events newest first
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return events;
}

/**
 * Fetches all communications across the entire company for aggregate analytics
 */
export async function getAllCommunications(): Promise<QuotationCommunication[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_COMMUNICATIONS));
      if (!snap.empty) {
        const items: QuotationCommunication[] = [];
        snap.forEach(d => items.push({ ...d.data() as QuotationCommunication, id: d.id }));
        return items;
      }
    } catch (err) {
      console.warn('Firestore getAllCommunications error:', err);
    }
  }
  return getLocalCommunications();
}

/**
 * Fetches all follow-up tasks across the organization for analytics and task health
 */
export async function getAllFollowUps(): Promise<QuotationFollowUp[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_FOLLOW_UPS));
      if (!snap.empty) {
        const items: QuotationFollowUp[] = [];
        snap.forEach(d => items.push({ ...d.data() as QuotationFollowUp, id: d.id }));
        return items;
      }
    } catch (err) {
      console.warn('Firestore getAllFollowUps error:', err);
    }
  }
  return getLocalFollowUps();
}

/**
 * Phase 40: Retries a failed or queued quotation email dispatch
 */
export async function retryQuotationEmail(
  communicationId: string,
  retriedBy: string = 'Sales Representative'
): Promise<{ success: boolean; error?: string }> {
  const local = getLocalCommunications();
  const comm = local.find(c => c.id === communicationId);
  if (!comm) {
    return { success: false, error: 'Bản ghi giao tiếp không tồn tại.' };
  }

  const currentAttempt = (comm.attemptCount || 1) + 1;
  if (currentAttempt > 5) {
    return { success: false, error: 'Đã vượt quá số lần thử lại tối đa (5 lần).' };
  }

  const now = new Date().toISOString();
  let dispatchSuccess = true;
  let errorMsg = '';

  try {
    const res = await fetch('/api/quotation/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationId: comm.id,
        quotationId: comm.quotationId,
        quoteNumber: comm.quotationNumber,
        recipients: comm.recipients,
        cc: comm.cc,
        bcc: comm.bcc,
        subject: comm.subject,
        bodyHtml: comm.bodySnapshot,
        secureLinkUrl: comm.secureLinkUrl,
        attachment: comm.attachmentSnapshot?.[0],
        sentBy: retriedBy,
      }),
    });

    if (!res.ok) {
      dispatchSuccess = false;
      errorMsg = `Server error: ${res.statusText}`;
    }
  } catch (err: any) {
    dispatchSuccess = false;
    errorMsg = err.message || 'Lỗi mạng khi kết nối server mailer.';
  }

  const updatedStatus = dispatchSuccess ? 'SENT' : 'FAILED';
  const updatedComm: QuotationCommunication = {
    ...comm,
    status: updatedStatus,
    attemptCount: currentAttempt,
    lastAttemptAt: now,
    sentAt: dispatchSuccess ? now : comm.sentAt,
    deliveredAt: dispatchSuccess ? now : comm.deliveredAt,
    failureReason: dispatchSuccess ? undefined : errorMsg,
    errorHistory: [
      ...(comm.errorHistory || []),
      ...(dispatchSuccess ? [] : [{ timestamp: now, error: errorMsg }]),
    ],
    updatedAt: now,
  };

  const updatedList = local.map(c => c.id === communicationId ? updatedComm : c);
  saveLocalCommunications(updatedList);

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_COMMUNICATIONS, communicationId);
      await setDoc(docRef, {
        status: updatedStatus,
        attemptCount: currentAttempt,
        lastAttemptAt: now,
        sentAt: updatedComm.sentAt,
        deliveredAt: updatedComm.deliveredAt,
        failureReason: updatedComm.failureReason || null,
        errorHistory: updatedComm.errorHistory || [],
        updatedAt: now,
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore update retry notice:', e);
    }
  }

  await recordAuditLog({
    id: `audit-retry-${Date.now()}`,
    companyId: comm.companyId,
    quotationId: comm.quotationId,
    entityType: 'QUOTATION_COMMUNICATION',
    entityId: communicationId,
    action: dispatchSuccess ? 'EMAIL_RETRY_SUCCESS' : 'EMAIL_RETRY_FAILED',
    performedBy: retriedBy,
    timestamp: now,
    details: {
      attempt: currentAttempt,
      success: dispatchSuccess,
      error: errorMsg,
    },
  });

  return {
    success: dispatchSuccess,
    error: dispatchSuccess ? undefined : errorMsg,
  };
}

/**
 * Multi-company scoped retrieval of communications
 */
export async function getCompanyCommunications(
  companyId: string,
  quotationId?: string
): Promise<QuotationCommunication[]> {
  const all = await getAllCommunications();
  let filtered = all;
  if (companyId && companyId !== 'all') {
    filtered = filtered.filter(c => !c.companyId || c.companyId === 'default' || c.companyId === companyId);
  }
  if (quotationId) {
    filtered = filtered.filter(c => c.quotationId === quotationId);
  }
  return filtered;
}

/**
 * System Health / Integrity check for Communications
 */
export async function checkCommunicationIntegrity(companyId?: string): Promise<{
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  activeLinksCount: number;
  averageAttempts: number;
}> {
  const comms = await getAllCommunications();
  const filtered = companyId && companyId !== 'all'
    ? comms.filter(c => !c.companyId || c.companyId === companyId)
    : comms;

  const totalSent = filtered.filter(c => c.status === 'SENT' || c.status === 'DELIVERED').length;
  const totalFailed = filtered.filter(c => c.status === 'FAILED').length;
  const totalOpened = filtered.filter(c => c.status === 'OPENED').length;
  const attemptsSum = filtered.reduce((acc, c) => acc + (c.attemptCount || 1), 0);
  const averageAttempts = filtered.length > 0 ? parseFloat((attemptsSum / filtered.length).toFixed(2)) : 1;

  return {
    totalSent,
    totalFailed,
    totalOpened,
    activeLinksCount: filtered.filter(c => !!c.secureLinkId).length,
    averageAttempts,
  };
}
