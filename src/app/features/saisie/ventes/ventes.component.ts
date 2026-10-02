import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

const API = `${environment.apiUrl}/ventes`;

@Component({
  selector: 'app-ventes',
  templateUrl: './ventes.component.html',
  standalone: false,
})
export class VentesComponent implements OnInit {
  rapport: any = null;
  marketeurs: any[] = [];
  produits: any[] = [];
  matrix: Record<number, Record<number, number>> = {};

  loading = true;
  saving = false;
  archiving = false;
  error = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('ventes', 'WRITE'); }

  ngOnInit(): void {
    this.http.get<any>(`${API}/semaine-courante`).subscribe({
      next: (res) => {
        this.rapport = res.rapport;
        this.marketeurs = res.marketeurs || [];
        this.produits = res.produits || [];
        this.matrix = res.matrix || {};
        this.loading = false;
        this.error = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getQty(marketeurId: number, produitId: number): number {
    return this.matrix[marketeurId]?.[produitId] || 0;
  }

  setQty(marketeurId: number, produitId: number, val: number): void {
    if (!this.matrix[marketeurId]) this.matrix[marketeurId] = {};
    this.matrix[marketeurId][produitId] = isNaN(val) ? 0 : val;
  }

  totalParMarketeur(marketeurId: number): number {
    return this.produits.reduce((s, p) => s + this.getQty(marketeurId, p.id), 0);
  }

  totalParProduit(produitId: number): number {
    return this.marketeurs.reduce((s, m) => s + this.getQty(m.id, produitId), 0);
  }

  totalGeneral(): number {
    return this.produits.reduce((s, p) => s + this.totalParProduit(p.id), 0);
  }

  onArchive(): void {
    if (!this.rapport || !confirm('Archiver ce rapport ? Cette action est irréversible.')) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  onSave(): void {
    if (!this.rapport) return;
    this.saving = true;
    this.cdr.detectChanges();

    const ventes: any[] = [];
    for (const m of this.marketeurs) {
      for (const p of this.produits) {
        const qty = this.getQty(m.id, p.id);
        if (qty > 0) {
          ventes.push({ marketeur_id: m.id, produit_id: p.id, quantite: qty });
        }
      }
    }

    this.http.post<any>(`${API}/saisie`, { rapport_id: this.rapport.id, ventes }).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.show(res.message || 'Ventes enregistrées.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(err?.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
        this.cdr.detectChanges();
      },
    });
  }
}
