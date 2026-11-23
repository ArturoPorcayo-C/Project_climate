-- Instancia RDS: db-clima-mysql  |  Base: db_clima_proyecto
-- Los nombres de tabla van en MAYÚSCULAS: en RDS (Linux) MySQL distingue
-- mayúsculas y minúsculas en nombres de tabla.
USE db_clima_proyecto;

CREATE TABLE UBICACIONES (
    id_ubicacion INT AUTO_INCREMENT PRIMARY KEY,
    ciudad       VARCHAR(80)  NOT NULL,
    estado       VARCHAR(80)  NOT NULL,
    latitud      DECIMAL(9,6) NOT NULL,
    longitud     DECIMAL(9,6) NOT NULL,
    CONSTRAINT uq_ubicacion UNIQUE (ciudad, estado)
) ENGINE=InnoDB;

CREATE TABLE USUARIOS (
    id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(120) NOT NULL,
    rol            VARCHAR(30)  NOT NULL,
    fecha_registro DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_correo UNIQUE (correo)
) ENGINE=InnoDB;
