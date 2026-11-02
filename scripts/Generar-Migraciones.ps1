param(
    [string]$Dotnet = "dotnet",
    [string]$NuGetConfig
)
$ErrorActionPreference = "Stop"
if (-not $env:ConnectionStrings__AlquilerEquipos) {
    throw "Configurar ConnectionStrings__AlquilerEquipos. Este script genera SQL; no lo aplica."
}
$root = Split-Path -Parent $PSScriptRoot
$configPath = if ($NuGetConfig) { (Resolve-Path -LiteralPath $NuGetConfig).Path } else { $null }
Push-Location -LiteralPath $root
try {
    $restore = @("tool", "restore")
    if ($configPath) { $restore += @("--configfile", $configPath) }
    & $Dotnet @restore
    if ($LASTEXITCODE -ne 0) { throw "No se pudo restaurar dotnet-ef." }
    $projectRestore = @("restore", "AlquilerEquipos/backend/AlquilerEquipos.sln", "--locked-mode",
        "-p:NuGetAudit=true", "-p:NuGetAuditMode=all", "--warnaserror")
    if ($configPath) { $projectRestore += @("--configfile", $configPath) }
    & $Dotnet @projectRestore
    if ($LASTEXITCODE -ne 0) { throw "No se pudo restaurar o auditar la solucion." }
    & $Dotnet build AlquilerEquipos/backend/AlquilerEquipos.API --no-restore --warnaserror
    if ($LASTEXITCODE -ne 0) { throw "No se pudo compilar la API." }
    New-Item -ItemType Directory -Path artifacts -Force | Out-Null
    & $Dotnet ef migrations script --idempotent --no-build --context AlquilerEquiposDbContext --project AlquilerEquipos/backend/AlquilerEquipos.Infrastructure --startup-project AlquilerEquipos/backend/AlquilerEquipos.API --output artifacts/migrations.sql
    if ($LASTEXITCODE -ne 0) { throw "No se pudo generar el script SQL." }
    Write-Host "SQL generado en artifacts/migrations.sql. Revisar antes de aplicar; no se modifico ninguna base."
} finally {
    Pop-Location
}
