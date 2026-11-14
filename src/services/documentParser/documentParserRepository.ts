import { ParsedDocumentData } from '../../types/documentParser';
import { getModuleData, setModuleData } from '../firebase/cloudStorageVaultService';

export function getAllParsedDocuments(): ParsedDocumentData[] {
  try {
    return [...getModuleData<ParsedDocumentData[]>('parsed_documents', [])];
  } catch (e) {
    console.error('Error reading parsed documents from cloud vault:', e);
    return [];
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
    setModuleData('parsed_documents', updated);
  } catch (e) {
    console.error('Error saving parsed document:', e);
  }
}

export function deleteParsedDocument(id: string): void {
  try {
    const list = getAllParsedDocuments();
    const updated = list.filter(item => item.id !== id);
    setModuleData('parsed_documents', updated);
  } catch (e) {
    console.error('Error deleting parsed document:', e);
  }
}

export function getParsedDocumentById(id: string): ParsedDocumentData | undefined {
  const list = getAllParsedDocuments();
  return list.find(item => item.id === id);
}
