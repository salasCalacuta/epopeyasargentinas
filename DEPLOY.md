# Checklist deploy v2.0

## Render (Web Service)
1. New → Blueprint o Web Service desde `salasCalacuta/epopeyasargentinas`
2. Root Directory: `web`
3. Build: `npm install --omit=dev`
4. Start: `node server.js`
5. Health: `/health`
6. Variables de entorno (obligatorias para admin):
   - `AUTH_ENABLED=0`
   - `ADMIN_USER=UDW`
   - `ADMIN_PASS=maletefi2017`  (o la clave que elijas; no va en el repo)
7. Tras el deploy, admin en `https://TU-SERVICIO.onrender.com/tefi`

## Keepalive (cada 2 h)
- Windows: `web\Instalar-keepalive-render.ps1` (editá antes `keepalive-render-config.json`)
- GitHub Actions: workflow `Keepalive Render` + secret `RENDER_URL` = URL del servicio

## Renovar preguntas (cada 3 días)
- Cliente: el juego renueva orden y “preguntas hechas” solo
- Windows: `web\Instalar-renovar-preguntas.ps1` (reordena `preguntas.json` local)
