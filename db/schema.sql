-- =====================================================================
-- Template de agendamento — esquema do banco (PostgreSQL / Neon)
--
-- Rode uma vez por cliente (npm run db:setup ou cole no SQL Editor do Neon).
-- Pode rodar de novo sem medo: tudo usa "if not exists".
--
-- Horários são "de parede" (timestamp SEM fuso): o negócio fica num lugar só.
-- Valores em centavos (inteiro), nunca float.
-- =====================================================================

create extension if not exists btree_gist;   -- usada pela regra anti-conflito

-- ---------------------------------------------------------------------
-- configuracoes: linha única (id = 1). Textos do site e regras da agenda.
-- ---------------------------------------------------------------------
create table if not exists configuracoes (
  id                  smallint primary key default 1 check (id = 1),
  nome_negocio        text not null default 'Meu Negócio',
  slogan              text not null default '',
  hero_titulo         text not null default 'Agende seu horário em menos de um minuto.',
  hero_subtitulo      text not null default 'Escolha o serviço, o dia e o horário. Sem precisar esperar resposta no WhatsApp.',
  sobre               text not null default '',
  whatsapp            text not null default '' check (whatsapp = '' or whatsapp ~ '^\d{12,13}$'),
  instagram           text not null default '',
  endereco            text not null default '',
  mapa_url            text not null default '',
  aviso_agendamento   text not null default '',
  intervalo_minutos   integer not null default 0   check (intervalo_minutos between 0 and 120),
  passo_minutos       integer not null default 30  check (passo_minutos between 5 and 120),
  antecedencia_horas  integer not null default 2   check (antecedencia_horas between 0 and 168),
  janela_dias         integer not null default 60  check (janela_dias between 7 and 365),
  timezone            text not null default 'America/Fortaleza',
  -- como o negócio chama cada agenda: "Profissional", "Quadra", "Sala", "Cadeira"…
  rotulo_recurso      text not null default 'Profissional',
  msg_agendamento     text not null default 'Olá! Acabei de agendar [SERVIÇO] para [DATA], às [HORÁRIO]. Meu nome é [NOME].',
  msg_lembrete        text not null default 'Olá, [NOME]! Passando para lembrar do seu horário: [SERVIÇO], [DATA] às [HORÁRIO]. Até lá!'
);
insert into configuracoes (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- recursos: cada agenda independente (uma profissional, uma quadra, uma sala).
-- Dois agendamentos só conflitam se forem no MESMO recurso.
-- ---------------------------------------------------------------------
create table if not exists recursos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 60),
  ativo      boolean not null default true,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- servicos
-- ---------------------------------------------------------------------
create table if not exists servicos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (char_length(nome) between 2 and 80),
  descricao        text not null default '' check (char_length(descricao) <= 300),
  preco_centavos   integer not null check (preco_centavos >= 0),
  duracao_minutos  integer not null check (duracao_minutos between 5 and 600),
  ativo            boolean not null default true,
  ordem            integer not null default 0,
  criado_em        timestamptz not null default now()
);
create index if not exists servicos_ativo_ordem_idx on servicos (ativo, ordem);

-- quais recursos fazem cada serviço (ex.: "Beach Tennis 1h" → Quadra 1, Quadra 2)
create table if not exists servico_recursos (
  servico_id  uuid not null references servicos(id) on delete cascade,
  recurso_id  uuid not null references recursos(id) on delete cascade,
  primary key (servico_id, recurso_id)
);

-- ---------------------------------------------------------------------
-- horarios_funcionamento: 1 linha por dia da semana (0 = domingo … 6 = sábado)
-- ---------------------------------------------------------------------
create table if not exists horarios_funcionamento (
  dia_semana     smallint primary key check (dia_semana between 0 and 6),
  atende         boolean not null default true,
  abre           time not null default '09:00',
  fecha          time not null default '18:00',
  pausa_inicio   time,
  pausa_fim      time,
  check (not atende or fecha > abre),
  check ((pausa_inicio is null) = (pausa_fim is null)),
  check (pausa_inicio is null or (pausa_fim > pausa_inicio and pausa_inicio >= abre and pausa_fim <= fecha))
);
insert into horarios_funcionamento (dia_semana, atende) values
  (0, false), (1, true), (2, true), (3, true), (4, true), (5, true), (6, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- bloqueios: períodos em que não se atende (folga, feriado, compromisso)
-- ---------------------------------------------------------------------
create table if not exists bloqueios (
  id          uuid primary key default gen_random_uuid(),
  recurso_id  uuid references recursos(id) on delete cascade,   -- nulo = vale para todos
  inicio      timestamp not null,
  fim         timestamp not null,          -- exclusivo
  motivo      text not null default '' check (char_length(motivo) <= 120),
  criado_em   timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists bloqueios_periodo_idx on bloqueios (inicio, fim);

-- ---------------------------------------------------------------------
-- clientes (WhatsApp só com dígitos e DDI 55 é a chave natural)
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 2 and 80),
  whatsapp   text not null unique check (whatsapp ~ '^\d{12,13}$'),
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- agendamentos
-- ---------------------------------------------------------------------
create table if not exists agendamentos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clientes(id) on delete restrict,
  servico_id       uuid references servicos(id) on delete set null,
  recurso_id       uuid not null references recursos(id) on delete restrict,
  starts_at       timestamp not null,
  ends_at          timestamp not null,
  -- fim do atendimento + intervalo entre clientes: o período realmente ocupado.
  blocked_until    timestamp not null,
  status           text not null default 'agendado'
                   check (status in ('agendado','concluido','cancelado','faltou')),
  -- "foto" do serviço na hora do agendamento: mudar o preço depois não altera o histórico.
  servico_nome     text not null,
  preco_centavos   integer not null check (preco_centavos >= 0),
  duracao_minutos  integer not null check (duracao_minutos > 0),
  observacao       text not null default '' check (char_length(observacao) <= 500),
  origem           text not null default 'site' check (origem in ('site','painel')),
  criado_em        timestamptz not null default now(),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at)
);
create index if not exists agendamentos_starts_at_idx on agendamentos (starts_at);
create index if not exists agendamentos_cliente_idx   on agendamentos (cliente_id, starts_at desc);

-- ANTI-CONFLITO: no mesmo recurso, dois agendamentos ativos nunca ocupam o mesmo período,
-- nem com dois acessos ao mesmo tempo. Cancelado e "faltou" ficam de fora: o horário volta
-- a ficar livre.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_sem_conflito') then
    alter table agendamentos add constraint agendamentos_sem_conflito
      exclude using gist (recurso_id with =, tsrange(starts_at, blocked_until, '[)') with &&)
      where (status in ('agendado','concluido'));
  end if;
end $$;
