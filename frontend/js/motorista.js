  /**
   * motorista.js — Lógica do Terminal de Bordo do Motorista (ValeBus)
   * ─────────────────────────────────────────────────────────────────
   * Módulos:
   *  1. Relógio do Sistema e Carregamento da Sessão
   *  2. Alternância de Tema Claro / Escuro
   *  3. Inicialização do Mapa Leaflet em Tela Cheia (Santa Rita do Sapucaí)
   *  4. Telemetria GPS em Tempo Real e Marcadores de Ônibus
   *  5. Controle da Viagem (Iniciar Rota / Encerrar Rota)
   *  6. Menus Suspensos (3 Pontos Ocorrências & Usuário)
   *  7. Navegação entre Abas e Vistas (Sidebar Oficial)
   *  8. Gavetas Mobile (Sidebar Drawer e Painel Direito)
   *  9. Modais e Toasts de Notificação
   */

  (function () {
    'use strict';

    /* ──────────────────────────────────────────────────────────
      1. RELÓGIO DO SISTEMA & SESSÃO DO MOTORISTA
      ────────────────────────────────────────────────────────── */
    const estadoMotorista = {
      nome: 'João Silva',
      matricula: 'MOT-104',
      linhaAtivaChave: 'fernandes',
      linhaCodigo: 'Linha Fernandes',
      linhaNome: 'Bairro Fernandes / São Benedito / Centro / Algodoeira',
      estacao: "Rua Das Rosas, 300 | Caixa D'Água Da Copasa",
      veiculo: 'Ônibus #02',
      viagensHoje: 12,
      emRota: false,
      distanciaKm: 10.9,
      tempoMin: 35,
      proximaParada: "1. Caixa D'Água Da Copasa"
    };

    const sessaoMotorista = window.ValeBusAPI && typeof window.ValeBusAPI.obterSessao === 'function'
      ? window.ValeBusAPI.obterSessao()
      : null;
    if (!sessaoMotorista?.logado || sessaoMotorista.perfil !== 'motorista') {
      window.location.replace('login.html');
      return;
    }

    function atualizarRelogio() {
      const el = document.getElementById('topbar-hora');
      if (!el) return;
      const agora = new Date();
      const h = String(agora.getHours()).padStart(2, '0');
      const m = String(agora.getMinutes()).padStart(2, '0');
      el.textContent = `${h}:${m}`;
    }

    function carregarDadosSessao() {
      try {
        const u = window.ValeBusAPI.obterSessao();
        if (u.logado) {
          const ehGestor = (u.email && u.email.toLowerCase().trim() === 'valebussrs@gmail.com') || u.perfil === 'gestor';
          if (ehGestor) {
            estadoMotorista.ehGestor = true;
            estadoMotorista.nome = u.nome || 'Gestor Operacional ValeBus';
            estadoMotorista.matricula = u.matricula || 'CCO-001';
            estadoMotorista.cargo = u.cargo || 'Gestor CCO & Supervisor de Bordo';
            estadoMotorista.email = u.email || 'valebussrs@gmail.com';
          } else {
            if (u.nome) estadoMotorista.nome = u.nome;
            if (u.matricula) estadoMotorista.matricula = u.matricula;
            if (u.linha) {
              if (u.linha.toLowerCase().includes('industrial')) {
                estadoMotorista.linhaAtivaChave = 'industrial';
                estadoMotorista.linhaCodigo = 'Linha Industrial';
                estadoMotorista.linhaNome = 'Distrito Industrial / BR-459 / Centro / Praça Urbana Carolina';
                estadoMotorista.estacao = 'BR-459 Rod. JK, Km 119,8 Leste | Entr. MG-173 Para Cachoeira de Minas';
                estadoMotorista.distanciaKm = 9.4;
                estadoMotorista.tempoMin = 25;
                estadoMotorista.proximaParada = '1. Entr. MG-173 Para Cachoeira De Minas';
              } else if (u.linha.toLowerCase().includes('porto') || u.linha.toLowerCase().includes('sapucai')) {
                estadoMotorista.linhaAtivaChave = 'porto_sapucai';
                estadoMotorista.linhaCodigo = 'Linha Porto Sapucaí';
                estadoMotorista.linhaNome = 'Porto Sapucaí / BR-459 / Centro / Praça Urbana Carolina';
                estadoMotorista.estacao = 'BR-459 Rod. JK, Km 116 Leste | Porto Sapucaí';
                estadoMotorista.distanciaKm = 13.4;
                estadoMotorista.tempoMin = 32;
                estadoMotorista.proximaParada = '1. Porto Sapucaí';
              } else if (u.linha.toLowerCase().includes('reforco') || u.linha.toLowerCase().includes('mcm')) {
                estadoMotorista.linhaAtivaChave = 'reforco_jose_gm';
                estadoMotorista.linhaCodigo = 'Linha Reforço José G.M.';
                estadoMotorista.linhaNome = 'José Gonçalves Mendes / Via MCM / Centro / Praça da Câmara';
                estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
                estadoMotorista.distanciaKm = 6.4;
                estadoMotorista.tempoMin = 18;
                estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
              } else if (u.linha.toLowerCase().includes('hora e meia') || (u.linha.toLowerCase().includes('benedito') && u.linha.toLowerCase().includes('meia'))) {
                estadoMotorista.linhaAtivaChave = 'sao_benedito_hora_meia';
                estadoMotorista.linhaCodigo = 'Linha São Benedito (Hora e Meia)';
                estadoMotorista.linhaNome = 'José Gonçalves Mendes / Praça São Benedito / Santos Dumont / Praça Urbana Carolina';
                estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
                estadoMotorista.distanciaKm = 9.1;
                estadoMotorista.tempoMin = 24;
                estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
              } else if (u.linha.toLowerCase().includes('benedito') || (u.linha.toLowerCase().includes('hora') && !u.linha.toLowerCase().includes('meia'))) {
                estadoMotorista.linhaAtivaChave = 'sao_benedito_hora';
                estadoMotorista.linhaCodigo = 'Linha São Benedito (Hora)';
                estadoMotorista.linhaNome = 'José Gonçalves Mendes / Praça São Benedito / Empresa D.L. / Usivale / Centro / Praça Urbana Carolina';
                estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
                estadoMotorista.distanciaKm = 9.0;
                estadoMotorista.tempoMin = 23;
                estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
              } else if (u.linha.toLowerCase().includes('fortaleza')) {
                estadoMotorista.linhaAtivaChave = 'fortaleza';
                estadoMotorista.linhaCodigo = 'Linha Fortaleza';
                estadoMotorista.linhaNome = 'Bairro Fernandes / São Benedito / Centro / Bairro Fortaleza';
                estadoMotorista.estacao = "Rua Das Rosas, 300 | Caixa D'Água Da Copasa";
                estadoMotorista.distanciaKm = 11.0;
                estadoMotorista.tempoMin = 36;
                estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
              } else if (u.linha.toLowerCase().includes('anchieta')) {
                estadoMotorista.linhaAtivaChave = 'anchieta';
                estadoMotorista.linhaCodigo = 'Linha Anchieta';
                estadoMotorista.linhaNome = 'Praça Urbana / Recanto';
                estadoMotorista.estacao = 'Praça Urbana Carolina';
                estadoMotorista.distanciaKm = 4.5;
                estadoMotorista.tempoMin = 15;
                estadoMotorista.proximaParada = '1. Praça Do Murilo';
              } else {
                estadoMotorista.linhaAtivaChave = 'fernandes';
                estadoMotorista.linhaCodigo = 'Linha Fernandes';
                estadoMotorista.linhaNome = 'Bairro Fernandes / São Benedito / Centro / Algodoeira';
                estadoMotorista.estacao = "Rua Das Rosas, 300 | Caixa D'Água Da Copasa";
                estadoMotorista.distanciaKm = 10.9;
                estadoMotorista.tempoMin = 35;
                estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
              }
            }
            if (u.veiculo) estadoMotorista.veiculo = u.veiculo.replace(/\s*\(Prefixo\s*\d+\)/i, '').trim();
          }
        }

        estadoMotorista.viagensHoje = window.ValeBusAPI.obterViagensHoje(estadoMotorista.viagensHoje);
      } catch (e) {
        console.warn('Erro ao carregar sessão do motorista:', e);
      }
    }

    carregarDadosSessao();
    atualizarRelogio();
    setInterval(atualizarRelogio, 5000);

    /* ──────────────────────────────────────────────────────────
      2. TEMA CLARO / ESCURO (PERSISTÊNCIA)
      ────────────────────────────────────────────────────────── */
    const btnTema = document.getElementById('btn-tema-toggle');
    function aplicarTema(tema) {
      document.documentElement.setAttribute('data-theme', tema);
      window.ValeBusAPI.salvarTema(tema);
    }

    const temaSalvo = window.ValeBusAPI.obterTema('light');
    aplicarTema(temaSalvo);

    if (btnTema) {
      btnTema.addEventListener('click', () => {
        const atual = document.documentElement.getAttribute('data-theme') || 'light';
        const novo = atual === 'dark' ? 'light' : 'dark';
        aplicarTema(novo);
        mostrarToast(`Tema ${novo === 'dark' ? 'Escuro' : 'Claro'} ativado.`);
      });
    }

    /* ──────────────────────────────────────────────────────────
      3. RENDERIZAÇÃO DOS DADOS DO MOTORISTA
      ────────────────────────────────────────────────────────── */
    let indiceParadaAtual = 0;
    const marcadoresParadasAnchieta = [];

    function renderizarDadosMotorista() {
      // Iniciais
      const partes = estadoMotorista.nome.trim().split(/\s+/).filter(Boolean);
      let iniciais = 'JS';
      if (partes.length === 1) {
        iniciais = partes[0].substring(0, 2).toUpperCase();
      } else if (partes.length > 1) {
        iniciais = (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
      }

      // Topbar & Dropdown
      const topAvatar = document.getElementById('topbar-usuario-avatar');
      const topNome = document.getElementById('topbar-usuario-nome');
      const topCargo = document.getElementById('topbar-usuario-cargo');
      const dropAvatar = document.getElementById('dropdown-usuario-avatar');
      const dropNome = document.getElementById('dropdown-usuario-nome');
      const dropEmail = document.getElementById('dropdown-usuario-email');
      const dropCargo = document.getElementById('dropdown-usuario-cargo');

      if (topAvatar) topAvatar.textContent = iniciais;
      if (topNome) topNome.textContent = estadoMotorista.nome;
      if (dropAvatar) dropAvatar.textContent = iniciais;
      if (dropNome) dropNome.textContent = estadoMotorista.nome;

      if (estadoMotorista.ehGestor) {
        if (topCargo) topCargo.textContent = 'Operação & Supervisão';
        if (dropEmail) dropEmail.textContent = `${estadoMotorista.email} • Matrícula ${estadoMotorista.matricula}`;
        if (dropCargo) dropCargo.textContent = 'Supervisão de Linha & Frota';
      }

      // Cockpit Card
      const elNome = document.getElementById('motorista-nome-display');
      const elEstacao = document.getElementById('motorista-estacao-texto');
      const elNumViagens = document.getElementById('motorista-num-viagens');
      const elLinhaDisplay = document.getElementById('motorista-linha-display');
      const elDestinoDisplay = document.getElementById('motorista-destino-display');
      const elMobileBadge = document.getElementById('cockpit-mobile-badge');
      const elMobileDestino = document.getElementById('cockpit-mobile-destino');

      if (elNome) elNome.textContent = estadoMotorista.nome;
      if (elEstacao) elEstacao.textContent = estadoMotorista.estacao;
      if (elNumViagens) elNumViagens.textContent = `${estadoMotorista.viagensHoje} viagens`;
      if (elLinhaDisplay) elLinhaDisplay.textContent = estadoMotorista.linhaCodigo;
      if (elDestinoDisplay) elDestinoDisplay.textContent = estadoMotorista.linhaNome;
      if (elMobileBadge) elMobileBadge.textContent = estadoMotorista.linhaCodigo;
      if (elMobileDestino) elMobileDestino.textContent = estadoMotorista.linhaNome;

      // Sincronizar subtítulo
      const mainSubtitulo = document.getElementById('main-subtitulo');
      if (mainSubtitulo) {
        mainSubtitulo.innerHTML = `Santa Rita do Sapucaí &mdash; ${estadoMotorista.veiculo} (${estadoMotorista.linhaCodigo} ${estadoMotorista.linhaNome})`;
      }

      // Sincronizar estado visual dos cards e botões da escala
      const cardsConfig = [
        {
          chave: 'fernandes',
          btnId: 'btn-escala-fernandes',
          tagId: 'tag-status-fernandes',
          cardId: 'card-escala-fernandes',
          cor: '#2563eb',
          classeInativo: 'btn-rota-acao--azul',
          textoAtivar: 'Ativar Rota Fernandes',
          tagInativa: '32 Paradas • 10,9 km'
        },
        {
          chave: 'anchieta',
          btnId: 'btn-escala-anchieta',
          tagId: 'tag-status-anchieta',
          cardId: 'card-escala-anchieta',
          cor: '#16a34a',
          classeInativo: 'btn-rota-acao--verde',
          textoAtivar: 'Ativar Rota Anchieta',
          tagInativa: '14 Paradas • 4,5 km'
        },
        {
          chave: 'fortaleza',
          btnId: 'btn-escala-fortaleza',
          tagId: 'tag-status-fortaleza',
          cardId: 'card-escala-fortaleza',
          cor: '#9333ea',
          classeInativo: 'btn-rota-acao--roxo',
          textoAtivar: 'Ativar Rota Fortaleza',
          tagInativa: '30 Paradas • 11,0 km'
        },
        {
          chave: 'industrial',
          btnId: 'btn-escala-industrial',
          tagId: 'tag-status-industrial',
          cardId: 'card-escala-industrial',
          cor: '#ea580c',
          classeInativo: 'btn-rota-acao--laranja',
          textoAtivar: 'Ativar Rota Industrial',
          tagInativa: '12 Paradas • 9,4 km'
        },
        {
          chave: 'porto_sapucai',
          btnId: 'btn-escala-porto-sapucai',
          tagId: 'tag-status-porto-sapucai',
          cardId: 'card-escala-porto-sapucai',
          cor: '#0891b2',
          classeInativo: 'btn-rota-acao--ciano',
          textoAtivar: 'Ativar Rota Porto Sapucaí',
          tagInativa: '18 Paradas • 13,4 km'
        },
        {
          chave: 'reforco_jose_gm',
          btnId: 'btn-escala-reforco-jose-gm',
          tagId: 'tag-status-reforco-jose-gm',
          cardId: 'card-escala-reforco-jose-gm',
          cor: '#dc2626',
          classeInativo: 'btn-rota-acao--vermelho',
          textoAtivar: 'Ativar Rota Reforço José G.M.',
          tagInativa: '19 Paradas • 6,4 km'
        },
        {
          chave: 'sao_benedito_hora_meia',
          btnId: 'btn-escala-sao-benedito-hora-meia',
          tagId: 'tag-status-sao-benedito-hora-meia',
          cardId: 'card-escala-sao-benedito-hora-meia',
          cor: '#db2777',
          classeInativo: 'btn-rota-acao--rosa',
          textoAtivar: 'Ativar Rota São Benedito (Hora e Meia)',
          tagInativa: '24 Paradas • 9,1 km'
        },
        {
          chave: 'sao_benedito_hora',
          btnId: 'btn-escala-sao-benedito-hora',
          tagId: 'tag-status-sao-benedito-hora',
          cardId: 'card-escala-sao-benedito-hora',
          cor: '#eab308',
          classeInativo: 'btn-rota-acao--amarelo',
          textoAtivar: 'Ativar Rota São Benedito (Hora)',
          tagInativa: '26 Paradas • 9,0 km'
        }
      ];

      const linhaAtivaAtual = estadoMotorista.linhaAtivaChave || 'fernandes';
      cardsConfig.forEach(cfg => {
        const btn = document.getElementById(cfg.btnId);
        const tag = document.getElementById(cfg.tagId);
        const card = document.getElementById(cfg.cardId);
        const isAtiva = (cfg.chave === linhaAtivaAtual);

        if (isAtiva) {
          if (btn) {
            btn.className = 'btn-rota-acao btn-rota-acao--ativo rota-card__btn-trocar';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Ativa no Cockpit</span>';
          }
          if (tag) {
            tag.textContent = 'Ativa no Cockpit';
            tag.style.backgroundColor = `${cfg.cor}24`;
            tag.style.color = cfg.cor;
          }
          if (card) card.style.border = `2px solid ${cfg.cor}`;
        } else {
          if (btn) {
            btn.className = `btn-rota-acao ${cfg.classeInativo} rota-card__btn-trocar`;
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>${cfg.textoAtivar}</span>`;
          }
          if (tag) {
            tag.textContent = cfg.tagInativa;
            tag.style.backgroundColor = 'rgba(100, 116, 139, 0.12)';
            tag.style.color = 'var(--texto-secundario)';
          }
          if (card) card.style.border = '1px solid var(--borda-cor)';
        }
      });

      // Métricas do Cockpit
      const elDistancia = document.getElementById('metrica-distancia');
      const elTempo = document.getElementById('metrica-tempo');
      const elParada = document.getElementById('metrica-parada');
      const elIndicador = document.getElementById('parada-nav-indicador');

      if (elDistancia) elDistancia.textContent = `${estadoMotorista.distanciaKm.toFixed(1)} km`;
      if (elTempo) elTempo.textContent = `${estadoMotorista.tempoMin} min`;
      if (elParada) {
        elParada.textContent = estadoMotorista.proximaParada;
        elParada.title = estadoMotorista.proximaParada;
      }
      const chaveAtiva = estadoMotorista.linhaAtivaChave || 'fernandes';
      if (elIndicador && window.VALEBUS_PARADAS && window.VALEBUS_PARADAS.paradasPorLinha && window.VALEBUS_PARADAS.paradasPorLinha[chaveAtiva]) {
        const total = window.VALEBUS_PARADAS.paradasPorLinha[chaveAtiva].length;
        elIndicador.textContent = `${(indiceParadaAtual || 0) + 1}/${total}`;
      }

      // Perfil
      const elPerfilNome = document.getElementById('perfil-nome-texto');
      const elPerfilMatricula = document.getElementById('perfil-matricula-texto');
      const elPerfilVeiculo = document.getElementById('perfil-veiculo-display');
      const elPerfilStatViagens = document.getElementById('perfil-stat-viagens');

      if (elPerfilNome) elPerfilNome.textContent = estadoMotorista.nome;
      if (elPerfilMatricula) elPerfilMatricula.textContent = `Matrícula: ${estadoMotorista.matricula} • CNH Categoria D`;
      if (elPerfilVeiculo) elPerfilVeiculo.textContent = `${estadoMotorista.veiculo} • Placa RTA-4B29`;
      if (elPerfilStatViagens) elPerfilStatViagens.textContent = estadoMotorista.viagensHoje;
    }

    renderizarDadosMotorista();

    /* ──────────────────────────────────────────────────────────
      4. DADOS DAS LINHAS E FROTA COMPLETA (Santa Rita do Sapucaí)
      ────────────────────────────────────────────────────────── */
    const LINHAS = window.VALEBUS_CATALOGO_OPERACIONAL.linhas;
    const FROTA = window.VALEBUS_CATALOGO_OPERACIONAL.frota.map((onibus) => ({
      ...onibus,
      linha: LINHAS[onibus.chaveLinha],
      posicao: [...onibus.posicao],
      isMeuOnibus: onibus.chaveLinha === 'fernandes'
    }));

    /* ──────────────────────────────────────────────────────────
      5. INICIALIZAÇÃO DO MAPA LEAFLET & MARCADORES INTERATIVOS
      ────────────────────────────────────────────────────────── */
    const mapaEl = document.getElementById('mapa-motorista');
    let map = null;
    let meuOnibusMarker = null;
    const marcadoresMap = new Map();

    // Leaflet resiliente: delega dinamicamente para o Leaflet real (window.L) com fallback seguro
    const getLeaflet = () => {
      if (typeof window !== 'undefined' && window.L) return window.L;
      if (typeof L !== 'undefined') return L;
      return null;
    };

    const L_API = {
      layerGroup: (...args) => {
        const l = getLeaflet();
        return l ? l.layerGroup(...args) : { clearLayers: () => {}, addLayer: () => {}, addTo: () => {}, removeLayer: () => {} };
      },
      divIcon: (...args) => {
        const l = getLeaflet();
        return l ? l.divIcon(...args) : {};
      },
      marker: (...args) => {
        const l = getLeaflet();
        if (l) return l.marker(...args);
        return {
          bindPopup: function() { return this; },
          bindTooltip: function() { return this; },
          addTo: function() { return this; },
          getLatLng: () => ({ lat: -22.25, lng: -45.7 }),
          setLatLng: () => {},
          isPopupOpen: () => false,
          openPopup: () => {},
          closePopup: () => {},
          setPopupContent: () => {}
        };
      },
      polyline: (...args) => {
        const l = getLeaflet();
        if (l) return l.polyline(...args);
        return {
          bindTooltip: function() { return this; },
          on: function() { return this; },
          setStyle: () => {},
          getBounds: () => [[-22.26, -45.72], [-22.24, -45.69]]
        };
      },
      map: (...args) => {
        const l = getLeaflet();
        if (l) return l.map(...args);
        return {
          setView: function() { return this; },
          fitBounds: () => {},
          flyTo: () => {},
          panTo: () => {},
          hasLayer: () => false,
          addLayer: () => {},
          removeLayer: () => {},
          on: () => {},
          closePopup: () => {},
          invalidateSize: () => {}
        };
      },
      tileLayer: (...args) => {
        const l = getLeaflet();
        return l ? l.tileLayer(...args) : { addTo: () => {} };
      }
    };

    // Camadas vetoriais dinâmicas da linha ativa
    const camadaTrajetoLinha = L_API.layerGroup();
    const camadaParadasLinha = L_API.layerGroup();
    let rotaVisivel = true;
    let paradasVisiveis = true;
    let polylineLinha = null;
    let waypointLinhaIndex = 0;
    const marcadoresParadasLinha = [];

    function renderizarMarcadorMeuOnibus(chaveLinha) {
      if (!map) return null;

      const meuOnibus = FROTA.find(bus => bus.chaveLinha === chaveLinha) || FROTA[0];
      FROTA.forEach(bus => {
        bus.isMeuOnibus = bus === meuOnibus;
      });

      meuOnibus.veiculo = estadoMotorista.veiculo || meuOnibus.veiculo;

      if (meuOnibusMarker && map.hasLayer(meuOnibusMarker)) {
        map.removeLayer(meuOnibusMarker);
      }
      marcadoresMap.clear();

      const marker = L_API.marker(meuOnibus.posicao, {
        icon: criarIconeBus(meuOnibus.linha.cor, true)
      })
        .addTo(map)
        .bindPopup(gerarHtmlPopup(meuOnibus));

      meuOnibusMarker = marker;
      marcadoresMap.set(meuOnibus.chaveLinha, { marker, bus: meuOnibus });
      return meuOnibus;
    }

    function criarIconeBus(cor, isMeu = false) {
      const htmlIcone = `
        <div class="bus-marker-container">
          <div class="bus-marker" style="background-color: ${cor}; ${isMeu ? 'border: 2.5px solid #38bdf8; box-shadow: 0 0 16px rgba(56,189,248,0.9); transform: scale(1.08);' : ''}">
            <svg viewBox="0 0 24 24">
              <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
              <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
            </svg>
            <div class="bus-marker-pulse" style="color: ${cor};"></div>
          </div>
        </div>
      `;

      return L_API.divIcon({
        html: htmlIcone,
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -18]
      });
    }

    function gerarHtmlPopup(bus) {
      const isMeu = bus.isMeuOnibus;
      return `
        <div class="popup-onibus">
          <div class="popup-onibus__header">
            <span class="popup-onibus__dot" style="background-color: ${bus.linha.cor};"></span>
            <h3 class="popup-onibus__titulo" style="color: ${bus.linha.cor};">
              ${isMeu ? 'Seu Veículo (#02) • ' : ''}${bus.linha.nome}
            </h3>
          </div>
          <div class="popup-onibus__corpo">
            <div class="popup-onibus__item">
              <span class="popup-onibus__rotulo">🚩 Partida:</span>
              <span class="popup-onibus__valor">${bus.linha.partida}</span>
            </div>
            <div class="popup-onibus__item">
              <span class="popup-onibus__rotulo">📍 Próxima Parada:</span>
              <span class="popup-onibus__valor">${bus.linha.proximaParada}</span>
            </div>
          </div>
          <div class="popup-onibus__footer">
            <span class="popup-onibus__velocidade">⚡ <strong>${bus.velocidade} km/h</strong></span>
            <span class="popup-onibus__gps-badge">${isMeu ? 'Transmissão Ao Vivo' : 'GPS Online'}</span>
          </div>
        </div>
      `;
    }

    /* ──────────────────────────────────────────────────────────
      5.1. PONTOS DE ÔNIBUS COM ÍCONE OFICIAL (QUALQUER LINHA)
      ────────────────────────────────────────────────────────── */
    function criarIconeParadaMotorista(ponto, index, total, corLinha = '#2563eb') {
      const num = ponto.numero || (index + 1);
      const htmlIcone = `
        <div class="ponto-parada-container motorista-ponto-parada" data-linha="${ponto.linha || estadoMotorista.linhaAtivaChave}" data-num="${num}" title="Parada #${num}: ${ponto.referencia}">
          <div class="ponto-parada-pin" style="--cor-ponto: ${corLinha};">
            <div class="ponto-parada-corpo" style="background-color: ${corLinha};">
              <svg class="ponto-parada-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="3" width="16" height="13" rx="2"></rect>
                <path d="M4 10h16"></path>
                <path d="M7 16v3"></path>
                <path d="M17 16v3"></path>
                <circle cx="8" cy="13" r="1" fill="#ffffff"></circle>
                <circle cx="16" cy="13" r="1" fill="#ffffff"></circle>
              </svg>
            </div>
            <div class="ponto-parada-ponteiro" style="border-top-color: ${corLinha};"></div>
          </div>
        </div>
      `;

      return L_API.divIcon({
        html: htmlIcone,
        className: 'leaflet-ponto-parada-wrapper',
        iconSize: [24, 30],
        iconAnchor: [12, 28],
        popupAnchor: [0, -26]
      });
    }

    function gerarHtmlPopupParadaMotorista(ponto, index, total, nomeLinha, corLinha = '#2563eb') {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ponto.posicao[0]},${ponto.posicao[1]}`;
      const num = ponto.numero || (index + 1);

      return `
        <div class="popup-ponto popup-ponto--motorista" style="min-width: 240px; padding: 4px;">
          <div class="popup-ponto__topo" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: ${corLinha}; text-transform: uppercase; letter-spacing: 0.04em;">
              Parada #${num} de ${total} &bull; ${nomeLinha}
            </span>
            <span style="font-size: 10px; font-weight: 700; background: rgba(37, 99, 235, 0.12); color: ${corLinha}; padding: 2px 7px; border-radius: 999px;">
              ${ponto.sentido || 'Sentido da Linha'}
            </span>
          </div>

          <div class="popup-ponto__corpo">
            <div class="popup-ponto__item" style="margin-bottom: 6px;">
              <span class="popup-ponto__rotulo" style="display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Endereço</span>
              <h4 class="popup-ponto__endereco" style="color: #0f172a; font-size: 12.5px; font-weight: 700; margin: 2px 0 0;">${ponto.endereco}</h4>
            </div>
            <div class="popup-ponto__item" style="margin-top: 4px;">
              <span class="popup-ponto__rotulo" style="display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Ponto de Referência</span>
              <div class="popup-ponto__referencia" style="color: ${corLinha}; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <span>${ponto.referencia}</span>
              </div>
            </div>
          </div>

          <div class="popup-ponto__acoes" style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <button type="button" class="btn-definir-parada-alvo" data-indice="${index}" style="background: ${corLinha}; color: #ffffff; border: none; border-radius: 8px; padding: 7px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Definir como Próxima Parada no Cockpit</span>
            </button>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-ponto__btn-maps" style="display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; color: #64748b; text-decoration: none; padding: 3px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Ver no Google Maps</span>
            </a>
          </div>
        </div>
      `;
    }

    function renderizarParadasLinha(chaveLinha) {
      camadaParadasLinha.clearLayers();
      marcadoresParadasLinha.length = 0;

      if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.paradasPorLinha || !window.VALEBUS_PARADAS.paradasPorLinha[chaveLinha]) {
        return;
      }

      const paradas = window.VALEBUS_PARADAS.paradasPorLinha[chaveLinha];
      let cor = '#2563eb';
      let nome = 'Linha Fernandes';
      if (chaveLinha === 'anchieta') {
        cor = '#16a34a';
        nome = 'Linha Anchieta';
      } else if (chaveLinha === 'fortaleza') {
        cor = '#9333ea';
        nome = 'Linha Fortaleza';
      } else if (chaveLinha === 'industrial') {
        cor = '#ea580c';
        nome = 'Linha Industrial';
      } else if (chaveLinha === 'porto_sapucai') {
        cor = '#0891b2';
        nome = 'Linha Porto Sapucaí';
      } else if (chaveLinha === 'reforco_jose_gm') {
        cor = '#dc2626';
        nome = 'Linha Reforço José G.M.';
      } else if (chaveLinha === 'sao_benedito_hora_meia') {
        cor = '#db2777';
        nome = 'Linha São Benedito (Hora e Meia)';
      } else if (chaveLinha === 'sao_benedito_hora') {
        cor = '#eab308';
        nome = 'Linha São Benedito (Hora)';
      }

      paradas.forEach((ponto, index) => {
        const icone = criarIconeParadaMotorista(ponto, index, paradas.length, cor);
        const popupHtml = gerarHtmlPopupParadaMotorista(ponto, index, paradas.length, nome, cor);

        const marker = L_API.marker(ponto.posicao, {
          icon: icone,
          title: `Parada #${ponto.numero || (index + 1)}: ${ponto.referencia}`
        }).bindPopup(popupHtml, { maxWidth: 300, minWidth: 260 });

        marker.bindTooltip(
          `<strong>#${ponto.numero || (index + 1)} &bull; ${ponto.referencia}</strong><br><span style="font-size:11px;color:#cbd5e1;">${ponto.endereco}</span>`,
          { direction: 'top', offset: [0, -28], opacity: 0.95 }
        );

        marcadoresParadasLinha.push(marker);
        camadaParadasLinha.addLayer(marker);
      });

      if (paradasVisiveis && map && !map.hasLayer(camadaParadasLinha)) {
        camadaParadasLinha.addTo(map);
      }
    }

    /* ──────────────────────────────────────────────────────────
      5.2. TRAÇADO VETORIAL DA LINHA ATIVA
      ────────────────────────────────────────────────────────── */
    function renderizarRotaLinha(chaveLinha) {
      camadaTrajetoLinha.clearLayers();
      polylineLinha = null;

      if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.obterTrajeto) return;

      const coords = window.VALEBUS_PARADAS.obterTrajeto(chaveLinha);
      if (!coords || coords.length === 0) return;

      let cor = '#2563eb';
      let corHalo = '#172554';
      let titulo = 'Linha Fernandes &bull; Rota Oficial';
      let desc = 'Fernandes ➔ Centro ➔ Algodoeira (10,9 km &bull; 32 paradas)';

      if (chaveLinha === 'anchieta') {
        cor = '#16a34a';
        corHalo = '#052e16';
        titulo = 'Linha Anchieta &bull; Rota Oficial';
        desc = 'Praça Urbana Carolina ➔ Recanto (4,5 km &bull; 14 paradas)';
      } else if (chaveLinha === 'fortaleza') {
        cor = '#9333ea';
        corHalo = '#3b0764';
        titulo = 'Linha Fortaleza &bull; Rota Oficial';
        desc = 'Fernandes ➔ Centro ➔ Bairro Fortaleza (11,0 km &bull; 30 paradas)';
      } else if (chaveLinha === 'industrial') {
        cor = '#ea580c';
        corHalo = '#431407';
        titulo = 'Linha Industrial &bull; Rota Oficial';
        desc = 'Distrito Industrial ➔ BR-459 ➔ Centro ➔ Murilo (9,4 km &bull; 12 paradas)';
      } else if (chaveLinha === 'porto_sapucai') {
        cor = '#0891b2';
        corHalo = '#164e63';
        titulo = 'Linha Porto Sapucaí &bull; Rota Oficial';
        desc = 'Porto Sapucaí ➔ BR-459 ➔ Centro ➔ Murilo (13,4 km &bull; 18 paradas)';
      } else if (chaveLinha === 'reforco_jose_gm') {
        cor = '#dc2626';
        corHalo = '#450a0a';
        titulo = 'Linha Reforço José G.M. (Via MCM) &bull; Rota Oficial';
        desc = 'José Gonçalves Mendes ➔ Via MCM ➔ Centro ➔ Praça da Câmara (6,4 km &bull; 19 paradas)';
      } else if (chaveLinha === 'sao_benedito_hora_meia') {
        cor = '#db2777';
        corHalo = '#500724';
        titulo = 'Linha São Benedito (Hora e Meia) &bull; Rota Oficial';
        desc = 'José Gonçalves Mendes ➔ Praça São Benedito ➔ Santos Dumont ➔ Murilo (9,1 km &bull; 24 paradas)';
      } else if (chaveLinha === 'sao_benedito_hora') {
        cor = '#eab308';
        corHalo = '#713f12';
        titulo = 'Linha São Benedito (Hora) &bull; Rota Oficial';
        desc = 'José Gonçalves Mendes ➔ Praça São Benedito ➔ D.L. ➔ Usivale ➔ Murilo (9,0 km &bull; 26 paradas)';
      }

      const polyHalo = L_API.polyline(coords, {
        color: corHalo,
        weight: 7.5,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      });

      polylineLinha = L_API.polyline(coords, {
        color: cor,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true
      });

      polylineLinha.bindTooltip(
        `<strong>${titulo}</strong><br><span style="font-size:11px;color:#cbd5e1;">Itinerário: ${desc}</span>`,
        { sticky: true, opacity: 0.95 }
      );

      polylineLinha.on('mouseover', () => {
        polylineLinha.setStyle({ weight: 7, opacity: 1 });
      });
      polylineLinha.on('mouseout', () => {
        polylineLinha.setStyle({ weight: 5, opacity: 0.95 });
      });

      camadaTrajetoLinha.addLayer(polyHalo);
      camadaTrajetoLinha.addLayer(polylineLinha);

      if (rotaVisivel && map && !map.hasLayer(camadaTrajetoLinha)) {
        camadaTrajetoLinha.addTo(map);
      }
    }

    function enquadrarRotaLinha() {
      if (!map) return;
      if (polylineLinha) {
        map.fitBounds(polylineLinha.getBounds(), { padding: [40, 40], maxZoom: 16 });
        const nomes = {
          anchieta: 'Linha Anchieta',
          fernandes: 'Linha Fernandes',
          fortaleza: 'Linha Fortaleza',
          industrial: 'Linha Industrial',
          porto_sapucai: 'Linha Porto Sapucaí',
          reforco_jose_gm: 'Linha Reforço José G.M.',
          sao_benedito_hora_meia: 'Linha São Benedito (Hora e Meia)',
          sao_benedito_hora: 'Linha São Benedito (Hora)'
        };
        const nome = nomes[estadoMotorista.linhaAtivaChave] || 'Linha Selecionada';
        mostrarToast(`Rota da ${nome} enquadrada no mapa.`);
      } else if (window.VALEBUS_PARADAS) {
        const coords = window.VALEBUS_PARADAS.obterTrajeto(estadoMotorista.linhaAtivaChave);
        if (coords && coords.length > 0) {
          map.fitBounds(L_API.polyline(coords).getBounds(), { padding: [40, 40] });
        }
      }
    }

    function selecionarParadaCockpit(indice, abrirPopupMapa = false) {
      const chave = estadoMotorista.linhaAtivaChave || 'fernandes';
      if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.paradasPorLinha || !window.VALEBUS_PARADAS.paradasPorLinha[chave]) {
        return;
      }
      const paradas = window.VALEBUS_PARADAS.paradasPorLinha[chave];
      if (indice < 0) indice = 0;
      if (indice >= paradas.length) indice = paradas.length - 1;

      indiceParadaAtual = indice;
      const ponto = paradas[indiceParadaAtual];
      const num = ponto.numero || (indiceParadaAtual + 1);

      estadoMotorista.proximaParada = `${num}. ${ponto.referencia}`;
      const fracaoRestante = (paradas.length - indiceParadaAtual) / paradas.length;
      let distTotal = 10.9;
      let tempoTotal = 35;
      if (chave === 'anchieta') {
        distTotal = 4.5;
        tempoTotal = 15;
      } else if (chave === 'fortaleza') {
        distTotal = 11.0;
        tempoTotal = 36;
      } else if (chave === 'industrial') {
        distTotal = 9.4;
        tempoTotal = 25;
      } else if (chave === 'porto_sapucai') {
        distTotal = 13.4;
        tempoTotal = 32;
      } else if (chave === 'reforco_jose_gm') {
        distTotal = 6.4;
        tempoTotal = 18;
      } else if (chave === 'sao_benedito_hora_meia') {
        distTotal = 9.1;
        tempoTotal = 24;
      } else if (chave === 'sao_benedito_hora') {
        distTotal = 9.0;
        tempoTotal = 23;
      }
      estadoMotorista.distanciaKm = parseFloat((distTotal * Math.max(0.05, fracaoRestante)).toFixed(1));
      estadoMotorista.tempoMin = Math.max(1, Math.round(tempoTotal * Math.max(0.05, fracaoRestante)));

      renderizarDadosMotorista();

      const elIndicador = document.getElementById('parada-nav-indicador');
      if (elIndicador) {
        elIndicador.textContent = `${num}/${paradas.length}`;
      }

      if (abrirPopupMapa && map && marcadoresParadasLinha[indiceParadaAtual]) {
        const marker = marcadoresParadasLinha[indiceParadaAtual];
        map.panTo(marker.getLatLng(), { animate: true });
        marker.openPopup();
      }
    }

    /* ──────────────────────────────────────────────────────────
      5.3. SINCRONIZAÇÃO DE ROTA & CONTROLES DO COCKPIT
      ────────────────────────────────────────────────────────── */
    function atualizarBotoesFlutuantesLinha(chaveLinha) {
      let cor = '#2563eb';
      let labelRota = 'Rota Fernandes (10.9 km)';
      let totalP = 32;

      if (chaveLinha === 'anchieta') {
        cor = '#16a34a';
        labelRota = 'Rota Anchieta (4.5 km)';
        totalP = 14;
      } else if (chaveLinha === 'fortaleza') {
        cor = '#9333ea';
        labelRota = 'Rota Fortaleza (11.0 km)';
        totalP = 30;
      } else if (chaveLinha === 'industrial') {
        cor = '#ea580c';
        labelRota = 'Rota Industrial (9.4 km)';
        totalP = 12;
      } else if (chaveLinha === 'porto_sapucai') {
        cor = '#0891b2';
        labelRota = 'Rota Porto Sapucaí (13.4 km)';
        totalP = 18;
      } else if (chaveLinha === 'reforco_jose_gm') {
        cor = '#dc2626';
        labelRota = 'Rota Reforço José G.M. (6.4 km)';
        totalP = 19;
      } else if (chaveLinha === 'sao_benedito_hora_meia') {
        cor = '#db2777';
        labelRota = 'Rota São Benedito Hora e Meia (9.1 km)';
        totalP = 24;
      } else if (chaveLinha === 'sao_benedito_hora') {
        cor = '#eab308';
        labelRota = 'Rota São Benedito Hora (9.0 km)';
        totalP = 26;
      }

      const dot = document.getElementById('dot-rota-ativa');
      const txtRota = document.getElementById('label-toggle-rota');

      if (dot) dot.style.backgroundColor = cor;
      if (txtRota) txtRota.textContent = labelRota;

      if (btnToggleRotaAnchieta) {
        btnToggleRotaAnchieta.classList.toggle('motorista-btn-flutuante--ativo', rotaVisivel);
        btnToggleRotaAnchieta.setAttribute('aria-pressed', rotaVisivel ? 'true' : 'false');
      }
    }

    function ativarLinhaNoCockpit(chaveLinha) {
      estadoMotorista.linhaAtivaChave = chaveLinha;
      waypointLinhaIndex = 0;

      if (chaveLinha === 'sao_benedito_hora') {
        estadoMotorista.linhaCodigo = 'Linha São Benedito (Hora)';
        estadoMotorista.linhaNome = 'José Gonçalves Mendes / Praça São Benedito / Empresa D.L. / Usivale / Centro / Praça Urbana Carolina';
        estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
        estadoMotorista.distanciaKm = 9.0;
        estadoMotorista.tempoMin = 23;
        estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
      } else if (chaveLinha === 'sao_benedito_hora_meia') {
        estadoMotorista.linhaCodigo = 'Linha São Benedito (Hora e Meia)';
        estadoMotorista.linhaNome = 'José Gonçalves Mendes / Praça São Benedito / Santos Dumont / Praça Urbana Carolina';
        estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
        estadoMotorista.distanciaKm = 9.1;
        estadoMotorista.tempoMin = 24;
        estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
      } else if (chaveLinha === 'reforco_jose_gm') {
        estadoMotorista.linhaCodigo = 'Linha Reforço José G.M.';
        estadoMotorista.linhaNome = 'José Gonçalves Mendes / Via MCM / Centro / Praça da Câmara';
        estadoMotorista.estacao = "R. Das Rosas, 300 | Caixa D'Água Da Copasa";
        estadoMotorista.distanciaKm = 6.4;
        estadoMotorista.tempoMin = 18;
        estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
      } else if (chaveLinha === 'porto_sapucai') {
        estadoMotorista.linhaCodigo = 'Linha Porto Sapucaí';
        estadoMotorista.linhaNome = 'Porto Sapucaí / BR-459 / Centro / Praça Urbana Carolina';
        estadoMotorista.estacao = 'BR-459 Rod. JK, Km 116 Leste | Porto Sapucaí';
        estadoMotorista.distanciaKm = 13.4;
        estadoMotorista.tempoMin = 32;
        estadoMotorista.proximaParada = '1. Porto Sapucaí';
      } else if (chaveLinha === 'industrial') {
        estadoMotorista.linhaCodigo = 'Linha Industrial';
        estadoMotorista.linhaNome = 'Distrito Industrial / BR-459 / Centro / Praça Urbana Carolina';
        estadoMotorista.estacao = 'BR-459 Rod. JK, Km 119,8 Leste | Entr. MG-173 Para Cachoeira de Minas';
        estadoMotorista.distanciaKm = 9.4;
        estadoMotorista.tempoMin = 25;
        estadoMotorista.proximaParada = '1. Entr. MG-173 Para Cachoeira De Minas';
      } else if (chaveLinha === 'fortaleza') {
        estadoMotorista.linhaCodigo = 'Linha Fortaleza';
        estadoMotorista.linhaNome = 'Bairro Fernandes / São Benedito / Centro / Bairro Fortaleza';
        estadoMotorista.estacao = "Rua Das Rosas, 300 | Caixa D'Água Da Copasa";
        estadoMotorista.distanciaKm = 11.0;
        estadoMotorista.tempoMin = 36;
        estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
      } else if (chaveLinha === 'anchieta') {
        estadoMotorista.linhaCodigo = 'Linha Anchieta';
        estadoMotorista.linhaNome = 'Praça Urbana / Recanto';
        estadoMotorista.estacao = 'Praça Urbana Carolina';
        estadoMotorista.distanciaKm = 4.5;
        estadoMotorista.tempoMin = 15;
        estadoMotorista.proximaParada = '1. Praça Do Murilo';
      } else {
        estadoMotorista.linhaCodigo = 'Linha Fernandes';
        estadoMotorista.linhaNome = 'Bairro Fernandes / São Benedito / Centro / Algodoeira';
        estadoMotorista.estacao = "Rua Das Rosas, 300 | Caixa D'Água Da Copasa";
        estadoMotorista.distanciaKm = 10.9;
        estadoMotorista.tempoMin = 35;
        estadoMotorista.proximaParada = "1. Caixa D'Água Da Copasa";
      }

      renderizarMarcadorMeuOnibus(chaveLinha);

      // Posiciona o ônibus do motorista na Parada 1 da linha
      if (meuOnibusMarker && window.VALEBUS_PARADAS) {
        const paradas = window.VALEBUS_PARADAS.paradasPorLinha[chaveLinha];
        if (paradas && paradas.length > 0) {
          meuOnibusMarker.setLatLng(paradas[0].posicao);
        }
      }

      // Renderiza a rota e paradas da linha ativa
      renderizarRotaLinha(chaveLinha);
      renderizarParadasLinha(chaveLinha);
      selecionarParadaCockpit(0, false);

      // Atualiza controles flutuantes
      atualizarBotoesFlutuantesLinha(chaveLinha);

      renderizarDadosMotorista();
      enquadrarRotaLinha();

      const infoLinhas = {
        fernandes: { nome: 'Linha Fernandes', detalhe: '32 paradas (10,9 km)' },
        anchieta: { nome: 'Linha Anchieta', detalhe: '14 paradas (4,5 km)' },
        fortaleza: { nome: 'Linha Fortaleza', detalhe: '30 paradas (11,0 km)' },
        industrial: { nome: 'Linha Industrial', detalhe: '12 paradas (9,4 km)' },
        porto_sapucai: { nome: 'Linha Porto Sapucaí', detalhe: '18 paradas (13,4 km)' },
        reforco_jose_gm: { nome: 'Linha Reforço José G.M. (Via MCM)', detalhe: '19 paradas (6,4 km)' },
        sao_benedito_hora_meia: { nome: 'Linha São Benedito (Hora e Meia)', detalhe: '24 paradas (9,1 km)' },
        sao_benedito_hora: { nome: 'Linha São Benedito (Hora)', detalhe: '26 paradas (9,0 km)' }
      };
      const info = infoLinhas[chaveLinha] || { nome: chaveLinha, detalhe: '' };
      mostrarToast(`${info.nome} ativada no Cockpit com ${info.detalhe}.`);
    }

    if (mapaEl) {
      try {
        map = L_API.map('mapa-motorista', {
          zoomControl: true,
          attributionControl: false
        }).setView([-22.2505, -45.7005], 14);

        L_API.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Renderiza a rota e paradas da linha inicial (Fernandes por padrão)
        const linhaInicial = estadoMotorista.linhaAtivaChave || 'fernandes';
        renderizarRotaLinha(linhaInicial);
        renderizarParadasLinha(linhaInicial);

        // Exibe somente o veículo associado ao motorista atual.
        renderizarMarcadorMeuOnibus(linhaInicial);

        // Event listener para cliques dentro de popups (ex: Definir como Próxima Parada)
        map.on('popupopen', (e) => {
          const popupEl = e.popup.getElement();
          if (!popupEl) return;
          const btnAlvo = popupEl.querySelector('.btn-definir-parada-alvo');
          if (btnAlvo) {
            btnAlvo.onclick = () => {
              const idx = parseInt(btnAlvo.getAttribute('data-indice'), 10);
              selecionarParadaCockpit(idx);
              map.closePopup();
              mostrarToast(`Parada #${idx + 1} definida como destino imediato no cockpit.`);
            };
          }
        });

        // Garante renderização imediata das camadas e ladrilhos do mapa
        setTimeout(() => {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
          }
        }, 200);

        setTimeout(() => {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
          }
        }, 800);

        window.addEventListener('resize', () => {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
          }
        });
      } catch (err) {
        console.warn('Mapa operando com fallback resiliente:', err);
      }

      // Simulação contínua de movimentação GPS da frota
      setInterval(() => {
        const chaveAtiva = estadoMotorista.linhaAtivaChave || 'fernandes';

        // Se estiver em rota, o veículo do motorista navega fielmente pelos waypoints da linha ativa
        if (meuOnibusMarker && estadoMotorista.emRota && window.VALEBUS_PARADAS) {
          const coords = window.VALEBUS_PARADAS.obterTrajeto(chaveAtiva);
          if (coords && coords.length > 0) {
            waypointLinhaIndex = (waypointLinhaIndex + 1) % coords.length;
            const novoPonto = coords[waypointLinhaIndex];
            meuOnibusMarker.setLatLng(novoPonto);

            // Checa proximidade com as paradas da linha ativa para avanço automático suave
            const paradas = window.VALEBUS_PARADAS.paradasPorLinha[chaveAtiva] || [];
            for (let i = 0; i < paradas.length; i++) {
              const dLat = Math.abs(novoPonto[0] - paradas[i].posicao[0]);
              const dLng = Math.abs(novoPonto[1] - paradas[i].posicao[1]);
              if (dLat < 0.0012 && dLng < 0.0012 && i !== indiceParadaAtual) {
                selecionarParadaCockpit(i);
                break;
              }
            }
          }
        }

        marcadoresMap.forEach(({ marker, bus }) => {
          // Se for o ônibus do motorista e estiver seguindo o traçado da rota, não aplica desvio aleatório
          if (bus.isMeuOnibus && estadoMotorista.emRota) {
            return;
          }

          const latAtual = marker.getLatLng().lat;
          const lngAtual = marker.getLatLng().lng;

          // Deslocamento simulado para os demais ônibus da frota
          const fator = (bus.isMeuOnibus && estadoMotorista.emRota) ? 0.0006 : 0.0004;
          const deltaLat = (Math.random() - 0.49) * fator;
          const deltaLng = (Math.random() - 0.49) * fator;

          const novaLat = latAtual + deltaLat;
          const novaLng = lngAtual + deltaLng;

          marker.setLatLng([novaLat, novaLng]);

          // Variação leve na velocidade
          const velMin = (bus.isMeuOnibus && estadoMotorista.emRota) ? 25 : 15;
          const velMax = (bus.isMeuOnibus && estadoMotorista.emRota) ? 45 : 38;
          bus.velocidade = Math.min(velMax, Math.max(velMin, bus.velocidade + Math.floor((Math.random() - 0.5) * 4)));

          if (marker.isPopupOpen()) {
            marker.setPopupContent(gerarHtmlPopup(bus));
          }
        });
      }, 3000);
    }

    /* ──────────────────────────────────────────────────────────
      5.4. CONTROLES FLUTUANTES DO MAPA & STEPPER DE PARADAS
      ────────────────────────────────────────────────────────── */
    function ativarRotaNoMapa(enquadrar = true) {
      rotaVisivel = true;
      if (btnToggleRotaAnchieta) {
        btnToggleRotaAnchieta.classList.add('motorista-btn-flutuante--ativo');
        btnToggleRotaAnchieta.setAttribute('aria-pressed', 'true');
      }
      if (map && !map.hasLayer(camadaTrajetoLinha)) {
        camadaTrajetoLinha.addTo(map);
      }
      if (enquadrar) {
        enquadrarRotaLinha();
      }
    }

    function desativarRotaNoMapa() {
      rotaVisivel = false;
      if (btnToggleRotaAnchieta) {
        btnToggleRotaAnchieta.classList.remove('motorista-btn-flutuante--ativo');
        btnToggleRotaAnchieta.setAttribute('aria-pressed', 'false');
      }
      if (map && map.hasLayer(camadaTrajetoLinha)) {
        map.removeLayer(camadaTrajetoLinha);
      }
    }

    function ativarParadasNoMapa() {
      paradasVisiveis = true;
      if (btnToggleParadasAnchieta) {
        btnToggleParadasAnchieta.classList.add('motorista-btn-flutuante--ativo');
        btnToggleParadasAnchieta.setAttribute('aria-pressed', 'true');
      }
      if (map && !map.hasLayer(camadaParadasLinha)) {
        camadaParadasLinha.addTo(map);
      }
    }

    function desativarParadasNoMapa() {
      paradasVisiveis = false;
      if (btnToggleParadasAnchieta) {
        btnToggleParadasAnchieta.classList.remove('motorista-btn-flutuante--ativo');
        btnToggleParadasAnchieta.setAttribute('aria-pressed', 'false');
      }
      if (map && map.hasLayer(camadaParadasLinha)) {
        map.removeLayer(camadaParadasLinha);
      }
    }

    const btnToggleRotaAnchieta = document.getElementById('btn-toggle-rota-anchieta');
    if (btnToggleRotaAnchieta) {
      btnToggleRotaAnchieta.addEventListener('click', () => {
        const nomes = {
          anchieta: 'Linha Anchieta',
          fernandes: 'Linha Fernandes',
          fortaleza: 'Linha Fortaleza',
          industrial: 'Linha Industrial',
          porto_sapucai: 'Linha Porto Sapucaí',
          reforco_jose_gm: 'Linha Reforço José G.M.',
          sao_benedito_hora_meia: 'Linha São Benedito (Hora e Meia)',
          sao_benedito_hora: 'Linha São Benedito (Hora)'
        };
        const nome = nomes[estadoMotorista.linhaAtivaChave] || 'Linha Selecionada';
        if (!rotaVisivel) {
          ativarRotaNoMapa(true);
          mostrarToast(`Traçado oficial da ${nome} exibido no mapa.`);
        } else {
          desativarRotaNoMapa();
          mostrarToast(`Traçado da ${nome} ocultado.`);
        }
      });
    }

    const btnEnquadrarRotaAnchieta = document.getElementById('btn-enquadrar-rota-anchieta');
    if (btnEnquadrarRotaAnchieta) {
      btnEnquadrarRotaAnchieta.addEventListener('click', enquadrarRotaLinha);
    }

    // Stepper de navegação entre paradas no Cockpit
    const btnParadaAnterior = document.getElementById('btn-parada-anterior');
    const btnParadaProxima = document.getElementById('btn-parada-proxima');

    if (btnParadaAnterior) {
      btnParadaAnterior.addEventListener('click', () => {
        selecionarParadaCockpit(indiceParadaAtual - 1, true);
      });
    }

    if (btnParadaProxima) {
      btnParadaProxima.addEventListener('click', () => {
        selecionarParadaCockpit(indiceParadaAtual + 1, true);
      });
    }

    atualizarBotoesFlutuantesLinha(estadoMotorista.linhaAtivaChave || 'fernandes');
    selecionarParadaCockpit(0, false);

    /* ──────────────────────────────────────────────────────────
      6. RECENTRALIZAR GPS NO MEU ÔNIBUS
      ────────────────────────────────────────────────────────── */
    const btnRecenterGps = document.getElementById('btn-recenter-gps');
    if (btnRecenterGps) {
      btnRecenterGps.addEventListener('click', () => {
        if (map && meuOnibusMarker) {
          if (!map.hasLayer(meuOnibusMarker)) map.addLayer(meuOnibusMarker);
          map.flyTo(meuOnibusMarker.getLatLng(), 16, { animate: true, duration: 1.0 });
          meuOnibusMarker.openPopup();
          mostrarToast('Posição do seu veículo centralizada no mapa.');
        } else if (map) {
          map.flyTo([-22.2528, -45.7036], 14, { duration: 0.8 });
          mostrarToast('Posição centralizada no mapa.');
        } else {
          mostrarToast('Posição do seu veículo centralizada.');
        }
      });
    }

    /* ──────────────────────────────────────────────────────────
      7. CONTROLE DA VIAGEM (INICIAR / ENCERRAR ROTA)
      ────────────────────────────────────────────────────────── */
    const btnIniciarRota = document.getElementById('btn-iniciar-rota');
    const btnAcaoIcone = document.getElementById('btn-acao-icone');
    const btnAcaoTexto = document.getElementById('btn-acao-texto');
    const bannerEmRota = document.getElementById('banner-em-rota');
    const elStatusTexto = document.getElementById('motorista-status-texto');
    const elTopStatus = document.getElementById('topbar-status-texto');

    let intervaloContador = null;

    if (btnIniciarRota) {
      btnIniciarRota.addEventListener('click', () => {
        estadoMotorista.emRota = !estadoMotorista.emRota;

        if (estadoMotorista.emRota) {
          // Viagem iniciada
          btnIniciarRota.classList.add('cockpit-btn-acao--encerrar');
          if (btnAcaoTexto) btnAcaoTexto.textContent = 'Encerrar Rota';
          if (btnAcaoIcone) {
            btnAcaoIcone.querySelector('use').setAttribute('href', '#icone-stop');
          }

          if (bannerEmRota) bannerEmRota.style.display = 'flex';
          if (elStatusTexto) elStatusTexto.textContent = 'Em Rota';
          if (elTopStatus) elTopStatus.textContent = 'Em Rota';

          // Traçar automaticamente a rota no mapa e exibir as paradas da linha
          ativarRotaNoMapa(false);
          ativarParadasNoMapa();

          mostrarToast('Boa viagem! Rota e paradas traçadas no mapa automaticamente.');

          // Enquadra a visão da rota no mapa e foca a navegação
          if (polylineLinha && map) {
            map.fitBounds(polylineLinha.getBounds(), { padding: [50, 50], maxZoom: 15 });
          } else if (meuOnibusMarker && map) {
            map.flyTo(meuOnibusMarker.getLatLng(), 15.5, { duration: 0.8 });
          }

          intervaloContador = setInterval(() => {
            if (!estadoMotorista.emRota) return;
            if (estadoMotorista.distanciaKm > 0.3) {
              estadoMotorista.distanciaKm = Math.max(0.1, estadoMotorista.distanciaKm - 0.1);
            }
            if (estadoMotorista.tempoMin > 1) {
              estadoMotorista.tempoMin = Math.max(1, estadoMotorista.tempoMin - 1);
            }
            renderizarDadosMotorista();
          }, 7000);

        } else {
          // Viagem encerrada
          btnIniciarRota.classList.remove('cockpit-btn-acao--encerrar');
          if (btnAcaoTexto) btnAcaoTexto.textContent = 'Iniciar Rota';
          if (btnAcaoIcone) {
            btnAcaoIcone.querySelector('use').setAttribute('href', '#icone-play');
          }

          if (bannerEmRota) bannerEmRota.style.display = 'none';
          if (elStatusTexto) elStatusTexto.textContent = 'Conectado';
          if (elTopStatus) elTopStatus.textContent = 'Telemetria Online';

          if (intervaloContador) clearInterval(intervaloContador);

          estadoMotorista.viagensHoje += 1;
          let distTot = 10.9;
          let tempoTot = 35;
          if (estadoMotorista.linhaAtivaChave === 'anchieta') {
            distTot = 4.5;
            tempoTot = 15;
          } else if (estadoMotorista.linhaAtivaChave === 'fortaleza') {
            distTot = 11.0;
            tempoTot = 36;
          } else if (estadoMotorista.linhaAtivaChave === 'industrial') {
            distTot = 9.4;
            tempoTot = 25;
          } else if (estadoMotorista.linhaAtivaChave === 'porto_sapucai') {
            distTot = 13.4;
            tempoTot = 32;
          } else if (estadoMotorista.linhaAtivaChave === 'reforco_jose_gm') {
            distTot = 6.4;
            tempoTot = 18;
          } else if (estadoMotorista.linhaAtivaChave === 'sao_benedito_hora_meia') {
            distTot = 9.1;
            tempoTot = 24;
          } else if (estadoMotorista.linhaAtivaChave === 'sao_benedito_hora') {
            distTot = 9.0;
            tempoTot = 23;
          }
          estadoMotorista.distanciaKm = distTot;
          estadoMotorista.tempoMin = tempoTot;

          try {
            window.ValeBusAPI.salvarViagensHoje(estadoMotorista.viagensHoje);
          } catch (e) {
            console.warn(e);
          }

          renderizarDadosMotorista();
          mostrarToast(`Viagem concluída com sucesso! ${estadoMotorista.viagensHoje}ª viagem registrada.`);
        }
      });
    }

    /* ──────────────────────────────────────────────────────────
      6. DROPDOWNS (MENU 3 PONTOS E USUÁRIO)
      ────────────────────────────────────────────────────────── */
    const btnMenuMotorista = document.getElementById('btn-menu-motorista');
    const dropdownMotorista = document.getElementById('dropdown-motorista');
    const btnUsuario = document.getElementById('btn-usuario-menu');
    const dropdownUsuario = document.getElementById('dropdown-usuario');

    function fecharTodosDropdowns() {
      if (dropdownMotorista) dropdownMotorista.classList.remove('notificacoes-dropdown--aberto');
      if (btnMenuMotorista) btnMenuMotorista.setAttribute('aria-expanded', 'false');
      if (dropdownUsuario) dropdownUsuario.classList.remove('usuario-dropdown--aberto');
      if (btnUsuario) btnUsuario.setAttribute('aria-expanded', 'false');
    }

    if (btnMenuMotorista && dropdownMotorista) {
      btnMenuMotorista.addEventListener('click', (e) => {
        e.stopPropagation();
        const aberto = dropdownMotorista.classList.contains('notificacoes-dropdown--aberto');
        fecharTodosDropdowns();
        if (!aberto) {
          dropdownMotorista.classList.add('notificacoes-dropdown--aberto');
          btnMenuMotorista.setAttribute('aria-expanded', 'true');
        }
      });
    }

    if (btnUsuario && dropdownUsuario) {
      btnUsuario.addEventListener('click', (e) => {
        e.stopPropagation();
        const aberto = dropdownUsuario.classList.contains('usuario-dropdown--aberto');
        fecharTodosDropdowns();
        if (!aberto) {
          dropdownUsuario.classList.add('usuario-dropdown--aberto');
          btnUsuario.setAttribute('aria-expanded', 'true');
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#topbar-acoes-wrapper') && !e.target.closest('#topbar-usuario-wrapper')) {
        fecharTodosDropdowns();
      }
    });

    // Encerramento da sessão do motorista: mantém os dados operacionais locais.
    document.querySelectorAll('.nav__item--sair, .usuario-dropdown__item--sair').forEach((botao) => {
      botao.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.ValeBusAPI && typeof window.ValeBusAPI.encerrarSessao === 'function') {
          window.ValeBusAPI.encerrarSessao('login.html');
          return;
        }
        localStorage.removeItem('valebus_usuario');
        window.location.href = 'login.html';
      });
    });

    /* ──────────────────────────────────────────────────────────
      7. NAVEGAÇÃO ENTRE SEÇÕES (SIDEBAR OFICIAL)
      ────────────────────────────────────────────────────────── */
    const navBtns = document.querySelectorAll('.nav__item[data-secao]');
    const secoes = {
      cockpit: document.getElementById('view-cockpit'),
      rotas: document.getElementById('view-rotas'),
      perfil: document.getElementById('view-perfil')
    };

    const mainTitulo = document.getElementById('main-titulo');
    const mainSubtitulo = document.getElementById('main-subtitulo');
    const mainHeader = document.querySelector('.main__header');

    const titulos = {
      cockpit: { t: 'Cockpit de Bordo • Telemetria em Tempo Real', s: 'Santa Rita do Sapucaí — Ônibus #02 (Linha 01 Centro / Bairro Industrial)' }
    };

    function trocarSecao(chave) {
      if (!secoes[chave]) return;

      navBtns.forEach(btn => {
        if (btn.getAttribute('data-secao') === chave) {
          btn.classList.add('nav__item--ativo');
        } else {
          btn.classList.remove('nav__item--ativo');
        }
      });

      Object.keys(secoes).forEach(k => {
        if (secoes[k]) {
          if (k === chave) {
            secoes[k].style.display = 'flex';
            secoes[k].classList.add('secao-view--ativa');
          } else {
            secoes[k].style.display = 'none';
            secoes[k].classList.remove('secao-view--ativa');
          }
        }
      });

      if (mainHeader) {
        if (chave === 'cockpit') {
          mainHeader.style.display = '';
          if (mainTitulo && titulos.cockpit) mainTitulo.textContent = titulos.cockpit.t;
          if (mainSubtitulo && titulos.cockpit) mainSubtitulo.textContent = titulos.cockpit.s;
        } else {
          mainHeader.style.display = 'none';
          if (mainTitulo) mainTitulo.textContent = '';
          if (mainSubtitulo) mainSubtitulo.textContent = '';
        }
      }

      if (chave === 'cockpit' && map) {
        setTimeout(() => map.invalidateSize(), 150);
      }

      fecharSidebarMobile();
    }

    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const secao = btn.getAttribute('data-secao');
        trocarSecao(secao);
      });
    });

    const btnDropdownPerfil = document.getElementById('dropdown-btn-perfil');
    if (btnDropdownPerfil) {
      btnDropdownPerfil.addEventListener('click', () => {
        fecharTodosDropdowns();
        trocarSecao('perfil');
      });
    }

    // Alternar rotas da escala (no botão ou no card completo)
    const cardsRotas = document.querySelectorAll('.linha-card');
    cardsRotas.forEach(card => {
      card.addEventListener('click', () => {
        const btn = card.querySelector('.rota-card__btn-trocar');
        const l = (btn && btn.getAttribute('data-linha')) || card.id.replace('card-escala-', '').replace(/-/g, '_');
        ativarLinhaNoCockpit(l);
        trocarSecao('cockpit');
      });
    });

    const botoesTrocar = document.querySelectorAll('.rota-card__btn-trocar');
    botoesTrocar.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const l = btn.getAttribute('data-linha') || 'fernandes';
        ativarLinhaNoCockpit(l);
        trocarSecao('cockpit');
      });
    });

    // Alternar visualização compacta/minimizado do Cockpit Flutuante
    const btnColapsarCockpit = document.getElementById('btn-colapsar-cockpit');
    const cockpitCard = document.getElementById('cockpit-overlay-card');
    const btnColapsarTexto = document.getElementById('btn-colapsar-texto');

    if (btnColapsarCockpit && cockpitCard) {
      btnColapsarCockpit.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaMinimizado = cockpitCard.classList.toggle('motorista-cockpit-overlay-card--minimizado');
        if (btnColapsarTexto) {
          btnColapsarTexto.textContent = estaMinimizado ? 'Detalhes' : 'Minimizar';
        }
        btnColapsarCockpit.setAttribute('aria-expanded', !estaMinimizado);
        if (map) {
          setTimeout(() => map.invalidateSize(), 200);
        }
      });
    }

    /* ──────────────────────────────────────────────────────────
      8. GAVETAS MOBILE (SIDEBAR E PAINEL LATERAL)
      ────────────────────────────────────────────────────────── */
    const btnMenu = document.getElementById('btn-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const painelLateral = document.getElementById('painel-lateral');
    const btnFecharPainel = document.getElementById('btn-fechar-painel');
    const btnFecharSidebar = document.getElementById('btn-fechar-sidebar');

    function abrirSidebarMobile() {
      if (sidebar) {
        sidebar.classList.add('aberta');
        sidebar.classList.add('aberto');
      }
      if (overlay) {
        overlay.classList.add('ativo');
      }
      if (btnMenu) {
        btnMenu.setAttribute('aria-expanded', 'true');
      }
      document.body.style.overflow = 'hidden';
    }

    function fecharSidebarMobile() {
      if (sidebar) {
        sidebar.classList.remove('aberta');
        sidebar.classList.remove('aberto');
      }
      if (painelLateral) {
        painelLateral.classList.remove('aberto');
        painelLateral.classList.remove('aberta');
      }
      if (overlay) {
        overlay.classList.remove('ativo');
      }
      if (btnMenu) {
        btnMenu.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    }

    if (btnMenu) {
      btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaAberto = sidebar && (sidebar.classList.contains('aberta') || sidebar.classList.contains('aberto'));
        if (estaAberto) {
          fecharSidebarMobile();
        } else {
          abrirSidebarMobile();
        }
      });
    }

    if (btnFecharSidebar) {
      btnFecharSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        fecharSidebarMobile();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', fecharSidebarMobile);
    }

    if (btnFecharPainel) {
      btnFecharPainel.addEventListener('click', fecharSidebarMobile);
    }

    // Tecla Escape fecha drawers e menus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        fecharSidebarMobile();
        fecharTodosDropdowns();
      }
    });

    /* ──────────────────────────────────────────────────────────
      9. ALERTAS OPERACIONAIS: TRÂNSITO & GARAGEM (PROBLEMAS NO ÔNIBUS)
      ────────────────────────────────────────────────────────── */
    const modalProblema = document.getElementById('modal-problema');
    const btnAbrirProblema = document.getElementById('btn-abrir-problema');
    const btnPainelRelatar = document.getElementById('btn-painel-relatar');
    const btnFecharProblema = document.getElementById('btn-fechar-modal-problema');
    const btnCancelarProblema = document.getElementById('btn-cancelar-problema');
    const formProblema = document.getElementById('form-relatar-problema');
    const selectTipoProblema = document.getElementById('select-tipo-problema');
    const inputLocalProblema = document.getElementById('input-local-problema');
    const textareaDetalhesProblema = document.getElementById('textarea-detalhes-problema');
    const btnGpsSyncProblema = document.getElementById('btn-gps-sync-problema');
    const btnEnviarProblema = document.getElementById('btn-enviar-problema');
    const btnEnviarProblemaTexto = document.getElementById('btn-enviar-problema-texto');
    const painelOcorrenciasContainer = document.getElementById('painel-ocorrencias-ativas');

    const modalSuporte = document.getElementById('modal-suporte');
    const btnAbrirSuporte = document.getElementById('btn-abrir-suporte');
    const btnPainelSuporte = document.getElementById('btn-painel-suporte');
    const btnFecharSuporte = document.getElementById('btn-fechar-modal-suporte');
    const btnFecharSuporteRodape = document.getElementById('btn-fechar-suporte-rodape');

    // Estado persistente de alertas de trânsito e suporte da garagem
    let ocorrenciasAtivas = window.ValeBusAPI.obterOcorrenciasMotorista();
    let socorroGaragemAtivo = window.ValeBusAPI.obterSocorroGaragem();

    function salvarOcorrencias() {
      window.ValeBusAPI.salvarOcorrenciasMotorista(ocorrenciasAtivas);
      renderizarOcorrenciasPainel();
    }

    function salvarSocorroGaragem() {
      if (socorroGaragemAtivo) {
        window.ValeBusAPI.salvarSocorroGaragem(socorroGaragemAtivo);
      } else {
        window.ValeBusAPI.limparSocorroGaragem();
      }
      renderizarOcorrenciasPainel();
      atualizarCardSocorroModal();
    }

    function abrirModal(m) {
      fecharTodosDropdowns();
      if (!m) return;
      m.classList.add('aberto');
      m.classList.add('ativo');
      m.setAttribute('aria-hidden', 'false');
    }

    function fecharModal(m) {
      if (!m) return;
      m.classList.remove('aberto');
      m.classList.remove('ativo');
      m.setAttribute('aria-hidden', 'true');
    }

    /* ──────────────────────────────────────────────────────────
      MODAL 1: ALERTA DE TRÂNSITO NA VIA
      ────────────────────────────────────────────────────────── */
    function prepararModalTransito() {
      const elVeiculo = document.getElementById('modal-ocorrencia-veiculo');
      const elLinha = document.getElementById('modal-ocorrencia-linha');
      const elMotorista = document.getElementById('modal-ocorrencia-motorista');

      if (elVeiculo) elVeiculo.textContent = estadoMotorista.veiculo || 'Ônibus #02';
      if (elLinha) elLinha.textContent = estadoMotorista.linhaCodigo || 'Linha Anchieta';
      if (elMotorista) elMotorista.textContent = `Condutor: ${estadoMotorista.nome || 'João Silva'} (${estadoMotorista.matricula || 'MOT-104'})`;

      if (inputLocalProblema && (!inputLocalProblema.value || inputLocalProblema.value === 'Av. Inatel, Centro')) {
        const paradaAtual = estadoMotorista.proximaParada ? estadoMotorista.proximaParada.replace(/^\d+\.\s*/, '') : 'Praça Urbana Carolina';
        inputLocalProblema.value = `${paradaAtual}, Santa Rita do Sapucaí`;
      }

      abrirModal(modalProblema);
    }

    if (btnAbrirProblema) btnAbrirProblema.addEventListener('click', prepararModalTransito);
    if (btnPainelRelatar) btnPainelRelatar.addEventListener('click', prepararModalTransito);
    if (btnFecharProblema) btnFecharProblema.addEventListener('click', () => fecharModal(modalProblema));
    if (btnCancelarProblema) btnCancelarProblema.addEventListener('click', () => fecharModal(modalProblema));

    // Chips de Seleção de Tipo de Trânsito
    const chipsGrid = document.getElementById('ocorrencia-chips-grid');
    if (chipsGrid) {
      chipsGrid.addEventListener('click', (e) => {
        const chip = e.target.closest('.ocorrencia-chip');
        if (!chip) return;
        chipsGrid.querySelectorAll('.ocorrencia-chip').forEach(c => c.classList.remove('ocorrencia-chip--ativo'));
        chip.classList.add('ocorrencia-chip--ativo');
        const valor = chip.getAttribute('data-valor');
        if (selectTipoProblema && valor) {
          selectTipoProblema.value = valor;
        }
      });
    }

    // Sincronizar GPS no Alerta de Trânsito
    if (btnGpsSyncProblema) {
      btnGpsSyncProblema.addEventListener('click', () => {
        const parada = estadoMotorista.proximaParada ? estadoMotorista.proximaParada.replace(/^\d+\.\s*/, '') : 'Praça Urbana Carolina';
        const coords = (meuOnibusMarker && meuOnibusMarker.getLatLng) ? meuOnibusMarker.getLatLng() : null;
        const refGps = coords ? ` (GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : '';
        if (inputLocalProblema) {
          inputLocalProblema.value = `${parada}${refGps}`;
          inputLocalProblema.focus();
        }
        mostrarToast('Posição GPS do veículo atualizada no formulário!', 'info', '📍');
      });
    }

    // Sugestões Rápidas de Descrição de Trânsito
    const sugestoesChipsWrap = document.getElementById('sugestoes-chips-problema');
    if (sugestoesChipsWrap) {
      sugestoesChipsWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.sugestao-chip');
        if (!btn || !textareaDetalhesProblema) return;
        const texto = btn.getAttribute('data-texto');
        if (texto) {
          if (textareaDetalhesProblema.value.trim().length > 0) {
            textareaDetalhesProblema.value += ` ${texto}`;
          } else {
            textareaDetalhesProblema.value = texto;
          }
          textareaDetalhesProblema.focus();
        }
      });
    }

    // Envio do Alerta de Trânsito
    if (formProblema) {
      formProblema.addEventListener('submit', (e) => {
        e.preventDefault();

        const tipo = selectTipoProblema ? selectTipoProblema.value : 'transito';
        const mapaNomes = {
          transito: 'Congestionamento / Trânsito Parado',
          acidente: 'Acidente na Pista',
          desvio: 'Obras / Desvio de Itinerário',
          semaforo: 'Semáforo Inoperante',
          alagamento: 'Pista Alagada / Escorregadia',
          outro: 'Bloqueio na Via'
        };
        const tipoTexto = mapaNomes[tipo] || 'Alerta de Trânsito';

        const iconesMap = {
          transito: '🚦',
          acidente: '💥',
          desvio: '🚧',
          semaforo: '🛑',
          alagamento: '🌧️',
          outro: '⚠️'
        };
        const icone = iconesMap[tipo] || '🚦';

        const local = (inputLocalProblema && inputLocalProblema.value.trim()) || 'Itinerário Regular';
        const detalhes = (textareaDetalhesProblema && textareaDetalhesProblema.value.trim()) || 'Retenção na via informada pelo condutor.';

        const radioGravidade = document.querySelector('input[name="gravidade"]:checked');
        const gravidade = radioGravidade ? radioGravidade.value : 'baixa';

        if (btnEnviarProblema) {
          btnEnviarProblema.disabled = true;
          if (btnEnviarProblemaTexto) btnEnviarProblemaTexto.textContent = 'Registrando alerta...';
        }

        setTimeout(() => {
          const agora = new Date();
          const horaStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
          const protocoloNum = Math.floor(1000 + Math.random() * 9000);
          const protocolo = `TRANS-${protocoloNum}`;

          const novaOcorrencia = {
            id: protocolo,
            categoria: 'transito',
            tipo,
            tipoTexto,
            icone,
            local,
            detalhes,
            gravidade,
            hora: horaStr,
            status: 'Alerta Ativo',
            emAndamento: true,
            motorista: estadoMotorista.nome || 'João Silva',
            matricula: estadoMotorista.matricula || 'MOT-104',
            veiculo: estadoMotorista.veiculo || 'Ônibus #02',
            linha: estadoMotorista.linhaCodigo || 'Linha Anchieta',
            criadoEm: agora.toISOString()
          };

          // Replica no canal unificado do Gestor CCO pela camada de serviços.
          window.ValeBusAPI.salvarOcorrencia(novaOcorrencia);

          ocorrenciasAtivas.unshift(novaOcorrencia);
          salvarOcorrencias();

          if (btnEnviarProblema) {
            btnEnviarProblema.disabled = false;
            if (btnEnviarProblemaTexto) btnEnviarProblemaTexto.textContent = 'Enviar Alerta de Trânsito';
          }
          fecharModal(modalProblema);

          mostrarToast(`Alerta de trânsito registrado com sucesso! #${protocolo}`, 'alerta', icone);

          if (textareaDetalhesProblema) textareaDetalhesProblema.value = '';
        }, 450);
      });
    }

    /* ──────────────────────────────────────────────────────────
      MODAL 2: ALERTA PARA A GARAGEM (PROBLEMAS NO ÔNIBUS)
      ────────────────────────────────────────────────────────── */
    const inputLocalGaragem = document.getElementById('input-local-garagem');
    const btnGpsSyncGaragem = document.getElementById('btn-gps-sync-garagem');
    const oficinaFalhasGrid = document.getElementById('oficina-falhas-grid');
    const btnDespacharSocorro = document.getElementById('btn-despachar-socorro');
    const btnDespacharSocorroTitulo = document.getElementById('btn-despachar-socorro-titulo');
    const textareaOficinaDetalhe = document.getElementById('textarea-oficina-detalhe');
    const chamadoAtivoWrap = document.getElementById('oficina-chamado-ativo-wrap');

    let falhaSelecionada = 'pneu';
    let falhaTextoSelecionado = 'Pneu / Rodagem';

    function prepararModalGaragem() {
      const elVeiculo = document.getElementById('modal-garagem-veiculo');
      const elLinha = document.getElementById('modal-garagem-linha');
      const elMotorista = document.getElementById('modal-garagem-motorista');

      if (elVeiculo) elVeiculo.textContent = estadoMotorista.veiculo || 'Ônibus #02';
      if (elLinha) elLinha.textContent = estadoMotorista.linhaCodigo || 'Linha Anchieta';
      if (elMotorista) elMotorista.textContent = `Condutor: ${estadoMotorista.nome || 'João Silva'} (${estadoMotorista.matricula || 'MOT-104'})`;

      if (inputLocalGaragem && (!inputLocalGaragem.value || inputLocalGaragem.value === 'Av. Inatel, Centro')) {
        const paradaAtual = estadoMotorista.proximaParada ? estadoMotorista.proximaParada.replace(/^\d+\.\s*/, '') : 'Praça Urbana Carolina';
        inputLocalGaragem.value = `${paradaAtual}, Santa Rita do Sapucaí`;
      }

      abrirModal(modalSuporte);
      atualizarCardSocorroModal();
    }

    if (btnAbrirSuporte) btnAbrirSuporte.addEventListener('click', prepararModalGaragem);
    if (btnPainelSuporte) btnPainelSuporte.addEventListener('click', prepararModalGaragem);
    if (btnFecharSuporte) btnFecharSuporte.addEventListener('click', () => fecharModal(modalSuporte));
    if (btnFecharSuporteRodape) btnFecharSuporteRodape.addEventListener('click', () => fecharModal(modalSuporte));

    // Seleção do problema mecânico no grid
    if (oficinaFalhasGrid) {
      oficinaFalhasGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.oficina-falha-btn');
        if (!btn) return;
        oficinaFalhasGrid.querySelectorAll('.oficina-falha-btn').forEach(b => b.classList.remove('oficina-falha-btn--ativo'));
        btn.classList.add('oficina-falha-btn--ativo');
        falhaSelecionada = btn.getAttribute('data-falha') || 'pneu';
        falhaTextoSelecionado = btn.querySelector('span:last-child').textContent || 'Problema no Ônibus';
      });
    }

    // Sincronizar GPS da localização do ônibus
    if (btnGpsSyncGaragem) {
      btnGpsSyncGaragem.addEventListener('click', () => {
        const parada = estadoMotorista.proximaParada ? estadoMotorista.proximaParada.replace(/^\d+\.\s*/, '') : 'Praça Urbana Carolina';
        const coords = (meuOnibusMarker && meuOnibusMarker.getLatLng) ? meuOnibusMarker.getLatLng() : null;
        const refGps = coords ? ` (GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : '';
        if (inputLocalGaragem) {
          inputLocalGaragem.value = `${parada}${refGps}`;
          inputLocalGaragem.focus();
        }
        mostrarToast('Localização do ônibus atualizada!', 'info', '📍');
      });
    }

    function atualizarCardSocorroModal() {
      if (!chamadoAtivoWrap) return;
      if (socorroGaragemAtivo) {
        chamadoAtivoWrap.style.display = 'block';
        chamadoAtivoWrap.innerHTML = `
          <div class="painel-ocorrencia-card painel-ocorrencia-card--suporte" style="margin-bottom: 12px;">
            <div class="painel-ocorrencia-card__topo">
              <div class="painel-ocorrencia-card__tipo-wrap">
                <span class="painel-ocorrencia-card__icone">🔧</span>
                <strong class="painel-ocorrencia-card__titulo">${socorroGaragemAtivo.titulo}</strong>
              </div>
              <span class="painel-ocorrencia-card__protocolo">${socorroGaragemAtivo.id}</span>
            </div>
            <div class="painel-ocorrencia-card__detalhes">
              <strong>Falha reportada:</strong> ${socorroGaragemAtivo.problemaTexto}<br>
              <strong>Condição:</strong> ${socorroGaragemAtivo.condicaoTexto}<br>
              ${socorroGaragemAtivo.precisaSocorro ? `<strong>Equipe Garagem:</strong> ${socorroGaragemAtivo.viatura} • Chegada estimada em ~${socorroGaragemAtivo.tempoEstimadoMin} min.<br>` : ''}
              <strong>Local informado:</strong> ${socorroGaragemAtivo.local}
              ${socorroGaragemAtivo.observacao ? `<br><strong>Obs:</strong> ${socorroGaragemAtivo.observacao}` : ''}
            </div>
            <div class="painel-ocorrencia-card__rodape">
              <span class="status-badge ${socorroGaragemAtivo.precisaSocorro ? 'status-badge--alerta' : 'status-badge--online'}">${socorroGaragemAtivo.statusBadge}</span>
              <button type="button" class="painel-ocorrencia-card__btn-concluir" id="btn-cancelar-socorro-modal">Finalizar Alerta</button>
            </div>
          </div>
        `;

        const btnCancelar = document.getElementById('btn-cancelar-socorro-modal');
        if (btnCancelar) {
          btnCancelar.addEventListener('click', () => {
            socorroGaragemAtivo = null;
            salvarSocorroGaragem();
            mostrarToast('Alerta da garagem concluído.', 'info', '🔧');
          });
        }

        if (btnDespacharSocorro) {
          btnDespacharSocorro.style.display = 'none';
        }
      } else {
        chamadoAtivoWrap.style.display = 'none';
        chamadoAtivoWrap.innerHTML = '';
        if (btnDespacharSocorro) {
          btnDespacharSocorro.style.display = 'flex';
        }
      }
    }

    // Enviar alerta à Garagem
    if (btnDespacharSocorro) {
      btnDespacharSocorro.addEventListener('click', () => {
        const agora = new Date();
        const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
        const parada = (inputLocalGaragem && inputLocalGaragem.value.trim()) || 'Av. Inatel, Centro';
        const obs = (textareaOficinaDetalhe && textareaOficinaDetalhe.value.trim()) || '';

        const radioCondicao = document.querySelector('input[name="gravidade_garagem"]:checked');
        const condicao = radioCondicao ? radioCondicao.value : 'baixa';

        const precisaSocorro = (condicao === 'alta');
        let condicaoTexto = 'Dá para rodar (Alerta preventivo)';
        let statusBadge = 'Alerta Registrado';
        let titulo = 'Problema Notificado à Garagem';

        if (condicao === 'moderada') {
          condicaoTexto = 'Revisar no fim da viagem';
          statusBadge = 'Manutenção Notificada';
          titulo = 'Manutenção Programada';
        } else if (condicao === 'alta') {
          condicaoTexto = 'Parada Imediata / Socorro Urgente';
          statusBadge = 'Socorro Despachado';
          titulo = 'Socorro Mecânico Acionado';
        }

        socorroGaragemAtivo = {
          id: `GAR-${Math.floor(1000 + Math.random() * 9000)}`,
          categoria: 'garagem',
          titulo,
          problema: falhaSelecionada,
          problemaTexto: falhaTextoSelecionado,
          condicao,
          condicaoTexto,
          precisaSocorro,
          observacao: obs,
          viatura: 'Viatura Garagem #01 (Mecânico: Carlos)',
          tempoEstimadoMin: 14,
          horaChamado: hora,
          statusBadge,
          local: parada,
          motorista: estadoMotorista.nome || 'João Silva',
          matricula: estadoMotorista.matricula || 'MOT-104',
          veiculo: estadoMotorista.veiculo || 'Ônibus #02',
          linha: estadoMotorista.linhaCodigo || 'Linha Anchieta',
          criadoEm: agora.toISOString()
        };

        // Notifica o canal unificado do Gestor CCO pela camada de serviços.
        window.ValeBusAPI.salvarOcorrencia(socorroGaragemAtivo);

        salvarSocorroGaragem();
        mostrarToast(
          precisaSocorro
            ? 'Socorro mecânico da Garagem acionado com urgência! Viatura em rota (~14 min).'
            : 'Alerta de problema no ônibus enviado à Garagem e ao Gestor CCO!',
          precisaSocorro ? 'alerta' : 'sucesso',
          '🔧'
        );

        if (textareaOficinaDetalhe) textareaOficinaDetalhe.value = '';
      });
    }

    // Copiar Telefones de Plantão
    document.querySelectorAll('.telemetria-contato-item').forEach(item => {
      item.addEventListener('click', () => {
        const fone = item.getAttribute('data-fone');
        if (fone && navigator.clipboard) {
          navigator.clipboard.writeText(fone).then(() => {
            mostrarToast(`Telefone ${fone} copiado!`, 'info', '📋');
          }).catch(() => {
            mostrarToast(`Telefone: ${fone}`, 'info', '📞');
          });
        } else if (fone) {
          mostrarToast(`Telefone: ${fone}`, 'info', '📞');
        }
      });
    });

    /* ──────────────────────────────────────────────────────────
      RENDERIZADOR DE ALERTAS NO PAINEL LATERAL
      ────────────────────────────────────────────────────────── */
    function renderizarOcorrenciasPainel() {
      if (!painelOcorrenciasContainer) return;

      let html = '';

      // Alertas de Trânsito Ativos (Alertas da Garagem ficam restritos ao modal de Suporte Garagem)
      if (ocorrenciasAtivas.length > 0) {
        ocorrenciasAtivas.forEach(oc => {
          const corStatus = oc.gravidade === 'alta' ? '#dc2626' : (oc.gravidade === 'moderada' ? '#d97706' : '#16a34a');
          html += `
            <div class="painel-ocorrencia-card" id="card-oc-${oc.id}">
              <div class="painel-ocorrencia-card__topo">
                <div class="painel-ocorrencia-card__tipo-wrap">
                  <span class="painel-ocorrencia-card__icone">${oc.icone || '🚦'}</span>
                  <strong class="painel-ocorrencia-card__titulo">${oc.tipoTexto}</strong>
                </div>
                <span class="painel-ocorrencia-card__protocolo">#${oc.id}</span>
              </div>
              <div class="painel-ocorrencia-card__detalhes">
                <strong>Local:</strong> ${oc.local}<br>
                <strong>Obs:</strong> ${oc.detalhes}
              </div>
              <div class="painel-ocorrencia-card__rodape">
                <span class="painel-ocorrencia-card__status" style="color: ${corStatus};">
                  <span class="status-bolinha status-bolinha--pulsante" style="color: ${corStatus};">●</span>
                  ${oc.hora} • ${oc.status}
                </span>
                <button type="button" class="painel-ocorrencia-card__btn-concluir" data-acao="concluir-ocorrencia" data-id="${oc.id}">Concluir</button>
              </div>
            </div>
          `;
        });
      }

      if (!html) {
        painelOcorrenciasContainer.innerHTML = `
          <div style="font-size: 11px; color: var(--texto-secundario); padding: 4px 2px; text-align: left; display: flex; align-items: center; gap: 6px;">
            <span style="color: #16a34a; font-weight: bold;">●</span>
            <span>Nenhum alerta de via ativo.</span>
          </div>
        `;
      } else {
        painelOcorrenciasContainer.innerHTML = html;

        painelOcorrenciasContainer.querySelectorAll('button[data-acao="concluir-ocorrencia"]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            ocorrenciasAtivas = ocorrenciasAtivas.filter(o => o.id !== id);
            salvarOcorrencias();
            mostrarToast(`Alerta de trânsito #${id} concluído!`, 'sucesso', '✅');
          });
        });
      }
    }

    // Inicializa renderização do painel
    renderizarOcorrenciasPainel();

    // Fechamento de Modais clicando fora ou com tecla ESC
    [modalProblema, modalSuporte].forEach(m => {
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) fecharModal(m);
        });
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        fecharModal(modalProblema);
        fecharModal(modalSuporte);
      }
    });

    /* ──────────────────────────────────────────────────────────
      10. NOTIFICAÇÕES TOAST COM ÍCONES E TEMAS
      ────────────────────────────────────────────────────────── */
    const toastContainer = document.getElementById('toast-container');

    function mostrarToast(msg, tipo = 'info', iconePersonalizado = null) {
      if (!toastContainer) return;
      const toast = document.createElement('div');
      const classeTipo = tipo === 'alerta' ? 'valebus-toast--atencao' : (tipo === 'sucesso' ? 'valebus-toast--sucesso' : 'valebus-toast--info');
      toast.className = `valebus-toast ${classeTipo}`;

      let icone = iconePersonalizado;
      if (!icone) {
        if (tipo === 'alerta') icone = '⚠️';
        else if (tipo === 'sucesso') icone = '✅';
        else icone = '🚌';
      }

      toast.innerHTML = `
        <div class="valebus-toast__icone-wrap">${icone}</div>
        <div class="valebus-toast__corpo">
          <strong class="valebus-toast__titulo">Terminal do Motorista</strong>
          <span class="valebus-toast__msg">${msg}</span>
        </div>
        <button type="button" class="valebus-toast__fechar" aria-label="Fechar">✕</button>
        <div class="valebus-toast__progresso" style="animation-duration: 3800ms;"></div>
      `;

      toastContainer.appendChild(toast);

      const btnFechar = toast.querySelector('.valebus-toast__fechar');
      const remover = () => {
        toast.classList.add('valebus-toast--saindo');
        setTimeout(() => toast.remove(), 250);
      };

      if (btnFechar) btnFechar.addEventListener('click', remover);
      setTimeout(remover, 3800);
    }

  })();
