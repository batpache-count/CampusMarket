import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private apiUrl = 'http://localhost:3000/api/notifications';

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token_utm');
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    getMyNotifications(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl, this.getHeaders());
    }

    markAsRead(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/read`, {}, this.getHeaders());
    }

    markAllAsRead(): Observable<any> {
        return this.http.put(`${this.apiUrl}/read-all`, {}, this.getHeaders());
    }
}
