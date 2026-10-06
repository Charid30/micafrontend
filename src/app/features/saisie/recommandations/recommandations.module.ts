import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RecommandationsComponent } from './recommandations.component';

@NgModule({
  declarations: [RecommandationsComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: RecommandationsComponent }]),
  ],
})
export class RecommandationsModule {}
