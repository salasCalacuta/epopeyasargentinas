# Verifica servidor + túnel, reinicia si hace falta y actualiza .agente/estado.json
# Pensado para tarea programada (cada 5 minutos) y para Arrancar-sitio.bat
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$ConfigPath = Join-Path $Root "agente-online-config.json"
$EstadoPath = Join-Path $AgenteDir "estado.json"
$LogPath = Join-Path $AgenteDir "verificar.log"
$TunelLog = Join-Path $AgenteDir "tunel.log"
$UrlPath = Join-Path $Root "url-publica.txt"
$DesktopUrl = Join-Path ([Environment]::GetFolderPath("Desktop")) "Epopeyas-URL-publica.txt"

if (-not (Test-Path $AgenteDir)) { New-Item -ItemType Directory -Path $AgenteDir | Out-Null }

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 200000)) {
    Set-Content -Path $LogPath -Value (Get-Content $LogPath -Tail 150) -Encoding UTF8
  }
}

function Get-Config {
  if (-not (Test-Path $ConfigPath)) {
    return @{ puerto = 3460; tunel = @{ modo = "quick"; token = ""; hostname = "" } }
  }
  try { return Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }
  catch { return @{ puerto = 3460; tunel = @{ modo = "quick"; token = ""; hostname = "" } } }
}

function Test-Health([int]$port) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 5
    return ($r.StatusCode -eq 200 -and "$($r.Content)" -match "ok")
  } catch { return $false }
}

function Test-PublicUrl($url) {
  if (-not $url) { return $false }
  try {
    $r = Invoke-WebRequest -Uri "$url/health" -UseBasicParsing -TimeoutSec 12
    return ($r.StatusCode -eq 200)
  } catch {
    try {
      $pair = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("leo:juego"))
      $r = Invoke-WebRequest -Uri "$url/health" -Headers @{ Authorization = "Basic $pair" } -UseBasicParsing -TimeoutSec 12
      return ($r.StatusCode -eq 200)
    } catch { return $false }
  }
}

function Start-GameServer([int]$port) {
  if (Test-Health $port) { return $true }
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
  if (-not (Test-Path $node)) { Write-Log "ERROR: Node.js no encontrado"; return $false }
  Write-Log "Arrancando servidor puerto $port"
  Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
  return (Test-Health $port)
}

function Get-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $npmCf = Join-Path $env:APPDATA "npm\cloudflared.cmd"
  if (Test-Path $npmCf) { return $npmCf }
  return $null
}

function Start-Tunel($cfg) {
  if (Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue) { return }
  $cf = Get-Cloudflared
  $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
  $modo = "quick"
  $token = ""
  $hostname = ""
  if ($cfg.tunel) {
    $modo = [string]$cfg.tunel.modo
    $token = [string]$cfg.tunel.token
    $hostname = [string]$cfg.tunel.hostname
  }
  Write-Log "Arrancando tunel modo=$modo"
  if ($modo -eq "token" -and $token) {
    if ($cf) {
      Start-Process -FilePath $cf -ArgumentList @("tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
    } elseif ($npx) {
      Start-Process -FilePath $npx -ArgumentList @("--yes", "cloudflared", "tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
    }
    if ($hostname) {
      $url = if ($hostname -match "^https?://") { $hostname } else { "https://$hostname" }
      Set-Content -Path $UrlPath -Value $url -Encoding UTF8
      try { Set-Content -Path $DesktopUrl -Value "Epopeyas Argentinas`r`n$url`r`nUsuario: leo`r`nClave: juego`r`n(Tunel fijo)" -Encoding UTF8 } catch {}
    }
    return
  }
  # quick tunnel (URL cambia)
  $args = @("tunnel", "--url", "http://127.0.0.1:$([int]$cfg.puerto)", "--logfile", $TunelLog, "--loglevel", "info")
  if ($cf) {
    Start-Process -FilePath $cf -ArgumentList $args -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  } elseif ($npx) {
    Start-Process -FilePath $npx -ArgumentList (@("--yes", "cloudflared") + $args) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  } else {
    Write-Log "ERROR: ni cloudflared ni npx"
  }
}

function Read-QuickUrl {
  if (-not (Test-Path $TunelLog)) { return "" }
  $txt = Get-Content $TunelLog -Raw -ErrorAction SilentlyContinue
  if (-not $txt) { return "" }
  $m = [regex]::Matches($txt, "https://[a-zA-Z0-9-]+\.trycloudflare\.com")
  if ($m.Count -gt 0) { return $m[$m.Count - 1].Value }
  return ""
}

$cfg = Get-Config
$port = 3460
if ($cfg.puerto) { $port = [int]$cfg.puerto }
$modo = "quick"
$token = ""
$hostname = ""
if ($cfg.tunel) {
  $modo = [string]$cfg.tunel.modo
  $token = [string]$cfg.tunel.token
  $hostname = [string]$cfg.tunel.hostname
}

$servidorOk = Start-GameServer $port
$tunelProc = [bool](Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue)
if ($servidorOk -and -not $tunelProc) {
  Start-Tunel $cfg
  Start-Sleep -Seconds 4
  $tunelProc = [bool](Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue)
}

$url = ""
if ($modo -eq "token" -and $hostname) {
  $url = if ($hostname -match "^https?://") { $hostname } else { "https://$hostname" }
} else {
  $url = Read-QuickUrl
  if (-not $url -and (Test-Path $UrlPath)) { $url = (Get-Content $UrlPath -Raw).Trim() }
}
if ($url -and $modo -ne "token") {
  Set-Content -Path $UrlPath -Value $url -Encoding UTF8
  try { Set-Content -Path $DesktopUrl -Value "Epopeyas Argentinas`r`n$url`r`nUsuario: leo`r`nClave: juego" -Encoding UTF8 } catch {}
}

$publicoOk = $false
if ($url) { $publicoOk = Test-PublicUrl $url }

$estado = [ordered]@{
  versionJuego = "1.16"
  actualizado = (Get-Date).ToString("o")
  servidorLocal = $servidorOk
  puerto = $port
  tunelProceso = $tunelProc
  tunelModo = $modo
  urlPublica = $url
  urlFija = ($modo -eq "token" -and [bool]$token)
  publicoOk = $publicoOk
  online = ($servidorOk -and $tunelProc)
  hostnameConfigurado = $hostname
  mensaje = $(
    if (-not $servidorOk) { "Servidor local caido; el verificador intenta reiniciarlo." }
    elseif (-not $tunelProc) { "Servidor OK, tunel caido; reiniciando." }
    elseif ($modo -eq "quick") { "Online con tunel rapido (la URL puede cambiar al reiniciar el tunel)." }
    elseif ($publicoOk) { "Online con tunel fijo." }
    else { "Tunel fijo configurado; el hostname aun no responde desde esta PC." }
  )
}
($estado | ConvertTo-Json) | Set-Content -Path $EstadoPath -Encoding UTF8
Write-Log ("estado online={0} url={1} modo={2}" -f $estado.online, $url, $modo)
Write-Output ($estado | ConvertTo-Json -Compress)
