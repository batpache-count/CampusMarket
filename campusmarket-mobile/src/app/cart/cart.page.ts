import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';

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

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
    this.cartService.currentCart.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });
  }

  ionViewWillEnter() {
    this.cartService.loadCart();
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((acc, item) => {
      return acc + (Number(item.price) * Number(item.quantity));
    }, 0);
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
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.cartService.removeFromCart(item.id);
          }
        }
      ]
    });
    await alert.present();
  }

  async checkout() {
    if (this.cartItems.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Compra',
      message: `El total es ${this.total}. ¿Deseas finalizar la compra?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Comprar',
          handler: () => {
            this.processOrder();
          }
        }
      ]
    });
    await alert.present();
  }

  processOrder() {
    if (!this.cartItems || this.cartItems.length === 0) return;

    // Construct Payload
    // Assumption: All items are from same vendor (or we take first one)
    const firstItem = this.cartItems[0];
    const vendorId = firstItem.ID_Vendedor;

    const itemsPayload = this.cartItems.map(item => ({
      ID_Producto: item.id,
      Cantidad: item.quantity
    }));

    const orderData = {
      ID_Vendedor: vendorId,
      ID_Ubicacion_Entrega: 1, // Placeholder/Default Location
      Hora_Encuentro: '12:00', // Placeholder
      items: itemsPayload,
      Metodo_Pago: 'Efectivo',
      PayPal_Transaction_ID: null
    };

    this.orderService.createOrder(orderData).subscribe({
      next: async (res) => {
        console.log('Order Created:', res);
        // Clear backend cart
        this.cartService.finalizeCart();
        // Show success
        this.showSuccessToast();
        // Navigate
        this.router.navigate(['/orders/order-list']);
      },
      error: async (err) => {
        console.error('Order Error:', err);
        const errorAlert = await this.alertController.create({
          header: 'Error',
          message: err.error?.message || 'No se pudo crear el pedido.',
          buttons: ['OK']
        });
        await errorAlert.present();
      }
    });
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: '¡Compra realizada con éxito!',
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }
}
