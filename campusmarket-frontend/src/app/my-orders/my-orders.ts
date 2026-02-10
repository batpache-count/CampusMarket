import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../services/order'; // Importamos el servicio
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-orders.html',
  styleUrls: ['./my-orders.css']
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  orders: any[] = [];
  loading: boolean = true;
  qrCodes: { [key: number]: string } = {};
  pollingInterval: any;
  activeTab: 'active' | 'history' = 'active';

  constructor(private orderService: OrderService) { }

  ngOnInit() {
    this.loadOrders();
    // Polling cada 10 segundos
    this.pollingInterval = setInterval(() => {
      this.loadOrders(true); // true = background reload (no loading spinner)
    }, 10000);
  }

  get filteredOrders() {
    if (this.activeTab === 'active') {
      return this.orders.filter(o =>
        ['Pendiente', 'En preparacion', 'Listo'].includes(o.Estado_Pedido)
      );
    } else {
      return this.orders.filter(o =>
        ['Entregado', 'Cancelado'].includes(o.Estado_Pedido)
      );
    }
  }

  switchTab(tab: 'active' | 'history') {
    this.activeTab = tab;
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadOrders(isBackground: boolean = false) {
    if (!isBackground) this.loading = true;

    this.orderService.getMyOrders().subscribe({
      next: (data: any) => {
        this.orders = data;
        this.generateQRCodes();
        if (!isBackground) this.loading = false;
      },
      error: (err: any) => {
        console.error('Error cargando pedidos:', err);
        if (!isBackground) this.loading = false;
      }
    });
  }

  generateQRCodes() {
    this.orders.forEach(order => {
      // Generar QR solo si tiene token y está activo (no entregado ni cancelado)
      if (order.QR_Token && order.Estado_Pedido !== 'Entregado' && order.Estado_Pedido !== 'Cancelado') {
        // Solo generar si no existe ya
        if (!this.qrCodes[order.ID_Pedido]) {
          QRCode.toDataURL(order.QR_Token)
            .then(url => {
              this.qrCodes[order.ID_Pedido] = url;
            })
            .catch(err => {
              console.error('Error generando QR', err);
            });
        }
      }
    });
  }

  // --- LOGICA DE CALIFICACIÓN ---
  showRateModal: boolean = false;
  selectedOrder: any = null;
  ratingValue: number = 0;
  ratingComment: string = '';

  openRateModal(order: any) {
    this.selectedOrder = order;
    this.ratingValue = 0;
    this.ratingComment = '';
    this.showRateModal = true;
  }

  closeRateModal() {
    this.showRateModal = false;
    this.selectedOrder = null;
  }

  submitRating() {
    if (!this.selectedOrder || this.ratingValue === 0) return;

    this.orderService.rateOrder(this.selectedOrder.ID_Pedido, this.ratingValue, this.ratingComment).subscribe({
      next: (res) => {
        alert('Gracias por tu calificación ⭐');
        this.closeRateModal();
        // Recargar pedidos para actualizar estado (si hubiera flag de calificado)
        this.loadOrders(true);
      },
      error: (err) => {
        console.error(err);
        alert('Error al enviar calificación.');
      }
    });
  }
}