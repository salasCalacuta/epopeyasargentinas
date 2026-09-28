# Checklist antes del primer push / Render

1. Revisar que no haya secretos:
   - `web/.agente/` está en `.gitignore`
   - No commitear `ADMIN_PASS` ni `maletefi…`
2. En GitHub (repo vacío [epopeyasargentinas](https://github.com/salasCalacuta/epopeyasargentinas)):
   ```bat
   git init
   git remote add origin https://github.com/salasCalacuta/epopeyasargentinas.git
   git add .
   git commit -m "Epopeyas Argentinas 1.16 PWA lista para Render"
   git branch -M main
   git push -u origin main
   ```
   (Todavía **no** ejecutar el push hasta que lo indiques.)
3. En Render: New → Blueprint → este repo, o Web Service con `rootDir=web`.
4. Variables: `ADMIN_USER`, `ADMIN_PASS`, `AUTH_ENABLED=0`.
5. En Android Chrome: abrir la URL HTTPS → Instalar app.
