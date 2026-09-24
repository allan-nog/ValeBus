-- Executar no SQL Editor do Supabase antes de usar GPS de suporte.
-- As posições existentes são de suporte: somente o motorista dono e gestores
-- podem consultá-las pela política autenticada já presente no schema.
begin;
drop policy if exists "posicoes publicas em viagem" on public.posicoes_veiculo;
revoke select on public.posicoes_veiculo from anon;
commit;
