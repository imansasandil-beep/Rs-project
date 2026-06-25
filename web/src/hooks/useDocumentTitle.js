import { useEffect } from 'react';

const SUFFIX = 'Rs';

/**
 * Keeps the browser tab title in step with the route.
 *
 * A single-page app never reloads, so without this every tab, bookmark and
 * history entry is called the same thing — which makes browser history useless
 * for getting back to a page you were just on.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
