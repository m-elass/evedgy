"""
routers/daily_tasks.py
──────────────────────
Hábitos, en sus cuatro tipos (hábito, bloque, métrica y principio; ver
models.DailyTask). Dos niveles, como en el modelo:
- el hábito en sí (DailyTask): título, tipo, minutos, frecuencia, prioridad…
- lo de un día concreto (TaskCompletion): el tick, la cifra de la métrica o
  la respuesta al principio.

Marcar usa "upsert": si ya existe el registro de ese hábito y esa fecha, lo
actualiza; si no, lo crea. Así marcar/desmarcar el mismo día no duplica filas.

  POST   /daily-tasks                 crear
  PATCH  /daily-tasks/{id}            cambiar (tipo, minutos, frecuencia, pausar…)
  GET    /daily-tasks/today?date=     todos con su estado de hoy (all=1: también los pausados)
  PUT    /daily-tasks/{id}/complete   marcar / desmarcar
  PUT    /daily-tasks/{id}/value      cifra de una métrica (fijar o sumar) o respuesta a un principio
  POST   /daily-tasks/import          aplicar una configuración sugerida (varios a la vez)
"""

from datetime import date as date_type, timedelta

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app.fechas import fecha_local, hoy_utc
from app.habitos import estado_habitos

router = APIRouter(prefix="/daily-tasks", tags=["daily_tasks"])


def _get_owned(db, task_id, user_id):
    task = (db.query(models.DailyTask)
            .filter(models.DailyTask.id == task_id,
                    models.DailyTask.user_id == user_id)
            .first())
    if task is None:
        raise HTTPException(status_code=404, detail="Hábito no encontrado")
    return task


MAX_HABITOS = 80


def _aplicar(task, campos: dict) -> None:
    """Copia los campos al hábito con su forma de guardarse (días como «0,1,3»)."""
    for k, v in campos.items():
        if k == "days":
            task.days = ",".join(str(d) for d in v)
            if v:
                task.per_week = len(v)
        elif k == "title":
            limpio = " ".join((v or "").split())[:120]
            if not limpio:
                raise HTTPException(status_code=422, detail="El hábito necesita un nombre.")
            task.title = limpio
        elif k in ("unit", "description"):
            setattr(task, k, (v or "").strip())
        else:
            setattr(task, k, v)
    kind = task.kind or "habito"
    if kind in ("metrica", "principio"):
        task.minutes = 0
    if kind != "metrica":
        task.target = None


@router.post("", response_model=schemas.DailyTaskOut)
def create_task(data: schemas.DailyTaskCreate,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    if db.query(models.DailyTask).filter(models.DailyTask.user_id == user_id).count() >= MAX_HABITOS:
        raise HTTPException(status_code=409, detail=f"Como mucho {MAX_HABITOS} hábitos.")
    task = models.DailyTask(user_id=user_id, title="·")
    _aplicar(task, data.model_dump())
    db.add(task); db.commit(); db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=schemas.DailyTaskOut)
