import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:3000/api/cart';
  private cartItems = new BehaviorSubject<any[]>([]);
  public currentCart = this.cartItems.asObservable();

  // Variable pública para el contador
  public cartCount$: Observable<number> = this.currentCart.pipe(
    map(items => items.reduce((total, item) => total + (Number(item.quantity) || 1), 0))
  );

  constructor(private http: HttpClient, private router: Router) {
    this.loadCart();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token_utm');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private handleAuthError(error: HttpErrorResponse) {
    if (error.status === 401) {
      console.warn('Sesión expirada o token inválido. Redirigiendo al login...');
      localStorage.removeItem('token_utm');
      localStorage.removeItem('user_data');
      this.resetCart();
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }

  public loadCart() {
    // Si no hay token, no cargamos nada (o limpiamos)
    if (!localStorage.getItem('token_utm')) {
      this.cartItems.next([]);
      return;
    }

    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: (items) => {
          this.cartItems.next(items);
        },
        error: (err) => {
          console.error('Error cargando carrito', err);
          // Si es 401 ya lo manejó handleAuthError, pero si es otro error limpiamos por si acaso
          if (err.status !== 401) {
            this.cartItems.next([]);
          }
        }
      });
  }

  addToCart(product: any) {
    const token = localStorage.getItem('token_utm');
    if (!token) {
      alert('Debes iniciar sesión para agregar al carrito.');
      this.router.navigate(['/login']);
      return;
    }

    const productId = product.ID_Producto || product.id;
    const quantity = 1;

    this.http.post(`${this.apiUrl}/add`, { productId, quantity }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: () => {
          this.loadCart();
        },
        error: (err) => {
          console.error(err);
          if (err.status !== 401) {
            alert(err.error?.message || 'Error al agregar al carrito');
          }
        }
      });
  }

  removeFromCart(productId: number) {
    this.http.delete(`${this.apiUrl}/remove/${productId}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: () => {
          this.loadCart();
        },
        error: (err) => {
          console.error(err);
          if (err.status !== 401) {
            alert('Error al eliminar producto');
          }
        }
      });
  }

  decreaseQuantity(productId: number) {
    this.http.post(`${this.apiUrl}/decrease/${productId}`, {}, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: () => {
          this.loadCart();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  increaseQuantity(productId: number) {
    this.addToCart({ id: productId });
  }

  clearCart() {
    this.http.delete(`${this.apiUrl}/clear`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: () => {
          this.cartItems.next([]);
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  finalizeCart() {
    this.http.post(`${this.apiUrl}/finalize`, {}, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleAuthError(err)))
      .subscribe({
        next: () => {
          this.cartItems.next([]);
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  resetCart() {
    this.cartItems.next([]);
  }

  getItems() { return this.cartItems.value; }
}