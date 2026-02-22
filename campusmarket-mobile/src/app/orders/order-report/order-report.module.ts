import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OrderReportPageRoutingModule } from './order-report-routing.module';
import { OrderReportPage } from './order-report.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        OrderReportPageRoutingModule
    ],
    declarations: [OrderReportPage]
})
export class OrderReportPageModule { }
