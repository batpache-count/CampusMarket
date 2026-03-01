import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./cart/cart.module').then(m => m.CartPageModule)
  },
  {
    path: 'product-detail/:id',
    loadChildren: () => import('./product-detail/product-detail.module').then(m => m.ProductDetailPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then(m => m.SettingsPageModule)
  },
  {
    path: 'profile-edit',
    loadChildren: () => import('./profile-edit/profile-edit.module').then(m => m.ProfileEditPageModule)
  },
  {
    path: 'orders',
    children: [
      {
        path: 'order-list',
        loadChildren: () => import('./orders/order-list/order-list.module').then(m => m.OrderListPageModule)
      },
      {
        path: 'order-detail/:id',
        loadChildren: () => import('./orders/order-detail/order-detail.module').then(m => m.OrderDetailPageModule)
      },
      {
        path: 'order-report/:id',
        loadChildren: () => import('./orders/order-report/order-report.module').then(m => m.OrderReportPageModule)
      }
    ]
  },
  {
    path: 'notifications',
    loadChildren: () => import('./notifications/notifications.module').then(m => m.NotificationsPageModule)
  },
  {
    path: 'favorites',
    loadChildren: () => import('./favorites/favorites.module').then(m => m.FavoritesPageModule)
  },
  {
    path: 'seller-products',
    loadChildren: () => import('./seller-products/seller-products.module').then(m => m.SellerProductsPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },
  {
    path: 'my-products',
    loadChildren: () => import('./my-products/my-products.module').then(m => m.MyProductsPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },
  {
    path: 'product-editor/:id',
    loadChildren: () => import('./product-editor/product-editor.module').then(m => m.ProductEditorPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },
  {
    path: 'seller-dashboard',
    loadChildren: () => import('./seller-dashboard/seller-dashboard.module').then(m => m.SellerDashboardPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },
  {
    path: 'location-editor/:id',
    loadChildren: () => import('./location-editor/location-editor.module').then(m => m.LocationEditorPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },
  {
    path: 'order-config/:itemId',
    loadChildren: () => import('./order-config/order-config.module').then(m => m.OrderConfigPageModule)
  },
  {
    path: 'seller-stats-detail',
    loadChildren: () => import('./seller-stats-detail/seller-stats-detail.module').then(m => m.SellerStatsDetailPageModule),
    canActivate: [RoleGuard],
    data: { expectedRole: 'Vendedor' }
  },



];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
