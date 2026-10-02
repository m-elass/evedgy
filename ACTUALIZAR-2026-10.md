# Actualización de octubre — velocidad, carta diaria, Saber, Sistema y widgets

Esta versión hace cuatro cosas:

1. **Arregla la lentitud y los «datos que desaparecen».** Tus datos nunca se
   borraban: cuando una petición fallaba, la app pintaba la sección vacía.
   Podía fallar porque el servidor estaba dormido, porque saltaba el límite de
   peticiones o porque se caía una conexión. Ahora la app:
   - guarda en el móvil lo último que vio y lo pinta al instante;
   - pregunta al servidor por detrás;
   - si algo falla, sigue mostrando lo guardado con un aviso discreto arriba.
2. **Añade estrellas nuevas:**
   - **Carta diaria**: pergamino, lacre, racha, legajo y aviso por la noche.
   - Constelación **Saber**: *Por leer*, *Por ver*, *Por aprender*, *Lecturas* y *Frases*.
   - **Habilidades** con maestría de verdad: rangos de Novato a Maestro, misiones
     diarias y semanales que propone el Sistema y pruebas para ascender de rango
     (explicado más abajo, en «El nuevo Sistema de Habilidades»).
   - **Widgets** para el iPhone.
3. **Arregla Tareas**: las secciones ya se pliegan y la app recuerda cuáles dejaste abiertas.
4. **Estrena el Mar de estrellas**: cada zona es ahora una constelación con figura
   propia, dibujada como en la imagen de referencia: Cuerpo es el Dragón, Saber el
   Ojo, Hacer la Flecha Alada, Vida las Hojas y Mente la Luna con su pluma. Hilos de
   oro, cuerpos de cristal translúcido, velos de gasa y un cielo azul noche con
   nebulosa. Las secciones, sus nombres y sus relaciones no cambian, y se usa igual:
   arrastrar el mar y tocar una estrella para entrar.

Medido en pruebas, simulando un servidor que tarda 6 s en despertar:

| Situación | Antes | Ahora |
|---|---|---|
| Abrir la app | ~6,5 s | **0,3 s** |
| Servidor caído | pantalla vacía | datos guardados en **0,3 s** y aviso «No se pudo actualizar» |

Sigue las **tandas en orden**. Cada una se comprueba antes de pasar a la
siguiente. Todas se pueden deshacer.

---

## Tanda 0 — Copia y comprobaciones (5 min)

1. Abre tu app → **Ajustes → Tus datos → Exportar todos mis datos**. Guarda
   el archivo `tu-cuaderno-AAAA-MM-DD.json` en tu ordenador. Es tu copia.

   Esta actualización no borra ni reescribe nada. Solo **añade** 10 tablas
   nuevas y 5 columnas nuevas en «habilidades».
2. **Render** → tu servicio `tu-cuaderno-api` → **Settings** → apunta qué
   pone en **Region** (casi seguro *Oregon*). Lo usarás en la Tanda 5.
3. **Render** → **Environment**: apunta los **nombres** de todas las
   variables que tienes (no hace falta copiar los valores ahora).

---

## Tanda 1 — El servidor (backend) (10 min)

1. Descomprime `gym-app-completo.zip`.
2. Abre **GitHub Desktop** con tu repositorio `m-elass/evedgy`. En la carpeta
   del repositorio, haz lo siguiente:
   - Sustituye la carpeta **`backend`** por la del zip.
   - Copia la carpeta **`.github`**. Ojo: empieza por punto y en Windows se ve
     igual que cualquier carpeta.
   - Copia también estos archivos: `supabase-blindaje.sql`, `ACTUALIZAR-2026-10.md`.

   **No toques todavía la carpeta `frontend`.**
3. En GitHub Desktop escribe el resumen `Servidor: velocidad, carta diaria y
   saber`, pulsa **Commit to main** y luego **Push origin**.
4. Render empieza a desplegar solo. Espera a que en **Events** ponga
   **Deploy live** (3–5 min).
5. Comprueba que el servidor responde. Abre en el navegador:
   `https://tu-cuaderno-api.onrender.com/` → debe responder
   `{"status":"ok", …}`.
6. Comprueba que arrancó sin errores. Ve a **Render → Logs**: no debe aparecer
   ningún `Traceback`.
