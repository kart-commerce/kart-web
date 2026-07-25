import { HttpErrorResponse } from '@angular/common/http';

/** Extracts a Problem-shaped message (RFC 7807, per every kart backend contract) from an HTTP error. */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    const problem = error.error as { message?: unknown };
    if (typeof problem.message === 'string' && problem.message.length > 0) {
      return problem.message;
    }
  }
  return fallback;
}
