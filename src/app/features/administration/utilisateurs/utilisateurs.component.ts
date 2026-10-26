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
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

// Modules pour lesquels on peut restreindre à un dépôt précis
const DEPOT_MODULES = new Set(['stocks', 'depots-int', 'impompable']);

const MODULE_LABELS: Record<string, string> = {
  'stocks': 'Stocks dépôts (saisie quotidienne)',
  'impompable': 'Référentiel dépôt : impompable et consommation (responsable de dépôt)',
  'referentiel-stocks': 'Référentiel stocks : besoins extérieurs, exclusions, paramètres (DSTA)',
  'actions-stocks': 'Actions pour relever les stocks (DSTA)',
  'corridors': 'Corridors',
  'depots-int': 'Dépôts intérieurs',
  'temps-attente': "Temps d'attente",
  'veille-marche': 'Veille marché',
  'veille-geo': 'Veille géopolitique',
  'achats-traders': 'Achats traders',
  'ventes': 'Ventes',
  'tresorerie': 'Trésorerie (saisie hebdomadaire)',
  'tresorerie-lignes': 'Trésorerie : gestion des lignes (chef Tréso)',
  'recommandations': 'Recommandations',
  'caf_moyen': 'CAF moyen des achats',
  'rapports': 'Rapports PDF',
  'administration': 'Administration',
  'parametres': 'Paramètres',
};

