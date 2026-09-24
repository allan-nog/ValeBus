import { Router } from 'express';
import { obterSupabase } from '../lib/supabase.js';

export const linhasRouter = Router();

linhasRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await obterSupabase()
      .from('linhas')
      .select('id, codigo, nome, cor, descricao, ativo')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

linhasRouter.get('/:linhaId/paradas', async (req, res, next) => {
  try {
    const { data, error } = await obterSupabase()
      .from('linha_paradas')
      .select('ordem, sentido, parada:paradas(id, codigo, nome, endereco, latitude, longitude, referencia)')
      .eq('linha_id', req.params.linhaId)
      .order('ordem');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
