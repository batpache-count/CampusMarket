import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationService } from '../services/location.service'; // Adjust path if needed (usually ../services)
// Note: Generated page is in src/app/location-editor, so specific service path is ../services/location.service.ts
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-location-editor',
  templateUrl: './location-editor.page.html',
  styleUrls: ['./location-editor.page.scss'],
  standalone: false
})
export class LocationEditorPage implements OnInit {
  mode: 'create' | 'edit' = 'create';
  locationId: number | null = null;

  location = {
    Nombre_Ubicacion: '',
    Descripcion: '',
    Dias_Disponibles: [] as string[], // We will use array for UI, join for DB
    Hora_Inicio: '09:00',
    Hora_Fin: '18:00',
    Activa: true
  };

  daysOfWeek = [
    { name: 'Lunes', value: 'Lunes' },
    { name: 'Martes', value: 'Martes' },
    { name: 'Miércoles', value: 'Miércoles' },
    { name: 'Jueves', value: 'Jueves' },
    { name: 'Viernes', value: 'Viernes' },
    { name: 'Sábado', value: 'Sábado' },
    { name: 'Domingo', value: 'Domingo' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService, // Need to make sure this is imported correctly
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.mode = 'edit';
        this.locationId = +id;
        // Check if we have state passed from dashboard
        const nav = this.router.getCurrentNavigation();
        if (nav?.extras.state && nav.extras.state['location']) {
          this.setLocationData(nav.extras.state['location']);
        } else {
          // Fallback: Fetch from server? (Service doesn't have getById yet, but assume we added logic or filter)
          // Ideally we passed it. If not, maybe show error or fetch all and find.
          // For now, assume state was passed or user clicked from dashboard.
        }
      }
    });
  }

  setLocationData(data: any) {
    this.location.Nombre_Ubicacion = data.Nombre_Ubicacion;
    this.location.Descripcion = data.Descripcion;
    this.location.Activa = data.Activa;
    this.location.Hora_Inicio = data.Hora_Inicio || '09:00';
    this.location.Hora_Fin = data.Hora_Fin || '18:00';

    // Parse days
    if (data.Dias_Disponibles) {
      if (typeof data.Dias_Disponibles === 'string') {
        this.location.Dias_Disponibles = data.Dias_Disponibles.split(',');
      } else {
        // Already array? existing data might be different
        this.location.Dias_Disponibles = data.Dias_Disponibles;
      }
    }
  }

  async saveLocation() {
    if (!this.location.Nombre_Ubicacion) {
      this.presentToast('El nombre es obligatorio');
      return;
    }
    if (this.location.Dias_Disponibles.length === 0) {
      this.presentToast('Selecciona al menos un día');
      return;
    }

    const payload = {
      ...this.location,
      Dias_Disponibles: this.location.Dias_Disponibles.join(',') // Convert back to string for DB
    };

    const loading = await this.loadingController.create({ message: 'Guardando...' });
    await loading.present();

    if (this.mode === 'create') {
      this.locationService.createLocation(payload).subscribe({
        next: async () => {
          await loading.dismiss();
          this.presentToast('Punto de entrega creado');
          this.router.navigate(['/seller-dashboard']);
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.presentToast('Error al crear');
        }
      });
    } else {
      this.locationService.updateLocation(this.locationId!, payload).subscribe({
        next: async () => {
          await loading.dismiss();
          this.presentToast('Punto actualizado');
          this.router.navigate(['/seller-dashboard']);
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.presentToast('Error al actualizar');
        }
      });
    }
  }

  async presentToast(msg: string) {
    const toast = await this.toastController.create({ message: msg, duration: 2000 });
    toast.present();
  }
}
