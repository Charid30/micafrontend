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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForceChangePasswordComponent } from './force-change-password/force-change-password.component';
import { DoubleAuthRequiseComponent } from './double-auth-requise/double-auth-requise.component';
import { DoubleAuthModule } from '../../shared/double-auth/double-auth.module';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'force-change-password', component: ForceChangePasswordComponent },
  { path: 'double-authentification', component: DoubleAuthRequiseComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  declarations: [LoginComponent, ForceChangePasswordComponent, DoubleAuthRequiseComponent],
  imports: [CommonModule, ReactiveFormsModule, DoubleAuthModule, RouterModule.forChild(routes)],
})
export class AuthModule {}