7. Blinda la base de datos:
   - Abre **Supabase → SQL Editor → New query**.
   - Pega **todo** `supabase-blindaje.sql` y pulsa **Run**.
   - Abajo sale una fila con tres cifras:
     - `tablas_sin_rls` = **0**
     - `permisos_publicos` = **0**
     - `tablas_total` = **36**
8. Abre tu app (aún la versión vieja) y guarda una nota de prueba. Debe
   funcionar: el servidor nuevo sigue entendiendo a la app vieja.

**Si algo va mal:** Render → Events → el deploy anterior → **Rollback**.

---

## Tanda 2 — La app (frontend) (10 min)

1. En GitHub Desktop, sustituye la carpeta **`frontend`** por la del zip.
2. Escribe el resumen `App: caché, carta diaria, saber, sistema, widgets`,
   pulsa **Commit to main** y luego **Push origin**.
3. Vercel despliega solo en 1–2 min (**Deployments** → *Ready*).
4. En el iPhone, cierra la app del todo (deslízala hacia arriba) y ábrela.
   Ciérrala y ábrela **otra vez**: la primera apertura descarga la versión
   nueva y la segunda la usa.
5. Comprueba que el móvil usa la versión nueva. Ve a **Ajustes → Acerca de**:
   debe poner `Versión xxxxxxx · servidor tu-cuaderno-api.onrender.com`. Las
   7 letras de la versión son el commit de GitHub.
6. Pruebas rápidas:
   - **Hoy** debe enseñar la tarjeta de la carta, las misiones y los hábitos.
   - **Tareas**: las secciones salen plegadas y se abren al tocarlas.
   - **Habilidades**: arriba, tu Estado; debajo, las Misiones del día y la
     Misión semanal; al final, cada habilidad con su rango y su barra.
   - **Mar de estrellas**: arrastra hasta cada figura (el Dragón, el Ojo, la
     Flecha Alada, las Hojas y la Luna). Toca una estrella: su constelación se
     enciende y entras en la sección, como siempre.
   - **Modo avión**: abre la app y deben verse tus datos, con el aviso «Sin
     conexión» arriba. Intenta marcar un hábito: debe decir que no se pudo,
     **nunca** fingir que se guardó.

**Vuelta atrás:** Vercel → Deployments → el anterior → **⋯ → Instant
Rollback**.

---

## El nuevo Sistema de Habilidades (léelo una vez)

**Los rangos significan maestría real.** Siguen las etapas por las que pasa
cualquiera que aprende algo (Dreyfus) y unas horas de práctica de referencia:

| Rango | Título | Horas de referencia | Niveles |
|---|---|---|---|
| E | Novato | 0 h | 1–10 |
| D | Aprendiz | ≈ 20 h | 11–25 |
| C | Competente | ≈ 100 h | 26–45 |
| B | Hábil | ≈ 400 h | 46–65 |
| A | Experto | ≈ 1.500 h | 66–85 |
| S | Maestro | ≈ 5.000 h | 86–100 |

**Para ascender hay que demostrarlo.** Al llegar al 90 % de un rango se abre
una **prueba de ascenso** (la ventana carmesí) con criterios reales, por
ejemplo «tocas 2 canciones completas a tempo» o «apruebas un examen de
práctica B2». Marcas los que cumples y cuentas tu evidencia. Sin superarla
no subes de rango aunque sigas sumando horas: el nivel se queda sellado y la
experiencia espera en reserva.

**Las misiones las propone el Sistema:**
- **Misiones diarias**: hasta 3 al día, para las habilidades que más lo
  necesitan. Se adaptan a tu rango y a tus minutos al día, y cada una dice
  qué hacer y cuándo está hecha. Puedes cambiar una al día por habilidad.
- **Misión semanal**: un reto mayor por habilidad cada lunes.
- **Ensayos**: mientras tienes una prueba abierta, algunas misiones la ensayan.

Cada habilidad tiene su plan según su tipo: música, idioma, programación,
deporte, dibujo, escritura, estudio, oratoria, ajedrez, cocina u otra. El
Sistema lo detecta por el nombre y lo puedes cambiar en sus ajustes.

