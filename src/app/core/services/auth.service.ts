/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 *  Merci
 * ================================================================== */
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
      tap((res) => this.ouvrirSession(res))
    );
  }

  /** Etape 2 de la connexion : code de l'application d'authentification ou code de secours */
  loginDoubleAuth(code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login/2fa`, { code }).pipe(
      tap((res) => this.ouvrirSession(res))
    );
  }

  private ouvrirSession(res: AuthResponse): void {
    if (!res.utilisateur) return;      // double authentification : la session n'est pas encore ouverte
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.utilisateur));
    this.userSubject.next(res.utilisateur);
  }

  /** Page a ouvrir apres la connexion selon les obligations du compte */
  pageApresConnexion(): string {
    if (this.mustChangePassword()) return '/auth/force-change-password';
    if (this.doubleAuthRequise()) return '/auth/double-authentification';
    return '/dashboard';
  }

  doubleAuthRequise(): boolean {
    return !!this.userSubject.value?.double_auth_requise;
  }

  /** Le serveur exige la configuration de la double authentification (administrateur) */
  exigerDoubleAuth(): void {
    this.mettreAJour({ double_auth_requise: true });
    this.router.navigate(['/auth/double-authentification']);
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

  // Pages Stocks (interieur / exterieur) utiles a l'utilisateur :
  // un agent limite a un depot ne voit que la page du type de son depot ; la DSTA (actions) voit les deux
  peutVoirStocks(type: 'INTERIEUR' | 'EXTERIEUR'): boolean {
    if (this.isAdmin() || this.hasPermission('actions-stocks', 'READ')) return true;
    const perms = (this.userSubject.value?.permissions ?? []).filter(p => p.module === 'stocks' && (p.action === 'READ' || p.action === 'WRITE'));
    return perms.some(p => !p.depot_id || !p.depot || p.depot.type === type);
  }

  /** Relit le profil de session (rappel d'expiration du mot de passe, droits a jour) */
  rafraichir(): void {
    this.http.get<AuthResponse>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res) => { if (res.utilisateur) this.mettreAJour(res.utilisateur); },
      error: () => { /* 401 : l'intercepteur ferme la session */ },
    });
  }

  /** Change le mot de passe depuis le profil (ancien mot de passe requis) */
  changerMotDePasse(ancienMotDePasse: string, nouveauMotDePasse: string) {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/auth/change-password`, { ancienMotDePasse, nouveauMotDePasse }).pipe(
      tap(() => this.mettreAJour({ must_change_password: false, mot_de_passe_expire: false, mot_de_passe: { expire_le: null, jours_restants: null, rappel: false } })),
    );
  }

  /** Met a jour le profil memorise (affichage) */
  mettreAJour(modifs: Partial<Utilisateur>): void {
    const user = this.userSubject.value;
    if (!user) return;
    const updated = { ...user, ...modifs };
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
    this.userSubject.next(updated);
  }

  /** Le serveur exige un changement de mot de passe (premiere connexion ou expiration) */
  exigerChangementMotDePasse(): void {
    this.mettreAJour({ must_change_password: true });
    this.router.navigate(['/auth/force-change-password']);
  }

  mustChangePassword(): boolean {
    return !!this.userSubject.value?.must_change_password;
  }

  forcedChangePassword(nouveauMotDePasse: string) {
    return this.http.put(`${environment.apiUrl}/auth/force-change-password`, { nouveauMotDePasse }).pipe(
      tap(() => {
        const user = this.userSubject.value;
        if (user) {
          const updated = { ...user, must_change_password: false, mot_de_passe_expire: false, mot_de_passe: { expire_le: null, jours_restants: null, rappel: false } };
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
