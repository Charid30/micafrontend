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
import { Injectable, signal } from '@angular/core';

// Evenement Chrome / Edge / Samsung Internet (absent des types DOM standard)
interface InviteInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLE_REPORT = 'mica_installation_reportee';
const DELAI_REPORT_MS = 30 * 24 * 3600 * 1000; // « Plus tard » : on ne redemande pas avant 30 jours

/**
 * Installation de la plateforme sur l'ecran d'accueil du telephone (application web, PWA).
 * Android : on garde l'invite du navigateur pour la declencher depuis notre propre panneau.
 * iPhone : pas d'invite automatique, le panneau explique « Partager > Sur l'ecran d'accueil ».
 * Instancie au demarrage (AppComponent) : l'invite arrive souvent avant la connexion.
 */
@Injectable({ providedIn: 'root' })
export class InstallationService {
  private invite: InviteInstallation | null = null;
  /** Panneau visible (telephone, pas encore installe, pas reporte) */
  readonly ouvert = signal(false);
  readonly iphone = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.invite = e as InviteInstallation;
    });
    window.addEventListener('appinstalled', () => {
      this.invite = null;
      this.ouvert.set(false);
    });
  }

  get dejaInstallee(): boolean {
    return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  }

  /** Possible sur ce navigateur : invite recue (Android) ou Safari sur iPhone */
  get possible(): boolean {
    return !this.dejaInstallee && (!!this.invite || this.iphone);
  }

  private reportee(): boolean {
    try {
      const t = Number(localStorage.getItem(CLE_REPORT) || 0);
      return Date.now() - t < DELAI_REPORT_MS;
    } catch {
      return false;
    }
  }

  /** Proposition automatique, une fois par session, quelques secondes apres l'arrivee */
  proposer(): void {
    setTimeout(() => {
      if (this.possible && !this.reportee() && window.innerWidth < 768) this.ouvert.set(true);
    }, 4000);
  }

  async installer(): Promise<void> {
    if (!this.invite) return; // iPhone : le panneau affiche la marche a suivre
    const invite = this.invite;
    this.invite = null; // une invite ne sert qu'une fois
    await invite.prompt();
    const choix = await invite.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    if (choix.outcome === 'dismissed') this.plusTard();
    this.ouvert.set(false);
  }

  plusTard(): void {
    this.ouvert.set(false);
    try { localStorage.setItem(CLE_REPORT, String(Date.now())); } catch { /* navigation privee */ }
  }
}
