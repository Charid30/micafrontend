import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CorridorsComponent } from './corridors.component';

@NgModule({
  declarations: [CorridorsComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: CorridorsComponent }])],
})
export class CorridorsModule {}
