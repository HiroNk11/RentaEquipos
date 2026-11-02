$ErrorActionPreference = 'Stop'
$local = Join-Path (Split-Path -Parent $PSScriptRoot) 'artifacts/local'
$settings = Get-Content -LiteralPath (Join-Path $local 'settings.json') -Raw | ConvertFrom-Json
$url = "http://localhost:$($settings.Port)"
$live = Invoke-WebRequest -Uri "$url/health/live" -UseBasicParsing -TimeoutSec 5
$auth = @{ UseDefaultCredentials=$true }
# Windows Negotiate uses an OS challenge/response, only against the fixed loopback URL.
if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('AllowUnencryptedAuthentication')) { $auth.AllowUnencryptedAuthentication=$true }
$ready = Invoke-WebRequest -Uri "$url/health/ready" @auth -UseBasicParsing -TimeoutSec 10
$session = Invoke-RestMethod -Uri "$url/api/session" @auth -TimeoutSec 10
Write-Host "Web: $url. Proceso: $($live.StatusCode). SQL y permisos: $($ready.StatusCode). Usuario: $($session.name). Rol: $($session.roles -join ', ')."
