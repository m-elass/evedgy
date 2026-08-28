"""
ai_budget.py — TOPE DE GASTO EN LAS FUNCIONES CON IA
────────────────────────────────────────────────────
Las funciones con IA (temas de color a medida, resumen semanal inteligente)
llaman a una API que cobra por petición. Un bucle accidental o un uso abusivo
pueden convertirse en una factura seria, así que aquí se pone un techo.

Dos topes, ambos configurables por variable de entorno:
  · POR USUARIO Y DÍA  — evita que una sola cuenta dispare el gasto.
  · GLOBAL Y DÍA       — techo absoluto de toda la app, por si algo se
                         descontrola de una forma que no habíamos previsto.

Cuando se supera el tope se responde 429 con un mensaje claro; la app sigue
funcionando entera, porque estas funciones son un extra, no el corazón.
"""

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.config import settings

# Topes prudentes: suficientes para un uso normal, ridículos para un abuso.
# Se ajustan con AI_LIMITE_USUARIO_DIA y AI_LIMITE_GLOBAL_DIA en Render.
LIMITE_USUARIO_DIA = settings.AI_LIMITE_USUARIO_DIA
LIMITE_GLOBAL_DIA = settings.AI_LIMITE_GLOBAL_DIA


def consumir(db: Session, user_id: str) -> None:
    """
    Registra una llamada a la IA y corta si se ha superado algún tope.
    Lanza HTTPException(429) cuando no queda presupuesto.
    """
    hoy = date.today()

    gastado_global = (db.query(models.AiUsage)
                      .filter(models.AiUsage.day == hoy).all())
    total_global = sum(u.calls or 0 for u in gastado_global)
    if total_global >= LIMITE_GLOBAL_DIA:
        raise HTTPException(
            status_code=429,
            detail="Las funciones con IA han alcanzado su límite diario. "
                   "Vuelve mañana; el resto de la app funciona con normalidad.")

    fila = next((u for u in gastado_global if u.user_id == user_id), None)
    if fila is None:
        fila = models.AiUsage(user_id=user_id, day=hoy, calls=0)
        db.add(fila)

    if (fila.calls or 0) >= LIMITE_USUARIO_DIA:
        raise HTTPException(
            status_code=429,
            detail=f"Has usado las funciones con IA {LIMITE_USUARIO_DIA} veces hoy. "
                   "Mañana se renueva.")

    fila.calls = (fila.calls or 0) + 1
    db.commit()


def restante(db: Session, user_id: str) -> dict:
    """Cuánto presupuesto de IA le queda hoy al usuario."""
    hoy = date.today()
    fila = (db.query(models.AiUsage)
            .filter(models.AiUsage.user_id == user_id,
                    models.AiUsage.day == hoy).first())
    usadas = (fila.calls if fila else 0) or 0
    return {"usadas_hoy": usadas,
            "limite_diario": LIMITE_USUARIO_DIA,
            "restantes": max(0, LIMITE_USUARIO_DIA - usadas)}
