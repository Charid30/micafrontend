import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/rapports`;

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  standalone: false,
})
export class RapportsComponent implements OnInit {
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
  numero(section: 'autonomie' | 'tresorerie' | 'ventes' | 'dettes'): number {
    const presentes = [
      'stocks',
      ...(this.aAutonomie ? ['autonomie'] : []),
      ...(this.aTresorerie ? ['tresorerie'] : []),
      ...(this.apercu?.marketeurs?.length ? ['ventes'] : []),
      ...(this.apercu?.detteEtat > 0 || this.apercu?.engagementFourn > 0 ? ['dettes'] : []),
    ];
    return presentes.indexOf(section) + 1;
  }
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
  supprimer(): void {
    const r = this.selected;
    if (!r) return;
    const etat = r.statut === 'PUBLIE'
      ? 'Ce rapport est PUBLIÉ : il ne sera plus consultable ni exportable.'
      : "Ce rapport est en brouillon : s'il s'agit de la semaine en cours, un nouveau rapport vide sera créé à la prochaine saisie.";
    if (!confirm(`Supprimer le rapport de la semaine ${r.semaine_iso}/${r.annee} (${r.date_debut} au ${r.date_fin}) ?

${etat}`)) return;
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

  async telecharger(): Promise<void> {
    const el = document.getElementById('rapport-print-zone');
    if (!el) return;

    const sem = this.apercu?.rapport?.semaine_iso;
    const an  = this.apercu?.rapport?.annee;
    const nom = `rapport_semaine_${sem}_${an}.pdf`;

    const html2pdf = (await import('html2pdf.js')).default;

    const opt: any = {
      margin:      [10, 10, 10, 10],
      filename:    nom,
      image:       { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:   { mode: ['avoid-all', 'css'] },
    };

    html2pdf().set(opt).from(el).save();
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
