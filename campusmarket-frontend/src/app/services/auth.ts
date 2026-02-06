import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CartService } from './cart';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private cartService: CartService) { }

  login(correo: string, contrasena: string): Observable<any> {
    // CAMBIO AQUÍ: Usamos las llaves EXACTAS que pide tu backend (Email, Contrasena)
    return this.http.post(`${this.apiUrl}/login`, {
      Email: correo,
      Contrasena: contrasena
    }).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem('token_utm', response.token);
          if (response.user) {
            localStorage.setItem('user_data', JSON.stringify(response.user));
          }
          // Cargar el carrito del usuario recién logueado
          this.cartService.loadCart();
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  logout() {
    localStorage.removeItem('token_utm');
    localStorage.removeItem('user_data');
    // Limpiar el carrito visualmente
    this.cartService.resetCart();
  }
}