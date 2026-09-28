# Agente Preguntas: sync semanal desde Google Sheets (hoja 2) con respaldo hoja 1.
$ErrorActionPreference = "Continue"
try {
  [System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = "Idle"
} catch {}

$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$ConfigPath = Join-Path $Root "agente-preguntas-config.json"
$EstadoPath = Join-Path $AgenteDir "preguntas-estado.json"
$LogPath = Join-Path $AgenteDir "preguntas.log"
$BasePath = Join-Path $Root "preguntas-base.json"
$ActivoPath = Join-Path $Root "preguntas.json"
$BancoJsPath = Join-Path $Root "preguntas-banco.js"
$SheetIdDefault = "1_7z_lr-XS7JNQVxLuR9eofhICcZW0KF3rxW0YK7Foao"

if (-not (Test-Path $AgenteDir)) {
  New-Item -ItemType Directory -Path $AgenteDir | Out-Null
}

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  Write-Host $line
  if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 300000)) {
    $keep = Get-Content $LogPath -Tail 200
    Set-Content -Path $LogPath -Value $keep -Encoding UTF8
  }
}

function Get-Config {
  $cfg = [pscustomobject]@{
    spreadsheetId = $SheetIdDefault
    gidHoja1 = 0
    gidHoja2 = $null
    cupoSemanal = 8
    csvUrlHoja1 = ""
    csvUrlHoja2 = ""
  }
  if (Test-Path $ConfigPath) {
    try {
      $j = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $j.PSObject.Properties.Name) {
        $cfg | Add-Member -NotePropertyName $p -NotePropertyValue $j.$p -Force
      }
    } catch {
      Write-Log "Config invalida: $($_.Exception.Message)"
    }
  }
  return $cfg
}

function Get-Estado {
  if (Test-Path $EstadoPath) {
    try { return (Get-Content $EstadoPath -Raw -Encoding UTF8 | ConvertFrom-Json) } catch {}
  }
  return [pscustomobject]@{
    ultimaSync = ""
    ultimaSemana = ""
    hashHoja1 = ""
    hashHoja2 = ""
    hashActivo = ""
  }
}

function Save-Estado($st) {
  ($st | ConvertTo-Json) | Set-Content -Path $EstadoPath -Encoding UTF8
}

function Get-CsvUrl($cfg, $hoja) {
  if ($hoja -eq 1 -and $cfg.csvUrlHoja1) { return [string]$cfg.csvUrlHoja1 }
  if ($hoja -eq 2 -and $cfg.csvUrlHoja2) { return [string]$cfg.csvUrlHoja2 }
  $sid = [string]$cfg.spreadsheetId
  if (-not $sid) { $sid = $SheetIdDefault }
  $gid = if ($hoja -eq 1) { $cfg.gidHoja1 } else { $cfg.gidHoja2 }
  if ($null -eq $gid -or $gid -eq "") { return $null }
  return "https://docs.google.com/spreadsheets/d/$sid/export?format=csv&gid=$gid"
}

function Download-Text($url) {
  if (-not $url) { return $null }
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45
    if ($r.StatusCode -ne 200) { return $null }
    $txt = $r.Content
    if ($txt -match "(?i)sign-?in|accounts\.google|<!DOCTYPE html>") {
      if ($txt -notmatch "," -or $txt.Length -lt 40) { return $null }
      if ($txt -match "(?i)<html") { return $null }
    }
    return $txt
  } catch {
    Write-Log "Download fail: $($_.Exception.Message)"
    return $null
  }
}

