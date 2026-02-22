import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductEditorPage } from './product-editor.page';

const routes: Routes = [
  {
    path: '',
    component: ProductEditorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductEditorPageRoutingModule {}
