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

    # Dominios del frontend autorizados a llamar a la API (separados por comas).
    CORS_ORIGINS: str = "http://localhost:5173"

    # Le decimos de qué archivo leer
    model_config = SettingsConfigDict(env_file=".env")


# Una única instancia que importaremos donde haga falta:  from app.config import settings
settings = Settings()
