import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CurrencyModule } from './currency/currency.module';

/**
 * The application root. It wires together the modules the app is made of.
 *
 * ConfigModule.forRoot() reads backend/.env into a ConfigService that any
 * provider can inject. `isGlobal: true` means we only register it here once
 * instead of importing it into every feature module that needs a setting.
 *
 * ThrottlerModule caps how many requests a single IP may send. The endpoints
 * are unauthenticated and every cache miss spends part of a limited monthly
 * provider quota, so an unthrottled API can be drained by anyone.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CurrencyModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
