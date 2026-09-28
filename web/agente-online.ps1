# Agente online: mantiene servidor + tunel y avisa si el juego cae.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$AgenteDir = Join-Path $Root ".agente"
$ConfigPath = Join-Path $Root "agente-online-config.json"
$EstadoPath = Join-Path $AgenteDir "estado.json"
$LogPath = Join-Path $AgenteDir "agente.log"
$TunelLog = Join-Path $AgenteDir "tunel.log"
$UrlPath = Join-Path $Root "url-publica.txt"
$DesktopUrl = Join-Path ([Environment]::GetFolderPath("Desktop")) "Epopeyas-URL-publica.txt"

if (-not (Test-Path $AgenteDir)) {
  New-Item -ItemType Directory -Path $AgenteDir | Out-Null
}

$mutex = New-Object System.Threading.Mutex($false, "Local\EpopeyasAgenteOnline")
if (-not $mutex.WaitOne(0, $false)) { exit 0 }

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 400000)) {
    $keep = Get-Content $LogPath -Tail 200
    Set-Content -Path $LogPath -Value $keep -Encoding UTF8
  }
}

function Get-Config {
  if (-not (Test-Path $ConfigPath)) {
    return @{ emailAviso = ""; puerto = 3460; usuario = "leo"; clave = "juego"; smtp = @{} }
  }
  try {
    return (Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json)
  } catch {
    return @{ emailAviso = ""; puerto = 3460; usuario = "leo"; clave = "juego"; smtp = @{} }
  }
}

function Get-Estado {
  if (Test-Path $EstadoPath) {
    try { return (Get-Content $EstadoPath -Raw -Encoding UTF8 | ConvertFrom-Json) } catch {}
  }
  return [pscustomobject]@{
    online = $false
    fallosSeguidos = 0
    urlPublica = ""
    ultimoAvisoOffline = ""
    ultimoAvisoUrl = ""
  }
}

function Save-Estado($st) {
  ($st | ConvertTo-Json) | Set-Content -Path $EstadoPath -Encoding UTF8
}

function Show-Globo($titulo, $texto) {
  Write-Log "NOTIF: $titulo - $texto"
}

function Send-Aviso($asunto, $cuerpo) {
  $cfg = Get-Config
  $to = [string]$cfg.emailAviso
  Write-Log "AVISO: $asunto"
  Show-Globo $asunto $cuerpo
  if (-not $to) {
    Write-Log "Sin emailAviso en config; solo globo/log."
    return
  }

  $smtp = $cfg.smtp
  if ($smtp -and $smtp.host) {
    try {
      $from = $smtp.remitente
      if (-not $from) { $from = $smtp.usuario }
      $pass = ConvertTo-SecureString ([string]$smtp.clave) -AsPlainText -Force
      $cred = New-Object System.Management.Automation.PSCredential(([string]$smtp.usuario), $pass)
      $port = 587
      if ($smtp.puerto) { $port = [int]$smtp.puerto }
      Send-MailMessage -To $to -From $from -Subject $asunto -Body $cuerpo -SmtpServer ([string]$smtp.host) -Port $port -UseSsl -Credential $cred -ErrorAction Stop
      Write-Log "Mail enviado por SMTP a $to"
      return
    } catch {
      Write-Log "SMTP fallo: $($_.Exception.Message)"
    }
  }

  try {
    $ol = New-Object -ComObject Outlook.Application
    $mail = $ol.CreateItem(0)
    $mail.To = $to
    $mail.Subject = $asunto
    $mail.Body = $cuerpo
    $mail.Send()
    Write-Log "Mail enviado por Outlook a $to"
    return
  } catch {
    Write-Log "Outlook no disponible: $($_.Exception.Message)"
  }

  try {
    $payload = @{
      _subject = $asunto
      message = $cuerpo
      _captcha = "false"
      _template = "table"
    } | ConvertTo-Json
    Invoke-WebRequest -Uri "https://formsubmit.co/ajax/$to" -Method POST -Body $payload -ContentType "application/json; charset=utf-8" -UseBasicParsing -TimeoutSec 20 | Out-Null
    Write-Log "Mail enviado por FormSubmit a $to (confirmar el primer mail si pide)"
    return
  } catch {
    Write-Log "FormSubmit fallo: $($_.Exception.Message)"
  }

  Write-Log "No se pudo enviar mail. Revisar emailAviso/SMTP."
}

function Test-Health([int]$port) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 6
    return ($r.StatusCode -eq 200 -and $r.Content -match "ok")
  } catch {
    return $false
  }
}

function Get-ListenPid([int]$port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) { return [int]$c.OwningProcess }
  } catch {}
  return 0
}

function Start-GameServer($cfg) {
  $port = [int]$cfg.puerto
  if (-not $port) { $port = 3460 }
  if (Test-Health $port) { return }
  $node = $null
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $node = $cmd.Source }
  if (-not $node) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
  if (-not (Test-Path $node)) {
    Write-Log "ERROR: no esta Node.js"
    return
  }
  Write-Log "Arrancando servidor en puerto $port"
  $p = Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  if ($p) { try { $p.PriorityClass = "Idle" } catch {} }
}

function Test-TunelVivo {
  if (Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue) { return $true }
  return $false
}

