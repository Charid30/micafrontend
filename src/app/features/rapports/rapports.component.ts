import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
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

  get canExport(): boolean {
    return this.authService.hasPermission('rapports', 'READ');
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
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
