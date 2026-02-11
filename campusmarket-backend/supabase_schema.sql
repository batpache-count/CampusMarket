-- Esquema de Base de Datos para CampusMarket (PostgreSQL / Supabase)

-- Habilitar extensión para UUIDs si se necesita (opcional, aquí usaremos SERIAL para IDs por compatibilidad)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla Usuario
CREATE TABLE IF NOT EXISTS public.usuario (
  "ID_Usuario" SERIAL PRIMARY KEY,
  "Nombre" TEXT NOT NULL,
  "Apellido_Paterno" TEXT NOT NULL,
  "Apellido_Materno" TEXT NOT NULL,
  "Email" TEXT NOT NULL UNIQUE,
  "Contrasena" TEXT NOT NULL,
  "Telefono" TEXT,
  "Rol" TEXT DEFAULT 'Comprador' CHECK ("Rol" IN ('Comprador', 'Vendedor', 'Admin')),
  "Imagen_URL" TEXT DEFAULT 'default-user.png',
  "Fecha_Registro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Vendedor (Perfil de vendedor)
CREATE TABLE IF NOT EXISTS public.vendedor (
  "ID_Vendedor" SERIAL PRIMARY KEY,
  "ID_Usuario" INTEGER NOT NULL UNIQUE REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "Nombre_Tienda" TEXT NOT NULL,
  "Descripcion_Tienda" TEXT,
  "Estado_Tienda" TEXT DEFAULT 'En Linea' CHECK ("Estado_Tienda" IN ('En Linea', 'Desconectado', 'Suspendido')),
  "Tiempo_Arrepentimiento_Min" INTEGER DEFAULT 5,
  "Tiempo_Retraso_Comida_Min" INTEGER DEFAULT 15
);

-- 3. Tabla Categoria
CREATE TABLE IF NOT EXISTS public.categoria (
  "ID_Categoria" SERIAL PRIMARY KEY,
  "Nombre" TEXT NOT NULL UNIQUE,
  "Descripcion" TEXT,
  "Imagen_URL" TEXT
);

-- 4. Tabla Producto
CREATE TABLE IF NOT EXISTS public.producto (
  "ID_Producto" SERIAL PRIMARY KEY,
  "ID_Vendedor" INTEGER NOT NULL REFERENCES public.vendedor("ID_Vendedor") ON DELETE CASCADE,
  "ID_Categoria" INTEGER NOT NULL REFERENCES public.categoria("ID_Categoria"),
  "Nombre" TEXT NOT NULL,
  "Descripcion" TEXT,
  "Precio" DECIMAL(10, 2) NOT NULL,
  "Stock" INTEGER NOT NULL DEFAULT 0,
  "Imagen_URL" TEXT DEFAULT 'no-image.jpg',
  "Activo" BOOLEAN DEFAULT TRUE,
  "Fecha_Creacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Ubicacion de Entrega
CREATE TABLE IF NOT EXISTS public.ubicacion_entrega (
  "ID_Ubicacion" SERIAL PRIMARY KEY,
  "ID_Vendedor" INTEGER NOT NULL REFERENCES public.vendedor("ID_Vendedor") ON DELETE CASCADE,
  "Nombre_Ubicacion" TEXT NOT NULL,
  "Descripcion" TEXT,
  "Activa" BOOLEAN DEFAULT TRUE
);

-- 6. Tabla Pedido
CREATE TABLE IF NOT EXISTS public.pedido (
  "ID_Pedido" SERIAL PRIMARY KEY,
  "ID_Comprador" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario"),
  "ID_Vendedor" INTEGER NOT NULL REFERENCES public.vendedor("ID_Vendedor"),
  "Estado_Pedido" TEXT DEFAULT 'Pendiente' CHECK ("Estado_Pedido" IN ('Pendiente', 'En preparacion', 'Listo', 'Entregado', 'Cancelado')),
  "Precio_Total" DECIMAL(10, 2) NOT NULL,
  "Metodo_Pago" TEXT DEFAULT 'Efectivo',
  "PayPal_Transaction_ID" TEXT,
  "QR_Token" TEXT,
  "Fecha_Creacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla Detalle Pedido
CREATE TABLE IF NOT EXISTS public.detalle_pedido (
  "ID_Detalle" SERIAL PRIMARY KEY,
  "ID_Pedido" INTEGER NOT NULL REFERENCES public.pedido("ID_Pedido") ON DELETE CASCADE,
  "ID_Producto" INTEGER NOT NULL REFERENCES public.producto("ID_Producto"),
  "Cantidad" INTEGER NOT NULL,
  "Precio_Unitario" DECIMAL(10, 2) NOT NULL
);

-- 8. Tabla Encuentro
CREATE TABLE IF NOT EXISTS public.encuentro (
  "ID_Encuentro" SERIAL PRIMARY KEY,
  "ID_Pedido" INTEGER NOT NULL REFERENCES public.pedido("ID_Pedido") ON DELETE CASCADE,
  "ID_Ubicacion" INTEGER NOT NULL REFERENCES public.ubicacion_entrega("ID_Ubicacion"),
  "Hora_Encuentro" TEXT 
);

-- 9. Tabla Notificacion
CREATE TABLE IF NOT EXISTS public.notificacion (
  "ID_Notificacion" SERIAL PRIMARY KEY,
  "ID_Usuario" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "Tipo" TEXT NOT NULL,
  "Mensaje" TEXT NOT NULL,
  "Leido" BOOLEAN DEFAULT FALSE,
  "ID_Referencia" INTEGER,
  "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla Favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
  "ID_Favorito" SERIAL PRIMARY KEY,
  "ID_Usuario" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "ID_Producto" INTEGER NOT NULL REFERENCES public.producto("ID_Producto") ON DELETE CASCADE,
  "Fecha_Agregado" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ID_Usuario", "ID_Producto")
);

-- 11. Tabla Carrito
CREATE TABLE IF NOT EXISTS public.carrito (
  "ID_Carrito" SERIAL PRIMARY KEY,
  "ID_Usuario" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "ID_Producto" INTEGER NOT NULL REFERENCES public.producto("ID_Producto") ON DELETE CASCADE,
  "Cantidad" INTEGER NOT NULL DEFAULT 1,
  "Fecha_Agregado" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ID_Usuario", "ID_Producto")
);

-- 12. Tabla Calificacion (Vendedor)
CREATE TABLE IF NOT EXISTS public.calificacion (
  "ID_Calificacion" SERIAL PRIMARY KEY,
  "ID_Usuario" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "ID_Producto" INTEGER NOT NULL REFERENCES public.producto("ID_Producto") ON DELETE CASCADE,
  "Puntuacion" INTEGER NOT NULL CHECK ("Puntuacion" BETWEEN 1 AND 5),
  "Comentario" TEXT,
  "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ID_Producto", "ID_Usuario")
);

-- 13. Tabla Calificacion Producto
CREATE TABLE IF NOT EXISTS public.calificacion_producto (
  "ID_Calificacion" SERIAL PRIMARY KEY,
  "ID_Producto" INTEGER NOT NULL REFERENCES public.producto("ID_Producto") ON DELETE CASCADE,
  "ID_Usuario" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario") ON DELETE CASCADE,
  "Puntuacion" INTEGER NOT NULL CHECK ("Puntuacion" BETWEEN 1 AND 5),
  "Comentario" TEXT,
  "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ID_Producto", "ID_Usuario")
);

-- 14. Historial Pedido
CREATE TABLE IF NOT EXISTS public.historial_pedido (
  "ID_Historial" SERIAL PRIMARY KEY,
  "ID_Pedido" INTEGER NOT NULL REFERENCES public.pedido("ID_Pedido") ON DELETE CASCADE,
  "Estado_Anterior" TEXT,
  "Estado_Nuevo" TEXT,
  "Actor" TEXT, 
  "Fecha_Cambio" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserción de Categorías por defecto
INSERT INTO public.categoria ("Nombre", "Descripcion") VALUES 
('Comida', 'Alimentos preparados y snacks'),
('Postres', 'Dulces, pasteles y galletas'),
('Bebidas', 'Jugos, refrescos y agua'),
('Papelería', 'Útiles escolares y material de oficina'),
('Ropa', 'Prendas de vestir y accesorios'),
('Tecnología', 'Gadgets, cables y accesorios electrónicos'),
('Otros', 'Artículos variados')
ON CONFLICT ("Nombre") DO NOTHING;
