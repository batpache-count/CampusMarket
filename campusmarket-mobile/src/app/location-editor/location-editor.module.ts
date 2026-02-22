import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LocationEditorPageRoutingModule } from './location-editor-routing.module';

import { LocationEditorPage } from './location-editor.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LocationEditorPageRoutingModule
  ],
  declarations: [LocationEditorPage]
})
export class LocationEditorPageModule {}
