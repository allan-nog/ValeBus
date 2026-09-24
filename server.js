import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'ValeBus' });
});

// Route aliases
app.get(['/', '/login', '/login.html'], (req, res) => {
  res.redirect('/frontend/login.html');
});

app.get(['/dashboard', '/dashboard.html'], (req, res) => {
  res.redirect('/frontend/dashboard.html');
});

app.get(['/gestor', '/gestor.html'], (req, res) => {
  res.redirect('/frontend/gestor.html');
});

app.get(['/motorista', '/motorista.html'], (req, res) => {
  res.redirect('/frontend/motorista.html');
});

// Serve static assets: support both /frontend/... and direct paths (/vendor, /css, /js)
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/vendor', express.static(path.join(__dirname, 'frontend/vendor')));
app.use('/css', express.static(path.join(__dirname, 'frontend/css')));
app.use('/js', express.static(path.join(__dirname, 'frontend/js')));
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets')));
app.use(express.static(__dirname));

// Fallback: redirect unmatched routes to login
app.use((req, res) => {
  res.redirect('/frontend/login.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ValeBus running on http://0.0.0.0:${PORT}`);
});
