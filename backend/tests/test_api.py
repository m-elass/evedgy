"""
Pruebas de la API con una base SQLite temporal y un login simulado.
Ejecutar desde backend/:   python -m pytest -q tests
"""
import os
import tempfile
from datetime import date, timedelta

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db.name}")
os.environ["CORS_ORIGINS"] = "https://ok.test"

import pytest  # noqa: E402
from fastapi import Header  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import models, security  # noqa: E402
from app.auth import get_current_user_id  # noqa: E402
from app.main import app  # noqa: E402
from app.database import SessionLocal, Base, engine  # noqa: E402
from app.migrations import aplicar_migraciones  # noqa: E402
from sqlalchemy import event  # noqa: E402

if engine.dialect.name == "sqlite":
    # SQLite no comprueba las claves ajenas salvo que se le pida: se le pide,
    # para que las pruebas fallen igual que fallaría PostgreSQL.
    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_con, _):
        dbapi_con.execute("PRAGMA foreign_keys=ON")


def _usuario_de_prueba(x_test_user: str = Header(...)):
    security.limitar_usuario(x_test_user)
    return x_test_user


app.dependency_overrides[get_current_user_id] = _usuario_de_prueba


@app.get("/_boom")
def _boom():
    raise RuntimeError("fallo provocado")


c = TestClient(app, raise_server_exceptions=False)
A = {"X-Test-User": "usuario-a", "Origin": "https://ok.test"}
B = {"X-Test-User": "usuario-b", "Origin": "https://ok.test"}
HOY = date.today()


def test_cors_tambien_en_500_y_429(monkeypatch):
    r = c.get("/_boom", headers={"Origin": "https://ok.test"})
    assert r.status_code == 500
    assert r.headers.get("access-control-allow-origin") == "https://ok.test"
    assert "Traceback" not in r.text
    r = c.get("/_boom", headers={"Origin": "https://mal.test"})
    assert r.headers.get("access-control-allow-origin") is None
    monkeypatch.setattr(security, "MAX_POR_IP", 0)
    r = c.get("/", headers={"Origin": "https://ok.test"})
    assert r.status_code == 429
    assert r.headers.get("access-control-allow-origin") == "https://ok.test"
    assert r.headers.get("retry-after") == "60"


def test_limite_por_usuario(monkeypatch):
    monkeypatch.setattr(security, "MAX_POR_USUARIO", 3)
    security._hits_usuario.clear()
    codigos = [c.get("/notes", headers={"X-Test-User": "limitado"}).status_code for _ in range(5)]
    assert codigos[:3] == [200, 200, 200] and codigos[3] == 429
    security._hits_usuario.clear()


def test_migraciones_idempotentes():
    Base.metadata.create_all(bind=engine)
    aplicar_migraciones()
    aplicar_migraciones()


def test_habitos_de_hoy_con_racha():
    t = c.post("/daily-tasks", json={"title": "Leer"}, headers=A).json()
    for d in (HOY - timedelta(days=1), HOY - timedelta(days=2)):
        c.put(f"/daily-tasks/{t['id']}/complete", json={"date": d.isoformat(), "done": True}, headers=A)
    r = c.get(f"/daily-tasks/today?date={HOY}", headers=A).json()
    h = next(x for x in r if x["id"] == t["id"])
    assert h["done_today"] is False and h["streak"] == 2
    c.put(f"/daily-tasks/{t['id']}/complete", json={"date": HOY.isoformat(), "done": True}, headers=A)
    h = next(x for x in c.get(f"/daily-tasks/today?date={HOY}", headers=A).json() if x["id"] == t["id"])
    assert h["done_today"] is True and h["streak"] == 3
    assert c.get(f"/daily-tasks/today?date={HOY - timedelta(days=5)}", headers=A).status_code == 422
    assert c.get(f"/daily-tasks/today?date={HOY}", headers=B).json() == []


def test_semana_de_entreno_igual_que_los_endpoints_sueltos():
    ex = c.post("/exercises", json={"name": "Press banca"}, headers=A).json()
    lunes = HOY - timedelta(days=HOY.weekday())
    c.put(f"/routine/template/{HOY.weekday()}", json={"exercise_ids": [ex["id"]]}, headers=A)
    for i, (w, rep) in enumerate([(60, 8), (62.5, 8), (62.5, 7), (60, 9)]):
        d = lunes - timedelta(days=7 * (4 - i))
        c.post("/sessions", json={"exercise_id": ex["id"], "date": d.isoformat(), "feelings": "",
                                  "sets": [{"set_number": 1, "reps": rep, "weight": w}]}, headers=A)
    r = c.get(f"/training/week/{lunes}", headers=A).json()
    ins = r["insights"][str(ex["id"])]
    assert ins["best"] == c.get(f"/sessions/best/{ex['id']}", headers=A).json()
    assert ins["next"] == c.get(f"/insights/next-set/{ex['id']}", headers=A).json()
    assert ins["deload"] == c.get(f"/insights/deload/{ex['id']}", headers=A).json()
    assert len(r["prev_sessions"]) == 1 and r["sessions"] == []
    assert c.get(f"/training/week/{lunes + timedelta(days=1)}", headers=A).status_code == 422


def test_carta_diaria_racha_y_archivo():
    for i in (1, 2):
        d = HOY - timedelta(days=i)
        r = c.put(f"/daily-letters/{d}", json={"greeting": "Querida A,", "body": f"Día {i} " * 30,
                                              "closing": "Tuyo", "seal": "oro"}, headers=A)
        assert r.status_code == 200
    o = c.get(f"/daily-letters?date={HOY}", headers=A).json()
    assert o["written_today"] is False and o["streak"] == 2 and o["total"] == 2
    assert "body" not in o["letters"][0] and len(o["letters"][0]["preview"]) <= 160
    c.put(f"/daily-letters/{HOY}", json={"body": "Hoy."}, headers=A)
    c.put(f"/daily-letters/{HOY}", json={"body": "Hoy, reescrita."}, headers=A)
    o = c.get(f"/daily-letters?date={HOY}", headers=A).json()
    assert o["written_today"] and o["streak"] == 3 and o["total"] == 3
    assert c.get(f"/daily-letters/{HOY}", headers=A).json()["body"] == "Hoy, reescrita."
    assert c.get(f"/daily-letters/{HOY}", headers=B).status_code == 404
    assert c.put(f"/daily-letters/{HOY + timedelta(days=5)}", json={"body": "x"}, headers=A).status_code == 422
    assert c.put(f"/daily-letters/{HOY}", json={"body": "x" * 20001}, headers=A).status_code == 422
    assert c.put(f"/daily-letters/{HOY}", json={"body": "x", "seal": "<script>"}, headers=A).status_code == 422
    libro = c.get("/daily-letters/book", headers=A).json()
    assert [x["date"] for x in libro] == sorted(x["date"] for x in libro) and len(libro) == 3
    o = c.get(f"/daily-letters?date={HOY}", headers=A).json()
    assert o["last_greeting"] == "" and o["last_closing"] == ""     # la última (hoy) no los puso


