# Actualización de octubre — velocidad, carta diaria, Saber, Sistema, widgets y plan del día

Esta versión hace ocho cosas:

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
   arrastrar el mar y tocar una estrella para entrar. Ahora se arrastra fluido,
   sin tirones.
5. **Viste por dentro cada estrella** con un sistema ornamental de agua, cristal
   y luz:
   - Cada constelación tiene su glifo, su color y una gran reliquia de fondo,
     muy tenue.
   - Las secciones principales (Hoy, Entreno, Hábitos, Lecturas, Destellos y
     Objetivos) llevan además un sello astral.
   - Al entrar en una sección, el agua «dibuja» su glifo una sola vez. Si
     vienes del Mar, atraviesas la estrella que tocaste.
   - Los botones principales responden con ondas de agua, y al completar un
     hábito, una tarea o un objetivo nace una estrella líquida.
   - La app funciona exactamente igual. Además, **Tareas → Gestionar secciones**
     vuelve a abrirse: antes salía «Algo se ha torcido aquí».
6. **Tareas en Hoy y widget de Frases:**
   - En **Tareas → Gestionar secciones**, cada sección tiene un botón
     **☀ En Hoy**. Sus tareas pendientes salen también en Hoy, debajo de los
     hábitos, y se marcan desde allí.
   - Nuevo **widget de Frases** (Ajustes → Widgets del móvil → Widget de
     Frases), para la pantalla de bloqueo o la de inicio:
     - enseña solo tus frases, en grande;
     - puede ir cambiando a lo largo del día;
     - puede avisarte cada mañana con la frase del día.
7. **Hábitos en cuatro tipos y «Tu plan de hoy», decidido por Claude:**
   - **Hábitos** separa ahora cuatro tipos:
     - **hábitos**, con sus minutos;
     - **objetivos del día**, bloques largos como estudiar 90 min;
     - **métricas**, con botones rápidos y barra (agua, proteína, pasos, sueño);
     - **principios**, como «primero lo importante», que no se marcan: por la noche, «¿lo viviste?».
   - Cada uno lleva sus minutos, cuántas veces a la semana (o qué días fijos) y su prioridad.
   - Pones el **tiempo que tienes cada día de la semana** y lo que quieres conseguir.
   - **Hoy** enseña solo lo que toca ese día, en orden y con su razón, sin
     pasarse de tu tiempo. Lo que no cabe queda en «Si te da tiempo».
   - Lo decide **Claude cada mañana, con tu suscripción**, desde GitHub Actions.
     Si no lo conectas, o un día falla, lo decide el plan automático.
   - El «Diseñar a medida» de las misiones de Habilidades también pasa a
     hacerlo Claude con tu suscripción.
   - Una configuración ya preparada se aplica en un paso: **Tanda 6**.
8. **Privacidad, con el repositorio público:**
   - El repositorio no lleva ningún dato tuyo: los ejemplos del código son
     genéricos.
   - El `.gitignore` ya bloquea de verdad tus claves (`.env`) y tus
     exportaciones. Antes, el de `backend` tenía un fallo y no lo hacía.
   - La app puede ser **solo para ti**: aunque alguien se registre, el
     servidor no le deja usar nada (**Tanda 7**).

> **Si ya habías hecho todas las tandas** antes de esta entrega, haz la
> **Tanda 7**. Sustituye la subida anterior y explica cómo. Después, la
> **Tanda 6**, si aún no la hiciste.
> El servidor solo **añade**:
> - 3 tablas (el tiempo de cada día, el plan del día y las llaves del planificador);
> - 10 columnas en los hábitos;
> - 1 columna en sus registros diarios.
>
> No borra nada: tus hábitos y tus rachas siguen igual.

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

   Esta actualización no borra ni reescribe nada. Solo **añade**:
   - 13 tablas nuevas;
   - 5 columnas nuevas en «habilidades»;
   - 1 columna en las secciones de tareas;
   - 11 columnas en los hábitos y sus registros.
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
     - `tablas_total` = **39**
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
   - **Hoy** debe enseñar la tarjeta de la carta, las misiones y **Tu plan de
     hoy** (con la etiqueta «Automático» hasta que hagas la Tanda 6).
   - **Hábitos**: arriba, «Tu tiempo cada día»; debajo, tus hábitos. De
     momento todos son del tipo «hábito», cada día. La Tanda 6 los ordena.
   - **Tareas**: las secciones salen plegadas y se abren al tocarlas.
   - **Habilidades**: arriba, tu Estado; debajo, las Misiones del día y la
     Misión semanal; al final, cada habilidad con su rango y su barra.
   - **Mar de estrellas**: arrastra hasta cada figura (el Dragón, el Ojo, la
     Flecha Alada, las Hojas y la Luna). Debe moverse suave, sin tirones. Toca
     una estrella: su constelación se enciende y entras en la sección, como
     siempre, atravesando la estrella.
   - **Dentro de una sección**: junto al título se dibuja una vez su glifo con
     una línea de agua. En Hoy aparece el sello con alas, y la frase del día va
     enmarcada.
   - **Marca un hábito**: nace una estrella líquida. Desmárcalo y todo queda
     como estaba.
   - **Tareas → Gestionar secciones**: se abre el panel de secciones. Pulsa
     **☀ En Hoy** en una sección y vuelve a Hoy: sus tareas pendientes salen
     debajo de tu plan. Vuelve a pulsarlo para quitarla.
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

