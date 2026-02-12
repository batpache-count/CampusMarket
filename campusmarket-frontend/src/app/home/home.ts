import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart';
import { AuthService } from '../services/auth';
import { ThemeService } from '../services/theme.service'; // Import ThemeService
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];

  categories: any[] = []; // Will be loaded from backend
  selectedCategory: string = 'Todo';

  searchTerm: string = '';

  cartCount: number = 0;
  apiUrl: string = 'http://localhost:3000';
  currentTheme: string; // Add currentTheme property

  constructor(
    private productService: ProductService,
    public cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private notificationService: NotificationService // Inject NotificationService
  ) {
    this.currentTheme = this.themeService.getTheme();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.loadNotificationCount();

    this.cartService.cartCount$.subscribe((count: number) => {
      this.cartCount = count;
    });
  }

  unreadCount: number = 0;

  loadNotificationCount() {
    if (this.authService.isLoggedIn()) {
      this.notificationService.getUnreadCount().subscribe({
        next: (count) => this.unreadCount = count,
        error: (err) => console.error('Error loading notifications', err)
      });
    }
  }

  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (cats) => {
        // Add 'Todo' at the beginning
        this.categories = [{ ID_Categoria: 0, Nombre: 'Todo' }, ...cats];
      },
      error: (err) => console.error('Error cargando categorías', err)
    });
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;

        // Check for sellerId query param
        this.route.queryParams.subscribe(params => {
          const sellerId = params['sellerId'];
          if (sellerId) {
            this.filteredProducts = this.products.filter(p => p.ID_Vendedor == sellerId);
            // Optional: Set category to 'Todo' or show a message
          } else {
            this.filteredProducts = data;
          }
          this.filterProducts(); // Ensure sorting is applied

        });
      },
      error: (err) => console.error('Error cargando productos', err)
    });
  }

  filterProducts() {
    let temp = this.products;

    if (this.selectedCategory !== 'Todo') {
      temp = temp.filter(p =>
        (p.Categoria_Nombre && p.Categoria_Nombre === this.selectedCategory) ||
        (p.category && p.category === this.selectedCategory)
      );
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(p =>
        (p.Nombre || p.name || '').toLowerCase().includes(term) ||
        (p.Descripcion || p.description || '').toLowerCase().includes(term)
      );
    }

    this.filteredProducts = temp.sort((a, b) => {
      const stockA = this.isOutOfStock(a) ? 1 : 0;
      const stockB = this.isOutOfStock(b) ? 1 : 0;
      return stockA - stockB;
    });
  }

  get sellerName(): string {
    if (this.filteredProducts.length > 0) {
      // Check if we are filtering by seller (all products have same sellerId)
      const first = this.filteredProducts[0];
      const sellerId = this.route.snapshot.queryParams['sellerId'];
      if (sellerId && this.filteredProducts.every(p => p.ID_Vendedor == sellerId)) {
        return first.Nombre_Tienda || 'Vendedor';
      }
    }
    return '';
  }

  clearSellerFilter() {
    this.router.navigate(['/home']);
  }

  getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Todo': '📦',
      'Comida': '🍔',
      'Bebidas': '🧃',
      'Papelería': '✏️',
      'Postres': '🍰',
      'Otros': '📱',
      'Tecnología': '💻'
    };
    return iconMap[categoryName] || '📦';
  }

  selectCategory(cat: any) {
    this.selectedCategory = typeof cat === 'string' ? cat : cat.Nombre;
    this.filterProducts();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }

  viewProduct(id: any) {
    const productId = id || 0;
    if (productId) {
      this.router.navigate(['/product', productId]);
    }
  }

  isOutOfStock(item: any): boolean {
    const stock = Number(item.Stock !== undefined ? item.Stock : item.stock);

    // Buscar si ya está en el carrito
    const cartItems = this.cartService.getItems();
    const cartItem = cartItems.find(i => (i.id || i.ID_Producto) === (item.ID_Producto || item.id));
    const cartQty = cartItem ? (cartItem.quantity || 0) : 0;

    // Si el stock menos lo que tengo en el carrito es <= 0, para mí está "agotado"
    return (stock - cartQty) <= 0;
  }

  addToCart(item: any) {
    if (this.isOutOfStock(item)) {
      alert('No hay más unidades disponibles (revisa tu carrito).');
      return;
    }
    this.cartService.addToCart(item);

    // Descontar visualmente del catálogo
    if (item.Stock !== undefined) {
      item.Stock--;
    } else if (item.stock !== undefined) {
      item.stock--;
    }

    alert(`¡${item.Nombre || item.name} agregado al carrito! 🛒`);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  getImageUrl(product: any): string {
    if (!product) return 'assets/placeholder.svg';
    const imageName = product.Imagen_URL || product.imagen_url || product.image;
    if (!imageName) return 'assets/placeholder.svg';
    if (imageName.startsWith('http')) return imageName;
    return `${this.apiUrl}/uploads/${imageName}`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

