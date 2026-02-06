import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
  }

  async onLogin() {
    console.log('Attempting login with:', this.email);
    if (!this.email || !this.password) {
      this.showAlert('Error', 'Por favor ingresa correo y contraseña');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

    this.authService.login(this.email, this.password).subscribe({
      next: async (res) => {
        await loading.dismiss();
        console.log('Login exitoso', res);
        this.router.navigate(['/home']);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Login error', err);
        const errorMessage = err.error?.message || err.message || JSON.stringify(err);
        this.showAlert('Falló el inicio de sesión', `Error: ${errorMessage}. \nVerifica que el backend esté corriendo y tu celular conectado a la misma red (o usando adb reverse).`);
      }
    });
  }

  goToRegister() {
    console.log('Intentando navegar a /register');
    this.router.navigate(['/register'])
      .then(success => console.log('Navegación exitosa:', success))
      .catch(err => console.error('Error en navegación:', err));
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
