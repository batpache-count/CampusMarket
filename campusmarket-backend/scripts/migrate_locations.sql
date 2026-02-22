ALTER TABLE ubicacion_entrega 
ADD COLUMN IF NOT EXISTS "Dias_Disponibles" TEXT DEFAULT 'Lunes,Martes,Miércoles,Jueves,Viernes',
ADD COLUMN IF NOT EXISTS "Hora_Inicio" TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS "Hora_Fin" TIME DEFAULT '18:00';
