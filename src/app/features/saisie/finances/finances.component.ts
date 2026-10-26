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
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

// Situation de tresorerie : lignes parametrables, N-1 repris du rapport precedent.
// Les calculs reproduisent ceux du serveur (Backend/src/services/tresorerie.service.js) pour l'affichage en direct.
@Component({
  selector: 'app-finances',
  templateUrl: './finances.component.html',
  standalone: false,
})
export class FinancesComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving  = false;
  error: string | null = null;
  rapport: any = null;
  rapportPrecedent: any = null;
  droits = { saisie: false, lignes: false };
  lignes: any[] = [];

  // Gestion des lignes
  modalLignes = false;
  gestion: any[] = [];
  savingLigne: number | string | null = null;
  nouvelle = { libelle: '', type: 'SAISIE', sens: 'AVOIR', parent_id: null as number | null };
  private lignesModifiees = false;

  private readonly api = `${environment.apiUrl}/finances`;
  private readonly fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService) {}

  get estPublie(): boolean { return this.rapport?.statut === 'PUBLIE'; }
  get sousTotaux(): any[] { return this.gestion.filter(g => g.type === 'SOUS_TOTAL' && g.id); }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.http.get(`${this.api}/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport = data.rapport;
        this.rapportPrecedent = data.rapport_precedent;
        this.droits = data.droits || this.droits;
        // Valeur saisie directement pour un sous-total (anciens rapports) : conservee si aucun detail n'est renseigne
        this.lignes = (data.lignes || []).map((l: any) => ({ ...l, montant_direct: l.type === 'SOUS_TOTAL' ? l.montant_n : null }));
        this.recalculer();
        this.error = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = err.error?.message || 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Calculs en direct
  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(v); return Number.isFinite(n) ? n : null;
  }

  recalculer(): void {
    const parId: Record<number, any> = {};
    this.lignes.forEach(l => { parId[l.id] = l; });
    for (const st of this.lignes.filter(l => l.type === 'SOUS_TOTAL')) {
      const details = this.lignes.filter(l => l.parent_id === st.id && l.type === 'SAISIE').map(l => this.num(l.montant_n)).filter(v => v !== null) as number[];
      st.montant_n = details.length ? details.reduce((s, v) => s + v, 0) : this.num(st.montant_direct);
    }
    const premiers = this.lignes.filter(l => !l.parent_id && l.type !== 'TOTAL' && this.num(l.montant_n) !== null);
    const total = premiers.length ? premiers.reduce((s, l) => s + (l.sens === 'DETTE' ? -1 : 1) * (this.num(l.montant_n) as number), 0) : null;
    this.lignes.filter(l => l.type === 'TOTAL').forEach(t => { t.montant_n = total; });
    this.lignes.forEach(l => Object.assign(l, this.evolution(l, this.num(l.montant_n1), this.num(l.montant_n))));
  }

  // % de variation, ou ecart en FCFA quand le signe change ; une hausse de dette est defavorable
  private evolution(l: any, n1: number | null, n: number | null) {
    if (n1 === null || n === null) return { ecart: null, variation_pct: null, changement_signe: false, tendance: null, favorable: null };
    const ecart = n - n1;
    const changementSigne = Math.abs(n1) < 0.005 || (Math.sign(n1) !== Math.sign(n) && Math.abs(n) >= 0.005);
    const tendance = Math.abs(ecart) < 0.005 ? 'stable' : (ecart > 0 ? 'hausse' : 'baisse');
    const favorable = tendance === 'stable' ? null : (l.sens === 'DETTE' && l.type !== 'TOTAL' ? ecart < 0 : ecart > 0);
    return { ecart, variation_pct: changementSigne ? null : ecart / Math.abs(n1), changement_signe: changementSigne, tendance, favorable };
  }

  classeTendance(l: any): string {
    if (l.favorable === null || l.favorable === undefined) return 'tendance-stable';
    return l.favorable ? 'tendance-favorable' : 'tendance-defavorable';
  }

  montant(l: any, v: any): string {
    const n = this.num(v);
    return n === null ? '—' : this.fmt.format(n);
  }

  formatMontant(v: any): string {
    const n = this.num(v);
    return n === null ? '—' : this.fmt.format(n) + ' FCFA';
  }

  async onSave(): Promise<void> {
    const saisies = this.lignes.filter(l => l.saisissable);
    if (saisies.some(l => (this.num(l.montant_n) ?? 0) < 0)) {
      this.toast.error('Saisissez des montants positifs : le sens avoir/dette est appliqué automatiquement.');
      return;
    }
    if (!(await this.dialog.confirmerEnregistrement('la situation de trésorerie'))) return;
    this.saving = true;
    this.http.post(`${this.api}/saisie`, {
      rapport_id: this.rapport.id,
      lignes: saisies.map(l => ({ code: l.code, montant_n: this.num(l.montant_n) })),
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toast.success(res?.message || 'Trésorerie enregistrée avec succès.');
        this.charger();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Gestion des lignes
  ouvrirLignes(): void {
    this.http.get<any[]>(`${this.api}/lignes`).subscribe({
      next: (lignes) => {
        this.gestion = lignes.map(l => ({ ...l }));
        this.modalLignes = true;
        this.lignesModifiees = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.toast.error(err.error?.message || 'Erreur lors du chargement des lignes.'); },
    });
  }

  fermerLignes(): void {
    this.modalLignes = false;
    if (this.lignesModifiees) this.charger();
    this.cdr.detectChanges();
  }

  async enregistrerLigne(g: any): Promise<void> {
    if (!String(g.libelle || '').trim()) { this.toast.error('Le libellé est obligatoire.'); return; }
    const body: any = { libelle: g.libelle.trim() };
    if (g.type !== 'TOTAL') {
      Object.assign(body, { type: g.type, sens: g.sens, parent_id: g.type === 'SAISIE' ? g.parent_id : null, ordre: Number(g.ordre) || 0, actif: !!g.actif });
    }
    if (!(await this.dialog.confirmerEnregistrement(`la ligne « ${g.libelle} »`))) return;
    this.savingLigne = g.id;
    this.http.put(`${this.api}/lignes/${g.id}`, body).subscribe({
      next: (res: any) => {
        this.savingLigne = null;
        this.lignesModifiees = true;
        this.toast.success(res?.message || 'Ligne mise à jour.');
        this.ouvrirLignes();
      },
      error: (err) => {
        this.savingLigne = null;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  async ajouterLigne(): Promise<void> {
    const n = this.nouvelle;
    if (!n.libelle.trim()) return;
    if (!(await this.dialog.confirmerEnregistrement(`la nouvelle ligne « ${this.nouvelle.libelle.trim()} »`))) return;
    this.savingLigne = 'nouvelle';
    this.http.post(`${this.api}/lignes`, {
      libelle: n.libelle.trim(), type: n.type, sens: n.sens, parent_id: n.type === 'SAISIE' ? n.parent_id : null,
    }).subscribe({
      next: (res: any) => {
        this.savingLigne = null;
        this.lignesModifiees = true;
        this.nouvelle = { libelle: '', type: 'SAISIE', sens: 'AVOIR', parent_id: null };
        this.toast.success(res?.message || 'Ligne ajoutée.');
        this.ouvrirLignes();
      },
      error: (err) => {
        this.savingLigne = null;
        this.toast.error(err.error?.message || 'Erreur lors de l\'ajout.');
        this.cdr.detectChanges();
      },
    });
  }
}
