# Epopeyas Argentinas

Juego educativo (PWA) sobre la **invasión inglesa a Buenos Aires en 1806**.

Repositorio: [salasCalacuta/epopeyasargentinas](https://github.com/salasCalacuta/epopeyasargentinas)

## Qué incluye

- Sitio web jugable en `web/`
- Servidor Node (`web/server.js`) con panel admin en `/tefi`
- **PWA instalable en Android** (Chrome → «Instalar app» / Agregar a la pantalla de inicio)
- Listo para desplegar en [Render](https://render.com) (`render.yaml`)

No se usa APK/AAB de Capacitor en este flujo.

## Local

```bat
cd web
npm start
```

Abrí http://127.0.0.1:3460

- Juego: sin login si `AUTH_ENABLED=0`
- Admin: http://127.0.0.1:3460/tefi  
  Credenciales solo por variables de entorno / archivo local `.agente` (nunca en el cliente).

```bat
cd web
set ADMIN_USER=UDW
set ADMIN_PASS=tu_clave
node scripts/init-admin-secrets.js
```

## Instalar en Android (PWA)

1. Publicá el sitio en HTTPS (Render).
2. En el teléfono, abrí Chrome → menú → **Instalar aplicación** o **Agregar a la pantalla de inicio**.
3. Queda como app a pantalla completa (`display: standalone`).

## Render.com (cuando sincronices)

1. Conectá este repo en Render.
2. Usá el Blueprint `render.yaml` (rootDir `web`) o un Web Service Node con:
   - Build: `npm install --omit=dev`
   - Start: `node server.js`
3. Variables de entorno:
   - `AUTH_ENABLED=0` (juego público)
   - `ADMIN_USER` / `ADMIN_PASS` (panel `/tefi`)
4. Health check: `/health`

## GitHub

Remoto previsto:

```text
https://github.com/salasCalacuta/epopeyasargentinas.git
```

Aún no se hace push hasta que lo indiques.

## Versión

Web PWA **1.16**
