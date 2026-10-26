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
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

// Les calculs ci-dessous reproduisent ceux du serveur (Backend/src/services/autonomie.service.js)
// pour un affichage instantane pendant la saisie ; les valeurs enregistrees sont recalculees par le serveur.
@Component({
  selector: 'app-stocks',
  templateUrl: './stocks.component.html',
  standalone: false,
})
export class StocksComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  loading = true;
  saving = false;
  archiving = false;
  error: string | null = null;

  // Perimetre de la page (route) : INTERIEUR ou EXTERIEUR ; seules ses lignes sont affichees et enregistrees
  readonly perimetre: 'INTERIEUR' | 'EXTERIEUR';
  rapport: any = null;
  dateSaisie: string | null = null;
  droits = { stocks: false, actions: false };
  parametres = { seuil_rouge_jours: 10, couverture_objectif_pct: 100, densite_gaz: 0.56 };
  depotsInterieurs: any[] = [];
  depotsExterieurs: any[] = [];
  syntheseInterieure: any[] = [];
  syntheseExterieure: any[] = [];
  cumulInterieur: any = { par_depot: {}, total: 0 };
  cumulExterieur: any = { par_pays: {}, total: 0 };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private toast: ToastService, public authService: AuthService, route: ActivatedRoute) {
    this.perimetre = route.snapshot.data['perimetre'] === 'EXTERIEUR' ? 'EXTERIEUR' : 'INTERIEUR';
  }

  get interieur(): boolean { return this.perimetre === 'INTERIEUR'; }

  get canWriteAny(): boolean { return this.droits.stocks || this.droits.actions; }
  get estPublie(): boolean { return this.rapport?.statut === 'PUBLIE'; }
  get canSeeReferentiel(): boolean {
    return this.authService.hasPermission('impompable', 'READ') || this.authService.hasPermission('referentiel-stocks', 'READ');
  }
  // Colonne « actions » : visible pour la DSTA, ou des qu'une action a ete renseignee
  get afficherActions(): boolean {
    const depots = this.interieur ? this.depotsInterieurs : this.depotsExterieurs;
    return this.droits.actions || depots.some(d => d.lignes.some((l: any) => l.action));
  }
  get objectifDefaut(): number {
    return this.depotsInterieurs[0]?.lignes[0]?.objectif_jours ?? this.depotsExterieurs[0]?.lignes[0]?.objectif_jours ?? 15;
  }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/stocks/semaine-courante`).subscribe({
      next: (data: any) => {
        this.rapport          = data.rapport;
        this.dateSaisie       = data.date_saisie || null;
        this.droits           = data.droits || { stocks: false, actions: false };
        this.parametres       = data.parametres || this.parametres;
        this.depotsInterieurs = data.depots_interieurs || [];
        // A l'exterieur, un seul champ de saisie (stock disponible) porte par stock_bacs
        this.depotsExterieurs = (data.depots_exterieurs || []).map((d: any) => ({
          ...d, lignes: d.lignes.map((l: any) => ({ ...l, stock_bacs: l.stock_disponible, stock_embranchement: 0 })),
        }));
        this.recalculer();
        this.error = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = err.error?.message || 'Erreur lors du chargement des données (' + (err.status || 'réseau') + ').';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Produits geres par le depot : configures dans le referentiel ou ayant un stock
  lignesVisibles(depot: any): any[] {
    return depot.lignes.filter((l: any) => l.conso_moyenne > 0 || l.impompable > 0 || l.volume_total !== 0);
  }

  classeAutonomie(couleur: string | null): string {
    return couleur ? `auto-${couleur}` : 'auto-aucune';
  }

  // ── Calculs en temps reel (memes regles que le serveur)
  private num(v: any): number { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
  private arrondi(v: number | null, d = 2): number | null { return v === null ? null : Math.round(v * 10 ** d) / 10 ** d; }
  private couleur(autonomie: number | null, objectif: number): string | null {
    if (autonomie === null) return null;
    if (autonomie < this.parametres.seuil_rouge_jours) return 'rouge';
    return autonomie < objectif ? 'jaune' : 'vert';
  }
  private tonnes(code: string, m3: number): number | null {
    return code === 'GAZ' ? this.arrondi(m3 * this.parametres.densite_gaz, 3) : null;
  }

  recalculer(): void {
    const p = this.parametres;
    for (const d of this.depotsInterieurs) {
      for (const l of d.lignes) {
        l.volume_total = this.num(l.stock_bacs) + this.num(l.stock_embranchement);
        const conso = this.num(l.conso_moyenne);
        const autonomie = conso > 0 ? (l.volume_total - this.num(l.impompable)) / conso : null;
        l.stock_securite = l.objectif_jours * conso;
        const couverture = l.stock_securite > 0 ? (l.volume_total / l.stock_securite) * 100 : null;
        l.autonomie = this.arrondi(autonomie);
        l.couverture = this.arrondi(couverture, 1);
        l.couverture_ok = couverture === null ? null : couverture >= p.couverture_objectif_pct;
        l.couleur = this.couleur(autonomie, l.objectif_jours);
        l.action_requise = l.couleur === 'rouge' || l.couleur === 'jaune';
      }
    }
    for (const d of this.depotsExterieurs) {
      for (const l of d.lignes) {
        l.stock_disponible = this.num(l.stock_bacs);
        const besoin = this.num(l.besoin_journalier);
        const autonomie = besoin > 0 ? l.stock_disponible / besoin : null;
        l.autonomie = this.arrondi(autonomie);
        l.negatif = l.stock_disponible < 0;
        l.couleur = this.couleur(autonomie, l.objectif_jours);
        l.action_requise = l.couleur === 'rouge' || l.couleur === 'jaune';
      }
    }
    this.syntheses();
  }

  private syntheses(): void {
    const produits = (this.depotsInterieurs[0] || this.depotsExterieurs[0])?.lignes || [];

    this.syntheseInterieure = produits.map((pr: any) => {
      const parDepot: any = {}; let total = 0, impompable = 0, conso = 0;
      for (const d of this.depotsInterieurs) {
        const l = d.lignes.find((x: any) => x.produit_id === pr.produit_id) || {};
        const v = this.num(l.volume_total);
        parDepot[d.depot_code] = v; total += v; impompable += this.num(l.impompable); conso += this.num(l.conso_moyenne);
      }
      const autonomie = conso > 0 ? (total - impompable) / conso : null;
      return {
        produit_id: pr.produit_id, produit_code: pr.produit_code, produit_libelle: pr.produit_libelle,
        par_depot: parDepot, volume_total: total, volume_total_tonnes: this.tonnes(pr.produit_code, total),
        impompable, conso_moyenne: conso, autonomie: this.arrondi(autonomie), couleur: this.couleur(autonomie, pr.objectif_jours),
      };
    }).filter((s: any) => s.volume_total !== 0 || s.conso_moyenne > 0 || s.impompable > 0);
    this.cumulInterieur = { par_depot: {}, total: 0 };
    for (const d of this.depotsInterieurs) {
      this.cumulInterieur.par_depot[d.depot_code] = this.syntheseInterieure.reduce((s, l) => s + (l.par_depot[d.depot_code] || 0), 0);
    }
    this.cumulInterieur.total = this.syntheseInterieure.reduce((s, l) => s + l.volume_total, 0);

    const produitsExt = this.depotsExterieurs[0]?.lignes || [];
    this.syntheseExterieure = produitsExt.map((pr: any) => {
      const parPays: any = {}; const exclus: string[] = []; let total = 0;
      for (const d of this.depotsExterieurs) {
        const l = d.lignes.find((x: any) => x.produit_id === pr.produit_id) || {};
        const v = this.num(l.stock_disponible);
        parPays[d.depot_code] = v;
        if (l.exclu_total) exclus.push(d.depot_code); else total += v;
      }
      const besoin = this.num(pr.besoin_journalier);
      const autonomie = besoin > 0 ? total / besoin : null;
      return {
        produit_id: pr.produit_id, produit_code: pr.produit_code, produit_libelle: pr.produit_libelle,
        par_pays: parPays, exclus, volume_total: total, volume_total_tonnes: this.tonnes(pr.produit_code, total),
        besoin_journalier: besoin, autonomie: this.arrondi(autonomie), couleur: this.couleur(autonomie, pr.objectif_jours),
      };
    });
    this.cumulExterieur = { par_pays: {}, total: 0 };
    for (const d of this.depotsExterieurs) {
      this.cumulExterieur.par_pays[d.depot_code] = this.syntheseExterieure.reduce((s, l) => s + (l.par_pays[d.depot_code] || 0), 0);
    }
    this.cumulExterieur.total = this.syntheseExterieure.reduce((s, l) => s + l.volume_total, 0);
  }

  // ── Archivage
  async onArchive(): Promise<void> {
    if (!this.rapport || !(await this.dialog.confirmer({
      titre: `Archiver le rapport de la semaine ${this.rapport.semaine_iso} / ${this.rapport.annee} ?`,
      message: 'Le rapport sera publié et ne pourra plus être modifié. La saisie passera à la semaine suivante.',
      confirmer: 'Archiver',
    }))) return;
    this.archiving = true;
    this.http.post(`${environment.apiUrl}/rapports/${this.rapport.id}/archiver`, {}).subscribe({
      next: () => {
        this.archiving = false;
        this.toast.success('Rapport archivé. Saisie ouverte pour la semaine suivante.');
        this.charger();
      },
      error: (err) => {
        this.archiving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'archivage.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Sauvegarde : chaque utilisateur n'envoie que les champs de son droit
  async onSave(): Promise<void> {
    const vide = (v: any) => v === null || v === undefined || v === '';
    const interieurs = this.depotsInterieurs.flatMap(d => this.lignesVisibles(d).map(l => ({ ...l, depot_id: d.depot_id, interieur: true })));
    const exterieurs = this.depotsExterieurs.flatMap(d => d.lignes.map((l: any) => ({ ...l, depot_id: d.depot_id, interieur: false })));
    // Uniquement le perimetre de la page : une saisie interieure n'ecrase pas une saisie exterieure faite en parallele
    const lignes = (this.interieur ? interieurs : exterieurs).map(l => ({
      depot_id: l.depot_id,
      produit_id: l.produit_id,
      ...(this.droits.stocks ? {
        stock_bacs: vide(l.stock_bacs) ? 0 : Number(l.stock_bacs),
        stock_embranchement: l.interieur && !vide(l.stock_embranchement) ? Number(l.stock_embranchement) : 0,
      } : {}),
      ...(this.droits.actions ? { action: l.action || '' } : {}),
    }));
    if (this.interieur && this.droits.stocks && interieurs.some(l => this.num(l.stock_bacs) < 0 || this.num(l.stock_embranchement) < 0)) {
      this.toast.error('Un stock de dépôt intérieur ne peut pas être négatif.');
      return;
    }
    if (!lignes.length) { this.toast.error('Aucune ligne à enregistrer.'); return; }

    if (!(await this.dialog.confirmerEnregistrement(`la saisie des stocks ${this.interieur ? 'intérieurs' : 'extérieurs'} du jour`))) return;
    this.saving = true;
    this.http.post(`${environment.apiUrl}/stocks/saisie`, { rapport_id: this.rapport.id, lignes }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toast.success(res?.message || 'Saisie enregistrée avec succès.');
        this.charger();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }
}
