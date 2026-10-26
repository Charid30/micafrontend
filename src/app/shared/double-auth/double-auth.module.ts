/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoubleAuthConfigComponent } from './double-auth-config.component';

// Composant partage : profil et page de configuration obligatoire (administrateurs)
@NgModule({
  declarations: [DoubleAuthConfigComponent],
  imports: [CommonModule, FormsModule],
  exports: [DoubleAuthConfigComponent],
})
export class DoubleAuthModule {}
