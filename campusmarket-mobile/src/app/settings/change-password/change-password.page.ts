import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false
})
export class ChangePasswordPage {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private navCtrl: NavController
  ) { }

  async submit() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.presentToast('Por favor, completa todos los campos.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.presentToast('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (this.newPassword.length < 6) {
      this.presentToast('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.loading = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.presentToast('Contraseña actualizada exitosamente.');
        this.navCtrl.back();
      },
      error: (err: any) => {
        this.loading = false;
        console.error(err);
        this.presentToast(err.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom'
    });
    toast.present();
  }
}
