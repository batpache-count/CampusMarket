import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SellerStatsDetailPage } from './seller-stats-detail.page';

describe('SellerStatsDetailPage', () => {
  let component: SellerStatsDetailPage;
  let fixture: ComponentFixture<SellerStatsDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SellerStatsDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
