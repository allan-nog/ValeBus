// Chaves existentes em frontend/js/paradas.js, sem alterar coordenadas.
const nomes = {
  anchieta: 'Linha Anchieta', fernandes: 'Linha Fernandes',
  fortaleza: 'Linha Fortaleza', industrial: 'Linha Industrial',
  porto_sapucai: 'Linha Porto Sapucaí',
  reforco_jose_gm: 'Linha Reforço José G.M (via MCM)',
  sao_benedito_hora: 'Linha São Benedito (Hora)',
  sao_benedito_hora_meia: 'Linha São Benedito (Hora e Meia)'
};
const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function chaveDaLinha(linha) {
  if (!linha) return null;
  if (Object.hasOwn(nomes, linha.codigo)) return linha.codigo;
  const nome = normalizar(linha.nome);
  if (nome === normalizar('Linha Reforço José G.M.')) return 'reforco_jose_gm';
  return Object.keys(nomes).find(chave => normalizar(nomes[chave]) === nome) || null;
}
