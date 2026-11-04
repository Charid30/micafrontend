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
import { AuthService } from '../../../core/services/auth.service';
import { DialogService } from '../../../core/services/dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { ecouterTempsReel } from '../../../core/services/temps-reel.service';
import { imprimerPdf } from '../../../shared/pdf/pdf-serveur';

const PDF_CSS = `
.pdf-doc { width: 277mm; background: #fff; color: #111; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.3; }
.pdf-doc * { font-family: 'Times New Roman', Times, serif !important; letter-spacing: normal !important; box-shadow: none !important; }
.pdf-doc h1 { font-size: 15pt !important; font-weight: bold !important; text-transform: uppercase; text-align: center; color: #0B2B26 !important; margin: 0 !important; }
.pdf-doc .pdf-date { text-align: center; margin: 3pt 0 10pt !important; padding-bottom: 6pt; border-bottom: 2px solid #163832; }
.pdf-doc h4 { font-size: 12pt !important; font-weight: bold !important; color: #235347 !important; margin: 12pt 0 4pt !important; }
.pdf-doc table { width: 100% !important; border-collapse: collapse !important; }
.pdf-doc th, .pdf-doc td { border: 1px solid #8EB69B !important; padding: 2pt 4pt !important; vertical-align: middle !important; font-size: 12pt !important; text-align: left; }
.pdf-doc th { background: #051F20 !important; color: #fff !important; font-weight: bold !important; text-align: center !important; }
.pdf-doc td.pdf-nombre { text-align: right; white-space: nowrap; }
.pdf-doc td.pdf-centre { text-align: center; }
.pdf-doc td.pdf-vide { border: 0 !important; padding: 0 !important; }
.pdf-doc .auto-rouge, .pdf-doc .auto-jaune, .pdf-doc .auto-vert { display: inline-block !important; min-width: 0 !important; padding: 0 3pt !important; border-radius: 2pt !important; font-weight: bold !important; font-size: inherit !important; }
.pdf-doc .auto-rouge { background: #fee2e2 !important; color: #b91c1c !important; }
.pdf-doc .auto-jaune { background: #fef9c3 !important; color: #854d0e !important; }
.pdf-doc .auto-vert { background: #DAF1DE !important; color: #0B2B26 !important; }
`;

// Menu Centrale SONABEL : situation quotidienne des stocks de combustible des centrales
@Component({
  selector: 'app-centrales',
  templateUrl: './centrales.component.html',
  standalone: false,
})
export class CentralesComponent implements OnInit {
  // Rafraichissement automatique quand un autre utilisateur enregistre
  private readonly direct = ecouterTempsReel(['centrales'], () => this.charger(this.date));

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly authService = inject(AuthService);

  readonly onglets = [{ cle: 'jour', libelle: 'Situation du jour' }, { cle: 'evolution', libelle: 'Évolution' }];
  readonly seuilRouge = 2;
  readonly seuilJaune = 5;
  private readonly fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  private readonly fmtJours = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  loading = true;
  saving = false;
  generation = false;
  error: string | null = null;
  onglet = 'jour';
  modifie = false;

  date = '';
  aujourdhui = '';
  saisieFaite = false;
  lignes: any[] = [];
  parcs: any[] = [];
  evolution: any = null;

  get canWrite(): boolean { return this.authService.hasPermission('centrales', 'WRITE'); }
  get dateFr(): string { return this.date.split('-').reverse().join('/'); }

  ngOnInit(): void { this.charger(); }

  charger(date?: string): void {
    this.loading = !this.direct.silencieux;
    this.error = null;
    const q = date ? `?date=${date}` : '';
    const au = date ? `?au=${date}` : '';
    forkJoin({
      jour: this.http.get<any>(`${environment.apiUrl}/centrales${q}`),
      evolution: this.http.get<any>(`${environment.apiUrl}/centrales/evolution${au}`),
    }).subscribe({
      next: ({ jour, evolution }) => {
        this.appliquer(jour);
        this.evolution = evolution;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || `Erreur lors du chargement (${err.status || 'réseau'}).`;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private appliquer(jour: any): void {
    this.date = jour.date;
    this.aujourdhui = jour.aujourdhui;
    this.saisieFaite = jour.saisie_faite;
    this.lignes = jour.lignes;
    this.parcs = jour.parcs;
    this.modifie = false;
  }

  // Changement de jour : une saisie non enregistree n'est jamais perdue sans confirmation
  private async allerA(date: string): Promise<void> {
    if (this.modifie && !(await this.dialog.confirmer({
      titre: 'Quitter cette date ?', message: 'Les données non enregistrées seront perdues.', confirmer: 'Quitter', danger: true,
    }))) { this.cdr.detectChanges(); return; }
    this.charger(date);
  }

  aller(jours: number): void {
    const d = new Date(`${this.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + jours);
    this.allerA(d.toISOString().split('T')[0]);
  }

  choisir(champ: HTMLInputElement): void {
    if (!champ.value || champ.value > this.aujourdhui) { champ.value = this.date; return; }
    if (champ.value !== this.date) {
      const date = champ.value;
      champ.value = this.date;
      this.allerA(date);
    }
  }

  private num(v: any): number | null { return v === null || v === undefined || v === '' ? null : Number(v); }

  creux(l: any): number | null {
    const capacite = this.num(l.capacite), stock = this.num(l.stock);
    return capacite === null || stock === null ? null : capacite - stock;
  }

  autonomie(l: any): number | null {
    const stock = this.num(l.stock), besoin = this.num(l.besoin_journalier);
    return stock === null || !besoin ? null : stock / besoin;
  }

  depasse(l: any): boolean { return (this.creux(l) ?? 0) < 0; }
  nombre(v: number | null | undefined): string { return v === null || v === undefined ? '' : this.fmt.format(v); }
  jours(v: number | null | undefined): string { return v === null || v === undefined ? '—' : this.fmtJours.format(v); }

  classeAutonomie(v: number | null | undefined): string {
    if (v === null || v === undefined) return 'text-gray-400';
    return v < this.seuilRouge ? 'auto-rouge' : v < this.seuilJaune ? 'auto-jaune' : 'auto-vert';
  }

  async enregistrer(): Promise<void> {
    const trop = this.lignes.find(l => this.depasse(l));
    if (trop) { this.toast.error(`${trop.centrale} ${trop.combustible} : le stock dépasse la capacité des cuves.`); return; }
    if (!(await this.dialog.confirmerEnregistrement(`la situation des centrales du ${this.dateFr}`))) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.http.post<any>(`${environment.apiUrl}/centrales/saisie`, { date: this.date, lignes: this.lignes, parcs: this.parcs }).subscribe({
      next: (r) => {
        this.appliquer(r);
        this.saving = false;
        this.toast.success(r.message);
        this.charger(this.date);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  // Meme procede que le rapport : copie du modele et feuille de style propre, imprimees par Chrome
  // sur le serveur (A4 paysage, 277 mm x 190 mm utiles)
  async telecharger(): Promise<void> {
    const el = document.getElementById('centrales-pdf');
    if (!el) return;
    this.generation = true;
    this.cdr.detectChanges();

    try {
      await imprimerPdf(this.http, el, PDF_CSS, `centrales_sonabel_${this.date}.pdf`, { paysage: true });
    } catch {
      this.toast.error('Impossible de générer le PDF.');
    } finally {
      this.generation = false;
      this.cdr.detectChanges();
    }
  }
}