**Widget de Frases (solo tus frases, en grande).** Está en **Ajustes → Widgets
del móvil → Widget de Frases**:

1. Elige si la frase cambia o es una al día, y si quieres el aviso de la
   mañana y a qué hora.
2. Pulsa **Copiar script de Frases**. En Scriptable, pulsa **+**, pégalo, ponle
   de nombre «Frases» y pulsa ▶. Usa la misma llave que el otro widget, así
   que no te la volverá a pedir.
3. **Pantalla de bloqueo**: Personalizar → pantalla bloqueada → añade
   Scriptable (el **rectangular** es el mejor para frases) → tócalo →
   *Script*: «Frases». En la pantalla de bloqueo busca una frase que quepa.
4. **Pantalla de inicio**: igual que el otro widget, eligiendo «Frases».
   - Pequeño: frases cortas.
   - Mediano y grande: la frase en grande, con su autor.
5. El aviso de la mañana lo manda Scriptable: la primera vez, acepta sus
   notificaciones.

Si quieres cambiar algo (cada cuánto cambia la frase o la hora del aviso),
vuelve a copiar el script y pégalo encima del anterior en Scriptable.

Las frases del modo «cambia cada… horas» empiezan cada día a las 6:00 con la
frase del día. También funcionan sin conexión, con las últimas que el widget
vio.

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

## Tanda 6 — Tus hábitos en 4 tipos y Claude planificando tu día (15 min)

### 6.1 Aplica tu configuración (2 min)

Si te preparé un archivo de configuración con tus hábitos (por ejemplo
`mi-configuracion-habitos.json`), guárdalo **fuera del repositorio**: lleva
datos tuyos y este repositorio puede ser público. Este documento no repite su
contenido por la misma razón. Es una propuesta: cámbiala a tu gusto antes o
después de aplicarla.

1. Abre la app. Es más cómodo en el ordenador, en la dirección de Vercel.
2. Ve a **Hábitos → Pegar configuración → Elegir archivo** y elige
   `mi-configuracion-habitos.json`. También puedes abrir el archivo, copiar todo
   su texto y pegarlo en el recuadro.
3. Revisa la lista que aparece:
   - Comprueba que se actualizan los que esperas.
   - Solo cambia los hábitos cuyo nombre coincide.
   - No borra ningún registro.
4. Pulsa **Aplicar**.
5. En **Hábitos → Tu tiempo cada día → Cambiar**:
   - Ajusta las horas de cada día a tu vida real (clases, trabajo…).
   - Repasa el texto de «lo que quieres conseguir».
6. Toca el lápiz de cada **principio** y escribe en una línea qué significa
   para ti. Claude lo lee y en Hoy sale debajo del título.

Para cambiar cualquier cosa después, toca el lápiz de cada hábito. Desde ahí
puedes cambiar el tipo, los minutos, la frecuencia y la prioridad, pausarlo o
borrarlo.

### 6.2 Conecta a Claude con tu suscripción (10 min, una sola vez)

Los pasos están también dentro de la app, en **Ajustes → Claude planifica tu
día**, con botones para copiar cada cosa.

1. **En el ordenador**, instala Claude Code:
   - En Windows, abre **PowerShell** y pega
     `irm https://claude.ai/install.ps1 | iex`.
   - En Mac, abre Terminal y pega `curl -fsSL https://claude.ai/install.sh | bash`.
2. Cierra la ventana, ábrela otra vez y escribe `claude setup-token`.
   - Se abre el navegador: entra con tu cuenta de Claude.
   - Al terminar, la ventana te enseña un **token** largo. Cópialo: solo sale
     esa vez y dura un año.
3. **GitHub** → tu repositorio → **Settings → Secrets and
   variables → Actions → New repository secret**:
   - Nombre: `CLAUDE_CODE_OAUTH_TOKEN`
   - Valor: el token.
4. **En la app**: ve a **Ajustes → Claude planifica tu día → Crear llave → Copiar
   llave**. En GitHub crea otro secreto:
   - Nombre: `PLANNER_KEY`
   - Valor: la llave, que empieza por `tcp_`.
