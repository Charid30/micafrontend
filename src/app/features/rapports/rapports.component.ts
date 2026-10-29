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
import { DialogService } from '../../core/services/dialog.service';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/rapports`;

// ── PDF du rapport : feuille de style propre au document (couleurs MICA en dur)
const PDF_CSS = `
.pdf-doc { width: 190mm; background: #fff; color: #111; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.3; }
.pdf-doc * { font-family: 'Times New Roman', Times, serif !important; letter-spacing: normal !important; box-shadow: none !important; }
.pdf-doc p, .pdf-doc li, .pdf-doc dt, .pdf-doc dd, .pdf-doc span, .pdf-doc strong, .pdf-doc div { font-size: 12pt !important; }
.pdf-doc p, .pdf-doc ul.list-disc li { text-align: justify !important; }
.pdf-doc ul.list-disc { list-style: disc !important; padding-left: 16pt !important; margin: 0 0 6pt !important; }
.pdf-doc ul.list-disc li { margin-bottom: 2pt !important; }
.pdf-doc .card { background: #fff !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; margin: 0 0 12pt !important; }
.pdf-doc .print-header { text-align: center; padding: 0 0 6pt !important; margin-bottom: 14pt !important; border-bottom: 2px solid #163832 !important; }
.pdf-doc .print-header p { text-align: center !important; color: #333 !important; margin-top: 3pt !important; }
.pdf-doc h1 { font-size: 16pt !important; font-weight: bold !important; text-transform: uppercase; color: #0B2B26 !important; margin: 0 !important; }
.pdf-doc h2 { font-size: 14pt !important; font-weight: bold !important; text-transform: uppercase; color: #0B2B26 !important; border-bottom: 1px solid #8EB69B !important; padding-bottom: 2pt !important; margin: 4pt 0 8pt !important; }
.pdf-doc .section-title { font-size: 13pt !important; font-weight: bold !important; color: #0B2B26 !important; margin: 0 0 6pt !important; }
.pdf-doc h4 { font-size: 12pt !important; font-weight: bold !important; color: #235347 !important; margin: 8pt 0 4pt !important; }
.pdf-doc .text-gray-400 { color: #6b7280 !important; }
.pdf-doc .text-red-700, .pdf-doc .text-red-600 { color: #b91c1c !important; }
.pdf-doc .text-yellow-700 { color: #a16207 !important; }
.pdf-doc .line-through { text-decoration: line-through !important; }
.pdf-doc .grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8pt !important; margin-bottom: 6pt; }
.pdf-doc .grid > div { border: 1px solid #8EB69B !important; border-radius: 0 !important; display: flex; flex-direction: column; }
.pdf-doc .grid li { display: flex !important; justify-content: space-between !important; gap: 6pt; padding: 2pt 6pt !important; border-top: 1px solid #DAF1DE !important; }
.pdf-doc .bg-primary-800 { background: #051F20 !important; color: #fff !important; text-align: center; font-weight: bold !important; padding: 3pt 6pt !important; }
.pdf-doc .bg-primary-50, .pdf-doc tr.bg-primary-50 td { background: #DAF1DE !important; }
.pdf-doc .overflow-x-auto { overflow: visible !important; border: 0 !important; border-radius: 0 !important; }
.pdf-doc table { width: 100% !important; min-width: 0 !important; border-collapse: collapse !important; margin: 0 0 4pt !important; }
.pdf-doc table th, .pdf-doc table td { border: 1px solid #8EB69B !important; padding: 2pt 4pt !important; min-width: 0 !important; position: static !important; white-space: normal !important; vertical-align: middle !important; font-size: 12pt !important; }
.pdf-doc table th { background: #051F20 !important; color: #fff !important; font-weight: bold !important; text-transform: none !important; text-align: center !important; border-radius: 0 !important; }
.pdf-doc table td span, .pdf-doc table td strong { font-size: inherit !important; }
.pdf-doc table.pdf-large th, .pdf-doc table.pdf-large td { font-size: 10pt !important; }
.pdf-doc table td.pdf-vide { border: 0 !important; padding: 0 !important; background: #fff !important; }
.pdf-doc dl { border: 1px solid #8EB69B !important; border-radius: 0 !important; }
.pdf-doc dl > div { display: flex !important; justify-content: space-between !important; padding: 3pt 6pt !important; border-top: 1px solid #DAF1DE !important; }
.pdf-doc .auto-rouge, .pdf-doc .auto-jaune, .pdf-doc .auto-vert, .pdf-doc .auto-aucune { display: inline-block !important; min-width: 0 !important; padding: 0 3pt !important; border-radius: 2pt !important; font-weight: bold !important; font-size: inherit !important; }
.pdf-doc p .auto-rouge, .pdf-doc p .auto-jaune, .pdf-doc p .auto-vert { font-size: 12pt !important; }
.pdf-doc .auto-rouge { background: #fee2e2 !important; color: #b91c1c !important; }
.pdf-doc .auto-jaune { background: #fef9c3 !important; color: #854d0e !important; }
.pdf-doc .auto-vert { background: #DAF1DE !important; color: #0B2B26 !important; }
.pdf-doc .auto-aucune { color: #9ca3af !important; font-weight: normal !important; }
.pdf-doc .tendance-favorable { color: #15803d !important; }
.pdf-doc .tendance-defavorable { color: #b91c1c !important; }
.pdf-doc .tendance-stable { color: #6b7280 !important; }
`;

// Éléments à ne jamais couper entre deux pages (une ligne de tableau, un paragraphe, un bloc de stocks...)
const PDF_INSECABLES = 'h1, h2, h3, h4, p, li, tr, dl > div, .grid';

// Pousse sur la page suivante tout élément insécable qui chevauche un saut de page.
// Un titre n'est jamais laissé seul en bas de page ; dans un tableau, l'en-tête est répété.
function paginer(racine: HTMLElement, hauteurPage: number): void {
  const elements = Array.from(racine.querySelectorAll<HTMLElement>(PDF_INSECABLES))
    .filter(e => !e.parentElement?.closest(PDF_INSECABLES));
  for (const e of elements) {
    const origine = racine.getBoundingClientRect().top;
    const r = e.getBoundingClientRect();
    const haut = r.top - origine;
    const bas = r.bottom - origine + (/^H[1-4]$/.test(e.tagName) ? 60 : 0);
    if (bas - haut >= hauteurPage) continue;
    const page = Math.floor(haut / hauteurPage);
    if (Math.floor((bas - 1) / hauteurPage) === page) continue;
    const reste = Math.ceil((page + 1) * hauteurPage - haut) + 1;

    if (e.tagName === 'TR' && e.parentElement?.tagName !== 'THEAD') {
      const vide = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'pdf-vide';
      td.colSpan = 50;
      td.style.height = `${reste}px`;
      vide.appendChild(td);
      e.before(vide);
      const entete = e.closest('table')?.tHead?.rows[0];
      if (entete) e.before(entete.cloneNode(true));
    } else {
      // Ligne d'en-tête en bas de page : tout le tableau passe à la page suivante
      const cible = e.tagName === 'TR' ? (e.closest('.overflow-x-auto') as HTMLElement || e.closest('table')!) : e;
      const hautCible = cible.getBoundingClientRect().top - origine;
      const vide = document.createElement('div');
      vide.style.height = `${Math.max(0, Math.ceil((page + 1) * hauteurPage - hautCible) + 1)}px`;
      cible.before(vide);
    }
  }
}

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  standalone: false,
})
export class RapportsComponent implements OnInit {
  private readonly dialog = inject(DialogService);
  rapports: any[] = [];
  selected: any = null;
  apercu: any = null;

  loadingListe = true;
  loadingApercu = false;
  exportEnCours = false;
  suppressionEnCours = false;

  get canExport(): boolean {
    return this.authService.hasPermission('rapports', 'READ');
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${API}/liste`).subscribe({
      next: (list) => {
        this.rapports = list;
        this.loadingListe = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingListe = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectionner(rapport: any): void {
    if (this.selected?.id === rapport.id) return;
    this.selected = rapport;
    this.apercu = null;
    this.loadingApercu = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${API}/${rapport.id}/apercu`).subscribe({
      next: (data) => {
        this.apercu = data;
        this.loadingApercu = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingApercu = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Sections du rapport (numerotation selon les sections presentes)
  get aAutonomie(): boolean {
    return !!this.apercu?.autonomie && (this.apercu.autonomie.synthese_interieure.length > 0 || this.apercu.autonomie.depots_exterieurs.length > 0);
  }
  get aTresorerie(): boolean {
    return !!this.apercu?.tresorerie?.lignes?.some((l: any) => l.montant_n !== null || l.montant_n1 !== null);
  }
  // Annexes (detail de l'autonomie, tresorerie, ventes par marketeur) : numerotees selon leur presence
  annexe(section: 'autonomie' | 'tresorerie' | 'ventes'): number {
    const presentes = [
      ...(this.aAutonomie ? ['autonomie'] : []),
      ...(this.aTresorerie ? ['tresorerie'] : []),
      ...(this.apercu?.marketeurs?.length ? ['ventes'] : []),
    ];
    return presentes.indexOf(section) + 1;
  }

  // ── Rapport au format du document REPORTING
  get rep(): any { return this.apercu?.reporting; }
  get blocsStocks(): any[] {
    return this.rep ? [
      { titre: 'Stocks dans les dépôts intérieurs', lignes: this.rep.stocks.interieurs },
      { titre: 'Stocks dans les dépôts extérieurs', lignes: this.rep.stocks.exterieurs },
    ] : [];
  }
  get aEncours(): boolean { return !!this.rep?.encours?.produits?.length; }
  get lignesDettes(): any[] {
    const d = this.rep?.dettes || {};
    return [
      { libelle: "Dettes de l'État envers SONABHY", valeur: d.dettes_etat ?? null },
      { libelle: "Créances de l'État sur SONABHY (plus-values, fiscalité)", valeur: d.creances_etat ?? null },
      { libelle: 'Engagement fournisseurs SONABHY', valeur: d.engagement_fournisseurs ?? null },
    ];
  }
  aObservations(lignes: any[]): boolean { return lignes.some(l => l.evolution_jours !== null); }
  // « 05 jours », « -02 jours » : format du document
  jours(n: number): string {
    const v = `${n < 0 ? '-' : ''}${String(Math.abs(n)).padStart(2, '0')}`;
    return `${v} jour${Math.abs(n) > 1 ? 's' : ''}`;
  }
  evolution(n: number): string {
    return n === 0 ? 'stable' : `en ${n > 0 ? 'hausse' : 'baisse'} de ${this.jours(Math.abs(n))}`;
  }
  abs(n: number): number { return Math.abs(n); }

  get objectifAutonomie(): number {
    return this.apercu?.autonomie?.depots_interieurs?.[0]?.lignes?.[0]?.objectif_jours ?? 15;
  }

  // ── Autonomie
  lignesPertinentes(depot: any): any[] {
    return depot.lignes.filter((l: any) => l.volume_total !== 0 || l.conso_moyenne > 0 || l.impompable > 0);
  }
  classeAutonomie(couleur: string | null): string {
    return couleur ? `auto-${couleur}` : 'auto-aucune';
  }
  couleurTexte(couleur: string | null): string {
    return couleur === 'rouge' ? 'text-red-700' : couleur === 'jaune' ? 'text-yellow-700' : 'text-primary-700';
  }
  get actions(): any[] {
    const a = this.apercu?.autonomie;
    if (!a) return [];
    return [...a.depots_interieurs, ...a.depots_exterieurs].flatMap((d: any) => d.lignes
      .filter((l: any) => l.action)
      .map((l: any) => ({ site: d.pays || d.depot_libelle, produit: l.produit_libelle, autonomie: l.autonomie, couleur: l.couleur, action: l.action })));
  }

  // ── Tresorerie : dettes affichees en negatif, comme dans le classeur de reference
  montantSigne(l: any, v: number | null): string {
    if (v === null || v === undefined) return '—';
    const n = l.sens === 'DETTE' && l.type !== 'TOTAL' ? -v : v;
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  }
  classeTendance(l: any): string {
    if (l.favorable === null || l.favorable === undefined) return 'tendance-stable';
    return l.favorable ? 'tendance-favorable' : 'tendance-defavorable';
  }

  // ── Suppression (administrateur) : brouillon ou publié
  async supprimer(): Promise<void> {
    const r = this.selected;
    if (!r) return;
    const etat = r.statut === 'PUBLIE'
      ? 'Ce rapport est PUBLIÉ : il ne sera plus consultable ni exportable.'
      : "Ce rapport est en brouillon : s'il s'agit de la semaine en cours, un nouveau rapport vide sera créé à la prochaine saisie.";
    if (!(await this.dialog.confirmer({
      titre: `Supprimer le rapport de la semaine ${r.semaine_iso} / ${r.annee} ?`,
      message: `Période du ${r.date_debut.split('-').reverse().join('/')} au ${r.date_fin.split('-').reverse().join('/')}.\n${etat}`,
      confirmer: 'Supprimer', danger: true,
    }))) return;
    this.suppressionEnCours = true;
    this.http.delete<any>(`${API}/${r.id}`).subscribe({
      next: (res) => {
        this.suppressionEnCours = false;
        this.rapports = this.rapports.filter(x => x.id !== r.id);
        this.selected = null;
        this.apercu = null;
        this.toast.success(res?.message || 'Rapport supprimé.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.suppressionEnCours = false;
        this.toast.error(err.error?.message || 'Erreur lors de la suppression.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Export Excel (onglets Autonomie et Treso, format Indicateurs.xlsx)
  exporterExcel(): void {
    if (!this.selected) return;
    this.exportEnCours = true;
    this.http.get(`${API}/${this.selected.id}/export-excel`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (res) => {
        const nom = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
          || `MICA_Indicateurs_S${this.apercu?.rapport?.semaine_iso}_${this.apercu?.rapport?.annee}.xlsx`;
        const url = URL.createObjectURL(res.body as Blob);
        const a = document.createElement('a');
        a.href = url; a.download = nom; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.exportEnCours = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.exportEnCours = false;
        this.toast.error("Erreur lors de l'export Excel.");
        this.cdr.detectChanges();
      },
    });
  }

  // ── Accès matrice ventes ────────────────────────────────────

  getVente(marketeurId: number, produitCode: string): number {
    return this.apercu?.ventesMatrix?.[marketeurId]?.[produitCode] || 0;
  }

  getTotalMarketeur(marketeurId: number): number {
    if (!this.apercu) return 0;
    return (this.apercu.produits || []).reduce(
      (s: number, p: string) => s + this.getVente(marketeurId, p),
      0
    );
  }

  // ── Téléchargement PDF ──────────────────────────────────────

  // Le PDF est construit à partir d'une copie de la zone imprimable, avec sa propre feuille de style
  // (Times New Roman 12, texte justifié, couleurs en dur) : il ne dépend ni de la largeur de l'écran
  // ni du chargement des styles de l'application. Les sauts de page sont placés à la main entre deux
  // lignes (jamais au milieu d'une ligne de tableau) et l'en-tête du tableau est répété.
  async telecharger(): Promise<void> {
    const el = document.getElementById('rapport-print-zone');
    if (!el) return;

    const sem = this.apercu?.rapport?.semaine_iso;
    const an  = this.apercu?.rapport?.annee;
    const nom = `rapport_semaine_${sem}_${an}.pdf`;

    // Le support hors écran sert seulement à la mise en page ; html2pdf copie le document lui-même
    const support = document.createElement('div');
    support.style.cssText = 'position:absolute;left:-10000px;top:0';
    const doc = document.createElement('div');
    doc.className = 'pdf-doc';
    support.appendChild(doc);
    const style = document.createElement('style');
    style.textContent = PDF_CSS;
    doc.appendChild(style);
    const copie = el.cloneNode(true) as HTMLElement;
    copie.removeAttribute('id');
    doc.appendChild(copie);
    // Tableaux larges (beaucoup de colonnes) : police réduite pour que toutes les colonnes tiennent
    doc.querySelectorAll('table').forEach(t => {
      if ((t.tHead?.rows[0]?.cells.length || 0) > 7) t.classList.add('pdf-large');
    });
    document.body.appendChild(support);
    // Tailwind met les images en display:block, ce qui fausse la mesure de la ligne de base des
    // polices par html2canvas (faite dans la page) : le texte des cellules serait décalé vers le bas
    const correctif = document.createElement('style');
    correctif.textContent = 'img { display: inline-block !important; }';
    document.head.appendChild(correctif);

    try {
      // Hauteur utile d'une page A4 (277 mm) à la largeur utile (190 mm)
      paginer(doc, doc.getBoundingClientRect().width * 277 / 190);
      const html2pdf = (await import('html2pdf.js')).default;
      const opt: any = {
        margin:      [10, 10, 10, 10],
        filename:    nom,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: [] },
      };
      await html2pdf().set(opt).from(doc).save();
    } finally {
      support.remove();
      correctif.remove();
    }
  }

  // ── Impression ─────────────────────────────────────────────

  imprimer(): void {
    const existing = document.getElementById('_rapport-print-style');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = '_rapport-print-style';
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 12mm; }
        body * { visibility: hidden !important; }
        #rapport-print-zone,
        #rapport-print-zone * { visibility: visible !important; }
        #rapport-print-zone {
          position: fixed; top: 0; left: 0; width: 100%;
          font-size: 10px;
          color: #000 !important;
        }
        #rapport-print-zone .card {
          page-break-inside: avoid;
          border: 1px solid #ccc !important;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 10px;
        }
        #rapport-print-zone table { width: 100%; border-collapse: collapse; }
        #rapport-print-zone th {
          background: #1a4a3f !important;
          color: #fff !important;
          padding: 4px 6px;
          font-size: 9px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #rapport-print-zone td { padding: 3px 6px; border-bottom: 1px solid #e5e7eb; }
        #rapport-print-zone .section-title { font-size: 11px; font-weight: bold; margin-bottom: 6px; }
        #rapport-print-zone .print-header { padding: 8px; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 3000);
  }
}
