import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:3000/api/orders';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token_utm');
    if (!token) {
      console.warn('⚠️ No se encontró token (token_utm) para crear el pedido.');
      return new HttpHeaders();
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Crear Pedido
  createOrder(orderData: any): Observable<any> {
    return this.http.post(this.apiUrl, orderData, { headers: this.getHeaders() });
  }

  // Obtener mis pedidos
  getMyOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-orders`, { headers: this.getHeaders() });
  }

  createPreference(items: any[]): Observable<any> {
    return this.http.post('http://localhost:3000/api/payment/create_preference', { items }, { headers: this.getHeaders() });
  }

  validateQR(orderId: number, qrToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-qr`, { orderId, qrToken }, { headers: this.getHeaders() });
  }

  rateOrder(orderId: number, rating: number, comment: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${orderId}/rate`, { rating, comment }, { headers: this.getHeaders() });
  }
}