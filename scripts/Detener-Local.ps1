$ErrorActionPreference = 'Stop'
$file = Join-Path (Split-Path -Parent $PSScriptRoot) 'artifacts/local/process.json'
if (-not (Test-Path -LiteralPath $file)) { Write-Host 'No hay proceso registrado.'; return }
$record = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
$process = Get-Process -Id $record.Id -ErrorAction SilentlyContinue
if ($process) {
    $command = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.Id)"
    if ($process.StartTime.ToUniversalTime() -ne ([DateTime]$record.StartTime).ToUniversalTime() -or
        $command.CommandLine.IndexOf($record.Dll, [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw 'El PID ya no corresponde a esta API. No se detuvo ningun proceso.' }
    Stop-Process -Id $process.Id -ErrorAction Stop
}
if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
Write-Host 'Instancia local detenida. La base de datos se conserva.'
