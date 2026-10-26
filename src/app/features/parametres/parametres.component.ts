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
import { AuthService } from '../../core/services/auth.service';
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

  // ── Onglet Securite (administrateurs) : double authentification et validite des mots de passe
  private readonly auth = inject(AuthService);
  securite: any = null;
  reglages = { double_auth_obligatoire: false, double_auth_delai_jours: 7, mot_de_passe_duree_jours: 90, mot_de_passe_rappel_jours: 7 };
  savingSecurite = false;
  get estAdmin(): boolean { return this.auth.isAdmin(); }

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
    if (this.auth.isAdmin()) {
      this.tabs.push({ key: 'securite', label: 'Sécurité' });
      this.chargerSecurite();
    }
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

  chargerSecurite(): void {
    this.http.get<any>(`${API}/administration/securite`).subscribe({
      next: (r) => { this.appliquerSecurite(r); this.cdr.detectChanges(); },
      error: () => { /* onglet indisponible */ },
    });
  }
  private appliquerSecurite(r: any): void {
    this.securite = r;
    this.reglages = {
      double_auth_obligatoire: r.double_auth.obligatoire, double_auth_delai_jours: r.double_auth.delai_jours,
      mot_de_passe_duree_jours: r.mot_de_passe.duree_jours, mot_de_passe_rappel_jours: r.mot_de_passe.rappel_jours,
    };
  }
  get adminsSans2fa(): string[] {
    return (this.securite?.double_auth.administrateurs || []).filter((a: any) => !a.configuree).map((a: any) => a.username);
  }

  async enregistrerSecurite(): Promise<void> {
    const activation = this.reglages.double_auth_obligatoire && !this.securite?.double_auth.obligatoire;
    const ok = await this.dialog.confirmer(activation ? {
      titre: 'Rendre la double authentification obligatoire pour les administrateurs ?',
      message: `Les administrateurs qui ne l'ont pas encore configurée verront un bandeau pendant ${this.reglages.double_auth_delai_jours} jour(s), `
        + 'puis devront la configurer à leur prochaine connexion (application Google ou Microsoft Authenticator sur leur téléphone).'
        + (this.adminsSans2fa.length ? `\n\nPas encore configurée : ${this.adminsSans2fa.join(', ')}.` : ''),
      confirmer: 'Rendre obligatoire',
    } : { titre: 'Enregistrer les réglages de sécurité ?', message: 'Les nouveaux réglages s\'appliquent immédiatement à tous les comptes.', confirmer: 'Enregistrer' });
    if (!ok) return;
    this.savingSecurite = true;
    this.http.put<any>(`${API}/administration/securite`, this.reglages).subscribe({
      next: (r) => { this.savingSecurite = false; this.appliquerSecurite(r); this.toast.success(r.message); this.cdr.detectChanges(); },
      error: (e) => { this.savingSecurite = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
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
