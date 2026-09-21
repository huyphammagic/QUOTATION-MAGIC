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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData } from '../../types/logistics';
import { 
  QuotationDocumentRecord, 
  QuotationTemplate, 
  QuotationTermsTemplate, 
  QuotationDocumentType, 
  QuotationDocumentLanguage, 
  QuotationAuditLog,
  DocumentVisibility,
  DocumentEntityType
} from '../../types/quotationDocument';
import { DEFAULT_QUOTATION_TEMPLATES, DEFAULT_TERMS_TEMPLATES } from '../../data/defaultTemplates';
import { createQuotationDocumentSnapshot, validateQuotationForDocumentGeneration } from './quotationSanitizer';
import { generateQuotationPdf, GeneratedPdfResult } from './quotationPdfEngine';
import { uploadQuotationPdfToStorage } from '../firebase/pdfStorageService';
import { uploadFileToStorage } from '../firebase/fileStorageService';

const STORAGE_KEYS = {
  DOCUMENTS: 'logiquote_quotation_documents_v1',
  TEMPLATES: 'logiquote_quotation_templates_v1',
  TERMS: 'logiquote_quotation_terms_v1',
  AUDIT_LOGS: 'logiquote_audit_logs_v1',
};

const COLLECTIONS = {
  DOCUMENTS: 'quotationDocuments',
  TEMPLATES: 'quotationTemplates',
  TERMS: 'quotationTerms',
  AUDIT_LOGS: 'quotationAuditLogs',
};

// ==========================================
// IN-MEMORY CACHE (NO LOCAL STORAGE BUSINESS DATA - PHASE 17)
// ==========================================

let memoryDocuments: QuotationDocumentRecord[] = [];
let memoryTemplates: QuotationTemplate[] = DEFAULT_QUOTATION_TEMPLATES;
let memoryTerms: QuotationTermsTemplate[] = DEFAULT_TERMS_TEMPLATES;
let memoryAuditLogs: QuotationAuditLog[] = [];

function getLocalDocuments(): QuotationDocumentRecord[] {
  return memoryDocuments;
}

function saveLocalDocuments(docs: QuotationDocumentRecord[]) {
  memoryDocuments = docs;
}

function getLocalTemplates(): QuotationTemplate[] {
  return memoryTemplates.length > 0 ? memoryTemplates : DEFAULT_QUOTATION_TEMPLATES;
}

function saveLocalTemplates(templates: QuotationTemplate[]) {
  memoryTemplates = templates;
}

function getLocalTerms(): QuotationTermsTemplate[] {
  return memoryTerms.length > 0 ? memoryTerms : DEFAULT_TERMS_TEMPLATES;
}

function saveLocalTerms(terms: QuotationTermsTemplate[]) {
  memoryTerms = terms;
}

function getLocalAuditLogs(): QuotationAuditLog[] {
  return memoryAuditLogs;
}

function appendLocalAuditLog(log: QuotationAuditLog) {
  memoryAuditLogs = [log, ...memoryAuditLogs].slice(0, 200);
}

// ==========================================
// 1. TEMPLATES MANAGEMENT
// ==========================================

export async function getQuotationTemplates(): Promise<QuotationTemplate[]> {
  const local = getLocalTemplates();
  if (!db) return local;

  try {
    const q = query(collection(db, COLLECTIONS.TEMPLATES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: QuotationTemplate[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as QuotationTemplate, id: docSnap.id });
      });
      items.sort((a, b) => (a.isDefault ? -1 : 1));
      saveLocalTemplates(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load templates fallback to local:', error);
  }

  return local;
}

export async function saveQuotationTemplate(template: QuotationTemplate): Promise<void> {
  const local = getLocalTemplates();
  const idx = local.findIndex(t => t.id === template.id);
  const updated = idx >= 0 ? local.map((t, i) => i === idx ? template : t) : [template, ...local];
  saveLocalTemplates(updated);

  // Record audit log
  await recordAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    companyId: template.companyId || 'default',
    entityType: 'QUOTATION_TEMPLATE',
    entityId: template.id,
    action: idx >= 0 ? 'TEMPLATE_UPDATED' : 'TEMPLATE_CREATED',
    performedBy: 'Admin',
    timestamp: new Date().toISOString(),
    details: { templateCode: template.code, version: template.version },
  });

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.TEMPLATES, template.id);
    await setDoc(docRef, {
      ...template,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save template notice:', error);
  }
}

