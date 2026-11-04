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
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TempsReelService } from '../services/temps-reel.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private tempsReel: TempsReelService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // withCredentials : envoie le cookie de session HttpOnly
    // X-Requested-With : exigé par l'API sur les requêtes d'écriture (protection CSRF)
    req = req.clone({
      withCredentials: true,
      setHeaders: { 'X-Requested-With': 'XMLHttpRequest', 'X-Onglet': this.tempsReel.onglet },
    });
    // Enregistrement reussi : la saisie de l'ecran n'est plus en attente (l'abonnement aux notifications
    // et l'ajout d'un fournisseur pendant la saisie ne sont pas un enregistrement de l'ecran)
    const ecriture = req.method !== 'GET' && !/\/(notifications|auth)\/|\/fournisseurs$/.test(req.url);
    return next.handle(req).pipe(
      tap((e) => { if (ecriture && e instanceof HttpResponse) this.tempsReel.marquerEnregistre(); }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !req.url.endsWith('/auth/login')) {
          this.authService.clearSession(err.error?.code === 'SESSION_INACTIVE' ? err.error.message : undefined);
        }
        // Adresse bannie : plus aucun acces, retour a la connexion (le message s'y affiche)
        if (err.status === 403 && err.error?.code === 'ACCES_BANNI' && !req.url.endsWith('/auth/login')) {
          this.authService.clearSession();
        }
        // Premiere connexion ou mot de passe expire : le serveur n'accepte que le changement de mot de passe
        if (err.status === 403 && err.error?.code === 'MOT_DE_PASSE_A_CHANGER') {
          this.authService.exigerChangementMotDePasse();
        }
        // Administrateur : double authentification a configurer avant tout acces
        if (err.status === 403 && err.error?.code === 'DOUBLE_AUTH_A_CONFIGURER') {
          this.authService.exigerDoubleAuth();
        }
        return throwError(() => err);
      })
    );
  }
}
