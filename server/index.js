const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const LOGISTICS_FILE = path.join(DATA_DIR, 'logistics.json');
const ALLOWED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

app.use(express.json({ limit: '2mb' }));
app.use(cors());

async function ensureDataDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function ensureLogisticsFile() {
  try {
    await fs.access(LOGISTICS_FILE);
  } catch {
    const defaultData = { weights: [], rates: [] };
    await fs.writeFile(LOGISTICS_FILE, JSON.stringify(defaultData, null, 2));
  }
}

async function readLogistics() {
  try {
    await ensureLogisticsFile();
    const content = await fs.readFile(LOGISTICS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const weights = Array.isArray(parsed.weights) ? parsed.weights : [];
    const rates = Array.isArray(parsed.rates) ? parsed.rates : [];
    return { weights, rates };
  } catch (error) {
    console.error('Error reading logistics file:', error);
    const fallback = { weights: [], rates: [] };
    await saveLogistics(fallback);
    return fallback;
  }
}

async function saveLogistics(data) {
  await ensureDataDirectory();
  await fs.writeFile(LOGISTICS_FILE, JSON.stringify(data, null, 2));
}

function validateLogisticsBody(body) {
  if (!body || typeof body !== 'object') return 'Payload inválido';
  const { weights, rates } = body;
  if (!Array.isArray(weights) || !Array.isArray(rates)) return 'weights y rates deben ser arrays';

  const weightsValid = weights.every(
    (w) =>
      w &&
      typeof w.sku === 'string' &&
      w.sku.trim().length > 0 &&
      typeof w.weight === 'number' &&
      !Number.isNaN(w.weight) &&
      typeof w.updatedAt === 'string'
  );
  if (!weightsValid) return 'weights contiene elementos inválidos';

  const ratesValid = rates.every(
    (r) => r && typeof r.maxWeight === 'number' && !Number.isNaN(r.maxWeight) && typeof r.cost === 'number'
  );
  if (!ratesValid) return 'rates contiene elementos inválidos';
  return null;
}

async function findLogoPath() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const logoFile = files.find((file) => file.startsWith('logo.') && ALLOWED_LOGO_EXTENSIONS.includes(path.extname(file).toLowerCase()));
    return logoFile ? path.join(DATA_DIR, logoFile) : null;
  } catch (err) {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_LOGO_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa PNG, JPG o WebP.'));
    }
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/logistics', async (_req, res) => {
  try {
    await ensureDataDirectory();
    const data = await readLogistics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al leer logística' });
  }
});

app.put('/api/logistics', async (req, res) => {
  const validationError = validateLogisticsBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await ensureDataDirectory();
    await saveLogistics(req.body);
    res.json(req.body);
  } catch (error) {
    console.error('Error saving logistics:', error);
    res.status(500).json({ error: 'No se pudo guardar logística' });
  }
});

app.get('/api/logo', async (_req, res) => {
  try {
    await ensureDataDirectory();
    const logoPath = await findLogoPath();
    if (!logoPath) {
      return res.status(404).json({ error: 'Logo no encontrado' });
    }
    const ext = path.extname(logoPath).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-store');
    return res.sendFile(logoPath);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo recuperar el logo' });
  }
});

app.post('/api/logo', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  try {
    await ensureDataDirectory();
    const existing = await findLogoPath();
    if (existing) {
      await fs.unlink(existing).catch(() => {});
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const targetPath = path.join(DATA_DIR, `logo${ext}`);
    await fs.writeFile(targetPath, req.file.buffer);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving logo:', error);
    res.status(500).json({ error: 'No se pudo guardar el logo' });
  }
});

app.delete('/api/logo', async (_req, res) => {
  try {
    await ensureDataDirectory();
    const logoPath = await findLogoPath();
    if (logoPath) {
      await fs.unlink(logoPath).catch(() => {});
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el logo' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function bootstrap() {
  await ensureDataDirectory();
  await ensureLogisticsFile();
  app.listen(PORT, () => console.log(`API ready on port ${PORT}`));
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
