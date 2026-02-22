import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrderReportPage } from './order-report.page';

const routes: Routes = [
    {
        path: '',
        component: OrderReportPage
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class OrderReportPageRoutingModule { }
