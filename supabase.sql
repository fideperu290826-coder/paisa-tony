-- Fidelización El Paisa - Tony
-- Pega TODO este archivo en el "SQL Editor" de tu proyecto Supabase y dale "Run".

-- 1) Configuración del negocio (una sola fila, id = 1)
create table if not exists config (
  id int primary key,
  data jsonb not null
);

-- 2) Control de participación por celular (una fila por número)
create table if not exists participations (
  phone text primary key,
  data jsonb not null
);

-- 3) Historial de jugadas (para el panel admin)
create table if not exists history (
  id bigserial primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Activamos RLS (Row Level Security) en las tres tablas
alter table config enable row level security;
alter table participations enable row level security;
alter table history enable row level security;

-- IMPORTANTE - LEE ESTO:
-- Esta app no tiene servidor propio: el navegador del cliente habla directo
-- con Supabase usando la "anon key" (clave pública). Por eso estas políticas
-- son permisivas (cualquiera puede leer/escribir estas 3 tablas).
-- Es una decisión consciente para lanzar rápido un piloto de bajo riesgo.
-- La contraseña de admin es solo una traba de UI, NO seguridad real: alguien
-- con conocimientos técnicos podría leerla o editar la configuración
-- directamente contra Supabase. No guardes aquí nada sensible (tarjetas,
-- contraseñas de otros sistemas, etc.). Cuando quieras subir el nivel de
-- seguridad, el siguiente paso es mover las escrituras de admin a una
-- Supabase Edge Function protegida con autenticación real.

create policy "anon puede leer config" on config for select using (true);
create policy "anon puede escribir config" on config for insert with check (true);
create policy "anon puede actualizar config" on config for update using (true);

create policy "anon puede leer participations" on participations for select using (true);
create policy "anon puede escribir participations" on participations for insert with check (true);
create policy "anon puede actualizar participations" on participations for update using (true);
create policy "anon puede borrar participations" on participations for delete using (true);

create policy "anon puede leer history" on history for select using (true);
create policy "anon puede escribir history" on history for insert with check (true);
create policy "anon puede borrar history" on history for delete using (true);
