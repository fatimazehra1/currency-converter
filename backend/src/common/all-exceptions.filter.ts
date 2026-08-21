import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Keeps unexpected failures out of responses while preserving known API errors.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const detail =
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception);
    this.logger.error(`Unhandled exception: ${detail}`);

    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error.',
    });
  }
}
