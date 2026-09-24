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