def update_task(task_id: int, data: schemas.DailyTaskUpdate,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    task = _get_owned(db, task_id, user_id)
    campos = data.model_dump(exclude_unset=True)
    # target/step pueden llegar como null a propósito (quitar el objetivo); el resto, null = no tocar
    campos = {k: v for k, v in campos.items() if v is not None or k in ("target", "step")}
    _aplicar(task, campos)
    db.commit(); db.refresh(task)
    return task


@router.get("", response_model=list[schemas.DailyTaskOut])
def list_tasks(db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    return (db.query(models.DailyTask)
            .filter(models.DailyTask.user_id == user_id,
                    models.DailyTask.active == True)  # noqa: E712
            .all())


@router.get("/today", response_model=list[schemas.DailyTaskTodayOut])
def tasks_today(date: date_type,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id),
                all: bool = False):
    """
    Los hábitos con su estado de HOY, de esta semana y su racha, en una sola
    petición. `date` es la fecha local del móvil (el servidor vive en UTC).
    Con all=1 también salen los pausados (para la pantalla de Hábitos).
    """
    return estado_habitos(db, user_id, fecha_local(date), todos=all)


@router.delete("/{task_id}")
def delete_task(task_id: int,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    task = _get_owned(db, task_id, user_id)
    db.delete(task); db.commit()
    return {"ok": True}


@router.put("/{task_id}/complete", response_model=schemas.CompletionOut)
def set_completion(task_id: int,
                   data: schemas.CompletionCreate,
                   db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Marca o desmarca el hábito en una fecha (upsert)."""
    _get_owned(db, task_id, user_id)  # verifica propiedad
    if data.date > hoy_utc() + timedelta(days=1):
        raise HTTPException(status_code=422, detail="No se puede marcar un día del futuro.")
    comp = (db.query(models.TaskCompletion)
            .filter(models.TaskCompletion.daily_task_id == task_id,
                    models.TaskCompletion.date == data.date)
            .first())
    if comp is None:
        comp = models.TaskCompletion(daily_task_id=task_id, date=data.date, done=data.done)
        db.add(comp)
    else:
        comp.done = data.done
    db.commit(); db.refresh(comp)
    return comp


@router.get("/{task_id}/completions", response_model=list[schemas.CompletionOut])
def list_completions(task_id: int,
                     start: date_type | None = None,
                     end: date_type | None = None,
                     db: Session = Depends(get_db),
                     user_id: str = Depends(get_current_user_id)):
    """Histórico de ticks de un hábito (para ver rachas)."""
    _get_owned(db, task_id, user_id)
    q = db.query(models.TaskCompletion).filter(
        models.TaskCompletion.daily_task_id == task_id)
    if start is not None:
        q = q.filter(models.TaskCompletion.date >= start)
    if end is not None:
        q = q.filter(models.TaskCompletion.date <= end)
    return q.order_by(models.TaskCompletion.date.desc()).all()


@router.put("/{task_id}/value")
def set_value(task_id: int, data: schemas.ValorIn,
              db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """
    Métricas: fija la cifra del día (value) o súmale algo (add, p. ej. +0.25 L);
    queda «hecha» al llegar al objetivo. Principios: la respuesta de la noche
    (1 sí · 0.5 a medias · 0 no). clear=true borra lo del día.
    """
    task = _get_owned(db, task_id, user_id)
    if task.kind not in ("metrica", "principio"):
        raise HTTPException(status_code=422, detail="Esto es para métricas y principios.")
    if data.date > hoy_utc() + timedelta(days=1) or data.date < hoy_utc() - timedelta(days=400):
        raise HTTPException(status_code=422, detail="Fecha fuera de rango.")
    # bloquea la fila mientras se suma (en PostgreSQL), para que dos toques seguidos no se pisen
    comp = (db.query(models.TaskCompletion)
            .filter(models.TaskCompletion.daily_task_id == task_id,
                    models.TaskCompletion.date == data.date).with_for_update().first())
    sueno = task.kind == "metrica" and task.link == "sueno"
    noche = None
    if sueno:
        noche = (db.query(models.SleepLog)
                 .filter(models.SleepLog.user_id == user_id, models.SleepLog.date == data.date).first())
    if data.clear:
        if comp is not None:
            db.delete(comp)
        if noche is not None:
            db.delete(noche)
        db.commit()
        return {"value": None, "done": False}

    if task.kind == "principio":
        if data.value not in (0, 0.5, 1):
            raise HTTPException(status_code=422, detail="La respuesta es 1 (sí), 0.5 (a medias) o 0 (no).")
        valor = float(data.value)
        hecho = valor >= 1                      # para los resúmenes solo cuenta el «sí»; respondido = hay cifra
    else:
        actual = comp.value if comp is not None and comp.value is not None else None
        if noche is not None:
            actual = noche.hours
        if data.add is not None:
            valor = (actual or 0) + data.add
        elif data.value is not None:
            valor = data.value
        else:
            raise HTTPException(status_code=422, detail="Falta la cifra (value) o lo que sumar (add).")
        valor = round(max(0.0, min(1_000_000.0, valor)), 3)
        if sueno:
            valor = min(valor, 24.0)
        objetivo = task.target or 0
        hecho = valor >= objetivo if objetivo > 0 else valor > 0
    if comp is None:
        comp = models.TaskCompletion(daily_task_id=task_id, date=data.date)
        db.add(comp)
    comp.value, comp.done = valor, hecho
    if sueno:                                   # la métrica de sueño escribe también en Sueño
        if noche is None:
            db.add(models.SleepLog(user_id=user_id, date=data.date, hours=valor))
        else:
            noche.hours = valor
    db.commit()
    return {"value": valor, "done": hecho}


class ImportItem(schemas.DailyTaskUpdate):
    id: int | None = None                       # si viene, se actualiza ese hábito (y debe coincidir el título)
    match_title: str | None = Field(None, max_length=120)


class ImportIn(BaseModel):
    habits: list[ImportItem] = Field(..., max_length=MAX_HABITOS)
    budget: list[int] | None = Field(None, min_length=7, max_length=7)
    brief: str | None = Field(None, max_length=1500)


def _norm(t: str) -> str:
    return " ".join((t or "").lower().split())


@router.post("/import")
def import_config(data: ImportIn, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    """
    Aplica de una vez una configuración sugerida (tipos, minutos, frecuencias,
    prioridades…). Un hábito con `id` solo se toca si es tuyo y su título
    coincide con `match_title` (o con el título nuevo): así un id de otra
    cuenta o desfasado no cambia nada por error (vale también el título nuevo,
    para poder aplicarla dos veces). Sin id, se crea uno nuevo.
    """
    mios = {t.id: t for t in db.query(models.DailyTask).filter(models.DailyTask.user_id == user_id).all()}
    actualizados = creados = 0
    saltados = []
    for it in data.habits:
        campos = it.model_dump(exclude_unset=True, exclude={"id", "match_title"})
        campos = {k: v for k, v in campos.items() if v is not None or k in ("target", "step")}
        if it.id is not None:
            t = mios.get(it.id)
            # vale el título de antes (match_title) o el nuevo: así aplicarla dos veces no salta nada
            validos = {_norm(x) for x in (it.match_title, it.title) if x}
            if t is None or (validos and _norm(t.title) not in validos):
                saltados.append(it.match_title or it.title or f"#{it.id}")
                continue
            _aplicar(t, campos)
            actualizados += 1
        else:
            if not it.title:
                saltados.append("(sin título)")
                continue
            if len(mios) + creados >= MAX_HABITOS:
                saltados.append(it.title)
                continue
            t = models.DailyTask(user_id=user_id, title="·")
            _aplicar(t, {"kind": "habito", **campos})
            db.add(t)
            creados += 1
    if data.budget is not None or data.brief is not None:
        fila = (db.query(models.PlannerSettings)
                .filter(models.PlannerSettings.user_id == user_id).first())
        if fila is None:
            fila = models.PlannerSettings(user_id=user_id, budget="", brief="")
            db.add(fila)
        if data.budget is not None:
            fila.budget = ",".join(str(max(0, min(960, int(m)))) for m in data.budget)
        if data.brief is not None:
            fila.brief = data.brief.strip()
    db.commit()
    return {"updated": actualizados, "created": creados, "skipped": saltados}
