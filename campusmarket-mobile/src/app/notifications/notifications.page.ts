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

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  doRefresh(event: any) {
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
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
      this.router.navigate(['/product-detail', note.ID_Referencia]);
    } else if (note.ID_Referencia) {
      this.router.navigate(['/orders/order-detail', note.ID_Referencia]);
    }
  }
}
