/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // withCredentials : envoie le cookie de session HttpOnly
    // X-Requested-With : exigé par l'API sur les requêtes d'écriture (protection CSRF)
    req = req.clone({
      withCredentials: true,
      setHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !req.url.endsWith('/auth/login')) {
          this.authService.clearSession();
        }
        // Premiere connexion ou mot de passe expire : le serveur n'accepte que le changement de mot de passe
        if (err.status === 403 && err.error?.code === 'MOT_DE_PASSE_A_CHANGER') {
          this.authService.exigerChangementMotDePasse();
        }
        return throwError(() => err);
      })
    );
  }
}
