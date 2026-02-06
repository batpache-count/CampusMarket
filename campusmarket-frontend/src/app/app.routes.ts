import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { Register } from './register/register'; // ✅ Importamos Register
import { ProductDetail } from './product-detail/product-detail';
import { Cart } from './cart/cart';
import { SellerDashboardComponent } from './seller-dashboard/seller-dashboard';
import { AddProductComponent } from './seller-dashboard/add-product/add-product';
import { EditProductComponent } from './seller-dashboard/edit-product/edit-product';
import { BuyerProfileComponent } from './buyer-profile/buyer-profile';
// ✅ Importamos el nuevo componente de historial
import { MyOrdersComponent } from './my-orders/my-orders';
import { Favorites } from './favorites/favorites';
import { Notifications } from './notifications/notifications';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register }, // ✅ Nueva ruta
  { path: 'product/:id', component: ProductDetail },
  { path: 'cart', component: Cart },
  { path: 'profile', component: BuyerProfileComponent },

  // ✅ NUEVAS RUTAS DE COMPRADOR
  { path: 'my-orders', component: MyOrdersComponent },
  { path: 'favorites', component: Favorites },
  { path: 'notifications', component: Notifications },

  { path: 'seller', component: SellerDashboardComponent },
  { path: 'seller/add-product', component: AddProductComponent },
  { path: 'seller/edit-product/:id', component: EditProductComponent },

  { path: '**', redirectTo: '' }
];