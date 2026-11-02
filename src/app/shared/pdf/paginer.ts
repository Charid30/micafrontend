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
// Éléments à ne jamais couper entre deux pages (une ligne de tableau, un paragraphe, un bloc de stocks...)
const PDF_INSECABLES = 'h1, h2, h3, h4, p, li, tr, dl > div, .grid';

// Pousse sur la page suivante tout élément insécable qui chevauche un saut de page.
// Un titre n'est jamais laissé seul en bas de page ; dans un tableau, l'en-tête est répété.
export function paginer(racine: HTMLElement, hauteurPage: number): void {
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
