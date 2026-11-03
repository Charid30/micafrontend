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
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DialogService } from '../../../core/services/dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { ecouterTempsReel } from '../../../core/services/temps-reel.service';

const API = `${environment.apiUrl}/administration/interims`;
const FORMULAIRE = {
  id: null as number | null, titulaire_id: null as number | null, interimaire_id: null as number | null,
  date_debut: '', date_fin: '', motif: '',
};
const STATUTS: Record<string, { libelle: string; classe: string }> = {
  EN_COURS: { libelle: 'En cours', classe: 'badge-success' }, A_VENIR: { libelle: 'À venir', classe: 'badge-info' },
  TERMINE: { libelle: 'Terminé', classe: 'badge-neutral' }, ARRETE: { libelle: 'Arrêté', classe: 'badge-neutral' },
  ANNULE: { libelle: 'Annulé', classe: 'badge-neutral' },
};

// Interims : l'administrateur confie les droits d'un agent absent a un autre compte pour une periode
@Component({
  selector: 'app-interims',
  templateUrl: './interims.component.html',
  standalone: false,
})
export class InterimsComponent implements OnInit {
  private readonly direct = ecouterTempsReel(['administration'], () => this.charger());

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);

  readonly statuts = STATUTS;
  readonly etapes = ['Intérim', 'Droits confiés'];

  loading = true;
  saving = false;
  error: string | null = null;
  aujourdhui = '';
  interims: any[] = [];
  comptes: any[] = [];

  modale = false;
  etape = 1;
  erreurEtape: string | null = null;
  form = { ...FORMULAIRE };
  droits: any[] = [];
  coches: Record<string, boolean> = {};
  chargementDroits = false;

  // Calcules au chargement : une liste recreee a chaque rendu redessinerait les tableaux
  blocs: { titre: string; lignes: any[]; actions: boolean }[] = [];
  // Un interim en cours garde sa date de debut
  get debutFige(): boolean { return !!this.form.id && this.interims.find(i => i.id === this.form.id)?.statut === 'EN_COURS'; }
  get candidats(): any[] { return this.comptes.filter(c => c.id !== Number(this.form.titulaire_id)); }
  get modulesCoches(): number { return this.modules.filter(m => this.coches[m]).length; }
  // Un droit par module : un meme module peut avoir plusieurs lignes (depots)
  get modules(): string[] { return [...new Set(this.droits.map(d => d.module))]; }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.loading = !this.direct.silencieux;
    forkJoin({
      liste: this.http.get<any>(API),
      comptes: this.http.get<any[]>(`${environment.apiUrl}/utilisateurs`),
    }).subscribe({
      next: ({ liste, comptes }) => {
        this.aujourdhui = liste.aujourdhui;
        this.interims = liste.interims;
        const actif = (i: any) => i.statut === 'EN_COURS' || i.statut === 'A_VENIR';
        this.blocs = [
          { titre: 'En cours et à venir', lignes: this.interims.filter(actif), actions: true },
          { titre: 'Terminés', lignes: this.interims.filter(i => !actif(i)), actions: false },
        ];
        // Les administrateurs ont tous les droits : ni titulaire ni interimaire
        this.comptes = comptes.filter(c => !c.is_admin).map(c => ({ id: c.id, nom: this.nomCompte(c) }))
          .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        this.loading = false;
        this.error = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || `Erreur lors du chargement (${err.status || 'réseau'}).`;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private nomCompte(c: any): string {
    const nom = [c.agent?.prenoms, c.agent?.nom].filter(Boolean).join(' ');
    return nom ? `${nom} (${c.username})` : c.username;
  }

  fr(date: string): string { return String(date || '').split('-').reverse().join('/'); }
  droitsConfies(i: any): string { return i.modules_exclus.length ? `Tous sauf ${i.modules_exclus.length}` : 'Tous'; }

  // ── Saisie par etapes
  private focusEtape(): void { setTimeout(() => document.querySelector<HTMLElement>('#interim-etape input, #interim-etape select')?.focus()); }

  allerEtape(etape: number): void {
    this.etape = etape;
    this.erreurEtape = null;
    this.cdr.detectChanges();
    this.focusEtape();
  }

  nouveau(): void {
    this.form = { ...FORMULAIRE, date_debut: this.aujourdhui };
    this.droits = [];
    this.coches = {};
    this.titulaireDesDroits = null;
    this.modale = true;
    this.allerEtape(1);
  }

  modifier(i: any): void {
    this.form = { id: i.id, titulaire_id: i.titulaire_id, interimaire_id: i.interimaire_id, date_debut: i.date_debut, date_fin: i.date_fin, motif: i.motif || '' };
    this.droits = [];
    this.coches = {};
    this.modale = true;
    this.titulaireDesDroits = i.titulaire_id;
    this.chargerDroits(i.modules_exclus);
    this.allerEtape(1);
  }

  fermer(): void {
    this.modale = false;
    this.cdr.detectChanges();
  }

  // Droits du titulaire, tous coches sauf ceux deja exclus
  private chargerDroits(exclus: string[] = [], suite?: () => void): void {
    this.chargementDroits = true;
    this.http.get<any>(`${API}/titulaire/${this.form.titulaire_id}/droits`).subscribe({
      next: (r) => {
        this.droits = r.droits;
        this.coches = Object.fromEntries(this.modules.map(m => [m, !exclus.includes(m)]));
        this.chargementDroits = false;
        suite?.();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.chargementDroits = false;
        this.erreurEtape = err.error?.message || 'Droits du titulaire indisponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  libelleModule(m: string): string { return this.droits.find(d => d.module === m)?.libelle || m; }
  detailModule(m: string): string {
    return this.droits.filter(d => d.module === m)
      .map(d => `${d.action === 'WRITE' ? 'Écriture' : 'Lecture'}${d.depot ? ` (${d.depot})` : ''}`).join(', ');
  }

  validerEtape(): void {
    const f = this.form;
    if (this.etape === 1) {
      const manque = [[f.titulaire_id, 'titulaire'], [f.interimaire_id, 'intérimaire'], [f.date_debut, 'date de début'], [f.date_fin, 'date de fin']]
        .filter(([v]) => !v).map(([, l]) => l);
      if (manque.length) { this.erreurEtape = `À renseigner : ${manque.join(', ')}.`; this.cdr.detectChanges(); return; }
      if (Number(f.titulaire_id) === Number(f.interimaire_id)) { this.erreurEtape = 'Choisissez deux comptes différents.'; this.cdr.detectChanges(); return; }
      if (f.date_fin < f.date_debut) { this.erreurEtape = 'La date de fin précède la date de début.'; this.cdr.detectChanges(); return; }
      // Titulaire change : ses droits sont relus, tous coches
      const dejaCharges = this.droits.length && this.form.titulaire_id === this.titulaireDesDroits;
      if (dejaCharges) { this.allerEtape(2); return; }
      this.titulaireDesDroits = this.form.titulaire_id;
      this.chargerDroits([], () => this.allerEtape(2));
      return;
    }
    if (!this.modulesCoches) { this.erreurEtape = 'Laissez au moins un droit à l\'intérimaire.'; this.cdr.detectChanges(); return; }
    this.enregistrer();
  }

  private titulaireDesDroits: number | null = null;

  private enregistrer(): void {
    const corps = {
      titulaire_id: Number(this.form.titulaire_id), interimaire_id: Number(this.form.interimaire_id),
      date_debut: this.form.date_debut, date_fin: this.form.date_fin, motif: this.form.motif,
      modules_exclus: this.modules.filter(m => !this.coches[m]),
    };
    const requete = this.form.id ? this.http.put<any>(`${API}/${this.form.id}`, corps) : this.http.post<any>(API, corps);
    this.saving = true;
    this.cdr.detectChanges();
    requete.subscribe({
      next: (r) => {
        this.saving = false;
        this.toast.success(r.message);
        this.modale = false;
        this.charger();
      },
      error: (err) => {
        this.saving = false;
        this.erreurEtape = err.error?.message || 'Erreur lors de l\'enregistrement.';
        this.cdr.detectChanges();
      },
    });
  }

  async arreter(i: any): Promise<void> {
    const avant = i.statut === 'A_VENIR';
    if (!(await this.dialog.confirmer({
      titre: avant ? 'Annuler cet intérim ?' : 'Arrêter cet intérim maintenant ?',
      message: `${i.interimaire} perd aussitôt les droits de ${i.titulaire}.`,
      confirmer: avant ? 'Annuler l\'intérim' : 'Arrêter', danger: true,
    }))) { this.cdr.detectChanges(); return; }
    this.http.post<any>(`${API}/${i.id}/arreter`, {}).subscribe({
      next: (r) => { this.toast.success(r.message); this.charger(); },
      error: (err) => { this.toast.error(err.error?.message || 'Erreur.'); this.cdr.detectChanges(); },
    });
  }
}
