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
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Règles de pagination appliquées par Chrome à l'impression : c'est le moteur d'impression du navigateur
// qui place les sauts de page, ligne par ligne, et répète lui-même l'en-tête des tableaux.
const PAGINATION = `
html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pdf-doc { width: auto !important; }
.pdf-doc .overflow-x-auto { overflow: visible !important; }
.pdf-doc thead { display: table-header-group; }
.pdf-doc tfoot { display: table-footer-group; }
.pdf-doc tr, .pdf-doc li, .pdf-doc dl > div, .pdf-doc .grid, .pdf-doc img { break-inside: avoid; page-break-inside: avoid; }
.pdf-doc h1, .pdf-doc h2, .pdf-doc h3, .pdf-doc h4 { break-after: avoid; page-break-after: avoid; break-inside: avoid; }
.pdf-doc p { orphans: 3; widows: 3; }
`;

// Feuilles de style de l'application (classes Tailwind du modèle), recopiées dans le document envoyé
function stylesApplication(): string {
  const regles: string[] = [];
  for (const feuille of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(feuille.cssRules)) {
        if (r instanceof CSSFontFaceRule) continue;          // polices distantes : inutiles, Times est imposé
        regles.push(r.cssText);
      }
    } catch { /* feuille d'une autre origine : ignorée */ }
  }
  return regles.join('\n');
}

// Images intégrées au document (data:) : le Chrome du serveur n'a aucun accès réseau
function integrerImages(original: HTMLElement, copie: HTMLElement): void {
  const sources = Array.from(original.querySelectorAll('img'));
  Array.from(copie.querySelectorAll('img')).forEach((img, i) => {
    const src = sources[i];
    if (!src || img.src.startsWith('data:')) return;
    try {
      const c = document.createElement('canvas');
      c.width = src.naturalWidth; c.height = src.naturalHeight;
      c.getContext('2d')!.drawImage(src, 0, 0);
      img.src = c.toDataURL('image/png');
    } catch { img.remove(); }
  });
}

/**
 * Imprime un modèle de la page en PDF (A4) côté serveur, puis lance le téléchargement.
 * @param preparer retouches de la copie avant envoi (ex. police réduite des tableaux larges)
 */
export async function imprimerPdf(
  http: HttpClient, modele: HTMLElement, css: string, fichier: string,
  options: { paysage?: boolean; preparer?: (doc: HTMLElement) => void } = {},
): Promise<void> {
  const doc = document.createElement('div');
  doc.className = 'pdf-doc';
  const copie = modele.cloneNode(true) as HTMLElement;
  copie.removeAttribute('id');
  copie.classList.remove('hidden');
  doc.appendChild(copie);
  integrerImages(modele, copie);
  options.preparer?.(doc);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${fichier}</title>`
    + `<style>${stylesApplication()}</style><style>${css}</style><style>${PAGINATION}</style>`
    + `</head><body>${doc.outerHTML}</body></html>`;

  const pdf = await firstValueFrom(http.post(`${environment.apiUrl}/pdf`, html, {
    params: { fichier, orientation: options.paysage ? 'paysage' : 'portrait' },
    headers: { 'Content-Type': 'text/html' },
    responseType: 'blob',
  }));
  const url = URL.createObjectURL(pdf);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
