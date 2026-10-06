import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recommandations',
  templateUrl: './recommandations.component.html',
  standalone: false,
})
export class RecommandationsComponent implements OnInit {
  loading = true;
  saving  = false;
  error: string | null = null;
  rapport: any = null;

  tendance_generale  = '';
  risques_majeurs    = '';
  impact_sonabhy     = '';
  recommandations    = '';

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('recommandations', 'WRITE'); }

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/recommandations/semaine-courante`).subscribe({
      next: (data) => {
        this.rapport           = data.rapport;
        this.tendance_generale = data.recommandation?.tendance_generale  || '';
        this.risques_majeurs   = data.recommandation?.risques_majeurs    || '';
        this.impact_sonabhy    = data.recommandation?.impact_sonabhy     || '';
        this.recommandations   = data.recommandation?.recommandations    || '';
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

  onSave(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/recommandations/saisie`, {
      rapport_id:          this.rapport.id,
      tendance_generale:   this.tendance_generale,
      risques_majeurs:     this.risques_majeurs,
      impact_sonabhy:      this.impact_sonabhy,
      recommandations:     this.recommandations,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Recommandations enregistrées avec succès.');
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
