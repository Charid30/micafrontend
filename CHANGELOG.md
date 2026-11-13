# Journal des versions – Indicateur SONABHY (plateforme web)

Numérotation `MAJEUR.MINEUR.CORRECTIF` :
- **majeur** : changement important ou incompatible ;
- **mineur** : nouvelles fonctionnalités ;
- **correctif** : corrections de bugs.

Chaque version est marquée dans git par une étiquette (`v2.0.0`…). La plateforme web et le backend
partagent le même numéro majeur.mineur ; le correctif avance séparément quand un seul des deux change. La version s'affiche en bas du menu
(« Indicateur SONABHY v2.0.0 ») et dans le panneau Menu sur téléphone.

Changer de version : `npm version correctif|mineur|majeur` (ou `npm version 2.1.0`). Le numéro est
recopié automatiquement dans `src/app/version.ts`. Puis `git push --follow-tags`.

## [2.1.0] – 13/11/2026

### Tableau de bord
- Comparaison avec la semaine précédente : puces d'évolution (flèche et écart, vert si favorable,
  rouge sinon) sur les autonomies moyennes, les camions chargés, les dettes et créances de l'État ;
  colonne « Évolution » et écart d'autonomie par produit dans le tableau des stocks.

### Suivi des saisies (nouveau menu)
- Qui a saisi quoi et quand : grille des 7 derniers jours (14 jours, 1 mois) par dépôt et par menu,
  heure et auteur de chaque saisie, retards du jour, taux de complétude, saisies de la semaine et
  dernières saisies. Visible avec le droit Tableau de bord.

### Historique
- Bouton « Exporter en Excel » : historique des saisies d'une période (7 jours, 30 jours, 3 mois,
  1 an ou dates libres).

## [2.0.1] – 13/11/2026

### Administration
- Sauvegardes : l'état des sauvegardes s'affiche en message flottant en haut à droite, fermable par une
  croix ; il réapparaît seulement si son contenu change (nouvelle sauvegarde, alerte).

## [2.0.0] – 12/11/2026

Première version numérotée. Elle regroupe tout ce qui a été construit depuis le 02/10/2026.

### Téléphone
- Version web mobile : barre de navigation flottante, panneaux Saisie, Menu et Alertes, tableaux en cartes.
- Écrans Accueil, Stocks, Rapports et Alertes adaptés au téléphone.
- Installable sur l'écran d'accueil (« Indicateur SONABHY »).

### Saisie et rapports
- Stocks intérieurs et extérieurs, chevrons pour consulter les jours précédents (lecture seule) ;
  message flottant « Revenir à aujourd'hui » (Stocks, RDC, Centrale SONABEL).
- Tous les menus de saisie, RDC (4 pays), Centrale SONABEL, fréquences de saisie paramétrables.
- Rapport au format REPORTING, sélecteur de semaine, PDF générés par le serveur, export Excel.
- Tableau de bord, historique, situation avec l'État.

### Comptes et sécurité
- Menus selon les droits, intérims, profil, double authentification, notifications push obligatoires.
- Politique de sécurité du contenu, déconnexion après inactivité.
- Écrans d'administration : agents et comptes, journal d'audit, détection d'intrusion, sauvegardes, paramètres.