5. La variable `API_URL` ya la tienes de la Tanda 3.
6. **Pruébalo:**
   - Ve a **GitHub → Actions → «Plan del día con Claude» → Run workflow**.
   - Marca «Rehacer el plan de hoy» y pulsa el botón verde.
   - En 2–4 minutos sale el tic verde. Abre **Hoy**: verás **✦ Claude**, su
     nota con el foco del día y la razón de cada hábito.

Desde entonces funciona solo:

- **Cada mañana** a las 7:05 (6:05 en invierno), Claude decide el plan del día.
- **Cada 2 horas de día**, mira si hay algún plan de misiones en cola. Si no
  hay nada que hacer, termina en segundos sin gastar nada.

Qué conviene saber:

- **Gasta tu plan de Claude, no dinero aparte.** Un plan del día usa poco
  (con Sonnet, que es el que va por defecto). Para usar Opus, crea en GitHub
  la **variable** `PLANNER_MODEL` con el valor `opus`. Gasta más de tu plan.
- **Si un día falla** (límite de uso, servidor dormido…), Hoy usa el plan
  automático. Nunca queda vacío.
- **Nunca se pasa de tu tiempo.** El servidor comprueba el plan de Claude:
  - Si se pasa, lo que sobra va a «Si te da tiempo».
  - Si olvida algo imprescindible y diario, lo pone igualmente.
- **Privacidad:**
  - Claude recibe tus hábitos y lo que llevas de semana, tu tiempo, lo que
    quieres conseguir, tus objetivos, valores, habilidades, sueño y entrenos.
  - Nunca recibe tus cartas, escritos, notas, frases ni amigos.
  - Se ejecuta sin herramientas: solo puede responder.
  - Los registros de GitHub no muestran tus datos, aunque el repositorio
    fuera público.
- **Planes de misiones a medida:**
  - En Habilidades, **Diseñar a medida** pone el plan **en cola**. Claude lo
    hace en su siguiente ronda, como mucho en 2 horas. Para no esperar,
    **Run workflow** en GitHub.
  - Mientras tanto, sigues con el plan de su tipo.
- **Para desconectarlo**, ve a **Ajustes → Claude planifica tu día →** papelera
  de la llave. Desde el día siguiente, Hoy vuelve al plan automático. Para
  quitar ya el plan de hoy, usa «Descartar el plan de Claude de hoy». **Para
  cambiar el token**, repite el paso 2 y sustituye el secreto en GitHub.

### 6.3 Cómo se usa

- Por la mañana, **Hoy** te enseña:
  - la nota de Claude;
  - el principio del día;
  - lo que toca, en orden: lo marcas al hacerlo;
  - las **métricas**: el botón **+** suma lo de siempre (un vaso, 20 g de
    proteína…). Toca la cifra para escribirla.
- **Si te da tiempo**: lo que no cabe hoy. **Otros hábitos**: los que no tocan
  hoy, por si haces alguno.
- **Por la noche**, la tarjeta del principio pregunta **«¿Lo viviste hoy?»**:
  sí, a medias o no. No hay racha: es solo para mirarte con honestidad.
- Los hábitos de «N veces por semana» enseñan «2/4 semana», y su racha cuenta
  semanas cumplidas, no días.

---

## Tanda 7 — Privacidad: repositorio público y app solo para ti (15 min)

Ya está bien, no hay que tocar nada de esto:

- **Ninguna clave tuya ha estado nunca en el repositorio.** Revisado todo el
  historial: no hay `.env`, contraseñas, tokens ni exportaciones de datos.
- **El token de tu suscripción de Claude y la llave del planificador** son
  *secretos* de GitHub:
  - No se ven en el repositorio ni en los registros.
  - No pasan a las copias (*forks*) que otros hagan.
  - Los flujos solo se lanzan por horario o desde tu cuenta, nunca por un
    *pull request* ajeno.
- **Los registros de GitHub Actions**, que en un repositorio público ve
  cualquiera, solo muestran si cada paso salió bien o mal.
- **La clave «anon» de Supabase** viaja en la web: es pública por diseño. Las
  tablas están cerradas a ella con RLS (Tanda 1, paso 7).
- **Cada cuenta solo ve sus datos.** Con tu suscripción de Claude solo se
  planifica tu cuenta: la llave del planificador es tuya y vive solo en tu
  GitHub.

### 7.1 Que tu correo no salga en los commits (2 min)

Cada commit lleva el correo del autor, y cualquiera puede verlo.

1. Ve a **GitHub → tu foto → Settings → Emails**:
   - Marca **Keep my email addresses private**.
   - Marca también **Block command line pushes that expose my email**.
   - Copia la dirección que aparece, del tipo `12345678+usuario@users.noreply.github.com`.
