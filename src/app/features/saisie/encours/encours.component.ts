import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-encours',
  templateUrl: './encours.component.html',
  standalone: false,
})
export class EncoursComponent implements OnInit {
  loading = true;
  saving  = false;
  archiving = false;
  error: string | null = null;

  rapport: any  = null;
  depots: any[] = [];

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('depots-int', 'WRITE'); }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/encours/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport = data.rapport;
        this.depots  = data.depots;
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

  // ── Calculs par ligne
  camionsEnInstance(ligne: any): number {
    const att = parseInt(ligne.camions_en_attente) || 0;
    const rec = parseInt(ligne.camions_recus)      || 0;
    const dep = parseInt(ligne.camions_depotes)    || 0;
    return Math.max(0, att + rec - dep);
  }

  tauxDepotage(ligne: any): number {
    const att   = parseInt(ligne.camions_en_attente) || 0;
    const rec   = parseInt(ligne.camions_recus)      || 0;
    const dep   = parseInt(ligne.camions_depotes)    || 0;
    const total = att + rec;
    return total > 0 ? Math.round((dep / total) * 100) : 0;
  }

  // ── Totaux par dépôt
  totalEnAttente(depot: any): number {
    return depot.lignes.reduce((s: number, l: any) => s + (parseInt(l.camions_en_attente) || 0), 0);
  }
  totalRecus(depot: any): number {
    return depot.lignes.reduce((s: number, l: any) => s + (parseInt(l.camions_recus) || 0), 0);
  }
  totalDepotes(depot: any): number {
    return depot.lignes.reduce((s: number, l: any) => s + (parseInt(l.camions_depotes) || 0), 0);
  }
  totalEnInstance(depot: any): number {
    return depot.lignes.reduce((s: number, l: any) => s + this.camionsEnInstance(l), 0);
  }
  totalTaux(depot: any): number {
    const total = this.totalEnAttente(depot) + this.totalRecus(depot);
    const dep   = this.totalDepotes(depot);
    return total > 0 ? Math.round((dep / total) * 100) : 0;
  }

  onArchive(): void {
    if (!this.rapport || !confirm('Archiver ce rapport ? Cette action est irréversible.')) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  // ── Sauvegarde
  onSave(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/encours/saisie`, {
      rapport_id: this.rapport.id,
      depots:     this.depots,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Saisie dépôts intérieurs enregistrée avec succès.');
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
