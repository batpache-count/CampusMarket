import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {
  notifications: any[] = [];
  loading = true;
  unreadCount = 0;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadNotifications();
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (data: any[]) => {
        this.notifications = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  doRefresh(event: any) {
    this.notificationService.getNotifications().subscribe({
      next: (data: any[]) => {
        this.notifications = data;
        event.target.complete();
      },
      error: () => event.target.complete()
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.loadNotifications();
    });
  }

  goToDetail(note: any) {
    if (!note.Leido) {
      this.notificationService.markAsRead(note.ID_Notificacion).subscribe();
    }

    if (note.Tipo === 'STOCK_ALERT' && note.ID_Referencia) {
      // Llevar a detalles del producto para que el vendedor decida si añadir más stock
      this.router.navigate(['/product-detail', note.ID_Referencia]);
    } else if (note.Tipo === 'NUEVA_VENTA' || note.Tipo === 'RECIBO_CONFIRMADO') {
      // Notificaciones para el vendedor
      this.router.navigate(['/orders/order-detail', note.ID_Referencia], { queryParams: { role: 'seller' } });
    } else if (note.ID_Referencia) {
      // Notificaciones estándar (comprador)
      this.router.navigate(['/orders/order-detail', note.ID_Referencia]);
    }
  }
}