function Start-Tunel($cfg) {
  try {
    if (Test-TunelVivo) { return }
    Write-Log "Arrancando tunel Cloudflare"
    if ((Test-Path $TunelLog) -and ((Get-Item $TunelLog).Length -gt 1500000)) {
      Remove-Item $TunelLog -Force -ErrorAction SilentlyContinue
    }
    $modo = "quick"
    $token = ""
    $hostname = ""
    if ($cfg.tunel) {
      $modo = [string]$cfg.tunel.modo
      $token = [string]$cfg.tunel.token
      $hostname = [string]$cfg.tunel.hostname
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

    if ($modo -eq "token" -and $token) {
      if ($cf) {
        Start-Process -FilePath $cf -ArgumentList @("tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
      } elseif ($npx) {
        Start-Process -FilePath $npx -ArgumentList @("--yes", "cloudflared", "tunnel", "--no-autoupdate", "run", "--token", $token) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
      }
      if ($hostname) {
        $url = if ($hostname -match "^https?://") { $hostname } else { "https://$hostname" }
        Save-PublicUrl $url
      }
      return
    }

    $bat = Join-Path $Root "Arrancar-tunel.bat"
    Start-Process -FilePath $bat -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  } catch {
    Write-Log "ERROR tunel: $($_.Exception.Message)"
  }
}

function Read-PublicUrl {
  if (-not (Test-Path $TunelLog)) { return "" }
  $txt = Get-Content $TunelLog -Raw -ErrorAction SilentlyContinue
  if (-not $txt) { return "" }
  $m = [regex]::Matches($txt, "https://[a-zA-Z0-9-]+\.trycloudflare\.com")
  if ($m.Count -gt 0) { return $m[$m.Count - 1].Value }
  return ""
}

function Save-PublicUrl($url) {
  if (-not $url) { return }
  Set-Content -Path $UrlPath -Value $url -Encoding UTF8
  try { Set-Content -Path $DesktopUrl -Value "Epopeyas Argentinas`r`n$url`r`nUsuario: leo`r`nClave: juego" -Encoding UTF8 } catch {}
}

try {
  [System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = "Idle"
} catch {}

try {
  Write-Log "Agente online iniciado"
  while ($true) {
    try {
      $cfg = Get-Config
      $st = Get-Estado
      $port = [int]$cfg.puerto
      if (-not $port) { $port = 3460 }

      $ok = Test-Health $port
      if (-not $ok) {
        Start-GameServer $cfg
        Start-Sleep -Seconds 4
        $ok = Test-Health $port
      }

      Get-Process -Name "node","cloudflared" -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.PriorityClass = "Idle" } catch {}
      }

      $cambio = $false
      if ($ok) {
        Start-Tunel $cfg
        $url = Read-PublicUrl
        if ($url -and $url -ne [string]$st.urlPublica) {
          Save-PublicUrl $url
          $st.urlPublica = $url
          $st.ultimoAvisoUrl = (Get-Date).ToString("s")
          $cambio = $true
          Send-Aviso "Epopeyas online" "El juego esta disponible.`r`nURL: $url`r`nUsuario: leo`r`nClave: juego"
        }
        if (-not $st.online -and $st.fallosSeguidos -ge 2) {
          Send-Aviso "Epopeyas volvio" "El juego volvio a estar online.`r`nURL: $($st.urlPublica)"
        }
        if (-not $st.online -or [int]$st.fallosSeguidos -ne 0) { $cambio = $true }
        $st.online = $true
        $st.fallosSeguidos = 0
      } else {
        $st.fallosSeguidos = [int]$st.fallosSeguidos + 1
        $st.online = $false
        $cambio = $true
        Write-Log "Health FAIL ($($st.fallosSeguidos))"
        if ($st.fallosSeguidos -eq 3) {
          $cuando = $st.ultimoAvisoOffline
          $enviar = $true
          if ($cuando) {
            try {
              if ((New-TimeSpan -Start ([datetime]$cuando) -End (Get-Date)).TotalMinutes -lt 20) { $enviar = $false }
            } catch {}
          }
          if ($enviar) {
            $st.ultimoAvisoOffline = (Get-Date).ToString("s")
            Send-Aviso "Epopeyas OFFLINE" "El juego no responde en localhost:$port. El agente intenta reiniciarlo. Ultima URL: $($st.urlPublica)"
          }
        }
      }
      if ($cambio) { Save-Estado $st }

      # Domingos: sync de preguntas (una vez por semana calendario)
      try {
        if ((Get-Date).DayOfWeek -eq [DayOfWeek]::Sunday) {
          $pregEstadoPath = Join-Path $AgenteDir "preguntas-estado.json"
          $semana = (Get-Date).ToString("yyyy") + "-W" + [System.Globalization.CultureInfo]::InvariantCulture.Calendar.GetWeekOfYear((Get-Date), [System.Globalization.CalendarWeekRule]::FirstFourDayWeek, [DayOfWeek]::Monday)
          $ya = $false
          if (Test-Path $pregEstadoPath) {
            try {
              $pe = Get-Content $pregEstadoPath -Raw -Encoding UTF8 | ConvertFrom-Json
              if ([string]$pe.ultimaSemana -eq $semana) { $ya = $true }
            } catch {}
          }
          if (-not $ya) {
            $scriptPreg = Join-Path $Root "agente-preguntas.ps1"
            if (Test-Path $scriptPreg) {
              Write-Log "Domingo: ejecutando Agente Preguntas"
              & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPreg
              if (Test-Path $pregEstadoPath) {
                try {
                  $pe2 = Get-Content $pregEstadoPath -Raw -Encoding UTF8 | ConvertFrom-Json
                  $pe2 | Add-Member -NotePropertyName ultimaSemana -NotePropertyValue $semana -Force
                  ($pe2 | ConvertTo-Json) | Set-Content -Path $pregEstadoPath -Encoding UTF8
                } catch {}
              }
            }
          }
        }
      } catch {
        Write-Log "ERROR preguntas domingo: $($_.Exception.Message)"
      }
    } catch {
      Write-Log "ERROR ciclo: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 60
  }
} finally {
  try { $mutex.ReleaseMutex() | Out-Null } catch {}
}
