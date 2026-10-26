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

// Referentiel des stocks : impompable et consommation (responsables de depot, droit « impompable »),
// besoins exterieurs, exclusions du total et parametres de calcul (droit « referentiel-stocks »).
@Component({
  selector: 'app-referentiel-stocks',
  templateUrl: './referentiel-stocks.component.html',
  standalone: false,
})
export class ReferentielStocksComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving: string | null = null;
  error: string | null = null;
  data: any = null;
  droits = { depots: false, depot_restreint: null as number | null, exterieur: false };
  parametres = { seuil_rouge_jours: 10, couverture_objectif_pct: 100, densite_gaz: 0.56 };
  dateEffet = new Date().toISOString().split('T')[0];

  private readonly api = `${environment.apiUrl}/referentiel-stocks`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService) {}

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.http.get(this.api).subscribe({
      next: (data: any) => {
        this.data = data;
        this.droits = data.droits;
        this.parametres = { ...data.parametres };
        this.error = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du chargement du référentiel.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  peutModifierDepot(depot: any): boolean {
    return this.droits.depots && (!this.droits.depot_restreint || this.droits.depot_restreint === depot.depot_id);
  }

  private objetSection(section: string): string {
    return ({
      interieurs: 'le référentiel des dépôts intérieurs', besoins: 'les besoins journaliers',
      exclusions: 'les exclusions du total extérieur', parametres: 'les paramètres de calcul',
      densites: 'les densités des produits',
    } as Record<string, string>)[section] || 'le référentiel';
  }

  private dateValide(): boolean {
    if (/^\d{4}-\d{2}-\d{2}$/.test(this.dateEffet)) return true;
    this.toast.error("Indiquez la date d'effet des nouvelles valeurs.");
    return false;
  }

  private async envoyer(section: string, url: string, body: any): Promise<void> {
    // Parametres et densites : pas de date d'effet
    if (!['parametres', 'densites'].includes(section) && !this.dateValide()) return;
    if (!(await this.dialog.confirmerEnregistrement(this.objetSection(section), ['parametres', 'densites'].includes(section) ? undefined : `Les nouvelles valeurs seront en vigueur à partir du ${this.dateEffet.split('-').reverse().join('/')}.`))) return;
    this.saving = section;
    this.http.put(url, body).subscribe({
      next: (res: any) => {
        this.saving = null;
        this.toast.success(res?.message || 'Enregistré.');
        this.charger();
      },
      error: (err) => {
        this.saving = null;
        this.toast.error(err.error?.message || "Erreur lors de l'enregistrement.");
        this.cdr.detectChanges();
      },
    });
  }

  enregistrerInterieurs(): void {
    const lignes = this.data.depots_interieurs
      .filter((d: any) => this.peutModifierDepot(d))
      .flatMap((d: any) => d.lignes.map((l: any) => ({
        depot_id: d.depot_id, produit_id: l.produit_id,
        impompable: Number(l.impompable) || 0, conso_moyenne: Number(l.conso_moyenne) || 0,
      })));
    if (lignes.some((l: any) => l.impompable < 0 || l.conso_moyenne < 0)) { this.toast.error('Les valeurs doivent être positives.'); return; }
    this.envoyer('interieurs', `${this.api}/depots`, { date_effet: this.dateEffet, lignes });
  }

  enregistrerExclusions(): void {
    const lignes = this.data.depots_exterieurs.flatMap((d: any) => d.lignes.map((l: any) => ({
      depot_id: d.depot_id, produit_id: l.produit_id, exclu_total: !!l.exclu_total,
    })));
    this.envoyer('exclusions', `${this.api}/depots`, { date_effet: this.dateEffet, lignes });
  }

  enregistrerBesoins(): void {
    const besoins = this.data.besoins.map((b: any) => ({ produit_id: b.produit_id, besoin_journalier: Number(b.besoin_journalier) || 0 }));
    if (besoins.some((b: any) => b.besoin_journalier < 0)) { this.toast.error('Les besoins doivent être positifs.'); return; }
    this.envoyer('besoins', `${this.api}/besoins`, { date_effet: this.dateEffet, besoins });
  }

  enregistrerDensites(): void {
    const densites = this.data.densites.filter((d: any) => !d.en_kg).map((d: any) => ({ produit_id: d.produit_id, densite: Number(d.densite) }));
    if (densites.some((d: any) => !(d.densite >= 0.3 && d.densite <= 1.5))) { this.toast.error('Densité invalide (0,3 à 1,5 t/m³).'); return; }
    this.envoyer('densites', `${this.api}/densites`, { densites });
  }

  enregistrerParametres(): void {
    const p = this.parametres;
    this.envoyer('parametres', `${this.api}/parametres`, {
      seuil_rouge_jours: Number(p.seuil_rouge_jours), couverture_objectif_pct: Number(p.couverture_objectif_pct), densite_gaz: Number(p.densite_gaz),
    });
  }
}
