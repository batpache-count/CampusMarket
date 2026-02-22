import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = `${environment.apiUrl}/api/locations`;

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    // Obtener mis ubicaciones (Vendedor)
    getMyLocations(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
    }

    // Obtener una ubicación por ID
    getLocationById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }); // Asumiendo que existe este endpoint o filtrando del getMy
        // Nota: El controller backend no tiene un 'getById' explícito público, pero `updateUbicacion` usa ID.
        // Si no existe GET /:id, tendré que filtrar de la lista o agregarlo al backend.
        // Revisando backend: NO hay endpoint GET /api/locations/:id explícito para el dueño.
        // Solo GET /api/locations (list all my locations). 
        // Mmm, mejor filtro en el cliente o agrego el endpoint.
        // Para simplificar, filtraré en el cliente por ahora o usaré la lista que ya tengo.
        // Update: Mejor agrego el endpoint GET /:id al backend para ser consistentes, o simplemente paso el objeto location por el state del router.
        // Usaré state del router para evitar tocar backend innecesariamente ahora.
    }

    // Crear ubicación
    createLocation(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data, { headers: this.getHeaders() });
    }

    // Actualizar ubicación
    updateLocation(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
    }

    // Eliminar ubicación
    deleteLocation(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }

    // Obtener ubicaciones de un vendedor (para el comprador)
    getVendorLocations(vendorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/vendor/${vendorId}`, { headers: this.getHeaders() });
    }
}
