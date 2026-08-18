/**
 * The only file in the frontend that knows our backend's URL or speaks HTTP.
 *
 * Components never call fetch directly. They call these two functions, which
 * means if the backend ever changes shape, exactly one file needs editing.
 *
 * Note what is NOT here: any mention of FreeCurrencyAPI, and any API key.
 * The browser only ever talks to our own NestJS server.
 */

// Comes from frontend/.env at build time. The fallback keeps local development
// working even if someone forgets to create the .env file.
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

/**
 * Turns a NestJS error body into one readable sentence.
 *
 * NestJS sends `message` as a STRING for errors we throw ourselves
 * ("Unsupported currency code(s): XYZ") but as an ARRAY when the
 * ValidationPipe rejects a DTO (["amount must be greater than 0", ...]).
 * Handling both here means no component has to care about the difference.
 */
function readErrorMessage(body, status) {
  const message = body?.message;

  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;

  return `Request failed (${status}). Please try again.`;
}

/**
 * Shared request helper: performs the call, and converts any failure into a
 * thrown Error carrying a message that is safe to show the user.
 */
async function request(path) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`);
  } catch {
    // fetch only rejects on network-level failure: server down, no internet,
    // DNS failure. An HTTP 400 or 500 is a *successful* fetch, handled below.
    throw new Error(
      'Could not reach the server. Check that the backend is running.',
    );
  }

  // .catch(() => null) guards against an empty or non-JSON body.
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }

  return body;
}

/** GET /api/currencies -> [{ code, name, symbol }] for the dropdowns. */
export function fetchCurrencies() {
  return request('/currencies');
}

/**
 * GET /api/convert -> the full conversion result.
 * `date` is optional; passing it asks the backend for a historical rate.
 */
export function convertCurrency({ amount, from, to, date }) {
  // URLSearchParams handles encoding so we never build a URL by hand.
  const params = new URLSearchParams({ from, to, amount });
  if (date) params.set('date', date);

  return request(`/convert?${params.toString()}`);
}
