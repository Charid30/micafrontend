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
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { ecouterTempsReel } from '../../core/services/temps-reel.service';
import { genererPdfPaysage } from '../../shared/pdf/pdf-paysage';

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
.pdf-doc tr.pdf-total td { font-weight: bold !important; background: #DAF1DE !important; }
`;

const FORM_CAMION = {
  id: null as number | null, depot_id: null as number | null, produit: '', bon: '', commande: '', tracteur: '', remorque: '',
  destination: '', autre: '', temperature: null as number | null, densite: null as number | null,
  volume_ambiant: null as number | null, vcf_depot: null as number | null, quantite_20: null as number | null,
  quantite_kg: null as number | null,
};
const FORM_RECEPTION = {
  id: null as number | null, date_reception: '', fournisseur: '', depot_id: null as number | null, produit: '',
  quantite: null as number | null, unite: 'TM', statut: 'LIVRE',
};
const AUTRE = '__autre__';

// Menu RDC : etat quotidien des depots cotiers, chargements camion par camion, receptions
@Component({
  selector: 'app-rdc',
  templateUrl: './rdc.component.html',
  standalone: false,
})
export class RdcComponent implements OnInit {
  // Rafraichissement automatique quand un autre utilisateur enregistre
  private readonly direct = ecouterTempsReel(['rdc'], () => this.charger(this.date));

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly detruit = inject(DestroyRef);
  readonly authService = inject(AuthService);

  readonly AUTRE = AUTRE;
  readonly onglets = [
    { cle: 'etat', libelle: 'État du jour' }, { cle: 'chargements', libelle: 'Chargements' }, { cle: 'receptions', libelle: 'Réceptions' },
    ...(this.authService.isAdmin() ? [{ cle: 'destinations', libelle: 'Destinations' }] : []),
  ];
  readonly statuts: Record<string, string> = { PREVU: 'Prévu', EN_COURS: 'En cours', LIVRE: 'Livré' };
  readonly unites: Record<string, string> = { TM: 'TM', M3: 'm³' };
  private readonly fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
  private readonly fmtTonnes = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  pays = '';
  loading = true;
  saving = false;
  generation = false;
  error: string | null = null;
  onglet = 'etat';
  modifie = false;

  date = '';
  aujourdhui = '';
  veille = '';
  saisieFaite = false;
  depots: any[] = [];
  produits: any[] = [];
  colonnes: any[] = [];
  destinations: any[] = [];
  charges: Record<string, number> = {};
  tonnes: Record<string, number> = {};
  sansTonnage = 0;
  besoins: any[] = [];
  receptionsRecentes: any[] = [];
  stocks: Record<string, number | null> = {};
  attentes: Record<string, number | null> = {};

  chargements: any[] = [];
  duJour: any[] = [];
  duMois: any[] = [];
  receptions: any[] = [];

  camion = { ...FORM_CAMION };
  modaleCamion = false;
  readonly etapes = ['Chargement', 'Camion', 'Quantités'];
  etape = 1;
  erreurEtape: string | null = null;
  reception = { ...FORM_RECEPTION };
  nouvelleDestination = { libelle: '', colonne: 'A_CLASSER' };

  get nomPays(): string { return this.pays === 'benin' ? 'Bénin' : 'Ghana'; }
  get droit(): string { return `rdc-${this.pays}`; }
  get canWrite(): boolean { return this.authService.hasPermission(this.droit, 'WRITE'); }
  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get enPreparation(): boolean { return !this.loading && !this.error && !this.depots.length; }
  get dateFr(): string { return this.fr(this.date); }
  get veilleFr(): string { return this.fr(this.veille); }

  private get api(): string { return `${environment.apiUrl}/rdc/${this.pays}`; }

  ngOnInit(): void {
    // Meme composant pour les deux pays : Angular le reutilise d'un sous-menu a l'autre
    this.route.paramMap.pipe(takeUntilDestroyed(this.detruit)).subscribe((p) => {
      this.pays = p.get('pays') || '';
      this.onglet = 'etat';
      this.modaleCamion = false;
      this.reinitialiserCamion();
      this.reinitialiserReception();
      this.charger();
    });
  }

  private fr(date: string): string { return String(date || '').split('-').reverse().join('/'); }

  charger(date?: string): void {
    this.loading = !this.direct.silencieux;
    this.error = null;
    const q = date ? `?date=${date}` : '';
    forkJoin({
      etat: this.http.get<any>(`${this.api}${q}`),
      chargements: this.http.get<any>(`${this.api}/chargements${q}`),
      receptions: this.http.get<any>(`${this.api}/receptions`),
    }).subscribe({
      next: ({ etat, chargements, receptions }) => {
        this.appliquer(etat);
        this.chargements = chargements.lignes;
        this.duJour = chargements.du_jour;
        this.duMois = chargements.du_mois;
        this.receptions = receptions.lignes;
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

  private appliquer(e: any): void {
    this.date = e.date;
    this.aujourdhui = e.aujourdhui;
    this.veille = e.veille;
    this.saisieFaite = e.saisie_faite;
    this.depots = e.depots;
    this.produits = e.produits;
    this.colonnes = e.colonnes;
    this.destinations = e.destinations;
    this.charges = e.charges;
    this.tonnes = e.tonnes;
    this.sansTonnage = e.sans_tonnage;
    this.besoins = e.besoins;
    this.receptionsRecentes = e.receptions;
    this.stocks = {};
    this.attentes = {};
    e.stocks.forEach((s: any) => { this.stocks[this.cle(s.depot_id, s.produit)] = s.volume; });
    e.attentes.forEach((a: any) => { this.attentes[this.cle(a.depot_id, a.produit)] = a.camions; });
    this.modifie = false;
    if (!this.reception.date_reception) this.reception.date_reception = e.date;
  }

  cle(depotId: number, produit: string): string { return `${depotId}_${produit}`; }

  // ── Date
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

  // ── Totaux : toujours calcules
  private num(v: any): number { return v === null || v === undefined || v === '' ? 0 : Number(v); }
  nombre(v: number | null | undefined): string { return v === null || v === undefined ? '' : this.fmt.format(v); }
  tonnage(v: number | null | undefined): string { return v === null || v === undefined ? '' : this.fmtTonnes.format(v); }

  totalStock(produit: string): number { return this.depots.reduce((s, d) => s + this.num(this.stocks[this.cle(d.id, produit)]), 0); }
  charge(depotId: number, produit: string): number { return this.charges[this.cle(depotId, produit)] || 0; }
  totalChargesDepot(depotId: number): number { return this.produits.reduce((s, p) => s + this.charge(depotId, p.code), 0); }
  totalAttenteDepot(depotId: number): number { return this.produits.reduce((s, p) => s + this.num(this.attentes[this.cle(depotId, p.code)]), 0); }
  totalCharges(produit: string): number { return this.depots.reduce((s, d) => s + this.charge(d.id, produit), 0); }
  totalAttente(produit: string): number { return this.depots.reduce((s, d) => s + this.num(this.attentes[this.cle(d.id, produit)]), 0); }
  get grandTotalCharges(): number { return this.produits.reduce((s, p) => s + this.totalCharges(p.code), 0); }
  get grandTotalAttente(): number { return this.produits.reduce((s, p) => s + this.totalAttente(p.code), 0); }

  tonne(produit: string, colonne: string): number { return this.tonnes[`${produit}_${colonne}`] || 0; }
  totalTonnesProduit(produit: string): number { return this.colonnes.reduce((s, c) => s + this.tonne(produit, c.code), 0); }
  totalTonnesColonne(colonne: string): number { return this.produits.reduce((s, p) => s + this.tonne(p.code, colonne), 0); }
  get grandTotalTonnes(): number { return this.produits.reduce((s, p) => s + this.totalTonnesProduit(p.code), 0); }

  libelleDepot(id: number): string { return this.depots.find(d => d.id === id)?.libelle || ''; }
  libelleProduit(code: string): string { return this.produits.find(p => p.code === code)?.libelle || code; }

  // Lignes dépôt / produit : camions et tonnes du jour et du mois
  get cumuls(): any[] {
    return this.duMois.map((m) => {
      const j = this.duJour.find(x => x.depot_id === m.depot_id && x.produit === m.produit);
      return { ...m, camions_jour: j?.camions || 0, tonnes_jour: j?.tonnes_air || 0 };
    });
  }

  // ── Etat du jour
  private lignes(valeurs: Record<string, number | null>, champ: string): any[] {
    return this.depots.flatMap(d => this.produits.map(p => ({ depot_id: d.id, produit: p.code, [champ]: valeurs[this.cle(d.id, p.code)] ?? null })));
  }

  async enregistrer(): Promise<void> {
    if (!(await this.dialog.confirmerEnregistrement(`l'état du ${this.dateFr}`))) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.http.post<any>(`${this.api}/etat`, {
      date: this.date, stocks: this.lignes(this.stocks, 'volume'), attentes: this.lignes(this.attentes, 'camions'), besoins: this.besoins,
    }).subscribe({
      next: (r) => {
        this.appliquer(r);
        this.saving = false;
        this.toast.success(r.message);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Chargements : formulaire selon le depot et le produit
  get modeCamion(): string {
    if (this.depots.find(d => d.id === Number(this.camion.depot_id))?.mode_saisie === 'QUANTITES') return 'QUANTITES';
    return this.camion.produit === 'BUTANE' ? 'GPL' : 'CALCUL';
  }

  private reinitialiserCamion(): void { this.camion = { ...FORM_CAMION }; }

  private estDansLaListe(destination: string): boolean { return this.destinations.some(d => d.libelle === destination); }

  private ecrire(requete: any, message: string | null, suite: () => void, echec?: (message: string) => void): void {
    this.saving = true;
    this.cdr.detectChanges();
    requete.subscribe({
      next: (r: any) => {
        this.saving = false;
        this.toast.success(message || r.message);
        suite();
        this.charger(this.date);
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
        echec?.(err.error?.message || '');
        this.cdr.detectChanges();
      },
    });
  }

  private focusEtape(): void {
    setTimeout(() => document.querySelector<HTMLElement>('#rdc-etape input, #rdc-etape select')?.focus());
  }

  allerEtape(etape: number): void {
    this.etape = etape;
    this.erreurEtape = null;
    this.cdr.detectChanges();
    this.focusEtape();
  }

  // Champs obligatoires de chaque etape ; le serveur reste seul juge des valeurs
  private champsManquants(): string[] {
    const c = this.camion;
    const vide = (v: any) => v === null || v === undefined || v === '';
    const manque = (champs: [any, string][]) => champs.filter(([v]) => vide(v)).map(([, libelle]) => libelle);
    if (this.etape === 1) {
      return manque([[c.depot_id, 'dépôt'], [c.produit, 'produit'], [c.destination, 'destination'],
        [c.destination === AUTRE ? c.autre.trim() : 'ok', 'précision de la destination']]);
    }
    if (this.etape === 2) return manque([[c.bon.trim(), 'n° de bon']]);
    if (this.modeCamion === 'QUANTITES') return manque([[c.quantite_20, 'quantité à 20 °C'], [c.volume_ambiant, 'quantité observée']]);
    if (this.modeCamion === 'GPL') return manque([[c.quantite_kg, 'quantité']]);
    return manque([[c.temperature, 'température'], [c.densite, 'densité'], [c.volume_ambiant, 'volume ambiant']]);
  }

  // Suivant, ou enregistrement a la derniere etape (bouton ou touche Entree)
  validerEtape(): void {
    const manquants = this.champsManquants();
    if (manquants.length) {
      this.erreurEtape = `À renseigner : ${manquants.join(', ')}.`;
      this.cdr.detectChanges();
      return;
    }
    if (this.etape < this.etapes.length) { this.allerEtape(this.etape + 1); return; }
    this.erreurEtape = null;
    this.enregistrerCamion();
  }

  // Le formulaire garde depot, produit, destination et lot du dernier camion ajoute
  nouveauCamion(): void {
    this.camion = { ...this.camion, id: null };
    this.modaleCamion = true;
    // Depot, produit et destination deja connus (camion suivant) : on reprend au camion
    this.allerEtape(this.camion.depot_id && this.camion.produit && this.camion.destination ? 2 : 1);
  }

  fermerCamion(): void {
    if (this.camion.id) this.reinitialiserCamion();
    this.modaleCamion = false;
    this.cdr.detectChanges();
  }

  enregistrerCamion(): void {
    const { id, autre, ...c } = this.camion;
    const corps = {
      ...c, date_chargement: this.date, depot_id: Number(c.depot_id),
      destination: c.destination === AUTRE ? autre : c.destination,
    };
    const requete = id ? this.http.put<any>(`${this.api}/chargements/${id}`, corps) : this.http.post<any>(`${this.api}/chargements`, corps);
    this.ecrire(requete, null, () => {
      if (id) { this.fermerCamion(); return; }
      // Saisie par etapes : la fenetre reste ouverte, depot, produit, destination et lot restent pour le camion suivant
      this.camion = { ...this.camion, bon: '', commande: '', tracteur: '', remorque: '', temperature: null, volume_ambiant: null, quantite_20: null, quantite_kg: null };
      this.allerEtape(2);
    }, (message) => { if (/\bbon\b/i.test(message)) this.allerEtape(2); });
  }

  modifierCamion(l: any): void {
    const connue = this.estDansLaListe(l.destination);
    this.camion = {
      id: l.id, depot_id: l.depot_id, produit: l.produit, bon: l.bon || '', commande: l.commande || '', tracteur: l.tracteur || '',
      remorque: l.remorque || '', destination: connue ? l.destination : AUTRE, autre: connue ? '' : l.destination,
      temperature: l.temperature, densite: l.densite, volume_ambiant: l.volume_ambiant, vcf_depot: l.vcf_depot,
      quantite_20: l.quantite_20, quantite_kg: l.quantite_kg,
    };
    this.modaleCamion = true;
    this.allerEtape(1);
  }

  async supprimerCamion(l: any): Promise<void> {
    if (!(await this.dialog.confirmer({
      titre: 'Supprimer ce chargement ?', message: `Bon ${l.bon} (${l.depot}).`, confirmer: 'Supprimer', danger: true,
    }))) { this.cdr.detectChanges(); return; }
    this.ecrire(this.http.delete<any>(`${this.api}/chargements/${l.id}`), null, () => { if (this.camion.id === l.id) this.reinitialiserCamion(); });
  }

  // ── Receptions
  private reinitialiserReception(): void { this.reception = { ...FORM_RECEPTION, date_reception: this.date }; }

  enregistrerReception(): void {
    const { id, ...r } = this.reception;
    const corps = { ...r, depot_id: Number(r.depot_id) };
    const requete = id ? this.http.put<any>(`${this.api}/receptions/${id}`, corps) : this.http.post<any>(`${this.api}/receptions`, corps);
    this.ecrire(requete, null, () => this.reinitialiserReception());
  }

  modifierReception(r: any): void {
    this.reception = {
      id: r.id, date_reception: r.date_reception, fournisseur: r.fournisseur, depot_id: r.depot_id, produit: r.produit,
      quantite: r.quantite, unite: r.unite, statut: r.statut,
    };
    this.cdr.detectChanges();
  }

  annulerReception(): void { this.reinitialiserReception(); }

  async supprimerReception(r: any): Promise<void> {
    if (!(await this.dialog.confirmer({
      titre: 'Supprimer cette réception ?', message: `${r.fournisseur} (${r.depot}).`, confirmer: 'Supprimer', danger: true,
    }))) { this.cdr.detectChanges(); return; }
    this.ecrire(this.http.delete<any>(`${this.api}/receptions/${r.id}`), null, () => { if (this.reception.id === r.id) this.reinitialiserReception(); });
  }

  // ── Destinations (administrateurs)
  ajouterDestination(): void {
    this.ecrire(this.http.post<any>(`${this.api}/destinations`, this.nouvelleDestination), null,
      () => { this.nouvelleDestination = { libelle: '', colonne: 'A_CLASSER' }; });
  }

  changerColonne(d: any, colonne: string): void {
    this.ecrire(this.http.put<any>(`${this.api}/destinations/${d.id}`, { colonne }), null, () => {});
  }

  async telecharger(): Promise<void> {
    const el = document.getElementById('rdc-pdf');
    if (!el) return;
    this.generation = true;
    this.cdr.detectChanges();
    try {
      await genererPdfPaysage(el, PDF_CSS, `rdc_${this.pays}_${this.date}.pdf`);
    } catch {
      this.toast.error('Impossible de générer le PDF.');
    } finally {
      this.generation = false;
      this.cdr.detectChanges();
    }
  }
}
