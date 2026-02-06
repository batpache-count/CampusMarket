import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OrderListPageRoutingModule } from './order-list-routing.module';

import { OrderListComponent } from './order-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OrderListPageRoutingModule
  ],
  declarations: [OrderListComponent]
})
export class OrderListPageModule { }
