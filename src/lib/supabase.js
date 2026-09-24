import { createClient } from '@supabase/supabase-js';
import { config, supabaseConfigurado } from '../config/env.js';

let clienteSupabase = null;

export function obterSupabase() {
  if (!supabaseConfigurado()) {
    const erro = new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.');
    erro.code = 'SUPABASE_NOT_CONFIGURED';
    throw erro;
  }

  if (!clienteSupabase) {
    clienteSupabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  return clienteSupabase;
}
