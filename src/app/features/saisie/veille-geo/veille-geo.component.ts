import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-veille-geo',
  templateUrl: './veille-geo.component.html',
  standalone: false,
})
export class VeilleGeoComponent implements OnInit {
  loading = true;
  saving  = false;
  archiving = false;
  error: string | null = null;

  rapport: any   = null;
  zones:   any[] = [];

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('veille-geo', 'WRITE'); }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/veille-geo/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport = data.rapport;
        this.zones   = data.zones;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onArchive(): void {
    if (!this.rapport || !confirm('Archiver ce rapport ? Cette action est irréversible.')) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  onSave(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/veille-geo/saisie`, {
      rapport_id: this.rapport.id,
      zones:      this.zones,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Veille géopolitique enregistrée avec succès.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }
}
