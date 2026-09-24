/**
 * Catálogo operacional simulado compartilhado pelo ValeBus.
 *
 * Esta é a fonte única, no frontend, para linhas, veículos e posições iniciais
 * usadas nos mapas de passageiro e motorista. O estado de cada tela continua
 * local e os dados reais serão substituídos posteriormente pelo backend.
 */
window.VALEBUS_CATALOGO_OPERACIONAL = {
  linhas: {
    anchieta: {
      chave: 'anchieta',
      nome: 'Linha Anchieta',
      cor: '#16a34a',
      partida: 'Praça Urbana Carolina | Praça Do Murilo',
      proximaParada: 'Rua José Ribeiro De Barros, 59 | Inatel - Sentido Recanto'
    },
    fernandes: { chave: 'fernandes', nome: 'Linha Fernandes (Seu Ônibus)', cor: '#2563eb' },
    fortaleza: { chave: 'fortaleza', nome: 'Linha Fortaleza', cor: '#9333ea' },
    industrial: { chave: 'industrial', nome: 'Linha Industrial', cor: '#ea580c' },
    porto_sapucai: { chave: 'porto_sapucai', nome: 'Linha Porto Sapucaí', cor: '#0891b2' },
    reforco_jose_gm: { chave: 'reforco_jose_gm', nome: 'Linha Reforço José G.M (via MCM)', cor: '#dc2626' },
    sao_benedito_hora_meia: { chave: 'sao_benedito_hora_meia', nome: 'Linha São Benedito (Hora e Meia)', cor: '#db2777' },
    sao_benedito_hora: { chave: 'sao_benedito_hora', nome: 'Linha São Benedito (Hora)', cor: '#eab308' }
  },
  frota: [
    { chaveLinha: 'anchieta', veiculo: 'Ônibus #01', prefixo: '101', posicao: [-22.254164, -45.696709], velocidade: 0 },
    { chaveLinha: 'fernandes', veiculo: 'Ônibus #02', prefixo: '102', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'fortaleza', veiculo: 'Ônibus #03', prefixo: '103', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'industrial', veiculo: 'Ônibus #04', prefixo: '104', posicao: [-22.261351790494068, -45.771512667995346], velocidade: 0 },
    { chaveLinha: 'porto_sapucai', veiculo: 'Ônibus #05', prefixo: '105', posicao: [-22.257161337562074, -45.80345771571105], velocidade: 0 },
    { chaveLinha: 'reforco_jose_gm', veiculo: 'Ônibus #06', prefixo: '106', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'sao_benedito_hora', veiculo: 'Ônibus #07', prefixo: '107', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'sao_benedito_hora_meia', veiculo: 'Ônibus #08', prefixo: '108', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 }
  ]
};
