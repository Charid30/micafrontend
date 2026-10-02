import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  today = new Date();
  loading = true;
  stats: any = null;
  error: string | null = null;
  alertesOuvertes = false;

  private sub: Subscription | null = null;
  private timer: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.timer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
        this.sub?.unsubscribe();
        this.cdr.detectChanges();
      }
    }, 8000);

    this.sub = this.http.get(`${environment.apiUrl}/dashboard/synthese`).subscribe({
      next: (data: any) => {
        clearTimeout(this.timer);
        this.stats = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(this.timer);
        this.loading = false;
        this.error = 'Erreur lors du chargement des données (' + (err.status || 'réseau') + ').';
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
  }
}
