import { Component, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-my-products',
  templateUrl: './my-products.page.html',
  styleUrls: ['./my-products.page.scss'],
  standalone: false
})
export class MyProductsPage implements OnInit {
  products: any[] = [];
  loading = true;
  apiUrl = environment.apiUrl;

  constructor(
    private productService: ProductService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadInventory();
  }

  loadInventory() {
    this.loading = true;
    this.productService.getMyInventory().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.presentToast('Error al cargar inventario');
      }
    });
  }

  addProduct() {
    this.router.navigate(['/product-editor/new']);
  }

  editProduct(id: number) {
    this.router.navigate(['/product-editor', id]);
  }

  async toggleStatus(product: any) {
    const action = product.Activo ? 'desactivar' : 'publicar';
    const alert = await this.alertController.create({
      header: `¿${product.Activo ? 'Desactivar' : 'Publicar'} producto?`,
      message: `¿Estás seguro de que quieres ${action} "${product.Nombre}"? ${product.Activo ? 'Ya no será visible para los compradores.' : 'Será visible para todos.'}`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: product.Activo ? 'Desactivar' : 'Publicar',
          handler: () => {
            this.performToggleStatus(product);
          }
        }
      ]
    });
    await alert.present();
  }

  async performToggleStatus(product: any) {
    const loading = await this.loadingController.create({ message: 'Actualizando...' });
    await loading.present();

    const formData = new FormData();
    formData.append('Activo', (!product.Activo).toString()); // Toggle status

    // We must ensure we don't accidentally wipe other fields if the backend required them.
    // However, our backend update logic uses `...req.body` and only updates present fields.
    // But wait, the backend endpoint expects specific fields? 
    // updateProduct in controller: "const updateData = { ...req.body }; ... if (updateData.Nombre) ..."
    // So sending JUST Activo is fine.

    this.productService.updateProduct(product.ID_Producto, formData).subscribe({
      next: async () => {
        await loading.dismiss();
        product.Activo = !product.Activo; // Optimistic update
        this.presentToast(`Producto ${product.Activo ? 'publicado' : 'desactivado'}`);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.presentToast('Error al actualizar estado');
      }
    });
  }

  async deleteProduct(id: number, name: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar "${name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.performDelete(id);
          }
        }
      ]
    });
    await alert.present();
  }

  async performDelete(id: number) {
    const loading = await this.loadingController.create({ message: 'Eliminando...' });
    await loading.present();

    this.productService.deleteProduct(id).subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Producto eliminado');
        this.loadInventory();
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.presentToast('Error al eliminar');
      }
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
