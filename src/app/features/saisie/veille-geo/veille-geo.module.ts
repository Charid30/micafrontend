import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VeilleGeoComponent } from './veille-geo.component';

@NgModule({
  declarations: [VeilleGeoComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: VeilleGeoComponent }])],
})
export class VeilleGeoModule {}
