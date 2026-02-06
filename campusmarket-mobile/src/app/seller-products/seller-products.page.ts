import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../services/product.service';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-seller-products',
    templateUrl: './seller-products.page.html',
    styleUrls: ['./seller-products.page.scss'],
    standalone: false,
})
export class SellerProductsPage implements OnInit {
    apiUrl = environment.apiUrl;
    products: any[] = [];
    sellerName: string = '';
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private productService: ProductService
    ) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.sellerName = params['name'] || 'el vendedor';
            this.loadSellerProducts(this.sellerName);
        });
    }

    loadSellerProducts(sellerName: string) {
        this.loading = true;
        this.productService.getProducts().subscribe({
            next: (data) => {
                // Filter by seller name (assuming 'Nombre_Tienda' or similar field matches)
                // Since we pass seller name, we filter by that.
                // Ideally we should use ID, but user request implies Name linkage or "Products of ..."
                // Let's check data structure in home or detail. 
                // In detail: product.Nombre_Tienda
                this.products = data.filter((p: any) => p.Nombre_Tienda === sellerName);
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }
}
