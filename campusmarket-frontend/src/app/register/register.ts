import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './register.html',
    styleUrls: ['./register.css']
})
export class Register {
    user = {
        Nombre: '',
        Apellido_Paterno: '',
        Apellido_Materno: '',
        Email: '',
        Telefono: '',
        Contrasena: '',
        Rol: 'Comprador' // Default role
    };
    confirmPassword = '';
    errorMessage = '';

    constructor(private authService: AuthService, private router: Router) { }

    onRegister() {
        if (this.user.Contrasena !== this.confirmPassword) {
            this.errorMessage = 'Las contraseñas no coinciden';
            return;
        }

        this.authService.register(this.user).subscribe({
            next: () => {
                alert('Registro exitoso. ¡Ahora puedes iniciar sesión!');
                this.router.navigate(['/login']);
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Error al registrarse. Intenta de nuevo.';
            }
        });
    }
}
