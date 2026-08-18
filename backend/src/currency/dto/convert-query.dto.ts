import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  Max,
} from 'class-validator';

/**
 * Shape + format rules for the query string of GET /api/convert.
 *
 * This class is the single place that decides what a *well-formed* request
 * looks like. Business rules that depend on runtime state (is this date in the
 * past? is this a currency the provider actually supports?) live in the
 * service instead, because they need data this class cannot see.
 */

/** Lets callers send `usd` or ` usd ` and still get a valid `USD`. */
const toCurrencyCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ConvertQueryDto {
  @Transform(toCurrencyCode)
  @Matches(/^[A-Z]{3}$/, {
    message: 'from must be a 3-letter currency code, for example USD',
  })
  from!: string;

  @Transform(toCurrencyCode)
  @Matches(/^[A-Z]{3}$/, {
    message: 'to must be a 3-letter currency code, for example PKR',
  })
  to!: string;

  // Query strings are always text, so "100" arrives as a string. @Type tells
  // class-transformer to run it through Number() before the validators below
  // see it. "abc" becomes NaN, which allowNaN: false then rejects.
  @Type(() => Number)
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'amount must be a number' },
  )
  @IsPositive({ message: 'amount must be greater than 0' })
  @Max(1_000_000_000, { message: 'amount must be 1,000,000,000 or less' })
  amount!: number;

  // Optional. Present => historical conversion, absent => latest rate.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format, for example 2026-08-15',
  })
  date?: string;
}
