import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: false,
})
export class OrderDetailPage implements OnInit {
  orderId: number | null = null;
  orderDetails: any[] = [];
  loading = true;
  apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.orderId) {
      this.loadDetails();
    }
  }

  loadDetails() {
    this.loading = true;
    if (this.orderId) {
      this.orderService.getOrderDetails(this.orderId).subscribe({
        next: (data) => {
          this.orderDetails = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading order details:', err);
          this.loading = false;
        }
      });
    }
  }
}
