# DolarAPI Colombia — Proyecto Fullstack
### Node.js + Express + MySQL + HTML

---

## Estructura del proyecto

```
dolarapi-fullstack/
├── server.js          ← Backend Express (el servidor)
├── database.sql       ← Script para crear la BD en MySQL
├── package.json       ← Dependencias de Node.js
├── README.md          ← Este archivo
└── public/
    └── index.html     ← Frontend (se sirve desde el servidor)
```

---

## Paso 1 — Crear la base de datos en MySQL

Abre tu cliente MySQL (terminal o Workbench) y ejecuta:

```sql
source /ruta/a/tu/proyecto/database.sql
```

O copia y pega el contenido de `database.sql` directamente.

Esto crea:
- Base de datos: `dolarapi_db`
- Tabla: `cotizaciones` — guarda cada consulta
- Tabla: `log_errores` — guarda errores HTTP
- Vista: `ultima_cotizacion` — última cotización por moneda

---

## Paso 2 — Configura tu contraseña de MySQL en server.js

Abre `server.js` y busca estas líneas (cerca del inicio):

```js
const dbConfig = {
  host:     'localhost',
  user:     'root',      // ← tu usuario de MySQL
  password: '',          // ← pon tu contraseña aquí
  database: 'dolarapi_db',
};
```

---

## Paso 3 — Instalar dependencias de Node.js

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

---

## Paso 4 — Iniciar el servidor

```bash
node server.js
```

Deberías ver:
```
✅ MySQL conectado correctamente
🚀 Servidor corriendo en http://localhost:3000
```

---

## Paso 5 — Abrir el navegador

Ve a: **http://localhost:3000**

El frontend se carga automáticamente desde la carpeta `/public`.

---

## Endpoints disponibles en el backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/cotizaciones | Todas las divisas (guarda en MySQL) |
| GET | /api/cotizaciones/dolar | Dólar USD |
| GET | /api/cotizaciones/euro | Euro |
| GET | /api/cotizaciones/trm | TRM oficial |
| GET | /api/cotizaciones/ars | Peso Argentino |
| GET | /api/cotizaciones/clp | Peso Chileno |
| GET | /api/cotizaciones/mxn | Peso Mexicano |
| GET | /api/cotizaciones/brl | Real Brasileño |
| GET | /api/cotizaciones/pen | Sol Peruano |
| GET | /api/historial | Historial completo de la BD |
| GET | /api/historial/:moneda | Historial de una moneda |
| GET | /api/ultimas | Última cotización por moneda |
| GET | /api/errores | Log de errores HTTP guardados |
| GET | /api/stats | Estadísticas generales |
| GET | /api/demo/error/404 | Simula error 404 (se guarda en BD) |
| GET | /api/demo/error/500 | Simula error 500 (se guarda en BD) |

---

## Flujo de datos (para explicar en la presentación)

```
Navegador → GET /api/cotizaciones/dolar
    ↓
Express (server.js)
    ↓
fetch → https://co.dolarapi.com/v1/cotizaciones/dolar
    ↓
Respuesta JSON de DolarAPI
    ↓
INSERT INTO cotizaciones (...)  ← guarda en MySQL
    ↓
res.json(data)  ← devuelve el mismo JSON al navegador
```

---

## Verificar datos en MySQL

```sql
USE dolarapi_db;

-- Ver todas las consultas guardadas
SELECT * FROM cotizaciones ORDER BY consultado_en DESC;

-- Ver última cotización por moneda
SELECT * FROM ultima_cotizacion;

-- Ver log de errores
SELECT * FROM log_errores;
```
