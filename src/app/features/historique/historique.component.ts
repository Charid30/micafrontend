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
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration, ChartData } from 'chart.js';
import { environment } from '../../../environments/environment';
import { ecouterTempsReel } from '../../core/services/temps-reel.service';
import { ToastService } from '../../core/services/toast.service';

interface Serie { label: string; data: (number | null)[]; color: string; }
interface HistoData { labels: string[]; datasets: Serie[]; }

const MODULES = [
  { key: 'journalier', label: 'Stocks jour par jour (semaine)', unite: 'm³' },
  { key: 'stocks',     label: 'Stocks disponibles',     unite: 'TM' },
  { key: 'corridors',  label: 'Camions chargés / corridor', unite: 'camions' },
  { key: 'tresorerie', label: 'Trésorerie simulée',      unite: 'FCFA' },
  { key: 'ventes',     label: 'Ventes par produit',      unite: 'TM' },
];

const PERIODES = [
  { val: 4,  label: '4 semaines' },
  { val: 8,  label: '8 semaines' },
  { val: 12, label: '12 semaines' },
  { val: 26, label: '6 mois' },
  { val: 52, label: '1 an' },
];

@Component({
  selector: 'app-historique',
  templateUrl: './historique.component.html',
  standalone: false,
})
export class HistoriqueComponent implements OnInit {
  // Rafraichissement automatique quand un autre utilisateur enregistre
  private readonly direct = ecouterTempsReel(['*'], () => this.loadData(), { consultation: true });

  modules  = MODULES;
  periodes = PERIODES;

  moduleKey = 'stocks';

  // ── Vue « jour par jour » : une semaine, par depot et par produit
  journalier: any = null;
  semaineId: number | null = null;
  depotId: number | null = null;
  produitId: number | null = null;
  depots: any[] = [];
  produits: any[] = [];
  readonly couleurs = ['#235347', '#C2410C', '#1D4ED8', '#7C3AED', '#B91C1C', '#0E7490', '#A16207', '#4D7C0F', '#BE185D', '#475569', '#15803D', '#9333EA'];
  semaines  = 12;

  loading = false;
  error: string | null = null;

