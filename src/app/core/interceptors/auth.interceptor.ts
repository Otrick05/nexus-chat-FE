import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const injector = inject(Injector);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('jwt');

    if (token) {
      // Check if token is expired before making the request
      if (isTokenExpired(token)) {
        console.warn('AuthInterceptor: Token expired locally. Calling handleSessionExpired.');
        const authService = injector.get(AuthService);
        authService.handleSessionExpired();
        return throwError(() => new Error('Session expired'));
      }

      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(clonedReq).pipe(
        catchError((error) => {
          if (error.status === 403) {
            console.warn('AuthInterceptor: Received 403 Forbidden. Access denied for URL:', req.url);
            // Do NOT log out on 403. It means the user is authenticated but not authorized for this resource.
            // Let the caller handle the error.
          }
          return throwError(() => error);
        })
      );
    }
  }

  return next(req);
};

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}
