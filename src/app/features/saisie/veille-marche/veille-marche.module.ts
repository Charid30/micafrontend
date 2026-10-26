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
import { VeilleMarcheComponent } from './veille-marche.component';
import { FrequenceModule } from '../../../shared/frequence/frequence.module';

@NgModule({
  declarations: [VeilleMarcheComponent],
  imports: [CommonModule, FormsModule, FrequenceModule, RouterModule.forChild([{ path: '', component: VeilleMarcheComponent }])],
})
export class VeilleMarcheModule {}
