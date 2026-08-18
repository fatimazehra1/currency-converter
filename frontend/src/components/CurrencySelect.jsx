/**
 * One currency dropdown. Used twice (From and To), which is exactly why it is
 * a component - the same markup with different props.
 *
 * It is a "controlled component": it does not remember the selection itself.
 * The value comes from props and every change is reported upward via onChange.
 * React state stays the single source of truth.
 */
export default function CurrencySelect({
  id,
  label,
  value,
  currencies,
  disabled,
  onChange,
}) {
  return (
    <div>
      <label htmlFor={id} className="form-label fw-semibold">
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-lg"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {currencies.map((currency) => (
          // key lets React track list items efficiently across re-renders.
          // The currency code is guaranteed unique, so it is a natural key.
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
}
