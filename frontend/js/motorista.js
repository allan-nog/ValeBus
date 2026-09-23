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
    linhaCodigo: 'Linha Anchieta',
    linhaNome: 'Praça Urbana / Recanto',
    estacao: 'Praça Urbana Carolina',
    veiculo: 'Ônibus #02',
    viagensHoje: 12,
    emRota: false,
    distanciaKm: 4.5,
    tempoMin: 15,
    proximaParada: '1. Praça Do Murilo'
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
          if (u.veiculo) estadoMotorista.veiculo = u.veiculo.replace(/\s*\(Prefixo\s*\d+\)/i, '').trim();
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

    // Sincronizar estado visual dos botões da escala
    const btnEscalaIndustrial = document.getElementById('btn-escala-industrial');
    const btnEscalaAnchieta = document.getElementById('btn-escala-anchieta');
    const tagStatusLinha01 = document.getElementById('tag-status-linha01');
    const tagStatusAnchieta = document.getElementById('tag-status-anchieta');
    const cardLinha01 = document.getElementById('card-escala-linha01');
    const cardAnchieta = document.getElementById('card-escala-anchieta');

    const ehAnchieta = estadoMotorista.linhaCodigo && estadoMotorista.linhaCodigo.toLowerCase().includes('anchieta');
    if (ehAnchieta) {
      if (btnEscalaAnchieta) {
        btnEscalaAnchieta.className = 'btn-rota-acao btn-rota-acao--ativo rota-card__btn-trocar';
        btnEscalaAnchieta.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Ativa no Cockpit</span>';
      }
      if (tagStatusAnchieta) {
        tagStatusAnchieta.textContent = 'Ativa no Cockpit';
        tagStatusAnchieta.style.backgroundColor = 'rgba(22, 163, 74, 0.15)';
        tagStatusAnchieta.style.color = '#16a34a';
      }
      if (cardAnchieta) cardAnchieta.style.border = '2px solid #16a34a';

      if (btnEscalaIndustrial) {
        btnEscalaIndustrial.className = 'btn-rota-acao btn-rota-acao--verde rota-card__btn-trocar';
        btnEscalaIndustrial.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Ativar Linha 01</span>';
      }
      if (tagStatusLinha01) {
        tagStatusLinha01.textContent = 'Disponível na Escala';
        tagStatusLinha01.style.backgroundColor = 'rgba(100, 116, 139, 0.12)';
        tagStatusLinha01.style.color = 'var(--texto-secundario)';
      }
      if (cardLinha01) cardLinha01.style.border = '1px solid var(--borda-cor)';
    } else {
      if (btnEscalaIndustrial) {
        btnEscalaIndustrial.className = 'btn-rota-acao btn-rota-acao--ativo rota-card__btn-trocar';
        btnEscalaIndustrial.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Ativa no Cockpit</span>';
      }
      if (tagStatusLinha01) {
        tagStatusLinha01.textContent = 'Em Operação';
        tagStatusLinha01.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
        tagStatusLinha01.style.color = 'var(--cor-marca)';
      }
      if (cardLinha01) cardLinha01.style.border = '2px solid var(--cor-marca)';

      if (btnEscalaAnchieta) {
        btnEscalaAnchieta.className = 'btn-rota-acao btn-rota-acao--verde rota-card__btn-trocar';
        btnEscalaAnchieta.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Ativar Rota Anchieta</span>';
      }
      if (tagStatusAnchieta) {
        tagStatusAnchieta.textContent = '14 Paradas • 4,5 km';
        tagStatusAnchieta.style.backgroundColor = 'rgba(22, 163, 74, 0.15)';
        tagStatusAnchieta.style.color = '#16a34a';
      }
      if (cardAnchieta) cardAnchieta.style.border = '1px solid var(--borda-cor)';
    }

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
    if (elIndicador && window.VALEBUS_PARADAS && window.VALEBUS_PARADAS.paradasPorLinha && window.VALEBUS_PARADAS.paradasPorLinha.anchieta) {
      const total = window.VALEBUS_PARADAS.paradasPorLinha.anchieta.length;
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
    { chaveLinha: 'anchieta',               linha: LINHAS.anchieta,               posicao: [-22.254164, -45.696709], velocidade: 28, isMeuOnibus: true },
    { chaveLinha: 'fernandes',              linha: LINHAS.fernandes,              posicao: [-22.2470, -45.7090], velocidade: 32, isMeuOnibus: false },
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

  // Camadas vetoriais exclusivas da Linha Anchieta
  const camadaTrajetoAnchieta = L.layerGroup();
  const camadaParadasAnchieta = L.layerGroup();
  let rotaAnchietaVisivel = false;
  let paradasAnchietaVisiveis = false;
  let polylineAnchieta = null;
  let waypointAnchietaIndex = 0;

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

  /* ──────────────────────────────────────────────────────────
     5.1. PONTOS DE ÔNIBUS DA LINHA ANCHIETA (14 PARADAS)
     ────────────────────────────────────────────────────────── */
  function criarIconeParadaMotorista(ponto, index, total) {
    const cor = '#16a34a';
    const num = ponto.numero || (index + 1);
    const htmlIcone = `
      <div class="ponto-parada-container motorista-ponto-parada" data-linha="anchieta" data-num="${num}">
        <div class="ponto-parada-pin" style="--cor-ponto: ${cor};">
          <div class="ponto-parada-corpo" style="background-color: ${cor}; border: 2px solid #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
            <span style="font-size: 11px; font-weight: 800; color: #ffffff; line-height: 1; font-family: system-ui, -apple-system, sans-serif;">${num}</span>
          </div>
          <div class="ponto-parada-ponteiro" style="border-top-color: ${cor};"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlIcone,
      className: 'leaflet-ponto-parada-wrapper',
      iconSize: [28, 34],
      iconAnchor: [14, 32],
      popupAnchor: [0, -30]
    });
  }

  function gerarHtmlPopupParadaMotorista(ponto, index, total) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ponto.posicao[0]},${ponto.posicao[1]}`;
    const num = ponto.numero || (index + 1);

    return `
      <div class="popup-ponto popup-ponto--motorista" style="min-width: 240px; padding: 4px;">
        <div class="popup-ponto__topo" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.04em;">
            Parada #${num} de ${total} &bull; Linha Anchieta
          </span>
          <span style="font-size: 10px; font-weight: 700; background: rgba(22, 163, 74, 0.12); color: #16a34a; padding: 2px 7px; border-radius: 999px;">
            ${ponto.sentido || 'Sentido Recanto'}
          </span>
        </div>

        <div class="popup-ponto__corpo">
          <div class="popup-ponto__item" style="margin-bottom: 6px;">
            <span class="popup-ponto__rotulo" style="display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Endereço</span>
            <h4 class="popup-ponto__endereco" style="color: #0f172a; font-size: 12.5px; font-weight: 700; margin: 2px 0 0;">${ponto.endereco}</h4>
          </div>
          <div class="popup-ponto__item" style="margin-top: 4px;">
            <span class="popup-ponto__rotulo" style="display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Ponto de Referência</span>
            <div class="popup-ponto__referencia" style="color: #16a34a; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span>${ponto.referencia}</span>
            </div>
          </div>
        </div>

        <div class="popup-ponto__acoes" style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
          <button type="button" class="btn-definir-parada-alvo" data-indice="${index}" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 7px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);">
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

  function renderizarParadasAnchieta() {
    camadaParadasAnchieta.clearLayers();
    marcadoresParadasAnchieta.length = 0;

    if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.paradasPorLinha || !window.VALEBUS_PARADAS.paradasPorLinha.anchieta) {
      return;
    }

    const paradas = window.VALEBUS_PARADAS.paradasPorLinha.anchieta;

    paradas.forEach((ponto, index) => {
      const icone = criarIconeParadaMotorista(ponto, index, paradas.length);
      const popupHtml = gerarHtmlPopupParadaMotorista(ponto, index, paradas.length);

      const marker = L.marker(ponto.posicao, {
        icon: icone,
        title: `Parada #${ponto.numero || (index + 1)}: ${ponto.referencia}`
      }).bindPopup(popupHtml, { maxWidth: 300, minWidth: 260 });

      marker.bindTooltip(
        `<strong>#${ponto.numero || (index + 1)} &bull; ${ponto.referencia}</strong><br><span style="font-size:11px;color:#cbd5e1;">${ponto.endereco}</span>`,
        { direction: 'top', offset: [0, -28], opacity: 0.95 }
      );

      marcadoresParadasAnchieta.push(marker);
      camadaParadasAnchieta.addLayer(marker);
    });

    if (paradasAnchietaVisiveis && map && !map.hasLayer(camadaParadasAnchieta)) {
      camadaParadasAnchieta.addTo(map);
    }
  }

  /* ──────────────────────────────────────────────────────────
     5.2. TRAÇADO VETORIAL DA ROTA DA LINHA ANCHIETA
     ────────────────────────────────────────────────────────── */
  function renderizarRotaAnchieta() {
    camadaTrajetoAnchieta.clearLayers();
    polylineAnchieta = null;

    if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.obterTrajeto) return;

    const coords = window.VALEBUS_PARADAS.obterTrajeto('anchieta');
    if (!coords || coords.length === 0) return;

    // Halo escuro para legibilidade e contraste
    const polyHalo = L.polyline(coords, {
      color: '#052e16',
      weight: 7.5,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false
    });

    // Linha principal no verde oficial da Linha Anchieta
    polylineAnchieta = L.polyline(coords, {
      color: '#16a34a',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: true
    });

    polylineAnchieta.bindTooltip(
      `<strong>Linha Anchieta &bull; Rota Oficial</strong><br><span style="font-size:11px;color:#cbd5e1;">Itinerário: Praça Urbana Carolina ➔ Recanto (4,5 km &bull; 14 paradas)</span>`,
      { sticky: true, opacity: 0.95 }
    );

    polylineAnchieta.on('mouseover', () => {
      polylineAnchieta.setStyle({ weight: 7, opacity: 1 });
    });
    polylineAnchieta.on('mouseout', () => {
      polylineAnchieta.setStyle({ weight: 5, opacity: 0.95 });
    });

    camadaTrajetoAnchieta.addLayer(polyHalo);
    camadaTrajetoAnchieta.addLayer(polylineAnchieta);

    if (rotaAnchietaVisivel && map && !map.hasLayer(camadaTrajetoAnchieta)) {
      camadaTrajetoAnchieta.addTo(map);
    }
  }

  function enquadrarRotaAnchieta() {
    if (!map) return;
    if (polylineAnchieta) {
      map.fitBounds(polylineAnchieta.getBounds(), { padding: [40, 40], maxZoom: 16 });
      mostrarToast('Rota da Linha Anchieta enquadrada no mapa.');
    } else if (window.VALEBUS_PARADAS) {
      const coords = window.VALEBUS_PARADAS.obterTrajeto('anchieta');
      if (coords && coords.length > 0) {
        map.fitBounds(L.polyline(coords).getBounds(), { padding: [40, 40] });
      }
    }
  }

  function selecionarParadaCockpit(indice, abrirPopupMapa = false) {
    if (!window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.paradasPorLinha || !window.VALEBUS_PARADAS.paradasPorLinha.anchieta) {
      return;
    }
    const paradas = window.VALEBUS_PARADAS.paradasPorLinha.anchieta;
    if (indice < 0) indice = 0;
    if (indice >= paradas.length) indice = paradas.length - 1;

    indiceParadaAtual = indice;
    const ponto = paradas[indiceParadaAtual];
    const num = ponto.numero || (indiceParadaAtual + 1);

    estadoMotorista.proximaParada = `${num}. ${ponto.referencia}`;
    const fracaoRestante = (paradas.length - indiceParadaAtual) / paradas.length;
    estadoMotorista.distanciaKm = parseFloat((4.5 * Math.max(0.1, fracaoRestante)).toFixed(1));
    estadoMotorista.tempoMin = Math.max(1, Math.round(15 * Math.max(0.1, fracaoRestante)));

    renderizarDadosMotorista();

    const elIndicador = document.getElementById('parada-nav-indicador');
    if (elIndicador) {
      elIndicador.textContent = `${num}/${paradas.length}`;
    }

    if (abrirPopupMapa && map && marcadoresParadasAnchieta[indiceParadaAtual]) {
      const marker = marcadoresParadasAnchieta[indiceParadaAtual];
      map.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }

  /* ──────────────────────────────────────────────────────────
     5.3. LISTA EXPANSÍVEL DE ITINERÁRIO (TELA DE ROTAS)
     ────────────────────────────────────────────────────────── */
  function preencherListaParadasItinerario() {
    const listaContainer = document.getElementById('lista-paradas-anchieta-container');
    if (!listaContainer || !window.VALEBUS_PARADAS || !window.VALEBUS_PARADAS.paradasPorLinha || !window.VALEBUS_PARADAS.paradasPorLinha.anchieta) {
      return;
    }

    const paradas = window.VALEBUS_PARADAS.paradasPorLinha.anchieta;
    listaContainer.innerHTML = paradas.map((ponto, i) => {
      const num = ponto.numero || (i + 1);
      return `
        <div class="anchieta-parada-card" data-indice="${i}" title="Clique para ver parada no mapa">
          <span class="anchieta-parada-badge">${num}</span>
          <div class="anchieta-parada-info">
            <div class="anchieta-parada-ref">${ponto.referencia}</div>
            <div class="anchieta-parada-end">${ponto.endereco}</div>
          </div>
          <button type="button" class="anchieta-parada-btn-mapa" aria-label="Localizar no mapa">Ver no Mapa</button>
        </div>
      `;
    }).join('');

    listaContainer.querySelectorAll('.anchieta-parada-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-indice'), 10);
        trocarSecao('cockpit');
        selecionarParadaCockpit(idx, true);
      });
    });
  }

  if (mapaEl) {
    map = L.map('mapa-motorista', {
      zoomControl: true,
      attributionControl: false
    }).setView([-22.2505, -45.7005], 14.5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Renderiza a rota e paradas da Linha Anchieta
    renderizarRotaAnchieta();
    renderizarParadasAnchieta();

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

    // Simulação contínua de movimentação GPS da frota
    setInterval(() => {
      // Se estiver em rota na Linha Anchieta, o veículo do motorista navega fielmente pelos 53 waypoints
      if (meuOnibusMarker && estadoMotorista.emRota && estadoMotorista.linhaCodigo.includes('Anchieta') && window.VALEBUS_PARADAS) {
        const coords = window.VALEBUS_PARADAS.obterTrajeto('anchieta');
        if (coords && coords.length > 0) {
          waypointAnchietaIndex = (waypointAnchietaIndex + 1) % coords.length;
          const novoPonto = coords[waypointAnchietaIndex];
          meuOnibusMarker.setLatLng(novoPonto);

          // Checa proximidade com as 14 paradas da Linha Anchieta para avanço automático suave
          const paradas = window.VALEBUS_PARADAS.paradasPorLinha.anchieta || [];
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
        // Se for o ônibus do motorista e estiver seguindo o traçado da Anchieta, não aplica desvio aleatório
        if (bus.isMeuOnibus && estadoMotorista.emRota && estadoMotorista.linhaCodigo.includes('Anchieta')) {
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
    rotaAnchietaVisivel = true;
    if (btnToggleRotaAnchieta) {
      btnToggleRotaAnchieta.classList.add('motorista-btn-flutuante--ativo');
      btnToggleRotaAnchieta.setAttribute('aria-pressed', 'true');
    }
    if (map && !map.hasLayer(camadaTrajetoAnchieta)) {
      camadaTrajetoAnchieta.addTo(map);
    }
    if (enquadrar) {
      enquadrarRotaAnchieta();
    }
  }

  function desativarRotaNoMapa() {
    rotaAnchietaVisivel = false;
    if (btnToggleRotaAnchieta) {
      btnToggleRotaAnchieta.classList.remove('motorista-btn-flutuante--ativo');
      btnToggleRotaAnchieta.setAttribute('aria-pressed', 'false');
    }
    if (map && map.hasLayer(camadaTrajetoAnchieta)) {
      map.removeLayer(camadaTrajetoAnchieta);
    }
  }

  function ativarParadasNoMapa() {
    paradasAnchietaVisiveis = true;
    if (btnToggleParadasAnchieta) {
      btnToggleParadasAnchieta.classList.add('motorista-btn-flutuante--ativo');
      btnToggleParadasAnchieta.setAttribute('aria-pressed', 'true');
    }
    if (map && !map.hasLayer(camadaParadasAnchieta)) {
      camadaParadasAnchieta.addTo(map);
    }
  }

  function desativarParadasNoMapa() {
    paradasAnchietaVisiveis = false;
    if (btnToggleParadasAnchieta) {
      btnToggleParadasParadasAnchietaClassRemove();
    }
    if (map && map.hasLayer(camadaParadasAnchieta)) {
      map.removeLayer(camadaParadasAnchieta);
    }
  }

  function btnToggleParadasParadasAnchietaClassRemove() {
    if (btnToggleParadasAnchieta) {
      btnToggleParadasAnchieta.classList.remove('motorista-btn-flutuante--ativo');
      btnToggleParadasAnchieta.setAttribute('aria-pressed', 'false');
    }
  }

  const btnToggleRotaAnchieta = document.getElementById('btn-toggle-rota-anchieta');
  if (btnToggleRotaAnchieta) {
    btnToggleRotaAnchieta.addEventListener('click', () => {
      if (!rotaAnchietaVisivel) {
        ativarRotaNoMapa(true);
        mostrarToast('Traçado oficial da Linha Anchieta traçado no mapa.');
      } else {
        desativarRotaNoMapa();
        mostrarToast('Traçado da Linha Anchieta ocultado.');
      }
    });
  }

  const btnToggleParadasAnchieta = document.getElementById('btn-toggle-paradas-anchieta');
  if (btnToggleParadasAnchieta) {
    btnToggleParadasAnchieta.addEventListener('click', () => {
      if (!paradasAnchietaVisiveis) {
        ativarParadasNoMapa();
        mostrarToast('14 Paradas da Linha Anchieta exibidas no mapa.');
      } else {
        desativarParadasNoMapa();
        mostrarToast('Pontos de parada ocultados.');
      }
    });
  }

  const btnEnquadrarRotaAnchieta = document.getElementById('btn-enquadrar-rota-anchieta');
  if (btnEnquadrarRotaAnchieta) {
    btnEnquadrarRotaAnchieta.addEventListener('click', enquadrarRotaAnchieta);
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

  // Caixa expansível de itinerário da Linha Anchieta
  const btnToggleListaParadas = document.getElementById('btn-toggle-lista-paradas');
  const boxParadasAnchieta = document.getElementById('box-paradas-anchieta');
  const listaParadasContainer = document.getElementById('lista-paradas-anchieta-container');

  if (btnToggleListaParadas && boxParadasAnchieta) {
    btnToggleListaParadas.addEventListener('click', () => {
      const estaVisivel = boxParadasAnchieta.style.display !== 'none';
      boxParadasAnchieta.style.display = estaVisivel ? 'none' : 'block';
      btnToggleListaParadas.textContent = estaVisivel ? '📋 Ver 14 Paradas' : '✕ Ocultar Paradas';
      if (!estaVisivel && listaParadasContainer && listaParadasContainer.children.length === 0) {
        preencherListaParadasItinerario();
      }
    });
  }

  // Preenche inicialmente o itinerário
  preencherListaParadasItinerario();
  selecionarParadaCockpit(0, false);

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

        // Traçar automaticamente a rota no mapa e exibir as paradas da linha
        ativarRotaNoMapa(false);
        ativarParadasNoMapa();

        mostrarToast('Boa viagem! Rota e paradas traçadas no mapa automaticamente.');

        // Enquadra a visão da rota no mapa e foca a navegação
        if (polylineAnchieta && map) {
          map.fitBounds(polylineAnchieta.getBounds(), { padding: [50, 50], maxZoom: 15 });
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
        selecionarParadaCockpit(0);

        if (meuOnibusMarker && window.VALEBUS_PARADAS) {
          const coords = window.VALEBUS_PARADAS.obterTrajeto('anchieta');
          if (coords && coords.length > 0) {
            meuOnibusMarker.setLatLng(coords[0]);
          }
        }

        if (map) {
          if (!map.hasLayer(camadaTrajetoAnchieta)) {
            camadaTrajetoAnchieta.addTo(map);
            rotaAnchietaVisivel = true;
          }
          if (!map.hasLayer(camadaParadasAnchieta)) {
            camadaParadasAnchieta.addTo(map);
            paradasAnchietaVisiveis = true;
          }
        }

        if (btnToggleRotaAnchieta) {
          btnToggleRotaAnchieta.classList.add('motorista-btn-flutuante--ativo');
          btnToggleRotaAnchieta.setAttribute('aria-pressed', 'true');
        }
        if (btnToggleParadasAnchieta) {
          btnToggleParadasAnchieta.classList.add('motorista-btn-flutuante--ativo');
          btnToggleParadasAnchieta.setAttribute('aria-pressed', 'true');
        }

        enquadrarRotaAnchieta();
        mostrarToast('Linha Anchieta ativada com traçado de 4,5 km e 14 paradas.');
      } else {
        estadoMotorista.linhaCodigo = 'Linha 01';
        estadoMotorista.linhaNome = 'Centro / Bairro Industrial';
        estadoMotorista.distanciaKm = 3.8;
        estadoMotorista.tempoMin = 12;
        estadoMotorista.proximaParada = 'Av. Inatel, Centro';
        mostrarToast('Linha 01 ativada.');
      }
      renderizarDadosMotorista();
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
  let ocorrenciasAtivas = [];
  try {
    const salvas = localStorage.getItem('valebus_ocorrencias_motorista');
    if (salvas) ocorrenciasAtivas = JSON.parse(salvas);
  } catch (e) {
    ocorrenciasAtivas = [];
  }

  let socorroGaragemAtivo = null;
  try {
    const socorroSalvo = localStorage.getItem('valebus_socorro_garagem');
    if (socorroSalvo) socorroGaragemAtivo = JSON.parse(socorroSalvo);
  } catch (e) {
    socorroGaragemAtivo = null;
  }

  function salvarOcorrencias() {
    try {
      localStorage.setItem('valebus_ocorrencias_motorista', JSON.stringify(ocorrenciasAtivas));
    } catch (e) {}
    renderizarOcorrenciasPainel();
  }

  function salvarSocorroGaragem() {
    try {
      if (socorroGaragemAtivo) {
        localStorage.setItem('valebus_socorro_garagem', JSON.stringify(socorroGaragemAtivo));
      } else {
        localStorage.removeItem('valebus_socorro_garagem');
      }
    } catch (e) {}
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
      const coords = (marcadorVeiculo && marcadorVeiculo.getLatLng) ? marcadorVeiculo.getLatLng() : null;
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

        // Salva na fila de chamados do Gestor CCO
        try {
          let historicoChamados = [];
          const historicoSalvo = localStorage.getItem('valebus_chamados_gestor');
          if (historicoSalvo) historicoChamados = JSON.parse(historicoSalvo);
          historicoChamados.unshift(novaOcorrencia);
          localStorage.setItem('valebus_chamados_gestor', JSON.stringify(historicoChamados.slice(0, 50)));
        } catch (e) {
          console.warn('Erro ao replicar alerta no canal do gestor:', e);
        }

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
      const coords = (marcadorVeiculo && marcadorVeiculo.getLatLng) ? marcadorVeiculo.getLatLng() : null;
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

      // Notifica o canal do Gestor CCO salvando na fila unificada de chamados
      try {
        let historicoChamados = [];
        const historicoSalvo = localStorage.getItem('valebus_chamados_gestor');
        if (historicoSalvo) historicoChamados = JSON.parse(historicoSalvo);
        historicoChamados.unshift(socorroGaragemAtivo);
        localStorage.setItem('valebus_chamados_gestor', JSON.stringify(historicoChamados.slice(0, 50)));
      } catch (e) {
        console.warn('Erro ao replicar chamado no canal do gestor:', e);
      }

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
