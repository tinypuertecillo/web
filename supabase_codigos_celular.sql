-- Asocia cada código de descuento al celular de quien lo pidió.
-- Pegar en Supabase > SQL Editor ANTES de publicar este cambio. Es seguro repetirlo.
-- (Requiere haber ejecutado antes supabase_codigos_descuento.sql.)

alter table public.codigos_descuento add column if not exists celular text;  -- 9 dígitos, ej. 912345678

create index if not exists codigos_descuento_celular_idx on public.codigos_descuento (celular);
