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
-- Tu backend se conecta como "postgres" (superusuario), que IGNORA el RLS.
-- Por eso podemos cerrar la puerta a cal y canto sin romper nada:
--   1. Activamos RLS en todas las tablas y NO creamos ninguna política:
--      sin política, el acceso por la Data API queda denegado siempre.
--   2. Retiramos los permisos concedidos a anon y authenticated.
--   3. Dejamos configurado que las tablas FUTURAS nazcan igual de cerradas.
--
-- Tu app sigue funcionando exactamente igual: entra por el backend, que usa
-- el usuario postgres y filtra por user_id en cada consulta.
-- Es seguro ejecutarlo varias veces.
-- ═══════════════════════════════════════════════════════════════

-- 1) RLS activado en las 24 tablas de la app (sin políticas = todo denegado)
ALTER TABLE IF EXISTS public."exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."exercises" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."routine_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."routine_days" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sets" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."daily_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."daily_tasks" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."task_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."task_completions" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."random_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."random_tasks" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."notes" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sleep_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."sleep_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."goals" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."values" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."value_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."value_checkins" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."reviews" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."decisions" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."future_letters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."future_letters" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."readings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."readings" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."harvests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."harvests" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."skills" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."skill_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."skill_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."user_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."friendships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."friendships" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."physique_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."physique_goals" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."week_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."week_overrides" FORCE ROW LEVEL SECURITY;

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
-- COMPROBACIÓN — ejecútalo después y revisa el resultado
-- rls_activado debe ser TRUE en todas las filas.
-- ═══════════════════════════════════════════════════════════════
SELECT tablename AS tabla, rowsecurity AS rls_activado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
