import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return false;
    }
    if (this.authService.mustChangePassword()) {
      this.router.navigate(['/auth/force-change-password']);
      return false;
    }
    return true;
  }
}
