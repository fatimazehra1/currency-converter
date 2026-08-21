import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyService } from './currency.service';

describe('CurrencyService error handling', () => {
  let service: CurrencyService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new CurrencyService({
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it.each([
    [401, BadGatewayException],
    [403, BadGatewayException],
    [422, BadRequestException],
    [429, ServiceUnavailableException],
    [500, BadGatewayException],
  ])(
    'maps upstream status %s to the expected exception',
    async (status, exceptionType) => {
      fetchMock.mockResolvedValue(
        providerResponse({
          ok: false,
          status,
          text: () => Promise.resolve('{"error":"provider detail"}'),
        }),
      );

      await expectExceptionStatus(
        () => service.getCurrencies(),
        statusFor(exceptionType),
      );
    },
  );

  it('maps a non-JSON success body to 502', async () => {
    fetchMock.mockResolvedValue(
      providerResponse({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );

    await expectExceptionStatus(() => service.getCurrencies(), 502);
  });

  it('maps a provider timeout to 504', async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error('timed out'), { name: 'TimeoutError' }),
    );

    await expectExceptionStatus(() => service.getCurrencies(), 504);
  });

  it('maps other network failures to 502', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));

    await expectExceptionStatus(() => service.getCurrencies(), 502);
  });

  it('maps an unsupported currency code to 400', async () => {
    fetchMock.mockResolvedValue(
      providerResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
            },
          }),
      }),
    );

    await expectExceptionStatus(
      () =>
        service.convert({
          amount: 100,
          from: 'XYZ',
          to: 'USD',
        }),
      400,
    );
  });
});

function providerResponse(
  response: Partial<Response> & Pick<Response, 'ok' | 'status'>,
): Response {
  return response as Response;
}

async function expectExceptionStatus(
  operation: () => Promise<unknown>,
  expectedStatus: number,
): Promise<void> {
  try {
    await operation();
    fail('Expected operation to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(expectedStatus);
  }
}

function statusFor(
  exceptionType:
    | typeof BadGatewayException
    | typeof BadRequestException
    | typeof ServiceUnavailableException,
): number {
  if (exceptionType === BadRequestException) return 400;
  if (exceptionType === ServiceUnavailableException) return 503;
  return 502;
}
