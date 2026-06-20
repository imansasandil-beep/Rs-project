import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delay` ms.
 *
 * Used for search boxes: without it every keystroke is a request, and the
 * responses can arrive out of order and show results for a prefix of what the
 * user actually typed.
 */
export function useDebounced(value, delay = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