2. En **GitHub Desktop → File → Options → Git**, en **Email**, elige esa
   dirección y pulsa **Save**.

Los commits que ya están subidos conservan el correo de antes. Cambiarlo
obliga a reescribir todo el historial; si quieres hacerlo, pídelo aparte.

### 7.2 Sube esta versión sustituyendo la subida anterior (5 min)

La subida anterior llevaba, en esta guía y en los ejemplos del código, datos
de tus hábitos. Lo mejor es **sustituir ese commit**, no añadir otro encima:
así no se quedan en el historial.

1. Descomprime el zip y copia en tu repositorio, sustituyendo lo que haya:
   - las carpetas `backend`, `frontend` y `.github`;
   - los archivos `.gitignore` (nuevo, empieza por punto), `ACTUALIZAR-2026-10.md`,
     `README.md` y `render.yaml`.
2. En **GitHub Desktop → History**, haz clic derecho en el último commit
   («IA para planificación añadida») → **Amend commit**.
   - Sale el aviso «Amend Will Require Force Push», porque el commit ya está
     subido: pulsa **Begin Amend**.
   - En **Changes** pulsa **Amend last commit**.
3. Arriba aparece **Force push origin**: púlsalo y confirma.
4. Render y Vercel vuelven a desplegar solos con la versión limpia.

> Si GitHub Desktop no te ofrece «Amend commit», haz un commit normal
> («Privacidad») y **Push origin**. La versión actual queda limpia, pero la
> anterior seguiría visible en el historial.
>
> Tras forzar la subida, el commit viejo puede seguir abriéndose un tiempo si
> alguien tiene su enlace exacto. GitHub lo borra del todo si se lo pides con
> su formulario de datos sensibles (*Remove sensitive data*).

### 7.3 La app, solo para ti (5 min)

Hoy cualquiera que encuentre la web puede pulsar «Crear cuenta» y usar tu
servidor y la IA del servidor (`ANTHROPIC_API_KEY`), si la tienes.

1. **Render** → tu servicio → **Environment** → **Add Environment Variable**:
   - Nombre: `USUARIOS_PERMITIDOS`
   - Valor: el correo con el que entras en la app. Si quieres dar acceso a
     alguien más, añade su correo separado por una coma.
   - Pulsa **Save**. Render vuelve a desplegar.

   Desde entonces, cualquier otra cuenta ve «Esta app es privada» y no puede
   leer, guardar ni gastar nada.
2. **Supabase** → **Authentication** → **Sign In / Providers** (en algunos
   paneles está en los ajustes de Authentication) → desactiva **Allow new
   users to sign up** → **Save**. Así ya nadie puede crear cuentas
   nuevas.
3. Ve a **Supabase → Authentication → Users**. Si ves alguna cuenta que no es
   tuya, bórrala.
4. Comprueba que todo sigue bien:
   - Abre la app con tu cuenta: debe funcionar igual.
   - En otra ventana privada, intenta «Crear cuenta»: Supabase debe decir que
     el registro está cerrado.

### 7.4 Que GitHub vigile por ti (1 min)

Ve a **GitHub → tu repositorio → Settings → Advanced Security** (en algunas
cuentas se llama **Code security**) y activa:

- **Secret Protection**;
- **Push protection**.

Si algún día se cuela una clave en un commit, GitHub la bloquea antes de
subirla o te avisa.

### 7.5 Regla de oro

Tus archivos personales nunca van dentro de la carpeta del repositorio:

- las exportaciones `tu-cuaderno-….json`;
- `mi-configuracion-habitos.json`;
- cualquier `.env`.

El `.gitignore` ya los bloquea, pero guárdalos en otra carpeta igualmente.

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
| Hoy sigue diciendo «Automático» | Claude aún no ha hecho el plan de hoy, o falló. | **GitHub → Actions → Plan del día con Claude**: abre la última ejecución. Si está en rojo, el mensaje dice qué falta (el token, la llave o `API_URL`). Si dice «Nada que planificar», pulsa Run workflow con «Rehacer». |
| Actions: «Claude no acepta el token» | El token caducó o se copió mal. | Repite `claude setup-token` y cambia el secreto `CLAUDE_CODE_OAUTH_TOKEN`. |
| Actions: «La API no acepta la llave del planificador» | La llave se revocó o caducó (dura un año). | Ajustes → Claude planifica tu día → Crear llave, y cambia el secreto `PLANNER_KEY`. |
| La app dice «Esta app es privada» al entrar con tu cuenta | El correo de `USUARIOS_PERMITIDOS` no es el de tu cuenta. | Render → Environment: corrígelo. Debe ser el mismo con el que entras en la app. |
| «Pegar configuración» dice «no coinciden» | Ese hábito tiene otro nombre en tu app. | Se salta sin tocar nada. Cámbialo a mano con su lápiz. |