export async function setDefaultTemplate(templateId: string): Promise<void> {
  const local = getLocalTemplates();
  const updated = local.map(t => ({
    ...t,
    isDefault: t.id === templateId,
  }));
  saveLocalTemplates(updated);

  if (!db) return;

  try {
    for (const tmpl of updated) {
      const docRef = doc(db, COLLECTIONS.TEMPLATES, tmpl.id);
      await setDoc(docRef, { isDefault: tmpl.isDefault }, { merge: true });
    }
  } catch (error) {
    console.warn('Firestore set default template error:', error);
  }
}

// ==========================================
// 2. TERMS TEMPLATES MANAGEMENT
// ==========================================

export async function getQuotationTermsTemplates(): Promise<QuotationTermsTemplate[]> {
  const local = getLocalTerms();
  if (!db) return local;

  try {
    const q = query(collection(db, COLLECTIONS.TERMS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: QuotationTermsTemplate[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as QuotationTermsTemplate, id: docSnap.id });
      });
      saveLocalTerms(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load terms fallback to local:', error);
  }

  return local;
}

export async function saveQuotationTermsTemplate(terms: QuotationTermsTemplate): Promise<void> {
  const local = getLocalTerms();
  const idx = local.findIndex(t => t.id === terms.id);
  const updated = idx >= 0 ? local.map((t, i) => i === idx ? terms : t) : [terms, ...local];
  saveLocalTerms(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.TERMS, terms.id);
    await setDoc(docRef, {
      ...terms,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save terms notice:', error);
  }
}

// ==========================================
// 3. DOCUMENT GENERATION & ARCHIVE
// ==========================================

export interface GenerateDocumentOptions {
  quote: QuoteData;
  templateId?: string;
  documentType?: QuotationDocumentType;
  language?: QuotationDocumentLanguage;
  companyId?: string;
  generatedBy?: string;
  autoDownload?: boolean;
}

export async function generateAndSaveQuotationDocument(
  options: GenerateDocumentOptions
): Promise<{
  record: QuotationDocumentRecord;
  pdfResult: GeneratedPdfResult;
}> {
  const {
    quote,
    templateId,
    documentType = 'CUSTOMER_QUOTATION',
    language = 'bilingual',
    companyId = 'default',
    generatedBy = quote.company?.salesRepName || 'Sales Representative',
    autoDownload = true,
  } = options;

  // 1. Validate quote
  const validation = validateQuotationForDocumentGeneration(quote);
  if (!validation.isValid) {
    throw new Error(`Quotation validation failed: ${validation.errors.join(', ')}`);
  }

  // 2. Resolve template
  const templates = await getQuotationTemplates();
  const template = templates.find(t => t.id === templateId) || 
    templates.find(t => t.isDefault) || 
    DEFAULT_QUOTATION_TEMPLATES[0];

  // 3. Compute revision number
  const existingDocs = await getQuotationDocuments(quote.id);
  const revision = existingDocs.length + 1;

  // 4. Create immutable snapshot
  const snapshot = createQuotationDocumentSnapshot(
    quote,
    documentType,
    language,
    revision,
    generatedBy
  );

  // 5. Generate PDF
  const pdfResult = await generateQuotationPdf(snapshot, template);

  // 6. Upload PDF to Storage
  const uploadResult = await uploadQuotationPdfToStorage(
    companyId,
    quote.id,
    revision,
    pdfResult.fileName,
    pdfResult.blob
  );

  // 7. Create QuotationDocumentRecord
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Supersede previous documents of the same type for this quote
  const updatedPreviousDocs: QuotationDocumentRecord[] = [];
  for (const prevDoc of existingDocs) {
    if (prevDoc.documentType === documentType && prevDoc.isCurrent !== false) {
      const updatedPrev: QuotationDocumentRecord = {
        ...prevDoc,
        isCurrent: false,
        supersededBy: docId,
        supersededAt: uploadResult.uploadedAt,
        status: 'SUPERSEDED',
      };
      updatedPreviousDocs.push(updatedPrev);
      if (db) {
        try {
          const prevRef = doc(db, COLLECTIONS.DOCUMENTS, prevDoc.id);
          await setDoc(prevRef, {
            isCurrent: false,
            supersededBy: docId,
            supersededAt: uploadResult.uploadedAt,
            status: 'SUPERSEDED',
          }, { merge: true });
        } catch (prevErr) {
          console.warn('Error superseding previous document in Firestore:', prevErr);
        }
      }
    }
  }

  const record: QuotationDocumentRecord = {
    id: docId,
    documentId: docId,
    companyId,
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    revision,
    documentVersion: revision,
    documentType,
    language,
    templateId: template.id,
    templateVersion: template.version,
    templateName: template.name,
    currency: quote.quoteCurrency || 'USD',
    fileName: pdfResult.fileName,
    storagePath: uploadResult.storagePath,
    downloadUrl: uploadResult.downloadUrl,
    fileSizeBytes: uploadResult.fileSizeBytes,
    pageCount: pdfResult.pageCount,
    status: 'GENERATED',
    generatedBy,
    generatedAt: uploadResult.uploadedAt,
    snapshot,
    isCurrent: true,
    entityType: 'QUOTATION',
    entityId: quote.id,
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Customer',
    customerId: quote.customer?.id,
    visibility: documentType === 'INTERNAL_QUOTATION' ? 'INTERNAL' : 'CUSTOMER_VISIBLE',
    mimeType: 'application/pdf',
    generationState: 'SAVED',
  };

  // 8. Save record locally
  const localDocs = getLocalDocuments();
  const filteredLocal = localDocs.map(d => {
    const updated = updatedPreviousDocs.find(up => up.id === d.id);
    return updated || d;
  });
  saveLocalDocuments([record, ...filteredLocal]);

  // 9. Save record to Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, docId);
      await setDoc(docRef, {
        ...record,
        _createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Firestore document record save notice:', error);
    }
  }

  // 10. Audit Log
  await recordAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    companyId,
    quotationId: quote.id,
    entityType: 'QUOTATION_DOCUMENT',
    entityId: docId,
    action: 'PDF_GENERATED',
    performedBy: generatedBy,
    timestamp: new Date().toISOString(),
    details: {
      fileName: record.fileName,
      revision,
      documentType,
      fileSize: record.fileSizeBytes,
      pageCount: record.pageCount,
    },
  });

  // 11. Trigger direct browser download if requested
  if (autoDownload) {
    pdfResult.download();
  }

  return { record, pdfResult };
}

