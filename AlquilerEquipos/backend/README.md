# AlquilerEquipos - Backend

API ASP.NET Core 10, EF Core 10 y SQL Server. La solucion contiene API, Application, Infrastructure y los proyectos de verificacion.

Para la instalacion personal con SQL real y cuenta Windows, seguir [USO-LOCAL.md](../../USO-LOCAL.md). JWT/OIDC sigue siendo el modo por defecto fuera de esa configuracion local explicita.

`GET /api/session` devuelve nombre, roles y mecanismo de la cuenta autenticada, sin emitir tokens. Los conflictos por solapamiento de reserva devuelven HTTP 409; las entradas invalidas mantienen HTTP 400.

## Equipos

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET | /api/equipos | Listar |
| GET | /api/equipos/{id} | Consultar |
| POST | /api/equipos | Crear con estado Disponible |
| PUT | /api/equipos/{id} | Actualizar nombre, marca y serie |
| PATCH | /api/equipos/{id}/estado | Cambiar estado |
| DELETE | /api/equipos/{id} | Eliminar sin uso ni historial |
| GET | /api/equipos/disponibles | Disponibilidad por fechaInicio y fechaFin |

POST y PUT reciben nombre, marca y numeroSerie. El numero de serie es unico. PATCH de estado recibe:

```json
{ "estado": "Mantenimiento" }
```

Estados: Disponible, EnUso y Mantenimiento. Un equipo con un alquiler activo no puede marcarse manualmente como disponible o en mantenimiento.

## Clientes

GET y POST /api/clientes permiten listar y crear. GET, PUT y DELETE /api/clientes/{id} permiten consultar, actualizar y eliminar.

POST y PUT reciben:

```json
{
  "nombre": "Cliente",
  "apellido": "De prueba",
  "email": "cliente@example.invalid",
  "telefono": null,
  "direccion": null
}
```

La eliminacion se rechaza cuando existe historial de reservas. Cliente representa al cliente comercial, no a un usuario de autenticacion.

## Reservas

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET | /api/reservas | Listar con filtros |
| GET | /api/reservas/{id} | Consultar |
| POST | /api/reservas | Crear en estado Pendiente |
| PATCH | /api/reservas/{id}/cancelar | Cancelar Pendiente |
| PATCH | /api/reservas/{id}/activar | Registrar retiro |
| PATCH | /api/reservas/{id}/devolver | Registrar devolucion |

Ejemplo de POST, reemplazando los ids por registros existentes:

```json
{
  "equipoId": 1,
  "clienteId": 1,
  "fechaInicio": "2030-01-10T10:00:00Z",
  "fechaFinEsperada": "2030-01-10T12:00:00Z",
  "costoTotal": 150.00
}
```

Se validan ids, fechas y costo no negativo con hasta dos decimales. El costo se informa manualmente y no se recalcula al devolver.

Una reserva Pendiente o Activa bloquea cuando inicioExistente < finSolicitado y finExistente > inicioSolicitado. Se permiten intervalos contiguos. Las canceladas y finalizadas no bloquean.

La creacion toma un bloqueo UPDLOCK/HOLDLOCK sobre el equipo dentro de una transaccion SQL Server. Las operaciones que modifican equipo y reserva bloquean primero el equipo para mantener el orden de acceso.

El retiro requiere una reserva Pendiente dentro de su periodo y un equipo Disponible sin otro alquiler activo. Cambia la reserva a Activa y el equipo a EnUso.

La devolucion recibe un objeto JSON:

```json
{
  "fechaDevolucionReal": null,
  "requiereMantenimiento": false
}
```

Con fecha null se usa la hora UTC del servidor. Solo se devuelve un alquiler Activo; la fecha no puede ser anterior al inicio ni futura. La devolucion finaliza la reserva y deja el equipo Disponible o en Mantenimiento.

Repetir una cancelacion ya realizada, un retiro ya activo o una devolucion finalizada no repite la transicion. Las reservas Activas y Finalizadas no se cancelan.

## Fechas y disponibilidad

Enviar fechas ISO 8601 en UTC con sufijo Z. Una fecha sin zona se interpreta como UTC; una fecha local reconocida se convierte a UTC. Las fechas leidas desde SQL se materializan como UTC.

GET /api/equipos/disponibles?fechaInicio=2030-01-10T10:00:00Z&fechaFin=2030-01-10T12:00:00Z excluye equipos en mantenimiento y conflictos de periodo.

EnUso no excluye por si mismo todos los periodos futuros: las reservas determinan el conflicto temporal. El retiro vuelve a comprobar el estado fisico, por lo que un equipo no devuelto no puede entregarse de nuevo. No se promete que una consulta de disponibilidad garantice un alta posterior.

## Paginacion y filtros

Los listados de equipos, clientes, reservas y disponibles admiten pagina (1 a 10000, por defecto 1) y tamanioPagina (1 a 100, por defecto 50). Devuelven un array de esa pagina.

Reservas admite ademas equipoId, clienteId y estado. Los enums se reciben como texto:

```text
GET /api/reservas?equipoId=1&estado=Pendiente&pagina=1&tamanioPagina=25
```

## Seguridad y errores

Consultar [SECURITY.md](../../SECURITY.md) antes de exponer la API. JWT es obligatorio por defecto y los roles son Administrador, Operador y Consulta. No hay registro de usuarios ni emision de tokens.

Los errores de negocio devuelven 400, los recursos ausentes 404, los conflictos de persistencia identificados 409 y los limites 413/429. Los errores inesperados no devuelven stack traces. Problem Details incluye traceId.

Los logs de operaciones exitosas registran accion, id del recurso, subject del token y traceId; no registran cuerpos, tokens ni datos de contacto. Son trazas operativas, no un libro de auditoria inmutable.

La guia de [infraestructura](INFRAESTRUCTURA.md) describe configuracion, migraciones y contenedores. La [guia de pruebas](PRUEBAS.md) contiene los comandos de validacion.
