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
// Recopie la version de package.json dans src/app/version.ts (affichée dans l'application).
// Lancé automatiquement par « npm version x.y.z » (script « version » de package.json) :
// seul le numéro est publié, jamais le reste de package.json (liste des dépendances).
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');
const fichier = path.join(__dirname, '..', 'src', 'app', 'version.ts');
fs.writeFileSync(fichier,
  `// Généré par scripts/ecrire-version.js à partir de package.json : ne pas modifier à la main.\n` +
  `// Changer de version : npm version <majeur|mineur|correctif> ou npm version x.y.z\n` +
  `export const VERSION = '${version}';\n`);
console.log(`Version ${version} écrite dans src/app/version.ts`);
