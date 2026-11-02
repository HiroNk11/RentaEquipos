# Verificacion local - 1 de noviembre de 2026

Este informe corresponde a la sesion inicial hasta las 06:00. La verificacion posterior de SQL Server real, autenticacion Windows, web integrada y respaldos se encuentra en [VERIFICACION-LOCAL.md](../../VERIFICACION-LOCAL.md).

Sesion de desarrollo sobre RentaEquipos, con limite de trabajo a las 06:00 de Buenos Aires.

## Resultados observados

| Verificacion | Resultado |
| --- | --- |
| SDK y runtime | SDK 8.0.427, ASP.NET Core y .NET 8.0.33 dentro del workspace |
| Restore bloqueado y auditoria NuGet transitiva | Correcto, sin avisos reportados |
| Build Release con advertencias como errores | Correcto, 0 errores y 0 advertencias |
| Reglas, intervalos, estados, fechas y modelo | 47 comprobaciones aprobadas |
| HTTP, JWT, permisos, limites y configuracion | 51 comprobaciones aprobadas |
| Contrato Swagger y entradas invalidas | Smoke aprobado para equipos, clientes y reservas |
| SQL idempotente de migraciones | Generado; no aplicado a una base |
| Scripts PowerShell | Parseados y ejecutados para validar y generar SQL |
| Frontend heredado | 108 archivos comparados contra Git sin cambios de contenido |
| YAML y Markdown | Sintaxis YAML, jobs, bloques de codigo y enlaces locales comprobados |

La validacion completa se ejecuto mediante scripts/Validar-Backend.ps1. Las dependencias se descargaron de NuGet mediante un puente temporal local porque el transporte TLS de Windows del entorno aislado no podia conectarse directamente. Ese puente y el SDK local estan fuera del repositorio; no se cambia el feed del proyecto ni se desactiva la verificacion HTTPS del origen.

## No verificado localmente

- SQL real: el entorno no pudo conectar a LocalDB por restricciones de credenciales/TLS. El runner de integracion se compilo, pero su concurrencia, persistencia y permisos SQL no se presentan como aprobados.
- Docker: no hay Docker disponible localmente. La imagen y su verificacion en CI quedaron preparadas.
- OIDC real: se verificaron validacion JWT local y controles de configuracion, no un proveedor externo en funcionamiento.
- TLS real: la prueba de proxy usa encabezados de un remitente configurado en loopback; no verifica certificados de un despliegue.
- GitHub Actions: el workflow se preparo; requiere publicacion y una ejecucion real para disponer de resultados.

## Cambios de esta sesion

JWT con roles y subject, configuracion cerrada fuera de desarrollo, limite de solicitudes antes de autenticacion, limites de cuerpo y paginacion, errores Problem Details y logs JSON. CRUD de clientes, retiro/devolucion de equipos, reglas de transicion comprobables y restricciones SQL de estados. SDK, dependencias y herramientas fijados; scripts de mantenimiento, permisos SQL minimos e infraestructura de CI/contenedor documentados.

Los cambios permanecen locales. No se aplicaron migraciones a datos reales, no se publico una imagen y no se hizo commit ni push en esta sesion.
