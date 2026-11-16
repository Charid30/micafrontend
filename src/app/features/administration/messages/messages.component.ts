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
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MessagesService, MessageEnvoye } from '../../../core/services/messages.service';
import { TempsReelService } from '../../../core/services/temps-reel.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';

interface Compte {
  id: number;
  nom: string;
  identifiant: string;
  direction: string | null;
  admin: boolean;
  recherche: string;
}

const TITRE_MAX = 150;
const CONTENU_MAX = 2000;
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Messages ciblés : rédaction, choix des destinataires (un, plusieurs ou tous) et suivi des accusés de lecture
@Component({
  selector: 'app-messages',
  standalone: false,
  templateUrl: './messages.component.html',
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(MessagesService);
  private readonly tempsReel = inject(TempsReelService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private abonnement?: Subscription;

  readonly titreMax = TITRE_MAX;
  readonly contenuMax = CONTENU_MAX;

  comptes: Compte[] = [];
  directions: string[] = [];
  choisis = new Set<number>();
  recherche = '';
  direction = '';
  titre = '';
  contenu = '';
  envoi = false;

  envoyes: MessageEnvoye[] = [];
  chargement = true;
  erreur: string | null = null;
  ouverts = new Set<number>();

  ngOnInit(): void {
    const preselection = Number(this.route.snapshot.queryParamMap.get('destinataire'));
    this.http.get<any[]>(`${environment.apiUrl}/utilisateurs`).subscribe({
      next: (l) => {
        this.comptes = l.map((u) => {
          const nom = `${u.agent?.nom ?? ''} ${u.agent?.prenoms ?? ''}`.trim() || u.username;
          const direction = u.agent?.direction?.acronyme ?? null;
          return { id: u.id, nom, identifiant: u.username, direction, admin: !!u.is_admin, recherche: sansAccents(`${nom} ${u.username} ${direction ?? ''}`) };
        }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        this.directions = [...new Set(this.comptes.map((c) => c.direction).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, 'fr'));
        if (preselection && this.comptes.some((c) => c.id === preselection)) {
          this.choisis.add(preselection);
          setTimeout(() => document.getElementById('message-titre')?.focus());
        }
        this.cdr.detectChanges();
      },
      error: () => { this.toast.error('Impossible de charger la liste des comptes.'); },
    });
    this.charger();
    // Accusés de lecture en direct : chaque lecture ou envoi recharge la liste sans clignotement
    this.abonnement = this.tempsReel.signal$.subscribe((sujet) => { if (sujet === 'messages') this.charger(true); });
  }

  ngOnDestroy(): void {
    this.abonnement?.unsubscribe();
  }

  charger(silencieux = false): void {
    if (!silencieux) this.chargement = true;
    this.service.envoyes().subscribe({
      next: (l) => { this.envoyes = l; this.erreur = null; this.chargement = false; this.cdr.detectChanges(); },
      error: () => { this.erreur = 'Impossible de charger les messages envoyés.'; this.chargement = false; this.cdr.detectChanges(); },
    });
  }

  // ── Destinataires
  get filtres(): Compte[] {
    const r = sansAccents(this.recherche.trim());
    return this.comptes.filter((c) => (!this.direction || c.direction === this.direction) && (!r || c.recherche.includes(r)));
  }

  get selection(): Compte[] {
    return this.comptes.filter((c) => this.choisis.has(c.id));
  }

  get tousFiltresChoisis(): boolean {
    const f = this.filtres;
    return f.length > 0 && f.every((c) => this.choisis.has(c.id));
  }

  basculer(c: Compte): void {
    if (this.choisis.has(c.id)) this.choisis.delete(c.id); else this.choisis.add(c.id);
  }

  basculerFiltres(): void {
    const tous = this.tousFiltresChoisis;
    this.filtres.forEach((c) => (tous ? this.choisis.delete(c.id) : this.choisis.add(c.id)));
  }

  retirerChoix(id: number): void {
    this.choisis.delete(id);
  }

  viderChoix(): void {
    this.choisis.clear();
  }

  // ── Envoi
  get peutEnvoyer(): boolean {
    return !this.envoi && !!this.titre.trim() && !!this.contenu.trim() && this.choisis.size > 0
      && this.titre.length <= TITRE_MAX && this.contenu.length <= CONTENU_MAX;
  }

  async envoyer(): Promise<void> {
    if (!this.peutEnvoyer) return;
    const n = this.choisis.size;
    const qui = n === 1 ? this.selection[0].nom : `${n} comptes`;
    const ok = await this.dialog.confirmer({
      titre: 'Envoyer ce message ?',
      message: `« ${this.titre.trim()} » sera affiché à ${qui} à la prochaine connexion, jusqu'à ce qu'il soit marqué comme lu.`,
      confirmer: 'Envoyer',
    });
    if (!ok) return;
    this.envoi = true;
    this.service.envoyer(this.titre.trim(), this.contenu.trim(), [...this.choisis]).subscribe({
      next: (r) => {
        this.toast.success(r.destinataires === 1 ? 'Message envoyé.' : `Message envoyé à ${r.destinataires} comptes.`);
        this.titre = '';
        this.contenu = '';
        this.choisis.clear();
        this.envoi = false;
        this.ouverts.add(r.id);
        this.charger(true);
      },
      error: (e) => { this.toast.error(e?.error?.message || 'Envoi impossible.'); this.envoi = false; this.cdr.detectChanges(); },
    });
  }

  // ── Suivi
  basculerDetail(m: MessageEnvoye): void {
    if (this.ouverts.has(m.id)) this.ouverts.delete(m.id); else this.ouverts.add(m.id);
  }

  pourcentage(m: MessageEnvoye): number {
    return m.total ? Math.round((m.lus / m.total) * 100) : 0;
  }

  async retirer(m: MessageEnvoye): Promise<void> {
    const restants = m.total - m.lus;
    const ok = await this.dialog.confirmer({
      titre: 'Retirer ce message ?',
      message: `Il ne sera plus présenté aux ${restants} destinataire${restants > 1 ? 's' : ''} qui ne l'ont pas encore lu. Les accusés de lecture déjà reçus restent dans le journal d'audit.`,
      confirmer: 'Retirer', danger: true,
    });
    if (!ok) return;
    this.service.retirer(m.id).subscribe({
      next: () => { this.toast.success('Message retiré.'); this.charger(true); },
      error: (e) => this.toast.error(e?.error?.message || 'Retrait impossible.'),
    });
  }

  date(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}`;
  }

  initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }
}
