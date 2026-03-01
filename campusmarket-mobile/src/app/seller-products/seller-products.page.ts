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
    sellerDescription: string = '';
    sellerBanner: string = '';
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
                this.products = data.filter((p: any) => p.Nombre_Tienda === sellerName);
                if (this.products.length > 0) {
                    this.sellerDescription = this.products[0].Descripcion_Tienda;
                    this.sellerBanner = this.products[0].Banner_URL;
                }
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    getImageUrl(url: string | null | undefined, placeholder: string = 'assets/placeholder.svg'): string {
        if (!url) return placeholder;
        if (url.startsWith('http')) return url;
        return `${this.apiUrl}/uploads/${url}`;
    }
}
