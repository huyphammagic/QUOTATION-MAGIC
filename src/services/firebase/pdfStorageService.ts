import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

export interface StorageUploadResult {
  storagePath: string;
  downloadUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

/**
 * Uploads a generated PDF blob to Firebase Storage.
 * Falls back to browser Blob URL if Firebase Storage bucket is offline or not configured.
 */
export async function uploadQuotationPdfToStorage(
  companyId: string,
  quotationId: string,
  revision: number,
  fileName: string,
  pdfBlob: Blob
): Promise<StorageUploadResult> {
  const sanitizedCompanyId = (companyId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedQuoteId = (quotationId || 'quote').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `companies/${sanitizedCompanyId}/quotations/${sanitizedQuoteId}/pdf/rev-${revision}/${fileName}`;
  const fileSizeBytes = pdfBlob.size;
  const uploadedAt = new Date().toISOString();

  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, pdfBlob, {
        contentType: 'application/pdf',
        customMetadata: {
          companyId: sanitizedCompanyId,
          quotationId: sanitizedQuoteId,
          revision: revision.toString(),
          generatedAt: uploadedAt,
        },
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);
      return {
        storagePath,
        downloadUrl,
        fileSizeBytes,
        uploadedAt,
      };
    } catch (error) {
      console.warn('Firebase Storage upload notice, falling back to local object storage:', error);
    }
  }

  // Fallback to local Blob URL
  const downloadUrl = URL.createObjectURL(pdfBlob);
  return {
    storagePath,
    downloadUrl,
    fileSizeBytes,
    uploadedAt,
  };
}

/**
 * Deletes a PDF file from Firebase Storage
 */
export async function deleteQuotationPdfFromStorage(storagePath: string): Promise<boolean> {
  if (!storage || !storagePath) return false;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.warn('Error deleting PDF from storage:', error);
    return false;
  }
}
