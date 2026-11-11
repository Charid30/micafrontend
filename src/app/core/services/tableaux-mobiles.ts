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

/**
 * Tableaux en cartes sur telephone.
 *
 * Chaque cellule recoit l'intitule de sa colonne (data-label) et le tableau la classe
 * « table-cartes » : sous 768 px, la feuille de style affiche alors chaque ligne comme une
 * carte (1re cellule en titre, puis « intitule : valeur »). Au-dela, rien ne change.
 *
 * Restent en defilement horizontal (1re colonne figee) :
 *  - les tableaux a en-tete sur plusieurs lignes ou avec des cellules fusionnees ;
 *  - les tableaux de plus de MAX_COLONNES colonnes ;
 *  - les tableaux de consultation (sans champ) de plus de MAX_COLONNES_LECTURE colonnes
 *    (grands tableaux du rapport et de l'Annexe) ;
 *  - les tableaux marques data-defilement.
 *
 * Un seul observateur sur la zone de contenu suit les tableaux ajoutes ou modifies
 * (changement de page, lignes chargees, colonnes affichees selon les droits).
 */
const MAX_COLONNES = 12;
const MAX_COLONNES_LECTURE = 7;

function intitules(table: HTMLTableElement): string[] | null {
  if (table.hasAttribute('data-defilement')) return null;
  const lignesEntete = table.tHead ? Array.from(table.tHead.rows) : [];
  if (lignesEntete.length !== 1) return null;
  const cellules = Array.from(lignesEntete[0].cells);
  if (!cellules.length || cellules.length > MAX_COLONNES) return null;
  // Tableau de consultation large (rapport, Annexe) : se lit mieux en defilant, comme le PDF.
  // Un tableau de saisie (champs) reste en cartes : une ligne = un formulaire.
  if (cellules.length > MAX_COLONNES_LECTURE && !table.querySelector('tbody input, tbody select, tbody textarea')) return null;
  if (cellules.some((c) => c.colSpan > 1 || c.rowSpan > 1)) return null;
  return cellules.map((c) => (c.textContent || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim());
}

function preparer(table: HTMLTableElement): void {
  const noms = intitules(table);
  if (!noms) {
    table.classList.remove('table-cartes');
    return;
  }
  table.classList.add('table-cartes');
  for (const corps of [...Array.from(table.tBodies), ...(table.tFoot ? [table.tFoot] : [])]) {
    for (const ligne of Array.from(corps.rows)) {
      const seule = ligne.cells.length === 1 && ligne.cells[0].colSpan > 1;
      ligne.classList.toggle('carte-ligne-seule', seule);
      let col = 0;
      for (const cellule of Array.from(ligne.cells)) {
        const nom = seule || col === 0 ? '' : noms[col] || '';
        if (cellule.getAttribute('data-label') !== nom) {
          if (nom) cellule.setAttribute('data-label', nom);
          else cellule.removeAttribute('data-label');
        }
        col += cellule.colSpan || 1;
      }
    }
  }
}

/** Surveille la zone de contenu ; renvoie la fonction d'arret. */
export function suivreTableauxMobiles(racine: HTMLElement): () => void {
  let attente = 0;
  const traiter = () => {
    attente = 0;
    const tables = Array.from(racine.querySelectorAll('table')) as HTMLTableElement[];
    tables.forEach(preparer);
    // Tableaux restes en defilement : indication « Faites glisser » quand ils depassent l'ecran
    // (lecture des tailles apres le classement, pour ne mesurer que la mise en page finale)
    const telephone = window.innerWidth < 768;
    for (const t of tables) {
      const boite = t.parentElement;
      if (!boite || !boite.classList.contains('overflow-x-auto')) continue;
      const deborde = telephone && !t.classList.contains('table-cartes') && boite.scrollWidth > boite.clientWidth + 2;
      if (boite.hasAttribute('data-glisser') !== deborde) boite.toggleAttribute('data-glisser', deborde);
    }
  };
  const planifier = () => {
    if (!attente) attente = requestAnimationFrame(traiter);
  };
  // childList seulement : la frappe dans un champ ne declenche rien
  const observateur = new MutationObserver(planifier);
  observateur.observe(racine, { childList: true, subtree: true });
  window.addEventListener('resize', planifier);
  planifier();
  return () => {
    observateur.disconnect();
    window.removeEventListener('resize', planifier);
    if (attente) cancelAnimationFrame(attente);
  };
}
