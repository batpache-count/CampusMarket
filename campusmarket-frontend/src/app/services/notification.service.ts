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

    getUnreadCount(): Observable<number> {
        // Endpoint simplificado o filtro en frontend
        // Idealmente el backend podría dar este dato directo
        return new Observable(observer => {
            this.getMyNotifications().subscribe({
                next: (notifs) => {
                    const count = notifs.filter(n => !n.Leida).length;
                    observer.next(count);
                },
                error: (err) => observer.error(err)
            });
        });
    }

    markAsRead(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/read`, {}, this.getHeaders());
    }

    markAllAsRead(): Observable<any> {
        return this.http.put(`${this.apiUrl}/read-all`, {}, this.getHeaders());
    }
}
