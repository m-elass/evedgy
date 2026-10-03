-- ═══════════════════════════════════════════════════════════════
-- BLINDAJE DE LA BASE DE DATOS — pégalo en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════
--
-- EL PROBLEMA
-- Supabase expone automáticamente el esquema "public" a través de su Data
-- API. Tus tablas las crea el backend con SQLAlchemy, así que nacen SIN
-- Row Level Security y con permisos para los roles "anon" y "authenticated".
-- Como la clave anon viaja dentro del JavaScript de tu web (es pública por
-- diseño), cualquiera podría leerla del navegador y llamar directamente a
-- https://TU-PROYECTO.supabase.co/rest/v1/notes  saltándose tu backend.
--
-- LA SOLUCIÓN
--   1. Activamos RLS en TODAS las tablas de "public" (las que hay hoy y las
--      que vengan: el bucle no depende de una lista escrita a mano) y NO
--      creamos ninguna política: sin política, la Data API no puede leer ni
--      escribir nada.
--   2. Retiramos los permisos concedidos a anon y authenticated.
--   3. Dejamos configurado que las tablas FUTURAS nazcan igual de cerradas.
--
-- ¿Y el backend? Se conecta como "postgres", que es el DUEÑO de las tablas.
-- Al dueño no le afecta el RLS salvo que se «fuerce» (FORCE). Aquí se deja
-- explícitamente SIN forzar (NO FORCE), así que la app sigue funcionando
-- exactamente igual pase lo que pase con los permisos de ese usuario.
--
-- Además, desde esta versión el propio backend activa RLS en sus tablas al
-- arrancar. Este script sigue siendo la llave maestra: ejecútalo una vez.
-- Es seguro ejecutarlo varias veces.
-- ═══════════════════════════════════════════════════════════════

-- 1) RLS activado en todas las tablas de la app (sin políticas = todo denegado)
DO $blindaje$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$blindaje$;

-- 2) Retirar permisos de los roles públicos sobre el esquema de la app
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- 3) Que las tablas futuras nazcan cerradas también
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- COMPROBACIÓN — mira el resultado que aparece abajo
--   tablas_sin_rls      debe ser 0
--   permisos_publicos   debe ser 0
--   tablas_total        es el número de tablas de la app (39 en esta versión)
-- ═══════════════════════════════════════════════════════════════
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) AS tablas_sin_rls,
  (SELECT count(*) FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated'))       AS permisos_publicos,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public')                      AS tablas_total;
