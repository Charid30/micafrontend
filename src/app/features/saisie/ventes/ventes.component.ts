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
import { inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';
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
  private readonly dialog = inject(DialogService);
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

  async onArchive(): Promise<void> {
    if (!this.rapport || !(await this.dialog.confirmer({
      titre: `Archiver le rapport de la semaine ${this.rapport.semaine_iso} / ${this.rapport.annee} ?`,
      message: 'Le rapport sera publié et ne pourra plus être modifié. La saisie passera à la semaine suivante.',
      confirmer: 'Archiver',
    }))) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  async onSave(): Promise<void> {
    if (!this.rapport) return;
    if (!(await this.dialog.confirmerEnregistrement('les ventes de la semaine'))) return;
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
