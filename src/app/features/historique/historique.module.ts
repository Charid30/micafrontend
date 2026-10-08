import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { HistoriqueComponent } from './historique.component';

@NgModule({
  declarations: [HistoriqueComponent],
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    RouterModule.forChild([{ path: '', component: HistoriqueComponent }]),
  ],
  providers: [provideCharts(withDefaultRegisterables())],
})
export class HistoriqueModule {}
