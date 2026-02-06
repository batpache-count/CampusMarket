import { Component, OnInit } from '@angular/core'; // Import OnInit
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-product.html',
  styleUrls: ['./add-product.css']
})
export class AddProductComponent implements OnInit { // Implement OnInit
  productForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  isSubmitting = false;

  categories: any[] = []; // Will be filled from the backend

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      stock: [1, [Validators.required, Validators.min(1)]],
      category: ['', Validators.required] // Changed default value
    });
  }

  ngOnInit() {
    this.productService.getCategories().subscribe(cats => {
      this.categories = cats;
      if (cats.length > 0) {
        this.productForm.get('category')?.setValue(cats[0].ID_Categoria);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result; };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.productForm.invalid || !this.selectedFile) {
      alert('Por favor completa todos los campos y selecciona una imagen.');
      return;
    }

    this.isSubmitting = true;
    const formData = new FormData();
    
    formData.append('Nombre', this.productForm.get('name')?.value);
    formData.append('Descripcion', this.productForm.get('description')?.value);
    formData.append('Precio', this.productForm.get('price')?.value);
    formData.append('Stock', this.productForm.get('stock')?.value);
    formData.append('ID_Categoria', this.productForm.get('category')?.value);
    formData.append('image', this.selectedFile);

    this.productService.createProduct(formData).subscribe({
      next: (res: any) => {
        alert('✅ Producto publicado exitosamente');
        this.router.navigate(['/seller']);
      },
      error: (err: any) => {
        console.error(err);
        const msg = err.error?.message || 'Error desconocido';
        alert('❌ Error al subir: ' + msg);
        this.isSubmitting = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/seller']);
  }
}
