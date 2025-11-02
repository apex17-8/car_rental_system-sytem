// src/logger/middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip, headers } = req;

    // Log request
    this.loggerService.debug(
      `Incoming Request: ${method} ${originalUrl}`,
      'HTTPRequest',
      {
        method,
        url: originalUrl,
        ip,
        userAgent: headers['user-agent'],
        timestamp: new Date().toISOString(),
      },
    );

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      this.loggerService.logHttpRequest(
        method,
        originalUrl,
        statusCode,
        duration,
        (req as any).user?.user_id,
      );

      if (statusCode >= 400) {
        this.loggerService.warn(
          `HTTP ${method} ${originalUrl} - ${statusCode} - ${duration}ms`,
          'HTTPError',
          {
            method,
            url: originalUrl,
            status_code: statusCode,
            duration,
            user_id: (req as any).user?.user_id,
            ip,
            timestamp: new Date().toISOString(),
          },
        );
      }
    });

    next();
  }
}
