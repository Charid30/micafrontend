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

const API = `${environment.apiUrl}/achats-traders`;

@Component({
  selector: 'app-achats-traders',
  templateUrl: './achats-traders.component.html',
  standalone: false,
})
export class AchatsTradersComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  produits: any[] = [];
  fournisseurs: any[] = [];
  achats: any[] = [];
  // Lignes enregistrees retirees du registre (envoyees a l'enregistrement)
  supprimes: number[] = [];
  // Filtres d'affichage (le registre complet est enregistre)
  filtreAnnee = '';
  filtreStatut: 'tous' | 'a-livrer' | 'livres' = 'tous';
  private readonly aujourdhui = new Date().toISOString().split('T')[0];

  loading = true;
  saving = false;
  error = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('achats-traders', 'WRITE'); }

  ngOnInit(): void {
    this.http.get<any>(`${API}/registre`).subscribe({
      next: (res) => {
        this.produits = res.produits || [];
        this.fournisseurs = res.fournisseurs || [];
        this.achats = (res.achats || []).map((a: any) => ({ ...a }));
        this.supprimes = [];
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

  // ── Filtres
  get annees(): string[] {
    return [...new Set(this.achats.map(a => String(a.date_livraison || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  }
  get lignes(): any[] {
    return this.achats.filter(a => {
      if (!a.id) return true;                                     // ligne en cours de saisie : toujours visible
      const d = String(a.date_livraison || '');
      if (this.filtreAnnee && !d.startsWith(this.filtreAnnee)) return false;
      if (this.filtreStatut === 'a-livrer' && d < this.aujourdhui) return false;
      if (this.filtreStatut === 'livres' && d >= this.aujourdhui) return false;
      return true;
    });
  }
  estLivre(row: any): boolean { return !!row.date_livraison && row.date_livraison < this.aujourdhui; }

  ajouterLigne(): void {
    this.achats.unshift({
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

  async supprimerLigne(row: any): Promise<void> {
    if (row.id && !(await this.dialog.confirmer({
      titre: 'Retirer cet achat du registre ?',
      message: "La suppression sera effective à l'enregistrement.", confirmer: 'Retirer', danger: true,
    }))) return;
    this.achats = this.achats.filter(a => a !== row);
    if (row.id) this.supprimes.push(row.id);
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
    return this.lignes.reduce((s, r) => s + (parseFloat(r.quantite_tm) || 0), 0);
  }

  totalM315(): number {
    return this.lignes.reduce((s, r) => s + (parseFloat(r.quantite_m3_15) || 0), 0);
  }

  totalM3Ambiant(): number {
    return this.lignes.reduce((s, r) => s + (parseFloat(r.quantite_m3_ambiant) || 0), 0);
  }

  totalValeurCafUsd(): number {
    return this.lignes.reduce((s, r) => s + this.valeurCafUsd(r), 0);
  }

  totalMontantCfa(): number {
    return this.lignes.reduce((s, r) => s + this.montantCfa(r), 0);
  }

  totalFraisLcCfa(): number {
    return this.lignes.reduce((s, r) => s + (parseFloat(r.frais_lc_cfa) || 0), 0);
  }

  totalFraisLcPct(): number {
    const total = this.totalMontantCfa();
    return total > 0 ? (this.totalFraisLcCfa() / total) * 100 : 0;
  }

  // ── Sauvegarde ─────────────────────────────────────────────

  async onSave(): Promise<void> {
    const incomplete = this.achats.findIndex(r => !r.produit_id || !r.fournisseur_id || !r.date_livraison);
    if (incomplete !== -1) {
      this.toast.error('Chaque ligne doit avoir un produit, un fournisseur et une date de livraison.');
      return;
    }
    if (!(await this.dialog.confirmerEnregistrement('le registre des achats traders',
      this.supprimes.length ? `${this.supprimes.length} achat(s) seront retirés du registre.` : undefined))) return;
    this.saving = true;
    this.cdr.detectChanges();

    const payload = {
      supprimes: this.supprimes,
      achats: this.achats.map((r) => ({
        id: r.id || null,
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
        this.ngOnInit();
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
