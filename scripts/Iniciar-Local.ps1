param([switch]$Foreground, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root 'artifacts/local'
$settingsFile = Join-Path $local 'settings.json'
if (-not (Test-Path -LiteralPath $settingsFile)) { throw 'Ejecutar primero Preparar-Local.ps1.' }
$settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
if ([int]$settings.Port -lt 1024 -or [int]$settings.Port -gt 65535) { throw 'Puerto local invalido.' }
$url = "http://localhost:$([int]$settings.Port)"
if ([Security.Principal.WindowsIdentity]::GetCurrent().Name -ne $settings.WindowsUser) { throw 'Iniciar desde la cuenta Windows habilitada en la preparacion.' }
$pidFile = Join-Path $local 'process.json'
function Registered-Process {
    if (-not (Test-Path -LiteralPath $pidFile)) { return $false }
    $record = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    $running = Get-Process -Id $record.Id -ErrorAction SilentlyContinue
    return $running -and $running.StartTime.ToUniversalTime() -eq ([DateTime]$record.StartTime).ToUniversalTime() -and
        $record.Dll -eq (Join-Path $settings.AppDirectory 'AlquilerEquipos.API.dll')
}
function Confirm-Ready {
    $auth=@{ UseDefaultCredentials=$true }
    if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('AllowUnencryptedAuthentication')) { $auth.AllowUnencryptedAuthentication=$true }
    try {
        if ((Invoke-WebRequest -Uri "$url/health/ready" @auth -UseBasicParsing -TimeoutSec 6).StatusCode -ne 200) { throw 'Not ready' }
    } catch { throw 'La API inicio pero SQL o la cuenta Windows no estan disponibles. Revisar Estado-Local.ps1; no se abrio el navegador.' }
}
if (Test-Path -LiteralPath $pidFile) {
    if (-not (Registered-Process)) { throw 'Registro obsoleto o version diferente. Ejecutar Detener-Local.ps1 para verificarlo antes de iniciar.' }
    if ((Invoke-WebRequest -Uri "$url/health/live" -UseBasicParsing -TimeoutSec 3).StatusCode -ne 200) { throw 'El proceso existe pero no responde.' }
    Confirm-Ready
    if ($OpenBrowser) { Start-Process -FilePath $url }
    Write-Host "RentaEquipos ya esta iniciado: $url"
    return
}
if (-not $Foreground) {
    $shell = (Get-Process -Id $PID).Path
    $wrapper = Start-Process -FilePath $shell -ArgumentList @('-NoProfile','-File',('"' + $PSCommandPath + '"'),'-Foreground') -WorkingDirectory $root -WindowStyle Hidden -PassThru
    for ($i=0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        if ($wrapper.HasExited) { throw 'La API no pudo iniciar. Revisar artifacts/local/api-error.log.' }
        if (Registered-Process) {
            $alive=$false
            try {
                $alive=(Invoke-WebRequest -Uri "$url/health/live" -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200
            } catch { }
            if ($alive) {
                Confirm-Ready
                if ($OpenBrowser) { Start-Process -FilePath $url }
                Write-Host "RentaEquipos disponible: $url"
                return
            }
        }
    }
    throw 'Inicio no confirmado. Revisar Estado-Local.ps1 y los logs antes de reintentar.'
}
$keys=@('ASPNETCORE_ENVIRONMENT','Authentication__Mode','Authentication__AllowAnonymousDevelopment','Authentication__Authority','WindowsLocal__Users__0__Name','WindowsLocal__Users__0__Role','WindowsLocal__Port','ConnectionStrings__AlquilerEquipos','AllowedHosts','Web__ServeFrontend')
$previous=@{}
foreach ($key in $keys) { $previous[$key]=[Environment]::GetEnvironmentVariable($key) }
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Authentication__Mode = 'WindowsLocal'
$env:Authentication__AllowAnonymousDevelopment = 'false'
$env:Authentication__Authority = ''
$env:WindowsLocal__Users__0__Name = $settings.WindowsUser
$env:WindowsLocal__Users__0__Role = 'Administrador'
$env:WindowsLocal__Port = [string]$settings.Port
$env:ConnectionStrings__AlquilerEquipos = $settings.Connection
$env:AllowedHosts = 'localhost;127.0.0.1;[::1]'
$env:Web__ServeFrontend = 'true'
$dll = Join-Path $settings.AppDirectory 'AlquilerEquipos.API.dll'
$arguments = @(('"' + $dll + '"'),'--contentRoot',('"' + $settings.AppDirectory + '"'),'--webroot',('"' + (Join-Path $settings.AppDirectory 'wwwroot') + '"'))
$process = Start-Process -FilePath $settings.Dotnet -ArgumentList $arguments -WorkingDirectory $settings.AppDirectory -NoNewWindow -RedirectStandardOutput (Join-Path $local 'api.log') -RedirectStandardError (Join-Path $local 'api-error.log') -PassThru
@{ Id=$process.Id; StartTime=$process.StartTime.ToUniversalTime().ToString('O'); Dll=$dll } | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
try { Wait-Process -Id $process.Id } finally {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id }
    if (Test-Path -LiteralPath $pidFile) {
        $record = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
        if ($record.Id -eq $process.Id) { Remove-Item -LiteralPath $pidFile }
    }
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key,$previous[$key]) }
}
