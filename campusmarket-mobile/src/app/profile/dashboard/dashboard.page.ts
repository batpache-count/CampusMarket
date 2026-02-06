import { Component, OnInit } from '@angular/core';
import { MetricService } from '../../services/metric.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  metrics: any = null;
  loading = true;
  maxMonthly = 0;

  constructor(private metricService: MetricService) { }

  ngOnInit() {
    this.loadMetrics();
  }

  loadMetrics() {
    this.loading = true;
    this.metricService.getBuyerMetrics().subscribe({
      next: (data: any) => {
        this.metrics = data;
        this.calculateMax();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading metrics', err);
        this.loading = false;
      }
    });
  }

  calculateMax() {
    if (this.metrics && this.metrics.monthlySpending.length > 0) {
      this.maxMonthly = Math.max(...this.metrics.monthlySpending.map((m: any) => m.amount));
    }
  }

  getHeigtPercentage(value: number, max: number): number {
    if (max === 0) return 0;
    return (value / max) * 100;
  }
}
