# Infraestructura y operacion

La instalacion personal para Windows esta descrita en [USO-LOCAL.md](../../USO-LOCAL.md), con inicio/parada manual, frontend compilado, lista explicita de cuentas y respaldo con ensayo de restauracion. No es una alternativa de despliegue publico ni se configura como servicio automaticamente.

## Herramientas reproducibles

global.json selecciona SDK .NET 10.0.403 o posterior dentro de .NET 10. El runtime minimo es 10.0.14. Los proyectos usan paquetes bloqueados en packages.lock.json y el manifiesto local fija dotnet-ef 10.0.14.

```powershell
dotnet restore AlquilerEquipos/backend/AlquilerEquipos.sln --locked-mode
dotnet tool restore
dotnet build AlquilerEquipos/backend/AlquilerEquipos.sln -c Release --no-restore --warnaserror
```

Mantener las revisiones de seguridad del SDK, runtime, paquetes y contenedores. Las actualizaciones mayores requieren revisar el proyecto; no se aplican automaticamente.

## Configuracion

ASP.NET Core lee appsettings, User Secrets en Development y variables de entorno. El separador de variables es doble guion bajo.

| Configuracion | Uso |
| --- | --- |
| ConnectionStrings__AlquilerEquipos | Conexion SQL |
| Authentication__Authority | Proveedor OIDC HTTPS |
| Authentication__Audience | Audiencia de esta API |
| Authentication__RoleClaimType | Claim que contiene los roles; por defecto role |
| Authentication__AllowAnonymousDevelopment | Bypass explicito solo para pruebas locales |
| AllowedHosts | Hosts publicos permitidos, separados por punto y coma |
| Cors__AllowedOrigins__0 | Origen web permitido |
| ReverseProxy__KnownProxies__0 | IP de un proxy de confianza |

En Production se requieren Authority, Audience, hosts explicitos y SQL con cifrado y certificado validado. El proveedor debe emitir sub y un rol reconocido. No hay servicio de login en este repositorio.

En Development, ademas de OIDC, puede usarse Authentication:Issuer, Audience y SigningKey de al menos 64 bytes. Esa clave no se entrega al navegador ni al cliente movil. El modo anonimo debe limitarse a loopback y datos ficticios.

## Migraciones

La API no aplica migraciones al arrancar. La fabrica de contexto para herramientas lee ConnectionStrings__AlquilerEquipos del entorno y no requiere emitir un JWT.

Para generar SQL idempotente sin aplicarlo:

```powershell
./scripts/Generar-Migraciones.ps1
```

El resultado queda en artifacts/migrations.sql, excluido de Git. Revisar el script y contar con respaldo antes de aplicarlo mediante una cuenta de migracion.

Para una base local nueva:

```powershell
dotnet ef database update --context AlquilerEquiposDbContext --project AlquilerEquipos/backend/AlquilerEquipos.Infrastructure --startup-project AlquilerEquipos/backend/AlquilerEquipos.API
```

Usar AlquilerEquiposDB o una base propia del nuevo dominio, nunca la base de ComercioPedidos. La segunda migracion valida estados y fechas de finalizacion; los datos existentes deben cumplir esas reglas. No se corrigen ni eliminan registros automaticamente para forzar una migracion.

## Permisos SQL

database/RuntimePermissions.sql crea el rol alquiler_runtime sobre las tablas del dominio. Ejecutarlo con una cuenta administradora de la base despues de migrar y asociar un usuario exclusivo de la aplicacion mediante ALTER ROLE.

El rol permite CRUD de equipos y clientes, y lectura/alta/actualizacion de reservas. No concede eliminacion de reservas ni operaciones DDL. No asignarlo a una cuenta que ya tenga permisos elevados; no revoca privilegios previos.

La cuenta de migracion debe ser distinta de la cuenta de ejecucion. No usar sa para la API.

## Contenedor

Desde la raiz:

```powershell
docker build -f AlquilerEquipos/backend/AlquilerEquipos.API/Dockerfile -t alquiler-equipos:local .
```

La imagen utiliza runtime ASP.NET Core 10.0.14, usuario app sin privilegios de root y puerto interno 8080. No incluye SQL Server ni ejecuta migraciones.

.env.example muestra los nombres de configuracion para un eventual docker run --env-file. Copiarlo a .env y reemplazar los valores mediante el gestor de secretos del entorno. ASP.NET Core no carga archivos .env automaticamente.

LocalDB no es accesible desde este contenedor Linux. Se necesita una instancia SQL alcanzable y una identidad de ejecucion configurada.

## HTTPS y proxy

El puerto interno HTTP debe ser accesible solo desde un proxy TLS de confianza. Configurar su IP real en ReverseProxy:KnownProxies; no confiar en redes completas ni en encabezados enviados por cualquier cliente.

Si Kestrel termina TLS directamente, configurar su endpoint HTTPS y certificado mediante secretos o montaje protegido. El contenedor no contiene certificados privados.

En Production, la API rechaza negocio sobre HTTP cuando no hay una redireccion HTTPS aplicable. /health/live es la unica excepcion deliberada para una sonda minima sin datos.

## Salud y logs

- GET /health/live: proceso vivo, anonimo y sin consulta SQL.
- GET /health/ready: requiere rol de lectura y comprueba acceso a SQL con timeout.
- Los errores incluyen traceId para correlacion.
- Los logs JSON de escrituras contienen accion, id, subject y resultado, sin cuerpos ni tokens.
- El limite global es por IP y por instancia; para varias replicas, agregar controles en el gateway.

No confiar solo en liveness para habilitar trafico: una API puede estar viva y no tener acceso a SQL. La disponibilidad del proveedor OIDC, certificados, respaldo, restauracion y alertas requieren pruebas propias del entorno.

