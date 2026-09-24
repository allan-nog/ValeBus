import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, supabaseConfigurado } from './src/config/env.js';
import { authRouter } from './src/routes/auth.js';
import { linhasRouter } from './src/routes/linhas.js';
import { motoristasRouter } from './src/routes/motoristas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'ValeBus',
    database: supabaseConfigurado() ? 'configured' : 'not_configured'
  });
});

app.use('/api/auth', authRouter);
app.use('/api/gestor/motoristas', motoristasRouter);
app.use('/api/linhas', linhasRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' });
});

app.get(['/', '/login', '/login.html'], (_req, res) => {
  res.redirect('/frontend/login.html');
});
app.get(['/dashboard', '/dashboard.html'], (_req, res) => res.redirect('/frontend/dashboard.html'));
app.get(['/gestor', '/gestor.html'], (_req, res) => res.redirect('/frontend/gestor.html'));
app.get(['/motorista', '/motorista.html'], (_req, res) => res.redirect('/frontend/motorista.html'));

// Arquivos públicos: preserva tanto /frontend/... quanto os caminhos diretos
// usados pelos documentos HTML dentro dessa pasta. Nunca exponha a raiz do
// repositório, que contém o código do servidor e arquivos de banco.
const frontendPath = path.join(__dirname, 'frontend');
app.use('/frontend', express.static(frontendPath));
app.use(express.static(frontendPath));

app.use((error, _req, res, _next) => {
  if (error.status === 503) return res.status(503).json({ error: error.message });
  if (error.code === 'SUPABASE_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message, code: error.code });
  }

  console.error(error);
  return res.status(500).json({ error: 'Erro interno no servidor.' });
});

app.use((_req, res) => res.redirect('/frontend/login.html'));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`ValeBus running on http://0.0.0.0:${config.port}`);
});
