import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'ValeBus' });
});

// Redirect root directly to frontend/login.html
app.get('/', (req, res) => {
  res.redirect('/frontend/login.html');
});

// Serve static assets from project root (serves /frontend/..., /index.html, etc.)
app.use(express.static(__dirname));

// Fallback: redirect unmatched routes to login
app.use((req, res) => {
  res.redirect('/frontend/login.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ValeBus running on http://0.0.0.0:${PORT}`);
});