def test_conocimiento_y_paso_a_lecturas():
    r = c.post("/knowledge", json={"kind": "libro", "title": "Meditaciones", "creator": "Marco Aurelio",
                                   "why": "Para aprender a templar el ánimo"}, headers=A)
    assert r.status_code == 200
    item = r.json()
    assert c.post("/knowledge", json={"title": "x", "link": "javascript:alert(1)"}, headers=A).status_code == 422
    assert c.patch(f"/knowledge/{item['id']}", json={"status": "hecho"}, headers=B).status_code == 404
    lec = c.post(f"/knowledge/{item['id']}/start-reading", headers=A).json()
    lecturas = c.get("/readings", headers=A).json()
    nueva = next(x for x in lecturas if x["id"] == lec["reading_id"])
    assert nueva["status"] == "leyendo"
    assert any("templar" in h["content"] for h in nueva.get("harvests", []))
    t = c.post("/random-tasks", json={"content": "Ver Interstellar"}, headers=A).json()
    k = c.post(f"/knowledge/from-task/{t['id']}", json={"kind": "pelicula"}, headers=A).json()
    assert k["kind"] == "pelicula" and k["title"] == "Ver Interstellar"
    assert all(x["id"] != t["id"] for x in c.get("/random-tasks", headers=A).json())


def test_frases_y_hoy_en_una_peticion():
    for i in range(4):
        c.post("/quotes", json={"text": f"Frase {i}", "author": "Autor", "favorite": i == 0}, headers=A)
    c.post("/notes", json={"content": "Un destello"}, headers=A)
    h1 = c.get(f"/today?date={HOY}", headers=A).json()
    h2 = c.get(f"/today?date={HOY}", headers=A).json()
    assert h1["quotes"][0] == h2["quotes"][0], "la frase del día no debe cambiar en el mismo día"
    assert len({q["id"] for q in h1["quotes"]}) == len(h1["quotes"]) <= 5
    assert h1["flashback"]["content"] == "Un destello"
    assert set(h1) >= {"habits", "quotes", "flashback", "letter", "missions"}
    assert h1["letter"]["written"] is True


def _tablero(u, dia=None):
    r = c.get(f"/skill-board?date={dia or HOY}", headers=u)
    assert r.status_code == 200, r.text
    return r.json()


def _de(lista, sid):
    return next(x for x in lista if x.get("skill_id", x.get("id")) == sid)


def test_tablero_vacio():
    b = _tablero({"X-Test-User": "sin-habilidades", "Origin": "https://ok.test"})
    assert b["skills"] == [] and b["daily"] == [] and b["player"]["level"] == 0
    assert b["player"]["rank"] == "E" and len(b["ranks"]) == 6 and len(b["categories"]) == 11
    assert c.get(f"/today?date={HOY}", headers={"X-Test-User": "sin-habilidades"}).json()["missions"] == \
        {"total": 0, "done": 0}


def test_rangos_y_niveles_de_maestria():
    from app import maestria
    previo = 0
    for xp in range(0, 640_000, 89):
        p = maestria.progreso(xp, 5)
        assert p["level"] == 100 or p["level_floor"] <= xp < p["level_ceil"], xp
        assert p["level"] >= previo
        previo = p["level"]
    assert maestria.progreso(0)["level"] == 1 and maestria.progreso(10 ** 7, 5)["level"] == 100
    # las horas de referencia de cada rango (con las pruebas superadas)
    assert [maestria.progreso(h * 60, 5)["rank"] for h in (0, 20, 100, 400, 1500, 5000)] == list("EDCBAS")
    # sin superar la prueba, las horas no dan rango: nivel sellado y XP en reserva
    p = maestria.progreso(30 * 60, 0)
    assert p["rank"] == "E" and p["level"] == 10 and p["sealed"] and p["reserve_xp"] == 600 and p["trial_open"]
    # la prueba se abre al 90 % del rango
    assert not maestria.progreso(1079, 0)["trial_open"] and maestria.progreso(1080, 0)["trial_open"]
    assert not maestria.progreso(1080, 1)["trial_open"], "ya superada, no se vuelve a abrir"


def test_tipos_de_habilidad_y_planes():
    import json
    from app import maestria
    from app.maestria_plantillas import PLANTILLAS
    for cat in PLANTILLAS:
        plan = maestria.validar_plan(maestria.plantilla(cat, "Lo que sea"))
        assert "{h}" not in json.dumps(plan, ensure_ascii=False)
        for banda in ("base", "medio", "alto"):
            for m in plan["diarias"][banda] + plan["semanales"][banda]:
                assert "Hecho cuando" in m["detalle"], (cat, m["titulo"])
    casos = {"Guitarra": "musica", "Inglés C2": "idioma", "Programar en Python": "programacion",
             "Dibujo anatómico": "arte", "Calistenia": "deporte", "Escribir una novela": "escritura",
             "Señales y sistemas": "estudio", "Hablar en público": "comunicacion", "Ajedrez": "estrategia",
             "Pan de masa madre": "cocina", "Cubo de Rubik": "general"}
    for nombre, cat in casos.items():
        assert maestria.detectar_categoria(nombre) == cat, nombre
    assert maestria.detectar_categoria("Mi reto", "aprobar el C1 de inglés este año") == "idioma"
    with pytest.raises(ValueError):
        maestria.validar_plan({"competencias": {}})


