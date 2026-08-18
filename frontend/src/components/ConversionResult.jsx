/**
 * Displays the most recent successful conversion.
 *
 * Purely presentational: it receives the backend's response as a prop and
 * renders it. It holds no state and does no arithmetic - the backend already
 * calculated convertedAmount, so there is exactly one rounding rule in the app.
 */

/** Formats a number using the visitor's own locale (thousands separators). */
function formatAmount(value) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ConversionResult({ result }) {
  if (!result) return null;

  const { from, to, amount, rate, convertedAmount, rateDate, historical } =
    result;

  return (
    <div
      className={`card shadow-sm border-2 ${
        historical ? 'border-warning' : 'border-success'
      }`}
    >
      <div className="card-body p-3 p-sm-4 text-center">
        {/* The badge is how the user tells a historical result from a live one */}
        <span
          className={`badge mb-2 ${
            historical ? 'text-bg-warning' : 'text-bg-success'
          }`}
        >
          {historical ? `Historical rate - ${rateDate}` : 'Current rate'}
        </span>

        <p className="text-secondary mb-1">
          {formatAmount(amount)} {from} =
        </p>

        <p className="display-6 fw-bold mb-2 text-break">
          {formatAmount(convertedAmount)} {to}
        </p>

        <hr />

        <div className="row small text-secondary g-2">
          <div className="col-12 col-sm-6">
            <div className="fw-semibold text-body">
              1 {from} = {rate} {to}
            </div>
            <div>Exchange rate</div>
          </div>
          <div className="col-12 col-sm-6">
            <div className="fw-semibold text-body">{rateDate}</div>
            <div>{historical ? 'Rate date' : 'Retrieved'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
