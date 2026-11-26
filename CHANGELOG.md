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

## [2.5.0] – 26/11/2026

### Veille marché : semaine N-1 reprise automatiquement
- La colonne « Semaine N-1 » est remplie avec les prix de la semaine N du rapport précédent et grisée
  pour les utilisateurs ; les administrateurs peuvent la corriger.
- Sans prix la semaine précédente, la case N-1 reste à saisir.

## [2.4.4] – 24/11/2026

### Historique & Tendances : graphiques restylés
- Vue « Stocks jour par jour » : un graphique par produit, chacun à sa propre échelle (le Super 91 à
  50 000 m³ n'écrase plus les produits à quelques centaines de m³), dernière valeur saisie en titre,
  légende commune ; chaque dépôt garde la même couleur dans tous les graphiques.
- Vues hebdomadaires : même découpage automatique quand les séries ont des ordres de grandeur trop
  différents (écart de plus de 8 fois) ; sinon un seul graphique dont l'axe part de zéro.
- Palette de 8 couleurs vérifiée (daltonisme, séparation, luminosité), attribuée dans un ordre fixe ;
  traits de 2 px, points cernés de blanc, grille discrète, graduations rondes, lissage sans faux pic,
  réticule et infobulle au survol. Jours sans saisie toujours reliés en pointillés.

## [2.4.3] – 23/11/2026

### Affichage sur écran de 15 pouces (1280 à 1535 px de large)
- Taille de base de la plateforme réduite à 14 px (au lieu de 16) : textes, marges, champs, menu latéral et
  tableaux deviennent plus denses, comme un zoom à 87,5 %. Les tableaux de saisie des stocks ne débordent
  plus (dépôts intérieurs : plus de défilement horizontal) et les 5 indicateurs du tableau de bord restent
  alignés sans devenir carrés. Cellules de tableau un peu moins espacées. Rien ne change au-delà de 1535 px
  ni sur téléphone.
- Menu latéral en rem (il suit la taille de base).
- Suivi des saisies : « Saisies de la semaine » et « Dernières saisies » côte à côte sous les grilles
  (à partir de 1024 px) ; dans la colonne de droite au-delà de 1535 px, comme avant.

## [2.4.2] – 23/11/2026

### Correction – Stocks des dépôts extérieurs
- Chaque dépôt extérieur s'enregistre séparément (bouton « Enregistrer » propre à chaque pays, au lieu
  d'un bouton unique pour les quatre dépôts). Le Suivi des saisies montre ainsi l'heure réelle de saisie de
  chaque dépôt : auparavant, un seul clic enregistrait Bénin, Côte d'Ivoire, Ghana et Togo à la même minute.
- Mention « Non enregistré » sur un dépôt modifié et pas encore enregistré ; les saisies en cours sur les
  autres dépôts sont conservées quand on enregistre un dépôt.

 – 17/11/2026

### Affichage
- La police **Inter** est désormais fournie par la plateforme elle-même (`public/fonts/inter`,
  licence SIL OFL) au lieu de Google Fonts : en production, la politique de sécurité (CSP) bloquait
  son téléchargement et l'application s'affichait avec la police du système. Plus aucun appel à
  Google Fonts ; la CSP reste inchangée (les adresses Google ont été retirées du `.htaccess`).

## [2.4.0] – 17/11/2026

### Mon profil
- Section **« Sessions actives »** : appareils connectés au compte (navigateur ou application mobile,
  adresse, dernière activité), bouton « Fermer » par appareil et « Déconnecter les autres appareils ».

### Administration
- Nouvelle page **« État du système »** : points à traiter, dernière sauvegarde, revue des dépendances
  (avec lancement à la demande), espace disque, base de données, application et serveur, comptes et
  sécurité, et liste des sessions actives de tous les comptes avec fermeture à distance.

## [2.3.0] – 16/11/2026

### Suivi des saisies
- Bouton **« Relancer »** (avec le nombre de saisies du jour non faites) : les agents concernés reçoivent
  une notification de mise à jour listant leurs saisies à effectuer ; confirmation avant l'envoi, compte
  rendu des agents relancés et des saisies sans agent responsable.

## [2.2.1] – 16/11/2026

### Corrections
- Fenêtre des messages ciblés : en-tête « Notification de mise à jour » ; nom de l'expéditeur et mention
  de l'accusé de lecture retirés de la fenêtre (l'accusé reste visible des administrateurs).

## [2.2.0] – 16/11/2026

### Messages ciblés
- Nouvel écran **Administration → Messages** : rédaction, choix d'un ou plusieurs destinataires
  (recherche, filtre par direction, « Tout sélectionner »), suivi des envois avec l'accusé de lecture de
  chaque destinataire (« Lu le … à … » ou « Pas encore lu »), mis à jour en direct ; retrait d'un message.
- Icône « Envoyer un message » sur chaque compte dans Agents et comptes (destinataire présélectionné).
- Fenêtre du message à la connexion, ou aussitôt si l'utilisateur est connecté : elle reste affichée
  jusqu'au clic sur **« Marquer comme lu »** ; plusieurs messages s'affichent l'un après l'autre.
  Sur téléphone, la fenêtre monte du bas de l'écran.

## [2.1.1] – 16/11/2026

### Droits
- « Suivi des saisies » apparaît dans la fenêtre des permissions ; le menu n'est visible qu'avec ce droit
  (il dépendait auparavant du droit Tableau de bord). Un compte qui n'a que ce droit arrive directement
  sur le suivi des saisies.

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
