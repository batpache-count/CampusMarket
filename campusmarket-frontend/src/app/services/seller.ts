import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SellerService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Helper privado para no repetir código de headers
  private getHeaders() {
    const token = localStorage.getItem('token_utm');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // --- SECCIÓN DE PERFIL ---

  // ✅ NUEVO: Obtener datos del perfil (Foto, Nombre) para el inicio del Dashboard
  getSellerProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/seller/profile`, { headers: this.getHeaders() });
  }

  // Subir foto de perfil
  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', file); 
    return this.http.post(`${this.apiUrl}/seller/upload-photo`, formData, { headers: this.getHeaders() });
  }

  updateSellerProfile(profileData: { nombre_tienda: string, descripcion_tienda: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/seller/profile`, profileData, { headers: this.getHeaders() });
  }

  // --- SECCIÓN DE VENTAS (PEDIDOS) ---
  getMySales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/orders/my-sales`, { headers: this.getHeaders() });
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, { newStatus: status }, { headers: this.getHeaders() });
  }

  // --- SECCIÓN DE PRODUCTOS ---
  
  // 1. Obtener los productos del vendedor logueado
  getMyProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/seller/my-products`, { headers: this.getHeaders() });
  }

  // 2. Borrar un producto propio
  deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/seller/products/${productId}`, { headers: this.getHeaders() });
  }
}