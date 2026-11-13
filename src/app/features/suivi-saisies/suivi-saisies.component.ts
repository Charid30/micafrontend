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
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ecouterTempsReel } from '../../core/services/temps-reel.service';

type Etat = 'ok' | 'tard' | 'retard' | 'manquant' | 'attendu' | 'libre';
interface Case { etat: Etat; heure?: string; par?: string; }

/** Apparence et libellé de chaque état d'une case de la grille */
const ETATS: Record<Etat, { libelle: string; classe: string; symbole: string }> = {
  ok:       { libelle: "Saisie à l'heure",            classe: 'bg-primary-500 text-white',                                    symbole: '✓' },
  tard:     { libelle: "Saisie après l'heure limite", classe: 'bg-amber-400 text-amber-950',                                  symbole: '✓' },
  retard:   { libelle: 'En retard aujourd\'hui',       classe: 'bg-red-600 text-white ring-2 ring-red-200 animate-pulse',      symbole: '!' },
  manquant: { libelle: 'Non saisie',                  classe: 'bg-red-50 text-red-500 ring-1 ring-inset ring-red-200',        symbole: '✕' },
  attendu:  { libelle: 'Attendue aujourd\'hui',        classe: 'bg-white text-gray-400 border border-dashed border-gray-300', symbole: '…' },
  libre:    { libelle: 'Pas de saisie attendue',      classe: 'bg-gray-50 text-gray-300',                                     symbole: '–' },
};

@Component({
  selector: 'app-suivi-saisies',
  templateUrl: './suivi-saisies.component.html',
  standalone: false,
})
export class SuiviSaisiesComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  // Rafraîchissement automatique dès qu'une saisie est enregistrée
  private readonly direct = ecouterTempsReel(['*'], () => this.charger(), { consultation: true });
  private sub: Subscription | null = null;

  readonly periodes = [{ jours: 7, libelle: '7 jours' }, { jours: 14, libelle: '14 jours' }, { jours: 31, libelle: '1 mois' }];
  readonly legende = (['ok', 'tard', 'retard', 'manquant', 'attendu', 'libre'] as Etat[]).map(e => ({ etat: e, ...ETATS[e] }));
  jours = 7;
  loading = true;
  erreur: string | null = null;
  data: any = null;

  ngOnInit(): void { this.charger(); }

  choisirPeriode(j: number): void {
    if (j === this.jours) return;
    this.jours = j;
    this.loading = true;
    this.charger();
  }

  charger(): void {
    this.erreur = null;
    this.sub?.unsubscribe();
    this.sub = this.http.get<any>(`${environment.apiUrl}/dashboard/saisies?jours=${this.jours}`).subscribe({
      next: (d) => { this.data = d; this.loading = false; this.cdr.detectChanges(); },
      error: (err) => {
        this.loading = false;
        this.erreur = err.error?.message || 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Affichage
  classe(c: Case): string { return ETATS[c.etat]?.classe ?? ''; }
  symbole(c: Case): string { return ETATS[c.etat]?.symbole ?? ''; }
  info(c: Case, jour: any, ligne: string): string {
    const base = `${ligne} – ${jour.libelle} : ${ETATS[c.etat]?.libelle ?? ''}`;
    return c.heure ? `${base} (${c.heure}${c.par ? ', ' + c.par : ''})` : base;
  }

  /** Avancement du jour : 0 à 100 */
  get avancement(): number {
    const r = this.data?.resume;
    return r?.attendus ? Math.round((r.saisis / r.attendus) * 100) : 0;
  }
  /** Phrase sous le compteur du jour */
  get etatJournee(): string {
    const r = this.data?.resume;
    if (!r) return '';
    const s = (n: number) => (n > 1 ? 's' : '');
    if (r.en_attente) return `${r.en_attente} encore attendue${s(r.en_attente)}`;
    if (r.retards) return `${r.retards} en retard`;
    return r.attendus ? 'Journée bouclée' : 'Aucune saisie attendue';
  }
  classeTaux(t: number | null): string {
    if (t === null || t === undefined) return 'bg-gray-200';
    return t >= 90 ? 'bg-primary-500' : t >= 70 ? 'bg-amber-400' : 'bg-red-500';
  }
  texteTaux(t: number | null): string {
    if (t === null || t === undefined) return 'text-gray-400';
    return t >= 90 ? 'text-primary-700' : t >= 70 ? 'text-amber-700' : 'text-red-600';
  }
  initiales(nom: string | null): string {
    return String(nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  }
  /** « il y a 5 min », « il y a 2 h », sinon date et heure */
  quand(d: string): string {
    const t = new Date(d).getTime();
    const min = Math.round((Date.now() - t) / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    if (min < 24 * 60 && new Date(t).getDate() === new Date().getDate()) return `il y a ${Math.round(min / 60)} h`;
    return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ');
  }

  readonly parIndex = (i: number) => i;
  readonly parCode = (_: number, x: any) => x.code ?? x.depot_id ?? x.date;

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
