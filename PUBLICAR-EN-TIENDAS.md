# Publicar "Tu cuaderno" en App Store y Google Play

Tu proyecto **ya es una app nativa**. Dentro del zip hay dos carpetas nuevas,
`frontend/android` y `frontend/ios`, que son proyectos nativos reales: se abren
con Android Studio y con Xcode, se compilan a `.aab` y `.ipa`, y se suben a las
tiendas como cualquier otra aplicación.

La tecnología es **Capacitor**: envuelve tu aplicación web en un contenedor
nativo y le da acceso a las APIs del sistema. No es un atajo raro — es el mismo
camino que siguen muchas apps que hoy están publicadas en ambas tiendas.

---

## Lo que ganas al ser nativa

| | Web (como hasta ahora) | App nativa (ahora) |
|---|---|---|
| Aparece en App Store / Play Store | No | **Sí** |
| Se instala como app normal | Solo "añadir a inicio" | **Sí, desde la tienda** |
| Aviso de descanso con el móvil bloqueado | Imposible | **Sí** (notificación del sistema) |
| Vibración en iPhone | Imposible | **Sí** (háptica nativa) |
| Icono, splash y pantalla completa | Parcial | **Sí** |
| Widgets de pantalla de inicio | Imposible | Posible más adelante* |

*Los widgets exigen escribir una extensión nativa aparte (Swift para iOS,
Kotlin para Android). Ahora que existe el proyecto nativo, ya **se puede**
hacer; antes era imposible. No está incluido todavía.

**Lo importante:** el temporizador ya detecta dónde corre. En la app nativa
programa una notificación local en el sistema operativo, así que **suena a su
hora aunque bloquees el móvil o cierres la app**. En la versión web sigue
funcionando como antes.

---

## Lo que necesitas (y cuesta dinero, aviso por delante)

| Concepto | Coste | Imprescindible |
|---|---|---|
| Cuenta de desarrollador de Apple | **99 $ al año** | Sí, para App Store |
| Cuenta de desarrollador de Google Play | **25 $ pago único** | Sí, para Play Store |
| Un Mac con Xcode | — | Sí, para compilar iOS |
| Android Studio (Windows, Mac o Linux) | Gratis | Sí, para Android |

Si no tienes Mac, existen servicios de compilación en la nube (Codemagic,
Expo EAS, Bitrise) que compilan el iOS por ti desde unos 0-30 $/mes. Es la vía
habitual de quien desarrolla en Windows.

**No puedo hacer esta parte por ti**: las tiendas exigen tus cuentas, tus
certificados de firma y tu identidad. Lo que sí está hecho es todo el trabajo
técnico previo.

---

## ANDROID — de tu ordenador a Google Play

### 1. Preparar
1. Instala **Android Studio** (gratis, developer.android.com/studio).
2. Descomprime el zip y abre una terminal en `frontend`.
3. Ejecuta:
   ```bash
   npm install
   npm run build
   npx cap sync android
   npx cap open android
   ```
   El último comando abre el proyecto en Android Studio.

### 2. Probar en tu móvil
Conecta el móvil por USB con la depuración USB activada y pulsa ▶ **Run**.
La app se instala y arranca. Aquí ya puedes comprobar que el temporizador
suena con la pantalla apagada.

### 3. Firmar y generar el paquete
1. En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. **Create new keystore**: guarda el archivo `.jks` y su contraseña en un
   sitio muy seguro. ⚠️ Si lo pierdes no podrás volver a actualizar tu app
   nunca más; hay que publicarla de cero con otro nombre.
3. Elige **release** y genera. Obtendrás un archivo `.aab`.

### 4. Publicar
1. Crea la cuenta en **play.google.com/console** (25 $ una vez).
2. **Create app** → nombre, idioma, tipo (aplicación), gratuita.
3. Sube el `.aab` en **Production → Create new release**.
4. Rellena la ficha: descripción, capturas (mínimo 2), icono 512×512,
   gráfico de cabecera 1024×500, política de privacidad (obligatoria).
