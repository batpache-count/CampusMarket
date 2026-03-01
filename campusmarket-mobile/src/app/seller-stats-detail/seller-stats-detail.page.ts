import { Chart, registerables, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Component, OnInit } from '@angular/core';
import { SellerService } from '../services/seller.service';

Chart.register(...registerables);

@Component({
  selector: 'app-seller-stats-detail',
  templateUrl: './seller-stats-detail.page.html',
  styleUrls: ['./seller-stats-detail.page.scss'],
  standalone: false,
})
export class SellerStatsDetailPage implements OnInit {
  period = 'week';
  stats: any = null;
  loading = false;
  dayMap: { [key: string]: string } = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };

  // Chart: Sales Trend
  public lineChartData: ChartData<'line'> = {
    datasets: [],
    labels: []
  };
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ffffff' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#ffffff' }
      }
    }
  };

  // Chart: Categories
  public pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#ffffff' }
      }
    }
  };

  constructor(private sellerService: SellerService) { }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading = true;
    this.sellerService.getAdvancedStats(this.period).subscribe({
      next: (data) => {
        if (data && data.bestDay && data.bestDay.Dia) {
          const englishDay = data.bestDay.Dia.trim();
          data.bestDay.Dia = this.dayMap[englishDay] || englishDay;
        }
        this.stats = data;
        this.prepareCharts();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  prepareCharts() {
    if (!this.stats) return;

    // Line Chart
    const trend = this.stats.salesTrend || [];
    this.lineChartData = {
      labels: trend.map((t: any) => t.Fecha),
      datasets: [
        {
          data: trend.map((t: any) => Number(t.Total_Venta)),
          label: 'Ventas ($)',
          backgroundColor: 'rgba(56, 128, 255, 0.2)',
          borderColor: '#3880ff',
          pointBackgroundColor: '#3880ff',
          fill: 'origin',
          tension: 0.4
        }
      ]
    };

    // Pie Chart
    const categories = this.stats.salesByCategory || [];
    this.pieChartData = {
      labels: categories.map((c: any) => c.Categoria),
      datasets: [
        {
          data: categories.map((c: any) => Number(c.Total_Vendido)),
          backgroundColor: ['#3880ff', '#3dc2ff', '#5260ff', '#2dd36f', '#ffc409', '#eb445a']
        }
      ]
    };
  }

  segmentChanged(ev: any) {
    this.period = ev.detail.value;
    this.loadStats();
  }
}
