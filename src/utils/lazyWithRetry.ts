import React, { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loader with automatic retry and auto-recovery on chunk load failure.
 * Solves the common SPA issue: "Failed to fetch dynamically imported module" 
 * which occurs when a new version is deployed and old chunk hashes no longer exist on the server.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const storageKey = `retry-chunk-reload-${moduleName || 'common'}`;
    const hasReloaded = sessionStorage.getItem(storageKey) === 'true';

    try {
      // First attempt
      const module = await factory();
      // On success, clear the reload flag
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (initialError: any) {
      const isDynamicImportError =
        initialError?.message?.includes('Failed to fetch dynamically imported module') ||
        initialError?.message?.includes('Importing a module script failed') ||
        initialError?.message?.includes('error loading dynamically imported module') ||
        initialError?.name === 'ChunkLoadError' ||
        initialError?.message?.includes('Loading chunk');

      console.warn(`[lazyWithRetry] Error loading chunk for ${moduleName || 'module'}:`, initialError);

      if (isDynamicImportError) {
        // Attempt a second try after a short delay (in case of transient network hiccup)
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retryModule = await factory();
          sessionStorage.removeItem(storageKey);
          return retryModule;
        } catch (secondError) {
          console.warn(`[lazyWithRetry] Second attempt failed for ${moduleName || 'module'}:`, secondError);
        }

        // If not already reloaded in this session, trigger a transparent page reload to fetch new bundles
        if (!hasReloaded) {
          sessionStorage.setItem(storageKey, 'true');
          console.info(`[lazyWithRetry] New app build detected on server. Refreshing page to load latest version...`);
          window.location.reload();
          // Return a hanging promise to prevent React ErrorBoundary flashing before page unloads
          return new Promise<{ default: T }>(() => {});
        }
      }

      // If it still fails or already reloaded, throw the error to be captured by RouteErrorBoundary
      throw initialError;
    }
  });
}
