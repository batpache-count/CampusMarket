import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

    getMySales(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-sales`, this.getHeaders());
    }

    getOrderDetails(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}/details`, this.getHeaders());
    }

    createOrder(orderData: any): Observable<any> {
        console.log('Enviando createOrder al backend:', JSON.stringify(orderData, null, 2));
        return this.http.post<any>(`${this.apiUrl}`, orderData, this.getHeaders())
            .pipe(
                catchError((err: any) => {
                    console.error('Error HTTP en createOrder:', err.status, err.message, err.error);
                    throw err;
                })
            );
    }

    updateStatus(orderId: string, newStatus: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${orderId}/status`, { newStatus }, this.getHeaders());
    }

    rateOrder(orderId: string, rating: number, comment: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${orderId}/rate`, { rating, comment }, this.getHeaders());
    }

    confirmReceipt(orderId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${orderId}/confirm-receipt`, {}, this.getHeaders());
    }

    createReport(orderId: string, reportData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${orderId}/report`, reportData, this.getHeaders());
    }

    validateQRCode(orderId: string, token: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${orderId}/validate-qr`, { token }, this.getHeaders());
    }

    initPayPalOrder(orders: any[]): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/api/pagos/crear-orden-paypal`, { orders }, this.getHeaders());
    }

    authorizePayPalOrder(orderID: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/authorize-paypal`, { orderID }, this.getHeaders());
    }
}
