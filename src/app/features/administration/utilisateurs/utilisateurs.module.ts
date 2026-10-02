import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UtilisateursComponent } from './utilisateurs.component';

@NgModule({
  declarations: [UtilisateursComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: UtilisateursComponent }]),
  ],
})
export class UtilisateursModule {}
