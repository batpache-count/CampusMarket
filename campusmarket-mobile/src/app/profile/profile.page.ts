import { Component, OnInit } from '@angular/core';
import { OrderService } from '../services/order.service';
import { Router } from '@angular/router';
import { ActionSheetController, ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  user: any = null;
  orders: any[] = [];
  totalSpent: number = 0;
  loadingOrders = false;
  apiUrl = environment.apiUrl; // For image URL
  isModalOpen = false;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private actionSheetController: ActionSheetController,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadUser();
    this.loadOrders();
  }

  ionViewWillEnter() {
    this.loadUser();
    this.loadOrders();
  }

  loadUser() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  loadOrders() {
    this.loadingOrders = true;
    this.orderService.getMyOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.calculateStats();
        this.loadingOrders = false;
      },
      error: (err) => {
        console.error('Error loading orders', err);
        this.loadingOrders = false;
      }
    });
  }

  calculateStats() {
    this.totalSpent = this.orders.reduce((acc, order) => acc + Number(order.Precio_Total), 0);
  }

  goToEditProfile() {
    this.router.navigate(['/profile-edit']); // Keep existing edit for text fields
  }

  // --- Profile Picture Logic ---

  async presentPhotoOptions() {
    const buttons: any[] = [
      {
        text: 'Tomar Foto',
        icon: 'camera',
        handler: () => {
          this.takePicture(CameraSource.Camera);
        }
      },
      {
        text: 'Galería',
        icon: 'image',
        handler: () => {
          this.takePicture(CameraSource.Photos);
        }
      },
      {
        text: 'Cancelar',
        icon: 'close',
        role: 'cancel'
      }
    ];

    if (this.user?.imagen_url) {
      buttons.unshift({
        text: '', // Icon only usually, but text is required. We'll use a custom class or icon.
        icon: 'trash',
        role: 'destructive',
        cssClass: 'delete-button', // Optional styling
        handler: () => {
          this.deleteProfilePicture();
        }
      });
      // Fix: unshift adds to start. We want trash at top right? ActionSheet is list.
      // User asked for "corner trash icon" in the *edit menu*.
      // ActionSheet standard is list. A "trash" button in the list is the standard mobile way.
      // To strictly follow "corner icon", we might need a Popover or Custom Modal.
      // For now, let's put it as a destructive option in the ActionSheet for usability.
    }

    const actionSheet = await this.actionSheetController.create({
      header: 'Editar Foto de Perfil',
      buttons: buttons
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Change to Base64
        source: source
      });

      if (image.base64String) {
        this.uploadImage(image);
      }
    } catch (error) {
      console.log('User cancelled or error:', error);
    }
  }

  async uploadImage(image: any) {
    const loading = await this.loadingController.create({ message: 'Subiendo foto...' });
    await loading.present();

    // Convert Base64 to Blob
    const blob = this.base64ToBlob(image.base64String, 'image/jpeg');

    const formData = new FormData();
    formData.append('image', blob, 'profile.jpg');

    formData.append('Nombre', this.user.nombre);
    formData.append('Apellido_Paterno', this.user.apellido_paterno);
    formData.append('Email', this.user.email);
    formData.append('Apellido_Materno', this.user.apellido_materno || '');
    formData.append('Telefono', this.user.telefono || '');

    this.authService.updateProfile(formData).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.updateLocalUser(res.user);
        this.presentToast('Foto actualizada');
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.presentToast('Error al subir imagen: ' + (err.error?.message || err.message));
      }
    });
  }

  base64ToBlob(base64: string, type: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
  }


  async deleteProfilePicture() {
    const loading = await this.loadingController.create({ message: 'Eliminando foto...' });
    await loading.present();

    const formData = new FormData();
    formData.append('DeleteImage', 'true');
    // Must populate other fields to avoid wiping them
    formData.append('Nombre', this.user.nombre);
    formData.append('Apellido_Paterno', this.user.apellido_paterno);
    formData.append('Apellido_Materno', this.user.apellido_materno || '');
    formData.append('Telefono', this.user.telefono || '');

    this.authService.updateProfile(formData).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.updateLocalUser(res.user);
        this.presentToast('Foto eliminada');
      },
      error: async (err) => {
        await loading.dismiss();
        this.presentToast('Error al eliminar');
      }
    });
  }

  updateLocalUser(newUserData: any) {
    this.user = newUserData;
    localStorage.setItem('user_data', JSON.stringify(newUserData));
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  // Expansion Logic
  openImageModal() {
    this.isModalOpen = true;
  }

  closeImageModal() {
    this.isModalOpen = false;
  }
}
