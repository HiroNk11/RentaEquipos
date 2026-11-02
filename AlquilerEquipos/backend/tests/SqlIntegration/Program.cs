using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;
using AlquilerEquipos.Infrastructure.Data;
using AlquilerEquipos.Infrastructure.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var source = Environment.GetEnvironmentVariable("ALQUILER_SQL_TEST_CONNECTION");
if (string.IsNullOrWhiteSpace(source))
    throw new InvalidOperationException("Configurar ALQUILER_SQL_TEST_CONNECTION con una instancia exclusiva de pruebas.");
var name = "AlquilerEquiposTests_" + Guid.NewGuid().ToString("N");
var masterBuilder = new SqlConnectionStringBuilder(source) { InitialCatalog = "master", ConnectTimeout = 5 };
var testBuilder = new SqlConnectionStringBuilder(source) { InitialCatalog = name, ConnectTimeout = 5 };
var options = new DbContextOptionsBuilder<AlquilerEquiposDbContext>().UseSqlServer(testBuilder.ConnectionString).Options;
int checks = 0;
bool created = false;
void Check(bool value, string message)
{
    if (!value) throw new Exception(message);
    checks++;
}
AlquilerEquiposDbContext Context() => new(options);
async Task Rejected(Func<Task> action, string message)
{
    try { await action(); }
    catch (ReglaNegocioException) { checks++; return; }
    throw new Exception(message);
}
await using var master = new SqlConnection(masterBuilder.ConnectionString);
for (var attempt = 0; ; attempt++)
{
    try { await master.OpenAsync(); break; }
    catch (SqlException) when (attempt < 20) { await Task.Delay(2000); }
}
try
{
    // The identifier is entirely generated here; no configured database is created or dropped.
    await using (var command = master.CreateCommand())
    {
        command.CommandText = $"CREATE DATABASE [{name}]";
        await command.ExecuteNonQueryAsync();
        created = true;
    }
    await using (var db = Context())
    {
        await db.Database.MigrateAsync();
        await db.Database.ExecuteSqlRawAsync(
            await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "RuntimePermissions.sql")));
        db.Clientes.Add(new Cliente { Nombre = "Prueba", Apellido = "Aislada", Email = "test@example.invalid" });
        for (var i = 1; i <= 4; i++)
            db.Equipos.Add(new Equipo { Nombre = $"Equipo {i}", Marca = "Test", NumeroSerie = $"SERIE-{i}",
                Estado = i == 2 ? EstadoEquipo.Mantenimiento : EstadoEquipo.Disponible });
        await db.SaveChangesAsync();
    }
    var start = new DateTime(2030, 2, 1, 10, 0, 0);
    CrearReservaDto Request(int equipo = 1) => new() { EquipoId = equipo, ClienteId = 1,
        FechaInicio = start, FechaFinEsperada = start.AddHours(2), CostoTotal = 125.50m };
    int reservationId;
    await using (var db = Context())
    {
        var service = new ReservaService(db);
        var reservation = await service.CrearAsync(Request(), default);
        reservationId = reservation.Id;
        Check(reservation.Estado == EstadoReservaAlquiler.Pendiente, "Initial state");
    }
    await using (var db = Context())
    {
        var service = new ReservaService(db);
        await Rejected(() => service.CrearAsync(Request(), default), "Identical overlap accepted");
        db.ChangeTracker.Clear();
        var partial = Request();
        partial.FechaInicio = start.AddHours(1);
        partial.FechaFinEsperada = start.AddHours(3);
        await Rejected(() => service.CrearAsync(partial, default), "Partial overlap accepted");
        db.ChangeTracker.Clear();
        var contiguous = Request();
        contiguous.FechaInicio = start.AddHours(2);
        contiguous.FechaFinEsperada = start.AddHours(3);
        await service.CrearAsync(contiguous, default);
        checks++;
    }
    await using (var db = Context())
    {
        var available = await new EquipoService(db).DisponiblesAsync(start, start.AddHours(2), default);
        Check(!available.Any(e => e.Id == 1), "Reserved equipment returned");
        Check(!available.Any(e => e.Id == 2), "Maintenance equipment returned");
        await Rejected(() => new ReservaService(db).CrearAsync(Request(2), default), "Maintenance booking accepted");
    }
    await using (var db = Context())
    {
        var service = new ReservaService(db);
        await service.CancelarAsync(reservationId, default);
        await service.CancelarAsync(reservationId, default);
        Check((await service.ObtenerAsync(reservationId, default)).Estado == EstadoReservaAlquiler.Cancelada,
            "Cancellation not persisted");
        await service.CrearAsync(Request(), default);
        checks++;
    }
    var outcomes = await Task.WhenAll(Enumerable.Range(0, 12).Select(async _ =>
    {
        await using var db = Context();
        try { await new ReservaService(db).CrearAsync(Request(3), default); return true; }
        catch (ReglaNegocioException) { return false; }
    }));
    Check(outcomes.Count(success => success) == 1, "Concurrent reservations must produce exactly one success");
    await using (var db = Context())
    {
        Check(await db.ReservasAlquiler.CountAsync(r => r.EquipoId == 3) == 1, "Multiple rows persisted");
        db.ReservasAlquiler.Add(new ReservaAlquiler { EquipoId = 4, ClienteId = 1,
            FechaInicio = start, FechaFinEsperada = start.AddHours(2), Estado = EstadoReservaAlquiler.Activa });
        await db.SaveChangesAsync();
        await Rejected(() => new ReservaService(db).CrearAsync(Request(4), default), "Active overlap accepted");
        db.ChangeTracker.Clear();
        var active = await db.ReservasAlquiler.SingleAsync(r => r.EquipoId == 4);
        await Rejected(() => new ReservaService(db).CancelarAsync(active.Id, default), "Active cancellation accepted");
        await Rejected(() => new EquipoService(db).CambiarEstadoAsync(4, EstadoEquipo.Disponible, default),
            "Active equipment released manually");
        var invalid = Request(3); invalid.CostoTotal = 1.001m;
        await Rejected(() => new ReservaService(db).CrearAsync(invalid, default), "Fractional cents accepted");
    }
    await using (var db = Context())
    {
        var id = await db.ReservasAlquiler.Where(r => r.EquipoId == 3).Select(r => r.Id).SingleAsync();
        var service = new ReservaService(db, new FixedClock(start.AddMinutes(30)));
        await Rejected(() => new ReservaService(db, new FixedClock(start.AddMinutes(-1))).ActivarAsync(id, default),
            "Early delivery accepted");
        await service.ActivarAsync(id, default);
        await service.ActivarAsync(id, default);
        Check((await service.ObtenerAsync(id, default)).Estado == EstadoReservaAlquiler.Activa, "Activation");
        Check((await new EquipoService(db).ObtenerAsync(3, default)).Estado == EstadoEquipo.EnUso, "Equipment in use");
        await Rejected(() => service.DevolverAsync(id, new() { FechaDevolucionReal = start.AddHours(-1) }, default),
            "Backdated return accepted");
        await Rejected(() => service.DevolverAsync(id, new() { FechaDevolucionReal = start.AddHours(1) }, default),
            "Future return accepted");
        await service.DevolverAsync(id, new() { RequiereMantenimiento = true }, default);
        await service.DevolverAsync(id, new(), default);
        var result = await service.ObtenerAsync(id, default);
        Check(result.Estado == EstadoReservaAlquiler.Finalizada &&
            result.FechaDevolucionReal == start.AddMinutes(30), "Return date");
        Check((await new EquipoService(db).ObtenerAsync(3, default)).Estado == EstadoEquipo.Mantenimiento,
            "Maintenance on return");
        await Rejected(() => service.CancelarAsync(id, default), "Finalized cancellation accepted");
    }
    await using (var db = Context())
    {
        var service = new ClienteService(db);
        var client = await service.CrearAsync(new() { Nombre = "  Otra ", Apellido = " Prueba ",
            Email = "other@example.invalid" }, default);
        Check(client.Nombre == "Otra" && client.Apellido == "Prueba", "Client normalization");
        await service.EliminarAsync(client.Id, default);
        Check(!await db.Clientes.AnyAsync(c => c.Id == client.Id), "Client deletion");
        await Rejected(() => service.EliminarAsync(1, default), "Customer history deleted");
        var filter = new ConsultaReservas { EquipoId = 3, Estado = EstadoReservaAlquiler.Finalizada };
        var results = await new ReservaService(db).ListarAsync(default, filter);
        Check(results.Count == 1 && results[0].EquipoId == 3, "Reservation filter");
        db.ChangeTracker.Clear();
        var stored = await db.ReservasAlquiler.AsNoTracking().FirstAsync();
        Check(stored.FechaInicio.Kind == DateTimeKind.Utc, "UTC materialization");
    }
    await using (var db = Context())
    {
        await db.Database.ExecuteSqlRawAsync(
            "CREATE USER [alquiler_runtime_test] WITHOUT LOGIN; ALTER ROLE [alquiler_runtime] ADD MEMBER [alquiler_runtime_test];");
        await db.Database.OpenConnectionAsync();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            EXECUTE AS USER = N'alquiler_runtime_test';
            DECLARE @result int = 0;
            BEGIN TRY
                SELECT @result = CASE WHEN
                    HAS_PERMS_BY_NAME(N'dbo.Equipos', N'OBJECT', N'SELECT') = 1 AND
                    HAS_PERMS_BY_NAME(N'dbo.Equipos', N'OBJECT', N'INSERT') = 1 AND
                    HAS_PERMS_BY_NAME(N'dbo.Equipos', N'OBJECT', N'UPDATE') = 1 AND
                    HAS_PERMS_BY_NAME(N'dbo.Equipos', N'OBJECT', N'DELETE') = 1 AND
                    HAS_PERMS_BY_NAME(N'dbo.ReservasAlquiler', N'OBJECT', N'UPDATE') = 1 AND
                    HAS_PERMS_BY_NAME(N'dbo.ReservasAlquiler', N'OBJECT', N'DELETE') = 0 AND
                    HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CREATE TABLE') = 0
                    THEN 1 ELSE 0 END;
                REVERT;
            END TRY
            BEGIN CATCH
                REVERT;
                THROW;
            END CATCH;
            SELECT @result;
            """;
        Check(Convert.ToInt32(await command.ExecuteScalarAsync()) == 1, "Least privilege runtime role");
    }
    Console.WriteLine($"OK: {checks} SQL integration checks, including 12 concurrent requests.");
}

finally
{
    if (created)
    {
        SqlConnection.ClearAllPools();
        await using var command = master.CreateCommand();
        command.CommandText = $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];";
        await command.ExecuteNonQueryAsync();
        Console.WriteLine("Temporary test database removed.");
    }
}

sealed class FixedClock(DateTime utc) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => new(DateTime.SpecifyKind(utc, DateTimeKind.Utc));
}

