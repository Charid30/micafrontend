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
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TempsReelService } from './temps-reel.service';

export interface MessageRecu {
  id: number;
  titre: string;
  contenu: string;
  envoye_le: string;
  auteur: string;
}

export interface DestinataireMessage {
  id: number;
  nom: string;
  identifiant: string | null;
  lu_le: string | null;
}

export interface MessageEnvoye {
  id: number;
  titre: string;
  contenu: string;
  envoye_le: string;
  auteur: string;
  total: number;
  lus: number;
  destinataires: DestinataireMessage[];
}

const INTERVALLE_MIN_MS = 60 * 1000;   // relecture au changement de page, au plus une fois par minute

// Messages ciblés reçus : chargés à la connexion, au retour sur l'onglet, à chaque page (au plus une fois
// par minute) et aussitôt qu'un administrateur en envoie un (flux temps réel). Affichés un par un jusqu'à
// ce que l'utilisateur les marque comme lus.
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly http = inject(HttpClient);
  private readonly tempsReel = inject(TempsReelService);
  private readonly url = `${environment.apiUrl}/messages`;

  /** Messages non lus, du plus ancien au plus récent : le premier est affiché */
  readonly aLire$ = new BehaviorSubject<MessageRecu[]>([]);
  private dernierChargement = 0;
  private abonnement: Subscription | null = null;
  private readonly surVisibilite = () => { if (document.visibilityState === 'visible') this.verifier(); };

  demarrer(): void {
    if (this.abonnement) return;
    this.abonnement = this.tempsReel.signal$.subscribe((sujet) => { if (sujet === 'message-recu') this.charger(); });
    document.addEventListener('visibilitychange', this.surVisibilite);
    this.charger();
  }

  arreter(): void {
    this.abonnement?.unsubscribe();
    this.abonnement = null;
    document.removeEventListener('visibilitychange', this.surVisibilite);
    this.aLire$.next([]);
  }

  /** Changement de page : relecture si la dernière date de plus d'une minute */
  verifier(): void {
    if (Date.now() - this.dernierChargement >= INTERVALLE_MIN_MS) this.charger();
  }

  charger(): void {
    this.dernierChargement = Date.now();
    this.http.get<MessageRecu[]>(`${this.url}/a-lire`).subscribe({
      next: (l) => this.aLire$.next(l),
      error: () => { /* information secondaire : nouvel essai a la prochaine page */ },
    });
  }

  /** Accusé de lecture ; le message suivant s'affiche ensuite */
  async marquerLu(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.url}/${id}/lu`, {}));
    this.aLire$.next(this.aLire$.value.filter((m) => m.id !== id));
  }

  // ── Administration
  envoyes(): Observable<MessageEnvoye[]> {
    return this.http.get<MessageEnvoye[]>(this.url);
  }

  envoyer(titre: string, contenu: string, destinataires: number[]): Observable<{ id: number; destinataires: number }> {
    return this.http.post<{ id: number; destinataires: number }>(this.url, { titre, contenu, destinataires });
  }

  retirer(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
