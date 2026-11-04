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
import { paginer } from './paginer';

// PDF A4 paysage (277 mm x 190 mm utiles) a partir d'un modele cache de la page.
// Meme procede que le rapport : copie du modele, feuille de style propre et sauts de page entre deux lignes.
export async function genererPdfPaysage(modele: HTMLElement, css: string, fichier: string): Promise<void> {
  const support = document.createElement('div');
  support.style.cssText = 'position:absolute;left:-10000px;top:0';
  const doc = document.createElement('div');
  doc.className = 'pdf-doc';
  support.appendChild(doc);
  const style = document.createElement('style');
  style.textContent = css;
  doc.appendChild(style);
  const copie = modele.cloneNode(true) as HTMLElement;
  copie.removeAttribute('id');
  copie.classList.remove('hidden');
  doc.appendChild(copie);
  document.body.appendChild(support);
  // Tailwind met les images en display:block, ce qui decale le texte dans html2canvas
  const correctif = document.createElement('style');
  correctif.textContent = 'img { display: inline-block !important; }';
  document.head.appendChild(correctif);

  try {
    paginer(doc, doc.getBoundingClientRect().width * 190 / 277);
    const html2pdf = (await import('html2pdf.js')).default;
    const opt: any = {
      margin:      [10, 10, 10, 10],
      filename:    fichier,
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:   { mode: [] },
    };
    await html2pdf().set(opt).from(doc).save();
  } finally {
    support.remove();
    correctif.remove();
  }
}
