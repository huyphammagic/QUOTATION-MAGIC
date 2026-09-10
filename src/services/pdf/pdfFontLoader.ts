import type { jsPDF } from 'jspdf';

/**
 * Enterprise Unicode Font Engine for Logistics PDF Documents
 * Licensed under SIL Open Font License 1.1 (OFL 1.1)
 * Font Family: Roboto (Regular, Bold, Italic)
 * Full Vietnamese Glyph Range & Diacritics Coverage
 */

export interface FontLoadingStatus {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  source: 'memory-cache' | 'network' | 'filesystem' | null;
}

// In-memory binary cache to ensure 0 redundant downloads per session
let cachedRegularBinary: string | null = null;
let cachedBoldBinary: string | null = null;
let cachedItalicBinary: string | null = null;

let isCurrentlyLoading = false;
let loadPromise: Promise<void> | null = null;
let lastError: string | null = null;
let fontSource: 'memory-cache' | 'network' | 'filesystem' | null = null;

/**
 * Normalizes any string to Unicode Normalization Form C (NFC).
 * Preserves 100% of Vietnamese diacritics, currencies, and punctuation.
 */
export function normalizeUnicode(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  // Standardize special unicode whitespace without stripping content
  const cleaned = str.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
  return cleaned.normalize('NFC');
}

/**
 * Converts ArrayBuffer to binary string compatible with jsPDF VFS
 */
function arrayBufferToBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return binary;
}

/**
 * Fetches font file across Browser (fetch) and Node.js (fs) environments
 */
async function fetchFontBinary(filename: string, nodeSubPath: string): Promise<string> {
  // 1. Browser runtime: Fetch from static public/fonts directory
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const response = await fetch(`/fonts/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading /fonts/${filename}`);
      }
      const buffer = await response.arrayBuffer();
      return arrayBufferToBinary(buffer);
    } catch (browserErr) {
      console.warn(`[pdfFontLoader] Network fetch for /fonts/${filename} notice:`, browserErr);
      // If relative fetch fails, try fallback
      throw browserErr;
    }
  }

  // 2. Node.js runtime (Automated testing / Server build / CI):
  try {
    // Dynamic import to prevent bundler errors in browser
    const fs = await import('fs');
    const path = await import('path');
    
    // Try public directory first
    const publicPath = path.resolve(process.cwd(), 'public', 'fonts', filename);
    if (fs.existsSync(publicPath)) {
      const buf = fs.readFileSync(publicPath);
      return arrayBufferToBinary(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    }

    // Try node_modules/@expo-google-fonts/roboto
    const nodePath = path.resolve(process.cwd(), 'node_modules', '@expo-google-fonts', 'roboto', nodeSubPath);
    if (fs.existsSync(nodePath)) {
      const buf = fs.readFileSync(nodePath);
      return arrayBufferToBinary(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    }

    throw new Error(`Font file ${filename} not found in public/fonts or node_modules`);
  } catch (nodeErr) {
    throw new Error(`Failed to load font ${filename}: ${nodeErr instanceof Error ? nodeErr.message : String(nodeErr)}`);
  }
}

/**
 * Preloads and caches Roboto fonts into memory.
 * Idempotent: Subsequent calls return immediately from cache.
 */
export async function preloadUnicodeFonts(): Promise<void> {
  if (cachedRegularBinary && cachedBoldBinary) {
    fontSource = 'memory-cache';
    return;
  }

  if (isCurrentlyLoading && loadPromise) {
    return loadPromise;
  }

  isCurrentlyLoading = true;
  lastError = null;

  loadPromise = (async () => {
    try {
      const [regular, bold, italic] = await Promise.all([
        fetchFontBinary('Roboto-Regular.ttf', '400Regular/Roboto_400Regular.ttf'),
        fetchFontBinary('Roboto-Bold.ttf', '700Bold/Roboto_700Bold.ttf'),
        fetchFontBinary('Roboto-Italic.ttf', '400Regular_Italic/Roboto_400Regular_Italic.ttf').catch(() => null),
      ]);

      cachedRegularBinary = regular;
      cachedBoldBinary = bold;
      cachedItalicBinary = italic;
      fontSource = typeof window !== 'undefined' ? 'network' : 'filesystem';
      lastError = null;
    } catch (err: any) {
      lastError = err?.message || 'Không thể tải font Unicode cho PDF.';
      console.error('[pdfFontLoader] Error preloading Unicode fonts:', err);
      throw new Error(lastError || 'Font loading failed');
    } finally {
      isCurrentlyLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Embeds Unicode Roboto fonts into a jsPDF document instance.
 * Sets the active font to 'Roboto'.
 */
export async function ensureUnicodeFonts(doc: jsPDF): Promise<void> {
  await preloadUnicodeFonts();

  if (!cachedRegularBinary || !cachedBoldBinary) {
    throw new Error(lastError || 'Không thể tải font Unicode cho PDF. Vui lòng kiểm tra kết nối.');
  }

  // 1. Embed Regular Font
  doc.addFileToVFS('Roboto-Regular.ttf', cachedRegularBinary);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  // 2. Embed Bold Font
  doc.addFileToVFS('Roboto-Bold.ttf', cachedBoldBinary);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  // 3. Embed Italic Font (if available)
  if (cachedItalicBinary) {
    doc.addFileToVFS('Roboto-Italic.ttf', cachedItalicBinary);
    doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
  } else {
    // Fallback italic to regular if not separately loaded
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'italic');
  }

  // Set default document font to Roboto
  doc.setFont('Roboto', 'normal');
}

/**
 * Returns current font loading state for UI progress / badges
 */
export function getFontLoadingStatus(): FontLoadingStatus {
  return {
    isLoaded: Boolean(cachedRegularBinary && cachedBoldBinary),
    isLoading: isCurrentlyLoading,
    error: lastError,
    source: fontSource,
  };
}
