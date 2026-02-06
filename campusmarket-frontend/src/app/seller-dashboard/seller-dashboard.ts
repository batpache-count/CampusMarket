import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SellerService } from '../services/seller';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { SalesStatsComponent } from './sales-stats/sales-stats';
import { ThemeService } from '../services/theme.service'; // Import ThemeService
import { NotificationService } from '../services/notification.service'; // Import NotificationService
import { UbicacionService } from '../services/ubicacion.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SalesStatsComponent],
  templateUrl: './seller-dashboard.html',
  styleUrls: ['./seller-dashboard.css']
})
export class SellerDashboardComponent implements OnInit {

  currentTab: string = 'dashboard';
  orders: any[] = [];
  products: any[] = [];
  locations: any[] = [];
  notifications: any[] = []; // Lista de notificaciones
  unreadNotificationsCount: number = 0; // Contador de no leídas

  newLocation = { nombre: '', descripcion: '' };
  totalEarnings: number = 0;
  pendingOrdersCount: number = 0;
  today: Date = new Date();

  profilePhotoUrl: string = 'https://ui-avatars.com/api/?name=Vendedor&background=111827&color=fff';
  sellerName: string = 'Vendedor';
  sellerDescription: string = '';
  currentTheme: string;

  constructor(
    private sellerService: SellerService,
    public authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private ubicacionService: UbicacionService,
    private notificationService: NotificationService // Inject NotificationService
  ) {
    this.currentTheme = this.themeService.getTheme();
  }

  ngOnInit() {
    this.loadProfile();
    this.loadOrders();
    this.loadMyProducts();
    this.loadLocations();
    this.loadNotifications(); // Cargar notificaciones
  }

  switchTab(tab: string) {
    this.currentTab = tab;
  }

  loadNotifications() {
    this.notificationService.getMyNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadNotificationsCount = this.notifications.filter(n => !n.Leido).length;
      },
      error: (err: any) => console.error('Error cargando notificaciones', err)
    });
  }

  markAsRead(notification: any) {
    if (!notification.Leido) {
      this.notificationService.markAsRead(notification.ID_Notificacion).subscribe(() => {
        notification.Leido = true;
        this.unreadNotificationsCount--;
      });
    }

    // Navegar según el tipo
    if (notification.Tipo === 'VENTA') {
      this.currentTab = 'orders';
    } else if (notification.Tipo === 'AGOTADO' || notification.Tipo === 'STOCK_BAJO') {
      this.currentTab = 'products';
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.Leido = true);
      this.unreadNotificationsCount = 0;
    });
  }

  loadProfile() {
    this.sellerService.getSellerProfile().subscribe({
      next: (data: any) => {
        if (data.foto) this.profilePhotoUrl = `http://localhost:3000/uploads/${data.foto}`;
        if (data.nombre_tienda) this.sellerName = data.nombre_tienda;
        if (data.descripcion) this.sellerDescription = data.descripcion;
      },
      error: () => console.log('Error al cargar perfil')
    });
  }

  loadOrders() {
    this.sellerService.getMySales().subscribe({
      next: (data: any) => {
        this.orders = data;
        this.calculateStats();
      }
    });
  }

  loadMyProducts() {
    this.sellerService.getMyProducts().subscribe({
      next: (data: any) => {
        this.products = data.map((prod: any) => {
          return {
            ...prod,
            fotoFinal: prod.Imagen_URL || prod.imagen_url || prod.image || prod.Image || null
          };
        });
      },
      error: (err: any) => console.error('Error cargando productos', err)
    });
  }

  loadLocations() {
    this.ubicacionService.getMyUbicaciones().subscribe({
      next: (data) => this.locations = data,
      error: (err: any) => console.error('Error cargando ubicaciones', err)
    });
  }

  addLocation() {
    if (!this.newLocation.nombre) return;

    const payload = {
      Nombre_Ubicacion: this.newLocation.nombre,
      Descripcion: this.newLocation.descripcion
    };

    this.ubicacionService.createUbicacion(payload).subscribe({
      next: (res) => {
        alert('Ubicación agregada exitosamente');
        this.loadLocations();
        this.newLocation = { nombre: '', descripcion: '' };
      },
      error: (err: any) => {
        console.error(err);
        alert('Error al agregar ubicación');
      }
    });
  }

  deleteLocation(id: number) {
    if (confirm('¿Estás seguro de eliminar esta ubicación?')) {
      this.ubicacionService.deleteUbicacion(id).subscribe({
        next: () => {
          this.locations = this.locations.filter(l => l.ID_Ubicacion !== id);
          alert('Ubicación eliminada');
        },
        error: (err: any) => {
          console.error(err);
          alert('No se puede eliminar una ubicación si tiene pedidos asociados.');
        }
      });
    }
  }

  calculateStats() {
    this.totalEarnings = this.orders
      .filter((o: any) => o.Estado_Pedido !== 'Cancelado')
      .reduce((sum: number, order: any) => sum + Number(order.Precio_Total || 0), 0);
    this.pendingOrdersCount = this.orders.filter((o: any) => o.Estado_Pedido !== 'Entregado' && o.Estado_Pedido !== 'Cancelado').length;
  }

  changeStatus(order: any, status: string) {
    const id = order.id || order.ID_Pedido;
    this.sellerService.updateOrderStatus(id, status).subscribe(() => {
      order.Estado_Pedido = status;
      this.calculateStats();
      alert(`Pedido actualizado`);
    });
  }

  deleteProduct(id: number) {
    if (confirm('¿Eliminar producto?')) {
      this.sellerService.deleteProduct(id).subscribe(() => this.loadMyProducts());
    }
  }

  editProduct(id: number) {
    this.router.navigate(['/seller/edit-product', id]);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.sellerService.uploadPhoto(file).subscribe({
        next: (res: any) => {
          this.profilePhotoUrl = `http://localhost:3000/uploads/${res.photoUrl}?t=${Date.now()}`;
          alert('¡Foto de perfil actualizada!');
        },
        error: () => alert('Error al subir foto')
      });
    }
  }

  updateShopInfo(shopData: { nombre_tienda: string, descripcion_tienda: string }) {
    this.sellerService.updateSellerProfile(shopData).subscribe({
      next: () => alert('Configuración guardada'),
      error: () => alert('Error al guardar la configuración')
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
