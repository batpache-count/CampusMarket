import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';
  private currentTheme: string;

  constructor() {
    this.currentTheme = localStorage.getItem(this.themeKey) || 'light';
    this.setTheme(this.currentTheme);
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    localStorage.setItem(this.themeKey, theme);
    document.body.className = theme;
  }

  toggleTheme() {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  getTheme(): string {
    return this.currentTheme;
  }
}
