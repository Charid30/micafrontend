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
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { TempsReelService } from '../core/services/temps-reel.service';
import { InactiviteService } from '../core/services/inactivite.service';
import { ToastService } from '../core/services/toast.service';
import { NotificationsService, EtatNotifications } from '../core/services/notifications.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  standalone: false,
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = true;
  isMobile = false;
  today = new Date();

  // Administrateurs : sauvegarde de la base manquee ou en echec
  alerteSauvegarde: string | null = null;

  private readonly notifications = inject(NotificationsService);
  readonly tempsReel = inject(TempsReelService);
  // Deconnexion apres inactivite : secondes restantes pendant la derniere minute
  readonly inactivite = inject(InactiviteService);
  deconnexionDans: number | null = null;
  private abonnementInactivite?: Subscription;
  // Rafraichissement automatique : auteur de l'enregistrement signale dans le bandeau
  auteurModification: string | null = null;
  private abonnementAvis?: Subscription;
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  // Notifications push obligatoires : la fenetre bloque l'application tant que l'etat est
  // « inactif » ou « refuse ». Navigateur sans prise en charge (ancien, ou site hors HTTPS) :
  // pas de blocage, sinon personne ne pourrait travailler.
  etatNotif: EtatNotifications | null = null;
  notifEnCours = false;

  async activerNotifications(): Promise<void> {
    this.notifEnCours = true;
    this.cdr.detectChanges();
    try {
      this.etatNotif = await this.notifications.activer();
      if (this.etatNotif === 'actif') this.toast.success('Notifications activées sur ce navigateur.');
    } catch {
      this.toast.error('Impossible d\'activer les notifications. Réessayez dans un instant.');
    }
    this.notifEnCours = false;
    this.cdr.detectChanges();
  }

  // Apres un changement dans les reglages du navigateur : autorise -> abonnement immediat
  async verifierNotifications(): Promise<void> {
    this.etatNotif = await this.notifications.etat();
    if (this.etatNotif === 'inactif' && 'Notification' in window && Notification.permission === 'granted') {
      return this.activerNotifications();
    }
    if (this.etatNotif === 'refuse') this.toast.error('Les notifications sont toujours bloquées pour ce site.');
    this.cdr.detectChanges();
  }

  private async controlerNotifications(): Promise<void> {
    await this.notifications.synchroniser();
    this.etatNotif = await this.notifications.etat();
    this.cdr.detectChanges();
  }

  // Retour sur l'onglet (reglages du navigateur modifies entre-temps, autorisation retiree...)
  @HostListener('document:visibilitychange')
  surRetourOnglet(): void {
    if (document.visibilityState !== 'visible') return;
    if (this.etatNotif !== 'non-supporte') this.verifierNotificationsSilencieux();
    this.authService.relire().subscribe({ next: () => this.cdr.detectChanges(), error: () => { /* 401 : l'intercepteur ferme la session */ } });
  }

  private async verifierNotificationsSilencieux(): Promise<void> {
    const e = await this.notifications.etat();
    if (e === 'inactif' && 'Notification' in window && Notification.permission === 'granted') return this.activerNotifications();
    this.etatNotif = e;
    this.cdr.detectChanges();
  }

  constructor(public authService: AuthService, private router: Router, private http: HttpClient) {
    this.checkMobile();
  }

  // Rappel d'expiration du mot de passe : masquable pour la session en cours
  rappelMasque = false;

  // Alertes flottantes : un seul detail ouvert a la fois
  panneauAlerte: string | null = null;
  basculerAlerte(cle: string): void { this.panneauAlerte = this.panneauAlerte === cle ? null : cle; }
  get doubleAuthAnnoncee(): boolean {
    const u = this.authService.currentUser;
    return !!u?.double_auth_echeance && !u?.double_auth_active;
  }
  get alertesFlottantes(): boolean {
    return !!(this.deconnexionDans !== null || this.auteurModification || this.alerteSauvegarde || this.doubleAuthAnnoncee
      || this.authService.currentUser?.interims?.length || this.rappelMotDePasse !== null);
  }
  get rappelMotDePasse(): number | null {
    const m = this.authService.currentUser?.mot_de_passe;
    return m?.rappel && !this.rappelMasque ? m.jours_restants : null;
  }

  ngOnDestroy(): void {
    this.abonnementInactivite?.unsubscribe();
    this.inactivite.arreter();
    this.abonnementAvis?.unsubscribe();
    this.tempsReel.arreter();
  }

  ngOnInit(): void {
    this.tempsReel.demarrer();
    this.inactivite.demarrer();
    this.abonnementInactivite = this.inactivite.restant$.subscribe((s) => { this.deconnexionDans = s; this.cdr.detectChanges(); });
    this.abonnementAvis = this.tempsReel.avis$.subscribe((par) => { this.auteurModification = par; this.cdr.detectChanges(); });
    // Droits relus : le menu suit tout changement fait depuis la derniere connexion
    this.authService.relire().subscribe({ next: () => this.cdr.detectChanges(), error: () => { /* 401 : l'intercepteur ferme la session */ } });
    // Notifications push : deja autorisees sur ce navigateur -> rattachees a l'utilisateur connecte ;
    // sinon, fenetre d'activation obligatoire
    this.controlerNotifications();
    if (this.authService.isAdmin()) {
      this.http.get<any>(`${environment.apiUrl}/administration/sauvegardes/etat`).subscribe({
        next: (e) => { this.alerteSauvegarde = e.alerte; },
        error: () => { /* information secondaire */ },
      });
    }
    // Fermer le drawer après navigation sur mobile
    this.rdcOuvert = this.router.url.startsWith('/rdc/');
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile) this.sidebarOpen = false;
        if (this.router.url.startsWith('/rdc/')) this.rdcOuvert = true;
      });
  }

  // Mode "tiroir" (menu en surimpression) sous 1024 px (breakpoint lg de Tailwind) :
  // sur tablette, un menu fixe de 260 px ne laissait que ~500 px au contenu
  @HostListener('window:resize')
  checkMobile(): void {
    const mobile = window.innerWidth < 1024;
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      this.sidebarOpen = !mobile; // ouvert par défaut sur desktop
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  get hasSaisieAccess(): boolean {
    if (this.authService.isAdmin()) return true;
    const modules = ['stocks','corridors','depots-int','temps-attente','veille-marche','veille-geo','achats-traders','encours-livraison','ventes','tresorerie','recommandations','caf_moyen','centrales'];
    return modules.some(m => this.authService.hasPermission(m, 'READ'));
  }

  // Memes droits que l'API de l'historique
  get hasHistoriqueAccess(): boolean {
    return ['stocks', 'corridors', 'tresorerie', 'ventes', 'recommandations', 'caf_moyen'].some(m => this.authService.hasPermission(m, 'READ'));
  }

  // Menu RDC : sous-menus selon les droits du compte
  get paysRdc(): { url: string; libelle: string }[] {
    return [
      { droit: 'rdc-ghana', url: '/rdc/ghana', libelle: 'Dépôt de Ghana' },
      { droit: 'rdc-benin', url: '/rdc/benin', libelle: 'Dépôt de Bénin' },
      { droit: 'rdc-cote-ivoire', url: '/rdc/cote-ivoire', libelle: "Dépôt de Côte d'Ivoire" },
      { droit: 'rdc-togo', url: '/rdc/togo', libelle: 'Dépôt de Togo' },
    ].filter(p => this.authService.hasPermission(p.droit, 'READ'));
  }

  // La liste est recalculee a chaque rendu : sans suivi, les liens seraient recrees sans fin
  readonly parUrl = (_: number, p: { url: string }) => p.url;

  rdcOuvert = false;
  readonly parInterim = (_: number, i: { id: number }) => i.id;

  // Menu replie : le sous-menu n'a pas la place de s'afficher, on deplie d'abord le menu
  basculerRdc(): void {
    if (!this.sidebarOpen && !this.isMobile) {
      this.sidebarOpen = true;
      this.rdcOuvert = true;
      return;
    }
    this.rdcOuvert = !this.rdcOuvert;
  }

  get hasRapportsAccess(): boolean {
    return this.authService.isAdmin() || this.authService.hasPermission('rapports', 'READ');
  }
}
