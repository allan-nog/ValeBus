/**
 * login.js — Comportamento da Tela de Login do ValeBus
 * ──────────────────────────────────────────────────────────
 * Responsabilidades:
 *  1. Gerenciamento do Fundo Dinâmico baseado no horário do dia (Manhã, Tarde, Noite)
 *  2. Controles de Demonstração (Permite aos avaliadores da feira alternar o tema ao vivo)
 *  3. Autenticação e Integração com o Google (Modal de Contas + Sincronização)
 *  4. Carregamento do SVG da Cidade com Fallback Offline
 *  5. Validação de Formulário com Acessibilidade e Feedback Visual
 *  6. Mostrar/Ocultar Senha
 *  7. Persistência de E-mail (Lembrar-me)
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. SPRITE DE ÍCONES SÍNCRONO (GARANTE OFFLINE / FILE://)
     ────────────────────────────────────────────────────────── */
  const SPRITE_FALLBACK = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
    <symbol id="icone-onibus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
      <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </symbol>
    <symbol id="icone-email" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </symbol>
    <symbol id="icone-cadeado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </symbol>
    <symbol id="icone-olho" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
    </symbol>
    <symbol id="icone-olho-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
    </symbol>
    <symbol id="icone-erro" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </symbol>
    <symbol id="icone-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </symbol>
    <symbol id="icone-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </symbol>
  </svg>`;

  const containerSprite = document.createElement('div');
  containerSprite.setAttribute('aria-hidden', 'true');
  containerSprite.style.display = 'none';
  containerSprite.innerHTML = SPRITE_FALLBACK;
  document.body.prepend(containerSprite);


  /* ──────────────────────────────────────────────────────────
     2. CARREGAMENTO DO SVG DA CIDADE
     ────────────────────────────────────────────────────────── */
  const containerFundo = document.getElementById('fundo-cidade');
  if (containerFundo) {
    fetch('assets/svg/cidade-fundo.svg')
      .then(res => res.ok ? res.text() : Promise.reject('SVG not found'))
      .then(svgText => {
        containerFundo.innerHTML = svgText;
      })
      .catch(err => {
        console.warn('Injeção externa do SVG:', err);
      });
  }


  /* ──────────────────────────────────────────────────────────
     3. TEMA DINÂMICO AUTOMÁTICO BASEADO NO HORÁRIO DO DIA
     ────────────────────────────────────────────────────────── */
  const elFundo    = document.getElementById('login-fundo');
  const badgeIcone = document.getElementById('badge-icone');
  const badgeTexto = document.getElementById('badge-texto');

  function obterPeriodoReal() {
    const agora = new Date();
    const hora = agora.getHours();

    if (hora >= 5 && hora < 12) {
      return { periodo: 'manha', icone: '🌅' };
    } else if (hora >= 12 && hora < 18) {
      return { periodo: 'tarde', icone: '☀️' };
    } else {
      return { periodo: 'noite', icone: '🌙' };
    }
  }

  function formatarHoraAtual() {
    const agora = new Date();
    const h = String(agora.getHours()).padStart(2, '0');
    const m = String(agora.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function aplicarTemaFundo(periodo) {
    if (!elFundo) return;

    // Remove temas anteriores do fundo e do body
    elFundo.classList.remove('login-fundo--manha', 'login-fundo--tarde', 'login-fundo--noite');
    document.body.classList.remove('tema-manha', 'tema-tarde', 'tema-noite');

    // Adiciona o tema atual
    elFundo.classList.add(`login-fundo--${periodo}`);
    document.body.classList.add(`tema-${periodo}`);

    const info = periodo === 'manha' ? { icone: '🌅' }
               : periodo === 'tarde' ? { icone: '☀️' }
               : { icone: '🌙' };

    if (badgeIcone) badgeIcone.textContent = info.icone;
    if (badgeTexto) {
      const horaStr = formatarHoraAtual();
      badgeTexto.textContent = `Santa Rita do Sapucaí — ${horaStr}`;
    }
  }

  function atualizarAmbiente() {
    const real = obterPeriodoReal();
    aplicarTemaFundo(real.periodo);
  }

  // Inicializa tema de acordo com horário real e atualiza a cada 60 segundos
  atualizarAmbiente();
  setInterval(atualizarAmbiente, 60000);


  /* ──────────────────────────────────────────────────────────
     4. AUTENTICAÇÃO COM O GOOGLE (SIMULAÇÃO REALISTA)
     ────────────────────────────────────────────────────────── */
  const btnAcessoPassageiro = document.getElementById('btn-acesso-passageiro');
  const btnLoginGoogle   = document.getElementById('btn-login-google');
  const modalGoogle      = document.getElementById('modal-google');
  const btnCancelarG     = document.getElementById('btn-cancelar-google');
  const btnFecharXGoogle = document.getElementById('btn-fechar-x-google');
  const contasGoogle     = document.querySelectorAll('.modal-google__conta-item');
  const botaoEntrar      = document.getElementById('botao-entrar');
  const textoBotao       = document.getElementById('texto-botao');
  const iconePadrao      = document.getElementById('icone-padrao');
  const iconeLoading     = document.getElementById('icone-loading');
  const iconeSucesso     = document.getElementById('icone-sucesso');

  function salvarSessaoLogin(usuario) {
    if (window.ValeBusAPI && typeof window.ValeBusAPI.salvarSessao === 'function') {
      return window.ValeBusAPI.salvarSessao(usuario);
    }
    try {
      localStorage.setItem('valebus_usuario', JSON.stringify(usuario));
      return true;
    } catch (e) {
      console.warn('Erro ao salvar usuário no storage:', e);
      return false;
    }
  }

  function abrirModalGoogle() {
    if (modalGoogle) {
      modalGoogle.classList.remove('fechando');
      modalGoogle.classList.add('ativo');
      modalGoogle.setAttribute('aria-hidden', 'false');
      // Foco na primeira conta para acessibilidade
      const primeiraConta = modalGoogle.querySelector('.modal-google__conta-item');
      if (primeiraConta) primeiraConta.focus();
    }
  }

  function fecharModalGoogle() {
    if (modalGoogle && modalGoogle.classList.contains('ativo')) {
      fecharModal(modalGoogle, () => {
        if (btnLoginGoogle) btnLoginGoogle.focus();
      });
    }
  }

  if (btnAcessoPassageiro) {
    btnAcessoPassageiro.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  }

  if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', abrirModalGoogle);
  }

  if (btnCancelarG) {
    btnCancelarG.addEventListener('click', fecharModalGoogle);
  }

  if (btnFecharXGoogle) {
    btnFecharXGoogle.addEventListener('click', fecharModalGoogle);
  }

  // Fecha modal com tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalGoogle && modalGoogle.classList.contains('ativo')) {
      fecharModalGoogle();
    }
  });

  // Fecha ao clicar fora do card do modal
  if (modalGoogle) {
    modalGoogle.addEventListener('click', (e) => {
      if (e.target === modalGoogle) {
        fecharModalGoogle();
      }
    });
  }

  // Ao selecionar uma conta do Google no modal
  contasGoogle.forEach(conta => {
    conta.addEventListener('click', () => {
      const email = conta.getAttribute('data-email') || '';
      const nome  = conta.getAttribute('data-nome') || '';

      conta.classList.add('modal-google__conta-item--selecionada');

      setTimeout(() => {
        fecharModalGoogle();
        conta.classList.remove('modal-google__conta-item--selecionada');

        const ehGestor = verificarSeEhGestor(email);

        if (ehGestor) {
          solicitarCodigoSegurancaGestor({
            nome: nome || 'Gestor ValeBus SRS',
            email: email,
            metodo: 'Google'
          });
          return;
        }

        // Salva usuário logado via serviço unificado
        salvarSessaoLogin({
          nome: nome,
          email: email,
          cargo: 'Passageiro / Avaliador',
          perfil: 'passageiro',
          metodo: 'Google'
        });

        // Feedback visual no botão principal
        if (botaoEntrar) {
          botaoEntrar.disabled = true;
          botaoEntrar.classList.remove('botao-entrar--carregando');
          botaoEntrar.classList.add('botao-entrar--sucesso');
        }
        if (iconePadrao) iconePadrao.style.display = 'none';
        if (iconeLoading) iconeLoading.style.display = 'none';
        if (iconeSucesso) iconeSucesso.style.display = 'inline-block';
        if (textoBotao) {
          textoBotao.textContent = 'Acesso autorizado!';
        }

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 750);
      }, 150);
    });
  });


  /* ──────────────────────────────────────────────────────────
     5. SELEÇÃO DE ELEMENTOS DO FORMULÁRIO PADRÃO & MODAIS
     ────────────────────────────────────────────────────────── */
  const formulario    = document.getElementById('form-login');
  const inputEmail    = document.getElementById('input-email');
  const inputSenha    = document.getElementById('input-senha');
  const botaoOlho     = document.getElementById('botao-olho');
  const erroMensagem  = document.getElementById('erro-mensagem');
  const erroTexto     = document.getElementById('erro-texto');
  const checkLembrar  = document.getElementById('lembrar-me');
  const botaoCadastro = document.getElementById('botao-cadastro');
  const linkEsqueceu  = document.getElementById('link-esqueceu');
  const linkTermos    = document.getElementById('link-termos');
  const linkPrivacidade = document.getElementById('link-privacidade');

  // Modal Esqueceu a Senha
  const modalEsqueceu          = document.getElementById('modal-esqueceu');
  const modalEsqueceuTitulo    = document.getElementById('modal-esqueceu-titulo');
  const modalEsqueceuSubtitulo = document.getElementById('modal-esqueceu-subtitulo');
  const formRecuperar          = document.getElementById('form-recuperar-senha');
  const esqueceuEtapa1         = document.getElementById('esqueceu-etapa-1');
  const esqueceuEtapa2         = document.getElementById('esqueceu-etapa-2');
  const esqueceuEtapa3         = document.getElementById('esqueceu-etapa-3');
  const inputRecuperar         = document.getElementById('input-recuperar-email');
  const btnCancelarRecup       = document.getElementById('btn-cancelar-recuperar');
  const btnFecharXEsqueceu     = document.getElementById('btn-fechar-x-esqueceu');
  const btnEnviarRecup         = document.getElementById('btn-enviar-recuperar');
  const txtBtnRecuperar        = document.getElementById('texto-btn-recuperar');
  const recuperarErro1         = document.getElementById('recuperar-erro-1');
  const recuperarErroTxt1      = document.getElementById('recuperar-erro-texto-1');
  const esqueceuDestEmail      = document.getElementById('esqueceu-destinatario-email');
  const btnTrocarEmailEsq      = document.getElementById('btn-trocar-email-esqueceu');
  const esqueceuCodGerado      = document.getElementById('esqueceu-codigo-gerado');
  const btnPreencherCodEsq     = document.getElementById('btn-preencher-codigo-esqueceu');
  const esqueceuTempoReg       = document.getElementById('esqueceu-tempo-regressivo');
  const esqueceuTempWrap       = document.getElementById('esqueceu-temporizador-wrap');
  const btnReenviarEsq         = document.getElementById('btn-reenviar-esqueceu');
  const recuperarErro2         = document.getElementById('recuperar-erro-2');
  const recuperarErroTxt2      = document.getElementById('recuperar-erro-texto-2');
  const btnVoltarEsq2          = document.getElementById('btn-voltar-esqueceu-2');
  const btnValidarCodEsq       = document.getElementById('btn-validar-codigo-esqueceu');
  const inputNovaSenha         = document.getElementById('input-nova-senha');
  const botaoOlhoNovaSenha     = document.getElementById('botao-olho-novasenha');
  const inputConfirmaNovaSenha = document.getElementById('input-confirma-nova-senha');
  const botaoOlhoConfirmaNovaSenha = document.getElementById('botao-olho-confirma-novasenha');
  const reqNovaMinChars        = document.getElementById('req-nova-min-chars');
  const reqNovaMaiuscula       = document.getElementById('req-nova-maiuscula');
  const reqNovaSimbolo         = document.getElementById('req-nova-simbolo');
  const recuperarErro3         = document.getElementById('recuperar-erro-3');
  const recuperarErroTxt3      = document.getElementById('recuperar-erro-texto-3');
  const recuperarSucessoFinal  = document.getElementById('recuperar-sucesso-final');
  const btnCancelarNovaSenha   = document.getElementById('btn-cancelar-novasenha');
  const btnSalvarNovaSenha     = document.getElementById('btn-salvar-novasenha');
  const txtBtnSalvarNova       = document.getElementById('texto-btn-salvar-novasenha');

  // Modal Cadastro Rápido
  const modalCadastro          = document.getElementById('modal-cadastro');
  const modalCadastroTitulo    = document.getElementById('modal-cadastro-titulo');
  const modalCadastroSubtitulo = document.getElementById('modal-cadastro-subtitulo');
  const formCadastro           = document.getElementById('form-cadastro-rapido');
  const cadastroEtapa1         = document.getElementById('cadastro-etapa-1');
  const cadastroEtapa2         = document.getElementById('cadastro-etapa-2');
  const inputCadNome           = document.getElementById('input-cadastro-nome');
  const inputCadEmail          = document.getElementById('input-cadastro-email');
  const inputCadSenha          = document.getElementById('input-cadastro-senha');
  const botaoOlhoCadastro      = document.getElementById('botao-olho-cadastro');
  const btnCancelarCad         = document.getElementById('btn-cancelar-cadastro');
  const btnFecharXCadastro     = document.getElementById('btn-fechar-x-cadastro');
  const btnAvancarCadastro     = document.getElementById('btn-avancar-cadastro');
  const txtBtnAvancarCad       = document.getElementById('texto-btn-avancar-cad');
  const cadastroErro           = document.getElementById('cadastro-erro');
  const cadastroErroTxt        = document.getElementById('cadastro-erro-texto');
  const cadastroDestEmail      = document.getElementById('cadastro-destinatario-email');
  const btnTrocarEmailCad      = document.getElementById('btn-trocar-email-cadastro');
  const cadastroCodGerado      = document.getElementById('cadastro-codigo-gerado');
  const btnPreencherCodCad     = document.getElementById('btn-preencher-codigo-cadastro');
  const cadastroTempoReg       = document.getElementById('cadastro-tempo-regressivo');
  const cadastroTempWrap       = document.getElementById('cadastro-temporizador-wrap');
  const btnReenviarCad         = document.getElementById('btn-reenviar-cadastro');
  const cadastroErroCodigo     = document.getElementById('cadastro-erro-codigo');
  const cadastroErroCodigoTxt  = document.getElementById('cadastro-erro-codigo-texto');
  const cadastroSucesso        = document.getElementById('cadastro-sucesso');
  const btnVoltarCad2          = document.getElementById('btn-voltar-cadastro-2');
  const btnConfirmarCad        = document.getElementById('btn-confirmar-cadastro');
  const txtBtnCadastro         = document.getElementById('texto-btn-cadastro');

  // Indicador de Requisitos de Senha (Cadastro)
  const reqMinChars            = document.getElementById('req-min-chars');
  const reqMaiuscula           = document.getElementById('req-maiuscula');
  const reqSimbolo             = document.getElementById('req-simbolo');

  // Modal Termos
  const modalTermos        = document.getElementById('modal-termos');
  const btnFecharTermos    = document.getElementById('btn-fechar-termos');
  const btnFecharXTermos   = document.getElementById('btn-fechar-x-termos');

  // Modal Login do Motorista (Terminal Operacional)
  const btnLoginMotorista   = document.getElementById('btn-login-motorista');
  const modalMotorista      = document.getElementById('modal-motorista');
  const formMotorista       = document.getElementById('form-login-motorista');
  const inputMotId          = document.getElementById('input-motorista-id');
  const inputMotPin         = document.getElementById('input-motorista-pin');
  const selectMotLinha      = document.getElementById('select-motorista-linha');
  const selectMotVeiculo    = document.getElementById('select-motorista-veiculo');
  const botaoOlhoMotorista  = document.getElementById('botao-olho-motorista');
  const btnCancelarMot      = document.getElementById('btn-cancelar-motorista');
  const btnFecharXMotorista = document.getElementById('btn-fechar-x-motorista');
  const btnConfirmarMot     = document.getElementById('btn-confirmar-motorista');
  const txtBtnMotorista     = document.getElementById('texto-btn-motorista');
  const motoristaSucesso    = document.getElementById('motorista-sucesso');
  const motoristaErro       = document.getElementById('motorista-erro');
  const motoristaErroTxt    = document.getElementById('motorista-erro-texto');

  // Modal Código de Segurança do Gestor (2FA CCO)
  const modalGestor2fa         = document.getElementById('modal-gestor-2fa');
  const btnFecharXGestor2fa    = document.getElementById('btn-fechar-x-gestor-2fa');
  const gestor2faEmail         = document.getElementById('gestor-2fa-email');
  const gestorTempoReg         = document.getElementById('gestor-tempo-regressivo');
  const gestorTempWrap         = document.getElementById('gestor-temporizador-wrap');
  const btnReenviarGestor      = document.getElementById('btn-reenviar-gestor');
  const gestor2faErro          = document.getElementById('gestor-2fa-erro');
  const gestor2faErroTxt       = document.getElementById('gestor-2fa-erro-texto');
  const gestor2faSucesso       = document.getElementById('gestor-2fa-sucesso');
  const btnCancelarGestor2fa   = document.getElementById('btn-cancelar-gestor-2fa');
  const btnConfirmarGestor2fa  = document.getElementById('btn-confirmar-gestor-2fa');
  const txtBtnConfirmarGestor  = document.getElementById('texto-btn-confirmar-gestor');

  function verificarSeEhGestor(email) {
    if (!email) return false;
    const limpo = email.toLowerCase().trim();
    return limpo === 'valebussrs@gmail.com' || limpo.includes('gestor');
  }


  /* ──────────────────────────────────────────────────────────
     6. MOSTRAR / OCULTAR SENHA
     ────────────────────────────────────────────────────────── */
  if (botaoOlho && inputSenha) {
    botaoOlho.addEventListener('click', function () {
      const estaOculta = inputSenha.type === 'password';
      inputSenha.type = estaOculta ? 'text' : 'password';

      const useEl = botaoOlho.querySelector('use');
      if (useEl) {
        useEl.setAttribute('href', estaOculta ? '#icone-olho-off' : '#icone-olho');
      }

      botaoOlho.setAttribute('aria-label', estaOculta ? 'Ocultar senha' : 'Mostrar senha');
    });
  }


  /* ──────────────────────────────────────────────────────────
     7. RECUPERAR E-MAIL SALVO (Lembrar-me)
     ────────────────────────────────────────────────────────── */
  try {
    const emailSalvo = localStorage.getItem('valebus_email');
    if (emailSalvo && inputEmail && checkLembrar) {
      inputEmail.value     = emailSalvo;
      checkLembrar.checked = true;
    }
  } catch (e) {}


  /* ──────────────────────────────────────────────────────────
     8. VALIDAÇÃO & SUBMIT DO FORMULÁRIO DE LOGIN
     ────────────────────────────────────────────────────────── */
  if (formulario) {
    formulario.addEventListener('submit', async function (evento) {
      evento.preventDefault();

      const email = inputEmail.value.trim();
      const senha = inputSenha.value;

      // Validação combinada de credenciais de login
      const emailOk = emailValido(email);
      const senhaErro = !senha;

      if (!emailOk || senhaErro) {
        mostrarErro('Não foi possível entrar. Revise seu e-mail e senha e tente novamente.');
        if (!emailOk) {
          inputEmail.focus();
        } else {
          inputSenha.focus();
        }
        return;
      }

      // Persistência do E-mail
      try {
        if (checkLembrar && checkLembrar.checked) {
          localStorage.setItem('valebus_email', email);
        } else {
          localStorage.removeItem('valebus_email');
        }
      } catch (e) {}

      ocultarErro();

      setCarregando(true);
      if (textoBotao) textoBotao.textContent = 'Entrando...';

      try {
        const usuario = await window.ValeBusAPI.autenticar({ email, senha });
        if (usuario.papel === 'gestor') {
          window.location.href = 'gestor.html';
          return;
        }
        if (usuario.papel === 'motorista') {
          window.location.href = 'motorista.html';
          return;
        }
        throw new Error('Esta conta não possui acesso operacional.');
      } catch (erro) {
        mostrarErro(erro.message || 'Não foi possível entrar. Tente novamente.');
        setCarregando(false);
        resetarBotao();
      }
    });
  }


  /* ──────────────────────────────────────────────────────────
     9. MODAIS: RECUPERAÇÃO DE SENHA, CADASTRO E TERMOS
     ────────────────────────────────────────────────────────── */
  function abrirModal(modal, primeiroInput = null) {
    if (!modal) return;
    modal.classList.remove('fechando');
    modal.classList.add('ativo');
    modal.setAttribute('aria-hidden', 'false');
    if (primeiroInput) {
      setTimeout(() => primeiroInput.focus(), 60);
    }
  }

  function fecharModal(modal, callback) {
    if (!modal || !modal.classList.contains('ativo')) return;
    if (modal.classList.contains('fechando')) return;

    modal.classList.add('fechando');
    setTimeout(() => {
      modal.classList.remove('ativo', 'fechando');
      modal.setAttribute('aria-hidden', 'true');
      if (modal === modalEsqueceu) resetarModalEsqueceu();
      if (modal === modalCadastro) resetarModalCadastro();
      if (modal === modalGestor2fa) resetarModalGestor2fa();
      if (typeof callback === 'function') callback();
    }, 180);
  }

  /* ──────────────────────────────────────────────────────────
     SISTEMA DE VERIFICAÇÃO POR CÓDIGO (6 DÍGITOS)
     ────────────────────────────────────────────────────────── */
  let codigoEsqueceuAtual = '';
  let emailEsqueceuAtual = '';
  let temporizadorEsqueceuId = null;

  let codigoCadastroAtual = '';
  let dadosCadastroTemp = null;
  let temporizadorCadastroId = null;

  let codigoGestorAtual = '';
  let dadosGestorPendente = null;
  let temporizadorGestorId = null;

  function gerarCodigo6Digitos() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function configurarInputsSegmentados(grupo, onCompleto) {
    const inputs = Array.from(document.querySelectorAll(`.codigo-digito[data-grupo="${grupo}"]`));
    if (!inputs.length) return;

    inputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val.slice(-1) : '';

        if (e.target.value) {
          e.target.classList.add('preenchido');
          e.target.classList.remove('com-erro');
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus();
            inputs[idx + 1].select();
          }
        } else {
          e.target.classList.remove('preenchido');
        }

        const codigo = inputs.map(i => i.value).join('');
        if (codigo.length === 6 && typeof onCompleto === 'function') {
          onCompleto(codigo);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (grupo === 'cadastro' && btnConfirmarCad) {
            btnConfirmarCad.click();
          } else if (grupo === 'esqueceu' && btnValidarCodEsq) {
            btnValidarCodEsq.click();
          } else if (grupo === 'gestor' && btnConfirmarGestor2fa) {
            btnConfirmarGestor2fa.click();
          }
          return;
        }

        if (e.key === 'Backspace') {
          if (!e.target.value && idx > 0) {
            inputs[idx - 1].focus();
            inputs[idx - 1].value = '';
            inputs[idx - 1].classList.remove('preenchido');
          } else {
            e.target.value = '';
            e.target.classList.remove('preenchido');
          }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          inputs[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const textoColado = (e.clipboardData || window.clipboardData).getData('text');
        const digitos = textoColado.replace(/\D/g, '').slice(0, 6);
        if (!digitos) return;

        digitos.split('').forEach((char, dIdx) => {
          if (inputs[dIdx]) {
            inputs[dIdx].value = char;
            inputs[dIdx].classList.add('preenchido');
            inputs[dIdx].classList.remove('com-erro');
          }
        });

        const nextIdx = Math.min(digitos.length, inputs.length - 1);
        inputs[nextIdx].focus();

        const codigo = inputs.map(i => i.value).join('');
        if (codigo.length === 6 && typeof onCompleto === 'function') {
          onCompleto(codigo);
        }
      });

      input.addEventListener('focus', () => {
        input.select();
      });
    });
  }

  function obterCodigoSegmentado(grupo) {
    const inputs = Array.from(document.querySelectorAll(`.codigo-digito[data-grupo="${grupo}"]`));
    return inputs.map(i => i.value.trim()).join('');
  }

  function marcarErroSegmentado(grupo) {
    const inputs = Array.from(document.querySelectorAll(`.codigo-digito[data-grupo="${grupo}"]`));
    inputs.forEach(i => i.classList.add('com-erro'));
    if (inputs[0]) inputs[0].focus();
  }

  function limparSegmentado(grupo) {
    const inputs = Array.from(document.querySelectorAll(`.codigo-digito[data-grupo="${grupo}"]`));
    inputs.forEach(i => {
      i.value = '';
      i.classList.remove('preenchido', 'com-erro');
    });
    if (inputs[0]) inputs[0].focus();
  }

  function preencherSegmentado(grupo, codigo) {
    const inputs = Array.from(document.querySelectorAll(`.codigo-digito[data-grupo="${grupo}"]`));
    const chars = (codigo || '').split('');
    inputs.forEach((input, idx) => {
      input.value = chars[idx] || '';
      if (input.value) {
        input.classList.add('preenchido');
        input.classList.remove('com-erro');
      } else {
        input.classList.remove('preenchido');
      }
    });
    if (inputs[inputs.length - 1]) inputs[inputs.length - 1].focus();
  }

  function iniciarTemporizador(grupo) {
    const tempoEl = document.getElementById(`${grupo}-tempo-regressivo`);
    const wrapEl  = document.getElementById(`${grupo}-temporizador-wrap`);
    const btnEl   = document.getElementById(`btn-reenviar-${grupo}`);

    if (grupo === 'esqueceu' && temporizadorEsqueceuId) {
      clearInterval(temporizadorEsqueceuId);
      temporizadorEsqueceuId = null;
    }
    if (grupo === 'cadastro' && temporizadorCadastroId) {
      clearInterval(temporizadorCadastroId);
      temporizadorCadastroId = null;
    }
    if (grupo === 'gestor' && temporizadorGestorId) {
      clearInterval(temporizadorGestorId);
      temporizadorGestorId = null;
    }

    let segundos = 60;
    if (wrapEl) wrapEl.style.display = 'inline';
    if (tempoEl) tempoEl.textContent = `${segundos}s`;
    if (btnEl) btnEl.disabled = true;

    const id = setInterval(() => {
      segundos--;
      if (segundos > 0) {
        if (tempoEl) tempoEl.textContent = `${segundos}s`;
      } else {
        clearInterval(id);
        if (wrapEl) wrapEl.style.display = 'none';
        if (btnEl) btnEl.disabled = false;
      }
    }, 1000);

    if (grupo === 'esqueceu') temporizadorEsqueceuId = id;
    if (grupo === 'cadastro') temporizadorCadastroId = id;
    if (grupo === 'gestor')   temporizadorGestorId = id;
  }

  function resetarModalGestor2fa() {
    if (temporizadorGestorId) {
      clearInterval(temporizadorGestorId);
      temporizadorGestorId = null;
    }
    dadosGestorPendente = null;
    if (gestor2faErro) gestor2faErro.style.display = 'none';
    if (gestor2faSucesso) gestor2faSucesso.style.display = 'none';
    if (btnConfirmarGestor2fa) btnConfirmarGestor2fa.disabled = false;
    if (txtBtnConfirmarGestor) txtBtnConfirmarGestor.textContent = 'Confirmar e Acessar CCO';
    limparSegmentado('gestor');
  }

  function resetarModalEsqueceu() {
    if (temporizadorEsqueceuId) {
      clearInterval(temporizadorEsqueceuId);
      temporizadorEsqueceuId = null;
    }
    if (esqueceuEtapa1) esqueceuEtapa1.style.display = 'block';
    if (esqueceuEtapa2) esqueceuEtapa2.style.display = 'none';
    if (esqueceuEtapa3) esqueceuEtapa3.style.display = 'none';

    if (modalEsqueceuTitulo) modalEsqueceuTitulo.textContent = 'Recuperar senha';
    if (modalEsqueceuSubtitulo) modalEsqueceuSubtitulo.textContent = 'Informe o e-mail cadastrado para receber as instruções de recuperação.';

    if (recuperarErro1) recuperarErro1.style.display = 'none';
    if (recuperarErro2) recuperarErro2.style.display = 'none';
    if (recuperarErro3) recuperarErro3.style.display = 'none';
    if (recuperarSucessoFinal) recuperarSucessoFinal.style.display = 'none';

    limparSegmentado('esqueceu');
    if (inputNovaSenha) inputNovaSenha.value = '';
    if (inputConfirmaNovaSenha) inputConfirmaNovaSenha.value = '';
    if (txtBtnRecuperar) txtBtnRecuperar.textContent = 'Continuar';
    if (btnEnviarRecup) btnEnviarRecup.disabled = false;
    atualizarIndicadorNovaSenha('');
  }

  function resetarModalCadastro() {
    if (temporizadorCadastroId) {
      clearInterval(temporizadorCadastroId);
      temporizadorCadastroId = null;
    }
    if (cadastroEtapa1) cadastroEtapa1.style.display = 'block';
    if (cadastroEtapa2) cadastroEtapa2.style.display = 'none';

    if (modalCadastroTitulo) modalCadastroTitulo.textContent = 'Criar nova conta';
    if (modalCadastroSubtitulo) modalCadastroSubtitulo.textContent = 'Cadastre-se rapidamente para consultar linhas, favoritar paradas e receber alertas de Santa Rita do Sapucaí.';

    if (cadastroErro) cadastroErro.style.display = 'none';
    if (cadastroErroCodigo) cadastroErroCodigo.style.display = 'none';
    if (cadastroSucesso) cadastroSucesso.style.display = 'none';
    if (txtBtnAvancarCad) txtBtnAvancarCad.textContent = 'Cadastrar';
    if (btnAvancarCadastro) btnAvancarCadastro.disabled = false;

    limparSegmentado('cadastro');
  }

  function atualizarIndicadorNovaSenha(senha = '') {
    const temMinChars = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temSimbolo = /[^A-Za-z0-9]/.test(senha);

    if (reqNovaMinChars) reqNovaMinChars.classList.toggle('requisito-item--atendido', temMinChars);
    if (reqNovaMaiuscula) reqNovaMaiuscula.classList.toggle('requisito-item--atendido', temMaiuscula);
    if (reqNovaSimbolo) reqNovaSimbolo.classList.toggle('requisito-item--atendido', temSimbolo);
  }

  // Configura listeners dos inputs segmentados
  configurarInputsSegmentados('esqueceu', () => {
    if (recuperarErro2) recuperarErro2.style.display = 'none';
  });

  configurarInputsSegmentados('cadastro', () => {
    if (cadastroErroCodigo) cadastroErroCodigo.style.display = 'none';
  });

  configurarInputsSegmentados('gestor', (codigo) => {
    if (gestor2faErro) gestor2faErro.style.display = 'none';
    if (codigo && codigo.length === 6) {
      validarCodigoGestor();
    }
  });

  /* ──────────────────────────────────────────────────────────
     FLUXO: ESQUECEU A SENHA (3 ETAPAS)
     ────────────────────────────────────────────────────────── */
  if (linkEsqueceu) {
    linkEsqueceu.addEventListener('click', (e) => {
      e.preventDefault();
      resetarModalEsqueceu();
      if (inputRecuperar && inputEmail && inputEmail.value) {
        inputRecuperar.value = inputEmail.value.trim();
      }
      abrirModal(modalEsqueceu, inputRecuperar);
    });
  }

  if (btnCancelarRecup) {
    btnCancelarRecup.addEventListener('click', () => fecharModal(modalEsqueceu));
  }

  if (btnFecharXEsqueceu) {
    btnFecharXEsqueceu.addEventListener('click', () => fecharModal(modalEsqueceu));
  }

  // Etapa 1: Envio do e-mail
  if (formRecuperar) {
    formRecuperar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = inputRecuperar.value.trim();
      if (!emailValido(email)) {
        if (recuperarErro1) {
          recuperarErroTxt1.textContent = 'Informe um e-mail válido para envio.';
          recuperarErro1.style.display = 'flex';
        }
        return;
      }

      if (recuperarErro1) recuperarErro1.style.display = 'none';
      if (btnEnviarRecup) btnEnviarRecup.disabled = true;
      if (txtBtnRecuperar) txtBtnRecuperar.textContent = 'Enviando...';

      await esperar(600);

      if (btnEnviarRecup) btnEnviarRecup.disabled = false;
      if (txtBtnRecuperar) txtBtnRecuperar.textContent = 'Continuar';

      emailEsqueceuAtual = email;
      codigoEsqueceuAtual = gerarCodigo6Digitos();

      if (esqueceuDestEmail) esqueceuDestEmail.textContent = email;
      if (esqueceuCodGerado) esqueceuCodGerado.textContent = codigoEsqueceuAtual;

      // Avança para a Etapa 2
      if (esqueceuEtapa1) esqueceuEtapa1.style.display = 'none';
      if (esqueceuEtapa2) esqueceuEtapa2.style.display = 'block';

      if (modalEsqueceuTitulo) modalEsqueceuTitulo.textContent = 'Código de Verificação';
      if (modalEsqueceuSubtitulo) modalEsqueceuSubtitulo.textContent = 'Instruções enviadas! Verifique sua caixa de entrada e spam e digite o código de 6 dígitos.';

      limparSegmentado('esqueceu');
      iniciarTemporizador('esqueceu');
    });
  }

  // Etapa 2: Ações de código de recuperação
  if (btnPreencherCodEsq) {
    btnPreencherCodEsq.addEventListener('click', () => {
      preencherSegmentado('esqueceu', codigoEsqueceuAtual);
      if (recuperarErro2) recuperarErro2.style.display = 'none';
    });
  }

  if (btnTrocarEmailEsq) {
    btnTrocarEmailEsq.addEventListener('click', () => {
      if (esqueceuEtapa2) esqueceuEtapa2.style.display = 'none';
      if (esqueceuEtapa1) esqueceuEtapa1.style.display = 'block';
      if (modalEsqueceuTitulo) modalEsqueceuTitulo.textContent = 'Recuperar senha';
      if (modalEsqueceuSubtitulo) modalEsqueceuSubtitulo.textContent = 'Informe o e-mail cadastrado para receber as instruções de recuperação.';
      if (inputRecuperar) inputRecuperar.focus();
    });
  }

  if (btnVoltarEsq2) {
    btnVoltarEsq2.addEventListener('click', () => {
      if (esqueceuEtapa2) esqueceuEtapa2.style.display = 'none';
      if (esqueceuEtapa1) esqueceuEtapa1.style.display = 'block';
      if (modalEsqueceuTitulo) modalEsqueceuTitulo.textContent = 'Recuperar senha';
      if (modalEsqueceuSubtitulo) modalEsqueceuSubtitulo.textContent = 'Informe o e-mail cadastrado para receber as instruções de recuperação.';
      if (inputRecuperar) inputRecuperar.focus();
    });
  }

  if (btnReenviarEsq) {
    btnReenviarEsq.addEventListener('click', async () => {
      codigoEsqueceuAtual = gerarCodigo6Digitos();
      if (esqueceuCodGerado) esqueceuCodGerado.textContent = codigoEsqueceuAtual;
      limparSegmentado('esqueceu');
      if (recuperarErro2) recuperarErro2.style.display = 'none';
      iniciarTemporizador('esqueceu');
    });
  }

  if (btnValidarCodEsq) {
    btnValidarCodEsq.addEventListener('click', async () => {
      const codigoDigitado = obterCodigoSegmentado('esqueceu');

      if (codigoDigitado.length < 6) {
        if (recuperarErro2) {
          recuperarErroTxt2.textContent = 'Digite o código completo com 6 números.';
          recuperarErro2.style.display = 'flex';
        }
        marcarErroSegmentado('esqueceu');
        return;
      }

      if (recuperarErro2) recuperarErro2.style.display = 'none';
      btnValidarCodEsq.disabled = true;
      btnValidarCodEsq.textContent = 'Validando...';

      await esperar(600);

      btnValidarCodEsq.disabled = false;
      btnValidarCodEsq.textContent = 'Confirmar Código';

      // Avança para Etapa 3 (Definir nova senha)
      if (esqueceuEtapa2) esqueceuEtapa2.style.display = 'none';
      if (esqueceuEtapa3) esqueceuEtapa3.style.display = 'block';

      if (modalEsqueceuTitulo) modalEsqueceuTitulo.textContent = 'Criar Nova Senha';
      if (modalEsqueceuSubtitulo) modalEsqueceuSubtitulo.textContent = 'Defina sua nova credencial de acesso seguro para o ValeBus.';

      if (inputNovaSenha) {
        inputNovaSenha.value = '';
        inputNovaSenha.focus();
      }
      if (inputConfirmaNovaSenha) inputConfirmaNovaSenha.value = '';
      atualizarIndicadorNovaSenha('');
    });
  }

  // Etapa 3: Redefinição de Senha
  if (botaoOlhoNovaSenha && inputNovaSenha) {
    botaoOlhoNovaSenha.addEventListener('click', function () {
      const estaOculta = inputNovaSenha.type === 'password';
      inputNovaSenha.type = estaOculta ? 'text' : 'password';
      const useEl = botaoOlhoNovaSenha.querySelector('use');
      if (useEl) useEl.setAttribute('href', estaOculta ? '#icone-olho-off' : '#icone-olho');
      botaoOlhoNovaSenha.setAttribute('aria-label', estaOculta ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  if (botaoOlhoConfirmaNovaSenha && inputConfirmaNovaSenha) {
    botaoOlhoConfirmaNovaSenha.addEventListener('click', function () {
      const estaOculta = inputConfirmaNovaSenha.type === 'password';
      inputConfirmaNovaSenha.type = estaOculta ? 'text' : 'password';
      const useEl = botaoOlhoConfirmaNovaSenha.querySelector('use');
      if (useEl) useEl.setAttribute('href', estaOculta ? '#icone-olho-off' : '#icone-olho');
      botaoOlhoConfirmaNovaSenha.setAttribute('aria-label', estaOculta ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  if (inputNovaSenha) {
    inputNovaSenha.addEventListener('input', () => {
      atualizarIndicadorNovaSenha(inputNovaSenha.value);
    });
  }

  if (btnCancelarNovaSenha) {
    btnCancelarNovaSenha.addEventListener('click', () => fecharModal(modalEsqueceu));
  }

  if (btnSalvarNovaSenha) {
    btnSalvarNovaSenha.addEventListener('click', async (e) => {
      e.preventDefault();
      const novaSenha = inputNovaSenha ? inputNovaSenha.value : '';
      const confirma  = inputConfirmaNovaSenha ? inputConfirmaNovaSenha.value : '';

      const erroSenha = validarSenha(novaSenha);
      if (erroSenha) {
        if (recuperarErro3) {
          recuperarErroTxt3.textContent = erroSenha;
          recuperarErro3.style.display = 'flex';
        }
        if (inputNovaSenha) inputNovaSenha.focus();
        return;
      }

      if (novaSenha !== confirma) {
        if (recuperarErro3) {
          recuperarErroTxt3.textContent = 'As senhas informadas não coincidem.';
          recuperarErro3.style.display = 'flex';
        }
        if (inputConfirmaNovaSenha) inputConfirmaNovaSenha.focus();
        return;
      }

      if (recuperarErro3) recuperarErro3.style.display = 'none';
      btnSalvarNovaSenha.disabled = true;
      if (txtBtnSalvarNova) txtBtnSalvarNova.textContent = 'Salvando...';

      await esperar(800);

      btnSalvarNovaSenha.disabled = false;
      if (txtBtnSalvarNova) txtBtnSalvarNova.textContent = 'Salvar Nova Senha';

      if (recuperarSucessoFinal) recuperarSucessoFinal.style.display = 'flex';

      // Atualiza o e-mail no login e limpa senha
      if (inputEmail && emailEsqueceuAtual) inputEmail.value = emailEsqueceuAtual;
      if (inputSenha) inputSenha.value = '';

      setTimeout(() => {
        fecharModal(modalEsqueceu, () => {
          resetarModalEsqueceu();
          if (inputSenha) inputSenha.focus();
        });
      }, 1500);
    });
  }

  /* ──────────────────────────────────────────────────────────
     FLUXO: CRIAR NOVA CONTA (2 ETAPAS COM VERIFICAÇÃO)
     ────────────────────────────────────────────────────────── */
  if (botaoOlhoCadastro && inputCadSenha) {
    botaoOlhoCadastro.addEventListener('click', function () {
      const estaOculta = inputCadSenha.type === 'password';
      inputCadSenha.type = estaOculta ? 'text' : 'password';

      const useEl = botaoOlhoCadastro.querySelector('use');
      if (useEl) {
        useEl.setAttribute('href', estaOculta ? '#icone-olho-off' : '#icone-olho');
      }

      botaoOlhoCadastro.setAttribute('aria-label', estaOculta ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  function validarNomeCompleto(nome) {
    const partes = nome.trim().split(/\s+/).filter(p => p.length >= 2);
    return partes.length >= 2;
  }

  function atualizarIndicadorSenha(senha = '') {
    const temMinChars = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temSimbolo = /[^A-Za-z0-9]/.test(senha);

    if (reqMinChars) reqMinChars.classList.toggle('requisito-item--atendido', temMinChars);
    if (reqMaiuscula) reqMaiuscula.classList.toggle('requisito-item--atendido', temMaiuscula);
    if (reqSimbolo) reqSimbolo.classList.toggle('requisito-item--atendido', temSimbolo);
  }

  if (inputCadSenha) {
    inputCadSenha.addEventListener('input', () => {
      atualizarIndicadorSenha(inputCadSenha.value);
    });
  }

  if (botaoCadastro) {
    botaoCadastro.addEventListener('click', () => {
      resetarModalCadastro();
      atualizarIndicadorSenha(inputCadSenha ? inputCadSenha.value : '');
      abrirModal(modalCadastro, inputCadNome);
    });
  }

  if (btnCancelarCad) {
    btnCancelarCad.addEventListener('click', () => fecharModal(modalCadastro));
  }

  if (btnFecharXCadastro) {
    btnFecharXCadastro.addEventListener('click', () => fecharModal(modalCadastro));
  }

  // Etapa 1: Validação do formulário de cadastro
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome  = inputCadNome.value.trim();
      const email = inputCadEmail.value.trim();
      const senha = inputCadSenha.value;

      // 1. Validação de Nome e Sobrenome
      if (!nome) {
        if (cadastroErro) {
          cadastroErroTxt.textContent = 'Informe o seu nome completo.';
          cadastroErro.style.display = 'flex';
        }
        inputCadNome.focus();
        return;
      }

      if (!validarNomeCompleto(nome)) {
        if (cadastroErro) {
          cadastroErroTxt.textContent = 'Por favor, informe nome e sobrenome (mínimo 2 letras cada).';
          cadastroErro.style.display = 'flex';
        }
        inputCadNome.focus();
        return;
      }

      // 2. Validação de E-mail
      if (!emailValido(email)) {
        if (cadastroErro) {
          cadastroErroTxt.textContent = 'Informe um endereço de e-mail válido.';
          cadastroErro.style.display = 'flex';
        }
        inputCadEmail.focus();
        return;
      }

      // 3. Validação de Senha
      const erroSenha = validarSenha(senha);
      if (erroSenha) {
        if (cadastroErro) {
          cadastroErroTxt.textContent = erroSenha;
          cadastroErro.style.display = 'flex';
        }
        inputCadSenha.focus();
        return;
      }

      if (cadastroErro) cadastroErro.style.display = 'none';
      if (btnAvancarCadastro) btnAvancarCadastro.disabled = true;
      if (txtBtnAvancarCad) txtBtnAvancarCad.textContent = 'Cadastrando...';

      await esperar(650);

      if (btnAvancarCadastro) btnAvancarCadastro.disabled = false;
      if (txtBtnAvancarCad) txtBtnAvancarCad.textContent = 'Cadastrar';

      dadosCadastroTemp = { nome, email, senha };
      codigoCadastroAtual = gerarCodigo6Digitos();

      if (cadastroDestEmail) cadastroDestEmail.textContent = email;
      if (cadastroCodGerado) cadastroCodGerado.textContent = codigoCadastroAtual;

      // Avança para a Etapa 2
      if (cadastroEtapa1) cadastroEtapa1.style.display = 'none';
      if (cadastroEtapa2) cadastroEtapa2.style.display = 'block';

      if (modalCadastroTitulo) modalCadastroTitulo.textContent = 'Confirmar E-mail';
      if (modalCadastroSubtitulo) modalCadastroSubtitulo.textContent = 'Digite o código de 6 dígitos enviado para validar e ativar sua conta no ValeBus.';

      limparSegmentado('cadastro');
      iniciarTemporizador('cadastro');
    });
  }

  // Etapa 2: Ações do código de cadastro
  if (btnPreencherCodCad) {
    btnPreencherCodCad.addEventListener('click', () => {
      preencherSegmentado('cadastro', codigoCadastroAtual);
      if (cadastroErroCodigo) cadastroErroCodigo.style.display = 'none';
    });
  }

  if (btnTrocarEmailCad) {
    btnTrocarEmailCad.addEventListener('click', () => {
      if (cadastroEtapa2) cadastroEtapa2.style.display = 'none';
      if (cadastroEtapa1) cadastroEtapa1.style.display = 'block';
      if (modalCadastroTitulo) modalCadastroTitulo.textContent = 'Criar nova conta';
      if (modalCadastroSubtitulo) modalCadastroSubtitulo.textContent = 'Cadastre-se rapidamente para consultar linhas, favoritar paradas e receber alertas de Santa Rita do Sapucaí.';
      if (inputCadEmail) inputCadEmail.focus();
    });
  }

  if (btnVoltarCad2) {
    btnVoltarCad2.addEventListener('click', () => {
      if (cadastroEtapa2) cadastroEtapa2.style.display = 'none';
      if (cadastroEtapa1) cadastroEtapa1.style.display = 'block';
      if (modalCadastroTitulo) modalCadastroTitulo.textContent = 'Criar nova conta';
      if (modalCadastroSubtitulo) modalCadastroSubtitulo.textContent = 'Cadastre-se rapidamente para consultar linhas, favoritar paradas e receber alertas de Santa Rita do Sapucaí.';
      if (inputCadNome) inputCadNome.focus();
    });
  }

  if (btnReenviarCad) {
    btnReenviarCad.addEventListener('click', async () => {
      codigoCadastroAtual = gerarCodigo6Digitos();
      if (cadastroCodGerado) cadastroCodGerado.textContent = codigoCadastroAtual;
      limparSegmentado('cadastro');
      if (cadastroErroCodigo) cadastroErroCodigo.style.display = 'none';
      iniciarTemporizador('cadastro');
    });
  }

  if (btnConfirmarCad) {
    btnConfirmarCad.addEventListener('click', async () => {
      const codigoDigitado = obterCodigoSegmentado('cadastro');

      if (codigoDigitado.length < 6) {
        if (cadastroErroCodigo) {
          cadastroErroCodigoTxt.textContent = 'Digite o código completo com 6 números.';
          cadastroErroCodigo.style.display = 'flex';
        }
        marcarErroSegmentado('cadastro');
        return;
      }

      // Aceita qualquer código de 6 dígitos inserido pelo usuário
      if (cadastroErroCodigo) cadastroErroCodigo.style.display = 'none';
      btnConfirmarCad.disabled = true;
      if (txtBtnCadastro) txtBtnCadastro.textContent = 'Verificando...';

      await esperar(750);

      try {
        const usuario = {
          nome: dadosCadastroTemp ? dadosCadastroTemp.nome : 'Usuário ValeBus',
          email: dadosCadastroTemp ? dadosCadastroTemp.email : 'usuario@valebus.com.br',
          cargo: 'Passageiro / Usuário da Linha',
          perfil: 'passageiro',
          metodo: 'Cadastro com E-mail Verificado'
        };
        salvarSessaoLogin(usuario);
      } catch (e) {}

      if (cadastroSucesso) cadastroSucesso.style.display = 'flex';

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
    });
  }

  // Modal: Termos e Privacidade
  function abrirTermos(e) {
    e.preventDefault();
    abrirModal(modalTermos);
  }
  if (linkTermos) linkTermos.addEventListener('click', abrirTermos);
  if (linkPrivacidade) linkPrivacidade.addEventListener('click', abrirTermos);
  if (btnFecharTermos) btnFecharTermos.addEventListener('click', () => fecharModal(modalTermos));
  if (btnFecharXTermos) btnFecharXTermos.addEventListener('click', () => fecharModal(modalTermos));

  // Modal: Login do Motorista (Terminal Operacional)
  if (botaoOlhoMotorista && inputMotPin) {
    botaoOlhoMotorista.addEventListener('click', function () {
      const estaOculta = inputMotPin.type === 'password';
      inputMotPin.type = estaOculta ? 'text' : 'password';

      const useEl = botaoOlhoMotorista.querySelector('use');
      if (useEl) {
        useEl.setAttribute('href', estaOculta ? '#icone-olho-off' : '#icone-olho');
      }

      botaoOlhoMotorista.setAttribute('aria-label', estaOculta ? 'Ocultar PIN' : 'Mostrar PIN');
    });
  }

  // Auto-preenchimento ao digitar a matrícula do motorista cadastrado pelo Gestor
  if (inputMotId) {
    const buscarMotoristaCadastrado = () => {
      const val = inputMotId.value.trim().toUpperCase();
      if (!val || val.length < 3) return;

      try {
        const mot = (window.ValeBusAPI && typeof window.ValeBusAPI.buscarMotoristaPorMatricula === 'function')
          ? window.ValeBusAPI.buscarMotoristaPorMatricula(val)
          : null;

        if (mot) {
          if (selectMotLinha && mot.linha) {
            for (let i = 0; i < selectMotLinha.options.length; i++) {
              if (selectMotLinha.options[i].text.toLowerCase().includes(mot.linha.toLowerCase().replace('linha ', ''))) {
                selectMotLinha.selectedIndex = i;
                break;
              }
            }
          }
          if (selectMotVeiculo && mot.veiculo) {
            for (let i = 0; i < selectMotVeiculo.options.length; i++) {
              if (mot.veiculo.includes(selectMotVeiculo.options[i].value)) {
                selectMotVeiculo.selectedIndex = i;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar motoristas cadastrados:', e);
      }
    };

    inputMotId.addEventListener('blur', buscarMotoristaCadastrado);
    inputMotId.addEventListener('input', () => {
      if (inputMotId.value.trim().length >= 4) {
        buscarMotoristaCadastrado();
      }
    });
  }

  if (btnLoginMotorista) {
    btnLoginMotorista.addEventListener('click', () => {
      if (motoristaSucesso) motoristaSucesso.style.display = 'none';
      if (motoristaErro) motoristaErro.style.display = 'none';
      abrirModal(modalMotorista, inputMotId);
    });
  }

  if (btnCancelarMot) {
    btnCancelarMot.addEventListener('click', () => fecharModal(modalMotorista));
  }

  if (btnFecharXMotorista) {
    btnFecharXMotorista.addEventListener('click', () => fecharModal(modalMotorista));
  }

  if (formMotorista) {
    formMotorista.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = inputMotId ? inputMotId.value.trim() : '';
      const senha = inputMotPin ? inputMotPin.value : '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (motoristaErro) {
          motoristaErroTxt.textContent = 'Informe um e-mail válido.';
          motoristaErro.style.display = 'flex';
        }
        inputMotId?.focus();
        return;
      }
      if (!senha) {
        if (motoristaErro) {
          motoristaErroTxt.textContent = 'Informe sua senha.';
          motoristaErro.style.display = 'flex';
        }
        inputMotPin?.focus();
        return;
      }

      if (motoristaErro) motoristaErro.style.display = 'none';
      if (motoristaSucesso) motoristaSucesso.style.display = 'none';
      if (btnConfirmarMot) btnConfirmarMot.disabled = true;
      if (txtBtnMotorista) txtBtnMotorista.textContent = 'Entrando...';

      try {
        const usuario = await window.ValeBusAPI.autenticar({ email, senha });
        if (usuario.papel !== 'motorista') {
          await window.ValeBusAPI.encerrarSessaoAsync(null);
          throw new Error('Esta conta não possui perfil de motorista.');
        }
        if (motoristaSucesso) motoristaSucesso.style.display = 'flex';
        setTimeout(() => { window.location.href = 'motorista.html'; }, 650);
      } catch (erro) {
        if (motoristaErro) {
          motoristaErroTxt.textContent = erro.message || 'Não foi possível entrar. Revise suas credenciais.';
          motoristaErro.style.display = 'flex';
        }
        if (btnConfirmarMot) btnConfirmarMot.disabled = false;
        if (txtBtnMotorista) txtBtnMotorista.textContent = 'Entrar';
      }
    });
  }

  // Fechar modais ao clicar no overlay
  [modalGoogle, modalEsqueceu, modalCadastro, modalTermos, modalMotorista, modalGestor2fa].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === modalGoogle) {
            fecharModalGoogle();
          } else {
            fecharModal(modal);
          }
        }
      });
    }
  });

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModalGoogle();
      fecharModal(modalEsqueceu);
      fecharModal(modalCadastro);
      fecharModal(modalTermos);
      fecharModal(modalMotorista);
      fecharModal(modalGestor2fa);
    }
  });

  /* ──────────────────────────────────────────────────────────
     FLUXO: CÓDIGO DE SEGURANÇA DO GESTOR (2FA / CCO)
     ────────────────────────────────────────────────────────── */
  function solicitarCodigoSegurancaGestor(dadosUsuario) {
    dadosGestorPendente = dadosUsuario || {};
    codigoGestorAtual = gerarCodigo6Digitos();

    if (gestor2faEmail) {
      gestor2faEmail.textContent = dadosGestorPendente.email || 'valebussrs@gmail.com';
    }
    if (gestor2faErro) {
      gestor2faErro.style.display = 'none';
    }
    if (gestor2faSucesso) {
      gestor2faSucesso.style.display = 'none';
    }
    if (btnConfirmarGestor2fa) {
      btnConfirmarGestor2fa.disabled = false;
    }
    if (txtBtnConfirmarGestor) {
      txtBtnConfirmarGestor.textContent = 'Confirmar e Acessar CCO';
    }

    limparSegmentado('gestor');
    abrirModal(modalGestor2fa);
    iniciarTemporizador('gestor');

    // Foca suavemente no primeiro dígito
    setTimeout(() => {
      const primeiroDigito = document.querySelector('.codigo-digito[data-grupo="gestor"][data-index="0"]');
      if (primeiroDigito) {
        primeiroDigito.focus();
        primeiroDigito.select();
      }
    }, 150);
  }

  async function validarCodigoGestor() {
    let digitado = obterCodigoSegmentado('gestor');

    // Validação flexível (enquanto não há backend integrado, aceita qualquer código)
    if (!digitado || digitado.length === 0) {
      preencherSegmentado('gestor', '123456');
      digitado = '123456';
    } else if (digitado.length < 6) {
      digitado = digitado.padEnd(6, '0');
      preencherSegmentado('gestor', digitado);
    }

    // Código validado com sucesso! (Aceita qualquer código na fase atual sem backend)
    if (gestor2faErro) gestor2faErro.style.display = 'none';
    if (gestor2faSucesso) gestor2faSucesso.style.display = 'flex';

    if (btnConfirmarGestor2fa) btnConfirmarGestor2fa.disabled = true;
    if (txtBtnConfirmarGestor) txtBtnConfirmarGestor.textContent = 'Acesso Autorizado!';

    try {
      const emailFinal = (dadosGestorPendente && dadosGestorPendente.email) || 'valebussrs@gmail.com';
      const usuarioFinal = {
        nome: (dadosGestorPendente && dadosGestorPendente.nome) || 'Gestor Operacional ValeBus',
        email: emailFinal,
        cargo: 'Gestor CCO & Frotas Master',
        perfil: 'gestor',
        matricula: 'CCO-001',
        veiculo: 'Supervisor CCO (Frota Geral)',
        metodo: (dadosGestorPendente && dadosGestorPendente.metodo) ? `${dadosGestorPendente.metodo} (2FA Validado)` : '2FA Código de Segurança',
        autenticado2FA: true,
        dataAcesso: new Date().toISOString()
      };
      salvarSessaoLogin(usuarioFinal);
    } catch (e) {
      console.warn('Erro ao gravar sessão do gestor:', e);
    }

    await esperar(800);
    window.location.href = 'gestor.html';
  }

  if (btnReenviarGestor) {
    btnReenviarGestor.addEventListener('click', () => {
      codigoGestorAtual = gerarCodigo6Digitos();
      limparSegmentado('gestor');
      if (gestor2faErro) gestor2faErro.style.display = 'none';
      iniciarTemporizador('gestor');
    });
  }

  if (btnConfirmarGestor2fa) {
    btnConfirmarGestor2fa.addEventListener('click', () => {
      validarCodigoGestor();
    });
  }

  if (btnCancelarGestor2fa) {
    btnCancelarGestor2fa.addEventListener('click', () => {
      fecharModal(modalGestor2fa);
    });
  }

  if (btnFecharXGestor2fa) {
    btnFecharXGestor2fa.addEventListener('click', () => {
      fecharModal(modalGestor2fa);
    });
  }


  /* ──────────────────────────────────────────────────────────
     10. SIMULAÇÃO DE PROCESSAMENTO DE LOGIN
     ────────────────────────────────────────────────────────── */
  async function simularLogin(email, senha) {
    setCarregando(true);

    try {
      await esperar(950);

      const ehGestor = verificarSeEhGestor(email);
      if (ehGestor) {
        setCarregando(false);
        resetarBotao();
        solicitarCodigoSegurancaGestor({
          nome: 'Gestor ValeBus SRS',
          email: email,
          metodo: 'Email/Senha'
        });
        return;
      }

      setCarregando(false);
      if (botaoEntrar) {
        botaoEntrar.disabled = true;
        botaoEntrar.classList.add('botao-entrar--sucesso');
      }
      if (iconePadrao) iconePadrao.style.display = 'none';
      if (iconeLoading) iconeLoading.style.display = 'none';
      if (iconeSucesso) iconeSucesso.style.display = 'inline-block';
      if (textoBotao) {
        textoBotao.textContent = 'Acesso autorizado!';
      }

      await esperar(700);
      window.location.href = 'dashboard.html';

    } catch (erro) {
      setCarregando(false);
      resetarBotao();
      mostrarErro('Não foi possível entrar. Revise seu e-mail e senha e tente novamente.');
    }
  }


  /* ──────────────────────────────────────────────────────────
     FUNÇÕES AUXILIARES
     ────────────────────────────────────────────────────────── */
  function mostrarErro(mensagem, campoComErro = null) {
    if (erroTexto) erroTexto.textContent = mensagem;
    if (erroMensagem) erroMensagem.classList.remove('erro-mensagem--oculto');

    if (inputEmail) {
      inputEmail.classList.remove('campo__input--erro');
      inputEmail.setAttribute('aria-invalid', 'false');
    }
    if (inputSenha) {
      inputSenha.classList.remove('campo__input--erro');
      inputSenha.setAttribute('aria-invalid', 'false');
    }

    if (campoComErro) {
      campoComErro.classList.add('campo__input--erro');
      campoComErro.setAttribute('aria-invalid', 'true');
    }
  }

  function ocultarErro() {
    if (erroMensagem) erroMensagem.classList.add('erro-mensagem--oculto');
    if (inputEmail) {
      inputEmail.classList.remove('campo__input--erro');
      inputEmail.setAttribute('aria-invalid', 'false');
    }
    if (inputSenha) {
      inputSenha.classList.remove('campo__input--erro');
      inputSenha.setAttribute('aria-invalid', 'false');
    }
  }

  function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validarSenha(senha) {
    if (senha.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres.';
    }
    if (!/[A-Z]/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra maiúscula.';
    }
    if (!/[^A-Za-z0-9]/.test(senha)) {
      return 'A senha deve conter pelo menos um símbolo (ex: @, #, $, !).';
    }
    return null;
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function setCarregando(ativo) {
    if (botaoEntrar) {
      botaoEntrar.disabled = ativo;
      if (ativo) {
        botaoEntrar.classList.add('botao-entrar--carregando');
        botaoEntrar.classList.remove('botao-entrar--sucesso');
      } else {
        botaoEntrar.classList.remove('botao-entrar--carregando');
      }
    }
    if (iconePadrao) {
      iconePadrao.style.display = ativo ? 'none' : 'inline-block';
    }
    if (iconeLoading) {
      iconeLoading.style.display = ativo ? 'inline-block' : 'none';
    }
    if (iconeSucesso) {
      iconeSucesso.style.display = 'none';
    }
    if (textoBotao) {
      textoBotao.textContent = ativo ? 'Entrando...' : 'Entrar';
    }
  }

  function resetarBotao() {
    if (botaoEntrar) {
      botaoEntrar.disabled = false;
      botaoEntrar.classList.remove('botao-entrar--carregando', 'botao-entrar--sucesso');
    }
    if (iconePadrao) iconePadrao.style.display = 'inline-block';
    if (iconeLoading) iconeLoading.style.display = 'none';
    if (iconeSucesso) iconeSucesso.style.display = 'none';
    if (textoBotao) textoBotao.textContent = 'Entrar';
  }

  if (inputEmail) inputEmail.addEventListener('input', ocultarErro);
  if (inputSenha) inputSenha.addEventListener('input', ocultarErro);

  function ocultarErroCadastro() {
    if (cadastroErro) cadastroErro.style.display = 'none';
  }
  if (inputCadNome) inputCadNome.addEventListener('input', ocultarErroCadastro);
  if (inputCadEmail) inputCadEmail.addEventListener('input', ocultarErroCadastro);
  if (inputCadSenha) {
    inputCadSenha.addEventListener('input', () => {
      ocultarErroCadastro();
      atualizarIndicadorSenha(inputCadSenha.value);
    });
  }

})();