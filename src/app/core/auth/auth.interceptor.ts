import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * Silent-refresh interceptor (WEB-9): on a single 401 from a BFF-proxied
 * call, attempt one `/api/bff/auth/refresh` and retry the original request
 * once. The auth endpoints themselves are excluded to avoid a refresh loop
 * (a 401 from `/api/bff/auth/login` means bad credentials, not an expired
 * session).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthRoute = req.url.startsWith('/api/bff/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRoute) {
        return http.post('/api/bff/auth/refresh', {}).pipe(
          switchMap(() => next(req)),
          catchError(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
