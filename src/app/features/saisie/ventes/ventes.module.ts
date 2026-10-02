import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VentesComponent } from './ventes.component';

@NgModule({
  declarations: [VentesComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: VentesComponent }])],
})
export class VentesModule {}
