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

  // Informations utiles du rapport : reprises de la derniere semaine renseignee tant qu'elles ne sont pas modifiees
  informations_utiles = '';
  informationsRepriseDe: { semaine_iso: number; annee: number } | null = null;
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
        // Le serveur renvoie les champs a plat (auparavant lus sous data.recommandation : les textes
        // enregistres ne se reaffichaient pas et etaient effaces au prochain enregistrement)
        this.informations_utiles   = data.informations_utiles || '';
        this.informationsRepriseDe = data.informations_reprises_de || null;
        this.tendance_generale = data.tendance_generale || '';
        this.risques_majeurs   = data.risques_majeurs   || '';
        this.impact_sonabhy    = data.impact_sonabhy    || '';
        this.recommandations   = data.recommandations   || '';
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
      informations_utiles: this.informations_utiles,
      tendance_generale:   this.tendance_generale,
      risques_majeurs:     this.risques_majeurs,
      impact_sonabhy:      this.impact_sonabhy,
      recommandations:     this.recommandations,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.informationsRepriseDe = null;
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
