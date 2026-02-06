import { Component, OnInit } from '@angular/core';
import { AddressService } from '../../services/address.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-addresses',
  templateUrl: './addresses.page.html',
  styleUrls: ['./addresses.page.scss'],
  standalone: false
})
export class AddressesPage implements OnInit {
  addresses: any[] = [];
  loading = true;
  isModalOpen = false;
  saving = false;

  newAddress = {
    Titulo: '',
    Calle: '',
    Referencias: ''
  };

  constructor(
    private addressService: AddressService,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadAddresses();
  }

  loadAddresses() {
    this.loading = true;
    this.addressService.getAddresses().subscribe({
      next: (data) => {
        this.addresses = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  openAddModal() {
    this.newAddress = { Titulo: '', Calle: '', Referencias: '' };
    this.isModalOpen = true;
  }

  async saveAddress() {
    if (!this.newAddress.Titulo || !this.newAddress.Calle) {
      this.presentToast('Por favor, completa los campos requeridos.');
      return;
    }

    this.saving = true;
    this.addressService.addAddress(this.newAddress).subscribe({
      next: () => {
        this.saving = false;
        this.isModalOpen = false;
        this.loadAddresses();
        this.presentToast('Dirección guardada correctamente.');
      },
      error: (err) => {
        this.saving = false;
        this.presentToast('Error al guardar la dirección.');
      }
    });
  }

  async deleteAddress(id: number) {
    const alert = await this.alertController.create({
      header: 'Eliminar Dirección',
      message: '¿Estás seguro de eliminar esta dirección?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: () => {
            this.addressService.deleteAddress(id).subscribe({
              next: () => {
                this.loadAddresses();
                this.presentToast('Dirección eliminada.');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({ message, duration: 2000 });
    toast.present();
  }
}
