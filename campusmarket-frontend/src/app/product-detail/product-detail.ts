import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart';
import { UbicacionService } from '../services/ubicacion.service';
import { FavoriteService } from '../services/favorite';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetail implements OnInit {

  product: any;
  loading: boolean = true;
  currentStock: number = 0;
  locations: any[] = [];
  reviews: any[] = [];
  isFavorite: boolean = false;
  comment: string = '';

  // Calificaciones
  userRating: number = 0;
  hoverRating: number = 0;
  averageRating: number = 0;
  totalVotes: number = 0;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private favoriteService: FavoriteService,
    private ubicacionService: UbicacionService,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: number) {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (data: any) => {
        this.product = data;
        this.currentStock = data.Stock;
        this.loading = false;

        // Datos de calificación
        this.userRating = data.userRating || 0;
        this.averageRating = Number(data.Promedio_Calificacion) || 0;
        this.totalVotes = data.Total_Votos || 0;

        if (data.ID_Vendedor) {
          this.loadLocations(data.ID_Vendedor);
        }
        this.checkIfFavorite(id);
        this.loadReviews(id);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadLocations(vendorId: number) {
    this.ubicacionService.getVendorActiveUbicaciones(vendorId).subscribe({
      next: (data: any) => this.locations = data
    });
  }

  addToCart() {
    if (this.currentStock > 0) {
      this.cartService.addToCart(this.product);
      this.currentStock--; // Descontar visualmente
      alert('¡Producto agregado al carrito! 🛒');
    }
  }

  loadReviews(productId: number) {
    this.http.get(`http://localhost:3000/api/products/${productId}/reviews`).subscribe({
      next: (data: any) => this.reviews = data
    });
  }

  checkIfFavorite(productId: number) {
    const token = localStorage.getItem('token_utm');
    if (!token) return;
    this.favoriteService.getFavorites().subscribe({
      next: (favs: any[]) => {
        this.isFavorite = favs.some(f => (f.ID_Producto || f.id) == productId);
      }
    });
  }

  toggleFavorite() {
    if (!this.product) return;
    this.favoriteService.toggleFavorite(this.product.ID_Producto).subscribe({
      next: (res: any) => {
        this.isFavorite = res.isFavorite;
      },
      error: () => alert('Error al actualizar favoritos')
    });
  }

  // Métodos de calificación interactiva eliminados.
  // La calificación ahora se realiza exclusivamente desde "Mis Pedidos" (MyOrdersComponent)
  // para garantizar que solo se califiquen compras verificadas y entregadas.
}