def test_sistema_de_habilidades():
    from app.maestria_plantillas import IDIOMA
    U = {"X-Test-User": "habil", "Origin": "https://ok.test"}
    g = c.post("/skill-board/skills", json={"name": "Guitarra", "stat": "AGI", "daily_minutes": 20}, headers=U).json()
    assert g["category"] == "musica" and g["ai_plan"] is False
    ing = c.post("/skill-board/skills", json={"name": "Inglés", "daily_minutes": 15, "start_rank": "C",
                                              "start_hours": 150}, headers=U).json()
    b = _tablero(U)
    assert len(b["daily"]) == 2 and len(b["weekly"]) == 2 and b["trials"] == []
    assert [m["id"] for m in _tablero(U)["daily"]] == [m["id"] for m in b["daily"]], "las mismas al recargar"
    hi = _de(b["skills"], ing["id"])
    assert hi["rank"] == "C" and hi["hours"] == 150 and hi["path"][2]["state"] == "current"
    assert hi["path"][1]["certified"] and hi["path"][2]["certified"]
    # con rango C, la misión de Inglés sale de la banda media de su plan
    assert _de(b["daily"], ing["id"])["title"] in {m["titulo"] for m in IDIOMA["diarias"]["medio"]}

    # cumplir: sus minutos + 15 XP
    mg = _de(b["daily"], g["id"])
    r = c.post(f"/skill-board/missions/{mg['id']}/complete",
               json={"date": str(HOY), "minutes": 25, "note": "Salió limpio"}, headers=U).json()
    assert r["result"]["xp_gained"] == 25 + 15 and r["result"]["level_up"]
    assert _de(r["board"]["daily"], g["id"])["status"] == "hecha"
    assert c.post(f"/skill-board/missions/{mg['id']}/complete", json={"date": str(HOY)},
                  headers=U).status_code == 409
    # deshacer devuelve la XP y borra su registro
    r = c.post(f"/skill-board/missions/{mg['id']}/undo", json={"date": str(HOY)}, headers=U).json()
    assert _de(r["board"]["skills"], g["id"])["xp"] == 0
    # cambiar la misión: una vez al día, por otra distinta y sin moverla de sitio
    orden = [m["skill_id"] for m in _tablero(U)["daily"]]
    r = c.post(f"/skill-board/missions/{mg['id']}/reroll", json={"date": str(HOY)}, headers=U)
    assert r.status_code == 200, r.text
    assert [m["skill_id"] for m in r.json()["board"]["daily"]] == orden
    nueva = _de(r.json()["board"]["daily"], g["id"])
    assert nueva["id"] != mg["id"] and nueva["title"] != mg["title"] and not nueva["can_reroll"]
    assert c.post(f"/skill-board/missions/{nueva['id']}/reroll", json={"date": str(HOY)},
                  headers=U).status_code == 409
    assert c.post(f"/skill-board/skills/{g['id']}/daily", json={"date": str(HOY)}, headers=U).status_code == 409
    # una habilidad sin misiones diarias puede pedir la suya (extra: no cuenta para la racha)
    pausa = c.post("/skill-board/skills", json={"name": "Ajedrez", "daily_minutes": 0}, headers=U).json()
    assert all(m["skill_id"] != pausa["id"] for m in _tablero(U)["daily"])
    r = c.post(f"/skill-board/skills/{pausa['id']}/daily", json={"date": str(HOY)}, headers=U).json()
    assert _de(r["board"]["daily"], pausa["id"])["extra"] is True

    # práctica libre: minuto a minuto
    r = c.post(f"/skill-board/skills/{g['id']}/log",
               json={"date": str(HOY), "minutes": 30, "today": str(HOY)}, headers=U).json()
    assert r["result"]["xp_gained"] == 30 and r["board"]["date"] == str(HOY)
    assert c.post(f"/skill-board/skills/{g['id']}/log", json={"date": str(HOY), "minutes": 9999},
                  headers=U).status_code == 422
    # hitos personales: como mucho 300 XP
    assert c.post(f"/skill-board/skills/{g['id']}/quests", json={"title": "Tocar en la boda", "xp": 5000},
                  headers=U).status_code == 422
    q = c.post(f"/skill-board/skills/{g['id']}/quests", json={"title": "Tocar en la boda", "xp": 300},
               headers=U).json()
    c.patch(f"/skill-board/quests/{q['id']}", json={"done": True}, headers=U)
    assert _de(_tablero(U)["skills"], g["id"])["xp"] == 30 + 300

    # Hoy cuenta las misiones del Sistema; la racha llega al cumplir todas las del lote
    assert c.get(f"/today?date={HOY}", headers=U).json()["missions"] == {"total": 3, "done": 0}
    for m in _tablero(U)["daily"]:
        if not m["extra"]:
            assert c.post(f"/skill-board/missions/{m['id']}/complete", json={"date": str(HOY)},
                          headers=U).status_code == 200
    b = _tablero(U)
    assert b["player"]["streak"] == 1 and b["player"]["missions_done"] == 2
    assert c.get(f"/today?date={HOY}", headers=U).json()["missions"] == {"total": 3, "done": 2}
    # las misiones de otro no se tocan
    assert c.post(f"/skill-board/missions/{mg['id']}/undo", json={"date": str(HOY)}, headers=A).status_code == 404
    # borrar una habilidad se lleva sus misiones, su plan y su historial
    assert c.delete(f"/skills/{g['id']}", headers=U).status_code == 200
    assert all(m["skill_id"] != g["id"] for m in _tablero(U)["daily"])


