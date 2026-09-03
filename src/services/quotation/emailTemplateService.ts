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
import { EmailTemplate, EmailTemplateType, CommunicationLanguage } from '../../types/quotationCommunication';
import { QuoteData } from '../../types/logistics';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { DEFAULT_EMAIL_TEMPLATES, ALLOWED_EMAIL_VARIABLES, FORBIDDEN_EMAIL_VARIABLES } from '../../data/defaultEmailTemplates';

const STORAGE_KEY = 'logiquote_email_templates_v1';
const COLLECTION_NAME = 'emailTemplates';

// Local storage fallback helper
function getLocalTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_EMAIL_TEMPLATES;
  } catch (e) {
    return DEFAULT_EMAIL_TEMPLATES;
  }
}

function saveLocalTemplates(templates: EmailTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn('LocalStorage save templates error:', e);
  }
}

export async function getEmailTemplates(companyId?: string): Promise<EmailTemplate[]> {
  if (!db) {
    return getLocalTemplates();
  }

  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items: EmailTemplate[] = [];
      snap.forEach(d => {
        items.push({ ...d.data() as EmailTemplate, id: d.id });
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      saveLocalTemplates(items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore getEmailTemplates fallback to local:', err);
  }

  // Seed default templates if empty
  const defaults = DEFAULT_EMAIL_TEMPLATES;
  saveLocalTemplates(defaults);
  return defaults;
}

export async function saveEmailTemplate(template: EmailTemplate): Promise<void> {
  const current = getLocalTemplates();
  const idx = current.findIndex(t => t.id === template.id);
  let updated: EmailTemplate[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    updated = [...current, { ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  }
  saveLocalTemplates(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTION_NAME, template.id);
    await setDoc(docRef, {
      ...template,
      updatedAt: new Date().toISOString(),
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveEmailTemplate sync notice:', err);
  }
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const current = getLocalTemplates().filter(t => t.id !== templateId);
  saveLocalTemplates(current);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, templateId));
  } catch (err) {
    console.warn('Firestore deleteEmailTemplate notice:', err);
  }
}

/**
 * Validates whether an email template contains any unauthorized or malicious variables
 */
export function validateTemplateVariables(text: string): {
  isValid: boolean;
  unknownVariables: string[];
  forbiddenViolations: string[];
} {
  const variableRegex = /\{\{([^{}]+)\}\}/g;
  let match;
  const foundVariables = new Set<string>();

  while ((match = variableRegex.exec(text)) !== null) {
    foundVariables.add(match[0].trim());
  }

  const unknownVariables: string[] = [];
  const forbiddenViolations: string[] = [];

  for (const v of foundVariables) {
    // Check forbidden keywords
    const lower = v.toLowerCase();
    for (const forbidden of FORBIDDEN_EMAIL_VARIABLES) {
      if (lower.includes(forbidden.toLowerCase())) {
        forbiddenViolations.push(v);
        break;
      }
    }

    if (!ALLOWED_EMAIL_VARIABLES.includes(v)) {
      unknownVariables.push(v);
    }
  }

  return {
    isValid: unknownVariables.length === 0 && forbiddenViolations.length === 0,
    unknownVariables,
    forbiddenViolations,
  };
}

export interface TemplateContextParams {
  quote: QuoteData;
  document?: QuotationDocumentRecord | null;
  secureLinkUrl?: string;
  revisionNumber?: number;
}

/**
 * Interpolates variables within subject and body templates safely using real quotation data
 */
export function renderEmailTemplate(
  templateText: string,
  params: TemplateContextParams
): string {
  const { quote, document, secureLinkUrl, revisionNumber } = params;

  // Formatting currency amounts cleanly
  const isVnd = quote.quoteCurrency === 'VND';
  const formattedTotal = isVnd
    ? new Intl.NumberFormat('vi-VN').format(Math.round(quote.grandTotalVnd))
    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quote.grandTotalUsd);

  const activeCurrency = quote.quoteCurrency || 'USD';
  const rev = revisionNumber !== undefined ? revisionNumber : (document?.revision ?? 1);
  const company = quote.company;
  const customer = quote.customer;
  const shipment = quote.shipment;
  const terms = quote.terms;

  const replacements: Record<string, string> = {
    '{{customerName}}': customer.companyName || customer.customerName || 'Quý Khách Hàng',
    '{{companyName}}': company.name || 'Công Ty Logistics',
    '{{quotationNumber}}': quote.quoteNumber || 'QT-PENDING',
    '{{revisionNumber}}': String(rev).padStart(2, '0'),
    '{{quotationDate}}': quote.createdDate || new Date().toISOString().slice(0, 10),
    '{{validUntil}}': terms.validityDate || 'Xem chi tiết trong tài liệu',
    '{{origin}}': shipment.pol || 'POL',
    '{{destination}}': shipment.pod || 'POD',
    '{{incoterm}}': terms.incoterm || 'FOB',
    '{{totalAmount}}': formattedTotal,
    '{{currency}}': activeCurrency,
    '{{salesName}}': company.salesRepName || 'Bộ phận kinh doanh',
    '{{salesEmail}}': company.salesRepEmail || company.email || '',
    '{{salesPhone}}': company.salesRepPhone || company.phone || '',
    '{{documentLink}}': secureLinkUrl || '#',
  };

  let rendered = templateText;
  for (const [key, val] of Object.entries(replacements)) {
    // Safe substitution without undefined or null
    const safeValue = val ?? '';
    rendered = rendered.split(key).join(safeValue);
  }

  // Safety fallback: Clean any remaining unmapped {{variable}} to empty string so user never sees 'undefined' or '[object Object]'
  rendered = rendered.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');

  return rendered;
}