export async function getQuotationDocuments(quotationId?: string): Promise<QuotationDocumentRecord[]> {
  const local = getLocalDocuments();
  let list = local;

  if (db) {
    try {
      let q = query(collection(db, COLLECTIONS.DOCUMENTS));
      if (quotationId) {
        q = query(collection(db, COLLECTIONS.DOCUMENTS), where('quotationId', '==', quotationId));
      }
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const remoteItems: QuotationDocumentRecord[] = [];
        snapshot.forEach(docSnap => {
          remoteItems.push({ ...docSnap.data() as QuotationDocumentRecord, id: docSnap.id });
        });
        remoteItems.sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
        saveLocalDocuments(remoteItems);
        list = remoteItems;
      }
    } catch (error) {
      console.warn('Firestore load documents notice:', error);
    }
  }

  if (quotationId) {
    return list.filter(d => d.quotationId === quotationId);
  }
  return list;
}

export async function getDocumentById(documentId: string): Promise<QuotationDocumentRecord | null> {
  const local = getLocalDocuments();
  const found = local.find(d => d.id === documentId);
  if (found) return found;

  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const item = { ...snapshot.data() as QuotationDocumentRecord, id: snapshot.id };
        saveLocalDocuments([item, ...local]);
        return item;
      }
    } catch (error) {
      console.warn('Firestore load document by id notice:', error);
    }
  }

  return null;
}

export const getDocumentRecordsForQuotation = getQuotationDocuments;
export const getDocumentsForQuotation = getQuotationDocuments;

export async function archiveQuotationDocument(documentId: string): Promise<void> {
  const local = getLocalDocuments();
  const updated = local.map(d => d.id === documentId ? { ...d, status: 'ARCHIVED' as const } : d);
  saveLocalDocuments(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
    await setDoc(docRef, { status: 'ARCHIVED' }, { merge: true });
  } catch (error) {
    console.warn('Firestore archive document notice:', error);
  }
}

// ==========================================
// 4. AUDIT LOGS
// ==========================================

