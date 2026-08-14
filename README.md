# Tránsito Canelones — Gestión de Infracciones

Aplicación web/PWA para digitalizar la emisión y el seguimiento de boletas de
infracciones de tránsito de la Intendencia de Canelones. Este repositorio
contiene las **Fases 1 a 5** del plan de trabajo, es decir el plan completo:
esqueleto con identidad institucional y roles (Fase 1), el formulario de
boleta del inspector con cámara/GPS/firma y guardado offline (Fase 2), el
panel de escritorio con listado de multas, filtros, ficha de detalle y
gestión de usuarios (Fase 3), el mapa en tiempo real (Fase 4), y marca de
agua en fotos + boleta imprimible/PDF + auditoría (Fase 5).

> Corre **100% gratis, sin cargar tarjeta**: por decisión explícita, el
> proyecto usa solo el plan Spark (gratuito) de Firebase. La pieza de
> Custom Claims/Cloud Functions que endurecería la seguridad del login
> quedó escrita y documentada, pero **no está activada**, porque eso
> requiere el plan Blaze (pago por uso) de Firebase, que pide tarjeta aunque
> el uso real termine costando $0 — ver la sección "Seguridad..." más abajo.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4.
- **Backend:** Firebase — Authentication, Firestore y Storage, todo en el
  plan gratuito Spark; sin servidor propio, para poder desplegar 100% en
  GitHub Pages.
- **Mapas:** Leaflet + react-leaflet.
- **Ruteo:** `react-router-dom` con `HashRouter` (no necesita configurar
  rewrites en GitHub Pages).

## Por qué Firebase y no un backend propio

Los tres documentos de referencia de este proyecto pedían cosas distintas:
uno un backend Node/Express, otro NestJS + PostgreSQL, y un tercero Firebase.
Los dos primeros son incompatibles con el requisito, presente en los tres
documentos, de desplegar en GitHub Pages (que solo sirve archivos estáticos).
Firebase resuelve esto: da autenticación, base de datos y almacenamiento de
archivos sin necesidad de un servidor propio.

## Puesta en marcha local

```bash
npm install
cp .env.example .env   # completar con los datos de tu proyecto Firebase
npm run dev
```

Si `.env` queda vacío, la app arranca en **modo demo**: se puede navegar y
loguear con la cédula admin de referencia (`41.369.542`), pero no hay datos
reales ni persistencia en la nube. Esto es intencional, para poder revisar el
esqueleto sin depender de tener ya un proyecto Firebase creado.

### Crear el proyecto Firebase

