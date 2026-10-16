-- Descuentos por cantidad de noches (reemplazan al descuento único).
-- Pegar en Supabase > SQL Editor ANTES de publicar este cambio. Es seguro repetirlo.

alter table public.ajustes_precios
  add column if not exists descuentos_noches jsonb not null default '[]'::jsonb;

-- El descuento único anterior deja de usarse: se pone en 0 para que no quede un valor olvidado.
update public.ajustes_precios set descuento_pct = 0 where id = 1;
