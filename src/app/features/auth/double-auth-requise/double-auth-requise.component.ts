/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

// Administrateur sans double authentification (obligatoire) : configuration avant tout acces
@Component({
  selector: 'app-double-auth-requise',
  templateUrl: './double-auth-requise.component.html',
  standalone: false,
})
export class DoubleAuthRequiseComponent {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  constructor() {
    if (!this.authService.isLoggedIn()) this.router.navigate(['/auth/login']);
    else if (!this.authService.currentUser?.double_auth_requise) this.router.navigate(['/dashboard']);
  }

  terminee(): void {
    this.authService.mettreAJour({ double_auth_requise: false, double_auth_active: true });
    this.router.navigate(['/dashboard']);
  }
}
