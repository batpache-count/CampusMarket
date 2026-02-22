import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-product-editor',
  templateUrl: './product-editor.page.html',
  styleUrls: ['./product-editor.page.scss'],
  standalone: false
})
export class ProductEditorPage implements OnInit {
  mode: 'create' | 'edit' = 'create';
  productId: number | null = null;

  product = {
    Nombre: '',
    Descripcion: '',
    Precio: null as number | null,
    Stock: null as number | null,
    ID_Categoria: null as number | null
  };

  selectedImage: any = null;
  selectedImageWebPath: string | null = null;
  currentImageUrl: string | null = null;

  categories: any[] = [];
  apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.mode = 'edit';
      this.productId = +id;
      this.loadProduct(this.productId);
    }
  }

  loadCategories() {
    this.productService.getCategories().subscribe(cats => {
      this.categories = cats;
    });
  }

  async loadProduct(id: number) {
    const loading = await this.loadingController.create({ message: 'Cargando...' });
    await loading.present();

    this.productService.getProductById(id).subscribe({
      next: async (data) => {
        await loading.dismiss();
        this.product = {
          Nombre: data.Nombre,
          Descripcion: data.Descripcion,
          Precio: data.Precio,
          Stock: data.Stock,
          ID_Categoria: data.ID_Categoria
        };
        this.currentImageUrl = data.Imagen_URL ? `${this.apiUrl}/uploads/${data.Imagen_URL}` : null;
      },
      error: async (err) => {
        await loading.dismiss();
        this.presentToast('Error al cargar producto');
        this.router.navigate(['/seller-dashboard']);
      }
    });
  }

  async selectImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt // Preguntar Cámara o Galería
      });

      this.selectedImageWebPath = image.webPath || null;

      // Para enviar al backend, necesitamos convertir a Blob
      const response = await fetch(image.webPath!);
      const blob = await response.blob();
      this.selectedImage = blob;

    } catch (error) {
      console.log('Selección de imagen cancelada o fallida', error);
    }
  }

  async saveProduct() {
    if (!this.product.Nombre || !this.product.Precio || !this.product.ID_Categoria) {
      this.presentToast('Por favor completa los campos obligatorios');
      return;
    }

    if (this.mode === 'create' && !this.selectedImage) {
      this.presentToast('La imagen es obligatoria para nuevos productos');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Guardando...' });
    await loading.present();

    const formData = new FormData();
    formData.append('Nombre', this.product.Nombre);
    formData.append('Descripcion', this.product.Descripcion || '');
    formData.append('Precio', this.product.Precio!.toString()); // Ensure not null
    formData.append('Stock', (this.product.Stock || 0).toString());
    formData.append('ID_Categoria', this.product.ID_Categoria!.toString());

    if (this.selectedImage) {
      formData.append('image', this.selectedImage, `product-${new Date().getTime()}.jpg`);
    }

    let observable;
    if (this.mode === 'create') {
      observable = this.productService.createProduct(formData);
    } else {
      observable = this.productService.updateProduct(this.productId!, formData);
    }

    observable.subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Producto guardado exitosamente');
        this.router.navigate(['/seller-dashboard']);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Save Product Error:', err);
        const errorMsg = err.error?.message || err.message || 'Error desconocido';
        this.presentToast(`Error al guardar: ${errorMsg}`);
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
