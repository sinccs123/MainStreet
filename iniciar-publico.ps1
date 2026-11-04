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
$server = Start-Process -FilePath node -ArgumentList './dist/server/entry.mjs' -PassThru -NoNewWindow

try {
  Write-Host 'Buscá la URL https://....trycloudflare.com en la salida y compartila. Ctrl+C para detener.'
  cloudflared tunnel --url http://127.0.0.1:4321
} finally {
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
