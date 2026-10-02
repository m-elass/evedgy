"""
config.py
─────────
Carga la configuración secreta desde el archivo .env y la deja
disponible para el resto de la app a través del objeto `settings`.

Así nunca escribimos contraseñas dentro del código: viven solo en .env.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Estos nombres deben COINCIDIR con los del archivo .env
    DATABASE_URL: str
    # Secreto legacy (HS256). Opcional: solo se usa si el token es HS256.
    SUPABASE_JWT_SECRET: str | None = None

    # Topes de gasto de las funciones con IA (llamadas por día). Se pueden
    # ajustar desde Render sin tocar el código.
    AI_LIMITE_USUARIO_DIA: int = 20
    AI_LIMITE_GLOBAL_DIA: int = 300

    # URL del proyecto Supabase (p. ej. https://xxxx.supabase.co).
    # Necesaria para verificar los tokens nuevos (ES256) con las claves
    # públicas de Supabase. Se rellena con la variable SUPABASE_URL en Render.
    SUPABASE_URL: str | None = None

    # Opcional: solo si quieres la generación de temas con IA.
    # Si no la pones, la app funciona igual con los temas base.
    ANTHROPIC_API_KEY: str | None = None
    # Modelo de IA que usan esas funciones (temas, resumen semanal, planes de
    # habilidades). Se puede cambiar desde Render sin tocar el código.
    AI_MODELO: str = "claude-sonnet-5-5"

    # Dominios del frontend autorizados a llamar a la API (separados por comas).
    CORS_ORIGINS: str = "http://localhost:5173"

    # Avisos de la carta diaria (opcionales):
    # CRON_SECRET: si lo defines, el reloj que dispara los avisos debe enviarlo
    #   en la cabecera X-Cron-Secret.
    # VAPID_SUB: contacto que exigen los servicios push (mailto: o https://).
    #   Si no lo pones, se usa la dirección de tu web (CORS_ORIGINS).
    CRON_SECRET: str | None = None
    VAPID_SUB: str | None = None

    # Le decimos de qué archivo leer
    model_config = SettingsConfigDict(env_file=".env")


# Una única instancia que importaremos donde haga falta:  from app.config import settings
settings = Settings()
