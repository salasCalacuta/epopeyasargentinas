# Túnel con URL fija (Cloudflare)

Los túneles *quick* (`*.trycloudflare.com`) **cambian de URL** cada vez que se reinicia cloudflared.
Para **mantener la misma URL**:

1. Creá una cuenta gratis en [Cloudflare](https://dash.cloudflare.com/).
2. Zero Trust → Networks → Tunnels → Create a tunnel.
3. Instalá/asociá el túnel y copiá el **token**.
4. Publicá un hostname (por ejemplo `epopeyas.tudominio.com`) apuntando a `http://127.0.0.1:3460`.
5. En `agente-online-config.json`:

```json
"tunel": {
  "modo": "token",
  "token": "PEGAR_TOKEN_AQUI",
  "hostname": "epopeyas.tudominio.com"
}
```

6. Ejecutá `Arrancar-sitio.bat` o `Instalar-vigilancia-sitio.ps1`.

Sin dominio propio, Cloudflare puede dar un hostname `*.cfargotunnel.com` (según el plan/config); lo importante es el **token**: siempre reutiliza el mismo túnel.

## Vigilancia automática

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File web\Instalar-vigilancia-sitio.ps1
```

Crea la tarea **Epopeyas-Verificar-Sitio** (cada 5 min).
