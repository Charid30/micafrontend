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
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
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
export class LayoutComponent implements OnInit {
  sidebarOpen = true;
  isMobile = false;
  today = new Date();

  // Administrateurs : sauvegarde de la base manquee ou en echec
  alerteSauvegarde: string | null = null;

  private readonly notifications = inject(NotificationsService);
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
    if (document.visibilityState === 'visible' && this.etatNotif !== 'non-supporte') this.verifierNotificationsSilencieux();
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
  get rappelMotDePasse(): number | null {
    const m = this.authService.currentUser?.mot_de_passe;
    return m?.rappel && !this.rappelMasque ? m.jours_restants : null;
  }

  ngOnInit(): void {
    this.authService.rafraichir();
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
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { if (this.isMobile) this.sidebarOpen = false; });
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
    const modules = ['stocks','corridors','depots-int','temps-attente','veille-marche','veille-geo','achats-traders','encours-livraison','ventes','tresorerie','recommandations','caf_moyen'];
    return modules.some(m => this.authService.hasPermission(m, 'READ'));
  }

  get hasRapportsAccess(): boolean {
    return this.authService.isAdmin() || this.authService.hasPermission('rapports', 'READ');
  }
}
