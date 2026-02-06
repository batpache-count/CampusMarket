import { Component, OnInit, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js/auto';
import { SellerService } from '../../services/seller';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-sales-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-stats.html',
  styleUrls: ['./sales-stats.css'],
  encapsulation: ViewEncapsulation.None
})
export class SalesStatsComponent implements OnInit, AfterViewInit {

  orders: any[] = [];
  salesChart!: Chart;
  topProductsChart!: Chart;
  peakHoursChart!: Chart;

  constructor(
    private sellerService: SellerService,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.sellerService.getMySales().subscribe(orders => {
      this.orders = orders.filter(o => o.Estado_Pedido !== 'Cancelado');
      this.createCharts();
    });
  }

  ngAfterViewInit() {
    // Charts are created here to ensure canvas elements are available
  }

  onTimeRangeChange(event: Event) {
    const range = (event.target as HTMLSelectElement).value;
    this.createCharts();
  }

  getChartTextColor(): string {
    return this.themeService.getTheme() === 'dark' ? '#f3f4f6' : '#374151';
  }

  getChartGridColor(): string {
    return this.themeService.getTheme() === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  }

  createCharts() {
    this.createSalesChart();
    this.createTopProductsChart();
    this.createPeakHoursChart();
  }

  createSalesChart() {
    const salesData = this.getSalesData('day');
    const textColor = this.getChartTextColor();
    const gridColor = this.getChartGridColor();

    if (this.salesChart) {
      this.salesChart.destroy();
    }
    this.salesChart = new Chart('salesChart', {
      type: 'line',
      data: {
        labels: salesData.labels,
        datasets: [{
          label: 'Ventas',
          data: salesData.data,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: textColor } },
          title: { display: true, text: 'Ventas por Periodo', color: textColor }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  createTopProductsChart() {
    const topProductsData = this.getTopProductsData();
    const textColor = this.getChartTextColor();
    const gridColor = this.getChartGridColor();

    if (this.topProductsChart) {
      this.topProductsChart.destroy();
    }
    this.topProductsChart = new Chart('topProductsChart', {
      type: 'bar',
      data: {
        labels: topProductsData.labels,
        datasets: [{
          label: 'Productos más vendidos',
          data: topProductsData.data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: textColor } },
          title: { display: true, text: 'Top Productos', color: textColor }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  createPeakHoursChart() {
    const peakHoursData = this.getPeakHoursData();
    const textColor = this.getChartTextColor();
    const gridColor = this.getChartGridColor();

    if (this.peakHoursChart) {
      this.peakHoursChart.destroy();
    }
    this.peakHoursChart = new Chart('peakHoursChart', {
      type: 'polarArea',
      data: {
        labels: peakHoursData.labels,
        datasets: [{
          label: 'Horas pico de ventas',
          data: peakHoursData.data,
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: textColor } },
          title: { display: true, text: 'Horas Pico', color: textColor }
        },
        scales: {
          r: {
            ticks: { color: textColor, backdropColor: 'transparent' },
            grid: { color: gridColor },
            pointLabels: { color: textColor }
          }
        }
      }
    });
  }

  getSalesData(range: string): { labels: string[], data: number[] } {
    const labels = this.orders.map(o => new Date(o.Fecha_Creacion).toLocaleDateString());
    const data = this.orders.map(o => o.Precio_Total);
    return { labels, data };
  }

  getTopProductsData(): { labels: string[], data: number[] } {
    const productCounts = new Map<string, number>();
    for (const order of this.orders) {
      for (const item of order.items) {
        const count = productCounts.get(item.Nombre_Producto) || 0;
        productCounts.set(item.Nombre_Producto, count + item.Cantidad);
      }
    }
    const sortedProducts = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sortedProducts.map(p => p[0]);
    const data = sortedProducts.map(p => p[1]);
    return { labels, data };
  }

  getPeakHoursData(): { labels: string[], data: number[] } {
    const hourCounts = new Map<number, number>();
    for (const order of this.orders) {
      const hour = new Date(order.Fecha_Creacion).getHours();
      const count = hourCounts.get(hour) || 0;
      hourCounts.set(hour, count + 1);
    }
    const sortedHours = [...hourCounts.entries()].sort((a, b) => a[0] - b[0]);
    const labels = sortedHours.map(h => `${h[0]}:00`);
    const data = sortedHours.map(h => h[1]);
    return { labels, data };
  }
}