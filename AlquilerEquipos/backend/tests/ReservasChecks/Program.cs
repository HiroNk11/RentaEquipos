using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Services;
using AlquilerEquipos.Application.Exceptions;
using AlquilerEquipos.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var start = new DateTime(2030, 1, 10, 10, 0, 0);
var end = start.AddHours(2);
var predicate = Disponibilidad.Conflictos(start, end).Compile();
int checks = 0;
void Check(bool value, string name)
{
    if (!value) throw new Exception(name);
    checks++;
}
foreach (var state in new[] { EstadoReservaAlquiler.Activa, EstadoReservaAlquiler.Pendiente })
{
    Check(predicate(new() { Estado = state, FechaInicio = start, FechaFinEsperada = end }), "Identica");
    Check(predicate(new() { Estado = state, FechaInicio = start.AddHours(-1), FechaFinEsperada = end.AddHours(1) }), "Contiene");
    Check(predicate(new() { Estado = state, FechaInicio = start.AddMinutes(1), FechaFinEsperada = end.AddMinutes(-1) }), "Contenida");
    Check(predicate(new() { Estado = state, FechaInicio = start.AddHours(-1), FechaFinEsperada = start.AddMinutes(1) }), "Cruce inicial");
    Check(predicate(new() { Estado = state, FechaInicio = end.AddMinutes(-1), FechaFinEsperada = end.AddHours(1) }), "Cruce final");
    Check(!predicate(new() { Estado = state, FechaInicio = start.AddHours(-1), FechaFinEsperada = start }), "Fin contiguo");
    Check(!predicate(new() { Estado = state, FechaInicio = end, FechaFinEsperada = end.AddHours(1) }), "Inicio contiguo");
}
foreach (var state in new[] { EstadoReservaAlquiler.Cancelada, EstadoReservaAlquiler.Finalizada })
    Check(!predicate(new() { Estado = state, FechaInicio = start, FechaFinEsperada = end }), "Estado no bloqueante");
foreach (var pair in new[] { (start, start), (end, start), (default(DateTime), end) })
{
    bool rejected = false;
    try { Disponibilidad.ValidarFechas(pair.Item1, pair.Item2); }
    catch (ReglaNegocioException) { rejected = true; }
    Check(rejected, "Fechas invalidas");
}
using var db = new AlquilerEquiposDbContext(new DbContextOptionsBuilder<AlquilerEquiposDbContext>()
    .UseSqlServer("Server=localhost;Database=NoConnectionRequired;Integrated Security=True").Options);
var conflicts = db.ReservasAlquiler.Where(Disponibilidad.Conflictos(start, end));
var sql = db.Equipos.Where(e => e.Estado != EstadoEquipo.Mantenimiento &&
    !conflicts.Any(r => r.EquipoId == e.Id)).ToQueryString();
Check(sql.Contains("NOT EXISTS") && sql.Contains("Mantenimiento") &&
    sql.Contains("Pendiente") && sql.Contains("Activa"), "Traduccion SQL");
Check(!db.Database.HasPendingModelChanges(), "Migraciones sincronizadas con el modelo");
var page = new AlquilerEquipos.Application.DTO.ConsultaPagina { Pagina = 2, TamanioPagina = 25 };
page.Validar();
Check(page.CalcularOmitidos() == 25, "Offset de paginacion");
Check(Disponibilidad.EnUtc(start).Kind == DateTimeKind.Utc, "Fecha sin zona interpretada como UTC");
bool invalidClient = false;
try
{
    ValidacionEntrada.Validar(new AlquilerEquipos.Application.DTO.GuardarClienteDto
    {
        Nombre = "Test", Apellido = "Test", Email = "invalid-email"
    });
}
catch (ReglaNegocioException) { invalidClient = true; }
Check(invalidClient, "Email invalido");
void MustReject(Action action, string name)
{
    bool rejected = false;
    try { action(); }
    catch (ReglaNegocioException) { rejected = true; }
    Check(rejected, name);
}
var utcStart = DateTime.SpecifyKind(start, DateTimeKind.Utc);
(ReservaAlquiler Reserva, Equipo Equipo) NewRental() => (
    new ReservaAlquiler { EquipoId = 1, ClienteId = 1, FechaInicio = utcStart,
        FechaFinEsperada = utcStart.AddHours(2), CostoTotal = 100 },
    new Equipo { Id = 1, Nombre = "Test", Marca = "Test", NumeroSerie = "TEST-1" });

