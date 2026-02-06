import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  darkMode = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    // Check if dark mode is already enabled
    const isDark = document.body.classList.contains('dark');
    this.darkMode = isDark;
  }

  toggleDarkMode(event: any) {
    const isChecked = event.detail.checked;
    document.body.classList.toggle('dark', isChecked);

    // Optional: Save preference
    if (isChecked) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.removeItem('theme');
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
