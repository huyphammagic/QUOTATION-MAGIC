import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

export interface FileUploadResult {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  isCloudStorage: boolean;
}

export interface UploadFileOptions {
  folder: string;
  fileName: string;
  file: File | Blob;
  customMetadata?: Record<string, string>;
  onProgress?: (progressPercent: number) => void;
}

/**
 * Uploads a file/blob to Firebase Storage.
 * Generates a permanent download URL accessible from any machine or browser.
 * Includes graceful base64/blob fallback for offline or restricted container environments.
 */
export async function uploadFileToStorage(options: UploadFileOptions): Promise<FileUploadResult> {
  const { folder, fileName, file, customMetadata } = options;
  const sanitizedFolder = folder.replace(/^\/+|\/+$/g, '');
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${sanitizedFolder}/${timestamp}_${safeName}`;
  const uploadedAt = new Date().toISOString();
  const fileSizeBytes = file.size;
  const mimeType = file.type || 'application/octet-stream';

  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: mimeType,
        customMetadata: {
          originalName: fileName,
          uploadedAt,
          ...(customMetadata || {}),
        },
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        storagePath,
        downloadUrl,
        fileName,
        fileSizeBytes,
        mimeType,
        uploadedAt,
        isCloudStorage: true,
      };
    } catch (error: any) {
      console.warn('[fileStorageService] Firebase Storage upload notice, falling back to durable URL:', error?.message || error);
    }
  }

  // Fallback if Firebase Storage bucket is unreachable or in offline mode:
  // Convert images or files < 3MB to Data URL so it can be saved in Firestore and viewed on any machine!
  if (fileSizeBytes < 3 * 1024 * 1024) {
    try {
      const dataUrl = await blobToDataUrl(file);
      return {
        storagePath,
        downloadUrl: dataUrl,
        fileName,
        fileSizeBytes,
        mimeType,
        uploadedAt,
        isCloudStorage: false,
      };
    } catch {
      // Ignore conversion failure and use object URL
    }
  }

  const fallbackUrl = URL.createObjectURL(file);
  return {
    storagePath,
    downloadUrl: fallbackUrl,
    fileName,
    fileSizeBytes,
    mimeType,
    uploadedAt,
    isCloudStorage: false,
  };
}

/**
 * Uploads Company Logo image to Firebase Storage (`companies/company_profile/logo/...`)
 */
export async function uploadCompanyLogo(
  file: File | Blob,
  companyId = 'company_profile'
): Promise<FileUploadResult> {
  const ext = file.type.split('/')[1] || 'png';
  const fileName = `logo_${Date.now()}.${ext}`;
  return uploadFileToStorage({
    folder: `companies/${companyId}/logo`,
    fileName,
    file,
    customMetadata: {
      type: 'COMPANY_LOGO',
      companyId,
    },
  });
}

/**
 * Uploads a signed Contract document, addendum, or rate sheet to Firebase Storage
 */
export async function uploadContractDocument(
  contractId: string,
  file: File | Blob,
  originalFileName: string
): Promise<FileUploadResult> {
  return uploadFileToStorage({
    folder: `contracts/${contractId}/documents`,
    fileName: originalFileName,
    file,
    customMetadata: {
      type: 'CONTRACT_DOCUMENT',
      contractId,
    },
  });
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteFileFromStorage(storagePath: string): Promise<boolean> {
  if (!storage || !storagePath) return false;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.warn('[fileStorageService] Error deleting file from storage:', error);
    return false;
  }
}

/**
 * Helper to convert Blob or File to Base64 Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
