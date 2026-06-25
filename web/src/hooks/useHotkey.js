import { useEffect } from 'react';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Binds a single-key shortcut, ignoring keystrokes aimed at a form control or a
 * contenteditable region — otherwise typing "n" into a search box would open a
 * dialog instead of filtering.
 *
 * @param {string} key      the value of `KeyboardEvent.key`, e.g. 'n' or '/'
 * @param {() => void} handler
 * @param {boolean} [enabled]
 */
export function useHotkey(key, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event) {
      if (event.key !== key) return;
      // Leave browser and OS shortcuts alone.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (TYPING_TAGS.has(target?.tagName) || target?.isContentEditable) return;

      event.preventDefault();
      handler();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, handler, enabled]);
}
