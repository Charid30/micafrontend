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
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  today = new Date();
  loading = true;
  stats: any = null;
  error: string | null = null;
  alertesOuvertes = false;

  private sub: Subscription | null = null;
  private timer: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // Semaine affichee : null = dernier rapport publie
  rapportId: number | null = null;
  rapports: any[] = [];

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/rapports/liste`).subscribe({
      next: (liste) => { this.rapports = liste; this.cdr.detectChanges(); },
      error: () => { /* le selecteur reste limite au dernier rapport publie */ },
    });
    this.charger();
  }

  choisirSemaine(id: number | null): void {
    this.rapportId = id;
    this.charger();
  }

  private charger(): void {
    this.loading = true;
    this.error = null;
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
        this.sub?.unsubscribe();
        this.cdr.detectChanges();
      }
    }, 8000);

    const params = this.rapportId ? `?rapport_id=${this.rapportId}` : '';
    this.sub = this.http.get(`${environment.apiUrl}/dashboard/synthese${params}`).subscribe({
      next: (data: any) => {
        clearTimeout(this.timer);
        this.stats = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(this.timer);
        this.loading = false;
        this.error = 'Erreur lors du chargement des données (' + (err.status || 'réseau') + ').';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Situation avec l'État (dettes / créances issues de la saisie Trésorerie)
  readonly titreDettes = "Dettes de l'État envers SONABHY";
  readonly titreCreances = "Créances de l'État sur SONABHY";
  readonly libelleSoldeSonabhy = 'Solde net en faveur de SONABHY';
  readonly libelleSoldeEtat = "Solde net en faveur de l'État";
  get etat(): any { return this.stats?.situationEtat ?? null; }

  private readonly fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  formatNombre(v: number | null | undefined): string { return v === null || v === undefined ? '—' : this.fmt.format(v); }
  formatFcfa(v: number | null | undefined): string { return v === null || v === undefined ? '—' : this.fmt.format(v) + ' FCFA'; }
  // Cartes : montants en milliards (valeur exacte au survol)
  milliards(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : (v / 1e9).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  abs(v: number): number { return Math.abs(v); }
  // Couleur de l'autonomie moyenne : meme echelle que les stocks (rouge < 10 j, jaune < 15 j)
  classeAutonomie(v: number | null | undefined): string {
    if (v === null || v === undefined) return '';
    return v < 10 ? 'text-red-700' : v < 15 ? 'text-yellow-700' : 'text-primary-800';
  }

  // Taux de couverture des encours : couvert (>= 100 %), partiel (>= 50 %), insuffisant
  classeCouverture(taux: number): string {
    return taux >= 1 ? 'badge-success' : taux >= 0.5 ? 'badge-warning' : 'badge-danger';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
  }
}
