import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

@Component({
  selector: 'app-structures',
  templateUrl: './structures.component.html',
  standalone: false,
})
export class StructuresComponent implements OnInit {
  tabs = [
    { key: 'entreprises', label: 'Entreprises' },
    { key: 'directions', label: 'Directions' },
  ];
  activeTab = 'entreprises';

  entreprises: any[] = [];
  directions: any[] = [];
  saving = false;

  // Entreprise modal
  showEntModal = false;
  editingEnt: any = null;
  entForm: any = {};

  // Direction modal
  showDirModal = false;
  editingDir: any = null;
  dirForm: any = {};

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.http.get<any[]>(`${API}/entreprises`).subscribe({ next: d => { this.entreprises = d; this.cdr.detectChanges(); } });
    this.http.get<any[]>(`${API}/directions`).subscribe({ next: d => { this.directions = d; this.cdr.detectChanges(); } });
  }

  // ── Entreprises ──────────────────────────────

  openEntForm(e: any): void {
    this.editingEnt = e;
    this.entForm = e ? { nom: e.nom, acronyme: e.acronyme, description: e.description || '' } : { nom: '', acronyme: '', description: '' };
    this.showEntModal = true;
    this.cdr.detectChanges();
  }

  saveEnt(): void {
    if (!this.entForm.nom || !this.entForm.acronyme) { this.toast.error('Nom et acronyme sont requis.'); return; }
    this.saving = true;
    const req = this.editingEnt?.id
      ? this.http.put(`${API}/entreprises/${this.editingEnt.id}`, this.entForm)
      : this.http.post(`${API}/entreprises`, this.entForm);
    req.subscribe({
      next: () => { this.saving = false; this.showEntModal = false; this.toast.success('Entreprise enregistrée.'); this.loadAll(); },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  deleteEnt(e: any): void {
    if (!confirm(`Supprimer "${e.nom}" ?`)) return;
    this.http.delete(`${API}/entreprises/${e.id}`).subscribe({
      next: () => { this.toast.success('Entreprise supprimée.'); this.loadAll(); },
      error: (err) => this.toast.error(err.error?.message || 'Erreur.'),
    });
  }

  // ── Directions ───────────────────────────────

  openDirForm(d: any): void {
    this.editingDir = d;
    this.dirForm = d
      ? { entreprise_id: d.entreprise_id, acronyme: d.acronyme, description: d.description || '' }
      : { entreprise_id: '', acronyme: '', description: '' };
    this.showDirModal = true;
    this.cdr.detectChanges();
  }

  saveDir(): void {
    if (!this.dirForm.entreprise_id || !this.dirForm.acronyme) { this.toast.error('Entreprise et acronyme sont requis.'); return; }
    this.saving = true;
    const req = this.editingDir?.id
      ? this.http.put(`${API}/directions/${this.editingDir.id}`, this.dirForm)
      : this.http.post(`${API}/directions`, this.dirForm);
    req.subscribe({
      next: () => { this.saving = false; this.showDirModal = false; this.toast.success('Direction enregistrée.'); this.loadAll(); },
      error: (e) => { this.saving = false; this.toast.error(e.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }

  deleteDir(d: any): void {
    if (!confirm(`Supprimer "${d.acronyme}" ?`)) return;
    this.http.delete(`${API}/directions/${d.id}`).subscribe({
      next: () => { this.toast.success('Direction supprimée.'); this.loadAll(); },
      error: (e) => this.toast.error(e.error?.message || 'Erreur.'),
    });
  }
}