def test_prueba_de_ascenso_y_sello():
    U = {"X-Test-User": "ascenso", "Origin": "https://ok.test"}
    s = c.post("/skill-board/skills", json={"name": "Dibujo", "daily_minutes": 20}, headers=U).json()
    # 21 h de práctica: más que las 20 h del rango D, pero sin haberlo demostrado
    for dias, horas in ((2, 12), (1, 9)):
        assert c.post(f"/skill-board/skills/{s['id']}/log",
                      json={"date": str(HOY - timedelta(days=dias)), "minutes": horas * 60},
                      headers=U).status_code == 200
    b = _tablero(U)
    h = _de(b["skills"], s["id"])
    assert h["rank"] == "E" and h["level"] == 10 and h["sealed"] and h["trial_open"]
    assert h["next_trial"]["open"] and len(h["next_trial"]["criteria"]) == 3
    pr = _de(b["trials"], s["id"])
    assert pr["target"] == "D" and pr["target_title"] == "Aprendiz" and len(pr["criteria"]) == 3
    # con la prueba abierta, el Sistema ensaya: la semanal o la diaria lo hacen en días alternos
    url = f"/skill-board/missions/{pr['id']}/complete"
    assert c.post(url, json={"date": str(HOY), "criteria": [True, True, False],
                             "note": "Lo hice todo bien"}, headers=U).status_code == 422
    assert c.post(url, json={"date": str(HOY), "criteria": [True] * 3, "note": "corta"},
                  headers=U).status_code == 422
    r = c.post(url, json={"date": str(HOY), "criteria": [True] * 3,
                          "note": "Grabé los 30 cubos y el bodegón; los revisó mi profesora."}, headers=U).json()
    assert r["result"]["rank_up"] and r["result"]["skill"]["rank"] == "D" and r["result"]["trial_passed"]
    h = _de(r["board"]["skills"], s["id"])
    assert h["rank"] == "D" and h["level"] > 10 and not h["sealed"] and not h["trial_open"]
    assert all(m["skill_id"] != s["id"] for m in r["board"]["trials"])
    # punto de partida desde Ajustes: el rango convalidado trae sus horas mínimas
    c.patch(f"/skill-board/skills/{s['id']}", json={"start_rank": "B"}, headers=U)
    h = _de(_tablero(U)["skills"], s["id"])
    assert h["rank"] == "B" and h["base_hours"] == 400 and h["path"][3]["state"] == "current"


def test_plan_a_medida_con_ia(monkeypatch):
    import json
    from app import maestria
    from app.config import settings
    U = {"X-Test-User": "con-ia", "Origin": "https://ok.test"}
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-prueba")
    pedidos = []

    def falso(nombre, objetivo, categoria, minutos, rango):
        pedidos.append((nombre, objetivo, categoria, minutos, rango))
        plan = json.loads(json.dumps(maestria.plantilla("general", nombre)))
        for m in plan["diarias"]["base"]:
            m["titulo"] = "A medida · " + m["titulo"]
        return maestria.validar_plan(plan)

    monkeypatch.setattr(maestria, "generar_plan_ia", falso)
    s = c.post("/skill-board/skills", json={"name": "Origami", "description": "Grullas perfectas",
                                            "daily_minutes": 20}, headers=U).json()
    assert s["ai_plan"] and pedidos == [("Origami", "Grullas perfectas", "general", 20, "E")]
    b = _tablero(U)
    h = _de(b["skills"], s["id"])
    assert h["plan"]["source"] == "ia" and not h["plan"]["generating"]
    assert _de(b["daily"], s["id"])["title"].startswith("A medida · ")

    # si la IA falla, la habilidad sigue con el plan de su tipo (y lo dice)
    def rota(*a):
        raise RuntimeError("sin red")
    monkeypatch.setattr(maestria, "generar_plan_ia", rota)
    s2 = c.post("/skill-board/skills", json={"name": "Violín", "daily_minutes": 15}, headers=U).json()
    b = _tablero(U)
    h2 = _de(b["skills"], s2["id"])
    assert h2["plan"]["source"] == "plantilla" and h2["plan"]["failed"]
    assert any(m["skill_id"] == s2["id"] for m in b["daily"]), "con misiones igualmente"
    # sin IA en el servidor, pedir un plan a medida lo explica; volver a la plantilla siempre se puede
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None)
    assert c.post(f"/skill-board/skills/{s['id']}/plan", headers=U).status_code == 409
    assert c.delete(f"/skill-board/skills/{s['id']}/plan", headers=U).status_code == 200
    assert _de(_tablero(U)["skills"], s["id"])["plan"]["source"] == "plantilla"


def test_tablero_sin_consultas_por_habilidad():
    """El tablero no hace una consulta por habilidad (N+1): con 6 o con 2, las mismas."""
    U = {"X-Test-User": "muchas", "Origin": "https://ok.test"}
    cuenta = []

    def contar(*a, **k):
        cuenta.append(1)
    for nombre in ("Piano", "Francés"):
        c.post("/skill-board/skills", json={"name": nombre}, headers=U)
    _tablero(U)                                    # crea las misiones de hoy
    event.listen(engine, "before_cursor_execute", contar)
    try:
        _tablero(U)
        con_dos = len(cuenta)
        for nombre in ("Boxeo", "Python", "Ajedrez", "Cocina"):
            c.post("/skill-board/skills", json={"name": nombre, "daily_minutes": 0}, headers=U)
        _tablero(U)
        cuenta.clear()
        _tablero(U)
        assert len(cuenta) == con_dos <= 12, (con_dos, len(cuenta))
    finally:
        event.remove(engine, "before_cursor_execute", contar)


def test_widget_con_llave_propia():
    llaves = [c.post("/widget/tokens", json={"name": f"m{i}"}, headers=A) for i in range(4)]
    assert [r.status_code for r in llaves] == [200, 200, 200, 409]
    llave = llaves[0].json()["token"]
    assert llave.startswith("tcw_") and len(llave) > 40
    assert all("token" not in t for t in c.get("/widget/tokens", headers=A).json())
    w = c.get("/widget", headers={"Authorization": f"Bearer {llave}"})
    assert w.status_code == 200
    datos = w.json()
    assert set(datos) == {"date", "quote", "quote_tomorrow", "quotes", "habits", "tasks", "letter", "missions"}
    assert "user_id" not in w.text and "usuario-a" not in w.text
    assert c.get("/widget", headers={"Authorization": "Bearer tcw_inventada"}).status_code == 401
    assert c.get("/widget").status_code == 401
    c.delete(f"/widget/tokens/{llaves[0].json()['id']}", headers=A)
    assert c.get("/widget", headers={"Authorization": f"Bearer {llave}"}).status_code == 401


