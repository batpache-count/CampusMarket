import { Component, OnInit } from '@angular/core';
import { FavoriteService } from '../services/favorite.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: false
})
export class FavoritesPage implements OnInit {
  favorites: any[] = [];
  loading = true;
  apiUrl = environment.apiUrl;

  constructor(
    private favoriteService: FavoriteService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
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

  goToDetail(id: number) {
    this.router.navigate(['/product-detail', id]);
  }
}
