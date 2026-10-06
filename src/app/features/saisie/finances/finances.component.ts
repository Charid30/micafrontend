import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-finances',
  templateUrl: './finances.component.html',
  standalone: false,
})
export class FinancesComponent implements OnInit {
  loading = true;
  saving  = false;
  error: string | null = null;
  rapport: any = null;
  lignes: any[] = [];

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('tresorerie', 'WRITE'); }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/finances/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport = data.rapport;
        this.lignes  = data.lignes;
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

  variation(l: any): number | null {
    if (l.calculee) return this.variationSimulee();
    if (l.montant_n1 == null || l.montant_n == null) return null;
    const n1 = parseFloat(l.montant_n1);
    if (n1 === 0) return null;
    return (parseFloat(l.montant_n) - n1) / Math.abs(n1);
  }

  tendance(l: any): string {
    if (l.calculee) return this.tendanceSimulee();
    const v = this.variation(l);
    if (v == null) return '—';
    if (Math.abs(v) < 0.0001) return '→ Stable';
    return v > 0 ? '▲ Hausse' : '▼ Baisse';
  }

  tendanceClass(l: any): string {
    const t = this.tendance(l);
    if (t.includes('Hausse')) return 'badge-success';
    if (t.includes('Baisse')) return 'badge-danger';
    return 'badge-info';
  }

  simulee(): number {
    return this.lignes
      .filter(l => !l.calculee)
      .reduce((s, l) => s + (l.montant_n != null ? l.signe * parseFloat(l.montant_n) : 0), 0);
  }

  simuleeN1(): number {
    return this.lignes
      .filter(l => !l.calculee)
      .reduce((s, l) => s + (l.montant_n1 != null ? l.signe * parseFloat(l.montant_n1) : 0), 0);
  }

  variationSimulee(): number | null {
    const n1 = this.simuleeN1();
    const n  = this.simulee();
    if (n1 === 0) return null;
    return (n - n1) / Math.abs(n1);
  }

  tendanceSimulee(): string {
    const v = this.variationSimulee();
    if (v == null) return '—';
    if (Math.abs(v) < 0.0001) return '→ Stable';
    return v > 0 ? '▲ Hausse' : '▼ Baisse';
  }

  formatMontant(v: any): string {
    if (v == null || v === '') return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
  }

  onSave(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/finances/saisie`, {
      rapport_id: this.rapport.id,
      lignes: this.lignes,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Trésorerie enregistrée avec succès.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }
}
