import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../services/theme.service'; // Import ThemeService

@Component({
  selector: 'app-buyer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './buyer-profile.html',
  styleUrls: ['./buyer-profile.css']
})
export class BuyerProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  user: any = {};
  activeTab = 'general';

  profilePhotoUrl: string = 'https://ui-avatars.com/api/?name=Alumno+UTM&background=0D8ABC&color=fff';
  currentTheme: string; // Add currentTheme property

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService // Inject ThemeService
  ) {
    this.profileForm = this.fb.group({
      nombre: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      telefono: ['', [Validators.pattern('^[0-9]{10}$')]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.currentTheme = this.themeService.getTheme(); // Initialize currentTheme
  }

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    // Intentar cargar datos actualizados del login
    const userData = localStorage.getItem('user_data');
    const savedProfile = localStorage.getItem('buyer_profile');

    if (userData) {
      const parsedUser = JSON.parse(userData);
      this.user = {
        nombre: parsedUser.nombre,
        email: parsedUser.email,
        telefono: parsedUser.telefono || ''
      };
    } else if (savedProfile) {
      this.user = JSON.parse(savedProfile);
    } else {
      this.user = {
        nombre: 'Usuario',
        email: 'usuario@utm.edu.mx',
        telefono: ''
      };
    }

    this.profileForm.patchValue(this.user);

    if (this.user.photoUrl) {
      this.profilePhotoUrl = this.user.photoUrl;
    }
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePhotoUrl = e.target.result;
        this.user.photoUrl = this.profilePhotoUrl;
        this.saveToStorage();
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfile() {
    if (this.profileForm.valid) {
      this.user = { ...this.user, ...this.profileForm.value };

      if (this.profilePhotoUrl.includes('ui-avatars.com')) {
        this.profilePhotoUrl = `https://ui-avatars.com/api/?name=${this.user.nombre}&background=0D8ABC&color=fff`;
        this.user.photoUrl = this.profilePhotoUrl;
      }

      this.saveToStorage();

      alert('✅ Datos actualizados correctamente');
    }
  }

  saveToStorage() {
    localStorage.setItem('buyer_profile', JSON.stringify(this.user));
  }

  changePassword() {
    if (this.passwordForm.valid) {
      if (this.passwordForm.get('newPassword')?.value !== this.passwordForm.get('confirmPassword')?.value) {
        alert('❌ Las contraseñas no coinciden');
        return;
      }
      alert('🔒 Contraseña actualizada');
      this.passwordForm.reset();
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }
}
