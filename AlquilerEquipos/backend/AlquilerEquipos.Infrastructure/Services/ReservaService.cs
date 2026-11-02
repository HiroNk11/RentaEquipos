using System.Data;
using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;
using AlquilerEquipos.Application.Services;
using AlquilerEquipos.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
namespace AlquilerEquipos.Infrastructure.Services;
public class ReservaService(AlquilerEquiposDbContext db, TimeProvider? timeProvider = null) : IReservaService
{
    private readonly TimeProvider clock = timeProvider ?? TimeProvider.System;
    private static ReservaDto Map(ReservaAlquiler r) => new(r.Id, r.EquipoId, r.ClienteId,
        r.FechaInicio, r.FechaFinEsperada, r.FechaDevolucionReal, r.CostoTotal, r.Estado);

    public async Task<IReadOnlyList<ReservaDto>> ListarAsync(CancellationToken ct, ConsultaReservas? consulta = null)
    {
        consulta ??= new ConsultaReservas();
        consulta.Validar();
        if (consulta.EquipoId <= 0 || consulta.ClienteId <= 0 ||
            consulta.Estado.HasValue && !Enum.IsDefined(consulta.Estado.Value))
            throw new ReglaNegocioException("Filtro de reservas invalido.");
        var query = db.ReservasAlquiler.AsNoTracking();
        if (consulta.EquipoId.HasValue) query = query.Where(r => r.EquipoId == consulta.EquipoId.Value);
        if (consulta.ClienteId.HasValue) query = query.Where(r => r.ClienteId == consulta.ClienteId.Value);
        if (consulta.Estado.HasValue) query = query.Where(r => r.Estado == consulta.Estado.Value);
        return await query.OrderBy(r => r.FechaInicio).ThenBy(r => r.Id)
            .Skip(consulta.CalcularOmitidos()).Take(consulta.TamanioPagina)
            .Select(r => new ReservaDto(r.Id, r.EquipoId, r.ClienteId, r.FechaInicio,
                r.FechaFinEsperada, r.FechaDevolucionReal, r.CostoTotal, r.Estado)).ToListAsync(ct);
    }

    public async Task<ReservaDto> ObtenerAsync(int id, CancellationToken ct) =>
        Map(await db.ReservasAlquiler.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Reserva no encontrada."));

    public async Task<ReservaDto> CrearAsync(CrearReservaDto dto, CancellationToken ct)
    {
        ValidacionEntrada.Validar(dto);
        Disponibilidad.ValidarFechas(dto.FechaInicio, dto.FechaFinEsperada);
        if (dto.EquipoId <= 0 || dto.ClienteId <= 0 || dto.CostoTotal < 0 ||
            dto.CostoTotal > 9999999999999999.99m || decimal.Round(dto.CostoTotal, 2) != dto.CostoTotal)
            throw new ReglaNegocioException("Ids y costo invalidos; se admiten como maximo dos decimales.");

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Serializa la comprobacion y el alta por equipo, incluso cuando aun no hay reservas.
        var equipo = await db.Equipos.FromSqlInterpolated(
            $"SELECT * FROM [Equipos] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {dto.EquipoId}")
            .AsNoTracking().SingleOrDefaultAsync(ct)
            ?? throw new NotFoundException("Equipo no encontrado.");
        if (equipo.Estado == EstadoEquipo.Mantenimiento)
            throw new ReglaNegocioException("El equipo esta en mantenimiento.");
        if (!await db.Clientes.FromSqlInterpolated(
            $"SELECT * FROM [Clientes] WITH (HOLDLOCK) WHERE [Id] = {dto.ClienteId}")
            .AsNoTracking().AnyAsync(ct))
            throw new NotFoundException("Cliente no encontrado.");
        if (await db.ReservasAlquiler.Where(Disponibilidad.Conflictos(dto.FechaInicio, dto.FechaFinEsperada))
            .AnyAsync(r => r.EquipoId == dto.EquipoId, ct))
            throw new ConflictoReservaException("El equipo ya tiene una reserva en ese periodo.");

        var reserva = new ReservaAlquiler { EquipoId = dto.EquipoId, ClienteId = dto.ClienteId,
            FechaInicio = Disponibilidad.EnUtc(dto.FechaInicio), FechaFinEsperada = Disponibilidad.EnUtc(dto.FechaFinEsperada),
            CostoTotal = dto.CostoTotal, Estado = EstadoReservaAlquiler.Pendiente };
        db.ReservasAlquiler.Add(reserva);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Map(reserva);
    }

    public async Task CancelarAsync(int id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var reserva = await db.ReservasAlquiler.FromSqlInterpolated(
            $"SELECT * FROM [ReservasAlquiler] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id}")
            .SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Reserva no encontrada.");
        if (reserva.Cancelar()) await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    private async Task<(ReservaAlquiler Reserva, Equipo Equipo)> BloquearReservaYEquipo(int id, CancellationToken ct)
    {
        var equipoId = await db.ReservasAlquiler.AsNoTracking().Where(r => r.Id == id)
            .Select(r => (int?)r.EquipoId).SingleOrDefaultAsync(ct)
            ?? throw new NotFoundException("Reserva no encontrada.");
        // Todas las operaciones que modifican ambos recursos toman primero el equipo.
        var equipo = await db.Equipos.FromSqlInterpolated(
            $"SELECT * FROM [Equipos] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {equipoId}")
            .SingleAsync(ct);
        var reserva = await db.ReservasAlquiler.FromSqlInterpolated(
            $"SELECT * FROM [ReservasAlquiler] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id}")
            .SingleAsync(ct);
        return (reserva, equipo);
    }

    public async Task ActivarAsync(int id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var (reserva, equipo) = await BloquearReservaYEquipo(id, ct);
        if (reserva.Estado == EstadoReservaAlquiler.Pendiente &&
            await db.ReservasAlquiler.AnyAsync(r => r.EquipoId == equipo.Id &&
                r.Id != id && r.Estado == EstadoReservaAlquiler.Activa, ct))
            throw new ReglaNegocioException("El equipo no esta disponible para su retiro.");
        if (reserva.Activar(equipo, clock.GetUtcNow().UtcDateTime)) await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task DevolverAsync(int id, DevolverReservaDto dto, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var (reserva, equipo) = await BloquearReservaYEquipo(id, ct);
        var ahora = clock.GetUtcNow().UtcDateTime;
        var fecha = Disponibilidad.EnUtc(dto.FechaDevolucionReal ?? ahora);
        if (reserva.RegistrarDevolucion(equipo, fecha, ahora, dto.RequiereMantenimiento))
            await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}

