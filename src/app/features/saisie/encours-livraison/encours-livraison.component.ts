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

const API = `${environment.apiUrl}/encours-livraison`;

interface LigneEncours {
  produit_id: number | null;
  fournisseur_id: number | null;
  corridor_id: number | null;
  quantite_tm: number | null;
  date_livraison: string | null;
  statut: string;
  observation: string;
}

// Menu Encours (onglet « Encours » du fichier Suivi des indicateurs) :
// planning de livraison des fournisseurs et synthese par produit (cumul, besoin, taux de couverture)
@Component({
  selector: 'app-encours-livraison',
  templateUrl: './encours-livraison.component.html',
  standalone: false,
})
export class EncoursLivraisonComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  rapport: any = null;
  frequence: string | null = null;
  dateSaisie: string | null = null;
  produits: any[] = [];
  fournisseurs: any[] = [];
  corridors: any[] = [];
  statuts: { code: string; libelle: string }[] = [];
  lignes: LigneEncours[] = [];
  besoins: Record<number, number | null> = {};

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

  get canWrite(): boolean { return this.authService.hasPermission('encours-livraison', 'WRITE'); }
  get publie(): boolean { return this.rapport?.statut === 'PUBLIE'; }

  ngOnInit(): void {
    this.http.get<any>(`${API}/semaine-courante`).subscribe({
      next: (res) => {
        this.rapport = res.rapport;
        this.frequence = res.frequence || null;
        this.dateSaisie = res.date_saisie || null;
        this.produits = res.produits || [];
        this.fournisseurs = res.fournisseurs || [];
        this.corridors = res.corridors || [];
        this.statuts = res.statuts || [];
        this.lignes = (res.lignes || []).map((l: any) => ({ ...l, observation: l.observation || '' }));
        this.besoins = { ...(res.besoins || {}) };
        this.trier();
        this.loading = false;
        this.error = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Planning
  ajouterLigne(produitId: number | null = null): void {
    this.lignes.push({ produit_id: produitId, fournisseur_id: null, corridor_id: null, quantite_tm: null, date_livraison: null, statut: 'EN_COURS', observation: '' });
  }

  supprimerLigne(i: number): void { this.lignes.splice(i, 1); }

  // Lignes regroupees par produit, dans l'ordre des produits (comme le fichier Excel)
  trier(): void {
    const ordre = new Map(this.produits.map((p, i) => [p.id, i]));
    const nom = (id: number | null) => this.fournisseurs.find(f => f.id === id)?.libelle || '';
    this.lignes.sort((a, b) => (ordre.get(a.produit_id as number) ?? 99) - (ordre.get(b.produit_id as number) ?? 99)
      || nom(a.fournisseur_id).localeCompare(nom(b.fournisseur_id)));
  }

  // ── Synthese par produit (meme calcul que le serveur et l'onglet Excel)
  private qte(l: LigneEncours): number { return Number(l.quantite_tm) || 0; }

  get fournisseursUtilises(): any[] {
    return this.fournisseurs.filter(f => this.lignes.some(l => l.fournisseur_id === f.id));
  }

  get produitsSynthese(): any[] {
    return this.produits.filter(p => this.lignes.some(l => l.produit_id === p.id) || (Number(this.besoins[p.id]) > 0));
  }

  quantite(produitId: number, fournisseurId: number): number | null {
    const l = this.lignes.filter(x => x.produit_id === produitId && x.fournisseur_id === fournisseurId);
    return l.length ? l.reduce((s, x) => s + this.qte(x), 0) : null;
  }

  cumul(produitId: number): number {
    return this.lignes.filter(l => l.produit_id === produitId).reduce((s, l) => s + this.qte(l), 0);
  }

  besoin(produitId: number): number | null {
    const b = this.besoins[produitId];
    return b === null || b === undefined || (b as any) === '' ? null : Number(b);
  }

  taux(produitId: number): number | null {
    const b = this.besoin(produitId);
    return b && b > 0 ? this.cumul(produitId) / b : null;
  }

  totalFournisseur(fournisseurId: number): number {
    return this.lignes.filter(l => l.fournisseur_id === fournisseurId).reduce((s, l) => s + this.qte(l), 0);
  }
  get totalCumul(): number { return this.lignes.reduce((s, l) => s + this.qte(l), 0); }
  get totalBesoin(): number { return this.produitsSynthese.reduce((s, p) => s + (this.besoin(p.id) || 0), 0); }
  get totalTaux(): number | null { return this.totalBesoin > 0 ? this.totalCumul / this.totalBesoin : null; }

  classeCouverture(taux: number | null): string {
    if (taux === null) return 'text-gray-400';
    return taux >= 1 ? 'text-primary-700' : taux >= 0.5 ? 'text-amber-700' : 'text-red-700';
  }

  libelleProduit(id: number | null): string { return this.produits.find(p => p.id === id)?.libelle || ''; }

  // Premiere ligne d'un groupe de produit (affichage du cumul par produit dans le planning)
  debutGroupe(i: number): boolean { return i === 0 || this.lignes[i - 1].produit_id !== this.lignes[i].produit_id; }

  // ── Actions
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
    // Lignes totalement vides : ignorees ; ligne incomplete : signalee avant l'envoi
    const lignes = this.lignes.filter(l => l.produit_id || l.fournisseur_id || l.quantite_tm);
    const incomplete = lignes.findIndex(l => !l.produit_id || !l.fournisseur_id || l.quantite_tm === null || (l.quantite_tm as any) === '');
    if (incomplete >= 0) {
      this.toast.error(`Ligne ${incomplete + 1} du planning : produit, fournisseur et quantité prévue sont obligatoires.`);
      return;
    }
    if (!(await this.dialog.confirmerEnregistrement('les encours de la semaine'))) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.http.post<any>(`${API}/saisie`, { rapport_id: this.rapport.id, lignes, besoins: this.besoins }).subscribe({
      next: (res) => {
        this.saving = false;
        this.lignes = lignes;
        this.trier();
        this.toast.success(res.message || 'Encours enregistrés.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }
}
