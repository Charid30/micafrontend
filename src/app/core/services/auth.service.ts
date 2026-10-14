import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, Utilisateur } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Le jeton de session est dans un cookie HttpOnly posé par l'API : il n'est jamais lisible ici.
  // On ne garde localement que le profil (affichage, menus) ; les droits réels sont vérifiés côté serveur.
  private readonly USER_KEY = 'mica_user';
  private readonly LEGACY_TOKEN_KEY = 'mica_token';

  private userSubject = new BehaviorSubject<Utilisateur | null>(this.storedUser());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    localStorage.removeItem(this.LEGACY_TOKEN_KEY); // nettoyage de l'ancien stockage du jeton
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.utilisateur));
        this.userSubject.next(res.utilisateur);
      })
    );
  }

  /** Déconnexion volontaire : efface aussi le cookie côté serveur */
  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
  }

  /** Session expirée ou refusée (401) : nettoyage local uniquement */
  clearSession(): void {
    localStorage.removeItem(this.USER_KEY);
    this.userSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  isAdmin(): boolean {
    return !!this.userSubject.value?.is_admin;
  }

  hasPermission(module: string, action: 'READ' | 'WRITE'): boolean {
    if (this.isAdmin()) return true;
    const perms = this.userSubject.value?.permissions ?? [];
    return perms.some((p) => {
      if (p.module !== module) return false;
      if (action === 'READ') return p.action === 'READ' || p.action === 'WRITE';
      return p.action === 'WRITE';
    });
  }

  mustChangePassword(): boolean {
    return !!this.userSubject.value?.must_change_password;
  }

  forcedChangePassword(nouveauMotDePasse: string) {
    return this.http.put(`${environment.apiUrl}/auth/force-change-password`, { nouveauMotDePasse }).pipe(
      tap(() => {
        const user = this.userSubject.value;
        if (user) {
          const updated = { ...user, must_change_password: false };
          localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
          this.userSubject.next(updated);
        }
      })
    );
  }

  get currentUser(): Utilisateur | null {
    return this.userSubject.value;
  }

  private storedUser(): Utilisateur | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
