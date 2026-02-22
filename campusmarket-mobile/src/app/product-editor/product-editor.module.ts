import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProductEditorPageRoutingModule } from './product-editor-routing.module';

import { ProductEditorPage } from './product-editor.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProductEditorPageRoutingModule
  ],
  declarations: [ProductEditorPage]
})
export class ProductEditorPageModule {}
