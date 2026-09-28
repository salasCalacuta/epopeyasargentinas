# Tunel Cloudflare en segundo plano.
# Si hay token fijo en agente-online-config.json, usa ese (misma URL).
# Si no, quick tunnel (URL nueva cada vez).
$ErrorActionPreference = "SilentlyContinue"
try {
  [System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = "Idle"
} catch {}

$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$TunelLog = Join-Path $AgenteDir "tunel.log"
$ConfigPath = Join-Path $Root "agente-online-config.json"
$UrlPath = Join-Path $Root "url-publica.txt"
if (-not (Test-Path $AgenteDir)) { New-Item -ItemType Directory -Path $AgenteDir | Out-Null }

if (Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue) { exit 0 }

$modo = "quick"
$token = ""
$hostname = ""
$puerto = 3460
if (Test-Path $ConfigPath) {
  try {
    $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cfg.puerto) { $puerto = [int]$cfg.puerto }
    if ($cfg.tunel) {
      $modo = [string]$cfg.tunel.modo
      $token = [string]$cfg.tunel.token
      $hostname = [string]$cfg.tunel.hostname
    }
  } catch {}
}

$cf = $null
$cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cmd) { $cf = $cmd.Source }
if (-not $cf) {
  $npmCf = Join-Path $env:APPDATA "npm\cloudflared.cmd"
  if (Test-Path $npmCf) { $cf = $npmCf }
}
$npx = $null
$npxCmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
if ($npxCmd) { $npx = $npxCmd.Source }

$p = $null
if ($modo -eq "token" -and $token) {
  if ($hostname) {
    $url = if ($hostname -match "^https?://") { $hostname } else { "https://$hostname" }
    Set-Content -Path $UrlPath -Value $url -Encoding UTF8
  }
  if ($cf) {
    $p = Start-Process -FilePath $cf -ArgumentList @("tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  } elseif ($npx) {
    $p = Start-Process -FilePath $npx -ArgumentList @("--yes", "cloudflared", "tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  }
} else {
  $args = @("tunnel", "--url", "http://127.0.0.1:$puerto", "--logfile", $TunelLog, "--loglevel", "info")
  if ($cf) {
    $p = Start-Process -FilePath $cf -ArgumentList $args -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  } elseif ($npx) {
    $p = Start-Process -FilePath $npx -ArgumentList (@("--yes", "cloudflared") + $args) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  }
}

if ($p) {
  try { $p.PriorityClass = "Idle" } catch {}
}
exit 0
