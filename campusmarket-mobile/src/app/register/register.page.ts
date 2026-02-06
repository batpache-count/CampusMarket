import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  userData = {
    Nombre: '',
    Apellido_Paterno: '',
    Apellido_Materno: '',
    Email: '',
    Contrasena: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
  }

  async onRegister() {
    if (!this.userData.Nombre || !this.userData.Apellido_Paterno || !this.userData.Email || !this.userData.Contrasena) {
      this.showAlert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando cuenta...',
    });
    await loading.present();

    this.authService.register(this.userData).subscribe({
      next: async (res) => {
        await loading.dismiss();
        console.log('Registro exitoso', res);
        this.showToast('Cuenta creada exitosamente. Por favor inicia sesión.');
        this.router.navigate(['/login']);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Registro error', err);
        const msg = err.error?.message || err.message || 'No se pudo crear la cuenta.';
        this.showAlert('Error', msg);
      }
    });
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
}
