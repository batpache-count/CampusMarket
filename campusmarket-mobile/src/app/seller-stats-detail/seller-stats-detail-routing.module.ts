import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SellerStatsDetailPage } from './seller-stats-detail.page';

const routes: Routes = [
  {
    path: '',
    component: SellerStatsDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerStatsDetailPageRoutingModule {}
