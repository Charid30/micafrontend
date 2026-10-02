import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AchatsTradersComponent } from './achats-traders.component';

@NgModule({
  declarations: [AchatsTradersComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: AchatsTradersComponent }]),
  ],
})
export class AchatsTradersModule {}
