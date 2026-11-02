param(
    [ValidateSet("Debug", "Release")][string]$Configuration = "Release",
    [string]$Dotnet = "dotnet",
    [string]$Python = "python",
    [string]$NuGetConfig,
    [switch]$SkipRestore,
    [switch]$Sql
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$configPath = if ($NuGetConfig) { (Resolve-Path -LiteralPath $NuGetConfig).Path } else { $null }
function Check-Exit([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step fallo (exit $LASTEXITCODE)." }
}
Push-Location -LiteralPath $root
try {
    $solution = "AlquilerEquipos/backend/AlquilerEquipos.sln"
    if (-not $SkipRestore) {
        $restore = @("restore", $solution, "--locked-mode", "-p:NuGetAudit=true", "-p:NuGetAuditMode=all", "--warnaserror")
        if ($configPath) { $restore += @("--configfile", $configPath) }
        & $Dotnet @restore
        Check-Exit "Restore y auditoria"
    }
    & $Dotnet build $solution --no-restore -c $Configuration --warnaserror
    Check-Exit "Build"
    & $Dotnet "AlquilerEquipos/backend/tests/ReservasChecks/bin/$Configuration/net10.0/ReservasChecks.dll"
    Check-Exit "Reglas y modelo"
    & $Python AlquilerEquipos/backend/tests/security_http.py --dotnet $Dotnet --configuration $Configuration
    Check-Exit "HTTP y seguridad"
    if ($Sql) {
        if (-not $env:ALQUILER_SQL_TEST_CONNECTION) {
            throw "Configurar ALQUILER_SQL_TEST_CONNECTION para una instancia exclusiva de pruebas."
        }
        & $Dotnet "AlquilerEquipos/backend/tests/SqlIntegration/bin/$Configuration/net10.0/SqlIntegration.dll"
        Check-Exit "Integracion SQL"
    } else {
        Write-Host "SQL no ejecutado. Usar -Sql con ALQUILER_SQL_TEST_CONNECTION para verificar persistencia y concurrencia."
    }
} finally {
    Pop-Location
}
