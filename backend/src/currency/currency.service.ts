import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConvertQueryDto } from './dto/convert-query.dto';

/** What we send to the browser for the dropdowns. */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

/** What we send to the browser after a successful conversion. */
export interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  rate: number;
  convertedAmount: number;
  rateDate: string;
  historical: boolean;
}

/** The (larger) currency object FreeCurrencyAPI actually returns. */
interface RawCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const API_BASE_URL = 'https://api.freecurrencyapi.com/v1';
const REQUEST_TIMEOUT_MS = 8_000;

// The list of world currencies effectively never changes, so cache it for a day.
const CURRENCIES_TTL_MS = 24 * 60 * 60 * 1000;
// Free-plan rates refresh once daily, so 10 minutes is already conservative.
const LATEST_RATE_TTL_MS = 10 * 60 * 1000;
// A rate from a past date is a historical fact - it can never change.
const HISTORICAL_RATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EARLIEST_HISTORICAL_DATE = '1999-01-01';

// Callers choose the currency pair and the date, so the number of distinct
// historical cache keys is in the millions. Cap the map and evict the oldest
// entry first, so the cache can never be grown into a memory exhaustion.
const MAX_CACHE_ENTRIES = 1_000;

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('FREECURRENCY_API_KEY')?.trim();

    // Fail at startup rather than on the first user request. A server that is
    // running but can never succeed is worse than one that refuses to boot.
    if (!apiKey) {
      throw new Error(
        'FREECURRENCY_API_KEY is missing. Copy backend/.env.example to backend/.env and set your key.',
      );
    }

    this.apiKey = apiKey;
  }

  /**
   * Returns every currency the provider supports, sorted by code.
   * Called by GET /api/currencies (to fill the dropdowns) and internally to
   * validate the codes on a conversion request.
   */
  async getCurrencies(): Promise<Currency[]> {
    const cached = this.readCache<Currency[]>('currencies');
    if (cached) {
      return cached;
    }

    const response = await this.request<{ data: Record<string, RawCurrency> }>(
      '/currencies',
    );

    // The provider returns an object keyed by code; the UI wants a sorted array.
    const currencies = Object.values(response.data ?? {})
      .map(({ code, name, symbol }) => ({ code, name, symbol }))
      .sort((a, b) => a.code.localeCompare(b.code));

    if (currencies.length === 0) {
      throw new BadGatewayException(
        'Exchange rate provider returned no currencies.',
      );
    }

    this.writeCache('currencies', currencies, CURRENCIES_TTL_MS);
    return currencies;
  }

  /**
   * Turns a validated request into a complete conversion result.
   * The backend does the multiplication so the rounding rule lives in exactly
   * one place and the frontend stays purely presentational.
   */
  async convert(query: ConvertQueryDto): Promise<ConversionResult> {
    const { from, to, amount, date } = query;

    // Cheapest check first: the date rule is pure local logic, while the
    // currency check may need a (cached) call to the provider.
    if (date) {
      this.assertDateIsInAllowedRange(date);
    }

    await this.assertCurrenciesAreSupported(from, to);

    const { rate, rateDate } = await this.getRate(from, to, date);

    return {
      from,
      to,
      amount,
      rate,
      convertedAmount: roundMoney(amount * rate),
      rateDate,
      historical: Boolean(date),
    };
  }

  private async getRate(
    from: string,
    to: string,
    date?: string,
  ): Promise<{ rate: number; rateDate: string }> {
    // Converting a currency to itself is always 1:1. Answering locally saves a
    // request from our limited monthly quota.
    if (from === to) {
      return { rate: 1, rateDate: date ?? todayUtc() };
    }

    return date
      ? this.getHistoricalRate(from, to, date)
      : this.getLatestRate(from, to);
  }

  private async getLatestRate(
    from: string,
    to: string,
  ): Promise<{ rate: number; rateDate: string }> {
    const cacheKey = `latest:${from}:${to}`;
    const cached = this.readCache<number>(cacheKey);
    if (cached !== undefined) {
      return { rate: cached, rateDate: todayUtc() };
    }

    // Asking for only the one currency we need keeps the response small.
    const response = await this.request<{ data: Record<string, number> }>(
      '/latest',
      { base_currency: from, currencies: to },
    );

    const rate = response.data?.[to];
    if (typeof rate !== 'number') {
      throw new BadGatewayException(
        `Exchange rate provider did not return a ${from} to ${to} rate.`,
      );
    }

    this.writeCache(cacheKey, rate, LATEST_RATE_TTL_MS);
    return { rate, rateDate: todayUtc() };
  }

  private async getHistoricalRate(
    from: string,
    to: string,
    date: string,
  ): Promise<{ rate: number; rateDate: string }> {
    const cacheKey = `historical:${date}:${from}:${to}`;
    const cached = this.readCache<number>(cacheKey);
    if (cached !== undefined) {
      return { rate: cached, rateDate: date };
    }

    const response = await this.request<{
      data: Record<string, Record<string, number>>;
    }>('/historical', { date, base_currency: from, currencies: to });

    // /historical nests rates under the date the provider actually used, which
    // is not guaranteed to equal the date we asked for. Read the key back
    // instead of assuming, and report that real date to the user.
    const [returnedDate] = Object.keys(response.data ?? {});
    const rate = returnedDate ? response.data[returnedDate]?.[to] : undefined;

    if (typeof rate !== 'number') {
      throw new BadGatewayException(
        `Exchange rate provider did not return a ${from} to ${to} rate for ${date}.`,
      );
    }

    this.writeCache(cacheKey, rate, HISTORICAL_RATE_TTL_MS);
    return { rate, rateDate: returnedDate };
  }

  /**
   * Rejects codes the provider does not support, using the cached currency
   * list. This turns a confusing upstream 422 into a clear 400 from us, and it
   * makes the from === to shortcut above safe.
   */
  private async assertCurrenciesAreSupported(
    ...codes: string[]
  ): Promise<void> {
    const supported = await this.getCurrencies();
    const supportedCodes = new Set(supported.map((currency) => currency.code));

    const unsupported = codes.filter((code) => !supportedCodes.has(code));
    if (unsupported.length > 0) {
      throw new BadRequestException(
        `Unsupported currency code(s): ${unsupported.join(', ')}. ` +
          'Call GET /api/currencies for the supported list.',
      );
    }
  }

  /**
   * The provider only publishes historical rates from 1999-01-01 up to
   * yesterday. Checking here gives a clear message and avoids burning quota on
   * a request we already know will fail.
   */
  private assertDateIsInAllowedRange(date: string): void {
    // The DTO regex accepts 2026-02-31; round-tripping through Date rejects it.
    const parsed = new Date(`${date}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      throw new BadRequestException(`${date} is not a real calendar date.`);
    }

    // ISO dates sort correctly as plain strings, so > and < are safe here.
    const latestAllowed = yesterdayUtc();
    if (date > latestAllowed) {
      throw new BadRequestException(
        `date must be ${latestAllowed} or earlier. Historical rates are only published up to yesterday.`,
      );
    }

    if (date < EARLIEST_HISTORICAL_DATE) {
      throw new BadRequestException(
        `date must be ${EARLIEST_HISTORICAL_DATE} or later.`,
      );
    }
  }

  /**
   * The only place in the app that talks to FreeCurrencyAPI.
   * Adds the secret key, enforces a timeout, and converts every failure mode
   * into a NestJS exception with a safe, user-facing message.
   */
  private async request<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        // The key goes in a header, never the URL, so it cannot leak into
        // access logs, error messages, or proxy history.
        headers: { apikey: this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Network failure calling ${path}: ${String(error)}`);
      throw new GatewayTimeoutException(
        'Could not reach the exchange rate provider. Please try again.',
      );
    }

    if (!response.ok) {
      throw await this.toClientError(response, path);
    }

    return (await response.json()) as T;
  }

  /** Maps a provider error onto the status code our own API should return. */
  private async toClientError(
    response: Response,
    path: string,
  ): Promise<HttpException> {
    const body = await response.text().catch(() => '<unreadable>');
    this.logger.error(
      `FreeCurrencyAPI ${path} responded ${response.status}: ${body}`,
    );

    switch (response.status) {
      case 401:
      case 403:
        // Our key is wrong or blocked. That is a server-side configuration
        // problem, so we log the detail and tell the client nothing about it.
        return new BadGatewayException(
          'Exchange rate provider rejected our credentials.',
        );

      case 422:
        // Bad parameters that slipped past our own validation.
        return new BadRequestException(
          'The exchange rate provider rejected those parameters.',
        );

      case 429:
        // Our monthly quota or rate limit, not the caller's fault - so 503
        // ("temporarily unavailable"), not 429 ("you sent too many requests").
        return new ServiceUnavailableException(
          'Exchange rate limit reached. Please try again shortly.',
        );

      default:
        return new BadGatewayException(
          'The exchange rate provider is currently unavailable.',
        );
    }
  }

  private readCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private writeCache(key: string, value: unknown, ttlMs: number): void {
    // Re-inserting moves the key to the end of the Map's insertion order, so
    // the first key below is always the least recently written one.
    this.cache.delete(key);
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });

    for (const oldestKey of this.cache.keys()) {
      if (this.cache.size <= MAX_CACHE_ENTRIES) break;
      this.cache.delete(oldestKey);
    }
  }
}

/** Money is displayed to 2 decimal places. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Today in UTC as YYYY-MM-DD. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Yesterday in UTC as YYYY-MM-DD - the newest date /historical accepts. */
function yesterdayUtc(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
