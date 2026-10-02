import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FinancesComponent } from './finances.component';

@NgModule({
  declarations: [FinancesComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: FinancesComponent }])],
})
export class FinancesModule {}
