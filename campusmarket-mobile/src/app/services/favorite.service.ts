import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FavoriteService {
    private apiUrl = `${environment.apiUrl}/api/products`;

    constructor(private http: HttpClient) { }

    getFavorites(): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.get(`${this.apiUrl}/my/favorites`, { headers });
    }

    toggleFavorite(productId: number): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.post(`${this.apiUrl}/${productId}/favorite`, {}, { headers });
    }
}
