import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StocksComponent } from './stocks.component';

@NgModule({
  declarations: [StocksComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: StocksComponent }])],
})
export class StocksModule {}
