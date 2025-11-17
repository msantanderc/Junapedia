import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

function loadSample() {
  const p = path.resolve(process.cwd(), 'scripts', 'fetched-sample.json');
  if (!fs.existsSync(p)) return [];
  try {
    const txt = fs.readFileSync(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    console.error('Failed to load sample data', e);
    return [];
  }
}

// GET /compare?product=xxx&city=Santiago
app.get('/compare', (req, res) => {
  const { product = '', city = '' } = req.query;
  const all = loadSample();
  const q = String(product || '').toLowerCase();
  const c = String(city || '').toLowerCase();

  const filtered = all.filter(item => {
    const matchesProduct = q ? (String(item.productName || '').toLowerCase().includes(q)) : true;
    const matchesCity = c ? (String(item.city || '').toLowerCase() === c) : true;
    return matchesProduct && matchesCity;
  });

  // group by productName and source
  res.json({ count: filtered.length, items: filtered });
});

app.listen(PORT, () => {
  console.log(`Compare API running on http://localhost:${PORT}`);
});
