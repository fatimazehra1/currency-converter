import { useEffect, useState } from 'react';
import { fetchCurrencies } from '../services/currencyApi';

/**
 * Loads the currency list from our backend once, when the app first renders.
 *
 * Why a custom hook? Three pieces of state (data, loading, error) always change
 * together and are meaningless apart. Bundling them keeps App.jsx readable and
 * gives the loading/error handling one obvious home.
 *
 * Returns: { currencies, isLoading, error }
 */
export function useCurrencies() {
  const [currencies, setCurrencies] = useState([]);
  // Starts true: the request begins immediately, so the very first paint
  // should already show a spinner rather than an empty dropdown.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guards against setting state after the component is gone. React's
    // StrictMode deliberately mounts, unmounts and remounts components in
    // development, so without this you can get a warning and a wasted update.
    let cancelled = false;

    fetchCurrencies()
      .then((data) => {
        if (!cancelled) setCurrencies(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Cleanup runs on unmount.
    return () => {
      cancelled = true;
    };
    // Empty dependency array = run once after the first render, never again.
    // The currency list does not depend on anything the user can change.
  }, []);

  return { currencies, isLoading, error };
}
