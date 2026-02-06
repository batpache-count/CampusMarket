import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onLogin() {
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        console.log('Login exitoso, Usuario:', res.user); // Para ver en consola qué rol traes

        // Guardamos el rol en la memoria por si lo necesitamos luego
        localStorage.setItem('user_role', res.user.rol);

        // --- AQUÍ ESTÁ LA MAGIA ---
        // Revisamos el Rol que viene de la base de datos
        if (res.user.rol === 'Vendedor') {
          console.log("Es vendedor, yendo al panel...");
          this.router.navigate(['/seller']); // Redirige al Dashboard
        } else {
          console.log("Es comprador, yendo a la tienda...");
          this.router.navigate(['/home']); // Redirige al Home
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Correo o contraseña incorrectos 🚫';
      }
    });
  }
}