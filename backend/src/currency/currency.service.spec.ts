import { HttpException } from '@nestjs/common';
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
    [401, 502],
    [403, 502],
    [422, 400],
    [429, 503],
    [500, 502],
  ])('maps upstream status %s to HTTP %s', async (status, expectedStatus) => {
    fetchMock.mockResolvedValue(
      providerResponse({
        ok: false,
        status,
        text: () => Promise.resolve('{"error":"provider detail"}'),
      }),
    );

    await expectExceptionStatus(() => service.getCurrencies(), expectedStatus);
  });

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
  const rejection = operation();
  await expect(rejection).rejects.toBeInstanceOf(HttpException);
  await expect(rejection).rejects.toHaveProperty('status', expectedStatus);
}
