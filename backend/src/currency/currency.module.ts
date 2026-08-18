import { Module } from '@nestjs/common';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

/**
 * Groups everything currency-related into one feature module.
 *
 * `controllers` tells Nest which classes handle incoming HTTP requests.
 * `providers` tells Nest which classes it may create and inject. Because
 * CurrencyService is listed here, Nest can construct it once and hand that
 * same instance to CurrencyController's constructor.
 *
 * The service is NOT exported because nothing outside this module uses it.
 */
@Module({
  controllers: [CurrencyController],
  providers: [CurrencyService],
})
export class CurrencyModule {}
