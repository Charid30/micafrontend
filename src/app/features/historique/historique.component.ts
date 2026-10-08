import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration, ChartData } from 'chart.js';
import { environment } from '../../../environments/environment';

interface Serie { label: string; data: (number | null)[]; color: string; }
interface HistoData { labels: string[]; datasets: Serie[]; }

const MODULES = [
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
  modules  = MODULES;
  periodes = PERIODES;

  moduleKey = 'stocks';
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

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadData(); }

  get moduleLabel(): string { return MODULES.find(m => m.key === this.moduleKey)?.label ?? ''; }
  get unite(): string       { return MODULES.find(m => m.key === this.moduleKey)?.unite ?? ''; }

  loadData(): void {
    this.loading = true;
    this.error   = null;
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
  onPeriodeChange(): void { this.loadData(); }

  private _fmt(v: number | null): string {
    if (v == null || isNaN(v)) return '—';
    if (this.moduleKey === 'tresorerie') {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA';
    }
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' ' + this.unite;
  }
}
