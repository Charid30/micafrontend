import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CamionsComponent } from './camions.component';

@NgModule({
  declarations: [CamionsComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: CamionsComponent }])],
})
export class CamionsModule {}
