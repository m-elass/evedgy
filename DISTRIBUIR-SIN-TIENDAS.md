# Distribuir tu app sin pagar App Store ni Google Play

Sí se puede, pero **no igual en los dos sistemas**. Te lo digo claro desde el
principio para que no pierdas tiempo:

| | ¿Se puede sin pagar? | Cómo |
|---|---|---|
| **Android** | **Sí, del todo** | Generas un `.apk` y lo publicas en tu propia web. Se descarga e instala como cualquier app: icono, notificaciones con el móvil bloqueado, vibración nativa. |
| **iPhone** | **No** | Apple no permite instalar apps fuera de la App Store sin su programa de 99 $/año. La única vía gratuita es «Añadir a pantalla de inicio» desde Safari. |

Es una decisión de Apple, no una limitación de tu app. Abajo explico las
alternativas que existen para iOS y por qué ninguna sirve de verdad.

---

# ANDROID — la app completa, descargable desde tu web

El resultado: entras en tu web desde el móvil, vas a **Ajustes**, y aparece un
botón **«Descargar la app (.apk)»**. Se instala y ya está.

## Paso 1 — Genera el instalador firmado

En tu ordenador, dentro de la carpeta `frontend`:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

En Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Elige **APK** (no «Android App Bundle»: el `.aab` solo sirve para Play Store,
   no se puede instalar directamente).
3. **Create new…** para crear tu almacén de claves:
   - Ruta: guárdalo donde no lo pierdas (por ejemplo `tu-cuaderno.jks`).
   - Contraseña, alias y datos: apúntalos.
   - ⚠️ **Guarda ese archivo y su contraseña para siempre.** Si los pierdes,
     los usuarios que ya tengan la app no podrán actualizarla: Android
     rechaza actualizaciones firmadas con otra clave y tendrían que
     desinstalar y volver a instalar.
4. Marca **release** y pulsa **Create**.
5. Al terminar, Android Studio te enseña un enlace **locate**. El archivo está
   en:
   ```
   frontend/android/app/release/app-release.apk
   ```

## Paso 2 — Publícalo en tu propia web

1. Renombra el archivo a **`tu-cuaderno.apk`**.
2. Cópialo a la carpeta **`frontend/public/`** de tu proyecto.
3. Súbelo a GitHub (con GitHub Desktop, igual que el resto).
4. Vercel lo desplegará automáticamente. Tu enlace de descarga será:
   ```
   https://TU-APP.vercel.app/tu-cuaderno.apk
   ```

Ya está configurado lo necesario para que funcione: el archivo `vercel.json`
le dice al servidor que ese archivo es un instalador de Android y debe
descargarse, no abrirse.

**La app lo detecta sola**: al entrar en Ajustes desde un Android, comprueba si
el archivo existe y, si está, muestra el botón de descarga. Si aún no lo has
subido, simplemente no aparece nada roto.

## Paso 3 — Instalarlo (lo que verán tus usuarios)

1. Pulsan el botón de descarga.
2. Android avisa: *«Por seguridad, tu teléfono no puede instalar apps
   desconocidas de esta fuente»*. Es lo normal fuera de Play Store.
3. Pulsan **Ajustes** en ese aviso y activan el permiso para su navegador.
4. Vuelven atrás e **Instalar**. Listo: icono en la pantalla de inicio.

> Google Play Protect puede mostrar un aviso adicional la primera vez. Es un
> mensaje informativo, se puede continuar. Desaparece cuando la app tiene
> cierto número de instalaciones o si publicas en Play Store.

## Paso 4 — Actualizar la app

Cada vez que cambies algo:

```bash
npm run build
npx cap sync android
```

Luego, **importante**: sube el número de versión antes de generar el APK
nuevo. En `frontend/android/app/build.gradle`:

```gradle
versionCode 2          // súbelo de uno en uno: 2, 3, 4…
versionName "1.1"      // el que verá el usuario
```

Genera el APK firmado **con el mismo almacén de claves**, reemplaza
`frontend/public/tu-cuaderno.apk` y sube a GitHub. Quien tenga la app la
actualizará descargando de nuevo.

---

# iPHONE — por qué no hay atajo

Estas son todas las vías que existen, y por qué ninguna te sirve:

| Vía | Qué implica | Por qué no vale |
|---|---|---|
| **PWA** (añadir a pantalla de inicio) | Gratis, ya funciona | Es lo que ya tienes. No puede sonar con la pantalla bloqueada. |
| **Ad Hoc** | Programa de Apple, 99 $/año | Cuesta lo mismo que publicar, y además hay que registrar el identificador único de cada iPhone (máximo 100). |
| **AltStore / Sideloadly** | Cuenta gratuita de Apple | La app **caduca a los 7 días** y hay que reinstalarla con el ordenador conectado. Inviable. |
| **TestFlight** | Programa de Apple, 99 $/año | Pensado para pruebas: la versión caduca a los 90 días. |
| **Apple Developer Enterprise** | 299 $/año | Solo para empleados de tu propia empresa. Apple retira la licencia si se usa para distribuir al público. |

**Conclusión honesta:** en iPhone, o pagas los 99 $/año, o te quedas con la
PWA. Si tu caso principal eres tú y tu propio iPhone, la PWA con Wake Lock
cubre bastante: el temporizador funciona mientras la pantalla no se apague.

---

# ¿Y si en el futuro quieres las tiendas?

No pierdes nada de lo hecho. El mismo proyecto nativo que usas para el APK es
el que se sube a Google Play (cambiando `APK` por `Android App Bundle`) y a la
App Store. Está explicado en `PUBLICAR-EN-TIENDAS.md`.

Un camino razonable: empieza con el APK gratis en tu web, y si un día la usa
más gente, pagas los 25 $ de Google Play (pago único) para que la instalación
sea de un toque y sin avisos. Los 99 $ de Apple solo cuando compense.
