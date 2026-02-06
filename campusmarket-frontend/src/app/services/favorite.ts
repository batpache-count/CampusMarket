import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FavoriteService {
    private apiUrl = 'http://localhost:3000/api/products';

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token_utm');
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    getFavorites(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my/favorites`, this.getHeaders());
    }

    toggleFavorite(productId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${productId}/favorite`, {}, this.getHeaders());
    }
}
