# Ping al health de Render para evitar sleep del plan free (cada 2 h).
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$ConfigPath = Join-Path $Root "keepalive-render-config.json"
$LogPath = Join-Path $AgenteDir "keepalive.log"

if (-not (Test-Path $AgenteDir)) {
  New-Item -ItemType Directory -Path $AgenteDir | Out-Null
}

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  Write-Host $line
}

$cfg = $null
if (Test-Path $ConfigPath) {
  try { $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
}

$url = [string]($cfg.url)
if (-not $url) {
  Write-Log "ERROR: falta url en keepalive-render-config.json"
  exit 1
}
$url = $url.TrimEnd("/") + "/health"

try {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
  Write-Log "OK $($r.StatusCode) $url"
  exit 0
} catch {
  Write-Log "FAIL $url :: $($_.Exception.Message)"
  exit 2
}
