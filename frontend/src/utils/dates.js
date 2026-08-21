/** The newest date FreeCurrencyAPI publishes a historical rate for. */
export function yesterdayIso() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export const EARLIEST_RATE_DATE = '1999-01-01';
