"""
fechas.py — EL «HOY» DEL USUARIO
────────────────────────────────
El servidor vive en UTC; tú, en Madrid. Entre medianoche y la 1-2 de la
madrugada, «hoy» no es el mismo día para los dos. Por eso los endpoints que
dependen del día reciben la FECHA LOCAL del móvil, y aquí se valida que sea
razonable (como mucho un día de diferencia con el reloj del servidor).
"""

from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException


def hoy_utc() -> date:
    return datetime.now(timezone.utc).date()


def fecha_local(fecha: date) -> date:
    """Acepta la fecha local del cliente si está a ±1 día del servidor."""
    if abs((fecha - hoy_utc()).days) > 1:
        raise HTTPException(status_code=422, detail="La fecha local no cuadra con la de hoy.")
    return fecha


def lunes_de(fecha: date) -> date:
    return fecha - timedelta(days=fecha.weekday())


def exigir_lunes(fecha: date) -> date:
    if fecha.weekday() != 0:
        raise HTTPException(status_code=422, detail="La semana debe empezar en lunes.")
    return fecha


def racha(dias: set, hoy: date) -> int:
    """
    Días seguidos con actividad, terminando hoy. Si hoy aún no hay nada, la
    racha sigue viva desde ayer (el día no ha terminado).
    """
    d = hoy if hoy in dias else hoy - timedelta(days=1)
    n = 0
    while d in dias:
        n += 1
        d -= timedelta(days=1)
    return n


def mejor_racha(dias: set) -> int:
    """La racha más larga de toda la historia."""
    mejor = actual = 0
    previo = None
    for d in sorted(dias):
        actual = actual + 1 if previo is not None and (d - previo).days == 1 else 1
        mejor = max(mejor, actual)
        previo = d
    return mejor
