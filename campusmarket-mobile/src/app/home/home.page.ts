import { Component, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  apiUrl = environment.apiUrl;
  products: any[] = [];
  filteredProducts: any[] = [];
  cartCount = 0;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router,
    private toastController: ToastController
  ) { }

  categories: any[] = [];
  selectedCategory: string = '';

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.cartService.cartCount$.subscribe(count => {
      this.cartCount = count;
    });
  }

  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        console.log('Categories loaded:', this.categories);
      },
      error: (err) => console.error('Error loading categories', err)
    });
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        // Sort: Stock > 0 first, then Stock <= 0
        this.products = data.sort((a, b) => {
          if (a.Stock > 0 && b.Stock <= 0) return -1;
          if (a.Stock <= 0 && b.Stock > 0) return 1;
          return 0;
        });
        this.filterProducts();
      },
      error: (err) => {
        console.error('Error loading products', err);
      }
    });
  }

  searchQuery: string = '';

  onSearchChange(event: any) {
    this.searchQuery = (event.detail.value || '').toLowerCase();
    this.filterProducts();
  }

  selectCategory(categoryName: string) {
    if (this.selectedCategory === categoryName) {
      this.selectedCategory = ''; // Deselect if already selected
    } else {
      this.selectedCategory = categoryName;
    }
    this.filterProducts();
  }

  filterProducts() {
    const query = this.searchQuery;
    this.filteredProducts = this.products.filter(p => {
      const matchesSearch = p.Nombre.toLowerCase().includes(query) ||
        (p.Categoria_Nombre && p.Categoria_Nombre.toLowerCase().includes(query));

      const matchesCategory = this.selectedCategory ? p.Categoria_Nombre === this.selectedCategory : true;

      return matchesSearch && matchesCategory;
    });
  }

  async addToCart(product: any) {
    this.cartService.addToCart(product);
    const toast = await this.toastController.create({
      message: 'Producto agregado al carrito',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  getImageUrl(product: any): string {
    const imageName = product.Imagen_URL || product.imagen_url || product.image;
    if (!imageName) return 'assets/placeholder.svg';
    if (imageName.startsWith('http')) return imageName;
    return `${this.apiUrl}/uploads/${imageName}`;
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }
}

