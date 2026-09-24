import 'dotenv/config';

export const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

export function supabaseConfigurado() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
