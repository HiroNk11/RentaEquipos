using AlquilerEquipos.Application.DTO;
using AlquilerEquipos.Application.Entitites;
using AlquilerEquipos.Application.Enums;
using AlquilerEquipos.Application.Exceptions;
using AlquilerEquipos.Application.Services;
using AlquilerEquipos.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
namespace AlquilerEquipos.Infrastructure.Services;
public class EquipoService(AlquilerEquiposDbContext db) : IEquipoService
{
    private static EquipoDto Map(Equipo e) => new(e.Id, e.Nombre, e.Marca, e.NumeroSerie, e.Estado);
    private async Task<Equipo> Buscar(int id, CancellationToken ct) =>
        await db.Equipos.FindAsync(new object[] { id }, ct)
        ?? throw new NotFoundException("Equipo no encontrado.");
    public async Task<IReadOnlyList<EquipoDto>> ListarAsync(CancellationToken ct, ConsultaPagina? pagina = null)
    {
        pagina ??= new ConsultaPagina();
        pagina.Validar();
        return await db.Equipos.AsNoTracking().OrderBy(e => e.Id)
            .Skip(pagina.CalcularOmitidos()).Take(pagina.TamanioPagina)
            .Select(e => new EquipoDto(e.Id, e.Nombre, e.Marca, e.NumeroSerie, e.Estado)).ToListAsync(ct);
    }
    public async Task<EquipoDto> ObtenerAsync(int id, CancellationToken ct) => Map(await Buscar(id, ct));
    public async Task<IReadOnlyList<EquipoDto>> DisponiblesAsync(DateTime fechaInicio, DateTime fechaFin, CancellationToken ct, ConsultaPagina? pagina = null)
    {
        Disponibilidad.ValidarFechas(fechaInicio, fechaFin);
        pagina ??= new ConsultaPagina();
        pagina.Validar();
        var conflictos = db.ReservasAlquiler.Where(Disponibilidad.Conflictos(fechaInicio, fechaFin));
        return await db.Equipos.AsNoTracking()
            .Where(e => e.Estado != EstadoEquipo.Mantenimiento && !conflictos.Any(r => r.EquipoId == e.Id))
            .OrderBy(e => e.Nombre).ThenBy(e => e.Id)
            .Skip(pagina.CalcularOmitidos()).Take(pagina.TamanioPagina)
            .Select(e => new EquipoDto(e.Id, e.Nombre, e.Marca, e.NumeroSerie, e.Estado)).ToListAsync(ct);
    }
    private async Task Validar(GuardarEquipoDto dto, int id, CancellationToken ct)
    {
        ValidacionEntrada.Validar(dto);
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Marca) ||
            string.IsNullOrWhiteSpace(dto.NumeroSerie))
            throw new ReglaNegocioException("Nombre, marca y numero de serie son obligatorios.");
        if (await db.Equipos.AnyAsync(e => e.NumeroSerie == dto.NumeroSerie.Trim() && e.Id != id, ct))
            throw new ReglaNegocioException("Ya existe un equipo con ese numero de serie.");
    }
    public async Task<EquipoDto> CrearAsync(GuardarEquipoDto dto, CancellationToken ct)
    {
        await Validar(dto, 0, ct);
        var equipo = new Equipo { Nombre = dto.Nombre.Trim(), Marca = dto.Marca.Trim(),
            NumeroSerie = dto.NumeroSerie.Trim() };
        db.Equipos.Add(equipo);
        await Guardar(ct);
        return Map(equipo);
    }
    public async Task ActualizarAsync(int id, GuardarEquipoDto dto, CancellationToken ct)
    {
        var equipo = await Buscar(id, ct);
        await Validar(dto, id, ct);
        equipo.Nombre = dto.Nombre.Trim();
        equipo.Marca = dto.Marca.Trim();
        equipo.NumeroSerie = dto.NumeroSerie.Trim();
        await Guardar(ct);
    }
    public async Task CambiarEstadoAsync(int id, EstadoEquipo estado, CancellationToken ct)
    {
        if (!Enum.IsDefined(estado)) throw new ReglaNegocioException("Estado invalido.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var equipo = await db.Equipos.FromSqlInterpolated(
            $"SELECT * FROM [Equipos] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id}")
            .SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Equipo no encontrado.");
        if (estado != EstadoEquipo.EnUso && await db.ReservasAlquiler.AnyAsync(
            r => r.EquipoId == id && r.Estado == EstadoReservaAlquiler.Activa, ct))
            throw new ReglaNegocioException("El equipo tiene un alquiler activo.");
        equipo.Estado = estado;
        await Guardar(ct);
        await tx.CommitAsync(ct);
    }
    public async Task EliminarAsync(int id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var equipo = await db.Equipos.FromSqlInterpolated(
            $"SELECT * FROM [Equipos] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id}")
            .SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Equipo no encontrado.");
        if (equipo.Estado == EstadoEquipo.EnUso || await db.ReservasAlquiler.AnyAsync(r => r.EquipoId == id, ct))
            throw new ReglaNegocioException("No se puede eliminar un equipo en uso o con reservas.");
        db.Equipos.Remove(equipo);
        await Guardar(ct);
        await tx.CommitAsync(ct);
    }
    private async Task Guardar(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sql &&
            sql.Number is 2601 or 2627)
        { throw new ReglaNegocioException("Ya existe un equipo con ese numero de serie."); }
    }
}

