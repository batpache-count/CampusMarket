import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { FavoriteService } from '../services/favorite.service';
import { ToastController, AlertController } from '@ionic/angular';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
  standalone: false,
})
export class ProductDetailPage implements OnInit {
  apiUrl = environment.apiUrl;
  product: any = null;
  reviews: any[] = [];
  loading = true;
  isFavorite = false;
  tempRating = 0;
  commentText = '';

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private favoriteService: FavoriteService,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(Number(id));
    } else {
      this.router.navigate(['/home']);
    }
  }

  userRating: number = 0;

  loadProduct(id: number) {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (data) => {
        this.product = data;
        this.userRating = data.userRating || 0;
        this.isFavorite = !!data.isFavorite; // Capturar desde el backend
        this.loadReviews(id);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.router.navigate(['/home']);
      }
    });
  }

  loadReviews(id: number) {
    this.productService.getProductReviews(id).subscribe({
      next: (data) => this.reviews = data
    });
  }

  checkIfFavorite(id: number) {
    this.favoriteService.getFavorites().subscribe({
      next: (favs: any[]) => {
        this.isFavorite = favs.some(f => f.ID_Producto === id);
      }
    });
  }

  toggleFavorite() {
    if (!this.product) return;

    // Feedback inmediato
    const previousState = this.isFavorite;
    this.isFavorite = !this.isFavorite;

    this.favoriteService.toggleFavorite(this.product.ID_Producto).subscribe({
      next: (res: any) => {
        this.isFavorite = !!res.isFavorite;
        this.presentToast(res.message);
      },
      error: (err) => {
        console.error('Error in toggleFavorite:', err);
        this.isFavorite = previousState; // Revertir si falla
        this.presentToast('Error al conectar con el servidor', 'danger');
      }
    });
  }

  rateProduct(stars: number) {
    this.tempRating = stars;
  }

  submitReview() {
    if (!this.tempRating) {
      this.presentToast('Por favor selecciona una puntuación', 'warning');
      return;
    }

    const productId = this.product?.ID_Producto;
    if (!productId) return;

    this.productService.rateProduct(productId, this.tempRating, this.commentText).subscribe({
      next: (res: any) => {
        this.presentToast('¡Gracias por tu calificación!');
        this.commentText = '';
        this.tempRating = 0;
        this.loadProduct(productId);
      },
      error: (err) => {
        console.error('Error in submitReview:', err);
        this.presentToast('Error al enviar: Inicia sesión de nuevo', 'danger');
      }
    });
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({ message, duration: 2000, color: color as any });
    toast.present();
  }

  async addToCart() {
    if (!this.product) return;

    if (this.product.Stock <= 0) {
      const toast = await this.toastController.create({
        message: 'No hay más stock disponible',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.cartService.addToCart(this.product);
    this.product.Stock--; // Decrement local stock

    const toast = await this.toastController.create({
      message: 'Producto agregado al carrito',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    getImageUrl(product: any): string {
      if (!product) return 'assets/placeholder.svg';
      const imageName = product.Imagen_URL || product.imagen_url || product.image;
      if (!imageName) return 'assets/placeholder.svg';
      if (imageName.startsWith('http')) return imageName;
      return `${this.apiUrl}/uploads/${imageName}`;
    }
  }

