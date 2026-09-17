/**
 * gestor.js — Painel de Gestão Operacional & Frotas (ValeBus CCO)
 * ─────────────────────────────────────────────────────────────────
 * Módulo CCO para gerenciamento de motoristas (Opção A), despacho de escalas,
 * credenciamento de PIN de bordo e telemetria da frota de Santa Rita do Sapucaí.
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. VALIDAÇÃO DE ACESSO DO GESTOR & SESSÃO PADRÃO
     ────────────────────────────────────────────────────────── */
  const EMAIL_GESTOR_OFICIAL = 'valebussrs@gmail.com';
  const USUARIO_PADRAO_GESTOR = {
    nome: 'Gestor Operacional ValeBus',
    email: 'valebussrs@gmail.com',
    cargo: 'Gestor CCO & Frotas Master',
    perfil: 'gestor',
    matricula: 'CCO-001',
    metodo: 'Sessão CCO Gestor',
    veiculo: 'Supervisor CCO (Frota Geral)'
  };

  function garantirSessaoGestor() {
    try {
      const salvo = localStorage.getItem('valebus_usuario');
      let usuario = null;
      if (salvo) {
        try {
          usuario = JSON.parse(salvo);
        } catch (e) {}
      }

      if (!usuario || typeof usuario !== 'object') {
        usuario = { ...USUARIO_PADRAO_GESTOR };
      } else {
        usuario.nome = (usuario.nome && usuario.nome !== 'João da Silva') ? usuario.nome : USUARIO_PADRAO_GESTOR.nome;
        usuario.email = EMAIL_GESTOR_OFICIAL;
        usuario.cargo = usuario.cargo || USUARIO_PADRAO_GESTOR.cargo;
        usuario.perfil = 'gestor';
        usuario.matricula = usuario.matricula || USUARIO_PADRAO_GESTOR.matricula;
        usuario.metodo = usuario.metodo || USUARIO_PADRAO_GESTOR.metodo;
        usuario.veiculo = usuario.veiculo || USUARIO_PADRAO_GESTOR.veiculo;
      }

      localStorage.setItem('valebus_usuario', JSON.stringify(usuario));
      return usuario;
    } catch (e) {
      console.warn('Erro ao garantir sessão do gestor:', e);
      return USUARIO_PADRAO_GESTOR;
    }
  }

  function verificarPermissaoGestor() {
    // Garante sempre a sessão ativa com credenciais de Gestor CCO
    const usuario = garantirSessaoGestor();

    // Atualiza cabeçalho com os dados do gestor
    const elNome = document.getElementById('gestor-nome');
    const elEmail = document.getElementById('gestor-email');
    const elAvatar = document.getElementById('gestor-avatar');

    if (elNome && usuario.nome) elNome.textContent = usuario.nome;
    if (elEmail && usuario.email) elEmail.textContent = usuario.email;
    if (elAvatar && usuario.nome) {
      const parts = usuario.nome.trim().split(/\s+/).filter(Boolean);
      elAvatar.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : 'V')).toUpperCase();
    }

    return true;
  }

  if (!verificarPermissaoGestor()) {
    return;
  }

  /* ──────────────────────────────────────────────────────────
     2. BASE DE DADOS INICIAL DE MOTORISTAS (PERSISTÊNCIA LOCAL)
     ────────────────────────────────────────────────────────── */
  const CHAVE_STORAGE_MOTORISTAS = 'valebus_motoristas_cadastrados';

  const MOTORISTAS_PADRAO_SRS = [
    {
      id: 'mot-1',
      nome: 'Carlos Alberto Mendes',
      matricula: 'MOT-4821',
      cpf: '128.491.026-44',
      telefone: '(35) 99841-2041',
      cnh: '04829104820',
      cnhCat: 'D',
      cnhValidade: '2027-11-20',
      linha: 'Linha Fernandes',
      veiculo: 'Ônibus #02 (Prefixo 102)',
      turno: 'Manhã (05:30 - 13:30)',
      pin: '4821',
      status: 'ativo',
      observacoes: 'Motorista titular da Linha Fernandes com curso de condução defensiva.'
    },
    {
      id: 'mot-2',
      nome: 'Marcos Vinicius Ramos',
      matricula: 'MOT-1042',
      cpf: '241.982.516-12',
      telefone: '(35) 99124-8840',
      cnh: '05912480192',
      cnhCat: 'D',
      cnhValidade: '2026-08-15',
      linha: 'Linha Anchieta',
      veiculo: 'Ônibus #01 (Prefixo 101)',
      turno: 'Tarde (13:30 - 21:30)',
      pin: '1042',
      status: 'viagem',
      observacoes: 'Em rota na Linha Anchieta sentido Praça do Murilo.'
    },
    {
      id: 'mot-3',
      nome: 'Roberto Dias Silveira',
      matricula: 'MOT-3310',
      cpf: '381.049.206-89',
      telefone: '(35) 99752-1190',
      cnh: '03194810294',
      cnhCat: 'E',
      cnhValidade: '2028-02-10',
      linha: 'Linha Fortaleza',
      veiculo: 'Ônibus #03 (Prefixo 103)',
      turno: 'Manhã (05:30 - 13:30)',
      pin: '3310',
      status: 'ativo',
      observacoes: 'Habilitação E, instrutor de manobra da garagem central.'
    },
    {
      id: 'mot-4',
      nome: 'José Carlos de Souza',
      matricula: 'MOT-2048',
      cpf: '401.992.836-31',
      telefone: '(35) 98845-6612',
      cnh: '02849102948',
      cnhCat: 'D',
      cnhValidade: '2026-12-05',
      linha: 'Linha Industrial',
      veiculo: 'Ônibus #04 (Prefixo 104)',
      turno: 'Integral',
      pin: '2048',
      status: 'ativo',
      observacoes: 'Atendimento do polo industrial e Linear/BR-459.'
    },
    {
      id: 'mot-5',
      nome: 'Paulo Henrique Costa',
      matricula: 'MOT-5590',
      cpf: '519.204.816-77',
      telefone: '(35) 99912-3401',
      cnh: '04910294810',
      cnhCat: 'D',
      cnhValidade: '2025-09-30',
      linha: 'Linha Porto Sapucaí',
      veiculo: 'Ônibus #05 (Prefixo 105)',
      turno: 'Tarde (13:30 - 21:30)',
      pin: '5590',
      status: 'folga',
      observacoes: 'Em escala de descanso programado.'
    },
    {
      id: 'mot-6',
      nome: 'Marcelo Antunes Prado',
      matricula: 'MOT-7712',
      cpf: '602.819.346-55',
      telefone: '(35) 98401-9922',
      cnh: '05192840192',
      cnhCat: 'D',
      cnhValidade: '2027-04-18',
      linha: 'Linha São Benedito',
      veiculo: 'Ônibus #06 (Prefixo 106)',
      turno: 'Manhã (05:30 - 13:30)',
      pin: '7712',
      status: 'ativo',
      observacoes: 'Linha circular com reforço na Vila Operária.'
    }
  ];

  function obterMotoristas() {
    try {
      const salvos = localStorage.getItem(CHAVE_STORAGE_MOTORISTAS);
      if (salvos) {
        return JSON.parse(salvos);
      }
    } catch (e) {
      console.warn('Erro ao ler motoristas do localStorage:', e);
    }
    // Se não existir, inicializa e salva
    salvarMotoristas(MOTORISTAS_PADRAO_SRS);
    return [...MOTORISTAS_PADRAO_SRS];
  }

  function salvarMotoristas(lista) {
    try {
      localStorage.setItem(CHAVE_STORAGE_MOTORISTAS, JSON.stringify(lista));
    } catch (e) {
      console.error('Erro ao salvar motoristas no localStorage:', e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     3. MAPEAMENTO DE CORES DAS LINHAS DE SRS
     ────────────────────────────────────────────────────────── */
  const CORES_LINHAS = {
    'Linha Fernandes': '#2563eb',
    'Linha Anchieta': '#16a34a',
    'Linha Fortaleza': '#9333ea',
    'Linha Industrial': '#ea580c',
    'Linha Porto Sapucaí': '#0891b2',
    'Linha Reforço José G.M': '#dc2626',
    'Linha São Benedito': '#eab308'
  };

  function obterCorLinha(nomeLinha) {
    for (const [chave, cor] of Object.entries(CORES_LINHAS)) {
      if (nomeLinha.toLowerCase().includes(chave.toLowerCase().replace('linha ', ''))) {
        return cor;
      }
    }
    return '#1a6fd4';
  }

  /* ──────────────────────────────────────────────────────────
     4. RENDERIZAÇÃO DA TABELA E KPIS
     ────────────────────────────────────────────────────────── */
  let pinsVisiveis = {};

  function renderizarTabela() {
    const lista = obterMotoristas();
    const termoBusca = (document.getElementById('input-busca-motorista')?.value || '').toLowerCase().trim();
    const filtroStatus = document.getElementById('filtro-status-motorista')?.value || 'todos';
    const filtroLinha = document.getElementById('filtro-linha-motorista')?.value || 'todas';

    // Filtragem
    const filtrados = lista.filter(m => {
      const matchBusca = !termoBusca ||
        m.nome.toLowerCase().includes(termoBusca) ||
        m.matricula.toLowerCase().includes(termoBusca) ||
        (m.cpf && m.cpf.toLowerCase().includes(termoBusca)) ||
        m.linha.toLowerCase().includes(termoBusca);

      const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;
      const matchLinha = filtroLinha === 'todas' || m.linha.toLowerCase().includes(filtroLinha.toLowerCase());

      return matchBusca && matchStatus && matchLinha;
    });

    const tbody = document.getElementById('tabela-motoristas-corpo');
    const containerMobile = document.getElementById('cards-motoristas-mobile');

    if (filtrados.length === 0) {
      const msgVazio = `
        <div style="text-align:center; padding: 32px 16px; color: var(--texto-secundario); background: var(--fundo-card); border: 1px solid var(--borda-cor); border-radius: var(--raio-medio);">
          Nenhum motorista encontrado com os filtros selecionados.
        </div>
      `;
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding: 32px 16px; color: var(--texto-secundario);">
              Nenhum motorista encontrado com os filtros selecionados.
            </td>
          </tr>
        `;
      }
      if (containerMobile) {
        containerMobile.innerHTML = msgVazio;
      }
    } else {
      if (tbody) {
        tbody.innerHTML = filtrados.map(m => {
          const corLinha = obterCorLinha(m.linha);
          const partesNome = m.nome.split(' ');
          const iniciais = (partesNome[0][0] + (partesNome[1] ? partesNome[1][0] : '')).toUpperCase();
          const pinMostrado = pinsVisiveis[m.id] ? m.pin : '••••';

          // Badge de Status
          let statusBadge = '';
          if (m.status === 'ativo') {
            statusBadge = `<span class="status-pill status-pill--ativo">Ativo</span>`;
          } else if (m.status === 'viagem') {
            statusBadge = `<span class="status-pill status-pill--viagem">Em Viagem</span>`;
          } else if (m.status === 'folga') {
            statusBadge = `<span class="status-pill status-pill--folga">Folga</span>`;
          } else {
            statusBadge = `<span class="status-pill status-pill--inativo">Inativo</span>`;
          }

          const horarioTurno = m.turno.includes('(') ? m.turno.split('(')[1].replace(')', '') : 'Integral';

          return `
            <tr data-id="${m.id}">
              <td>
                <div class="gestor-motorista-info">
                  <div class="gestor-motorista-avatar">${iniciais}</div>
                  <div class="gestor-motorista-textos">
                    <div class="gestor-motorista-nome">${m.nome}</div>
                    <div class="gestor-motorista-sub">
                      <span class="gestor-sub-matricula">${m.matricula}</span>
                      <span class="gestor-sub-sep">&bull;</span>
                      <span class="gestor-sub-cnh">Cat. ${m.cnhCat} (Val: ${formatarData(m.cnhValidade)})</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="gestor-linha-col">
                  <span class="gestor-linha-badge">
                    <span class="gestor-linha-dot" style="background-color: ${corLinha};"></span>
                    ${m.linha}
                  </span>
                  <span class="gestor-veiculo-sub">${m.veiculo.split('(')[0].trim()}</span>
                </div>
              </td>
              <td>
                <div class="gestor-turno-col">
                  <span class="gestor-turno-nome">${m.turno.split('(')[0].trim()}</span>
                  <span class="gestor-turno-horario">${horarioTurno}</span>
                </div>
              </td>
              <td>
                <span class="gestor-pin-box">
                  <span>${pinMostrado}</span>
                  <button type="button" class="gestor-pin-olho-btn" data-acao="toggle-pin" data-id="${m.id}" title="Mostrar/ocultar PIN">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </span>
              </td>
              <td>${statusBadge}</td>
              <td>
                <div class="gestor-acoes-td" style="justify-content: flex-end;">
                  <button type="button" class="gestor-btn-acao-tb" data-acao="editar" data-id="${m.id}" title="Editar motorista">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" class="gestor-btn-acao-tb" data-acao="toggle-status" data-id="${m.id}" title="Alternar status ativo/folga">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </button>
                  <button type="button" class="gestor-btn-acao-tb gestor-btn-acao-tb--excluir" data-acao="excluir" data-id="${m.id}" title="Excluir cadastro">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      // Renderização de cards móveis
      if (containerMobile) {
        containerMobile.innerHTML = filtrados.map(m => {
          const corLinha = obterCorLinha(m.linha);
          const partesNome = m.nome.split(' ');
          const iniciais = (partesNome[0][0] + (partesNome[1] ? partesNome[1][0] : '')).toUpperCase();
          const pinMostrado = pinsVisiveis[m.id] ? m.pin : '••••';

          let statusBadge = '';
          if (m.status === 'ativo') {
            statusBadge = `<span class="status-pill status-pill--ativo">Ativo</span>`;
          } else if (m.status === 'viagem') {
            statusBadge = `<span class="status-pill status-pill--viagem">Em Viagem</span>`;
          } else if (m.status === 'folga') {
            statusBadge = `<span class="status-pill status-pill--folga">Folga</span>`;
          } else {
            statusBadge = `<span class="status-pill status-pill--inativo">Inativo</span>`;
          }

          return `
            <div class="gestor-card-motorista-mob" data-id="${m.id}">
              <div class="gestor-card-motorista-mob__header">
                <div class="gestor-card-motorista-mob__info">
                  <div class="gestor-motorista-avatar">${iniciais}</div>
                  <div>
                    <div class="gestor-motorista-nome">${m.nome}</div>
                    <div style="font-size: 11px; color: var(--texto-secundario);">${m.matricula} &bull; CNH ${m.cnhCat}</div>
                  </div>
                </div>
                ${statusBadge}
              </div>

              <div class="gestor-card-motorista-mob__detalhes">
                <div class="gestor-card-motorista-mob__item gestor-card-motorista-mob__item-full">
                  <span class="gestor-card-motorista-mob__item-label">Linha &amp; Veículo</span>
                  <div style="display:flex; align-items:center; gap:8px; margin-top:2px;">
                    <span class="gestor-linha-badge">
                      <span class="gestor-linha-dot" style="background-color: ${corLinha};"></span>
                      ${m.linha}
                    </span>
                    <span style="font-size:12px; color:var(--texto-secundario);">${m.veiculo.split('(')[0].trim()}</span>
                  </div>
                </div>
                <div class="gestor-card-motorista-mob__item">
                  <span class="gestor-card-motorista-mob__item-label">Turno</span>
                  <span class="gestor-card-motorista-mob__item-valor">${m.turno.split('(')[0].trim()}</span>
                </div>
                <div class="gestor-card-motorista-mob__item">
                  <span class="gestor-card-motorista-mob__item-label">PIN Terminal</span>
                  <span class="gestor-pin-box" style="display:inline-flex; width:fit-content;">
                    <span>${pinMostrado}</span>
                    <button type="button" class="gestor-pin-olho-btn" data-acao="toggle-pin" data-id="${m.id}" title="Ver PIN">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </span>
                </div>
              </div>

              <div class="gestor-card-motorista-mob__acoes">
                <button type="button" class="gestor-btn-acao-tb" data-acao="editar" data-id="${m.id}" title="Editar motorista">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button type="button" class="gestor-btn-acao-tb" data-acao="toggle-status" data-id="${m.id}" title="Alternar status">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
                <button type="button" class="gestor-btn-acao-tb gestor-btn-acao-tb--excluir" data-acao="excluir" data-id="${m.id}" title="Excluir cadastro">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Atualiza KPIs
    const total = lista.length;
    const ativos = lista.filter(m => m.status === 'ativo' || m.status === 'viagem').length;

    const elTotalKpi = document.getElementById('kpi-total-motoristas');
    const elAtivosKpi = document.getElementById('kpi-motoristas-ativos');
    const badgeTotal = document.getElementById('badge-total-motoristas');

    if (elTotalKpi) elTotalKpi.textContent = total;
    if (elAtivosKpi) elAtivosKpi.textContent = ativos;
    if (badgeTotal) badgeTotal.textContent = total;

    renderizarEscalasDia(lista);
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  }

  /* ──────────────────────────────────────────────────────────
     5. RENDERIZAÇÃO DAS ESCALAS DO DIA
     ────────────────────────────────────────────────────────── */
  function renderizarEscalasDia(lista) {
    const grid = document.getElementById('grid-escalas-dia');
    if (!grid) return;

    const veiculos = [
      { prefixo: '101', numero: 'Ônibus #01', linha: 'Linha Anchieta' },
      { prefixo: '102', numero: 'Ônibus #02', linha: 'Linha Fernandes' },
      { prefixo: '103', numero: 'Ônibus #03', linha: 'Linha Fortaleza' },
      { prefixo: '104', numero: 'Ônibus #04', linha: 'Linha Industrial' },
      { prefixo: '105', numero: 'Ônibus #05', linha: 'Linha Porto Sapucaí' },
      { prefixo: '106', numero: 'Ônibus #06', linha: 'Linha São Benedito' }
    ];

    grid.innerHTML = veiculos.map(v => {
      const motEscalado = lista.find(m => m.veiculo.includes(v.numero) && (m.status === 'ativo' || m.status === 'viagem')) ||
                          lista.find(m => m.linha.toLowerCase().includes(v.linha.toLowerCase().replace('linha ', '')));

      const nomeMot = motEscalado ? motEscalado.nome : 'Escala em Aberto / Reserva';
      const matMot = motEscalado ? motEscalado.matricula : '—';
      const statusMot = motEscalado ? (motEscalado.status === 'viagem' ? 'Em Viagem' : 'Escalado') : 'Pendente';
      const corLinha = obterCorLinha(v.linha);

      return `
        <div class="gestor-escala-card">
          <div class="gestor-escala-card__header">
            <span class="gestor-escala-veiculo">${v.numero} (Prefixo ${v.prefixo})</span>
            <span class="gestor-escala-linha" style="border-left: 3px solid ${corLinha};">${v.linha}</span>
          </div>
          <div class="gestor-escala-motorista">
            <div class="gestor-motorista-avatar" style="background:${corLinha};">
              ${motEscalado ? (motEscalado.nome[0] + (motEscalado.nome.split(' ')[1]?.[0] || '')) : 'CCO'}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 13px;">${nomeMot}</div>
              <div style="font-size: 11px; color: var(--texto-secundario);">Matrícula: ${matMot}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size: 12px;">
            <span style="color: var(--texto-secundario);">Status: <strong>${statusMot}</strong></span>
            <button type="button" class="btn-gestor-secundario" style="padding: 4px 8px; font-size: 11px;" onclick="window.abrirModalEdicao('${motEscalado?.id || ''}')">
              ${motEscalado ? 'Editar Escala' : 'Alocar Motorista'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ──────────────────────────────────────────────────────────
     6. FEED DE OCORRÊNCIAS E TELEMETRIA
     ────────────────────────────────────────────────────────── */
  function renderizarFeedOcorrencias() {
    const container = document.getElementById('lista-feed-ocorrencias');
    if (!container) return;

    const ocorrencias = [
      {
        hora: 'Agora',
        tipo: 'telemetria',
        titulo: 'Telemetria do Cockpit Ativa',
        desc: 'Ônibus #02 (Linha Fernandes) sincronizado com o GPS e terminal de bordo.',
        icone: 'check'
      },
      {
        hora: 'Há 12 min',
        tipo: 'aviso',
        titulo: 'Aviso de Trânsito — Ponte Nova',
        desc: 'Motorista Marcos Vinicius (MOT-1042) reportou fluxo lento no sentido Praça Urbana Carolina.',
        icone: 'alerta'
      },
      {
        hora: 'Há 45 min',
        tipo: 'info',
        titulo: 'Início de Viagem — Turno da Manhã',
        desc: 'Motorista Carlos Mendes (MOT-4821) efetuou login no terminal de bordo do veículo 102 com sucesso.',
        icone: 'onibus'
      },
      {
        hora: 'Há 2h',
        tipo: 'info',
        titulo: 'Abertura da Central CCO',
        desc: 'Supervisão iniciada por Gestor CCO (valebussrs@gmail.com). Escala matutina validada.',
        icone: 'cco'
      }
    ];

    container.innerHTML = ocorrencias.map(o => `
      <div style="background: var(--fundo-campo); border-radius: var(--raio-pequeno); padding: 12px 14px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--cor-marca); margin-top: 6px; flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <strong style="font-size: 13px; color: var(--texto-principal);">${o.titulo}</strong>
            <span style="font-size: 11px; color: var(--texto-secundario);">${o.hora}</span>
          </div>
          <p style="font-size: 12px; color: var(--texto-secundario); margin: 0;">${o.desc}</p>
        </div>
      </div>
    `).join('');
  }

  /* ──────────────────────────────────────────────────────────
     7. MODAL DE CADASTRO E EDIÇÃO
     ────────────────────────────────────────────────────────── */
  const modal = document.getElementById('modal-motorista');
  const btnAbrirModal = document.getElementById('btn-abrir-modal-motorista');
  const btnFecharModal = document.getElementById('btn-fechar-modal-motorista');
  const btnCancelarModal = document.getElementById('btn-cancelar-modal-motorista');
  const formCadastro = document.getElementById('form-cadastro-motorista');
  const btnGerarMatricula = document.getElementById('btn-gerar-matricula');

  function abrirModal(idMotorista) {
    if (!modal) return;

    const inputId = document.getElementById('input-motorista-id-edit');
    const inputNome = document.getElementById('form-mot-nome');
    const inputMatricula = document.getElementById('form-mot-matricula');
    const inputPin = document.getElementById('form-mot-pin');
    const inputCpf = document.getElementById('form-mot-cpf');
    const inputTelefone = document.getElementById('form-mot-telefone');
    const inputCnh = document.getElementById('form-mot-cnh');
    const selectCnhCat = document.getElementById('form-mot-cnh-cat');
    const inputValidade = document.getElementById('form-mot-cnh-validade');
    const selectLinha = document.getElementById('form-mot-linha');
    const selectVeiculo = document.getElementById('form-mot-veiculo');
    const selectTurno = document.getElementById('form-mot-turno');
    const selectStatus = document.getElementById('form-mot-status');
    const tituloModal = document.getElementById('modal-titulo-motorista');

    if (idMotorista) {
      // Edição
      const lista = obterMotoristas();
      const mot = lista.find(m => m.id === idMotorista);
      if (mot) {
        if (tituloModal) tituloModal.textContent = 'Editar Credenciais do Motorista';
        if (inputId) inputId.value = mot.id;
        if (inputNome) inputNome.value = mot.nome;
        if (inputMatricula) inputMatricula.value = mot.matricula;
        if (inputPin) inputPin.value = mot.pin;
        if (inputCpf) inputCpf.value = mot.cpf || '';
        if (inputTelefone) inputTelefone.value = mot.telefone || '';
        if (inputCnh) inputCnh.value = mot.cnh || '';
        if (selectCnhCat) selectCnhCat.value = mot.cnhCat || 'D';
        if (inputValidade) inputValidade.value = mot.cnhValidade || '';
        if (selectLinha) selectLinha.value = mot.linha;
        if (selectVeiculo) selectVeiculo.value = mot.veiculo;
        if (selectTurno) selectTurno.value = mot.turno;
        if (selectStatus) selectStatus.value = mot.status;
      }
    } else {
      // Novo Cadastro
      if (tituloModal) tituloModal.textContent = 'Cadastrar Novo Motorista';
      formCadastro.reset();
      if (inputId) inputId.value = '';
      if (inputMatricula) inputMatricula.value = gerarMatriculaAleatoria();
      if (inputPin) inputPin.value = Math.floor(1000 + Math.random() * 9000).toString();
      if (inputValidade) {
        // Data de validade padrão: 2 anos a partir de hoje
        const d = new Date();
        d.setFullYear(d.getFullYear() + 2);
        inputValidade.value = d.toISOString().split('T')[0];
      }
    }

    modal.classList.add('ativo');
    modal.setAttribute('aria-hidden', 'false');

    // Reseta o scroll para o topo para telas móveis
    const corpoModal = modal.querySelector('.gestor-modal__corpo');
    if (corpoModal) {
      corpoModal.scrollTop = 0;
    }

    if (inputNome && window.innerWidth > 768) {
      inputNome.focus();
    }
  }

  function fecharModal() {
    if (!modal) return;
    modal.classList.remove('ativo');
    modal.setAttribute('aria-hidden', 'true');
  }

  function gerarMatriculaAleatoria() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `MOT-${num}`;
  }

  if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => abrirModal());
  }
  if (btnFecharModal) {
    btnFecharModal.addEventListener('click', fecharModal);
  }
  if (btnCancelarModal) {
    btnCancelarModal.addEventListener('click', fecharModal);
  }
  if (btnGerarMatricula) {
    btnGerarMatricula.addEventListener('click', () => {
      const input = document.getElementById('form-mot-matricula');
      if (input) input.value = gerarMatriculaAleatoria();
    });
  }

  // Fechar modal ao clicar no fundo
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModal();
      }
    });
  }

  window.abrirModalEdicao = abrirModal;

  // Submissão do Formulário
  if (formCadastro) {
    formCadastro.addEventListener('submit', (e) => {
      e.preventDefault();

      const inputId = document.getElementById('input-motorista-id-edit')?.value;
      const nome = document.getElementById('form-mot-nome')?.value.trim();
      const matricula = document.getElementById('form-mot-matricula')?.value.trim().toUpperCase();
      const pin = document.getElementById('form-mot-pin')?.value.trim();
      const cpf = document.getElementById('form-mot-cpf')?.value.trim();
      const telefone = document.getElementById('form-mot-telefone')?.value.trim();
      const cnh = document.getElementById('form-mot-cnh')?.value.trim();
      const cnhCat = document.getElementById('form-mot-cnh-cat')?.value;
      const cnhValidade = document.getElementById('form-mot-cnh-validade')?.value;
      const linha = document.getElementById('form-mot-linha')?.value;
      const veiculo = document.getElementById('form-mot-veiculo')?.value;
      const turno = document.getElementById('form-mot-turno')?.value;
      const status = document.getElementById('form-mot-status')?.value;

      if (!nome || !matricula || !pin) {
        mostrarToast('Preencha os campos obrigatórios (Nome, Matrícula e PIN).', 'erro');
        return;
      }

      const lista = obterMotoristas();

      if (inputId) {
        // Atualizar
        const index = lista.findIndex(m => m.id === inputId);
        if (index !== -1) {
          lista[index] = {
            ...lista[index],
            nome, matricula, pin, cpf, telefone, cnh, cnhCat, cnhValidade, linha, veiculo, turno, status
          };
          salvarMotoristas(lista);
          mostrarToast(`Motorista ${nome} atualizado com sucesso!`);
        }
      } else {
        // Criar Novo
        // Verifica duplicidade de matrícula
        if (lista.some(m => m.matricula === matricula)) {
          mostrarToast('Já existe um motorista cadastrado com esta matrícula.', 'erro');
          return;
        }

        const novoMotorista = {
          id: 'mot-' + Date.now(),
          nome,
          matricula,
          pin,
          cpf,
          telefone,
          cnh,
          cnhCat,
          cnhValidade,
          linha,
          veiculo,
          turno,
          status,
          observacoes: 'Cadastrado pelo Gestor CCO via portal administrativo.'
        };

        lista.unshift(novoMotorista);
        salvarMotoristas(lista);
        mostrarToast(`Motorista ${nome} (${matricula}) credenciado com sucesso!`);
      }

      fecharModal();
      renderizarTabela();
    });
  }

  /* ──────────────────────────────────────────────────────────
     8. DELEGAÇÃO DE EVENTOS NA TABELA E CARDS MÓVEIS (AÇÕES)
     ────────────────────────────────────────────────────────── */
  function tratarAcaoMotorista(e) {
    const btn = e.target.closest('button[data-acao]');
    if (!btn) return;

    const acao = btn.getAttribute('data-acao');
    const id = btn.getAttribute('data-id');

    if (acao === 'toggle-pin') {
      pinsVisiveis[id] = !pinsVisiveis[id];
      renderizarTabela();
    } else if (acao === 'editar') {
      abrirModal(id);
    } else if (acao === 'toggle-status') {
      const lista = obterMotoristas();
      const mot = lista.find(m => m.id === id);
      if (mot) {
        mot.status = mot.status === 'ativo' ? 'folga' : (mot.status === 'folga' ? 'inativo' : 'ativo');
        salvarMotoristas(lista);
        mostrarToast(`Status de ${mot.nome} alterado para "${mot.status.toUpperCase()}".`);
        renderizarTabela();
      }
    } else if (acao === 'excluir') {
      const lista = obterMotoristas();
      const mot = lista.find(m => m.id === id);
      if (mot && confirm(`Deseja realmente descredenciar o motorista ${mot.nome} (${mot.matricula})?`)) {
        const novaLista = lista.filter(m => m.id !== id);
        salvarMotoristas(novaLista);
        mostrarToast(`Motorista ${mot.nome} descredenciado com sucesso.`);
        renderizarTabela();
      }
    }
  }

  const tbody = document.getElementById('tabela-motoristas-corpo');
  if (tbody) {
    tbody.addEventListener('click', tratarAcaoMotorista);
  }

  const containerMobile = document.getElementById('cards-motoristas-mobile');
  if (containerMobile) {
    containerMobile.addEventListener('click', tratarAcaoMotorista);
  }

  /* ──────────────────────────────────────────────────────────
     9. EVENTOS DE FILTRAGEM E BUSCA
     ────────────────────────────────────────────────────────── */
  const inputBusca = document.getElementById('input-busca-motorista');
  const filtroStatus = document.getElementById('filtro-status-motorista');
  const filtroLinha = document.getElementById('filtro-linha-motorista');
  const btnRestaurarDemo = document.getElementById('btn-redefinir-dados-demo');

  if (inputBusca) inputBusca.addEventListener('input', renderizarTabela);
  if (filtroStatus) filtroStatus.addEventListener('change', renderizarTabela);
  if (filtroLinha) filtroLinha.addEventListener('change', renderizarTabela);

  if (btnRestaurarDemo) {
    btnRestaurarDemo.addEventListener('click', () => {
      if (confirm('Deseja recarregar a base de motoristas padrão de Santa Rita do Sapucaí?')) {
        salvarMotoristas(MOTORISTAS_PADRAO_SRS);
        mostrarToast('Base de motoristas de demonstração restaurada.');
        renderizarTabela();
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     10. TROCA DE ABAS
     ────────────────────────────────────────────────────────── */
  const abas = document.querySelectorAll('.gestor-aba-btn');
  abas.forEach(aba => {
    aba.addEventListener('click', () => {
      abas.forEach(a => a.classList.remove('ativo'));
      aba.classList.add('ativo');

      const alvo = aba.getAttribute('data-aba');
      document.getElementById('painel-motoristas').style.display = alvo === 'motoristas' ? 'block' : 'none';
      document.getElementById('painel-escalas').style.display = alvo === 'escalas' ? 'block' : 'none';
      document.getElementById('painel-ocorrencias').style.display = alvo === 'ocorrencias' ? 'block' : 'none';

      if (alvo === 'ocorrencias') {
        renderizarFeedOcorrencias();
      }
    });
  });

  /* ──────────────────────────────────────────────────────────
     11. TEMA CLARO / ESCURO
     ────────────────────────────────────────────────────────── */
  const btnTema = document.getElementById('btn-tema-gestor');
  const btnTemaMobile = document.getElementById('btn-tema-gestor-mobile');

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    try {
      localStorage.setItem('valebus_tema', tema);
    } catch (e) {
      console.warn(e);
    }
  }

  function alternarTema() {
    const atual = document.documentElement.getAttribute('data-theme') || 'light';
    const novo = atual === 'dark' ? 'light' : 'dark';
    aplicarTema(novo);
    mostrarToast(`Tema ${novo === 'dark' ? 'Escuro' : 'Claro'} ativado.`);
  }

  const temaSalvo = localStorage.getItem('valebus_tema') || 'light';
  aplicarTema(temaSalvo);

  if (btnTema) btnTema.addEventListener('click', alternarTema);
  if (btnTemaMobile) btnTemaMobile.addEventListener('click', alternarTema);

  /* ──────────────────────────────────────────────────────────
     12. MENU GAVETA PARA DISPOSITIVOS MÓVEIS
     ────────────────────────────────────────────────────────── */
  const btnMenuMobile = document.getElementById('btn-menu-mobile');
  const gavetaMobile = document.getElementById('menu-mobile-gaveta');
  const backdropMobile = document.getElementById('menu-mobile-backdrop');
  const btnFecharMenuMobile = document.getElementById('btn-fechar-menu-mobile');

  function abrirMenuMobile() {
    if (!gavetaMobile || !backdropMobile) return;
    gavetaMobile.classList.add('ativo');
    backdropMobile.classList.add('ativo');
    if (btnMenuMobile) {
      btnMenuMobile.classList.add('ativo');
      btnMenuMobile.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  }

  function fecharMenuMobile() {
    if (!gavetaMobile || !backdropMobile) return;
    gavetaMobile.classList.remove('ativo');
    backdropMobile.classList.remove('ativo');
    if (btnMenuMobile) {
      btnMenuMobile.classList.remove('ativo');
      btnMenuMobile.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  if (btnMenuMobile) {
    btnMenuMobile.addEventListener('click', () => {
      const estaAberto = gavetaMobile && gavetaMobile.classList.contains('ativo');
      if (estaAberto) {
        fecharMenuMobile();
      } else {
        abrirMenuMobile();
      }
    });
  }

  if (btnFecharMenuMobile) {
    btnFecharMenuMobile.addEventListener('click', fecharMenuMobile);
  }

  if (backdropMobile) {
    backdropMobile.addEventListener('click', fecharMenuMobile);
  }

  // Fecha gaveta com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharMenuMobile();
      fecharModalAlertaNavegacao();
      fecharModal();
    }
  });

  /* ──────────────────────────────────────────────────────────
     13. POP-UP DE ALERTA E CONFIRMAÇÃO DE NAVEGAÇÃO
     Garante que o usuário não saia do painel CCO por engano
     ────────────────────────────────────────────────────────── */
  const modalAlerta = document.getElementById('modal-confirmar-navegacao');
  const btnFecharAlerta = document.getElementById('btn-fechar-alerta-navegacao');
  const btnCancelarNavegacao = document.getElementById('btn-cancelar-navegacao');
  const btnConfirmarNavegacao = document.getElementById('btn-confirmar-navegacao');
  const elAlertaTitulo = document.getElementById('alerta-navegacao-titulo');
  const elAlertaMensagem = document.getElementById('alerta-navegacao-mensagem');
  const elAlertaIcone = document.getElementById('alerta-destino-icone');
  const elAlertaNome = document.getElementById('alerta-destino-nome');
  const elAlertaSub = document.getElementById('alerta-destino-sub');
  const elAlertaBtnTexto = document.getElementById('alerta-btn-confirmar-texto');

  let destinoPendente = null;

  function abrirModalAlertaNavegacao(destino) {
    if (!modalAlerta) return;
    destinoPendente = destino;

    // Remove qualquer estilo inline residual (ex: cor vermelha do botão sair)
    if (elAlertaIcone) {
      elAlertaIcone.removeAttribute('style');
    }

    // Identifica a tela de destino mesmo que data-tela tenha faltado
    let tela = destino.tela || destino.destino || '';
    if (!tela && destino.url) {
      if (destino.url.includes('dashboard')) {
        tela = 'passageiro';
      } else if (destino.url.includes('motorista')) {
        tela = 'motorista';
      } else if (destino.url.includes('login')) {
        tela = 'sair';
      }
    }
    destino.tela = tela;

    if (tela === 'passageiro') {
      if (elAlertaTitulo) elAlertaTitulo.textContent = 'Ir para o Mapa do Passageiro?';
      if (elAlertaMensagem) {
        elAlertaMensagem.textContent = 'Você está prestes a sair do Painel de Gestão Operacional para acessar o mapa público de linhas e paradas de passageiros. Sua sessão permanecerá conectada com o perfil de Gestor.';
      }
      if (elAlertaIcone) {
        elAlertaIcone.className = 'gestor-alerta-destino-icone gestor-alerta-destino-icone--azul';
        elAlertaIcone.innerHTML = `
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
        `;
      }
      if (elAlertaNome) elAlertaNome.textContent = 'Mapa do Passageiro (Santa Rita do Sapucaí)';
      if (elAlertaSub) elAlertaSub.textContent = 'Visualização em tempo real das linhas, itinerários e paradas.';
      if (elAlertaBtnTexto) elAlertaBtnTexto.textContent = 'Acessar Mapa';

    } else if (tela === 'motorista') {
      if (elAlertaTitulo) elAlertaTitulo.textContent = 'Acessar Terminal do Motorista?';
      if (elAlertaMensagem) {
        elAlertaMensagem.textContent = 'Você está saindo do painel da CCO para acessar o terminal de bordo dos condutores (registro de início de rota e chamados). Sua sessão permanecerá conectada com o perfil de Gestor.';
      }
      if (elAlertaIcone) {
        elAlertaIcone.className = 'gestor-alerta-destino-icone gestor-alerta-destino-icone--verde';
        elAlertaIcone.innerHTML = `
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        `;
      }
      if (elAlertaNome) elAlertaNome.textContent = 'Terminal de Bordo do Motorista';
      if (elAlertaSub) elAlertaSub.textContent = 'Painel de cockpit com supervisão e telemetria de frotas.';
      if (elAlertaBtnTexto) elAlertaBtnTexto.textContent = 'Acessar Terminal';

    } else if (tela === 'sair') {
      if (elAlertaTitulo) elAlertaTitulo.textContent = 'Deseja encerrar a sessão de Gestor?';
      if (elAlertaMensagem) {
        elAlertaMensagem.textContent = 'Você será desconectado da Central CCO ValeBus. Para retornar, será necessário realizar login novamente com suas credenciais.';
      }
      if (elAlertaIcone) {
        elAlertaIcone.className = 'gestor-alerta-destino-icone';
        elAlertaIcone.style.background = 'rgba(220, 38, 38, 0.15)';
        elAlertaIcone.style.color = '#dc2626';
        elAlertaIcone.innerHTML = `
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        `;
      }
      if (elAlertaNome) elAlertaNome.textContent = 'Encerrar Sessão do Gestor';
      if (elAlertaSub) elAlertaSub.textContent = 'Conta ativa: valebussrs@gmail.com';
      if (elAlertaBtnTexto) elAlertaBtnTexto.textContent = 'Sim, Desconectar';
    }

    modalAlerta.classList.add('ativo');
    modalAlerta.setAttribute('aria-hidden', 'false');
  }

  function fecharModalAlertaNavegacao() {
    if (!modalAlerta) return;
    modalAlerta.classList.remove('ativo');
    modalAlerta.setAttribute('aria-hidden', 'true');
    destinoPendente = null;
  }

  if (btnFecharAlerta) btnFecharAlerta.addEventListener('click', fecharModalAlertaNavegacao);
  if (btnCancelarNavegacao) btnCancelarNavegacao.addEventListener('click', fecharModalAlertaNavegacao);
  if (modalAlerta) {
    modalAlerta.addEventListener('click', (e) => {
      if (e.target === modalAlerta) fecharModalAlertaNavegacao();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalAlerta && modalAlerta.classList.contains('ativo')) {
      fecharModalAlertaNavegacao();
    }
  });

  if (btnConfirmarNavegacao) {
    btnConfirmarNavegacao.addEventListener('click', () => {
      if (!destinoPendente) return;
      const destino = destinoPendente;
      fecharModalAlertaNavegacao();
      fecharMenuMobile();

      if (destino.tela === 'sair') {
        localStorage.removeItem('valebus_usuario');
        window.location.href = 'login.html';
      } else if (destino.url) {
        // Assegura que o usuário vá logado com o usuário padrão de gestor
        garantirSessaoGestor();
        window.location.href = destino.url;
      }
    });
  }

  // Intercepta todos os links com a classe .link-com-confirmacao
  document.querySelectorAll('.link-com-confirmacao').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      const tela = link.getAttribute('data-tela') || link.getAttribute('data-destino') || '';
      abrirModalAlertaNavegacao({ url, tela });
    });
  });

  // Botões de sair (desktop e mobile)
  const btnSairDesktop = document.getElementById('btn-sair-gestor');
  if (btnSairDesktop) {
    btnSairDesktop.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalAlertaNavegacao({ url: 'login.html', tela: 'sair' });
    });
  }

  const btnSairMobile = document.getElementById('btn-sair-gestor-mobile');
  if (btnSairMobile) {
    btnSairMobile.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalAlertaNavegacao({ url: 'login.html', tela: 'sair' });
    });
  }

  /* ──────────────────────────────────────────────────────────
     14. TOAST DE FEEDBACK
     ────────────────────────────────────────────────────────── */
  let toastTimer = null;
  function mostrarToast(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('gestor-toast');
    const toastTexto = document.getElementById('gestor-toast-texto');
    if (!toast || !toastTexto) return;

    toastTexto.textContent = mensagem;
    toast.style.borderLeftColor = tipo === 'erro' ? 'var(--cor-erro)' : 'var(--cor-sucesso)';
    toast.classList.add('ativo');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('ativo');
    }, 4000);
  }

  // Inicialização
  renderizarTabela();
  renderizarFeedOcorrencias();

})();