var rental = NewRental();
Check(rental.Reserva.Activar(rental.Equipo, utcStart), "Retiro al inicio exacto");
Check(rental.Equipo.Estado == EstadoEquipo.EnUso && rental.Reserva.Estado == EstadoReservaAlquiler.Activa,
    "Retiro actualiza ambos estados");
Check(!rental.Reserva.Activar(rental.Equipo, utcStart.AddHours(3)), "Repetir retiro no modifica alquiler activo");
MustReject(() => rental.Reserva.Cancelar(), "No cancelar activo");
MustReject(() => rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart.AddMinutes(-1),
    utcStart.AddHours(1), false), "No devolver antes del inicio");
MustReject(() => rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart.AddHours(2),
    utcStart.AddHours(1), false), "No devolver en el futuro");
Check(rental.Reserva.Estado == EstadoReservaAlquiler.Activa && rental.Reserva.FechaDevolucionReal is null,
    "Error de devolucion no altera el estado");
Check(rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart.AddHours(1), utcStart.AddHours(1), true),
    "Devolucion valida");
Check(rental.Reserva.Estado == EstadoReservaAlquiler.Finalizada &&
    rental.Equipo.Estado == EstadoEquipo.Mantenimiento, "Finaliza y envia a mantenimiento");
Check(!rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart.AddHours(1), utcStart.AddHours(1), false),
    "Devolucion idempotente");
Check(rental.Equipo.Estado == EstadoEquipo.Mantenimiento, "Repetir devolucion conserva mantenimiento");
MustReject(() => rental.Reserva.Cancelar(), "No cancelar finalizada");
rental = NewRental();
MustReject(() => rental.Reserva.Activar(rental.Equipo, utcStart.AddMinutes(-1)), "No retirar antes del inicio");
MustReject(() => rental.Reserva.Activar(rental.Equipo, utcStart.AddHours(2)), "No retirar al finalizar el periodo");
Check(rental.Reserva.Estado == EstadoReservaAlquiler.Pendiente &&
    rental.Equipo.Estado == EstadoEquipo.Disponible, "Retiro rechazado no altera estados");
rental.Equipo.Estado = EstadoEquipo.Mantenimiento;
MustReject(() => rental.Reserva.Activar(rental.Equipo, utcStart), "No retirar equipo en mantenimiento");
rental.Equipo.Estado = EstadoEquipo.Disponible;
MustReject(() => rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart, utcStart, false),
    "No devolver reserva pendiente");
MustReject(() => rental.Reserva.Activar(new Equipo { Id = 2 }, utcStart), "No retirar otro equipo");
Check(rental.Reserva.Cancelar(), "Cancelar pendiente");
Check(!rental.Reserva.Cancelar(), "Cancelar dos veces");
MustReject(() => rental.Reserva.Activar(rental.Equipo, utcStart), "No activar cancelada");
rental = NewRental();
rental.Reserva.Activar(rental.Equipo, utcStart);
rental.Reserva.RegistrarDevolucion(rental.Equipo, utcStart.AddHours(3), utcStart.AddHours(3), false);
Check(rental.Equipo.Estado == EstadoEquipo.Disponible &&
    rental.Reserva.FechaDevolucionReal == utcStart.AddHours(3), "Devolucion tardia disponible sin cambiar costo");
Check(rental.Reserva.CostoTotal == 100, "Costo pactado conservado");
Console.WriteLine($"OK: {checks} comprobaciones de intervalos, estados y traduccion SQL. No se abrio conexion SQL.");