def test_secciones_de_tareas_en_hoy_y_widget_de_frases():
    s1 = c.post("/task-sections", json={"name": "Universidad"}, headers=A).json()
    s2 = c.post("/task-sections", json={"name": "Casa"}, headers=A).json()
    assert s1["in_today"] is False
    for txt, sec in [("Entregar práctica", s1["id"]), ("Estudiar señales", s1["id"]), ("Fregar", s2["id"]), ("Suelta", None)]:
        c.post("/random-tasks", json={"content": txt, "section_id": sec}, headers=A)
    hecha = c.post("/random-tasks", json={"content": "Ya hecha", "section_id": s1["id"]}, headers=A).json()
    c.patch(f"/random-tasks/{hecha['id']}", json={"done": True}, headers=A)
    assert c.get(f"/today?date={HOY}", headers=A).json()["task_sections"] == []
    r = c.patch(f"/task-sections/{s1['id']}", json={"in_today": True}, headers=A)
    assert r.status_code == 200 and r.json()["in_today"] is True
    hoy = c.get(f"/today?date={HOY}", headers=A).json()["task_sections"]
    assert [x["name"] for x in hoy] == ["Universidad"]
    assert [t["content"] for t in hoy[0]["tasks"]] == ["Entregar práctica", "Estudiar señales"], "solo pendientes, en orden"
    # otro usuario no puede tocar la sección ni la ve en su Hoy
    assert c.patch(f"/task-sections/{s1['id']}", json={"in_today": False}, headers=B).status_code == 404
    assert c.get(f"/today?date={HOY}", headers=B).json()["task_sections"] == []
    # renombrar no la saca de Hoy; quitarla sí
    c.patch(f"/task-sections/{s1['id']}", json={"name": "Uni"}, headers=A)
    assert c.get("/task-sections", headers=A).json()[0]["in_today"] is True
    # el widget enseña las tareas de esa sección y trae las frases para ir rotando
    for i in range(3):
        c.post("/quotes", json={"text": f"Rota {i}", "author": "Yo"}, headers=A)
    llave = c.post("/widget/tokens", json={"name": "frases"}, headers=A)
    if llave.status_code == 409:   # la prueba anterior dejó llaves: se libera una
        c.delete(f"/widget/tokens/{c.get('/widget/tokens', headers=A).json()[0]['id']}", headers=A)
        llave = c.post("/widget/tokens", json={"name": "frases"}, headers=A)
    w = c.get("/widget", headers={"Authorization": f"Bearer {llave.json()['token']}"}).json()
    assert w["tasks"] == ["Entregar práctica", "Estudiar señales"]
    assert w["quotes"][0] == w["quote"], "la rotación empieza por la frase del día"
    assert len({q["text"] for q in w["quotes"]}) == len(w["quotes"]) and w["quote_tomorrow"]
    c.patch(f"/task-sections/{s1['id']}", json={"in_today": False}, headers=A)
    assert c.get(f"/today?date={HOY}", headers=A).json()["task_sections"] == []


