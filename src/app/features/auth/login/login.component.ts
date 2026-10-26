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
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false,
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  // Etape 2 : code de double authentification (ou code de secours)
  etape2fa = false;
  codeSecours = false;
  formCode: FormGroup;

  // Application sans zone.js : l'affichage est rafraichi explicitement apres chaque reponse du serveur
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.formCode = this.fb.group({ code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]] });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.authService.login(this.form.value).subscribe({
      next: (res) => {
        if (res.double_auth) {
          // Mot de passe correct : le code de l'application est demande
          this.etape2fa = true;
          this.loading = false;
          this.formCode.reset();
          this.cdr.detectChanges();
          setTimeout(() => document.getElementById('code2fa')?.focus());
          return;
        }
        this.router.navigateByUrl(this.authService.pageApresConnexion());
      },
      error: (err) => {
        this.error = err.error?.message || 'Identifiant ou mot de passe incorrect.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  onSubmitCode(): void {
    if (this.formCode.invalid) return;
    this.loading = true;
    this.error = '';
    this.authService.loginDoubleAuth(String(this.formCode.value.code).trim()).subscribe({
      next: () => this.router.navigateByUrl(this.authService.pageApresConnexion()),
      error: (err) => {
        this.error = err.error?.message || 'Code incorrect.';
        this.loading = false;
        // Etape expiree (plus de 5 minutes) : retour au mot de passe
        if (err.status === 401 && /expirée/.test(this.error)) this.retour();
        this.formCode.reset();
        this.cdr.detectChanges();
      },
    });
  }

  retour(): void {
    this.etape2fa = false;
    this.codeSecours = false;
    this.form.patchValue({ password: '' });
  }
}
