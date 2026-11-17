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
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { NotificationsService, EtatNotifications } from '../../core/services/notifications.service';

// « Mon profil » : identite, coordonnees, droits, mot de passe et historique des connexions
@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  standalone: false,
})
export class ProfilComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly api = `${environment.apiUrl}/profil`;

  loading = true;
  error: string | null = null;
  profil: any = null;

  // Coordonnees
  infos = { email: '', tel: '', mot_de_passe_actuel: '' };
  savingInfos = false;

  // Mot de passe
  mdp = { ancien: '', nouveau: '', confirmation: '' };
  voirMdp = false;
  savingMdp = false;

  // Notifications push de ce navigateur
  private readonly notifications = inject(NotificationsService);
  etatNotif: EtatNotifications | null = null;
  notifEnCours = false;

  // Sessions actives : appareils connectes a ce compte
  sessions: any[] | null = null;
  sessionEnCours: number | 'autres' | null = null;

  ngOnInit(): void {
    this.charger();
    this.chargerSessions();
    this.notifications.etat().then(e => { this.etatNotif = e; this.cdr.detectChanges(); });
  }

  private async actionNotif(action: () => Promise<void>): Promise<void> {
    this.notifEnCours = true;
    this.cdr.detectChanges();
    try { await action(); }
    catch (e: any) { this.toast.error(e?.error?.message || 'Opération impossible sur ce navigateur.'); }
    this.notifEnCours = false;
    this.etatNotif = await this.notifications.etat();
    this.cdr.detectChanges();
  }

  activerNotifications(): Promise<void> {
    return this.actionNotif(async () => {
      const e = await this.notifications.activer();
      if (e === 'actif') this.toast.success('Notifications activées sur ce navigateur.');
    });
  }

  testerNotifications(): Promise<void> {
    return this.actionNotif(async () => { this.toast.success((await this.notifications.tester()).message); });
  }

  chargerSessions(): void {
    this.http.get<any[]>(`${this.api}/sessions`).subscribe({
      next: (s) => { this.sessions = s; this.cdr.detectChanges(); },
      error: () => { this.sessions = []; this.cdr.detectChanges(); },
    });
  }

  get autresSessions(): number {
    return (this.sessions || []).filter(s => !s.courante).length;
  }

  async fermerSession(s: any): Promise<void> {
    if (!(await this.dialog.confirmer({
      titre: 'Fermer cette session ?',
      message: `${s.appareil} (${s.ip || 'adresse inconnue'}) sera déconnecté immédiatement. Si vous ne reconnaissez pas cet appareil, changez aussi votre mot de passe.`,
      confirmer: 'Fermer la session',
      danger: true,
    }))) return;
    this.sessionEnCours = s.id;
    this.cdr.detectChanges();
    this.http.delete<any>(`${this.api}/sessions/${s.id}`).subscribe({
      next: (r) => { this.toast.success(r.message); this.sessionEnCours = null; this.chargerSessions(); },
      error: (err) => { this.toast.error(err.error?.message || 'Fermeture impossible.'); this.sessionEnCours = null; this.chargerSessions(); },
    });
  }

  async fermerAutresSessions(): Promise<void> {
    const n = this.autresSessions;
    if (!(await this.dialog.confirmer({
      titre: 'Déconnecter les autres appareils ?',
      message: `${n > 1 ? `Les ${n} autres sessions seront fermées` : "L'autre session sera fermée"} immédiatement. Seul cet appareil restera connecté.`,
      confirmer: 'Déconnecter',
      danger: true,
    }))) return;
    this.sessionEnCours = 'autres';
    this.cdr.detectChanges();
    this.http.post<any>(`${this.api}/sessions/fermer-autres`, {}).subscribe({
      next: (r) => { this.toast.success(r.message); this.sessionEnCours = null; this.chargerSessions(); },
      error: (err) => { this.toast.error(err.error?.message || 'Fermeture impossible.'); this.sessionEnCours = null; this.chargerSessions(); },
    });
  }

  /** « à l'instant », « il y a 12 min », « il y a 2 h » */
  depuis(date: string): string {
    const min = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
    if (min < 2) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    return `il y a ${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`;
  }

  charger(): void {
    this.http.get<any>(this.api).subscribe({
      next: (p) => {
        this.profil = p;
        this.infos = { email: p.compte.email, tel: p.compte.tel, mot_de_passe_actuel: '' };
        this.loading = false;
        this.error = null;
        this.cdr.detectChanges();
        // Lien « Changer mon mot de passe » du rappel : aller directement a la section
        const ancre = this.route.snapshot.fragment;
        if (ancre === 'mot-de-passe' || ancre === 'double-authentification') {
          setTimeout(() => document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du chargement du profil.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Coordonnees
  get emailModifie(): boolean {
    return !!this.profil && this.infos.email.trim().toLowerCase() !== String(this.profil.compte.email).toLowerCase();
  }
  get infosModifiees(): boolean {
    return !!this.profil && (this.emailModifie || (this.infos.tel || '').trim() !== (this.profil.compte.tel || ''));
  }

  async enregistrerInfos(): Promise<void> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.infos.email.trim())) { this.toast.error('Adresse e-mail invalide.'); return; }
    if (this.emailModifie && !this.infos.mot_de_passe_actuel) {
      this.toast.error("Saisissez votre mot de passe actuel pour modifier l'adresse e-mail.");
      return;
    }
    if (!(await this.dialog.confirmerEnregistrement('vos informations',
      this.emailModifie ? "Votre nouvelle adresse e-mail servira aussi d'identifiant de connexion." : undefined))) return;
    this.savingInfos = true;
    this.http.put<any>(this.api, {
      email: this.infos.email.trim(), tel: this.infos.tel.trim(),
      mot_de_passe_actuel: this.emailModifie ? this.infos.mot_de_passe_actuel : null,
    }).subscribe({
      next: (res) => {
        this.savingInfos = false;
        if (res.email) this.auth.mettreAJour({ email: res.email });
        this.toast.success(res.message || 'Informations enregistrées.');
        this.charger();
      },
      error: (err) => {
        this.savingInfos = false;
        this.toast.error(err.error?.message || "Erreur lors de l'enregistrement.");
        this.cdr.detectChanges();
      },
    });
  }

  // ── Mot de passe : memes regles que le serveur
  get regles() {
    const v = this.mdp.nouveau;
    return [
      { libelle: '8 caractères minimum', ok: v.length >= 8 },
      { libelle: 'Une lettre majuscule', ok: /[A-Z]/.test(v) },
      { libelle: 'Un chiffre', ok: /[0-9]/.test(v) },
      { libelle: 'Un caractère spécial (@, #, !, %…)', ok: /[^A-Za-z0-9]/.test(v) },
    ];
  }
  // Robustesse : 0 a 4 regles respectees, bonus pour la longueur
  get robustesse(): { niveau: number; libelle: string; classe: string } {
    const n = this.regles.filter(r => r.ok).length + (this.mdp.nouveau.length >= 12 ? 1 : 0);
    if (!this.mdp.nouveau) return { niveau: 0, libelle: '', classe: '' };
    if (n <= 2) return { niveau: 1, libelle: 'Faible', classe: 'bg-red-500' };
    if (n <= 4) return { niveau: 2, libelle: 'Moyen', classe: 'bg-yellow-400' };
    return { niveau: 3, libelle: 'Robuste', classe: 'bg-primary-500' };
  }
  get mdpValide(): boolean {
    return !!this.mdp.ancien && this.regles.every(r => r.ok) && this.mdp.nouveau === this.mdp.confirmation && this.mdp.nouveau !== this.mdp.ancien;
  }

  async changerMotDePasse(): Promise<void> {
    if (this.mdp.nouveau === this.mdp.ancien) { this.toast.error("Le nouveau mot de passe doit être différent de l'actuel."); return; }
    if (this.mdp.nouveau !== this.mdp.confirmation) { this.toast.error('La confirmation ne correspond pas au nouveau mot de passe.'); return; }
    if (!(await this.dialog.confirmer({
      titre: 'Changer votre mot de passe ?',
      message: 'Les autres sessions ouvertes avec votre compte (autre poste, téléphone) seront déconnectées.',
      confirmer: 'Changer le mot de passe',
    }))) return;
    this.savingMdp = true;
    this.auth.changerMotDePasse(this.mdp.ancien, this.mdp.nouveau).subscribe({
      next: (res) => {
        this.savingMdp = false;
        this.mdp = { ancien: '', nouveau: '', confirmation: '' };
        this.toast.success(res?.message || 'Mot de passe modifié.');
        this.charger();
      },
      error: (err) => {
        this.savingMdp = false;
        this.toast.error(err.error?.message || 'Erreur lors du changement de mot de passe.');
        this.cdr.detectChanges();
      },
    });
  }

  initiales(): string {
    const i = this.profil?.identite;
    return `${(i?.prenoms || '').charAt(0)}${(i?.nom || '').charAt(0)}`.toUpperCase() || '?';
  }
}
