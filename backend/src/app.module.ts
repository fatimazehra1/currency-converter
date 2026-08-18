import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CurrencyModule } from './currency/currency.module';

/**
 * The application root. It wires together the modules the app is made of.
 *
 * ConfigModule.forRoot() reads backend/.env into a ConfigService that any
 * provider can inject. `isGlobal: true` means we only register it here once
 * instead of importing it into every feature module that needs a setting.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CurrencyModule],
})
export class AppModule {}
