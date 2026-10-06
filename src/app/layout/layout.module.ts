import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from './layout.component';
import { ToastComponent } from '../shared/toast/toast.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', loadChildren: () => import('../features/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'saisie/stocks', loadChildren: () => import('../features/saisie/stocks/stocks.module').then(m => m.StocksModule) },
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
      { path: 'rapports', loadChildren: () => import('../features/rapports/rapports.module').then(m => m.RapportsModule) },
      { path: 'administration/utilisateurs', loadChildren: () => import('../features/administration/utilisateurs/utilisateurs.module').then(m => m.UtilisateursModule) },
      { path: 'administration/structures', loadChildren: () => import('../features/administration/structures/structures.module').then(m => m.StructuresModule) },
      { path: 'parametres', loadChildren: () => import('../features/parametres/parametres.module').then(m => m.ParametresModule) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [LayoutComponent, ToastComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class LayoutModule {}
