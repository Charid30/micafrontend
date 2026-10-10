import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  standalone: false,
})
export class LayoutComponent implements OnInit {
  sidebarOpen = true;
  isMobile = false;
  today = new Date();

  constructor(public authService: AuthService, private router: Router) {
    this.checkMobile();
  }

  ngOnInit(): void {
    // Fermer le drawer après navigation sur mobile
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { if (this.isMobile) this.sidebarOpen = false; });
  }

  @HostListener('window:resize')
  checkMobile(): void {
    const mobile = window.innerWidth < 768;
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
