import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { LocationService } from '../services/location.service';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin, lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface CartGroup {
  vendorId: number;
  vendorName: string;
  vendorPayPalEmail?: string;
  items: any[];
  total: number;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
})
export class CartPage implements OnInit {
  apiUrl = environment.apiUrl;
  cartItems: any[] = [];
  total = 0;
  isCartConfigured = false;

  // Multi-Vendor Groups (Visual Only)
  cartGroups: CartGroup[] = [];

  // PayPal Configuration
  public showPayPalButton = false;
  private paypalScriptLoaded = false;
  private currentPayPalOrders: any[] = [];

  // Confirmation View
  public showConfirmation = false;
  public confirmationCodes: { vendorName: string, code: string }[] = [];

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private locationService: LocationService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router
  ) { }

  ngOnInit() {
    this.cartService.currentCart.subscribe(items => {
      this.cartItems = items;
      this.checkConfiguration();
      this.groupItemsByVendor();
      this.calculateTotal();
    });
  }

  ionViewWillEnter() {
    this.cartService.loadCart();
  }

  checkConfiguration() {
    if (this.cartItems.length === 0) {
      this.isCartConfigured = true;
      return;
    }
    const unconfigured = this.cartItems.find(item =>
      !item.selectedPaymentMethod ||
      !item.selectedLocation ||
      !item.selectedDay ||
      !item.selectedTime
    );
    this.isCartConfigured = !unconfigured;
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((acc, item) => {
      return acc + (Number(item.price) * Number(item.quantity));
    }, 0);
  }

  groupItemsByVendor() {
    const groups: { [key: number]: CartGroup } = {};

    this.cartItems.forEach(item => {
      const vId = item.ID_Vendedor;
      if (!groups[vId]) {
        groups[vId] = {
          vendorId: vId,
          vendorName: item.seller || `Vendedor #${vId}`,
          vendorPayPalEmail: item.PayPal_Email,
          items: [],
          total: 0
        };
      }
      groups[vId].items.push(item);
      groups[vId].total += Number(item.price) * Number(item.quantity);
    });

    this.cartGroups = Object.values(groups);
  }

  // --- Cart Actions ---

  configureItem(item: any) {
    this.router.navigate(['/order-config', item.id]);
  }

  increaseQuantity(item: any) {
    this.cartService.increaseQuantity(item.id);
  }

  decreaseQuantity(item: any) {
    if (item.quantity > 1) {
      this.cartService.decreaseQuantity(item.id);
    } else {
      this.removeFromCart(item);
    }
  }

  async removeFromCart(item: any) {
    const alert = await this.alertController.create({
      header: 'Eliminar producto',
      message: `¿Estás seguro de eliminar ${item.name} del carrito?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: () => { this.cartService.removeFromCart(item.id); }
        }
      ]
    });
    await alert.present();
  }

  checkout() {
    if (this.cartItems.length === 0) return;

    // 1. Validación de configuración básica
    const unconfiguredItems = this.cartItems.filter(item =>
      !item.selectedPaymentMethod ||
      !item.selectedLocation ||
      !item.selectedDay ||
      !item.selectedTime
    );

    if (unconfiguredItems.length > 0) {
      this.presentToast(`Por favor configura la entrega y pago para ${unconfiguredItems.length} producto(s).`, 'warning');
      return;
    }

    // 2. Validación de integridad (Cantidad, Precio, Ubicación ID)
    const invalidItems = this.cartItems.filter(item =>
      item.quantity < 1 ||
      isNaN(Number(item.price)) ||
      !item.selectedLocation?.ID_Ubicacion
    );

    if (invalidItems.length > 0) {
      this.presentToast('Hay productos con cantidad o precio inválido.', 'danger');
      return;
    }

    this.showConfirmationAlert();
  }

  async showConfirmationAlert() {
    const alert = await this.alertController.create({
      header: 'Confirmar Compra',
      message: `Total Global: $${this.total}\n\nLos productos se agruparán en pedidos según los datos de entrega. ¿Proceder?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Comprar',
          handler: () => { this.processOrder(); }
        }
      ]
    });
    await alert.present();
  }

  async processOrder() {
    if (this.cartItems.length === 0) return;

    const loading = await this.loadingController.create({ message: 'Preparando pedidos...' });
    await loading.present();

    const orders: { [key: string]: any } = {};

    this.cartItems.forEach(item => {
      const dayShort = item.selectedDay ? item.selectedDay.substring(0, 3) : 'Any';
      const timeShort = item.selectedTime ? item.selectedTime.replace(/[:\s]/g, '') : 'Any';
      const key = `V${item.ID_Vendedor}_L${item.selectedLocation.ID_Ubicacion}_${dayShort}_${timeShort}_${item.selectedPaymentMethod}`;

      if (!orders[key]) {
        orders[key] = {
          key: key,
          ID_Vendedor: item.ID_Vendedor,
          vendorName: item.seller || `Vendedor #${item.ID_Vendedor}`,
          PayPal_Email: item.PayPal_Email,
          ID_Ubicacion_Entrega: item.selectedLocation.ID_Ubicacion,
          Hora_Encuentro: `${item.selectedDay} ${item.selectedTime}`,
          Metodo_Pago: item.selectedPaymentMethod,
          items: [],
          total: 0
        };
      }
      orders[key].items.push({
        ID_Producto: item.id || item.ID_Producto,
        Cantidad: item.quantity,
        Precio_Unitario: item.price,
        Nombre_Producto: item.name
      });
      orders[key].total += Number(item.price) * Number(item.quantity);
    });

    const cashOrders = Object.values(orders).filter(o => o.Metodo_Pago?.toLowerCase() === 'efectivo');
    const payPalOrders = Object.values(orders).filter(o => o.Metodo_Pago?.toLowerCase() === 'paypal');

    // 1. Process Cash Orders
    if (cashOrders.length > 0) {
      const cashObservables = cashOrders.map(order => this.orderService.createOrder(order));
      forkJoin(cashObservables).subscribe({
        next: (results) => {
          console.log('Cash Orders Created:', results);
          if (payPalOrders.length === 0) {
            this.finalizeCheckout(loading);
          } else {
            this.presentToast('Pedidos en efectivo registrados. Procede con el pago PayPal.', 'success');
          }
        },
        error: (err) => {
          console.error('Cash Order Error:', err);
          this.presentToast('Error al procesar pedidos en efectivo.', 'danger');
          loading.dismiss();
        }
      });
    }

    // 2. Setup PayPal Orders
    if (payPalOrders.length > 0) {
      this.currentPayPalOrders = payPalOrders;
      this.showPayPalButton = true;
      await loading.dismiss();
      setTimeout(() => this.loadPayPalSDK(), 100);
    } else if (cashOrders.length === 0) {
      await loading.dismiss();
    }
  }

  private loadPayPalSDK() {
    if ((window as any).paypal) {
      this.renderPayPalButton();
      return;
    }

    if (this.paypalScriptLoaded) return;
    this.paypalScriptLoaded = true;

    console.log('Cargando PayPal SDK nativo con intent=authorize...');
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=USD&intent=authorize&components=buttons`;
    script.async = true;
    script.onload = () => {
      console.log('PayPal SDK cargado exitosamente');
      this.renderPayPalButton();
    };
    script.onerror = (err) => {
      console.error('Error cargando PayPal SDK:', err);
      this.paypalScriptLoaded = false;
      this.presentToast('No se pudo cargar el método de pago PayPal.', 'danger');
    };
    document.body.appendChild(script);
  }

  private renderPayPalButton() {
    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.warn('Contenedor de PayPal no encontrado, reintentando...');
      setTimeout(() => this.renderPayPalButton(), 100);
      return;
    }

    // Limpiar contenedor por si acaso
    container.innerHTML = '';

    (window as any).paypal.Buttons({
      createOrder: () => {
        console.log('Iniciando creación de orden en backend para:', this.currentPayPalOrders);
        return lastValueFrom(this.orderService.initPayPalOrder(this.currentPayPalOrders))
          .then(res => {
            console.log('ID de Orden PayPal (Backend):', res.id);
            return res.id;
          })
          .catch(err => {
            console.error('Error creando orden en backend:', err);
            this.presentToast('Error al preparar la transacción.', 'danger');
            throw err;
          });
      },
      onApprove: (data: any, actions: any) => {
        console.log('onApprove disparado. orderID recibido:', data.orderID);
        return fetch(`${this.apiUrl}/api/orders/authorize-paypal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID })
        })
          .then(res => {
            console.log('Fetch authorize-paypal - Status:', res.status, 'StatusText:', res.statusText);
            if (!res.ok) {
              return res.text().then(text => {
                console.error('Fetch error body:', text);
                throw new Error(`HTTP ${res.status} - ${text}`);
              });
            }
            return res.json();
          })
          .then(result => {
            console.log('Respuesta authorize-paypal OK:', result);
            this.handlePayPalApproval(result.orderDetails || data);
          })
          .catch(err => {
            console.error('Error completo en authorize flow:', err.message);
            this.presentToast('Error al confirmar pago: ' + err.message, 'danger');
          });
      },
      onCancel: (data: any) => {
        console.log('Pago cancelado:', data);
        this.presentToast('Pago cancelado.', 'warning');
      },
      onError: (err: any) => {
        console.error('PayPal Error:', err);
        this.presentToast('Error en el proceso de pago.', 'danger');
      },
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 45
      }
    }).render('#paypal-button-container');
  }

  private handlePayPalApproval(data: any) {
    console.log('Procesando datos autorizados:', JSON.stringify(data, null, 2));

    const purchaseUnits = data.purchase_units || [];

    // Log diagnóstico de unidades recibidas (post-autorización)
    purchaseUnits.forEach((u: any, idx: number) => {
      console.log(`Unidad PayPal [${idx}]: reference_id=${u.reference_id}, Payments?=${!!u.payments}`);
    });

    const creationObservables = this.currentPayPalOrders.map(order => {
      console.log(`Buscando match para order.key=${order.key}`);
      let authId: string | undefined;

      // Buscar la unidad que corresponde a este sub-pedido
      const matchingUnit = purchaseUnits.find((u: any) => u.reference_id === order.key);

      if (matchingUnit?.payments?.authorizations?.length > 0) {
        authId = matchingUnit.payments.authorizations[0].id;
        console.log(`Auth ID encontrado por reference_id ${order.key}: ${authId}`);
      } else if (matchingUnit?.payments?.captures?.length > 0) {
        authId = matchingUnit.payments.captures[0].id;
        console.log(`Capture ID encontrado por reference_id ${order.key}: ${authId}`);
      }
      // Fallback: Si solo hay una purchase_unit (común en single-vendor)
      else if (purchaseUnits.length === 1 && purchaseUnits[0].payments?.authorizations?.length > 0) {
        authId = purchaseUnits[0].payments.authorizations[0].id;
      } else if (purchaseUnits.length === 1 && purchaseUnits[0].payments?.captures?.length > 0) {
        authId = purchaseUnits[0].payments.captures[0].id;
      }

      // Si no encontramos un ID de pago (autorización o captura), el registro de la orden fallará en el backend
      if (!authId) {
        console.warn(`WARN: No se encontró un ID de pago real para el pedido ${order.key}. Usando ID de Orden.`);
        authId = data.id;
      }

      order.PayPal_Transaction_ID = authId;
      console.log(`Registrando pedido ${order.key} con PayPal ID: ${authId}`);
      return this.orderService.createOrder(order);
    });

    forkJoin(creationObservables).subscribe({
      next: (results: any[]) => {
        console.log('Pedidos registrados OK:', results);
        this.confirmationCodes = results.map((res, index) => ({
          vendorName: this.currentPayPalOrders[index].vendorName,
          code: res.QR_Token || res.confirmationCode || 'Error'
        }));
        this.showConfirmation = true;
        this.showPayPalButton = false;
        this.cartService.finalizeCart();
        this.finalizeCheckout();
        this.presentToast('¡Compra exitosa! Revisa tus códigos de entrega.', 'success');
      },
      error: (err) => {
        console.error('Fallo al registrar órdenes:', err);
        this.presentToast('Error al registrar sus pedidos. El pago fue procesado.', 'danger');
      }
    });
  }

  async finalizeCheckout(loading?: any) {
    if (loading) await loading.dismiss();
    this.cartService.finalizeCart();
    this.showSuccessToast();
    this.router.navigate(['/orders/order-list']);
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: '¡Compras realizadas con éxito!',
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    toast.present();
  }

  async presentToast(msg: string, color: string = 'primary') {
    const toast = await this.toastController.create({ message: msg, duration: 2000, color: color });
    toast.present();
  }
}
