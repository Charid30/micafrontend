import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StructuresComponent } from './structures.component';

@NgModule({
  declarations: [StructuresComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: StructuresComponent }]),
  ],
})
export class StructuresModule {}
