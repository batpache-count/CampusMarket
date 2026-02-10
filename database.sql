-- Esquema de Base de Datos para CampusMarket
-- Generado para despliegue en producción

CREATE DATABASE IF NOT EXISTS `campusmarket_db`;
USE `campusmarket_db`;

-- 1. Tabla Usuario
CREATE TABLE IF NOT EXISTS `usuario` (
  `ID_Usuario` INT AUTO_INCREMENT PRIMARY KEY,
  `Nombre` VARCHAR(100) NOT NULL,
  `Apellido_Paterno` VARCHAR(100) NOT NULL,
  `Apellido_Materno` VARCHAR(100) NOT NULL,
  `Email` VARCHAR(150) NOT NULL UNIQUE,
  `Contrasena` VARCHAR(255) NOT NULL,
  `Telefono` VARCHAR(20),
  `Rol` ENUM('Comprador', 'Vendedor', 'Admin') DEFAULT 'Comprador',
  `Imagen_URL` VARCHAR(255) DEFAULT 'default-user.png',
  `Fecha_Registro` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Vendedor (Perfil de vendedor)
CREATE TABLE IF NOT EXISTS `vendedor` (
  `ID_Vendedor` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Usuario` INT NOT NULL UNIQUE,
  `Nombre_Tienda` VARCHAR(100) NOT NULL,
  `Descripcion_Tienda` TEXT,
  `Estado_Tienda` ENUM('En Linea', 'Desconectado', 'Suspendido') DEFAULT 'En Linea',
  `Tiempo_Arrepentimiento_Min` INT DEFAULT 5,
  `Tiempo_Retraso_Comida_Min` INT DEFAULT 15,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE
);

-- 3. Tabla Categoria
CREATE TABLE IF NOT EXISTS `categoria` (
  `ID_Categoria` INT AUTO_INCREMENT PRIMARY KEY,
  `Nombre` VARCHAR(100) NOT NULL UNIQUE,
  `Descripcion` TEXT,
  `Imagen_URL` VARCHAR(255)
);

-- 4. Tabla Producto
CREATE TABLE IF NOT EXISTS `producto` (
  `ID_Producto` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Vendedor` INT NOT NULL,
  `ID_Categoria` INT NOT NULL,
  `Nombre` VARCHAR(150) NOT NULL,
  `Descripcion` TEXT,
  `Precio` DECIMAL(10, 2) NOT NULL,
  `Stock` INT NOT NULL DEFAULT 0,
  `Imagen_URL` VARCHAR(255) DEFAULT 'no-image.jpg',
  `Activo` BOOLEAN DEFAULT TRUE,
  `Fecha_Creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Vendedor`) REFERENCES `vendedor`(`ID_Vendedor`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Categoria`) REFERENCES `categoria`(`ID_Categoria`)
);

-- 5. Tabla Ubicacion de Entrega (Puntos definidos por el vendedor)
CREATE TABLE IF NOT EXISTS `ubicacion_entrega` (
  `ID_Ubicacion` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Vendedor` INT NOT NULL,
  `Nombre_Ubicacion` VARCHAR(150) NOT NULL,
  `Descripcion` TEXT,
  `Activa` BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (`ID_Vendedor`) REFERENCES `vendedor`(`ID_Vendedor`) ON DELETE CASCADE
);

-- 6. Tabla Pedido
CREATE TABLE IF NOT EXISTS `pedido` (
  `ID_Pedido` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Comprador` INT NOT NULL,
  `ID_Vendedor` INT NOT NULL,
  `Estado_Pedido` ENUM('Pendiente', 'En preparacion', 'Listo', 'Entregado', 'Cancelado') DEFAULT 'Pendiente',
  `Precio_Total` DECIMAL(10, 2) NOT NULL,
  `Metodo_Pago` VARCHAR(50) DEFAULT 'Efectivo',
  `PayPal_Transaction_ID` VARCHAR(255),
  `QR_Token` VARCHAR(255),
  `Fecha_Creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Comprador`) REFERENCES `usuario`(`ID_Usuario`),
  FOREIGN KEY (`ID_Vendedor`) REFERENCES `vendedor`(`ID_Vendedor`)
);

-- 7. Tabla Detalle Pedido
CREATE TABLE IF NOT EXISTS `detalle_pedido` (
  `ID_Detalle` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Pedido` INT NOT NULL,
  `ID_Producto` INT NOT NULL,
  `Cantidad` INT NOT NULL,
  `Precio_Unitario` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`ID_Pedido`) REFERENCES `pedido`(`ID_Pedido`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Producto`) REFERENCES `producto`(`ID_Producto`)
);

-- 8. Tabla Encuentro (Donde y cuando se entrega el pedido)
CREATE TABLE IF NOT EXISTS `encuentro` (
  `ID_Encuentro` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Pedido` INT NOT NULL,
  `ID_Ubicacion` INT NOT NULL,
  `Hora_Encuentro` VARCHAR(50), 
  FOREIGN KEY (`ID_Pedido`) REFERENCES `pedido`(`ID_Pedido`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Ubicacion`) REFERENCES `ubicacion_entrega`(`ID_Ubicacion`)
);

-- 9. Tabla Notificacion
CREATE TABLE IF NOT EXISTS `notificacion` (
  `ID_Notificacion` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Usuario` INT NOT NULL,
  `Tipo` VARCHAR(50) NOT NULL,
  `Mensaje` TEXT NOT NULL,
  `Leido` BOOLEAN DEFAULT FALSE,
  `ID_Referencia` INT,
  `Fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE
);

-- 10. Tabla Favoritos
CREATE TABLE IF NOT EXISTS `favoritos` (
  `ID_Favorito` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Usuario` INT NOT NULL,
  `ID_Producto` INT NOT NULL,
  `Fecha_Agregado` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Producto`) REFERENCES `producto`(`ID_Producto`) ON DELETE CASCADE,
  UNIQUE KEY `unique_fav` (`ID_Usuario`, `ID_Producto`)
);

-- 11. Tabla Carrito
CREATE TABLE IF NOT EXISTS `carrito` (
  `ID_Carrito` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Usuario` INT NOT NULL,
  `ID_Producto` INT NOT NULL,
  `Cantidad` INT NOT NULL DEFAULT 1,
  `Fecha_Agregado` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Producto`) REFERENCES `producto`(`ID_Producto`) ON DELETE CASCADE,
  UNIQUE KEY `unique_item` (`ID_Usuario`, `ID_Producto`)
);

-- 12. Tabla Calificacion (Vendedor)
CREATE TABLE IF NOT EXISTS `calificacion` (
  `ID_Calificacion` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Usuario` INT NOT NULL,
  `ID_Producto` INT NOT NULL, -- Nota: Originalmente el script crea FK a producto pero nombre sugiere calificar vendedor?
  -- Ajustado a create_ratings_table.js original que liga a Producto y Usuario
  `Puntuacion` INT NOT NULL CHECK (`Puntuacion` BETWEEN 1 AND 5),
  `Comentario` TEXT,
  `Fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Producto`) REFERENCES `producto`(`ID_Producto`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE,
  UNIQUE KEY `unique_rating` (`ID_Producto`, `ID_Usuario`)
);

-- 13. Tabla Calificacion Producto
CREATE TABLE IF NOT EXISTS `calificacion_producto` (
  `ID_Calificacion` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Producto` INT NOT NULL,
  `ID_Usuario` INT NOT NULL,
  `Puntuacion` INT NOT NULL CHECK (`Puntuacion` BETWEEN 1 AND 5),
  `Comentario` TEXT,
  `Fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Producto`) REFERENCES `producto`(`ID_Producto`) ON DELETE CASCADE,
  FOREIGN KEY (`ID_Usuario`) REFERENCES `usuario`(`ID_Usuario`) ON DELETE CASCADE,
  UNIQUE KEY `unique_product_rating` (`ID_Producto`, `ID_Usuario`)
);

-- 14. Historial Pedido (Auditoría de estados)
CREATE TABLE IF NOT EXISTS `historial_pedido` (
  `ID_Historial` INT AUTO_INCREMENT PRIMARY KEY,
  `ID_Pedido` INT NOT NULL,
  `Estado_Anterior` VARCHAR(50),
  `Estado_Nuevo` VARCHAR(50),
  `Actor` VARCHAR(100), -- Quién hizo el cambio
  `Fecha_Cambio` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ID_Pedido`) REFERENCES `pedido`(`ID_Pedido`) ON DELETE CASCADE
);

-- Inserción de Categorías por defecto
INSERT INTO `categoria` (Nombre, Descripcion) VALUES 
('Comida', 'Alimentos preparados y snacks'),
('Postres', 'Dulces, pasteles y galletas'),
('Bebidas', 'Jugos, refrescos y agua'),
('Papelería', 'Útiles escolares y material de oficina'),
('Ropa', 'Prendas de vestir y accesorios'),
('Tecnología', 'Gadgets, cables y accesorios electrónicos'),
('Otros', 'Artículos variados');
