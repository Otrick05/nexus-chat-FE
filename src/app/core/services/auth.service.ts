import { JwtPayload } from './../models/jwt-payload.models';
import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, map, retry, switchMap, filter } from 'rxjs';
import { Usuario } from '../models/usuario.models';
import { LoginRequest } from '../models/login-request.models';
import { SignupRequest } from '../models/signup-request.model';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public currentUser = signal<Usuario | null>(null);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly API_URL = environment.apiUrl;
  private tokenTimer: any;

  constructor(private http: HttpClient) {
    this.checkInitialAuth();
  }

  private checkInitialAuth() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      return;
    }

    try {
      const payload: JwtPayload = this.decodeJwt(jwt);
      if (payload.exp * 1000 < Date.now()) {
        this.logout(); // Token expirado
        return;
      }

      const correo = payload.sub;
      this.fetchUserProfile(correo).subscribe({
        next: (user) => {
          if (user) {
            this.currentUser.set(user);
            this.scheduleTokenExpiration(jwt);
          } else {
            this.logout();
          }
        },
        error: () => this.logout()
      });
    } catch (error) {
      console.error('Error decoding JWT during initial auth:', error);
      this.logout();
    }
  }

  fetchUserProfile(correo: string): Observable<Usuario | null> {
    return this.http.get<Usuario>(`${this.API_URL}/perfil-usuario/${correo}`).pipe(
      retry({ count: 3, delay: 1000 }),
      catchError(() => of(null)) // Si falla, devuelve null
    );
  }

  private handleAuthSuccess(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('jwt', token);
      this.scheduleTokenExpiration(token);
    }

    console.log('Token recibido:', token);

    try {
      // Decodificar y buscar perfil
      const correo = this.decodeJwt(token).sub;
      this.fetchUserProfile(correo).subscribe(user => {
        this.currentUser.set(user);
      });
    } catch (error) {
      console.error('Error handling auth success:', error);
    }
  }

  login(credentials: LoginRequest): Observable<boolean> {
    return this.http.post<any>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap(response => {
        console.log('Login response from backend:', response);
        const token = response?.jwt || response?.token || response?.access_token;
        if (token) {
          this.handleAuthSuccess(token);
        } else {
          console.warn('Login response does not contain "jwt", "token", or "access_token":', response);
        }
      }),
      map(response => !!(response?.jwt || response?.token || response?.access_token)),
      catchError((error) => {
        console.error('Login error in AuthService:', error);
        return of(false);
      })
    );
  }

  register(userData: SignupRequest): Observable<boolean> {
    // Tipamos la respuesta para esperar el JWT
    return this.http.post<any>(`${this.API_URL}/auth/signup`, userData).pipe(
      tap(response => {
        console.log('Register response from backend:', response);
        const token = response?.jwt || response?.token || response?.access_token;
        if (token) {
          this.handleAuthSuccess(token);
        } else {
          console.warn('Register response does not contain "jwt", "token", or "access_token":', response);
        }
      }),
      map(response => !!(response?.jwt || response?.token || response?.access_token)),
      catchError((error) => {
        console.error('Register error in AuthService:', error);
        return of(false);
      })
    );
  }

  logout() {
    if (this.tokenTimer) {
      clearTimeout(this.tokenTimer);
    }
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt');
    }
    this.currentUser.set(null);
  }

  private scheduleTokenExpiration(token: string) {
    const payload = this.decodeJwt(token);
    const expiresAt = payload.exp * 1000;
    const timeout = expiresAt - Date.now();
    console.log(`Token expiration scheduled. Expires at: ${new Date(expiresAt).toISOString()}, TTL (ms): ${timeout}`);

    if (this.tokenTimer) {
      clearTimeout(this.tokenTimer);
    }

    if (timeout > 0) {
      this.tokenTimer = setTimeout(() => {
        this.handleSessionExpired();
      }, timeout);
    } else {
      this.handleSessionExpired();
    }
  }

  handleSessionExpired() {
    this.logout();
    if (isPlatformBrowser(this.platformId)) {
      alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      window.location.reload();
    }
  }

  private decodeJwt(token: string): JwtPayload {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // console.log('Decoded JWT:', payload); // Be careful logging full payload in prod, but ok for debug
      return payload;
    } catch (e) {
      console.error('Failed to decode JWT', e);
      throw e;
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('jwt');
    }
    return null;
  }
  /**
   * Updates the display name (nombreAppUsuario).
   */
  updateDisplayName(newName: string): Observable<boolean> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return of(false);
    }
    return this.http.patch<any>(`${this.API_URL}/perfil-usuario/actualizar-nombre`, {
      nombreAppUsuario: newName
    }).pipe(
      map(() => {
        this.currentUser.update(user => user ? { ...user, nombreAppUsuario: newName } : null);
        return true;
      }),
      catchError((error) => {
        console.error('Error updating display name:', error);
        return of(false); // Return false on error but don't log out
      })
    );
  }

  /**
   * Updates the password.
   * Handles JWT renewal if provided in the response.
   */
  updatePassword(current: string, newPass: string): Observable<boolean> {
    // Placeholder endpoint
    return this.http.put<any>(`${this.API_URL}/auth/changepassword`, {
      currentPassword: current,
      newPassword: newPass
    }).pipe(
      tap(response => {
        console.log('Password update response:', response);
        const token = response?.jwt || response?.token || response?.access_token;
        if (token) {
          this.handleAuthSuccess(token); // Update JWT and user state
        }
      }),
      map(() => true),
      catchError((error) => {
        console.error('Error updating password:', error);
        return of(false);
      })
    );
  }
}
