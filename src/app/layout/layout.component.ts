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
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { suivreTableauxMobiles } from '../core/services/tableaux-mobiles';
import { InstallationService } from '../core/services/installation.service';
import { VERSION } from '../version';

// Menu des modules sur telephone (panneau qui monte du bas)
export interface ModuleMenu { libelle: string; url: string; icone: string; }
export interface GroupeMenu { titre: string; admin?: boolean; saisie?: boolean; modules: ModuleMenu[]; }
export interface AlerteMobile {
  categorie: 'stocks' | 'saisies' | 'securite' | 'information';
  niveau: 'critique' | 'attention' | 'information';
  titre: string; texte: string; quand?: string | null; url: string | null; fragment?: string;
}

// Icones (traces 24 x 24, trait de 2) reprises du menu lateral
const ICONES = {
  stocks: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  globe: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  reglages: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  carte: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  depot: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  horloge: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  marche: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
  presse: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  camion: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1',
  ventes: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  tresorerie: 'M3 6h18M3 12h18M3 18h18M7 6v12M17 6v12',
  recommandations: 'M9 12l2 2 4-4M7 20H4a2 2 0 01-2-2V5a2 2 0 012-2h9l5 5v4M13 3v5h5M15 17v4m-2-2h4',
  calcul: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  eclair: 'M13 10V3L4 14h7v7l9-11h-7z',
  historique: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  rapport: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  comptes: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  interim: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  structures: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  journal: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  bouclier: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  base: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  parametres: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
};
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
export class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  // Version de la plateforme (package.json, recopiée par scripts/ecrire-version.js)
  readonly version = VERSION;
  sidebarOpen = true;
  isMobile = false;
  // Telephone (< 768 px) : barre de navigation en bas et panneaux au lieu du menu lateral
  isTelephone = false;
  feuille: 'menu' | 'saisie' | 'alertes' | null = null;
  recherche = '';
  readonly installation = inject(InstallationService);
  @ViewChild('zoneContenu') private zoneContenu?: ElementRef<HTMLElement>;
  private arreterTableaux?: () => void;
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

  ngAfterViewInit(): void {
    if (this.zoneContenu) this.arreterTableaux = suivreTableauxMobiles(this.zoneContenu.nativeElement);
  }

  ngOnDestroy(): void {
    this.arreterTableaux?.();
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
    // Telephone : proposer d'installer la plateforme sur l'ecran d'accueil ; pastille de l'onglet « Alertes »
    this.installation.proposer();
    this.lues = new Set(this.lireLues());
    if (this.isTelephone) this.chargerAlertes();
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
        this.fermerFeuille();
      });
  }

  // Mode "tiroir" (menu en surimpression) sous 1024 px (breakpoint lg de Tailwind) :
  // sur tablette, un menu fixe de 260 px ne laissait que ~500 px au contenu
  @HostListener('window:resize')
  checkMobile(): void {
    this.isTelephone = window.innerWidth < 768;
    if (!this.isTelephone) this.feuille = null;
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

  // ── Telephone : barre du bas et panneaux ──

  ouvrirFeuille(f: 'menu' | 'saisie' | 'alertes'): void {
    this.feuille = this.feuille === f ? null : f;
    this.recherche = '';
    if (this.feuille === 'alertes') this.chargerAlertes();
  }

  fermerFeuille(): void {
    this.feuille = null;
    this.recherche = '';
  }

  @HostListener('document:keydown.escape')
  surEchap(): void {
    if (this.feuille) this.fermerFeuille();
  }

  // Memes conditions d'affichage que le menu lateral
  get groupesMenu(): GroupeMenu[] {
    const a = this.authService;
    const admin = a.isAdmin();
    const voir = (m: string) => admin || a.hasPermission(m, 'READ');
    const m = (ok: boolean, libelle: string, url: string, icone: string): ModuleMenu | null => (ok ? { libelle, url, icone } : null);
    const groupes: { titre: string; admin?: boolean; saisie?: boolean; modules: (ModuleMenu | null)[] }[] = [
      { titre: 'Stocks', saisie: true, modules: [
        m(a.peutVoirStocks('INTERIEUR'), 'Dépôts int.', '/saisie/stocks/interieurs', ICONES.stocks),
        m(a.peutVoirStocks('EXTERIEUR'), 'Dépôts ext.', '/saisie/stocks/exterieurs', ICONES.globe),
        m(admin || a.hasPermission('impompable', 'READ') || a.hasPermission('referentiel-stocks', 'READ'), 'Référentiel', '/saisie/referentiel-stocks', ICONES.reglages),
        m(voir('depots-int'), 'Dépôts intérieurs', '/saisie/depots-int', ICONES.depot),
      ] },
      { titre: 'Approvisionnement', saisie: true, modules: [
        m(voir('corridors'), 'Corridors', '/saisie/corridors', ICONES.carte),
        m(voir('temps-attente'), "Temps d'attente", '/saisie/temps-attente', ICONES.horloge),
        m(voir('achats-traders'), 'Achats traders', '/saisie/achats-traders', ICONES.presse),
        m(voir('encours-livraison'), 'Encours', '/saisie/encours-livraison', ICONES.camion),
      ] },
      { titre: 'Marché et finances', saisie: true, modules: [
        m(voir('ventes'), 'Ventes', '/saisie/ventes', ICONES.ventes),
        m(admin || a.hasPermission('tresorerie', 'READ') || a.hasPermission('tresorerie-lignes', 'READ'), 'Trésorerie', '/saisie/tresorerie', ICONES.tresorerie),
        m(voir('caf_moyen'), 'CAF moyen', '/saisie/caf-moyen', ICONES.calcul),
        m(voir('centrales'), 'Centrale SONABEL', '/saisie/centrales', ICONES.eclair),
      ] },
      { titre: 'Veilles', saisie: true, modules: [
        m(voir('veille-marche'), 'Veille marché', '/saisie/veille-marche', ICONES.marche),
        m(voir('veille-geo'), 'Veille géopolitique', '/saisie/veille-geo', ICONES.globe),
        m(voir('recommandations'), 'Recomman­dations', '/saisie/recommandations', ICONES.recommandations),
      ] },
      { titre: 'RDC', saisie: true, modules: this.paysRdc.map((p) => ({ libelle: p.libelle.replace('Dépôt de ', ''), url: p.url, icone: ICONES.globe })) },
      { titre: 'Suivi', modules: [
        m(this.hasHistoriqueAccess, 'Historique', '/historique', ICONES.historique),
        m(this.hasRapportsAccess, 'Rapports PDF', '/rapports', ICONES.rapport),
      ] },
      { titre: 'Administration', admin: true, modules: admin ? [
        m(true, 'Agents et comptes', '/administration/utilisateurs', ICONES.comptes),
        m(true, 'Intérims', '/administration/interims', ICONES.interim),
        m(true, 'Structures', '/administration/structures', ICONES.structures),
        m(true, "Journal d'audit", '/administration/securite/journal', ICONES.journal),
        m(true, 'Intrusions', '/administration/securite/intrusions', ICONES.bouclier),
        m(true, 'Sauvegardes', '/administration/securite/sauvegardes', ICONES.base),
        m(true, 'Paramètres', '/parametres', ICONES.parametres),
      ] : [] },
    ];
    return groupes
      .map((g) => ({ ...g, modules: g.modules.filter((x): x is ModuleMenu => !!x) }))
      .filter((g) => g.modules.length);
  }

  // Groupes affiches dans le panneau ouvert, filtres par la recherche (accents ignores)
  get groupesFeuille(): GroupeMenu[] {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ­]/g, '').toLowerCase();
    const q = norm(this.recherche.trim());
    return this.groupesMenu
      .filter((g) => this.feuille !== 'saisie' || g.saisie)
      .map((g) => ({ ...g, modules: q ? g.modules.filter((x) => norm(x.libelle).includes(q) || norm(g.titre).includes(q)) : g.modules }))
      .filter((g) => g.modules.length);
  }

  readonly parTitre = (_: number, g: GroupeMenu) => g.titre;
  readonly parLien = (_: number, x: ModuleMenu) => x.url;

  get ongletSaisieVisible(): boolean {
    return this.groupesMenu.some((g) => g.saisie);
  }

  get surAccueil(): boolean {
    return this.router.url.split(/[?#]/)[0] === '/dashboard';
  }

  // Onglet « Saisie » actif sur toutes les pages de saisie et du RDC
  get surPageSaisie(): boolean {
    return /^\/(saisie|rdc)\//.test(this.router.url);
  }

  // ── Onglet « Alertes » (telephone) : alertes du serveur + alertes du compte ──
  alertesServeur: AlerteMobile[] = [];
  chargementAlertes = false;
  filtreAlertes: 'toutes' | 'stocks' | 'saisies' | 'securite' = 'toutes';
  readonly filtresAlertes: { cle: 'toutes' | 'stocks' | 'saisies' | 'securite'; libelle: string }[] = [
    { cle: 'toutes', libelle: 'Toutes' }, { cle: 'stocks', libelle: 'Stocks' }, { cle: 'saisies', libelle: 'Saisies' }, { cle: 'securite', libelle: 'Sécurité' },
  ];
  private lues = new Set<string>(); // lu dans ngOnInit (le compte connecte n'est pas encore connu ici)

  chargerAlertes(): void {
    this.chargementAlertes = true;
    this.http.get<AlerteMobile[]>(`${environment.apiUrl}/notifications/alertes`).subscribe({
      next: (a) => { this.alertesServeur = a || []; this.chargementAlertes = false; this.cdr.detectChanges(); },
      error: () => { this.chargementAlertes = false; this.cdr.detectChanges(); },
    });
  }

  // Alertes du compte (sauvegarde, double authentification, mot de passe, interim) au meme format
  private get alertesCompte(): AlerteMobile[] {
    const a: AlerteMobile[] = [];
    const u = this.authService.currentUser;
    if (this.alerteSauvegarde) a.push({ categorie: 'securite', niveau: 'critique', titre: 'Sauvegarde de la base', texte: this.alerteSauvegarde, url: '/administration/securite/sauvegardes' });
    if (this.doubleAuthAnnoncee) a.push({ categorie: 'securite', niveau: 'attention', titre: 'Double authentification', texte: `Obligatoire à partir du ${new Date(String(u?.double_auth_echeance)).toLocaleDateString('fr-FR')} pour les administrateurs.`, url: '/profil', fragment: 'double-authentification' });
    if (this.rappelMotDePasse !== null) a.push({ categorie: 'securite', niveau: 'attention', titre: 'Mot de passe', texte: `Il expire dans ${this.rappelMotDePasse} jour${this.rappelMotDePasse > 1 ? 's' : ''}.`, url: '/profil', fragment: 'mot-de-passe' });
    for (const i of u?.interims || []) a.push({ categorie: 'information', niveau: 'information', titre: 'Intérim en cours', texte: `Vous assurez l'intérim de ${i.titulaire} jusqu'au ${new Date(i.date_fin).toLocaleDateString('fr-FR')}.`, url: null });
    return a;
  }

  get toutesAlertes(): AlerteMobile[] {
    return [...this.alertesCompte, ...this.alertesServeur];
  }

  get alertesFiltrees(): AlerteMobile[] {
    return this.filtreAlertes === 'toutes' ? this.toutesAlertes : this.toutesAlertes.filter((a) => a.categorie === this.filtreAlertes);
  }

  // Empreinte (FNV-1a) plutot que le texte : le navigateur ne garde ni adresse IP ni nom de compte
  cleAlerte(a: AlerteMobile): string {
    let h = 0x811c9dc5;
    for (const ch of `${a.categorie}|${a.titre}|${a.texte}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }
  estLue(a: AlerteMobile): boolean { return this.lues.has(this.cleAlerte(a)); }

  toutMarquerLu(): void {
    for (const a of this.toutesAlertes) this.lues.add(this.cleAlerte(a));
    // Seules les alertes encore presentes sont gardees : la liste ne grossit pas indefiniment
    const presentes = new Set(this.toutesAlertes.map((a) => this.cleAlerte(a)));
    this.lues = new Set([...this.lues].filter((k) => presentes.has(k)));
    try { localStorage.setItem(this.cleStockageLues, JSON.stringify([...this.lues])); } catch { /* navigation privee */ }
  }

  // Par compte : sur un telephone partage, les alertes lues par l'un ne sont pas masquees pour l'autre
  private get cleStockageLues(): string { return `mica_alertes_lues_${this.authService.currentUser?.id ?? ''}`; }

  private lireLues(): string[] {
    try { return JSON.parse(localStorage.getItem(this.cleStockageLues) || '[]'); } catch { return []; }
  }

  // Pastille rouge de l'onglet : alertes non lues
  get nombreAlertes(): number {
    return this.toutesAlertes.filter((a) => !this.estLue(a)).length;
  }

  readonly parCleAlerte = (_: number, a: AlerteMobile) => this.cleAlerte(a);
}
