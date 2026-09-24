import { createClient } from '@supabase/supabase-js';
import { config, supabaseConfigurado } from '../config/env.js';

let clienteSupabase = null;

function validarConfiguracao() {
  if (!supabaseConfigurado()) {
    const erro = new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.');
    erro.code = 'SUPABASE_NOT_CONFIGURED';
    throw erro;
  }
}

function criarCliente() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

export function obterSupabase() {
  validarConfiguracao();
  if (!clienteSupabase) clienteSupabase = criarCliente();
  return clienteSupabase;
}

// O login recebe um cliente novo para que a sessão de uma pessoa nunca altere
// o cliente administrativo compartilhado pelo backend.
export function criarClienteSupabase() {
  validarConfiguracao();
  return criarCliente();
}
