import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AddressService {
    private apiUrl = `${environment.apiUrl}/api/addresses`;

    constructor(private http: HttpClient) { }

    getAddresses(): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.get(this.apiUrl, { headers });
    }

    addAddress(address: any): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.post(this.apiUrl, address, { headers });
    }

    deleteAddress(id: number): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.delete(`${this.apiUrl}/${id}`, { headers });
    }
}
