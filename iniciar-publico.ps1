$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host 'Instalando cloudflared...'
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

if (-not (Test-Path node_modules)) { npm install }
npm run build

$env:HOST = '127.0.0.1'
$env:PORT = '4321'
$log = Join-Path $env:TEMP 'cloudflared-mainstreet.log'
Remove-Item $log -ErrorAction SilentlyContinue

$server = Start-Process -FilePath node -ArgumentList './dist/server/entry.mjs' -PassThru -NoNewWindow
$tunnel = $null

try {
  Write-Host 'Esperando al servidor...'
  $ready = $false
  for ($i = 0; $i -lt 30 -and -not $ready; $i++) {
    if ($server.HasExited) { throw 'El servidor se cerro. El puerto 4321 esta ocupado?' }
    try {
      Invoke-WebRequest -Uri 'http://127.0.0.1:4321/' -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw 'El servidor no respondio a tiempo.' }

  $tunnel = Start-Process -FilePath cloudflared -ArgumentList 'tunnel', '--url', 'http://127.0.0.1:4321' `
    -PassThru -NoNewWindow -RedirectStandardError $log

  Write-Host 'Creando el enlace publico...'
  $url = $null
  for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    if ($tunnel.HasExited) { throw 'cloudflared se cerro. Revisa ' + $log }
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
      $match = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
      if ($match) { $url = $match.Matches[0].Value }
    }
  }
  if (-not $url) { throw 'No se obtuvo la URL publica. Revisa ' + $log }

  Write-Host ''
  Write-Host "Listo. Enlace para compartir: $url" -ForegroundColor Green
  Write-Host 'Deja esta ventana abierta. Ctrl+C para detener.'
  Start-Process $url

  Wait-Process -Id $tunnel.Id
} finally {
  if ($tunnel) { Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
