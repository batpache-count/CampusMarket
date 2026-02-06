import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private apiUrl = `${environment.apiUrl}/api/products`;

    constructor(private http: HttpClient) { }

    getProducts(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getProductById(id: number): Observable<any> {
        const token = localStorage.getItem('token');
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
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.post(this.apiUrl, productData, { headers });
    }

    updateProduct(id: number, productData: FormData): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.put(`${this.apiUrl}/${id}`, productData, { headers });
    }

    rateProduct(productId: number, rating: number, comment: string = ''): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.post(`${this.apiUrl}/${productId}/rate`, { rating, comment }, { headers });
    }

    getProductReviews(productId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/${productId}/reviews`);
    }
}
