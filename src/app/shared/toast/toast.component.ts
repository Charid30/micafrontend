import { Component } from '@angular/core';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  standalone: false,
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }
}
