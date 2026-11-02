# RentaEquipos

Sistema de alquiler de herramientas y equipos. El backend se organiza en la solucion **AlquilerEquipos**, con C#, ASP.NET Core 10, Entity Framework Core 10 y SQL Server.

## Estado del proyecto

El backend permite gestionar equipos y clientes, reservar un equipo por periodo, registrar su retiro y completar la devolucion. El frontend React ya esta adaptado al dominio de alquileres, con inventario, disponibilidad, reservas y clientes. React Native sigue siendo el cliente heredado de ComercioPedidos y no forma parte de esta adaptacion.

## Uso local con Windows

Hay una modalidad local con cuenta Windows, SQL Server Express y frontend compilado servido por la misma API. No requiere Vite ni OIDC para el uso personal en esta PC. No habilita acceso anonimo ni se publica en Internet.

```powershell
./scripts/Iniciar-Local.ps1 -OpenBrowser
./scripts/Estado-Local.ps1
```

Direccion predeterminada: **http://localhost:5280**. Inicio manual, sin tareas automaticas. Tambien estan disponibles `Abrir-RentaEquipos.cmd` y `Detener-RentaEquipos.cmd`.

Consultar [Uso local, respaldos y actualizaciones](USO-LOCAL.md) antes de operar con datos propios.

## Funcionalidades

- CRUD de equipos con numero de serie unico.
- CRUD de clientes; no se elimina un cliente con historial de reservas.
- Disponibilidad por fechas, excluyendo mantenimiento y reservas pendientes o activas que se solapen.
- Alta transaccional de reservas con bloqueo por equipo para controlar solicitudes concurrentes.
- Cancelacion de reservas pendientes, retiro y devolucion.
- Devolucion a estado Disponible o Mantenimiento.
- Autenticacion JWT y permisos para Administrador, Operador y Consulta.
- Listados paginados, filtros de reservas, errores Problem Details y logs JSON.
- Sondas de vida y disponibilidad de base de datos.
- Migraciones versionadas, dependencias bloqueadas y workflow de validacion.

El costo total es un importe pactado ingresado por un operador. No se implementan tarifacion automatica, cobros ni penalizaciones por demora.

## Desarrollo de la API

Requisitos: SDK .NET 10.0.403 o posterior de .NET 10, runtime 10.0.14 o posterior, SQL Server o LocalDB y Python 3.10+ para las comprobaciones HTTP. global.json selecciona el SDK estable de .NET 10.

Desde la raiz del repositorio, con datos ficticios:

```powershell
dotnet restore AlquilerEquipos/backend/AlquilerEquipos.sln --locked-mode
dotnet tool restore
$env:ConnectionStrings__AlquilerEquipos = "Server=(localdb)\MSSQLLocalDB;Database=AlquilerEquiposDB;Integrated Security=True;TrustServerCertificate=True;"
dotnet ef database update --context AlquilerEquiposDbContext --project AlquilerEquipos/backend/AlquilerEquipos.Infrastructure --startup-project AlquilerEquipos/backend/AlquilerEquipos.API
$env:Authentication__AllowAnonymousDevelopment = "true"
dotnet run --project AlquilerEquipos/backend/AlquilerEquipos.API --launch-profile http
```

Swagger: http://localhost:5272/swagger

El modo anonimo es una opcion explicita de Development. La API escucha en loopback por defecto; no usar ese modo con datos reales ni exponerlo a una red publica. Para trabajar con JWT, seguir la [guia de seguridad](SECURITY.md).

Las migraciones estan destinadas a **AlquilerEquiposDB**, no a la base de ComercioPedidos.

## Recorrido funcional

1. Crear un cliente en POST /api/clientes.
2. Crear un equipo en POST /api/equipos.
3. Consultar GET /api/equipos/disponibles con fechaInicio y fechaFin.
4. Crear una reserva en POST /api/reservas.
5. Dentro del periodo reservado, usar PATCH /api/reservas/{id}/activar para retirar el equipo.
6. Registrar la devolucion con PATCH /api/reservas/{id}/devolver.

Los periodos son semiabiertos: una reserva puede empezar cuando termina otra. La consulta de disponibilidad es informativa; el POST vuelve a comprobar conflictos antes de guardar.

## Validar

```powershell
./scripts/Validar-Backend.ps1
```

El script restaura con versiones bloqueadas y auditoria NuGet, compila, verifica reglas y ejecuta comprobaciones HTTP. La integracion SQL se solicita por separado con -Sql y ALQUILER_SQL_TEST_CONNECTION en una instancia exclusiva de pruebas.

Consultar [PRUEBAS.md](AlquilerEquipos/backend/PRUEBAS.md) para distinguir las verificaciones sin base de las pruebas de persistencia y concurrencia.

## Estructura

```text
AlquilerEquipos/backend/
  AlquilerEquipos.API/              Controllers, seguridad y composicion
  AlquilerEquipos.Application/      Entidades, DTOs, reglas y contratos
  AlquilerEquipos.Infrastructure/   EF Core, SQL Server y servicios
  tests/                           Reglas, HTTP e integracion SQL
AlquilerEquipos/frontend/           React y TypeScript para alquileres
comercio-pedidos-mobile/            React Native heredado
scripts/                           Validacion y generacion de SQL
.github/workflows/                 Validacion del backend
```

## Documentacion

- [Endpoints y configuracion del backend](AlquilerEquipos/backend/README.md)
- [Frontend: ejecucion, demostracion y autenticacion](AlquilerEquipos/frontend/README.md)
- [Seguridad y permisos](SECURITY.md)
- [Pruebas](AlquilerEquipos/backend/PRUEBAS.md)
- [Resultados de verificacion local](AlquilerEquipos/backend/VERIFICACION.md)
- [Infraestructura y operacion](AlquilerEquipos/backend/INFRAESTRUCTURA.md)
- [Uso local con Windows](USO-LOCAL.md)
- [Resultados de la instalacion local](VERIFICACION-LOCAL.md)
- [Actualizacion a .NET 10](MIGRACION-NET10.md)

No se aplican migraciones automaticamente al iniciar la API. Un workflow configurado o una imagen Docker definida no equivalen a un despliegue validado.


