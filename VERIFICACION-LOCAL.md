# Verificación de la Instalación Local

Informe histórico de la preparación inicial sobre .NET 8. La instalación fue actualizada posteriormente a .NET 10: ver [MIGRACION-NET10.md](MIGRACION-NET10.md).

Sesión del 1 de noviembre de 2026, de 21:00 a 22:00 de Buenos Aires. Se eligió uso personal con cuenta Windows e inicio manual, sin publicación en Internet.

## Instalación

- Dirección: `http://localhost:5280`.
- Web React compilada y API ASP.NET Core servidas desde el mismo origen, sin Vite en el uso diario.
- Base nueva `RentaEquiposLocal` en SQL Server Express local, con migraciones aplicadas.
- Acceso Negotiate con una cuenta Windows explícita y rol Administrador. No se emiten JWT ni se guardan contraseñas para este modo.
- Escucha forzada en localhost; sin proxy, túnel, acceso anónimo, servicio ni tarea de inicio automático.
- La base de uso comenzó vacía. Los datos ficticios de las pruebas se guardaron únicamente en bases temporales propias de cada ejecución.

## Resultados

| Verificación | Resultado |
| --- | --- |
| Restore bloqueado con auditoría NuGet | Correcto, sin avisos |
| Build Release con advertencias como errores | 0 errores, 0 advertencias |
| Reglas de dominio y traducción SQL | 47 comprobaciones aprobadas |
| HTTP/JWT, permisos, configuración y guardas WindowsLocal | 58 comprobaciones aprobadas en Windows |
| SQL Server real, migraciones y concurrencia | 29 comprobaciones, incluyendo 12 altas simultáneas |
| Reglas de demostración del frontend | 16 pruebas aprobadas |
| Playwright con contratos simulados, OIDC y sesión Windows | 24 pruebas aprobadas |
| Navegador real + Negotiate + API + SQL, sin mocks | 22 comprobaciones del ciclo completo aprobadas |
| Permisos Windows reales | Consulta lee pero no escribe; cuenta no habilitada rechazada |
| Navegador real en la base de uso, solo lectura | 10 comprobaciones aprobadas |
| Respaldo COPY_ONLY, checksum y VERIFYONLY | Correcto |
| Restauración aislada y DBCC CHECKDB | Correctos en respaldo con datos y en respaldo de la base nueva |
| Arranque, segundo arranque y parada manual | Comprobados con PID, fecha y ruta |
| Salud del proceso y SQL con la cuenta Windows | 200 / 200 |
| Auditoría npm | 0 vulnerabilidades conocidas al comprobar |

## Recorrido Real

El navegador Edge ejecutado con la cuenta Windows habilitada creó un equipo y un cliente, reservó con centavos, volvió a cargar la página y recuperó los datos desde SQL. Se rechazó el solapamiento con HTTP 409. Se registraron retiro, devolución con mantenimiento y cancelación de una segunda reserva. Se verificaron el rechazo de acceso sin credenciales, orígenes ajenos, escritura sin Origin y los encabezados CSP.

Luego se detuvo la API temporal y se volvió a iniciar con un rol Consulta: la lectura funcionó y la escritura devolvió 403. Otra ejecución con una lista que no incluía la cuenta autenticada rechazó el acceso. Las bases temporales generadas por estas pruebas se eliminaron al finalizar.

El respaldo de la base temporal se restauró en otra base con nombre generado; se recuperaron **1 equipo, 1 cliente y 2 reservas**, se ejecutó CHECKDB y se eliminó solo esa copia. También se ensayó el respaldo de `RentaEquiposLocal`, inicialmente con cero registros. Ninguna restauración reemplazó la base de uso.

## Operación

Los scripts de preparación, inicio, diagnóstico, parada y respaldo están en `scripts/`. Las versiones publicadas, configuración, PID y logs se conservan en `artifacts/local/`, excluidos de Git. La preparación respalda una base existente antes de migrar y no borra versiones anteriores.

Windows PowerShell 5.1 rechazó `.ps1` por su política Restricted. No se cambió esa política ni se utilizó Bypass. Los iniciadores de doble clic usan el PowerShell 7 permitido registrado al preparar la instalación; se verificó la parada desde el archivo CMD y el posterior inicio manual. La apertura visible del navegador depende del manejador predeterminado de Windows; la dirección puede abrirse directamente en Edge.

En el entorno aislado fue necesario ejecutar SQL y el navegador integrado con la identidad real de Windows. Las pruebas no guardaron ni solicitaron la contraseña de esa cuenta. Los procesos Vite de las pruebas simuladas requirieron cierre explícito en este entorno; la instancia de uso no utiliza esos procesos.

## Repetir

```powershell
./scripts/Estado-Local.ps1
./scripts/Respaldar-Local.ps1 -EnsayarRestauracion
./AlquilerEquipos/backend/tests/WindowsLive.ps1
```

La última prueba requiere Node, Edge, SQLCMD y la instalación preparada. Crea una base `RentaEquiposAcceptance_<guid>` y usa el puerto 5281. No ejecuta altas contra la base de uso diario. Los scripts de validación de backend y npm permiten repetir el resto de las verificaciones.

## Límites

No se comprobó un reinicio completo de Windows, Firefox, Safari, dispositivos físicos ni acceso desde otra PC. No se instaló inicio automático. No se publicaron cambios ni se ejecutaron workflows remotos de GitHub.

Es una instalación personal en loopback, no un despliegue público endurecido. Usa los permisos SQL de la cuenta Windows actual. El frontend conserva el límite explícito de 500 registros por recurso; al alcanzarlo muestra una advertencia y requiere ampliar la paginación para un volumen mayor.

Se conserva .NET 8 según el stack solicitado y se instaló el parche 8.0.33. Su soporte termina el **10 de noviembre de 2026**, por lo que hace falta planificar la actualización a una versión soportada para continuidad de mantenimiento. [Calendario oficial de Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).

Guía de operación: [USO-LOCAL.md](USO-LOCAL.md).
