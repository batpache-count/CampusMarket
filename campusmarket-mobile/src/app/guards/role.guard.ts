import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const user = this.authService.getCurrentUser();
        const expectedRole = route.data['expectedRole'];

        if (user && user.rol === expectedRole) {
            return true;
        }

        // Redirect to home if unauthorized
        this.router.navigate(['/home']);
        return false;
    }
}
