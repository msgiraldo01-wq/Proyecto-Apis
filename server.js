// ══════════════════════════════════════════════════════
//  DolarAPI Colombia — Backend Node.js + Express + MySQL
//  Archivo: server.js
//  Iniciar: node server.js
// ══════════════════════════════════════════════════════

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

// ── URL base de la API pública ──
const DOLAR_API = 'https://co.dolarapi.com';

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── Conexión a MySQL ──
const dbConfig = {
  host:     'localhost',
  user:     'root',
  password: 'Colombia01*',
  database: 'dolarapi_db',
  timezone: '-05:00',
};

let db;

async function conectarDB() {
  try {
    db = await mysql.createPool(dbConfig);
    await db.query('SELECT 1');
    console.log('✅ MySQL conectado correctamente');
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
}

// ── Helper: guardar cotización en BD ──
async function guardarCotizacion(data, endpoint, status) {
  if (Array.isArray(data)) {
    for (const item of data) {
      await guardarCotizacion(item, endpoint, status);
    }
    return;
  }

  // La TRM tiene estructura diferente — la normalizamos
  const esTRM = endpoint.includes('/trm');
const registro = esTRM ? {
  moneda:             'TRM',
  nombre:             data.nombre ?? 'Tasa Representativa del Mercado',
  compra:             data.valor  ?? null,
  venta:              data.valor  ?? null,
  ultimoCierre:       data.valor  ?? null,
  fechaActualizacion: data.fechaActualizacion ?? null,
} : data;

  const sql = `
    INSERT INTO cotizaciones
      (moneda, nombre, compra, venta, ultimo_cierre, fecha_actualizacion, endpoint, http_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.query(sql, [
    registro.moneda             ?? null,
    registro.nombre             ?? null,
    registro.compra             ?? null,
    registro.venta              ?? null,
    registro.ultimoCierre       ?? null,
    registro.fechaActualizacion ? new Date(registro.fechaActualizacion) : null,
    endpoint,
    status,
  ]);
}

// ── Helper: guardar error en BD ──
async function guardarError(endpoint, status, mensaje) {
  await db.query(
    'INSERT INTO log_errores (endpoint, http_status, mensaje) VALUES (?, ?, ?)',
    [endpoint, status, mensaje]
  );
}

// ═══════════════════════════════════════════════════════
//  RUTAS — Proxy a DolarApi + guardado en MySQL
// ═══════════════════════════════════════════════════════

// ── Todas las divisas ──
app.get('/api/cotizaciones', async (req, res) => {
  const endpoint = '/v1/cotizaciones';
  try {
    const resp = await fetch(DOLAR_API + endpoint);
    const data = await resp.json();
    await guardarCotizacion(data, endpoint, resp.status);
    console.log(`📥 [${resp.status}] ${endpoint} — ${data.length} divisas guardadas`);
    res.status(resp.status).json(data);
  } catch (err) {
    await guardarError(endpoint, 500, err.message);
    res.status(500).json({ error: 'Error interno', message: err.message });
  }
});

// ── Divisa específica ──
app.get('/api/cotizaciones/:moneda', async (req, res) => {
  const { moneda } = req.params;

  // Mapa frontend → códigos ISO reales de la API
  const mapaEndpoints = {
    dolar: { path: '/v1/cotizaciones/usd' },
    euro:  { path: '/v1/cotizaciones/eur' },
    trm:   { path: '/v1/trm'              },  // ruta especial
    ars:   { path: '/v1/cotizaciones/ars' },
    clp:   { path: '/v1/cotizaciones/clp' },
    mxn:   { path: '/v1/cotizaciones/mxn' },
    brl:   { path: '/v1/cotizaciones/brl' },
    pen:   { path: '/v1/cotizaciones/pen' },
  };

  const config = mapaEndpoints[moneda.toLowerCase()];

  if (!config) {
    await guardarError(`/v1/cotizaciones/${moneda}`, 404, `Moneda '${moneda}' no encontrada`);
    return res.status(404).json({
      error:   'Not Found',
      status:  404,
      message: `La moneda '${moneda}' no existe en la API.`,
    });
  }

  const endpoint = config.path;

  try {
    const resp = await fetch(DOLAR_API + endpoint);

    if (!resp.ok) {
      const msg = `HTTP ${resp.status} al consultar ${endpoint}`;
      await guardarError(endpoint, resp.status, msg);
      return res.status(resp.status).json({ error: 'Error de la API', status: resp.status, endpoint });
    }

    const data = await resp.json();
    await guardarCotizacion(data, endpoint, resp.status);
    console.log(`📥 [${resp.status}] ${endpoint} — ${data.moneda} guardado`);
    res.status(resp.status).json(data);

  } catch (err) {
    await guardarError(endpoint, 500, err.message);
    res.status(500).json({ error: 'Error interno', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
//  RUTAS — Lectura desde MySQL
// ═══════════════════════════════════════════════════════

// ── Historial completo ──
app.get('/api/historial', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const [rows] = await db.query(
    'SELECT * FROM cotizaciones ORDER BY consultado_en DESC LIMIT ?',
    [limit]
  );
  res.json(rows);
});

// ── Historial por moneda ──
app.get('/api/historial/:moneda', async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM cotizaciones
     WHERE moneda = ?
     ORDER BY consultado_en DESC
     LIMIT 100`,
    [req.params.moneda.toUpperCase()]
  );
  res.json(rows);
});