5. Completa el cuestionario de contenido y el **Data Safety** (declara que
   guardas email y datos de entrenamiento, cifrados en tránsito).
6. Envía a revisión. Suele tardar de unas horas a 3 días.

---

## iOS — de tu Mac a la App Store

### 1. Preparar
```bash
npm install
npm run build
npx cap sync ios
npx cap open ios          # abre Xcode
```

### 2. Configurar en Xcode
1. Selecciona el proyecto **App** → pestaña **Signing & Capabilities**.
2. Marca **Automatically manage signing** y elige tu equipo (tu cuenta de
   desarrollador de Apple).
3. Comprueba el **Bundle Identifier**: `app.tucuaderno.evedgy` (ya configurado;
   puedes cambiarlo, pero debe ser único en toda la App Store).
4. En **Capabilities**, añade **Push Notifications** solo si más adelante
   quieres avisos desde el servidor. Las notificaciones locales del
   temporizador **no** lo necesitan.

### 3. Probar en tu iPhone
Conecta el iPhone, selecciónalo arriba y pulsa ▶. La primera vez tendrás que
autorizar tu certificado en el iPhone: Ajustes → General → VPN y gestión de
dispositivos.

### 4. Subir a la App Store
1. En Xcode: **Product → Archive**. Al terminar se abre el Organizer.
2. **Distribute App → App Store Connect → Upload**.
3. En **appstoreconnect.apple.com**: crea la app (nombre, categoría, precio),
   añade capturas de pantalla de los tamaños que pide, descripción y
   **política de privacidad** (obligatoria).
4. Rellena el **App Privacy**: declara que recoges email (para la cuenta) y
   datos de salud/actividad (entrenamientos), y que no los compartes con
   terceros ni los usas para publicidad.
5. Envía a revisión. Suele tardar de 1 a 3 días.

---

## Aviso importante sobre la revisión de Apple

Apple rechaza apps que sean **solo un envoltorio de una web sin aportar nada
propio** (guía 4.2, "Minimum Functionality"). Tu app **no está en ese caso**,
pero conviene que lo dejes evidente en la ficha y en la propia app:

- Usa **notificaciones locales** del sistema (temporizador de descanso).
- Usa **háptica nativa**.
- Funciona con la app instalada, con su icono, splash y pantalla completa.
- Tiene funcionalidad propia y sustancial: registro de entrenamiento, análisis
  anatómico, rangos de fuerza, hábitos, escritura y más.

Consejo práctico: en las notas para el revisor, indica que la app usa
notificaciones locales y explica cómo probarlas (iniciar un descanso en la
sección Entreno y bloquear el móvil). Y añade una **cuenta de prueba** con
datos ya cargados, porque si el revisor abre la app y la ve vacía, es más fácil
que la interprete como una web envuelta.

---

## Cada vez que cambies algo

El flujo de actualización es siempre el mismo:

```bash
npm run build        # compila la web
npx cap sync         # copia la web dentro de android/ e ios/
```

Después, en Android Studio o Xcode, vuelve a generar y subir. Recuerda subir el
número de versión en cada envío (`versionCode`/`versionName` en Android,
`Version`/`Build` en Xcode).

Tu versión web en Vercel sigue existiendo y funcionando en paralelo: comparten
el mismo backend y la misma base de datos, así que una persona puede usar la
web en el ordenador y la app en el móvil con la misma cuenta.

---

## Lo que queda pendiente si quieres seguir

1. **Widgets nativos de verdad** (pantalla de inicio de iOS/Android). Ya es
   posible; requiere código nativo específico.
2. **Iconos y splash a medida** para cada plataforma: se generan con
   `@capacitor/assets` a partir de una imagen de 1024×1024.
3. **Notificaciones desde el servidor** (por ejemplo, recordarte entrenar):
   requiere Firebase Cloud Messaging en Android y APNs en iOS.
