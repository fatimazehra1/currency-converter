import { useState } from 'react';
import { convertCurrency } from '../services/currencyApi';
import { EARLIEST_RATE_DATE, yesterdayIso } from '../utils/dates';
import CurrencySelect from './CurrencySelect';
import ErrorAlert from './ErrorAlert';

/**
 * The converter card: the form, plus the request it submits.
 *
 * This component owns everything about *making* a conversion (the inputs, the
 * in-flight flag, the error). It does not own the result - it hands that to
 * App via onResult, because App also needs it for the history.
 */
export default function ConverterForm({ currencies, currenciesLoading, onResult }) {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [mode, setMode] = useState('current'); // 'current' | 'historical'
  const [date, setDate] = useState(yesterdayIso());

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const maxDate = yesterdayIso();

  // Derived value, not state: recalculated each render from the values above.
  // Storing this in useState would risk it drifting out of sync with `amount`.
  const isAmountValid = amount !== '' && Number(amount) > 0;
  const canConvert =
    isAmountValid && !isConverting && !currenciesLoading && currencies.length > 0;

  async function handleSubmit(event) {
    // Without this the browser reloads the page on submit and we lose all state.
    event.preventDefault();

    setIsConverting(true);
    setError(null);

    try {
      const result = await convertCurrency({
        amount,
        from,
        to,
        // The ONLY difference between a current and a historical conversion.
        // All the historical logic lives in the backend; we just send a date.
        date: mode === 'historical' ? date : undefined,
      });

      onResult(result);
    } catch (err) {
      setError(err.message);
      // Clear the old result so a stale figure is never shown beside an error.
      onResult(null);
    } finally {
      // finally = runs on success AND failure, so the spinner can never stick.
      setIsConverting(false);
    }
  }

  function handleSwap() {
    setFrom(to);
    setTo(from);
  }

  function handleReset() {
    setAmount('100');
    setMode('current');
    setDate(yesterdayIso());
    setError(null);
    onResult(null);
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body p-3 p-sm-4">
        <form onSubmit={handleSubmit} noValidate>
          {/* Amount */}
          <div className="mb-3">
            <label htmlFor="amount" className="form-label fw-semibold">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              className={`form-control form-control-lg ${
                amount !== '' && !isAmountValid ? 'is-invalid' : ''
              }`}
              value={amount}
              min="0"
              step="any"
              placeholder="Enter an amount"
              disabled={isConverting}
              onChange={(event) => setAmount(event.target.value)}
            />
            <div className="invalid-feedback">
              Enter an amount greater than 0.
            </div>
          </div>

          {/* Currencies. On mobile these stack; from sm up they sit side by
              side with the swap button between them. */}
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-sm">
              <CurrencySelect
                id="from"
                label="From"
                value={from}
                currencies={currencies}
                disabled={isConverting || currenciesLoading}
                onChange={setFrom}
              />
            </div>

            <div className="col-12 col-sm-auto d-grid">
              <button
                type="button"
                className="btn btn-outline-secondary btn-lg"
                onClick={handleSwap}
                disabled={isConverting}
                aria-label="Swap the from and to currencies"
                title="Swap currencies"
              >
                <span className="d-sm-none">↑↓ Swap</span>
                <span className="d-none d-sm-inline">⇄</span>
              </button>
            </div>

            <div className="col-12 col-sm">
              <CurrencySelect
                id="to"
                label="To"
                value={to}
                currencies={currencies}
                disabled={isConverting || currenciesLoading}
                onChange={setTo}
              />
            </div>
          </div>

          {/* Rate type: current or historical */}
          <div className="mb-3">
            <span className="form-label fw-semibold d-block">Rate</span>
            <div className="btn-group w-100" role="group" aria-label="Rate type">
              <input
                type="radio"
                className="btn-check"
                name="mode"
                id="mode-current"
                checked={mode === 'current'}
                disabled={isConverting}
                onChange={() => setMode('current')}
              />
              <label className="btn btn-outline-primary" htmlFor="mode-current">
                Current
              </label>

              <input
                type="radio"
                className="btn-check"
                name="mode"
                id="mode-historical"
                checked={mode === 'historical'}
                disabled={isConverting}
                onChange={() => setMode('historical')}
              />
              <label
                className="btn btn-outline-primary"
                htmlFor="mode-historical"
              >
                Historical
              </label>
            </div>
          </div>

          {/* Only rendered when historical is selected - the && pattern renders
              nothing when the condition is false. */}
          {mode === 'historical' && (
            <div className="mb-3">
              <label htmlFor="date" className="form-label fw-semibold">
                Rate date
              </label>
              <input
                id="date"
                type="date"
                className="form-control form-control-lg"
                value={date}
                min={EARLIEST_RATE_DATE}
                max={maxDate}
                disabled={isConverting}
                onChange={(event) => setDate(event.target.value)}
              />
              <div className="form-text">
                Rates are available from {EARLIEST_RATE_DATE} up to {maxDate}.
              </div>
            </div>
          )}

          <div className="d-grid gap-2">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!canConvert}
            >
              {isConverting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  />
                  Converting...
                </>
              ) : (
                'Convert'
              )}
            </button>

            <button
              type="button"
              className="btn btn-link text-secondary"
              onClick={handleReset}
              disabled={isConverting}
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-3">
            <ErrorAlert message={error} />
          </div>
        )}
      </div>
    </div>
  );
}
