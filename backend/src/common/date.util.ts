/** Formats a Date as a UTC ISO calendar date. */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today in UTC as YYYY-MM-DD. */
export function todayUtc(): string {
  return formatIsoDate(new Date());
}

/** Yesterday in UTC as YYYY-MM-DD - the newest date /historical accepts. */
export function yesterdayUtc(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return formatIsoDate(date);
}
