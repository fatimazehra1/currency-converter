import { useEffect, useState } from 'react';

const STORAGE_KEY = 'currency-converter-history';
const MAX_ENTRIES = 10;

/**
 * Reads saved history out of localStorage.
 *
 * localStorage can only store STRINGS, so what we get back is the JSON text we
 * wrote earlier and must parse. Everything is wrapped in try/catch because a
 * user (or another script) can put anything in localStorage - if it is corrupt
 * we start from empty rather than crashing the whole app on first render.
 */
function readStoredHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Owns the conversion history: loading it at startup, saving every change,
 * adding entries and clearing them.
 *
 * Returns: { history, addEntry, clearHistory }
 */
export function useConversionHistory() {
  // Passing the FUNCTION (not readStoredHistory()) makes this a lazy
  // initializer: React calls it only on the first render instead of reading
  // localStorage on every single re-render. This is also what satisfies
  // "load the history on application startup" - no useEffect needed for it.
  const [history, setHistory] = useState(readStoredHistory);

  // Save whenever `history` changes. Because this effect depends on [history],
  // it runs after any add or clear - so persistence can never be forgotten at
  // a call site. This is what makes the history survive a page reload.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage can be full or blocked (Safari private mode). The app still
      // works perfectly in memory, so a failed save must not break it.
    }
  }, [history]);

  /**
   * Adds one successful conversion to the top of the list.
   * Called by App.jsx when a conversion succeeds.
   * Input: the backend's ConversionResult.
   */
  function addEntry(result) {
    const entry = {
      ...result, // amount, from, to, rate, convertedAmount, rateDate, historical
      id: crypto.randomUUID(),
      convertedAt: new Date().toISOString(), // when the USER did it
    };

    // Functional update: React guarantees `previous` is the latest state, which
    // matters if two conversions ever resolve close together.
    // slice() caps the list so localStorage cannot grow forever.
    setHistory((previous) => [entry, ...previous].slice(0, MAX_ENTRIES));
  }

  function clearHistory() {
    // Setting empty state is enough - the effect above writes "[]" to storage.
    setHistory([]);
  }

  return { history, addEntry, clearHistory };
}
