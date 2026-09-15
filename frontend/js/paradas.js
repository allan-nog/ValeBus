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
