import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoriteService } from '../services/favorite';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites implements OnInit {
  favorites: any[] = [];
  loading: boolean = true;

  constructor(private favoriteService: FavoriteService) { }

  ngOnInit() {
    this.loadFavorites();
  }

  loadFavorites() {
    this.loading = true;
    this.favoriteService.getFavorites().subscribe({
      next: (data) => {
        this.favorites = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  removeFavorite(id: number) {
    this.favoriteService.toggleFavorite(id).subscribe({
      next: () => this.loadFavorites()
    });
  }
}
