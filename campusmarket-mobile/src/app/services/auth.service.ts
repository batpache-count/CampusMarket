import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/api/auth`;
    private currentUserSubject = new BehaviorSubject<any>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        const savedUser = localStorage.getItem('user_data');
        if (savedUser) {
            this.currentUserSubject.next(JSON.parse(savedUser));
        }
    }

    login(email: string, contrasena: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/login`, { Email: email, Contrasena: contrasena }).pipe(
            tap((response: any) => {
                if (response.token) {
                    localStorage.setItem('token', response.token);
                }
                if (response.user) {
                    localStorage.setItem('user_data', JSON.stringify(response.user));
                    this.currentUserSubject.next(response.user);
                }
            })
        );
    }

    register(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, userData);
    }

    updateProfile(userData: any): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
            // No Content-Type for FormData, Angular sets it automatically with boundary
        });
        return this.http.put(`${this.apiUrl}/profile`, userData, { headers });
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        this.currentUserSubject.next(null);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    getCurrentUser() {
        return this.currentUserSubject.value;
    }

    changePassword(currentPassword: string, newPassword: string): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.post(`${this.apiUrl}/change-password`, { currentPassword, newPassword }, { headers });
    }
}
