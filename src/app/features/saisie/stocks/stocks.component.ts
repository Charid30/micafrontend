import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-stocks',
  templateUrl: './stocks.component.html',
  standalone: false,
})
export class StocksComponent implements OnInit {
  loading = true;
  saving = false;
  archiving = false;
  error: string | null = null;

  rapport: any = null;
  depotsInterieurs: any[] = [];
  depotsExterieurs: any[] = [];
  dateSaisie: string | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService, public authService: AuthService) {}

  get canWrite(): boolean { return this.authService.hasPermission('stocks', 'WRITE'); }
  get canWriteImpompable(): boolean { return this.authService.hasPermission('impompable', 'WRITE'); }
  get canWriteAny(): boolean { return this.canWrite || this.canWriteImpompable; }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/stocks/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport          = data.rapport;
        this.depotsInterieurs = data.depots_interieurs;
        this.depotsExterieurs = data.depots_exterieurs;
        this.dateSaisie       = data.date_saisie || null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = 'Erreur lors du chargement des données (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Calculs en temps réel

  autonomieInt(ligne: any): number {
    const dispo   = parseFloat(ligne.stock_disponible) || 0;
    const impompa = parseFloat(ligne.stock_impompable) || 0;
    const conso   = parseFloat(ligne.conso_moyenne)    || 0;
    return conso > 0 ? (dispo - impompa) / conso : 0;
  }

  couvertureInt(ligne: any): number {
    const dispo   = parseFloat(ligne.stock_disponible) || 0;
    const securit = parseFloat(ligne.stock_securite)   || 0;
    return securit > 0 ? (dispo / securit) * 100 : 0;
  }

  autonomieExt(ligne: any): number {
    const dispo = parseFloat(ligne.stock_disponible) || 0;
    const conso = parseFloat(ligne.conso_moyenne)    || 0;
    return conso > 0 ? dispo / conso : 0;
  }

  statutClass(autonomie: number, seuil: number): string {
    return autonomie > 0 && autonomie < seuil ? 'badge-danger' : 'badge-success';
  }

  // ── Archivage
  onArchive(): void {
    if (!this.rapport || !confirm('Archiver ce rapport ? Cette action est irréversible.')) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => {
        this.archiving = false;
        this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.');
        this.ngOnInit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.archiving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Sauvegarde
  onSave(): void {
    this.saving = true;
    this.error  = null;

    const depots = [
      ...this.depotsInterieurs.map(d => ({ ...d, type: 'INTERIEUR' })),
      ...this.depotsExterieurs.map(d => ({ ...d, type: 'EXTERIEUR' })),
    ];

    this.http.post(`${environment.apiUrl}/stocks/saisie`, {
      rapport_id: this.rapport.id,
      depots,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Saisie enregistrée avec succès.');
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
