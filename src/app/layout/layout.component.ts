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
import { NotificationsService } from '../core/services/notifications.service';
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
  private readonly CLE_NOTIF_MASQUEE = 'mica_notif_masquee';
  proposerNotifications = false;

  async activerNotifications(): Promise<void> {
    try {
      const e = await this.notifications.activer();
      this.proposerNotifications = false;
      if (e === 'actif') this.toast.success('Notifications activées sur ce navigateur.');
      else if (e === 'refuse') this.toast.error('Notifications bloquées : autorisez-les dans les réglages du navigateur (icône du cadenas).');
    } catch {
      this.toast.error('Impossible d\'activer les notifications sur ce navigateur.');
    }
    this.cdr.detectChanges();
  }

  masquerNotifications(): void {
    this.proposerNotifications = false;
    try { localStorage.setItem(this.CLE_NOTIF_MASQUEE, '1'); } catch { /* stockage indisponible */ }
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
    // Notifications push deja autorisees sur ce navigateur : rattachees a l'utilisateur connecte ;
    // sinon, proposition de les activer (sauf si l'utilisateur l'a deja masquee)
    this.notifications.synchroniser();
    this.notifications.etat().then(e => {
      let masquee = false;
      try { masquee = localStorage.getItem(this.CLE_NOTIF_MASQUEE) === '1'; } catch { /* stockage indisponible */ }
      this.proposerNotifications = e === 'inactif' && !masquee;
      this.cdr.detectChanges();
    });
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
