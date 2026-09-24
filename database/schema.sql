-- ValeBus: esquema inicial para Supabase/PostgreSQL.
-- Execute no SQL Editor do Supabase antes de configurar o servidor.

create extension if not exists pgcrypto;

create table if not exists linhas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  cor text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists paradas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  endereco text,
  referencia text,
  latitude double precision not null,
  longitude double precision not null,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude between -90 and 90),
  check (longitude between -180 and 180)
);

create table if not exists linha_paradas (
  linha_id uuid not null references linhas(id) on delete cascade,
  parada_id uuid not null references paradas(id) on delete restrict,
  ordem integer not null check (ordem > 0),
  sentido text,
  primary key (linha_id, parada_id),
  unique (linha_id, ordem)
);

create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  prefixo text not null unique,
  nome text not null,
  placa text unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists motoristas (
  id uuid primary key default gen_random_uuid(),
  matricula text not null unique,
  nome text not null,
  email text unique,
  telefone text,
  cnh text,
  categoria_cnh text,
  cnh_validade date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viagens (
  id uuid primary key default gen_random_uuid(),
  linha_id uuid not null references linhas(id),
  veiculo_id uuid not null references veiculos(id),
  motorista_id uuid not null references motoristas(id),
  status text not null default 'planejada' check (status in ('planejada', 'em_andamento', 'encerrada', 'cancelada')),
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  created_at timestamptz not null default now(),
  check (encerrada_em is null or iniciada_em is null or encerrada_em >= iniciada_em)
);

create table if not exists posicoes_veiculo (
  id bigint generated always as identity primary key,
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  viagem_id uuid references viagens(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  velocidade_kmh numeric(5,2),
  registrado_em timestamptz not null default now(),
  check (latitude between -90 and 90),
  check (longitude between -180 and 180)
);
create index if not exists posicoes_veiculo_veiculo_registrado_idx on posicoes_veiculo (veiculo_id, registrado_em desc);

create table if not exists ocorrencias (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid references viagens(id) on delete set null,
  motorista_id uuid references motoristas(id) on delete set null,
  veiculo_id uuid references veiculos(id) on delete set null,
  categoria text not null check (categoria in ('transito', 'garagem', 'operacional')),
  titulo text not null,
  descricao text,
  gravidade text not null default 'baixa' check (gravidade in ('baixa', 'moderada', 'alta')),
  status text not null default 'aberta' check (status in ('aberta', 'em_atendimento', 'resolvida')),
  latitude double precision,
  longitude double precision,
  criada_em timestamptz not null default now(),
  resolvida_em timestamptz,
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);


-- Evolução do MVP: autenticação, permissões e dados operacionais.
-- Pode ser executada depois da seção inicial, inclusive em um banco que já
-- possua as tabelas acima. Não cria usuários nem altera dados existentes.

alter table linhas add column if not exists publica boolean not null default true;

create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('gestor', 'motorista')),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table motoristas
  add column if not exists usuario_id uuid unique references auth.users(id) on delete set null;

create table if not exists trajeto_pontos (
  id bigint generated always as identity primary key,
  linha_id uuid not null references linhas(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  unique (linha_id, ordem)
);

create table if not exists solicitacoes_socorro (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null unique references ocorrencias(id) on delete cascade,
  viagem_id uuid references viagens(id) on delete set null,
  motorista_id uuid not null references motoristas(id) on delete restrict,
  status text not null default 'solicitado'
    check (status in ('solicitado', 'despachado', 'em_atendimento', 'concluido', 'cancelado')),
  observacao text,
  solicitado_em timestamptz not null default now(),
  atendido_por uuid references perfis(id) on delete set null,
  atendido_em timestamptz,
  updated_at timestamptz not null default now()
);

alter table ocorrencias
  add column if not exists localizacao_texto text,
  add column if not exists precisa_socorro boolean not null default false,
  add column if not exists atendida_por uuid references perfis(id) on delete set null,
  add column if not exists atendida_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ocorrencias_coordenadas_completas_check'
  ) then
    alter table ocorrencias add constraint ocorrencias_coordenadas_completas_check
      check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));
  end if;
end $$;

create unique index if not exists viagens_motorista_ativa_unica
  on viagens (motorista_id) where status = 'em_andamento';
create unique index if not exists viagens_veiculo_ativa_unica
  on viagens (veiculo_id) where status = 'em_andamento';
create index if not exists trajetos_linha_ordem_idx on trajeto_pontos (linha_id, ordem);
create index if not exists motoristas_usuario_idx on motoristas (usuario_id);
create index if not exists ocorrencias_motorista_criada_idx on ocorrencias (motorista_id, criada_em desc);
create index if not exists socorros_status_solicitado_idx on solicitacoes_socorro (status, solicitado_em desc);

create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists linhas_updated_at on linhas;
create trigger linhas_updated_at before update on linhas
  for each row execute function public.atualizar_updated_at();
drop trigger if exists paradas_updated_at on paradas;
create trigger paradas_updated_at before update on paradas
  for each row execute function public.atualizar_updated_at();
drop trigger if exists veiculos_updated_at on veiculos;
create trigger veiculos_updated_at before update on veiculos
  for each row execute function public.atualizar_updated_at();
drop trigger if exists motoristas_updated_at on motoristas;
create trigger motoristas_updated_at before update on motoristas
  for each row execute function public.atualizar_updated_at();
drop trigger if exists perfis_updated_at on perfis;
create trigger perfis_updated_at before update on perfis
  for each row execute function public.atualizar_updated_at();
drop trigger if exists solicitacoes_socorro_updated_at on solicitacoes_socorro;
create trigger solicitacoes_socorro_updated_at before update on solicitacoes_socorro
  for each row execute function public.atualizar_updated_at();

