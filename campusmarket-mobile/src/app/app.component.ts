import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  user: any = null;
  unreadNotifications: number = 0;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.initializeApp();
  }

  initializeApp() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.notificationService.getNotifications().subscribe();
        // Redirect if on login page or at root
        const currentUrl = this.router.url;
        if (currentUrl === '/' || currentUrl === '/login' || currentUrl.startsWith('/login?')) {
          if (user.rol === 'Vendedor') {
            this.router.navigate(['/seller-dashboard']);
          } else {
            this.router.navigate(['/home']);
          }
        }
      }
    });

    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
