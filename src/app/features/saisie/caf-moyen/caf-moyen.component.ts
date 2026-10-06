import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-caf-moyen',
  templateUrl: './caf-moyen.component.html',
  standalone: false,
})
export class CafMoyenComponent implements OnInit {
  loading = true;
  saving  = false;
  error: string | null = null;

  annee: number = new Date().getFullYear();
  mois: { num: number; label: string }[] = [];
  tableau: any[] = [];

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('caf_moyen', 'WRITE'); }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/caf-moyen?annee=${this.annee}`).subscribe({
      next: (data) => {
        this.mois    = data.mois;
        this.tableau = data.tableau;
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

  onAnneeChange(): void {
    this.loadData();
  }

  cafMoyen(p: any): number | null {
    const vals = this.mois.map(m => p.valeurs[m.num]).filter(v => v != null && v !== '');
    if (vals.length === 0) return null;
    return vals.reduce((s: number, v: any) => s + parseFloat(v), 0) / vals.length;
  }

  onSave(): void {
    const entries: any[] = [];
    for (const bloc of this.tableau) {
      for (const p of bloc.produits) {
        for (const m of this.mois) {
          const val = p.valeurs[m.num];
          entries.push({
            annee:      this.annee,
            mois:       m.num,
            corridor:   bloc.corridor,
            produit_id: p.produit_id,
            valeur_caf: (val != null && val !== '') ? parseFloat(val) : null,
          });
        }
      }
    }

    this.saving = true;
    this.http.post(`${environment.apiUrl}/caf-moyen/saisie`, { entries }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('CAF moyen enregistré avec succès.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  trackByCorr(_: number, b: any): string { return b.corridor; }
  trackByProd(_: number, p: any): number { return p.produit_id; }
  trackByMois(_: number, m: any): number { return m.num; }
}
