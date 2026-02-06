import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private apiUrl = `${environment.apiUrl}/api/orders`;

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    getMyOrders(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-orders`, this.getHeaders());
    }

    getOrderDetails(id: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${id}/details`, this.getHeaders());
    }

    createOrder(orderData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}`, orderData, this.getHeaders());
    }
}
