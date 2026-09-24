/**
 * gestor.js — Painel de Gestão Operacional & Frotas (ValeBus CCO)
 * ─────────────────────────────────────────────────────────────────
 * Módulo CCO para gerenciamento de motoristas (Opção A), despacho de escalas,
 * credenciamento de PIN de bordo e telemetria da frota de Santa Rita do Sapucaí.
 */

(async function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. VALIDAÇÃO DE ACESSO DO GESTOR
     ────────────────────────────────────────────────────────── */
  const EMAIL_GESTOR_OFICIAL = 'valebussrs@gmail.com';

  async function obterSessaoGestor() {
    try {
      const usuario = await window.ValeBusAPI?.obterSessaoAutenticada?.();
      return usuario?.papel === 'gestor' ? usuario : null;
    } catch (e) {
      console.warn('Erro ao verificar sessão do gestor:', e);
      return null;
    }
  }

  async function verificarPermissaoGestor() {
    const usuario = await obterSessaoGestor();
    if (!usuario) {
      window.location.replace('login.html');
      return false;
    }

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

  if (!await verificarPermissaoGestor()) {
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
      veiculo: 'Ônibus #02',
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
      veiculo: 'Ônibus #01',
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
      veiculo: 'Ônibus #03',
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
      veiculo: 'Ônibus #04',
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
      veiculo: 'Ônibus #05',
      turno: 'Tarde (13:30 - 21:30)',
      pin: '5590',
      status: 'folga',
      observacoes: 'Em escala de descanso programado.'
    },
    {
      id: 'mot-6',
      nome: 'Renato Alcantara Lima',
      matricula: 'MOT-6623',
      cpf: '614.392.105-88',
      telefone: '(35) 99182-4410',
      cnh: '06192830194',
      cnhCat: 'D',
      cnhValidade: '2027-03-14',
      linha: 'Linha Reforço José G.M',
      veiculo: 'Ônibus #06',
      turno: 'Manhã (05:30 - 13:30)',
      pin: '6623',
      status: 'ativo',
      observacoes: 'Reforço matutino de alta demanda escolar e trabalhadores via MCM.'
    },
    {
      id: 'mot-7',
      nome: 'Marcelo Antunes Prado',
      matricula: 'MOT-7712',
      cpf: '602.819.346-55',
      telefone: '(35) 98401-9922',
      cnh: '05192840192',
      cnhCat: 'D',
      cnhValidade: '2027-04-18',
      linha: 'Linha São Benedito (Hora)',
      veiculo: 'Ônibus #07',
      turno: 'Manhã (05:30 - 13:30)',
      pin: '7712',
      status: 'ativo',
      observacoes: 'Linha circular regular de hora em hora via Empresa D.L. e Usivale.'
    },
    {
      id: 'mot-8',
      nome: 'Vanderlei Soares Neves',
      matricula: 'MOT-8834',
      cpf: '719.304.516-90',
      telefone: '(35) 99872-3319',
      cnh: '07192840182',
      cnhCat: 'D',
      cnhValidade: '2028-09-22',
      linha: 'Linha São Benedito (Hora e Meia)',
      veiculo: 'Ônibus #08',
      turno: 'Tarde (13:30 - 21:30)',
      pin: '8834',
      status: 'ativo',
      observacoes: 'Linha circular com intervalos de 1h30 via Santos Dumont e Murilo.'
    }
  ];

  function obterMotoristas() {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.obterMotoristas === 'function') {
      return window.ValeBusAPI.obterMotoristas();
    }
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
    if (window.ValeBusAPI && typeof window.ValeBusAPI.salvarMotoristas === 'function') {
      return window.ValeBusAPI.salvarMotoristas(lista);
    }
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
    'Linha São Benedito (Hora e Meia)': '#db2777',
    'Linha São Benedito (Hora)': '#eab308',
    'Linha São Benedito': '#eab308'
  };

  function obterCorLinha(nomeLinha) {
    if (!nomeLinha) return '#1a6fd4';
    const l = nomeLinha.toLowerCase();
    if (l.includes('hora e meia') || (l.includes('benedito') && l.includes('meia'))) return '#db2777';
    if (l.includes('hora') || l.includes('benedito')) return '#eab308';
    if (l.includes('reforco') || l.includes('mcm')) return '#dc2626';
    if (l.includes('porto') || l.includes('sapucai')) return '#0891b2';
    if (l.includes('industrial')) return '#ea580c';
    if (l.includes('fortaleza')) return '#9333ea';
    if (l.includes('anchieta')) return '#16a34a';
    if (l.includes('fernandes')) return '#2563eb';
    for (const [chave, cor] of Object.entries(CORES_LINHAS)) {
      if (l.includes(chave.toLowerCase().replace('linha ', ''))) {
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
      let matchLinha = (filtroLinha === 'todas');
      if (!matchLinha) {
        const mLinha = (m.linha || '').toLowerCase();
        if (filtroLinha === 'São Benedito (Hora)') {
          matchLinha = mLinha.includes('hora') && !mLinha.includes('meia');
        } else if (filtroLinha === 'São Benedito (Hora e Meia)') {
          matchLinha = mLinha.includes('hora e meia') || mLinha.includes('meia');
        } else {
          matchLinha = mLinha.includes(filtroLinha.toLowerCase());
        }
      }

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
     5. RENDERIZAÇÃO DAS ESCALAS DO DIA & ATIVAÇÃO DE LINHAS
     ────────────────────────────────────────────────────────── */
  const CHAVE_STORAGE_LINHAS_ATIVAS = 'valebus_linhas_ativas';

  function obterLinhasAtivasGestor() {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.obterLinhasAtivas === 'function') {
      return window.ValeBusAPI.obterLinhasAtivas();
    }
    try {
      const salvas = localStorage.getItem(CHAVE_STORAGE_LINHAS_ATIVAS);
      if (salvas) return JSON.parse(salvas);
    } catch (e) {}
    return ['Linha Anchieta', 'Linha Fernandes', 'Linha Fortaleza'];
  }

  function salvarLinhasAtivasGestor(linhas) {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.salvarLinhasAtivas === 'function') {
      return window.ValeBusAPI.salvarLinhasAtivas(linhas);
    }
    try {
      localStorage.setItem(CHAVE_STORAGE_LINHAS_ATIVAS, JSON.stringify(linhas));
    } catch (e) {}
  }

  function ativarLinhaGestor(nomeLinha, botaoEl) {
    if (!nomeLinha) return;
    setBotaoLoading(botaoEl, true);
    setTimeout(() => {
      const ativas = obterLinhasAtivasGestor();
      if (!ativas.includes(nomeLinha)) {
        ativas.push(nomeLinha);
        salvarLinhasAtivasGestor(ativas);
      }
      setBotaoLoading(botaoEl, false);
      mostrarToast('Linha ativada com sucesso!', 'sucesso');
      renderizarEscalasDia(obterMotoristas());
    }, 350);
  }

  window.ativarLinhaGestor = ativarLinhaGestor;

  function renderizarEscalasDia(lista) {
    const grid = document.getElementById('grid-escalas-dia');
    if (!grid) return;

    const linhasAtivas = obterLinhasAtivasGestor();

    const veiculos = [
      { numero: 'Ônibus #01', linha: 'Linha Anchieta' },
      { numero: 'Ônibus #02', linha: 'Linha Fernandes' },
      { numero: 'Ônibus #03', linha: 'Linha Fortaleza' },
      { numero: 'Ônibus #04', linha: 'Linha Industrial' },
      { numero: 'Ônibus #05', linha: 'Linha Porto Sapucaí' },
      { numero: 'Ônibus #06', linha: 'Linha Reforço José G.M' },
      { numero: 'Ônibus #07', linha: 'Linha São Benedito (Hora)' },
      { numero: 'Ônibus #08', linha: 'Linha São Benedito (Hora e Meia)' }
    ];

    grid.innerHTML = veiculos.map(v => {
      const motEscalado = lista.find(m => m.veiculo.includes(v.numero) && (m.status === 'ativo' || m.status === 'viagem')) ||
                          lista.find(m => m.linha.toLowerCase().includes(v.linha.toLowerCase().replace('linha ', '')));

      const nomeMot = motEscalado ? motEscalado.nome : 'Escala em Aberto / Reserva';
      const matMot = motEscalado ? motEscalado.matricula : '—';
      const statusMot = motEscalado ? (motEscalado.status === 'viagem' ? 'Em Viagem' : 'Escalado') : 'Pendente';
      const corLinha = obterCorLinha(v.linha);
      const isLinhaAtiva = linhasAtivas.includes(v.linha);

      return `
        <div class="gestor-escala-card">
          <div class="gestor-escala-card__header">
            <span class="gestor-escala-veiculo">${v.numero}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              ${isLinhaAtiva ? '<span class="badge-linha-ativa" title="Linha ativa no sistema CCO">🟢 Ativa</span>' : ''}
              <span class="gestor-escala-linha" style="border-left: 3px solid ${corLinha};">${v.linha}</span>
            </div>
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
          <div style="display:flex; justify-content:space-between; align-items:center; font-size: 12px; gap:6px; flex-wrap:wrap;">
            <span style="color: var(--texto-secundario);">Status: <strong>${statusMot}</strong></span>
            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" class="${isLinhaAtiva ? 'btn-gestor-secundario' : 'btn-gestor-primario'}" style="padding: 4px 8px; font-size: 11px;" onclick="window.ativarLinhaGestor('${v.linha}', this)">
                ${isLinhaAtiva ? 'Reativar Linha' : 'Ativar Linha'}
              </button>
              <button type="button" class="btn-gestor-secundario" style="padding: 4px 8px; font-size: 11px;" onclick="window.abrirModalEdicao('${motEscalado?.id || ''}')">
                ${motEscalado ? 'Editar' : 'Alocar'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ──────────────────────────────────────────────────────────
     6. MÓDULO DE CHAMADOS & REPORTS DOS MOTORISTAS (NOVO)
     ────────────────────────────────────────────────────────── */
  const CHAVE_STORAGE_CHAMADOS = 'valebus_chamados_gestor';
  const CHAVE_STORAGE_SOCORRO_MOTORISTA = 'valebus_socorro_garagem';
  const CHAVE_STORAGE_OCORRENCIAS_MOTORISTA = 'valebus_ocorrencias_motorista';

  // Base inicial padrão de chamados demonstrativos realistas caso não existam reports prévios
  const CHAMADOS_PADRAO_INICIAIS = [
    {
      id: 'GAR-7419',
      categoria: 'garagem',
      titulo: 'Socorro Mecânico Acionado',
      problema: 'pneu',
      problemaTexto: 'Pneu / Rodagem',
      condicao: 'alta',
      condicaoTexto: 'Parada Imediata / Socorro Urgente',
      precisaSocorro: true,
      observacao: 'Pneu traseiro direito perdeu calibração na subida do Recanto dos Pássaros. Ônibus encostado em segurança no acostamento.',
      viatura: 'Viatura Garagem #01 (Mecânico: Carlos)',
      tempoEstimadoMin: 12,
      horaChamado: '09:42',
      statusBadge: 'Socorro Despachado',
      local: 'Av. Inatel, próximo ao Trevo',
      motorista: 'Marcos Vinicius Ramos',
      matricula: 'MOT-1042',
      veiculo: 'Ônibus #01',
      linha: 'Linha Anchieta',
      criadoEm: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      emAndamento: true
    },
    {
      id: 'TRANS-8820',
      categoria: 'transito',
      tipo: 'desvio',
      tipoTexto: 'Obras / Desvio de Itinerário',
      icone: '🚧',
      local: 'Rua Silvestre Ferraz (Centro)',
      detalhes: 'Recapeamento asfáltico pela prefeitura. Trânsito desviando pela Travessa Cel. Joaquim Neto.',
      gravidade: 'moderada',
      hora: '09:20',
      status: 'Alerta Ativo',
      motorista: 'Carlos Alberto Mendes',
      matricula: 'MOT-4821',
      veiculo: 'Ônibus #02',
      linha: 'Linha Fernandes',
      criadoEm: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      emAndamento: true
    },
    {
      id: 'GAR-4190',
      categoria: 'garagem',
      titulo: 'Manutenção Programada',
      problema: 'validador',
      problemaTexto: 'Validador / Bilhetagem',
      condicao: 'moderada',
      condicaoTexto: 'Revisar no fim da viagem',
      precisaSocorro: false,
      observacao: 'Leitor de aprovação do cartão ValeBus apresentou lentidão intermitente, reiniciado 1x.',
      viatura: 'Oficina Garagem Central',
      tempoEstimadoMin: 0,
      horaChamado: '08:50',
      statusBadge: 'Manutenção Notificada',
      local: 'Terminal Praça Urbana Carolina',
      motorista: 'Roberto Dias Silveira',
      matricula: 'MOT-3310',
      veiculo: 'Ônibus #03',
      linha: 'Linha Fortaleza',
      criadoEm: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      emAndamento: false,
      resolvidoPor: 'CCO - Suporte TI',
      resolvidoEm: '09:10'
    }
  ];

  function obterChamadosGestor() {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.obterOcorrencias === 'function') {
      return window.ValeBusAPI.obterOcorrencias();
    }
    let lista = [];
    try {
      const salvos = localStorage.getItem(CHAVE_STORAGE_CHAMADOS);
      if (salvos) {
        lista = JSON.parse(salvos);
      }
    } catch (e) {
      console.warn('Erro ao carregar chamados do storage:', e);
    }

    // Se estiver vazio, popula com os padrões
    if (!lista || lista.length === 0) {
      lista = [...CHAMADOS_PADRAO_INICIAIS];
      salvarChamadosGestor(lista);
    }

    return lista;
  }

  function salvarChamadosGestor(lista) {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.salvarOcorrencias === 'function') {
      return window.ValeBusAPI.salvarOcorrencias(lista);
    }
    return false;
  }

  let chamadoSelecionadoAtual = null;

  function renderizarPainelChamados() {
    const container = document.getElementById('grid-chamados-motoristas');
    if (!container) return;

    const lista = obterChamadosGestor();
    const termoBusca = (document.getElementById('input-busca-chamados')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('filtro-tipo-chamado')?.value || 'todos';
    const filtroUrgencia = document.getElementById('filtro-urgencia-chamado')?.value || 'todos';

    // Filtragem
    const filtrados = lista.filter(item => {
      const matchBusca = !termoBusca ||
        (item.id && item.id.toLowerCase().includes(termoBusca)) ||
        (item.motorista && item.motorista.toLowerCase().includes(termoBusca)) ||
        (item.matricula && item.matricula.toLowerCase().includes(termoBusca)) ||
        (item.veiculo && item.veiculo.toLowerCase().includes(termoBusca)) ||
        (item.linha && item.linha.toLowerCase().includes(termoBusca)) ||
        (item.problemaTexto && item.problemaTexto.toLowerCase().includes(termoBusca)) ||
        (item.tipoTexto && item.tipoTexto.toLowerCase().includes(termoBusca)) ||
        (item.local && item.local.toLowerCase().includes(termoBusca)) ||
        (item.observacao && item.observacao.toLowerCase().includes(termoBusca)) ||
        (item.detalhes && item.detalhes.toLowerCase().includes(termoBusca));

      const matchTipo = filtroTipo === 'todos' || item.categoria === filtroTipo;

      let gravidadeItem = item.condicao || item.gravidade || 'baixa';
      const matchUrgencia = filtroUrgencia === 'todos' || gravidadeItem === filtroUrgencia;

      return matchBusca && matchTipo && matchUrgencia;
    });

    // Atualiza contadores dos mini-cards e badge da aba
    const pendentes = lista.filter(c => c.emAndamento !== false).length;
    const socorros = lista.filter(c => c.precisaSocorro && c.emAndamento !== false).length;
    const transitos = lista.filter(c => c.categoria === 'transito' && c.emAndamento !== false).length;
    const resolvidos = lista.filter(c => c.emAndamento === false).length;

    const elStatPendentes = document.getElementById('stat-chamados-pendentes');
    const elStatSocorro = document.getElementById('stat-chamados-socorro');
    const elStatTransito = document.getElementById('stat-chamados-transito');
    const elStatResolvidos = document.getElementById('stat-chamados-resolvidos');
    const badgeAbaChamados = document.getElementById('badge-total-chamados');

    if (elStatPendentes) elStatPendentes.textContent = pendentes;
    if (elStatSocorro) elStatSocorro.textContent = socorros;
    if (elStatTransito) elStatTransito.textContent = transitos;
    if (elStatResolvidos) elStatResolvidos.textContent = resolvidos;
    if (badgeAbaChamados) {
      badgeAbaChamados.textContent = pendentes;
      badgeAbaChamados.style.display = pendentes > 0 ? 'inline-block' : 'none';
    }

    if (filtrados.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--fundo-card); border: 1px dashed var(--borda-cor); border-radius: var(--raio-medio);">
          <div style="font-size: 32px; margin-bottom: 10px;">✨</div>
          <h4 style="font-size: 15px; font-weight: 700; color: var(--texto-principal); margin-bottom: 6px;">Nenhum report encontrado</h4>
          <p style="font-size: 13px; color: var(--texto-secundario); max-width: 440px; margin: 0 auto 16px;">Não há ocorrências ou relatos de problemas de bordo pendentes com os filtros selecionados.</p>
          <button type="button" class="btn-gestor-secundario" id="btn-limpar-filtros-chamados" style="margin: 0 auto;">Limpar Filtros</button>
        </div>
      `;

      const btnLimpar = document.getElementById('btn-limpar-filtros-chamados');
      if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
          if (document.getElementById('input-busca-chamados')) document.getElementById('input-busca-chamados').value = '';
          if (document.getElementById('filtro-tipo-chamado')) document.getElementById('filtro-tipo-chamado').value = 'todos';
          if (document.getElementById('filtro-urgencia-chamado')) document.getElementById('filtro-urgencia-chamado').value = 'todos';
          renderizarPainelChamados();
        });
      }
      return;
    }

    container.innerHTML = filtrados.map(item => {
      const ehGaragem = item.categoria === 'garagem';
      const icone = ehGaragem ? (item.precisaSocorro ? '🚚' : '🔧') : (item.icone || '🚦');
      const gravidade = item.condicao || item.gravidade || 'baixa';
      const tituloPrincipal = ehGaragem ? (item.problemaTexto || item.titulo || 'Falha Mecânica') : (item.tipoTexto || 'Alerta de Trânsito');
      const resolvida = item.emAndamento === false;

      let classeBorda = 'gestor-chamado-card--baixa';
      let classeBadge = 'gestor-chamado-badge--baixa';
      let textoBadge = 'Preventivo';

      if (resolvida) {
        classeBorda = 'gestor-chamado-card--resolvido';
        classeBadge = 'gestor-chamado-badge--resolvido';
        textoBadge = 'Atendido / Concluído';
      } else if (gravidade === 'alta') {
        classeBorda = 'gestor-chamado-card--urgente';
        classeBadge = 'gestor-chamado-badge--urgente';
        textoBadge = 'Socorro Urgente';
      } else if (gravidade === 'moderada') {
        classeBorda = 'gestor-chamado-card--moderada';
        classeBadge = 'gestor-chamado-badge--moderada';
        textoBadge = 'Revisão Necessária';
      }

      const descricaoTexto = (ehGaragem ? item.observacao : item.detalhes) || 'Nenhum detalhe adicional inserido pelo motorista.';
      const horaExibida = item.horaChamado || item.hora || 'Recente';

      return `
        <div class="gestor-chamado-card ${classeBorda}" data-id="${item.id}">
          <div class="gestor-chamado-card__topo">
            <div class="gestor-chamado-card__ident">
              <div class="gestor-chamado-card__icone ${ehGaragem ? 'gestor-chamado-card__icone--garagem' : 'gestor-chamado-card__icone--transito'}">
                ${icone}
              </div>
              <div class="gestor-chamado-card__titulos">
                <span class="gestor-chamado-card__titulo">${tituloPrincipal}</span>
                <span class="gestor-chamado-card__sub">${item.id} • ${ehGaragem ? 'Report de Bordo / Garagem' : 'Tráfego & Trânsito'}</span>
              </div>
            </div>
            <span class="gestor-chamado-badge ${classeBadge}">
              ${textoBadge}
            </span>
          </div>

          <div class="gestor-chamado-card__metas">
            <div class="gestor-chamado-meta-item">
              <span class="gestor-chamado-meta-rotulo">Motorista</span>
              <span class="gestor-chamado-meta-valor" title="${item.motorista || 'Condutor ValeBus'}">${item.motorista || 'João Silva'} (${item.matricula || 'MOT-104'})</span>
            </div>
            <div class="gestor-chamado-meta-item">
              <span class="gestor-chamado-meta-rotulo">Veículo & Linha</span>
              <span class="gestor-chamado-meta-valor" title="${item.veiculo || 'Ônibus #02'} - ${item.linha || 'Linha Anchieta'}">${item.veiculo || 'Ônibus #02'} • ${item.linha || 'Linha Anchieta'}</span>
            </div>
            <div class="gestor-chamado-meta-item gestor-chamado-meta-item--localizacao">
              <span class="gestor-chamado-meta-rotulo">Localização Informada</span>
              <span class="gestor-chamado-meta-valor" title="${item.local || 'Itinerário Regular'}">📍 ${item.local || 'Itinerário Regular'}</span>
            </div>
          </div>

          <div class="gestor-chamado-card__descricao">
            <strong>Relato:</strong> ${descricaoTexto}
          </div>

          ${ehGaragem && item.viatura ? `
            <div style="font-size: 11.5px; color: var(--texto-secundario); background: var(--fundo-campo); padding: 6px 10px; border-radius: var(--raio-pequeno); display: flex; align-items: center; justify-content: space-between;">
              <span><strong>Apoio Garagem:</strong> ${item.viatura}</span>
              ${item.tempoEstimadoMin ? `<span style="font-weight: 700; color: #d97706;">~${item.tempoEstimadoMin} min</span>` : ''}
            </div>
          ` : ''}

          <div class="gestor-chamado-card__rodape">
            <div class="gestor-chamado-card__tempo">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Enviado às <strong>${horaExibida}</strong></span>
            </div>

            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-gestor-secundario" style="padding: 5px 9px; font-size: 11.5px;" onclick="window.abrirModalDetalhesChamado('${item.id}')">
                Ver Detalhes
              </button>
              ${!resolvida ? `
                <button type="button" class="btn-gestor-primario" style="padding: 5px 9px; font-size: 11.5px; background: #16a34a; border-color: #16a34a;" onclick="window.concluirChamadoGestor('${item.id}')" title="Marcar como atendido/resolvido">
                  Concluir
                </button>
              ` : `
                <button type="button" class="btn-gestor-secundario" style="padding: 5px 9px; font-size: 11.5px; color: #2563eb;" onclick="window.reabrirChamadoGestor('${item.id}')" title="Reabrir chamado">
                  Reabrir
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Janela Modal com os detalhes completos do chamado
  const modalDetalhesChamado = document.getElementById('modal-detalhes-chamado');
  const btnFecharModalChamado = document.getElementById('btn-fechar-modal-chamado');
  const btnFecharChamadoRodape = document.getElementById('btn-fechar-chamado-rodape');
  const btnResolverChamadoModal = document.getElementById('btn-resolver-chamado-modal');
  const btnDespacharApoioChamado = document.getElementById('btn-despachar-apoio-chamado');

  function abrirModalDetalhesChamado(idChamado) {
    const lista = obterChamadosGestor();
    const item = lista.find(c => c.id === idChamado);
    if (!item || !modalDetalhesChamado) return;

    chamadoSelecionadoAtual = item;

    const elTitulo = document.getElementById('modal-chamado-titulo');
    const elSub = document.getElementById('modal-chamado-subtitulo');
    const elCorpo = document.getElementById('modal-chamado-corpo');
    const elIconeWrap = document.getElementById('modal-chamado-icone-wrap');

    const ehGaragem = item.categoria === 'garagem';
    const icone = ehGaragem ? (item.precisaSocorro ? '🚚' : '🔧') : (item.icone || '🚦');

    if (elTitulo) elTitulo.textContent = `Report do Motorista #${item.id}`;
    if (elSub) elSub.textContent = `Enviado por ${item.motorista || 'Motorista'} (${item.matricula || 'MOT-104'}) • ${item.horaChamado || item.hora || 'Recente'}`;
    if (elIconeWrap) {
      elIconeWrap.textContent = icone;
      elIconeWrap.style.background = ehGaragem ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.12)';
    }

    const gravidade = item.condicao || item.gravidade || 'baixa';
    const gravidadeTexto = gravidade === 'alta' ? '🚨 Alta Urgência / Parada Imediata' : (gravidade === 'moderada' ? '⚠️ Moderada / Revisão no Final da Viagem' : 'ℹ️ Baixa / Informativo Preventivo');

    if (elCorpo) {
      elCorpo.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Card de Destaque -->
          <div style="background: var(--fundo-campo); border: 1px solid var(--borda-cor); border-radius: var(--raio-medio); padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--texto-secundario);">Classificação da Ocorrência</span>
              <span class="gestor-chamado-badge ${item.emAndamento === false ? 'gestor-chamado-badge--resolvido' : (gravidade === 'alta' ? 'gestor-chamado-badge--urgente' : (gravidade === 'moderada' ? 'gestor-chamado-badge--moderada' : 'gestor-chamado-badge--baixa'))}">
                ${item.emAndamento === false ? 'Atendido / Concluído' : (item.statusBadge || item.status || 'Ativo')}
              </span>
            </div>
            <div style="font-size: 16px; font-weight: 700; color: var(--texto-principal); margin-bottom: 4px;">
              ${ehGaragem ? (item.problemaTexto || 'Falha Técnica no Veículo') : (item.tipoTexto || 'Alerta na Pista')}
            </div>
            <div style="font-size: 12.5px; color: var(--texto-secundario);">
              Gravidade reportada: <strong>${gravidadeTexto}</strong>
            </div>
          </div>

          <!-- Metadados de Bordo -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            <div style="background: var(--fundo-card); border: 1px solid var(--borda-cor); border-radius: var(--raio-pequeno); padding: 10px 12px;">
              <span style="font-size: 10px; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase;">Condutor em Rota</span>
              <div style="font-size: 13px; font-weight: 600; color: var(--texto-principal); margin-top: 2px;">${item.motorista || 'João Silva'}</div>
              <div style="font-size: 11px; color: var(--texto-secundario);">Matrícula: ${item.matricula || 'MOT-104'}</div>
            </div>

            <div style="background: var(--fundo-card); border: 1px solid var(--borda-cor); border-radius: var(--raio-pequeno); padding: 10px 12px;">
              <span style="font-size: 10px; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase;">Veículo & Escala</span>
              <div style="font-size: 13px; font-weight: 600; color: var(--texto-principal); margin-top: 2px;">${item.veiculo || 'Ônibus #02'}</div>
              <div style="font-size: 11px; color: var(--texto-secundario);">${item.linha || 'Linha Anchieta'}</div>
            </div>

            <div style="background: var(--fundo-card); border: 1px solid var(--borda-cor); border-radius: var(--raio-pequeno); padding: 10px 12px; grid-column: 1 / -1;">
              <span style="font-size: 10px; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase;">Localização do Ônibus (GPS)</span>
              <div style="font-size: 13px; font-weight: 600; color: var(--cor-marca); margin-top: 2px;">📍 ${item.local || 'Av. Inatel, Centro'}</div>
            </div>
          </div>

          <!-- Mensagem e Relato do Motorista -->
          <div style="background: var(--fundo-card); border: 1px solid var(--borda-cor); border-radius: var(--raio-pequeno); padding: 12px 14px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--texto-secundario); display: block; margin-bottom: 6px;">Descrição Enviada pelo Condutor:</span>
            <p style="font-size: 13.5px; line-height: 1.5; color: var(--texto-principal); margin: 0; white-space: pre-wrap;">${item.observacao || item.detalhes || 'Sem detalhes digitados.'}</p>
          </div>

          ${item.viatura ? `
            <div style="background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.25); border-radius: var(--raio-pequeno); padding: 12px 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <strong style="font-size: 13px; color: #b45309;">Viatura / Apoio Técnico Notificado:</strong>
                  <div style="font-size: 12px; color: var(--texto-principal); margin-top: 2px;">${item.viatura}</div>
                </div>
                ${item.tempoEstimadoMin ? `<span style="font-weight: 800; font-size: 14px; color: #d97706;">~${item.tempoEstimadoMin} min</span>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    if (btnResolverChamadoModal) {
      if (item.emAndamento === false) {
        btnResolverChamadoModal.innerHTML = '<span>🔄 Reabrir Chamado</span>';
        btnResolverChamadoModal.style.background = '#2563eb';
        btnResolverChamadoModal.style.borderColor = '#2563eb';
      } else {
        btnResolverChamadoModal.innerHTML = '<span>✅ Concluir Atendimento</span>';
        btnResolverChamadoModal.style.background = '#16a34a';
        btnResolverChamadoModal.style.borderColor = '#16a34a';
      }
    }

    modalDetalhesChamado.classList.add('ativo');
    modalDetalhesChamado.setAttribute('aria-hidden', 'false');
  }

  function fecharModalDetalhesChamado() {
    if (!modalDetalhesChamado) return;
    modalDetalhesChamado.classList.remove('ativo');
    modalDetalhesChamado.setAttribute('aria-hidden', 'true');
    chamadoSelecionadoAtual = null;
  }

  function concluirChamadoGestor(idChamado) {
    const lista = obterChamadosGestor();
    const item = lista.find(c => c.id === idChamado);
    if (!item) return;

    item.emAndamento = false;
    item.statusBadge = 'Atendido / Concluído';
    item.status = 'Concluído';
    item.resolvidoPor = 'CCO - Gestor Operacional';
    item.resolvidoEm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    salvarChamadosGestor(lista);

    // Também sincroniza se for o socorro de garagem ativo.
    const socorroAtivo = window.ValeBusAPI.obterSocorroGaragem();
    if (socorroAtivo?.id === idChamado) {
      window.ValeBusAPI.limparSocorroGaragem();
    }

    mostrarToast(`Chamado #${idChamado} marcado como atendido pelo CCO!`, 'sucesso');
    renderizarPainelChamados();
    fecharModalDetalhesChamado();
  }

  function reabrirChamadoGestor(idChamado) {
    const lista = obterChamadosGestor();
    const item = lista.find(c => c.id === idChamado);
    if (!item) return;

    item.emAndamento = true;
    item.statusBadge = item.precisaSocorro ? 'Socorro Despachado' : 'Alerta Registrado';
    item.status = 'Alerta Ativo';
    delete item.resolvidoPor;
    delete item.resolvidoEm;

    salvarChamadosGestor(lista);
    mostrarToast(`Chamado #${idChamado} reaberto no CCO.`, 'sucesso');
    renderizarPainelChamados();
    fecharModalDetalhesChamado();
  }

  window.abrirModalDetalhesChamado = abrirModalDetalhesChamado;
  window.concluirChamadoGestor = concluirChamadoGestor;
  window.reabrirChamadoGestor = reabrirChamadoGestor;

  if (btnFecharModalChamado) btnFecharModalChamado.addEventListener('click', fecharModalDetalhesChamado);
  if (btnFecharChamadoRodape) btnFecharChamadoRodape.addEventListener('click', fecharModalDetalhesChamado);
  if (modalDetalhesChamado) {
    modalDetalhesChamado.addEventListener('click', (e) => {
      if (e.target === modalDetalhesChamado) fecharModalDetalhesChamado();
    });
  }

  if (btnResolverChamadoModal) {
    btnResolverChamadoModal.addEventListener('click', () => {
      if (!chamadoSelecionadoAtual) return;
      if (chamadoSelecionadoAtual.emAndamento === false) {
        reabrirChamadoGestor(chamadoSelecionadoAtual.id);
      } else {
        concluirChamadoGestor(chamadoSelecionadoAtual.id);
      }
    });
  }

  if (btnDespacharApoioChamado) {
    btnDespacharApoioChamado.addEventListener('click', () => {
      if (!chamadoSelecionadoAtual) return;
      chamadoSelecionadoAtual.precisaSocorro = true;
      chamadoSelecionadoAtual.condicao = 'alta';
      chamadoSelecionadoAtual.condicaoTexto = 'Parada Imediata / Socorro Urgente';
      chamadoSelecionadoAtual.statusBadge = 'Socorro Despachado';
      chamadoSelecionadoAtual.viatura = 'Viatura Móvel de Apoio Garagem #02 (Técnico: Rodrigo)';
      chamadoSelecionadoAtual.tempoEstimadoMin = 10;
      
      const lista = obterChamadosGestor();
      const idx = lista.findIndex(c => c.id === chamadoSelecionadoAtual.id);
      if (idx !== -1) {
        lista[idx] = chamadoSelecionadoAtual;
        salvarChamadosGestor(lista);
      }

      mostrarToast(`Viatura de apoio mecânico despachada para o chamado #${chamadoSelecionadoAtual.id}!`, 'sucesso');
      renderizarPainelChamados();
      abrirModalDetalhesChamado(chamadoSelecionadoAtual.id);
    });
  }

  // Botões de filtro e busca do painel de chamados
  const inputBuscaChamados = document.getElementById('input-busca-chamados');
  const filtroTipoChamado = document.getElementById('filtro-tipo-chamado');
  const filtroUrgenciaChamado = document.getElementById('filtro-urgencia-chamado');
  const btnAtualizarChamados = document.getElementById('btn-atualizar-chamados');
  const btnSimularReport = document.getElementById('btn-simular-report-demo');

  if (inputBuscaChamados) inputBuscaChamados.addEventListener('input', renderizarPainelChamados);
  if (filtroTipoChamado) filtroTipoChamado.addEventListener('change', renderizarPainelChamados);
  if (filtroUrgenciaChamado) filtroUrgenciaChamado.addEventListener('change', renderizarPainelChamados);
  if (btnAtualizarChamados) {
    btnAtualizarChamados.addEventListener('click', () => {
      renderizarPainelChamados();
      mostrarToast('Fila de chamados sincronizada com os terminais de bordo!');
    });
  }

  if (btnSimularReport) {
    btnSimularReport.addEventListener('click', () => {
      setBotaoLoading(btnSimularReport, true);

      setTimeout(() => {
        const falhasExemplo = [
          { prob: 'motor', texto: 'Motor / Temperatura', desc: 'Luz de advertência de arrefecimento acendeu na subida do Inatel.', urg: 'alta', viat: true },
          { prob: 'freio', texto: 'Freio / Ar Comprimido', desc: 'Perda gradual de pressão de ar no circuito secundário.', urg: 'alta', viat: true },
          { prob: 'acessibilidade', texto: 'Elevador Cadeirante', desc: 'Mecanismo da trava emperrou na Parada 4.', urg: 'moderada', viat: false },
          { prob: 'portas', texto: 'Portas / Janelas', desc: 'Sensor de fechamento da porta central com mau contato intermitente.', urg: 'baixa', viat: false }
        ];
        const rand = falhasExemplo[Math.floor(Math.random() * falhasExemplo.length)];
        const agora = new Date();
        const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
        const idSimulado = `GAR-${Math.floor(1000 + Math.random() * 9000)}`;

        const novoReport = {
          id: idSimulado,
          categoria: 'garagem',
          titulo: rand.urg === 'alta' ? 'Socorro Mecânico Acionado' : 'Problema Notificado à Garagem',
          problema: rand.prob,
          problemaTexto: rand.texto,
          condicao: rand.urg,
          condicaoTexto: rand.urg === 'alta' ? 'Parada Imediata / Socorro Urgente' : 'Revisar no fim da viagem',
          precisaSocorro: rand.viat,
          observacao: rand.desc,
          viatura: rand.viat ? 'Viatura Garagem #01 (Mecânico: Carlos)' : null,
          tempoEstimadoMin: rand.viat ? 15 : null,
          horaChamado: hora,
          statusBadge: rand.viat ? 'Socorro Despachado' : 'Alerta Registrado',
          local: 'Praça Urbana Carolina, Centro',
          motorista: 'João Silva',
          matricula: 'MOT-104',
          veiculo: 'Ônibus #02',
          linha: 'Linha Anchieta',
          criadoEm: agora.toISOString(),
          emAndamento: true
        };

        const lista = obterChamadosGestor();
        lista.unshift(novoReport);
        salvarChamadosGestor(lista);

        // Espelha o socorro para o motorista pela camada de serviços.
        window.ValeBusAPI.salvarSocorroGaragem(novoReport);

        setBotaoLoading(btnSimularReport, false);
        mostrarToast('Ocorrência registrada com sucesso!', 'sucesso');
        renderizarPainelChamados();
      }, 350);
    });
  }

  // Listener global de storage para sincronizar chamados em tempo real quando enviados de outra aba
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_STORAGE_CHAMADOS || e.key === CHAVE_STORAGE_SOCORRO_MOTORISTA || e.key === CHAVE_STORAGE_OCORRENCIAS_MOTORISTA) {
      renderizarPainelChamados();
      renderizarFeedOcorrencias();
    }
  });

  /* ──────────────────────────────────────────────────────────
     7. FEED DE OCORRÊNCIAS E TELEMETRIA
     ────────────────────────────────────────────────────────── */
  function renderizarFeedOcorrencias() {
    const container = document.getElementById('lista-feed-ocorrencias');
    if (!container) return;

    // Busca chamados e reports reais enviados pelos motoristas
    const chamados = obterChamadosGestor();
    const chamadosAtivos = chamados.slice(0, 8);

    const ocorrenciasBase = [
      {
        hora: 'Agora',
        tipo: 'telemetria',
        titulo: 'Telemetria do Cockpit Ativa',
        desc: 'Ônibus #02 (Linha Fernandes) sincronizado com o GPS e terminal de bordo.',
        cor: 'var(--cor-marca)'
      },
      {
        hora: 'Há 45 min',
        tipo: 'info',
        titulo: 'Início de Viagem — Turno Operacional',
        desc: 'Motorista Carlos Mendes (MOT-4821) efetuou login no terminal de bordo do veículo 102.',
        cor: 'var(--cor-marca)'
      },
      {
        hora: 'Há 2h',
        tipo: 'info',
        titulo: 'Abertura da Central CCO',
        desc: 'Supervisão iniciada por Gestor CCO (valebussrs@gmail.com). Escala validada.',
        cor: 'var(--cor-marca)'
      }
    ];

    // Converte os chamados do motorista em itens de feed destacados
    const itensChamadosFeed = chamadosAtivos.map(c => {
      const ehGaragem = c.categoria === 'garagem';
      const gravidade = c.condicao || c.gravidade || 'baixa';
      const corBolinha = c.emAndamento === false ? '#16a34a' : (gravidade === 'alta' ? '#dc2626' : (gravidade === 'moderada' ? '#d97706' : '#2563eb'));
      const tituloFeed = ehGaragem
        ? `[${c.veiculo || 'Ônibus'}] Relato: ${c.problemaTexto || 'Falha Mecânica'}`
        : `[Trânsito] ${c.tipoTexto || 'Alerta de Tráfego'}`;
      const descFeed = `Motorista ${c.motorista || 'Condutor'} (${c.matricula || 'MOT-104'}): "${c.observacao || c.detalhes || 'Sem observações'}" — Local: ${c.local || 'Itinerário'}`;

      return {
        id: c.id,
        hora: c.horaChamado || c.hora || 'Hoje',
        titulo: tituloFeed,
        desc: descFeed,
        cor: corBolinha,
        clicavel: true
      };
    });

    const listaFinal = [...itensChamadosFeed, ...ocorrenciasBase];

    container.innerHTML = listaFinal.map(o => `
      <div style="background: var(--fundo-campo); border-radius: var(--raio-pequeno); padding: 12px 14px; display: flex; align-items: flex-start; gap: 12px; ${o.clicavel ? 'cursor: pointer; transition: background 0.15s ease;' : ''}" ${o.clicavel ? `onclick="window.abrirModalDetalhesChamado('${o.id}')"` : ''}>
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${o.cor}; margin-top: 5px; flex-shrink: 0; box-shadow: 0 0 6px ${o.cor}55;"></div>
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
     ESTADOS VISUAIS DE AÇÃO (LOADING / SPINNERS)
     ────────────────────────────────────────────────────────── */
  function setBotaoLoading(btn, estaCarregando) {
    if (!btn) return;
    if (estaCarregando) {
      if (!btn.dataset.textoOriginal) {
        btn.dataset.textoOriginal = btn.innerHTML;
      }
      btn.classList.add('btn-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.textoOriginal) {
        btn.innerHTML = btn.dataset.textoOriginal;
        delete btn.dataset.textoOriginal;
      }
    }
  }

  window.setBotaoLoading = setBotaoLoading;

  /* ──────────────────────────────────────────────────────────
     MÁSCARAS E VALIDAÇÕES (CPF, TELEFONE, CNH)
     ────────────────────────────────────────────────────────── */
  function formatarCPF(valor) {
    let v = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      return v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    return v;
  }

  function validarCPF(cpfFormatadoOuLimpo) {
    const limpo = (cpfFormatadoOuLimpo || '').replace(/\D/g, '');
    if (!limpo) return true; // campo opcional quando em branco
    if (limpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(limpo)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let dig1 = resto >= 10 ? 0 : resto;
    if (dig1 !== parseInt(limpo.charAt(9), 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let dig2 = resto >= 10 ? 0 : resto;
    return dig2 === parseInt(limpo.charAt(10), 10);
  }

  function formatarTelefone(valor) {
    let v = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }
    return v;
  }

  function validarTelefone(telFormatadoOuLimpo) {
    const limpo = (telFormatadoOuLimpo || '').replace(/\D/g, '');
    if (!limpo) return true;
    if (limpo.length < 10 || limpo.length > 11) return false;
    if (/^(\d)\1+$/.test(limpo)) return false;

    const ddd = parseInt(limpo.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) return false;
    if (limpo.length === 11 && limpo.charAt(2) !== '9') return false;
    return true;
  }

  function formatarCNH(valor) {
    return (valor || '').replace(/\D/g, '').slice(0, 11);
  }

  function validarCNH(cnhFormatadaOuLimpa) {
    const limpo = (cnhFormatadaOuLimpa || '').replace(/\D/g, '');
    if (!limpo) return true;
    if (limpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(limpo)) return false;
    return true;
  }

  function mostrarErroCampo(inputEl, spanErroEl, mensagem) {
    if (inputEl) {
      inputEl.classList.add('is-invalid', 'gestor-form-input--invalido', 'campo-shake');
      setTimeout(() => inputEl.classList.remove('campo-shake'), 350);
    }
    if (spanErroEl) {
      spanErroEl.textContent = mensagem;
      spanErroEl.classList.add('ativo');
    }
  }

  function limparErroCampo(inputEl, spanErroEl) {
    if (inputEl) {
      inputEl.classList.remove('is-invalid', 'gestor-form-input--invalido');
    }
    if (spanErroEl) {
      spanErroEl.textContent = '';
      spanErroEl.classList.remove('ativo');
    }
  }

  function limparTodosErrosModal() {
    const inputs = modal?.querySelectorAll('.is-invalid, .gestor-form-input--invalido') || [];
    inputs.forEach(el => el.classList.remove('is-invalid', 'gestor-form-input--invalido', 'campo-shake'));
    const erros = modal?.querySelectorAll('.gestor-form-msg-erro') || [];
    erros.forEach(el => {
      el.textContent = '';
      el.classList.remove('ativo');
    });
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

  // Listeners de máscaras e checagem em tempo real
  const inputMotNome = document.getElementById('form-mot-nome');
  const spanErroMotNome = document.getElementById('erro-mot-nome');
  if (inputMotNome) {
    inputMotNome.addEventListener('input', () => {
      if (inputMotNome.value.trim().length >= 3) {
        limparErroCampo(inputMotNome, spanErroMotNome);
      }
    });
  }

  const inputMotMatricula = document.getElementById('form-mot-matricula');
  const spanErroMotMatricula = document.getElementById('erro-mot-matricula');
  if (inputMotMatricula) {
    inputMotMatricula.addEventListener('input', () => {
      if (inputMotMatricula.value.trim().length >= 3) {
        limparErroCampo(inputMotMatricula, spanErroMotMatricula);
      }
    });
  }

  const inputMotPin = document.getElementById('form-mot-pin');
  const spanErroMotPin = document.getElementById('erro-mot-pin');
  if (inputMotPin) {
    inputMotPin.addEventListener('input', () => {
      inputMotPin.value = inputMotPin.value.replace(/\D/g, '').slice(0, 6);
      if (inputMotPin.value.length >= 4) {
        limparErroCampo(inputMotPin, spanErroMotPin);
      }
    });
  }

  const inputMotCpf = document.getElementById('form-mot-cpf');
  const spanErroMotCpf = document.getElementById('erro-mot-cpf');
  if (inputMotCpf) {
    inputMotCpf.addEventListener('input', () => {
      inputMotCpf.value = formatarCPF(inputMotCpf.value);
      if (inputMotCpf.value.length === 14) {
        if (!validarCPF(inputMotCpf.value)) {
          mostrarErroCampo(inputMotCpf, spanErroMotCpf, 'CPF inválido. Verifique os dígitos digitados.');
        } else {
          limparErroCampo(inputMotCpf, spanErroMotCpf);
        }
      } else if (inputMotCpf.value.length === 0) {
        limparErroCampo(inputMotCpf, spanErroMotCpf);
      }
    });
    inputMotCpf.addEventListener('blur', () => {
      if (inputMotCpf.value.length > 0 && !validarCPF(inputMotCpf.value)) {
        mostrarErroCampo(inputMotCpf, spanErroMotCpf, 'CPF inválido. Formato esperado: 000.000.000-00.');
      }
    });
  }

  const inputMotTelefone = document.getElementById('form-mot-telefone');
  const spanErroMotTelefone = document.getElementById('erro-mot-telefone');
  if (inputMotTelefone) {
    inputMotTelefone.addEventListener('input', () => {
      inputMotTelefone.value = formatarTelefone(inputMotTelefone.value);
      if (inputMotTelefone.value.length >= 14) {
        if (!validarTelefone(inputMotTelefone.value)) {
          mostrarErroCampo(inputMotTelefone, spanErroMotTelefone, 'Telefone inválido. Formato: (35) 99999-0000.');
        } else {
          limparErroCampo(inputMotTelefone, spanErroMotTelefone);
        }
      } else if (inputMotTelefone.value.length === 0) {
        limparErroCampo(inputMotTelefone, spanErroMotTelefone);
      }
    });
    inputMotTelefone.addEventListener('blur', () => {
      if (inputMotTelefone.value.length > 0 && !validarTelefone(inputMotTelefone.value)) {
        mostrarErroCampo(inputMotTelefone, spanErroMotTelefone, 'Telefone inválido. Formato esperado: (35) 99999-0000.');
      }
    });
  }

  const inputMotCnh = document.getElementById('form-mot-cnh');
  const spanErroMotCnh = document.getElementById('erro-mot-cnh');
  if (inputMotCnh) {
    inputMotCnh.addEventListener('input', () => {
      inputMotCnh.value = formatarCNH(inputMotCnh.value);
      if (inputMotCnh.value.length === 11) {
        if (!validarCNH(inputMotCnh.value)) {
          mostrarErroCampo(inputMotCnh, spanErroMotCnh, 'Número de CNH inválido.');
        } else {
          limparErroCampo(inputMotCnh, spanErroMotCnh);
        }
      } else if (inputMotCnh.value.length === 0) {
        limparErroCampo(inputMotCnh, spanErroMotCnh);
      }
    });
    inputMotCnh.addEventListener('blur', () => {
      if (inputMotCnh.value.length > 0 && !validarCNH(inputMotCnh.value)) {
        mostrarErroCampo(inputMotCnh, spanErroMotCnh, 'CNH deve conter exatamente 11 dígitos numéricos.');
      }
    });
  }

  const inputMotValidade = document.getElementById('form-mot-cnh-validade');
  const spanErroMotValidade = document.getElementById('erro-mot-cnh-validade');
  if (inputMotValidade) {
    inputMotValidade.addEventListener('change', () => {
      if (inputMotValidade.value) {
        limparErroCampo(inputMotValidade, spanErroMotValidade);
      }
    });
  }

  function abrirModal(idMotorista) {
    if (!modal) return;
    limparTodosErrosModal();

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
        if (inputCpf) inputCpf.value = formatarCPF(mot.cpf || '');
        if (inputTelefone) inputTelefone.value = formatarTelefone(mot.telefone || '');
        if (inputCnh) inputCnh.value = formatarCNH(mot.cnh || '');
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
    limparTodosErrosModal();
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
      if (input) {
        input.value = gerarMatriculaAleatoria();
        limparErroCampo(input, spanErroMotMatricula);
      }
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

  // Submissão do Formulário com Validação Estrita e Feedback Visual
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

      limparTodosErrosModal();
      let temErros = false;
      let primeiroCampoInvalido = null;

      // 1. Validação de campos obrigatórios
      if (!nome || nome.length < 3) {
        mostrarErroCampo(inputMotNome, spanErroMotNome, 'Nome completo é obrigatório (mínimo 3 caracteres).');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotNome;
      }

      if (!matricula || matricula.length < 3) {
        mostrarErroCampo(inputMotMatricula, spanErroMotMatricula, 'Matrícula operacional é obrigatória.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotMatricula;
      }

      if (!pin || pin.length < 4 || pin.length > 6 || !/^\d{4,6}$/.test(pin)) {
        mostrarErroCampo(inputMotPin, spanErroMotPin, 'PIN de bordo deve conter de 4 a 6 dígitos numéricos.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotPin;
      }

      if (!cnhValidade) {
        mostrarErroCampo(inputMotValidade, spanErroMotValidade, 'Validade da CNH é obrigatória para a escala.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotValidade;
      }

      // 2. Validação de formato (CPF, Telefone, CNH)
      if (cpf && !validarCPF(cpf)) {
        mostrarErroCampo(inputMotCpf, spanErroMotCpf, 'CPF inválido. Verifique os dígitos informados.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotCpf;
      }

      if (telefone && !validarTelefone(telefone)) {
        mostrarErroCampo(inputMotTelefone, spanErroMotTelefone, 'Telefone inválido. Formato esperado: (35) 99999-0000.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotTelefone;
      }

      if (cnh && !validarCNH(cnh)) {
        mostrarErroCampo(inputMotCnh, spanErroMotCnh, 'Número da CNH deve ter exatamente 11 dígitos numéricos.');
        temErros = true;
        if (!primeiroCampoInvalido) primeiroCampoInvalido = inputMotCnh;
      }

      // Bloqueio se houver qualquer erro de formulário
      if (temErros) {
        mostrarToast('Preencha os campos obrigatórios destacados corretamente.', 'alerta');
        if (primeiroCampoInvalido) {
          primeiroCampoInvalido.focus();
        }
        return; // Interrompe! Evita gravar dados inválidos no localStorage
      }

      const btnSalvar = document.getElementById('btn-salvar-motorista');
      setBotaoLoading(btnSalvar, true);

      setTimeout(() => {
        const lista = obterMotoristas();

        if (inputId) {
          // Atualizar Motorista existente
          const index = lista.findIndex(m => m.id === inputId);
          if (index !== -1) {
            lista[index] = {
              ...lista[index],
              nome, matricula, pin, cpf, telefone, cnh, cnhCat, cnhValidade, linha, veiculo, turno, status
            };
            salvarMotoristas(lista);
            mostrarToast(`Motorista ${nome} atualizado com sucesso!`, 'sucesso');
          }
        } else {
          // Criar Novo Motorista
          if (lista.some(m => m.matricula === matricula)) {
            setBotaoLoading(btnSalvar, false);
            mostrarErroCampo(inputMotMatricula, spanErroMotMatricula, 'Esta matrícula já está em uso por outro condutor.');
            inputMotMatricula.focus();
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
          mostrarToast('Motorista cadastrado com sucesso!', 'sucesso');
        }

        setBotaoLoading(btnSalvar, false);
        fecharModal();
        renderizarTabela();
      }, 350);
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
      const painelMotoristas = document.getElementById('painel-motoristas');
      const painelEscalas = document.getElementById('painel-escalas');
      const painelChamados = document.getElementById('painel-chamados-motoristas');
      const painelOcorrencias = document.getElementById('painel-ocorrencias');

      if (painelMotoristas) painelMotoristas.style.display = alvo === 'motoristas' ? 'block' : 'none';
      if (painelEscalas) painelEscalas.style.display = alvo === 'escalas' ? 'block' : 'none';
      if (painelChamados) painelChamados.style.display = alvo === 'chamados-motoristas' ? 'block' : 'none';
      if (painelOcorrencias) painelOcorrencias.style.display = alvo === 'ocorrencias' ? 'block' : 'none';

      if (alvo === 'chamados-motoristas') {
        renderizarPainelChamados();
      } else if (alvo === 'ocorrencias') {
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
    if (btnTema) {
      const isDark = tema === 'dark';
      btnTema.setAttribute('aria-label', isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
      btnTema.setAttribute('title', isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
    }
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
        if (window.ValeBusAPI && typeof window.ValeBusAPI.encerrarSessao === 'function') {
          window.ValeBusAPI.encerrarSessao('login.html');
        } else {
          localStorage.removeItem('valebus_usuario');
          window.location.href = 'login.html';
        }
      } else if (destino.url) {
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

  const btnSairMobile = document.getElementById('btn-sair-mobile');
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
    const toastIcone = document.getElementById('gestor-toast-icone');
    if (!toast || !toastTexto) return;

    toastTexto.textContent = mensagem;

    toast.classList.remove('gestor-toast--sucesso', 'gestor-toast--alerta', 'gestor-toast--erro', 'gestor-toast--info');

    let iconeSvg = '';
    if (tipo === 'erro') {
      toast.classList.add('gestor-toast--erro');
      iconeSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `;
    } else if (tipo === 'alerta') {
      toast.classList.add('gestor-toast--alerta');
      iconeSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `;
    } else if (tipo === 'info') {
      toast.classList.add('gestor-toast--info');
      iconeSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      `;
    } else {
      toast.classList.add('gestor-toast--sucesso');
      iconeSvg = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
    }

    if (toastIcone) {
      toastIcone.innerHTML = iconeSvg;
    }

    toast.classList.add('ativo');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('ativo');
    }, 4500);
  }

  window.mostrarToastGestor = mostrarToast;

  const elToast = document.getElementById('gestor-toast');
  if (elToast) {
    elToast.addEventListener('click', () => {
      elToast.classList.remove('ativo');
      clearTimeout(toastTimer);
    });
  }

  // Inicialização
  renderizarTabela();
  renderizarFeedOcorrencias();
  renderizarPainelChamados();

})();
