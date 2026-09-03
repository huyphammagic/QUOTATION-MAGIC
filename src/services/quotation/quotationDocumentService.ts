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
  QuotationAuditLog 
} from '../../types/quotationDocument';
import { DEFAULT_QUOTATION_TEMPLATES, DEFAULT_TERMS_TEMPLATES } from '../../data/defaultTemplates';
import { createQuotationDocumentSnapshot, validateQuotationForDocumentGeneration } from './quotationSanitizer';
import { generateQuotationPdf, GeneratedPdfResult } from './quotationPdfEngine';
import { uploadQuotationPdfToStorage } from '../firebase/pdfStorageService';

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
// LOCAL STORAGE CACHE HELPERS
// ==========================================

function getLocalDocuments(): QuotationDocumentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalDocuments(docs: QuotationDocumentRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  } catch (e) {
    console.warn('LocalStorage save documents error:', e);
  }
}

function getLocalTemplates(): QuotationTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return raw ? JSON.parse(raw) : DEFAULT_QUOTATION_TEMPLATES;
  } catch (e) {
    return DEFAULT_QUOTATION_TEMPLATES;
  }
}

function saveLocalTemplates(templates: QuotationTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.warn('LocalStorage save templates error:', e);
  }
}

function getLocalTerms(): QuotationTermsTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TERMS);
    return raw ? JSON.parse(raw) : DEFAULT_TERMS_TEMPLATES;
  } catch (e) {
    return DEFAULT_TERMS_TEMPLATES;
  }
}

function saveLocalTerms(terms: QuotationTermsTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TERMS, JSON.stringify(terms));
  } catch (e) {
    console.warn('LocalStorage save terms error:', e);
  }
}

function getLocalAuditLogs(): QuotationAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function appendLocalAuditLog(log: QuotationAuditLog) {
  try {
    const logs = [log, ...getLocalAuditLogs()].slice(0, 200);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.warn('LocalStorage save audit log error:', e);
  }
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
  const pdfResult = generateQuotationPdf(snapshot, template);

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
  const record: QuotationDocumentRecord = {
    id: docId,
    companyId,
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    revision,
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
  };

  // 8. Save record locally
  const localDocs = getLocalDocuments();
  saveLocalDocuments([record, ...localDocs]);

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
