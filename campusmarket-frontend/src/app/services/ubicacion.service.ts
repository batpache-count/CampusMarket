import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UbicacionService {
  private apiUrl = 'http://localhost:3000/api/locations';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token_utm');

    if (!token) {
      console.warn('⚠️ No se encontró token de autenticación (token_utm).');
      return { headers: { Authorization: '' } }; // Return empty string instead of undefined/missing
    }

    // console.log('🔑 Enviando token:', token.substring(0, 10) + '...'); 
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  }

  getVendorActiveUbicaciones(idVendedor: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vendor/${idVendedor}`, this.getHeaders());
  }

  getMyUbicaciones(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, this.getHeaders());
  }

  createUbicacion(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, this.getHeaders());
  }

  deleteUbicacion(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.getHeaders());
  }
}
