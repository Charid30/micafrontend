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
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ecouterTempsReel } from '../../core/services/temps-reel.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Rafraichissement automatique quand un autre utilisateur enregistre
  private readonly direct = ecouterTempsReel(['*'], () => this.ngOnInit(), { consultation: true });

  today = new Date();
  loading = true;
  stats: any = null;
  error: string | null = null;
  alertesOuvertes = false;
  provisoireOuvert = false;

  private sub: Subscription | null = null;
  private timer: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router, private authService: AuthService) {}

  // Semaine affichee : null = dernier rapport publie
  rapportId: number | null = null;
  rapports: any[] = [];

  // Une session ouverte avant l'ajout du droit a une liste de droits perimee : on la relit avant de conclure
  ngOnInit(): void {
    if (this.authService.hasPermission('dashboard', 'READ')) return this.ouvrir();
    this.authService.relire().subscribe({
      next: () => {
        if (this.authService.hasPermission('dashboard', 'READ')) this.ouvrir();
        else this.router.navigateByUrl(this.authService.pageAccueil(), { replaceUrl: true });
      },
      error: () => { /* 401 : l'intercepteur ferme la session */ },
    });
  }

  private ouvrir(): void {
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
    this.loading = !this.direct.silencieux;
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

  // ── Telephone : en-tete et graphiques simplifies ──
  get prenom(): string {
    const u = this.authService.currentUser;
    return (u?.agent?.prenoms || u?.agent?.nom || '').split(' ')[0];
  }
  // Barre d'autonomie : 45 jours = barre pleine
  largeurAutonomie(j: number | null): number { return j ? Math.max(3, Math.min(100, (j / 45) * 100)) : 0; }
  fondCouleur(c: string | null): string { return c === 'rouge' ? 'bg-red-500' : c === 'jaune' ? 'bg-yellow-500' : 'bg-primary-500'; }
  texteCouleur(c: string | null): string { return c === 'rouge' ? 'text-red-600' : c === 'jaune' ? 'text-yellow-700' : 'text-primary-600'; }

  // Ventes par jour (saisie quotidienne) : hauteur relative au meilleur jour
  get ventesParJour(): { jour: string; quantite: number; hauteur: number }[] {
    const v = (this.stats?.ventesJour || []).filter((x: any) => x.date);
    const max = Math.max(1, ...v.map((x: any) => x.quantite));
    const jours = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return v.map((x: any) => ({ jour: jours[new Date(String(x.date).slice(0, 10) + 'T12:00:00').getDay()], quantite: x.quantite, hauteur: Math.max(4, (x.quantite / max) * 100) }));
  }
  readonly parIndex = (i: number) => i;
  get totalVentes(): number {
    return (this.stats?.ventesJour || []).reduce((t: number, x: any) => t + x.quantite, 0);
  }
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
