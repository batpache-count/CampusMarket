import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SellerProductsPageRoutingModule } from './seller-products-routing.module';
import { SellerProductsPage } from './seller-products.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        SellerProductsPageRoutingModule
    ],
    declarations: [SellerProductsPage]
})
export class SellerProductsPageModule { }