export async function recordAuditLog(log: QuotationAuditLog): Promise<void> {
  appendLocalAuditLog(log);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(docRef, {
      ...log,
      _timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firestore record audit log notice:', error);
  }
}

export async function getQuotationAuditLogs(quotationId?: string): Promise<QuotationAuditLog[]> {
  const local = getLocalAuditLogs();
  if (quotationId) {
    return local.filter(l => l.quotationId === quotationId);
  }
  return local;
}

/**
 * Fetches all quotation documents across the entire organization for aggregate analytics
 */
export async function getAllQuotationDocuments(): Promise<QuotationDocumentRecord[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.DOCUMENTS));
      if (!snap.empty) {
        const docs: QuotationDocumentRecord[] = [];
        snap.forEach(d => docs.push({ ...d.data() as QuotationDocumentRecord, id: d.id }));
        return docs;
      }
    } catch (error) {
      console.warn('Firestore getAllQuotationDocuments notice:', error);
    }
  }
  return getLocalDocuments();
}

// ==========================================
// 5. PHASE 40: CONTROL CENTER SUPPORTING DOCS & MANAGEMENT
// ==========================================

export interface UploadSupportingDocumentOptions {
  companyId: string;
  quotationId?: string;
  quotationNumber?: string;
  file: File;
  documentType: QuotationDocumentType;
  visibility?: DocumentVisibility;
  uploadedBy: string;
  notes?: string;
  customerName?: string;
  customerId?: string;
  entityType?: DocumentEntityType;
  entityId?: string;
}

/**
 * Uploads an arbitrary supporting document (Commercial Invoice, Packing List, Contract, etc.)
 * directly into Firebase Storage and registers it with full multi-company metadata.
 */
