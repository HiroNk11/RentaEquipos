param([string]$VerifyFile, [switch]$EnsayarRestauracion)
$ErrorActionPreference = 'Stop'
$settings = Get-Content -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'artifacts/local/settings.json') -Raw | ConvertFrom-Json
$previous = $env:ConnectionStrings__AlquilerEquipos
try {
    $env:ConnectionStrings__AlquilerEquipos = $settings.Connection
    if ($VerifyFile) { & $settings.Dotnet $settings.DatabaseTool verify $settings.Database $VerifyFile }
    elseif ($EnsayarRestauracion) {
        $result = & $settings.Dotnet $settings.DatabaseTool backup $settings.Database --json
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el respaldo.' }
        $backup = $result | ConvertFrom-Json
        Write-Host "Respaldo verificado: $($backup.file)"
        & $settings.Dotnet $settings.DatabaseTool restore-check $settings.Database $backup.file
    }
    else { & $settings.Dotnet $settings.DatabaseTool backup $settings.Database }
    if ($LASTEXITCODE -ne 0) { throw 'Respaldo o verificacion fallo.' }
} finally { $env:ConnectionStrings__AlquilerEquipos=$previous }
