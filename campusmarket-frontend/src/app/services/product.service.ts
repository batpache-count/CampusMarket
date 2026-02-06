import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api/products'; // Ajusta si tu puerto es diferente

  constructor(private http: HttpClient) { }

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getProductById(id: number): Observable<any> {
    const token = localStorage.getItem('token_utm');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories`);
  }

  createProduct(productData: FormData): Observable<any> {
    const token = localStorage.getItem('token_utm');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Angular maneja el Content-Type automáticamente al ver FormData
    // No lo establecemos manualmente para evitar errores con el boundary
    return this.http.post(this.apiUrl, productData, { headers });
  }

  updateProduct(id: number, productData: FormData): Observable<any> {
    const token = localStorage.getItem('token_utm');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/${id}`, productData, { headers });
  }
}