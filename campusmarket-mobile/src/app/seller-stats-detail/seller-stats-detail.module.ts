import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SellerStatsDetailPageRoutingModule } from './seller-stats-detail-routing.module';

import { SellerStatsDetailPage } from './seller-stats-detail.page';

import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SellerStatsDetailPageRoutingModule,
    BaseChartDirective
  ],
  declarations: [SellerStatsDetailPage]
})
export class SellerStatsDetailPageModule { }