**Tus habilidades de antes empiezan en el rango E.** Si ya dominas alguna
(por ejemplo, el inglés), ábrela → **Ajustes** → **Punto de partida**: elige
tu rango y las horas que llevas. Las pruebas hasta ese rango quedan
convalidadas.

**Opcional — planes a medida con IA.** Si en Render tienes la variable
`ANTHROPIC_API_KEY` (la misma de los temas con IA), el Sistema diseña además
un plan de misiones a medida para cada habilidad nueva. Tarda alrededor de
un minuto y mientras tanto verás «El Sistema está diseñando un plan a
medida…». Para las que ya tenías: ábrela → **Diseñar a medida**. Si la IA
falla o se acaba el presupuesto diario, la habilidad sigue con el plan de
su tipo. La variable `AI_MODELO` elige el modelo de IA; ya viene uno puesto,
así que solo la tocas si algún día cambia su nombre.

---

## Tanda 3 — El aviso de la carta cada noche (5 min)

1. **En el iPhone** (abre la app desde su icono de la pantalla de inicio):
   - Ve a **Ajustes → Aviso de la carta diaria**.
   - Elige la hora, por ejemplo 22:00. Mejor entre las 20:00 y las 23:30.
   - Pulsa **Activar en este dispositivo** → **Permitir**.
   - Pulsa **Probar**: en unos segundos llega un aviso.
2. **El reloj que lo dispara** (GitHub hace de despertador, gratis):
   - Ve a **GitHub → tu repositorio → Settings → Secrets and variables →
     Actions → pestaña Variables → New repository variable**.
   - Nombre `API_URL`, valor `https://tu-cuaderno-api.onrender.com`, sin barra
     al final.
3. Comprueba que el reloj funciona:
   - Ve a la pestaña **Actions** y abre *Recordatorio de la carta diaria*.
   - Pulsa **Run workflow** y espera el tic verde.
   - Desde entonces se ejecuta solo cada 15 min por la noche. El aviso solo
     llega si ese día aún no has escrito tu carta, y como mucho una vez.

> Opcional, más seguro: inventa una contraseña larga y ponla en dos sitios:
> - en Render → Environment, como variable `CRON_SECRET`;
> - en GitHub → Secrets → New repository **secret**, también como `CRON_SECRET`.
>
> Así solo tu reloj puede disparar los avisos.

---

## Tanda 4 — Widgets en el iPhone (10 min)

Todo está explicado dentro de la app, en **Ajustes → Widgets del móvil**:

1. Instala **Scriptable**, gratis en la App Store.
2. En la app, pulsa **Crear llave** → **Copiar llave**. Guárdala un momento:
   solo se muestra una vez.
3. Pulsa **Copiar script**. Después:
   - En Scriptable pulsa **+** y pega el script.
   - Ponle de nombre «Tu cuaderno».
   - Pulsa ▶ y pega la llave cuando te la pida.
4. **Pantalla de inicio**: mantén pulsado → **+** → Scriptable → elige
   tamaño → toca el widget → *Script*: «Tu cuaderno».
5. **Pantalla de bloqueo**: mantenla pulsada → **Personalizar** → pantalla
   bloqueada → añade Scriptable → elige «Tu cuaderno».

Qué se ve en cada uno:
- **Pantalla de inicio**: tu frase del día, tus hábitos, tu racha de cartas y
  tus misiones. En el tamaño grande, también las tareas.
- **Pantalla de bloqueo**: la frase o, si lo prefieres, solo cifras. Para eso,
  cambia la línea `FRASE_EN_BLOQUEO = false` en el script.

En la estrella **Frases**, el icono del ojo decide qué frases pueden salir en
el widget.

Si pierdes el móvil, ve a **Ajustes → Widgets → revocar la llave**. Cerrar
sesión no la revoca.

---

## Tanda 5 — Mudar el servidor a Europa (recomendado, 20 min)

Tu base de datos está en Frankfurt y tu servidor, casi seguro, en Oregón
(EE. UU.). Cada consulta cruza el Atlántico dos veces. En Frankfurt, cada
consulta pasa de unos 150 ms a unos pocos ms. Son cifras aproximadas, no
medidas en tu servidor.

La región no se puede cambiar: se crea un servicio nuevo **al lado** del
viejo, y el viejo sigue vivo como punto de retorno.

