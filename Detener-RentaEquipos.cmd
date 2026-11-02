@echo off
if not exist "%~dp0artifacts\local\stop.cmd" (
  echo Ejecutar primero scripts\Preparar-Local.ps1 desde PowerShell 7.
  pause
  exit /b 1
)
call "%~dp0artifacts\local\stop.cmd"
