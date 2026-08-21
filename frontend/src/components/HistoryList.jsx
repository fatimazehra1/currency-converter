import { formatAmount, formatTimestamp } from '../utils/format';
import { rateVariant } from '../utils/rates';

/**
 * Shows past conversions loaded from localStorage.
 *
 * Presentational only - it receives the array and the clear callback as props.
 * The storage logic lives in the useConversionHistory hook, so this component
 * has no idea localStorage exists.
 *
 * Laid out as a list rather than a table: a table with six columns is unusable
 * at 320px, whereas a stacked list reads well on a phone and still looks tidy
 * on desktop.
 */

export default function HistoryList({ history, onClear }) {
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h6 mb-0">
          Recent conversions{' '}
          {history.length > 0 && (
            <span className="badge text-bg-secondary">{history.length}</span>
          )}
        </h2>

        {history.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={onClear}
          >
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="card-body text-center text-secondary py-4">
          <p className="mb-0">No conversions yet.</p>
          <small>Your history is saved in this browser.</small>
        </div>
      ) : (
        <ul className="list-group list-group-flush">
          {history.map((entry) => {
            const { date, time } = formatTimestamp(entry.convertedAt);
            const variant = rateVariant(entry.historical);

            return (
              // entry.id is a UUID generated when the entry was created - a
              // stable unique key, which is why we do not use the array index.
              <li key={entry.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <div className="fw-semibold">
                      {formatAmount(entry.amount)} {entry.from} →{' '}
                      {formatAmount(entry.convertedAmount)} {entry.to}
                    </div>
                    <div className="small text-secondary">
                      1 {entry.from} = {entry.rate} {entry.to}
                      {' · '}rate date {entry.rateDate}
                    </div>
                  </div>

                  <div className="text-sm-end small">
                    <span className={`badge text-bg-${variant}`}>
                      {entry.historical ? 'Historical' : 'Current'}
                    </span>
                    <div className="text-secondary mt-1">
                      {date} {time}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
