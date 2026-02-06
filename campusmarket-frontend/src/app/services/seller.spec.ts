import { TestBed } from '@angular/core/testing';
// CORRECCIÓN: Importamos el nombre correcto 'SellerService'
import { SellerService } from './seller';

describe('SellerService', () => {
  let service: SellerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SellerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});