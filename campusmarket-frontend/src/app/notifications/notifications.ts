import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  notifications: any[] = [];
  loading: boolean = true;

  constructor(private notificationService: NotificationService) { }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  markAsRead(id: number) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => this.loadNotifications()
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.loadNotifications()
    });
  }

  getIcon(type: string): string {
    switch (type) {
      case 'ORDER_STATUS': return '📦';
      case 'STOCK_ALERT': return '🔥';
      default: return '🔔';
    }
  }
}
