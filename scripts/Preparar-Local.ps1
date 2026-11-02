param(
    [ValidatePattern('^(localhost|127\.0\.0\.1|\.)(\\[A-Za-z0-9_]+)?(,[0-9]{1,5})?$')][string]$SqlServer = 'localhost\SQLEXPRESS',
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_]{0,100}$')][string]$Database = 'RentaEquiposLocal',
    [ValidateRange(1024,65535)][int]$Port = 5280,
    [string]$WindowsUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
    [string]$Dotnet = 'dotnet', [string]$Node = 'node', [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root 'artifacts/local'
if (Test-Path -LiteralPath (Join-Path $local 'process.json')) { throw 'Primero ejecutar Detener-Local.ps1.' }
$settingsFile = Join-Path $local 'settings.json'
if (Test-Path -LiteralPath $settingsFile) {
    $installed = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
    if (-not $PSBoundParameters.ContainsKey('Dotnet') -and $installed.Dotnet) { $Dotnet=$installed.Dotnet }
    if (-not $PSBoundParameters.ContainsKey('Node') -and $installed.Node) { $Node=$installed.Node }
}
$dotnetExe = (Get-Command $Dotnet -ErrorAction Stop).Source
$nodeExe = (Get-Command $Node -ErrorAction Stop).Source
if ([int](& $nodeExe -p 'process.versions.node.split(".")[0]') -lt 24) { throw 'Se requiere Node 24 o posterior.' }
$keys = @('PATH','ConnectionStrings__AlquilerEquipos','VITE_WINDOWS_LOCAL','VITE_DEMO_MODE','VITE_ALLOW_ANONYMOUS_API','VITE_API_URL','VITE_OIDC_AUTHORITY','VITE_OIDC_CLIENT_ID')
$previous = @{}
foreach ($key in $keys) { $previous[$key]=[Environment]::GetEnvironmentVariable($key) }
function Check([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step fallo (exit $LASTEXITCODE)." } }
New-Item -ItemType Directory -Path $local -Force | Out-Null
$release = Join-Path $local ('releases/' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $release -Force | Out-Null
$connection = "Server=$SqlServer;Database=$Database;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Connect Timeout=10;"
Push-Location -LiteralPath $root
try {
    $env:PATH = (Split-Path $nodeExe) + [IO.Path]::PathSeparator + (Split-Path $dotnetExe) + [IO.Path]::PathSeparator + $env:PATH
    $env:ConnectionStrings__AlquilerEquipos = $connection
    & $dotnetExe restore AlquilerEquipos/backend/AlquilerEquipos.sln --locked-mode -p:NuGetAudit=true -p:NuGetAuditMode=all
    Check 'Restore'
    & $dotnetExe build AlquilerEquipos/backend/AlquilerEquipos.sln -c Release --no-restore --warnaserror
    Check 'Build backend'
    $tool = Join-Path $root 'AlquilerEquipos/backend/tools/DatabaseTool/bin/Release/net10.0/DatabaseTool.dll'
    if (Test-Path -LiteralPath $settingsFile) {
        $old = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
        if ($old.Database -ne $Database -or $old.SqlServer -ne $SqlServer) { throw 'La instalacion existente usa otra base. No se cambia automaticamente.' }
    }
    $exists = & $dotnetExe $tool exists $Database
    Check 'Comprobacion de base existente'
    if ($exists -eq 'true') { & $dotnetExe $tool backup $Database; Check 'Respaldo previo a migrar' }
    & $dotnetExe $tool migrate $Database
    Check 'Migraciones'
    & $dotnetExe publish AlquilerEquipos/backend/AlquilerEquipos.API -c Release --no-restore -o (Join-Path $release 'app')
    Check 'Publish API'
    Push-Location -LiteralPath (Join-Path $root 'AlquilerEquipos/frontend')
    try {
        if (-not $SkipInstall) { & npm ci; Check 'npm ci' }
        $env:VITE_WINDOWS_LOCAL = 'true'
        $env:VITE_DEMO_MODE = 'false'
        $env:VITE_ALLOW_ANONYMOUS_API = 'false'
        $env:VITE_API_URL = '/api'
        $env:VITE_OIDC_AUTHORITY = ''
        $env:VITE_OIDC_CLIENT_ID = ''
        & npm run build
        Check 'Build frontend'
        Copy-Item -LiteralPath 'dist' -Destination (Join-Path $release 'app/wwwroot') -Recurse
    } finally { Pop-Location }
    $shellExe = (Get-Process -Id $PID).Path
    $settings = [ordered]@{ SqlServer=$SqlServer; Database=$Database; Connection=$connection; WindowsUser=$WindowsUser; Port=$Port; Dotnet=$dotnetExe; Node=$nodeExe; Shell=$shellExe; AppDirectory=(Join-Path $release 'app'); DatabaseTool=$tool }
    if (Test-Path -LiteralPath $settingsFile) { Copy-Item -LiteralPath $settingsFile -Destination (Join-Path $local 'settings.previous.json') -Force }
    $settings | ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding UTF8
    foreach ($launcher in @(@{Name='open';Script='Iniciar-Local.ps1';Extra=' -OpenBrowser'},@{Name='stop';Script='Detener-Local.ps1';Extra=''})) {
        $command = '"' + $shellExe + '" -NoProfile -File "' + (Join-Path $PSScriptRoot $launcher.Script) + '"' + $launcher.Extra
        @('@echo off',$command,'if errorlevel 1 pause') | Set-Content -LiteralPath (Join-Path $local ($launcher.Name+'.cmd')) -Encoding Default
    }
    Write-Host "Preparado para $WindowsUser. Base: $Database. Iniciar con ./scripts/Iniciar-Local.ps1."
} finally { Pop-Location; foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key,$previous[$key]) } }
