import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../services/order';
import { UbicacionService } from '../services/ubicacion.service'; // Import the new service

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class Cart implements OnInit {

  cartItems: any[] = [];
  total: number = 0;

  isCheckoutMode: boolean = false;

  deliveryData = {
    locationId: null, // Use locationId to store the selected location's ID
    date: '',
    time: ''
  };

  locations: any[] = []; // Will be filled from the backend

  constructor(
    private cartService: CartService,
    private router: Router,
    private orderService: OrderService,
    private ubicacionService: UbicacionService // Inject the new service
  ) { }

  ngOnInit() {
    this.cartService.currentCart.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
      if (this.cartItems.length > 0) {
        const firstItem = this.cartItems[0];
        const idVendedor = firstItem.ID_Vendedor;
        if (idVendedor) {
          this.ubicacionService.getVendorActiveUbicaciones(idVendedor).subscribe(locations => {
            this.locations = locations;
            if (locations.length > 0) {
              this.deliveryData.locationId = locations[0].ID_Ubicacion;
            }
          });
        }
      }
    });
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  }

  removeItem(id: number) {
    if (confirm('¿Quitar este producto del carrito?')) {
      this.cartService.removeFromCart(id);
    }
  }

  increaseQuantity(id: number) {
    const item = this.cartItems.find(i => (i.id || i.ID_Producto) === id);
    if (item) {
      this.cartService.addToCart(item); // Re-adding increments quantity
    }
  }

  decreaseQuantity(id: number) {
    this.cartService.decreaseQuantity(id);
  }

  enableCheckout() {
    this.isCheckoutMode = true;
    setTimeout(() => this.renderPayPalButton(), 500);
  }

  cancelCheckout() {
    this.isCheckoutMode = false;
  }

  checkout(paymentMethod: string = 'Efectivo', transactionId: string | null = null) {
    if (this.cartItems.length === 0) return;

    if (!this.deliveryData.locationId || !this.deliveryData.time) {
      alert('⚠️ Completa lugar y hora.');
      return;
    }

    const firstItem = this.cartItems[0];
    const idVendedor = firstItem.ID_Vendedor;

    if (!idVendedor) {
      alert('Error: Vendedor no identificado. Vacia el carrito e intenta de nuevo.');
      return;
    }

    const itemsFormatted = this.cartItems.map(item => ({
      ID_Producto: item.id,
      Cantidad: item.quantity
    }));

    const orderPayload = {
      ID_Vendedor: idVendedor,
      ID_Ubicacion_Entrega: this.deliveryData.locationId,
      Hora_Encuentro: this.deliveryData.time,
      items: itemsFormatted,
      Metodo_Pago: paymentMethod,
      PayPal_Transaction_ID: transactionId
    };

    this.orderService.createOrder(orderPayload).subscribe({
      next: (res: any) => {
        alert('✅ ¡Pedido Enviado!');
        this.cartService.finalizeCart();
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        console.error(err);
        alert('❌ Error al enviar pedido.');
      }
    });
  }

  clearCart() {
    this.cartService.clearCart();
  }

  payWithMercadoPago() {
    if (this.cartItems.length === 0) return;

    if (!this.deliveryData.locationId || !this.deliveryData.time) {
      alert('⚠️ Completa lugar y hora antes de pagar.');
      return;
    }

    const items = this.cartItems.map(item => ({
      title: item.name,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      currency_id: 'MXN'
    }));

    this.orderService.createPreference(items).subscribe({
      next: (res: any) => {
        if (res.init_point) {
          // Guardar datos temporales para crear la orden al volver (si fuera necesario)
          // O confiar en que MP maneja el flujo.
          // Para simplificar, redirigimos.
          window.location.href = res.init_point;
        } else {
          alert('Error al iniciar Mercado Pago');
        }
      },
      error: (err) => {
        console.error(err);
        alert('Error conectando con Mercado Pago');
      }
    });
  }

  renderPayPalButton() {
    if (!window.paypal) {
      console.error('PayPal SDK no cargado');
      return;
    }

    // Limpiar contenedor previo si existe
    const container = document.getElementById('paypal-button-container');
    if (container) container.innerHTML = '';

    window.paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: this.total.toFixed(2),
              currency_code: 'MXN'
            }
          }]
        });
      },
      onApprove: (data: any, actions: any) => {
        return actions.order.capture().then((details: any) => {
          console.log('Pago exitoso:', details);
          // alert(`Pago exitoso por ${details.payer.name.given_name}!`);
          this.checkout('PayPal', details.id); // Crear la orden en el backend con datos de PayPal
        });
      },
      onError: (err: any) => {
        console.error('Error en PayPal:', err);
        alert('Hubo un error con el pago. Intenta de nuevo.');
      }
    }).render('#paypal-button-container');
  }
}

declare global {
  interface Window {
    paypal: any;
  }
}
