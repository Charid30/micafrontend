/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from './layout.component';
import { ToastComponent } from '../shared/toast/toast.component';
import { DialogComponent } from '../shared/dialog/dialog.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', loadChildren: () => import('../features/dashboard/dashboard.module').then(m => m.DashboardModule) },
      // Stocks : une page par perimetre (meme composant, meme calcul) ; l'ancienne adresse ouvre l'interieur
      { path: 'saisie/stocks', redirectTo: 'saisie/stocks/interieurs', pathMatch: 'full' },
      { path: 'saisie/stocks/interieurs', data: { perimetre: 'INTERIEUR' }, loadChildren: () => import('../features/saisie/stocks/stocks.module').then(m => m.StocksModule) },
      { path: 'saisie/stocks/exterieurs', data: { perimetre: 'EXTERIEUR' }, loadChildren: () => import('../features/saisie/stocks/stocks.module').then(m => m.StocksModule) },
      { path: 'saisie/referentiel-stocks', loadChildren: () => import('../features/saisie/referentiel-stocks/referentiel-stocks.module').then(m => m.ReferentielStocksModule) },
      { path: 'saisie/corridors', loadChildren: () => import('../features/saisie/corridors/corridors.module').then(m => m.CorridorsModule) },
      { path: 'saisie/depots-int', loadChildren: () => import('../features/saisie/encours/encours.module').then(m => m.EncoursModule) },
      { path: 'saisie/temps-attente', loadChildren: () => import('../features/saisie/camions/camions.module').then(m => m.CamionsModule) },
      { path: 'saisie/veille-marche', loadChildren: () => import('../features/saisie/veille-marche/veille-marche.module').then(m => m.VeilleMarcheModule) },
      { path: 'saisie/veille-geo', loadChildren: () => import('../features/saisie/veille-geo/veille-geo.module').then(m => m.VeilleGeoModule) },
      { path: 'saisie/achats-traders', loadChildren: () => import('../features/saisie/achats-traders/achats-traders.module').then(m => m.AchatsTradersModule) },
      { path: 'saisie/ventes', loadChildren: () => import('../features/saisie/ventes/ventes.module').then(m => m.VentesModule) },
      { path: 'saisie/tresorerie', loadChildren: () => import('../features/saisie/finances/finances.module').then(m => m.FinancesModule) },
      { path: 'saisie/recommandations', loadChildren: () => import('../features/saisie/recommandations/recommandations.module').then(m => m.RecommandationsModule) },
      { path: 'saisie/caf-moyen', loadChildren: () => import('../features/saisie/caf-moyen/caf-moyen.module').then(m => m.CafMoyenModule) },
      { path: 'historique', loadChildren: () => import('../features/historique/historique.module').then(m => m.HistoriqueModule) },
      { path: 'rapports', loadChildren: () => import('../features/rapports/rapports.module').then(m => m.RapportsModule) },
      { path: 'administration/utilisateurs', loadChildren: () => import('../features/administration/utilisateurs/utilisateurs.module').then(m => m.UtilisateursModule) },
      { path: 'administration/structures', loadChildren: () => import('../features/administration/structures/structures.module').then(m => m.StructuresModule) },
      { path: 'profil', loadChildren: () => import('../features/profil/profil.module').then(m => m.ProfilModule) },
      { path: 'parametres', loadChildren: () => import('../features/parametres/parametres.module').then(m => m.ParametresModule) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [LayoutComponent, ToastComponent, DialogComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class LayoutModule {}