function Get-Sha([string]$text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Normalize-Key($s) {
  return ([string]$s).Trim().ToLowerInvariant().
    Replace("á","a").Replace("é","e").Replace("í","i").Replace("ó","o").Replace("ú","u").Replace("ñ","n")
}

function Find-Col($headers, $candidates) {
  $norm = @{}
  for ($i = 0; $i -lt $headers.Count; $i++) {
    $norm[(Normalize-Key $headers[$i])] = $i
  }
  foreach ($c in $candidates) {
    $k = Normalize-Key $c
    if ($norm.ContainsKey($k)) { return $norm[$k] }
  }
  return -1
}

function Parse-Correcta($raw, $ops) {
  if ($null -eq $raw) { return 0 }
  $s = ([string]$raw).Trim()
  if ($s -match '^\d+$') {
    $n = [int]$s
    if ($n -ge 1 -and $n -le 3) { return $n - 1 }
    if ($n -ge 0 -and $n -le 2) { return $n }
  }
  $letter = $s.Substring(0,1).ToUpperInvariant()
  if ($letter -eq "A") { return 0 }
  if ($letter -eq "B") { return 1 }
  if ($letter -eq "C") { return 2 }
  for ($i = 0; $i -lt $ops.Count; $i++) {
    if ((Normalize-Key $ops[$i]) -eq (Normalize-Key $s)) { return $i }
  }
  return 0
}

function Parse-Bonus($raw) {
  $s = ([string]$raw).Trim().ToLowerInvariant()
  return ($s -eq "1" -or $s -eq "true" -or $s -eq "si" -or $s -eq "sí" -or $s -eq "bonus" -or $s -eq "x")
}

function Convert-CsvToPreguntas([string]$csv) {
  if (-not $csv) { return @() }
  $rows = $csv | ConvertFrom-Csv
  if (-not $rows) { return @() }
  $headers = @($rows[0].PSObject.Properties.Name)
  $iP = Find-Col $headers @("pregunta","question","enunciado","texto")
  $iA = Find-Col $headers @("opcion1","opcion_a","opcion a","a","respuesta1","opcion_1")
  $iB = Find-Col $headers @("opcion2","opcion_b","opcion b","b","respuesta2","opcion_2")
  $iC = Find-Col $headers @("opcion3","opcion_c","opcion c","c","respuesta3","opcion_3")
  $iR = Find-Col $headers @("correcta","respuesta","correct","ok","indice")
  $iBonus = Find-Col $headers @("bonus","extra","estrella")

  if ($iP -lt 0) {
    # Sin encabezados tipicos: asumir columnas en orden pregunta,a,b,c,correcta,bonus
    if ($headers.Count -ge 4) {
      $iP = 0; $iA = 1; $iB = 2; $iC = 3
      if ($headers.Count -ge 5) { $iR = 4 }
      if ($headers.Count -ge 6) { $iBonus = 5 }
    } else {
      Write-Log "CSV sin columnas reconocibles: $($headers -join ', ')"
      return @()
    }
  }

  $out = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    $vals = @($row.PSObject.Properties.Value)
    $preg = if ($iP -ge 0) { [string]$vals[$iP] } else { "" }
    if (-not $preg.Trim()) { continue }
    $ops = @(
      $(if ($iA -ge 0) { [string]$vals[$iA] } else { "" }),
      $(if ($iB -ge 0) { [string]$vals[$iB] } else { "" }),
      $(if ($iC -ge 0) { [string]$vals[$iC] } else { "" })
    )
    if (($ops | Where-Object { $_.Trim() }).Count -lt 2) { continue }
    $corrRaw = if ($iR -ge 0) { $vals[$iR] } else { 0 }
    $bonusRaw = if ($iBonus -ge 0) { $vals[$iBonus] } else { "" }
    $out.Add([pscustomobject]@{
      pregunta = $preg.Trim()
      opciones = @($ops[0].Trim(), $ops[1].Trim(), $ops[2].Trim())
      correcta = (Parse-Correcta $corrRaw $ops)
      bonus = (Parse-Bonus $bonusRaw)
    })
  }
  return @($out.ToArray())
}

function Read-JsonArray($path) {
  if (-not (Test-Path $path)) { return @() }
  try {
    $data = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($data -is [System.Array]) { return @($data) }
    return @($data)
  } catch {
    Write-Log "JSON invalido $path : $($_.Exception.Message)"
    return @()
  }
}

