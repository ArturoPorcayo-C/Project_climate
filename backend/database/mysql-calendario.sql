-- Instancia RDS: clima-mysql  |  Base: clima_db
USE clima_db;

CREATE TABLE semanas (
    id_semana      INT AUTO_INCREMENT PRIMARY KEY,
    numero_semana  TINYINT     NOT NULL,
    anio           SMALLINT    NOT NULL,
    estacion_anio  VARCHAR(20) NOT NULL,
    CONSTRAINT uq_semana UNIQUE (numero_semana, anio),
    CONSTRAINT chk_numero_semana CHECK (numero_semana BETWEEN 1 AND 53)
) ENGINE=InnoDB;

CREATE TABLE dias (
    id_dia            INT AUTO_INCREMENT PRIMARY KEY,
    id_semana         INT         NOT NULL,
    fecha             DATE        NOT NULL,
    nombre_dia        VARCHAR(15) NOT NULL,
    es_fin_de_semana  BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_dia_fecha UNIQUE (fecha),
    CONSTRAINT fk_dias_semana FOREIGN KEY (id_semana)
        REFERENCES semanas (id_semana)
) ENGINE=InnoDB;