@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
  standalone: false,
})
export class UtilisateursComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  tabs = [
    { key: 'agents', label: 'Agents' },
    { key: 'comptes', label: 'Comptes utilisateurs' },
    { key: 'directions', label: 'Directions' },
  ];
  activeTab = 'agents';

  agents: any[] = [];
  utilisateurs: any[] = [];
  entreprises: any[] = [];
  directions: any[] = [];
  depots: any[] = [];
  filteredDirections: any[] = [];
  modulesList: { key: string; label: string }[] = [];

  saving = false;

  // Agent modal
  showAgentModal = false;
  editingAgent: any = null;
  agentForm: any = {};

  // User modal
  showUserModal = false;
  editingUser: any = null;
  userForm: any = {};

  // Permissions modal
  showPermModal = false;
  permUser: any = null;
  currentPerms: Record<string, string> = {};
  currentDepots: Record<string, number | null> = {};
  depotModules = DEPOT_MODULES;

  // Reset password modal
  showPwdModal = false;
  pwdUser: any = null;
  newPassword = '';
  pwdMustChange = false;

  // Direction modal
  showDirModal = false;
  editingDir: any = null;
  dirForm: any = {};

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.http.get<any[]>(`${API}/agents`).subscribe({ next: d => { this.agents = d; this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${API}/utilisateurs`).subscribe({ next: d => { this.utilisateurs = d; this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${API}/entreprises`).subscribe({ next: d => { this.entreprises = d; this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${API}/directions`).subscribe({ next: d => { this.directions = d; this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${API}/depots`).subscribe({ next: d => { this.depots = d; this.cdr.detectChanges(); } });
    this.http.get<string[]>(`${API}/utilisateurs/modules`).subscribe({
      next: keys => {
        this.modulesList = keys.map(k => ({ key: k, label: MODULE_LABELS[k] || k }));
        this.cdr.detectChanges();
      }
    });
  }

  get agentsSansCompte(): any[] {
    const usedIds = new Set(this.utilisateurs.map(u => u.agent_id));
    return this.agents.filter(a => !usedIds.has(a.id));
  }

  // ── AGENTS ──────────────────────────────────

  openAgentForm(agent: any): void {
    this.editingAgent = agent;
    if (agent) {
      const ent = agent.direction?.entreprise?.id || '';
      this.agentForm = {
        entreprise_id: ent,
        direction_id: agent.direction_id,
        matricule: agent.matricule,
        nom: agent.nom,
        prenoms: agent.prenoms || '',
      };
      this.filteredDirections = this.directions.filter(d => d.entreprise_id == ent);
    } else {
      this.agentForm = { entreprise_id: '', direction_id: '', matricule: '', nom: '', prenoms: '' };
      this.filteredDirections = [];
    }
    this.showAgentModal = true;
    this.cdr.detectChanges();
  }

  onEntrepriseChange(): void {
    this.filteredDirections = this.directions.filter(d => d.entreprise_id == this.agentForm.entreprise_id);
    this.agentForm.direction_id = '';
    this.cdr.detectChanges();
  }

  async saveAgent(): Promise<void> {
    if (!this.agentForm.direction_id || !this.agentForm.matricule || !this.agentForm.nom) {
      this.toast.error('Direction, matricule et nom sont requis.'); return;
    }
    if (!(await this.dialog.confirmerEnregistrement(`l'agent « ${this.agentForm.nom} »`))) return;
    this.saving = true;
    const payload = {
      direction_id: this.agentForm.direction_id,
      matricule: this.agentForm.matricule,
      nom: this.agentForm.nom,
      prenoms: this.agentForm.prenoms,
    };
    const req = this.editingAgent?.id
      ? this.http.put(`${API}/agents/${this.editingAgent.id}`, payload)
      : this.http.post(`${API}/agents`, payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showAgentModal = false;
        this.toast.success('Agent enregistré.');
        this.loadAll();
      },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  async deleteAgent(agent: any): Promise<void> {
    if (!(await this.dialog.confirmer({ titre: `Supprimer l'agent « ${agent.nom} » ?`, message: 'Cette action est définitive.', confirmer: 'Supprimer', danger: true }))) return;
    this.http.delete(`${API}/agents/${agent.id}`).subscribe({
      next: () => { this.toast.success('Agent supprimé.'); this.loadAll(); },
      error: (e) => this.toast.error(e.error?.message || 'Erreur.'),
    });
  }

  // ── COMPTES UTILISATEURS ────────────────────

  openUserForm(user: any): void {
    this.editingUser = user;
    if (user) {
      this.userForm = { username: user.username, email: user.email, tel: user.tel || '', is_admin: !!user.is_admin };
    } else {
      this.userForm = { agent_id: '', username: '', email: '', tel: '', password: '', profil: 'GESTIONNAIRE', is_admin: false, must_change_password: true };
    }
    this.showUserModal = true;
    this.cdr.detectChanges();
  }

  async saveUser(): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement(`le compte « ${this.userForm.username} »`))) return;
    this.saving = true;
    const req = this.editingUser?.id
      ? this.http.put(`${API}/utilisateurs/${this.editingUser.id}`, this.userForm)
      : this.http.post(`${API}/utilisateurs`, this.userForm);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showUserModal = false;
        this.toast.success('Compte enregistré.');
        this.loadAll();
      },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  // Telephone et codes de secours perdus : l'utilisateur reconfigurera la double authentification
  async reinitialiserDoubleAuth(user: any): Promise<void> {
    if (!(await this.dialog.confirmer({
      titre: `Réinitialiser la double authentification de « ${user.username} » ?`,
      message: "À utiliser si l'utilisateur a perdu son téléphone et ses codes de secours. Il devra la reconfigurer (administrateur) ou pourra la réactiver depuis son profil.",
      confirmer: 'Réinitialiser', danger: true,
    }))) return;
    this.http.post<any>(`${API}/administration/utilisateurs/${user.id}/reinitialiser-2fa`, {}).subscribe({
      next: (r) => { this.toast.success(r.message); this.loadAll(); },
      error: (e) => this.toast.error(e.error?.message || 'Erreur.'),
    });
  }

  async deleteUser(user: any): Promise<void> {
    if (!(await this.dialog.confirmer({ titre: `Supprimer le compte « ${user.username} » ?`, message: "L'utilisateur ne pourra plus se connecter.", confirmer: 'Supprimer', danger: true }))) return;
    this.http.delete(`${API}/utilisateurs/${user.id}`).subscribe({
      next: () => { this.toast.success('Compte supprimé.'); this.loadAll(); },
      error: (e) => this.toast.error(e.error?.message || 'Erreur.'),
    });
  }

  // ── PERMISSIONS ─────────────────────────────

  openPermissions(user: any): void {
    this.permUser = user;
    this.currentPerms = {};
    this.currentDepots = {};
    this.modulesList.forEach(m => { this.currentPerms[m.key] = 'NONE'; this.currentDepots[m.key] = null; });
    this.http.get<any[]>(`${API}/utilisateurs/${user.id}/permissions`).subscribe({
      next: (perms) => {
        perms.forEach(p => {
          this.currentPerms[p.module] = p.action;
          this.currentDepots[p.module] = p.depot_id || null;
        });
        this.showPermModal = true;
        this.cdr.detectChanges();
      },
      error: () => { this.showPermModal = true; this.cdr.detectChanges(); },
    });
  }

  getPermAction(module: string): string { return this.currentPerms[module] || 'NONE'; }
  setPermAction(module: string, action: string): void { this.currentPerms[module] = action; this.cdr.detectChanges(); }
  getPermDepot(module: string): number | null { return this.currentDepots[module] ?? null; }
  setPermDepot(module: string, depotId: number | null): void { this.currentDepots[module] = depotId; this.cdr.detectChanges(); }

  async savePermissions(): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement(`les permissions de « ${this.permUser.username} »`, 'Les droits de cet utilisateur seront modifiés dès sa prochaine action.'))) return;
    this.saving = true;
    const permissions = this.modulesList.map(m => ({
      module: m.key,
      action: this.currentPerms[m.key] || 'NONE',
      depot_id: this.currentDepots[m.key] || null,
    }));
    this.http.post(`${API}/utilisateurs/${this.permUser.id}/permissions`, { permissions }).subscribe({
      next: () => {
        this.saving = false;
        this.showPermModal = false;
        this.toast.success('Permissions enregistrées.');
        this.cdr.detectChanges();
      },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  // ── DIRECTIONS ──────────────────────────────

  openDirForm(dir: any): void {
    this.editingDir = dir;
    this.dirForm = dir
      ? { entreprise_id: dir.entreprise_id, acronyme: dir.acronyme, description: dir.description || '' }
      : { entreprise_id: '', acronyme: '', description: '' };
    this.showDirModal = true;
    this.cdr.detectChanges();
  }

  async saveDir(): Promise<void> {
    if (!this.dirForm.entreprise_id || !this.dirForm.acronyme) {
      this.toast.error('Entreprise et acronyme sont requis.'); return;
    }
    if (!(await this.dialog.confirmerEnregistrement(`la direction « ${this.dirForm.acronyme} »`))) return;
    this.saving = true;
    const req = this.editingDir?.id
      ? this.http.put(`${API}/directions/${this.editingDir.id}`, this.dirForm)
      : this.http.post(`${API}/directions`, this.dirForm);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showDirModal = false;
        this.toast.success('Direction enregistrée.');
        this.loadAll();
      },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  async deleteDir(dir: any): Promise<void> {
    if (!(await this.dialog.confirmer({ titre: `Supprimer la direction « ${dir.acronyme} » ?`, message: 'Cette action est définitive.', confirmer: 'Supprimer', danger: true }))) return;
    this.http.delete(`${API}/directions/${dir.id}`).subscribe({
      next: () => { this.toast.success('Direction supprimée.'); this.loadAll(); },
      error: (e) => this.toast.error(e.error?.message || 'Erreur.'),
    });
  }

  // ── RESET PASSWORD ──────────────────────────

  openResetPassword(user: any): void {
    this.pwdUser = user;
    this.newPassword = '';
    this.pwdMustChange = false;
    this.showPwdModal = true;
    this.cdr.detectChanges();
  }

  async doResetPassword(): Promise<void> {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.toast.error('Le mot de passe doit contenir au moins 6 caractères.'); return;
    }
    if (!(await this.dialog.confirmerEnregistrement(`le nouveau mot de passe de « ${this.pwdUser.username} »`, 'L\'ancien mot de passe ne fonctionnera plus.'))) return;
    this.saving = true;
    this.http.post(`${API}/utilisateurs/${this.pwdUser.id}/reset-password`, { password: this.newPassword, must_change_password: this.pwdMustChange }).subscribe({
      next: () => {
        this.saving = false;
        this.showPwdModal = false;
        this.toast.success('Mot de passe réinitialisé.');
        this.cdr.detectChanges();
      },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }
}