1. **Render → New → Web Service** → elige `m-elass/evedgy` y rellena:
   - Name: `tu-cuaderno-api-eu`
   - Region: **Frankfurt (EU Central)**
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Instance type: **Free**
2. En **Environment**, copia **exactamente** todas las variables del servicio
   viejo, con sus valores:
   - `PYTHON_VERSION` = `3.12.3`
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_JWT_SECRET`, si la tienes
   - `CORS_ORIGINS`
   - `ANTHROPIC_API_KEY`, si la tienes
   - `CRON_SECRET`, si la pusiste

   Al terminar, el servicio nuevo debe tener **las mismas** variables que el
   viejo.
3. **Create Web Service** → espera a que ponga **Live**. Abre
   `https://tu-cuaderno-api-eu.onrender.com/` → `{"status":"ok", …}`.
4. **Vercel → Settings → Environment Variables**:
   - Cambia `VITE_API_URL` (Production) por la URL nueva.
   - Después ve a **Deployments → ⋯ → Redeploy**.
5. En el iPhone, cierra y abre la app dos veces. En **Ajustes → Acerca de**
   debe poner el servidor nuevo.
6. **GitHub → Settings → Secrets and variables → Actions → Variables**:
   cambia `API_URL` por la URL nueva.
7. Widgets: vuelve a **copiar el script** desde Ajustes y pégalo en Scriptable.
   La dirección del servidor va dentro del script; la llave sigue sirviendo.

**Vuelta atrás (5 min):**
1. Vercel: devuelve `VITE_API_URL` a la URL vieja y pulsa **Redeploy**.
2. GitHub: devuelve `API_URL` a la URL vieja.

El servidor viejo sigue funcionando con la misma base de datos.

**Retirar el viejo:**
- Espera **7 días** sin peticiones de la app en sus Logs.
- Entonces ve a Render → servicio viejo → Settings → **Suspend**. Es reversible.
- **No lo borres** todavía. Si lo borras, otra persona podría quedarse con el
  nombre `tu-cuaderno-api.onrender.com`, y alguna versión vieja de la app
  instalada podría acabar hablando con ese servidor ajeno. Antes de borrarlo,
  consúltalo.

> No conviene mantener los dos servicios despiertos a la vez con un «ping»:
> Render da 750 horas gratis al mes en total, y dos servicios 24 h gastan
> 1.488.

---

## Opcional — que no se duerma nunca

Con la caché, abrir la app ya es instantáneo aunque el servidor esté dormido.
Lo que aún puede tardar es la **primera escritura** tras un rato sin usarla:
unos 30–60 s mientras despierta.

Si te molesta, y **solo cuando el servidor viejo esté suspendido**, puedes
mantenerlo despierto con un aviso periódico. Un servicio despierto 24 h gasta
unas 744 de las 750 horas gratis del mes:

1. Crea una cuenta gratis en **cron-job.org**.
2. Crea un *cronjob* con esta configuración:
   - URL: `https://tu-cuaderno-api-eu.onrender.com/`
   - Frecuencia: cada 10 minutos
   - Método: GET

---

## Si algo falla

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| Arriba: «No se pudo actualizar · datos de hace…» | El servidor no responde. Lo que ves está guardado en el móvil y tus datos están a salvo. | Espera 1 min (puede estar despertando) y toca la cápsula para reintentar. |
| Arriba: «Sin conexión» | El móvil no tiene red. | Nada: al volver la red se pone al día solo. |
| «No llego al servidor» con botón Reintentar | Primera vez en esa sección y sin servidor. | Reintentar en un minuto. |
| El aviso de la carta no llega | Falta el permiso, la variable `API_URL` o la app no está en la pantalla de inicio. | Ajustes → Probar. Si llega la prueba, revisa la Tanda 3.2. Si no, revisa el permiso en Ajustes del iPhone → Notificaciones. |
| Widget: «Abre Scriptable y ejecuta…» | No tiene llave. | Ejecuta el script en Scriptable y pega la llave. |
| Widget con datos viejos | El servidor estaba dormido cuando el widget miró. | Se actualiza solo a los 30 min. El widget guarda lo último que vio. |
| Render: el deploy falla en «Migración» | No pudo añadir una columna. | Render mantiene la versión anterior en marcha. Mira el log y Rollback si hace falta. |
