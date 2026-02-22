import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: false,
})
export class OrderDetailPage implements OnInit {
  orderId: number | null = null;
  order: any = null;
  orderDetails: any[] = [];
  loading = true;
  apiUrl = environment.apiUrl;

  // Local binding properties
  localStatus: string = '';
  currentProduct: any = {};
  orderNotes: string = '';

  isSeller: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.order = nav.extras.state['order'];
      this.initLocalData();
    }
  }

  ngOnInit() {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));

    // 1. Initial detection from query params (legacy/fallback)
    this.route.queryParams.subscribe(params => {
      this.isSeller = params['role'] === 'seller';
    });

    // 2. Fetch full details and refine role detection
    if (this.orderId) {
      this.loadDetails();
    }
  }

  initLocalData() {
    if (this.order) {
      this.localStatus = this.order.Estado_Pedido;

      // Prioritize items from separate list if available (fresh fetch), else from order object (state nav)
      const items = this.orderDetails.length > 0 ? this.orderDetails : (this.order.items || []);

      if (items && items.length > 0) {
        this.currentProduct = { ...items[0] };
      } else {
        this.currentProduct = { Nombre_Producto: 'Producto no encontrado', Cantidad: 0 };
      }

      // Map Delivery Info to "Notes" since 'Notas' column might not exist or be used for this
      // User requested "all data known... like delivery location/time" implied
      const location = this.order.Nombre_Ubicacion || '';
      const time = this.order.Hora_Encuentro || '';

      // Formato de entrega corregido: "Entregar en: [Lugar] el [Día] de [Hora Inicio] a [Hora Fin]"
      // Si la hora viene como "HH:MM - HH:MM", la separamos
      let timeStr = '';
      if (time) {
        const timeParts = time.split('-');
        if (timeParts.length === 2) {
          timeStr = `de ${timeParts[0].trim()} a ${timeParts[1].trim()}`;
        } else {
          timeStr = `a las ${time}`;
        }
      }

      const day = this.order.Hora_Encuentro ? this.order.Hora_Encuentro.split(' ')[0] : ''; // A veces viene "Miercoles 10:00"

      // If there's a real 'Notas' field, use it. Otherwise construct delivery info.
      if (this.order.Notas) {
        this.orderNotes = this.order.Notas;
      } else if (location) {
        // Asumiendo que 'Hora_Encuentro' trae dia y hora o 'selectedDay' y 'selectedTime' se guardaron
        // La estructura de 'Hora_Encuentro' en bd suele ser "Dia HoraInicio - HoraFin"

        // Intentamos parsear mejor si viene todo en un string
        // Estructura esperada en BD: "Miercoles 14:00 - 15:00"

        let deliveryText = `Entregar en: ${location}`;

        if (this.order.Hora_Encuentro) {
          // "Miercoles 14:00 - 15:00"
          const parts = this.order.Hora_Encuentro.split(' ');
          if (parts.length >= 1) {
            deliveryText += ` el ${parts[0]}`; // Dia
          }
          if (parts.length >= 2) {
            const timeRange = parts.slice(1).join(' '); // "14:00 - 15:00"
            const rangeParts = timeRange.split('-');
            if (rangeParts.length === 2) {
              deliveryText += ` de ${rangeParts[0].trim()} a ${rangeParts[1].trim()}`;
            } else {
              deliveryText += ` a las ${timeRange}`;
            }
          }
        }

        this.orderNotes = deliveryText;
      } else {
        this.orderNotes = '';
      }
    }
  }

  loadDetails() {
    this.loading = true;
    this.order = null; // Clear old data to prevent UI artifacts during loading
    this.orderDetails = [];
    if (this.orderId) {
      this.orderService.getOrderDetails(this.orderId).subscribe({
        next: (data) => {
          if (data.order && data.items) {
            this.order = data.order;
            this.orderDetails = data.items;

            // Auto-detect role
            const user = this.authService.getCurrentUser();
            if (user && this.order.ID_Vendedor_User) {
              // Note: authService.getCurrentUser() returns an object where the ID is in the 'id' field
              this.isSeller = (Number(user.id) === Number(this.order.ID_Vendedor_User));
              console.log('Role detection:', { userId: user.id, vendorUserId: this.order.ID_Vendedor_User, isSeller: this.isSeller });
            }
          } else {
            this.orderDetails = Array.isArray(data) ? data : [];
          }

          this.initLocalData();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Error loading order details:', err);
          this.loading = false;
        }
      });
    }
  }

  async saveChanges() {
    if (!this.orderId) return;

    // 1. Update Status (Backend)
    const validStatuses = ['Pendiente', 'Pagado', 'En preparacion', 'Listo', 'En camino', 'Entregado', 'Cancelado'];
    if (!validStatuses.includes(this.localStatus)) {
      console.error('Estado no válido:', this.localStatus);
      return;
    }

    this.orderService.updateStatus(this.orderId.toString(), this.localStatus).subscribe({
      next: async () => {
        // If it's a cash order and status is Entregado, it triggers a notification to the buyer
        const isEntregadoAttempt = this.localStatus === 'Entregado' && this.order.Metodo_Pago?.toLowerCase() === 'efectivo';

        // PayPal specific: notify buyer if status is 'Listo' (Package Ready)
        if (this.localStatus === 'Listo' && this.order.Metodo_Pago?.toLowerCase() === 'paypal') {
          // Notification logic in backend handles this via historial_pedido actor
        }

        this.order.Estado_Pedido = this.localStatus;
        // Reload details to update Confirmacion_Vendedor if applicable
        this.loadDetails();

        // 2. Feedback (Toast)
        const message = isEntregadoAttempt ? 'Estado actualizado. Se ha notificado al comprador.' : 'Estado actualizado correctamente.';

        const toast = await this.toastController.create({
          message: message,
          duration: 2500,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err: any) => {
        console.error('Error updating status:', err);
        const toast = await this.toastController.create({
          message: 'Error al actualizar el estado.',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });

    // Note: Other fields are read-only now, so no need to log or save them.
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pendiente': return 'time-outline';
      case 'Autorizado': return 'shield-checkmark-outline'; // Icono de escudo para retención
      case 'Pagado': return 'card-outline';
      case 'En preparacion': return 'restaurant-outline';
      case 'Listo': return 'gift-outline';
      case 'En camino': return 'bicycle-outline';
      case 'Entregado': return 'bag-check-outline';
      case 'Cancelado': return 'ban-outline';
      default: return 'help-circle-outline';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pendiente': return 'warning';
      case 'Autorizado': return 'primary'; // Azul para indicar que el dinero está asegurado
      case 'Pagado': return 'success';
      case 'En preparacion': return 'secondary';
      case 'Listo': return 'primary';
      case 'En camino': return 'tertiary';
      case 'Entregado': return 'success';
      case 'Cancelado': return 'medium';
      default: return 'medium';
    }
  }

  getProductImage(imageName: string): string {
    if (!imageName) return 'assets/banner-placeholder.jpg';
    if (imageName.startsWith('http')) return imageName;
    return `${this.apiUrl}/uploads/${imageName}`;
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // --- New Logic ---

  get showEntregadoOption(): boolean {
    if (!this.order) return true;
    // Forzar validación vía QR para PayPal ocultando la opción manual
    return this.order.Metodo_Pago?.toLowerCase() !== 'paypal';
  }

  get canConfirmReceipt(): boolean {
    if (this.isSeller || !this.order) return false;
    // La confirmación manual del comprador SOLO se permite para Efectivo.
    // Para PayPal, se requiere validación vía QR por parte del vendedor (Escrow).
    return (this.order.Metodo_Pago?.toLowerCase() === 'efectivo' &&
      ['Pendiente', 'En camino'].includes(this.order.Estado_Pedido) &&
      this.order.Confirmacion_Vendedor === true &&
      !this.order.Confirmacion_Comprador);
  }

  get isWaitingForOther(): boolean {
    if (!this.order) return false;
    // For Cash: wait if one party confirmed but not the other
    if (this.order.Metodo_Pago?.toLowerCase() === 'efectivo') {
      if (this.isSeller) return this.order.Confirmacion_Vendedor && !this.order.Confirmacion_Comprador;
      return this.order.Confirmacion_Comprador && !this.order.Confirmacion_Vendedor;
    }
    return false;
  }

  async confirmReceipt() {
    const alert = await this.alertController.create({
      header: 'Confirmar Recepción',
      message: '¿Confirmas que has recibido el pedido satisfactoriamente y has realizado el pago en efectivo?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: () => {
            this.performConfirmReceipt();
          }
        }
      ]
    });
    await alert.present();
  }

  performConfirmReceipt() {
    if (!this.orderId) return;
    this.loading = true;
    this.orderService.confirmReceipt(this.orderId.toString()).subscribe({
      next: async (res: any) => {
        // Recargar los detalles para ver el estado actualizado (podría estar esperando al vendedor)
        this.loadDetails();

        const toast = await this.toastController.create({
          message: 'Confirmación registrada correctamente.',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err: any) => {
        this.loading = false;
        console.error(err);
        const toast = await this.toastController.create({
          message: 'Error al confirmar recepción.',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  // --- PayPal QR Scanning & Validation ---

  async scanOrderQR() {
    const alert = await this.alertController.create({
      header: 'Escaneo de QR',
      message: 'La cámara se activará en dispositivos físicos. Para esta prueba, usa el ingreso manual.',
      buttons: [
        {
          text: 'Ingresar Código',
          handler: () => {
            this.enterCodeManually();
          }
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await alert.present();
  }

  async enterCodeManually() {
    const alert = await this.alertController.create({
      header: 'Validar Entrega PayPal',
      message: 'Ingresa el código amigable del comprador (ej: PED-A1B2C3).',
      inputs: [
        {
          name: 'qrToken',
          type: 'text',
          placeholder: 'Ej: b419...'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Validar Pago',
          handler: (data) => {
            if (data.qrToken) {
              this.validateQR(data.qrToken);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  validateQR(token: string) {
    this.loading = true;
    this.orderService.validateQRCode(this.orderId!.toString(), token).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.presentToast('¡Entrega completada con éxito!', 'success');
        this.loadDetails(); // Refresh
      },
      error: async (err: any) => {
        this.loading = false;
        const errMsg = err.error?.message || 'Código inválido o pedido no listo.';
        const toast = await this.toastController.create({
          message: errMsg,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  async copyToCode(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      const toast = await this.toastController.create({
        message: 'Código copiado al portapapeles',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  async openReportModal() {
    if (!this.orderId) return;
    this.router.navigate(['/orders/order-report', this.orderId]);
  }
}
