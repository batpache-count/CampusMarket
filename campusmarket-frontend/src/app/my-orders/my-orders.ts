import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../services/order'; // Importamos el servicio

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-orders.html',
  styleUrls: ['./my-orders.css']
})
export class MyOrdersComponent implements OnInit {
  orders: any[] = [];
  loading: boolean = true;

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    // Ahora sí encontrará la función porque actualizamos el servicio
    this.orderService.getMyOrders().subscribe({
      next: (data: any) => { 
        this.orders = data;
        this.loading = false;
      },
      error: (err: any) => { 
        console.error('Error cargando pedidos:', err);
        this.loading = false;
      }
    });
  }
}