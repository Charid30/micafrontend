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
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfilComponent } from './profil.component';
import { DoubleAuthModule } from '../../shared/double-auth/double-auth.module';

@NgModule({
  declarations: [ProfilComponent],
  imports: [CommonModule, FormsModule, DoubleAuthModule, RouterModule.forChild([{ path: '', component: ProfilComponent }])],
})
export class ProfilModule {}
