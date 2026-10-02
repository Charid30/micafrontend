import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

const API = `${environment.apiUrl}/achats-traders`;

@Component({
  selector: 'app-achats-traders',
  templateUrl: './achats-traders.component.html',
  standalone: false,
})
export class AchatsTradersComponent implements OnInit {
  rapport: any = null;
  produits: any[] = [];
  fournisseurs: any[] = [];
  achats: any[] = [];

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

  get canWrite(): boolean { return this.authService.hasPermission('achats-traders', 'WRITE'); }

  ngOnInit(): void {
    this.http.get<any>(`${API}/semaine-courante`).subscribe({
      next: (res) => {
        this.rapport = res.rapport;
        this.produits = res.produits || [];
        this.fournisseurs = res.fournisseurs || [];
        this.achats = (res.achats || []).map((a: any) => ({ ...a }));
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

  ajouterLigne(): void {
    this.achats.push({
      produit_id: '',
      fournisseur_id: '',
      type_operation: '',
      lieu_livraison: '',
      date_livraison: '',
      quantite_tm: null,
      quantite_m3_15: null,
      quantite_m3_ambiant: null,
      periode_cotation: '',
      prix_unitaire_caf_usd: null,
      taux_change: null,
      frais_lc_cfa: null,
    });
    this.cdr.detectChanges();
  }

  supprimerLigne(index: number): void {
    this.achats.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ── Calculs en temps réel ──────────────────────────────────

  valeurCafUsd(row: any): number {
    return (parseFloat(row.quantite_tm) || 0) * (parseFloat(row.prix_unitaire_caf_usd) || 0);
  }

  montantCfa(row: any): number {
    return this.valeurCafUsd(row) * (parseFloat(row.taux_change) || 0);
  }

  fraisLcPct(row: any): number {
    const montant = this.montantCfa(row);
    const frais = parseFloat(row.frais_lc_cfa) || 0;
    return montant > 0 ? (frais / montant) * 100 : 0;
  }

  coutTotalUnitaire(row: any): number {
    const qtm = parseFloat(row.quantite_tm) || 0;
    if (qtm === 0) return 0;
    return (this.montantCfa(row) + (parseFloat(row.frais_lc_cfa) || 0)) / qtm;
  }

  // ── Totaux ─────────────────────────────────────────────────

  totalQtm(): number {
    return this.achats.reduce((s, r) => s + (parseFloat(r.quantite_tm) || 0), 0);
  }

  totalM315(): number {
    return this.achats.reduce((s, r) => s + (parseFloat(r.quantite_m3_15) || 0), 0);
  }

  totalM3Ambiant(): number {
    return this.achats.reduce((s, r) => s + (parseFloat(r.quantite_m3_ambiant) || 0), 0);
  }

  totalValeurCafUsd(): number {
    return this.achats.reduce((s, r) => s + this.valeurCafUsd(r), 0);
  }

  totalMontantCfa(): number {
    return this.achats.reduce((s, r) => s + this.montantCfa(r), 0);
  }

  totalFraisLcCfa(): number {
    return this.achats.reduce((s, r) => s + (parseFloat(r.frais_lc_cfa) || 0), 0);
  }

  totalFraisLcPct(): number {
    const total = this.totalMontantCfa();
    return total > 0 ? (this.totalFraisLcCfa() / total) * 100 : 0;
  }

  onArchive(): void {
    if (!this.rapport || !confirm('Archiver ce rapport ? Cette action est irréversible.')) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  // ── Sauvegarde ─────────────────────────────────────────────

  onSave(): void {
    if (!this.rapport) return;
    this.saving = true;
    this.cdr.detectChanges();

    const payload = {
      rapport_id: this.rapport.id,
      achats: this.achats.map((r) => ({
        produit_id: r.produit_id || null,
        fournisseur_id: r.fournisseur_id || null,
        type_operation: r.type_operation || '',
        lieu_livraison: r.lieu_livraison || '',
        date_livraison: r.date_livraison || null,
        quantite_tm: parseFloat(r.quantite_tm) || 0,
        quantite_m3_15: parseFloat(r.quantite_m3_15) || null,
        quantite_m3_ambiant: parseFloat(r.quantite_m3_ambiant) || null,
        periode_cotation: r.periode_cotation || '',
        prix_unitaire_caf_usd: parseFloat(r.prix_unitaire_caf_usd) || 0,
        taux_change: parseFloat(r.taux_change) || 0,
        montant_trans_cfa: this.montantCfa(r),
        frais_lc_cfa: parseFloat(r.frais_lc_cfa) || null,
      })),
    };

    this.http.post<any>(`${API}/saisie`, payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.show(res.message || 'Achats enregistrés.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || 'Erreur lors de l\'enregistrement.';
        this.toast.show(msg, 'error');
        this.cdr.detectChanges();
      },
    });
  }
}
