/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 *  Merci
 * ================================================================== */
import { inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-veille-marche',
  templateUrl: './veille-marche.component.html',
  standalone: false,
})
export class VeilleMarcheComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving  = false;
  archiving = false;
  error: string | null = null;

  rapport:     any   = null;
  frequence: string | null = null;
  dateSaisie: string | null = null;
  indicateurs: any[] = [];

  constructor(
    private http:  HttpClient,
    private cdr:   ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('veille-marche', 'WRITE'); }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/veille-marche/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport     = data.rapport;
        this.frequence = data.frequence || null;
        this.dateSaisie = data.date_saisie || null;
        this.indicateurs = data.indicateurs;
        this.loading     = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  variation(ind: any): number {
    const n  = parseFloat(ind.prix_semaine_n)  || 0;
    const n1 = parseFloat(ind.prix_semaine_n1) || 0;
    return Math.round((n - n1) * 10000) / 10000;
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

  async onSave(): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement('la veille marché'))) return;
    this.saving = true;
    this.http.post(`${environment.apiUrl}/veille-marche/saisie`, {
      rapport_id:  this.rapport.id,
      indicateurs: this.indicateurs,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Veille marché enregistrée avec succès.');
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
