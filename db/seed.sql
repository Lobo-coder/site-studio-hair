-- =====================================================================
-- Studio Hair Premium: dados iniciais.
-- ATENÇÃO: profissionais, preços, durações e horários são EXEMPLOS para a demonstração.
-- Confirme com o salão e ajuste aqui (ou pelo painel) antes de ir ao ar.
-- =====================================================================

update configuracoes set
  nome_negocio       = 'Studio Hair',
  slogan             = 'Manaíra · João Pessoa',
  hero_titulo        = 'Beleza com hora marcada.',
  hero_subtitulo     = 'Unhas de gel, megahair, loiros e alisamentos. Escolha o serviço e o horário livre, sem esperar resposta no WhatsApp.',
  sobre              = 'Um espaço completo para a sua beleza! Cabelo, unhas e tratamentos com uma equipe especializada, no coração de Manaíra.',
  whatsapp           = '5583996791030',
  instagram          = 'studiohairjp',
  endereco           = 'Av. Flávio Ribeiro Coutinho, 170 – Manaíra, João Pessoa – PB',
  aviso_agendamento  = 'Chegue 10 minutos antes. Para remarcar ou cancelar, avise com pelo menos 24 horas de antecedência.',
  intervalo_minutos  = 0,
  passo_minutos      = 30,
  antecedencia_horas = 2,
  janela_dias        = 60,
  rotulo_recurso     = 'Profissional',
  msg_agendamento    = 'Olá! Acabei de agendar [SERVIÇO] para [DATA], às [HORÁRIO], pelo site. Meu nome é [NOME].',
  msg_lembrete       = 'Oi, [NOME]! Passando para lembrar do seu horário no Studio Hair: [SERVIÇO], [DATA] às [HORÁRIO]. Te esperamos!'
where id = 1;

-- Segunda a sábado (como no Instagram). Horas de exemplo: seg–sex 08h–19h, sábado 08h–17h.
update horarios_funcionamento set atende = true,  abre = '08:00', fecha = '19:00' where dia_semana between 1 and 5;
update horarios_funcionamento set atende = true,  abre = '08:00', fecha = '17:00' where dia_semana = 6;
update horarios_funcionamento set atende = false where dia_semana = 0;

insert into recursos (nome, ordem)
select * from (values
  ('Cabeleireira 1', 1),
  ('Cabeleireira 2', 2),
  ('Manicure 1',     3),
  ('Manicure 2',     4)
) as v(nome, ordem)
where not exists (select 1 from recursos);

insert into servicos (nome, descricao, preco_centavos, duracao_minutos, ordem)
select * from (values
  ('Unhas de gel (alongamento)',   'Alongamento em gel com acabamento natural ou decorado.',             15000, 120, 1),
  ('Manutenção de unhas de gel',   'Para quem já tem o gel: preenchimento e esmaltação.',                10000,  90, 2),
  ('Manicure e pedicure',          'Cutilagem e esmaltação tradicional nas mãos e nos pés.',              6000,  90, 3),
  ('Megahair (manutenção)',        'Reposicionamento das mechas. Valor varia pela quantidade.',          25000, 150, 4),
  ('Loiros e mechas',              'Mechas, luzes ou loiro. Valor a partir de; depende do comprimento.', 35000, 240, 5),
  ('Alisamento / progressiva',     'Alisamento com tratamento. Valor a partir de.',                      25000, 180, 6),
  ('Corte feminino',               'Corte com lavagem e finalização.',                                    9000,  60, 7),
  ('Escova',                       'Lavagem e escova modelada.',                                          6000,  60, 8)
) as v(nome, descricao, preco_centavos, duracao_minutos, ordem)
where not exists (select 1 from servicos);

-- unhas com as manicures, cabelo com as cabeleireiras
insert into servico_recursos (servico_id, recurso_id)
select s.id, r.id from servicos s join recursos r
  on (r.nome like 'Manicure%'     and (s.nome ilike '%unha%' or s.nome like 'Manicure%'))
  or (r.nome like 'Cabeleireira%' and not (s.nome ilike '%unha%' or s.nome like 'Manicure%'))
on conflict do nothing;