1. [Firebase Console](https://console.firebase.google.com) → Crear proyecto.
2. Activar **Authentication** → método "Anónimo" (se usa como transporte
   interno; el control de acceso real es la cédula — ver limitación de
   seguridad más abajo).
3. Activar **Firestore Database** (modo producción) y **Storage**.
4. Configuración del proyecto → Tus apps → Agregar app web → copiar el config
   a `.env` (ver `.env.example`).
5. Cargar los datos iniciales:
   ```bash
   npm install --save-dev firebase-admin
   # Descargar la clave de cuenta de servicio (Configuración del proyecto >
   # Cuentas de servicio > Generar nueva clave privada) y guardarla como
   # scripts/seed/serviceAccountKey.json (no se sube al repo)
   node scripts/seed/seed.js
   ```
   Esto carga el catálogo de infracciones (verificado contra
   `manual_infracciones_transito_canelones.pdf`, 19 códigos) y el usuario
   administrador inicial (cédula `41369542`).
6. Desplegar las reglas de seguridad (esto sí es gratis, no requiere plan
   Blaze ni tarjeta):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # elegir el proyecto recién creado
   firebase deploy --only firestore:rules,storage:rules
   ```

> **¿Y las Cloud Functions de `functions/`?** No hace falta desplegarlas
> para que la app funcione — quedaron armadas como una mejora de seguridad
> opcional para más adelante (Custom Claims), pero requieren pasar el
> proyecto al plan Blaze de Firebase, que pide cargar una tarjeta. Por
> decisión explícita, este prototipo no las usa: el login de
> `AuthContext.jsx` verifica la cédula leyendo `/usuarios` directamente,
> sin ese paso adicional. Ver la sección "Seguridad..." más abajo si en
> algún momento quieren activarlas.

## Desplegar en GitHub Pages

Pasos comunes a los dos métodos de abajo:

1. **En `vite.config.js`, `REPO_NAME` tiene que ser EXACTAMENTE el nombre del
   repositorio en GitHub** (por ejemplo, si el repo es
   `github.com/tu-org/canelones-transito`, `REPO_NAME = 'canelones-transito'`
   — así viene puesto por defecto, cambialo solo si tu repo se llama
   distinto). Si el sitio va a vivir en la raíz de un dominio propio en vez
   de `usuario.github.io/repo`, poné `'/'`.

   > ⚠️ **Causa más común de "la app no abre" / pantalla en blanco:** que
   > `REPO_NAME` no coincida con el nombre real del repositorio. Vite arma
   > las rutas de los archivos compilados (JS, CSS, el logo) usando ese
   > nombre; si no coincide con la URL donde GitHub Pages sirve el sitio,
   > esos archivos se piden en una ruta que no existe, GitHub Pages responde
   > 404, y la página queda en blanco aunque el despliegue en sí no haya
   > marcado ningún error. Se verifica fácil: abrí las herramientas de
   > desarrollador del navegador (F12) → pestaña **Network**, recargá la
   > página, y si ves varios 404 para archivos `.js`/`.css`, es esto. La
   > solución es corregir `REPO_NAME` para que coincida con el nombre exacto
   > del repositorio y volver a desplegar.
2. Crear el repositorio en GitHub y subir el código:
   ```bash
   git init
   git add .
   git commit -m "Fases 1-5: esqueleto, boleta, panel, mapa y seguridad"
   git branch -M main
   git remote add origin https://github.com/TU-ORGANIZACION/canelones-transito.git
   git push -u origin main
   ```
   `.env` y las credenciales de Firebase quedan afuera automáticamente por
   el `.gitignore` — no se suben nunca.

Después, elegí **uno** de estos dos métodos:

### Método A — Automático con GitHub Actions (recomendado)

Ya viene armado en `.github/workflows/deploy.yml`: cada `git push` a `main`
compila la app y la publica sola.

1. En GitHub → **Settings → Secrets and variables → Actions → New repository
   secret**, cargar estos 6 secretos con los valores de tu proyecto Firebase
   (los mismos de tu `.env` local):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
2. En GitHub → **Settings → Pages → Build and deployment → Source**, elegir
   **GitHub Actions** (no "Deploy from a branch").
3. Hacer `git push` a `main`. En la pestaña **Actions** del repo se ve el
   progreso; cuando termina, el sitio queda publicado en
   `https://TU-ORGANIZACION.github.io/canelones-transito/`.
4. De ahí en adelante, cada push a `main` vuelve a desplegar solo.

> **Nota:** este workflow solo compila y publica el frontend estático en
> GitHub Pages. Las reglas de Firestore/Storage se despliegan aparte, a
> mano, con `firebase deploy --only firestore:rules,storage:rules` desde tu
> máquina (paso 6 de "Crear el proyecto Firebase" más arriba) — no forman
> parte de este pipeline. (Las Cloud Functions de `functions/` no se
> despliegan porque no están en uso — ver la sección "Seguridad..." más
> abajo.)

### Método B — Manual desde tu máquina

Más simple de entender, pero hay que repetirlo a mano cada vez que cambia algo:

```bash
cp .env.example .env   # completar con los datos de tu proyecto Firebase
npm run deploy
```

Este comando compila (`vite build`, tomando las variables de tu `.env`
local) y publica `dist/` en la rama `gh-pages` vía el paquete `gh-pages`. Con
este método, en GitHub → Settings → Pages → Source hay que elegir **Deploy
from a branch** y apuntar a la rama `gh-pages`.

### Cuál elegir

El Método A es mejor si el equipo va a seguir tocando el código: nadie tiene
que acordarse de correr `npm run deploy`, y las credenciales de Firebase
viven como secretos de GitHub en vez de en la máquina de cada persona. El
Método B alcanza para probar rápido o para un despliegue puntual sin tocar
la configuración del repositorio.

## Estructura del proyecto

```
src/
  lib/          firebase.js (config + init), cedula.js (validación INE),
                 idb.js (IndexedDB: borrador + cola), media.js (UUID, compresión
                 y marca de agua de fotos), sync.js (subida a Storage + doc en
                 Firestore + evento de auditoría), multas.js (listar/filtrar/
                 actualizar estado + auditoría), usuarios.js (alta/edición/baja
                 de funcionarios + auditoría), auditoria.js (registrar/listar
                 eventos), tracking.js (ubicación en vivo del inspector),
                 useToast.js
  data/         infracciones.js — catálogo bundleado en la app (funciona offline
                 desde la primera carga, no depende de una consulta a Firestore);
                 multasDemo.js, usuarios (dentro de lib/usuarios.js) — datos de
                 ejemplo cuando Firebase no está configurado, solo para
                 previsualizar el panel, no persisten nada
  context/      AuthContext.jsx (login por cédula contra /usuarios, sesión)
  components/   Header.jsx, ProtectedRoute.jsx, Toast.jsx,
                 InfraccionPicker.jsx, CameraCapture.jsx (fotos con marca de
                 agua), GeoCapture.jsx, SignaturePad.jsx
  components/backoffice/  FiltrosMultas.jsx, MultasTable.jsx, MultaDetalle.jsx
                 (incluye el botón de boleta imprimible), LeafletMap.jsx (mapa
                 con inspectores en vivo + multas)
  pages/
    LoginScreen.jsx
    inspector/
      InspectorHome.jsx   lista de boletas + sincronizar + toggle de ubicación
      TicketForm.jsx      formulario de boleta en 4 pasos (Fase 2)
    backoffice/
      Dashboard.jsx    métricas + listado con filtros + ficha de detalle (Fase 3)
      Usuarios.jsx     alta/edición/baja de funcionarios, solo Administrador (Fase 3)
      MapaEnVivo.jsx   mapa en tiempo real (Fase 4)
      Boleta.jsx       boleta imprimible / exportable a PDF vía window.print() (Fase 5)
      Auditoria.jsx    historial de eventos, solo Administrador (Fase 5)
functions/       Cloud Functions con Custom Claims (login, gestionarUsuario,
                  cambiarActivoUsuario) — escritas y listas, pero NO
                  desplegadas ni en uso: requieren plan Blaze (ver más abajo)
scripts/seed/    catálogo de infracciones + usuario admin + script de carga
firestore.rules  storage.rules      reglas de seguridad (multas, usuarios,
                                     ubicaciones y auditoría) para sesiones
                                     autenticadas, sin Custom Claims
```

## Módulo del inspector (Fase 2)

El botón "+ Nueva infracción" abre un formulario de 4 pasos, pensado para
completarse con el dedo y con poca o ninguna señal:

1. **Vehículo y evidencia** — matrícula, tipo/marca/modelo/color, fotos
   (comprimidas automáticamente a JPEG ~1600px, igual que en la otra app del
   organismo) y un video corto opcional.
2. **Infracción e infractor** — buscador del catálogo (código, descripción,
   gravedad) y datos de la persona infractora si corresponde.
3. **Ubicación** — GPS automático con alerta si la precisión es mala
   (> 50m), corrección manual de lat/lon, mini-mapa, y observaciones.
4. **Firma y guardar** — resumen de todo lo cargado, firma táctil, y el
   botón que guarda la boleta.

Guardar siempre escribe primero en IndexedDB (funciona sin conexión). Si hay
señal y Firebase está configurado, además intenta sincronizar al toque; si
no, la boleta queda "Pendiente" en la lista del panel del inspector y se
puede reintentar con el botón "Sincronizar" — mismo patrón ya probado en la
otra app de relevamiento del organismo. El formulario también autoguarda un
borrador mientras se completa, por si se cierra la app a mitad de una boleta.

**Probado de punta a punta** con un navegador headless (geolocalización
simulada, carga de una foto de prueba, firma dibujada a mano) antes de
entregarlo — la boleta quedó guardada correctamente en la cola local.

## Panel de escritorio (Fase 3)

Para Administrativo, Supervisor y Administrador. Muestra métricas simples
(multas de hoy/del mes/totales, equipos con multas), un listado filtrable
por fecha, inspector, equipo, código de infracción y estado administrativo,
y al hacer clic en una fila, la ficha completa (infracción, vehículo,
infractor, ubicación, fotos, video, firma).

El estado administrativo de cada multa (**En proceso / Pagada / Impugnada /
Anulada**) se puede cambiar desde la ficha — Administrativo y Administrador
pueden editarlo, Supervisor solo lo ve (así lo pide la especificación: "no
puede modificar multas de otros"). El Administrador además tiene una sección
de **Gestión de usuarios** (`/panel/usuarios`) para dar de alta, editar y dar
de baja funcionarios.

Las multas se traen todas de una vez y se filtran del lado del cliente — más
simple de mantener mientras el volumen sea el de un piloto. Si el organismo
crece a miles de boletas, conviene pasar a paginado + índices en Firestore.

Sin Firebase configurado, tanto el listado de multas como el de usuarios
muestran **datos de ejemplo** (con un aviso visible) para poder previsualizar
el panel completo sin depender de tener ya un proyecto real — no se guarda
nada real en ese modo.

**Probado de punta a punta**: filtros, apertura de ficha, cambio de estado
(y el aviso correcto cuando Firebase no está configurado), y que Supervisor
no vea ni la opción de editar el estado ni el enlace a gestión de usuarios.

## Mapa en tiempo real (Fase 4)

En `/panel/mapa`, accesible desde el botón "Ver mapa →" del dashboard. Usa
Leaflet con capa de OpenStreetMap y muestra dos capas de marcadores:
inspectores activos en territorio (verde) y multas georreferenciadas (rojo),
con los mismos filtros de fecha/inspector/equipo/código/estado del listado.
Al hacer clic en un marcador de multa se abre la misma ficha de detalle de
la Fase 3, con opción de cambiar el estado administrativo ahí mismo.

**Cómo llega la ubicación del inspector al mapa:** en el panel del inspector
hay un interruptor "Compartir mi ubicación", apagado por defecto. Al
activarlo, el dispositivo envía sus coordenadas a Firestore cada ~45
segundos mientras dure la sesión (se apaga solo con el interruptor o al
cerrar la pestaña). El panel de seguimiento considera "activo" a un
inspector si su última actualización tiene menos de 5 minutos.

Que sea **opt-in** (el inspector lo prende a mano) en vez de rastreo
automático en segundo plano es una decisión de diseño para reducir el
problema de privacidad laboral que implica trackear la ubicación de
funcionarios — pero es una mitigación, no una resolución completa. Si el
organismo necesita que el seguimiento sea obligatorio durante el turno (o,
al revés, decide que ofrecerlo así no corresponde), es una decisión de
política que hay que validar con la Intendencia antes de salir a producción,
no algo que se resuelve solo con código.

Sin Firebase configurado, el mapa muestra inspectores y multas de ejemplo
(mismo criterio que en el resto del panel) para poder previsualizarlo.

**Probado de punta a punta**: carga del mapa con ambas capas de marcadores,
apertura del popup y de la ficha completa desde un marcador de multa, y el
interruptor de ubicación del inspector (con el aviso correcto en modo demo).

## Roles

| Rol | Acceso |
|---|---|
| Inspector | Móvil — generación de boletas (Fase 2) + compartir ubicación (Fase 4, opt-in) |
| Administrativo | Escritorio — listado, filtros, cambio de estado de multas y mapa en vivo (Fases 3-4) |
| Supervisor | Escritorio — listado, filtros y mapa en vivo, de solo lectura (Fases 3-4) |
| Administrador | Todo lo anterior + gestión de usuarios y auditoría (Fases 3 y 5). Cédula semilla: `41369542` |

## Seguridad, auditoría y boleta imprimible (Fase 5)

### ⚠️ Limitación de seguridad conocida (a resolver antes de producción)

El login es **solo por cédula, sin contraseña**, y el cliente se autentica de
forma anónima ante Firebase. Las reglas de Firestore (`firestore.rules`) no
tienen forma de verificar del lado del servidor "quién dice ser quién" —
solo exigen `request.auth != null`, es decir, "estar autenticado" (lo que
incluye a cualquier sesión anónima). El rol de cada sesión (Inspector,
Administrativo, Supervisor, Administrador) es lo que el cliente lee de
`/usuarios` y guarda en `localStorage`; la interfaz respeta ese rol (qué
pantallas y botones muestra), pero **nada a nivel de reglas impide que
alguien llame a Firestore directamente y escriba donde no debería**, sin
pasar por la interfaz.

Esto es una decisión consciente, no un descuido: la solución técnica
correcta —**Custom Claims**, que un servidor firme el rol dentro del token
de sesión, para que las reglas puedan exigir
`request.auth.token.rol == 'Administrador'` en vez de solo
`request.auth != null`— **ya está escrita** (ver el punto siguiente), pero
requiere Cloud Functions, y activar Cloud Functions exige pasar el proyecto
de Firebase al plan Blaze (pago por uso), que pide cargar una tarjeta aunque
el uso real de un piloto termine costando $0. Por eso, mientras el proyecto
sea un prototipo/piloto sin datos reales sensibles, se optó por no activar
esa capa. Antes de manejar datos reales de infractores y de funcionarios en
producción, conviene reconsiderar esto — ver el punto de abajo para cómo
activarlo cuando llegue el momento.

### Custom Claims — escrito, no activado

`functions/index.js` tiene tres Cloud Functions ya implementadas y
revisadas (aunque **no se pudieron probar en tiempo de ejecución** en este
entorno, por no tener un proyecto Firebase Blaze conectado):

- **`login`** — valida la cédula contra `/usuarios` del lado del servidor y,
  si es válida y está activa, firma el rol como Custom Claim en el token de
  la sesión.
- **`gestionarUsuario`** y **`cambiarActivoUsuario`** — alta/edición y
  baja/reactivación de funcionarios, verificando
  `request.auth.token.rol === 'Administrador'` antes de escribir.

Para activarlas el día de mañana: pasar el proyecto a plan Blaze, desplegar
con `firebase deploy --only functions`, volver a apuntar `AuthContext.jsx`
y `usuarios.js` a llamarlas por `httpsCallable` en vez de leer/escribir
Firestore directo (es básicamente deshacer lo de este párrafo), y volver a
endurecer `firestore.rules`/`storage.rules` para que confíen en
`request.auth.token.rol`/`.cedula`. Es un cambio acotado si en algún momento
el organismo decide que vale la pena la tarjeta.

### Marca de agua en las fotos

`CameraCapture.jsx` estampa fecha/hora (y la matrícula, si ya se cargó) sobre
cada foto al capturarla, vía canvas (`src/lib/media.js` → `watermarkDataUrl`).
No depende del EXIF, que muchos navegadores descartan al recomprimir.

### Boleta imprimible / exportable a PDF

Desde la ficha de detalle de una multa, el botón **"Descargar boleta
(PDF)"** lleva a `/panel/boleta/:uuid`, una vista con el diseño de la boleta
y un botón "Imprimir / Guardar como PDF" que dispara `window.print()`. Se
eligió este enfoque en vez de sumar una librería de generación de PDF
(como jsPDF) para no aumentar el peso del bundle en un piloto — cualquier
navegador moderno ofrece "Guardar como PDF" como destino de impresión.

### Auditoría

Cada creación de multa, cambio de estado administrativo, alta/edición de
usuario y baja/reactivación queda registrada en la colección `auditoria`
(`/panel/auditoria`, con acceso restringido a Administrador **por la
interfaz** — ver la limitación de seguridad de arriba, las reglas no lo
pueden restringir por rol sin Custom Claims). Las reglas de Firestore no
permiten editar ni borrar eventos ya escritos, eso sí es independiente de
los claims — es un historial de solo agregar. Todos los eventos se auditan
desde el cliente al momento de escribir cada documento — reflejan lo que el
cliente reportó, no algo verificado de forma independiente por el servidor
(si en algún momento se activan las Cloud Functions del punto anterior, los
eventos de usuarios pasarían a auditarse desde ahí, que sí sería
confiable).

### Pendiente de política, no de código

- **TTL de `/ubicaciones`:** hoy el historial de ubicaciones no se borra
  solo. Para producción conviene definir una política de retención (por
  ejemplo, con una Cloud Function programada que borre ubicaciones viejas)
  según lo que decida la Intendencia sobre cuánto tiempo tiene sentido
  conservarlas.
- **Backups de Firestore:** no hay backups automáticos configurados en este
  repositorio (es una tarea de infraestructura del proyecto Firebase, no de
  la app). Se pueden disparar a mano cuando haga falta con
  [`gcloud firestore export`](https://cloud.google.com/firestore/docs/manage-data/export-import)
  apuntando a un bucket de Cloud Storage — esto funciona en el plan
  gratuito Spark. Automatizarlo con una frecuencia diaria/semanal (vía Cloud
  Scheduler + una Cloud Function programada) sí requiere plan Blaze, igual
  que los Custom Claims de arriba; mientras el proyecto sea un piloto,
  alcanza con exportar a mano de vez en cuando.

## Nota sobre el módulo "vehículos abandonados"

El PDF oficial incluye un tercer bloque —protocolo de notificación, plazo de
retiro y remoción con grúa para autos abandonados— que no estaba en ninguno
de los tres documentos de referencia. No forma parte del alcance actual;
queda anotado como posible módulo futuro.
