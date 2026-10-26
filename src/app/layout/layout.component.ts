/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { Component, HostListener, OnInit } from '@angular/core';
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
    const modules = ['stocks','corridors','depots-int','temps-attente','veille-marche','veille-geo','achats-traders','ventes','tresorerie','recommandations','caf_moyen'];
    return modules.some(m => this.authService.hasPermission(m, 'READ'));
  }

  get hasRapportsAccess(): boolean {
    return this.authService.isAdmin() || this.authService.hasPermission('rapports', 'READ');
  }
}
