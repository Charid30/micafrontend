import { Component } from '@angular/core';
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

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.authService.login(this.form.value).subscribe({
      next: (res) => {
        if (res.utilisateur?.must_change_password) {
          this.router.navigate(['/auth/force-change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Identifiant ou mot de passe incorrect.';
        this.loading = false;
      },
    });
  }
}
