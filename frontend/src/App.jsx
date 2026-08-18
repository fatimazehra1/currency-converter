import { useState } from 'react';
import ConversionResult from './components/ConversionResult';
import ConverterForm from './components/ConverterForm';
import ErrorAlert from './components/ErrorAlert';
import HistoryList from './components/HistoryList';
import { useCurrencies } from './hooks/useCurrencies';
import { useConversionHistory } from './hooks/useConversionHistory';

/**
 * The root component. It wires the three pieces together and owns only the
 * state that more than one child needs: the latest result.
 *
 * Notice how little is here. The two hooks hide the loading and persistence
 * details, and each component below renders one part of the page. That is the
 * whole point of the structure - App reads like a description of the layout.
 */
export default function App() {
  const { currencies, isLoading: currenciesLoading, error: currenciesError } =
    useCurrencies();

  const { history, addEntry, clearHistory } = useConversionHistory();

  // "The conversion currently on screen." Lives here rather than in
  // ConverterForm because two things need it: the result card, and the history.
  const [result, setResult] = useState(null);

  /**
   * Called by ConverterForm after every attempt.
   * Receives the backend's result on success, or null on failure/reset.
   */
  function handleResult(conversion) {
    setResult(conversion);

    // Only successful conversions become history entries.
    if (conversion) {
      addEntry(conversion);
    }
  }

  return (
    // container + max-width keeps the app centred and readable on a wide
    // desktop instead of stretching a single form across 2000px.
    <div className="container py-4" style={{ maxWidth: '640px' }}>
      <header className="text-center mb-4">
        <h1 className="h3 fw-bold mb-1">Currency Converter</h1>
        <p className="text-secondary small mb-0">
          Live and historical exchange rates
        </p>
      </header>

      <main className="d-flex flex-column gap-3">
        {/* Loading the currency list is the app's first job, so it gets its
            own feedback rather than a silently empty dropdown. */}
        {currenciesLoading && (
          <div className="card shadow-sm">
            <div className="card-body text-center py-4">
              <div
                className="spinner-border text-primary mb-2"
                role="status"
                aria-hidden="true"
              />
              <p className="mb-0 text-secondary">Loading currencies...</p>
            </div>
          </div>
        )}

        {currenciesError && <ErrorAlert message={currenciesError} />}

        {/* The form only appears once we actually have currencies to show. */}
        {!currenciesLoading && !currenciesError && (
          <ConverterForm
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            onResult={handleResult}
          />
        )}

        <ConversionResult result={result} />

        <HistoryList history={history} onClear={clearHistory} />
      </main>

      <footer className="text-center text-secondary small mt-4">
        <p className="mb-0">
          Rates from FreeCurrencyAPI via our own NestJS backend.
        </p>
      </footer>
    </div>
  );
}
