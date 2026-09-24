import 'dotenv/config';

export const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  frontendOrigins: (process.env.FRONTEND_ORIGINS || 'https://allan-nog.github.io')
    .split(',').map(origin => origin.trim()).filter(Boolean)
};

export function supabaseConfigurado() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
