"""
routers/theme.py
────────────────
Endpoint que convierte unas palabras del usuario en una paleta de tema.
Llama a la API de Anthropic con un prompt que pide EXACTAMENTE la estructura
de roles que usa el frontend, y devuelve solo el JSON.

La clave de Anthropic vive en el .env (ANTHROPIC_API_KEY), nunca en el frontend.
Si no hay clave configurada, devolvemos un error claro (la app sigue funcionando
con los temas base).
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user_id
from app.config import settings

router = APIRouter(prefix="/theme", tags=["theme"])

# Los roles que el frontend espera. El modelo debe rellenarlos todos.
ROLES = ["ink", "inkSoft", "paper", "paperEdge", "sepia",
         "sepiaInk", "olive", "oliveSoft", "rust", "cream"]

SYSTEM_PROMPT = (
    "Eres un disenador de interfaces experto en paletas de color. "
    "Te dan unas palabras que describen un ambiente y devuelves UNICAMENTE un "
    "objeto JSON valido (sin texto alrededor, sin markdown) con esta forma exacta:\n"
    '{"name": "<nombre corto del tema>", '
    '"colors": {"ink": "#RRGGBB", "inkSoft": "#RRGGBB", "paper": "#RRGGBB", '
    '"paperEdge": "#RRGGBB", "sepia": "#RRGGBB", "sepiaInk": "#RRGGBB", '
    '"olive": "#RRGGBB", "oliveSoft": "#RRGGBB", "rust": "#RRGGBB", "cream": "#RRGGBB"}}\n'
    "Significado de cada rol:\n"
    "- ink: fondo general de la app.\n"
    "- inkSoft: superficie elevada sobre el fondo (barras).\n"
    "- paper: tarjetas de contenido (donde va el texto principal).\n"
    "- paperEdge: bordes y lineas suaves.\n"
    "- sepia: texto secundario / tenue.\n"
    "- sepiaInk: texto principal sobre 'paper' (debe contrastar bien con paper).\n"
    "- olive: color de acento para logros/completado (el mas vivo).\n"
    "- oliveSoft: variante suave del acento.\n"
    "- rust: acento secundario.\n"
    "- cream: texto sobre superficies de acento (alto contraste con olive).\n"
    "Reglas: asegura buen contraste entre paper y sepiaInk, y entre olive y cream. "
    "Todos los valores en formato hexadecimal de 6 digitos."
)


class ThemeRequest(BaseModel):
    prompt: str


@router.post("/generate")
def generate_theme(data: ThemeRequest,
                   user_id: str = Depends(get_current_user_id)):
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        raise HTTPException(status_code=503,
            detail="Generacion de temas no configurada. Usa los temas base.")

    # Import local: solo se necesita aqui, y si la libreria no esta, el resto
    # de la app no se ve afectada.
    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=503, detail="Falta el paquete 'anthropic' en el backend.")

    client = anthropic.Anthropic(api_key=api_key)
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": data.prompt}],
        )
        text = "".join(block.text for block in msg.content if block.type == "text")
        # Por si el modelo envuelve el JSON, recortamos al primer { y ultimo }
        start, end = text.find("{"), text.rfind("}")
        parsed = json.loads(text[start:end + 1])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"No se pudo generar el tema: {e}")

    # Devolvemos tal cual; el frontend lo valida con sanitizeTheme.
    return parsed
