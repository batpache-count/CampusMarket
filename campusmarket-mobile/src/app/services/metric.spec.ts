import { TestBed } from '@angular/core/testing';

import { Metric } from './metric';

describe('Metric', () => {
  let service: Metric;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Metric);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
