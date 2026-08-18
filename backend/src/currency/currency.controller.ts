import { Controller, Get, Query } from '@nestjs/common';
import {
  ConversionResult,
  Currency,
  CurrencyService,
} from './currency.service';
import { ConvertQueryDto } from './dto/convert-query.dto';

/**
 * The HTTP layer. Its only job is to map URLs onto service methods.
 *
 * There is deliberately no logic here: no fetching, no maths, no validation.
 * Validation already happened (the global ValidationPipe ran against
 * ConvertQueryDto before this code executed) and the business logic lives in
 * the service. That separation is what makes the service easy to unit test
 * without spinning up an HTTP server.
 *
 * The routes are declared bare ('currencies', not 'api/currencies') because
 * main.ts sets a global 'api' prefix for the whole application.
 */
@Controller()
export class CurrencyController {
  // Dependency injection: we ask for a CurrencyService and Nest supplies the
  // single shared instance it created. We never call `new CurrencyService()`.
  constructor(private readonly currencyService: CurrencyService) {}

  /** GET /api/health - a cheap liveness check for hosting platforms. */
  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  /** GET /api/currencies - fills both dropdowns in the frontend. */
  @Get('currencies')
  getCurrencies(): Promise<Currency[]> {
    return this.currencyService.getCurrencies();
  }

  /**
   * GET /api/convert?from=USD&to=PKR&amount=100[&date=2026-08-15]
   *
   * @Query() binds the whole query string to the DTO. Because a global
   * ValidationPipe is registered, `query` is guaranteed to be valid and
   * correctly typed by the time this method body runs - an invalid request
   * never reaches here, it is rejected with a 400 first.
   */
  @Get('convert')
  convert(@Query() query: ConvertQueryDto): Promise<ConversionResult> {
    return this.currencyService.convert(query);
  }
}
