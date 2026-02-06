import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
  standalone: false,
})
export class ProfileEditPage implements OnInit {
  user: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  saveProfile() {
    // Map to backend expected keys (Capitalized)
    const payload = {
      Nombre: this.user.nombre,
      Apellido_Paterno: this.user.apellido_paterno,
      Apellido_Materno: this.user.apellido_materno,
      Telefono: this.user.telefono,
      Email: this.user.email // Needed for some checks or just consistency
    };

    this.authService.updateProfile(payload).subscribe({
      next: async (res) => {
        // Update local storage with new user data
        // res.user returns lowercase keys, which matches our frontend model.
        localStorage.setItem('user_data', JSON.stringify(res.user));

        const toast = await this.toastController.create({
          message: 'Perfil actualizado correctamente',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        this.router.navigate(['/profile']);
      },
      error: async (err) => {
        console.error(err);
        const toast = await this.toastController.create({
          message: 'Error al actualizar perfil',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }
}
