import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationEditorPage } from './location-editor.page';

describe('LocationEditorPage', () => {
  let component: LocationEditorPage;
  let fixture: ComponentFixture<LocationEditorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationEditorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
