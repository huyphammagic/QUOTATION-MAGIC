import { ParsedDocumentData } from '../../types/documentParser';
import { SAMPLE_REAL_LOGISTICS_DOCUMENTS } from '../../data/sampleDocuments';

const STORAGE_KEY = 'logistics_parsed_documents_v1';

export function getAllParsedDocuments(): ParsedDocumentData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with samples
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_REAL_LOGISTICS_DOCUMENTS));
      return SAMPLE_REAL_LOGISTICS_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_REAL_LOGISTICS_DOCUMENTS));
    return SAMPLE_REAL_LOGISTICS_DOCUMENTS;
  } catch (e) {
    console.error('Error reading parsed documents from localStorage:', e);
    return SAMPLE_REAL_LOGISTICS_DOCUMENTS;
  }
}

export function saveParsedDocument(doc: ParsedDocumentData): void {
  try {
    const list = getAllParsedDocuments();
    const existingIdx = list.findIndex(item => item.id === doc.id);
    let updated: ParsedDocumentData[];
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = doc;
    } else {
      updated = [doc, ...list];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('logistics_parsed_documents_changed', { detail: updated }));
  } catch (e) {
    console.error('Error saving parsed document:', e);
  }
}

export function deleteParsedDocument(id: string): void {
  try {
    const list = getAllParsedDocuments();
    const updated = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('logistics_parsed_documents_changed', { detail: updated }));
  } catch (e) {
    console.error('Error deleting parsed document:', e);
  }
}

export function getParsedDocumentById(id: string): ParsedDocumentData | undefined {
  const list = getAllParsedDocuments();
  return list.find(item => item.id === id);
}
