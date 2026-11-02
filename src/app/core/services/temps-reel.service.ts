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
import { DestroyRef, Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

const DELAI_REGROUPEMENT_MS = 1500;   // plusieurs enregistrements rapproches : un seul rechargement
const DELAI_ARRIERE_PLAN_MS = 60000;  // onglet masque : connexion liberee (6 connexions maximum par site)
const DELAI_RECONNEXION_MS = 60000;

export interface EcranTempsReel {
  sujets: string[];
  recharger: () => void;
  consultation: boolean;
  /** Vrai pendant un rechargement automatique : l'ecran garde son contenu au lieu d'afficher le chargement */
  silencieux: boolean;
}

// Rafraichissement automatique : le serveur signale chaque enregistrement (flux d'evenements).
//  - ecran de consultation : rechargement silencieux ;
//  - ecran de saisie sans modification en cours : rechargement silencieux ;
//  - ecran de saisie avec une modification en cours : rien n'est touche, un bandeau previent l'utilisateur.
@Injectable({ providedIn: 'root' })
export class TempsReelService {
  /** Identifiant de cet onglet : ses propres enregistrements ne lui sont pas re-signales */
  readonly onglet = Math.random().toString(36).slice(2, 14);
  /** Auteur de l'enregistrement a signaler dans le bandeau, null s'il n'y a rien a signaler */
  readonly avis$ = new BehaviorSubject<string | null>(null);

  private flux: EventSource | null = null;
  private actif = false;
  private ecran: EcranTempsReel | null = null;
  private modifie = false;
  private attente: ReturnType<typeof setTimeout> | null = null;
  private auteurEnAttente: string | null = null;
  private minuteurMasque: ReturnType<typeof setTimeout> | null = null;
  private minuteurReconnexion: ReturnType<typeof setTimeout> | null = null;

  private readonly surSaisie = (e: Event) => {
    if (this.ecran && !this.ecran.consultation && this.estChamp(e.target)) this.modifie = true;
  };
  private readonly surVisibilite = () => {
    if (document.visibilityState === 'hidden') {
      this.minuteurMasque = setTimeout(() => this.fermerFlux(), DELAI_ARRIERE_PLAN_MS);
      return;
    }
    if (this.minuteurMasque) clearTimeout(this.minuteurMasque);
    // De retour apres une coupure : des enregistrements ont pu etre manques
    if (!this.flux) { this.ouvrirFlux(); this.programmer(null); }
  };

  demarrer(): void {
    if (this.actif || typeof EventSource === 'undefined') return;
    this.actif = true;
    document.addEventListener('input', this.surSaisie, true);
    document.addEventListener('change', this.surSaisie, true);
    document.addEventListener('visibilitychange', this.surVisibilite);
    this.ouvrirFlux();
  }

  arreter(): void {
    this.actif = false;
    document.removeEventListener('input', this.surSaisie, true);
    document.removeEventListener('change', this.surSaisie, true);
    document.removeEventListener('visibilitychange', this.surVisibilite);
    this.fermerFlux();
    if (this.minuteurReconnexion) clearTimeout(this.minuteurReconnexion);
    if (this.minuteurMasque) clearTimeout(this.minuteurMasque);
  }

  enregistrer(ecran: EcranTempsReel): void {
    this.ecran = ecran;
    this.modifie = false;
    this.avis$.next(null);
  }

  retirer(ecran: EcranTempsReel): void {
    if (this.ecran !== ecran) return;
    this.ecran = null;
    this.modifie = false;
    this.avis$.next(null);
  }

  /** Enregistrement reussi depuis cet onglet : plus de saisie en attente */
  marquerEnregistre(): void {
    this.modifie = false;
    this.avis$.next(null);
  }

  /** Bouton du bandeau : l'utilisateur accepte de perdre sa saisie en cours */
  rechargerMaintenant(): void {
    this.modifie = false;
    this.avis$.next(null);
    this.executer();
  }

  ignorerAvis(): void {
    this.avis$.next(null);
  }

  private ouvrirFlux(): void {
    if (this.flux || !this.actif) return;
    const flux = new EventSource(`${environment.apiUrl}/evenements`, { withCredentials: true });
    this.flux = flux;
    flux.onmessage = (m) => this.surMessage(m.data);
    flux.onerror = () => {
      // Erreur passagere : le navigateur se reconnecte seul ; refus du serveur : nouvel essai plus tard
      if (flux.readyState !== EventSource.CLOSED) return;
      this.fermerFlux();
      this.minuteurReconnexion = setTimeout(() => this.ouvrirFlux(), DELAI_RECONNEXION_MS);
    };
  }

  private fermerFlux(): void {
    this.flux?.close();
    this.flux = null;
  }

  private surMessage(donnees: string): void {
    let e: { sujet: string; par: string | null; onglet: string | null };
    try { e = JSON.parse(donnees); } catch { return; }
    if (e.onglet === this.onglet || !this.ecran) return;
    if (!this.ecran.sujets.includes('*') && !this.ecran.sujets.includes(e.sujet)) return;
    this.programmer(e.par);
  }

  private programmer(par: string | null): void {
    if (par) this.auteurEnAttente = par;
    if (this.attente) clearTimeout(this.attente);
    this.attente = setTimeout(() => this.appliquer(), DELAI_REGROUPEMENT_MS);
  }

  private appliquer(): void {
    const par = this.auteurEnAttente;
    this.attente = null;
    this.auteurEnAttente = null;
    if (!this.ecran) return;
    if (!this.ecran.consultation && this.saisieEnCours()) {
      if (par) this.avis$.next(par);
      return;
    }
    this.executer();
  }

  // Modification non enregistree, ou curseur dans un champ (la saisie va peut-etre commencer)
  private saisieEnCours(): boolean {
    return this.modifie || this.estChamp(document.activeElement);
  }

  private estChamp(el: EventTarget | null): boolean {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
  }

  private executer(): void {
    const ecran = this.ecran;
    if (!ecran) return;
    const zone = document.querySelector('main');
    const position = zone?.scrollTop ?? 0;
    ecran.silencieux = true;
    ecran.recharger();
    ecran.silencieux = false;
    // Les donnees arrivent juste apres : la page reste a la meme position
    [300, 900].forEach(ms => setTimeout(() => { if (zone) zone.scrollTop = position; }, ms));
  }
}

/** A declarer en champ du composant de l'ecran ; retire automatiquement quand on quitte l'ecran */
export function ecouterTempsReel(sujets: string[], recharger: () => void, options: { consultation?: boolean } = {}): EcranTempsReel {
  const service = inject(TempsReelService);
  const ecran: EcranTempsReel = { sujets, recharger, consultation: !!options.consultation, silencieux: false };
  service.enregistrer(ecran);
  inject(DestroyRef).onDestroy(() => service.retirer(ecran));
  return ecran;
}
