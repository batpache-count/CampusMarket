import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class MetricService {
    private apiUrl = `${environment.apiUrl}/api/buyer/metrics`;

    constructor(private http: HttpClient) { }

    getBuyerMetrics(): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.get(this.apiUrl, { headers });
    }
}
