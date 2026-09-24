-- Pré-requisito de viagens: metadados existentes no catálogo do frontend e
-- opções do cadastro de motoristas. Não insere nem modifica coordenadas.
-- Execute somente se essas linhas/veículos ainda não estiverem cadastrados.
-- ON CONFLICT preserva os registros já existentes, inclusive seus nomes.
begin;
insert into public.linhas (codigo, nome, cor, publica) values
 ('anchieta', 'Linha Anchieta', '#16a34a', true),
 ('fernandes', 'Linha Fernandes', '#2563eb', true),
 ('fortaleza', 'Linha Fortaleza', '#9333ea', true),
 ('industrial', 'Linha Industrial', '#ea580c', true),
 ('porto_sapucai', 'Linha Porto Sapucaí', '#0891b2', true),
 ('reforco_jose_gm', 'Linha Reforço José G.M', '#dc2626', true),
 ('sao_benedito_hora_meia', 'Linha São Benedito (Hora e Meia)', '#db2777', true),
 ('sao_benedito_hora', 'Linha São Benedito (Hora)', '#eab308', true)
on conflict (codigo) do nothing;
insert into public.veiculos (prefixo, nome) values
 ('101', 'Ônibus #01'), ('102', 'Ônibus #02'),
 ('103', 'Ônibus #03'), ('104', 'Ônibus #04'),
 ('105', 'Ônibus #05'), ('106', 'Ônibus #06'),
 ('107', 'Ônibus #07'), ('108', 'Ônibus #08')
on conflict (prefixo) do nothing;
commit;
