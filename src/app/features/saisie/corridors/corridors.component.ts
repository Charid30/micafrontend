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
  selector: 'app-corridors',
  templateUrl: './corridors.component.html',
  standalone: false,
})
export class CorridorsComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving = false;
  archiving = false;
  error: string | null = null;

  rapport: any   = null;
  corridors: any[] = [];
  dateSaisie: string | null = null;

  constructor(
    private http: HttpClient,
    private cdr:  ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  get canWrite(): boolean { return this.authService.hasPermission('corridors', 'WRITE'); }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/chargements/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport    = data.rapport;
        this.corridors  = data.corridors;
        this.dateSaisie = data.date_saisie || null;
        this.loading   = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = 'Erreur lors du chargement (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Calculs
  camionsRestants(ligne: any): number {
    return Math.max(0, (parseInt(ligne.camions_en_attente) || 0) - (parseInt(ligne.camions_charges) || 0));
  }

  tauxRealisation(ligne: any): number {
    const attente = parseInt(ligne.camions_en_attente) || 0;
    const charges = parseInt(ligne.camions_charges)    || 0;
    return attente > 0 ? Math.round((charges / attente) * 100) : 0;
  }

  // ── Totaux par corridor
  totalEnAttente(corridor: any): number {
    return corridor.lignes.reduce((s: number, l: any) => s + (parseInt(l.camions_en_attente) || 0), 0);
  }
  totalCharges(corridor: any): number {
    return corridor.lignes.reduce((s: number, l: any) => s + (parseInt(l.camions_charges) || 0), 0);
  }
  totalBons(corridor: any): number {
    return corridor.lignes.reduce((s: number, l: any) => s + (parseInt(l.bons_emis) || 0), 0);
  }
  totalTaux(corridor: any): number {
    const att = this.totalEnAttente(corridor);
    const ch  = this.totalCharges(corridor);
    return att > 0 ? Math.round((ch / att) * 100) : 0;
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
    if (!(await this.dialog.confirmerEnregistrement('la saisie des corridors'))) return;
    this.saving = true;
    this.http.post(`${environment.apiUrl}/chargements/saisie`, {
      rapport_id: this.rapport.id,
      corridors:  this.corridors,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Saisie corridors enregistrée avec succès.');
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
