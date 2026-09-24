# Viagem do motorista no painel público

O painel consulta `GET /api/viagens/publicas` a cada cinco segundos, sem login.
O início e encerramento são reais no PostgreSQL; a posição é uma animação
identificada como simulada, com aproximadamente dois minutos e meio de percurso.
Ao chegar ao fim, aguarda o encerramento pelo motorista, sem reiniciar.
Ao voltar à aba Passageiro, consulta o servidor novamente. Recarregar mantém
a etapa do percurso calculada pelo horário de início registrado no servidor.
Usa todos os segmentos dos trajetos existentes em `frontend/js/paradas.js`.
Motorista e Passageiro usam o mesmo cálculo em `viagem-automatica.js`.
O veículo parado do Motorista não se move; ao restaurar a viagem, sua posição
também considera o horário de início. Nenhum contador inicia uma viagem.
Não consulta `posicoes_veiculo`, não publica GPS de garagem nem usa Realtime.

## Preparação no Supabase

1. Abra o projeto → SQL Editor → New query.
2. Execute o conteúdo de `database/garagem-posicoes-privadas.sql`.
   É necessário mesmo em bancos que já executaram o schema anteriormente:
   a política antiga permitia leitura pública do GPS de suporte. Esse arquivo
   revoga a consulta pública sem apagar posições existentes.
3. No Table Editor, confira `linhas` e `veiculos`. Cadastrar um motorista
   ativo não cria esses registros. Se vazios, execute na raiz do projeto
   `node scripts/preparar-catalogo.js --aplicar` com o `.env` configurado.
   Sem `--aplicar`, o script só mostra o catálogo. Insere apenas registros
   ausentes e preserva os existentes. Também é possível executar no SQL Editor
   `database/catalogo-viagens.sql`, cujos nomes, cores e prefixos vêm de
   `frontend/js/catalogo-operacional.js` e `frontend/gestor.html`.
   Nenhuma parada ou coordenada é migrada. Se o catálogo já existe, revise
   os nomes em vez de duplicar linhas com outros códigos.
4. Linhas e veículos devem estar ativos. A linha deve ser pública e ter
   código igual à chave em `paradas.js`,
   como `anchieta` ou `industrial`. Os nomes conhecidos também são aceitos
   para mapear o catálogo visual. Linhas desconhecidas não viram Anchieta.
5. Todas as oito linhas existentes usam o mesmo fluxo, desde que `ativo` e
   `publica` estejam habilitados. O catálogo inicial agora inclui Fernandes
   pública; registros anteriores não são alterados pelo script.
6. O gestor cadastra o acesso do motorista. Linha e ônibus no cadastro são
   sugestões opcionais. O motorista confirma ou altera ambos após autenticar.
   O login consulta `GET /api/viagens/opcoes`; o início envia `linhaChave` e
   `veiculoId`. Não há vínculo obrigatório por nome com os campos habituais.
   A escolha fica na sessão da aba e é vinculada ao usuário autenticado.
   Uma viagem já ativa prevalece sobre sugestões e seleções antigas.

## Executar na máquina

No terminal que estiver rodando o backend, pressione Ctrl+C. Depois:

```bash
cd /home/allan/Documentos/ValeBus
npm start
```

Não precisa de Python nem de outro servidor de frontend. Mantenha o `.env`
existente com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas no backend.
Nenhuma nova variável é necessária.

1. Abra `http://localhost:3000/api/health`: `status` deve ser `ok`.
   `database: configured` só confirma configuração, não conexão.
2. Abra `http://localhost:3000/api/viagens/publicas`: deve retornar JSON com
   `data` (lista vazia quando não há viagens públicas) e `agora`.
3. Abra `http://localhost:3000/frontend/dashboard.html` em outra janela.
4. Faça login de motorista em `http://localhost:3000/frontend/login.html`.
   Após e-mail e senha, escolha linha e ônibus e clique em Entrar na operação.
   No painel, clique em Iniciar Rota. O servidor valida as duas escolhas no
   catálogo ativo e grava os IDs na viagem. A identidade do motorista vem da
   sessão autenticada. A seleção não altera as sugestões no cadastro do gestor.
   Se houver viagem ativa, o login oferece Retomar viagem. Ônibus ocupado
   por outra viagem não pode iniciar uma segunda operação simultânea.
5. Em até cinco segundos mais o tempo da rede, o Passageiro deve exibir
   o veículo da viagem e enquadrar a linha quando só houver uma viagem.
   O marcador percorre o traçado validado. Abas abertas depois usam o horário
   de início salvo no banco para calcular a mesma etapa do percurso.
6. Encerre a viagem: o marcador deve sair após a próxima atualização.
7. Confira em Table Editor → `viagens` os horários e o status.
8. Repita com Industrial ou outra linha cadastrada. Abra outra aba Passageiro
   durante o percurso e recarregue: ambas devem mostrar a mesma viagem, sem
   duplicação nem retorno ao início. Aguarde 2min30s: permanece no final até
   clicar em Encerrar Rota. Sem viagens, deve mostrar "Aguardando início de viagem".

Não existe mais um modo independente da Anchieta. A API precisa estar disponível;
falhas de conexão nunca criam viagens fictícias. As abas podem estar no mesmo navegador.
As chaves locais antigas de linha/veículo não publicam viagens. O catálogo de
paradas não escolhe Anchieta quando recebe uma chave vazia ou desconhecida.
Sem viagens, contadores ficam zerados e o painel informa que aguarda o motorista.
Os cards mostram os veículos das viagens; estimativas fixas de chegada e avisos
automáticos antigos foram retirados. Avisos cadastrados pelo usuário são preservados.

Falha de rede limpa os marcadores e mostra indisponibilidade; o painel tenta
novamente automaticamente. Veja erros no terminal do Node e em DevTools →
Network/Console. O código no GitHub Pages precisa de um backend publicado
para o modo integrado; este trabalho não faz deploy nem configura Render.

## Verificação automatizada

```bash
node --test tests/auth-motoristas.test.js tests/viagens-publicas.test.js
```

Os testes usam respostas isoladas do Supabase e não criam/excluem contas ou
viagens reais. Teste de gravação real deve ser feito pelo fluxo acima.

Para testar a interface com o Chrome já instalado, sem novas dependências:

```bash
VALEBUS_BROWSER_TEST=1 node --test tests/viagens-interface.test.js
```

Use `CHROME_BIN` se o executável não estiver em `/usr/bin/google-chrome`.
O teste abre um perfil temporário com abas reais e serve respostas de API em
memória: não carrega `.env` nem grava no Supabase. O Leaflet é o mesmo CDN da
aplicação, que precisa estar acessível. Cobre login pelos dois formulários,
escolha diferente da sugestão do gestor, recuperação de falha no catálogo,
retomada da viagem, as oito linhas, duas abas,
abertura antes/depois do início, recargas, final do percurso, encerramento,
duplicatas, campos inválidos, indisponibilidade e recuperação. O final dos
150 segundos é verificado avançando somente o relógio de teste.
Também verifica ausência de exceções e mensagens `console.error`/`console.warn`.
