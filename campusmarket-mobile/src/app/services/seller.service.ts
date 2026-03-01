import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SellerService {
    private apiUrl = environment.apiUrl + '/api/seller';

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    getDashboardStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/stats`, this.getHeaders());
    }

    getAdvancedStats(period: string = 'week'): Observable<any> {
        return this.http.get(`${this.apiUrl}/stats/advanced?period=${period}`, this.getHeaders());
    }

    getProfile(): Observable<any> {
        return this.http.get(`${this.apiUrl}/profile`, this.getHeaders());
    }

    uploadBanner(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/upload-banner`, formData, this.getHeaders());
    }

    updateProfile(profileData: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/profile`, profileData, this.getHeaders());
    }
}
