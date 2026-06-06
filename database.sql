-- ══════════════════════════════════════════════
--  DolarAPI Colombia — Script de base de datos
--  Ejecutar en MySQL antes de iniciar el server
-- ══════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS dolarapi_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dolarapi_db;

-- ── Tabla principal: cada fila = una consulta guardada ──
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  moneda              VARCHAR(10)    NOT NULL,          -- ej: "USD", "EUR"
  nombre              VARCHAR(60)    NOT NULL,          -- ej: "Dólar"
  compra              DECIMAL(14,4),                    -- precio compra COP
  venta               DECIMAL(14,4),                    -- precio venta COP
  ultimo_cierre       DECIMAL(14,4),                    -- cierre anterior COP
  fecha_actualizacion DATETIME,                         -- fecha que trae la API
  endpoint            VARCHAR(120)   NOT NULL,          -- URL que se consultó
  http_status         SMALLINT       NOT NULL DEFAULT 200,
  consultado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Tabla de log de errores HTTP ──
CREATE TABLE IF NOT EXISTS log_errores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  endpoint      VARCHAR(120) NOT NULL,
  http_status   SMALLINT     NOT NULL,
  mensaje       TEXT,
  ocurrido_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Vista útil: última cotización por moneda ──
CREATE OR REPLACE VIEW ultima_cotizacion AS
  SELECT *
  FROM cotizaciones c1
  WHERE consultado_en = (
    SELECT MAX(c2.consultado_en)
    FROM   cotizaciones c2
    WHERE  c2.moneda = c1.moneda
  );

-- Datos de prueba (opcionales, se pueden borrar)
-- INSERT INTO cotizaciones (moneda, nombre, compra, venta, ultimo_cierre, fecha_actualizacion, endpoint, http_status)
-- VALUES ('USD','Dólar',4100.00,4120.00,4095.00,'2024-01-01 12:00:00','/v1/cotizaciones/dolar',200);
