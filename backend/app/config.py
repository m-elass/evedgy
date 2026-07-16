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
    SUPABASE_JWT_SECRET: str

    # Opcional: solo si quieres la generación de temas con IA.
    # Si no la pones, la app funciona igual con los temas base.
    ANTHROPIC_API_KEY: str | None = None

    # Dominios del frontend autorizados a llamar a la API (separados por comas).
    CORS_ORIGINS: str = "http://localhost:5173"

    # Le decimos de qué archivo leer
    model_config = SettingsConfigDict(env_file=".env")


# Una única instancia que importaremos donde haga falta:  from app.config import settings
settings = Settings()