// ── Última cotización por moneda (vista SQL) ──
app.get('/api/ultimas', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM ultima_cotizacion ORDER BY moneda');
  res.json(rows);
});

// ── Log de errores ──
app.get('/api/errores', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM log_errores ORDER BY ocurrido_en DESC LIMIT 50'
  );
  res.json(rows);
});

// ── Estadísticas generales ──
app.get('/api/stats', async (req, res) => {
  const [[{ total }]]   = await db.query('SELECT COUNT(*) AS total FROM cotizaciones');
  const [[{ errores }]] = await db.query('SELECT COUNT(*) AS errores FROM log_errores');
  const [[{ monedas }]] = await db.query('SELECT COUNT(DISTINCT moneda) AS monedas FROM cotizaciones');
  const [[ultima]]      = await db.query('SELECT consultado_en FROM cotizaciones ORDER BY consultado_en DESC LIMIT 1');
  res.json({
    total_consultas:  total,
    total_errores:    errores,
    monedas_distintas: monedas,
    ultima_consulta:  ultima?.consultado_en ?? null,
  });
});

// ═══════════════════════════════════════════════════════
//  RUTAS — Errores HTTP para demostración
// ═══════════════════════════════════════════════════════

app.get('/api/demo/error/:code', async (req, res) => {
  const code = parseInt(req.params.code);
  const responses = {
    400: { error: 'Bad Request',           status: 400, message: 'Parámetros inválidos o malformados.' },
    401: { error: 'Unauthorized',          status: 401, message: 'No se proporcionaron credenciales válidas.' },
    403: { error: 'Forbidden',             status: 403, message: 'No tienes permisos para acceder a este recurso.' },
    404: { error: 'Not Found',             status: 404, message: 'El recurso solicitado no existe en el servidor.' },
    429: { error: 'Too Many Requests',     status: 429, message: 'Límite de peticiones superado.', retryAfter: 60 },
    500: { error: 'Internal Server Error', status: 500, message: 'Error inesperado en el servidor.' },
    503: { error: 'Service Unavailable',   status: 503, message: 'Servicio no disponible temporalmente.' },
  };
  const body = responses[code] ?? { error: 'Unknown', status: code };
  await guardarError(`/api/demo/error/${code}`, code, body.message).catch(() => {});
  res.status(code).json(body);
});

// ── Ruta raíz ──
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ═══════════════════════════════════════════════════════
//  ARRANQUE
// ═══════════════════════════════════════════════════════
conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET /api/cotizaciones`);
    console.log(`   GET /api/cotizaciones/:moneda`);
    console.log(`   GET /api/historial`);
    console.log(`   GET /api/historial/:moneda`);
    console.log(`   GET /api/ultimas`);
    console.log(`   GET /api/errores`);
    console.log(`   GET /api/stats`);
    console.log(`   GET /api/demo/error/:code`);
    console.log(`   GET /api/demo/error/:code`);
  });
});