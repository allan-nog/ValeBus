/**
 * dashboard.js — Lógica e Telemetria em Tempo Real (ValeBus)
 * ─────────────────────────────────────────────────────────
 * Módulos:
 *  1. Relógio do Sistema em Tempo Real (TopBar CCO)
 *  2. Controle do Mapa Leaflet (Frota de Santa Rita do Sapucaí)
 *  3. Telemetria e Animação de Ônibus (Movimento GPS Simulado)
 *  4. Filtro de Linhas Interativo na Legenda
 *  5. Navegação Interativa (Cards -> Zoom no Ônibus com flyTo)
 *  6. Controle das Gavetas (Sidebar Mobile e Painel Lateral)
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. RELÓGIO DO SISTEMA & USUÁRIO LOGADO
     ────────────────────────────────────────────────────────── */
  function atualizarRelogio() {
    const el = document.getElementById('topbar-hora');
    if (!el) return;
    const agora = new Date();
    const h = String(agora.getHours()).padStart(2, '0');
    const m = String(agora.getMinutes()).padStart(2, '0');
    el.textContent = `${h}:${m}`;
  }

  function carregarUsuarioLogado() {
    try {
      let nome = 'João da Silva';
      let email = 'avaliador@feiratech.com.br';
      let cargo = 'Avaliador Feira';
      let metodo = 'Google Workspace / Feira Tech';

      const usuario = (window.ValeBusAPI && typeof window.ValeBusAPI.obterSessao === 'function')
        ? window.ValeBusAPI.obterSessao()
        : (function () {
            try {
              const salvo = localStorage.getItem('valebus_usuario');
              return salvo ? JSON.parse(salvo) : null;
            } catch (e) { return null; }
          })();

      if (usuario && (usuario.logado || usuario.nome)) {
        if (usuario.nome) nome = usuario.nome;
        if (usuario.email) email = usuario.email || `${usuario.nome.toLowerCase().replace(/\s+/g, '.')}@feiratech.com.br`;
        const ehGestor = (usuario.email && usuario.email.toLowerCase().trim() === 'valebussrs@gmail.com') || usuario.perfil === 'gestor';
        if (ehGestor) {
          cargo = usuario.cargo || 'Gestor CCO & Frotas Master';
        } else {
          cargo = usuario.metodo === 'Google' ? 'Avaliador Feira Tech' : (usuario.cargo || 'Operador CCO');
        }
        if (usuario.metodo) metodo = usuario.metodo;
      }

      // Iniciais do Avatar
      const partes = nome.trim().split(/\s+/).filter(Boolean);
      let iniciais = 'US';
      if (partes.length === 1) {
        iniciais = partes[0].substring(0, 2).toUpperCase();
      } else if (partes.length > 1) {
        iniciais = (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
      }

      // 1. Atualiza elementos do TopBar
      const elNome   = document.getElementById('topbar-usuario-nome') || document.querySelector('.topbar__usuario-nome');
      const elCargo  = document.getElementById('topbar-usuario-cargo') || document.querySelector('.topbar__usuario-cargo');
      const elAvatar = document.getElementById('topbar-usuario-avatar') || document.querySelector('.topbar__avatar');

      if (elNome) elNome.textContent = nome;
      if (elCargo) elCargo.textContent = cargo;
      if (elAvatar) elAvatar.textContent = iniciais;

      // 2. Atualiza elementos do Dropdown
      const elDropNome   = document.getElementById('dropdown-usuario-nome');
      const elDropEmail  = document.getElementById('dropdown-usuario-email');
      const elDropCargo  = document.getElementById('dropdown-usuario-cargo');
      const elDropAvatar = document.getElementById('dropdown-usuario-avatar');

      if (elDropNome) elDropNome.textContent = nome;
      if (elDropEmail) elDropEmail.textContent = email;
      if (elDropCargo) elDropCargo.textContent = cargo;
      if (elDropAvatar) elDropAvatar.textContent = iniciais;

      // 3. Atualiza elementos do Modal de Perfil
      const elModNome   = document.getElementById('modal-perfil-nome');
      const elModEmail  = document.getElementById('modal-perfil-email');
      const elModCargo  = document.getElementById('modal-perfil-cargo');
      const elModAvatar = document.getElementById('modal-perfil-avatar');
      const elModMetodo = document.getElementById('modal-perfil-metodo');

      if (elModNome) elModNome.textContent = nome;
      if (elModEmail) elModEmail.textContent = email;
      if (elModCargo) elModCargo.textContent = cargo;
      if (elModAvatar) elModAvatar.textContent = iniciais;
      if (elModMetodo) elModMetodo.textContent = metodo;

      // 4. Garante botão de adicionar alerta visível
      const btnNovoAlerta = document.getElementById('btn-abrir-modal-novo-alerta');
      if (btnNovoAlerta) {
        btnNovoAlerta.style.display = 'inline-flex';
      }

    } catch (e) {
      console.warn('Erro ao carregar usuário autenticado:', e);
    }
  }

  atualizarRelogio();
  setInterval(atualizarRelogio, 5000);
  carregarUsuarioLogado();


  /* ──────────────────────────────────────────────────────────
     2. DADOS DAS LINHAS E FROTA (Santa Rita do Sapucaí - MG)
     ────────────────────────────────────────────────────────── */
  const LINHAS = {
    anchieta: {
      chave: 'anchieta',
      nome: 'Linha Anchieta',
      cor: '#16a34a',
      partida: 'Praça Urbana Carolina | Praça Do Murilo',
      proximaParada: 'R. José Ribeiro De Barros, 59 | Inatel - Sentido Recanto'
    },
    fernandes: {
      chave: 'fernandes',
      nome: 'Linha Fernandes',
      cor: '#2563eb',
      partida: 'Rua Das Rosas, 300 | Caixa D\'Água Da Copasa',
      proximaParada: 'Rua Das Rosas, 400 | Ginásio Poliesportivo'
    },
    fortaleza: {
      chave: 'fortaleza',
      nome: 'Linha Fortaleza',
      cor: '#9333ea',
      partida: 'Rua Das Rosas, 300 | Caixa D\'Água Da Copasa',
      proximaParada: 'Rua Das Rosas, 400 | Ginásio Poliesportivo'
    },
    industrial: {
      chave: 'industrial',
      nome: 'Linha Industrial',
      cor: '#ea580c',
      partida: 'Br-459 Rod. Jk, Km 119,8 Leste | Entr. Mg-173 Para Cachoeira De Minas',
      proximaParada: 'Br-459 Rod. Jk, Km 120,7 Leste | Linear'
    },
    porto_sapucai: {
      chave: 'porto_sapucai',
      nome: 'Linha Porto Sapucaí',
      cor: '#0891b2',
      partida: 'Br-459 Rod. Jk, Km 116 Leste | Porto Sapucaí',
      proximaParada: 'Br-459 Rod. Jk, Km 116,3 Leste | Acesso Ao Porto Sapucaí'
    },
    reforco_jose_gm: {
      chave: 'reforco_jose_gm',
      nome: 'Linha Reforço José G.M (via MCM)',
      cor: '#dc2626',
      partida: 'Rua Das Rosas, 300 | Caixa D\'Água Da Copasa',
      proximaParada: 'Rua Das Rosas, 400 | Ginásio Poliesportivo'
    },
    sao_benedito_hora_meia: {
      chave: 'sao_benedito_hora_meia',
      nome: 'Linha São Benedito (Hora e Meia)',
      cor: '#db2777',
      partida: 'Rua Das Rosas, 300 | Caixa D\'Água Da Copasa',
      proximaParada: 'Rua Das Rosas, 400 | Ginásio Poliesportivo'
    },
    sao_benedito_hora: {
      chave: 'sao_benedito_hora',
      nome: 'Linha São Benedito (Hora)',
      cor: '#eab308',
      partida: 'Rua Das Rosas, 300 | Caixa D\'Água Da Copasa',
      proximaParada: 'Rua Das Rosas, 400 | Ginásio Poliesportivo'
    }
  };

  const FROTA = [
    { chaveLinha: 'anchieta',               linha: LINHAS.anchieta,               veiculo: 'Ônibus #01', prefixo: '101', posicao: [-22.254164, -45.696709], velocidade: 0 },
    { chaveLinha: 'fernandes',              linha: LINHAS.fernandes,              veiculo: 'Ônibus #02', prefixo: '102', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'fortaleza',              linha: LINHAS.fortaleza,              veiculo: 'Ônibus #03', prefixo: '103', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'industrial',             linha: LINHAS.industrial,             veiculo: 'Ônibus #04', prefixo: '104', posicao: [-22.261351790494068, -45.771512667995346], velocidade: 0 },
    { chaveLinha: 'porto_sapucai',          linha: LINHAS.porto_sapucai,          veiculo: 'Ônibus #05', prefixo: '105', posicao: [-22.257161337562074, -45.80345771571105], velocidade: 0 },
    { chaveLinha: 'reforco_jose_gm',        linha: LINHAS.reforco_jose_gm,        veiculo: 'Ônibus #06', prefixo: '106', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'sao_benedito_hora',      linha: LINHAS.sao_benedito_hora,      veiculo: 'Ônibus #07', prefixo: '107', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 },
    { chaveLinha: 'sao_benedito_hora_meia', linha: LINHAS.sao_benedito_hora_meia, veiculo: 'Ônibus #08', prefixo: '108', posicao: [-22.22582948032013, -45.71819403549861], velocidade: 0 }
  ];


  /* ──────────────────────────────────────────────────────────
     3. INICIALIZAÇÃO DO MAPA LEAFLET & CAMADAS TEMÁTICAS (DIA/NOITE)
     ────────────────────────────────────────────────────────── */
  const mapaContainer = document.getElementById('mapa');
  if (!mapaContainer) return;

  // Centro inicial: Santa Rita do Sapucaí - MG
  const map = L.map('mapa', {
    zoomControl: true,
    attributionControl: false
  }).setView([-22.2528, -45.7036], 14);

  // Camada de Tiles padrão OpenStreetMap (100% gratuita, sem marca d'água ou chave de API)
  const TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_OPTIONS = {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };

  let camadaTilesAtual = L.tileLayer(TILE_LAYER_URL, TILE_OPTIONS).addTo(map);

  /* ──────────────────────────────────────────────────────────
     3.1. GERENCIAMENTO DE TEMA (CLARO / ESCURO)
     ────────────────────────────────────────────────────────── */
  const btnTemaToggle = document.getElementById('btn-tema-toggle');

  function definirTema(tema, salvar = true) {
    const isDark = tema === 'escuro';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (btnTemaToggle) {
      btnTemaToggle.setAttribute('aria-label', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
      btnTemaToggle.setAttribute('title', isDark ? 'Ativar Modo Claro (Dia)' : 'Ativar Modo Escuro (Noite)');
    }

    if (salvar) {
      try {
        localStorage.setItem('valebus_tema', tema);
      } catch (e) {
        console.warn('Não foi possível salvar tema no localStorage:', e);
      }
    }
  }

  // Inicializa tema: localStorage -> prefers-color-scheme -> claro
  const temaSalvo = localStorage.getItem('valebus_tema');
  const prefereEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const temaInicial = temaSalvo === 'escuro' || (!temaSalvo && prefereEscuro) ? 'escuro' : 'claro';
  definirTema(temaInicial, false);

  if (btnTemaToggle) {
    btnTemaToggle.addEventListener('click', () => {
      const temaAtual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'escuro' : 'claro';
      const novoTema = temaAtual === 'escuro' ? 'claro' : 'escuro';
      definirTema(novoTema, true);
    });
  }


  /* ──────────────────────────────────────────────────────────
     4. RENDERIZAÇÃO DOS MARCADORES SVG DE ÔNIBUS
     ────────────────────────────────────────────────────────── */
  const marcadoresMap = new Map();

  function criarIconeBus(cor) {
    const htmlIcone = `
      <div class="bus-marker-container">
        <div class="bus-marker" style="background-color: ${cor};">
          <svg viewBox="0 0 24 24">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
            <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
          <div class="bus-marker-pulse" style="color: ${cor};"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlIcone,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18]
    });
  }

  function gerarHtmlPopup(bus) {
    const nomeVeiculo = bus.veiculo || 'Ônibus Municipal';
    const numPrefixo = bus.prefixo ? `• Prefixo ${bus.prefixo}` : '';
    return `
      <div class="popup-onibus">
        <div class="popup-onibus__header">
          <span class="popup-onibus__dot" style="background-color: ${bus.linha.cor};"></span>
          <div style="display:flex; flex-direction:column; gap: 2px;">
            <h3 class="popup-onibus__titulo" style="color: ${bus.linha.cor}; margin: 0;">
              ${bus.linha.nome}
            </h3>
            <span style="font-size: 11px; font-weight: 700; color: var(--texto-secundario);">${nomeVeiculo} ${numPrefixo}</span>
          </div>
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
          <span class="popup-onibus__velocidade">⚡ <strong>${bus.velocidade === 0 ? '0 km/h (Ponto Inicial)' : bus.velocidade + ' km/h'}</strong></span>
          <span class="popup-onibus__gps-badge">GPS Online</span>
        </div>
      </div>
    `;
  }

  function obterPontoInicialLinha(chaveLinha) {
    if (window.VALEBUS_PARADAS && window.VALEBUS_PARADAS.paradasPorLinha && window.VALEBUS_PARADAS.paradasPorLinha[chaveLinha]) {
      const paradas = window.VALEBUS_PARADAS.paradasPorLinha[chaveLinha];
      if (paradas && paradas.length > 0 && paradas[0].posicao) {
        return [paradas[0].posicao[0], paradas[0].posicao[1]];
      }
    }
    const COORDENADAS_EXATAS = {
      anchieta: [-22.254164, -45.696709],
      fernandes: [-22.22582948032013, -45.71819403549861],
      fortaleza: [-22.22582948032013, -45.71819403549861],
      industrial: [-22.261351790494068, -45.771512667995346],
      porto_sapucai: [-22.257161337562074, -45.80345771571105],
      reforco_jose_gm: [-22.22582948032013, -45.71819403549861],
      sao_benedito_hora: [-22.22582948032013, -45.71819403549861],
      sao_benedito_hora_meia: [-22.22582948032013, -45.71819403549861]
    };
    return COORDENADAS_EXATAS[chaveLinha] || [-22.22582948032013, -45.71819403549861];
  }

  function normalizarChaveLinha(str) {
    if (!str) return 'fernandes';
    const s = String(str).toLowerCase().trim();
    if (s === 'industrial' || s.includes('industrial')) return 'industrial';
    if (s === 'porto_sapucai' || s.includes('porto') || s.includes('sapucai') || s.includes('sapucaí')) return 'porto_sapucai';
    if (s === 'reforco_jose_gm' || s.includes('reforco') || s.includes('reforço') || s.includes('mcm')) return 'reforco_jose_gm';
    if (s === 'sao_benedito_hora_meia' || s.includes('hora e meia') || (s.includes('benedito') && s.includes('meia'))) return 'sao_benedito_hora_meia';
    if (s === 'sao_benedito_hora' || s.includes('benedito') || s.includes('hora')) return 'sao_benedito_hora';
    if (s === 'fortaleza' || s.includes('fortaleza')) return 'fortaleza';
    if (s === 'anchieta' || s.includes('anchieta')) return 'anchieta';
    return 'fernandes';
  }

  function obterOperacaoMotorista() {
    let linhaChave = localStorage.getItem('valebus_linha_motorista_ativa');
    let veiculoNome = localStorage.getItem('valebus_veiculo_motorista_ativo');

    try {
      const sessao = (window.ValeBusAPI && typeof window.ValeBusAPI.obterSessao === 'function')
        ? window.ValeBusAPI.obterSessao()
        : JSON.parse(localStorage.getItem('valebus_usuario') || 'null');

      if (sessao && (sessao.perfil === 'motorista' || sessao.linha || sessao.veiculo)) {
        if (sessao.linhaChave || sessao.linha) {
          linhaChave = sessao.linhaChave || sessao.linha;
        }
        if (sessao.veiculo) {
          veiculoNome = sessao.veiculo;
        }
      }
    } catch (e) {}

    linhaChave = normalizarChaveLinha(linhaChave || 'fernandes');
    if (!veiculoNome) {
      const padroes = {
        anchieta: 'Ônibus #01',
        fernandes: 'Ônibus #02',
        fortaleza: 'Ônibus #03',
        industrial: 'Ônibus #04',
        porto_sapucai: 'Ônibus #05',
        reforco_jose_gm: 'Ônibus #06',
        sao_benedito_hora: 'Ônibus #07',
        sao_benedito_hora_meia: 'Ônibus #08'
      };
      veiculoNome = padroes[linhaChave] || 'Ônibus #02';
    }

    veiculoNome = veiculoNome.replace(/\s*\(Prefixo\s*\d+\)/i, '').trim();

    return { linhaChave, veiculoNome };
  }

  function atualizarCardsProximos(operacao) {
    const cards = document.querySelectorAll('.proximo-card');
    cards.forEach(card => {
      const chave = card.getAttribute('data-linha');
      const badgeStatus = card.querySelector('.status-badge');
      if (chave === operacao.linhaChave) {
        card.classList.add('proximo-card--destaque');
        card.style.borderColor = 'var(--cor-marca)';
        card.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
        if (badgeStatus) {
          badgeStatus.textContent = `${operacao.veiculoNome} • Em rota`;
          badgeStatus.className = 'status-badge status-badge--horario';
          badgeStatus.style.background = 'rgba(34, 197, 94, 0.15)';
          badgeStatus.style.color = '#16a34a';
          badgeStatus.style.fontWeight = '700';
        }
      } else {
        card.classList.remove('proximo-card--destaque');
        card.style.borderColor = '';
        card.style.boxShadow = '';
        if (badgeStatus) {
          badgeStatus.textContent = 'Aguardando';
          badgeStatus.className = 'status-badge';
          badgeStatus.style.background = 'rgba(148, 163, 184, 0.12)';
          badgeStatus.style.color = '#64748b';
          badgeStatus.style.fontWeight = '500';
        }
      }
    });
  }

  function obterPosicaoVisual(bus) {
    return obterPontoInicialLinha(bus.chaveLinha);
  }

  let operacaoAtual = obterOperacaoMotorista();

  function renderizarMarcadores() {
    operacaoAtual = obterOperacaoMotorista();

    // Limpa marcadores anteriores
    marcadoresMap.forEach(({ marker }) => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    marcadoresMap.clear();

    // Mostra APENAS o ônibus que o motorista está operando
    const busOperando = FROTA.find(b => b.chaveLinha === operacaoAtual.linhaChave) || FROTA[1];
    busOperando.veiculo = operacaoAtual.veiculoNome;

    // Posiciona exatamente no ponto inicial oficial da linha (Parada 1)
    const posInicial = obterPontoInicialLinha(busOperando.chaveLinha);
    busOperando.posicao = [posInicial[0], posInicial[1]];

    const icone = criarIconeBus(busOperando.linha.cor);
    const conteudoPopup = gerarHtmlPopup(busOperando);

    const marker = L.marker(posInicial, { icon: icone })
      .addTo(map)
      .bindPopup(conteudoPopup);

    marcadoresMap.set(busOperando.chaveLinha, { marker, bus: busOperando });

    // Atualiza contadores
    const elTotal = document.getElementById('total-onibus-ativo');
    if (elTotal) {
      const spanNumDestaque = elTotal.querySelector('.num-destaque');
      const spanNumTotal = elTotal.querySelector('.num-total');
      if (spanNumDestaque && spanNumTotal) {
        spanNumDestaque.textContent = '1';
        spanNumTotal.textContent = '1';
      } else {
        elTotal.textContent = '1 / 1';
      }
    }

    const elMainLiveLabel = document.getElementById('main-header-live-label');
    if (elMainLiveLabel) {
      elMainLiveLabel.textContent = `GPS Ao Vivo • ${busOperando.veiculo} em Operação`;
    }

    // Atualiza cards da lateral
    atualizarCardsProximos(operacaoAtual);
  }

  renderizarMarcadores();


  /* ──────────────────────────────────────────────────────────
     4.1. PONTOS (PARADAS) DE ÔNIBUS — ARQUITETURA MODULAR
     Fonte de dados estruturada em js/paradas.js (window.VALEBUS_PARADAS)
     Preparada para escalar para ~115 paradas de todas as rotas municipais
     ────────────────────────────────────────────────────────── */
  const camadaParadas = L.layerGroup();
  let paradasVisiveis = false; // Desativado por padrão na visão 'todas' para manter o mapa limpo
  let linhaAtivaFiltro = 'todas';

  function criarIconeParada(ponto) {
    const cor = ponto.corLinha || '#16a34a';
    const htmlIcone = `
      <div class="ponto-parada-container" data-linha="${ponto.linha || ponto.linhaChave}">
        <div class="ponto-parada-pin" style="--cor-ponto: ${cor};">
          <div class="ponto-parada-corpo">
            <svg class="ponto-parada-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="3" width="16" height="13" rx="2"></rect>
              <path d="M4 10h16"></path>
              <path d="M7 16v3"></path>
              <path d="M17 16v3"></path>
              <circle cx="8" cy="13" r="1" fill="currentColor"></circle>
              <circle cx="16" cy="13" r="1" fill="currentColor"></circle>
            </svg>
          </div>
          <div class="ponto-parada-ponteiro"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlIcone,
      className: 'leaflet-ponto-parada-wrapper',
      iconSize: [26, 32],
      iconAnchor: [13, 30],
      popupAnchor: [0, -28]
    });
  }

  function gerarHtmlPopupParada(ponto) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ponto.posicao[0]},${ponto.posicao[1]}`;

    return `
      <div class="popup-ponto">
        <div class="popup-ponto__corpo">
          <div class="popup-ponto__item">
            <span class="popup-ponto__rotulo">Endereço</span>
            <h4 class="popup-ponto__endereco">${ponto.endereco}</h4>
          </div>
          <div class="popup-ponto__item">
            <span class="popup-ponto__rotulo">Ponto de Referência</span>
            <div class="popup-ponto__referencia">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span>${ponto.referencia}</span>
            </div>
          </div>
        </div>

        <div class="popup-ponto__footer">
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-ponto__btn-maps" title="Abrir localização exata no Google Maps">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Ver no Google Maps</span>
          </a>
        </div>
      </div>
    `;
  }

  function renderizarParadas(linhaSelecionada = linhaAtivaFiltro) {
    camadaParadas.clearLayers();

    if (!window.VALEBUS_PARADAS) return;

    const paradas = window.VALEBUS_PARADAS.obterParadas(linhaSelecionada);

    paradas.forEach(ponto => {
      const icone = criarIconeParada(ponto);
      const popupConteudo = gerarHtmlPopupParada(ponto);

      const marker = L.marker(ponto.posicao, {
        icon: icone,
        title: `${ponto.endereco} — ${ponto.referencia}`
      }).bindPopup(popupConteudo);

      marker.bindTooltip(`<strong>${ponto.referencia}</strong><br><span style="font-size:11px;color:#cbd5e1;">${ponto.endereco}</span>`, {
        direction: 'top',
        offset: [0, -28],
        opacity: 0.95
      });

      camadaParadas.addLayer(marker);
    });

    if (paradasVisiveis && !map.hasLayer(camadaParadas)) {
      camadaParadas.addTo(map);
    }

    // Mantém o rótulo limpo do botão flutuante
    const btnTextoParadas = document.querySelector('.mapa-btn-paradas__texto');
    if (btnTextoParadas) {
      btnTextoParadas.textContent = 'Paradas';
    }
  }

  function atualizarVisibilidadeParadas(linhaSelecionada = linhaAtivaFiltro) {
    linhaAtivaFiltro = linhaSelecionada;

    if (!paradasVisiveis) {
      if (map.hasLayer(camadaParadas)) {
        map.removeLayer(camadaParadas);
      }
      return;
    }

    renderizarParadas(linhaSelecionada);
  }

  // Renderização inicial
  renderizarParadas();

  // Controle de alternar visibilidade via botão do mapa
  const btnToggleParadas = document.getElementById('btn-toggle-paradas');
  if (btnToggleParadas) {
    btnToggleParadas.addEventListener('click', () => {
      paradasVisiveis = !paradasVisiveis;
      btnToggleParadas.classList.toggle('mapa-btn-flutuante--ativo', paradasVisiveis);
      btnToggleParadas.classList.toggle('mapa-btn-paradas--ativo', paradasVisiveis);
      btnToggleParadas.setAttribute('aria-pressed', String(paradasVisiveis));

      if (paradasVisiveis) {
        renderizarParadas(linhaAtivaFiltro);
      } else {
        if (map.hasLayer(camadaParadas)) {
          map.removeLayer(camadaParadas);
        }
      }
    });
  }


  /* ──────────────────────────────────────────────────────────
     4.2. TRAJETOS VETORIAIS (POLYLINES) DAS LINHAS
     Traçado vetorial fiel à malha viária real de Santa Rita do Sapucaí
     ────────────────────────────────────────────────────────── */
  const camadaTrajetos = L.layerGroup();
  let trajetosVisiveis = false; // Desativado por padrão na visão 'todas' para manter o mapa limpo
  let polylineAtivaRef = null;

  function renderizarTrajetos(linhaSelecionada = linhaAtivaFiltro) {
    camadaTrajetos.clearLayers();
    polylineAtivaRef = null;

    if (!window.VALEBUS_PARADAS) return;

    // Se 'todas' ou uma linha com trajeto cadastrado (ex: 'anchieta')
    const linhasParaDesenhar = (linhaSelecionada === 'todas')
      ? ['anchieta']
      : (window.VALEBUS_PARADAS.temTrajeto(linhaSelecionada) ? [linhaSelecionada] : []);

    linhasParaDesenhar.forEach(chave => {
      const coords = window.VALEBUS_PARADAS.obterTrajeto(chave);
      if (!coords || coords.length === 0) return;

      const meta = window.VALEBUS_PARADAS.metadadosLinhas[chave] || {
        nome: 'Linha ' + chave,
        cor: '#16a34a'
      };

      // 1. Linha de contraste inferior (halo escuro para legibilidade perfeita dia/noite)
      const polyHalo = L.polyline(coords, {
        color: '#052e16',
        weight: 7.5,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      });

      // 2. Traçado principal na cor oficial da Linha
      const polyPrincipal = L.polyline(coords, {
        color: meta.cor,
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true
      });

      const totalParadasLinha = (window.VALEBUS_PARADAS.paradasPorLinha[chave] || []).length;
      polyPrincipal.bindTooltip(
        `<strong>${meta.nome}</strong><br><span style="font-size:11px;color:#cbd5e1;">Itinerário oficial &bull; ${totalParadasLinha} paradas</span>`,
        { sticky: true, opacity: 0.95 }
      );

      // Efeito de destaque suave ao passar o cursor
      polyPrincipal.on('mouseover', () => {
        polyPrincipal.setStyle({ weight: 6.5, opacity: 1 });
      });
      polyPrincipal.on('mouseout', () => {
        polyPrincipal.setStyle({ weight: 4.5, opacity: 0.95 });
      });

      camadaTrajetos.addLayer(polyHalo);
      camadaTrajetos.addLayer(polyPrincipal);

      polylineAtivaRef = polyPrincipal;
    });

    if (trajetosVisiveis && !map.hasLayer(camadaTrajetos)) {
      camadaTrajetos.addTo(map);
    }
  }

  function atualizarVisibilidadeTrajetos(linhaSelecionada = linhaAtivaFiltro) {
    if (!trajetosVisiveis) {
      if (map.hasLayer(camadaTrajetos)) {
        map.removeLayer(camadaTrajetos);
      }
      return;
    }

    renderizarTrajetos(linhaSelecionada);
  }

  // Renderização inicial dos trajetos
  renderizarTrajetos();

  // Controle de alternar visibilidade do trajeto via botão flutuante
  const btnToggleTrajeto = document.getElementById('btn-toggle-trajeto');
  if (btnToggleTrajeto) {
    btnToggleTrajeto.addEventListener('click', () => {
      trajetosVisiveis = !trajetosVisiveis;
      btnToggleTrajeto.classList.toggle('mapa-btn-flutuante--ativo', trajetosVisiveis);
      btnToggleTrajeto.setAttribute('aria-pressed', String(trajetosVisiveis));

      if (trajetosVisiveis) {
        renderizarTrajetos(linhaAtivaFiltro);
      } else {
        if (map.hasLayer(camadaTrajetos)) {
          map.removeLayer(camadaTrajetos);
        }
      }
    });
  }


  /* ──────────────────────────────────────────────────────────
     5. TELEMETRIA GPS (ÔNIBUS NO PONTO INICIAL EXATO)
     ────────────────────────────────────────────────────────── */
  setInterval(() => {
    marcadoresMap.forEach(({ marker, bus }) => {
      // Mantém o ônibus posicionado fielmente no ponto inicial oficial
      const posExata = obterPontoInicialLinha(bus.chaveLinha);
      bus.posicao = [posExata[0], posExata[1]];
      marker.setLatLng(posExata);

      // Atualiza conteúdo do popup caso aberto
      if (marker.isPopupOpen()) {
        marker.setPopupContent(gerarHtmlPopup(bus));
      }
    });
  }, 3000);


  /* ──────────────────────────────────────────────────────────
     6. FILTRO INTERATIVO POR LINHA (LEGENDA) + FOCO NO MAPA + ESTADO VAZIO
     ────────────────────────────────────────────────────────── */
  const botoesFiltro = document.querySelectorAll('#filtros-legenda .mapa-legenda__item');
  const mapaLegenda = document.querySelector('.mapa-legenda');
  const mapaLegendaHeader = document.querySelector('.mapa-legenda__header');
  const btnLegendaPrev = document.getElementById('btn-legenda-prev');
  const btnLegendaNext = document.getElementById('btn-legenda-next');
  const containerFiltrosLegenda = document.getElementById('filtros-legenda');

  // Elementos do Estado Vazio (Alerta quando nenhum ônibus visível)
  const elMapaAlertaVazio = document.getElementById('mapa-alerta-vazio');
  const elMapaAlertaTitulo = document.getElementById('mapa-alerta-vazio-titulo');
  const elMapaAlertaDesc = document.getElementById('mapa-alerta-vazio-desc');
  const btnResetFiltroMapa = document.getElementById('btn-reset-filtro-mapa');
  const elPainelAlertaVazio = document.getElementById('painel-alerta-vazio');
  const elPainelAlertaTitulo = document.getElementById('painel-alerta-vazio-titulo');

  function mostrarAlertaLinhaVazia(chaveLinha) {
    const nomeLinha = LINHAS[chaveLinha] ? LINHAS[chaveLinha].nome : 'desta linha';
    const operacao = obterOperacaoMotorista();
    const nomeLinhaOp = LINHAS[operacao.linhaChave] ? LINHAS[operacao.linhaChave].nome : operacao.linhaChave;

    // Alerta no Mapa
    if (elMapaAlertaVazio) {
      if (elMapaAlertaTitulo) {
        elMapaAlertaTitulo.textContent = 'Nenhum ônibus desta linha está disponível no momento.';
      }
      if (elMapaAlertaDesc) {
        elMapaAlertaDesc.textContent = `No momento, o motorista está operando o ${operacao.veiculoNome} na ${nomeLinhaOp}. Não há veículos com telemetria GPS ativa operando na ${nomeLinha} agora.`;
      }
      elMapaAlertaVazio.style.display = 'flex';
    }

    // Alerta no Painel Lateral
    if (elPainelAlertaVazio) {
      if (elPainelAlertaTitulo) {
        elPainelAlertaTitulo.textContent = `Nenhum veículo em operação na ${nomeLinha}.`;
      }
      elPainelAlertaVazio.style.display = 'flex';
    }

    // Fecha popup e reposiciona visualização da cidade suavemente
    map.closePopup();
    map.flyTo([-22.2528, -45.7036], 13.5, { animate: true, duration: 0.8 });
  }

  function ocultarAlertaLinhaVazia() {
    if (elMapaAlertaVazio) {
      elMapaAlertaVazio.style.display = 'none';
    }
    if (elPainelAlertaVazio) {
      elPainelAlertaVazio.style.display = 'none';
    }
  }

  // Ação do Botão "Ver todas as linhas" dentro do alerta do mapa
  if (btnResetFiltroMapa) {
    btnResetFiltroMapa.addEventListener('click', () => {
      const btnTodas = document.querySelector('#filtros-legenda [data-linha="todas"]');
      if (btnTodas) {
        btnTodas.click();
      }
    });
  }

  // Permite recolher/expandir o filtro da legenda no mobile ao clicar no cabeçalho
  if (mapaLegendaHeader && mapaLegenda) {
    mapaLegendaHeader.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        mapaLegenda.classList.toggle('recolhida');
      }
    });
  }

  // Suporte a rolagem horizontal via roda do mouse no carrossel
  if (containerFiltrosLegenda) {
    containerFiltrosLegenda.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0 && !e.deltaX) {
        e.preventDefault();
        containerFiltrosLegenda.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  // Ações das setas de navegação (Anterior / Próxima Linha)
  if (btnLegendaPrev) {
    btnLegendaPrev.addEventListener('click', () => {
      const botoesArr = Array.from(botoesFiltro);
      const indexAtual = botoesArr.findIndex(b => b.classList.contains('mapa-legenda__item--ativo'));
      const prevIndex = indexAtual > 0 ? indexAtual - 1 : botoesArr.length - 1;
      botoesArr[prevIndex].click();
    });
  }

  if (btnLegendaNext) {
    btnLegendaNext.addEventListener('click', () => {
      const botoesArr = Array.from(botoesFiltro);
      const indexAtual = botoesArr.findIndex(b => b.classList.contains('mapa-legenda__item--ativo'));
      const nextIndex = indexAtual < botoesArr.length - 1 ? indexAtual + 1 : 0;
      botoesArr[nextIndex].click();
    });
  }

  botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
      e.stopPropagation();
      botoesFiltro.forEach(b => {
        b.classList.remove('mapa-legenda__item--ativo');
        b.setAttribute('aria-selected', 'false');
      });
      botao.classList.add('mapa-legenda__item--ativo');
      botao.setAttribute('aria-selected', 'true');

      // Centraliza o chip ativo com animação fluida no carrossel em qualquer resolução
      botao.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

      const linhaSelecionada = botao.getAttribute('data-linha');
      let totalVisivel = 0;

      marcadoresMap.forEach(({ marker, bus }) => {
        if (linhaSelecionada === 'todas' || bus.chaveLinha === linhaSelecionada) {
          const pos = obterPontoInicialLinha(bus.chaveLinha);
          bus.posicao = [pos[0], pos[1]];
          marker.setLatLng(pos);
          if (!map.hasLayer(marker)) map.addLayer(marker);
          totalVisivel++;
        } else {
          if (map.hasLayer(marker)) map.removeLayer(marker);
        }
      });

      // No filtro 'todas', paradas e trajeto vêm DESATIVADOS por padrão para manter o mapa limpo
      if (linhaSelecionada === 'todas') {
        paradasVisiveis = false;
        trajetosVisiveis = false;
        if (btnToggleParadas) {
          btnToggleParadas.classList.remove('mapa-btn-flutuante--ativo', 'mapa-btn-paradas--ativo');
          btnToggleParadas.setAttribute('aria-pressed', 'false');
        }
        if (btnToggleTrajeto) {
          btnToggleTrajeto.classList.remove('mapa-btn-flutuante--ativo');
          btnToggleTrajeto.setAttribute('aria-pressed', 'false');
        }
      } else {
        // Ao filtrar uma linha específica, ativa o trajeto e as paradas daquela linha
        paradasVisiveis = true;
        trajetosVisiveis = true;
        if (btnToggleParadas) {
          btnToggleParadas.classList.add('mapa-btn-flutuante--ativo', 'mapa-btn-paradas--ativo');
          btnToggleParadas.setAttribute('aria-pressed', 'true');
        }
        if (btnToggleTrajeto) {
          btnToggleTrajeto.classList.add('mapa-btn-flutuante--ativo');
          btnToggleTrajeto.setAttribute('aria-pressed', 'true');
        }
      }

      // Atualiza visibilidade dos pontos de parada e trajetos conforme a linha
      atualizarVisibilidadeParadas(linhaSelecionada);
      atualizarVisibilidadeTrajetos(linhaSelecionada);

      // Atualiza o contador no resumo do painel
      const elTotal = document.getElementById('total-onibus-ativo');
      if (elTotal) {
        const spanNumDestaque = elTotal.querySelector('.num-destaque');
        const spanNumTotal = elTotal.querySelector('.num-total');
        if (spanNumDestaque && spanNumTotal) {
          spanNumDestaque.textContent = totalVisivel;
          spanNumTotal.textContent = '1';
        } else {
          elTotal.textContent = `${totalVisivel} / 1`;
        }
      }

      const elMainLiveLabel = document.getElementById('main-header-live-label');
      if (elMainLiveLabel) {
        elMainLiveLabel.textContent = totalVisivel > 0
          ? `GPS Ao Vivo • ${operacaoAtual.veiculoNome} em Operação`
          : 'GPS Ao Vivo • Nenhum Veículo nesta Linha';
      }

      // ESTADO QUANDO NENHUM ÔNIBUS ESTIVER VISÍVEL
      if (totalVisivel === 0) {
        mostrarAlertaLinhaVazia(linhaSelecionada);
      } else {
        ocultarAlertaLinhaVazia();

        if (linhaSelecionada === 'todas') {
          map.closePopup();
          map.flyTo([-22.2528, -45.7036], 14, { animate: true, duration: 1.0 });
        } else {
          focarOnibusPorLinha(linhaSelecionada, false);
        }
      }
    });
  });


  /* ──────────────────────────────────────────────────────────
     7. NAVEGAÇÃO INTERATIVA (Clique no Card -> flyTo no Mapa)
     ────────────────────────────────────────────────────────── */
  const cardsProximos = document.querySelectorAll('.proximo-card');

  function focarOnibusPorLinha(chaveLinha, atualizarCarrossel = true) {
    // Sincroniza o botão correspondente no carrossel da legenda
    if (atualizarCarrossel) {
      const btnLegenda = document.querySelector(`#filtros-legenda [data-linha="${chaveLinha}"]`);
      if (btnLegenda) {
        botoesFiltro.forEach(b => {
          b.classList.remove('mapa-legenda__item--ativo');
          b.setAttribute('aria-selected', 'false');
        });
        btnLegenda.classList.add('mapa-legenda__item--ativo');
        btnLegenda.setAttribute('aria-selected', 'true');
        btnLegenda.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    const itemBus = marcadoresMap.get(chaveLinha);
    if (itemBus) {
      ocultarAlertaLinhaVazia();
      const { marker, bus } = itemBus;
      const latLng = obterPontoInicialLinha(bus.chaveLinha);
      bus.posicao = [latLng[0], latLng[1]];
      marker.setLatLng(latLng);

      // Garantir que a camada do marcador está visível se houver filtro
      if (!map.hasLayer(marker)) {
        map.addLayer(marker);
      }

      // Ao focar na linha ativa, habilita as paradas e trajeto desta rota
      paradasVisiveis = true;
      trajetosVisiveis = true;
      if (btnToggleParadas) {
        btnToggleParadas.classList.add('mapa-btn-flutuante--ativo', 'mapa-btn-paradas--ativo');
        btnToggleParadas.setAttribute('aria-pressed', 'true');
      }
      if (btnToggleTrajeto) {
        btnToggleTrajeto.classList.add('mapa-btn-flutuante--ativo');
        btnToggleTrajeto.setAttribute('aria-pressed', 'true');
      }

      // Atualiza visibilidade dos pontos de parada e trajetos para a linha focada
      atualizarVisibilidadeParadas(chaveLinha);
      atualizarVisibilidadeTrajetos(chaveLinha);

      // Atualiza popup antes de abrir
      marker.setPopupContent(gerarHtmlPopup(bus));

      // Se houver traçado ativo com múltiplos pontos, enquadra o trajeto completo da linha
      if (polylineAtivaRef && trajetosVisiveis) {
        map.fitBounds(polylineAtivaRef.getBounds(), {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
          duration: 1.2
        });
        setTimeout(() => {
          marker.openPopup();
        }, 1250);
      } else {
        // Faz o mapa voar suavemente até o ônibus selecionado
        map.flyTo(latLng, 16, { animate: true, duration: 1.2 });
        marker.openPopup();
      }

      // Atualiza o contador no resumo do painel
      const elTotal = document.getElementById('total-onibus-ativo');
      if (elTotal) {
        const spanNumDestaque = elTotal.querySelector('.num-destaque');
        const spanNumTotal = elTotal.querySelector('.num-total');
        if (spanNumDestaque && spanNumTotal) {
          spanNumDestaque.textContent = '1';
          spanNumTotal.textContent = '1';
        } else {
          elTotal.textContent = '1 / 1';
        }
      }

      const elMainLiveLabel = document.getElementById('main-header-live-label');
      if (elMainLiveLabel) {
        elMainLiveLabel.textContent = `GPS Ao Vivo • ${bus.veiculo} em Operação`;
      }

      // Se estiver no celular/tablet, fecha o painel lateral para mostrar o mapa
      if (window.innerWidth < 1100) {
        fecharPainel();
      }
    } else {
      // Nenhum ônibus visível para esta linha: oculta outros marcadores e exibe estado vazio
      marcadoresMap.forEach(({ marker }) => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });

      const elTotal = document.getElementById('total-onibus-ativo');
      if (elTotal) {
        const spanNumDestaque = elTotal.querySelector('.num-destaque');
        const spanNumTotal = elTotal.querySelector('.num-total');
        if (spanNumDestaque && spanNumTotal) {
          spanNumDestaque.textContent = '0';
          spanNumTotal.textContent = '1';
        } else {
          elTotal.textContent = '0 / 1';
        }
      }

      const elMainLiveLabel = document.getElementById('main-header-live-label');
      if (elMainLiveLabel) {
        elMainLiveLabel.textContent = 'GPS Ao Vivo • Nenhum Veículo nesta Linha';
      }

      mostrarAlertaLinhaVazia(chaveLinha);

      if (window.innerWidth < 1100) {
        fecharPainel();
      }
    }
  }

  cardsProximos.forEach(card => {
    card.addEventListener('click', () => {
      const chaveLinha = card.getAttribute('data-linha');
      focarOnibusPorLinha(chaveLinha);
    });

    // Suporte a navegação por teclado (Enter e Espaço)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const chaveLinha = card.getAttribute('data-linha');
        focarOnibusPorLinha(chaveLinha);
      }
    });
  });

  // Botão "Ver todas as 8 linhas da frota" (Expandir / Recolher lista de próximos ônibus)
  const btnVerTodos = document.getElementById('btn-ver-todos');
  const proximosLista = document.getElementById('proximos-lista');
  const btnVerTodosTexto = btnVerTodos ? btnVerTodos.querySelector('.btn-ver-todos__texto') : null;
  const btnVerTodosBadge = btnVerTodos ? btnVerTodos.querySelector('.btn-ver-todos__badge') : null;

  if (btnVerTodos) {
    btnVerTodos.addEventListener('click', () => {
      const estaExpandido = btnVerTodos.getAttribute('aria-expanded') === 'true';
      const novoEstado = !estaExpandido;

      btnVerTodos.setAttribute('aria-expanded', String(novoEstado));

      if (proximosLista) {
        proximosLista.classList.toggle('proximos-lista--expandida', novoEstado);
      }

      if (novoEstado) {
        if (btnVerTodosTexto) btnVerTodosTexto.textContent = 'Recolher linhas da frota';
        if (btnVerTodosBadge) btnVerTodosBadge.style.display = 'none';

        // Reseta o filtro do mapa para 'todas' e re-enquadra a visão completa
        const btnTodas = document.querySelector('#filtros-legenda [data-linha="todas"]');
        if (btnTodas && !btnTodas.classList.contains('mapa-legenda__item--ativo')) {
          btnTodas.click();
        }
      } else {
        if (btnVerTodosTexto) btnVerTodosTexto.textContent = 'Ver todas as 8 linhas da frota';
        if (btnVerTodosBadge) btnVerTodosBadge.style.display = 'inline-flex';
      }
    });
  }


  /* ──────────────────────────────────────────────────────────
     8. GESTÃO DE ALERTAS, NOTIFICAÇÕES & TOASTS EM TEMPO REAL
     ────────────────────────────────────────────────────────── */
  const ALERTAS_PADRAO = [
    {
      id: 'alt-1',
      linha: 'fernandes',
      tipo: 'atencao', // 'atencao' | 'critico' | 'info' | 'sucesso'
      titulo: 'Trânsito Moderado — Próximo ao Ginásio Poliesportivo',
      mensagem: 'Linha Fernandes e São Benedito com acréscimo estimado de 3 a 5 minutos devido ao fluxo de entrada/saída escolar e universitário na região central.',
      origem: 'CCO Operacional ValeBus',
      horario: 'Há 12 minutos',
      timestamp: Date.now() - 12 * 60 * 1000,
      lida: false,
      resolvido: false
    },
    {
      id: 'alt-2',
      linha: 'anchieta',
      tipo: 'info',
      titulo: 'Linha Anchieta — Rota Especial Sentido Recanto / Inatel',
      mensagem: 'Embarque e desembarque operando com pontualidade na Praça Urbana Carolina e Rua José Ribeiro de Barros.',
      origem: 'Telemetria GPS Automática',
      horario: 'Hoje às 07:00',
      timestamp: Date.now() - 45 * 60 * 1000,
      lida: false,
      resolvido: false
    },
    {
      id: 'alt-3',
      linha: 'porto_sapucai',
      tipo: 'sucesso',
      titulo: 'Operação 100% Normal na Rodovia BR-459',
      mensagem: 'Linha Industrial e Linha Porto Sapucaí transitando sem retenções nos acessos à Linear e trevo de Cachoeira de Minas.',
      origem: 'CCO Operacional ValeBus',
      horario: 'Há 35 minutos',
      timestamp: Date.now() - 35 * 60 * 1000,
      lida: true,
      resolvido: true
    }
  ];

  let listaAlertasState = [];

  function carregarAlertas() {
    try {
      const salvo = localStorage.getItem('valebus_alertas');
      if (salvo) {
        listaAlertasState = JSON.parse(salvo);
      } else {
        listaAlertasState = [...ALERTAS_PADRAO];
      }
    } catch (e) {
      listaAlertasState = [...ALERTAS_PADRAO];
    }
  }

  function salvarAlertas() {
    try {
      localStorage.setItem('valebus_alertas', JSON.stringify(listaAlertasState));
    } catch (e) {
      console.warn('Erro ao salvar alertas no storage:', e);
    }
  }

  carregarAlertas();

  // Elementos do Sino e Dropdown
  const btnSino = document.getElementById('btn-sino-notificacoes');
  const dropdownNotificacoes = document.getElementById('dropdown-notificacoes');
  const notificacoesWrapper = document.getElementById('topbar-notificacoes-wrapper');
  const badgeSino = document.getElementById('topbar-badge-sino');
  const dropdownBadgeNaolidas = document.getElementById('dropdown-badge-naolidas');
  const countTodos = document.getElementById('notif-count-todos');
  const countNaolidos = document.getElementById('notif-count-naolidos');
  const listaDropdown = document.getElementById('dropdown-notificacoes-lista');
  const btnMarcarTodasLidas = document.getElementById('btn-marcar-todas-lidas');
  const btnLimparNotifs = document.getElementById('btn-limpar-notificacoes');
  const btnDropdownIrAlertas = document.getElementById('btn-dropdown-ir-alertas');
  const filtrosDropdown = document.querySelectorAll('.notificacoes-dropdown__filtros .notif-filtro-btn');

  // Elementos da Seção Alertas
  const feedAlertasContainer = document.getElementById('feed-alertas-container');
  const inputBuscaAlertas = document.getElementById('input-busca-alertas');
  const chipsFiltroFeed = document.querySelectorAll('.alertas-filtros-chips .alerta-filtro-chip');
  const kpiAlertasAtivos = document.getElementById('kpi-alertas-ativos');
  const kpiLinhasAtrasadas = document.getElementById('kpi-linhas-atrasadas');
  const kpiAlertasResolvidos = document.getElementById('kpi-alertas-resolvidos');
  const feedCountTodos = document.getElementById('feed-count-todos');
  const btnAbrirModalNovoAlerta = document.getElementById('btn-abrir-modal-novo-alerta');

  // Modal Novo Alerta
  const modalNovoAlerta = document.getElementById('modal-novo-alerta');
  const btnFecharModalAlerta = document.getElementById('btn-fechar-modal-alerta');
  const btnCancelarAlerta = document.getElementById('btn-cancelar-alerta');
  const formNovoAlerta = document.getElementById('form-novo-alerta');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  let filtroAtivoDropdown = 'todos';
  let filtroAtivoFeed = 'todos';
  let termoBuscaFeed = '';

  /* Ícones e Cores Auxiliares */
  const ICONES_TIPO = {
    atencao: '⚠️',
    critico: '🚨',
    info: '📢',
    sucesso: '✅'
  };

  function obterNomeLinha(chave) {
    if (!chave || chave === 'todas') return 'Todas as Linhas';
    return LINHAS[chave] ? LINHAS[chave].nome : chave;
  }

  function obterCorLinha(chave) {
    if (!chave || chave === 'todas') return '#2563eb';
    return LINHAS[chave] ? LINHAS[chave].cor : '#2563eb';
  }

  /* ──────────────────────────────────────────────────────────
     8.1. SISTEMA GLOBAL DE TOASTS (POPUP NOTIFICATIONS)
     ────────────────────────────────────────────────────────── */
  function exibirToast({ titulo, mensagem, tipo = 'info', linha = null, duracaoMs = 5000 }) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `valebus-toast valebus-toast--${tipo}`;
    toast.setAttribute('role', 'alert');

    const icone = ICONES_TIPO[tipo] || '📢';
    const temLinha = linha && linha !== 'todas' && LINHAS[linha];

    toast.innerHTML = `
      <div class="valebus-toast__icone-wrap" aria-hidden="true">${icone}</div>
      <div class="valebus-toast__corpo">
        <h4 class="valebus-toast__titulo">${titulo}</h4>
        <p class="valebus-toast__msg">${mensagem}</p>
        ${temLinha ? `
          <div class="valebus-toast__acoes">
            <button type="button" class="btn-toast-mapa" data-linha="${linha}">
              Localizar no Mapa →
            </button>
          </div>
        ` : ''}
      </div>
      <button type="button" class="valebus-toast__fechar" aria-label="Fechar notificação">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#icone-fechar"/></svg>
      </button>
      <div class="valebus-toast__progresso" style="animation-duration: ${duracaoMs}ms;"></div>
    `;

    toastContainer.appendChild(toast);

    let timer = setTimeout(() => {
      removerToast(toast);
    }, duracaoMs);

    const btnFechar = toast.querySelector('.valebus-toast__fechar');
    if (btnFechar) {
      btnFechar.addEventListener('click', () => {
        clearTimeout(timer);
        removerToast(toast);
      });
    }

    const btnVerMapa = toast.querySelector('.btn-toast-mapa');
    if (btnVerMapa) {
      btnVerMapa.addEventListener('click', () => {
        clearTimeout(timer);
        removerToast(toast);
        navegarParaSecao('mapa');
        setTimeout(() => {
          focarOnibusPorLinha(linha);
        }, 300);
      });
    }
  }

  function removerToast(toast) {
    if (!toast) return;
    toast.classList.add('valebus-toast--saindo');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }

  /* ──────────────────────────────────────────────────────────
     8.2. ATUALIZAÇÃO DE BADGES E INDICADORES (KPIs)
     ────────────────────────────────────────────────────────── */
  function atualizarBadgesEIndicadores() {
    const total = listaAlertasState.length;
    const naoLidos = listaAlertasState.filter(a => !a.lida).length;
    const ativos = listaAlertasState.filter(a => !a.resolvido).length;
    const atrasados = listaAlertasState.filter(a => !a.resolvido && (a.tipo === 'atencao' || a.tipo === 'critico')).length;
    const resolvidos = listaAlertasState.filter(a => a.resolvido).length;

    // Badge do Sino na TopBar
    if (badgeSino) {
      if (naoLidos > 0) {
        badgeSino.textContent = String(naoLidos);
        badgeSino.style.display = 'inline-flex';
        badgeSino.classList.remove('topbar__badge-sino--vazio');
        if (btnSino) btnSino.setAttribute('aria-label', `Ver ${naoLidos} notificação(ões) não lida(s)`);
      } else {
        badgeSino.textContent = '0';
        badgeSino.style.display = 'none';
        badgeSino.classList.add('topbar__badge-sino--vazio');
        if (btnSino) btnSino.setAttribute('aria-label', 'Nenhuma notificação nova');
      }
    }

    // Badge na Sidebar (Item Alertas)
    const sidebarBadgeAlertas = document.querySelector('.sidebar__nav .nav__item[data-secao="alertas"] .nav__badge');
    if (sidebarBadgeAlertas) {
      sidebarBadgeAlertas.textContent = String(naoLidos || ativos);
      sidebarBadgeAlertas.style.display = (naoLidos || ativos) > 0 ? 'inline-flex' : 'none';
    }

    // Dropdown Badges
    if (dropdownBadgeNaolidas) {
      dropdownBadgeNaolidas.textContent = naoLidos > 0 ? `${naoLidos} nova${naoLidos > 1 ? 's' : ''}` : '0 novas';
      dropdownBadgeNaolidas.style.display = naoLidos > 0 ? 'inline-block' : 'none';
    }
    if (countTodos) countTodos.textContent = String(total);
    if (countNaolidos) countNaolidos.textContent = String(naoLidos);
    if (feedCountTodos) feedCountTodos.textContent = String(total);

    // KPIs da Tela view-alertas
    if (kpiAlertasAtivos) kpiAlertasAtivos.textContent = String(ativos);
    if (kpiLinhasAtrasadas) kpiLinhasAtrasadas.textContent = String(atrasados);
    if (kpiAlertasResolvidos) kpiAlertasResolvidos.textContent = String(resolvidos);
  }

  /* ──────────────────────────────────────────────────────────
     8.3. RENDERIZAÇÃO DO DROPDOWN DO SINO
     ────────────────────────────────────────────────────────── */
  function renderizarDropdownNotificacoes() {
    if (!listaDropdown) return;

    let filtrados = listaAlertasState;
    if (filtroAtivoDropdown === 'nao_lidos') {
      filtrados = listaAlertasState.filter(a => !a.lida);
    } else if (filtroAtivoDropdown === 'atencao') {
      filtrados = listaAlertasState.filter(a => a.tipo === 'atencao' || a.tipo === 'critico');
    }

    if (filtrados.length === 0) {
      listaDropdown.innerHTML = `
        <div class="notif-vazio-estado">
          <div class="notif-vazio-estado__icone">🔔</div>
          <span class="notif-vazio-estado__titulo">Nenhuma notificação encontrada</span>
          <span class="notif-vazio-estado__desc">Tudo calmo na operação de transporte de Santa Rita.</span>
        </div>
      `;
      return;
    }

    listaDropdown.innerHTML = filtrados.map(alerta => {
      const corLinha = obterCorLinha(alerta.linha);
      const nomeLinha = obterNomeLinha(alerta.linha);
      const icone = ICONES_TIPO[alerta.tipo] || '📢';
      const temOnibusNoMapa = alerta.linha && alerta.linha !== 'todas' && LINHAS[alerta.linha];

      return `
        <article class="notif-item ${!alerta.lida ? 'notif-item--nao-lida' : ''}" data-id="${alerta.id}">
          <div class="notif-item__icone-wrap notif-item__icone-wrap--${alerta.tipo}" aria-hidden="true">${icone}</div>
          <div class="notif-item__corpo">
            <div class="notif-item__topo">
              <span class="notif-item__tag-linha" style="background-color: ${corLinha}; color: #ffffff;">
                ${nomeLinha}
              </span>
              <time class="notif-item__tempo">${alerta.horario}</time>
            </div>
            <h5 class="notif-item__titulo">${alerta.titulo}</h5>
            <p class="notif-item__msg">${alerta.mensagem}</p>
            <div class="notif-item__acoes">
              ${temOnibusNoMapa ? `
                <button type="button" class="btn-notif-mapa" data-linha="${alerta.linha}">
                  Ver Ônibus no Mapa →
                </button>
              ` : ''}
              ${!alerta.lida ? `
                <button type="button" class="btn-notif-lida" data-id="${alerta.id}">
                  Marcar como lida
                </button>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Eventos dentro dos itens do dropdown
    listaDropdown.querySelectorAll('.btn-notif-mapa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const linha = btn.getAttribute('data-linha');
        fecharDropdownNotificacoes();
        navegarParaSecao('mapa');
        setTimeout(() => {
          focarOnibusPorLinha(linha);
        }, 300);
      });
    });

    listaDropdown.querySelectorAll('.btn-notif-lida').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        marcarAlertaComoLido(id);
      });
    });

    listaDropdown.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        marcarAlertaComoLido(id);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     8.4. RENDERIZAÇÃO DO FEED COMPLETO NA TELA VIEW-ALERTAS
     ────────────────────────────────────────────────────────── */
  function renderizarFeedAlertas() {
    if (!feedAlertasContainer) return;

    let lista = listaAlertasState;

    // Filtro por categoria
    if (filtroAtivoFeed === 'atencao') {
      lista = lista.filter(a => a.tipo === 'atencao' || a.tipo === 'critico');
    } else if (filtroAtivoFeed === 'info') {
      lista = lista.filter(a => a.tipo === 'info');
    } else if (filtroAtivoFeed === 'sucesso') {
      lista = lista.filter(a => a.tipo === 'sucesso' || a.resolvido);
    }

    // Busca textual
    if (termoBuscaFeed) {
      const termo = normalizarTexto(termoBuscaFeed);
      lista = lista.filter(a => {
        const tTitulo = normalizarTexto(a.titulo);
        const tMsg = normalizarTexto(a.mensagem);
        const tLinha = normalizarTexto(obterNomeLinha(a.linha));
        return tTitulo.includes(termo) || tMsg.includes(termo) || tLinha.includes(termo);
      });
    }

    if (lista.length === 0) {
      feedAlertasContainer.innerHTML = `
        <div class="notif-vazio-estado" style="background: var(--fundo-card); border-radius: 14px; border: 1.5px solid var(--borda-cor); padding: 36px 20px; text-align: center;">
          <div class="notif-vazio-estado__icone" style="font-size: 32px; margin-bottom: 8px;">✨</div>
          <span class="notif-vazio-estado__titulo" style="font-size: 15px; font-weight: 700; color: var(--texto-principal); display: block; margin-bottom: 4px;">Nenhum aviso encontrado</span>
          <span class="notif-vazio-estado__desc" style="font-size: 13px; color: var(--texto-secundario);">Todas as linhas de Santa Rita do Sapucaí estão operando normalmente ou nenhum registro corresponde à sua busca.</span>
        </div>
      `;
      return;
    }

    feedAlertasContainer.innerHTML = lista.map(alerta => {
      const corLinha = obterCorLinha(alerta.linha);
      const nomeLinha = obterNomeLinha(alerta.linha);
      const temOnibusNoMapa = alerta.linha && alerta.linha !== 'todas' && LINHAS[alerta.linha];
      const isResolvido = alerta.resolvido || alerta.tipo === 'sucesso';

      let statusTexto = '📢 Aviso';
      if (isResolvido) {
        statusTexto = '✅ Normalizado';
      } else if (alerta.tipo === 'atencao' || alerta.tipo === 'critico') {
        statusTexto = '⚠️ Atraso / Trânsito';
      }

      return `
        <article class="alerta-card-principal alerta-card-principal--${alerta.tipo}" data-id="${alerta.id}">
          <div class="alerta-card-principal__topo">
            <div class="alerta-card-principal__tags">
              <span class="alerta-card-principal__linha-tag" style="background-color: ${corLinha};">
                🚍 ${nomeLinha}
              </span>
              <span class="alerta-card-principal__status-tag ${isResolvido ? 'alerta-card-principal__status-tag--resolvido' : 'alerta-card-principal__status-tag--ativo'}">
                ${statusTexto}
              </span>
            </div>
            <time class="alerta-card-principal__hora">${alerta.horario}</time>
          </div>

          <div class="alerta-card-principal__corpo">
            <h4 class="alerta-card-principal__titulo">${alerta.titulo}</h4>
            <p class="alerta-card-principal__desc">${alerta.mensagem}</p>
          </div>

          <div class="alerta-card-principal__rodape">
            ${temOnibusNoMapa ? `
              <button type="button" class="btn-alerta-acao btn-alerta-acao--mapa btn-feed-mapa" data-linha="${alerta.linha}" title="Localizar linha no mapa ao vivo">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icone-mapa"/></svg>
                <span>Ver no Mapa</span>
              </button>
            ` : '<span></span>'}

            <div class="alerta-card-principal__acoes">
              ${!isResolvido ? `
                <button type="button" class="btn-alerta-acao btn-alerta-acao--resolver btn-feed-resolver" data-id="${alerta.id}" title="Marcar como normalizada">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icone-check"/></svg>
                  <span>Normalizar</span>
                </button>
              ` : ''}
              <button type="button" class="btn-alerta-acao btn-alerta-acao--remover btn-feed-remover" data-id="${alerta.id}" title="Excluir alerta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icone-lixeira"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Eventos do feed
    feedAlertasContainer.querySelectorAll('.btn-feed-mapa').forEach(btn => {
      btn.addEventListener('click', () => {
        const linha = btn.getAttribute('data-linha');
        navegarParaSecao('mapa');
        setTimeout(() => {
          focarOnibusPorLinha(linha);
        }, 300);
      });
    });

    feedAlertasContainer.querySelectorAll('.btn-feed-resolver').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        resolverAlerta(id);
      });
    });

    feedAlertasContainer.querySelectorAll('.btn-feed-remover').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        removerAlerta(id);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     8.5. MUTAÇÕES DE ESTADO DOS ALERTAS
     ────────────────────────────────────────────────────────── */
  function marcarAlertaComoLido(id) {
    const item = listaAlertasState.find(a => a.id === id);
    if (item && !item.lida) {
      item.lida = true;
      salvarAlertas();
      atualizarBadgesEIndicadores();
      renderizarDropdownNotificacoes();
    }
  }

  function marcarTodasComoLidas() {
    listaAlertasState.forEach(a => { a.lida = true; });
    salvarAlertas();
    atualizarBadgesEIndicadores();
    renderizarDropdownNotificacoes();
    exibirToast({
      titulo: 'Notificações Atualizadas',
      mensagem: 'Todas as notificações foram marcadas como lidas.',
      tipo: 'sucesso',
      duracaoMs: 3000
    });
  }

  function limparNotificacoesConcluidas() {
    const antes = listaAlertasState.length;
    listaAlertasState = listaAlertasState.filter(a => !a.resolvido);
    salvarAlertas();
    atualizarBadgesEIndicadores();
    renderizarDropdownNotificacoes();
    renderizarFeedAlertas();

    const removidas = antes - listaAlertasState.length;
    if (removidas > 0) {
      exibirToast({
        titulo: 'Limpeza Concluída',
        mensagem: `${removidas} ocorrência(s) normalizada(s) removida(s) da visualização.`,
        tipo: 'info',
        duracaoMs: 3500
      });
    }
  }

  function resolverAlerta(id) {
    const item = listaAlertasState.find(a => a.id === id);
    if (item) {
      item.resolvido = true;
      item.tipo = 'sucesso';
      item.lida = true;
      salvarAlertas();
      atualizarBadgesEIndicadores();
      renderizarDropdownNotificacoes();
      renderizarFeedAlertas();

      exibirToast({
        titulo: 'Ocorrência Normalizada',
        mensagem: `Alerta "${item.titulo}" resolvido e rota restabelecida.`,
        tipo: 'sucesso',
        linha: item.linha,
        duracaoMs: 4500
      });
    }
  }

  function removerAlerta(id) {
    listaAlertasState = listaAlertasState.filter(a => a.id !== id);
    salvarAlertas();
    atualizarBadgesEIndicadores();
    renderizarDropdownNotificacoes();
    renderizarFeedAlertas();
  }

  function adicionarNovoAlerta({ linha, tipo, titulo, mensagem, dispararToast = true }) {
    const agora = new Date();
    const h = String(agora.getHours()).padStart(2, '0');
    const m = String(agora.getMinutes()).padStart(2, '0');

    const novo = {
      id: 'alt-' + Date.now(),
      linha,
      tipo,
      titulo,
      mensagem,
      origem: 'Operador CCO (Sessão Atual)',
      horario: `Hoje às ${h}:${m}`,
      timestamp: Date.now(),
      lida: false,
      resolvido: tipo === 'sucesso'
    };

    listaAlertasState.unshift(novo);
    salvarAlertas();
    atualizarBadgesEIndicadores();
    renderizarDropdownNotificacoes();
    renderizarFeedAlertas();

    if (dispararToast) {
      exibirToast({
        titulo: `[${obterNomeLinha(linha)}] ${titulo}`,
        mensagem: mensagem,
        tipo: tipo,
        linha: linha,
        duracaoMs: 6000
      });
    }
  }

  /* ──────────────────────────────────────────────────────────
     8.6. EVENT LISTENERS DO DROPDOWN E MODAIS
     ────────────────────────────────────────────────────────── */
  function abrirDropdownNotificacoes() {
    if (!dropdownNotificacoes || !btnSino) return;
    fecharDropdownUsuario();
    renderizarDropdownNotificacoes();
    dropdownNotificacoes.classList.add('notificacoes-dropdown--aberto');
    dropdownNotificacoes.setAttribute('aria-hidden', 'false');
    btnSino.setAttribute('aria-expanded', 'true');
  }

  function fecharDropdownNotificacoes() {
    if (!dropdownNotificacoes || !btnSino) return;
    dropdownNotificacoes.classList.remove('notificacoes-dropdown--aberto');
    dropdownNotificacoes.setAttribute('aria-hidden', 'true');
    btnSino.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdownNotificacoes(e) {
    if (e) e.stopPropagation();
    const aberto = dropdownNotificacoes && dropdownNotificacoes.classList.contains('notificacoes-dropdown--aberto');
    aberto ? fecharDropdownNotificacoes() : abrirDropdownNotificacoes();
  }

  if (btnSino) {
    btnSino.addEventListener('click', toggleDropdownNotificacoes);
  }

  if (btnMarcarTodasLidas) {
    btnMarcarTodasLidas.addEventListener('click', (e) => {
      e.stopPropagation();
      marcarTodasComoLidas();
    });
  }

  if (btnLimparNotifs) {
    btnLimparNotifs.addEventListener('click', (e) => {
      e.stopPropagation();
      limparNotificacoesConcluidas();
    });
  }

  if (btnDropdownIrAlertas) {
    btnDropdownIrAlertas.addEventListener('click', () => {
      fecharDropdownNotificacoes();
      navegarParaSecao('alertas');
    });
  }

  filtrosDropdown.forEach(btn => {
    btn.addEventListener('click', () => {
      filtrosDropdown.forEach(b => {
        b.classList.remove('notif-filtro-btn--ativo');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('notif-filtro-btn--ativo');
      btn.setAttribute('aria-selected', 'true');
      filtroAtivoDropdown = btn.getAttribute('data-filtro') || 'todos';
      renderizarDropdownNotificacoes();
    });
  });

  // Filtros e busca no feed principal
  if (inputBuscaAlertas) {
    inputBuscaAlertas.addEventListener('input', (e) => {
      termoBuscaFeed = e.target.value;
      renderizarFeedAlertas();
    });
  }

  chipsFiltroFeed.forEach(chip => {
    chip.addEventListener('click', () => {
      chipsFiltroFeed.forEach(c => {
        c.classList.remove('alerta-filtro-chip--ativo');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('alerta-filtro-chip--ativo');
      chip.setAttribute('aria-selected', 'true');
      filtroAtivoFeed = chip.getAttribute('data-filtro') || 'todos';
      renderizarFeedAlertas();
    });
  });

  // Modal de Novo Alerta
  if (btnAbrirModalNovoAlerta) {
    btnAbrirModalNovoAlerta.addEventListener('click', () => {
      abrirModalDash(modalNovoAlerta);
    });
  }

  if (btnFecharModalAlerta) btnFecharModalAlerta.addEventListener('click', () => fecharModalDash(modalNovoAlerta));
  if (btnCancelarAlerta) btnCancelarAlerta.addEventListener('click', () => fecharModalDash(modalNovoAlerta));

  if (formNovoAlerta) {
    formNovoAlerta.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputTitulo = document.getElementById('alerta-input-titulo');
      const inputDesc = document.getElementById('alerta-input-desc');
      const linha = document.getElementById('alerta-input-linha')?.value;
      const tipo = document.getElementById('alerta-input-tipo')?.value;
      const titulo = inputTitulo?.value.trim();
      const desc = inputDesc?.value.trim();
      const dispararToast = document.getElementById('alerta-input-toast')?.checked;

      // Validação simples de campos obrigatórios
      let temErro = false;
      if (!titulo) {
        inputTitulo?.classList.add('is-invalid', 'campo-shake');
        setTimeout(() => inputTitulo?.classList.remove('campo-shake'), 350);
        temErro = true;
      } else {
        inputTitulo?.classList.remove('is-invalid');
      }

      if (!desc) {
        inputDesc?.classList.add('is-invalid', 'campo-shake');
        setTimeout(() => inputDesc?.classList.remove('campo-shake'), 350);
        temErro = true;
      } else {
        inputDesc?.classList.remove('is-invalid');
      }

      if (temErro) {
        exibirToast({
          titulo: 'Campos Obrigatórios',
          mensagem: 'Preencha o título e o detalhamento da ocorrência.',
          tipo: 'alerta',
          duracaoMs: 4000
        });
        return;
      }

      const btnSubmit = formNovoAlerta.querySelector('button[type="submit"]');
      if (btnSubmit) {
        btnSubmit.classList.add('btn-loading');
        btnSubmit.disabled = true;
      }

      setTimeout(() => {
        adicionarNovoAlerta({
          linha,
          tipo,
          titulo,
          mensagem: desc,
          dispararToast: false
        });

        if (btnSubmit) {
          btnSubmit.classList.remove('btn-loading');
          btnSubmit.disabled = false;
        }

        exibirToast({
          titulo: 'Ocorrência registrada com sucesso!',
          mensagem: `Chamado para ${obterNomeLinha(linha)} cadastrado no CCO.`,
          tipo: 'sucesso',
          linha: linha,
          duracaoMs: 5000
        });

        formNovoAlerta.reset();
        fecharModalDash(modalNovoAlerta);
      }, 350);
    });
  }

  // Inicialização do estado de alertas na carga
  atualizarBadgesEIndicadores();
  renderizarDropdownNotificacoes();
  renderizarFeedAlertas();


  /* ──────────────────────────────────────────────────────────
     8.7. DROPDOWN DO USUÁRIO & MODAIS DE PERFIL E CONFIG
     ────────────────────────────────────────────────────────── */
  const btnUsuario = document.getElementById('btn-usuario-menu') || document.querySelector('.topbar__usuario');
  const dropdownUsuario = document.getElementById('dropdown-usuario');
  const usuarioWrapper = document.getElementById('topbar-usuario-wrapper') || document.querySelector('.topbar__usuario-wrapper');

  function abrirDropdownUsuario() {
    if (!dropdownUsuario || !btnUsuario) return;
    fecharDropdownNotificacoes();
    dropdownUsuario.classList.add('usuario-dropdown--aberto');
    dropdownUsuario.setAttribute('aria-hidden', 'false');
    btnUsuario.setAttribute('aria-expanded', 'true');
  }

  function fecharDropdownUsuario() {
    if (!dropdownUsuario || !btnUsuario) return;
    dropdownUsuario.classList.remove('usuario-dropdown--aberto');
    dropdownUsuario.setAttribute('aria-hidden', 'true');
    btnUsuario.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdownUsuario(e) {
    if (e) {
      e.stopPropagation();
    }
    const aberto = dropdownUsuario && dropdownUsuario.classList.contains('usuario-dropdown--aberto');
    if (aberto) {
      fecharDropdownUsuario();
    } else {
      abrirDropdownUsuario();
    }
  }

  if (btnUsuario) {
    btnUsuario.addEventListener('click', toggleDropdownUsuario);
  }

  // Sincroniza dados do usuário logado na Topbar e Dropdown
  function sincronizarUsuarioLogado() {
    try {
      const user = (window.ValeBusAPI && typeof window.ValeBusAPI.obterSessao === 'function')
        ? window.ValeBusAPI.obterSessao()
        : (function () {
            const raw = localStorage.getItem('valebus_usuario');
            return raw ? JSON.parse(raw) : null;
          })();

      if (!user || (!user.nome && !user.logado)) return;

      const nomeEl = document.getElementById('topbar-usuario-nome');
      const cargoEl = document.getElementById('topbar-usuario-cargo');
      const avatarEl = document.getElementById('topbar-usuario-avatar');
      const dropNome = document.getElementById('dropdown-usuario-nome');
      const dropEmail = document.getElementById('dropdown-usuario-email');
      const dropCargo = document.getElementById('dropdown-usuario-cargo');
      const dropAvatar = document.getElementById('dropdown-usuario-avatar');
      const btnGestor = document.getElementById('dropdown-btn-gestor');

      const iniciais = (user.nome || 'VB')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');

      if (nomeEl && user.nome) nomeEl.textContent = user.nome;
      if (cargoEl && user.cargo) cargoEl.textContent = user.cargo;
      if (avatarEl && iniciais) avatarEl.textContent = iniciais;

      if (dropNome && user.nome) dropNome.textContent = user.nome;
      if (dropEmail && user.email) dropEmail.textContent = user.email;
      if (dropCargo && user.cargo) dropCargo.textContent = user.cargo;
      if (dropAvatar && iniciais) dropAvatar.textContent = iniciais;

      // Se for o gestor valebussrs@gmail.com ou perfil gestor, exibe o atalho CCO no dropdown
      const ehGestor = (user.email && user.email.toLowerCase().trim() === 'valebussrs@gmail.com') || user.perfil === 'gestor';
      if (btnGestor && ehGestor) {
        btnGestor.style.display = 'flex';
      }
    } catch (e) {
      console.warn('Erro ao carregar usuário logado:', e);
    }
  }
  sincronizarUsuarioLogado();

  // Ações de Logout unificadas via ValeBusAPI
  document.querySelectorAll('#dropdown-btn-sair, .nav__item--sair, .btn-modal--perigo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.ValeBusAPI && typeof window.ValeBusAPI.encerrarSessao === 'function') {
        window.ValeBusAPI.encerrarSessao('login.html');
      } else {
        localStorage.removeItem('valebus_usuario');
        window.location.href = 'login.html';
      }
    });
  });

  // Fecha dropdowns se clicar fora
  document.addEventListener('click', (e) => {
    if (usuarioWrapper && !usuarioWrapper.contains(e.target)) {
      fecharDropdownUsuario();
    }
    if (notificacoesWrapper && !notificacoesWrapper.contains(e.target)) {
      fecharDropdownNotificacoes();
    }
  });

  // Modais de Perfil e Configurações
  const modalPerfil = document.getElementById('modal-perfil');
  const modalConfig = document.getElementById('modal-configuracoes');
  const btnDropdownPerfil = document.getElementById('dropdown-btn-perfil');
  const btnDropdownConfig = document.getElementById('dropdown-btn-config');
  const btnFecharPerfil = document.getElementById('btn-fechar-modal-perfil');
  const btnFecharPerfilAcao = document.getElementById('btn-fechar-perfil-acao');
  const btnFecharConfig = document.getElementById('btn-fechar-modal-config');
  const btnSalvarConfig = document.getElementById('btn-salvar-config');
  const switchTema = document.getElementById('cfg-switch-tema');
  const switchAnim = document.getElementById('cfg-switch-anim');

  function abrirModalDash(modal) {
    if (!modal) return;
    fecharDropdownUsuario();
    fecharDropdownNotificacoes();
    modal.classList.add('ativo');
    modal.setAttribute('aria-hidden', 'false');
  }

  function fecharModalDash(modal) {
    if (!modal) return;
    modal.classList.remove('ativo');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (btnDropdownPerfil) {
    btnDropdownPerfil.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalDash(modalPerfil);
    });
  }

  if (btnDropdownConfig) {
    btnDropdownConfig.addEventListener('click', (e) => {
      e.preventDefault();
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (switchTema) {
        switchTema.classList.toggle('config-switch--ativo', isDark);
        switchTema.setAttribute('aria-checked', String(isDark));
      }
      abrirModalDash(modalConfig);
    });
  }

  if (btnFecharPerfil) btnFecharPerfil.addEventListener('click', () => fecharModalDash(modalPerfil));
  if (btnFecharPerfilAcao) btnFecharPerfilAcao.addEventListener('click', () => fecharModalDash(modalPerfil));
  if (btnFecharConfig) btnFecharConfig.addEventListener('click', () => fecharModalDash(modalConfig));
  if (btnSalvarConfig) btnSalvarConfig.addEventListener('click', () => fecharModalDash(modalConfig));

  [modalPerfil, modalConfig, modalNovoAlerta].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) fecharModalDash(m);
      });
    }
  });

  if (switchTema) {
    switchTema.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const novoTema = isDark ? 'claro' : 'escuro';
      definirTema(novoTema, true);
      switchTema.classList.toggle('config-switch--ativo', !isDark);
      switchTema.setAttribute('aria-checked', String(!isDark));
    });
  }

  if (switchAnim) {
    switchAnim.addEventListener('click', () => {
      const ativo = switchAnim.classList.toggle('config-switch--ativo');
      switchAnim.setAttribute('aria-checked', String(ativo));
    });
  }

  // Gerenciamento Centralizado de Seções / Views
  const secoesConfig = {
    mapa: {
      titulo: 'Monitoramento de Frota em Tempo Real',
      subtitulo: 'Santa Rita do Sapucaí — Simulação GPS Telemetria'
    },
    buscar: {
      titulo: 'Buscar Linhas e Destinos',
      subtitulo: 'Pesquise por bairro, pontos turísticos, faculdades e conexões'
    },
    horarios: {
      titulo: 'Quadro Geral de Horários',
      subtitulo: 'Itinerários e intervalos programados da frota municipal'
    },
    alertas: {
      titulo: 'Central de Alertas Operacionais',
      subtitulo: 'Avisos de tráfego, manutenções e pontualidade em tempo real'
    },
    sobre: {
      titulo: 'Sobre o Projeto ValeBus',
      subtitulo: 'Inovação e mobilidade inteligente para Santa Rita do Sapucaí'
    }
  };

  function navegarParaSecao(secao) {
    // 1. Atualiza botões do menu lateral
    itensNav.forEach(i => {
      const isAlvo = i.getAttribute('data-secao') === secao;
      i.classList.toggle('nav__item--ativo', isAlvo);
      if (isAlvo) {
        i.setAttribute('aria-current', 'page');
      } else {
        i.removeAttribute('aria-current');
      }
    });

    // 2. Atualiza títulos no cabeçalho da página
    const cfg = secoesConfig[secao] || secoesConfig.mapa;
    const elTitulo = document.getElementById('main-titulo');
    const elSubtitulo = document.getElementById('main-subtitulo');
    if (elTitulo) elTitulo.textContent = cfg.titulo;
    if (elSubtitulo) elSubtitulo.textContent = cfg.subtitulo;

    // 3. Alterna a exibição das views
    const todasViews = document.querySelectorAll('.secao-view');
    todasViews.forEach(v => {
      v.style.display = 'none';
      v.classList.remove('secao-view--ativa');
    });

    const viewAlvo = document.getElementById(`view-${secao}`);
    if (viewAlvo) {
      viewAlvo.style.display = 'flex';
      viewAlvo.classList.add('secao-view--ativa');
    }

    // 4. Se a view selecionada for o mapa, revalida o tamanho do Leaflet
    if (secao === 'mapa') {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    if (window.innerWidth < 1100) {
      fecharSidebar();
    }
  }

  // Links do Menu Lateral (Sidebar)
  const itensNav = document.querySelectorAll('.sidebar__nav .nav__item');
  itensNav.forEach(item => {
    item.addEventListener('click', () => {
      const secao = item.getAttribute('data-secao');
      if (secao) {
        navegarParaSecao(secao);
      }
    });
  });


  /* ──────────────────────────────────────────────────────────
     8.1. SISTEMA DE BUSCA DE DESTINO E FILTRO POR NOME DA LINHA
     ────────────────────────────────────────────────────────── */
  const inputBusca = document.getElementById('input-busca-linha');
  const btnLimparBusca = document.getElementById('btn-limpar-busca');
  const chipsFiltro = document.querySelectorAll('#chips-destinos .chip-filtro');
  const cardsLinhasBusca = document.querySelectorAll('#grade-linhas-busca .linha-card');
  const contadorResultado = document.getElementById('busca-contador-resultado');

  function normalizarTexto(txt) {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function executarBuscaDestino(termo) {
    const termoNorm = normalizarTexto(termo);
    let visiveis = 0;

    if (btnLimparBusca) {
      btnLimparBusca.style.display = termoNorm ? 'flex' : 'none';
    }

    cardsLinhasBusca.forEach(card => {
      const dadosBusca = normalizarTexto(card.getAttribute('data-busca') || '');
      const textoCard = normalizarTexto(card.innerText || '');
      const matches = !termoNorm || dadosBusca.includes(termoNorm) || textoCard.includes(termoNorm);

      if (matches) {
        card.style.display = 'flex';
        visiveis++;
      } else {
        card.style.display = 'none';
      }
    });

    if (contadorResultado) {
      if (!termoNorm) {
        contadorResultado.textContent = `Exibindo todas as ${cardsLinhasBusca.length} linhas disponíveis em Santa Rita do Sapucaí`;
      } else if (visiveis === 0) {
        contadorResultado.textContent = `Nenhuma linha encontrada para "${termo}". Tente outro termo ou atalho.`;
      } else {
        contadorResultado.textContent = `Exibindo ${visiveis} linha(s) encontrada(s) para "${termo}"`;
      }
    }
  }

  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      // Remove ativação de chips ao digitar livremente
      chipsFiltro.forEach(c => c.classList.remove('chip-filtro--ativo'));
      executarBuscaDestino(e.target.value);
    });
  }

  if (btnLimparBusca) {
    btnLimparBusca.addEventListener('click', () => {
      if (inputBusca) {
        inputBusca.value = '';
        inputBusca.focus();
      }
      chipsFiltro.forEach((c, idx) => {
        c.classList.toggle('chip-filtro--ativo', idx === 0);
      });
      executarBuscaDestino('');
    });
  }

  chipsFiltro.forEach(chip => {
    chip.addEventListener('click', () => {
      chipsFiltro.forEach(c => c.classList.remove('chip-filtro--ativo'));
      chip.classList.add('chip-filtro--ativo');

      const filtro = chip.getAttribute('data-filtro') || '';
      if (inputBusca) {
        inputBusca.value = filtro;
      }
      executarBuscaDestino(filtro);
    });
  });

  // Botões "Ver no Mapa" dentro da busca e horários
  const botoesVerLinhaMapa = document.querySelectorAll('.btn-ver-linha-mapa');
  botoesVerLinhaMapa.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chaveLinha = btn.getAttribute('data-linha');
      if (chaveLinha) {
        // 1. Muda para a visualização do mapa
        navegarParaSecao('mapa');

        // 2. Aciona o filtro correspondente na legenda do mapa
        const btnFiltroLegenda = document.querySelector(`#filtros-legenda [data-linha="${chaveLinha}"]`);
        if (btnFiltroLegenda) {
          btnFiltroLegenda.click();
        }

        // 3. Foca o mapa no ônibus da linha com animação suave e abre o popup
        setTimeout(() => {
          focarOnibusPorLinha(chaveLinha);
        }, 350);
      }
    });
  });


  /* ──────────────────────────────────────────────────────────
     9. GERENCIAMENTO DAS GAVETAS (SIDEBAR E PAINEL MOBILE)
     ────────────────────────────────────────────────────────── */
  const sidebar      = document.getElementById('sidebar');
  const painel       = document.getElementById('painel-lateral');
  const overlay      = document.getElementById('overlay');
  const btnMenu      = document.getElementById('btn-menu');
  const btnPainel    = document.getElementById('btn-painel-flutuante');
  const btnFecharP   = document.getElementById('btn-fechar-painel');

  function atualizarMapaAposTransicao() {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }

  function abrirSidebar() {
    if (sidebar) sidebar.classList.add('aberta');
    if (overlay) overlay.classList.add('ativo');
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'true');
    fecharPainel();
    atualizarMapaAposTransicao();
  }

  function fecharSidebar() {
    if (sidebar) sidebar.classList.remove('aberta');
    if (!painel || !painel.classList.contains('aberto')) {
      if (overlay) overlay.classList.remove('ativo');
    }
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    atualizarMapaAposTransicao();
  }

  function abrirPainel() {
    if (painel) painel.classList.add('aberto');
    if (overlay) overlay.classList.add('ativo');
    fecharSidebar();
    atualizarMapaAposTransicao();
  }

  function fecharPainel() {
    if (painel) painel.classList.remove('aberto');
    if (!sidebar || !sidebar.classList.contains('aberta')) {
      if (overlay) overlay.classList.remove('ativo');
    }
    atualizarMapaAposTransicao();
  }

  // Event Listeners das Gavetas
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      const aberta = sidebar && sidebar.classList.contains('aberta');
      aberta ? fecharSidebar() : abrirSidebar();
    });
  }

  if (btnPainel) btnPainel.addEventListener('click', abrirPainel);
  if (btnFecharP) btnFecharP.addEventListener('click', fecharPainel);

  // Manipulação de gestos de toque no Bottom Sheet para uso com uma mão
  const handleMobile = document.querySelector('.painel__handle-mobile');
  if (handleMobile) {
    handleMobile.addEventListener('click', () => {
      if (window.innerWidth < 1100) {
        fecharPainel();
      }
    });
  }

  if (painel) {
    let touchStartY = 0;
    let touchMoveY = 0;

    painel.addEventListener('touchstart', (e) => {
      // Inicia rastreio apenas se o painel estiver no topo do scroll
      if (painel.scrollTop <= 0) {
        touchStartY = e.touches[0].clientY;
      } else {
        touchStartY = 0;
      }
    }, { passive: true });

    painel.addEventListener('touchmove', (e) => {
      if (!touchStartY) return;
      touchMoveY = e.touches[0].clientY;
      const diffY = touchMoveY - touchStartY;
      if (diffY > 0 && window.innerWidth < 768) {
        painel.style.transform = `translateY(${Math.min(diffY, 180)}px)`;
      }
    }, { passive: true });

    painel.addEventListener('touchend', () => {
      if (!touchStartY || !touchMoveY) return;
      const diffY = touchMoveY - touchStartY;
      painel.style.transform = '';
      if (diffY > 70 && window.innerWidth < 768) {
        fecharPainel();
      }
      touchStartY = 0;
      touchMoveY = 0;
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      fecharSidebar();
      fecharPainel();
    });
  }

  // Atalho Tecla ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      fecharSidebar();
      fecharPainel();
      fecharDropdownUsuario();
      fecharDropdownNotificacoes();
      fecharModalDash(modalPerfil);
      fecharModalDash(modalConfig);
      fecharModalDash(modalNovoAlerta);
    }
  });

  // Ajuste do tamanho do Leaflet ao redimensionar a janela
  window.addEventListener('resize', () => {
    map.invalidateSize();
    if (window.innerWidth >= 1100) {
      fecharSidebar();
      fecharPainel();
    }
  });

  // Sincronização em tempo real caso o motorista altere linha/veículo em outra aba
  window.addEventListener('storage', e => {
    if (e.key === 'valebus_linha_motorista_ativa' || e.key === 'valebus_veiculo_motorista_ativo' || e.key === 'valebus_usuario') {
      renderizarMarcadores();
    }
  });

})();
