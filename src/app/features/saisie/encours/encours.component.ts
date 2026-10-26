/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';
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
  private readonly dialog = inject(DialogService);
  loading = true;
  saving  = false;
  archiving = false;
  error: string | null = null;

  rapport: any  = null;
  depots: any[] = [];
  dateSaisie: string | null = null;

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
        this.rapport    = data.rapport;
        this.depots     = data.depots;
        this.dateSaisie = data.date_saisie || null;
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
  // Camions en instance = camions en attente (deja nets des camions depotes : restants apres depotage)
  // + camions recus. Les camions depotes ne sont pas retranches une seconde fois.
  camionsEnInstance(ligne: any): number {
    const att = parseInt(ligne.camions_en_attente) || 0;
    const rec = parseInt(ligne.camions_recus)      || 0;
    return att + rec;
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

  async onArchive(): Promise<void> {
    if (!this.rapport || !(await this.dialog.confirmer({
      titre: `Archiver le rapport de la semaine ${this.rapport.semaine_iso} / ${this.rapport.annee} ?`,
      message: 'Le rapport sera publié et ne pourra plus être modifié. La saisie passera à la semaine suivante.',
      confirmer: 'Archiver',
    }))) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => { this.archiving = false; this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.'); this.ngOnInit(); this.cdr.detectChanges(); },
      error: (err) => { this.archiving = false; this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.'); this.cdr.detectChanges(); },
    });
  }

  // ── Sauvegarde
  async onSave(): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement('la situation des dépôts intérieurs'))) return;
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