-- A função consulta uma tabela protegida; dados enviados pelo navegador não
-- determinam o papel do usuário.
create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and papel = 'gestor'
      and ativo = true
  );
$$;

revoke all on function public.eh_gestor() from public;
grant execute on function public.eh_gestor() to authenticated;

-- Mantém a consulta pública de posições limitada a viagens em andamento de
-- linhas publicadas, sem conceder acesso direto à tabela de viagens.
create or replace function public.posicao_eh_publica(id_viagem uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.viagens v
    join public.linhas l on l.id = v.linha_id
    where v.id = id_viagem
      and v.status = 'em_andamento'
      and l.ativo and l.publica
  );
$$;

revoke all on function public.posicao_eh_publica(uuid) from public;
grant execute on function public.posicao_eh_publica(uuid) to anon, authenticated;

alter table linhas enable row level security;
alter table paradas enable row level security;
alter table linha_paradas enable row level security;
alter table trajeto_pontos enable row level security;
alter table veiculos enable row level security;
alter table perfis enable row level security;
alter table motoristas enable row level security;
alter table viagens enable row level security;
alter table posicoes_veiculo enable row level security;
alter table ocorrencias enable row level security;
alter table solicitacoes_socorro enable row level security;

revoke all on linhas, paradas, linha_paradas, trajeto_pontos, veiculos,
  perfis, motoristas, viagens, posicoes_veiculo, ocorrencias,
  solicitacoes_socorro from anon, authenticated;

grant select on linhas, paradas, linha_paradas, trajeto_pontos
  to anon, authenticated;
grant select on posicoes_veiculo to authenticated;
grant select on perfis, motoristas, viagens, ocorrencias, solicitacoes_socorro
  to authenticated;

drop policy if exists "catalogo publico de linhas" on linhas;
create policy "catalogo publico de linhas" on linhas for select
  to anon, authenticated using (ativo and publica);

drop policy if exists "catalogo publico de paradas" on paradas;
create policy "catalogo publico de paradas" on paradas for select
  to anon, authenticated using (
    ativa and exists (
      select 1 from linha_paradas lp
      join linhas l on l.id = lp.linha_id
      where lp.parada_id = paradas.id and l.ativo and l.publica
    )
  );

drop policy if exists "ordem publica de paradas" on linha_paradas;
create policy "ordem publica de paradas" on linha_paradas for select
  to anon, authenticated using (
    exists (
      select 1 from linhas l
      where l.id = linha_paradas.linha_id and l.ativo and l.publica
    )
  );

drop policy if exists "trajetos publicos" on trajeto_pontos;
create policy "trajetos publicos" on trajeto_pontos for select
  to anon, authenticated using (
    exists (
      select 1 from linhas l
      where l.id = trajeto_pontos.linha_id and l.ativo and l.publica
    )
  );

drop policy if exists "posicoes publicas em viagem" on posicoes_veiculo;
-- GPS de suporte da garagem não é telemetria pública.
revoke select on posicoes_veiculo from anon;

drop policy if exists "perfis proprios ou gestor" on perfis;
create policy "perfis proprios ou gestor" on perfis for select
  to authenticated using (id = (select auth.uid()) or (select public.eh_gestor()));

drop policy if exists "motorista proprio ou gestor" on motoristas;
create policy "motorista proprio ou gestor" on motoristas for select
  to authenticated using (usuario_id = (select auth.uid()) or (select public.eh_gestor()));

drop policy if exists "viagens do motorista ou gestor" on viagens;
create policy "viagens do motorista ou gestor" on viagens for select
  to authenticated using (
    (select public.eh_gestor()) or exists (
      select 1 from motoristas m
      where m.id = viagens.motorista_id and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "posicoes da propria viagem ou gestor" on posicoes_veiculo;
create policy "posicoes da propria viagem ou gestor" on posicoes_veiculo for select
  to authenticated using (
    (select public.eh_gestor()) or exists (
      select 1 from viagens v
      join motoristas m on m.id = v.motorista_id
      where v.id = posicoes_veiculo.viagem_id and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "ocorrencias do motorista ou gestor" on ocorrencias;
create policy "ocorrencias do motorista ou gestor" on ocorrencias for select
  to authenticated using (
    (select public.eh_gestor()) or exists (
      select 1 from motoristas m
      where m.id = ocorrencias.motorista_id and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "socorros do motorista ou gestor" on solicitacoes_socorro;
create policy "socorros do motorista ou gestor" on solicitacoes_socorro for select
  to authenticated using (
    (select public.eh_gestor()) or exists (
      select 1 from motoristas m
      where m.id = solicitacoes_socorro.motorista_id and m.usuario_id = (select auth.uid())
    )
  );

-- Todas as escritas continuam passando pelo Express, que validará o token e o
-- papel antes de usar o cliente administrativo do Supabase. Realtime será
-- habilitado para posicoes_veiculo em uma etapa posterior, após a API de
-- localização e as políticas terem sido testadas.

-- Etapa de cadastro real de motoristas: mantém os dados operacionais já
-- existentes no formulário administrativo. Execute este bloco no Supabase
-- mesmo se o restante deste arquivo já tiver sido executado anteriormente.
alter table motoristas
  add column if not exists cpf text,
  add column if not exists linha_habitual text,
  add column if not exists veiculo_habitual text,
  add column if not exists turno text,
  add column if not exists status_operacional text not null default 'ativo';

create unique index if not exists motoristas_cpf_unico_idx
  on motoristas (cpf) where cpf is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'motoristas_status_operacional_check'
  ) then
    alter table motoristas add constraint motoristas_status_operacional_check
      check (status_operacional in ('ativo', 'viagem', 'folga', 'inativo'));
  end if;
end $$;
