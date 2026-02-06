// Interfaz de Usuario (Basada en tu User.js)
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'comprador' | 'vendedor';
}

// Interfaz de Ubicación (Basada en tu Ubicacion.js - ¡Vital para la UTM!)
export interface Ubicacion {
  id: number;
  nombre: string; // Ej: "Biblioteca", "Cafetería", "Edificio K"
}

// Interfaz de Producto (Basada en tu Product.js)
export interface Product {
  id: number;
  nombre: string;       // Ojo: revisa si en tu DB es 'nombre' o 'title'
  descripcion: string;
  precio: number;
  imagenUrl: string;    // La URL de la foto
  stock: number;
  vendedorId: number;
  ubicacionId: number;  // Para saber dónde se entrega
  categoria: string;    // Ej: "Libros", "Electrónica"
}