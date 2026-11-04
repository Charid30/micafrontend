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
// Marge de sécurité (px) de part et d'autre d'un saut de page : aucune bordure n'est tranchée
const MARGE = 4;

const estTitre = (e: HTMLElement) => /^H[1-4]$/.test(e.tagName);
const estEntete = (e: HTMLElement) => e.tagName === 'TR' && e.parentElement?.tagName === 'THEAD';
const estLigne = (e: HTMLElement) => e.tagName === 'TR' && e.parentElement?.tagName !== 'THEAD';

/**
 * Génère le PDF et l'enregistre. Les sauts de page sont placés sur la copie que html2pdf dessine
 * réellement (et non sur l'original), avec la hauteur de page exacte qu'il utilise pour découper
 * l'image : ce qui est calculé est ce qui est imprimé.
 */
export async function enregistrerPdf(doc: HTMLElement, opt: any): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const travail: any = html2pdf().set({ ...opt, pagebreak: { mode: [] } }).from(doc);
  await travail.toContainer();
  const conteneur: HTMLElement = travail.prop.container;
  // Images décodées avant la mesure : leur hauteur doit être connue
  await Promise.all(Array.from(conteneur.querySelectorAll('img')).map(i => i.decode().catch(() => undefined)));
  const echelle = opt.html2canvas?.scale || window.devicePixelRatio || 1;
  const { width, height } = travail.prop.pageSize.inner;
  // Même calcul que html2pdf : largeur du canevas arrondie, puis hauteur de page arrondie
  const largeur = Math.floor(conteneur.getBoundingClientRect().width * echelle);
  paginer(conteneur, Math.floor(largeur * height / width) / echelle);
  await travail.save();
}

/**
 * Pousse sur la page suivante tout élément insécable qui chevauche un saut de page.
 * - un titre (et sa légende) reste avec ce qui le suit : jamais seul en bas de page ;
 * - l'en-tête d'un tableau reste avec sa première ligne, sinon tout le tableau passe à la page suivante ;
 * - un tableau coupé entre deux lignes répète son en-tête, et le libellé de groupe (ex. le site) de la ligne.
 */
export function paginer(racine: HTMLElement, hauteurPage: number): void {
  const elements = Array.from(racine.querySelectorAll<HTMLElement>(PDF_INSECABLES))
    .filter(e => !e.parentElement?.closest(PDF_INSECABLES));
  const origine = () => racine.getBoundingClientRect().top;
  figerColonnes(racine);

  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];
    if (!e.isConnected) continue;
    // Fin du groupe à garder ensemble : titre(s) + élément suivant ; en-tête de tableau + deux premières lignes
    let fin = i;
    while (fin + 1 < elements.length && estTitre(elements[fin])) fin++;
    if (estEntete(elements[fin])) {
      const table = elements[fin].closest('table');
      let lignes = 0;
      while (lignes < 2 && fin + 1 < elements.length && elements[fin + 1].closest('table') === table) {
        if (estLigne(elements[fin + 1])) lignes++;
        fin++;
      }
    }
    const o = origine();
    const haut = e.getBoundingClientRect().top - o;
    let bas = elements[fin].getBoundingClientRect().bottom - o;
    if (bas - haut >= hauteurPage / 3) bas = e.getBoundingClientRect().bottom - o;   // groupe trop haut : l'élément seul
    if (bas - haut >= hauteurPage - 2 * MARGE) continue;          // plus haut qu'une page : coupé de toute façon
    const page = Math.floor((haut - MARGE) / hauteurPage);
    if (Math.floor((bas + MARGE) / hauteurPage) === page) continue;
    const saut = (page + 1) * hauteurPage + MARGE;                // haut de la page suivante, marge comprise

    if (estLigne(e)) {
      // Coupure entre deux lignes : ligne vide jusqu'au saut, puis l'en-tête répété
      const table = e.closest('table');
      const entete = table?.tHead?.rows[0];
      // Ligne vide sur le nombre exact de colonnes : un colSpan plus grand créerait des colonnes fantômes,
      // le navigateur recalculerait les largeurs et tout le tableau changerait de hauteur après la mesure
      const colonnes = Array.from((entete || (e as HTMLTableRowElement)).cells).reduce((s, c) => s + c.colSpan, 0);
      const vide = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'pdf-vide';
      td.colSpan = Math.max(1, colonnes);
      td.style.height = `${Math.max(0, Math.ceil(saut - haut))}px`;
      vide.appendChild(td);
      e.before(vide);
      if (entete) e.before(entete.cloneNode(true));
      rappelerGroupe(e);
      continue;
    }

    // Titre ou en-tête de tableau : le bloc entier passe à la page suivante, avec les titres qui le précèdent
    let cible: HTMLElement = estEntete(e) ? (e.closest('.overflow-x-auto') as HTMLElement || e.closest('table')!) : e;
    let j = i;
    while (j > 0) {
      // Titre précédent, ou légende (paragraphe sous un titre) : jamais la légende sans son titre
      const pas = estTitre(elements[j - 1]) ? 1 : (elements[j - 1].tagName === 'P' && j > 1 && estTitre(elements[j - 2]) ? 2 : 0);
      if (!pas) break;
      const tete = elements[j - pas];
      const hautTete = tete.getBoundingClientRect().top - o;
      if (Math.floor((hautTete - MARGE) / hauteurPage) !== page || bas - hautTete >= hauteurPage / 2) break;
      cible = tete; j -= pas;
    }
    const hautCible = cible.getBoundingClientRect().top - o;
    const vide = document.createElement('div');
    vide.style.height = `${Math.max(0, Math.ceil(saut - hautCible))}px`;
    cible.before(vide);
  }
}

// Largeurs de colonnes figées telles que mesurées : les lignes ajoutées ensuite (vide, en-tête répété,
// libellé rappelé) ne peuvent plus redistribuer les colonnes ni changer la hauteur des lignes déjà placées
function figerColonnes(racine: HTMLElement): void {
  const tables = Array.from(racine.querySelectorAll('table')).map(t => {
    const ligne = t.tHead?.rows[0] || t.rows[0];
    return { t, cellules: ligne ? Array.from(ligne.cells) : [], largeur: t.getBoundingClientRect().width };
  }).filter(x => x.cellules.length && x.cellules.every(c => c.rowSpan === 1));
  const mesures = tables.map(x => x.cellules.map(c => c.getBoundingClientRect().width));
  tables.forEach((x, k) => {
    x.t.style.tableLayout = 'fixed';
    x.t.style.width = `${x.largeur}px`;
    x.cellules.forEach((c, n) => { c.style.width = `${mesures[k][n]}px`; });
  });
}

// Ligne reprise en haut de page dont la première cellule est vide (ex. site regroupant plusieurs produits) :
// le libellé du groupe est rappelé pour que la page se lise seule
function rappelerGroupe(ligne: HTMLElement): void {
  const premiere = (ligne as HTMLTableRowElement).cells?.[0];
  if (!premiere || premiere.textContent?.trim() || premiere.colSpan > 1) return;
  let prec = ligne.previousElementSibling as HTMLTableRowElement | null;
  while (prec) {
    const c = prec.cells?.[0];
    if (prec.parentElement?.tagName !== 'THEAD' && !c?.classList.contains('pdf-vide') && c?.tagName === 'TD'
      && prec.cells.length === (ligne as HTMLTableRowElement).cells.length) {
      const libelle = c.textContent?.trim();
      if (libelle) { premiere.textContent = `${libelle} (suite)`; premiere.className = c.className; return; }
    }
    prec = prec.previousElementSibling as HTMLTableRowElement | null;
  }
}
