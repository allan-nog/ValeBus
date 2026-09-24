// Insere somente metadados existentes no frontend; não modifica coordenadas.
// Sem --aplicar, apenas apresenta os registros que seriam inseridos.
import fs from 'node:fs';
import vm from 'node:vm';
import { obterSupabase } from '../src/lib/supabase.js';

const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../frontend/js/catalogo-operacional.js', import.meta.url), 'utf8'), contexto);
const catalogo = contexto.window.VALEBUS_CATALOGO_OPERACIONAL;
const linhas = Object.entries(catalogo.linhas).map(([codigo, l]) => ({
  codigo, nome: l.nome.replace(' (Seu Ônibus)', ''), cor: l.cor, publica: true
}));
const veiculos = catalogo.frota.map(v => ({ prefixo: v.prefixo, nome: v.veiculo }));

if (!process.argv.includes('--aplicar')) {
  console.log(JSON.stringify({ linhas, veiculos }, null, 2));
} else {
  const supabase = obterSupabase();
  for (const [tabela, registros, conflito] of [['linhas', linhas, 'codigo'], ['veiculos', veiculos, 'prefixo']]) {
    const { data, error } = await supabase.from(tabela)
      .upsert(registros, { onConflict: conflito, ignoreDuplicates: true }).select('id');
    if (error) throw new Error(tabela + ': ' + error.message);
    console.log(tabela + ': ' + data.length + ' registros inseridos; registros existentes preservados.');
  }
}
