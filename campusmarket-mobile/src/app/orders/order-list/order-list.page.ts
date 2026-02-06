import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../services/order.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-list-component',
  templateUrl: './order-list.page.html',
  styleUrls: ['./order-list.page.scss'],
  standalone: false,
})
export class OrderListComponent implements OnInit {
  orders: any[] = [];
  loading = true;

  constructor(
    private orderService: OrderService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadOrders();
    // Add event listener for screen events if needed to refresh
  }

  ionViewWillEnter() {
    this.loadOrders();
  }

  loadOrders(event?: any) {
    this.loading = true;
    this.orderService.getMyOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.loading = false;
        if (event) event.target.complete();
      }
    });
  }

  viewDetail(orderId: number) {
    this.router.navigate(['/orders/order-detail', orderId]);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pendiente': return 'warning';
      case 'En preparacion': return 'tertiary';
      case 'Entregado': return 'success';
      case 'Cancelado': return 'medium'; // Changed to medium to be less alarming than danger
      default: return 'medium';
    }
  }
}
