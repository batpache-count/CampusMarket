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
  bestDay: any = null;
  dayMap: { [key: string]: string } = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };
  selectedTab = 'pedidos';

  orders: any[] = [];
  products: any[] = [];
  locations: any[] = [];

  // Stats
  statsPeriod = 'week';
  advStats: any = null;

  // Profile Edit (Transferencia & PayPal)
  numero_tarjeta = '';
  nombre_banco = '';
  nombre_cuenta = '';
  descripcion_tienda = '';
  nombre_tienda = '';
  paypal_email = '';
  transferencia_activo = false;
  paypal_activo = false;
  private initialState: any = {};

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
        this.loadProfile(); // Load banner and extra info
      }
    });
  }

  loadProfile() {
    this.sellerService.getProfile().subscribe({
      next: (profile) => {
        if (profile.banner_url) {
          this.bannerImage = this.getImageUrl(profile.banner_url);
        }
        // Update user if needed (e.g. if imagen_url changed)
        if (profile.imagen_url && this.user) {
          this.user.imagen_url = profile.imagen_url;
        }

        // Fill edit fields
        this.numero_tarjeta = profile.numero_tarjeta || '';
        this.nombre_banco = profile.nombre_banco || '';
        this.nombre_cuenta = profile.nombre_cuenta || '';
        this.descripcion_tienda = profile.descripcion || '';
        this.nombre_tienda = profile.nombre_tienda || '';
        this.paypal_email = profile.paypal_email || '';
        this.transferencia_activo = profile.transferencia_activo;
        this.paypal_activo = profile.paypal_activo;
        this.saveInitialState();
      },
      error: (err) => console.error('Error loading seller profile', err)
    });
  }

  saveInitialState() {
    this.initialState = {
      nombre_tienda: this.nombre_tienda,
      descripcion_tienda: this.descripcion_tienda,
      numero_tarjeta: this.numero_tarjeta,
      nombre_banco: this.nombre_banco,
      nombre_cuenta: this.nombre_cuenta,
      paypal_email: this.paypal_email,
      transferencia_activo: this.transferencia_activo,
      paypal_activo: this.paypal_activo
    };
  }

  hasChanges(): boolean {
    const cleanCurrentCard = (this.numero_tarjeta || '').replace(/\s/g, '');
    const cleanInitialCard = (this.initialState.numero_tarjeta || '').replace(/\s/g, '');

    return this.nombre_tienda !== this.initialState.nombre_tienda ||
      this.descripcion_tienda !== this.initialState.descripcion_tienda ||
      cleanCurrentCard !== cleanInitialCard ||
      this.nombre_banco !== this.initialState.nombre_banco ||
      this.nombre_cuenta !== this.initialState.nombre_cuenta ||
      this.paypal_email !== this.initialState.paypal_email ||
      this.transferencia_activo !== this.initialState.transferencia_activo ||
      this.paypal_activo !== this.initialState.paypal_activo;
  }

  onCardNumberInput(event: any) {
    let value = event.target.value.replace(/\D/g, ''); // Solo números
    if (value.length > 18) value = value.substring(0, 18); // Límite CLABE

    // Formatear: añadir espacio cada 4 dígitos
    const parts = value.match(/.{1,4}/g);
    this.numero_tarjeta = parts ? parts.join(' ') : value;
  }

  async saveProfile() {
    if (!this.nombre_tienda) {
      this.showToast('El nombre de la tienda es requerido', 'danger');
      return;
    }

    if (this.numero_tarjeta && !this.isValidCardNumber(this.numero_tarjeta)) {
      this.showToast('Número de tarjeta inválido', 'danger');
      return;
    }

    // Validation for Transferencia
    if (this.transferencia_activo) {
      if (!this.nombre_banco || !this.nombre_cuenta || !this.numero_tarjeta) {
        this.showToast('Para activar transferencias, debes completar Banco, Titular y Tarjeta.', 'warning');
        return;
      }
      if (!this.isValidCardNumber(this.numero_tarjeta) && this.numero_tarjeta.length === 16) {
        this.showToast('El número de tarjeta no es válido.', 'danger');
        return;
      }
    }

    // Validation for PayPal
    if (this.paypal_activo && !this.paypal_email) {
      this.showToast('Para activar PayPal, ingresa un correo válido.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando perfil...'
    });
    await loading.present();

    const data = {
      nombre_tienda: this.nombre_tienda,
      descripcion_tienda: this.descripcion_tienda,
      numero_tarjeta: this.numero_tarjeta.replace(/\s/g, ''), // Limpiar antes de enviar
      nombre_banco: this.nombre_banco,
      nombre_cuenta: this.nombre_cuenta,
      paypal_email: this.paypal_email,
      transferencia_activo: this.transferencia_activo,
      paypal_activo: this.paypal_activo
    };

    this.sellerService.updateProfile(data).subscribe({
      next: () => {
        loading.dismiss();
        this.saveInitialState();
        this.showToast('Perfil actualizado correctamente', 'success');
      },
      error: (err) => {
        loading.dismiss();
        console.error('Error saving profile', err);
        this.showToast('Error al guardar el perfil', 'danger');
      }
    });
  }

  isValidCardNumber(num: string): boolean {
    // Remove spaces/dashes
    const cleanNum = num.replace(/\D/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) return false;

    // Luhn Algorithm
    let sum = 0;
    let shouldDouble = false;
    for (let i = cleanNum.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNum.charAt(i));
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  changeBanner() {
    // Trigger hidden file input
    const fileInput = document.getElementById('banner-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  async onBannerFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = await this.loadingController.create({ message: 'Subiendo banner...' });
    await loading.present();

    const formData = new FormData();
    formData.append('banner', file);

    this.sellerService.uploadBanner(formData).subscribe({
      next: async (res) => {
        this.bannerImage = this.getImageUrl(res.bannerUrl);
        await loading.dismiss();
        await this.presentToast('Banner actualizado con éxito');
      },
      error: async (err) => {
        console.error(err);
        await loading.dismiss();
        await this.presentToast('Error al subir banner');
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
    await toast.present();
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
        if (data && data.bestDay && data.bestDay.Dia) {
          const englishDay = data.bestDay.Dia.trim();
          data.bestDay.Dia = this.dayMap[englishDay] || englishDay;
        }
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
      case 'Pendiente': return 'medium';
      case 'Autorizado': return 'primary';
      case 'En preparacion': return 'warning'; // Orange
      case 'Listo': return 'tertiary'; // Purple
      case 'En camino': return 'secondary'; // Blue
      case 'Entregado': return 'success'; // Green
      case 'Cancelado': return 'danger';
      default: return 'medium';
    }
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url) return 'assets/placeholder.svg';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}/uploads/${url}`;
  }
}