function Pregunta-Key($p) {
  return (Normalize-Key $p.pregunta)
}

function Pregunta-Fingerprint($p) {
  $ops = ($p.opciones -join "|")
  return (Get-Sha ("$($p.pregunta)|$ops|$($p.correcta)|$($p.bonus)"))
}

function Write-PreguntasFiles($arr) {
  $json = ($arr | ConvertTo-Json -Depth 6)
  [System.IO.File]::WriteAllText($ActivoPath, $json, [System.Text.UTF8Encoding]::new($false))
  $banco = "window.BANCO_PREGUNTAS = " + $json.Trim() + ";`n"
  [System.IO.File]::WriteAllText($BancoJsPath, $banco, [System.Text.UTF8Encoding]::new($false))
}

function Ensure-BaseFromLocal {
  if (-not (Test-Path $BasePath)) {
    if (Test-Path $ActivoPath) {
      Copy-Item $ActivoPath $BasePath -Force
      Write-Log "Creada preguntas-base.json desde preguntas.json local"
    } else {
      "[]" | Set-Content -Path $BasePath -Encoding UTF8
      Write-Log "Creada preguntas-base.json vacia"
    }
  }
}

function Merge-Partial($activo, $novedades, $cupo) {
  $map = @{}
  foreach ($p in $activo) { $map[(Pregunta-Key $p)] = $p }
  $fpActivo = @{}
  foreach ($p in $activo) { $fpActivo[(Pregunta-Fingerprint $p)] = $true }

  $candidatos = New-Object System.Collections.Generic.List[object]
  foreach ($n in $novedades) {
    $fp = Pregunta-Fingerprint $n
    if ($fpActivo.ContainsKey($fp)) { continue }
    $candidatos.Add($n)
  }

  if ($candidatos.Count -eq 0) {
    return @{ cambios = 0; resultado = $activo }
  }

  $tomar = [Math]::Min([int]$cupo, $candidatos.Count)
  # Mezclar y tomar cupo
  $rnd = New-Object System.Random
  $mezcla = $candidatos.ToArray() | Sort-Object { $rnd.Next() }
  $elegidos = $mezcla | Select-Object -First $tomar

  $lista = New-Object System.Collections.Generic.List[object]
  foreach ($p in $activo) { $lista.Add($p) }

  $aplicados = 0
  foreach ($e in $elegidos) {
    $k = Pregunta-Key $e
    $obj = [pscustomobject]@{
      pregunta = [string]$e.pregunta
      opciones = @([string]$e.opciones[0], [string]$e.opciones[1], [string]$e.opciones[2])
      correcta = [int]$e.correcta
      bonus = [bool]$e.bonus
    }
    if ($map.ContainsKey($k)) {
      # Reemplazar pregunta existente modificada
      for ($i = 0; $i -lt $lista.Count; $i++) {
        if ((Pregunta-Key $lista[$i]) -eq $k) {
          $lista[$i] = $obj
          break
        }
      }
    } else {
      $lista.Add($obj)
    }
    $aplicados++
  }

  return @{ cambios = $aplicados; resultado = @($lista.ToArray()) }
}

function Discover-GidHoja2($cfg) {
  if ($cfg.gidHoja2 -ne $null -and $cfg.gidHoja2 -ne "") { return $cfg.gidHoja2 }
  if ($cfg.csvUrlHoja2) { return $null }
  # Solo intentar descubrir si hoja1 ya fue legible (misma visibilidad)
  $url1 = Get-CsvUrl $cfg 1
  $probe = Download-Text $url1
  if (-not $probe) {
    Write-Log "Omitiendo descubrimiento de gidHoja2 (hoja1 no publica)"
    return $null
  }
  $sid = [string]$cfg.spreadsheetId
  $candidates = @(1,2,3,4,5,6,7,8,9,10,100,200,300,400,500,1000,2000)
  foreach ($g in $candidates) {
    if ([int]$g -eq [int]$cfg.gidHoja1) { continue }
    $url = "https://docs.google.com/spreadsheets/d/$sid/export?format=csv&gid=$g"
    $txt = Download-Text $url
    if ($txt -and $txt.Length -gt 20 -and $txt -match ",") {
      Write-Log "Detectado gidHoja2=$g"
      return $g
    }
  }
  return $null
}