  chartData: ChartData<'line'> = { labels: [], datasets: [] };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, color: '#0B2B26' } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${this._fmt(ctx.parsed.y)}` } },
    },
    scales: {
      x: {
        grid: { color: '#DAF1DE' },
        ticks: { color: '#235347', font: { size: 11 } },
      },
      y: {
        grid: { color: '#DAF1DE' },
        ticks: { color: '#235347', font: { size: 11 }, callback: (v) => this._fmt(+v) },
        beginAtZero: false,
      },
    },
    elements: { line: { tension: 0.3 }, point: { radius: 4, hoverRadius: 6 } },
  };

  // ── Export Excel des saisies d'une période (un an au plus)
  readonly raccourcis = [
    { jours: 7, libelle: '7 jours' }, { jours: 30, libelle: '30 jours' },
    { jours: 90, libelle: '3 mois' }, { jours: 365, libelle: '1 an' },
  ];
  readonly aujourdhui = this.isoJour(new Date());
  exportOuvert = false;
  exportEnCours = false;
  erreurExport: string | null = null;
  raccourciActif: number | null = 30;
  exportFin = this.aujourdhui;
  exportDebut = this.isoJour(new Date(Date.now() - 29 * 86400000));

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService) {}

  private isoJour(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  choisirRaccourci(jours: number): void {
    this.raccourciActif = jours;
    this.exportFin = this.aujourdhui;
    this.exportDebut = this.isoJour(new Date(Date.now() - (jours - 1) * 86400000));
    this.erreurExport = null;
  }

  exporter(): void {
    this.erreurExport = null;
    if (this.exportFin < this.exportDebut) { this.erreurExport = 'La date de fin précède la date de début.'; return; }
    this.exportEnCours = true;
    const q = new URLSearchParams({ debut: this.exportDebut, fin: this.exportFin });
    this.http.get(`${environment.apiUrl}/historique/export?${q.toString()}`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (res) => {
        const nom = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
          || `Indicateur_SONABHY_historique_${this.exportDebut}_${this.exportFin}.xlsx`;
        const url = URL.createObjectURL(res.body as Blob);
        const a = document.createElement('a');
        a.href = url; a.download = nom; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.exportEnCours = false;
        this.exportOuvert = false;
        this.toast.success('Fichier Excel téléchargé.');
        this.cdr.detectChanges();
      },
      error: async (err) => {
        // Réponse d'erreur reçue en Blob : on lit le message du serveur
        let message = "Erreur lors de l'export Excel.";
        try { message = JSON.parse(await (err.error as Blob).text()).message || message; } catch { /* message par défaut */ }
        this.erreurExport = message;
        this.exportEnCours = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/depots`).subscribe({ next: d => { this.depots = d.filter((x: any) => !x.del); this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${environment.apiUrl}/produits`).subscribe({ next: p => { this.produits = p.filter((x: any) => !x.del); this.cdr.detectChanges(); } });
    this.loadData();
  }

  get vueJournaliere(): boolean { return this.moduleKey === 'journalier'; }

  get moduleLabel(): string { return MODULES.find(m => m.key === this.moduleKey)?.label ?? ''; }
  get unite(): string       { return MODULES.find(m => m.key === this.moduleKey)?.unite ?? ''; }

  loadData(): void {
    this.loading = !this.direct.silencieux;
    this.error   = null;
    if (this.vueJournaliere) { this.loadJournalier(); return; }
    this.http.get<HistoData>(`${environment.apiUrl}/historique/${this.moduleKey}?semaines=${this.semaines}`)
      .subscribe({
        next: (data) => {
          this.chartData = {
            labels: data.labels,
            datasets: data.datasets.map(s => ({
              label: s.label,
              data: s.data,
              borderColor: s.color,
              backgroundColor: s.color + '22',
              pointBackgroundColor: s.color,
              fill: false,
              spanGaps: true,
            })),
          };
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error   = 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  onModuleChange(): void { this.loadData(); }

  loadJournalier(): void {
    const q = new URLSearchParams();
    if (this.semaineId) q.set('rapport_id', String(this.semaineId));
    if (this.depotId) q.set('depot_id', String(this.depotId));
    if (this.produitId) q.set('produit_id', String(this.produitId));
    this.http.get<any>(`${environment.apiUrl}/historique/journalier?${q.toString()}`).subscribe({
      next: (r) => {
        this.journalier = r;
        if (r.semaine) this.semaineId = r.semaine.id;
        // Graphe : lignes depot x produit (12 au plus) ; sinon totaux par produit
        const series = (r.lignes.length && r.lignes.length <= 12) ? r.lignes : r.syntheses.slice(0, 12);
        this.chartData = {
          labels: r.jours.map((j: any) => j.libelle),
          datasets: series.map((l: any, i: number) => {
            const c = this.couleurs[i % this.couleurs.length];
            return {
              label: l.depot ? `${l.depot} – ${l.produit}` : `${l.type === 'INTERIEUR' ? 'Total intérieur' : 'Total extérieur'} – ${l.produit}`,
              data: l.valeurs.map((v: any) => (v ? v.volume : null)),
              borderColor: c, backgroundColor: c + '22', pointBackgroundColor: c, fill: false,
              // Jours sans saisie : les points sont relies en pointilles (aucune valeur inventee)
              spanGaps: true,
              segment: { borderDash: (ctx: any) => (ctx.p0.skip || ctx.p1.skip ? [6, 6] : undefined) },
            };
          }),
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  classeAutonomie(c: string | null): string { return c ? `auto-${c}` : 'auto-aucune'; }
  onPeriodeChange(): void { this.loadData(); }

  private _fmt(v: number | null): string {
    if (v == null || isNaN(v)) return '—';
    if (this.moduleKey === 'tresorerie') {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA';
    }
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' ' + this.unite;
  }
}
