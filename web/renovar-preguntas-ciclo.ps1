# Renueva el ciclo de preguntas del cliente (marca vencida) y reordena el banco local.
# Pensado para tarea cada 3 días. El juego también auto-renueva en el navegador.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$LogPath = Join-Path $AgenteDir "preguntas-ciclo.log"
$ActivoPath = Join-Path $Root "preguntas.json"
$BancoJsPath = Join-Path $Root "preguntas-banco.js"
$EstadoPath = Join-Path $AgenteDir "preguntas-ciclo-estado.json"

if (-not (Test-Path $AgenteDir)) {
  New-Item -ItemType Directory -Path $AgenteDir | Out-Null
}

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  Write-Host $line
}

function Shuffle-List($arr) {
  $rnd = New-Object System.Random
  return @($arr | Sort-Object { $rnd.Next() })
}

Write-Log "=== Renovar ciclo preguntas ==="
if (-not (Test-Path $ActivoPath)) {
  Write-Log "ERROR: falta preguntas.json"
  exit 1
}

try {
  $data = Get-Content $ActivoPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $data) { throw "JSON vacío" }
  $list = @($data)
  $mezcla = Shuffle-List $list
  $json = ($mezcla | ConvertTo-Json -Depth 6)
  [System.IO.File]::WriteAllText($ActivoPath, $json, [System.Text.UTF8Encoding]::new($false))
  $banco = "window.BANCO_PREGUNTAS = " + $json.Trim() + ";`n"
  [System.IO.File]::WriteAllText($BancoJsPath, $banco, [System.Text.UTF8Encoding]::new($false))
  $st = [pscustomobject]@{
    ultimaRenovacion = (Get-Date).ToString("s")
    cantidad = $mezcla.Count
  }
  ($st | ConvertTo-Json) | Set-Content -Path $EstadoPath -Encoding UTF8
  Write-Log "OK reordenadas $($mezcla.Count) preguntas"
  Write-Log "=== fin OK ==="
  exit 0
} catch {
  Write-Log "FAIL $($_.Exception.Message)"
  exit 2
}
