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
    linhaCodigo: 'Linha 01',
    linhaNome: 'Centro / Bairro Industrial',
    estacao: 'Inatel',
    veiculo: 'Ônibus #02 (Prefixo 102)',
    viagensHoje: 12,
    emRota: false,
    distanciaKm: 3.8,
    tempoMin: 12,
    proximaParada: 'Av. Inatel, Centro'
  };

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
      const salvo = localStorage.getItem('valebus_usuario');
      if (salvo) {
        const u = JSON.parse(salvo);
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
            estadoMotorista.linhaCodigo = u.linha.includes('0') ? u.linha : 'Linha 01';
            estadoMotorista.linhaNome = u.linha;
          }
          if (u.veiculo) estadoMotorista.veiculo = u.veiculo;
        }
      }

      const viagensSalvas = localStorage.getItem('valebus_viagens_hoje');
      if (viagensSalvas) {
        estadoMotorista.viagensHoje = parseInt(viagensSalvas, 10) || 12;
      }
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
    try {
      localStorage.setItem('valebus_tema', tema);
    } catch (e) {
      console.warn(e);
    }
  }

  const temaSalvo = localStorage.getItem('valebus_tema') || 'light';
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
    const btnGestor = document.getElementById('dropdown-motorista-btn-gestor');

    if (topAvatar) topAvatar.textContent = iniciais;
    if (topNome) topNome.textContent = estadoMotorista.nome;
    if (dropAvatar) dropAvatar.textContent = iniciais;
    if (dropNome) dropNome.textContent = estadoMotorista.nome;

    if (estadoMotorista.ehGestor) {
      if (topCargo) topCargo.textContent = 'Gestor CCO (Supervisão)';
      if (dropEmail) dropEmail.textContent = `${estadoMotorista.email} • Matrícula ${estadoMotorista.matricula}`;
      if (dropCargo) dropCargo.textContent = 'Gestor CCO & Frotas Master';
      if (btnGestor) btnGestor.style.display = 'flex';
    }

    // Cockpit Card
    const elNome = document.getElementById('motorista-nome-display');
    const elEstacao = document.getElementById('motorista-estacao-texto');
    const elNumViagens = document.getElementById('motorista-num-viagens');
    const elLinhaDisplay = document.getElementById('motorista-linha-display');
    const elDestinoDisplay = document.getElementById('motorista-destino-display');

    if (elNome) elNome.textContent = estadoMotorista.nome;
    if (elEstacao) elEstacao.textContent = estadoMotorista.estacao;
    if (elNumViagens) elNumViagens.textContent = `${estadoMotorista.viagensHoje} viagens`;
    if (elLinhaDisplay) elLinhaDisplay.textContent = estadoMotorista.linhaCodigo;
    if (elDestinoDisplay) elDestinoDisplay.textContent = estadoMotorista.linhaNome;

    // Métricas do Cockpit
    const elDistancia = document.getElementById('metrica-distancia');
    const elTempo = document.getElementById('metrica-tempo');
    const elParada = document.getElementById('metrica-parada');

    if (elDistancia) elDistancia.textContent = `${estadoMotorista.distanciaKm.toFixed(1)} km`;
    if (elTempo) elTempo.textContent = `${estadoMotorista.tempoMin} min`;
    if (elParada) elParada.textContent = estadoMotorista.proximaParada;

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
  const LINHAS = {
    anchieta: {
      chave: 'anchieta',
      nome: 'Linha Anchieta',
      cor: '#16a34a',
      partida: 'Praça Urbana Carolina | Praça Do Murilo',
      proximaParada: 'Rua José Ribeiro De Barros, 59 | Inatel - Sentido Recanto'
    },
    fernandes: {
      chave: 'fernandes',
      nome: 'Linha Fernandes (Seu Ônibus)',
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
      partida: 'Br-459 Rod. Jk, Km 116 Leste',
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
    { chaveLinha: 'anchieta',               linha: LINHAS.anchieta,               posicao: [-22.2575, -45.6965], velocidade: 28, isMeuOnibus: false },
    { chaveLinha: 'fernandes',              linha: LINHAS.fernandes,              posicao: [-22.2470, -45.7090], velocidade: 32, isMeuOnibus: true },
    { chaveLinha: 'fortaleza',              linha: LINHAS.fortaleza,              posicao: [-22.2445, -45.7060], velocidade: 25, isMeuOnibus: false },
    { chaveLinha: 'industrial',             linha: LINHAS.industrial,             posicao: [-22.2610, -45.7140], velocidade: 35, isMeuOnibus: false },
    { chaveLinha: 'porto_sapucai',          linha: LINHAS.porto_sapucai,          posicao: [-22.2660, -45.6880], velocidade: 30, isMeuOnibus: false },
    { chaveLinha: 'sao_benedito_hora_meia', linha: LINHAS.sao_benedito_hora_meia, posicao: [-22.2510, -45.7010], velocidade: 27, isMeuOnibus: false },
    { chaveLinha: 'sao_benedito_hora',      linha: LINHAS.sao_benedito_hora,      posicao: [-22.2545, -45.7075], velocidade: 29, isMeuOnibus: false }
  ];

  /* ──────────────────────────────────────────────────────────
     5. INICIALIZAÇÃO DO MAPA LEAFLET & MARCADORES INTERATIVOS
     ────────────────────────────────────────────────────────── */
  const mapaEl = document.getElementById('mapa-motorista');
  let map = null;
  let meuOnibusMarker = null;
  const marcadoresMap = new Map();

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

    return L.divIcon({
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

  if (mapaEl) {
    map = L.map('mapa-motorista', {
      zoomControl: true,
      attributionControl: false
    }).setView([-22.2528, -45.7036], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Renderiza marcadores da frota
    FROTA.forEach(bus => {
      const icone = criarIconeBus(bus.linha.cor, bus.isMeuOnibus);
      const conteudoPopup = gerarHtmlPopup(bus);

      const marker = L.marker(bus.posicao, { icon: icone })
        .addTo(map)
        .bindPopup(conteudoPopup);

      if (bus.isMeuOnibus) {
        meuOnibusMarker = marker;
      }

      marcadoresMap.set(bus.chaveLinha, { marker, bus });
    });

    // Simulação contínua de movimentação GPS da frota
    setInterval(() => {
      marcadoresMap.forEach(({ marker, bus }) => {
        const latAtual = marker.getLatLng().lat;
        const lngAtual = marker.getLatLng().lng;

        // Deslocamento simulado
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
     6. RECENTRALIZAR GPS NO MEU ÔNIBUS
     ────────────────────────────────────────────────────────── */
  const btnRecenterGps = document.getElementById('btn-recenter-gps');
  if (btnRecenterGps && map) {
    btnRecenterGps.addEventListener('click', () => {
      if (meuOnibusMarker) {
        if (!map.hasLayer(meuOnibusMarker)) map.addLayer(meuOnibusMarker);
        map.flyTo(meuOnibusMarker.getLatLng(), 16, { animate: true, duration: 1.0 });
        meuOnibusMarker.openPopup();
        mostrarToast('Posição do seu veículo centralizada no mapa.');
      } else {
        map.flyTo([-22.2528, -45.7036], 14, { duration: 0.8 });
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
        if (elTopStatus) elTopStatus.textContent = 'Em Rota • Transmitindo ao CCO';

        mostrarToast('Boa viagem! Rota iniciada e telemetria transmitindo ao CCO.');

        if (meuOnibusMarker && map) {
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
        if (elTopStatus) elTopStatus.textContent = 'Telemetria Online • Santa Rita do Sapucaí';

        if (intervaloContador) clearInterval(intervaloContador);

        estadoMotorista.viagensHoje += 1;
        estadoMotorista.distanciaKm = 3.8;
        estadoMotorista.tempoMin = 12;

        try {
          localStorage.setItem('valebus_viagens_hoje', estadoMotorista.viagensHoje.toString());
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
    btn.addEventListener('click', () => {
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

  // Alternar rotas da escala
  const botoesTrocar = document.querySelectorAll('.rota-card__btn-trocar');
  botoesTrocar.forEach(btn => {
    btn.addEventListener('click', () => {
      const l = btn.getAttribute('data-linha');
      if (l === 'anchieta') {
        estadoMotorista.linhaCodigo = 'Linha Anchieta';
        estadoMotorista.linhaNome = 'Praça Urbana / Recanto';
        estadoMotorista.proximaParada = 'Rua José Ribeiro de Barros';
      } else {
        estadoMotorista.linhaCodigo = 'Linha 01';
        estadoMotorista.linhaNome = 'Centro / Bairro Industrial';
        estadoMotorista.proximaParada = 'Av. Inatel, Centro';
      }
      renderizarDadosMotorista();
      mostrarToast(`Linha atual alterada para: ${estadoMotorista.linhaCodigo}`);
      trocarSecao('cockpit');
    });
  });

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
     9. MODAIS DE SUPORTE E OCORRÊNCIAS
     ────────────────────────────────────────────────────────── */
  const modalProblema = document.getElementById('modal-problema');
  const btnAbrirProblema = document.getElementById('btn-abrir-problema');
  const btnPainelRelatar = document.getElementById('btn-painel-relatar');
  const btnFecharProblema = document.getElementById('btn-fechar-modal-problema');
  const btnCancelarProblema = document.getElementById('btn-cancelar-problema');
  const formProblema = document.getElementById('form-relatar-problema');

  const modalSuporte = document.getElementById('modal-suporte');
  const btnAbrirSuporte = document.getElementById('btn-abrir-suporte');
  const btnPainelSuporte = document.getElementById('btn-painel-suporte');
  const btnFecharSuporte = document.getElementById('btn-fechar-modal-suporte');
  const btnFecharSuporteRodape = document.getElementById('btn-fechar-suporte-rodape');

  function abrirModal(m) {
    fecharTodosDropdowns();
    if (m) {
      m.classList.add('aberto');
      m.setAttribute('aria-hidden', 'false');
    }
  }

  function fecharModal(m) {
    if (m) {
      m.classList.remove('aberto');
      m.setAttribute('aria-hidden', 'true');
    }
  }

  if (btnAbrirProblema) btnAbrirProblema.addEventListener('click', () => abrirModal(modalProblema));
  if (btnPainelRelatar) btnPainelRelatar.addEventListener('click', () => abrirModal(modalProblema));
  if (btnFecharProblema) btnFecharProblema.addEventListener('click', () => fecharModal(modalProblema));
  if (btnCancelarProblema) btnCancelarProblema.addEventListener('click', () => fecharModal(modalProblema));

  if (formProblema) {
    formProblema.addEventListener('submit', (e) => {
      e.preventDefault();
      fecharModal(modalProblema);
      mostrarToast('Alerta transmitido à Central CCO com prioridade!');
    });
  }

  if (btnAbrirSuporte) btnAbrirSuporte.addEventListener('click', () => abrirModal(modalSuporte));
  if (btnPainelSuporte) btnPainelSuporte.addEventListener('click', () => abrirModal(modalSuporte));
  if (btnFecharSuporte) btnFecharSuporte.addEventListener('click', () => fecharModal(modalSuporte));
  if (btnFecharSuporteRodape) btnFecharSuporteRodape.addEventListener('click', () => fecharModal(modalSuporte));

  // Botões de suporte
  const btnCco = document.getElementById('btn-chamar-cco');
  const btnPing = document.getElementById('btn-ping-telemetria');
  const btnMec = document.getElementById('btn-chamar-manutencao');

  if (btnCco) btnCco.addEventListener('click', () => mostrarToast('Chamada VHF solicitada. Sintonizando CCO.'));
  if (btnPing) btnPing.addEventListener('click', () => mostrarToast('Sinal GPS & Validador 100% Estável (22ms).'));
  if (btnMec) btnMec.addEventListener('click', () => mostrarToast('Solicitação de socorro enviada à Garagem.'));

  [modalProblema, modalSuporte].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) fecharModal(m);
      });
    }
  });

  /* ──────────────────────────────────────────────────────────
     10. NOTIFICAÇÕES TOAST
     ────────────────────────────────────────────────────────── */
  const toastContainer = document.getElementById('toast-container');

  function mostrarToast(msg) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'valebus-toast valebus-toast--info';
    toast.innerHTML = `
      <div class="valebus-toast__icone-wrap">🚌</div>
      <div class="valebus-toast__corpo">
        <strong class="valebus-toast__titulo">Terminal do Motorista</strong>
        <span class="valebus-toast__msg">${msg}</span>
      </div>
      <button type="button" class="valebus-toast__fechar" aria-label="Fechar">✕</button>
      <div class="valebus-toast__progresso" style="animation-duration: 3500ms;"></div>
    `;

    toastContainer.appendChild(toast);

    const btnFechar = toast.querySelector('.valebus-toast__fechar');
    const remover = () => {
      toast.classList.add('valebus-toast--saindo');
      setTimeout(() => toast.remove(), 250);
    };

    if (btnFechar) btnFechar.addEventListener('click', remover);
    setTimeout(remover, 3500);
  }

})();
