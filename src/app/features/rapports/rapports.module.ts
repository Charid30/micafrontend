import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RapportsComponent } from './rapports.component';

@NgModule({
  declarations: [RapportsComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: RapportsComponent }])],
})
export class RapportsModule {}
