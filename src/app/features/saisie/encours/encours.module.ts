import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EncoursComponent } from './encours.component';

@NgModule({
  declarations: [EncoursComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: EncoursComponent }])],
})
export class EncoursModule {}
