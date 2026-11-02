# Actualización a .NET 10 LTS

Fecha: 2 de noviembre de 2026.

## Versiones

- SDK .NET **10.0.403** instalado en un directorio privado del workspace, con SHA512 contrastado con el manifiesto oficial.
- Runtime .NET y ASP.NET Core **10.0.14**. Se exige ese parche mínimo en los proyectos.
- Los seis proyectos de la solución ahora utilizan `net10.0`.
- Entity Framework Core, autenticación JWT y Negotiate, herramientas EF y PKCS actualizados a **10.0.14**.
- Lockfiles regenerados, restauración bloqueada con auditoría y compilación Release sin advertencias.
- Dockerfile, workflow, rutas de ejecución de pruebas y scripts de preparación actualizados.

Se conservan la autenticación Windows, el inicio manual y la dirección `http://localhost:5280`.

## Datos y Migraciones

Antes de actualizar la instalación se generó un respaldo COPY_ONLY con checksum y se verificó desde SQL Server. No se eliminaron datos ni se sustituyó la base de uso.

EF Core 10 confirmó que no hay cambios pendientes de modelo. Se conservaron las migraciones existentes y sus metadatos originales; no hizo falta una migración nueva ni alterar el esquema. Las anotaciones de EF 8 en archivos históricos no indican que el proceso siga usando ese runtime.

La versión anterior permanece en el directorio de releases. La configuración local apunta ahora al host .NET 10 y a la nueva aplicación publicada. Las rutas del SDK y de Node se registran para que las próximas preparaciones puedan reutilizarlas sin depender del PATH global.

## Verificación

| Comprobación en .NET 10 | Resultado |
| --- | --- |
| Build Release, advertencias como errores | 0 errores / 0 advertencias |
| Reglas de negocio, modelo y traducción SQL | 47 aprobadas |
| HTTP, JWT, permisos, configuración y Swagger | 58 aprobadas |
| SQL real, migraciones, persistencia y 12 solicitudes concurrentes | 29 aprobadas |
| Modelo mediante dotnet-ef 10 | Sin cambios pendientes |
| Navegador real con Negotiate y SQL | 22 comprobaciones del ciclo completo aprobadas |
| Roles Windows reales | Consulta sin permiso de escritura; cuenta no habilitada rechazada |
| Respaldo y restauración aislada | CHECKDB correcto, 1 equipo, 1 cliente y 2 reservas recuperados |
| Instancia de uso | Salud de API y SQL 200, cuenta Windows habilitada |
| Runtime del proceso publicado | net10.0, .NET/ASP.NET Core 10.0.14 |

Las pruebas con escrituras y restauración utilizaron bases temporales generadas y eliminadas por los runners. No insertaron datos ficticios en `RentaEquiposLocal`.

El frontend no cambió de comportamiento; se recompiló para la publicación local. No se ejecutaron Docker ni GitHub Actions remotos, ni se hizo push.

## Herramientas de Desarrollo

El SDK nuevo se instaló de forma privada, sin sustituir la instalación global de Windows. Para compilar desde Visual Studio u otra terminal que no use la ruta configurada, instalar el SDK 10.0.403 o posterior de .NET 10, o indicar el ejecutable privado mediante `-Dotnet`. La instalación local ya utiliza la ruta nueva y no necesita volver a .NET 8.

Mantener los parches de .NET 10. Su soporte LTS termina el **14 de noviembre de 2028**, según la [política oficial de Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).

Guía de operación: [USO-LOCAL.md](USO-LOCAL.md).
