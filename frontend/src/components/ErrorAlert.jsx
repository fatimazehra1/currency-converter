/**
 * A red Bootstrap alert for any user-facing error.
 *
 * Small, but used in three places (currency load failure, conversion failure,
 * and future errors), so it keeps the styling consistent in one spot.
 * Renders nothing when there is no message, so callers can pass state directly
 * without writing a conditional every time.
 */
export default function ErrorAlert({ message }) {
  if (!message) return null;

  return (
    <div className="alert alert-danger d-flex align-items-start gap-2 mb-0">
      {/* aria-hidden: decorative, so screen readers skip it */}
      <span aria-hidden="true">⚠️</span>
      {/* role="alert" makes screen readers announce this immediately */}
      <div role="alert">{message}</div>
    </div>
  );
}
