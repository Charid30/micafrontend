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
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

const CLE = 'mica_activite';                 // partagee entre les onglets : l'activite d'un onglet vaut pour tous
const EVENEMENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];
const ECRITURE_MS = 5000;
const AVERTISSEMENT_MS = 60000;

/**
 * Deconnexion apres inactivite : sans clic, frappe ni defilement pendant la duree fixee par le serveur
 * (SESSION_INACTIVITE_MINUTES), la session est fermee. Une minute avant, un avertissement est affiche.
 * Tant que l'utilisateur est actif, le serveur est prevenu regulierement : la session y reste ouverte,
 * meme sur une page longue a lire sans requete.
 */
@Injectable({ providedIn: 'root' })
export class InactiviteService {
  private readonly auth = inject(AuthService);
  private minuteur: any = null;
  private dernierEcrit = 0;
  private dernierPing = 0;
  private derniereLocale = 0;

  /** Secondes restantes avant la deconnexion, pendant la derniere minute ; null sinon */
  readonly restant$ = new BehaviorSubject<number | null>(null);

  private readonly surActivite = () => this.marquer();

  private get limiteMs(): number { return (this.auth.currentUser?.session_inactivite_minutes || 30) * 60000; }
  // Prevenir le serveur au plus tous les tiers de la duree (5 minutes au maximum)
  private get pingMs(): number { return Math.min(5 * 60000, this.limiteMs / 3); }

  demarrer(): void {
    if (this.minuteur) return;
    this.dernierPing = Date.now();
    this.ecrire(Date.now());
    EVENEMENTS.forEach(e => window.addEventListener(e, this.surActivite, { passive: true, capture: true }));
    this.minuteur = setInterval(() => this.verifier(), 1000);
  }

  arreter(): void {
    clearInterval(this.minuteur);
    this.minuteur = null;
    EVENEMENTS.forEach(e => window.removeEventListener(e, this.surActivite, { capture: true }));
    this.restant$.next(null);
  }

  /** « Rester connecté » : activite immediate, serveur prevenu */
  resterConnecte(): void {
    this.ecrire(Date.now());
    this.restant$.next(null);
    this.prevenirServeur();
  }

  private ecrire(instant: number): void {
    this.dernierEcrit = instant;
    this.derniereLocale = instant;
    try { localStorage.setItem(CLE, String(instant)); } catch { /* stockage indisponible : l'onglet compte seul */ }
  }

  private marquer(): void {
    const maintenant = Date.now();
    this.derniereLocale = maintenant;
    if (maintenant - this.dernierEcrit >= ECRITURE_MS) this.ecrire(maintenant);
    if (maintenant - this.dernierPing >= this.pingMs) this.prevenirServeur();
  }

  private prevenirServeur(): void {
    this.dernierPing = Date.now();
    this.auth.relire().subscribe({ error: () => { /* 401 : l'intercepteur ferme la session */ } });
  }

  private derniereActivite(): number {
    let partagee = 0;
    try { partagee = Number(localStorage.getItem(CLE)) || 0; } catch { partagee = 0; }
    // L'horloge partagee fait foi (ecrite au plus toutes les 5 s) ; la memoire de l'onglet sert sans stockage
    return partagee || this.derniereLocale;
  }

  private verifier(): void {
    const reste = this.limiteMs - (Date.now() - this.derniereActivite());
    if (reste <= 0) {
      const minutes = Math.round(this.limiteMs / 60000);
      this.arreter();
      this.auth.logout(`Session fermée après ${minutes} minutes d'inactivité. Reconnectez-vous pour continuer.`);
      return;
    }
    const secondes = reste <= AVERTISSEMENT_MS ? Math.ceil(reste / 1000) : null;
    if (secondes !== this.restant$.value) this.restant$.next(secondes);
  }
}
