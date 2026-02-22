import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { LocationService } from '../services/location.service';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-order-config',
    templateUrl: './order-config.page.html',
    styleUrls: ['./order-config.page.scss'],
    standalone: false
})
export class OrderConfigPage implements OnInit {
    apiUrl = environment.apiUrl;
    item: any;
    availableLocations: any[] = [];
    availableDays: string[] = [];

    // Configuration (Models)
    selectedPaymentMethod: string = 'Efectivo';
    selectedLocation: any = null;
    selectedDay: string = '';
    selectedTime: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cartService: CartService,
        private locationService: LocationService
    ) { }

    ngOnInit() {
        const itemId = this.route.snapshot.paramMap.get('itemId');
        if (itemId) {
            this.loadItem(Number(itemId));
        } else {
            this.router.navigate(['/cart']);
        }
    }

    loadItem(id: number) {
        const cartItems = this.cartService.getItems();
        this.item = cartItems.find(i => i.id === id);

        if (!this.item) {
            this.router.navigate(['/cart']);
            return;
        }

        // Load existing config if any
        if (this.item.selectedPaymentMethod) this.selectedPaymentMethod = this.item.selectedPaymentMethod;
        if (this.item.selectedLocation) {
            // Need to wait for locations to load to match object reference or ID
        }
        if (this.item.selectedDay) this.selectedDay = this.item.selectedDay;
        if (this.item.selectedTime) this.selectedTime = this.item.selectedTime;

        this.loadLocations(this.item.ID_Vendedor);
    }

    loadLocations(vendorId: number) {
        this.locationService.getVendorLocations(vendorId).subscribe({
            next: (data) => {
                this.availableLocations = data;
                // Restore selected location object reference
                if (this.item.selectedLocation) {
                    this.selectedLocation = this.availableLocations.find(l => l.ID_Ubicacion === this.item.selectedLocation.ID_Ubicacion);
                    this.onLocationChange(); // Trigger day update
                    // Restore day and time
                    if (this.item.selectedDay) {
                        this.selectedDay = this.item.selectedDay;
                        this.onDayChange();
                    }
                    if (this.item.selectedTime) this.selectedTime = this.item.selectedTime;
                }
            }
        });
    }

    onLocationChange() {
        this.selectedDay = '';
        this.selectedTime = '';
        this.availableDays = [];

        if (this.selectedLocation && this.selectedLocation.Dias_Disponibles) {
            if (typeof this.selectedLocation.Dias_Disponibles === 'string') {
                this.availableDays = this.selectedLocation.Dias_Disponibles.split(',');
            } else {
                this.availableDays = this.selectedLocation.Dias_Disponibles;
            }
        }
    }

    onDayChange() {
        // La hora se establece automáticamente según el rango del lugar
        if (this.selectedLocation) {
            this.selectedTime = `${this.selectedLocation.Hora_Inicio} - ${this.selectedLocation.Hora_Fin}`;
        }
    }

    saveConfig() {
        // Asegurar que selectedTime esté definido antes de guardar
        if (this.selectedLocation && !this.selectedTime) {
            this.selectedTime = `${this.selectedLocation.Hora_Inicio} - ${this.selectedLocation.Hora_Fin}`;
        }

        if (!this.selectedLocation || !this.selectedDay) {
            alert('Por favor completa todos los campos de entrega.');
            return;
        }

        const config = {
            selectedPaymentMethod: this.selectedPaymentMethod,
            selectedLocation: this.selectedLocation,
            selectedDay: this.selectedDay,
            selectedTime: this.selectedTime
        };

        this.cartService.updateItemConfig(this.item.id, config);
        this.router.navigate(['/cart']);
    }
}
