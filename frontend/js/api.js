/**
 * ValeBus Santa Rita do Sapucaí
 * api.js - Camada de Serviços Mock & Ponte para o Backend
 *
 * Objetivo: Centralizar todas as operações de persistência e leitura de dados.
 * Atualmente implementado com armazenamento em localStorage e eventos de sincronização.
 * Quando o backend real (Node/Express, Firebase ou Cloud SQL) for conectado,
 * apenas as funções deste arquivo precisam ser ajustadas com fetch('/api/...'),
 * mantendo as telas (gestor, motorista, dashboard e login) intactas.
 */

(function (window) {
  'use strict';

  // Configurações da Camada de Serviços
  const CONFIG = {
    usarBackendReal: true,
    baseUrl: '/api',
    simularDelayMs: 120
  };

  // Chaves padronizadas de armazenamento
  const KEYS = {
    USUARIO: 'valebus_usuario',
    MOTORISTAS: 'valebus_motoristas_cadastrados',
    CHAMADOS_GESTOR: 'valebus_chamados_gestor',
    OCORRENCIAS_MOTORISTA: 'valebus_ocorrencias_motorista',
    SOCORRO_GARAGEM: 'valebus_socorro_garagem',
    LINHAS_ATIVAS: 'valebus_linhas_ativas',
    ALERTAS: 'valebus_alertas',
    VIAGENS_HOJE: 'valebus_viagens_hoje',
    LINHA_MOTORISTA_ATIVA: 'valebus_linha_motorista_ativa',
    VEICULO_MOTORISTA_ATIVO: 'valebus_veiculo_motorista_ativo',
    TEMA: 'valebus_tema',
    EMAIL_LEMBRADO: 'valebus_email'
  };

  // Base padrão de motoristas (Santa Rita do Sapucaí)
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

  // Base padrão inicial de ocorrências e chamados CCO
  const OCORRENCIAS_PADRAO = [
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

  // Helper interno de JSON com tratamento de erro
  function lerJSON(chave, fallback) {
    try {
      const item = localStorage.getItem(chave);
      if (item !== null && item !== undefined) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn(`[ValeBusAPI] Erro ao ler chave "${chave}":`, e);
    }
    return fallback;
  }

  function gravarJSON(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      // Notifica módulos ouvintes no mesmo contexto
      window.dispatchEvent(new CustomEvent('valebus:storage_update', {
        detail: { chave, valor }
      }));
      return true;
    } catch (e) {
      console.error(`[ValeBusAPI] Erro ao gravar chave "${chave}":`, e);
      return false;
    }
  }

  /* ──────────────────────────────────────────────────────────
     1. SERVIÇO DE MOTORISTAS
     ────────────────────────────────────────────────────────── */
  function obterMotoristas() {
    if (CONFIG.usarBackendReal) {
      console.info('[ValeBusAPI] Redirecionamento configurado para GET /api/motoristas');
    }
    let lista = lerJSON(KEYS.MOTORISTAS, null);
    if (!lista || !Array.isArray(lista) || lista.length === 0) {
      lista = [...MOTORISTAS_PADRAO_SRS];
      gravarJSON(KEYS.MOTORISTAS, lista);
    }
    return lista;
  }

  function salvarMotoristas(lista) {
    if (!Array.isArray(lista)) return false;
    return gravarJSON(KEYS.MOTORISTAS, lista);
  }

  function salvarMotorista(motorista) {
    if (!motorista || (!motorista.nome && !motorista.matricula)) {
      throw new Error('Dados inválidos para salvar motorista.');
    }
    const lista = obterMotoristas();
    const idBusca = motorista.id;
    const matriculaBusca = motorista.matricula;

    let index = -1;
    if (idBusca) {
      index = lista.findIndex(m => m.id === idBusca);
    }
    if (index === -1 && matriculaBusca) {
      index = lista.findIndex(m => m.matricula === matriculaBusca);
    }

    if (index !== -1) {
      lista[index] = { ...lista[index], ...motorista };
    } else {
      if (!motorista.id) {
        motorista.id = 'mot-' + Date.now();
      }
      lista.unshift(motorista);
    }

    salvarMotoristas(lista);
    return motorista;
  }

  function excluirMotorista(idOuMatricula) {
    if (!idOuMatricula) return false;
    const lista = obterMotoristas();
    const novaLista = lista.filter(m => m.id !== idOuMatricula && m.matricula !== idOuMatricula);
    if (novaLista.length !== lista.length) {
      salvarMotoristas(novaLista);
      return true;
    }
    return false;
  }

  function buscarMotoristaPorMatricula(matricula) {
    if (!matricula) return null;
    const limpo = matricula.trim().toUpperCase();
    const lista = obterMotoristas();
    return lista.find(m =>
      m.matricula.toUpperCase() === limpo ||
      m.matricula.replace('MOT-', '').toUpperCase() === limpo.replace('MOT-', '')
    ) || null;
  }

  /* ──────────────────────────────────────────────────────────
     2. SERVIÇO DE OCORRÊNCIAS & CHAMADOS
     ────────────────────────────────────────────────────────── */
  function obterOcorrencias() {
    if (CONFIG.usarBackendReal) {
      console.info('[ValeBusAPI] Redirecionamento configurado para GET /api/ocorrencias');
    }
    let lista = lerJSON(KEYS.CHAMADOS_GESTOR, null);
    if (!lista || !Array.isArray(lista) || lista.length === 0) {
      lista = [...OCORRENCIAS_PADRAO];
      gravarJSON(KEYS.CHAMADOS_GESTOR, lista);
    }

    // Sincroniza eventuais chamados criados localmente pelo motorista
    try {
      const socorroAtivo = lerJSON(KEYS.SOCORRO_GARAGEM, null);
      if (socorroAtivo && socorroAtivo.id) {
        if (!lista.some(c => c.id === socorroAtivo.id)) {
          lista.unshift(socorroAtivo);
          gravarJSON(KEYS.CHAMADOS_GESTOR, lista);
        }
      }

      const ocsMotorista = lerJSON(KEYS.OCORRENCIAS_MOTORISTA, null);
      if (Array.isArray(ocsMotorista)) {
        let mudou = false;
        ocsMotorista.forEach(oc => {
          if (oc && oc.id && !lista.some(c => c.id === oc.id)) {
            lista.unshift(oc);
            mudou = true;
          }
        });
        if (mudou) {
          gravarJSON(KEYS.CHAMADOS_GESTOR, lista);
        }
      }
    } catch (e) {}

    return lista;
  }

  function salvarOcorrencia(ocorrencia) {
    if (!ocorrencia) return null;
    const lista = obterOcorrencias();

    if (!ocorrencia.id) {
      ocorrencia.id = (ocorrencia.categoria === 'garagem' ? 'GAR-' : 'OC-') + Math.floor(1000 + Math.random() * 9000);
    }
    if (!ocorrencia.criadoEm) {
      ocorrencia.criadoEm = new Date().toISOString();
    }

    const index = lista.findIndex(o => o.id === ocorrencia.id);
    if (index !== -1) {
      lista[index] = { ...lista[index], ...ocorrencia };
    } else {
      lista.unshift(ocorrencia);
    }

    gravarJSON(KEYS.CHAMADOS_GESTOR, lista.slice(0, 80));

    // Se for socorro da garagem, reflete na chave específica de socorro
    if (ocorrencia.categoria === 'garagem') {
      gravarJSON(KEYS.SOCORRO_GARAGEM, ocorrencia);
    }

    return ocorrencia;
  }

  function atualizarStatusOcorrencia(id, novoStatus, dadosExtras = {}) {
    const lista = obterOcorrencias();
    const index = lista.findIndex(o => o.id === id);
    if (index === -1) return false;

    lista[index] = {
      ...lista[index],
      ...dadosExtras,
      emAndamento: novoStatus === 'em_andamento' || novoStatus === 'aberto',
      statusBadge: dadosExtras.statusBadge || (novoStatus === 'resolvido' ? 'Resolvido' : 'Em Atendimento'),
      resolvidoEm: novoStatus === 'resolvido' ? (dadosExtras.resolvidoEm || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : null
    };

    gravarJSON(KEYS.CHAMADOS_GESTOR, lista);

    // Se socorro ativo foi resolvido, limpa ou atualiza chave de socorro
    const socorro = lerJSON(KEYS.SOCORRO_GARAGEM, null);
    if (socorro && socorro.id === id) {
      if (novoStatus === 'resolvido') {
        try { localStorage.removeItem(KEYS.SOCORRO_GARAGEM); } catch (e) {}
      } else {
        gravarJSON(KEYS.SOCORRO_GARAGEM, lista[index]);
      }
    }

    return lista[index];
  }

  function obterOcorrenciasMotorista() {
    const lista = lerJSON(KEYS.OCORRENCIAS_MOTORISTA, []);
    return Array.isArray(lista) ? lista : [];
  }

  function salvarOcorrenciasMotorista(lista) {
    if (!Array.isArray(lista)) return false;
    return gravarJSON(KEYS.OCORRENCIAS_MOTORISTA, lista);
  }

  function obterSocorroGaragem() {
    return lerJSON(KEYS.SOCORRO_GARAGEM, null);
  }

  function salvarSocorroGaragem(socorro) {
    if (!socorro || typeof socorro !== 'object') return false;
    return gravarJSON(KEYS.SOCORRO_GARAGEM, socorro);
  }

  function limparSocorroGaragem() {
    try {
      localStorage.removeItem(KEYS.SOCORRO_GARAGEM);
      window.dispatchEvent(new CustomEvent('valebus:storage_update', {
        detail: { chave: KEYS.SOCORRO_GARAGEM, valor: null }
      }));
      return true;
    } catch (e) {
      console.error('[ValeBusAPI] Erro ao limpar socorro da garagem:', e);
      return false;
    }
  }

  function salvarOcorrencias(lista) {
    if (!Array.isArray(lista)) return false;
    return gravarJSON(KEYS.CHAMADOS_GESTOR, lista.slice(0, 80));
  }

  /* ──────────────────────────────────────────────────────────
     3. SERVIÇO DE SESSÃO & AUTENTICAÇÃO
     ────────────────────────────────────────────────────────── */
  function obterSessao() {
    if (CONFIG.usarBackendReal) {
      console.info('[ValeBusAPI] Redirecionamento configurado para GET /api/sessao');
    }
    const usuario = lerJSON(KEYS.USUARIO, null);
    if (usuario && typeof usuario === 'object') {
      return {
        logado: true,
        ...usuario
      };
    }
    return {
      logado: false,
      perfil: null,
      nome: null,
      email: null
    };
  }

  function salvarSessao(dadosUsuario) {
    if (!dadosUsuario) return false;
    const sessaoAtualizada = {
      ...dadosUsuario,
      atualizadoEm: new Date().toISOString()
    };
    return gravarJSON(KEYS.USUARIO, sessaoAtualizada);
  }

  function concluirEncerramentoSessao(redirecionarPara) {
    try {
      localStorage.removeItem(KEYS.USUARIO);
    } catch (e) {
      console.warn('[ValeBusAPI] Erro ao remover usuário da sessão:', e);
    }

    window.dispatchEvent(new CustomEvent('valebus:logout'));
    if (redirecionarPara) window.location.href = redirecionarPara;
    return true;
  }

  async function encerrarSessao(redirecionarPara = 'login.html') {
    try { return await encerrarSessaoAsync(redirecionarPara); }
    catch (erro) { window.alert('Não foi possível encerrar a sessão. Tente novamente.'); return false; }
  }

  function mostrarFalhaSessao(mensagem) {
    const aviso = document.createElement('div');
    aviso.setAttribute('role', 'alert');
    aviso.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--fundo-card,#fff);padding:32px;color:var(--texto-primario,#222)';
    const texto = document.createElement('p');
    texto.textContent = mensagem || 'Não foi possível verificar a sessão. Tente novamente.';
    const tentar = document.createElement('button');
    tentar.textContent = 'Tentar novamente';
    tentar.onclick = () => window.location.reload();
    aviso.append(texto, tentar);
    document.body.append(aviso);
  }

  async function autenticar({ email, senha }) {
    const resposta = await fetch(`${CONFIG.baseUrl}/auth/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível iniciar a sessão.');

    const usuario = corpo?.data?.usuario;
    if (!usuario) throw new Error('Resposta de autenticação inválida.');
    salvarSessao({ ...usuario, logado: true });
    return usuario;
  }

  async function obterSessaoAutenticada() {
    const resposta = await fetch(`${CONFIG.baseUrl}/auth/me`, { credentials: 'same-origin' });
    if (resposta.status === 401 || resposta.status === 403) {
      try { localStorage.removeItem(KEYS.USUARIO); } catch (e) {}
      return null;
    }
    if (!resposta.ok) throw new Error('Serviço temporariamente indisponível. Tente novamente; sua sessão não foi apagada.');

    const corpo = await resposta.json();
    const usuario = corpo?.data?.usuario || null;
    if (usuario) salvarSessao({ ...usuario, logado: true });
    return usuario;
  }

  /* ──────────────────────────────────────────────────────────
     4. SERVIÇO DE OPERAÇÃO LOCAL DO MOTORISTA
     Mantém a compatibilidade com as chaves atuais até o backend assumir
     a viagem ativa, o veículo e a telemetria.
     ────────────────────────────────────────────────────────── */
  function obterOperacaoMotorista() {
    const sessao = obterSessao();
    return {
      linhaChave: localStorage.getItem(KEYS.LINHA_MOTORISTA_ATIVA) || sessao.linhaChave || null,
      veiculo: localStorage.getItem(KEYS.VEICULO_MOTORISTA_ATIVO) || sessao.veiculo || null
    };
  }

  function salvarOperacaoMotorista({ linhaChave, veiculo } = {}) {
    try {
      if (linhaChave) localStorage.setItem(KEYS.LINHA_MOTORISTA_ATIVA, linhaChave);
      if (veiculo) localStorage.setItem(KEYS.VEICULO_MOTORISTA_ATIVO, veiculo);
      window.dispatchEvent(new CustomEvent('valebus:storage_update', {
        detail: { chave: 'operacao_motorista', valor: obterOperacaoMotorista() }
      }));
      return obterOperacaoMotorista();
    } catch (e) {
      console.error('[ValeBusAPI] Erro ao salvar operação do motorista:', e);
      return null;
    }
  }

  function obterViagensHoje(padrao = 0) {
    const valor = Number.parseInt(localStorage.getItem(KEYS.VIAGENS_HOJE), 10);
    return Number.isInteger(valor) && valor >= 0 ? valor : padrao;
  }

  function salvarViagensHoje(quantidade) {
    const valor = Number.parseInt(quantidade, 10);
    if (!Number.isInteger(valor) || valor < 0) return false;
    try {
      localStorage.setItem(KEYS.VIAGENS_HOJE, String(valor));
      window.dispatchEvent(new CustomEvent('valebus:storage_update', {
        detail: { chave: KEYS.VIAGENS_HOJE, valor }
      }));
      return true;
    } catch (e) {
      console.error('[ValeBusAPI] Erro ao salvar viagens do motorista:', e);
      return false;
    }
  }

  function obterTema(padrao = 'light') {
    return localStorage.getItem(KEYS.TEMA) || padrao;
  }

  function salvarTema(tema) {
    if (tema !== 'light' && tema !== 'dark') return false;
    try {
      localStorage.setItem(KEYS.TEMA, tema);
      return true;
    } catch (e) {
      console.error('[ValeBusAPI] Erro ao salvar tema:', e);
      return false;
    }
  }

  /* ──────────────────────────────────────────────────────────
     4. SERVIÇO DE LINHAS ATIVAS (CCO)
     ────────────────────────────────────────────────────────── */
  function obterLinhasAtivas() {
    let linhas = lerJSON(KEYS.LINHAS_ATIVAS, null);
    if (!linhas || !Array.isArray(linhas)) {
      linhas = ['Linha Anchieta', 'Linha Fernandes', 'Linha Fortaleza'];
      gravarJSON(KEYS.LINHAS_ATIVAS, linhas);
    }
    return linhas;
  }

  function salvarLinhasAtivas(linhas) {
    if (!Array.isArray(linhas)) return false;
    return gravarJSON(KEYS.LINHAS_ATIVAS, linhas);
  }

  function ativarLinha(nomeLinha) {
    if (!nomeLinha) return false;
    const linhas = obterLinhasAtivas();
    if (!linhas.includes(nomeLinha)) {
      linhas.push(nomeLinha);
      salvarLinhasAtivas(linhas);
    }
    return linhas;
  }

  /* ──────────────────────────────────────────────────────────
     5. WRAPPERS ASSÍNCRONOS (PREPARADOS PARA FETCH / BACKEND)
     ────────────────────────────────────────────────────────── */
  async function obterMotoristasAsync() {
    const res = await fetch(`${CONFIG.baseUrl}/gestor/motoristas`, { credentials: 'same-origin' });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(corpo.error || 'Falha ao obter motoristas no servidor.');
    return corpo.data || [];
  }

  async function cadastrarMotoristaAsync(motorista) {
    const res = await fetch(`${CONFIG.baseUrl}/gestor/motoristas`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(motorista)
    });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      const erro = new Error(corpo.error || 'Falha ao cadastrar motorista no servidor.');
      erro.campo = corpo.campo;
      throw erro;
    }
    return corpo.data;
  }

  async function salvarMotoristaAsync(motorista) {
    return cadastrarMotoristaAsync(motorista);
  }

  async function atualizarMotoristaAsync(id, motorista) {
    const res = await fetch(`${CONFIG.baseUrl}/gestor/motoristas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(motorista)
    });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      const erro = new Error(corpo.error || 'Falha ao atualizar motorista.');
      erro.campo = corpo.campo;
      throw erro;
    }
    return corpo.data;
  }

  async function descredenciarMotoristaAsync(id) {
    const res = await fetch(`${CONFIG.baseUrl}/gestor/motoristas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(corpo.error || 'Falha ao descredenciar motorista.');
    return corpo.data;
  }

  async function obterOcorrenciasAsync() {
    if (CONFIG.usarBackendReal) {
      const res = await fetch(`${CONFIG.baseUrl}/ocorrencias`);
      if (!res.ok) throw new Error('Falha ao obter ocorrências no servidor.');
      return await res.json();
    }
    await new Promise(r => setTimeout(r, CONFIG.simularDelayMs));
    return obterOcorrencias();
  }

  async function salvarOcorrenciaAsync(ocorrencia) {
    if (CONFIG.usarBackendReal) {
      const res = await fetch(`${CONFIG.baseUrl}/ocorrencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocorrencia)
      });
      if (!res.ok) throw new Error('Falha ao salvar ocorrência no servidor.');
      return await res.json();
    }
    await new Promise(r => setTimeout(r, CONFIG.simularDelayMs));
    return salvarOcorrencia(ocorrencia);
  }

  async function obterSessaoAsync() {
    if (CONFIG.usarBackendReal) {
      const res = await fetch(`${CONFIG.baseUrl}/sessao`);
      if (!res.ok) throw new Error('Falha ao verificar sessão no servidor.');
      return await res.json();
    }
    await new Promise(r => setTimeout(r, CONFIG.simularDelayMs));
    return obterSessao();
  }

  async function encerrarSessaoAsync(redirecionarPara = 'login.html') {
    const resposta = await fetch(`${CONFIG.baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'same-origin'
    });
    if (!resposta.ok) throw new Error('Não foi possível encerrar a sessão.');
    return concluirEncerramentoSessao(redirecionarPara);
  }

  /* ──────────────────────────────────────────────────────────
     6. EXPORTAÇÃO UNIFICADA NO OBJETO GLOBAL
     ────────────────────────────────────────────────────────── */
  const ValeBusAPI = {
    CONFIG,
    KEYS,
    // Síncronos
    obterMotoristas,
    salvarMotoristas,
    salvarMotorista,
    excluirMotorista,
    buscarMotoristaPorMatricula,
    obterOcorrencias,
    salvarOcorrencia,
    atualizarStatusOcorrencia,
    salvarOcorrencias,
    obterOcorrenciasMotorista,
    salvarOcorrenciasMotorista,
    obterSocorroGaragem,
    salvarSocorroGaragem,
    limparSocorroGaragem,
    obterSessao,
    salvarSessao,
    encerrarSessao,
    autenticar,
    obterSessaoAutenticada,
    mostrarFalhaSessao,
    obterOperacaoMotorista,
    salvarOperacaoMotorista,
    obterViagensHoje,
    salvarViagensHoje,
    obterTema,
    salvarTema,
    obterLinhasAtivas,
    salvarLinhasAtivas,
    ativarLinha,
    // Assíncronos (Ponte direta para fetch)
    obterMotoristasAsync,
    cadastrarMotoristaAsync,
    salvarMotoristaAsync,
    atualizarMotoristaAsync,
    descredenciarMotoristaAsync,
    obterOcorrenciasAsync,
    salvarOcorrenciaAsync,
    obterSessaoAsync,
    encerrarSessaoAsync
  };

  // Exporta tanto no namespace ValeBusAPI quanto em funções diretas solicitadas
  window.ValeBusAPI = ValeBusAPI;
  window.obterMotoristas = obterMotoristas;
  window.salvarMotorista = salvarMotorista;
  window.salvarMotoristas = salvarMotoristas;
  window.obterOcorrencias = obterOcorrencias;
  window.salvarOcorrencia = salvarOcorrencia;
  window.obterSessao = obterSessao;
  window.encerrarSessao = encerrarSessao;
  window.salvarSessao = salvarSessao;

})(typeof window !== 'undefined' ? window : this);
