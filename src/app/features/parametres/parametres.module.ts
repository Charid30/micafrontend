import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ParametresComponent } from './parametres.component';

@NgModule({
  declarations: [ParametresComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ParametresComponent }]),
  ],
})
export class ParametresModule {}
