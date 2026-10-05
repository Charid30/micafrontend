import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForceChangePasswordComponent } from './force-change-password/force-change-password.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'force-change-password', component: ForceChangePasswordComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  declarations: [LoginComponent, ForceChangePasswordComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)],
})
export class AuthModule {}
