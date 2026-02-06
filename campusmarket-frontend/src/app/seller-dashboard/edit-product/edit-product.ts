import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-product.html',
  styleUrls: ['./edit-product.css']
})
export class EditProductComponent implements OnInit {
  productForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  isSubmitting = false;
  productId: number = 0;
  categories: any[] = [];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      stock: [1, [Validators.required, Validators.min(1)]],
      category: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.productService.getCategories().subscribe(cats => {
      this.categories = cats;
    });

    this.productId = this.route.snapshot.params['id'];
    this.productService.getProductById(this.productId).subscribe(product => {
      this.productForm.patchValue({
        name: product.Nombre,
        description: product.Descripcion,
        price: product.Precio,
        stock: product.Stock,
        category: product.ID_Categoria
      });
      if (product.Imagen_URL) {
        this.imagePreview = `http://localhost:3000/uploads/${product.Imagen_URL}`;
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
    if (this.productForm.invalid) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.isSubmitting = true;
    const formData = new FormData();
    
    formData.append('Nombre', this.productForm.get('name')?.value);
    formData.append('Descripcion', this.productForm.get('description')?.value);
    formData.append('Precio', this.productForm.get('price')?.value);
    formData.append('Stock', this.productForm.get('stock')?.value);
    formData.append('ID_Categoria', this.productForm.get('category')?.value);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: (res: any) => {
        alert('✅ Producto actualizado exitosamente');
        this.router.navigate(['/seller']);
      },
      error: (err: any) => {
        console.error(err);
        const msg = err.error?.message || 'Error desconocido';
        alert('❌ Error al actualizar: ' + msg);
        this.isSubmitting = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/seller']);
  }
}
