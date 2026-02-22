import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductEditorPage } from './product-editor.page';

describe('ProductEditorPage', () => {
  let component: ProductEditorPage;
  let fixture: ComponentFixture<ProductEditorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductEditorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
