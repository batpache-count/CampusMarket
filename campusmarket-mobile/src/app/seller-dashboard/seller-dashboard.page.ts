import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { OrderService } from '../services/order.service';
import { ProductService } from '../services/product.service';
import { LocationService } from '../services/location.service';
import { SellerService } from '../services/seller.service';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-seller-dashboard',
  templateUrl: './seller-dashboard.page.html',
  styleUrls: ['./seller-dashboard.page.scss'],
  standalone: false,
})
export class SellerDashboardPage implements OnInit, ViewWillEnter {
  user: any = null;
  selectedTab = 'pedidos';

  orders: any[] = [];
  products: any[] = [];
  locations: any[] = [];

  // Stats
  statsPeriod = 'week';
  advStats: any = null;

  loading = false;
  bannerImage = 'assets/banner-placeholder.jpg';
  apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private productService: ProductService,
    private locationService: LocationService,
    private sellerService: SellerService, // Added
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  handleRefresh(event: any) {
    this.refreshContent().then(() => {
      event.target.complete();
    });
  }

  async refreshContent() {
    if (this.selectedTab === 'pedidos') {
      this.loadOrders();
    } else if (this.selectedTab === 'productos') {
      this.loadMyProducts();
    } else if (this.selectedTab === 'ubicaciones') {
      this.loadLocations();
    } else if (this.selectedTab === 'estadisticas') {
      this.loadStats();
    }
  }

  changeBanner() {
    console.log('Change banner clicked');
  }

  openOrderDetails(order: any) {
    this.router.navigate(['/orders/order-detail', order.ID_Pedido], {
      queryParams: { role: 'seller' },
      state: { order: order }
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (this.user) {
        this.loadOrders();
        // Pre-load products too if desired, or wait for tab switch
        this.loadMyProducts();
      }
    });
  }

  ionViewWillEnter() {
    if (this.selectedTab === 'productos') {
      this.loadMyProducts();
    } else if (this.selectedTab === 'estadisticas') {
      this.loadStats();
    } else {
      this.loadOrders();
    }
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getMySales().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching orders', err);
        this.loading = false;
      }
    });
  }

  // --- Product Logic ---

  loadMyProducts() {
    this.loading = true;
    this.productService.getMyInventory().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching products', err);
        this.loading = false;
      }
    });
  }

  addProduct() {
    this.router.navigate(['/product-editor/new']);
  }

  editProduct(id: number) {
    this.router.navigate(['/product-editor', id]);
  }

  async toggleStatus(product: any, event: Event) {
    event.stopPropagation(); // Stop item click
    const action = product.Activo ? 'desactivar' : 'publicar';
    const alert = await this.alertController.create({
      header: `¿${product.Activo ? 'Desactivar' : 'Publicar'}?`,
      message: `¿Seguro que quieres ${action} este producto?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: () => { this.performToggleStatus(product); }
        }
      ]
    });
    await alert.present();
  }

  async performToggleStatus(product: any) {
    const loading = await this.loadingController.create({ message: 'Actualizando...' });
    await loading.present();

    const formData = new FormData();
    formData.append('Activo', (!product.Activo).toString());

    this.productService.updateProduct(product.ID_Producto, formData).subscribe({
      next: async () => {
        await loading.dismiss();
        product.Activo = !product.Activo;
        this.presentToast(`Producto ${product.Activo ? 'publicado' : 'desactivado'}`);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.presentToast('Error al actualizar estado');
      }
    });
  }

  async deleteProduct(id: number, name: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Eliminar "${name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => { this.performDelete(id); }
        }
      ]
    });
    await alert.present();
  }

  async performDelete(id: number) {
    const loading = await this.loadingController.create({ message: 'Eliminando...' });
    await loading.present();

    this.productService.deleteProduct(id).subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Producto eliminado');
        this.loadMyProducts();
      },
      error: async (err) => {
        await loading.dismiss();
        this.presentToast('Error al eliminar');
      }
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  segmentChanged(ev: any) {
    this.selectedTab = ev.detail.value;
    if (this.selectedTab === 'productos' && this.products.length === 0) {
      this.loadMyProducts();
    } else if (this.selectedTab === 'ubicaciones') {
      this.loadLocations();
    } else if (this.selectedTab === 'estadisticas') {
      this.loadStats();
    }
  }

  // --- Location Logic ---

  loadLocations() {
    this.loading = true;
    this.locationService.getMyLocations().subscribe({
      next: (data) => {
        this.locations = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching locations', err);
        this.loading = false;
      }
    });
  }

  addLocation() {
    this.router.navigate(['/location-editor/new']);
  }

  editLocation(location: any) {
    this.router.navigate(['/location-editor', location.ID_Ubicacion], { state: { location: location } });
  }

  async deleteLocation(location: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Eliminar "${location.Nombre_Ubicacion}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => { this.performDeleteLocation(location.ID_Ubicacion); }
        }
      ]
    });
    await alert.present();
  }

  async performDeleteLocation(id: number) {
    const loading = await this.loadingController.create({ message: 'Eliminando...' });
    await loading.present();

    this.locationService.deleteLocation(id).subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Punto de entrega eliminado');
        this.loadLocations();
      },
      error: async (err) => {
        await loading.dismiss();
        // Check for active orders error
        if (err.status === 400) {
          this.presentToast('No se puede eliminar: Hay pedidos activos aquí.');
        } else {
          this.presentToast('Error al eliminar');
        }
      }
    });
  }

  // --- Stats Logic ---

  loadStats() {
    this.loading = true;
    this.sellerService.getAdvancedStats(this.statsPeriod).subscribe({
      next: (data) => {
        this.advStats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching stats', err);
        this.loading = false;
        this.presentToast('Error obteniendo estadísticas');
      }
    });
  }

  calculateTotalSales(): number {
    if (!this.advStats || !this.advStats.salesTrend) return 0;
    return this.advStats.salesTrend.reduce((acc: number, curr: any) => acc + Number(curr.Total_Venta), 0);
  }

  async openStatsDetails() {
    this.router.navigate(['/seller-stats-detail']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pendiente': return 'warning';
      case 'Autorizado': return 'primary';
      case 'En camino': return 'secondary';
      case 'Entregado': return 'success';
      case 'Cancelado': return 'danger';
      default: return 'medium';
    }
  }
}
