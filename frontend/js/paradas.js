/**
 * ValeBus — Base de Dados Estruturada de Pontos e Paradas de Ônibus
 * Suporta o catálogo completo de linhas municipais de Santa Rita do Sapucaí (MG)
 * Total projetado: ~115 paradas catalogadas por linha com coordenadas de alta precisão.
 */

window.VALEBUS_PARADAS = {
  // Metadados informativos de linhas para iconografia e estilo
  metadadosLinhas: {
    anchieta: {
      nome: 'Linha Anchieta',
      cor: '#16a34a',
      descricao: 'Praça Urbana Carolina / Inatel / Recanto'
    },
    fernandes: {
      nome: 'Linha Fernandes',
      cor: '#2563eb',
      descricao: 'Centro / Bairro Fernandes'
    },
    fortaleza: {
      nome: 'Linha Fortaleza',
      cor: '#9333ea',
      descricao: 'Rodoviária / Bairro Fortaleza'
    },
    industrial: {
      nome: 'Linha Industrial',
      cor: '#ea580c',
      descricao: 'Distrito Industrial / FAI / Nova Cidade'
    },
    porto_sapucai: {
      nome: 'Linha Porto Sapucaí',
      cor: '#0891b2',
      descricao: 'Centro / Porto Sapucaí'
    },
    reforco_jose_gm: {
      nome: 'Linha Reforço José Gonçalves',
      cor: '#dc2626',
      descricao: 'Horários de Pico Escolar & Industrial'
    },
    sao_benedito_hora_meia: {
      nome: 'Linha São Benedito (Hora/Meia)',
      cor: '#db2777',
      descricao: 'Interbairros São Benedito Intervalo Regular'
    },
    sao_benedito_hora: {
      nome: 'Linha São Benedito (Hora)',
      cor: '#eab308',
      descricao: 'Expresso São Benedito / Rodoviária'
    }
  },

  // Catálogo de paradas ordenadas por sequência da rota em cada linha
  paradasPorLinha: {
    anchieta: [
      {
        id: 'anchieta-1',
        numero: 1,
        linha: 'anchieta',
        endereco: 'Praça Urbana Carolina',
        referencia: 'Praça Do Murilo',
        posicao: [-22.254164, -45.696709],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-2',
        numero: 2,
        linha: 'anchieta',
        endereco: 'R. José Ribeiro De Barros, 59',
        referencia: 'Inatel - Sentido Recanto',
        posicao: [-22.256167, -45.697684],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-3',
        numero: 3,
        linha: 'anchieta',
        endereco: 'Av. João De Camargo, 19',
        referencia: 'Igreja De São Benedito - Sentido Recanto',
        posicao: [-22.254187, -45.700724],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-4',
        numero: 4,
        linha: 'anchieta',
        endereco: 'R. Cel. Joaquim Inácio, 10',
        referencia: 'Praça Da Katrin',
        posicao: [-22.252124, -45.701844],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-5',
        numero: 5,
        linha: 'anchieta',
        endereco: 'Av. Sinhá Moreira, 125',
        referencia: 'Ao Lado Do Terminal Rodoviário',
        posicao: [-22.254364, -45.704628],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-6',
        numero: 6,
        linha: 'anchieta',
        endereco: 'Av. Barão Do Rio Branco, 200',
        referencia: 'Correios',
        posicao: [-22.250708, -45.704968],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-7',
        numero: 7,
        linha: 'anchieta',
        endereco: 'Av. Dr. Delfim Moreira, 376',
        referencia: 'Colégio Sinhá Moreira',
        posicao: [-22.248824, -45.705014],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-8',
        numero: 8,
        linha: 'anchieta',
        endereco: 'Av. Dr. Delfim Moreira, 14',
        referencia: 'Trailer Do Zé Daniel - Sentido Recanto',
        posicao: [-22.247289, -45.703130],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-9',
        numero: 9,
        linha: 'anchieta',
        endereco: 'R. Antônio Teles, 654',
        referencia: 'Máquina De Arroz - Sentido Recanto',
        posicao: [-22.242321959946423, -45.70408600019819],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-10',
        numero: 10,
        linha: 'anchieta',
        endereco: 'R. Antônio Teles, 740',
        referencia: 'Sítio Santa Rita/Supermercado Romerão - Sentido Recanto',
        posicao: [-22.241689, -45.703757],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-11',
        numero: 11,
        linha: 'anchieta',
        endereco: 'R. Cônego Adolfo Carneiro, 992',
        referencia: 'Loteamento Do Vale - Sentido Recanto',
        posicao: [-22.239123, -45.702063],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-12',
        numero: 12,
        linha: 'anchieta',
        endereco: 'R. Cônego Adolfo Carneiro, 1408',
        referencia: 'Casarão Velho - Sentido Recanto',
        posicao: [-22.236693, -45.700180],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-13',
        numero: 13,
        linha: 'anchieta',
        endereco: 'R. Olinto Folchito, 50',
        referencia: 'Mercearia Santa Isabel',
        posicao: [-22.235115, -45.699916],
        sentido: 'Sentido Recanto'
      },
      {
        id: 'anchieta-14',
        numero: 14,
        linha: 'anchieta',
        endereco: 'R. Olinto Folchito, 360',
        referencia: 'Centro Empresarial - Sentido Recanto',
        posicao: [-22.233718908257497, -45.70246784033834],
        sentido: 'Sentido Recanto'
      }
    ],

    // Espaço preparado para as próximas adições das linhas municipais (~115 pontos)
    fernandes: [],
    fortaleza: [],
    industrial: [],
    porto_sapucai: [],
    reforco_jose_gm: [],
    sao_benedito_hora_meia: [],
    sao_benedito_hora: []
  },

  // Trajetos vetoriais (polylines) de alta precisão ao longo da malha viária real
  trajetosPorLinha: {
    anchieta: [
      [-22.254186, -45.696698], [-22.254247, -45.696839], [-22.254706, -45.697053],
      [-22.255124, -45.697243], [-22.255534, -45.697423], [-22.255773, -45.697538],
      [-22.256156, -45.697712], [-22.256256, -45.697758], [-22.255858, -45.698349],
      [-22.255144, -45.699336], [-22.254899, -45.699725], [-22.254708, -45.699998],
      [-22.254527, -45.700242], [-22.254342, -45.700511], [-22.254258, -45.700627],
      [-22.254189, -45.700725], [-22.254056, -45.700914], [-22.253739, -45.700572],
      [-22.253610, -45.700462], [-22.252793, -45.701092], [-22.252355, -45.701437],
      [-22.252186, -45.701594], [-22.252010, -45.701793], [-22.252108, -45.701868],
      [-22.252215, -45.701950], [-22.252970, -45.702526], [-22.253515, -45.702949],
      [-22.253553, -45.702978], [-22.254074, -45.703419], [-22.254356, -45.703885],
      [-22.254678, -45.704446], [-22.254441, -45.704600], [-22.254374, -45.704646],
      [-22.254181, -45.704779], [-22.253895, -45.704962], [-22.253559, -45.705196],
      [-22.253449, -45.705320], [-22.252836, -45.704289], [-22.252337, -45.703444],
      [-22.252110, -45.703748], [-22.251060, -45.704653], [-22.250716, -45.704978],
      [-22.250287, -45.705383], [-22.249495, -45.706140], [-22.249080, -45.705575],
      [-22.248740, -45.705082], [-22.248684, -45.705001], [-22.248365, -45.704537],
      [-22.247970, -45.703990], [-22.247736, -45.703695], [-22.247423, -45.703224],
      [-22.247321, -45.703100], [-22.247217, -45.702974], [-22.247042, -45.703250],
      [-22.246809, -45.703633], [-22.246632, -45.703913], [-22.246487, -45.704119],
      [-22.246294, -45.704238], [-22.246208, -45.704262], [-22.246077, -45.704290],
      [-22.245803, -45.704333], [-22.245583, -45.704374], [-22.245241, -45.704430],
      [-22.244971, -45.704526], [-22.244690, -45.704668], [-22.244261, -45.704879],
      [-22.244160, -45.704916], [-22.244072, -45.704926], [-22.243966, -45.704922],
      [-22.243791, -45.704887], [-22.243610, -45.704858], [-22.243443, -45.704809],
      [-22.243274, -45.704732], [-22.242858, -45.704478], [-22.242354, -45.704219],
      [-22.242280, -45.704180], [-22.241974, -45.704018], [-22.241646, -45.703863],
      [-22.241221, -45.703661], [-22.240812, -45.703432], [-22.239777, -45.702865],
      [-22.239680, -45.702798], [-22.239339, -45.702322], [-22.239135, -45.702053],
      [-22.238987, -45.701858], [-22.238622, -45.701395], [-22.238354, -45.701029],
      [-22.238197, -45.700871], [-22.238039, -45.700841], [-22.237863, -45.700867],
      [-22.237605, -45.700932], [-22.237511, -45.700943], [-22.237408, -45.700886],
      [-22.237308, -45.700806], [-22.236876, -45.700424], [-22.236651, -45.700239],
      [-22.236541, -45.700149], [-22.235962, -45.699787], [-22.235735, -45.699638],
      [-22.235515, -45.699486], [-22.235406, -45.699399], [-22.235349, -45.699517],
      [-22.235121, -45.699920], [-22.234739, -45.700597], [-22.234420, -45.701189],
      [-22.234253, -45.701493], [-22.234077, -45.701796], [-22.233742, -45.702377],
      [-22.233697, -45.702452]
    ],
    fernandes: [],
    fortaleza: [],
    industrial: [],
    porto_sapucai: [],
    reforco_jose_gm: [],
    sao_benedito_hora_meia: [],
    sao_benedito_hora: []
  },

  /**
   * Retorna os pontos do trajeto de uma linha específica ou de todas
   * @param {string} linhaChave 'todas' ou chave da linha (ex: 'anchieta')
   * @returns {Array} Array de coordenadas [lat, lng]
   */
  obterTrajeto(linhaChave = 'anchieta') {
    if (!linhaChave || linhaChave === 'todas') {
      return this.trajetosPorLinha.anchieta || [];
    }
    return this.trajetosPorLinha[linhaChave] || [];
  },

  /**
   * Verifica se uma linha tem trajeto traçado cadastrado
   */
  temTrajeto(linhaChave) {
    const t = this.trajetosPorLinha[linhaChave];
    return Array.isArray(t) && t.length > 0;
  },

  /**
   * Helper utilitário para obter a lista consolidada ou filtrada de paradas
   * @param {string} linhaChave 'todas' ou chave da linha (ex: 'anchieta')
   * @returns {Array} Lista de objetos de paradas enriquecidos com cor e nome da linha
   */
  obterParadas(linhaChave = 'todas') {
    const todas = [];
    const chaves = (linhaChave === 'todas')
      ? Object.keys(this.paradasPorLinha)
      : [linhaChave];

    chaves.forEach(chave => {
      const lista = this.paradasPorLinha[chave] || [];
      const meta = this.metadadosLinhas[chave] || {
        nome: `Linha ${chave}`,
        cor: '#16a34a'
      };

      lista.forEach(p => {
        todas.push({
          ...p,
          linhaChave: chave,
          nomeLinha: meta.nome,
          corLinha: meta.cor
        });
      });
    });

    return todas;
  },

  /**
   * Total de paradas cadastradas em todo o sistema
   */
  contarTotalParadas() {
    let total = 0;
    Object.values(this.paradasPorLinha).forEach(lista => {
      total += lista.length;
    });
    return total;
  }
};
