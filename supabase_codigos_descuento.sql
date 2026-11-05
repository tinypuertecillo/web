-- Códigos de descuento para huéspedes (uno por persona o con varios usos).
-- Pegar en Supabase > SQL Editor ANTES de publicar este cambio. Es seguro repetirlo.

create table if not exists public.codigos_descuento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,                       -- siempre en mayúsculas, ej. TINY-7K3PX
  porcentaje numeric(5,2) not null check (porcentaje > 0 and porcentaje < 100),
  valido_hasta date not null,                        -- último día en que se puede usar (hora de Chile)
  usos_max integer not null default 1 check (usos_max >= 1),
  usos integer not null default 0 check (usos >= 0), -- sube solo cuando el pago en Flow se confirma
  nota text,                                         -- para quién es o por qué canal se pidió
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Solo el servidor (llave de servicio) puede leer o cambiar esta tabla, igual que las demás.
alter table public.codigos_descuento enable row level security;
revoke all on public.codigos_descuento from anon, authenticated;

-- La reserva guarda qué código se aplicó.
alter table public.reservas add column if not exists codigo_descuento text;

-- Suma un uso al código de forma segura (solo si le quedan usos). Devuelve true si se pudo.
create or replace function public.usar_codigo_descuento(p_codigo text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.codigos_descuento
       set usos = usos + 1
     where codigo = upper(p_codigo) and usos < usos_max
     returning 1
  )
  select exists (select 1 from u);
$$;

revoke all on function public.usar_codigo_descuento(text) from public, anon, authenticated;
grant execute on function public.usar_codigo_descuento(text) to service_role;
