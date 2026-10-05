import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pwd = control.get('nouveauMotDePasse')?.value;
  const confirm = control.get('confirmation')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-force-change-password',
  templateUrl: './force-change-password.component.html',
  standalone: false,
})
export class ForceChangePasswordComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPwd = false;
  showConfirm = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    if (!this.authService.mustChangePassword()) {
      this.router.navigate(['/dashboard']);
    }
    this.form = this.fb.group({
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.authService.forcedChangePassword(this.form.value.nouveauMotDePasse).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du changement de mot de passe.';
        this.loading = false;
      },
    });
  }
}
