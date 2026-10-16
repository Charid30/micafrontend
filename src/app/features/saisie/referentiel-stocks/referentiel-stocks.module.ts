import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReferentielStocksComponent } from './referentiel-stocks.component';

@NgModule({
  declarations: [ReferentielStocksComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: ReferentielStocksComponent }])],
})
export class ReferentielStocksModule {}
