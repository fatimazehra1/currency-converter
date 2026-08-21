/** Formats a number using the visitor's own locale (thousands separators). */
export function formatAmount(value) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "2026-08-18T09:15:00.000Z" -> { date: "18/08/2026", time: "09:15" } */
export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
