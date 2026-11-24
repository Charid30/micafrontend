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
import { Chart, ChartConfiguration, ChartData, Plugin } from 'chart.js';
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

// Palette des séries : 8 teintes vérifiées (daltonisme, séparation, bande de luminosité) sur fond blanc,
// attribuées dans cet ordre fixe ; une couleur suit son entité (dépôt, produit…), jamais son rang.
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const ENCRE = { texte: '#374151', titre: '#0B2B26', discret: '#6B7280', grille: '#EEF1EF', axe: '#E5E7EB', surface: '#ffffff' };

// Réticule : trait vertical au jour survolé, sous les courbes
const reticule: Plugin<'line'> = {
  id: 'reticule',
  beforeDatasetsDraw(chart: Chart) {
    const actifs = chart.tooltip?.getActiveElements?.() || [];
    if (!actifs.length) return;
    const x = actifs[0].element.x;
    const { top, bottom } = chart.chartArea;
    const c = chart.ctx;
    c.save();
    c.strokeStyle = '#9CA3AF';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke();
    c.restore();
  },
};

/** Petit graphique d'un produit (vue jour par jour) */
interface PetitGraphe { produit: string; data: ChartData<'line'>; dernier: { volume: number; jour: string } | null; options: ChartConfiguration<'line'>['options']; }
/** Ecart d'ordre de grandeur au-dela duquel les series sont montrees chacune dans son graphique */
const ECART_MAX = 8;

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
  readonly plugins = [reticule];
  /** Vue jour par jour : un graphique par produit (chacun à son échelle) et la légende commune des séries */
  petits: PetitGraphe[] = [];
  legende: { nom: string; couleur: string }[] = [];
  semaines  = 12;

  loading = false;
  error: string | null = null;

  chartData: ChartData<'line'> = { labels: [], datasets: [] };

  chartOptions = this.options(false);

  /** compact : petits graphiques (pas de légende Chart.js, la légende commune est au-dessus) */
  private options(compact: boolean, borne: { min: number; max: number; pas: number } | null = null): ChartConfiguration<'line'>['options'] {
    const police = { family: "'Inter', system-ui, sans-serif", size: 11 };
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 6, right: 10 } },
      plugins: {
        legend: compact ? { display: false } : {
          position: 'bottom', align: 'start',
          labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16, color: ENCRE.texte, font: { ...police, size: 12 } },
        },
        tooltip: {
          backgroundColor: ENCRE.surface, titleColor: ENCRE.titre, bodyColor: ENCRE.texte,
          borderColor: ENCRE.axe, borderWidth: 1, padding: 10, cornerRadius: 8,
          usePointStyle: true, boxWidth: 8, boxHeight: 8, boxPadding: 4,
          titleFont: { ...police, size: 12, weight: 600 }, bodyFont: { ...police, size: 12 },
          callbacks: { label: (ctx) => ` ${ctx.dataset.label} : ${this._fmt(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: ENCRE.axe },
          ticks: { color: ENCRE.discret, font: police, maxRotation: 0, autoSkipPadding: 12 },
        },
        y: {
          grid: { color: ENCRE.grille },
          border: { display: false },
          // L'unite est dans le titre : les graduations ne portent que le nombre
          ticks: { color: ENCRE.discret, font: police, maxTicksLimit: compact ? 6 : 6, padding: 6, ...(borne ? { stepSize: borne.pas } : {}), callback: (v) => this._nombre(+v) },
          // Vue d'ensemble : depart a zero ; petits graphiques : echelle calee sur leurs propres valeurs
          ...(borne ? { min: borne.min, max: borne.max } : { beginAtZero: true }),
        },
      },
      elements: {
        // Lissage monotone : la courbe ne depasse jamais les valeurs saisies (pas de faux pic entre deux jours)
        line: { cubicInterpolationMode: 'monotone', borderWidth: 2, borderCapStyle: 'round', borderJoinStyle: 'round' },
        // Points de 8 px entoures d'un anneau blanc : lisibles la ou les courbes se croisent
        point: { radius: 4, hoverRadius: 6, borderWidth: 2, hoverBorderWidth: 2, borderColor: ENCRE.surface },
      },
    };
  }

  /** Echelle d'un petit graphique : valeurs extremes + 10 % de marge, sans passer sous zero si tout est positif */
  private borne(series: (number | null)[][]): { min: number; max: number; pas: number } | null {
    const v = series.flat().filter((x): x is number => x !== null && !isNaN(x));
    if (!v.length) return null;
    const bas = Math.min(...v), haut = Math.max(...v);
    const marge = (haut - bas) * 0.1 || Math.abs(haut) * 0.1 || 1;
    let min = bas - marge;
    if (bas >= 0 && min < 0) min = 0;
    // Pas « rond » (1, 2 ou 5 × 10^n) pour environ 4 graduations ; bornes alignees sur ce pas
    const brut = Math.max(haut + marge - min, 1) / 4;
    const p10 = Math.pow(10, Math.floor(Math.log10(brut)));
    const pas = [1, 2, 5, 10].map(k => k * p10).find(x => x >= brut) || 10 * p10;
    return { min: Math.floor(min / pas) * pas, max: Math.ceil((haut + marge) / pas) * pas, pas };
  }

  /** Serie au style commun : trait de 2 px, points pleins cernes de blanc */
  private serie(label: string, data: (number | null)[], couleur: string, pointilles: boolean): any {
    return {
      label, data,
      borderColor: couleur, backgroundColor: couleur, pointBackgroundColor: couleur, pointHoverBackgroundColor: couleur,
      pointBorderColor: ENCRE.surface, pointHoverBorderColor: ENCRE.surface, fill: false,
      // Jours sans saisie : les points sont relies en pointilles (aucune valeur inventee)
      spanGaps: true,
      ...(pointilles ? { segment: { borderDash: (ctx: any) => (ctx.p0.skip || ctx.p1.skip ? [4, 4] : undefined) } } : {}),
    };
  }

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
    this.petits = [];
    this.legende = [];
    if (this.vueJournaliere) { this.loadJournalier(); return; }
    this.http.get<HistoData>(`${environment.apiUrl}/historique/${this.moduleKey}?semaines=${this.semaines}`)
      .subscribe({
        next: (data) => {
          this.chartData = {
            labels: data.labels,
            // Couleur par position de la serie (ordre fixe renvoye par le serveur)
            datasets: data.datasets.map((d, i) => this.serie(d.label, d.data, PALETTE[i % PALETTE.length], false)),
          };
          this.decouperSiEcart(data);
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
        this.construirePetits(r);
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

  // Series d'ordres de grandeur tres differents (ex. Super 91 a 280 000 TM, DDO a 500 TM) : un graphique par
  // serie, chacun a son echelle, au lieu d'une seule courbe lisible et des autres ecrasees sur zero.
  private decouperSiEcart(data: HistoData): void {
    this.petits = [];
    this.legende = [];
    const maxima = data.datasets.map(d => Math.max(0, ...d.data.filter((v): v is number => v !== null).map(Math.abs)));
    const positifs = maxima.filter(m => m > 0);
    if (data.datasets.length < 2 || !positifs.length || Math.max(...positifs) / Math.min(...positifs) <= ECART_MAX) return;
    this.petits = data.datasets.map((d, i) => {
      const idx = d.data.map((v, k) => (v === null ? -1 : k)).filter(k => k >= 0).pop();
      return {
        produit: d.label,
        dernier: idx !== undefined ? { volume: d.data[idx] as number, jour: data.labels[idx] } : null,
        data: { labels: data.labels, datasets: [this.serie(d.label, d.data, PALETTE[i % PALETTE.length], false)] },
        options: this.options(true, this.borne([d.data])),
      };
    });
  }

  // Un graphique par produit, chacun a son echelle (un produit a 50 000 m³ n'ecrase plus ceux a 500 m³).
  // Series : les depots (ou les totaux interieur / exterieur quand aucun detail par depot n'existe).
  // Chaque depot garde la meme couleur dans tous les graphiques.
  private construirePetits(r: any): void {
    const source: any[] = r.lignes?.length ? r.lignes : (r.syntheses || []);
    const nomSerie = (l: any) => l.depot || (l.type === 'INTERIEUR' ? 'Total intérieur' : 'Total extérieur');
    const noms: string[] = [];
    for (const l of source) if (!noms.includes(nomSerie(l))) noms.push(nomSerie(l));
    const couleur = (nom: string) => PALETTE[noms.indexOf(nom) % PALETTE.length];
    this.legende = noms.map(nom => ({ nom, couleur: couleur(nom) }));

    const parProduit = new Map<string, any[]>();
    for (const l of source) {
      if (!parProduit.has(l.produit)) parProduit.set(l.produit, []);
      parProduit.get(l.produit)!.push(l);
    }
    const jours = r.jours.map((j: any) => j.libelle);
    this.petits = [...parProduit.entries()].map(([produit, lignes]) => {
      // Derniere valeur saisie (toutes series confondues quand il n'y en a qu'une)
      let dernier: PetitGraphe['dernier'] = null;
      if (lignes.length === 1) {
        for (let i = lignes[0].valeurs.length - 1; i >= 0; i--) {
          const v = lignes[0].valeurs[i];
          if (v) { dernier = { volume: v.volume, jour: jours[i] }; break; }
        }
      }
      return {
        produit, dernier,
        options: this.options(true, this.borne(lignes.map(l => l.valeurs.map((v: any) => (v ? v.volume : null))))),
        data: {
          labels: jours,
          datasets: lignes.map(l => this.serie(nomSerie(l), l.valeurs.map((v: any) => (v ? v.volume : null)), couleur(nomSerie(l)), true)),
        },
      };
    });
    this.chartData = { labels: [], datasets: [] };
  }

  classeAutonomie(c: string | null): string { return c ? `auto-${c}` : 'auto-aucune'; }
  onPeriodeChange(): void { this.loadData(); }

  private _nombre(v: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, notation: Math.abs(v) >= 1e9 ? 'compact' : 'standard' }).format(v);
  }

  volume(v: number): string {
    return this._fmt(v);
  }

  private _fmt(v: number | null): string {
    if (v == null || isNaN(v)) return '—';
    if (this.moduleKey === 'tresorerie') {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA';
    }
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' ' + this.unite;
  }
}
