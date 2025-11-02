// src/logger/services/logger.service.ts
import { Injectable, Logger } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

@Injectable()
export class LoggerService {
  private readonly logger = new Logger();
  private readonly context = 'CarRentalSystem';

  // Safe error logging
  error(
    message: string,
    trace?: string,
    context?: string,
    additionalData?: unknown,
  ) {
    const logContext = context || this.context;
    const formattedMessage = this.formatMessage(message, additionalData);
    this.logger.error(formattedMessage, trace, logContext);
  }

  warn(message: string, context?: string, additionalData?: unknown) {
    const logContext = context || this.context;
    const formattedMessage = this.formatMessage(message, additionalData);
    this.logger.warn(formattedMessage, logContext);
  }

  log(message: string, context?: string, additionalData?: unknown) {
    const logContext = context || this.context;
    const formattedMessage = this.formatMessage(message, additionalData);
    this.logger.log(formattedMessage, logContext);
  }

  debug(message: string, context?: string, additionalData?: unknown) {
    const logContext = context || this.context;
    const formattedMessage = this.formatMessage(message, additionalData);
    this.logger.debug(formattedMessage, logContext);
  }

  verbose(message: string, context?: string, additionalData?: unknown) {
    const logContext = context || this.context;
    const formattedMessage = this.formatMessage(message, additionalData);
    this.logger.verbose(formattedMessage, logContext);
  }

  // Safe error logging method
  logError(error: unknown, context?: string, additionalInfo?: unknown) {
    const logContext = context || this.context;

    if (error instanceof Error) {
      this.error(
        error.message,
        error.stack,
        logContext,
        this.safeAdditionalData(additionalInfo),
      );
    } else {
      this.error(
        String(error),
        undefined,
        logContext,
        this.safeAdditionalData(additionalInfo),
      );
    }
  }

  // Business logging methods (safe versions)
  logUserAction(userId: number, action: string, details?: unknown) {
    this.log(`User Action: ${action}`, 'UserActivity', {
      user_id: userId,
      action,
      details: this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  logReservation(reservationId: number, action: string, details?: unknown) {
    this.log(`Reservation ${action}`, 'Reservation', {
      reservation_id: reservationId,
      action,
      details: this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  logRental(rentalId: number, action: string, details?: unknown) {
    this.log(`Rental ${action}`, 'Rental', {
      rental_id: rentalId,
      action,
      details: this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  logPayment(paymentId: number, action: string, details?: unknown) {
    this.log(`Payment ${action}`, 'Payment', {
      payment_id: paymentId,
      action,
      details: this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  // HTTP request logging
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: number,
  ) {
    this.log(`HTTP ${method} ${url} - ${statusCode} - ${duration}ms`, 'HTTP', {
      method,
      url,
      status_code: statusCode,
      duration,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, details?: unknown) {
    this.log(`Performance: ${operation} took ${duration}ms`, 'Performance', {
      operation,
      duration,
      ...this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  // Security logging
  logSecurity(event: string, userId?: number, details?: unknown) {
    this.warn(`Security Event: ${event}`, 'Security', {
      user_id: userId,
      event,
      details: this.safeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  // Safe data formatting methods
  private formatMessage(message: string, additionalData?: unknown): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] ${message}`;

    if (additionalData) {
      formattedMessage += ` | Data: ${this.safeStringify(additionalData)}`;
    }

    return formattedMessage;
  }

  private safeAdditionalData(data?: unknown): unknown {
    if (data === null || data === undefined) {
      return undefined;
    }

    if (typeof data === 'object') {
      return {
        ...this.safeDetails(data),
        timestamp: new Date().toISOString(),
      };
    }

    return {
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private safeDetails(details?: unknown): Record<string, unknown> {
    if (!details || typeof details !== 'object') {
      return {};
    }

    try {
      return { ...(details as Record<string, unknown>) };
    } catch {
      return {};
    }
  }

  private safeStringify(data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
}
