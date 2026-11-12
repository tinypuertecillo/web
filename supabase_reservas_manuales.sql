-- Reservas ingresadas a mano (Airbnb, Booking u otro): cantidad de huéspedes y valor.
-- Se ejecuta una sola vez en Supabase > SQL Editor. Solo agrega columnas opcionales; no cambia ni borra datos.
alter table public.fechas_bloqueadas add column if not exists adultos integer;
alter table public.fechas_bloqueadas add column if not exists ninos integer;
alter table public.fechas_bloqueadas add column if not exists bebes integer;
alter table public.fechas_bloqueadas add column if not exists mascotas integer;
alter table public.fechas_bloqueadas add column if not exists precio_total integer;
