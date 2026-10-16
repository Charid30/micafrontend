/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { inject } from '@angular/core';
import { DialogService } from '../../core/services/dialog.service';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.component.html',
  standalone: false,
})
export class ParametresComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving = false;
  activeTab = 'produits';

  tabs = [
    { key: 'produits',    label: 'Produits' },
    { key: 'depots',      label: 'Dépôts' },
    { key: 'corridors',   label: 'Corridors' },
    { key: 'fournisseurs',label: 'Fournisseurs' },
    { key: 'marketeurs',  label: 'Marketeurs' },
    { key: 'alertes',     label: 'Alertes seuils' },
  ];

  produits:     any[] = [];
  depots:       any[] = [];
  corridors:    any[] = [];
  fournisseurs: any[] = [];
  marketeurs:   any[] = [];
  alertes:      any[] = [];

  // Modal
  showModal = false;
  modalType = '';
  modalTitle = '';
  form: any = {};

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    let done = 0;
    const tick = () => { done++; if (done === 6) { this.loading = false; this.cdr.detectChanges(); } };

    this.http.get<any[]>(`${API}/produits`).subscribe({ next: d => { this.produits = d; tick(); }, error: () => tick() });
    this.http.get<any[]>(`${API}/depots`).subscribe({ next: d => { this.depots = d; tick(); }, error: () => tick() });
    this.http.get<any[]>(`${API}/corridors`).subscribe({ next: d => { this.corridors = d; tick(); }, error: () => tick() });
    this.http.get<any[]>(`${API}/fournisseurs`).subscribe({ next: d => { this.fournisseurs = d; tick(); }, error: () => tick() });
    this.http.get<any[]>(`${API}/marketeurs`).subscribe({ next: d => { this.marketeurs = d; tick(); }, error: () => tick() });
    this.http.get<any[]>(`${API}/parametres/alertes`).subscribe({ next: d => { this.alertes = d; tick(); }, error: () => tick() });
  }

  getCount(key: string): number {
    const map: Record<string, any[]> = {
      produits: this.produits, depots: this.depots, corridors: this.corridors,
      fournisseurs: this.fournisseurs, marketeurs: this.marketeurs, alertes: this.alertes,
    };
    return (map[key] || []).length;
  }

  // ── Modal ──────────────────────────────────────────────────────
  openModal(type: string, item?: any): void {
    this.modalType = type;
    const labels: Record<string, string> = {
      produit: 'Produit', depot: 'Dépôt', corridor: 'Corridor',
      fournisseur: 'Fournisseur', marketeur: 'Marketeur',
    };
    this.modalTitle = (item ? 'Modifier ' : 'Nouveau ') + (labels[type] || type);
    this.form = item
      ? { ...item }
      : { code: '', libelle: '', unite: '', type: 'INTERIEUR', pays: '' };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.form = {};
    this.cdr.detectChanges();
  }

  async saveModal(): Promise<void> {
    if (!this.form.code || !this.form.libelle) {
      this.toast.error('Code et libellé sont obligatoires.');
      return;
    }
    const urlMap: Record<string, string> = {
      produit: 'produits', depot: 'depots', corridor: 'corridors',
      fournisseur: 'fournisseurs', marketeur: 'marketeurs',
    };
    const url = `${API}/${urlMap[this.modalType]}`;
    if (!(await this.dialog.confirmerEnregistrement(`« ${this.form.libelle} »`))) return;
    const payload = { ...this.form };
    if (payload.code) payload.code = payload.code.toUpperCase();

    this.saving = true;
    const req = this.form.id
      ? this.http.put(`${url}/${this.form.id}`, payload)
      : this.http.post(url, payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.form.id ? 'Modifié avec succès.' : 'Créé avec succès.');
        this.closeModal();
        this.loadAll();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  async delete(type: string, id: number): Promise<void> {
    if (!(await this.dialog.confirmer({ titre: 'Confirmer la suppression ?', message: "L'élément ne sera plus proposé dans les saisies.", confirmer: 'Supprimer', danger: true }))) return;
    const urlMap: Record<string, string> = {
      produit: 'produits', depot: 'depots', corridor: 'corridors',
      fournisseur: 'fournisseurs', marketeur: 'marketeurs',
    };
    this.http.delete(`${API}/${urlMap[type]}/${id}`).subscribe({
      next: () => {
        this.toast.success('Supprimé.');
        this.loadAll();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Impossible de supprimer (utilisé ailleurs).');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alertes ────────────────────────────────────────────────────
  async saveAlerte(a: any): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement(`le seuil d'alerte (${a.seuil_jours} jours)`))) return;
    this.http.put(`${API}/parametres/alertes/${a.id}`, {
      seuil_jours: a.seuil_jours,
      actif: a.actif,
    }).subscribe({
      next: () => this.toast.success('Seuil enregistré.'),
      error: (err) => this.toast.error(err.error?.message || 'Erreur.'),
    });
  }
}