# --- main ---
Write-Log "=== Agente Preguntas inicio ==="
Ensure-BaseFromLocal
$cfg = Get-Config
$st = Get-Estado
$cupo = 8
if ($cfg.cupoSemanal) { $cupo = [int]$cfg.cupoSemanal }

# Intentar refrescar base (hoja 1)
$url1 = Get-CsvUrl $cfg 1
$csv1 = Download-Text $url1
if ($csv1) {
  $h1 = Get-Sha $csv1
  $parsed1 = Convert-CsvToPreguntas $csv1
  if ($parsed1.Count -gt 0) {
    if ($h1 -ne [string]$st.hashHoja1) {
      ($parsed1 | ConvertTo-Json -Depth 6) | Set-Content -Path $BasePath -Encoding UTF8
      $st.hashHoja1 = $h1
      Write-Log "Base hoja1 actualizada ($($parsed1.Count) preguntas)"
    } else {
      Write-Log "Base hoja1 sin cambios"
    }
  } else {
    Write-Log "Hoja1 CSV ok pero 0 preguntas parseadas"
  }
} else {
  Write-Log "No se pudo leer hoja1 (usando preguntas-base.json local)"
}

# Descubrir / leer hoja 2
$gid2 = Discover-GidHoja2 $cfg
if ($gid2 -ne $null) {
  $cfg | Add-Member -NotePropertyName gidHoja2 -NotePropertyValue $gid2 -Force
  try {
    $cfg | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
  } catch {}
}

$url2 = Get-CsvUrl $cfg 2
$csv2 = Download-Text $url2
if (-not $csv2) {
  Write-Log "Sin sync hoja2: se mantiene banco activo / base hoja1"
  $st.ultimaSync = (Get-Date).ToString("s")
  Save-Estado $st
  Write-Log "=== Agente Preguntas fin (sin cambios) ==="
  exit 0
}

$h2 = Get-Sha $csv2
$novedades = Convert-CsvToPreguntas $csv2
Write-Log "Hoja2: $($novedades.Count) preguntas parseadas"

if ($novedades.Count -eq 0) {
  Write-Log "Hoja2 vacia o formato desconocido"
  Save-Estado $st
  exit 0
}

$activo = Read-JsonArray $ActivoPath
if ($activo.Count -eq 0) {
  $activo = Read-JsonArray $BasePath
}

if ($h2 -eq [string]$st.hashHoja2) {
  Write-Log "Hoja2 sin cambios desde ultima sync"
  $st.ultimaSync = (Get-Date).ToString("s")
  Save-Estado $st
  exit 0
}

$merge = Merge-Partial $activo $novedades $cupo
if ([int]$merge.cambios -eq 0) {
  Write-Log "Hay CSV nuevo pero no hubo candidatos distintos al banco"
  $st.hashHoja2 = $h2
  $st.ultimaSync = (Get-Date).ToString("s")
  Save-Estado $st
  exit 0
}

Write-PreguntasFiles $merge.resultado
$st.hashHoja2 = $h2
$st.hashActivo = Get-Sha ((Get-Content $ActivoPath -Raw -Encoding UTF8))
$st.ultimaSync = (Get-Date).ToString("s")
$st.ultimaSemana = (Get-Date).ToString("yyyy-ww")
Save-Estado $st
Write-Log "Fusionados $($merge.cambios) cambios (cupo $cupo). Banco=$($merge.resultado.Count) preguntas"
Write-Log "=== Agente Preguntas fin OK ==="
exit 0
