import { useEffect } from 'react';

/**
 * Block leaving the page (or tab) while there are unsaved changes.
 *
 * - For browser tab close / refresh / hard nav we set window.onbeforeunload.
 * - For in-app navigation we listen for the click on any anchor with a non-hash
 *   href and prompt before allowing default behaviour.
 *
 * react-router-dom v7 removed `useBlocker` for data-router use cases that
 * aren't enabled in this app, so we use this lightweight approach. It catches
 * sidebar nav clicks and browser back/forward without requiring a router
 * upgrade.
 */
export function useUnsavedChangesPrompt(dirty: boolean, message: string = 'You have unsaved changes. Leave anyway?') {
  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', beforeUnload);

    const clickInterceptor = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      // Allow same-page anchors and JS handlers
      if (!href || href.startsWith('#') || anchor.target === '_blank') return;
      if (anchor.dataset.allowDirty === 'true') return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', clickInterceptor, true);

    const popState = (e: PopStateEvent) => {
      if (!window.confirm(message)) {
        // Push the current state back so the URL stays put.
        history.pushState(null, '', location.href);
        e.preventDefault?.();
      }
    };
    window.addEventListener('popstate', popState);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', clickInterceptor, true);
      window.removeEventListener('popstate', popState);
    };
  }, [dirty, message]);
}