export async function uploadSupportingDocument(
  options: UploadSupportingDocumentOptions
): Promise<QuotationDocumentRecord> {
  const {
    companyId,
    quotationId = 'GENERAL',
    quotationNumber = 'GENERAL',
    file,
    documentType,
    visibility = 'CUSTOMER_VISIBLE',
    uploadedBy,
    notes = '',
    customerName,
    customerId,
    entityType = quotationId !== 'GENERAL' ? 'QUOTATION' : 'SUPPORTING',
    entityId = quotationId,
  } = options;

  const docId = `doc-attach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const sanitizedCompanyId = (companyId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedQuoteId = (quotationId || 'quote').replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = `companies/${sanitizedCompanyId}/quotations/${sanitizedQuoteId}/attachments/${docId}`;

  // Upload file to cloud storage
  const uploadRes = await uploadFileToStorage({
    folder,
    fileName: file.name,
    file,
    customMetadata: {
      companyId: sanitizedCompanyId,
      quotationId: sanitizedQuoteId,
      documentType,
      uploadedBy,
      docId,
    },
  });

  const now = new Date().toISOString();

  // Create document record (minimal dummy snapshot for attachment integrity)
  const dummySnapshot: any = {
    quotationId,
    quoteNumber: quotationNumber,
    revision: 1,
    createdDate: now.slice(0, 10),
    documentType,
    language: 'bilingual',
    currency: 'USD',
    exchangeRate: 25400,
    customer: { customerName: customerName || 'N/A' },
    shipment: { pol: '', pod: '' },
    items: [],
    terms: {},
    company: { name: sanitizedCompanyId },
    subtotalUsd: 0,
    subtotalVnd: 0,
    vatTotalUsd: 0,
    vatTotalVnd: 0,
    grandTotalUsd: 0,
    grandTotalVnd: 0,
  };

  const record: QuotationDocumentRecord = {
    id: docId,
    documentId: docId,
    companyId,
    quotationId,
    quotationNumber,
    revision: 1,
    documentVersion: 1,
    documentType,
    language: 'bilingual',
    templateId: 'custom-attachment',
    templateVersion: 1,
    templateName: file.name,
    currency: 'USD',
    fileName: file.name,
    storagePath: uploadRes.storagePath,
    downloadUrl: uploadRes.downloadUrl,
    fileSizeBytes: uploadRes.fileSizeBytes,
    pageCount: 1,
    status: 'AVAILABLE',
    generatedBy: uploadedBy,
    generatedAt: now,
    snapshot: dummySnapshot,
    notes,
    entityType,
    entityId,
    mimeType: uploadRes.mimeType || file.type || 'application/octet-stream',
    visibility,
    isCurrent: true,
    customerName,
    customerId,
    generationState: 'SAVED',
    uploadedFile: true,
  };

  // Save to memory
  const local = getLocalDocuments();
  saveLocalDocuments([record, ...local]);

  // Save to Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, docId);
      await setDoc(docRef, {
        ...record,
        _createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore save supporting document notice:', err);
    }
  }

  // Audit log
  await recordAuditLog({
    id: `audit-att-${Date.now()}`,
    companyId,
    quotationId,
    entityType: 'QUOTATION_DOCUMENT',
    entityId: docId,
    action: 'ATTACHMENT_UPLOADED',
    performedBy: uploadedBy,
    timestamp: now,
    details: {
      fileName: file.name,
      fileSize: uploadRes.fileSizeBytes,
      documentType,
      visibility,
    },
  });

  return record;
}

/**
 * Updates the visibility level of a document (e.g. Internal vs Customer Visible)
 */
export async function updateDocumentVisibility(
  documentId: string,
  visibility: DocumentVisibility,
  updatedBy: string = 'User'
): Promise<void> {
  const local = getLocalDocuments();
  const updated = local.map(d => d.id === documentId ? { ...d, visibility } : d);
  saveLocalDocuments(updated);

  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
      await setDoc(docRef, { visibility, _updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Firestore update document visibility notice:', e);
    }
  }

  await recordAuditLog({
    id: `audit-vis-${Date.now()}`,
    companyId: updated.find(d => d.id === documentId)?.companyId || 'default',
    quotationId: updated.find(d => d.id === documentId)?.quotationId || 'GENERAL',
    entityType: 'QUOTATION_DOCUMENT',
    entityId: documentId,
    action: 'VISIBILITY_CHANGED',
    performedBy: updatedBy,
    timestamp: new Date().toISOString(),
    details: { newVisibility: visibility },
  });
}

/**
 * Toggles a document between active and archived states
 */
export async function toggleDocumentArchive(
  documentId: string,
  archive: boolean,
  updatedBy: string = 'User'
): Promise<void> {
  const newStatus = archive ? 'ARCHIVED' : 'AVAILABLE';
  const local = getLocalDocuments();
  const updated = local.map(d => d.id === documentId ? { ...d, status: newStatus as any } : d);
  saveLocalDocuments(updated);

  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
      await setDoc(docRef, { status: newStatus, _updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Firestore toggle archive notice:', e);
    }
  }

  await recordAuditLog({
    id: `audit-arch-${Date.now()}`,
    companyId: updated.find(d => d.id === documentId)?.companyId || 'default',
    quotationId: updated.find(d => d.id === documentId)?.quotationId || 'GENERAL',
    entityType: 'QUOTATION_DOCUMENT',
    entityId: documentId,
    action: archive ? 'DOCUMENT_ARCHIVED' : 'DOCUMENT_RESTORED',
    performedBy: updatedBy,
    timestamp: new Date().toISOString(),
    details: { status: newStatus },
  });
}

/**
 * Multi-company scoped fetch for all documents belonging to a company
 */
export async function getCompanyQuotationDocuments(
  companyId: string,
  quotationId?: string
): Promise<QuotationDocumentRecord[]> {
  const all = await getQuotationDocuments(quotationId);
  if (!companyId || companyId === 'all') return all;
  return all.filter(d => !d.companyId || d.companyId === 'default' || d.companyId === companyId);
}

/**
 * System Health / Integrity check for Document Repository
 */
export async function checkDocumentsIntegrity(companyId?: string): Promise<{
  totalCount: number;
  healthyCount: number;
  missingUrlCount: number;
  supersededCount: number;
  archivedCount: number;
  totalSizeBytes: number;
  issues: string[];
}> {
  const allDocs = await getAllQuotationDocuments();
  const filtered = companyId && companyId !== 'all' 
    ? allDocs.filter(d => !d.companyId || d.companyId === companyId) 
    : allDocs;

  let missingUrlCount = 0;
  let supersededCount = 0;
  let archivedCount = 0;
  let totalSizeBytes = 0;
  const issues: string[] = [];

  filtered.forEach(doc => {
    totalSizeBytes += (doc.fileSizeBytes || 0);
    if (!doc.downloadUrl && !doc.storagePath) {
      missingUrlCount++;
      issues.push(`Document ${doc.id} (${doc.fileName}) is missing both downloadUrl and storagePath.`);
    }
    if (doc.status === 'SUPERSEDED' || doc.isCurrent === false) {
      supersededCount++;
    }
    if (doc.status === 'ARCHIVED') {
      archivedCount++;
    }
  });

  return {
    totalCount: filtered.length,
    healthyCount: filtered.length - missingUrlCount,
    missingUrlCount,
    supersededCount,
    archivedCount,
    totalSizeBytes,
    issues,
  };
}
