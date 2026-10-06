import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CafMoyenComponent } from './caf-moyen.component';

@NgModule({
  declarations: [CafMoyenComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: CafMoyenComponent }]),
  ],
})
export class CafMoyenModule {}