def test_avisos_push(monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from app import webpush
    pk = c.get("/push/config", headers=A).json()["public_key"]
    assert len(webpush.b64u_dec(pk)) == 65
    ua = ec.generate_private_key(ec.SECP256R1())
    pub = ua.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    sub = {"endpoint": "https://push.example.com/abc123def456", "tz": "Europe/Madrid", "hour": 0, "minute": 0,
           "keys": {"p256dh": webpush.b64u(pub), "auth": webpush.b64u(os.urandom(16))}}
    assert c.post("/push/subscribe", json=sub, headers=B).status_code == 200
    enviados = []

    class R:
        status_code = 201
        text = ""

    def falso_post(url, content, headers, timeout):
        enviados.append((url, headers))
        return R()
    monkeypatch.setattr(webpush.httpx, "post", falso_post)
    assert c.post("/push/run").status_code == 200
    assert len(enviados) == 1 and enviados[0][1]["Authorization"].startswith("vapid t=")
    c.post("/push/run")
    assert len(enviados) == 1, "como mucho un aviso al día"
    # quien ya escribió su carta no recibe aviso
    from datetime import datetime
    from zoneinfo import ZoneInfo
    hoy_madrid = datetime.now(ZoneInfo("Europe/Madrid")).date()
    with SessionLocal() as db:
        s = db.query(models.PushSubscription).first()
        s.last_sent_on = None
        db.commit()
    c.put(f"/daily-letters/{hoy_madrid}", json={"body": "Escrita"}, headers=B)
    c.post("/push/run")
    assert len(enviados) == 1


def test_borrado_de_cuenta_completo():
    """Tras borrar la cuenta no queda NINGUNA fila del usuario en NINGUNA tabla."""
    from app.routers.profile import _modelos_por_tabla, _filtro_de_usuario
    with SessionLocal() as db:
        db.add(models.Friendship(requester_id="usuario-a", addressee_id="usuario-b", status="aceptada"))
        v = models.Value(user_id="usuario-a", title="Honestidad")
        db.add(v); db.flush()
        db.add(models.ValueCheckin(value_id=v.id, date=HOY, score=4))
        db.add(models.AiUsage(user_id="usuario-a", day=HOY, calls=3))
        db.add(models.AiUsage(user_id="usuario-a", day=HOY - timedelta(days=3), calls=1))
        db.commit()
    exp = c.get("/export", headers=A).json()
    assert exp["_cuentas"]["daily_letters"] >= 3 and "widget_tokens" not in exp
    r = c.delete("/profile/account?confirm=BORRAR", headers=A)
    assert r.status_code == 200, r.text
    mapa = _modelos_por_tabla()
    with SessionLocal() as db:
        for tabla in models.Base.metadata.sorted_tables:
            m = mapa[tabla.name]
            cond = _filtro_de_usuario(m, tabla.name, "usuario-a", mapa)
            if cond is None:
                continue
            restos = db.query(m).filter(cond).count()
            if tabla.name == "ai_usage":
                assert restos == 1, "se conserva solo el contador de hoy"
            elif tabla.name == "friendships":
                assert restos == 0
            else:
                assert restos == 0, f"quedan filas en {tabla.name}"
        assert db.query(models.DailyLetter).filter_by(user_id="usuario-b").count() == 1


def _habito(U, **kw):
    r = c.post("/daily-tasks", json=kw, headers=U)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _estado(U, todos=False):
    r = c.get(f"/daily-tasks/today?date={HOY}{'&all=1' if todos else ''}", headers=U)
    assert r.status_code == 200, r.text
    return {h["title"]: h for h in r.json()}


def test_habitos_en_cuatro_tipos():
    U = {"X-Test-User": "habitos-4", "Origin": "https://ok.test"}
    meditar = _habito(U, title="Meditar", minutes=25, priority=1)
    piano = _habito(U, title="Piano", kind="bloque", minutes=45, per_week=2)
    gym = _habito(U, title="Gimnasio", kind="bloque", minutes=75, days=[0, 1, 3, 4], link="entreno")
    agua = _habito(U, title="Agua", kind="metrica", target=3.5, unit="L", step=0.25, minutes=30)
    sueno = _habito(U, title="Sueño", kind="metrica", target=8, unit="h", step=0.5, link="sueno")
    regla = _habito(U, title="Primero lo importante", kind="principio", description="Lo difícil, por la mañana")
    # validación
    assert c.post("/daily-tasks", json={"title": "x", "kind": "otro"}, headers=U).status_code == 422
    assert c.post("/daily-tasks", json={"title": "x", "days": [7]}, headers=U).status_code == 422
    assert c.post("/daily-tasks", json={"title": "   "}, headers=U).status_code == 422
    assert c.post("/daily-tasks", json={"title": "x", "link": "otra"}, headers=U).status_code == 422
    e = _estado(U)
    assert e["Gimnasio"]["days"] == [0, 1, 3, 4] and e["Gimnasio"]["per_week"] == 4 and e["Gimnasio"]["week_goal"] == 4
    assert e["Agua"]["minutes"] == 0, "una métrica no ocupa tiempo"
    assert e["Piano"]["streak_unit"] == "semanas" and e["Meditar"]["streak_unit"] == "dias"
    assert e["Primero lo importante"]["description"].startswith("Lo difícil")
    # métricas: sumar con el botón rápido y fijar la cifra; se cumple al llegar al objetivo
    r = c.put(f"/daily-tasks/{agua}/value", json={"date": HOY.isoformat(), "add": 0.25}, headers=U).json()
    r = c.put(f"/daily-tasks/{agua}/value", json={"date": HOY.isoformat(), "add": 0.25}, headers=U).json()
    assert r == {"value": 0.5, "done": False}
    assert c.put(f"/daily-tasks/{agua}/value", json={"date": HOY.isoformat(), "value": 3.5}, headers=U).json()["done"]
    assert _estado(U)["Agua"]["value_today"] == 3.5 and _estado(U)["Agua"]["done_today"]
    assert c.put(f"/daily-tasks/{meditar}/value", json={"date": HOY.isoformat(), "value": 1}, headers=U).status_code == 422
    # la métrica de sueño escribe también en Sueño (y lee de allí)
    c.put(f"/daily-tasks/{sueno}/value", json={"date": HOY.isoformat(), "value": 7.5}, headers=U)
    assert [n["hours"] for n in c.get("/sleep", headers=U).json()] == [7.5]
    c.put("/sleep", json={"date": HOY.isoformat(), "hours": 8.25}, headers=U)
    assert _estado(U)["Sueño"]["value_today"] == 8.25 and _estado(U)["Sueño"]["done_today"]
    # principio: sí / a medias / no, sin racha; se puede borrar la respuesta
    assert c.put(f"/daily-tasks/{regla}/value", json={"date": HOY.isoformat(), "value": 0.3}, headers=U).status_code == 422
    c.put(f"/daily-tasks/{regla}/value", json={"date": HOY.isoformat(), "value": 0.5}, headers=U)
    assert _estado(U)["Primero lo importante"]["value_today"] == 0.5 and _estado(U)["Primero lo importante"]["streak"] == 0
    with SessionLocal() as db:   # «a medias» o «no» no cuentan como hábito cumplido en los resúmenes
        assert db.query(models.TaskCompletion).filter_by(daily_task_id=regla, date=HOY).one().done is False
    c.put(f"/daily-tasks/{regla}/value", json={"date": HOY.isoformat(), "clear": True}, headers=U)
    assert _estado(U)["Primero lo importante"]["value_today"] is None
    # el gimnasio se marca solo al registrar un entreno
    ej = c.post("/exercises", json={"name": "Press banca"}, headers=U).json()
    c.post("/sessions", json={"exercise_id": ej["id"], "date": HOY.isoformat(), "sets": [{"set_number": 1, "reps": 5, "weight": 60}]}, headers=U)
    assert _estado(U)["Gimnasio"]["done_today"]
    # racha de semanas: 2 veces la semana pasada cumple la meta de «2 por semana»
    lunes = HOY - timedelta(days=HOY.weekday())
    for d in (lunes - timedelta(days=6), lunes - timedelta(days=3)):
        c.put(f"/daily-tasks/{piano}/complete", json={"date": d.isoformat(), "done": True}, headers=U)
    k = _estado(U)["Piano"]
    assert k["streak"] == 1 and k["week_goal"] == 2
    # editar y pausar
    assert c.patch(f"/daily-tasks/{piano}", json={"minutes": 50, "priority": 1}, headers=U).status_code == 200
    assert c.patch(f"/daily-tasks/{piano}", json={"active": False}, headers=U).status_code == 200
    assert "Piano" not in _estado(U) and _estado(U, todos=True)["Piano"]["minutes"] == 50
    assert c.patch(f"/daily-tasks/{piano}", json={"active": True}, headers=B).status_code == 404
    assert c.post(f"/daily-tasks/{gym}/complete", headers=U).status_code == 405


def test_plan_automatico_cabe_en_tu_tiempo():
    U = {"X-Test-User": "plan-auto", "Origin": "https://ok.test"}
    meditar = _habito(U, title="Meditar", minutes=25, priority=1)
    _habito(U, title="Estudiar", kind="bloque", minutes=90, per_week=5, priority=1)
    _habito(U, title="Selfcare", minutes=30, per_week=2, priority=3)
    _habito(U, title="Vitaminas", minutes=0)
    _habito(U, title="Agua", kind="metrica", target=3.5, unit="L", step=0.25)
    _habito(U, title="Primero lo importante", kind="principio")
    hoy_dia = HOY.weekday()
    _habito(U, title="Solo otro día", kind="bloque", minutes=10, days=[(hoy_dia + 1) % 7])
    assert c.put("/planner/settings", json={"budget": [60] * 7}, headers=U).status_code == 200
    p = c.get(f"/today?date={HOY}", headers=U).json()["plan"]
    assert p["source"] == "auto" and p["budget"] == 60
    titulos = [h["title"] for h in p["items"]]
    assert titulos[0] == "Meditar", "lo imprescindible y diario, primero"
    assert "Vitaminas" in titulos, "lo que no lleva tiempo siempre cabe"
    assert p["planned_minutes"] <= 60
    assert "Solo otro día" not in titulos + [h["title"] for h in p["extras"]]
    assert "Solo otro día" in [h["title"] for h in p["others"]], "lo que no toca sigue a mano"
    assert "Estudiar" in [h["title"] for h in p["extras"]], "lo que no cabe, a «si te da tiempo»"
    assert [m["title"] for m in p["metrics"]] == ["Agua"] and p["principle"]["title"] == "Primero lo importante"
    # el mismo día da el mismo plan, aunque vayas marcando
    c.put(f"/daily-tasks/{meditar}/complete", json={"date": HOY.isoformat(), "done": True}, headers=U)
    p2 = c.get(f"/today?date={HOY}", headers=U).json()["plan"]
    assert [h["id"] for h in p2["items"]] == [h["id"] for h in p["items"]] and p2["done_minutes"] == 25
    # con más tiempo, entra también lo grande
    c.put("/planner/settings", json={"budget": [240] * 7}, headers=U)
    p3 = c.get(f"/today?date={HOY}", headers=U).json()["plan"]
    assert "Estudiar" in [h["title"] for h in p3["items"]]
    assert c.put("/planner/settings", json={"budget": [60] * 6}, headers=U).status_code == 422
    assert c.put("/planner/settings", json={"budget": [1000] * 7}, headers=U).status_code == 422
    # el widget cuenta lo del plan, no todos los hábitos
    w = c.post("/widget/tokens", json={"name": "p"}, headers=U).json()["token"]
    wj = c.get("/widget", headers={"Authorization": f"Bearer {w}"}).json()
    assert wj["habits"]["total"] == len(p3["items"])


def test_importar_configuracion_sugerida():
    U = {"X-Test-User": "importa", "Origin": "https://ok.test"}
    agua = _habito(U, title="3,5L de agua")
    regla = _habito(U, title="Primero lo importante")
    otro = _habito(B, title="Ajeno")
    r = c.post("/daily-tasks/import", json={"habits": [
        {"id": agua, "match_title": "3,5L de agua", "title": "Agua", "kind": "metrica", "target": 3.5, "unit": "L", "step": 0.25},
        {"id": regla, "match_title": "Primero lo importante", "kind": "principio", "description": "Lo difícil, primero"},
        {"id": otro, "match_title": "Ajeno", "title": "Mío"},
        {"id": regla, "match_title": "Otro título", "minutes": 99},
        {"title": "Japonés", "kind": "habito", "minutes": 15},
    ], "budget": [200, 200, 200, 200, 200, 300, 300], "brief": "Constancia"}, headers=U).json()
    assert r["updated"] == 2 and r["created"] == 1 and len(r["skipped"]) == 2
    e = _estado(U)
    assert e["Agua"]["kind"] == "metrica" and e["Agua"]["target"] == 3.5 and e["Japonés"]["minutes"] == 15
    assert e["Primero lo importante"]["kind"] == "principio" and e["Primero lo importante"]["minutes"] == 0
    assert _estado(B)["Ajeno"]["title"] == "Ajeno", "nunca toca hábitos de otra cuenta"
    s = c.get("/planner/settings", headers=U).json()
    assert s["budget"][5] == 300 and s["brief"] == "Constancia" and s["connected"] is False


def test_claude_planifica_con_llave_propia():
    import json as _json
    from app import maestria
    U = {"X-Test-User": "con-claude", "Origin": "https://ok.test"}
    meditar = _habito(U, title="Meditar", minutes=25, priority=1)
    estudio = _habito(U, title="Estudiar", kind="bloque", minutes=90, per_week=5)
    proy = _habito(U, title="Proyecto", kind="bloque", minutes=60, per_week=4)
    agua = _habito(U, title="Agua", kind="metrica", target=3.5, unit="L")
    regla = _habito(U, title="Primero lo importante", kind="principio")
    ajeno = _habito(B, title="De otra cuenta", minutes=5)
    c.put("/planner/settings", json={"budget": [120] * 7, "brief": "Constancia antes que intensidad"}, headers=U)
    c.put(f"/daily-letters/{HOY}", json={"body": "SECRETO-DE-LA-CARTA"}, headers=U)
    c.post("/notes", json={"content": "SECRETO-DE-LA-NOTA"}, headers=U)
    c.post("/goals", json={"description": "Aprobar el curso"}, headers=U)

    # llaves: se muestran una vez, máximo 2; la de la app no abre el planificador ni al revés
    k1 = c.post("/planner/keys", headers=U).json()
    assert k1["token"].startswith("tcp_")
    k2 = c.post("/planner/keys", headers=U).json()
    assert c.post("/planner/keys", headers=U).status_code == 409
    assert "token" not in _json.dumps(c.get("/planner/settings", headers=U).json()["keys"])
    K = {"Authorization": f"Bearer {k1['token']}"}
    assert c.get("/planner/context", headers=U).status_code == 401
    assert c.get("/planner/context", headers={"Authorization": "Bearer tcp_falsa"}).status_code == 401
    assert c.get("/today", headers=K).status_code in (401, 422)
    w = c.post("/widget/tokens", json={"name": "x"}, headers=U).json()["token"]
    assert c.get("/planner/context", headers={"Authorization": f"Bearer {w}"}).status_code == 401

    assert c.get("/planner/settings", headers=U).json()["connected"] is False, "llave sin usar: aún no conectado"
    ctx = c.get("/planner/context?force=1", headers=K).json()
    assert c.get("/planner/settings", headers=U).json()["connected"] is True
    plan_job = next(j for j in ctx["jobs"] if j["kind"] == "plan_dia")
    assert plan_job["post"] == f"/planner/plan?date={ctx['date']}" and plan_job["schema"]["type"] == "object"
    assert "Meditar" in plan_job["prompt"] and "Constancia antes que intensidad" in plan_job["prompt"]
    assert "Aprobar el curso" in plan_job["prompt"]
    assert "SECRETO" not in _json.dumps(ctx), "ni cartas ni notas salen hacia Claude"

    # Claude se pasa del tiempo y mete un id ajeno: el servidor lo corrige
    res = {"note": "Hoy, foco en el estudio.", "principle_id": regla, "metrics": [agua, meditar],
           "items": [{"id": estudio, "why": "Vas atrasado", "extra": False},
                     {"id": meditar, "why": "Cada día", "extra": False},
                     {"id": proy, "why": "Avanza", "extra": False},
                     {"id": ajeno, "why": "x", "extra": False},
                     {"id": meditar, "why": "repetido", "extra": False}]}
    r = c.post(plan_job["post"], json={"result": res, "model": "sonnet"}, headers=K).json()
    assert r == {"ok": True, "items": 2, "extras": 1, "ignored": 2}
    p = c.get(f"/today?date={ctx['date']}", headers=U).json()["plan"]
    assert p["source"] == "claude" and p["note"] == "Hoy, foco en el estudio." and p["model"] == "sonnet"
    assert [h["title"] for h in p["items"]] == ["Estudiar", "Meditar"] and p["planned_minutes"] <= 120
    assert [h["title"] for h in p["extras"]] == ["Proyecto"] and p["items"][0]["why"] == "Vas atrasado"
    assert [m["title"] for m in p["metrics"]] == ["Agua"] and p["principle"]["id"] == regla
    # si Claude se olvida de lo imprescindible y diario, el servidor lo pone delante igualmente
    r = c.post(plan_job["post"], json={"result": {**res, "items": [{"id": estudio, "why": "Foco", "extra": False}]}}, headers=K)
    assert [h["title"] for h in c.get(f"/today?date={ctx['date']}", headers=U).json()["plan"]["items"]] == ["Meditar", "Estudiar"]
    # y si lo pone detrás de algo que llena el día, lo imprescindible pasa delante
    c.put("/planner/settings", json={"budget": [60] * 7}, headers=U)
    c.post(plan_job["post"], json={"result": {**res, "items": [{"id": proy, "why": "Avanza", "extra": False},
                                                              {"id": meditar, "why": "Hoy también", "extra": False}]}}, headers=K)
    p = c.get(f"/today?date={ctx['date']}", headers=U).json()["plan"]
    assert [h["title"] for h in p["items"]] == ["Meditar"] and p["items"][0]["why"] == "Hoy también"
    assert [h["title"] for h in p["extras"]] == ["Proyecto"]
    c.put("/planner/settings", json={"budget": [120] * 7}, headers=U)
    # sin «force», con el plan hecho no hay encargo del día
    assert not [j for j in c.get("/planner/context", headers=K).json()["jobs"] if j["kind"] == "plan_dia"]
    # descartarlo devuelve el automático, y la siguiente ronda no lo rehace (salvo «rehacer»)
    c.delete(f"/planner/plan?date={ctx['date']}", headers=U)
    assert c.get(f"/today?date={ctx['date']}", headers=U).json()["plan"]["source"] == "auto"
    assert not [j for j in c.get("/planner/context", headers=K).json()["jobs"] if j["kind"] == "plan_dia"]
    assert [j for j in c.get("/planner/context?force=1", headers=K).json()["jobs"] if j["kind"] == "plan_dia"]

    # planes de misiones: con Claude conectado van a la cola (no a la API del servidor)
    s = c.post("/skill-board/skills", json={"name": "Ajedrez", "daily_minutes": 15}, headers=U).json()
    b = c.get(f"/skill-board?date={HOY}", headers=U).json()
    h = next(x for x in b["skills"] if x["id"] == s["id"])
    assert b["ai"]["via"] == "claude" and h["plan"]["queued"] and not h["plan"]["generating"]
    assert c.post(f"/skill-board/skills/{s['id']}/plan", headers=U).status_code == 409, "ya está en cola"
    job = next(j for j in c.get("/planner/context", headers=K).json()["jobs"] if j["kind"] == "plan_mision")
    assert "Ajedrez" in job["prompt"] and job["post"] == f"/planner/skill-plans/{s['id']}"
    assert c.post(job["post"], json={"result": {"competencias": {}}}, headers=K).status_code == 422
    KB = {"Authorization": f"Bearer {c.post('/planner/keys', headers=B).json()['token']}"}
    assert c.post(job["post"], json={"result": {}}, headers=KB).status_code == 404
    plan = _json.loads(_json.dumps(maestria.plantilla("estrategia", "Ajedrez")))
    assert c.post(job["post"], json={"result": plan, "model": "sonnet"}, headers=K).json()["status"] == "lista"
    h = next(x for x in c.get(f"/skill-board?date={HOY}", headers=U).json()["skills"] if x["id"] == s["id"])
    assert h["plan"]["source"] == "ia" and not h["plan"]["queued"]
    assert c.post(job["post"], json={"result": plan}, headers=K).status_code == 409, "ya no está en cola"

    # revocar las llaves desconecta a Claude; lo que estaba en cola vuelve a la plantilla
    s2 = c.post("/skill-board/skills", json={"name": "Go", "daily_minutes": 15}, headers=U).json()
    assert next(x for x in c.get(f"/skill-board?date={HOY}", headers=U).json()["skills"] if x["id"] == s2["id"])["plan"]["queued"]
    for k in (k1, k2):
        assert c.delete(f"/planner/keys/{k['id']}", headers=U).status_code == 200
    assert c.get("/planner/context", headers=K).status_code == 401
    assert c.get("/planner/settings", headers=U).json()["connected"] is False
    h2 = next(x for x in c.get(f"/skill-board?date={HOY}", headers=U).json()["skills"] if x["id"] == s2["id"])
    assert not h2["plan"]["queued"] and h2["plan"]["source"] == "plantilla"


def test_app_privada_solo_cuentas_permitidas(monkeypatch):
    """Con USUARIOS_PERMITIDOS, un token válido de otra cuenta no abre nada (403); sin la variable, todo igual."""
    from fastapi import HTTPException
    from fastapi.security import HTTPAuthorizationCredentials
    from jose import jwt as _jwt
    from app import auth
    from app.config import settings
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "secreto-de-prueba")

    def entra(correo):
        tok = _jwt.encode({"sub": "id-" + (correo or "sin"), "email": correo}, "secreto-de-prueba", algorithm="HS256")
        return auth.get_current_user_id(HTTPAuthorizationCredentials(scheme="Bearer", credentials=tok))

    monkeypatch.setattr(settings, "USUARIOS_PERMITIDOS", "")
    assert entra("cualquiera@correo.com") == "id-cualquiera@correo.com", "sin lista, como siempre"
    monkeypatch.setattr(settings, "USUARIOS_PERMITIDOS", " Yo@Correo.com , otra@correo.com")
    assert entra("yo@correo.com") == "id-yo@correo.com", "sin distinguir mayúsculas ni espacios"
    for correo in ("intruso@correo.com", "", None):
        with pytest.raises(HTTPException) as e:
            entra(correo)
        assert e.value.status_code == 403 and "privada" in e.value.detail
