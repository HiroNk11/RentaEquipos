param([string]$Node = 'node')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$settings = Get-Content -LiteralPath (Join-Path $root 'artifacts/local/settings.json') -Raw | ConvertFrom-Json
$name = 'RentaEquiposAcceptance_' + [Guid]::NewGuid().ToString('N')
if ($name -notmatch '^RentaEquiposAcceptance_[a-f0-9]{32}$') { throw 'Nombre temporal invalido.' }
$folder = Join-Path $root 'artifacts/local/verification'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$base = 'http://localhost:5281'
$server = $null
$created = $false
$keys = @('ASPNETCORE_ENVIRONMENT','Authentication__Mode','Authentication__AllowAnonymousDevelopment','Authentication__Authority','WindowsLocal__Users__0__Name','WindowsLocal__Users__0__Role','WindowsLocal__Port','ConnectionStrings__AlquilerEquipos','AllowedHosts','Web__ServeFrontend','RENTA_LIVE_BASE_URL','RENTA_LIVE_ARTIFACTS','RENTA_ACCEPTANCE_DATABASE')
$old = @{}
foreach ($key in $keys) { $old[$key] = [Environment]::GetEnvironmentVariable($key) }
function Start-TestApi([string]$UserName,[string]$Role,[string]$Phase) {
    $env:WindowsLocal__Users__0__Name = $UserName
    $env:WindowsLocal__Users__0__Role = $Role
    $dll = Join-Path $settings.AppDirectory 'AlquilerEquipos.API.dll'
    $arguments = @(('"'+$dll+'"'),'--contentRoot',('"'+$settings.AppDirectory+'"'),'--webroot',('"'+(Join-Path $settings.AppDirectory 'wwwroot')+'"'))
    $process = Start-Process -FilePath $settings.Dotnet -ArgumentList $arguments -WorkingDirectory $settings.AppDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder "$Phase.log") -RedirectStandardError (Join-Path $folder "$Phase-error.log") -PassThru
    for ($i=0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 200
        if ($process.HasExited) { throw "La API temporal termino antes de escuchar. Revisar $Phase-error.log." }
        try { if ((Invoke-WebRequest -Uri "$base/health/live" -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200) { return $process } } catch { }
    }
    Stop-Process -Id $process.Id
    throw 'La API temporal no inicio.'
}
function Windows-Request([string]$Route,[string]$Method='GET',[string]$Body) {
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.UseDefaultCredentials=$true
    $handler.UseProxy=$false
    $client = [Net.Http.HttpClient]::new($handler)
    try {
        $message = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($Method),$base+$Route)
        $message.Headers.Add('Origin',$base)
        if ($Body) { $message.Content=[Net.Http.StringContent]::new($Body,[Text.Encoding]::UTF8,'application/json') }
        $response=$client.SendAsync($message).GetAwaiter().GetResult()
        return [int]$response.StatusCode
    } finally { $client.Dispose(); $handler.Dispose() }
}
try {
    $env:ASPNETCORE_ENVIRONMENT='Development'
    $env:Authentication__Mode='WindowsLocal'
    $env:Authentication__AllowAnonymousDevelopment='false'
    $env:Authentication__Authority=''
    $env:WindowsLocal__Port='5281'
    $env:ConnectionStrings__AlquilerEquipos="Server=$($settings.SqlServer);Database=$name;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Connect Timeout=5;"
    $env:AllowedHosts='localhost;127.0.0.1;[::1]'
    $env:Web__ServeFrontend='true'
    $created=$true
    & $settings.Dotnet $settings.DatabaseTool migrate $name
    if ($LASTEXITCODE -ne 0) { throw 'Migracion temporal fallo.' }
    $server=Start-TestApi $settings.WindowsUser 'Administrador' 'admin'
    $env:RENTA_LIVE_BASE_URL=$base
    $env:RENTA_LIVE_ARTIFACTS=$folder
    $env:RENTA_ACCEPTANCE_DATABASE=$name
    Push-Location -LiteralPath (Join-Path $root 'AlquilerEquipos/frontend')
    try { & $Node tests/windows-live.cjs --write; if ($LASTEXITCODE -ne 0) { throw 'Navegador Windows/SQL fallo.' } } finally { Pop-Location }
    $backupJson = & $settings.Dotnet $settings.DatabaseTool backup $name --json
    if ($LASTEXITCODE -ne 0) { throw 'Respaldo de aceptacion fallo.' }
    $backup = $backupJson | ConvertFrom-Json
    & $settings.Dotnet $settings.DatabaseTool restore-check $name $backup.file
    if ($LASTEXITCODE -ne 0) { throw 'Ensayo de restauracion fallo.' }
    Stop-Process -Id $server.Id
    $server.WaitForExit(); $server=$null
    $server=Start-TestApi $settings.WindowsUser 'Consulta' 'consulta'
    if ((Windows-Request '/api/equipos') -ne 200) { throw 'Consulta no puede leer.' }
    if ((Windows-Request '/api/equipos' 'POST' '{"nombre":"No guardar","marca":"Prueba","numeroSerie":"DENIED"}') -ne 403) { throw 'Consulta pudo escribir.' }
    Stop-Process -Id $server.Id
    $server.WaitForExit(); $server=$null
    $server=Start-TestApi ($settings.WindowsUser+'-not-allowed') 'Administrador' 'denied'
    if ((Windows-Request '/api/session') -ne 401) { throw 'Cuenta no habilitada obtuvo acceso.' }
    Write-Host 'OK: permisos Windows reales: lectura Consulta, escritura denegada y cuenta fuera de lista rechazada.'
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id; $server.WaitForExit() }
    if ($created) {
        $query="IF DB_ID(N'$name') IS NOT NULL BEGIN ALTER DATABASE [$name] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$name]; END"
        & sqlcmd -S $settings.SqlServer -E -C -b -l 5 -Q $query
        if ($LASTEXITCODE -ne 0) { Write-Warning "No se pudo eliminar la base temporal $name." } else { Write-Host 'Base temporal de aceptacion eliminada.' }
    }
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key,$old[$key]) }
}
